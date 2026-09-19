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

export function databaseUrl(config: AppConfig = loadConfigOrThrow()): string {
  return resolveSecret(config.databaseUrlRef);
}

export function createPool(config: AppConfig = loadConfigOrThrow()): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl(config) });
}

export function createDb(pool: pg.Pool) {
  return drizzle(pool);
}
