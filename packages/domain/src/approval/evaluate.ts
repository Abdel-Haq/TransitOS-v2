// Read through the exported accessors, not ACTION_REGISTRY directly: the registry is
// declared `as const satisfies`, which keeps each entry's literal type, so an optional
// property is simply absent from the entries that omit it. The accessors widen to
// `RequiredDecision`, where `capability` and `condition` exist and may be undefined.
import {
  requiredDecisionsFor,
  type ControlledActionCode,
  type RequiredDecision,
  type RoleCode,
} from '@dc/contracts';
import type {
  ApprovalContext,
  ApprovalOutcome,
  MissingDecision,
  RecordedDecision,
} from './types.js';

/**
 * The policy key a deployment must have approved before `small_org_documented` can name
 * which action families a submitter may approve.
 * [ADR-002](../../../../docs/01-DECISIONS.md#adr-002) — *"Subset and eligibility are an
 * approved policy value."*
 */
export const SMALL_ORG_SUBSET_POLICY_KEY = 'policy.approval.small_org_subset';

/**
 * Does this controlled action have every decision it needs?
 *
 * Framework-free and pure: no HTTP, no SQL, no clock. It is the single place the
 * separation-of-duty rule is decided, and `00-shared-contract.md:92` puts the call
 * inside the controlled-command transaction, after the row locks and before the effect.
 *
 * Three rules from `20-data-api-contract-details.md:79` drive everything below:
 *
 *   *"require every required decision before effect"* — all of them, or nothing.
 *   *"The submitter cannot supply any of them"* — the universal rule, relaxed only by an
 *   explicitly configured development mode.
 *   *"A reviewer may satisfy multiple required capabilities if explicitly granted and
 *   qualified; do not invent a required staff count."* — so one person may close several
 *   decisions, and this function never counts distinct approvers.
 */
export function evaluateApproval(context: ApprovalContext): ApprovalOutcome {
  if (context.mode === 'small_org_documented') {
    // ADR-002: named so the production question stays visible, deliberately not
    // implemented until a real customer needs it. Blocking with the policy key is the
    // honest answer; quietly behaving like `independent_reviewer` would hide that a
    // deployment asked for something it did not get.
    return {
      satisfied: false,
      code: 'POLICY_REQUIRED',
      missing: [],
      policy_key: SMALL_ORG_SUBSET_POLICY_KEY,
    };
  }

  const applies = (decision: RequiredDecision): boolean =>
    decision.condition === undefined || context.conditions_met[decision.reviewer_role] === true;

  const required = requiredDecisionsFor(context.action).filter(applies);

  const missing: MissingDecision[] = [];
  const stamped: RecordedDecision[] = [];

  for (const requirement of required) {
    // Match on capability where the spec names one; otherwise on role, because the row
    // names only a role and the owning module has not yet supplied a capability.
    const candidates = context.decisions.filter((d) =>
      requirement.capability === undefined
        ? d.role === requirement.reviewer_role
        : d.capability === requirement.capability,
    );

    if (candidates.length === 0) {
      missing.push({
        reviewer_role: requirement.reviewer_role,
        ...(requirement.capability === undefined ? {} : { capability: requirement.capability }),
        reason: 'no_decision_recorded',
        needs_second_person_in_role: requirement.distinct_person,
      });
      continue;
    }

    // Prefer a decision from someone other than the submitter. With several recorded,
    // taking the independent one is both correct and avoids a needless `self_approved`
    // stamp — the flag should mean the separation genuinely did not hold.
    const independent = candidates.find((d) => d.decided_by !== context.submitted_by);
    const chosen = independent ?? candidates[0]!;
    const isSelf = chosen.decided_by === context.submitted_by;

    if (isSelf && context.mode !== 'dev_single_approver') {
      missing.push({
        reviewer_role: requirement.reviewer_role,
        ...(requirement.capability === undefined ? {} : { capability: requirement.capability }),
        reason: 'decider_is_submitter',
        needs_second_person_in_role: requirement.distinct_person,
      });
      continue;
    }

    stamped.push(isSelf ? { ...chosen, self_approved: true } : chosen);
  }

  if (missing.length > 0) {
    // `00-shared-contract.md:88` — with no eligible reviewer the item stays pending and
    // the user is told so: `Aucun approbateur habilité n'est disponible.` That is a
    // different message from "you have not asked for approval yet", and conflating them
    // sends a user hunting for a button that cannot help.
    const noneEligible = missing.every((m) => m.reason === 'decider_is_submitter');
    return {
      satisfied: false,
      code: noneEligible ? 'NO_ELIGIBLE_APPROVER' : 'APPROVAL_REQUIRED',
      missing,
    };
  }

  return { satisfied: true, decisions: stamped };
}

/**
 * Roles for which the organization needs a **second** qualified person before this action
 * can ever be approved under `independent_reviewer`.
 *
 * Four rows of the separation-of-duty table put the same role on both sides — a different
 * `access_admin`, a different scoped `dispatcher`, a different designated privacy
 * reviewer, a different `platform_operator`. Granting one more capability to the same
 * person does not help, and the screen should say so rather than showing a block the user
 * cannot clear.
 */
export const secondPersonRolesFor = (action: ControlledActionCode): readonly RoleCode[] =>
  requiredDecisionsFor(action)
    .filter((d) => d.distinct_person)
    .map((d) => d.reviewer_role);

/**
 * True when any decision in this set was a self-approval.
 *
 * ADR-002 requires `self_approved` to be queryable and surfaced in the audit export. This
 * is what the export filters on.
 */
export const containsSelfApproval = (decisions: readonly RecordedDecision[]): boolean =>
  decisions.some((d) => d.self_approved === true);
