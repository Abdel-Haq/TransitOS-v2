import { ALL_MODULES, type ModuleId } from '@dc/config';

/**
 * The capability registry.
 *
 * `00-shared-contract.md:64` — *"Effective access = active authenticated user + explicit
 * capability + resource scope + data classification + current module availability. Deny
 * by default."* This file owns the "explicit capability" term of that equation.
 *
 * **Every entry is extracted from a spec line, and carries it.** Nothing here was
 * invented: the list was derived mechanically from the `Capabilities:` declarations and
 * capability mentions across the twenty numbered spec files, expanding the
 * `evidence.read/write/share` shorthand the specs use. If a capability a module needs is
 * missing, the spec does not name it — add it here with a citation, or raise it as a
 * specification gap. Do not coin one silently. That is the failure
 * [ADR-001](../../../docs/01-DECISIONS.md#adr-001) exists to catch.
 *
 * Two shapes appear, and the second is not a mistake:
 *   - `<noun>.<verb>` — the overwhelming majority.
 *   - `mission.event.submit` / `mission.event.verify` — three segments, at
 *     `06-CR03-transport.md:13`. CR03 treats mission events as their own noun.
 *
 * Note the namespace: capabilities are bare `<noun>.<verb>`, while policy keys are
 * `policy.<module>.<name>`. They cannot collide. See `CLAUDE.md` §Policy keys.
 */

export interface CapabilityDefinition {
  /** The module that owns the capability, for the module-availability term of the access rule. */
  readonly module: ModuleId;
  /** `file:line` in `specs/`, so every entry can be checked against its source. */
  readonly source: string;
}

