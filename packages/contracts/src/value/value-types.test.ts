import { describe, expect, it } from 'vitest';
import { decimalSchema, decimal, scaleOf, signOf, isDecimal } from './decimal.js';
import { moneySchema, sameCurrency } from './money.js';
import { quantitySchema, transactionQuantitySchema, sameUnit } from './quantity.js';
import { resourceRefSchema, RESOURCE_KINDS, sameResource } from './resource-ref.js';
import { evidenceRefSchema } from './evidence-ref.js';
import { canonicalize, CanonicalizationError } from './canonical.js';
import { snapshotRefSchema, contentDigest, matchesSnapshot } from './snapshot-ref.js';
import { typedValueSchema, TYPED_VALUE_KINDS, comparable } from './typed-value.js';

const UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const UUID_2 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('Decimal', () => {
  it.each(['0', '1', '114', '114.00', '-12.5', '0.000001', '12345678901234567890.123456789'])(
    'accepts %s',
    (v) => expect(isDecimal(v)).toBe(true),
  );

  it.each([
    ['a float', 1.5],
    ['scientific notation', '1e5'],
    ['scientific notation, capital', '1E5'],
    ['a leading plus', '+1'],
    ['a leading zero', '01'],
    ['a bare point', '.5'],
    ['a trailing point', '5.'],
    ['a thousands separator', '1,000'],
    ['whitespace', ' 1 '],
    ['empty', ''],
    ['NaN', 'NaN'],
    ['Infinity', 'Infinity'],
    ['negative zero', '-0'],
    ['negative zero with scale', '-0.00'],
  ])('rejects %s', (_name, v) => expect(isDecimal(v)).toBe(false));

  it('preserves scale, because scale is information', () => {
    // 114.00 is a price quoted to the centime. 114 is not the same statement.
    expect(scaleOf(decimal('114.00'))).toBe(2);
    expect(scaleOf(decimal('114'))).toBe(0);
    expect(decimalSchema.parse('114.00')).toBe('114.00');
  });

  it('reports sign without arithmetic', () => {
    expect(signOf(decimal('0'))).toBe(0);
    expect(signOf(decimal('0.000'))).toBe(0);
    expect(signOf(decimal('0.001'))).toBe(1);
    expect(signOf(decimal('-0.001'))).toBe(-1);
  });

  it('survives a value no JavaScript number could hold', () => {
    const exact = '9007199254740993.000000000000001';
    expect(decimalSchema.parse(exact)).toBe(exact);
    expect(String(Number(exact))).not.toBe(exact); // the whole reason for the string
  });
});

describe('Money', () => {
  it('requires both halves and rejects anything else', () => {
    expect(moneySchema.safeParse({ amount: '114.00', currency_code: 'MAD' }).success).toBe(true);
    expect(moneySchema.safeParse({ amount: '114.00' }).success).toBe(false);
    expect(moneySchema.safeParse({ amount: 114, currency_code: 'MAD' }).success).toBe(false);
    expect(moneySchema.safeParse({ amount: '114.00', currency_code: 'mad' }).success).toBe(false);
    expect(
      moneySchema.safeParse({ amount: '114.00', currency_code: 'MAD', vat: '20' }).success,
    ).toBe(false);
  });

  it('knows when two amounts are not comparable', () => {
    const mad = { amount: '100.00', currency_code: 'MAD' };
    expect(sameCurrency(mad, { amount: '1.00', currency_code: 'MAD' })).toBe(true);
    expect(sameCurrency(mad, { amount: '100.00', currency_code: 'EUR' })).toBe(false);
  });
});

describe('Quantity', () => {
  it('allows zero, because a derived balance reaches zero', () => {
    expect(quantitySchema.safeParse({ value: '0', unit_id: UUID }).success).toBe(true);
  });

  it('refuses zero and negatives on a transaction line', () => {
    expect(transactionQuantitySchema.safeParse({ value: '0', unit_id: UUID }).success).toBe(false);
    expect(transactionQuantitySchema.safeParse({ value: '-1', unit_id: UUID }).success).toBe(false);
    expect(transactionQuantitySchema.safeParse({ value: '0.001', unit_id: UUID }).success).toBe(
      true,
    );
  });

  it('requires a unit id, not a unit code', () => {
    expect(quantitySchema.safeParse({ value: '1', unit_id: 'KG' }).success).toBe(false);
  });

  it('knows when two quantities are not comparable', () => {
    expect(sameUnit({ value: '1', unit_id: UUID }, { value: '1', unit_id: UUID_2 })).toBe(false);
  });
});

