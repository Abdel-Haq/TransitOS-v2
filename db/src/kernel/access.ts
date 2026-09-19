import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Capability } from '@dc/contracts';
import type { Subject } from '@dc/domain';
import {
  resourceAssignment,
  resourceGrant,
  roleAssignment,
  userAccount,
} from '../schema/identity.js';
import { resourceRecord } from '../schema/kernel.js';
import type { KernelDatabase, KernelTransaction } from './tx.js';

type Reader = KernelDatabase | KernelTransaction;

/**
 * Load everything the access decision needs for one user, in one place.
 *
 * `00-shared-contract.md:84` — *"Recheck authorization on every download/job delivery and
 * invalidate caches after revocation."* This is deliberately uncached. A cache here is a
 * revocation that has not taken effect yet, and the spec names that as the failure. When
 * a cache eventually earns its place it must be keyed so a revocation can evict it; until
 * a measurement says it is needed, the query is three indexed reads.
 */
export async function loadSubject(db: Reader, userId: string): Promise<Subject | undefined> {
  const accounts = await db.select().from(userAccount).where(eq(userAccount.id, userId)).limit(1);
  const account = accounts[0];
  if (account === undefined) return undefined;

  // Sequential, not Promise.all. A transaction holds a single connection, and firing
  // three queries at it concurrently interleaves them on one protocol stream —
  // node-postgres warns about it and will make it an error. The three reads are indexed
  // and the round trips are local; correctness is worth more than the microseconds.
  const roles = await db.select().from(roleAssignment).where(eq(roleAssignment.userId, userId));
  const grants = await db.select().from(resourceGrant).where(eq(resourceGrant.userId, userId));
  const assignments = await db
    .select()
    .from(resourceAssignment)
    .where(eq(resourceAssignment.userId, userId));

  return {
    user_id: account.id,
    suspended: account.suspended,
    audience: account.audience === 'external' ? 'external' : 'staff',
    roles: roles.map((r) => ({
      role_code: r.roleCode as Subject['roles'][number]['role_code'],
      scope: r.scope === 'all_operational_records' ? 'all_operational_records' : 'assigned',
      valid_from: r.validFrom,
      ...(r.validUntil === null ? {} : { valid_until: r.validUntil }),
    })),
    grants: grants.map((g) => ({
      resource_id: g.resourceId,
      actions: g.actions as Capability[],
      inherit_shareable_children: g.inheritShareableChildren,
      ...(g.validUntil === null ? {} : { valid_until: g.validUntil }),
      ...(g.revokedAt === null ? {} : { revoked_at: g.revokedAt }),
    })),
    assigned_resource_ids: new Set(assignments.map((a) => a.resourceId)),
  };
}

/** The parent chain of a resource, nearest first, for grant inheritance. */
export async function loadAncestors(
  db: Reader,
  resourceId: string,
): Promise<{ id: string; classification: 'internal' | 'client_shareable' | 'restricted' }[]> {
  const rows = await db.execute(sql`
    WITH RECURSIVE chain AS (
      SELECT id, parent_id, classification, 0 AS depth
        FROM ${resourceRecord} WHERE id = ${resourceId}
      UNION ALL
      SELECT r.id, r.parent_id, r.classification, chain.depth + 1
        FROM ${resourceRecord} r
        JOIN chain ON r.id = chain.parent_id
        -- The parent graph is acyclic by constraint, but a depth bound keeps a corrupted
        -- row from turning a permission check into an infinite loop.
        WHERE chain.depth < 32
    )
    SELECT id, classification FROM chain WHERE depth > 0 ORDER BY depth
  `);
  return rows.rows as {
    id: string;
    classification: 'internal' | 'client_shareable' | 'restricted';
  }[];
}

/**
 * A SQL predicate restricting a list or aggregate to what this subject may see.
 *
 * `00-shared-contract.md:53` — *"All list predicates include access control **before**
 * pagination/aggregation."* `:84` — *"Management aggregates never reveal unauthorized
 * totals."*
 *
 * Returning a predicate rather than filtering rows afterwards is the whole point. A
 * caller that pages first and filters second returns short pages; one that sums first and
 * filters second returns a number the user was never entitled to, and the number is
 * usually the thing they wanted. Composing this into the `WHERE` makes the wrong order
 * awkward to write.
 *
 * Inheritance is not expanded here. A list is a set of resources the subject reaches
 * directly or by scope; a child reachable only by inheritance is resolved by
 * `decideAccess` when it is actually opened, where the full chain is known.
 */
export function accessiblePredicate(
  subject: Subject,
  capability: Capability,
  at: string,
  broadScope: boolean,
): SQL {
  if (broadScope) {
    // Broad scope still stops at `restricted` — :84, a separate explicit grant is needed
    // even for general readers, and "general reader" is exactly what broad scope means.
    const restrictedIds = subject.grants
      .filter((g) => g.actions.includes(capability) && isLive(g, at))
      .map((g) => g.resource_id);
    return restrictedIds.length > 0
      ? or(
          sql`${resourceRecord.classification} <> 'restricted'`,
          inArray(resourceRecord.id, restrictedIds),
        )!
      : sql`${resourceRecord.classification} <> 'restricted'`;
  }

  const granted = subject.grants
    .filter((g) => g.actions.includes(capability) && isLive(g, at))
    .map((g) => g.resource_id);
  const reachable = [...new Set([...granted, ...subject.assigned_resource_ids])];

  // No grants and no assignments is not "everything"; it is nothing. A predicate that
  // degenerated to TRUE here would be the single worst bug this file could contain, so
  // the empty case is explicit.
  if (reachable.length === 0) return sql`false`;

  const restrictedOk = granted.length > 0 ? inArray(resourceRecord.id, granted) : sql`false`;
  return and(
    inArray(resourceRecord.id, reachable),
    or(sql`${resourceRecord.classification} <> 'restricted'`, restrictedOk),
  )!;
}

const isLive = (g: Subject['grants'][number], at: string): boolean =>
  (g.revoked_at === undefined || g.revoked_at > at) &&
  (g.valid_until === undefined || g.valid_until > at);

/** Live grants only, for callers that need the id list rather than a predicate. */
export const liveGrantFilter = (userId: string, at: string) =>
  and(
    eq(resourceGrant.userId, userId),
    or(isNull(resourceGrant.revokedAt), sql`${resourceGrant.revokedAt} > ${at}`),
    or(isNull(resourceGrant.validUntil), sql`${resourceGrant.validUntil} > ${at}`),
  );
