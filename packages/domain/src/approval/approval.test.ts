import { describe, expect, it } from 'vitest';
import { CONTROLLED_ACTIONS, requiredDecisionsFor } from '@dc/contracts';
import type { ApprovalMode } from '@dc/config';
import { containsSelfApproval, evaluateApproval, secondPersonRolesFor } from './evaluate.js';
import type { ApprovalContext, RecordedDecision } from './types.js';

const ALICE = 'aaaaaaaa-0000-4000-8000-000000000001';
const BOB = 'bbbbbbbb-0000-4000-8000-000000000002';

const ctx = (over: Partial<ApprovalContext> = {}): ApprovalContext => ({
  action: 'invoice.issue',
  submitted_by: ALICE,
  decisions: [],
  mode: 'independent_reviewer',
  conditions_met: {},
  ...over,
});

const issuedBy = (user: string): RecordedDecision => ({
  capability: 'invoice.issue',
  decided_by: user,
  role: 'finance_reviewer',
});

describe('independent_reviewer — the product default', () => {
  it('refuses an action with no decision at all', () => {
    const outcome = evaluateApproval(ctx());
    expect(outcome.satisfied).toBe(false);
    if (outcome.satisfied) return;
    expect(outcome.code).toBe('APPROVAL_REQUIRED');
    expect(outcome.missing[0]!.reason).toBe('no_decision_recorded');
  });

  it('refuses the submitter approving their own invoice', () => {
    // 00-shared-contract.md:86 and 20-…:79 — "The submitter cannot supply any of them."
    const outcome = evaluateApproval(ctx({ decisions: [issuedBy(ALICE)] }));
    expect(outcome.satisfied).toBe(false);
    if (outcome.satisfied) return;
    expect(outcome.missing[0]!.reason).toBe('decider_is_submitter');
  });

  it('says "no eligible approver" rather than "approval required" when the only decider is the submitter', () => {
    // 00-shared-contract.md:88 — the item stays pending and the user is told
    // `Aucun approbateur habilité n'est disponible.` Sending APPROVAL_REQUIRED instead
    // points the user at a button that cannot help them.
    const outcome = evaluateApproval(ctx({ decisions: [issuedBy(ALICE)] }));
    expect(outcome.satisfied).toBe(false);
    if (outcome.satisfied) return;
    expect(outcome.code).toBe('NO_ELIGIBLE_APPROVER');
  });

  it('accepts a decision from someone else', () => {
    const outcome = evaluateApproval(ctx({ decisions: [issuedBy(BOB)] }));
    expect(outcome.satisfied).toBe(true);
    if (!outcome.satisfied) return;
    expect(outcome.decisions[0]!.self_approved).toBeUndefined();
  });

  it('prefers the independent decision when both are recorded', () => {
    // self_approved should mean the separation genuinely did not hold, so it must not be
    // stamped merely because the submitter also clicked approve.
    const outcome = evaluateApproval(ctx({ decisions: [issuedBy(ALICE), issuedBy(BOB)] }));
    expect(outcome.satisfied).toBe(true);
    if (!outcome.satisfied) return;
    expect(outcome.decisions[0]!.decided_by).toBe(BOB);
    expect(containsSelfApproval(outcome.decisions)).toBe(false);
  });

  it('ignores a decision carrying the wrong capability', () => {
    const outcome = evaluateApproval(
      ctx({
        decisions: [{ capability: 'cost.approve', decided_by: BOB, role: 'finance_reviewer' }],
      }),
    );
    expect(outcome.satisfied).toBe(false);
  });
});

describe('dev_single_approver — ADR-002', () => {
  const mode: ApprovalMode = 'dev_single_approver';

  it('lets the submitter approve, so one person can develop against a two-person rule', () => {
    const outcome = evaluateApproval(ctx({ mode, decisions: [issuedBy(ALICE)] }));
    expect(outcome.satisfied).toBe(true);
  });

  it('stamps every self-approval, so the audit export can find them', () => {
    const outcome = evaluateApproval(ctx({ mode, decisions: [issuedBy(ALICE)] }));
    expect(outcome.satisfied).toBe(true);
    if (!outcome.satisfied) return;
    expect(outcome.decisions[0]!.self_approved).toBe(true);
    expect(containsSelfApproval(outcome.decisions)).toBe(true);
  });

  it('still requires the decision to exist — it relaxes who, not whether', () => {
    expect(evaluateApproval(ctx({ mode })).satisfied).toBe(false);
  });

  it('does not stamp a decision that was genuinely independent', () => {
    const outcome = evaluateApproval(ctx({ mode, decisions: [issuedBy(BOB)] }));
    expect(outcome.satisfied).toBe(true);
    if (!outcome.satisfied) return;
    expect(containsSelfApproval(outcome.decisions)).toBe(false);
  });
});

describe('small_org_documented — named, deliberately not implemented', () => {
  it('blocks with the policy key rather than silently behaving like another mode', () => {
    // ADR-002 names it so the production question stays visible. Quietly falling back to
    // independent_reviewer would hide that a deployment asked for something it did not get.
    const outcome = evaluateApproval(
      ctx({ mode: 'small_org_documented', decisions: [issuedBy(BOB)] }),
    );
    expect(outcome.satisfied).toBe(false);
    if (outcome.satisfied) return;
    expect(outcome.code).toBe('POLICY_REQUIRED');
    expect(outcome.policy_key).toBe('policy.approval.small_org_subset');
  });
});

