import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ALL_MODULES } from '@dc/config';
import {
  CAPABILITIES,
  CAPABILITY_REGISTRY,
  capabilitiesOfModule,
  isCapability,
  MODULES_WITHOUT_CAPABILITIES,
} from './capabilities.js';
import { ROLE_REGISTRY, ROLE_CODES, STAFF_ROLES, EXTERNAL_ROLES, isRoleCode } from './roles.js';
import {
  ACTION_REGISTRY,
  CONTROLLED_ACTIONS,
  OPEN_DECISIONS,
  conditionalDecisionsFor,
  requiredDecisionsFor,
  requiresDistinctPerson,
} from './actions.js';

const SPECS = join(dirname(fileURLToPath(import.meta.url)), '../../../../specs');
const specLine = (citation: string): string => {
  const [file, line] = citation.split(':');
  const lines = readFileSync(join(SPECS, file!), 'utf8').split('\n');
  return lines[Number(line) - 1] ?? '';
};

/**
 * The registries claim to be extracted from the specifications rather than invented.
 * This is the test that keeps that claim true — every entry names a `file:line`, and
 * every one of those lines must still contain what the entry says it does.
 *
 * It also catches spec drift: edit a spec file and insert a line, and the citations that
 * moved fail here instead of quietly becoming decoration.
 */
describe('every registry citation resolves in the specs', () => {
  it.each(CAPABILITIES)('%s is named in its cited spec line', (capability) => {
    const { source } = CAPABILITY_REGISTRY[capability];
    const line = specLine(source);
    const [noun, ...rest] = capability.split('.');
    const verb = rest[rest.length - 1]!;
    const head = capability.slice(0, capability.lastIndexOf('.'));
    // The specs write `evidence.read/write/share`, so the line carries the noun and the
    // verb but not always the expanded pair.
    expect(line, `${capability} ← ${source}`).toContain(noun!);
    expect(line, `${capability} ← ${source}`).toMatch(
      new RegExp(`${head.replace(/[.]/g, '\\.')}[./a-z_]*\\b${verb}\\b`),
    );
  });

  it.each(ROLE_CODES)('%s and its French label are on its cited spec line', (role) => {
    const { source, label_fr } = ROLE_REGISTRY[role];
    const line = specLine(source);
    expect(line, `${role} ← ${source}`).toContain(role);
    expect(line, `${role} label ← ${source}`).toContain(label_fr);
  });

  it.each(CONTROLLED_ACTIONS)('%s cites a line that exists', (action) => {
    expect(specLine(ACTION_REGISTRY[action].source).length).toBeGreaterThan(0);
  });
});

describe('capability registry', () => {
  it('covers 121 capabilities across seventeen modules', () => {
    expect(CAPABILITIES).toHaveLength(121);
    expect(new Set(CAPABILITIES).size).toBe(CAPABILITIES.length);
  });

  it('assigns every capability to a real module', () => {
    for (const c of CAPABILITIES) expect(ALL_MODULES).toContain(CAPABILITY_REGISTRY[c].module);
  });

  it('records that PL01 owns no capability of its own', () => {
    // 17-PL01-ux.md:24 — saved views and preferences only; field contribution inherits
    // mission.event.submit from CR03. A platform UX module owning capabilities would be
    // a second authorization system.
    expect(MODULES_WITHOUT_CAPABILITIES).toContain('PL01');
    expect(capabilitiesOfModule('PL01')).toHaveLength(0);
  });

  it('never collides with the policy-key namespace', () => {
    // Policy keys are policy.<module>.<name>; capabilities are bare <noun>.<verb>.
    for (const c of CAPABILITIES) expect(c.startsWith('policy.')).toBe(false);
  });

  it('rejects an unknown capability', () => {
    expect(isCapability('dossier.read')).toBe(true);
    expect(isCapability('dossier.delete')).toBe(false);
    expect(isCapability('')).toBe(false);
  });

  it('keeps the three-segment CR03 mission capabilities', () => {
    // Not a typo in the specs — 06-CR03-transport.md:13 treats mission events as a noun.
    expect(isCapability('mission.event.submit')).toBe(true);
    expect(isCapability('mission.event.verify')).toBe(true);
  });
});

