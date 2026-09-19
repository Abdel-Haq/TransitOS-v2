/**
 * The eighteen modules of the specifications, as a closed set.
 *
 * Core modules are the product; they are enabled in every deployment. Optional
 * modules are the DF differentiators, which `19-security-operations-delivery.md:63`
 * requires to stay disabled until configured: *"Optional unconfigured modules
 * remain disabled."*
 *
 * This file owns the identifiers and the enabled/disabled answer at startup.
 * It does not enforce them — module availability enters the access decision in
 * the authorization engine (Phase 0.4), which reads `AppConfig.enabledModules`.
 */

export const CORE_MODULES = [
  'FD01', // identity, sessions, grants
  'FD02', // evidence and documents
  'FD03', // migration and onboarding
  'CR01', // dossiers
  'CR02', // finance
  'CR03', // transport
  'CR04', // RED
  'CR05', // obligations
  'CR06', // client portal
  'CR07', // reconciliation
  'PL01', // platform UX
  'PL02', // launch and operations
] as const;

export const OPTIONAL_MODULES = [
  'DF01', // reviewed extraction
  'DF02', // delay and cost exposure
  'DF03', // production evidence
  'DF04', // rule lifecycle
  'DF05', // grounded advisory
  'DF06', // adapters and machine API
] as const;

export const ALL_MODULES = [...CORE_MODULES, ...OPTIONAL_MODULES] as const;

export type CoreModuleId = (typeof CORE_MODULES)[number];
export type OptionalModuleId = (typeof OPTIONAL_MODULES)[number];
export type ModuleId = (typeof ALL_MODULES)[number];

const ALL = new Set<string>(ALL_MODULES);
const OPTIONAL = new Set<string>(OPTIONAL_MODULES);

export const isModuleId = (value: string): value is ModuleId => ALL.has(value);
export const isOptionalModule = (value: string): value is OptionalModuleId => OPTIONAL.has(value);
