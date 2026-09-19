import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, loadConfigOrThrow, ConfigError } from './load.js';
import { parseSecretRef, resolveSecret, SecretRefError } from './secret-ref.js';
import { buildReadiness, configInvalidReadiness } from './readiness.js';
import { UNAPPROVED_POLICY_SET } from './schema.js';

/** A complete, valid local environment. Each test bends one thing away from it. */
const local = (): Record<string, string> => ({
  APP_BASE_URL: 'http://localhost:8080',
  API_BASE_URL: 'http://localhost:8080/api',
  DATABASE_URL_REF: 'env:DATABASE_URL',
  OIDC_ISSUER: 'http://localhost:8080/identity/realms/dossier-clair',
  OIDC_CLIENT_ID: 'dossier-clair-web',
  OIDC_CLIENT_SECRET_REF: 'env:OIDC_CLIENT_SECRET',
  SESSION_KEY_REF: 'env:SESSION_KEY',
  OBJECT_STORE_ENDPOINT: 'http://localhost:9000',
  OBJECT_STORE_BUCKET: 'dossier-clair-documents',
  OBJECT_STORE_CREDENTIALS_REF: 'env:OBJECT_STORE_CREDENTIALS',
  SCANNER_ENDPOINT: 'http://localhost:3310',
  BUSINESS_TIMEZONE: 'Africa/Casablanca',
  ENVIRONMENT: 'local',
  APPROVED_POLICY_SET_ID: UNAPPROVED_POLICY_SET,
  ENABLED_MODULES: '',
  APPROVAL_POLICY_MODE: 'dev_single_approver',
});

const deployed = (): Record<string, string> => ({
  ...local(),
  ENVIRONMENT: 'production',
  APP_BASE_URL: 'https://dossier.example.ma',
  API_BASE_URL: 'https://dossier.example.ma/api',
  OIDC_ISSUER: 'https://dossier.example.ma/identity/realms/dossier-clair',
  DATABASE_URL_REF: 'file:/run/secrets/database_url',
  OIDC_CLIENT_SECRET_REF: 'file:/run/secrets/oidc_client_secret',
  SESSION_KEY_REF: 'file:/run/secrets/session_key',
  OBJECT_STORE_CREDENTIALS_REF: 'file:/run/secrets/object_store',
  APPROVED_POLICY_SET_ID: 'policy-set-2026-03-reviewed',
  APPROVAL_POLICY_MODE: 'independent_reviewer',
});

const keysOf = (env: Record<string, string>) => {
  const result = loadConfig(env);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.problems.map((p) => p.key);
};

describe('the fifteen required keys', () => {
  it('accepts a complete local environment', () => {
    const result = loadConfig(local());
    expect(result.ok).toBe(true);
  });

  it.each(Object.keys(local()).filter((k) => k !== 'ENABLED_MODULES'))(
    'refuses to start when %s is missing',
    (key) => {
      const env = local();
      delete env[key];
      expect(keysOf(env)).toContain(key);
    },
  );

  it.each(Object.keys(local()).filter((k) => k !== 'ENABLED_MODULES'))(
    'refuses to start when %s is empty',
    (key) => {
      expect(keysOf({ ...local(), [key]: '' })).toContain(key);
    },
  );

  it('reports every problem at once, not the first', () => {
    const env = local();
    delete env.APP_BASE_URL;
    delete env.OIDC_CLIENT_ID;
    delete env.SCANNER_ENDPOINT;
    const keys = keysOf(env);
    expect(keys).toEqual(
      expect.arrayContaining(['APP_BASE_URL', 'OIDC_CLIENT_ID', 'SCANNER_ENDPOINT']),
    );
  });

  it('does not let a missing key hide a cross-field problem', () => {
    // A missing key and a bad URL used to be found in separate passes, so a deployment
    // with both took two restarts to diagnose. Everything accumulates in one pass now.
    const env = { ...deployed(), API_BASE_URL: 'http://elsewhere.example.ma/api' };
    delete env.SESSION_KEY_REF;
    env.OBJECT_STORE_CREDENTIALS_REF = 'env:OBJECT_STORE_CREDENTIALS';
    env.BUSINESS_TIMEZONE = 'Morocco/Casablanca';
    env.ENABLED_MODULES = 'DF99';
    expect(keysOf(env)).toEqual(
      expect.arrayContaining([
        'SESSION_KEY_REF', // missing
        'API_BASE_URL', // cross-origin, and plain http in production
        'OBJECT_STORE_CREDENTIALS_REF', // env: ref in production
        'BUSINESS_TIMEZONE', // not an IANA zone
        'ENABLED_MODULES', // unknown module id
      ]),
    );
  });

  it('rejects a URL that is not absolute http(s)', () => {
    expect(keysOf({ ...local(), OBJECT_STORE_ENDPOINT: 'localhost:9000' })).toContain(
      'OBJECT_STORE_ENDPOINT',
    );
    expect(keysOf({ ...local(), SCANNER_ENDPOINT: 'tcp://localhost:3310' })).toContain(
      'SCANNER_ENDPOINT',
    );
  });

  it('rejects a business timezone that is not an IANA zone', () => {
    expect(keysOf({ ...local(), BUSINESS_TIMEZONE: 'Morocco/Casablanca' })).toContain(
      'BUSINESS_TIMEZONE',
    );
    expect(keysOf({ ...local(), BUSINESS_TIMEZONE: 'UTC+1' })).toContain('BUSINESS_TIMEZONE');
  });

  it('rejects an unknown environment identity', () => {
    expect(keysOf({ ...local(), ENVIRONMENT: 'dev' })).toContain('ENVIRONMENT');
  });

  it('throws ConfigError rather than returning a partial config', () => {
    const env = local();
    delete env.SESSION_KEY_REF;
    expect(() => loadConfigOrThrow(env)).toThrow(ConfigError);
  });
});

