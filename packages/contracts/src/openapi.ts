import * as z from 'zod';
import { decimalSchema } from './value/decimal.js';
import { moneySchema, currencyCodeSchema } from './value/money.js';
import { quantitySchema, transactionQuantitySchema } from './value/quantity.js';
import {
  resourceRefSchema,
  resourceKindSchema,
  dataClassificationSchema,
} from './value/resource-ref.js';
import { evidenceRefSchema, evidenceLocatorSchema } from './value/evidence-ref.js';
import { snapshotRefSchema, versionSchema, contentDigestSchema } from './value/snapshot-ref.js';
import { typedValueSchema } from './value/typed-value.js';
import { apiErrorSchema, fieldErrorSchema } from './errors/api-error.js';
import { reviewStateSchema } from './states/review.js';
import { externalStateSchema } from './states/external.js';

/**
 * `00-shared-contract.md:33` — the API is *"NestJS/TypeScript REST with generated OpenAPI
 * and runtime DTO validation"*.
 *
 * One definition serves both. Every schema below validates at runtime and renders into
 * the OpenAPI document, so a DTO cannot be documented as one thing and enforced as
 * another — which is the usual way a generated contract stops describing the service.
 */
export const COMPONENT_SCHEMAS = {
  Decimal: decimalSchema,
  CurrencyCode: currencyCodeSchema,
  Money: moneySchema,
  Quantity: quantitySchema,
  TransactionQuantity: transactionQuantitySchema,
  ResourceKind: resourceKindSchema,
  DataClassification: dataClassificationSchema,
  ResourceRef: resourceRefSchema,
  EvidenceLocator: evidenceLocatorSchema,
  EvidenceRef: evidenceRefSchema,
  Version: versionSchema,
  ContentDigest: contentDigestSchema,
  SnapshotRef: snapshotRefSchema,
  TypedValue: typedValueSchema,
  FieldError: fieldErrorSchema,
  ApiError: apiErrorSchema,
  ReviewState: reviewStateSchema,
  ExternalState: externalStateSchema,
} as const satisfies Record<string, z.ZodType>;

export type ComponentSchemaName = keyof typeof COMPONENT_SCHEMAS;

/**
 * The `components.schemas` object of the OpenAPI document.
 *
 * Emitted as draft 2020-12, the dialect OpenAPI 3.1 uses, so the output drops into the
 * document without a translation step that could change a constraint on the way.
 */
export const componentSchemas = (): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(COMPONENT_SCHEMAS).map(([name, schema]) => [
      name,
      z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input' }),
    ]),
  );
