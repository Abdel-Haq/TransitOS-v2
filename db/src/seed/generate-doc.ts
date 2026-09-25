import { writeFileSync } from 'node:fs';
import {
  EXTERNAL_OWNERS,
  LIST_A,
  LIST_B,
  POLICY_OWNERS,
  POLICY_REGISTER,
  entriesForOwner,
  type RegisterEntry,
} from '@dc/contracts';

/**
 * Generates `docs/04-POLICY-REGISTER.md` from the register.
 *
 * Generated rather than written, for the reason the tokens are: a document and the data it
 * describes that are maintained separately will disagree, and this one is the list someone
 * takes to a regulatory reviewer.
 */
const fmt = (v: unknown): string =>
  typeof v === 'string' ? `\`${v}\`` : `\`${JSON.stringify(v)}\``;

const entryBlock = (e: RegisterEntry): string =>
  [
    `#### \`${e.key}\``,
    '',
    `**${e.label_fr}** · ${e.module} · \`${e.source}\``,
    '',
    e.question,
    '',
    `*Blocked while unresolved:* ${e.blocks}`,
    ...(e.value === undefined ? [] : ['', `*Engineering default:* ${fmt(e.value)}`]),
    '',
  ].join('\n');

const byOwner = EXTERNAL_OWNERS.map((owner) => {
  const entries = entriesForOwner(owner);
  const o = POLICY_OWNERS[owner];
  return [
    `### ${o.label_fr} — ${entries.length} question${entries.length > 1 ? 's' : ''}`,
    '',
    `\`${owner}\` · ${o.scope}`,
    `Source: \`${o.source}\``,
    '',
    ...entries.map(entryBlock),
  ].join('\n');
}).join('\n---\n\n');

const summary = EXTERNAL_OWNERS.map((owner) => {
  const entries = entriesForOwner(owner);
  const blocked = [...new Set(entries.map((e) => e.module))].sort().join(', ');
  return `| ${POLICY_OWNERS[owner].label_fr} | \`${owner}\` | ${entries.length} | ${blocked} |`;
}).join('\n');

const listA = LIST_A.map(
  (e) => `| \`${e.key}\` | ${e.label_fr} | ${fmt(e.value)} | \`${e.source}\` |`,
).join('\n');

const doc = `# Policy register

**Phase 0.9.** The ${POLICY_REGISTER.length} unknown business values the specifications
mark \`assumption to verify\`, classified on ownership per
[ADR-005](01-DECISIONS.md#adr-005).

> **Generated from \`packages/contracts/src/policy/register.ts\`.** Do not edit by hand —
> run \`pnpm --filter @dc/db build\` and regenerate. The register is the data; this document
> is a view of it, and \`pnpm db:seed\` writes the same data into \`policy_requirement\`.

| | |
|---|---|
| Total entries | **${POLICY_REGISTER.length}** |
| List A — engineering-decidable, already approved | **${LIST_A.length}** |
| List B — external, blocking | **${LIST_B.length}** |
| People to find | **${EXTERNAL_OWNERS.length}** |

Derived from the 49 \`assumption to verify\` markers in \`specs/\`, with compound markers
split into the discrete values behind them. Six markers define the convention rather than
naming a value — \`00-shared-contract.md:9\`, \`:123\`, \`:135\`, \`19-…:3\`, \`:36\` and
\`20-…:3\` — and produce no entry. \`19-…:133\` holds dates, staffing and budget out of
scope deliberately.

---

## What to do with this

**List A is done.** Fifteen values were decidable by the team, are recorded as approved
with \`source: engineering_default\`, and block nothing. They are listed at the end so a
reviewer can challenge any of them.

**List B is the ask.** Seventy questions across seven roles. Each one names what it blocks,
so a reviewer can see the cost of leaving it open rather than being handed a list of
schema fields.

Nothing here is a guess. An unresolved key returns \`POLICY_REQUIRED\` and the screen shows
\`À confirmer\`; it never falls back to a plausible number. That is the whole mechanism —
\`CLAUDE.md\` §Policy keys.

**Start now.** List B has the longest lead time in the project and nothing in Phase 3
activates without it. Finding the people is the work; the answers are usually quick once
the right person is in the room.

---

## Who is needed

| Role | Code | Questions | Modules blocked |
|---|---|---|---|
${summary}

---

## List B — the questions

${byOwner}

---

## List A — decided, approved, recorded

Recorded with \`source: engineering_default\` and the bootstrap system actor as approver.
No human approved these, and the register says so rather than borrowing a name.

Any of them can be superseded by a reviewer at any time: they are ordinary approved policy
versions, not constants.

| Key | Label | Value | Source |
|---|---|---|---|
${listA}
`;

writeFileSync(process.argv[2] ?? 'docs/04-POLICY-REGISTER.md', doc, 'utf8');
console.log(`docs/04-POLICY-REGISTER.md written · ${POLICY_REGISTER.length} entries`);
