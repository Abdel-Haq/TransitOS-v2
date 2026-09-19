import { CORE_MODULES, isModuleId, isOptionalModule, type ModuleId } from './modules.js';
import { parseSecretRef, SecretRefError, type SecretRef } from './secret-ref.js';
import {
  APPROVAL_MODES,
  DEPLOYABLE_APPROVAL_MODES,
  isApprovalMode,
  isDeployableApprovalMode,
  type ApprovalMode,
} from './approval-mode.js';
import {
  ENVIRONMENTS,
  REQUIRED_KEYS,
  UNAPPROVED_POLICY_SET,
  type EnvironmentIdentity,
} from './schema.js';

export interface AppConfig {
  readonly environment: EnvironmentIdentity;
  readonly appBaseUrl: URL;
  readonly apiBaseUrl: URL;
  readonly databaseUrlRef: SecretRef;
  readonly oidc: {
    readonly issuer: URL;
    readonly clientId: string;
    readonly clientSecretRef: SecretRef;
  };
  readonly sessionKeyRef: SecretRef;
  readonly objectStore: {
    readonly endpoint: URL;
    readonly bucket: string;
    readonly credentialsRef: SecretRef;
  };
  readonly scannerEndpoint: URL;
  readonly businessTimezone: string;
  readonly approvedPolicySetId: string;
  readonly approvalPolicyMode: ApprovalMode;
  /** Core modules, plus whichever optional modules the deployment enabled. */
  readonly enabledModules: ReadonlySet<ModuleId>;
}

export interface ConfigProblem {
  readonly key: string;
  readonly message: string;
}

export type ConfigResult =
  | { readonly ok: true; readonly config: AppConfig }
  | { readonly ok: false; readonly problems: readonly ConfigProblem[] };

export class ConfigError extends Error {
  constructor(readonly problems: readonly ConfigProblem[]) {
    super(
      `Configuration is invalid; the process is not ready:\n` +
        problems.map((p) => `  - ${p.key}: ${p.message}`).join('\n'),
    );
    this.name = 'ConfigError';
  }
}

const parseUrl = (key: string, value: string, problems: ConfigProblem[]): URL | undefined => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw_(problems, key, `must be an absolute URL — got "${value}"`);
    return undefined;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw_(problems, key, `must be http or https — got "${url.protocol}"`);
    return undefined;
  }
  return url;
};

const parseRef = (key: string, value: string, problems: ConfigProblem[]): SecretRef | undefined => {
  try {
    return parseSecretRef(value);
  } catch (error) {
    throw_(problems, key, error instanceof SecretRefError ? error.message : String(error));
    return undefined;
  }
};

const throw_ = (problems: ConfigProblem[], key: string, message: string): void => {
  problems.push({ key, message });
};

