import { describe, expect, it } from 'vitest';
import { componentSchemas, COMPONENT_SCHEMAS } from './openapi.js';

/**
 * Phase 0.2's exit is that every value type is expressed and unit-tested, and that
 * OpenAPI generates. There are no routes yet, so what is provable here is the half that
 * routes will consume: the component schemas exist, are valid draft 2020-12, and carry
 * the same constraints the runtime validators enforce.
 */
describe('OpenAPI component schemas', () => {
  const schemas = componentSchemas();

  it('emits one schema per registered component', () => {
    expect(Object.keys(schemas).sort()).toEqual(Object.keys(COMPONENT_SCHEMAS).sort());
  });

  it('emits the 2020-12 dialect, and only that dialect', () => {
    // This is load-bearing: OpenAPI 3.0 schemas are a modified draft-04 subset, so a
    // document that declares 3.0 and embeds these is invalid. apps/api sets 3.1 for
    // exactly this reason, and strips $schema when embedding.
    for (const [name, schema] of Object.entries(schemas)) {
      const s = schema as Record<string, unknown>;
      expect(typeof s, name).toBe('object');
      expect(String(s.$schema), name).toContain('2020-12');
      // draft-04 spellings Zod must not emit, and which a 3.1 consumer would misread.
      expect(s, name).not.toHaveProperty('definitions');
      expect(s, name).not.toHaveProperty('id');
    }
  });

  it('documents Decimal as a constrained string, never a number', () => {
    // If this ever emits {"type":"number"}, every generated client rounds money.
    const decimal = schemas.Decimal as { type: string; pattern: string };
    expect(decimal.type).toBe('string');
    expect(decimal.pattern).toBeDefined();
    expect(new RegExp(decimal.pattern).test('114.00')).toBe(true);
    expect(new RegExp(decimal.pattern).test('1e5')).toBe(false);
  });

  it('documents Money as both halves, required, and nothing else', () => {
    const money = schemas.Money as {
      required: string[];
      additionalProperties: boolean;
      properties: Record<string, unknown>;
    };
    expect(money.required.sort()).toEqual(['amount', 'currency_code']);
    expect(money.additionalProperties).toBe(false);
  });

  it('documents Version as a string, so a generated client cannot round it', () => {
    expect((schemas.Version as { type: string }).type).toBe('string');
  });

  it('closes the ResourceKind enum', () => {
    const kind = schemas.ResourceKind as { enum: string[] };
    expect(kind.enum).toContain('dossier');
    expect(kind.enum).not.toContain('invoice_draft');
  });

  it('documents TypedValue as a discriminated union of nine members', () => {
    const typed = schemas.TypedValue as { anyOf?: unknown[]; oneOf?: unknown[] };
    expect((typed.anyOf ?? typed.oneOf)!.length).toBe(9);
  });

  it('is serializable, which is what an OpenAPI document needs it to be', () => {
    expect(() => JSON.stringify(schemas)).not.toThrow();
    expect(JSON.stringify(schemas).length).toBeGreaterThan(500);
  });
});
