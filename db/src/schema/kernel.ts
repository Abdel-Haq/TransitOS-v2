import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { DATA_CLASSIFICATIONS, RESOURCE_KINDS, REVIEW_STATE_CODES } from '@dc/contracts';

/**
 * The shared kernel — Phase 0.3.
 *
 * Every table here is transcribed from `02-FD02-evidence.md:19–25` and
 * `20-data-api-contract-details.md:15`. Enumerations are `text` with a CHECK rather than a
 * PostgreSQL enum type, because `20-…:9` asks for *"CHECK constraints for enums"* and
 * because adding a value to a pg enum is a migration that cannot run inside a
 * transaction alongside the rest of an expand-first deploy.
 *
 * Common fields come from `00-shared-contract.md:46`: every entity has `id: UUID`
 * generated server-side, `created_at`, `created_by`, `updated_at` and `version: bigint`.
 * Immutable records keep the fields and never update content.
 */

const inList = (values: readonly string[]): string => values.map((v) => `'${v}'`).join(', ');

/** `created_at`/`updated_at` are Instants — `20-…:11`, `_at` fields are Instant. */
const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });

/**
 * `02-FD02-evidence.md:19` — *"`kind`, `parent_id?`, `counterparty_id?`,
 * `classification:internal/client_shareable/restricted`; same id as registered concrete
 * domain entity; parent graph acyclic."*
 *
 * The id is the concrete row's id, not a surrogate: `20-…:11` requires every protected
 * business resource to *"share its ID with ResourceRecord"* and to create both in the same
 * transaction. That is what makes a `ResourceRef` resolvable without a polymorphic join.
 */
