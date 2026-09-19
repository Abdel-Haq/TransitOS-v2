import { ConfigError, loadConfig } from '@dc/config';
import { claimJobs, completeJob, createDb, createPool, failJob } from '@dc/db';

/**
 * The job and outbox worker.
 *
 * `00-shared-contract.md:40` puts the queue in PostgreSQL with worker leases and
 * idempotent handlers, and permits `SKIP LOCKED` *"for queue claiming"* only. The lease
 * is a deadline rather than a flag: a worker that dies mid-job leaves a lease that
 * expires and the job returns to the queue, so there is no janitor process to forget.
 *
 * It validates the same configuration as the API on purpose. A worker that started on a
 * configuration the API rejected would process jobs against the wrong database.
 */
const result = loadConfig();
if (!result.ok) {
  console.error(new ConfigError(result.problems).message);
  process.exit(78); // EX_CONFIG
}

const config = result.config;
console.log(
  `worker ready · environment=${config.environment} · timezone=${config.businessTimezone} · ` +
    `approval=${config.approvalPolicyMode}`,
);

const OWNER = `worker-${process.pid}`;
const BATCH = 10;
const LEASE_SECONDS = 60;
const POLL_MS = 1_000;

/**
 * Retry limits and backoff are **not** decided here. They are deployment policy, and
 * `CLAUDE.md` §Policy keys forbids inventing a number a reviewer should supply. Until the
 * policy register lands in Phase 0.8, a job that fails is left `pending` with a short
 * backoff and the handler registry is empty, so nothing silently retries forever against
 * a value nobody approved.
 */
const MAX_ATTEMPTS_POLICY_KEY = 'policy.jobs.max_attempts';
const PROVISIONAL_MAX_ATTEMPTS = 5;
const PROVISIONAL_BACKOFF_SECONDS = 10;

/** Handlers land with the modules that own them. Phase 0.3 proves the loop, not the work. */
const HANDLERS: Record<string, (payload: unknown) => Promise<void>> = {};

const pool = createPool(config);
const db = createDb(pool);
let running = true;

const tick = async (): Promise<void> => {
  const claimed = await claimJobs(db, OWNER, BATCH, LEASE_SECONDS);
  for (const claimedJob of claimed) {
    const handler = HANDLERS[claimedJob.handlerType];
    await db.transaction(async (tx) => {
      if (handler === undefined) {
        // An unknown handler is a deployment mismatch, not a transient fault. Failing it
        // loudly beats retrying it until the attempt limit hides the cause.
        await failJob(
          tx,
          claimedJob.id,
          'HANDLER_UNKNOWN',
          PROVISIONAL_MAX_ATTEMPTS,
          PROVISIONAL_MAX_ATTEMPTS,
          PROVISIONAL_BACKOFF_SECONDS,
        );
        console.error(`job ${claimedJob.id}: no handler for "${claimedJob.handlerType}"`);
        return;
      }
      try {
        await handler(claimedJob.payload);
        await completeJob(tx, claimedJob.id);
      } catch (error) {
        await failJob(
          tx,
          claimedJob.id,
          error instanceof Error ? error.message.slice(0, 100) : 'UNKNOWN',
          claimedJob.attempts,
          PROVISIONAL_MAX_ATTEMPTS, // see MAX_ATTEMPTS_POLICY_KEY
          PROVISIONAL_BACKOFF_SECONDS,
        );
      }
    });
  }
};

const loop = async (): Promise<void> => {
  while (running) {
    try {
      await tick();
    } catch (error) {
      // Never let one bad poll stop the worker; the next tick re-reads the queue.
      console.error('worker tick failed:', error instanceof Error ? error.message : error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
};

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`worker stopping on ${signal}; leases expire in ${LEASE_SECONDS}s`);
  running = false;
  void pool.end().then(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log(`worker polling as ${OWNER} · retry limit is provisional (${MAX_ATTEMPTS_POLICY_KEY})`);
void loop();
