import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { contentDigest, canonicalize } from '@dc/contracts';
import { createDb, createPool } from '../client.js';
import {
  approvalDecision,
  auditEvent,
  idempotencyRecord,
  job,
  outboxEvent,
  resourceRecord,
  reviewRequest,
} from '../schema/kernel.js';
import { kernelProbe } from '../schema/probe.js';
import { ALL_MODULES } from '@dc/config';
import {
  userAccount,
  roleAssignment,
  resourceAssignment,
  resourceGrant,
} from '../schema/identity.js';
import { executeCommand } from './execute.js';
import { postProbeHandler, type PostProbeBody } from './probe-command.js';
import { claimJobs, completeJob, enqueueJob, failJob } from './jobs.js';
import type { CommandRequest, Principal } from './types.js';

const pool = createPool();
const db = createDb(pool);
afterAll(async () => {
  await pool.end();
});

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';

const operator: Principal = { user_id: ALICE };
/** A real account with no role assignment — the server decides, not the request. */
const NOBODY = '99999999-9999-4999-8999-999999999999';

/** A probe resource plus its ResourceRecord, created in one transaction as 20-…:11 requires. */
const seedProbe = async (amount = '100.00') => {
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx
      .insert(resourceRecord)
      .values({ id, kind: 'kernel_probe', classification: 'internal', createdBy: ALICE });
    await tx.insert(kernelProbe).values({ id, label: 'probe', amount, createdBy: ALICE });
  });
  return id;
};

const body: PostProbeBody = { amount: '114.00', label: 'Frais de dossier' };
/** The digest the approval binds to — the canonical form of the validated input. */
const approvedDigest = contentDigest(
  JSON.parse(canonicalize(postProbeHandler.validate(body))) as unknown,
);

const seedApproval = async (
  targetId: string,
  opts: { submittedBy?: string; reviewer?: string; digest?: string } = {},
) => {
  const digest = opts.digest ?? approvedDigest;
  const [review] = await db
    .insert(reviewRequest)
    .values({
      targetKind: 'kernel_probe',
      targetId,
      actionCode: 'invoice.issue',
      payloadSnapshot: body as object,
      payloadDigest: digest,
      reviewerCapability: 'invoice.issue',
      submittedBy: opts.submittedBy ?? ALICE,
      state: 'decided',
      createdBy: ALICE,
    })
    .returning();
  await db.insert(approvalDecision).values({
    requestId: review!.id,
    decision: 'approved',
    reviewerId: opts.reviewer ?? BOB,
    reviewerCapability: 'invoice.issue',
    boundDigest: digest,
    createdBy: opts.reviewer ?? BOB,
  });
  return review!.id;
};

const request = (targetId: string, over: Partial<CommandRequest<PostProbeBody>> = {}) =>
  ({
    principal: operator,
    action: 'invoice.issue' as const,
    target: { kind: 'kernel_probe' as const, id: targetId },
    ifMatch: '1',
    idempotency: { method: 'POST', path: '/probes/post', key: randomUUID() },
    body,
    requestId: randomUUID(),
    ...over,
  }) satisfies CommandRequest<PostProbeBody>;

const ENABLED = new Set(ALL_MODULES);
const NOW = '2026-09-19T12:00:00Z';
/** Before NOW, so a fixture's validity window never depends on the day the suite runs. */
const ROLES_VALID_FROM = '2026-01-01T00:00:00Z';

const run = (
  req: CommandRequest<PostProbeBody>,
  mode: 'independent_reviewer' | 'dev_single_approver' = 'independent_reviewer',
) => db.transaction((tx) => executeCommand(tx, req, postProbeHandler, mode, ENABLED, NOW));

