import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { LIST_A, LIST_B, POLICY_REGISTER } from '@dc/contracts';
import { createDb, createPool } from '../client.js';
import { policyRequirement } from '../schema/rules.js';
import { userAccount } from '../schema/identity.js';
import { resolvePolicies, resolvePolicy } from '../kernel/policy.js';
import { seedPolicyRegister, unresolvedKeys, SYSTEM_ACTOR_ID } from './policy.js';

const pool = createPool();
const db = createDb(pool);
afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await db.execute(sql`TRUNCATE ${policyRequirement} CASCADE`);
  await db.execute(sql`TRUNCATE ${userAccount} CASCADE`);
});

describe('seeding the policy register', () => {
  it('writes every entry, List A approved and List B unresolved', async () => {
    const result = await seedPolicyRegister(db);
    expect(result.inserted).toBe(POLICY_REGISTER.length);

    const rows = await db.select().from(policyRequirement);
    expect(rows).toHaveLength(POLICY_REGISTER.length);
    expect(rows.filter((r) => r.status === 'approved')).toHaveLength(LIST_A.length);
    expect(rows.filter((r) => r.status === 'unresolved')).toHaveLength(LIST_B.length);
  });

  it('marks every approved value as an engineering default with the system actor', async () => {
    // ADR-005: List A is recorded with `source: engineering_default`. No human approved
    // these, and the register says so rather than borrowing someone's name.
    await seedPolicyRegister(db);
    for (const row of await db.select().from(policyRequirement)) {
      if (row.status !== 'approved') continue;
      expect(row.source, row.key).toBe('engineering_default');
      expect(row.approvedBy, row.key).toBe(SYSTEM_ACTOR_ID);
      expect(row.value, row.key).not.toBeNull();
    }
  });

  it('creates the bootstrap actor suspended, so it can never authenticate', async () => {
    await seedPolicyRegister(db);
    const [actor] = await db.select().from(userAccount).where(eq(userAccount.id, SYSTEM_ACTOR_ID));
    expect(actor!.suspended).toBe(true);
    expect(actor!.subject).toBe('system:bootstrap');
  });

  it('leaves every List B entry with no value at all', async () => {
    // A List B entry carrying a value would be a developer's guess wearing the register's
    // authority — which is the failure the whole mechanism exists to prevent.
    await seedPolicyRegister(db);
    for (const entry of LIST_B) {
      const result = await resolvePolicy(db, entry.key);
      expect(result.resolved, entry.key).toBe(false);
      if (result.resolved) continue;
      expect(result.status, entry.key).toBe('unresolved');
      expect(result.display_fr).toBe('À confirmer');
    }
  });

  it('resolves every List A entry to its registered default', async () => {
    await seedPolicyRegister(db);
    for (const entry of LIST_A) {
      const result = await resolvePolicy(db, entry.key);
      expect(result.resolved, entry.key).toBe(true);
      if (!result.resolved) continue;
      expect(result.value, entry.key).toEqual(entry.value);
    }
  });

  it('is idempotent', async () => {
    await seedPolicyRegister(db);
    const second = await seedPolicyRegister(db);
    expect(second.inserted).toBe(0);
    expect(second.skipped).toBe(POLICY_REGISTER.length);
  });

  it('never overwrites a value a reviewer has approved', async () => {
    // The case that matters on a redeploy. The immutability trigger would refuse anyway;
    // the seed skips rather than fighting it.
    await seedPolicyRegister(db);
    await db.execute(sql`TRUNCATE ${policyRequirement} CASCADE`);
    await db.insert(policyRequirement).values({
      key: 'policy.jobs.max_attempts',
      scopeModule: 'FD02',
      labelFr: 'Nombre maximal de tentatives par tâche',
      schema: { type: 'integer' },
      status: 'approved',
      value: 3 as unknown as object,
      approvedBy: SYSTEM_ACTOR_ID,
      approvedAt: '2026-09-01T00:00:00Z',
      source: 'finance_reviewer',
      createdBy: SYSTEM_ACTOR_ID,
    });

    await seedPolicyRegister(db);
    const result = await resolvePolicy(db, 'policy.jobs.max_attempts');
    expect(result.resolved).toBe(true);
    if (!result.resolved) return;
    expect(result.value).toBe(3); // the reviewer's value, not the seed's 5
  });

  it('reports the seventy keys still blocking a capability', async () => {
    await seedPolicyRegister(db);
    expect(await unresolvedKeys(db)).toHaveLength(LIST_B.length);
  });

  it('resolves the three keys the worker needs before it will start', async () => {
    // The worker fails closed on an unresolved retry policy rather than inventing one.
    await seedPolicyRegister(db);
    const { resolved, blocking } = await resolvePolicies(db, [
      'policy.jobs.max_attempts',
      'policy.jobs.backoff_seconds',
      'policy.jobs.lease_seconds',
    ]);
    expect(blocking).toHaveLength(0);
    expect(Number(resolved.get('policy.jobs.max_attempts'))).toBeGreaterThan(0);
  });
});
