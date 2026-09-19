import { isLeaf, type Predicate, type PredicateLeaf, type TypedValue } from '@dc/contracts';
import { compareTyped, equalTyped } from './compare.js';

/**
 * Three-valued predicate evaluation — `14-DF04-rules.md:22`:
 *
 *   *"Evaluation is three-valued true/false/unknown. Missing value makes comparison
 *   unknown; all/any use deterministic three-valued logic. **Unknown never counts as
 *   eligible or not-applicable.**"*
 *
 * That last sentence is the whole reason this is not a boolean evaluator. A missing
 * declaration date must not make a deadline rule quietly inapplicable, and a missing
 * regime code must not make an eligibility rule quietly fail. Both are `unknown`, and
 * `unknown` blocks the action and says which input is missing — `CLAUDE.md`
 * non-negotiable #4.
 *
 * The logic is Kleene's strong three-valued logic:
 *
 * | `all` | contains `false` → `false`; else contains `unknown` → `unknown`; else `true` |
 * | `any` | contains `true` → `true`; else contains `unknown` → `unknown`; else `false` |
 * | `not` | inverts `true`/`false`, leaves `unknown` alone |
 *
 * Note what `all` does: one `false` beats any number of `unknown`s. A rule that is
 * definitely inapplicable on one clause is definitely inapplicable, whatever else is
 * missing — and that is a real answer, not a guess.
 */
export type Truth = 'true' | 'false' | 'unknown';

export interface UnknownCause {
  readonly field_path: string;
  readonly reason: 'missing_value' | 'not_in_allowlist' | 'incomparable_types';
  readonly detail?: string;
}

export interface EvaluationResult {
  readonly truth: Truth;
  /**
   * Every input that could not be resolved. Populated even when the result is `true` or
   * `false`, because a reviewer reading *why* a rule fired needs to know what was unknown
   * along the way — and `RULE_APPLICABILITY_UNKNOWN` has to name the field.
   */
  readonly unknowns: readonly UnknownCause[];
}

export interface EvaluationContext {
  /** Resolved field values, by dotted path. A path present with `undefined` is missing. */
  readonly values: Readonly<Record<string, TypedValue | undefined>>;
  /**
   * `14-DF04-rules.md:22` — *"Field paths come from module allowlist."* A path outside it
   * is `unknown`, never `false`: the rule asked about something this module does not
   * expose, which is a registration problem, not a negative answer.
   */
  readonly allowlist: ReadonlySet<string>;
}

export function evaluatePredicate(
  predicate: Predicate,
  context: EvaluationContext,
): EvaluationResult {
  const unknowns: UnknownCause[] = [];
  const truth = walk(predicate, context, unknowns);
  return { truth, unknowns };
}

const walk = (p: Predicate, ctx: EvaluationContext, unknowns: UnknownCause[]): Truth => {
  if (isLeaf(p)) return leaf(p, ctx, unknowns);

  if ('not' in p) {
    const inner = walk(p.not, ctx, unknowns);
    return inner === 'unknown' ? 'unknown' : inner === 'true' ? 'false' : 'true';
  }

  if ('all' in p) {
    // Every child is walked even after a `false`, so `unknowns` is complete. A reviewer
    // fixing one missing input should not have to re-run to discover the next one.
    const results = p.all.map((child) => walk(child, ctx, unknowns));
    if (results.includes('false')) return 'false';
    return results.includes('unknown') ? 'unknown' : 'true';
  }

  const results = p.any.map((child) => walk(child, ctx, unknowns));
  if (results.includes('true')) return 'true';
  return results.includes('unknown') ? 'unknown' : 'false';
};

const leaf = (p: PredicateLeaf, ctx: EvaluationContext, unknowns: UnknownCause[]): Truth => {
  if (!ctx.allowlist.has(p.field_path)) {
    unknowns.push({
      field_path: p.field_path,
      reason: 'not_in_allowlist',
      detail: 'the rule reads a field this module does not expose',
    });
    return 'unknown';
  }

  const actual = ctx.values[p.field_path];

  // `exists` is the one operator that resolves a missing value rather than being defeated
  // by it. Without it a rule could never say "this field must be supplied", because the
  // absence it wants to detect would make its own test unknown.
  if (p.operator === 'exists') {
    return actual === undefined || actual.type === 'null' ? 'false' : 'true';
  }

  if (actual === undefined) {
    unknowns.push({ field_path: p.field_path, reason: 'missing_value' });
    return 'unknown';
  }

  const expected = p.value;
  if (expected === undefined) {
    // Schema-invalid, and reachable only if a predicate bypassed validation. Unknown
    // rather than a throw: a malformed rule must block, not crash a posting.
    unknowns.push({
      field_path: p.field_path,
      reason: 'missing_value',
      detail: `operator "${p.operator}" has no value`,
    });
    return 'unknown';
  }

  if (p.operator === 'in') {
    const candidates = (Array.isArray(expected) ? expected : [expected]) as readonly TypedValue[];
    let sawIncomparable = false;
    for (const candidate of candidates) {
      const equal = equalTyped(actual, candidate);
      if (equal === true) return 'true';
      if (equal === undefined) sawIncomparable = true;
    }
    if (sawIncomparable) {
      // Some member of the list could not be compared, so "not in the list" is not
      // established. Reporting `false` here would be an answer the data does not support.
      unknowns.push({
        field_path: p.field_path,
        reason: 'incomparable_types',
        detail: `actual is ${actual.type}`,
      });
      return 'unknown';
    }
    return 'false';
  }

  const target = expected as TypedValue;

  if (p.operator === 'eq') {
    const equal = equalTyped(actual, target);
    if (equal === undefined) {
      unknowns.push({
        field_path: p.field_path,
        reason: 'incomparable_types',
        detail: `${actual.type} against ${target.type}`,
      });
      return 'unknown';
    }
    return equal ? 'true' : 'false';
  }

  const ordering = compareTyped(actual, target);
  if (ordering === undefined) {
    unknowns.push({
      field_path: p.field_path,
      reason: 'incomparable_types',
      detail: `${actual.type} against ${target.type}`,
    });
    return 'unknown';
  }

  switch (p.operator) {
    case 'lt':
      return ordering < 0 ? 'true' : 'false';
    case 'lte':
      return ordering <= 0 ? 'true' : 'false';
    case 'gt':
      return ordering > 0 ? 'true' : 'false';
    case 'gte':
      return ordering >= 0 ? 'true' : 'false';
  }
};

/**
 * Convenience for callers that must act on a definite answer.
 *
 * Deliberately **not** a coercion to boolean: it throws nothing away, it forces the caller
 * to name what happens on `unknown`. `14-DF04-rules.md:22` — unknown never counts as
 * eligible or not-applicable, so `result.truth === 'true'` is the only safe test for
 * "applies", and `=== 'false'` the only safe test for "does not apply".
 */
export const applies = (result: EvaluationResult): boolean => result.truth === 'true';
export const doesNotApply = (result: EvaluationResult): boolean => result.truth === 'false';
export const isUnresolved = (result: EvaluationResult): boolean => result.truth === 'unknown';
