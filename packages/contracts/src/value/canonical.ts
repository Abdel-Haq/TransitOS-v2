/**
 * The canonical serializer of `00-shared-contract.md:53`:
 *
 *   *"Canonical serializer defined in shared contracts; sort keys, preserve Decimal
 *   strings, omit no required field."*
 *
 * A snapshot digest is what proves an approval was given for *these* values and not some
 * later ones. If two serializations of the same data can differ, the digest stops proving
 * anything, and a consumed approval could be replayed against changed content. So this
 * function is deliberately strict and deliberately boring.
 *
 * `JSON.stringify` cannot be used. It orders keys by insertion, silently drops `undefined`
 * — the exact "omitted required field" failure the spec names — and renders numbers
 * through a float.
 */

export class CanonicalizationError extends Error {
  constructor(
    message: string,
    readonly path: string,
  ) {
    super(`${message} (at ${path || '<root>'})`);
    this.name = 'CanonicalizationError';
  }
}

const ESCAPES: Record<string, string> = {
  '"': '\\"',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

/**
 * Strings pass through byte for byte, with only the escapes JSON requires. A Decimal is a
 * string, so "preserve Decimal strings" is satisfied by never touching a string at all —
 * no trimming, no normalization, no number coercion.
 */
const writeString = (value: string): string => {
  let out = '"';
  for (const ch of value) {
    const escape = ESCAPES[ch];
    if (escape !== undefined) out += escape;
    else if (ch < ' ') out += `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;
    else out += ch;
  }
  return `${out}"`;
};

const write = (value: unknown, path: string): string => {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'string':
      return writeString(value);

    case 'boolean':
      return value ? 'true' : 'false';

    case 'bigint':
      // Version counters and sequence values. Rendered as a JSON string, matching how
      // they cross the API boundary — JSON has no bigint, and a number would round.
      return writeString(value.toString());

    case 'number':
      // A non-integer number in a snapshot is a Decimal that lost its exactness on the
      // way in. Refuse it here rather than digest a value that is already wrong.
      if (!Number.isSafeInteger(value)) {
        throw new CanonicalizationError(
          `Refusing to canonicalize the number ${String(value)}. Exact values are Decimal ` +
            `strings (00-shared-contract.md:48); only safe integers may appear as numbers.`,
          path,
        );
      }
      return value.toString();

    case 'undefined':
      // JSON.stringify drops these silently. That is precisely "omit a required field".
      throw new CanonicalizationError(
        'undefined cannot be canonicalized — use null for an absent optional value, and ' +
          'omit no required field (00-shared-contract.md:53)',
        path,
      );

    case 'object':
      break;

    default:
      throw new CanonicalizationError(`Cannot canonicalize a ${typeof value}`, path);
  }

  if (Array.isArray(value)) {
    // Array order is content, never sorted: allocation lines and BOM components mean
    // different things in a different order.
    return `[${value.map((item, i) => write(item, `${path}[${i}]`)).join(',')}]`;
  }

  if (value instanceof Date) {
    throw new CanonicalizationError(
      'A Date cannot be canonicalized — Instants cross the boundary as ISO-8601 strings, ' +
        'so that the snapshot records the value sent rather than this runtime’s rendering',
      path,
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  // Sorted by UTF-16 code unit, as RFC 8785 specifies, so the ordering does not depend on
  // the platform’s locale.
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${writeString(k)}:${write(v, path ? `${path}.${k}` : k)}`)
    .join(',')}}`;
};

/** Deterministic JSON. The same content always produces the same bytes. */
export const canonicalize = (value: unknown): string => write(value, '');
