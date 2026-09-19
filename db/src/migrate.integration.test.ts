import { afterAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, createPool } from './client.js';

/**
 * Runs only when DATABASE_URL is set — see vitest.config.mts. On a laptop with nothing
 * running, `pnpm test` skips it; in CI the Postgres service container is up and
 * `pnpm db:migrate` has already run, so these assert what the migration actually did.
 */
const pool = createPool();
const db = createDb(pool);

afterAll(async () => {
  await pool.end();
});

describe('bootstrap migration', () => {
  it.each(['pgcrypto', 'btree_gist'])('installed the %s extension', async (name) => {
    const result = await db.execute(sql`SELECT 1 FROM pg_extension WHERE extname = ${name}`);
    expect(result.rows).toHaveLength(1);
  });

  it('recorded itself in the drizzle journal', async () => {
    const result = await db.execute(
      sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`,
    );
    expect(Number((result.rows[0] as { n: number }).n)).toBeGreaterThan(0);
  });

  it('gives btree_gist the uuid operator class CR03 needs', async () => {
    // docs/00-PLAN.md §Phase 2 plans an EXCLUDE constraint combining `=` on a uuid
    // column with `&&` on a tstzrange. Core PostgreSQL ships no GiST opclass for uuid,
    // so without btree_gist that DDL does not compile. Prove it here, once, rather
    // than discovering it inside a migration two phases from now.
    await db.execute(sql`
      CREATE TEMPORARY TABLE assignment_overlap_probe (
        resource_id uuid NOT NULL,
        period tstzrange NOT NULL,
        EXCLUDE USING gist (resource_id WITH =, period WITH &&)
      )
    `);
    await db.execute(sql`
      INSERT INTO assignment_overlap_probe VALUES
        ('00000000-0000-0000-0000-000000000001', tstzrange(now(), now() + interval '1 hour'))
    `);
    await expect(
      db.execute(sql`
        INSERT INTO assignment_overlap_probe VALUES
          ('00000000-0000-0000-0000-000000000001', tstzrange(now(), now() + interval '2 hours'))
      `),
    ).rejects.toThrow();
  });
});

describe('exact arithmetic survives the driver', () => {
  it('returns NUMERIC as a string, not a float', async () => {
    // CLAUDE.md non-negotiable #3. node-postgres parses NUMERIC into a JavaScript
    // number by default, which would silently round this value. client.ts replaces
    // the parser; this test is what stops anyone removing it.
    const result = await db.execute(sql`SELECT 12345678901234567890.123456789::numeric AS amount`);
    expect((result.rows[0] as { amount: unknown }).amount).toBe('12345678901234567890.123456789');
  });

  it('returns BIGINT as a string, not a float', async () => {
    const result = await db.execute(sql`SELECT 9007199254740993::bigint AS version`);
    expect((result.rows[0] as { version: unknown }).version).toBe('9007199254740993');
  });
});
