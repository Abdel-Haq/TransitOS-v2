import * as z from 'zod';
import { ERROR_CATALOG, isErrorCode, type ErrorCode, type ErrorDefinition } from './catalog.js';

/**
 * `00-shared-contract.md:102` — *"`{code:Text,message_fr:Text,field_errors:[{field_path,
 * code,message_fr}],retryable:Boolean,request_id:UUID,details?:SafeDTO}`. Never include
 * secrets, raw SQL or unauthorized record facts."*
 *
 * `message_fr` is not accepted from the throw site: it is looked up from the catalog, so
 * a code and its French copy cannot drift apart across the hundreds of places an error is
 * raised. The same goes for `retryable`.
 */
export const fieldErrorSchema = z
  .object({
    field_path: z.string().min(1),
    code: z.string().min(1),
    message_fr: z.string().min(1),
  })
  .strict();

export type FieldError = z.infer<typeof fieldErrorSchema>;

export const apiErrorSchema = z
  .object({
    code: z.string().min(1),
    message_fr: z.string().min(1),
    field_errors: z.array(fieldErrorSchema),
    retryable: z.boolean(),
    request_id: z.uuid(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type ApiError = z.infer<typeof apiErrorSchema>;

export interface BuildErrorOptions {
  readonly request_id: string;
  readonly field_errors?: readonly FieldError[];
  /**
   * Values for the catalog copy's placeholders, e.g. `{libellé: 'Taux de TVA'}`.
   * A missing placeholder throws rather than shipping `{libellé}` to a user's screen.
   */
  readonly placeholders?: Readonly<Record<string, string>>;
  /**
   * `details` is a **SafeDTO**: it is serialized into the response as-is, so it must carry
   * nothing the caller is not already authorized to see. Never a raw driver error, never a
   * record the caller could not `GET`.
   */
  readonly details?: Readonly<Record<string, unknown>>;
}

export class ErrorCatalogError extends Error {}

export const renderMessage = (
  code: ErrorCode,
  placeholders: Readonly<Record<string, string>> = {},
): string => {
  // Widened to ErrorDefinition on purpose: `as const satisfies` keeps each entry's
  // literal type, so entries without placeholders have no such property to read.
  const definition: ErrorDefinition = ERROR_CATALOG[code];
  const expected = definition.placeholders ?? [];
  return expected.reduce<string>((message, name) => {
    const value = placeholders[name];
    if (value === undefined) {
      throw new ErrorCatalogError(
        `${code} needs the placeholder "${name}"; without it the user sees the literal ` +
          `"{${name}}" on screen.`,
      );
    }
    return message.replaceAll(`{${name}}`, value);
  }, definition.message_fr);
};

export const buildError = (code: ErrorCode, options: BuildErrorOptions): ApiError => {
  const definition: ErrorDefinition = ERROR_CATALOG[code];
  return {
    code,
    message_fr: renderMessage(code, options.placeholders),
    field_errors: [...(options.field_errors ?? [])],
    retryable: definition.retryable,
    request_id: options.request_id,
    ...(options.details === undefined ? {} : { details: { ...options.details } }),
  };
};

export const httpStatusFor = (code: string): number =>
  isErrorCode(code) ? ERROR_CATALOG[code].http_status : 500;
