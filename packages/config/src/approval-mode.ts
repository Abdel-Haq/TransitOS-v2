/**
 * The approval policy modes of [ADR-002](../../../docs/01-DECISIONS.md#adr-002).
 *
 * `00-shared-contract.md:86` sets the product default — *"Default approval policy is
 * independent reviewer: submitter cannot approve their own controlled action"* — and then
 * defers the alternative: *"An alternative policy is **assumption to verify** and is not
 * implemented as an ad hoc override."*
 *
 * So the mode is named, configured and environment-gated rather than hard-coded. The
 * point of naming it is that the production question stays visible as a decision instead
 * of being solved quietly by whoever hits the block first.
 */
export const APPROVAL_MODES = [
  'independent_reviewer',
  'dev_single_approver',
  'small_org_documented',
] as const;

export type ApprovalMode = (typeof APPROVAL_MODES)[number];

/**
 * Modes a deployed environment may run.
 *
 * `dev_single_approver` is absent on purpose, and the absence is the whole feature: it
 * lets one person develop against a two-person rule, and a deployment that reached
 * production with it set would have separation of duty switched off while every screen
 * still said `Approuvé`.
 */
export const DEPLOYABLE_APPROVAL_MODES: readonly ApprovalMode[] = [
  'independent_reviewer',
  'small_org_documented',
];

export const isApprovalMode = (value: string): value is ApprovalMode =>
  (APPROVAL_MODES as readonly string[]).includes(value);

export const isDeployableApprovalMode = (mode: ApprovalMode): boolean =>
  DEPLOYABLE_APPROVAL_MODES.includes(mode);