export const CAPABILITY_REGISTRY = {
  // 01-FD01-identity.md
  'grant.approve': { module: 'FD01', source: '01-FD01-identity.md:14' },
  'grant.propose': { module: 'FD01', source: '01-FD01-identity.md:14' },
  'identity.manage': { module: 'FD01', source: '01-FD01-identity.md:14' },
  'identity.read': { module: 'FD01', source: '01-FD01-identity.md:14' },
  'mandate.verify': { module: 'FD01', source: '01-FD01-identity.md:14' },
  'mandate.write': { module: 'FD01', source: '01-FD01-identity.md:14' },
  'session.revoke': { module: 'FD01', source: '01-FD01-identity.md:14' },

  // 02-FD02-evidence.md
  'evidence.read': { module: 'FD02', source: '02-FD02-evidence.md:13' },
  'evidence.share': { module: 'FD02', source: '02-FD02-evidence.md:13' },
  'evidence.write': { module: 'FD02', source: '02-FD02-evidence.md:13' },
  'history.read': { module: 'FD02', source: '02-FD02-evidence.md:13' },
  'job.operate': { module: 'FD02', source: '02-FD02-evidence.md:13' },
  'retention.manage': { module: 'FD02', source: '02-FD02-evidence.md:13' },
  'review.decide': { module: 'FD02', source: '02-FD02-evidence.md:13' },
  'review.submit': { module: 'FD02', source: '02-FD02-evidence.md:13' },

  // 03-FD03-migration.md
  'data.export': { module: 'FD03', source: '03-FD03-migration.md:13' },
  'migration.approve': { module: 'FD03', source: '03-FD03-migration.md:13' },
  'migration.commit': { module: 'FD03', source: '03-FD03-migration.md:13' },
  'migration.prepare': { module: 'FD03', source: '03-FD03-migration.md:13' },
  'reference.approve': { module: 'FD03', source: '03-FD03-migration.md:13' },
  'reference.read': { module: 'FD03', source: '03-FD03-migration.md:13' },
  'reference.write': { module: 'FD03', source: '03-FD03-migration.md:13' },
  'search.read': { module: 'FD03', source: '03-FD03-migration.md:13' },

  // 04-CR01-dossiers.md
  'declaration.approve': { module: 'CR01', source: '04-CR01-dossiers.md:13' },
  'declaration.submit': { module: 'CR01', source: '04-CR01-dossiers.md:13' },
  'dossier.create': { module: 'CR01', source: '04-CR01-dossiers.md:13' },
  'dossier.edit': { module: 'CR01', source: '04-CR01-dossiers.md:13' },
  'dossier.read': { module: 'CR01', source: '04-CR01-dossiers.md:13' },
  'external_observation.verify': { module: 'CR01', source: '04-CR01-dossiers.md:13' },
  'workflow.assign': { module: 'CR01', source: '04-CR01-dossiers.md:13' },
  'workflow.override': { module: 'CR01', source: '04-CR01-dossiers.md:13' },
  'workflow.resolve': { module: 'CR01', source: '04-CR01-dossiers.md:13' },

  // 05-CR02-finance.md
  'allocation.post': { module: 'CR02', source: '05-CR02-finance.md:13' },
  'allocation.propose': { module: 'CR02', source: '05-CR02-finance.md:13' },
  'cost.approve': { module: 'CR02', source: '05-CR02-finance.md:13' },
  'cost.write': { module: 'CR02', source: '05-CR02-finance.md:13' },
  'finance.export': { module: 'CR02', source: '05-CR02-finance.md:13' },
  'finance.read': { module: 'CR02', source: '05-CR02-finance.md:13' },
  'invoice.issue': { module: 'CR02', source: '05-CR02-finance.md:13' },
  'invoice.write': { module: 'CR02', source: '05-CR02-finance.md:13' },
  'receipt.confirm': { module: 'CR02', source: '05-CR02-finance.md:13' },
  'receipt.write': { module: 'CR02', source: '05-CR02-finance.md:13' },

  // 06-CR03-transport.md
  'fleet.manage': { module: 'CR03', source: '06-CR03-transport.md:13' },
  'mission.event.submit': { module: 'CR03', source: '06-CR03-transport.md:13' },
  'mission.event.verify': { module: 'CR03', source: '06-CR03-transport.md:13' },
  'transport.assign': { module: 'CR03', source: '06-CR03-transport.md:13' },
  'transport.confirm': { module: 'CR03', source: '06-CR03-transport.md:13' },
  'transport.read': { module: 'CR03', source: '06-CR03-transport.md:13' },
  'transport.write': { module: 'CR03', source: '06-CR03-transport.md:13' },

  // 07-CR04-red.md
  'bom.approve': { module: 'CR04', source: '07-CR04-red.md:13' },
  'bom.write': { module: 'CR04', source: '07-CR04-red.md:13' },
  'red.post': { module: 'CR04', source: '07-CR04-red.md:13' },
  'red.read': { module: 'CR04', source: '07-CR04-red.md:13' },
  'red.reverse': { module: 'CR04', source: '07-CR04-red.md:13' },
  'red.submit': { module: 'CR04', source: '07-CR04-red.md:13' },
  'red.write': { module: 'CR04', source: '07-CR04-red.md:13' },

  // 08-CR05-obligations.md
  'guarantee.request': { module: 'CR05', source: '08-CR05-obligations.md:11' },
  'guarantee.verify': { module: 'CR05', source: '08-CR05-obligations.md:11' },
  'guarantee.write': { module: 'CR05', source: '08-CR05-obligations.md:11' },
  'obligation.close': { module: 'CR05', source: '08-CR05-obligations.md:11' },
  'obligation.review': { module: 'CR05', source: '08-CR05-obligations.md:11' },
  'obligation.write': { module: 'CR05', source: '08-CR05-obligations.md:11' },

  // 09-CR06-client-portal.md
  'client_request.approve_cost': { module: 'CR06', source: '09-CR06-client-portal.md:15' },
  'client_request.create': { module: 'CR06', source: '09-CR06-client-portal.md:15' },
  'client_request.publish': { module: 'CR06', source: '09-CR06-client-portal.md:15' },
  'client_request.respond': { module: 'CR06', source: '09-CR06-client-portal.md:15' },
  'client_request.review': { module: 'CR06', source: '09-CR06-client-portal.md:15' },

  // 10-CR07-reconciliation.md
  'exchange.prepare': { module: 'CR07', source: '10-CR07-reconciliation.md:13' },
  'exchange.read': { module: 'CR07', source: '10-CR07-reconciliation.md:13' },
  'reconciliation.apply': { module: 'CR07', source: '10-CR07-reconciliation.md:13' },
  'reconciliation.approve': { module: 'CR07', source: '10-CR07-reconciliation.md:13' },
  'reconciliation.import': { module: 'CR07', source: '10-CR07-reconciliation.md:13' },
  'reconciliation.resolve': { module: 'CR07', source: '10-CR07-reconciliation.md:13' },

  // 11-DF01-readiness.md
  'contradiction.resolve': { module: 'DF01', source: '11-DF01-readiness.md:11' },
  'extraction.apply': { module: 'DF01', source: '11-DF01-readiness.md:11' },
  'extraction.review': { module: 'DF01', source: '11-DF01-readiness.md:11' },
  'extraction.run': { module: 'DF01', source: '11-DF01-readiness.md:11' },
  'message.route': { module: 'DF01', source: '11-DF01-readiness.md:11' },

  // 12-DF02-delay-costs.md
  'exposure.calculate': { module: 'DF02', source: '12-DF02-delay-costs.md:13' },
  'exposure.read': { module: 'DF02', source: '12-DF02-delay-costs.md:13' },
  'logistics_contract.approve': { module: 'DF02', source: '12-DF02-delay-costs.md:13' },
  'logistics_contract.write': { module: 'DF02', source: '12-DF02-delay-costs.md:13' },
  'scenario.write': { module: 'DF02', source: '12-DF02-delay-costs.md:13' },

  // 13-DF03-production.md
  'production.import': { module: 'DF03', source: '13-DF03-production.md:13' },
  'production.read': { module: 'DF03', source: '13-DF03-production.md:13' },
  'production.write': { module: 'DF03', source: '13-DF03-production.md:13' },
  'production_reconciliation.approve': { module: 'DF03', source: '13-DF03-production.md:13' },
  'production_reconciliation.propose': { module: 'DF03', source: '13-DF03-production.md:13' },

  // 14-DF04-rules.md
  'rule.activate': { module: 'DF04', source: '14-DF04-rules.md:11' },
  'rule.approve': { module: 'DF04', source: '14-DF04-rules.md:11' },
  'rule.submit': { module: 'DF04', source: '14-DF04-rules.md:11' },
  'rule.write': { module: 'DF04', source: '14-DF04-rules.md:11' },
  'rule_impact.assess': { module: 'DF04', source: '14-DF04-rules.md:11' },
  'rule_impact.read': { module: 'DF04', source: '14-DF04-rules.md:11' },

  // 15-DF05-advisory.md
  'assistant.query': { module: 'DF05', source: '15-DF05-advisory.md:13' },
  'knowledge.index': { module: 'DF05', source: '15-DF05-advisory.md:13' },
  'knowledge.read': { module: 'DF05', source: '15-DF05-advisory.md:13' },
  'recommendation.review': { module: 'DF05', source: '15-DF05-advisory.md:13' },
  'scan.configure': { module: 'DF05', source: '15-DF05-advisory.md:13' },
  'scan.run': { module: 'DF05', source: '15-DF05-advisory.md:13' },

  // 16-DF06-api-integrations.md
  'api_client.approve': { module: 'DF06', source: '16-DF06-api-integrations.md:11' },
  'api_client.propose': { module: 'DF06', source: '16-DF06-api-integrations.md:11' },
  'api_client.revoke': { module: 'DF06', source: '16-DF06-api-integrations.md:11' },
  'integration.activate': { module: 'DF06', source: '16-DF06-api-integrations.md:11' },
  'integration.configure': { module: 'DF06', source: '16-DF06-api-integrations.md:11' },
  'integration.test': { module: 'DF06', source: '16-DF06-api-integrations.md:11' },
  'integration_run.read': { module: 'DF06', source: '16-DF06-api-integrations.md:11' },
  'integration_run.retry': { module: 'DF06', source: '16-DF06-api-integrations.md:11' },

  // 18-PL02-launch-operations.md
  'backup.operate': { module: 'PL02', source: '18-PL02-launch-operations.md:15' },
  'health.read': { module: 'PL02', source: '18-PL02-launch-operations.md:15' },
  'installation.configure': { module: 'PL02', source: '18-PL02-launch-operations.md:15' },
  'license.manage': { module: 'PL02', source: '18-PL02-launch-operations.md:15' },
  'public_lead.manage': { module: 'PL02', source: '18-PL02-launch-operations.md:15' },
  'report.export': { module: 'PL02', source: '18-PL02-launch-operations.md:15' },
  'report.read': { module: 'PL02', source: '18-PL02-launch-operations.md:15' },
  'usage.read': { module: 'PL02', source: '18-PL02-launch-operations.md:15' },

  // 19-security-operations-delivery.md
  'privacy.erase': { module: 'PL02', source: '19-security-operations-delivery.md:30' },
  'privacy.export': { module: 'PL02', source: '19-security-operations-delivery.md:30' },
  'privacy.rectify': { module: 'PL02', source: '19-security-operations-delivery.md:30' },

  // 20-data-api-contract-details.md — the supplemental contract, so each capability
  // is attributed to the module that owns its noun, not to this file's position.
  'installation.approve': { module: 'PL02', source: '20-data-api-contract-details.md:78' },
  'production.accept': { module: 'DF03', source: '20-data-api-contract-details.md:74' },
} as const satisfies Record<string, CapabilityDefinition>;

export type Capability = keyof typeof CAPABILITY_REGISTRY;

export const CAPABILITIES = Object.keys(CAPABILITY_REGISTRY) as readonly Capability[];

export const isCapability = (value: string): value is Capability => value in CAPABILITY_REGISTRY;

export const capabilitiesOfModule = (module: ModuleId): readonly Capability[] =>
  CAPABILITIES.filter((c) => CAPABILITY_REGISTRY[c].module === module);

/**
 * Modules that declare no capability of their own.
 *
 * PL01 is the real case: `17-PL01-ux.md:24` grants *"own saved views/preferences"* and
 * says field contribution *"inherits `mission.event.submit`"* from CR03. A platform UX
 * module that owned capabilities would be a second authorization system.
 */
export const MODULES_WITHOUT_CAPABILITIES: readonly ModuleId[] = ALL_MODULES.filter(
  (m) => capabilitiesOfModule(m).length === 0,
);