describe('ResourceRef', () => {
  it('closes the kind list', () => {
    expect(resourceRefSchema.safeParse({ kind: 'dossier', id: UUID }).success).toBe(true);
    // An arbitrary kind is the dangling polymorphic reference 00-shared-contract.md:51
    // asks us to prevent.
    expect(resourceRefSchema.safeParse({ kind: 'invoice_draft', id: UUID }).success).toBe(false);
  });

  it('covers the cross-module relation spine', () => {
    for (const kind of ['counterparty', 'dossier', 'ledger_transaction', 'approval_decision']) {
      expect(RESOURCE_KINDS).toContain(kind);
    }
  });

  it('distinguishes same id, different kind', () => {
    expect(sameResource({ kind: 'dossier', id: UUID }, { kind: 'blocker', id: UUID })).toBe(false);
  });
});

describe('EvidenceRef', () => {
  it('accepts a bare document version', () => {
    expect(evidenceRefSchema.safeParse({ document_version_id: UUID }).success).toBe(true);
  });

  it('rejects a locator that locates nothing', () => {
    // An empty locator is the fabricated position 00-shared-contract.md:52 forbids.
    expect(evidenceRefSchema.safeParse({ document_version_id: UUID, locator: {} }).success).toBe(
      false,
    );
  });

  it('accepts any one locator field', () => {
    expect(
      evidenceRefSchema.safeParse({
        document_version_id: UUID,
        locator: { page_label: 'Annexe A' },
      }).success,
    ).toBe(true);
  });
});

describe('canonical serializer', () => {
  it('sorts keys, so insertion order cannot change the digest', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalize({ a: 2, b: 1 })).toBe(canonicalize({ b: 1, a: 2 }));
  });

  it('sorts nested keys too', () => {
    expect(canonicalize({ z: { d: 1, c: 2 }, a: 3 })).toBe('{"a":3,"z":{"c":2,"d":1}}');
  });

  it('never reorders an array, because order is content', () => {
    // Allocation lines and BOM components mean different things in a different order.
    expect(canonicalize(['b', 'a'])).toBe('["b","a"]');
  });

  it('preserves Decimal strings exactly', () => {
    expect(canonicalize({ amount: '114.00' })).toBe('{"amount":"114.00"}');
    expect(canonicalize({ amount: '0.000000000000000001' })).toContain('0.000000000000000001');
  });

  it('refuses undefined instead of silently omitting it', () => {
    // JSON.stringify drops it. That is exactly "omit a required field".
    expect(JSON.stringify({ a: 1, b: undefined })).toBe('{"a":1}');
    expect(() => canonicalize({ a: 1, b: undefined })).toThrow(CanonicalizationError);
  });

  it('keeps an explicit null', () => {
    expect(canonicalize({ a: null })).toBe('{"a":null}');
  });

  it('refuses a non-integer number', () => {
    expect(() => canonicalize({ amount: 114.5 })).toThrow(CanonicalizationError);
    expect(() => canonicalize({ n: NaN })).toThrow(CanonicalizationError);
    expect(() => canonicalize({ n: Infinity })).toThrow(CanonicalizationError);
    expect(() => canonicalize({ n: 2 ** 53 })).toThrow(CanonicalizationError);
  });

  it('allows a safe integer, for counts and ordinals', () => {
    expect(canonicalize({ ordinal: 3 })).toBe('{"ordinal":3}');
  });

  it('renders bigint as a string, matching the API boundary', () => {
    expect(canonicalize({ version: 9007199254740993n })).toBe('{"version":"9007199254740993"}');
  });

  it('refuses a Date, so the digest records what was sent', () => {
    expect(() => canonicalize({ at: new Date(0) })).toThrow(CanonicalizationError);
  });

  it('names the path of the offending value', () => {
    try {
      canonicalize({ lines: [{ qty: 1.5 }] });
      throw new Error('should have thrown');
    } catch (error) {
      expect((error as CanonicalizationError).path).toBe('lines[0].qty');
    }
  });

  it('escapes control characters and quotes', () => {
    expect(canonicalize({ a: 'x"y\\z\n' })).toBe('{"a":"x\\"y\\\\z\\n"}');
    expect(canonicalize({ a: '\u0001' })).toBe('{"a":"\\u0001"}');
  });
});

