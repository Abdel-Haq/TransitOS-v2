import { sql } from 'drizzle-orm';
import { bigint, check, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { resourceRecord } from './kernel.js';

/**
 * The kernel probe — a real table for a resource kind this project coined, so Phase 0.3
 * can prove the controlled-command flow against real constraints, real row locks and real
 * indexes before any module exists.
 *
 * It follows every rule a business resource follows, which is the point: if the flow works
 * here it works for `cost_item`, and if a convention is awkward it is awkward now rather
 * than after six modules have copied it.
 *
 * `20-data-api-contract-details.md:11` — *"Each concrete protected business resource
 * shares its ID with ResourceRecord; create both in the same transaction."* Hence the FK
 * on the primary key rather than a separate `resource_id` column.
 */
export const kernelProbe = pgTable(
  'kernel_probe',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => resourceRecord.id),
    label: text('label').notNull(),
    /**
     * A `Decimal`: NUMERIC in the database, string in JavaScript. `mode: 'string'` keeps
     * drizzle from handing it to `Number`, and `client.ts` replaces the node-postgres
     * NUMERIC parser for the same reason. Non-negotiable #3.
     */
    amount: numeric('amount', { mode: 'string' }).notNull(),
    state: text('state').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    createdBy: uuid('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    version: bigint('version', { mode: 'bigint' })
      .notNull()
      .default(sql`1`),
  },
  (t) => [check('kernel_probe_state_check', sql`${t.state} IN ('draft', 'posted', 'reversed')`)],
);
