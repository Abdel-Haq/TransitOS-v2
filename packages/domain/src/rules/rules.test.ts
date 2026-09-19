import { describe, expect, it } from 'vitest';
import { predicateSchema, type Predicate, type TypedValue } from '@dc/contracts';
import { compareDecimal, compareTyped, equalTyped } from './compare.js';
import { applies, doesNotApply, evaluatePredicate, isUnresolved } from './evaluate.js';

const UNIT = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const OTHER_UNIT = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const dec = (v: string): TypedValue => ({ type: 'decimal', value: v });
const code = (v: string): TypedValue => ({ type: 'code', value: v });
const money = (amount: string, currency_code = 'MAD'): TypedValue => ({
  type: 'money',
  value: { amount, currency_code },
});
const qty = (value: string, unit_id = UNIT): TypedValue => ({
  type: 'quantity',
  value: { value, unit_id },
});

const ALLOW = new Set(['dossier.regime_code', 'dossier.valeur', 'dossier.poids', 'dossier.date']);
const evalWith = (p: Predicate, values: Record<string, TypedValue | undefined>) =>
  evaluatePredicate(p, { values, allowlist: ALLOW });

describe('exact decimal comparison', () => {
  it.each([
    ['1', '2', -1],
    ['2', '1', 1],
    ['1', '1', 0],
    ['1.5', '1.50', 0], // trailing zeros carry scale, not magnitude
    ['1.5', '1.51', -1],
    ['10', '9', 1], // longer integer part wins
    ['-1', '1', -1],
    ['-2', '-1', -1], // both negative flips the order
    ['-1', '-2', 1],
    ['0', '-0.001', 1],
    ['0.1', '0.10000', 0],
  ])('compares %s to %s as %s', (a, b, expected) => {
    expect(compareDecimal(a, b)).toBe(expected);
  });

  it('is exact beyond what a float could hold', () => {
    const a = '9007199254740993.0000001';
    const b = '9007199254740993.0000002';
    // Number() collapses these to the same value.
    expect(Number(a)).toBe(Number(b));
    expect(compareDecimal(a, b)).toBe(-1);
  });

  it('compares a 30-digit customs value correctly', () => {
    expect(compareDecimal('123456789012345678901234567890', '123456789012345678901234567891')).toBe(
      -1,
    );
  });
});

describe('typed comparison refuses meaningless questions', () => {
  it('will not compare across kinds', () => {
    expect(compareTyped(dec('1'), code('1'))).toBeUndefined();
    expect(equalTyped(dec('1'), code('1'))).toBeUndefined();
  });

  it('will not compare money in different currencies', () => {
    // Not false — the question was never meaningful. Conversion needs an FxRateVersion
    // the predicate does not have.
    expect(compareTyped(money('100', 'MAD'), money('100', 'EUR'))).toBeUndefined();
    expect(compareTyped(money('100', 'MAD'), money('100', 'MAD'))).toBe(0);
  });

  it('will not compare quantities in different units', () => {
    expect(compareTyped(qty('1', UNIT), qty('1', OTHER_UNIT))).toBeUndefined();
    expect(compareTyped(qty('2', UNIT), qty('1', UNIT))).toBe(1);
  });

  it('never decomposes Money or Quantity to compare them', () => {
    // CLAUDE.md non-negotiable #3. 100 MAD is not comparable to 100 EUR just because the
    // amounts match, and this is the check that keeps a rule from concluding otherwise.
    expect(equalTyped(money('100', 'MAD'), money('100', 'EUR'))).toBeUndefined();
    expect(equalTyped(qty('100', UNIT), qty('100', OTHER_UNIT))).toBeUndefined();
  });

  it('sorts ISO dates and instants as strings', () => {
    expect(
      compareTyped({ type: 'date', value: '2026-01-01' }, { type: 'date', value: '2026-02-01' }),
    ).toBe(-1);
  });
});

describe('three-valued leaves', () => {
  it('returns unknown for a missing value, never false', () => {
    // 14-DF04-rules.md:22 — "Missing value makes comparison unknown… Unknown never counts
    // as eligible or not-applicable." A missing regime code must not make an eligibility
    // rule quietly inapplicable.
    const result = evalWith(
      { field_path: 'dossier.regime_code', operator: 'eq', value: code('ATPA') },
      {},
    );
    expect(result.truth).toBe('unknown');
    expect(result.unknowns[0]).toEqual({
      field_path: 'dossier.regime_code',
      reason: 'missing_value',
    });
  });

  it('returns unknown for a path outside the module allowlist', () => {
    // The rule asked about something this module does not expose. A registration problem,
    // not a negative answer.
    const result = evalWith({ field_path: 'dossier.secret', operator: 'exists' } as never, {
      'dossier.secret': code('x'),
    });
    expect(result.truth).toBe('unknown');
    expect(result.unknowns[0]!.reason).toBe('not_in_allowlist');
  });

  it('lets `exists` resolve a missing value rather than being defeated by it', () => {
    // Without this, a rule could never say "this field must be supplied": the absence it
    // wants to detect would make its own test unknown.
    expect(evalWith({ field_path: 'dossier.valeur', operator: 'exists' }, {}).truth).toBe('false');
    expect(
      evalWith({ field_path: 'dossier.valeur', operator: 'exists' }, { 'dossier.valeur': dec('1') })
        .truth,
    ).toBe('true');
  });

  it('treats an explicit null as absent for `exists`', () => {
    expect(
      evalWith(
        { field_path: 'dossier.valeur', operator: 'exists' },
        {
          'dossier.valeur': { type: 'null', value: null },
        },
      ).truth,
    ).toBe('false');
  });

  it('returns unknown when the types cannot be compared', () => {
    const result = evalWith(
      { field_path: 'dossier.valeur', operator: 'gt', value: code('x') },
      {
        'dossier.valeur': dec('10'),
      },
    );
    expect(result.truth).toBe('unknown');
    expect(result.unknowns[0]!.reason).toBe('incomparable_types');
  });

  it.each([
    ['lt', '5', '10', 'true'],
    ['lt', '10', '10', 'false'],
    ['lte', '10', '10', 'true'],
    ['gt', '11', '10', 'true'],
    ['gte', '10', '10', 'true'],
    ['eq', '10.00', '10', 'true'],
  ] as const)('%s %s against %s is %s', (operator, actual, target, expected) => {
    expect(
      evalWith(
        { field_path: 'dossier.valeur', operator, value: dec(target) },
        {
          'dossier.valeur': dec(actual),
        },
      ).truth,
    ).toBe(expected);
  });

  it('handles `in` with a list', () => {
    const p: Predicate = {
      field_path: 'dossier.regime_code',
      operator: 'in',
      value: [code('ATPA'), code('AT')],
    };
    expect(evalWith(p, { 'dossier.regime_code': code('AT') }).truth).toBe('true');
    expect(evalWith(p, { 'dossier.regime_code': code('EX') }).truth).toBe('false');
  });

  it('returns unknown for `in` when any member is incomparable', () => {
    // "Not in the list" is not established if a member could not be compared. Returning
    // false would be an answer the data does not support.
    const p: Predicate = {
      field_path: 'dossier.regime_code',
      operator: 'in',
      value: [code('ATPA'), dec('1')],
    };
    expect(evalWith(p, { 'dossier.regime_code': code('EX') }).truth).toBe('unknown');
  });
});

