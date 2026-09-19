import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { evaluatePredicate, type Truth } from '@dc/domain';
import { UNCONFIRMED_FR, type Predicate, type TypedValue } from '@dc/contracts';
import { createDb, createPool } from '../client.js';
import { userAccount } from '../schema/identity.js';
import {
  policyRequirement,
  reviewerQualification,
  ruleDefinition,
  ruleVersion,
} from '../schema/rules.js';
import { policyRequiredDetails, resolvePolicies, resolvePolicy } from './policy.js';

/**
 * Drizzle wraps a driver error, so the trigger's own message is on the cause. Matching it
 * matters: asserting only that *something* threw would pass if an unrelated constraint
 * rejected the row, and the point of these tests is which rule fired.
 */
const rejectsWith = async (promise: Promise<unknown>, pattern: RegExp): Promise<void> => {
  try {
    await promise;
  } catch (error) {
    const cause = (error as { cause?: { message?: string } }).cause;
    const message = cause?.message ?? (error as Error).message;
    expect(message).toMatch(pattern);
    return;
  }
  throw new Error(`expected a rejection matching ${String(pattern)}`);
};

const pool = createPool();
const db = createDb(pool);
afterAll(async () => {
  await pool.end();
});

const REVIEWER = '11111111-1111-4111-8111-111111111111';
const VERIFIER = '22222222-2222-4222-8222-222222222222';

