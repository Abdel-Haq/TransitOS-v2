# Delivery ledger

Required by the specs (§19): `module_id, requirement_id, implementation_ref, test_ref,
status, blocking_policy_keys, reviewer, decision_ref`.

`status` ∈ `planned · in_progress · code_complete · acceptance_pending · released · blocked`

**`blocking_policy_keys` is the important column.** It keeps a policy dependency visible
instead of letting it be quietly replaced by a developer guess. A row with a value here
cannot reach `released`, no matter how complete the code is.

**Granularity is the slice, not the module.** A module is 4–8 vertical slices
(`CLAUDE.md` → *How to build a module*), and a policy key usually blocks **one** of them.
CR02 is the clearest case: cost capture and invoice drafting have no policy dependency and
can ship; only *issue* is blocked on numbering, tax and rounding. A module-level row would
hide that and stall finished work.

> **† Coined keys.** Only the `nfr.*` family appears verbatim in the specs
> (`19-security-operations-delivery.md:42–46`). Every key marked **†** is coined by this
> project and becomes authoritative when the register is seeded in **Phase 0.9**
> (`docs/04-POLICY-REGISTER.md`). They are namespaced `policy.<module>.<name>` so they can
> never be confused with the capability registry, which uses the bare `<noun>.<verb>` form
> (`privacy.export`, `license.manage`, `assistant.query`).

## Phase 0 — foundation kernel

| module | requirement | impl_ref | test_ref | status | blocking_policy_keys | reviewer | decision_ref |
|---|---|---|---|---|---|---|---|
| P0 | 0.1 monorepo, CI, compose stack | `infra/compose.yaml`, `.github/workflows/ci.yml` | `db/src/migrate.integration.test.ts` | code_complete | — | — | — |
| P0 | 0.1b startup config validation (§19 contract) | `packages/config` | `packages/config/src/config.test.ts` | code_complete | — | — | — |
| P0 | 0.2 value types (`Money`, `Quantity`, `Decimal`, refs) | `packages/contracts/src/value` | `value-types.test.ts` | code_complete | — | — | ADR-003 |
| P0 | 0.2b French error catalog | `packages/contracts/src/errors` | `errors.test.ts` | code_complete | — | — | — |
| P0 | 0.2c capability + action registry | `packages/contracts/src/registry` | `registry.test.ts` | code_complete | — | — | — |
| P0 | 0.3 shared kernel schema | `db/src/schema/kernel.ts`, `db/migrations/0001_shared_kernel.sql` | `kernel.integration.test.ts` | code_complete | — | — | — |
| P0 | 0.3b controlled-command flow end to end | `db/src/kernel/execute.ts` | `kernel.integration.test.ts` | code_complete | `policy.jobs.max_attempts`† | platform operator | — |
| P0 | 0.4 authorization engine | — | — | planned | — | — | — |
| P0 | 0.5a tokens, type scale, elevation | — | — | planned | — | — | ADR-006, ADR-007 |
| P0 | 0.5b primitives consumed by Phase 1–2 | — | — | planned | — | — | — |
| P0 | 0.5c categorical chart sequence | — | — | planned | — | unassigned — needs a CVD-simulation reviewer | — |
| P0 | 0.6 staff shell + review-state component | — | — | planned | — | — | ADR-001 |
| P0 | 0.7 approval policy modes | `packages/config/src/approval-mode.ts`, `packages/domain/src/approval` | `approval.test.ts` | code_complete | `policy.approval.small_org_subset`† | approval policy owner | ADR-002 |
| P0 | 0.8 minimal typed rule registry | — | — | planned | — | — | — |
| P0 | 0.9 policy register A/B classification | — | — | planned | — | — | ADR-005 |

## Phases 1–5 — modules

One row per sub-module. A row is split further into slices as it is started — replace the
row with its slices then, rather than tracking both. The policy keys below attach to the
slice named in the last column, not to the whole module.

