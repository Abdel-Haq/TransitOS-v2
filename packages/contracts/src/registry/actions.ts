import type { ModuleId } from '@dc/config';
import type { Capability } from './capabilities.js';
import type { RoleCode } from './roles.js';

/**
 * The controlled-action registry.
 *
 * `CLAUDE.md` non-negotiable #2 — *"A submitter cannot approve their own controlled
 * action. The required reviewer capability comes from the server-owned action registry —
 * never from request data."* This file is that registry, and it is transcribed from the
 * separation-of-duty table at `20-data-api-contract-details.md:65–78`, one entry per row.
 *
 * Three things in that table shape the model, and getting any of them wrong opens a hole:
 *
 * 1. **A required decision is not always a different capability.** Four rows call for
 *    *"a different `access_admin`"*, *"different scoped `dispatcher`"*, *"a different
 *    designated privacy reviewer"* and *"different `platform_operator`"*. There the
 *    reviewer holds the *same* capability as the submitter and must be a different
 *    person. So separation of duty is a rule about **identity**, not about capability
 *    codes — `distinct_person` carries it.
 *
 * 2. **An action can require several independent decisions.** `:79` — *"When an action
 *    requires several independent capability decisions, store them against the same
 *    frozen review payload and require every required decision before effect. The
 *    submitter cannot supply any of them."* Hence a list, and hence the invariant below
 *    is stated over the whole list.
 *
 * 3. **More reviewers is not more people.** `:79` — *"A reviewer may satisfy multiple
 *    required capabilities if explicitly granted and qualified; do not invent a required
 *    staff count."* One qualified person may close several required decisions. Requiring
 *    a headcount here would make the product unusable at the six-person firm it targets,
 *    and the spec forbids inventing one.
 *
 * `:79` also closes the escape hatch: *"If the organization cannot fulfill the approved
 * policy, display the pending state; no automatic self-approval exception."* The
 * environment modes of [ADR-002](../../../docs/01-DECISIONS.md#adr-002) change who may
 * hold a reviewer capability in development; they never relax this table.
 */

export interface RequiredDecision {
  /** The role the spec names as the required independent reviewer. */
  readonly reviewer_role: RoleCode;
  /**
   * The capability the reviewer must hold, where the spec names one explicitly.
   * `undefined` means the row names only a role — the module supplies the capability when
   * it lands, and must cite its own line for it.
   */
  readonly capability?: Capability;
  /**
   * True where the spec says *"a different X"*: the reviewer holds the same capability as
   * the submitter and must be a different user. The check is on identity, not capability.
   */
  readonly distinct_person: boolean;
  /**
   * Present where the row makes the decision conditional, quoted from the spec. A
   * condition is evaluated by the module, never assumed away.
   */
  readonly condition?: string;
}

export interface ControlledAction {
  readonly module: ModuleId;
  /**
   * Roles the spec names **explicitly** as submitter or operator. Empty where the row
   * only describes the submitter ("Scoped operations staff", "Scoped draft author"):
   * naming a role there would be this file inventing an authorization rule, and
   * `submitter_note` carries the spec's own words instead.
   */
  readonly submitter_roles: readonly RoleCode[];
  /** The row's submitter wording, where it names no role. */
  readonly submitter_note?: string;
  /** Every decision required before effect. All of them, against one frozen payload. */
  readonly required_decisions: readonly RequiredDecision[];
  readonly source: string;
}

