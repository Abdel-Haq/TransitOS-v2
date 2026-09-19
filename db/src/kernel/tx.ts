import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';

/**
 * A handle inside an open transaction.
 *
 * Every kernel operation takes one of these rather than a database. It is not a style
 * preference: `00-shared-contract.md:92` requires the whole controlled-command flow —
 * effect, consumed approval, audit and outbox — to commit together, and a function that
 * accepts a `Database` can be called outside a transaction without anything complaining.
 * Accepting only a transaction makes that mistake impossible to express.
 */
export type KernelTransaction = PgTransaction<
  NodePgQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

export type KernelDatabase = NodePgDatabase<Record<string, never>>;
