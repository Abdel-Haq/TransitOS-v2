import type { ApprovalMode } from '@dc/config';
import type { Capability, ControlledActionCode, RoleCode } from '@dc/contracts';

/** A user id. Opaque — `00-shared-contract.md:46`, "IDs are opaque". */
export type UserId = string;

/**
 * One decision recorded against a controlled action, as it is stored in
 * `ApprovalDecision`.
 *
 * `20-data-api-contract-details.md:79` — *"store them against the same frozen review
 * payload and require every required decision before effect."* The payload digest is not
 * on this record because it belongs to the `ReviewRequest` these decisions attach to; this
 * type is about **who decided what**.
 */
export interface RecordedDecision {
  readonly capability: Capability;
  readonly decided_by: UserId;
  readonly role: RoleCode;
  /**
   * Set by the evaluator, never by a caller. `true` means the submitter approved their own
   * action under a mode that permits it — [ADR-002](../../../../docs/01-DECISIONS.md#adr-002)
   * requires it stamped on the decision and surfaced in the audit export, so nobody can
   * later claim the separation held when it did not.
   */
  readonly self_approved?: boolean;
  /** Required by `small_org_documented`. Free text, non-empty, recorded with the decision. */
  readonly reason?: string;
}

/**
 * What the module knows when it asks whether an action may take effect.
 *
 * `conditions_met` is explicit rather than inferred: several rows of the
 * separation-of-duty table make a decision conditional (*"where monetary effect is
 * requested"*, *"additionally required for a RED reconciliation"*), and only the module
 * can evaluate its own condition. An unevaluated condition is never treated as false —
 * `CLAUDE.md` non-negotiable #4, unknown is not zero.
 */
export interface ApprovalContext {
  readonly action: ControlledActionCode;
  readonly submitted_by: UserId;
  readonly decisions: readonly RecordedDecision[];
  readonly mode: ApprovalMode;
  /**
   * Conditions the module has evaluated as holding, keyed by the reviewer role of the
   * conditional decision. A role absent from this map means its condition does not apply.
   */
  readonly conditions_met: Readonly<Partial<Record<RoleCode, boolean>>>;
}

export type MissingReason =
  | 'no_decision_recorded'
  | 'decider_is_submitter'
  | 'reason_required'
  | 'action_not_in_documented_subset';

export interface MissingDecision {
  readonly reviewer_role: RoleCode;
  readonly capability?: Capability;
  readonly reason: MissingReason;
  /** True where the spec requires a *different* person in the same role as the submitter. */
  readonly needs_second_person_in_role: boolean;
}

export type ApprovalOutcome =
  | {
      readonly satisfied: true;
      /** The decisions as they must be persisted — `self_approved` stamped where it applies. */
      readonly decisions: readonly RecordedDecision[];
    }
  | {
      readonly satisfied: false;
      /** A code from the contracts catalog, so the caller returns French copy, not a string. */
      readonly code: 'APPROVAL_REQUIRED' | 'NO_ELIGIBLE_APPROVER' | 'POLICY_REQUIRED';
      readonly missing: readonly MissingDecision[];
      /** Set for POLICY_REQUIRED — the key a reviewer must supply. */
      readonly policy_key?: string;
    };