export const ACTION_REGISTRY = {
  'privilege.expand': {
    module: 'FD01',
    submitter_roles: ['access_admin', 'platform_operator'],
    required_decisions: [
      { reviewer_role: 'access_admin', capability: 'grant.approve', distinct_person: true },
    ],
    source: '20-data-api-contract-details.md:67',
  },

  'workflow.override': {
    module: 'CR01',
    submitter_roles: [],
    submitter_note: 'Scoped operations staff',
    required_decisions: [
      {
        reviewer_role: 'operations_manager',
        capability: 'workflow.override',
        distinct_person: false,
      },
    ],
    source: '20-data-api-contract-details.md:68',
  },

  'declaration.approve': {
    module: 'CR01',
    submitter_roles: ['dossier_agent', 'declarant_reviewer'],
    required_decisions: [
      {
        reviewer_role: 'declarant_reviewer',
        capability: 'declaration.approve',
        distinct_person: true,
        // `00-shared-contract.md:71` — declarant_reviewer "Cannot approve own submitted
        // business change", so this row needs a different person even though the role
        // appears on both sides.
        condition: 'with verified applicable authority',
      },
    ],
    source: '20-data-api-contract-details.md:69',
  },

  'mandate.verify': {
    module: 'FD01',
    submitter_roles: ['dossier_agent'],
    // `:69` — "dossier_agent or scoped declarant submits."

    required_decisions: [
      { reviewer_role: 'declarant_reviewer', capability: 'mandate.verify', distinct_person: false },
    ],
    source: '20-data-api-contract-details.md:69',
  },

  // One row covers all four finance postings: "Cost, invoice, receipt and payment
  // allocation | finance_operator | finance_reviewer".
  'cost.approve': {
    module: 'CR02',
    submitter_roles: ['finance_operator'],
    required_decisions: [
      { reviewer_role: 'finance_reviewer', capability: 'cost.approve', distinct_person: false },
    ],
    source: '20-data-api-contract-details.md:70',
  },
  'invoice.issue': {
    module: 'CR02',
    submitter_roles: ['finance_operator'],
    required_decisions: [
      { reviewer_role: 'finance_reviewer', capability: 'invoice.issue', distinct_person: false },
    ],
    source: '20-data-api-contract-details.md:70',
  },
  'receipt.confirm': {
    module: 'CR02',
    submitter_roles: ['finance_operator'],
    required_decisions: [
      { reviewer_role: 'finance_reviewer', capability: 'receipt.confirm', distinct_person: false },
    ],
    source: '20-data-api-contract-details.md:70',
  },
  'allocation.post': {
    module: 'CR02',
    submitter_roles: ['finance_operator'],
    required_decisions: [
      { reviewer_role: 'finance_reviewer', capability: 'allocation.post', distinct_person: false },
    ],
    source: '20-data-api-contract-details.md:70',
  },

  'transport.exception': {
    module: 'CR03',
    submitter_roles: ['field_agent', 'dispatcher'],
    required_decisions: [
      {
        reviewer_role: 'dispatcher',
        capability: 'mission.event.verify',
        distinct_person: true,
        condition: 'or operations_manager; official clearance still needs declarant review',
      },
    ],
    source: '20-data-api-contract-details.md:71',
  },

  // "RED projects/BOM/flows/allocation/reversal | red_operator | red_reviewer".
  'red.post': {
    module: 'CR04',
    submitter_roles: ['red_operator'],
    required_decisions: [
      { reviewer_role: 'red_reviewer', capability: 'red.post', distinct_person: false },
    ],
    source: '20-data-api-contract-details.md:72',
  },
  'red.reverse': {
    module: 'CR04',
    submitter_roles: ['red_operator'],
    required_decisions: [
      { reviewer_role: 'red_reviewer', capability: 'red.reverse', distinct_person: false },
    ],
    source: '20-data-api-contract-details.md:72',
  },
  'bom.approve': {
    module: 'CR04',
    submitter_roles: ['red_operator'],
    required_decisions: [
      { reviewer_role: 'red_reviewer', capability: 'bom.approve', distinct_person: false },
    ],
    source: '20-data-api-contract-details.md:72',
  },

  'obligation.close': {
    module: 'CR05',
    submitter_roles: ['red_operator'],
    required_decisions: [
      { reviewer_role: 'red_reviewer', capability: 'obligation.close', distinct_person: false },
      {
        reviewer_role: 'finance_reviewer',
        distinct_person: false,
        // Two independent decisions on one frozen payload, not one reviewer with two hats.
        condition: 'where monetary effect is requested — financial release evidence',
      },
    ],
    source: '20-data-api-contract-details.md:73',
  },

  'production.accept': {
    module: 'DF03',
    submitter_roles: ['production_contributor'],
    required_decisions: [
      {
        reviewer_role: 'operations_manager',
        capability: 'production.accept',
        distinct_person: false,
      },
      {
        reviewer_role: 'red_reviewer',
        distinct_person: false,
        condition: 'additionally required for a RED reconciliation',
      },
    ],
    source: '20-data-api-contract-details.md:74',
  },

  'rule.approve': {
    module: 'DF04',
    submitter_roles: [],
    submitter_note: 'Scoped draft author',
    required_decisions: [
      {
        reviewer_role: 'rule_reviewer',
        capability: 'rule.approve',
        distinct_person: true,
        // `00-shared-contract.md:79` — "qualification recorded, not inferred from role
        // alone". Holding the capability is necessary and not sufficient.
        condition: 'qualified reviewer; recorded qualification, not inferred from the role',
      },
      {
        reviewer_role: 'declarant_reviewer',
        distinct_person: false,
        condition:
          'domain applicability requires the corresponding finance/RED/declarant capability when relevant',
      },
    ],
    source: '20-data-api-contract-details.md:75',
  },

  'client_request.approve_cost': {
    module: 'CR06',
    submitter_roles: [],
    submitter_note: 'Named external recipient — a grant on the record, not a role',
    required_decisions: [
      {
        reviewer_role: 'external_approver',
        capability: 'client_request.approve_cost',
        distinct_person: false,
        condition: 'with verified ClientAuthority',
      },
      {
        reviewer_role: 'finance_reviewer',
        distinct_person: false,
        // "separate internal review remains mandatory" — a client's consent never
        // substitutes for the internal decision.
        condition: 'separate internal review remains mandatory',
      },
    ],
    source: '20-data-api-contract-details.md:76',
  },

  'privacy.request': {
    module: 'FD02',
    submitter_roles: [],
    submitter_note: 'Explicit privacy operator capability on a scoped user',
    required_decisions: [
      {
        reviewer_role: 'access_admin',
        distinct_person: true,
        // "No default assignment to all administrators" — the designated privacy
        // reviewer is granted explicitly, never implied by being an admin.
        condition:
          'designated privacy reviewer capability plus required lawful policy evidence; no default assignment to all administrators',
      },
    ],
    source: '20-data-api-contract-details.md:77',
  },

  'installation.approve': {
    module: 'PL02',
    submitter_roles: ['platform_operator'],
    required_decisions: [
      {
        reviewer_role: 'platform_operator',
        capability: 'installation.approve',
        distinct_person: true,
        condition: 'access expansion separately requires an access reviewer',
      },
    ],
    source: '20-data-api-contract-details.md:78',
  },
} as const satisfies Record<string, ControlledAction>;