describe('role registry', () => {
  it('holds the sixteen roles of 00-shared-contract.md', () => {
    expect(ROLE_CODES).toHaveLength(16);
    expect(STAFF_ROLES).toHaveLength(14);
    expect(EXTERNAL_ROLES).toEqual(['external_contact', 'external_approver']);
  });

  it('gives every role a French label', () => {
    for (const r of ROLE_CODES) expect(ROLE_REGISTRY[r].label_fr.length).toBeGreaterThan(0);
  });
});

describe('action registry — separation of duty', () => {
  it('transcribes all twelve rows of the 20-…:65–78 table', () => {
    // Twelve rows, but the finance row covers four postings and the RED row three, so
    // there are more action codes than rows.
    const rows = new Set(CONTROLLED_ACTIONS.map((a) => ACTION_REGISTRY[a].source));
    expect(rows.size).toBe(12);
  });

  it('requires at least one independent decision for every action', () => {
    for (const action of CONTROLLED_ACTIONS) {
      expect(requiredDecisionsFor(action).length, action).toBeGreaterThan(0);
    }
  });

  it('names only registered roles and capabilities', () => {
    for (const action of CONTROLLED_ACTIONS) {
      const entry = ACTION_REGISTRY[action];
      for (const role of entry.submitter_roles) expect(isRoleCode(role), action).toBe(true);
      for (const decision of entry.required_decisions) {
        expect(isRoleCode(decision.reviewer_role), action).toBe(true);
        if (decision.capability !== undefined) {
          expect(isCapability(decision.capability), `${action} / ${decision.capability}`).toBe(
            true,
          );
        }
      }
    }
  });

  it('marks a distinct person wherever the spec says "a different X"', () => {
    // 20-…:67, :71, :77, :78. In each, the reviewer holds the SAME capability as the
    // submitter, so a check on capability codes alone would pass a self-approval.
    for (const action of [
      'privilege.expand',
      'transport.exception',
      'privacy.request',
      'installation.approve',
    ] as const) {
      expect(requiresDistinctPerson(action), action).toBe(true);
    }
  });

  it('keeps the same role on both sides where the spec does', () => {
    // privilege.expand: access_admin prepares, a different access_admin approves. The
    // separation is by identity, not by role or capability.
    const entry = ACTION_REGISTRY['privilege.expand'];
    expect(entry.submitter_roles).toContain('access_admin');
    expect(entry.required_decisions[0]!.reviewer_role).toBe('access_admin');
    expect(entry.required_decisions[0]!.distinct_person).toBe(true);
  });

  it('carries every decision of a multi-decision action', () => {
    // 20-…:79 — "require every required decision before effect."
    expect(requiredDecisionsFor('obligation.close')).toHaveLength(2);
    expect(requiredDecisionsFor('production.accept')).toHaveLength(2);
    expect(requiredDecisionsFor('client_request.approve_cost')).toHaveLength(2);
    expect(requiredDecisionsFor('rule.approve')).toHaveLength(2);
  });

  it('keeps a client consent from standing in for the internal review', () => {
    // 20-…:76 — "separate internal review remains mandatory."
    const decisions = requiredDecisionsFor('client_request.approve_cost');
    expect(decisions.map((d) => d.reviewer_role)).toEqual([
      'external_approver',
      'finance_reviewer',
    ]);
  });

  it('records every conditional decision with the spec’s own wording', () => {
    for (const action of CONTROLLED_ACTIONS) {
      for (const decision of conditionalDecisionsFor(action)) {
        expect(decision.condition!.length, action).toBeGreaterThan(10);
      }
    }
  });

  it('lists the decisions whose capability the spec names only by role', () => {
    // Honest gaps, not silent ones: the owning module supplies these with its own
    // citation rather than this file guessing a capability code.
    expect(OPEN_DECISIONS.length).toBeGreaterThan(0);
    for (const open of OPEN_DECISIONS) expect(isRoleCode(open.reviewer_role)).toBe(true);
  });

  it('never lets the submitter satisfy a required decision by capability alone', () => {
    // 20-…:79 — "The submitter cannot supply any of them." Where the reviewer capability
    // differs from the submitter role's, role separation carries it; where it does not,
    // distinct_person must.
    for (const action of CONTROLLED_ACTIONS) {
      const entry = ACTION_REGISTRY[action];
      for (const decision of entry.required_decisions) {
        const sameRole = entry.submitter_roles.includes(decision.reviewer_role as never);
        if (sameRole)
          expect(decision.distinct_person, `${action} / ${decision.reviewer_role}`).toBe(true);
      }
    }
  });
});