| module | requirement | status | blocking_policy_keys | blocks which slice |
|---|---|---|---|---|
| FD01 | identity, sessions, grants | planned | `policy.identity.session_duration`†, `policy.identity.assurance`† | production login activation only |
| FD01 | mandates + verification | planned | — | — |
| FD02 | documents, versions, scan pipeline | planned | `policy.upload.limits`† | upload activation |
| FD02 | reviews, approvals, audit, jobs | planned | — | — |
| FD02 | retention, holds, purge | planned | `policy.privacy.retention`† | purge execution |
| FD03 | counterparties, offices, materials, units | planned | `policy.currency.scale`† | posting, not drafting |
| FD03 | import mappings + migration staging | planned | `policy.migration.source_formats`† | real-source import; synthetic fixtures unblocked |
| FD03 | search | planned | — | — |
| CR01 | dossiers, shipments, workflow steps | planned | — | — |
| CR01 | requirements + blockers | planned | `policy.regime.applicability`† | requirement applicability, not blocker workflow |
| CR01 | declarations + calculation | planned | `policy.valuation.formula`† | calculate/approve, not draft |
| CR02 | cost capture + approval | planned | — | — |
| CR02 | invoice drafting | planned | — | — |
| CR02 | **invoice issue** | planned | `policy.invoice.numbering`†, `policy.invoice.tax`†, `policy.invoice.rounding`† | issue only |
| CR02 | receipts + allocations | planned | — | — |
| CR03 | delivery orders + missions | planned | — | — |
| CR03 | assets, assignment, immobilization | planned | — | — |
| CR03 | return obligations | planned | — | — |
| CR06 | client requests + responses | planned | — | — |
| CR06 | notifications | planned | `policy.notification.destinations`† | email channel; in-app unblocked |
| CR07 | adapter registry + synthetic fixtures | planned | — | — |
| CR07 | reconciliation differences + apply | planned | `policy.exchange.schemas`† | real-format import |
| CR04 | projects, flows, import lots | planned | `policy.red.eligibility`† | posting |
| CR04 | BOM versions | planned | — | — |
| CR04 | allocation + deterministic clearance | planned | `policy.red.dispositions`†, `policy.unit.precision`† | posting |
| CR04 | reversals | planned | — | — |
| CR05 | obligations + due-date calculation | planned | `policy.deadline.periods`† | calculated due dates |
| CR05 | guarantees + release | planned | `policy.guarantee.release_policy`† | release confirmation |
| DF04 | rule lifecycle + qualification | planned | `policy.rule.parameters`† | numeric rule effects |
| DF04 | impact scanning | planned | — | — |
| DF01 | extraction runs + field review | planned | `policy.ai.destination`†, `policy.ai.retention`† | any provider call |
| DF01 | contradictions + mail routing | planned | — | — |
| DF02 | contract versions + charge rules | planned | `policy.carrier.free_time`†, `policy.carrier.tiers`†, `policy.calendar.policy`† | estimates |
| DF02 | exposure snapshots + scenarios | planned | — | — |
| DF06 | integrations + machine principals | planned | `policy.integration.contracts`†, `policy.api.rate_limits`† | live activation; sandbox unblocked |
| DF03 | production batches + movements | planned | — | — |
| DF03 | reconciliation + RED correction | planned | `policy.bom.yields`†, `policy.production.exception_treatment`† | correction proposals |
| DF05 | knowledge index + assistant | planned | `policy.ai.destination`† | any provider call |
| DF05 | advisory runs + recommendations | planned | `policy.assistant.schedule`† | scheduled scans |
| PL01 | `/travail` — the cross-dossier work queue | planned | — | — |
| PL01 | saved views + preferences | planned | — | — |
| PL01 | offline draft sync | planned | `policy.offline.attachment_policy`† | attachment caching; in-memory drafts unblocked |
| PL02 | public site + lead capture | planned | — | — |
| PL02 | reports + exports | planned | — | — |
| PL02 | license + usage | planned | `policy.license.terms`† | gating behaviour |
| PL02 | runbooks + restore rehearsal | planned | `nfr.*` (`nfr.rpo`, `nfr.rto`, `nfr.availability`, `nfr.capacity`, `nfr.api_latency`, `nfr.ui_latency`, `nfr.job_latency`) | release readiness sign-off |

## Policy register — List B owners

From [ADR-005](01-DECISIONS.md#adr-005). Longest lead time in the project; start in week one.

| Owner needed | Keys | Blocks |
|---|---|---|
| Qualified regulatory reviewer | regimes, document applicability, duties/tax/valuation, permitted RED discharges, deadlines/extensions | CR01 approval, CR04 posting, CR05 closure |
| Finance reviewer | invoice numbering, tax, rounding, currency scales, FX source, pass-through treatment | CR02 issue |
| Commercial / transport reviewer | carrier free time, tier rates, calendar and overlap rules | DF02 estimates |
| Production + RED reviewer | production units, BOM yields, exception treatment | DF03 corrections |
| Security / privacy owner | session and assurance durations, upload limits, retention and holds, AI destinations, legal bases, CNDP transfer assessment | FD01/FD02 production, DF01/DF05 |
| Integration owner | file schemas, API credentials and contracts, notification destinations | CR07, DF06 |
| Service owner | `nfr.*` — capacity, latency, recovery, availability, support, region, pricing | PL02 release |