export type ControlledActionCode = keyof typeof ACTION_REGISTRY;

export const CONTROLLED_ACTIONS = Object.keys(ACTION_REGISTRY) as readonly ControlledActionCode[];

export const isControlledAction = (value: string): value is ControlledActionCode =>
  value in ACTION_REGISTRY;

/**
 * The registry entry, widened to `ControlledAction`.
 *
 * `ACTION_REGISTRY` is declared `as const satisfies`, which keeps every entry's literal
 * type — so `capability` and `condition` are simply absent from the entries that omit
 * them, and indexing the registry directly makes them unreadable across the union.
 * Consumers read through this, not through the registry object.
 */
export const controlledAction = (action: ControlledActionCode): ControlledAction =>
  ACTION_REGISTRY[action];

/**
 * Every decision required before this action takes effect.
 *
 * The only supported way to answer the question. Taking it from a request body, a DTO
 * field or a client header is the hole non-negotiable #2 closes.
 */
export const requiredDecisionsFor = (action: ControlledActionCode): readonly RequiredDecision[] =>
  ACTION_REGISTRY[action].required_decisions;

/**
 * Decisions whose reviewer must be a different user from the submitter even when the
 * capability is the same. `20-…:67, :71, :77, :78`.
 */
export const requiresDistinctPerson = (action: ControlledActionCode): boolean =>
  requiredDecisionsFor(action).some((d) => d.distinct_person);

/**
 * The universal rule, restated so nothing has to infer it from the per-row data:
 * `20-data-api-contract-details.md:79` — *"The submitter cannot supply any of them."*
 *
 * It holds for **every** action, whether or not the row says "a different X".
 * `distinct_person` is the narrower, additional constraint: the required reviewer holds
 * the same role as the submitter, so the organization needs a second qualified person in
 * that role and cannot satisfy the decision by role separation alone.
 */
export const submitterMayNeverDecide = true as const;

/**
 * Decisions the spec makes conditional. The module evaluates the condition; it is never
 * assumed false to avoid asking.
 */
export const conditionalDecisionsFor = (
  action: ControlledActionCode,
): readonly RequiredDecision[] =>
  requiredDecisionsFor(action).filter((d) => d.condition !== undefined);

/**
 * Decisions whose capability the spec names only by role. The owning module supplies the
 * capability, with its own citation, when it lands.
 */
export const OPEN_DECISIONS: readonly { action: ControlledActionCode; reviewer_role: RoleCode }[] =
  CONTROLLED_ACTIONS.flatMap((action) =>
    requiredDecisionsFor(action)
      .filter((d) => d.capability === undefined)
      .map((d) => ({ action, reviewer_role: d.reviewer_role })),
  );
