import { ConfigError, loadConfig } from '@dc/config';

/**
 * The job and outbox worker. Phase 0.3 gives it a queue to lease from; until then it
 * validates configuration and idles, so the Compose stack has the process the topology
 * of `19-security-operations-delivery.md:65` describes — API and worker sharing only
 * authorized database and object services.
 *
 * It validates the same configuration as the API on purpose. A worker that starts on a
 * configuration the API rejected would process jobs against the wrong database.
 */
const result = loadConfig();
if (!result.ok) {
  console.error(new ConfigError(result.problems).message);
  process.exit(78); // EX_CONFIG
}

const config = result.config;
console.log(
  `worker ready · environment=${config.environment} · timezone=${config.businessTimezone}`,
);

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`worker stopping on ${signal}`);
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Phase 0.3 replaces this with the lease loop over the job and outbox tables.
setInterval(() => {}, 60_000);
