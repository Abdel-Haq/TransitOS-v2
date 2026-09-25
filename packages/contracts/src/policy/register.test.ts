import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ALL_MODULES } from '@dc/config';
import { policyKeySchema } from '../rules/policy.js';
import { CAPABILITIES } from '../registry/capabilities.js';
import { POLICY_OWNER_CODES, EXTERNAL_OWNERS, POLICY_OWNERS } from './owners.js';
import { LIST_A, LIST_B, POLICY_REGISTER, entriesForOwner } from './register.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const specLine = (citation: string): string | undefined => {
  if (!citation.includes('.md:')) return undefined; // an ADR anchor, not a spec line
  const [file, line] = citation.split(':');
  return readFileSync(join(ROOT, 'specs', file!), 'utf8').split('\n')[Number(line) - 1];
};

describe('every entry is traceable', () => {
  it.each(POLICY_REGISTER.map((e) => [e.key, e.source] as const))(
    '%s cites a line that exists',
    (_key, source) => {
      if (source.startsWith('docs/')) {
        // Coined by this project — the ADR must exist and carry the anchor.
        const [file, anchor] = source.split('#');
        const text = readFileSync(join(ROOT, file!), 'utf8');
        expect(text).toContain(`<a id="${anchor}"></a>`);
        return;
      }
      expect(specLine(source)?.length ?? 0).toBeGreaterThan(0);
    },
  );

  it('cites a marker line, or an entity line the marker governs', () => {
    // Most entries come from a line carrying the marker itself. A handful are the schema
    // line the marker refers to — 00-shared-contract.md:49 for currency precision — and
    // those are named explicitly rather than allowed by a loose rule.
    const nonMarker = new Set([
      '00-shared-contract.md:49',
      '20-data-api-contract-details.md:3',
      '16-DF06-api-integrations.md:42',
    ]);
    for (const entry of POLICY_REGISTER) {
      if (entry.source.startsWith('docs/')) continue;
      const line = specLine(entry.source) ?? '';
      const carriesMarker = line.toLowerCase().includes('assumption to verify');
      expect(carriesMarker || nonMarker.has(entry.source), `${entry.key} ← ${entry.source}`).toBe(
        true,
      );
    }
  });
});

describe('shape', () => {
  it('namespaces every key, so none can be mistaken for a capability', () => {
    for (const entry of POLICY_REGISTER) {
      expect(policyKeySchema.safeParse(entry.key).success, entry.key).toBe(true);
      expect(CAPABILITIES, entry.key).not.toContain(entry.key as never);
    }
  });

  it('has no duplicate keys', () => {
    const keys = POLICY_REGISTER.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('scopes every entry to a real module', () => {
    for (const e of POLICY_REGISTER) expect(ALL_MODULES, e.key).toContain(e.module);
  });

  it('gives every entry a French label, a question and what it blocks', () => {
    for (const e of POLICY_REGISTER) {
      expect(e.label_fr.length, e.key).toBeGreaterThan(3);
      expect(e.question.length, e.key).toBeGreaterThan(20);
      expect(e.blocks.length, e.key).toBeGreaterThan(5);
      // The label reaches a user's screen beside `À confirmer`, so it must be French,
      // not a key echoed back at them.
      expect(e.label_fr, e.key).not.toMatch(/^policy\./);
    }
  });

  it('names a registered owner on every entry', () => {
    for (const e of POLICY_REGISTER) expect(POLICY_OWNER_CODES, e.key).toContain(e.owner);
  });
});

describe('the A/B split holds', () => {
  it('gives every List A entry a value, and no List B entry one', () => {
    // ADR-005: List A is "recorded as an approved policy version"; List B "stays
    // unresolved". A List B entry with a value would be a developer's guess wearing the
    // register's authority.
    for (const e of LIST_A) expect(e.value, e.key).toBeDefined();
    for (const e of LIST_B) expect(e.value, e.key).toBeUndefined();
  });

  it('assigns every List A entry to engineering and no List B entry to it', () => {
    for (const e of LIST_A) expect(e.owner, e.key).toBe('engineering');
    for (const e of LIST_B) expect(e.owner, e.key).not.toBe('engineering');
  });

  it('keeps regulatory, financial and privacy values out of List A', () => {
    // The whole point of the split. If any of these ever landed in List A, a developer
    // would have chosen a tax rate or a retention period.
    const forbidden = /tax|tariff|valuation|retention|regime|deadline|rate|fx|numbering|nfr/i;
    // ADR-005 names one exception outright: "rate-limit values for synthetic testing".
    // Allowed by name and citation rather than by loosening the pattern — the guard is
    // worth more strict with one documented exception than blunt with none.
    const allowed = new Set(['policy.api.synthetic_rate_limit']);
    for (const e of LIST_A) {
      if (allowed.has(e.key)) continue;
      expect(forbidden.test(e.key), `${e.key} looks like an external value in List A`).toBe(false);
    }
    // And the production limit it is distinguished from must be List B.
    expect(LIST_B.map((e) => e.key)).toContain('policy.platform.rate_limits');
  });

  it('covers every owner the specs name', () => {
    for (const owner of EXTERNAL_OWNERS) {
      expect(entriesForOwner(owner).length, owner).toBeGreaterThan(0);
      expect(POLICY_OWNERS[owner].label_fr.length).toBeGreaterThan(3);
    }
  });
});

describe('List A values satisfy their own schemas', () => {
  const satisfies = (value: unknown, schema: Record<string, unknown>): boolean => {
    switch (schema.type) {
      case 'integer':
        return (
          Number.isInteger(value) &&
          (schema.minimum === undefined || (value as number) >= (schema.minimum as number)) &&
          (schema.maximum === undefined || (value as number) <= (schema.maximum as number))
        );
      case 'string':
        return (
          typeof value === 'string' &&
          (schema.pattern === undefined || new RegExp(schema.pattern as string).test(value)) &&
          (schema.minLength === undefined || value.length >= (schema.minLength as number))
        );
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value) && value.length >= ((schema.minItems as number) ?? 0);
      default:
        return typeof value === 'object' && value !== null;
    }
  };

  it.each(LIST_A.map((e) => [e.key, e] as const))('%s', (_key, entry) => {
    // A default that does not match the schema it ships with is a default that fails the
    // first time a reviewer tries to supersede it.
    expect(satisfies(entry.value, entry.schema), JSON.stringify(entry.value)).toBe(true);
  });
});

describe('the keys already referenced in code are registered', () => {
  it.each([
    'policy.jobs.max_attempts',
    'policy.approval.small_org_subset',
    'policy.identity.role_bundles',
  ])('%s', (key) => {
    // These accumulated during phases 0.1–0.5 as coined keys. An unregistered key is a
    // question nobody asked, which is a registration bug in the module that needs it.
    expect(POLICY_REGISTER.map((e) => e.key)).toContain(key);
  });
});
