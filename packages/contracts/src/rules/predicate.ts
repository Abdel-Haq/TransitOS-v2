import * as z from 'zod';
import { typedValueSchema, type TypedValue } from '../value/typed-value.js';

/**
 * `14-DF04-rules.md:22` — *"PredicateSchema is a typed tree: `all[]`, `any[]`, `not`, or
 * leaf `{field_path,operator:eq/in/lt/lte/gt/gte/exists,value:TypedValue}`. Field paths
 * come from module allowlist; **no scripting/SQL/HTTP**."*
 *
 * That last clause is the design. A rule is data, not code: it cannot call out, cannot
 * query, and is never a string someone evaluates. `CLAUDE.md` non-negotiable #10 says the
 * same about model output, for the same reason — a reviewed rule that can execute is a
 * rule whose behaviour was never actually reviewed.
 */
export const PREDICATE_OPERATORS = ['eq', 'in', 'lt', 'lte', 'gt', 'gte', 'exists'] as const;
export type PredicateOperator = (typeof PREDICATE_OPERATORS)[number];

/**
 * A dotted path into the evaluation context, e.g. `dossier.regime_code`.
 *
 * Constrained rather than free text: the evaluator resolves it against a module allowlist,
 * and a path carrying brackets or quotes is the beginning of an expression language nobody
 * asked for.
 */
export const fieldPathSchema = z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/, {
  message: 'A field path is dotted snake_case, e.g. "dossier.regime_code".',
});

export interface PredicateLeaf {
  readonly field_path: string;
  readonly operator: PredicateOperator;
  /** Absent only for `exists`, which tests presence rather than comparing. */
  readonly value?: TypedValue | readonly TypedValue[];
}

export type Predicate =
  | { readonly all: readonly Predicate[] }
  | { readonly any: readonly Predicate[] }
  | { readonly not: Predicate }
  | PredicateLeaf;

const leafSchema = z
  .object({
    field_path: fieldPathSchema,
    operator: z.enum(PREDICATE_OPERATORS),
    value: z.union([typedValueSchema, z.array(typedValueSchema).min(1)]).optional(),
  })
  .strict()
  .superRefine((leaf, ctx) => {
    if (leaf.operator === 'exists') {
      if (leaf.value !== undefined) {
        ctx.addIssue({ code: 'custom', message: '`exists` takes no value.', path: ['value'] });
      }
      return;
    }
    if (leaf.value === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `\`${leaf.operator}\` needs a value.`,
        path: ['value'],
      });
      return;
    }
    const isList = Array.isArray(leaf.value);
    if (leaf.operator === 'in' && !isList) {
      ctx.addIssue({ code: 'custom', message: '`in` takes a list of values.', path: ['value'] });
    }
    if (leaf.operator !== 'in' && isList) {
      ctx.addIssue({
        code: 'custom',
        message: `\`${leaf.operator}\` takes one value, not a list.`,
        path: ['value'],
      });
    }
  });

export const predicateSchema: z.ZodType<Predicate> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(predicateSchema).min(1) }).strict(),
    z.object({ any: z.array(predicateSchema).min(1) }).strict(),
    z.object({ not: predicateSchema }).strict(),
    leafSchema,
  ]),
) as z.ZodType<Predicate>;

export const isLeaf = (p: Predicate): p is PredicateLeaf => 'field_path' in p;

/** Every field path a predicate reads, for allowlist checking before a rule is activated. */
export function fieldPathsOf(predicate: Predicate): string[] {
  if (isLeaf(predicate)) return [predicate.field_path];
  if ('not' in predicate) return fieldPathsOf(predicate.not);
  const children = 'all' in predicate ? predicate.all : predicate.any;
  return [...new Set(children.flatMap(fieldPathsOf))];
}
