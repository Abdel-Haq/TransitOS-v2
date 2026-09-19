import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigError, loadConfig } from '@dc/config';
import { AppModule } from './app.module.js';
import { buildOpenApiDocument, OPENAPI_PATH } from './openapi.js';

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
  // Generated, then served read-only. `19-security-operations-delivery.md:65` keeps the
  // migration job out of startup; the OpenAPI document is the opposite case — it is
  // derived from the running route table, so it cannot go stale.
  const document = buildOpenApiDocument(app);
  app
    .getHttpAdapter()
    .get(`/${OPENAPI_PATH}`, (_req: unknown, res: { json: (b: unknown) => void }) =>
      res.json(document),
    );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');

  logger.log(`OpenAPI document at ${config.apiBaseUrl.origin}/${OPENAPI_PATH}`);
  logger.log(
    `API listening on ${port} · environment=${config.environment} · ` +
      `policy set=${config.approvedPolicySetId} · timezone=${config.businessTimezone} · ` +
      `approval=${config.approvalPolicyMode}`,
  );
  const optional = [...config.enabledModules].filter((m) => m.startsWith('DF'));
  logger.log(`optional modules enabled: ${optional.length > 0 ? optional.join(', ') : 'none'}`);
}

void bootstrap();
