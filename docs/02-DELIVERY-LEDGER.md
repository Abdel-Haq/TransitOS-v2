# Delivery ledger

Required by the specs (§19). One row per reviewable requirement.

`status` ∈ `planned · in_progress · code_complete · acceptance_pending · released · blocked`

**`blocking_policy_keys` is the important column.** It keeps a policy dependency visible
instead of letting it be quietly replaced by a developer guess. A row with a value here
cannot reach `released`, no matter how complete the code is.

| module | requirement | implementation_ref | test_ref | status | blocking_policy_keys | reviewer | decision_ref |
|---|---|---|---|---|---|---|---|
| P0 | 0.1 monorepo, CI, compose stack | — | — | planned | — | — | — |
| P0 | 0.2 packages/contracts value types + error catalog | — | — | planned | — | — | — |
| P0 | 0.3 shared kernel + controlled-command flow | — | — | planned | — | — | — |
| P0 | 0.4 authorization engine | — | — | planned | — | — | — |
| P0 | 0.5 packages/ui design system | — | — | planned | — | — | ADR-006 |
| P0 | 0.6 application shell + review-state component | — | — | planned | — | — | ADR-001 |
| P0 | 0.7 approval policy modes | — | — | planned | — | — | ADR-002 |
| FD01 | identity, grants, mandates | — | — | planned | `identity.session_duration`, `identity.assurance` | — | — |
| FD02 | evidence, reviews, jobs, retention | — | — | planned | `privacy.retention`, `upload.limits` | — | — |
| FD03 | references, migration, search | — | — | planned | `migration.source_formats`, `currency.scale` | — | — |
| CR01 | dossiers, blockers, declarations | — | — | planned | `regime.applicability`, `valuation.formula` | — | — |
| CR02 | costs, invoices, receipts | — | — | planned | `invoice.numbering`, `invoice.tax`, `invoice.rounding` | — | — |
| CR03 | transport, missions, returns | — | — | planned | — | — | — |
| CR06 | client requests, notifications | — | — | planned | `notification.destinations` | — | — |
| CR07 | exchange + reconciliation (broker) | — | — | planned | `exchange.schemas` | — | — |
| CR04 | RED ledger, BOM, allocation | — | — | planned | `red.eligibility`, `red.dispositions`, `unit.precision` | — | — |
| CR05 | obligations, guarantees | — | — | planned | `deadline.periods`, `guarantee.release_policy` | — | — |
| DF04 | rule registry + impact scanning | — | — | planned | `rule.parameters` | — | — |
| DF01 | extraction + contradictions | — | — | planned | `ai.destination`, `ai.retention` | — | — |
| DF02 | delay exposure + scenarios | — | — | planned | `carrier.free_time`, `carrier.tiers`, `calendar.policy` | — | — |
| DF06 | adapters + machine API | — | — | planned | `integration.contracts`, `api.rate_limits` | — | — |
| DF03 | production reconciliation | — | — | planned | `bom.yields`, `production.exception_treatment` | — | — |
| DF05 | grounded assistant | — | — | planned | `ai.destination`, `assistant.schedule` | — | — |
| PL01 | saved views, preferences, offline sync | — | — | planned | `offline.attachment_policy` | — | ADR-004 |
| PL02 | public site, reports, license, runbooks | — | — | planned | `nfr.*`, `license.terms`, `service.targets` | — | — |

## Policy register — List B (external owners)

From [ADR-005](01-DECISIONS.md#adr-005). These have the longest lead time in the project.
Start chasing them in week one; nothing in Phase 3 activates without them.

| Owner needed | Keys | Blocks |
|---|---|---|
| Qualified regulatory reviewer | regimes, document applicability, duties/tax/valuation, permitted RED discharges, deadlines/extensions | CR01 approval, CR04 posting, CR05 closure |
| Finance reviewer | invoice numbering, tax, rounding, currency scales, FX source, pass-through treatment | CR02 issue |
| Commercial / transport reviewer | carrier free time, tier rates, calendar and overlap rules | DF02 estimates |
| Production + RED reviewer | production units, BOM yields, exception treatment | DF03 corrections |
| Security / privacy owner | session and assurance durations, upload limits, retention and holds, AI destinations, legal bases, CNDP transfer assessment | FD01/FD02 production, DF01/DF05 |
| Integration owner | file schemas, API credentials and contracts, notification destinations | CR07, DF06 |
| Service owner | capacity, latency, recovery, availability, support, region, pricing | PL02 release |
