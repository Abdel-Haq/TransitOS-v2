import * as z from 'zod';

/**
 * `00-shared-contract.md:119` — *"Store `PolicyRequirement(key,scope_module,label_fr,
 * schema,status,value?,evidence_refs[],approved_by?,approved_at?,effective_from?)`. States
 * `unresolved/proposed/approved/superseded`. Only approved versioned values are usable; do
 * not deploy placeholder production values."*
 *
 * This is the mechanism behind `CLAUDE.md` §Policy keys: a number a qualified reviewer
 * should supply is never invented. The key is registered, the calculation blocks, and the
 * screen says `À confirmer`.
 */
export const POLICY_STATES = ['unresolved', 'proposed', 'approved', 'superseded'] as const;
export type PolicyState = (typeof POLICY_STATES)[number];

/**
 * Only `approved` is usable. `:119` — *"Only approved versioned values are usable."*
 * `proposed` looks like an answer and is not one, which is exactly why it needs naming:
 * a reviewer has suggested a value and nobody has approved it.
 */
export const isUsablePolicyState = (state: PolicyState): boolean => state === 'approved';

/**
 * Policy keys are namespaced `policy.<module>.<name>` so they can never collide with the
 * capability registry, which uses the bare `<noun>.<verb>` form. `CLAUDE.md` §Policy keys.
 */
export const policyKeySchema = z.string().regex(/^policy\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/, {
  message: 'A policy key is `policy.<module>.<name>`, e.g. `policy.invoice.numbering`.',
});

/** The French a user sees while a policy value is missing. `00-shared-contract.md:117`. */
export const UNCONFIRMED_FR = 'À confirmer';
