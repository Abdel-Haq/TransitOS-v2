/**
 * `packages/domain` — framework-free business logic.
 *
 * No NestJS imports, no HTTP, no SQL, no clock. Everything here is a pure function over
 * values from `packages/contracts`, so it can be property-tested and so the same rule
 * cannot be implemented twice with two different answers.
 */
export {
  evaluateApproval,
  secondPersonRolesFor,
  containsSelfApproval,
  SMALL_ORG_SUBSET_POLICY_KEY,
} from './approval/evaluate.js';
export type {
  ApprovalContext,
  ApprovalOutcome,
  MissingDecision,
  MissingReason,
  RecordedDecision,
  UserId,
} from './approval/types.js';
