import { readFileSync } from 'node:fs';

/**
 * A reference to a secret, never the secret itself.
 *
 * `19-security-operations-delivery.md:63` lists the configuration that is validated
 * at startup and names four of them as *refs* rather than values: the database URL,
 * the OIDC client secret, the session key and the object-store credentials. `:16`
 * requires a deployment secret store with rotation.
 *
 * Config therefore carries `SecretRef`, and resolution is a separate, explicit call.
 * A `SecretRef` has no `toString` that yields its value and is never serialized.
 */
export type SecretScheme = 'env' | 'file';

export interface SecretRef {
  readonly scheme: SecretScheme;
  /** Variable name for `env:`, absolute path for `file:`. Not a secret. */
  readonly locator: string;
  /** The original `scheme:locator` text, safe to log. */
  readonly raw: string;
}

export class SecretRefError extends Error {}

const SCHEMES: readonly SecretScheme[] = ['env', 'file'];

export function parseSecretRef(raw: string): SecretRef {
  const index = raw.indexOf(':');
  if (index < 1) {
    throw new SecretRefError(
      `must be "<scheme>:<locator>" with scheme one of ${SCHEMES.join(', ')} — got "${raw}"`,
    );
  }
  const scheme = raw.slice(0, index);
  const locator = raw.slice(index + 1);
  if (!SCHEMES.includes(scheme as SecretScheme)) {
    throw new SecretRefError(`unknown scheme "${scheme}" — expected one of ${SCHEMES.join(', ')}`);
  }
  if (locator.length === 0) {
    throw new SecretRefError(`scheme "${scheme}" has an empty locator`);
  }
  if (scheme === 'file' && !locator.startsWith('/')) {
    throw new SecretRefError(`file refs must be absolute paths — got "${locator}"`);
  }
  return { scheme: scheme as SecretScheme, locator, raw };
}

/**
 * Resolve a reference to its value. Throws rather than returning undefined: an
 * unresolvable required secret is a not-ready condition, not a missing option.
 *
 * Kept out of `loadConfig` on purpose. Validating shape at startup must not pull
 * secret material into a config object that is logged, diffed or echoed.
 */
export function resolveSecret(ref: SecretRef, env: NodeJS.ProcessEnv = process.env): string {
  if (ref.scheme === 'env') {
    const value = env[ref.locator];
    if (value === undefined || value === '') {
      throw new SecretRefError(`${ref.raw} — environment variable is unset or empty`);
    }
    return value;
  }
  try {
    // Trailing newlines are an artefact of how files are written, not part of the
    // secret. Docker and Kubernetes secret mounts both produce them.
    const value = readFileSync(ref.locator, 'utf8').replace(/\r?\n$/, '');
    if (value === '') throw new SecretRefError(`${ref.raw} — file is empty`);
    return value;
  } catch (cause) {
    if (cause instanceof SecretRefError) throw cause;
    throw new SecretRefError(`${ref.raw} — cannot be read`, { cause });
  }
}
