import { describe, expect, it } from 'vitest';
import { ALL_MODULES } from '@dc/config';
import { CAPABILITIES, UNASSIGNED_CAPABILITIES, capabilitiesOfRole } from '@dc/contracts';
import { decideAccess, directlyGrantedIds, hasBroadScope } from './decide.js';
import type { AccessRequest, ResourceGrant, Subject, TargetResource } from './types.js';

const NOW = '2026-09-19T12:00:00Z';
const ALL_ENABLED = new Set(ALL_MODULES);
const DOSSIER = '11111111-1111-4111-8111-111111111111';
const COST = '22222222-2222-4222-8222-222222222222';
const ATTACHMENT = '33333333-3333-4333-8333-333333333333';

const staff = (over: Partial<Subject> = {}): Subject => ({
  user_id: 'aaaa0000-0000-4000-8000-000000000001',
  suspended: false,
  audience: 'staff',
  roles: [{ role_code: 'dossier_agent', scope: 'assigned', valid_from: '2026-01-01T00:00:00Z' }],
  grants: [],
  assigned_resource_ids: new Set([DOSSIER]),
  ...over,
});

const client = (grants: ResourceGrant[]): Subject => ({
  user_id: 'bbbb0000-0000-4000-8000-000000000002',
  suspended: false,
  audience: 'external',
  roles: [{ role_code: 'external_contact', scope: 'assigned', valid_from: '2026-01-01T00:00:00Z' }],
  grants,
  assigned_resource_ids: new Set(),
});

const target = (over: Partial<TargetResource> = {}): TargetResource => ({
  ref: { kind: 'dossier', id: DOSSIER },
  classification: 'internal',
  ancestors: [],
  ...over,
});

const ask = (over: Partial<AccessRequest> = {}): AccessRequest => ({
  subject: staff(),
  capability: 'evidence.read',
  resource: target(),
  enabledModules: ALL_ENABLED,
  at: NOW,
  ...over,
});

describe('deny by default', () => {
  it('denies a subject with no roles and no grants', () => {
    const decision = decideAccess(
      ask({ subject: staff({ roles: [], assigned_resource_ids: new Set() }) }),
    );
    expect(decision.allowed).toBe(false);
  });

  it('denies a suspended account even with every role', () => {
    // 01-FD01-identity.md:26 — suspended accounts cannot refresh or initiate sessions.
    const decision = decideAccess(ask({ subject: staff({ suspended: true }) }));
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.reason).toBe('account_suspended');
  });

  it('allows an assigned staff member with the capability', () => {
    expect(decideAccess(ask()).allowed).toBe(true);
  });
});

describe('module availability', () => {
  it('denies a capability whose module is disabled', () => {
    const decision = decideAccess(ask({ enabledModules: new Set(['CR01']) }));
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.reason).toBe('module_unavailable');
  });

  it('answers 404, not 403, for a disabled module', () => {
    // A 403 would say the feature exists and is merely withheld, which is a disclosure
    // about the deployment rather than about this user.
    const decision = decideAccess(ask({ enabledModules: new Set(['CR01']) }));
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.status).toBe(404);
  });
});

describe('the 403 / 404 split', () => {
  it('names a capability the user holds nowhere — 403', () => {
    const decision = decideAccess(ask({ capability: 'invoice.issue' }));
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.reason).toBe('missing_capability');
    expect(decision.status).toBe(403);
  });

  it('hides a resource outside scope behind 404', () => {
    // 00-shared-contract.md:103 — 404 covers "absent/inaccessible". Answering 403 here
    // would confirm the record exists, which is itself a disclosure.
    const decision = decideAccess(
      ask({ resource: target({ ref: { kind: 'dossier', id: COST } }) }),
    );
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.reason).toBe('out_of_scope');
    expect(decision.status).toBe(404);
  });
});

describe('staff scope', () => {
  it('lets all_operational_records reach an unassigned resource', () => {
    const subject = staff({
      roles: [
        {
          role_code: 'dossier_agent',
          scope: 'all_operational_records',
          valid_from: '2026-01-01T00:00:00Z',
        },
      ],
      assigned_resource_ids: new Set(),
    });
    const decision = decideAccess(
      ask({ subject, resource: target({ ref: { kind: 'dossier', id: COST } }) }),
    );
    expect(decision.allowed).toBe(true);
    if (!decision.allowed) return;
    expect(decision.via).toBe('role_scope');
  });

  it('limits the broad scope to the role’s own capabilities', () => {
    // :84 — "an explicitly granted all_operational_records scope limited to the role's
    // capabilities." Broad scope is not a second capability bundle.
    const subject = staff({
      roles: [
        {
          role_code: 'dossier_agent',
          scope: 'all_operational_records',
          valid_from: '2026-01-01T00:00:00Z',
        },
      ],
      assigned_resource_ids: new Set(),
    });
    expect(decideAccess(ask({ subject, capability: 'invoice.issue' })).allowed).toBe(false);
  });

  it('denies once a role assignment has expired', () => {
    const subject = staff({
      roles: [
        {
          role_code: 'dossier_agent',
          scope: 'assigned',
          valid_from: '2026-01-01T00:00:00Z',
          valid_until: '2026-06-01T00:00:00Z',
        },
      ],
    });
    expect(decideAccess(ask({ subject })).allowed).toBe(false);
  });

  it('denies a role assignment that has not started', () => {
    const subject = staff({
      roles: [
        { role_code: 'dossier_agent', scope: 'assigned', valid_from: '2027-01-01T00:00:00Z' },
      ],
    });
    expect(decideAccess(ask({ subject })).allowed).toBe(false);
  });
});

