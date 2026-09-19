import { eq, inArray } from 'drizzle-orm';
import { isUsablePolicyState, UNCONFIRMED_FR, type PolicyState } from '@dc/contracts';
import { policyRequirement } from '../schema/rules.js';
import type { KernelDatabase, KernelTransaction } from './tx.js';

type Reader = KernelDatabase | KernelTransaction;

/**
 * The `POLICY_REQUIRED` → `À confirmer` path.
 *
 * `00-shared-contract.md:119` — *"Only approved versioned values are usable; do not deploy
 * placeholder production values. Critical configuration failing schema validation prevents
 * activation of that capability, not unrelated manual work."* `:117` — unknown required
 * policy appears to the user in French as `À confirmer`.
 *
 * The shape of the answer is the point. A resolver that returned `undefined` for a missing
 * value would invite `?? 0` at the call site, and `CLAUDE.md` non-negotiable #4 exists
 * because that is how a missing tax rate becomes a zero tax rate. This returns a
 * discriminated result the caller cannot accidentally default.
 */
export type PolicyResolution =
  | { readonly resolved: true; readonly key: string; readonly value: unknown }
  | {
      readonly resolved: false;
      readonly key: string;
      /** `unresolved`, `proposed`, `superseded` — or `missing` when nothing is registered. */
      readonly status: PolicyState | 'missing';
      /** The French label for the screen, alongside `À confirmer`. */
      readonly label_fr: string;
      readonly display_fr: string;
    };

const unresolved = (
  key: string,
  status: PolicyState | 'missing',
  label_fr: string,
): PolicyResolution => ({
  resolved: false,
  key,
  status,
  label_fr,
  display_fr: UNCONFIRMED_FR,
});

/**
 * Resolve one policy key.
 *
 * A key with no row at all is `missing`, not `unresolved`: they mean different things to
 * an operator. `unresolved` is a registered question nobody has answered; `missing` is a
 * question nobody has asked, which is a registration bug in the module that needs it.
 */
export async function resolvePolicy(db: Reader, key: string): Promise<PolicyResolution> {
  const rows = await db
    .select()
    .from(policyRequirement)
    .where(eq(policyRequirement.key, key))
    .limit(1);

  const row = rows[0];
  if (row === undefined) return unresolved(key, 'missing', key);

  const status = row.status as PolicyState;
  if (!isUsablePolicyState(status)) return unresolved(key, status, row.labelFr);

  // The CHECK constraint guarantees an approved row has a value, so this is belt and
  // braces — but a policy value is exactly the thing not to be relaxed about.
  if (row.value === null) return unresolved(key, status, row.labelFr);

  return { resolved: true, key, value: row.value };
}

/**
 * Resolve several keys at once, for a calculation that needs a set of them.
 *
 * Returns every unresolved key, not the first. A finance reviewer chasing an invoice that
 * will not issue should be told about numbering, tax *and* rounding in one pass, not made
 * to fix one and rediscover the next.
 */
export async function resolvePolicies(
  db: Reader,
  keys: readonly string[],
): Promise<{
  readonly resolved: ReadonlyMap<string, unknown>;
  readonly blocking: readonly Extract<PolicyResolution, { resolved: false }>[];
}> {
  if (keys.length === 0) return { resolved: new Map(), blocking: [] };

  const rows = await db
    .select()
    .from(policyRequirement)
    .where(inArray(policyRequirement.key, [...keys]));

  const byKey = new Map(rows.map((r) => [r.key, r]));
  const resolved = new Map<string, unknown>();
  const blocking: Extract<PolicyResolution, { resolved: false }>[] = [];

  for (const key of keys) {
    const row = byKey.get(key);
    if (row === undefined) {
      blocking.push(unresolved(key, 'missing', key) as never);
      continue;
    }
    const status = row.status as PolicyState;
    if (!isUsablePolicyState(status) || row.value === null) {
      blocking.push(unresolved(key, status, row.labelFr) as never);
      continue;
    }
    resolved.set(key, row.value);
  }

  return { resolved, blocking };
}

/**
 * The `details` payload for a `POLICY_REQUIRED` error.
 *
 * `00-shared-contract.md:113` gives the copy as
 * `Configuration à valider : {libellé}. Cette action n'est pas disponible.` — so the
 * caller passes `libellé` from here. The keys travel in `details` so an administrator can
 * find the register entries without reading the French back to a developer.
 */
export const policyRequiredDetails = (
  blocking: readonly Extract<PolicyResolution, { resolved: false }>[],
): { readonly libellé: string; readonly details: Record<string, unknown> } => ({
  libellé: blocking.map((b) => b.label_fr).join(', '),
  details: {
    policy_keys: blocking.map((b) => ({ key: b.key, status: b.status })),
  },
});