describe('Kleene logic for all / any / not', () => {
  const t: Predicate = { field_path: 'dossier.valeur', operator: 'exists' };
  const f: Predicate = { field_path: 'dossier.poids', operator: 'exists' };
  const u: Predicate = {
    field_path: 'dossier.date',
    operator: 'eq',
    value: { type: 'date', value: '2026-01-01' },
  };
  const values = { 'dossier.valeur': dec('1') };

  it('all: one false beats any number of unknowns', () => {
    // A rule definitely inapplicable on one clause is definitely inapplicable, whatever
    // else is missing — and that is a real answer, not a guess.
    expect(evalWith({ all: [f, u, u] }, values).truth).toBe('false');
  });

  it('all: unknown wins over true', () => {
    expect(evalWith({ all: [t, u] }, values).truth).toBe('unknown');
  });

  it('all: every clause true is true', () => {
    expect(evalWith({ all: [t, t] }, values).truth).toBe('true');
  });

  it('any: one true beats any number of unknowns', () => {
    expect(evalWith({ any: [u, t, u] }, values).truth).toBe('true');
  });

  it('any: unknown wins over false', () => {
    expect(evalWith({ any: [f, u] }, values).truth).toBe('unknown');
  });

  it('any: every clause false is false', () => {
    expect(evalWith({ any: [f, f] }, values).truth).toBe('false');
  });

  it('not: inverts true and false, leaves unknown alone', () => {
    expect(evalWith({ not: t }, values).truth).toBe('false');
    expect(evalWith({ not: f }, values).truth).toBe('true');
    expect(evalWith({ not: u }, values).truth).toBe('unknown');
  });

  it('collects every unknown, not just the first', () => {
    // A reviewer fixing one missing input should not have to re-run to discover the next.
    const result = evalWith(
      { all: [f, u, { field_path: 'dossier.poids', operator: 'gt', value: dec('1') }] },
      values,
    );
    expect(result.truth).toBe('false');
    expect(result.unknowns.length).toBeGreaterThanOrEqual(2);
  });

  it('nests to arbitrary depth', () => {
    expect(evalWith({ all: [{ any: [f, { not: f }] }, t] }, values).truth).toBe('true');
  });
});

describe('unknown cannot be coerced', () => {
  it('is neither applies nor doesNotApply', () => {
    // The helpers exist so a caller must name what happens on unknown. There is no
    // toBoolean(), on purpose.
    const result = evalWith({ field_path: 'dossier.valeur', operator: 'gt', value: dec('1') }, {});
    expect(applies(result)).toBe(false);
    expect(doesNotApply(result)).toBe(false);
    expect(isUnresolved(result)).toBe(true);
  });
});

describe('the predicate schema is data, never code', () => {
  it('accepts a well-formed tree', () => {
    expect(
      predicateSchema.safeParse({
        all: [
          { field_path: 'dossier.regime_code', operator: 'in', value: [code('ATPA')] },
          { not: { field_path: 'dossier.valeur', operator: 'exists' } },
        ],
      }).success,
    ).toBe(true);
  });

  it.each([
    ['a field path with brackets', { field_path: 'a[0]', operator: 'exists' }],
    ['a field path with a quote', { field_path: "a'b", operator: 'exists' }],
    ['an uppercase field path', { field_path: 'Dossier.valeur', operator: 'exists' }],
    ['an unknown operator', { field_path: 'a.b', operator: 'matches', value: code('x') }],
    ['`exists` with a value', { field_path: 'a.b', operator: 'exists', value: code('x') }],
    ['`eq` without a value', { field_path: 'a.b', operator: 'eq' }],
    ['`in` with a single value', { field_path: 'a.b', operator: 'in', value: code('x') }],
    ['`lt` with a list', { field_path: 'a.b', operator: 'lt', value: [dec('1')] }],
    ['an empty all', { all: [] }],
    ['an extra key', { field_path: 'a.b', operator: 'exists', script: 'rm -rf /' }],
  ])('rejects %s', (_name, bad) => {
    expect(predicateSchema.safeParse(bad).success).toBe(false);
  });
});
