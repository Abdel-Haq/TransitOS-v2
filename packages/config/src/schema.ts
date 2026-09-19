/**
 * The startup configuration contract of `19-security-operations-delivery.md:63`,
 * key for key:
 *
 *   APP_BASE_URL · API_BASE_URL · DATABASE_URL secret ref · OIDC_ISSUER ·
 *   OIDC_CLIENT_ID · OIDC secret ref · SESSION_KEY_REF · OBJECT_STORE_ENDPOINT ·
 *   private bucket name · object-store credentials ref · scanner endpoint ·
 *   business timezone · environment identity · approved policy-set ID ·
 *   enabled-module list
 *
 * Every one is required. There are no defaults: a default is an invented value, and
 * `CLAUDE.md` non-negotiable #4 says unknown is not zero.
 */
export const ENVIRONMENTS = ['local', 'ci', 'staging', 'production'] as const;
export type EnvironmentIdentity = (typeof ENVIRONMENTS)[number];

/**
 * The sentinel a local or CI deployment uses in place of an approved policy set.
 * `19-…:63` — *"do not auto-create production policies from local defaults."*
 * Staging and production reject it by name.
 */
export const UNAPPROVED_POLICY_SET = 'local-dev-unapproved';

/** The fourteen keys that must be present and non-empty. `ENABLED_MODULES` may be empty. */
export const REQUIRED_KEYS = [
  'APP_BASE_URL',
  'API_BASE_URL',
  'DATABASE_URL_REF',
  'OIDC_ISSUER',
  'OIDC_CLIENT_ID',
  'OIDC_CLIENT_SECRET_REF',
  'SESSION_KEY_REF',
  'OBJECT_STORE_ENDPOINT',
  'OBJECT_STORE_BUCKET',
  'OBJECT_STORE_CREDENTIALS_REF',
  'SCANNER_ENDPOINT',
  'BUSINESS_TIMEZONE',
  'ENVIRONMENT',
  'APPROVED_POLICY_SET_ID',
] as const;

export type RequiredKey = (typeof REQUIRED_KEYS)[number];
