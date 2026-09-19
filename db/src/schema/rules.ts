import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { ALL_MODULES } from '@dc/config';
import { POLICY_STATES } from '@dc/contracts';
import { userAccount } from './identity.js';

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });
const inList = (values: readonly string[]): string => values.map((v) => `'${v}'`).join(', ');

/**
 * The **minimal** typed rule registry — Phase 0.8.
 *
 * `14-DF04-rules.md:5` — *"A minimal registry exists before those core modules for
 * manually reviewed seed policies; this item adds source management, applicability UI and
 * impact analysis."* So DF04 at 4.1 **grows** this; it does not introduce it.
 *
 * Deliberately out of scope here, and belonging to 4.1: `RuleImpactRun`, `RuleImpactCase`,
 * source-URL management and the applicability screens. What 0.8 owns is the ability to
 * enter, review, activate and consume a seed rule — and to block a calculation that needs
 * a value nobody has approved.
 */

const RULE_CATEGORIES = [
  'eligibility',
  'documents',
  'valuation',
  'tax',
  'deadline',
  'disposition',
  'rounding',
  'contract',
  'closure',
] as const;

/** `14-DF04-rules.md:17` — `code UNIQUE,category,owner_user_id,description_fr`. */
export const ruleDefinition = pgTable(
  'rule_definition',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: text('code').notNull(),
    category: text('category').notNull(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => userAccount.id),
    descriptionFr: text('description_fr').notNull(),
    createdAt: instant('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
    updatedAt: instant('updated_at').notNull().defaultNow(),
  },
  (t) => [
    check(
      'rule_definition_category_check',
      sql`${t.category} IN (${sql.raw(inList(RULE_CATEGORIES))})`,
    ),
    uniqueIndex('rule_definition_code_unique').on(t.code),
  ],
);

const RULE_VERSION_STATES = [
  'draft',
  'in_review',
  'approved',
  'active',
  'superseded',
  'rejected',
] as const;

/**
 * `14-DF04-rules.md:18`. *"Source-backed version immutable after approval."*
 *
 * The immutability is enforced by a trigger in the migration rather than by the
 * application: `CLAUDE.md` non-negotiable #5 says approved rules are corrected by a new
 * version, never by update, and a rule the application enforces is a rule one forgotten
 * code path breaks.
 *
 * `predicate` and `effect` are JSONB with a schema version — `20-…:9` permits JSONB for
 * *"named versioned config schemas… with runtime validation and schema-version metadata"*,
 * which is exactly what these are. They are validated against `predicateSchema` on the way
 * in and never trusted on the way out.
 */
export const ruleVersion = pgTable(
  'rule_version',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ruleDefinitionId: uuid('rule_definition_id')
      .notNull()
      .references(() => ruleDefinition.id),
    versionLabel: text('version_label').notNull(),
    sourceDocumentVersionIds: uuid('source_document_version_ids')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    publicationDate: date('publication_date'),
    /** Date, not Instant. `20-…:11` — admission and effective dates are Date. */
    effectiveFrom: date('effective_from').notNull(),
    effectiveUntil: date('effective_until'),
    jurisdictionCode: text('jurisdiction_code').notNull(),
    regimeCodes: text('regime_codes')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    operationCodes: text('operation_codes')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    predicate: jsonb('predicate').notNull(),
    predicateSchemaVersion: text('predicate_schema_version').notNull().default('predicate.v1'),
    effect: jsonb('effect').notNull(),
    effectSchemaVersion: text('effect_schema_version').notNull().default('effect.v1'),
    interpretationFr: text('interpretation_fr').notNull(),
    /** `uncertainties_fr[]` — what the reviewer could not settle. Never silently empty. */
    uncertaintiesFr: text('uncertainties_fr')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    state: text('state').notNull().default('draft'),
    approvalId: uuid('approval_id'),
    createdAt: instant('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
    updatedAt: instant('updated_at').notNull().defaultNow(),
  },
  (t) => [
    check('rule_version_state_check', sql`${t.state} IN (${sql.raw(inList(RULE_VERSION_STATES))})`),
    check(
      'rule_version_window_check',
      sql`${t.effectiveUntil} IS NULL OR ${t.effectiveUntil} >= ${t.effectiveFrom}`,
    ),
    // `:26` — "approved→active only when … qualified independent decision … are complete."
    // A version cannot reach approved or active without the decision that authorized it.
    check(
      'rule_version_approved_has_decision',
      sql`${t.state} NOT IN ('approved', 'active') OR ${t.approvalId} IS NOT NULL`,
    ),
    uniqueIndex('rule_version_label_unique').on(t.ruleDefinitionId, t.versionLabel),
    // At most one active version per definition. `:26` — "Reject overlapping active
    // versions for identical applicability." Full applicability overlap needs the regime
    // and operation codes and lands with DF04; this catches the common case in the
    // database, where it cannot be forgotten.
    uniqueIndex('rule_version_one_active')
      .on(t.ruleDefinitionId)
      .where(sql`${t.state} = 'active'`),
    index('rule_version_effective_idx').on(t.effectiveFrom, t.effectiveUntil),
  ],
);

