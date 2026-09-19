import { defineConfig } from 'drizzle-kit';

/**
 * Schema lands in Phase 0.3 (the shared kernel). Until then the only migration is
 * the extension bootstrap, authored as a custom migration.
 *
 * `dbCredentials` is deliberately absent: drizzle-kit's push/pull commands would
 * need a live connection string, and `19-security-operations-delivery.md:65` requires
 * the migration job to run separately from API startup — never a push from a laptop
 * against a deployed database. Generation is offline; application is `pnpm db:migrate`.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
});