beforeEach(async () => {
  await db.execute(sql`TRUNCATE ${auditEvent}, ${outboxEvent}, ${idempotencyRecord} CASCADE`);
  await db.execute(sql`TRUNCATE ${approvalDecision}, ${reviewRequest} CASCADE`);
  await db.execute(sql`TRUNCATE ${kernelProbe}, ${resourceRecord} CASCADE`);
  await db.execute(sql`TRUNCATE ${job} CASCADE`);
  await db.execute(
    sql`TRUNCATE ${resourceGrant}, ${resourceAssignment}, ${roleAssignment}, ${userAccount} CASCADE`,
  );
  // Alice operates, Bob reviews. Both need to exist and hold the capability now that the
  // executor runs the real authorization engine rather than trusting the request.
  await db.insert(userAccount).values([
    { id: ALICE, subject: 'alice', displayName: 'Alice', audience: 'staff' },
    { id: BOB, subject: 'bob', displayName: 'Bob', audience: 'staff' },
    { id: NOBODY, subject: 'nobody', displayName: 'Nobody', audience: 'staff' },
  ]);
  // `valid_from` is set explicitly, never left to the column default. The fixtures once
  // relied on `defaultNow()` while the tests pinned NOW to a fixed instant; they passed
  // for six days and then every seeded role started in the future. A test that depends on
  // the wall clock is a test that fails on a date nobody chose.
  await db.insert(roleAssignment).values([
    {
      userId: ALICE,
      roleCode: 'finance_reviewer',
      scope: 'all_operational_records',
      validFrom: ROLES_VALID_FROM,
      createdBy: ALICE,
    },
    {
      userId: BOB,
      roleCode: 'finance_reviewer',
      scope: 'all_operational_records',
      validFrom: ROLES_VALID_FROM,
      createdBy: ALICE,
    },
  ]);
});

describe('the controlled-command flow, end to end', () => {
  it('posts a probe and writes every record in one transaction', async () => {
    const id = await seedProbe();
    await seedApproval(id);

    const outcome = await run(request(id));
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.state).toBe('posted');
    expect(outcome.result.amount).toBe('114.00');
    expect(outcome.replayed).toBe(false);

    // Effect, version bump, consumed approval, audit and outbox — all present.
    const [probe] = await db.select().from(kernelProbe).where(eq(kernelProbe.id, id));
    expect(probe!.state).toBe('posted');

    const [record] = await db.select().from(resourceRecord).where(eq(resourceRecord.id, id));
    expect(record!.version).toBe(2n);

    const decisions = await db.select().from(approvalDecision);
    expect(decisions[0]!.consumedEffectId).not.toBeNull();

    const audits = await db.select().from(auditEvent);
    expect(audits).toHaveLength(1);
    expect(audits[0]!.changedPaths).toEqual(['state', 'amount', 'label']);
    expect(audits[0]!.afterDigest).toMatch(/^sha256:/);

    const outbox = await db.select().from(outboxEvent);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]!.eventType).toBe('kernel_probe.posted');
    expect(outbox[0]!.processedAt).toBeNull();
  });

  it('preserves the exact decimal through the database and back', async () => {
    // Non-negotiable #3, proven against NUMERIC rather than asserted in a unit test.
    const id = await seedProbe();
    const exact = '12345678901234567890.123456789';
    const exactBody = { amount: exact, label: 'exact' };
    const digest = contentDigest(
      JSON.parse(canonicalize(postProbeHandler.validate(exactBody))) as unknown,
    );
    await seedApproval(id, { digest });

    const outcome = await run(request(id, { body: exactBody }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.amount).toBe(exact);
  });
});

describe('a consumed approval cannot authorize another effect', () => {
  it('refuses the second command on the same approval', async () => {
    // 00-shared-contract.md:92. The single-use latch is the reason an approval is
    // evidence rather than a permission.
    const id = await seedProbe();
    await seedApproval(id);

    expect((await run(request(id))).ok).toBe(true);
    const second = await run(request(id, { ifMatch: '2' }));
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.code).toBe('APPROVAL_REQUIRED');
  });
});

describe('If-Match', () => {
  it('rejects a stale version with 412', async () => {
    const id = await seedProbe();
    await seedApproval(id);
    const outcome = await run(request(id, { ifMatch: '99' }));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe('VERSION_CONFLICT');
    expect(outcome.status).toBe(412);
  });

  it('leaves no audit, outbox or effect behind when it fails', async () => {
    const id = await seedProbe();
    await seedApproval(id);
    await run(request(id, { ifMatch: '99' }));
    expect(await db.select().from(auditEvent)).toHaveLength(0);
    expect(await db.select().from(outboxEvent)).toHaveLength(0);
    const [probe] = await db.select().from(kernelProbe).where(eq(kernelProbe.id, id));
    expect(probe!.state).toBe('draft');
  });
});

