import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb, createPool } from './client.js';

/**
 * The migration job of `19-security-operations-delivery.md:65`:
 *
 *   *"Run migration job separately from API startup. Do not start multiple competing
 *   automatic schema migrations."*
 *
 * So this is a process, not a hook. The API never calls it. Two deployments rolling at
 * once take the same advisory lock, and the second waits rather than racing the first
 * through the same DDL.
 */

/** Arbitrary but fixed. Any process migrating this database must use this same key. */
const MIGRATION_LOCK_KEY = 4_014_071_970;

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

async function main(): Promise<void> {
  const pool = createPool();
  const db = createDb(pool);
  try {
    // Session-scoped, so it releases if this process dies mid-migration rather than
    // wedging every future deployment.
    await db.execute(sql`SELECT pg_advisory_lock(${MIGRATION_LOCK_KEY})`);
    try {
      await migrate(db, { migrationsFolder });
      console.log('migrations applied');
    } finally {
      await db.execute(sql`SELECT pg_advisory_unlock(${MIGRATION_LOCK_KEY})`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  // Never print the connection string; it carries the password.
  console.error('migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