describe('SnapshotRef', () => {
  const payload = { amount: '114.00', currency_code: 'MAD', lines: [1, 2] };

  it('digests the canonical form, so key order does not matter', () => {
    const reordered = { lines: [1, 2], currency_code: 'MAD', amount: '114.00' };
    expect(contentDigest(payload)).toBe(contentDigest(reordered));
  });

  it('changes when any value changes', () => {
    expect(contentDigest(payload)).not.toBe(contentDigest({ ...payload, amount: '114.01' }));
    // Scale is content: 114.00 and 114.0 are different statements about precision.
    expect(contentDigest({ a: '114.00' })).not.toBe(contentDigest({ a: '114.0' }));
  });

  it('is algorithm-prefixed, because these values outlive the code that wrote them', () => {
    expect(contentDigest(payload)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('validates the full ref', () => {
    const ref = {
      resource: { kind: 'cost_item', id: UUID },
      version: '7',
      content_digest: contentDigest(payload),
    };
    expect(snapshotRefSchema.safeParse(ref).success).toBe(true);
    expect(matchesSnapshot(snapshotRefSchema.parse(ref), payload)).toBe(true);
    expect(matchesSnapshot(snapshotRefSchema.parse(ref), { ...payload, amount: '999' })).toBe(
      false,
    );
  });

  it('takes version as a string, so a large version cannot round', () => {
    const base = { resource: { kind: 'dossier', id: UUID }, content_digest: contentDigest({}) };
    expect(snapshotRefSchema.safeParse({ ...base, version: 7 }).success).toBe(false);
    expect(snapshotRefSchema.safeParse({ ...base, version: '9007199254740993' }).success).toBe(
      true,
    );
  });
});

describe('TypedValue', () => {
  it('covers the nine kinds of 20-data-api-contract-details.md:22', () => {
    expect(TYPED_VALUE_KINDS).toHaveLength(9);
  });

  it('does not let a Decimal silently become Money', () => {
    expect(typedValueSchema.safeParse({ type: 'decimal', value: '114.00' }).success).toBe(true);
    // A decimal carrying a Money object, or money carrying a bare decimal, are both
    // rejected — the discriminant makes the promotion impossible, not merely discouraged.
    expect(
      typedValueSchema.safeParse({
        type: 'decimal',
        value: { amount: '114.00', currency_code: 'MAD' },
      }).success,
    ).toBe(false);
    expect(typedValueSchema.safeParse({ type: 'money', value: '114.00' }).success).toBe(false);
  });

  it('takes a literal null, not an omitted key', () => {
    expect(typedValueSchema.safeParse({ type: 'null', value: null }).success).toBe(true);
    expect(typedValueSchema.safeParse({ type: 'null' }).success).toBe(false);
  });

  it('keeps date and instant apart', () => {
    expect(typedValueSchema.safeParse({ type: 'date', value: '2026-09-19' }).success).toBe(true);
    expect(
      typedValueSchema.safeParse({ type: 'date', value: '2026-09-19T00:00:00Z' }).success,
    ).toBe(false);
    expect(
      typedValueSchema.safeParse({ type: 'instant', value: '2026-09-19T12:00:00Z' }).success,
    ).toBe(true);
  });

  it('refuses to compare across kinds', () => {
    expect(comparable({ type: 'decimal', value: '1' }, { type: 'text', value: '1' } as never)).toBe(
      false,
    );
  });
});
