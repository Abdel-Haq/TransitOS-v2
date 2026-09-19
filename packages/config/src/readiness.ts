import type { AppConfig, ConfigProblem } from './load.js';
import { ALL_MODULES, type ModuleId } from './modules.js';

/**
 * `19-security-operations-delivery.md:63` — *"Secret strings never appear in readiness
 * responses."*
 *
 * The payload is therefore assembled from an allowlist. A denylist would have to be
 * kept in step with every field added to `AppConfig`, and the first one anybody forgets
 * is the one that leaks. Nothing reaches this response unless it is named here.
 */

export type DependencyStatus = 'up' | 'down' | 'unchecked';

export interface DependencyReport {
  readonly name: 'postgres' | 'identity' | 'object_store' | 'scanner';
  readonly status: DependencyStatus;
  /** Operator-facing reason when `down`. Never carries a credential or a raw driver error. */
  readonly detail?: string;
}

export interface ReadinessReport {
  readonly ready: boolean;
  readonly environment: string;
  readonly businessTimezone: string;
  readonly approvedPolicySetId: string;
  /** ADR-002. Visible to an operator: a deployment's separation-of-duty posture is not a secret. */
  readonly approvalPolicyMode: string;
  readonly modules: Readonly<Record<ModuleId, 'enabled' | 'disabled'>>;
  readonly secrets: readonly { readonly key: string; readonly scheme: string }[];
  readonly dependencies: readonly DependencyReport[];
  /** Present only when configuration itself is invalid. Keys and reasons, never values. */
  readonly configProblems?: readonly ConfigProblem[];
}

export function configInvalidReadiness(problems: readonly ConfigProblem[]): ReadinessReport {
  return {
    ready: false,
    environment: 'unknown',
    businessTimezone: 'unknown',
    approvedPolicySetId: 'unknown',
    approvalPolicyMode: 'unknown',
    modules: Object.fromEntries(
      ALL_MODULES.map((m) => [m, 'disabled']),
    ) as ReadinessReport['modules'],
    secrets: [],
    dependencies: [],
    configProblems: problems,
  };
}

export function buildReadiness(
  config: AppConfig,
  dependencies: readonly DependencyReport[],
): ReadinessReport {
  return {
    ready: dependencies.every((d) => d.status === 'up'),
    environment: config.environment,
    businessTimezone: config.businessTimezone,
    approvedPolicySetId: config.approvedPolicySetId,
    approvalPolicyMode: config.approvalPolicyMode,
    modules: Object.fromEntries(
      ALL_MODULES.map((m) => [m, config.enabledModules.has(m) ? 'enabled' : 'disabled']),
    ) as ReadinessReport['modules'],
    // Scheme only. The locator is omitted as well as the value — an operator needs to
    // know a secret resolved, not where it lives.
    secrets: [
      { key: 'DATABASE_URL_REF', scheme: config.databaseUrlRef.scheme },
      { key: 'OIDC_CLIENT_SECRET_REF', scheme: config.oidc.clientSecretRef.scheme },
      { key: 'SESSION_KEY_REF', scheme: config.sessionKeyRef.scheme },
      { key: 'OBJECT_STORE_CREDENTIALS_REF', scheme: config.objectStore.credentialsRef.scheme },
    ],
    dependencies,
  };
}
