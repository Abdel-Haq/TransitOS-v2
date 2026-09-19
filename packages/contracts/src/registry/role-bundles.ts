import { CAPABILITIES, type Capability } from './capabilities.js';
import { requiredDecisionsFor, CONTROLLED_ACTIONS } from './actions.js';
import type { RoleCode } from './roles.js';

/**
 * Role → capability bundles.
 *
 * `00-shared-contract.md:64` calls roles *"Fixed capability bundles"* that an authorized
 * administrator may combine. What it does **not** do is enumerate them: the roles table
 * describes each role's responsibility in prose, and the modules attribute capabilities to
 * roles in prose too. There is no machine-readable role→capability mapping anywhere in the
 * twenty spec files.
 *
 * So this file grounds what can be grounded and refuses to guess the rest:
 *
 *   - `derived` — the action registry names this role as the required reviewer for this
 *     capability. Already transcribed and tested from `20-…:65–78`.
 *   - `stated` — a module's `Capabilities:` line names the role and the capability in the
 *     same sentence, quoted in the comment.
 *
 * Everything else is **unassigned**, and `UNASSIGNED_CAPABILITIES` lists it. The engine
 * denies by default, so an unassigned capability fails closed rather than leaking; the gap
 * is visible and countable instead of papered over with a plausible-looking bundle.
 * Completing it is a reviewed policy value, `policy.identity.role_bundles`†, and a
 * deployment cannot pass production readiness while capabilities it uses are unassigned.
 */
export const ROLE_BUNDLE_POLICY_KEY = 'policy.identity.role_bundles';

interface BundleEntry {
  readonly role: RoleCode;
  readonly capability: Capability;
  readonly basis: 'stated' | 'derived';
  readonly source: string;
}

/** Attributions a module states with the role and the capability in the same sentence. */
const STATED: readonly BundleEntry[] = [
  // `01-FD01-identity.md:14` — "`access_admin` owns identity/grant administration".
  {
    role: 'access_admin',
    capability: 'identity.read',
    basis: 'stated',
    source: '01-FD01-identity.md:14',
  },
  {
    role: 'access_admin',
    capability: 'identity.manage',
    basis: 'stated',
    source: '01-FD01-identity.md:14',
  },
  {
    role: 'access_admin',
    capability: 'grant.propose',
    basis: 'stated',
    source: '01-FD01-identity.md:14',
  },
  // "`declarant_reviewer` verifies mandates; agents may draft them on accessible counterparties."
  {
    role: 'dossier_agent',
    capability: 'mandate.write',
    basis: 'stated',
    source: '01-FD01-identity.md:14',
  },
  // "Every user may read/revoke their own session" — modelled as a capability every role
  // holds, because the alternative is a special case inside the engine.
  ...(
    [
      'access_admin',
      'operations_manager',
      'dossier_agent',
      'declarant_reviewer',
      'finance_operator',
      'finance_reviewer',
      'dispatcher',
      'field_agent',
      'red_operator',
      'red_reviewer',
      'production_contributor',
      'rule_reviewer',
      'auditor',
      'platform_operator',
      'external_contact',
      'external_approver',
    ] as const
  ).map((role) => ({
    role,
    capability: 'session.revoke' as Capability,
    basis: 'stated' as const,
    source: '01-FD01-identity.md:14',
  })),

  // `02-FD02-evidence.md:13` — "Dossier agents contribute in scope."
  {
    role: 'dossier_agent',
    capability: 'evidence.read',
    basis: 'stated',
    source: '02-FD02-evidence.md:13',
  },
  {
    role: 'dossier_agent',
    capability: 'evidence.write',
    basis: 'stated',
    source: '02-FD02-evidence.md:13',
  },
  {
    role: 'dossier_agent',
    capability: 'review.submit',
    basis: 'stated',
    source: '02-FD02-evidence.md:13',
  },
  // "Auditor reads explicit scope."
  {
    role: 'auditor',
    capability: 'evidence.read',
    basis: 'stated',
    source: '02-FD02-evidence.md:13',
  },
  {
    role: 'auditor',
    capability: 'history.read',
    basis: 'stated',
    source: '02-FD02-evidence.md:13',
  },

  // `03-FD03-migration.md:13` — "Operations users edit draft references."
  {
    role: 'operations_manager',
    capability: 'reference.read',
    basis: 'stated',
    source: '03-FD03-migration.md:13',
  },
  {
    role: 'operations_manager',
    capability: 'reference.write',
    basis: 'stated',
    source: '03-FD03-migration.md:13',
  },
  // "Platform operator can run import processing but cannot authorize balances solely by
  // technical role" — so the prepare step only, never the approve or commit.
  {
    role: 'platform_operator',
    capability: 'migration.prepare',
    basis: 'stated',
    source: '03-FD03-migration.md:13',
  },

  // `18-PL02-launch-operations.md:15`. "technical operator cannot read business content
  // just because they run backups" — hence no evidence or finance capability here.
  {
    role: 'platform_operator',
    capability: 'installation.configure',
    basis: 'stated',
    source: '18-PL02-launch-operations.md:15',
  },
  {
    role: 'platform_operator',
    capability: 'health.read',
    basis: 'stated',
    source: '18-PL02-launch-operations.md:15',
  },
  {
    role: 'platform_operator',
    capability: 'backup.operate',
    basis: 'stated',
    source: '18-PL02-launch-operations.md:15',
  },
  {
    role: 'platform_operator',
    capability: 'license.manage',
    basis: 'stated',
    source: '18-PL02-launch-operations.md:15',
  },
  {
    role: 'platform_operator',
    capability: 'usage.read',
    basis: 'stated',
    source: '18-PL02-launch-operations.md:15',
  },
  {
    role: 'platform_operator',
    capability: 'public_lead.manage',
    basis: 'stated',
    source: '18-PL02-launch-operations.md:15',
  },
];

/** Reviewer attributions the action registry already establishes from `20-…:65–78`. */
const DERIVED: readonly BundleEntry[] = CONTROLLED_ACTIONS.flatMap((action) =>
  requiredDecisionsFor(action)
    .filter((d): d is typeof d & { capability: Capability } => d.capability !== undefined)
    .map((d) => ({
      role: d.reviewer_role,
      capability: d.capability,
      basis: 'derived' as const,
      source: `action registry: ${action}`,
    })),
);

export const ROLE_BUNDLE_ENTRIES: readonly BundleEntry[] = [...STATED, ...DERIVED];

const bundles = new Map<RoleCode, Set<Capability>>();
for (const entry of ROLE_BUNDLE_ENTRIES) {
  let set = bundles.get(entry.role);
  if (set === undefined) {
    set = new Set<Capability>();
    bundles.set(entry.role, set);
  }
  set.add(entry.capability);
}

export const capabilitiesOfRole = (role: RoleCode): ReadonlySet<Capability> =>
  bundles.get(role) ?? new Set<Capability>();

export const roleGrants = (role: RoleCode, capability: Capability): boolean =>
  capabilitiesOfRole(role).has(capability);

const assigned = new Set<Capability>(ROLE_BUNDLE_ENTRIES.map((e) => e.capability));

/**
 * Capabilities no role holds yet.
 *
 * Not a bug list — a specification gap, made countable. Every one of these denies by
 * default today. Resolving them is `policy.identity.role_bundles`†, supplied by the
 * organization's access reviewer, not by whoever writes the module that needs one.
 */
export const UNASSIGNED_CAPABILITIES: readonly Capability[] = CAPABILITIES.filter(
  (c) => !assigned.has(c),
);