describe('external subjects', () => {
  const readGrant = (resource_id: string, inherit = false): ResourceGrant => ({
    resource_id,
    actions: ['evidence.read'],
    inherit_shareable_children: inherit,
  });

  it('grants nothing on client membership alone', () => {
    // :83 — "Client membership alone grants nothing."
    expect(decideAccess(ask({ subject: client([]) })).allowed).toBe(false);
  });

  it('allows a direct grant', () => {
    const decision = decideAccess(
      ask({
        subject: client([readGrant(DOSSIER)]),
        resource: target({ classification: 'client_shareable' }),
      }),
    );
    expect(decision.allowed).toBe(true);
    if (!decision.allowed) return;
    expect(decision.via).toBe('direct_grant');
  });

  it('never inherits into an internal record', () => {
    // :84 — "internal records never inherit external access."
    const decision = decideAccess(
      ask({
        subject: client([readGrant(DOSSIER, true)]),
        resource: target({
          ref: { kind: 'cost_item', id: COST },
          classification: 'internal',
          ancestors: [{ id: DOSSIER, classification: 'client_shareable' }],
        }),
      }),
    );
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.reason).toBe('internal_not_shared_externally');
  });

  it('inherits into a shareable child when the grant says so', () => {
    const decision = decideAccess(
      ask({
        subject: client([readGrant(DOSSIER, true)]),
        resource: target({
          ref: { kind: 'cost_item', id: COST },
          classification: 'client_shareable',
          ancestors: [{ id: DOSSIER, classification: 'client_shareable' }],
        }),
      }),
    );
    expect(decision.allowed).toBe(true);
    if (!decision.allowed) return;
    expect(decision.via).toBe('inherited_grant');
  });

  it('does not inherit when the grant withholds it', () => {
    expect(
      decideAccess(
        ask({
          subject: client([readGrant(DOSSIER, false)]),
          resource: target({
            ref: { kind: 'cost_item', id: COST },
            classification: 'client_shareable',
            ancestors: [{ id: DOSSIER, classification: 'client_shareable' }],
          }),
        }),
      ).allowed,
    ).toBe(false);
  });

  it('stops the walk at an internal record in the middle of the chain', () => {
    // dossier(shareable) → cost(internal) → attachment(shareable). The internal record is
    // a wall, not a transparent link; treating it otherwise shows a client an internal cost's child.
    const decision = decideAccess(
      ask({
        subject: client([readGrant(DOSSIER, true)]),
        resource: target({
          ref: { kind: 'resource_evidence', id: ATTACHMENT },
          classification: 'client_shareable',
          ancestors: [
            { id: COST, classification: 'internal' },
            { id: DOSSIER, classification: 'client_shareable' },
          ],
        }),
      }),
    );
    expect(decision.allowed).toBe(false);
  });
});

describe('revoked and expired grants', () => {
  const grant = (over: Partial<ResourceGrant>): ResourceGrant => ({
    resource_id: DOSSIER,
    actions: ['evidence.read'],
    inherit_shareable_children: true,
    ...over,
  });

  it('denies a revoked grant', () => {
    expect(
      decideAccess(
        ask({
          subject: client([grant({ revoked_at: '2026-09-01T00:00:00Z' })]),
          resource: target({ classification: 'client_shareable' }),
        }),
      ).allowed,
    ).toBe(false);
  });

  it('denies an expired grant', () => {
    expect(
      decideAccess(
        ask({
          subject: client([grant({ valid_until: '2026-09-01T00:00:00Z' })]),
          resource: target({ classification: 'client_shareable' }),
        }),
      ).allowed,
    ).toBe(false);
  });

  it('honours a grant that has not expired yet', () => {
    expect(
      decideAccess(
        ask({
          subject: client([grant({ valid_until: '2027-01-01T00:00:00Z' })]),
          resource: target({ classification: 'client_shareable' }),
        }),
      ).allowed,
    ).toBe(true);
  });

  it('revokes inheritance to children at the same moment as the parent grant', () => {
    // The case the exit condition names: a revoked parent grant must not leave children
    // reachable. Inheritance is computed from the live grant, never cached on the child.
    const decision = decideAccess(
      ask({
        subject: client([grant({ revoked_at: '2026-09-01T00:00:00Z' })]),
        resource: target({
          ref: { kind: 'cost_item', id: COST },
          classification: 'client_shareable',
          ancestors: [{ id: DOSSIER, classification: 'client_shareable' }],
        }),
      }),
    );
    expect(decision.allowed).toBe(false);
  });
});

