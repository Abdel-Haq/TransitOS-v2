import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { componentSchemas } from '@dc/contracts';

/**
 * `00-shared-contract.md:33` — the API is *"NestJS/TypeScript REST with generated OpenAPI
 * and runtime DTO validation"*, and `:96` fixes the base path at `/api/v1`.
 *
 * The shared value types come from `packages/contracts`, where one Zod definition both
 * validates at runtime and renders to JSON Schema. Nest discovers route DTOs; the
 * components below are the types those DTOs are built from, so the document describes
 * exactly what the service enforces rather than a parallel description that drifts.
 */
export const OPENAPI_PATH = 'api/v1/openapi';

export const buildOpenApiDocument = (app: INestApplication): Record<string, unknown> => {
  const config = new DocumentBuilder()
    .setTitle('Dossier Clair')
    .setDescription(
      'API interne. Les libellés destinés aux utilisateurs sont en français ; ' +
        'les identifiants de schéma et d’API sont en anglais.',
    )
    .setVersion('v1')
    // 3.1, not Nest's 3.0 default. OpenAPI 3.0 schemas are a modified draft-04 subset,
    // and the component schemas come out of Zod as draft 2020-12 — the dialect 3.1 uses.
    // Emitting 2020-12 schemas inside a 3.0 document produces a document that validators
    // reject and generators mis-read, silently, in whichever direction they guess.
    .setOpenAPIVersion('3.1.0')
    // `:96` — browser access uses a same-origin session cookie plus CSRF, never a bearer
    // token in the browser. Documenting a bearer scheme here would invite exactly the
    // localStorage token the stack forbids.
    .addCookieAuth('session', { type: 'apiKey', in: 'cookie', name: 'session' })
    .build();

  const document = SwaggerModule.createDocument(app, config) as unknown as {
    components?: { schemas?: Record<string, unknown> };
  };

  // `$schema` belongs on a standalone schema document, not on a component inside an
  // OpenAPI document, where it is at best noise and at worst a second dialect claim.
  const components = Object.fromEntries(
    Object.entries(componentSchemas()).map(([name, schema]) => {
      const { $schema: _dialect, ...rest } = schema as Record<string, unknown>;
      return [name, rest];
    }),
  );

  document.components ??= {};
  document.components.schemas = { ...components, ...(document.components.schemas ?? {}) };

  return document as unknown as Record<string, unknown>;
};
