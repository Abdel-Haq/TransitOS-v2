import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { count, eq, sql, sum } from 'drizzle-orm';
import { ALL_MODULES } from '@dc/config';
import { decideAccess, hasBroadScope } from '@dc/domain';
import { createDb, createPool } from '../client.js';
import { resourceRecord } from '../schema/kernel.js';
import { kernelProbe } from '../schema/probe.js';
import {
  resourceAssignment,
  resourceGrant,
  roleAssignment,
  userAccount,
} from '../schema/identity.js';
import { accessiblePredicate, loadAncestors, loadSubject } from './access.js';

const pool = createPool();
const db = createDb(pool);
afterAll(async () => {
  await pool.end();
});

const NOW = '2026-09-19T12:00:00Z';
/** Before NOW. Never let a fixture's validity window come from the column default. */
const ROLES_VALID_FROM = '2026-01-01T00:00:00Z';
const ENABLED = new Set(ALL_MODULES);
const AGENT = '11111111-1111-4111-8111-111111111111';
const CLIENT = '22222222-2222-4222-8222-222222222222';

let dossier: string;
let sharedCost: string;
let internalCost: string;
let restrictedDoc: string;

const addResource = async (
  classification: 'internal' | 'client_shareable' | 'restricted',
  parentId: string | null,
  amount: string,
) => {
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(resourceRecord).values({
      id,
      kind: 'kernel_probe',
      classification,
      parentId,
      createdBy: AGENT,
    });
    await tx.insert(kernelProbe).values({ id, label: classification, amount, createdBy: AGENT });
  });
  return id;
};

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE ${resourceGrant}, ${resourceAssignment}, ${roleAssignment}, ${userAccount} CASCADE`,
  );
  await db.execute(sql`TRUNCATE ${kernelProbe}, ${resourceRecord} CASCADE`);

  await db.insert(userAccount).values([
    { id: AGENT, subject: 'agent', displayName: 'Agent', audience: 'staff' },
    { id: CLIENT, subject: 'client', displayName: 'Client', audience: 'external' },
  ]);

  dossier = await addResource('client_shareable', null, '1000.00');
  sharedCost = await addResource('client_shareable', dossier, '100.00');
  internalCost = await addResource('internal', dossier, '250.00');
  restrictedDoc = await addResource('restricted', dossier, '50.00');
});

describe('loading a subject from the database', () => {
  it('returns roles, grants and assignments', async () => {
    await db.insert(roleAssignment).values({
      userId: AGENT,
      roleCode: 'dossier_agent',
      scope: 'assigned',
      validFrom: ROLES_VALID_FROM,
      createdBy: AGENT,
    });
    await db
      .insert(resourceAssignment)
      .values({ userId: AGENT, resourceId: dossier, createdBy: AGENT });
    await db.insert(resourceGrant).values({
      userId: AGENT,
      resourceId: restrictedDoc,
      actions: ['evidence.read'],
      createdBy: AGENT,
    });

    const subject = await loadSubject(db, AGENT);
    expect(subject!.roles).toHaveLength(1);
    expect(subject!.assigned_resource_ids.has(dossier)).toBe(true);
    expect(subject!.grants[0]!.actions).toEqual(['evidence.read']);
    expect(subject!.audience).toBe('staff');
  });

  it('returns undefined for an unknown user rather than an empty subject', async () => {
    // An empty subject would be a user with no access, which is nearly right and exactly
    // the kind of nearly-right that hides a bug in session handling.
    expect(await loadSubject(db, randomUUID())).toBeUndefined();
  });

  it('marks an external account as external', async () => {
    expect((await loadSubject(db, CLIENT))!.audience).toBe('external');
  });
});

describe('the ancestor chain', () => {
  it('walks parents nearest first', async () => {
    const ancestors = await loadAncestors(db, sharedCost);
    expect(ancestors.map((a) => a.id)).toEqual([dossier]);
    expect(ancestors[0]!.classification).toBe('client_shareable');
  });

  it('is empty for a root resource', async () => {
    expect(await loadAncestors(db, dossier)).toEqual([]);
  });

  it('reports each ancestor’s own classification, not the child’s', async () => {
    const grandchild = await addResource('client_shareable', internalCost, '5.00');
    const ancestors = await loadAncestors(db, grandchild);
    expect(ancestors.map((a) => a.classification)).toEqual(['internal', 'client_shareable']);
  });
});

describe('the decision, against real rows', () => {
  const ask = async (userId: string, resourceId: string, capability = 'evidence.read') => {
    const subject = await loadSubject(db, userId);
    const [row] = await db.select().from(resourceRecord).where(eq(resourceRecord.id, resourceId));
    return decideAccess({
      subject: subject!,
      capability: capability as 'evidence.read',
      resource: {
        ref: { kind: 'kernel_probe', id: resourceId },
        classification: row!.classification as 'internal',
        ancestors: await loadAncestors(db, resourceId),
      },
      enabledModules: ENABLED,
      at: NOW,
    });
  };

  it('lets a client reach a shareable child through an inheriting grant', async () => {
    await db.insert(resourceGrant).values({
      userId: CLIENT,
      resourceId: dossier,
      actions: ['evidence.read'],
      inheritShareableChildren: true,
      createdBy: AGENT,
    });
    expect((await ask(CLIENT, sharedCost)).allowed).toBe(true);
  });

  it('stops that same grant at the internal sibling', async () => {
    await db.insert(resourceGrant).values({
      userId: CLIENT,
      resourceId: dossier,
      actions: ['evidence.read'],
      inheritShareableChildren: true,
      createdBy: AGENT,
    });
    expect((await ask(CLIENT, internalCost)).allowed).toBe(false);
  });

  it('stops it at the restricted document too', async () => {
    await db.insert(resourceGrant).values({
      userId: CLIENT,
      resourceId: dossier,
      actions: ['evidence.read'],
      inheritShareableChildren: true,
      createdBy: AGENT,
    });
    expect((await ask(CLIENT, restrictedDoc)).allowed).toBe(false);
  });

  it('closes the child the moment the parent grant is revoked', async () => {
    // The case the exit condition names. Inheritance is recomputed from the live grant,
    // never cached on the child — 00-shared-contract.md:84, "invalidate caches after
    // revocation".
    const [grant] = await db
      .insert(resourceGrant)
      .values({
        userId: CLIENT,
        resourceId: dossier,
        actions: ['evidence.read'],
        inheritShareableChildren: true,
        createdBy: AGENT,
      })
      .returning();
    expect((await ask(CLIENT, sharedCost)).allowed).toBe(true);

    await db
      .update(resourceGrant)
      .set({ revokedAt: '2026-09-01T00:00:00Z' })
      .where(eq(resourceGrant.id, grant!.id));

    expect((await ask(CLIENT, sharedCost)).allowed).toBe(false);
    expect((await ask(CLIENT, dossier)).allowed).toBe(false);
  });
});

describe('aggregates never reveal unauthorized totals', () => {
  const totalFor = async (userId: string, capability = 'evidence.read') => {
    const subject = await loadSubject(db, userId);
    const predicate = accessiblePredicate(
      subject!,
      capability as 'evidence.read',
      NOW,
      hasBroadScope(subject!, capability, NOW),
    );
    // The predicate goes in the WHERE, before the aggregate. That is the whole rule of
    // 00-shared-contract.md:53 — filtering the result of a SUM is already too late.
    const [row] = await db
      .select({ total: sum(kernelProbe.amount), n: count() })
      .from(kernelProbe)
      .innerJoin(resourceRecord, eq(resourceRecord.id, kernelProbe.id))
      .where(predicate);
    return { total: row!.total ?? '0', n: row!.n };
  };

  it('returns nothing at all for a subject with no access', async () => {
    // The single worst bug this file could contain is a predicate that degenerates to
    // TRUE when the grant list is empty. It returns `false` instead.
    expect(await totalFor(CLIENT)).toEqual({ total: '0', n: 0 });
  });

  it('sums only the granted resource, not the dossier’s real total', async () => {
    await db.insert(resourceGrant).values({
      userId: CLIENT,
      resourceId: sharedCost,
      actions: ['evidence.read'],
      createdBy: AGENT,
    });
    const { total, n } = await totalFor(CLIENT);
    expect(n).toBe(1);
    expect(total).toBe('100.00'); // not 1400.00
  });

  it('excludes a revoked grant from the total immediately', async () => {
    const [grant] = await db
      .insert(resourceGrant)
      .values({
        userId: CLIENT,
        resourceId: sharedCost,
        actions: ['evidence.read'],
        createdBy: AGENT,
      })
      .returning();
    expect((await totalFor(CLIENT)).n).toBe(1);
    await db
      .update(resourceGrant)
      .set({ revokedAt: '2026-09-01T00:00:00Z' })
      .where(eq(resourceGrant.id, grant!.id));
    expect((await totalFor(CLIENT)).n).toBe(0);
  });

  it('keeps restricted rows out of a broad-scope total', async () => {
    // Broad scope is the strongest thing a staff role holds, and `restricted` still
    // beats it — otherwise a management report is the leak.
    await db.insert(roleAssignment).values({
      userId: AGENT,
      roleCode: 'dossier_agent',
      scope: 'all_operational_records',
      validFrom: ROLES_VALID_FROM,
      createdBy: AGENT,
    });
    const { n, total } = await totalFor(AGENT);
    expect(n).toBe(3); // dossier + shared + internal, not the restricted document
    expect(total).toBe('1350.00'); // 1000 + 100 + 250
  });

  it('adds a restricted row back once it has its own grant', async () => {
    await db.insert(roleAssignment).values({
      userId: AGENT,
      roleCode: 'dossier_agent',
      scope: 'all_operational_records',
      validFrom: ROLES_VALID_FROM,
      createdBy: AGENT,
    });
    await db.insert(resourceGrant).values({
      userId: AGENT,
      resourceId: restrictedDoc,
      actions: ['evidence.read'],
      createdBy: AGENT,
    });
    const { n, total } = await totalFor(AGENT);
    expect(n).toBe(4);
    expect(total).toBe('1400.00');
  });

  it('counts only assigned resources for an assigned-scope staff member', async () => {
    await db.insert(roleAssignment).values({
      userId: AGENT,
      roleCode: 'dossier_agent',
      scope: 'assigned',
      validFrom: ROLES_VALID_FROM,
      createdBy: AGENT,
    });
    await db
      .insert(resourceAssignment)
      .values({ userId: AGENT, resourceId: sharedCost, createdBy: AGENT });
    const { n, total } = await totalFor(AGENT);
    expect(n).toBe(1);
    expect(total).toBe('100.00');
  });

  it('returns exact NUMERIC strings, never rounded floats', async () => {
    await db.insert(roleAssignment).values({
      userId: AGENT,
      roleCode: 'dossier_agent',
      scope: 'all_operational_records',
      validFrom: ROLES_VALID_FROM,
      createdBy: AGENT,
    });
    const { total } = await totalFor(AGENT);
    expect(typeof total).toBe('string');
  });
});

describe('database constraints on grants', () => {
  it('refuses an empty actions array', async () => {
    await expect(
      db.insert(resourceGrant).values({
        userId: CLIENT,
        resourceId: dossier,
        actions: [],
        createdBy: AGENT,
      }),
    ).rejects.toThrow();
  });

  it('refuses an unknown role code', async () => {
    await expect(
      db.execute(
        sql`INSERT INTO role_assignment (user_id, role_code, created_by)
            VALUES (${AGENT}, 'super_admin', ${AGENT})`,
      ),
    ).rejects.toThrow();
  });

  it('refuses a role validity window that ends before it starts', async () => {
    await expect(
      db.insert(roleAssignment).values({
        userId: AGENT,
        roleCode: 'auditor',
        validFrom: '2026-09-01T00:00:00Z',
        validUntil: '2026-08-01T00:00:00Z',
        createdBy: AGENT,
      }),
    ).rejects.toThrow();
  });

  it('refuses the same open-ended role at the same scope twice', async () => {
    await db.insert(roleAssignment).values({
      userId: AGENT,
      roleCode: 'auditor',
      validFrom: ROLES_VALID_FROM,
      createdBy: AGENT,
    });
    await expect(
      db.insert(roleAssignment).values({
        userId: AGENT,
        roleCode: 'auditor',
        validFrom: ROLES_VALID_FROM,
        createdBy: AGENT,
      }),
    ).rejects.toThrow();
  });
});
