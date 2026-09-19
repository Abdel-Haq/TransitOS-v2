import * as z from 'zod';

/**
 * `00-shared-contract.md:48` — *"JSON string, PostgreSQL NUMERIC; finite exact base-ten
 * value; no floats or scientific notation at external API boundary."*
 *
 * A `Decimal` is therefore a **string**, always, at every boundary. It is never a
 * JavaScript number, not even briefly: `0.1 + 0.2` is the reason this type exists, and a
 * value that passes through a `number` has already lost the exactness the ledger depends
 * on. `CLAUDE.md` non-negotiable #3.
 *
 * Trailing zeros are preserved. Scale is information — `114.00` is a price quoted to the
 * centime and `114` is not — and PostgreSQL NUMERIC preserves it too.
 */
const DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export const decimalSchema = z
  .string()
  .regex(DECIMAL, {
    message:
      'Decimal must be a base-ten string: optional leading "-", no leading zeros, no ' +
      'exponent, no thousands separator. Examples: "0", "114.00", "-12.5".',
  })
  .refine((v) => !/^-0(\.0*)?$/.test(v), {
    // Negative zero is never a meaningful business value. It means something upstream
    // negated a zero, and silently accepting it hides that.
    message: 'Decimal must not be negative zero.',
  })
  .brand<'Decimal'>();

export type Decimal = z.infer<typeof decimalSchema>;

export const isDecimal = (value: unknown): value is Decimal =>
  decimalSchema.safeParse(value).success;

/** Parse, or throw. For trusted internal literals — not for request bodies. */
export const decimal = (value: string): Decimal => decimalSchema.parse(value);

/** Digits after the decimal point. `"114.00"` has scale 2; `"114"` has scale 0. */
export const scaleOf = (value: Decimal): number => {
  const dot = (value as string).indexOf('.');
  return dot === -1 ? 0 : (value as string).length - dot - 1;
};

/**
 * Sign, without arithmetic: -1, 0 or 1.
 *
 * There is deliberately no `add`, `multiply` or `round` in this package. Exact arithmetic
 * belongs in `packages/domain` against a real decimal library, and rounding comes from
 * reviewed `CurrencyPolicy` (`00-shared-contract.md:49`), never from a default. Offering a
 * convenient `add` here is how a float creeps back in.
 */
export const signOf = (value: Decimal): -1 | 0 | 1 => {
  const s = value as string;
  if (s.startsWith('-')) return -1;
  return /[1-9]/.test(s) ? 1 : 0;
};
