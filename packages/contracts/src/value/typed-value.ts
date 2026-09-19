import * as z from 'zod';
import { decimalSchema } from './decimal.js';
import { moneySchema } from './money.js';
import { quantitySchema } from './quantity.js';

/**
 * `20-data-api-contract-details.md:22` — *"Discriminated `{type:text/code/date/instant/
 * decimal/money/quantity/boolean/null,value:corresponding type}`. Null value is literal
 * null. Decimal does not silently become Money."*
 *
 * That last sentence is the whole point. A `TypedValue` carrying `"114.00"` is a Decimal
 * and stays one; turning it into `Money` requires a currency that nobody supplied, and
 * inventing one is how a rule comparison ends up comparing dirhams to euros. The
 * discriminated union makes the promotion impossible rather than discouraged.
 *
 * Used where a value's type is data rather than schema: rule predicate inputs, mapping
 * outputs, extraction candidates.
 */
export const typedValueSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), value: z.string() }).strict(),
  z.object({ type: z.literal('code'), value: z.string().min(1) }).strict(),
  // Date is a calendar date; Instant is a UTC timestamp. `00-shared-contract.md:47`
  // forbids deriving one from the other by adding fixed hours.
  z.object({ type: z.literal('date'), value: z.iso.date() }).strict(),
  z.object({ type: z.literal('instant'), value: z.iso.datetime({ offset: false }) }).strict(),
  z.object({ type: z.literal('decimal'), value: decimalSchema }).strict(),
  z.object({ type: z.literal('money'), value: moneySchema }).strict(),
  z.object({ type: z.literal('quantity'), value: quantitySchema }).strict(),
  z.object({ type: z.literal('boolean'), value: z.boolean() }).strict(),
  // "Null value is literal null" — not an omitted key, which would be indistinguishable
  // from a field nobody sent.
  z.object({ type: z.literal('null'), value: z.null() }).strict(),
]);

export type TypedValue = z.infer<typeof typedValueSchema>;
export type TypedValueKind = TypedValue['type'];

export const TYPED_VALUE_KINDS = [
  'text',
  'code',
  'date',
  'instant',
  'decimal',
  'money',
  'quantity',
  'boolean',
  'null',
] as const satisfies readonly TypedValueKind[];

/**
 * Two typed values are comparable only when they are the same kind. A rule predicate that
 * compares a `decimal` to a `money` has a bug in the rule, not in the data, and it should
 * surface as an unevaluable predicate rather than a coerced answer.
 */
export const comparable = (a: TypedValue, b: TypedValue): boolean => a.type === b.type;
