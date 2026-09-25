import { createDb, createPool } from '../client.js';
import { seedPolicyRegister } from './policy.js';

/**
 * `pnpm db:seed`
 *
 * Run once per environment after migrations. Idempotent: re-running adds nothing and never
 * touches a value a reviewer has approved.
 */
const pool = createPool();
const db = createDb(pool);
try {
  const result = await seedPolicyRegister(db);
  console.log(
    `policy register seeded · ${result.inserted} inserted, ${result.skipped} already present · ` +
      `List A ${result.listA} approved, List B ${result.listB} unresolved`,
  );
} catch (error) {
  console.error('seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
