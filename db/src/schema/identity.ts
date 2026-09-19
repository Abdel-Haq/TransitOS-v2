import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { ROLE_CODES } from '@dc/contracts';
import { resourceRecord } from './kernel.js';

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });
const inList = (values: readonly string[]): string => values.map((v) => `'${v}'`).join(', ');

/**
 * The subset of FD01 the authorization engine needs at Phase 0.4. The rest of identity —
 * sessions, mandates, invitations — lands with FD01 at 1.1.
 */

export const userAccount = pgTable('user_account', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  /** Keycloak owns credentials; this is the local mirror of who exists. */
  subject: text('subject').notNull().unique(),
  displayName: text('display_name').notNull(),
  audience: text('audience').notNull().default('staff'),
  suspended: boolean('suspended').notNull().default(false),
  createdAt: instant('created_at').notNull().defaultNow(),
});

/**
 * `01-FD01-identity.md:35` — *"`user_id→User`, `role_code:Role`,
 * `scope:assigned/all_operational_records`, `valid_from:Instant`, `valid_until?:Instant`,
 * `approval_id→ApprovalDecision`. Unique active equivalent assignment."*
 *
 * `approval_id` is not nullable in the spec, and it is not nullable here: a role
 * assignment that nobody approved is exactly the self-granting privilege
 * `00-shared-contract.md:64` forbids. The bootstrap administrator is the documented
 * exception and carries an audited bootstrap record.
 */
export const roleAssignment = pgTable(
  'role_assignment',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccount.id),
    roleCode: text('role_code').notNull(),
    scope: text('scope').notNull().default('assigned'),
    validFrom: instant('valid_from').notNull().defaultNow(),
    validUntil: instant('valid_until'),
    approvalId: uuid('approval_id'),
    createdAt: instant('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (t) => [
    check('role_assignment_role_check', sql`${t.roleCode} IN (${sql.raw(inList(ROLE_CODES))})`),
    check(
      'role_assignment_scope_check',
      sql`${t.scope} IN ('assigned', 'all_operational_records')`,
    ),
    check(
      'role_assignment_window_check',
      sql`${t.validUntil} IS NULL OR ${t.validUntil} > ${t.validFrom}`,
    ),
    // "Unique active equivalent assignment" — the same user cannot hold the same role at
    // the same scope twice, which would make revocation ambiguous.
    uniqueIndex('role_assignment_active_unique')
      .on(t.userId, t.roleCode, t.scope)
      .where(sql`${t.validUntil} IS NULL`),
    index('role_assignment_user_idx').on(t.userId),
  ],
);

/** Explicit staff assignment, for the `assigned` scope. */
export const resourceAssignment = pgTable(
  'resource_assignment',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccount.id),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resourceRecord.id),
    createdAt: instant('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (t) => [
    uniqueIndex('resource_assignment_unique').on(t.userId, t.resourceId),
    index('resource_assignment_resource_idx').on(t.resourceId),
  ],
);

/**
 * `01-FD01-identity.md:36` — *"`user_id→User`, `resource_id→ResourceRecord`,
 * `actions:Capability[]`, `inherit_shareable_children:Boolean`, `valid_until?:Instant`,
 * `revoked_at?:Instant`, `approval_id?`."*
 *
 * `actions` is a constrained text array, which `20-…:9` permits for *"arrays of primitive
 * codes"*. Validating each element against the capability registry is the application's
 * job — a CHECK listing 121 values would need a migration every time a module lands.
 */
export const resourceGrant = pgTable(
  'resource_grant',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccount.id),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resourceRecord.id),
    actions: text('actions').array().notNull(),
    inheritShareableChildren: boolean('inherit_shareable_children').notNull().default(false),
    validUntil: instant('valid_until'),
    revokedAt: instant('revoked_at'),
    approvalId: uuid('approval_id'),
    createdAt: instant('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (t) => [
    // cardinality, not array_length. `array_length('{}', 1)` returns NULL, and a CHECK
    // only fails on FALSE — so the obvious `array_length(actions, 1) >= 1` accepts the
    // empty array it exists to reject. cardinality returns 0.
    check('resource_grant_actions_not_empty', sql`cardinality(${t.actions}) >= 1`),
    index('resource_grant_user_idx').on(t.userId),
    // The index a list predicate rides: live grants only, so the filter is cheap enough
    // that nobody is tempted to run it after pagination.
    index('resource_grant_live_idx')
      .on(t.userId, t.resourceId)
      .where(sql`${t.revokedAt} IS NULL`),
  ],
);
