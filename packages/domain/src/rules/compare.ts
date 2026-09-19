import type { TypedValue } from '@dc/contracts';

/**
 * Comparison between two `TypedValue`s, without ever touching a float.
 *
 * Returns `undefined` where the pair is not comparable at all — different kinds, different
 * currencies, different units. That is not "false": a rule comparing dirhams to euros has
 * not established that the amounts differ, it has failed to ask a meaningful question, and
 * the three-valued evaluator turns that into `unknown` rather than a silent `false`.
 */
export type Ordering = -1 | 0 | 1;

/**
 * Compare two `Decimal` strings exactly.
 *
 * `Number(a) - Number(b)` would be correct for small values and quietly wrong above 2^53,
 * which is inside the range of a customs declaration in centimes. This compares sign, then
 * magnitude, then digits.
 */
export function compareDecimal(a: string, b: string): Ordering {
  const negA = a.startsWith('-');
  const negB = b.startsWith('-');
  if (negA !== negB) return negA ? -1 : 1;

  const magnitude = compareMagnitude(negA ? a.slice(1) : a, negB ? b.slice(1) : b);
  // Both negative flips the order: -2 < -1 even though 2 > 1.
  return negA ? (-magnitude as Ordering) : magnitude;
}

const compareMagnitude = (a: string, b: string): Ordering => {
  const [intA = '0', fracA = ''] = a.split('.');
  const [intB = '0', fracB = ''] = b.split('.');

  // A longer integer part is a larger number — after stripping leading zeros, which the
  // Decimal grammar forbids anyway but which a database round-trip can reintroduce.
  const cleanA = intA.replace(/^0+(?=\d)/, '');
  const cleanB = intB.replace(/^0+(?=\d)/, '');
  if (cleanA.length !== cleanB.length) return cleanA.length > cleanB.length ? 1 : -1;
  if (cleanA !== cleanB) return cleanA > cleanB ? 1 : -1;

  // Same integer part: pad the fractions to equal length and compare as digit strings.
  // "1.5" and "1.50" must compare equal — trailing zeros carry scale, not magnitude.
  const width = Math.max(fracA.length, fracB.length);
  const padA = fracA.padEnd(width, '0');
  const padB = fracB.padEnd(width, '0');
  if (padA === padB) return 0;
  return padA > padB ? 1 : -1;
};

/**
 * Order two typed values, or `undefined` when the question is not meaningful.
 *
 * Money and Quantity are never decomposed to compare them — `CLAUDE.md` non-negotiable #3.
 * Different currency or different unit yields `undefined`, and conversion is not attempted:
 * it needs an explicit `FxRateVersion` or reviewed unit rule that a predicate does not have.
 */
export function compareTyped(a: TypedValue, b: TypedValue): Ordering | undefined {
  if (a.type !== b.type) return undefined;

  switch (a.type) {
    case 'decimal':
      return compareDecimal(a.value, (b as typeof a).value);

    case 'money': {
      const other = (b as typeof a).value;
      if (a.value.currency_code !== other.currency_code) return undefined;
      return compareDecimal(a.value.amount, other.amount);
    }

    case 'quantity': {
      const other = (b as typeof a).value;
      if (a.value.unit_id !== other.unit_id) return undefined;
      return compareDecimal(a.value.value, other.value);
    }

    case 'date':
    case 'instant':
    case 'text':
    case 'code': {
      const other = (b as typeof a).value;
      // ISO-8601 dates and instants sort correctly as strings, which is the reason the
      // boundary format is ISO and not a locale rendering.
      if (a.value === other) return 0;
      return a.value > other ? 1 : -1;
    }

    case 'boolean': {
      const other = (b as typeof a).value;
      if (a.value === other) return 0;
      return a.value ? 1 : -1;
    }

    case 'null':
      // Two explicit nulls are equal. Ordering them is meaningless, and `lt` on a null is
      // a rule defect that should surface as unknown rather than as false.
      return 0;
  }
}

/** Equality only, for `eq` and `in`. Ordering is not required, so null compares cleanly. */
export const equalTyped = (a: TypedValue, b: TypedValue): boolean | undefined => {
  const ordering = compareTyped(a, b);
  return ordering === undefined ? undefined : ordering === 0;
};
