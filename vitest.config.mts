import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['{apps,packages,db,tests}/**/*.test.ts'],
    // Integration tests talk to the real Postgres from infra/compose.yaml.
    // They are excluded unless DATABASE_URL is set, so `pnpm test` works on a
    // laptop with nothing running, and CI runs the full set.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      ...(process.env.DATABASE_URL ? [] : ['**/*.integration.test.ts']),
    ],
    environment: 'node',
    // Integration tests share one PostgreSQL and truncate the tables they use, so two
    // files running at once tear out each other's fixtures. Running files in sequence is
    // the honest fix: the alternative is a schema per worker, which buys a few seconds
    // and costs a layer of indirection in every failure you then have to debug.
    fileParallelism: false,
  },
});
