import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { loadConfigOrThrow, resolveSecret, type AppConfig } from '@dc/config';

/**
 * `Decimal` is a string at the boundary and `NUMERIC` in Postgres — CLAUDE.md
 * non-negotiable #3. node-postgres parses NUMERIC (OID 1700) into a JavaScript number
 * by default, which silently destroys exactness the moment a total exceeds 2^53 or
 * carries more than fifteen significant digits. Every money and quantity column in
 * this product is NUMERIC, so the parser is replaced globally, here, once.
 *
 * BIGINT (OID 20) has the same problem and the same fix: version counters and
 * sequence values stay strings.
 */
const NUMERIC_OID = 1700;
const INT8_OID = 20;
pg.types.setTypeParser(NUMERIC_OID, (value: string) => value);
pg.types.setTypeParser(INT8_OID, (value: string) => value);

/**
 * JSON and JSONB are handed to drizzle as raw text, because otherwise they are parsed
 * **twice** and a Decimal stored as a JSON string silently becomes a float.
 *
 * node-postgres parses a jsonb column with `JSON.parse`, so the stored `"20"` arrives as
 * the JavaScript string `20`. Drizzle's jsonb mapper then sees a string and parses it
 * again — `JSON.parse('20')` — producing the number 20. For a policy value like a tax
 * rate that is merely wrong; for
 * `"12345678901234567890.123456789"` it came back as `12345678901234567000`, with the
 * exactness `CLAUDE.md` non-negotiable #3 exists to protect destroyed on the read path.
 *
 * Passing the text through leaves exactly one parse, in drizzle, where the column's type
 * is known. Object payloads were never affected — double-parsing an object is a no-op —
 * which is why this survived until a policy value happened to be a bare JSON string.
 */
const JSON_OID = 114;
const JSONB_OID = 3802;
pg.types.setTypeParser(JSON_OID, (value: string) => value);
pg.types.setTypeParser(JSONB_OID, (value: string) => value);

export function databaseUrl(config: AppConfig = loadConfigOrThrow()): string {
  return resolveSecret(config.databaseUrlRef);
}

export function createPool(config: AppConfig = loadConfigOrThrow()): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl(config) });
}

export function createDb(pool: pg.Pool) {
  return drizzle(pool);
}