describe('same-origin API', () => {
  it('rejects an API on a different origin from the app', () => {
    // The session cookie is HttpOnly and same-origin. A split origin fails in the
    // browser at first login, not at startup, unless this check exists.
    expect(keysOf({ ...local(), API_BASE_URL: 'http://localhost:3001' })).toContain('API_BASE_URL');
  });

  it('accepts a path-prefixed API on the same origin', () => {
    const result = loadConfig({ ...local(), API_BASE_URL: 'http://localhost:8080/api/v1' });
    expect(result.ok).toBe(true);
  });
});

describe('deployed environments are stricter', () => {
  it('accepts a correct production environment', () => {
    expect(loadConfig(deployed()).ok).toBe(true);
  });

  it.each([
    'DATABASE_URL_REF',
    'OIDC_CLIENT_SECRET_REF',
    'SESSION_KEY_REF',
    'OBJECT_STORE_CREDENTIALS_REF',
  ])('rejects an env: secret ref for %s in production', (key) => {
    expect(keysOf({ ...deployed(), [key]: 'env:SOMETHING' })).toContain(key);
  });

  it('allows env: secret refs locally, so a laptop needs no secret store', () => {
    expect(loadConfig(local()).ok).toBe(true);
  });

  it.each(['APP_BASE_URL', 'API_BASE_URL', 'OIDC_ISSUER'])(
    'rejects plain http for %s in production',
    (key) => {
      const env = {
        ...deployed(),
        APP_BASE_URL: 'http://dossier.example.ma',
        API_BASE_URL: 'http://dossier.example.ma/api',
        OIDC_ISSUER: 'http://dossier.example.ma/identity',
      };
      expect(keysOf(env)).toContain(key);
    },
  );

  it('rejects the local policy sentinel in staging and production', () => {
    for (const environment of ['staging', 'production']) {
      expect(
        keysOf({
          ...deployed(),
          ENVIRONMENT: environment,
          APPROVED_POLICY_SET_ID: UNAPPROVED_POLICY_SET,
        }),
      ).toContain('APPROVED_POLICY_SET_ID');
    }
  });

  it('allows the sentinel locally and in CI', () => {
    expect(loadConfig({ ...local(), ENVIRONMENT: 'ci' }).ok).toBe(true);
  });
});

describe('approval policy mode — ADR-002', () => {
  it('accepts dev_single_approver locally, so one person can develop', () => {
    expect(loadConfig({ ...local(), APPROVAL_POLICY_MODE: 'dev_single_approver' }).ok).toBe(true);
    expect(
      loadConfig({ ...local(), ENVIRONMENT: 'ci', APPROVAL_POLICY_MODE: 'dev_single_approver' }).ok,
    ).toBe(true);
  });

  it.each(['staging', 'production'])('refuses dev_single_approver in %s', (environment) => {
    // The production readiness check of ADR-002. A deployment running this mode has
    // separation of duty switched off while every screen still reads `Approuvé`.
    const problems = keysOf({
      ...deployed(),
      ENVIRONMENT: environment,
      APPROVAL_POLICY_MODE: 'dev_single_approver',
    });
    expect(problems).toContain('APPROVAL_POLICY_MODE');
  });

  it('accepts the two deployable modes in production', () => {
    for (const mode of ['independent_reviewer', 'small_org_documented']) {
      expect(loadConfig({ ...deployed(), APPROVAL_POLICY_MODE: mode }).ok, mode).toBe(true);
    }
  });

  it('refuses an unknown mode rather than falling back to the default', () => {
    // Falling back to independent_reviewer would be the safe direction, and still wrong:
    // the deployment asked for something, and silently substituting hides the typo.
    expect(keysOf({ ...local(), APPROVAL_POLICY_MODE: 'single' })).toContain(
      'APPROVAL_POLICY_MODE',
    );
  });

  it('is required, with no default', () => {
    const env = local();
    delete env.APPROVAL_POLICY_MODE;
    expect(keysOf(env)).toContain('APPROVAL_POLICY_MODE');
  });
});