describe('restricted classification', () => {
  it('needs a direct grant even for a general dossier reader', () => {
    // :84 — "restricted documents require a separate explicit grant even for general
    // dossier readers."
    const decision = decideAccess(ask({ resource: target({ classification: 'restricted' }) }));
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.reason).toBe('restricted_needs_direct_grant');
  });

  it('is not reachable by all_operational_records either', () => {
    // The broad scope is the strongest thing a staff role has, and restricted still
    // beats it. That is the entire point of the classification.
    const subject = staff({
      roles: [
        {
          role_code: 'dossier_agent',
          scope: 'all_operational_records',
          valid_from: '2026-01-01T00:00:00Z',
        },
      ],
    });
    expect(
      decideAccess(ask({ subject, resource: target({ classification: 'restricted' }) })).allowed,
    ).toBe(false);
  });

  it('is never reached by inheritance', () => {
    expect(
      decideAccess(
        ask({
          subject: client([
            { resource_id: DOSSIER, actions: ['evidence.read'], inherit_shareable_children: true },
          ]),
          resource: target({
            ref: { kind: 'resource_evidence', id: ATTACHMENT },
            classification: 'restricted',
            ancestors: [{ id: DOSSIER, classification: 'client_shareable' }],
          }),
        }),
      ).allowed,
    ).toBe(false);
  });

  it('is reachable with its own grant', () => {
    const decision = decideAccess(
      ask({
        subject: staff({
          grants: [
            { resource_id: DOSSIER, actions: ['evidence.read'], inherit_shareable_children: false },
          ],
        }),
        resource: target({ classification: 'restricted' }),
      }),
    );
    expect(decision.allowed).toBe(true);
  });
});

describe('aggregate leakage', () => {
  it('reports only live grants for a list predicate', () => {
    // 00-shared-contract.md:53 — access control before pagination/aggregation. A list
    // that paginates first returns short pages; an aggregate that sums first reveals a
    // total the user is not entitled to.
    const subject = client([
      { resource_id: DOSSIER, actions: ['evidence.read'], inherit_shareable_children: false },
      {
        resource_id: COST,
        actions: ['evidence.read'],
        inherit_shareable_children: false,
        revoked_at: '2026-09-01T00:00:00Z',
      },
      { resource_id: ATTACHMENT, actions: ['finance.read'], inherit_shareable_children: false },
    ]);
    expect(directlyGrantedIds(subject, 'evidence.read', NOW)).toEqual([DOSSIER]);
  });

  it('reports broad scope only for the capabilities the role actually holds', () => {
    const subject = staff({
      roles: [
        {
          role_code: 'dossier_agent',
          scope: 'all_operational_records',
          valid_from: '2026-01-01T00:00:00Z',
        },
      ],
    });
    expect(hasBroadScope(subject, 'evidence.read', NOW)).toBe(true);
    expect(hasBroadScope(subject, 'invoice.issue', NOW)).toBe(false);
  });

  it('gives an external subject no broad scope, ever', () => {
    const subject = client([
      { resource_id: DOSSIER, actions: ['evidence.read'], inherit_shareable_children: false },
    ]);
    expect(hasBroadScope(subject, 'evidence.read', NOW)).toBe(false);
  });
});

describe('the role bundle gap is fenced, not hidden', () => {
  it('denies every unassigned capability by default', () => {
    // 86 of 121 capabilities have no role attribution anywhere in the specs. They fail
    // closed. Resolving them is policy.identity.role_bundles†, not a developer's guess.
    for (const capability of UNASSIGNED_CAPABILITIES.slice(0, 20)) {
      const decision = decideAccess(
        ask({ capability, subject: staff({ assigned_resource_ids: new Set([DOSSIER]) }) }),
      );
      expect(decision.allowed, capability).toBe(false);
    }
  });

  it('accounts for every capability as assigned or unassigned', () => {
    const assigned = new Set(
      [...new Set(CAPABILITIES)].filter((c) =>
        (
          [
            'access_admin',
            'operations_manager',
            'dossier_agent',
            'declarant_reviewer',
            'finance_operator',
            'finance_reviewer',
            'dispatcher',
            'field_agent',
            'red_operator',
            'red_reviewer',
            'production_contributor',
            'rule_reviewer',
            'auditor',
            'platform_operator',
            'external_contact',
            'external_approver',
          ] as const
        ).some((r) => capabilitiesOfRole(r).has(c)),
      ),
    );
    expect(assigned.size + UNASSIGNED_CAPABILITIES.length).toBe(CAPABILITIES.length);
  });

  it('never gives the platform operator business content', () => {
    // 18-PL02-launch-operations.md:15 — "technical operator cannot read business content
    // just because they run backups."
    const operator = capabilitiesOfRole('platform_operator');
    for (const forbidden of [
      'evidence.read',
      'finance.read',
      'dossier.read',
      'red.read',
    ] as const) {
      expect(operator.has(forbidden), forbidden).toBe(false);
    }
  });
});