describe('approval binding', () => {
  it('refuses when the payload changed since the approval', async () => {
    // CLAUDE.md #5 and 00-shared-contract.md:90 — a posted transaction never silently
    // absorbs a change nobody approved.
    const id = await seedProbe();
    await seedApproval(id, { digest: contentDigest({ amount: '1.00', label: 'other' }) });
    const outcome = await run(request(id));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe('APPROVAL_STALE');
  });

  it('refuses a self-approval under independent_reviewer', async () => {
    const id = await seedProbe();
    await seedApproval(id, { submittedBy: ALICE, reviewer: ALICE });
    const outcome = await run(request(id));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe('NO_ELIGIBLE_APPROVER');
  });

  it('allows it under dev_single_approver and stamps the decision', async () => {
    const id = await seedProbe();
    await seedApproval(id, { submittedBy: ALICE, reviewer: ALICE });
    const outcome = await run(request(id), 'dev_single_approver');
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true);
    const [decision] = await db.select().from(approvalDecision);
    expect(decision!.selfApproved).toBe(true);
    expect(decision!.consumedEffectId).not.toBeNull();
  });

  it('refuses with no approval at all', async () => {
    const id = await seedProbe();
    const outcome = await run(request(id));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe('APPROVAL_REQUIRED');
  });
});

describe('authorization', () => {
  it('refuses a principal whose account holds no role granting the capability', async () => {
    // The request cannot nominate its own capabilities any more: the executor loads
    // roles and grants from the database. This account exists and holds nothing.
    const id = await seedProbe();
    await seedApproval(id);
    const outcome = await run(request(id, { principal: { user_id: NOBODY } }));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe('FORBIDDEN');
    expect(outcome.status).toBe(403);
  });

  it('refuses a target whose kind does not match the record', async () => {
    const id = await seedProbe();
    await seedApproval(id);
    const outcome = await run(request(id, { target: { kind: 'dossier', id } }));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe('NOT_FOUND');
  });
});

describe('idempotency', () => {
  it('replays the original result for the same key and body', async () => {
    const id = await seedProbe();
    await seedApproval(id);
    const key = { method: 'POST', path: '/probes/post', key: randomUUID() };

    const first = await run(request(id, { idempotency: key }));
    expect(first.ok).toBe(true);

    const second = await run(request(id, { idempotency: key, ifMatch: '2' }));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.replayed).toBe(true);
    expect(second.result).toEqual(first.ok ? first.result : undefined);

    // A replay is not a second effect.
    expect(await db.select().from(auditEvent)).toHaveLength(1);
    expect(await db.select().from(outboxEvent)).toHaveLength(1);
  });

  it('returns 409 for the same key with a different body', async () => {
    const id = await seedProbe();
    await seedApproval(id);
    const key = { method: 'POST', path: '/probes/post', key: randomUUID() };
    await run(request(id, { idempotency: key }));

    const conflict = await run(
      request(id, { idempotency: key, ifMatch: '2', body: { amount: '1.00', label: 'other' } }),
    );
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(conflict.status).toBe(409);
  });

  it('leaves no claim behind when the effect rolls back', async () => {
    // 20-…:15 — "Failed effects that roll back cannot leave a successful response." The
    // claim is written in the same transaction, so a failure takes it with it and the
    // retry is a fresh attempt rather than a permanently poisoned key.
    const id = await seedProbe();
    await seedApproval(id);
    const key = { method: 'POST', path: '/probes/post', key: randomUUID() };

    await db
      .transaction(async (tx) => {
        await executeCommand(
          tx,
          request(id, { idempotency: key }),
          postProbeHandler,
          'independent_reviewer',
          ENABLED,
          NOW,
        );
        throw new Error('simulated failure after the effect');
      })
      .catch(() => undefined);

    expect(await db.select().from(idempotencyRecord)).toHaveLength(0);
    const retry = await run(request(id, { idempotency: key }));
    expect(retry.ok).toBe(true);
  });
});