/**
 * `14-DF04-rules.md:19` — *"`user_id,scope_codes[],evidence_version_id,valid_from,
 * valid_until?,verified_by`; activation checks current scope."*
 *
 * Beyond the plan's list for 0.8, and deliberately. `00-shared-contract.md:79` says
 * `rule_reviewer` qualification is *"recorded, not inferred from role alone"*, and the
 * action registry entry for `rule.approve` carries that as a stated condition. Without
 * this table, activation would trust the role — the exact inference the spec forbids —
 * and `REVIEWER_NOT_QUALIFIED` would have nothing to check against.
 */
export const reviewerQualification = pgTable(
  'reviewer_qualification',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccount.id),
    scopeCodes: text('scope_codes').array().notNull(),
    evidenceVersionId: uuid('evidence_version_id'),
    validFrom: instant('valid_from').notNull().defaultNow(),
    validUntil: instant('valid_until'),
    verifiedBy: uuid('verified_by')
      .notNull()
      .references(() => userAccount.id),
    revokedAt: instant('revoked_at'),
    createdAt: instant('created_at').notNull().defaultNow(),
  },
  (t) => [
    check('reviewer_qualification_scope_not_empty', sql`cardinality(${t.scopeCodes}) >= 1`),
    check(
      'reviewer_qualification_window_check',
      sql`${t.validUntil} IS NULL OR ${t.validUntil} > ${t.validFrom}`,
    ),
    // A reviewer cannot verify their own qualification — the same separation of duty the
    // action registry enforces for every other controlled decision.
    check('reviewer_qualification_not_self', sql`${t.verifiedBy} <> ${t.userId}`),
    index('reviewer_qualification_user_idx').on(t.userId),
  ],
);

/**
 * `00-shared-contract.md:119` — *"`PolicyRequirement(key,scope_module,label_fr,schema,
 * status,value?,evidence_refs[],approved_by?,approved_at?,effective_from?)`."*
 *
 * The register behind `CLAUDE.md` §Policy keys. A number a qualified reviewer should
 * supply is registered here, not invented in code, and until it is approved the
 * calculation that needs it blocks and names itself.
 */
export const policyRequirement = pgTable(
  'policy_requirement',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    key: text('key').notNull(),
    scopeModule: text('scope_module').notNull(),
    labelFr: text('label_fr').notNull(),
    /** The JSON Schema an approved value must satisfy. Validated before approval. */
    schema: jsonb('schema').notNull(),
    status: text('status').notNull().default('unresolved'),
    value: jsonb('value'),
    evidenceVersionIds: uuid('evidence_version_ids')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    approvedBy: uuid('approved_by').references(() => userAccount.id),
    approvedAt: instant('approved_at'),
    effectiveFrom: date('effective_from'),
    /** `source: engineering_default` marks a List A value — ADR-005. */
    source: text('source'),
    createdAt: instant('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
    updatedAt: instant('updated_at').notNull().defaultNow(),
  },
  (t) => [
    check(
      'policy_requirement_status_check',
      sql`${t.status} IN (${sql.raw(inList(POLICY_STATES))})`,
    ),
    check(
      'policy_requirement_module_check',
      sql`${t.scopeModule} IN (${sql.raw(inList(ALL_MODULES))})`,
    ),
    // Namespaced `policy.<module>.<name>`, so a policy key can never be mistaken for a
    // capability code. CLAUDE.md §Policy keys.
    check(
      'policy_requirement_key_shape',
      sql`${t.key} ~ '^policy\\.[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$'`,
    ),
    // "Only approved versioned values are usable; do not deploy placeholder production
    // values." An approved row without a value, an approver and a date is a placeholder
    // wearing the word approved.
    check(
      'policy_requirement_approved_is_complete',
      sql`${t.status} <> 'approved' OR (${t.value} IS NOT NULL AND ${t.approvedBy} IS NOT NULL AND ${t.approvedAt} IS NOT NULL)`,
    ),
    uniqueIndex('policy_requirement_key_unique').on(t.key),
    index('policy_requirement_status_idx').on(t.status),
  ],
);

export const RULE_CATEGORY_VALUES = RULE_CATEGORIES;
export const RULE_VERSION_STATE_VALUES = RULE_VERSION_STATES;
