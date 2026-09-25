import { eq, sql } from 'drizzle-orm';
import { LIST_A, POLICY_REGISTER } from '@dc/contracts';
import { userAccount } from '../schema/identity.js';
import { policyRequirement } from '../schema/rules.js';
import type { KernelDatabase } from '../kernel/tx.js';

/**
 * Seed the policy register — Phase 0.9.
 *
 * [ADR-005](../../../docs/01-DECISIONS.md#adr-005): List A is *"decided at bootstrap,
 * recorded as an approved policy version with `source: engineering_default`"*; List B
 * *"stays `unresolved`"* and blocks the capability it names.
 *
 * Idempotent, and **never overwrites an approved value**. A deployment where a reviewer
 * has approved something must not have it reset by a redeploy — and the immutability
 * trigger on `policy_requirement` would refuse anyway, so the seed skips rather than
 * fights it.
 */

/**
 * The bootstrap actor. `00-shared-contract.md:46` allows `created_by: UserRef|SystemActor`,
 * and an engineering default has no human approver — recording a person's id for a
 * decision they did not make would be the dishonest option.
 *
 * Suspended on creation: it exists for attribution and can never authenticate.
 */
export const SYSTEM_ACTOR_ID = '00000000-0000-4000-8000-000000000001';

export interface SeedResult {
  readonly inserted: number;
  readonly skipped: number;
  readonly listA: number;
  readonly listB: number;
}

export async function seedPolicyRegister(db: KernelDatabase): Promise<SeedResult> {
  await db
    .insert(userAccount)
    .values({
      id: SYSTEM_ACTOR_ID,
      subject: 'system:bootstrap',
      displayName: 'Amorçage système',
      audience: 'staff',
      suspended: true,
    })
    .onConflictDoNothing({ target: userAccount.id });

  const existing = new Set(
    (await db.select({ key: policyRequirement.key }).from(policyRequirement)).map((r) => r.key),
  );

  let inserted = 0;
  for (const entry of POLICY_REGISTER) {
    if (existing.has(entry.key)) continue;

    const approved = entry.list === 'A';
    await db.insert(policyRequirement).values({
      key: entry.key,
      scopeModule: entry.module,
      labelFr: entry.label_fr,
      schema: entry.schema,
      status: approved ? 'approved' : 'unresolved',
      value: approved ? (entry.value as object) : null,
      approvedBy: approved ? SYSTEM_ACTOR_ID : null,
      approvedAt: approved ? sql`now()` : null,
      source: approved ? 'engineering_default' : null,
      createdBy: SYSTEM_ACTOR_ID,
    });
    inserted += 1;
  }

  return {
    inserted,
    skipped: POLICY_REGISTER.length - inserted,
    listA: LIST_A.length,
    listB: POLICY_REGISTER.length - LIST_A.length,
  };
}

/** Keys still blocking a capability. What an operator reads on the readiness screen. */
export async function unresolvedKeys(db: KernelDatabase): Promise<string[]> {
  const rows = await db
    .select({ key: policyRequirement.key })
    .from(policyRequirement)
    .where(eq(policyRequirement.status, 'unresolved'));
  return rows.map((r) => r.key);
}
