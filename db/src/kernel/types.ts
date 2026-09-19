import type { ControlledActionCode, ErrorCode, ResourceRef, RoleCode } from '@dc/contracts';
import type { UserId } from '@dc/domain';

/**
 * Who is asking — the authenticated user id, and nothing else.
 *
 * It deliberately carries no capability or role list. Phase 0.3 had both, and the
 * authorization engine landing in 0.4 made them worse than useless: the server loads
 * roles and grants from the database, so a list on the request is either ignored or
 * trusted, and only one of those is safe. Same reasoning as `CLAUDE.md` non-negotiable
 * #2 — the required reviewer capability comes from the server-owned registry, never from
 * request data. A caller's own capabilities are no different.
 */
export interface Principal {
  readonly user_id: UserId;
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