describe('multi-decision actions', () => {
  it('requires the unconditional decision and skips the conditional one by default', () => {
    // obligation.close needs red_reviewer always, and finance_reviewer only "where
    // monetary effect is requested".
    const outcome = evaluateApproval(
      ctx({
        action: 'obligation.close',
        decisions: [{ capability: 'obligation.close', decided_by: BOB, role: 'red_reviewer' }],
      }),
    );
    expect(outcome.satisfied).toBe(true);
  });

  it('requires the conditional decision once the module says the condition holds', () => {
    const base = ctx({
      action: 'obligation.close',
      decisions: [{ capability: 'obligation.close', decided_by: BOB, role: 'red_reviewer' }],
      conditions_met: { finance_reviewer: true },
    });
    const outcome = evaluateApproval(base);
    expect(outcome.satisfied).toBe(false);
    if (outcome.satisfied) return;
    expect(outcome.missing.map((m) => m.reviewer_role)).toEqual(['finance_reviewer']);
  });

  it('is satisfied when every applicable decision is present', () => {
    const outcome = evaluateApproval(
      ctx({
        action: 'obligation.close',
        conditions_met: { finance_reviewer: true },
        decisions: [
          { capability: 'obligation.close', decided_by: BOB, role: 'red_reviewer' },
          { capability: 'invoice.issue', decided_by: BOB, role: 'finance_reviewer' },
        ],
      }),
    );
    expect(outcome.satisfied).toBe(true);
  });

  it('lets one qualified person satisfy several decisions', () => {
    // 20-…:79 — "A reviewer may satisfy multiple required capabilities if explicitly
    // granted and qualified; do not invent a required staff count." At a six-person
    // transitaire this is the difference between usable and not.
    const outcome = evaluateApproval(
      ctx({
        action: 'production.accept',
        conditions_met: { red_reviewer: true },
        decisions: [
          { capability: 'production.accept', decided_by: BOB, role: 'operations_manager' },
          { capability: 'red.post', decided_by: BOB, role: 'red_reviewer' },
        ],
      }),
    );
    expect(outcome.satisfied).toBe(true);
  });

  it('never lets a client consent stand in for the internal review', () => {
    // 20-…:76 — "separate internal review remains mandatory."
    const outcome = evaluateApproval(
      ctx({
        action: 'client_request.approve_cost',
        submitted_by: ALICE,
        conditions_met: { external_approver: true, finance_reviewer: true },
        decisions: [
          {
            capability: 'client_request.approve_cost',
            decided_by: BOB,
            role: 'external_approver',
          },
        ],
      }),
    );
    expect(outcome.satisfied).toBe(false);
    if (outcome.satisfied) return;
    expect(outcome.missing.map((m) => m.reviewer_role)).toEqual(['finance_reviewer']);
  });
});

describe('a second person in the same role', () => {
  it('flags the four actions where granting more capability does not help', () => {
    // 20-…:67, :71, :77, :78 put the same role on both sides. The screen has to say
    // "you need another access_admin", not show a block the user cannot clear.
    for (const action of [
      'privilege.expand',
      'transport.exception',
      'privacy.request',
      'installation.approve',
    ] as const) {
      expect(secondPersonRolesFor(action).length, action).toBeGreaterThan(0);
    }
    expect(secondPersonRolesFor('invoice.issue')).toHaveLength(0);
  });

  it('carries the flag through to the missing decision', () => {
    const outcome = evaluateApproval(
      ctx({
        action: 'privilege.expand',
        decisions: [{ capability: 'grant.approve', decided_by: ALICE, role: 'access_admin' }],
      }),
    );
    expect(outcome.satisfied).toBe(false);
    if (outcome.satisfied) return;
    expect(outcome.missing[0]!.needs_second_person_in_role).toBe(true);
  });
});

describe('across every registered action', () => {
  it('refuses a submitter self-approval under the default mode, without exception', () => {
    // The invariant, checked against the whole registry rather than a chosen example.
    for (const action of CONTROLLED_ACTIONS) {
      const decisions = requiredDecisionsFor(action).map((d) => ({
        capability: d.capability ?? 'invoice.issue',
        decided_by: ALICE,
        role: d.reviewer_role,
      }));
      const conditions_met = Object.fromEntries(
        requiredDecisionsFor(action).map((d) => [d.reviewer_role, true]),
      );
      const outcome = evaluateApproval(ctx({ action, decisions, conditions_met }));
      expect(outcome.satisfied, action).toBe(false);
    }
  });

  it('is satisfied by an independent decider for every action', () => {
    for (const action of CONTROLLED_ACTIONS) {
      const required = requiredDecisionsFor(action);
      const decisions = required.map((d) => ({
        capability: d.capability ?? 'invoice.issue',
        decided_by: BOB,
        role: d.reviewer_role,
      }));
      const conditions_met = Object.fromEntries(required.map((d) => [d.reviewer_role, true]));
      const outcome = evaluateApproval(ctx({ action, decisions, conditions_met }));
      expect(outcome.satisfied, action).toBe(true);
    }
  });
});
