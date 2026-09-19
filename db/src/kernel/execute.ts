import { and, eq, isNull, sql } from 'drizzle-orm';
import {
  ERROR_CATALOG,
  requiredDecisionsFor,
  canonicalize,
  contentDigest,
  type ControlledActionCode,
  type ErrorCode,
  type ResourceRef,
} from '@dc/contracts';
import { evaluateApproval, type RecordedDecision } from '@dc/domain';
import type { ApprovalMode } from '@dc/config';
import {
  approvalDecision,
  auditEvent,
  idempotencyRecord,
  outboxEvent,
  resourceRecord,
  reviewRequest,
} from '../schema/kernel.js';
import type { CommandOutcome, CommandRequest } from './types.js';
import type { KernelTransaction } from './tx.js';

/**
 * The controlled-command flow of `CLAUDE.md` non-negotiable #8 and
 * `00-shared-contract.md:92`:
 *
 *   validate body → authorize all targets → verify `If-Match` → lock rows in stable ID
 *   order → recheck inputs, rule/evidence versions and approval → apply → mark approval
 *   consumed for that exact command → append audit + outbox → commit → return
 *
 * All of it in one database transaction, and in this order. The order is not stylistic:
 * authorizing before locking avoids holding a lock across a denial, locking before the
 * `If-Match` recheck is what makes the check meaningful under concurrency, and consuming
 * the approval inside the same transaction as the effect is what stops one approval from
 * authorizing two effects.
 *
 * Idempotency wraps the whole thing, per `20-data-api-contract-details.md:15`: *"Failed
 * effects that roll back cannot leave a successful response."*
 */

export interface CommandHandler<TBody, TInput, TResult> {
  /** Step 1. Pure. Throws or returns the parsed input; never touches the database. */
  validate(body: TBody): TInput;
  /**
   * Step 6. The effect. Runs with the target row already locked and every precondition
   * rechecked. Returns the new state and the paths that changed, for the audit row.
   */
  apply(
    tx: KernelTransaction,
    target: ResourceRef,
    input: TInput,
  ): Promise<{
    readonly after: unknown;
    readonly changedPaths: readonly string[];
    readonly result: TResult;
  }>;
  /** The outbox event type for this command. */
  eventType: string;
}

const fail = (code: ErrorCode, detail?: string): CommandOutcome<never> => ({
  ok: false,
  code,
  status: ERROR_CATALOG[code].http_status,
  ...(detail === undefined ? {} : { detail }),
});