const isValidTimezone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate configuration. Returns every problem found, in one pass.
 *
 * Not the first problem, and not the first *category* of problem: a missing key must
 * not hide a cross-origin API URL or an env: secret ref in production. A deployment
 * that surfaces one fault per restart costs an afternoon, so presence, shape and
 * cross-field rules all run and accumulate, each skipping only the values it has no
 * input for.
 *
 * Reads shape and cross-field rules only. No secret is resolved here, so the returned
 * `AppConfig` holds no secret material and is safe to log.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ConfigResult {
  const problems: ConfigProblem[] = [];

  const read = (key: string): string | undefined => {
    const value = env[key]?.trim();
    return value === undefined || value === '' ? undefined : value;
  };

  for (const key of REQUIRED_KEYS) {
    if (read(key) === undefined) throw_(problems, key, `${key} is required and must not be empty`);
  }

  const environmentRaw = read('ENVIRONMENT');
  const environment = ENVIRONMENTS.find((e) => e === environmentRaw);
  if (environmentRaw !== undefined && environment === undefined) {
    throw_(
      problems,
      'ENVIRONMENT',
      `must be one of ${ENVIRONMENTS.join(', ')} — got "${environmentRaw}"`,
    );
  }
  // An unrecognised environment is reported above. The stricter rules below are skipped
  // rather than guessed at: applying production rules to a typo would bury the typo.
  const deployed = environment === 'staging' || environment === 'production';

  const url = (key: string): URL | undefined => {
    const raw = read(key);
    if (raw === undefined) return undefined;
    return parseUrl(key, raw, problems);
  };
  const ref = (key: string): SecretRef | undefined => {
    const raw = read(key);
    if (raw === undefined) return undefined;
    return parseRef(key, raw, problems);
  };

  const appBaseUrl = url('APP_BASE_URL');
  const apiBaseUrl = url('API_BASE_URL');
  const issuer = url('OIDC_ISSUER');
  const objectStoreEndpoint = url('OBJECT_STORE_ENDPOINT');
  const scannerEndpoint = url('SCANNER_ENDPOINT');

  const databaseUrlRef = ref('DATABASE_URL_REF');
  const clientSecretRef = ref('OIDC_CLIENT_SECRET_REF');
  const sessionKeyRef = ref('SESSION_KEY_REF');
  const credentialsRef = ref('OBJECT_STORE_CREDENTIALS_REF');

  // The session cookie is HttpOnly and same-origin, and `19-…:65` puts a reverse proxy
  // in front: *"reverse proxy routes web and same-origin API"*. If the two base URLs
  // differ in origin the cookie is never sent and every authenticated request fails —
  // at runtime, in the browser, far from this file. Catch it here.
  if (appBaseUrl && apiBaseUrl && appBaseUrl.origin !== apiBaseUrl.origin) {
    throw_(
      problems,
      'API_BASE_URL',
      `must share an origin with APP_BASE_URL — the session cookie is same-origin ` +
        `(19-security-operations-delivery.md:65). Got "${apiBaseUrl.origin}" against ` +
        `"${appBaseUrl.origin}"; route both through the proxy instead.`,
    );
  }

  if (deployed) {
    // Environment variables leak: into process listings, crash dumps, child processes
    // and anything that serializes `process.env`. A deployed secret comes from a
    // mounted file backed by the secret store of `19-…:16`.
    for (const [key, value] of [
      ['DATABASE_URL_REF', databaseUrlRef],
      ['OIDC_CLIENT_SECRET_REF', clientSecretRef],
      ['SESSION_KEY_REF', sessionKeyRef],
      ['OBJECT_STORE_CREDENTIALS_REF', credentialsRef],
    ] as const) {
      if (value?.scheme === 'env') {
        throw_(
          problems,
          key,
          `must be a file ref in ${environment} — an env ref exposes the secret to every ` +
            `child process and crash dump. Mount it from the deployment secret store.`,
        );
      }
    }

    for (const [key, value] of [
      ['APP_BASE_URL', appBaseUrl],
      ['API_BASE_URL', apiBaseUrl],
      ['OIDC_ISSUER', issuer],
    ] as const) {
      if (value && value.protocol !== 'https:') {
        throw_(problems, key, `must be https in ${environment} — got "${value.protocol}"`);
      }
    }

    if (read('APPROVED_POLICY_SET_ID') === UNAPPROVED_POLICY_SET) {
      throw_(
        problems,
        'APPROVED_POLICY_SET_ID',
        `is the local development sentinel "${UNAPPROVED_POLICY_SET}". ` +
          `19-security-operations-delivery.md:63 — do not auto-create production policies ` +
          `from local defaults. Supply the reviewed policy set.`,
      );
    }
  }

  const approvalModeRaw = read('APPROVAL_POLICY_MODE');
  const approvalMode =
    approvalModeRaw !== undefined && isApprovalMode(approvalModeRaw) ? approvalModeRaw : undefined;
  if (approvalModeRaw !== undefined && approvalMode === undefined) {
    throw_(
      problems,
      'APPROVAL_POLICY_MODE',
      `must be one of ${APPROVAL_MODES.join(', ')} — got "${approvalModeRaw}"`,
    );
  } else if (approvalMode !== undefined && deployed && !isDeployableApprovalMode(approvalMode)) {
    // The production readiness check of ADR-002. A deployment running
    // `dev_single_approver` has separation of duty switched off while every screen still
    // reads `Approuvé`, so this refuses to start rather than warning.
    throw_(
      problems,
      'APPROVAL_POLICY_MODE',
      `"${approvalMode}" is a development mode and cannot run in ${environment}: it lets a ` +
        `submitter approve their own controlled action. See ADR-002. Use one of ` +
        `${DEPLOYABLE_APPROVAL_MODES.join(', ')}.`,
    );
  }

  const timezone = read('BUSINESS_TIMEZONE');
  if (timezone !== undefined && !isValidTimezone(timezone)) {
    throw_(
      problems,
      'BUSINESS_TIMEZONE',
      `is not an IANA time zone — got "${timezone}". Deadlines and free-time periods are ` +
        `computed in it; a wrong zone silently moves every due date.`,
    );
  }

  const enabledModules = new Set<ModuleId>(CORE_MODULES);
  for (const entry of (env.ENABLED_MODULES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    if (!isModuleId(entry)) {
      throw_(
        problems,
        'ENABLED_MODULES',
        `unknown module "${entry}". An unrecognised id is a typo that would silently leave ` +
          `a module disabled, so it fails startup instead.`,
      );
      continue;
    }
    if (!isOptionalModule(entry)) continue; // Core modules are always on; listing one is harmless.
    enabledModules.add(entry);
  }

  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    config: {
      environment: environment!,
      appBaseUrl: appBaseUrl!,
      apiBaseUrl: apiBaseUrl!,
      databaseUrlRef: databaseUrlRef!,
      oidc: {
        issuer: issuer!,
        clientId: read('OIDC_CLIENT_ID')!,
        clientSecretRef: clientSecretRef!,
      },
      sessionKeyRef: sessionKeyRef!,
      objectStore: {
        endpoint: objectStoreEndpoint!,
        bucket: read('OBJECT_STORE_BUCKET')!,
        credentialsRef: credentialsRef!,
      },
      scannerEndpoint: scannerEndpoint!,
      businessTimezone: timezone!,
      approvedPolicySetId: read('APPROVED_POLICY_SET_ID')!,
      approvalPolicyMode: approvalMode!,
      enabledModules,
    },
  };
}

/** `loadConfig` for a process that must refuse to start. Throws `ConfigError`. */
export function loadConfigOrThrow(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = loadConfig(env);
  if (!result.ok) throw new ConfigError(result.problems);
  return result.config;
}