const seedRule = async (state = 'draft', approvalId: string | null = null) => {
  const [definition] = await db
    .insert(ruleDefinition)
    .values({
      code: `R-${randomUUID().slice(0, 8)}`,
      category: 'deadline',
      ownerUserId: REVIEWER,
      descriptionFr: 'Délai de séjour en entrepôt',
      createdBy: REVIEWER,
    })
    .returning();

  const predicate: Predicate = {
    all: [
      {
        field_path: 'dossier.regime_code',
        operator: 'in',
        value: [{ type: 'code', value: 'ATPA' }],
      },
      { field_path: 'dossier.valeur', operator: 'gt', value: { type: 'decimal', value: '0' } },
    ],
  };

  const [version] = await db
    .insert(ruleVersion)
    .values({
      ruleDefinitionId: definition!.id,
      versionLabel: 'v1',
      effectiveFrom: '2026-01-01',
      jurisdictionCode: 'MA',
      regimeCodes: ['ATPA'],
      predicate: predicate as object,
      effect: { kind: 'set_deadline', period_unit: 'business_day' },
      interpretationFr: 'Le délai court à compter de la date d’admission.',
      uncertaintiesFr: ['La durée exacte est à confirmer par un référent réglementaire.'],
      state,
      approvalId,
      createdBy: REVIEWER,
    })
    .returning();

  return { definition: definition!, version: version! };
};

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE ${ruleVersion}, ${ruleDefinition}, ${reviewerQualification}, ${policyRequirement} CASCADE`,
  );
  await db.execute(sql`TRUNCATE ${userAccount} CASCADE`);
  await db.insert(userAccount).values([
    { id: REVIEWER, subject: 'reviewer', displayName: 'Référent', audience: 'staff' },
    { id: VERIFIER, subject: 'verifier', displayName: 'Vérificateur', audience: 'staff' },
  ]);
});

describe('the seed rule lifecycle', () => {
  it('stores a draft rule with its predicate and its uncertainties', async () => {
    const { version } = await seedRule();
    expect(version.state).toBe('draft');
    // uncertainties_fr is never silently empty: what the reviewer could not settle is
    // part of the record, not a comment they made somewhere else.
    expect(version.uncertaintiesFr).toHaveLength(1);
    expect(version.predicateSchemaVersion).toBe('predicate.v1');
  });

  it('refuses approved or active without the decision that authorized it', async () => {
    // 14-DF04-rules.md:26 — approved→active only when a qualified independent decision is
    // complete. A state without its approval_id is a claim with no evidence.
    await expect(seedRule('approved', null)).rejects.toThrow();
    await expect(seedRule('active', null)).rejects.toThrow();
  });

  it('allows a draft to be edited', async () => {
    const { version } = await seedRule();
    await db
      .update(ruleVersion)
      .set({ interpretationFr: 'Interprétation révisée.' })
      .where(eq(ruleVersion.id, version.id));
    const [row] = await db.select().from(ruleVersion).where(eq(ruleVersion.id, version.id));
    expect(row!.interpretationFr).toBe('Interprétation révisée.');
  });

  it('refuses a second active version for the same definition', async () => {
    // :26 — "Reject overlapping active versions for identical applicability."
    const { definition } = await seedRule('active', randomUUID());
    await expect(
      db.insert(ruleVersion).values({
        ruleDefinitionId: definition.id,
        versionLabel: 'v2',
        effectiveFrom: '2026-06-01',
        jurisdictionCode: 'MA',
        predicate: {},
        effect: {},
        interpretationFr: 'x',
        state: 'active',
        approvalId: randomUUID(),
        createdBy: REVIEWER,
      }),
    ).rejects.toThrow();
  });

  it('refuses an effective window that closes before it opens', async () => {
    const { definition } = await seedRule();
    await expect(
      db.insert(ruleVersion).values({
        ruleDefinitionId: definition.id,
        versionLabel: 'v-bad',
        effectiveFrom: '2026-06-01',
        effectiveUntil: '2026-01-01',
        jurisdictionCode: 'MA',
        predicate: {},
        effect: {},
        interpretationFr: 'x',
        createdBy: REVIEWER,
      }),
    ).rejects.toThrow();
  });

  it('refuses a duplicate rule code', async () => {
    const { definition } = await seedRule();
    await expect(
      db.insert(ruleDefinition).values({
        code: definition.code,
        category: 'tax',
        ownerUserId: REVIEWER,
        descriptionFr: 'duplicate',
        createdBy: REVIEWER,
      }),
    ).rejects.toThrow();
  });
});

describe('approved content is immutable at the database', () => {
  it('refuses to edit the predicate of an approved version', async () => {
    // CLAUDE.md non-negotiable #5. Enforced by trigger, not by the application: a rule the
    // application enforces is a rule one forgotten code path breaks, and the value of an
    // approved version is that a calculation years later replays exactly what was approved.
    const { version } = await seedRule('approved', randomUUID());
    await rejectsWith(
      db
        .update(ruleVersion)
        .set({ predicate: { any: [] } })
        .where(eq(ruleVersion.id, version.id)),
      /corrected by a new version/,
    );
  });

  it.each(['interpretationFr', 'effectiveFrom', 'jurisdictionCode'] as const)(
    'refuses to edit %s on an active version',
    async (field) => {
      const { version } = await seedRule('active', randomUUID());
      const patch: Record<string, unknown> = {
        interpretationFr: 'changed',
        effectiveFrom: '2027-01-01',
        jurisdictionCode: 'FR',
      };
      await expect(
        db
          .update(ruleVersion)
          .set({ [field]: patch[field] } as never)
          .where(eq(ruleVersion.id, version.id)),
      ).rejects.toThrow();
    },
  );

  it('still allows the lifecycle transition to superseded', async () => {
    // 20-…:13 — "Approved rule content is immutable even if its lifecycle metadata later
    // becomes superseded." State moves; content does not.
    const { version } = await seedRule('active', randomUUID());
    await db.update(ruleVersion).set({ state: 'superseded' }).where(eq(ruleVersion.id, version.id));
    const [row] = await db.select().from(ruleVersion).where(eq(ruleVersion.id, version.id));
    expect(row!.state).toBe('superseded');
  });
});

describe('reviewer qualification is recorded, not inferred', () => {
  it('stores a qualification with its scope and verifier', async () => {
    // 00-shared-contract.md:79 — "qualification recorded, not inferred from role alone."
    const [q] = await db
      .insert(reviewerQualification)
      .values({ userId: REVIEWER, scopeCodes: ['deadline', 'tax'], verifiedBy: VERIFIER })
      .returning();
    expect(q!.scopeCodes).toEqual(['deadline', 'tax']);
  });

  it('refuses a qualification a reviewer verified for themselves', async () => {
    await expect(
      db.insert(reviewerQualification).values({
        userId: REVIEWER,
        scopeCodes: ['deadline'],
        verifiedBy: REVIEWER,
      }),
    ).rejects.toThrow();
  });

  it('refuses an empty scope', async () => {
    await expect(
      db
        .insert(reviewerQualification)
        .values({ userId: REVIEWER, scopeCodes: [], verifiedBy: VERIFIER }),
    ).rejects.toThrow();
  });
});

describe('the policy register and the À confirmer path', () => {
  const register = async (key: string, status: string, value: unknown = null) =>
    db.insert(policyRequirement).values({
      key,
      scopeModule: 'CR02',
      labelFr: 'Taux de TVA applicable',
      schema: { type: 'string' },
      status,
      value: value as object | null,
      approvedBy: status === 'approved' ? VERIFIER : null,
      approvedAt: status === 'approved' ? '2026-09-01T00:00:00Z' : null,
      createdBy: REVIEWER,
    });

  it('resolves an approved value', async () => {
    await register('policy.invoice.tax', 'approved', '20');
    const result = await resolvePolicy(db, 'policy.invoice.tax');
    expect(result.resolved).toBe(true);
    if (!result.resolved) return;
    expect(result.value).toBe('20');
  });

  it.each(['unresolved', 'proposed', 'superseded'])('blocks on a %s value', async (status) => {
    // :119 — "Only approved versioned values are usable." `proposed` looks like an answer
    // and is not one: a reviewer suggested it and nobody approved it.
    await register('policy.invoice.tax', status, status === 'unresolved' ? null : '20');
    const result = await resolvePolicy(db, 'policy.invoice.tax');
    expect(result.resolved).toBe(false);
    if (result.resolved) return;
    expect(result.status).toBe(status);
    expect(result.display_fr).toBe(UNCONFIRMED_FR);
    expect(result.label_fr).toBe('Taux de TVA applicable');
  });

  it('distinguishes a key nobody registered from one nobody answered', async () => {
    // Different problems: `unresolved` is a registered question awaiting an answer,
    // `missing` is a question the module never asked, which is a registration bug.
    const result = await resolvePolicy(db, 'policy.invoice.nothing');
    expect(result.resolved).toBe(false);
    if (result.resolved) return;
    expect(result.status).toBe('missing');
  });

  it('reports every blocking key at once, not the first', async () => {
    // A finance reviewer chasing an invoice that will not issue should learn about
    // numbering, tax and rounding in one pass.
    await register('policy.invoice.numbering', 'unresolved');
    await register('policy.invoice.tax', 'approved', '20');
    await register('policy.invoice.rounding', 'proposed', 'half_up');

    const { resolved, blocking } = await resolvePolicies(db, [
      'policy.invoice.numbering',
      'policy.invoice.tax',
      'policy.invoice.rounding',
      'policy.invoice.absent',
    ]);
    expect(resolved.get('policy.invoice.tax')).toBe('20');
    expect(blocking.map((b) => b.key).sort()).toEqual([
      'policy.invoice.absent',
      'policy.invoice.numbering',
      'policy.invoice.rounding',
    ]);
  });

  it('builds the POLICY_REQUIRED payload with the French label and the keys', async () => {
    await register('policy.invoice.tax', 'unresolved');
    const { blocking } = await resolvePolicies(db, ['policy.invoice.tax']);
    const payload = policyRequiredDetails(blocking);
    expect(payload['libellé']).toBe('Taux de TVA applicable');
    expect(payload.details.policy_keys).toEqual([
      { key: 'policy.invoice.tax', status: 'unresolved' },
    ]);
  });

  it('refuses an approved row with no value', async () => {
    // "Do not deploy placeholder production values." An approved row without a value, an
    // approver and a date is a placeholder wearing the word approved.
    await expect(register('policy.invoice.tax', 'approved', null)).rejects.toThrow();
  });

  it('returns a Decimal policy value as an exact string, never a float', async () => {
    // JSON and JSONB were parsed twice — node-postgres parses the column, then drizzle
    // parses the resulting string again — so a stored "20" came back as the number 20 and
    // "12345678901234567890.123456789" came back as 12345678901234567000. A tax rate and a
    // rounding scale both live here, so this destroyed exactness on the read path.
    // client.ts now hands JSON text to drizzle unparsed, leaving exactly one parse.
    const exact = '12345678901234567890.123456789';
    await register('policy.invoice.rate', 'approved', exact);
    const result = await resolvePolicy(db, 'policy.invoice.rate');
    expect(result.resolved).toBe(true);
    if (!result.resolved) return;
    expect(typeof result.value).toBe('string');
    expect(result.value).toBe(exact);
    expect(String(Number(exact))).not.toBe(exact); // what a float would have done
  });

  it('round-trips an object policy value unchanged', async () => {
    await register('policy.invoice.rounding', 'approved', { scale: 2, mode: 'half_up' });
    const result = await resolvePolicy(db, 'policy.invoice.rounding');
    expect(result.resolved).toBe(true);
    if (!result.resolved) return;
    expect(result.value).toEqual({ scale: 2, mode: 'half_up' });
  });

  it('refuses a key outside the policy namespace', async () => {
    await expect(register('invoice.tax', 'unresolved')).rejects.toThrow();
    await expect(register('privacy.export', 'unresolved')).rejects.toThrow();
  });

  it('refuses to edit an approved value in place', async () => {
    await register('policy.invoice.tax', 'approved', '20');
    await rejectsWith(
      db
        .update(policyRequirement)
        .set({ value: '19' as unknown as object })
        .where(eq(policyRequirement.key, 'policy.invoice.tax')),
      /supersede it instead/,
    );
  });

  it('allows superseding it', async () => {
    await register('policy.invoice.tax', 'approved', '20');
    await db
      .update(policyRequirement)
      .set({ status: 'superseded' })
      .where(eq(policyRequirement.key, 'policy.invoice.tax'));
    const result = await resolvePolicy(db, 'policy.invoice.tax');
    expect(result.resolved).toBe(false);
  });
});

describe('a stored rule evaluates end to end', () => {
  const ALLOW = new Set(['dossier.regime_code', 'dossier.valeur']);

  const evaluateStored = async (values: Record<string, TypedValue | undefined>): Promise<Truth> => {
    const [row] = await db.select().from(ruleVersion).limit(1);
    // JSONB comes back as data and is validated, never trusted.
    return evaluatePredicate(row!.predicate as Predicate, { values, allowlist: ALLOW }).truth;
  };

  it('fires when every input is present and satisfied', async () => {
    await seedRule();
    expect(
      await evaluateStored({
        'dossier.regime_code': { type: 'code', value: 'ATPA' },
        'dossier.valeur': { type: 'decimal', value: '1000.00' },
      }),
    ).toBe('true');
  });

  it('does not fire when a clause is definitely false', async () => {
    await seedRule();
    expect(
      await evaluateStored({
        'dossier.regime_code': { type: 'code', value: 'EX' },
        'dossier.valeur': { type: 'decimal', value: '1000.00' },
      }),
    ).toBe('false');
  });

  it('is unknown — not false — when an input is missing', async () => {
    // The whole point of 0.8. A missing value blocks the calculation and names itself
    // rather than quietly making the rule inapplicable.
    await seedRule();
    expect(await evaluateStored({ 'dossier.regime_code': { type: 'code', value: 'ATPA' } })).toBe(
      'unknown',
    );
  });

  it('survives the JSONB round trip with its decimal intact', async () => {
    await seedRule();
    const [row] = await db.select().from(ruleVersion).limit(1);
    const predicate = row!.predicate as { all: { value?: TypedValue }[] };
    expect(predicate.all[1]!.value).toEqual({ type: 'decimal', value: '0' });
  });
});