describe('enabled-module list', () => {
  const modulesOf = (value: string) => {
    const result = loadConfig({ ...local(), ENABLED_MODULES: value });
    if (!result.ok) throw new Error(result.problems.map((p) => p.message).join('; '));
    return result.config.enabledModules;
  };

  it('leaves every optional module disabled when the list is empty', () => {
    const modules = modulesOf('');
    for (const id of ['DF01', 'DF02', 'DF03', 'DF04', 'DF05', 'DF06'] as const) {
      expect(modules.has(id)).toBe(false);
    }
  });

  it('enables core modules whether or not they are listed', () => {
    expect(modulesOf('').has('CR01')).toBe(true);
    expect(modulesOf('CR01').has('CR01')).toBe(true);
  });

  it('enables only the optional modules named', () => {
    const modules = modulesOf('DF04, DF06');
    expect(modules.has('DF04')).toBe(true);
    expect(modules.has('DF06')).toBe(true);
    expect(modules.has('DF01')).toBe(false);
  });

  it('fails startup on an unknown module id rather than ignoring it', () => {
    // A typo that silently disables a module is the failure mode this prevents.
    expect(keysOf({ ...local(), ENABLED_MODULES: 'DF04,DF07' })).toContain('ENABLED_MODULES');
  });
});

describe('secret refs', () => {
  it('parses env and file refs', () => {
    expect(parseSecretRef('env:DATABASE_URL')).toMatchObject({
      scheme: 'env',
      locator: 'DATABASE_URL',
    });
    expect(parseSecretRef('file:/run/secrets/x')).toMatchObject({
      scheme: 'file',
      locator: '/run/secrets/x',
    });
  });

  it.each(['DATABASE_URL', 'vault:secret/db', 'env:', ':x', 'file:relative/path'])(
    'rejects "%s"',
    (raw) => {
      expect(() => parseSecretRef(raw)).toThrow(SecretRefError);
    },
  );

  it('resolves an env ref', () => {
    expect(resolveSecret(parseSecretRef('env:X'), { X: 'value' })).toBe('value');
  });

  it('resolves a file ref and strips the trailing newline a secret mount adds', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'dc-')), 'secret');
    writeFileSync(path, 'p@ssw0rd\n');
    expect(resolveSecret(parseSecretRef(`file:${path}`))).toBe('p@ssw0rd');
  });

  it.each([
    ['an unset env var', 'env:MISSING', {}],
    ['an empty env var', 'env:EMPTY', { EMPTY: '' }],
    ['a missing file', 'file:/nonexistent/secret', {}],
  ])('throws for %s', (_name, raw, env) => {
    expect(() => resolveSecret(parseSecretRef(raw), env)).toThrow(SecretRefError);
  });
});

describe('readiness never carries a secret', () => {
  const SECRETS = [
    'p@ssw0rd-database',
    'oidc-client-secret-value',
    'session-key-value',
    'minio-credentials',
  ];

  it('omits every resolved secret value from the report', () => {
    const env = {
      ...local(),
      DATABASE_URL: `postgres://dc:${SECRETS[0]}@localhost:5432/dc`,
      OIDC_CLIENT_SECRET: SECRETS[1]!,
      SESSION_KEY: SECRETS[2]!,
      OBJECT_STORE_CREDENTIALS: SECRETS[3]!,
    };
    const result = loadConfig(env);
    if (!result.ok) throw new Error('fixture should be valid');

    // Resolve them all, so anything that captured a value would show up below.
    for (const ref of [
      result.config.databaseUrlRef,
      result.config.oidc.clientSecretRef,
      result.config.sessionKeyRef,
      result.config.objectStore.credentialsRef,
    ]) {
      expect(resolveSecret(ref, env)).toBeTruthy();
    }

    const serialized = JSON.stringify(
      buildReadiness(result.config, [{ name: 'postgres', status: 'up' }]),
    );
    for (const secret of SECRETS) expect(serialized).not.toContain(secret);
    // Not even the locator, which would tell a reader where to go looking.
    expect(serialized).not.toContain('/run/secrets');
    expect(serialized).not.toContain('DATABASE_URL"');
    // The deployment's separation-of-duty posture is not a secret — an operator must be
    // able to see it without reading the container's environment.
    expect(serialized).toContain('dev_single_approver');
  });

  it('reports not ready, with keys and reasons but no values, when config is invalid', () => {
    const env = local();
    delete env.SESSION_KEY_REF;
    const result = loadConfig(env);
    if (result.ok) throw new Error('fixture should be invalid');
    const report = configInvalidReadiness(result.problems);
    expect(report.ready).toBe(false);
    expect(report.configProblems?.map((p) => p.key)).toContain('SESSION_KEY_REF');
    expect(Object.values(report.modules).every((v) => v === 'disabled')).toBe(true);
  });

  it('is not ready while any dependency is down', () => {
    const result = loadConfig(local());
    if (!result.ok) throw new Error('fixture should be valid');
    const report = buildReadiness(result.config, [
      { name: 'postgres', status: 'up' },
      { name: 'scanner', status: 'down', detail: 'connection refused' },
    ]);
    expect(report.ready).toBe(false);
  });
});