export const resourceRecord = pgTable(
  'resource_record',
  {
    id: uuid('id').primaryKey(),
    kind: text('kind').notNull(),
    parentId: uuid('parent_id'),
    counterpartyId: uuid('counterparty_id'),
    classification: text('classification').notNull(),
    createdAt: instant('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
    updatedAt: instant('updated_at').notNull().defaultNow(),
    version: bigint('version', { mode: 'bigint' })
      .notNull()
      .default(sql`1`),
  },
  (t) => [
    check('resource_record_kind_check', sql`${t.kind} IN (${sql.raw(inList(RESOURCE_KINDS))})`),
    check(
      'resource_record_classification_check',
      sql`${t.classification} IN (${sql.raw(inList(DATA_CLASSIFICATIONS))})`,
    ),
    // A resource cannot be its own parent. The full acyclicity of the parent graph needs
    // a recursive check and lands with the first module that builds a deep hierarchy;
    // this catches the one-step case a bug actually produces.
    check('resource_record_parent_not_self', sql`${t.parentId} IS DISTINCT FROM ${t.id}`),
    index('resource_record_parent_idx').on(t.parentId),
    index('resource_record_counterparty_idx').on(t.counterpartyId),
    index('resource_record_kind_idx').on(t.kind),
  ],
);

/**
 * `02-FD02-evidence.md:21` — *"`target_ref`, `action_code`, `payload_snapshot`,
 * `payload_digest`, `input_refs:SnapshotRef[]`, `reviewer_capability`, `submitted_by`,
 * `state:draft/submitted/decided/cancelled/stale`, `reason?`."*
 *
 * `reviewer_capability` is stored here, on the server's own record, precisely so the
 * command that later consumes the approval reads it from the database rather than from
 * the request — `CLAUDE.md` non-negotiable #2.
 */
const REVIEW_REQUEST_STATES = ['draft', 'submitted', 'decided', 'cancelled', 'stale'] as const;

export const reviewRequest = pgTable(
  'review_request',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    targetKind: text('target_kind').notNull(),
    targetId: uuid('target_id')
      .notNull()
      .references(() => resourceRecord.id),
    actionCode: text('action_code').notNull(),
    payloadSnapshot: jsonb('payload_snapshot').notNull(),
    /** The digest an approval is bound to. Recomputed and compared before any effect. */
    payloadDigest: text('payload_digest').notNull(),
    reviewerCapability: text('reviewer_capability').notNull(),
    submittedBy: uuid('submitted_by').notNull(),
    state: text('state').notNull().default('draft'),
    reason: text('reason'),
    createdAt: instant('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
    updatedAt: instant('updated_at').notNull().defaultNow(),
    version: bigint('version', { mode: 'bigint' })
      .notNull()
      .default(sql`1`),
  },
  (t) => [
    check(
      'review_request_kind_check',
      sql`${t.targetKind} IN (${sql.raw(inList(RESOURCE_KINDS))})`,
    ),
    check(
      'review_request_state_check',
      sql`${t.state} IN (${sql.raw(inList(REVIEW_REQUEST_STATES))})`,
    ),
    check('review_request_digest_check', sql`${t.payloadDigest} ~ '^sha256:[0-9a-f]{64}$'`),
    index('review_request_target_idx').on(t.targetId, t.actionCode),
    index('review_request_state_idx').on(t.state),
  ],
);

/**
 * `02-FD02-evidence.md:22` — *"`request_id`, `decision:approved/rejected/changes_requested`,
 * `reviewer_id`, `decided_at`, `reason?`, `bound_digest`, `consumed_effect_id?`; immutable.
 * One final decision per submitted request."*
 *
 * `consumed_effect_id` is the single-use latch. `00-shared-contract.md:92` — *"A previously
 * consumed approval cannot authorize another effect."* A partial unique index enforces it
 * at the database, not only in the code path that happens to be taken.
 *
 * `self_approved` is not in the spec. It is required by
 * [ADR-002](../../../docs/01-DECISIONS.md#adr-002), which permits solo approval in
 * development on condition that every such decision is stamped and queryable, so nobody
 * can later claim the separation held when it did not.
 */
const DECISIONS = ['approved', 'rejected', 'changes_requested'] as const;

export const approvalDecision = pgTable(
  'approval_decision',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    requestId: uuid('request_id')
      .notNull()
      .references(() => reviewRequest.id),
    decision: text('decision').notNull(),
    reviewerId: uuid('reviewer_id').notNull(),
    reviewerCapability: text('reviewer_capability').notNull(),
    decidedAt: instant('decided_at').notNull().defaultNow(),
    reason: text('reason'),
    boundDigest: text('bound_digest').notNull(),
    consumedEffectId: uuid('consumed_effect_id'),
    selfApproved: boolean('self_approved').notNull().default(false),
    createdAt: instant('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (t) => [
    check(
      'approval_decision_decision_check',
      sql`${t.decision} IN (${sql.raw(inList(DECISIONS))})`,
    ),
    check('approval_decision_digest_check', sql`${t.boundDigest} ~ '^sha256:[0-9a-f]{64}$'`),
    // "One final decision per submitted request", per reviewer capability: an action
    // needing two independent decisions stores one row per required capability.
    uniqueIndex('approval_decision_one_per_capability').on(t.requestId, t.reviewerCapability),
    index('approval_decision_unconsumed_idx')
      .on(t.requestId)
      .where(sql`${t.consumedEffectId} IS NULL`),
    // The audit query ADR-002 promises: every self-approval, findable.
    index('approval_decision_self_approved_idx')
      .on(t.decidedAt)
      .where(sql`${t.selfApproved} = true`),
  ],
);

/**
 * `02-FD02-evidence.md:23` — *"`actor_id`, `action_code`, `resource_ref`, `occurred_at`,
 * `request_id`, `before_digest?`, `after_digest?`, `changed_paths:Text[]`, `reason?`,
 * `related_refs[]`; append-only for app DB role."*
 *
 * Append-only is enforced by a role grant at deploy time, not by this file — a table
 * definition cannot stop the role that owns it. The migration creates the table; the
 * revoke lands with the deployment hardening in Phase 5.
 */
export const auditEvent = pgTable(
  'audit_event',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    actorId: uuid('actor_id').notNull(),
    actionCode: text('action_code').notNull(),
    resourceKind: text('resource_kind').notNull(),
    resourceId: uuid('resource_id').notNull(),
    occurredAt: instant('occurred_at').notNull().defaultNow(),
    /** The `request_id` echoed in the error envelope, so a user report reaches this row. */
    requestId: uuid('request_id').notNull(),
    beforeDigest: text('before_digest'),
    afterDigest: text('after_digest'),
    changedPaths: text('changed_paths')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    reason: text('reason'),
  },
  (t) => [
    check('audit_event_kind_check', sql`${t.resourceKind} IN (${sql.raw(inList(RESOURCE_KINDS))})`),
    index('audit_event_resource_idx').on(t.resourceId, t.occurredAt),
    index('audit_event_request_idx').on(t.requestId),
    index('audit_event_actor_idx').on(t.actorId, t.occurredAt),
  ],
);

/**
 * `02-FD02-evidence.md:24` — Job: *"`handler_type,payload_schema,payload,dedupe_key UNIQUE,
 * status,lease_owner?,lease_until?,attempts,next_attempt_at?,error_code?,result_ref?`"*.
 *
 * Claimed with `SKIP LOCKED`, which `00-shared-contract.md:40` permits for queue claiming
 * and forbids for business balance checks.
 */
const JOB_STATES = ['pending', 'leased', 'succeeded', 'failed', 'cancelled'] as const;

