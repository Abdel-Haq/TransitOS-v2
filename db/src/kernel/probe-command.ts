import { eq } from 'drizzle-orm';
import { decimalSchema, type ResourceRef } from '@dc/contracts';
import { kernelProbe } from '../schema/probe.js';
import type { CommandHandler } from './execute.js';
import type { KernelTransaction } from './tx.js';

/**
 * The synthetic command Phase 0.3 proves the kernel with: posting a `kernel_probe`.
 *
 * It is deliberately the shape a real posting takes — an exact amount, a draft-to-posted
 * transition, an immutable result — so that what the kernel tests demonstrate is the flow
 * `invoice.issue` and `red.post` will use, not a simplified stand-in that would hide the
 * awkward parts.
 */
export interface PostProbeBody {
  readonly amount: string;
  readonly label: string;
}

export interface PostProbeInput {
  readonly amount: string;
  readonly label: string;
}

export interface PostProbeResult {
  readonly id: string;
  readonly state: string;
  readonly amount: string;
}

export const postProbeHandler: CommandHandler<PostProbeBody, PostProbeInput, PostProbeResult> = {
  eventType: 'kernel_probe.posted',

  validate(body) {
    // Exact arithmetic starts at the boundary: the amount is a Decimal string, and
    // anything a float could have produced is rejected here rather than rounded later.
    const amount = decimalSchema.parse(body.amount);
    if (typeof body.label !== 'string' || body.label.trim() === '') {
      throw new Error('label is required');
    }
    return { amount: amount as string, label: body.label.trim() };
  },

  async apply(tx: KernelTransaction, target: ResourceRef, input) {
    const rows = await tx
      .update(kernelProbe)
      .set({ state: 'posted', amount: input.amount, label: input.label })
      .where(eq(kernelProbe.id, target.id))
      .returning();

    const row = rows[0];
    if (row === undefined) throw new Error('probe row missing for a locked resource record');

    return {
      after: { state: row.state, amount: row.amount, label: row.label },
      changedPaths: ['state', 'amount', 'label'],
      result: { id: row.id, state: row.state, amount: row.amount },
    };
  },
};
