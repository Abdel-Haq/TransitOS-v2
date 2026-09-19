import * as z from 'zod';
import { decimalSchema, signOf } from './decimal.js';

/**
 * `00-shared-contract.md:50` — *"`{value: Decimal, unit_id: Unit.id}`. Precision and
 * conversion from reviewed unit rules. Zero is allowed for derived balances; required
 * transaction quantities must be positive."*
 *
 * The two halves of that last sentence are different rules, so they are different checks.
 * A `Quantity` on its own may be zero — a RED ledger balance legitimately reaches zero.
 * A quantity *on a transaction* may not, and `20-data-api-contract-details.md:9` requires
 * a CHECK constraint enforcing it in the database as well.
 *
 * `unit_id` is a UUID referencing a `Unit` row, not a code string. Two units may share a
 * label across reference versions; the id is what makes a quantity comparable. See
 * [ADR-003](../../../docs/01-DECISIONS.md#adr-003) for the one place a ledger column is
 * permitted to store `(value, unit_id)` separately, and why it never escapes the
 * repository layer.
 */
export const quantitySchema = z
  .object({
    value: decimalSchema,
    unit_id: z.uuid(),
  })
  .strict();

export type Quantity = z.infer<typeof quantitySchema>;

/** A quantity permitted on a transaction line: strictly positive. */
export const transactionQuantitySchema = quantitySchema.refine((q) => signOf(q.value) === 1, {
  message: 'A transaction quantity must be strictly positive (00-shared-contract.md:50).',
});

/** True when two quantities are in the same unit and therefore comparable at all. */
export const sameUnit = (a: Quantity, b: Quantity): boolean => a.unit_id === b.unit_id;