export async function executeCommand<TBody, TInput, TResult>(
  tx: KernelTransaction,
  request: CommandRequest<TBody>,
  handler: CommandHandler<TBody, TInput, TResult>,
  mode: ApprovalMode,
): Promise<CommandOutcome<TResult>> {
  const { principal, target, action, idempotency } = request;
  const requestDigest = contentDigest({ body: request.body, action, target });

  // --- Idempotency claim -------------------------------------------------------------
  // Claimed first, inside the same transaction as the effect. A rollback takes the claim
  // with it, so a retry after a failure is a fresh attempt rather than a replay of a
  // success that never happened (20-…:15).
  const existing = await tx
    .select()
    .from(idempotencyRecord)
    .where(
      and(
        eq(idempotencyRecord.principalId, principal.user_id),
        eq(idempotencyRecord.method, idempotency.method),
        eq(idempotencyRecord.path, idempotency.path),
        eq(idempotencyRecord.key, idempotency.key),
      ),
    )
    .limit(1);

  const prior = existing[0];
  if (prior !== undefined) {
    if (prior.requestDigest !== requestDigest) {
      // Same key, different body. `:100` — return 409 rather than guessing which body won.
      return fail('IDEMPOTENCY_CONFLICT');
    }
    if (prior.state === 'in_progress') return fail('REQUEST_IN_PROGRESS');
    return {
      ok: true,
      status: prior.resultStatus ?? 200,
      result: prior.resultBody as TResult,
      replayed: true,
    };
  }

  await tx.insert(idempotencyRecord).values({
    principalId: principal.user_id,
    method: idempotency.method,
    path: idempotency.path,
    key: idempotency.key,
    requestDigest,
    state: 'in_progress',
  });

  // --- Step 1: validate body ---------------------------------------------------------
  let input: TInput;
  try {
    input = handler.validate(request.body);
  } catch (error) {
    return fail('REQUIRED', error instanceof Error ? error.message : undefined);
  }

  // --- Step 2: authorize all targets -------------------------------------------------
  // Phase 0.3 checks the capability registry only. Phase 0.4 generalises this to resource
  // scope, data classification and module availability — deny by default across all four
  // terms of `00-shared-contract.md:64`. Until then a caller with the capability passes,
  // which is why 0.4 comes before anything renders real data.
  const submitCapability = requiredDecisionsFor(action)[0]?.capability;
  if (submitCapability !== undefined && !principal.capabilities.includes(submitCapability)) {
    return fail('FORBIDDEN', `missing capability ${submitCapability}`);
  }

  // --- Steps 3–4: lock rows in stable ID order, then verify If-Match -----------------
  // Locking first is the point. Reading the version, deciding it matches, and then locking
  // leaves a window in which another transaction commits a new version between the two.
  // `00-shared-contract.md:92` orders it lock-then-recheck for exactly that reason.
  const locked = await tx
    .select()
    .from(resourceRecord)
    .where(eq(resourceRecord.id, target.id))
    .orderBy(resourceRecord.id)
    .for('update')
    .limit(1);

  const record = locked[0];
  if (record === undefined) return fail('NOT_FOUND');
  if (record.kind !== target.kind) return fail('NOT_FOUND', 'resource kind mismatch');
  if (record.version.toString() !== request.ifMatch) {
    return fail('VERSION_CONFLICT', `expected ${record.version.toString()}`);
  }

  // --- Step 5: recheck approval ------------------------------------------------------
  const reviews = await tx
    .select()
    .from(reviewRequest)
    .where(
      and(
        eq(reviewRequest.targetId, target.id),
        eq(reviewRequest.actionCode, action),
        eq(reviewRequest.state, 'decided'),
      ),
    );

  const review = reviews[0];
  if (review === undefined) {
    return { ...fail('APPROVAL_REQUIRED'), missing: [] } as CommandOutcome<TResult>;
  }

  // The approval was given for a specific payload. If the payload has changed since, the
  // approval is stale — `00-shared-contract.md:90`, and #5 of CLAUDE.md: a posted
  // transaction does not silently absorb a change nobody approved.
  const currentDigest = contentDigest(canonicalizeInput(input));
  if (review.payloadDigest !== currentDigest) return fail('APPROVAL_STALE');

  const decisions = await tx
    .select()
    .from(approvalDecision)
    .where(
      and(
        eq(approvalDecision.requestId, review.id),
        eq(approvalDecision.decision, 'approved'),
        // The single-use latch. A consumed approval cannot authorize another effect.
        isNull(approvalDecision.consumedEffectId),
      ),
    );

  const recorded: RecordedDecision[] = decisions
    .filter((d) => d.boundDigest === currentDigest)
    .map((d) => ({
      capability: d.reviewerCapability as RecordedDecision['capability'],
      decided_by: d.reviewerId,
      role: inferRole(d.reviewerCapability, action),
    }));

  const outcome = evaluateApproval({
    action,
    submitted_by: review.submittedBy,
    decisions: recorded,
    mode,
    conditions_met: request.conditionsMet ?? {},
  });

  if (!outcome.satisfied) {
    return {
      ok: false,
      code: outcome.code,
      status: ERROR_CATALOG[outcome.code].http_status,
      missing: outcome.missing,
      ...(outcome.policy_key === undefined ? {} : { policyKey: outcome.policy_key }),
    };
  }

  // --- Step 6: apply -----------------------------------------------------------------
  const before = await snapshotOf(tx, target);
  const applied = await handler.apply(tx, target, input);

  await tx
    .update(resourceRecord)
    .set({ version: sql`${resourceRecord.version} + 1`, updatedAt: sql`now()` })
    .where(eq(resourceRecord.id, target.id));

  // --- Step 7: mark the approval consumed for this exact command ---------------------
  // `00-shared-contract.md:92` — "mark approval consumed for the exact command". The
  // effect id is the request id, so the audit row and the consumed approval point at each
  // other and a replayed approval is visible as a second effect on the same decision.
  for (const decision of outcome.decisions) {
    await tx
      .update(approvalDecision)
      .set({
        consumedEffectId: request.requestId,
        selfApproved: decision.self_approved === true,
      })
      .where(
        and(
          eq(approvalDecision.requestId, review.id),
          eq(approvalDecision.reviewerCapability, decision.capability),
          isNull(approvalDecision.consumedEffectId),
        ),
      );
  }

  // --- Step 8: append audit + outbox -------------------------------------------------
  // In this transaction. That is what makes the outbox an outbox rather than a second
  // write that can be lost, and what makes the audit trail complete rather than
  // best-effort.
  await tx.insert(auditEvent).values({
    actorId: principal.user_id,
    actionCode: action,
    resourceKind: target.kind,
    resourceId: target.id,
    requestId: request.requestId,
    beforeDigest: before === undefined ? null : contentDigest(before),
    afterDigest: contentDigest(applied.after),
    changedPaths: [...applied.changedPaths],
  });

  await tx.insert(outboxEvent).values({
    eventType: handler.eventType,
    aggregateKind: target.kind,
    aggregateId: target.id,
    payloadSchema: `${handler.eventType}.v1`,
    payload: { action, request_id: request.requestId, changed_paths: applied.changedPaths },
  });

  await tx
    .update(idempotencyRecord)
    .set({
      state: 'completed',
      resultStatus: 200,
      resultBody: applied.result as object,
      resourceKind: target.kind,
      resourceId: target.id,
      completedAt: sql`now()`,
    })
    .where(
      and(
        eq(idempotencyRecord.principalId, principal.user_id),
        eq(idempotencyRecord.method, idempotency.method),
        eq(idempotencyRecord.path, idempotency.path),
        eq(idempotencyRecord.key, idempotency.key),
      ),
    );

  // --- Step 9: commit happens in the caller's transaction scope ----------------------
  return { ok: true, status: 200, result: applied.result, replayed: false };
}

/**
 * The payload an approval is bound to. Canonicalized so that key order in the request
 * cannot make an approved payload look changed.
 */
const canonicalizeInput = (input: unknown): unknown => JSON.parse(canonicalize(input)) as unknown;

const snapshotOf = async (
  tx: KernelTransaction,
  target: ResourceRef,
): Promise<unknown | undefined> => {
  const rows = await tx
    .select()
    .from(resourceRecord)
    .where(eq(resourceRecord.id, target.id))
    .limit(1);
  const row = rows[0];
  if (row === undefined) return undefined;
  return { kind: row.kind, classification: row.classification, version: row.version.toString() };
};

/**
 * The role a decision was made under, for the domain evaluator.
 *
 * Read from the action registry rather than stored on the decision: the registry is the
 * server-owned source for which role a capability answers for, and taking it from the row
 * would let a bad insert nominate its own role.
 */
const inferRole = (capability: string, action: ControlledActionCode): RecordedDecision['role'] => {
  const match = requiredDecisionsFor(action).find((d) => d.capability === capability);
  return (match?.reviewer_role ?? 'auditor') as RecordedDecision['role'];
};
