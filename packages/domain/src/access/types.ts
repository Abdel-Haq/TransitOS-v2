import type { Capability, DataClassification, ResourceRef, RoleCode } from '@dc/contracts';
import type { ModuleId } from '@dc/config';
import type { UserId } from '../approval/types.js';

/**
 * `01-FD01-identity.md:35` — *"`user_id→User`, `role_code:Role`,
 * `scope:assigned/all_operational_records`, `valid_from:Instant`, `valid_until?:Instant`,
 * `approval_id→ApprovalDecision`."*
 */
export interface RoleAssignment {
  readonly role_code: RoleCode;
  readonly scope: 'assigned' | 'all_operational_records';
  readonly valid_from: string;
  readonly valid_until?: string;
}

/**
 * `01-FD01-identity.md:36` — *"`user_id→User`, `resource_id→ResourceRecord`,
 * `actions:Capability[]`, `inherit_shareable_children:Boolean`, `valid_until?:Instant`,
 * `revoked_at?:Instant`, `approval_id?`."*
 */
export interface ResourceGrant {
  readonly resource_id: string;
  readonly actions: readonly Capability[];
  readonly inherit_shareable_children: boolean;
  readonly valid_until?: string;
  readonly revoked_at?: string;
}

export interface Subject {
  readonly user_id: UserId;
  /** `01-FD01-identity.md:26` — *"Suspended accounts cannot refresh or initiate sessions."* */
  readonly suspended: boolean;
  readonly audience: 'staff' | 'external';
  readonly roles: readonly RoleAssignment[];
  readonly grants: readonly ResourceGrant[];
  /** Resources explicitly assigned to this user, for the staff `assigned` scope. */
  readonly assigned_resource_ids: ReadonlySet<string>;
}

/** An ancestor in the parent chain, nearest parent first. */
export interface Ancestor {
  readonly id: string;
  readonly classification: DataClassification;
}

export interface TargetResource {
  readonly ref: ResourceRef;
  readonly classification: DataClassification;
  /**
   * Parents, nearest first. Grant inheritance walks this, and `00-shared-contract.md:84`
   * is specific about the hop rule: inheritance reaches *"permitted child records only
   * when `client_shareable=true`"*.
   */
  readonly ancestors: readonly Ancestor[];
}

export interface AccessRequest {
  readonly subject: Subject;
  readonly capability: Capability;
  readonly resource: TargetResource;
  readonly enabledModules: ReadonlySet<ModuleId>;
  /** Evaluated against `valid_until` and `revoked_at`. Never defaulted to now() here. */
  readonly at: string;
}

export type DenialReason =
  | 'account_suspended'
  | 'module_unavailable'
  | 'missing_capability'
  | 'out_of_scope'
  | 'restricted_needs_direct_grant'
  | 'internal_not_shared_externally';

export type AccessDecision =
  | { readonly allowed: true; readonly via: 'role_scope' | 'direct_grant' | 'inherited_grant' }
  | {
      readonly allowed: false;
      readonly reason: DenialReason;
      /**
       * What the caller must return. `00-shared-contract.md:103` — `403` for a missing
       * capability, `404` for an *"absent/inaccessible scoped resource"*.
       *
       * The split matters: answering 403 for a resource outside the user's scope confirms
       * that the resource exists, which is a disclosure in itself. Only a capability the
       * user lacks outright is safe to name.
       */
      readonly status: 403 | 404;
    };
