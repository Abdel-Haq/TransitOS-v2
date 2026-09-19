import { CAPABILITY_REGISTRY, roleGrants } from '@dc/contracts';
import type {
  AccessDecision,
  AccessRequest,
  DenialReason,
  ResourceGrant,
  Subject,
} from './types.js';

/**
 * The access decision of `00-shared-contract.md:64`:
 *
 *   *"Effective access = active authenticated user + explicit capability + resource scope
 *   + data classification + current module availability. Deny by default."*
 *
 * Five terms, every one required, evaluated in that order. Pure: no HTTP, no SQL, no
 * clock — `at` is passed in, because a function that reads the clock cannot be tested
 * against an expiring grant.
 *
 * Deny by default is structural here: the function returns a denial unless a branch
 * explicitly allows, and there is no fall-through `return allowed`.
 */

const deny = (reason: DenialReason, status: 403 | 404): AccessDecision => ({
  allowed: false,
  reason,
  status,
});

const isActiveGrant = (grant: ResourceGrant, at: string): boolean => {
  if (grant.revoked_at !== undefined && grant.revoked_at <= at) return false;
  if (grant.valid_until !== undefined && grant.valid_until <= at) return false;
  return true;
};

const isActiveRole = (role: { valid_from: string; valid_until?: string }, at: string): boolean => {
  if (role.valid_from > at) return false;
  if (role.valid_until !== undefined && role.valid_until <= at) return false;
  return true;
};

/** Does any active role bundle carry this capability? Staff only — externals use grants. */
const holdsViaRole = (subject: Subject, capability: string, at: string): boolean =>
  subject.roles.some(
    (role) => isActiveRole(role, at) && roleGrants(role.role_code, capability as never),
  );

const grantsFor = (subject: Subject, resourceId: string, at: string): ResourceGrant[] =>
  subject.grants.filter((g) => g.resource_id === resourceId && isActiveGrant(g, at));

export function decideAccess(request: AccessRequest): AccessDecision {
  const { subject, capability, resource, at } = request;

  // --- 1. Active authenticated user --------------------------------------------------
  if (subject.suspended) return deny('account_suspended', 403);

  // --- 2. Current module availability ------------------------------------------------
  // Ahead of the capability check on purpose: a capability belonging to a module this
  // deployment has not enabled is not a permissions question at all, and answering 403
  // would suggest the feature exists and is merely withheld.
  const owningModule = CAPABILITY_REGISTRY[capability].module;
  if (!request.enabledModules.has(owningModule)) return deny('module_unavailable', 404);

  // --- 3. Explicit capability --------------------------------------------------------
  // `00-shared-contract.md:84` — external scopes are `ResourceGrant(user_id,resource_id,
  // actions,…)`. An external contact holds no role bundle: *"Client membership alone
  // grants nothing."* So their capability comes only from a grant's `actions`.
  const direct = grantsFor(subject, resource.ref.id, at);
  const directCarries = direct.some((g) => g.actions.includes(capability));

  const viaRole = subject.audience === 'staff' && holdsViaRole(subject, capability, at);
  if (!viaRole && !directCarries) {
    // A capability the user does not hold anywhere is safe to name: it discloses nothing
    // about which resources exist.
    if (!subject.grants.some((g) => g.actions.includes(capability))) {
      return deny('missing_capability', 403);
    }
  }

  // --- 4. Data classification --------------------------------------------------------
  // `:84` — *"`restricted` documents require a separate explicit grant even for general
  // dossier readers."* Even a staff user with `all_operational_records`: the whole point
  // is that broad scope does not reach restricted material.
  if (resource.classification === 'restricted' && !directCarries) {
    return deny('restricted_needs_direct_grant', 404);
  }

  // --- 5. Resource scope -------------------------------------------------------------
  if (directCarries) return { allowed: true, via: 'direct_grant' };

  if (subject.audience === 'staff' && viaRole) {
    const broad = subject.roles.some(
      (role) =>
        isActiveRole(role, at) &&
        role.scope === 'all_operational_records' &&
        roleGrants(role.role_code, capability as never),
    );
    // `:84` — the broad scope is *"limited to the role's capabilities"*, which is why the
    // bundle check is repeated here rather than assumed from the earlier pass.
    if (broad) return { allowed: true, via: 'role_scope' };
    if (subject.assigned_resource_ids.has(resource.ref.id)) {
      return { allowed: true, via: 'role_scope' };
    }
  }

  // --- Grant inheritance -------------------------------------------------------------
  // `:84` — *"grants may inherit to permitted child records only when
  // `client_shareable=true`"* and *"`internal` records never inherit external access."*
  //
  // The walk stops at the first hop that is not shareable. A chain
  // dossier(client_shareable) → cost_item(internal) → attachment(client_shareable) must
  // not reach the attachment: the internal record in the middle is a wall, not a
  // transparent link, and treating it otherwise is how a client sees an internal cost.
  if (resource.classification === 'internal' && subject.audience === 'external') {
    return deny('internal_not_shared_externally', 404);
  }

  if (resource.classification === 'client_shareable') {
    for (const ancestor of resource.ancestors) {
      if (ancestor.classification !== 'client_shareable') break;
      const inherited = grantsFor(subject, ancestor.id, at).filter(
        (g) => g.inherit_shareable_children && g.actions.includes(capability),
      );
      if (inherited.length > 0) return { allowed: true, via: 'inherited_grant' };
    }
  }

  return deny('out_of_scope', 404);
}

/**
 * Every resource id this subject can reach directly, for building a list predicate.
 *
 * `00-shared-contract.md:53` — *"All list predicates include access control before
 * pagination/aggregation."* A list that paginates first and filters afterwards returns
 * short pages; an aggregate that sums first and filters afterwards reveals a total the
 * user is not entitled to. `:84` — *"Management aggregates never reveal unauthorized
 * totals."*
 */
export const directlyGrantedIds = (subject: Subject, capability: string, at: string): string[] =>
  subject.grants
    .filter((g) => isActiveGrant(g, at) && g.actions.includes(capability as never))
    .map((g) => g.resource_id);

/** True when the subject's role bundle carries the capability at the broad scope. */
export const hasBroadScope = (subject: Subject, capability: string, at: string): boolean =>
  subject.audience === 'staff' &&
  subject.roles.some(
    (role) =>
      isActiveRole(role, at) &&
      role.scope === 'all_operational_records' &&
      roleGrants(role.role_code, capability as never),
  );
