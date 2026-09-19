import * as z from 'zod';

/**
 * `00-shared-contract.md:94` — *"External states are independent."* Seven of them,
 * verbatim, with the French labels the spec gives.
 *
 * Independent is the load-bearing word, and `CLAUDE.md` non-negotiable #6 restates it:
 * a local export or an uploaded screenshot is not an official acceptance. There is
 * deliberately **no** function here mapping a review state to an external state, and no
 * transition table: the administration accepts or rejects on its own schedule, in any
 * order, and a state machine here would be this product asserting what an external body
 * did.
 */
export const EXTERNAL_STATES = {
  not_submitted: { label_fr: 'Non transmis' },
  prepared: { label_fr: 'Prêt à transmettre' },
  submitted: { label_fr: 'Transmis' },
  acknowledged: { label_fr: 'Réception confirmée' },
  accepted: { label_fr: "Accepté par l'organisme" },
  rejected: { label_fr: "Rejeté par l'organisme" },
  // Not a failure state and not a default — an explicitly recorded "we do not know",
  // which `CLAUDE.md` non-negotiable #4 requires instead of assuming.
  unknown: { label_fr: 'Statut externe inconnu' },
} as const;

export type ExternalState = keyof typeof EXTERNAL_STATES;
export const EXTERNAL_STATE_CODES = Object.keys(EXTERNAL_STATES) as readonly ExternalState[];
export const externalStateSchema = z.enum(
  EXTERNAL_STATE_CODES as [ExternalState, ...ExternalState[]],
);

/**
 * States that may only be recorded with verified evidence.
 *
 * `:94` — *"an authorized reviewer verifies manual evidence or a documented adapter
 * authenticates it."* These are the two an operator might be tempted to set from a
 * screenshot.
 */
export const EVIDENCE_BACKED_EXTERNAL_STATES: readonly ExternalState[] = ['accepted', 'rejected'];

export const requiresVerifiedEvidence = (state: ExternalState): boolean =>
  EVIDENCE_BACKED_EXTERNAL_STATES.includes(state);
