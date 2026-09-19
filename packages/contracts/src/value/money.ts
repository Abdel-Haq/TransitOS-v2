import * as z from 'zod';
import { decimalSchema } from './decimal.js';

/**
 * `00-shared-contract.md:49` — *"`{amount: Decimal, currency_code: Currency.code}`.
 * Precision/rounding from reviewed CurrencyPolicy. No currency conversion without an
 * explicit FX version."*
 *
 * `Money` is never decomposed at a service or API boundary — `CLAUDE.md` non-negotiable
 * #3. An amount without its currency is not a smaller piece of a `Money`; it is a number
 * that has lost the only thing making it comparable.
 *
 * There is no `convert` here. Conversion needs an explicit `FxRateVersion`
 * (`20-data-api-contract-details.md:31`), which records the version used in the
 * calculation. A helper that converted without one would be the invented-value failure
 * ADR-005 exists to prevent.
 */
export const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, { message: 'currency_code must be a three-letter ISO 4217 code.' });

export const moneySchema = z
  .object({
    amount: decimalSchema,
    currency_code: currencyCodeSchema,
  })
  .strict();

export type Money = z.infer<typeof moneySchema>;

/**
 * True when two amounts are in the same currency and therefore comparable at all.
 *
 * Every caller that adds, compares or totals `Money` must check this first. Adding
 * 100 MAD to 100 EUR is not a rounding problem, it is a wrong answer.
 */
export const sameCurrency = (a: Money, b: Money): boolean => a.currency_code === b.currency_code;