describe('concurrency', () => {
  it('serializes two commands racing the same resource, and only one wins', async () => {
    // This is what `lock rows in stable ID order` buys. Both transactions read version 1
    // and both hold a valid approval; the row lock forces them into sequence, and the
    // loser's If-Match recheck — taken *after* the lock — sees version 2 and fails.
    // Without the lock, both would apply and one effect would vanish.
    const id = await seedProbe();
    await seedApproval(id);

    const [a, b] = await Promise.all([
      run(request(id)).catch((e: unknown) => ({ ok: false, code: 'THREW', error: e }) as never),
      run(request(id)).catch((e: unknown) => ({ ok: false, code: 'THREW', error: e }) as never),
    ]);

    const succeeded = [a, b].filter((r) => r.ok);
    expect(succeeded).toHaveLength(1);

    // Exactly one effect, one audit row, one outbox row — not two of anything.
    const [record] = await db.select().from(resourceRecord).where(eq(resourceRecord.id, id));
    expect(record!.version).toBe(2n);
    expect(await db.select().from(auditEvent)).toHaveLength(1);
    expect(await db.select().from(outboxEvent)).toHaveLength(1);

    const decisions = await db.select().from(approvalDecision);
    expect(decisions.filter((d) => d.consumedEffectId !== null)).toHaveLength(1);
  });

  it('does not let two commands consume the same approval', async () => {
    // The stricter version of the same race: the loser retries with the correct version,
    // so If-Match cannot save it. The consumed latch must.
    const id = await seedProbe();
    await seedApproval(id);

    expect((await run(request(id))).ok).toBe(true);
    const retry = await run(request(id, { ifMatch: '2' }));
    expect(retry.ok).toBe(false);
    if (retry.ok) return;
    expect(retry.code).toBe('APPROVAL_REQUIRED');
    expect(await db.select().from(auditEvent)).toHaveLength(1);
  });
});

describe('the job queue', () => {
  it('deduplicates on enqueue rather than creating a second job', async () => {
    await db.transaction(async (tx) => {
      await enqueueJob(tx, {
        handlerType: 'probe',
        payloadSchema: 'v1',
        payload: {},
        dedupeKey: 'k',
      });
      await enqueueJob(tx, {
        handlerType: 'probe',
        payloadSchema: 'v1',
        payload: {},
        dedupeKey: 'k',
      });
    });
    const claimed = await claimJobs(db, 'worker-1', 10, 60);
    expect(claimed).toHaveLength(1);
  });

  it('returns the handler type and payload, not raw snake_case columns', async () => {
    // db.execute returns the driver's rows with database column names; only the query
    // builder maps to camelCase. Casting instead of mapping compiles fine and hands the
    // worker `undefined` for handlerType — which it did, until a real worker run printed
    // `no handler for "undefined"`.
    await db.transaction((tx) =>
      enqueueJob(tx, {
        handlerType: 'probe.handler',
        payloadSchema: 'probe.v1',
        payload: { amount: '1.00' },
        dedupeKey: 'shape',
      }),
    );
    const [claimed] = await claimJobs(db, 'worker-1', 1, 60);
    expect(claimed!.handlerType).toBe('probe.handler');
    expect(claimed!.payloadSchema).toBe('probe.v1');
    expect(claimed!.dedupeKey).toBe('shape');
    expect(claimed!.payload).toEqual({ amount: '1.00' });
    expect(claimed!.attempts).toBe(1);
  });

  it('does not hand the same job to two workers', async () => {
    await db.transaction(async (tx) => {
      for (const k of ['a', 'b']) {
        await enqueueJob(tx, {
          handlerType: 'probe',
          payloadSchema: 'v1',
          payload: {},
          dedupeKey: k,
        });
      }
    });
    const [first, second] = await Promise.all([
      claimJobs(db, 'worker-1', 2, 60),
      claimJobs(db, 'worker-2', 2, 60),
    ]);
    const ids = [...first, ...second].map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns a job to the queue when its lease expires', async () => {
    // The lease is a deadline, not a flag: a worker that dies must not wedge the job.
    await db.transaction((tx) =>
      enqueueJob(tx, {
        handlerType: 'probe',
        payloadSchema: 'v1',
        payload: {},
        dedupeKey: 'lease',
      }),
    );
    const claimed = await claimJobs(db, 'worker-1', 1, -1); // already expired
    expect(claimed).toHaveLength(1);
    const reclaimed = await claimJobs(db, 'worker-2', 1, 60);
    expect(reclaimed).toHaveLength(1);
    expect(reclaimed[0]!.attempts).toBe(2);
  });

  it('backs off a failure and gives up at the configured limit', async () => {
    await db.transaction((tx) =>
      enqueueJob(tx, { handlerType: 'probe', payloadSchema: 'v1', payload: {}, dedupeKey: 'fail' }),
    );
    const [claimed] = await claimJobs(db, 'worker-1', 1, 60);
    await db.transaction((tx) => failJob(tx, claimed!.id, 'BOOM', 1, 3, 10));
    let [row] = await db
      .execute(
        sql`SELECT status, next_attempt_at > now() AS backed_off FROM job WHERE id = ${claimed!.id}`,
      )
      .then((r) => r.rows as { status: string; backed_off: boolean }[]);
    expect(row!.status).toBe('pending');
    expect(row!.backed_off).toBe(true);

    await db.transaction((tx) => failJob(tx, claimed!.id, 'BOOM', 3, 3, 10));
    [row] = await db
      .execute(sql`SELECT status FROM job WHERE id = ${claimed!.id}`)
      .then((r) => r.rows as { status: string; backed_off: boolean }[]);
    expect(row!.status).toBe('failed');
  });

  it('records a successful result', async () => {
    await db.transaction((tx) =>
      enqueueJob(tx, { handlerType: 'probe', payloadSchema: 'v1', payload: {}, dedupeKey: 'ok' }),
    );
    const [claimed] = await claimJobs(db, 'worker-1', 1, 60);
    await db.transaction((tx) => completeJob(tx, claimed!.id, { kind: 'kernel_probe', id: ALICE }));
    const rows = await db.execute(
      sql`SELECT status, lease_owner FROM job WHERE id = ${claimed!.id}`,
    );
    expect((rows.rows[0] as { status: string }).status).toBe('succeeded');
    expect((rows.rows[0] as { lease_owner: string | null }).lease_owner).toBeNull();
  });
});