export const job = pgTable(
  'job',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    handlerType: text('handler_type').notNull(),
    payloadSchema: text('payload_schema').notNull(),
    payload: jsonb('payload').notNull(),
    dedupeKey: text('dedupe_key').notNull(),
    status: text('status').notNull().default('pending'),
    leaseOwner: text('lease_owner'),
    leaseUntil: instant('lease_until'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: instant('next_attempt_at').notNull().defaultNow(),
    errorCode: text('error_code'),
    resultKind: text('result_kind'),
    resultId: uuid('result_id'),
    createdAt: instant('created_at').notNull().defaultNow(),
    updatedAt: instant('updated_at').notNull().defaultNow(),
    version: bigint('version', { mode: 'bigint' })
      .notNull()
      .default(sql`1`),
  },
  (t) => [
    check('job_status_check', sql`${t.status} IN (${sql.raw(inList(JOB_STATES))})`),
    check('job_attempts_check', sql`${t.attempts} >= 0`),
    // A lease without an expiry is a job that never comes back if the worker dies.
    check('job_lease_consistent', sql`(${t.leaseOwner} IS NULL) = (${t.leaseUntil} IS NULL)`),
    uniqueIndex('job_dedupe_key_unique').on(t.dedupeKey),
    index('job_claim_idx')
      .on(t.nextAttemptAt)
      .where(sql`${t.status} = 'pending'`),
  ],
);

/**
 * `02-FD02-evidence.md:24` — outbox: *"`event_type,aggregate_ref,payload_schema,payload,
 * processed_at?`"*.
 *
 * Written in the same transaction as the effect (`00-shared-contract.md:92`), which is
 * what makes it an outbox rather than a second write that can be lost.
 */
export const outboxEvent = pgTable(
  'outbox_event',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventType: text('event_type').notNull(),
    aggregateKind: text('aggregate_kind').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    payloadSchema: text('payload_schema').notNull(),
    payload: jsonb('payload').notNull(),
    occurredAt: instant('occurred_at').notNull().defaultNow(),
    processedAt: instant('processed_at'),
  },
  (t) => [
    check('outbox_kind_check', sql`${t.aggregateKind} IN (${sql.raw(inList(RESOURCE_KINDS))})`),
    index('outbox_unprocessed_idx')
      .on(t.occurredAt)
      .where(sql`${t.processedAt} IS NULL`),
    index('outbox_aggregate_idx').on(t.aggregateId),
  ],
);

/**
 * `20-data-api-contract-details.md:15` — *"`IdempotencyRecord(principal_id,method,path,key,
 * request_digest,state:in_progress/completed,result_status?,result_body?,resource_ref?,
 * created_at,completed_at?)`, unique principal/method/path/key."*
 *
 * `:15` also settles the hard part: *"Failed effects that roll back cannot leave a
 * successful response."* The record is written in the same transaction as the effect, so a
 * rollback takes the claim with it and the retry is a fresh attempt rather than a replay
 * of a success that never happened.
 */
const IDEMPOTENCY_STATES = ['in_progress', 'completed'] as const;

export const idempotencyRecord = pgTable(
  'idempotency_record',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    principalId: uuid('principal_id').notNull(),
    method: text('method').notNull(),
    path: text('path').notNull(),
    key: text('key').notNull(),
    requestDigest: text('request_digest').notNull(),
    state: text('state').notNull().default('in_progress'),
    resultStatus: integer('result_status'),
    resultBody: jsonb('result_body'),
    resourceKind: text('resource_kind'),
    resourceId: uuid('resource_id'),
    createdAt: instant('created_at').notNull().defaultNow(),
    completedAt: instant('completed_at'),
  },
  (t) => [
    check('idempotency_state_check', sql`${t.state} IN (${sql.raw(inList(IDEMPOTENCY_STATES))})`),
    check('idempotency_digest_check', sql`${t.requestDigest} ~ '^sha256:[0-9a-f]{64}$'`),
    check(
      'idempotency_completed_has_status',
      sql`(${t.state} = 'completed') = (${t.resultStatus} IS NOT NULL)`,
    ),
    uniqueIndex('idempotency_unique').on(t.principalId, t.method, t.path, t.key),
  ],
);

export const REVIEW_REQUEST_STATE_VALUES = REVIEW_REQUEST_STATES;
export const JOB_STATE_VALUES = JOB_STATES;
export const DECISION_VALUES = DECISIONS;
/** Re-exported so a migration and a test cannot disagree about the review vocabulary. */
export const REVIEW_STATES_FROM_CONTRACTS = REVIEW_STATE_CODES;
