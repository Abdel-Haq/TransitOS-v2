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
  },
});
