import type {
  Capability,
  ControlledActionCode,
  ErrorCode,
  ResourceRef,
  RoleCode,
} from '@dc/contracts';
import type { UserId } from '@dc/domain';

/** Who is asking. Capabilities are the 0.2 registry; 0.4 adds scope and classification. */
export interface Principal {
  readonly user_id: UserId;
  readonly capabilities: readonly Capability[];
  readonly roles: readonly RoleCode[];
}

export interface IdempotencyKey {
  readonly method: string;
  readonly path: string;
  readonly key: string;
}

export interface CommandRequest<TBody> {
  readonly principal: Principal;
  readonly action: ControlledActionCode;
  readonly target: ResourceRef;
  /** The version ETag from `If-Match`. `00-shared-contract.md:96` requires it on commands. */
  readonly ifMatch: string;
  readonly idempotency: IdempotencyKey;
  readonly body: TBody;
  /** Echoed into the audit row and the error envelope so a user report reaches the row. */
  readonly requestId: string;
  /**
   * Conditions the caller has evaluated for conditional required decisions, keyed by
   * reviewer role. Never inferred here — `CLAUDE.md` non-negotiable #4.
   */
  readonly conditionsMet?: Readonly<Partial<Record<RoleCode, boolean>>>;
}

export interface CommandFailure {
  readonly ok: false;
  readonly code: ErrorCode;
  readonly status: number;
  readonly detail?: string;
  /** Present on APPROVAL_REQUIRED / NO_ELIGIBLE_APPROVER. */
  readonly missing?: readonly unknown[];
  readonly policyKey?: string;
}

export interface CommandSuccess<TResult> {
  readonly ok: true;
  readonly status: number;
  readonly result: TResult;
  /** True when the call was a replay of an earlier completed request, not a new effect. */
  readonly replayed: boolean;
}

export type CommandOutcome<TResult> = CommandSuccess<TResult> | CommandFailure;
