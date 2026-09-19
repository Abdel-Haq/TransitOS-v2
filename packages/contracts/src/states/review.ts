import * as z from 'zod';

/**
 * `00-shared-contract.md:90` — *"`draft` (`Brouillon`) → `submitted` (`À vérifier`) →
 * `approved` (`Approuvé`) / `rejected` (`Refusé`) / `changes_requested` (`À corriger`);
 * later relevant changes mark unconsumed approval `stale` (`À réexaminer`). A new version
 * requires a new review. Cancelling does not delete history."*
 *
 * English in storage, French in the UI — `:46`. The label belongs next to the code so a
 * screen cannot invent its own wording for a state.
 */
export const REVIEW_STATES = {
  draft: { label_fr: 'Brouillon' },
  submitted: { label_fr: 'À vérifier' },
  approved: { label_fr: 'Approuvé' },
  rejected: { label_fr: 'Refusé' },
  changes_requested: { label_fr: 'À corriger' },
  stale: { label_fr: 'À réexaminer' },
} as const;

export type ReviewState = keyof typeof REVIEW_STATES;
export const REVIEW_STATE_CODES = Object.keys(REVIEW_STATES) as readonly ReviewState[];
export const reviewStateSchema = z.enum(REVIEW_STATE_CODES as [ReviewState, ...ReviewState[]]);

/**
 * Permitted transitions. `stale` is reachable only from `approved`: it is what an
 * approval becomes when the data under it changes before the approval is consumed, and
 * nothing else in the lifecycle produces it.
 */
export const REVIEW_TRANSITIONS: Readonly<Record<ReviewState, readonly ReviewState[]>> = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected', 'changes_requested'],
  approved: ['stale'],
  rejected: [],
  changes_requested: ['draft'],
  // A stale approval is not repaired in place — `:90`, "A new version requires a new
  // review", so the new version starts its own lifecycle at draft.
  stale: [],
};

export const canTransition = (from: ReviewState, to: ReviewState): boolean =>
  REVIEW_TRANSITIONS[from].includes(to);

/** Only an `approved` decision can authorize a controlled command, and only once. */
export const isConsumable = (state: ReviewState): boolean => state === 'approved';
