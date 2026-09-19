import { and, eq, lte, or, sql } from 'drizzle-orm';
import { job } from '../schema/kernel.js';
import type { KernelDatabase, KernelTransaction } from './tx.js';

/**
 * The job queue. `00-shared-contract.md:40` — *"Queue claiming may use `SKIP LOCKED`;
 * business balance checks must not skip locked rows."*
 *
 * That distinction is the whole design. Skipping a locked row is correct here, where
 * another worker already has it, and catastrophic in a balance check, where it would
 * silently exclude a row from a total.
 */

export interface EnqueueJob {
  readonly handlerType: string;
  readonly payloadSchema: string;
  readonly payload: unknown;
  /** `dedupe_key UNIQUE`. Enqueueing the same key twice is a no-op, not a duplicate job. */
  readonly dedupeKey: string;
}

export const enqueueJob = async (tx: KernelTransaction, spec: EnqueueJob): Promise<void> => {
  await tx
    .insert(job)
    .values({
      handlerType: spec.handlerType,
      payloadSchema: spec.payloadSchema,
      payload: spec.payload as object,
      dedupeKey: spec.dedupeKey,
    })
    .onConflictDoNothing({ target: job.dedupeKey });
};

/**
 * Claim up to `limit` due jobs for `owner`, leasing them for `leaseSeconds`.
 *
 * The lease is a deadline, not a flag: a worker that dies mid-job leaves a lease that
 * expires, and the job returns to the queue instead of being stuck forever. That is why
 * `lease_until` is reclaimable below rather than requiring a janitor process.
 */
export interface ClaimedJob {
  readonly id: string;
  readonly handlerType: string;
  readonly payloadSchema: string;
  readonly payload: unknown;
  readonly dedupeKey: string;
  readonly attempts: number;
}

export const claimJobs = async (
  db: KernelDatabase,
  owner: string,
  limit: number,
  leaseSeconds: number,
): Promise<readonly ClaimedJob[]> => {
  const claimed = await db.execute(sql`
    UPDATE ${job}
    SET status = 'leased',
        lease_owner = ${owner},
        lease_until = now() + ${`${leaseSeconds} seconds`}::interval,
        attempts = ${job.attempts} + 1,
        updated_at = now()
    WHERE id IN (
      SELECT id FROM ${job}
      WHERE next_attempt_at <= now()
        AND (status = 'pending' OR (status = 'leased' AND lease_until < now()))
      ORDER BY next_attempt_at, id
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    RETURNING id, handler_type, payload_schema, payload, dedupe_key, attempts
  `);

  // Mapped by hand, not cast. `db.execute` returns the driver's raw rows with the
  // database's snake_case column names; drizzle's camelCase mapping only applies to the
  // query builder. Casting these to the inferred row type compiles and then hands every
  // caller `undefined` for `handlerType` — which is exactly what it did, until a worker
  // run printed `no handler for "undefined"`.
  return (claimed.rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    handlerType: row.handler_type as string,
    payloadSchema: row.payload_schema as string,
    // `client.ts` hands JSON columns to drizzle as raw text, so the query builder parses
    // them exactly once instead of twice. `db.execute` bypasses the query builder, so a
    // raw row's JSON is still text and this is where the single parse happens.
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    dedupeKey: row.dedupe_key as string,
    attempts: Number(row.attempts),
  }));
};

export const completeJob = async (
  tx: KernelTransaction,
  id: string,
  result?: { kind: string; id: string },
): Promise<void> => {
  await tx
    .update(job)
    .set({
      status: 'succeeded',
      leaseOwner: null,
      leaseUntil: null,
      resultKind: result?.kind ?? null,
      resultId: result?.id ?? null,
      updatedAt: sql`now()`,
    })
    .where(eq(job.id, id));
};

/**
 * Release a failed job for retry, backing off exponentially.
 *
 * `maxAttempts` is not a policy value invented here: it is passed in by the caller, which
 * reads it from the policy register. A default would be a business value chosen by a
 * developer — `CLAUDE.md` §Policy keys.
 */
export const failJob = async (
  tx: KernelTransaction,
  id: string,
  errorCode: string,
  attempts: number,
  maxAttempts: number,
  backoffSeconds: number,
): Promise<void> => {
  const exhausted = attempts >= maxAttempts;
  await tx
    .update(job)
    .set({
      status: exhausted ? 'failed' : 'pending',
      leaseOwner: null,
      leaseUntil: null,
      errorCode,
      nextAttemptAt: exhausted
        ? sql`now()`
        : sql`now() + ${`${backoffSeconds * 2 ** attempts} seconds`}::interval`,
      updatedAt: sql`now()`,
    })
    .where(eq(job.id, id));
};

/** Jobs whose lease has expired — reclaimable by `claimJobs`, listed here for monitoring. */
export const expiredLeases = (db: KernelDatabase) =>
  db
    .select()
    .from(job)
    .where(and(eq(job.status, 'leased'), or(lte(job.leaseUntil, sql`now()`))));
