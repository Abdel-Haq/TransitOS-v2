import { ConfigError, loadConfig } from '@dc/config';
import { claimJobs, completeJob, createDb, createPool, failJob, resolvePolicies } from '@dc/db';

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
const POLL_MS = 1_000;

/**
 * Retry limits, backoff and lease duration come from the policy register, not from a
 * constant here — `CLAUDE.md` §Policy keys. Phase 0.9 registered and seeded all three as
 * List A values with `source: engineering_default`, so they are approved values a reviewer
 * can supersede rather than numbers a developer chose.
 *
 * Resolved once at startup: a worker whose retry policy changed mid-run would apply two
 * policies to the same job. A restart picks up a superseded value.
 */
const JOB_POLICY_KEYS = [
  'policy.jobs.max_attempts',
  'policy.jobs.backoff_seconds',
  'policy.jobs.lease_seconds',
] as const;

/** Handlers land with the modules that own them. Phase 0.3 proves the loop, not the work. */
const HANDLERS: Record<string, (payload: unknown) => Promise<void>> = {};

const pool = createPool(config);
const db = createDb(pool);

const { resolved, blocking } = await resolvePolicies(db, JOB_POLICY_KEYS);
if (blocking.length > 0) {
  // Fail closed. A worker that started on an unresolved retry policy would invent one.
  console.error(
    'worker cannot start — unresolved policy:\n' +
      blocking.map((b) => `  - ${b.key} (${b.status}) : ${b.label_fr}`).join('\n') +
      '\nRun `pnpm db:seed` to register the engineering defaults.',
  );
  await pool.end();
  process.exit(78); // EX_CONFIG
}

const MAX_ATTEMPTS = Number(resolved.get('policy.jobs.max_attempts'));
const BACKOFF_SECONDS = Number(resolved.get('policy.jobs.backoff_seconds'));
const LEASE_SECONDS = Number(resolved.get('policy.jobs.lease_seconds'));

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
          MAX_ATTEMPTS,
          MAX_ATTEMPTS,
          BACKOFF_SECONDS,
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
          MAX_ATTEMPTS,
          BACKOFF_SECONDS,
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

console.log(
  `worker polling as ${OWNER} · max attempts ${MAX_ATTEMPTS} · backoff ${BACKOFF_SECONDS}s · ` +
    `lease ${LEASE_SECONDS}s, all from the policy register`,
);
void loop();