describe('database invariants, not application ones', () => {
  it('refuses a resource record with an unregistered kind', async () => {
    await expect(
      db.execute(
        sql`INSERT INTO resource_record (id, kind, classification, created_by)
            VALUES (gen_random_uuid(), 'not_a_kind', 'internal', ${ALICE})`,
      ),
    ).rejects.toThrow();
  });

  it('refuses a probe row without its ResourceRecord', async () => {
    // 20-…:11 — every protected business resource shares its ID with ResourceRecord.
    await expect(
      db.execute(
        sql`INSERT INTO kernel_probe (id, label, amount, created_by)
            VALUES (gen_random_uuid(), 'orphan', 1, ${ALICE})`,
      ),
    ).rejects.toThrow();
  });

  it('refuses a resource that is its own parent', async () => {
    await expect(
      db.execute(
        sql`INSERT INTO resource_record (id, kind, parent_id, classification, created_by)
            SELECT g, 'dossier', g, 'internal', ${ALICE} FROM (SELECT gen_random_uuid() g) s`,
      ),
    ).rejects.toThrow();
  });

  it('refuses two decisions for the same request and capability', async () => {
    const id = await seedProbe();
    const reviewId = await seedApproval(id);
    await expect(
      db.insert(approvalDecision).values({
        requestId: reviewId,
        decision: 'approved',
        reviewerId: BOB,
        reviewerCapability: 'invoice.issue',
        boundDigest: approvedDigest,
        createdBy: BOB,
      }),
    ).rejects.toThrow();
  });

  it('refuses a job lease without an expiry', async () => {
    await expect(
      db.execute(
        sql`INSERT INTO job (handler_type, payload_schema, payload, dedupe_key, lease_owner)
            VALUES ('probe', 'v1', '{}', 'bad-lease', 'worker-1')`,
      ),
    ).rejects.toThrow();
  });

  it('refuses a malformed digest', async () => {
    const id = await seedProbe();
    await expect(
      db.insert(reviewRequest).values({
        targetKind: 'kernel_probe',
        targetId: id,
        actionCode: 'invoice.issue',
        payloadSnapshot: {},
        payloadDigest: 'not-a-digest',
        reviewerCapability: 'invoice.issue',
        submittedBy: ALICE,
        createdBy: ALICE,
      }),
    ).rejects.toThrow();
  });

  it('refuses a completed idempotency record with no status', async () => {
    await expect(
      db.execute(
        sql`INSERT INTO idempotency_record (principal_id, method, path, key, request_digest, state)
            VALUES (${ALICE}, 'POST', '/x', 'k', ${approvedDigest}, 'completed')`,
      ),
    ).rejects.toThrow();
  });
});
