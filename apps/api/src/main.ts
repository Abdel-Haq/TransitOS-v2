import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigError, loadConfig } from '@dc/config';
import { AppModule } from './app.module.js';

/**
 * Startup order matters. Configuration is validated *before* Nest is created, so a
 * deployment with a bad secret ref or a missing policy set exits with the full list of
 * problems instead of binding a port and failing later, per
 * `19-security-operations-delivery.md:63`.
 *
 * The API never runs migrations — `:65` requires the migration job to be separate.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('bootstrap');

  const result = loadConfig();
  if (!result.ok) {
    logger.error(new ConfigError(result.problems).message);
    process.exit(78); // EX_CONFIG
  }
  const config = result.config;

  const app = await NestFactory.create(AppModule);
  // The proxy routes /api to this process and passes the prefix through, so the
  // application owns it. Everything, health included, is reachable under API_BASE_URL.
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');

  logger.log(
    `API listening on ${port} · environment=${config.environment} · ` +
      `policy set=${config.approvedPolicySetId} · timezone=${config.businessTimezone}`,
  );
  const optional = [...config.enabledModules].filter((m) => m.startsWith('DF'));
  logger.log(`optional modules enabled: ${optional.length > 0 ? optional.join(', ') : 'none'}`);
}

void bootstrap();
