# Dossier Clair — implementation plan

Derived from `dossier-clair-project-specs` — 25 files, 18 modules, dated 12 September 2026.
Execution model: **one builder working with Claude Code.**

The specs already carry a phased delivery plan (§19) and an execution order for developers.
This document does not replace them. It does four things they do not:

| | |
|---|---|
| **Adds Phase 0** | The specs schedule the UI module (PL01) as *"Polish; depends on CR01/CR03/CR06"* — after the 25 screens those modules specify. The foundation kernel, authorization engine, design system and rule registry move to the front. [ADR-001](01-DECISIONS.md#adr-001) |
| **Resolves the review findings** | Adversarial review scored the specs 14/22. Each finding is answered by a dated decision rather than left open. [01-DECISIONS.md](01-DECISIONS.md) |
| **Adapts to one builder** | The specs deliberately omit staffing — *"Dates, staffing, budget and pilot organization are assumption to verify and deliberately absent."* That changes which constraint binds (§1). |
| **Makes it executable** | Slices sized to a working session, contract-first, tracked in a delivery ledger. |

---

## 1. The binding constraint

The specs size all 18 modules as **L**. Taken literally: 18 large modules, **~114** named UI
routes (a pattern count over the screen inventories — approximate), **16** roles
(exact — `00-shared-contract.md:66`) and 5 shells, built by one person.

**Code volume is not what binds.** Contract-first, Claude Code can generate the bulk of
those CRUD-and-review screens from typed DTOs. Four other things do not scale:

| Constraint | Why it strains |
|---|---|
| **Policy resolution** | **49** `assumption to verify` markers covering ~110 enumerated values. Most need a qualified regulatory reviewer, a finance reviewer or a privacy owner. One builder is none of those, and the specs correctly refuse to let code invent the values. |
| **Separation of duty** | A submitter cannot approve their own controlled action, across ~6 reviewer capabilities. One person cannot satisfy it. [ADR-002](01-DECISIONS.md#adr-002) gives the engineering answer; it does not give a production answer. |
| **Review capacity** | Generated code still has to be read. A module here is ~15–25 files of domain logic plus migrations plus tests. Generation is fast; verification is not. |
| **Correctness oracle** | FIFO/LIFO allocation, BOM coverage, partial-period charge tiers and exact decimal arithmetic cannot be generated from a description. They need fixtures written by someone who knows the right answer. |

**Where this most likely stalls.** Phases 0–2 are genuinely achievable alone. CR04 (RED
ledger) and DF03 (production reconciliation) are the two items that stall — not on code, but
on needing a qualified RED reviewer for eligibility and yield treatment. That person is a
dependency to secure early, not to discover in Phase 3.

**Scope is full, by decision.** A thin slice was argued for and overruled;
[ADR-008](01-DECISIONS.md#adr-008) records both. The sequencing below is arranged so that
**stopping early still leaves a coherent product** — see the stop-points in §3.

---

## 2. Architecture baseline

From the shared contract, unchanged.

```
apps/web             Next.js · React · TypeScript — staff app, client portal, public site
apps/api             NestJS · TypeScript — REST, generated OpenAPI, runtime DTO validation
apps/worker          Job + outbox processor, worker leases, idempotent handlers

packages/contracts   DTOs · error catalog · capability registry · action registry  ← keystone
packages/domain      Framework-free business logic, calculations, state machines
packages/ui          Design system + component library
packages/adapters    Integration adapters behind a fixed interface

db/migrations        SQL via Drizzle
infra                Compose, images, reverse proxy
tests/fixtures       Versioned synthetic fixtures
```

- **PostgreSQL**, exact numeric arithmetic. `Decimal` as string at the API boundary,
  `NUMERIC` in the database. No floats near money or quantities.
- **Keycloak** owns passwords, MFA and recovery. The application owns resource permissions.
- **Private S3-compatible object storage**, immutable version keys, malware scan before any
  preview, download, extraction or notification.
- **Jobs and outbox in PostgreSQL** — no broker. `SKIP LOCKED` for queue claiming only,
  never for business balance checks.

`packages/contracts` is the keystone: everything else is generated from it or validated
against it. Throughput depends on that being true from day one rather than retrofitted.

---

## 3. Phases at a glance

| Phase | Delivers | Ends at |
|---|---|---|
| **0** | Foundation kernel — contracts, shared kernel, authorization, design system, staff shell, rule registry, policy register | A synthetic resource survives the full controlled-command lifecycle |
| **1** | FD01–FD03 — identity, evidence, references | Secure synthetic end-to-end behaviour (specs' *Foundation milestone*) |
| **2** | CR01–CR03, CR06, CR07 (broker scope) | **Stop-point 1** — broker pilot |
| **3** | CR04–CR05 | **Stop-point 2** — RED pilot |
| **4** | DF04, DF01, DF02, DF06, DF03, DF05 | Each activates individually behind its own gate |
| **5** | PL01 remainder, PL02 | Release readiness |

Effort is **relative** — `S/M/L` sized against each other, following the specs' refusal to
invent weeks.

---

### Phase 0 — Foundation kernel

*Not in the specs. See [ADR-001](01-DECISIONS.md#adr-001).*

| # | Item | Size | Done when |
|---|---|---|---|
| 0.1 | Monorepo, toolchain, CI, test harness, Compose stack (Postgres · Keycloak · MinIO · scanner); startup configuration validation per §19 | M | `docker compose up` yields a working environment; CI runs migrations against real Postgres; invalid required config makes the process **not ready** |
| 0.2 | `packages/contracts` — value types (`Money`, `Quantity`, `Decimal`, `ResourceRef`, `EvidenceRef`, `SnapshotRef`, `TypedValue`), French error catalog, capability registry, action registry | L | Every value type in `00-shared-contract.md:49–53` and spec §20 expressed and unit-tested; OpenAPI generates |
| 0.3 | Shared kernel schema — `ResourceRecord`, `ReviewRequest`, `ApprovalDecision`, `AuditEvent`, `Job`, `OutboxEvent`, `IdempotencyRecord` | L | The controlled-command flow runs end to end on a synthetic resource: validate → authorize → `If-Match` → lock → recheck → apply → consume approval → audit + outbox → commit. `authorize` here is the 0.2 capability registry alone — 0.4 generalises it to scope, classification and module availability. `consume approval` needs 0.7's `dev_single_approver`, which therefore lands first |
| 0.4 | Authorization engine — capability + resource scope + classification + module availability, deny by default | L | Role/resource matrix tests pass, including revoked parent grants, restricted children and aggregate leakage |
| 0.5 | `packages/ui` design system, carried over with its defects fixed. **(a)** tokens, type scale, elevation — every token single-valued; **(b)** the primitives Phase 1–2 actually consume; **(c)** a validated categorical chart sequence | L | A contrast unit test asserts every status pair ≥ 4.5 and every control boundary ≥ 3.0 and **fails the build**; (c) verified under protanopia and deuteranopia simulation |
| 0.6 | Staff application shell — navigation, review-state component, French locale, accessibility primitives | M | The review-state component renders internal state and external state simultaneously on one row, in every status tone; axe-core passes on the shell and a keyboard traversal test covers navigation, skip link and focus order |
| 0.7 | Approval policy modes | S | `dev_single_approver` works locally and **fails the production readiness check** |
| 0.8 | Minimal typed rule registry — `RuleDefinition`, `RuleVersion`, three-valued predicate evaluator, `PolicyRequirement`, and the `POLICY_REQUIRED` → `À confirmer` path | M | A seed policy can be entered, reviewed, activated and consumed by a calculation; an unresolved key blocks that calculation and names itself |
| 0.9 | Policy register — classify all ~110 enumerated unknowns into List A / List B | S | `docs/04-POLICY-REGISTER.md` exists with an owner per item; List A values recorded as approved with `source: engineering_default` |

Decisions in force here: [ADR-001](01-DECISIONS.md#adr-001) ·
[ADR-002](01-DECISIONS.md#adr-002) · [ADR-005](01-DECISIONS.md#adr-005) ·
[ADR-006](01-DECISIONS.md#adr-006) · [ADR-007](01-DECISIONS.md#adr-007), with tokens in
[03-DESIGN-FOUNDATION.md](03-DESIGN-FOUNDATION.md).

**Item numbers are stable identifiers, not the build order.** §6 gives the order — 0.7 and
0.4 land earlier than their numbers suggest, and 0.5(b), 0.5(c) and 0.6 are blocked rather
than next ([ADR-010](01-DECISIONS.md#adr-010)).

**Only the staff shell is built here.** The other four ship with the phase that first renders
them: auth with FD01 (1.1), client portal with CR06 (2.4), field with CR04 (3.1), public site
with PL02 (5.2).

**0.8 is load-bearing and easy to skip.** `04-CR01-dossiers.md:5` says CR01 *"uses a minimal
approved workflow/rule registry"*; `19-security-operations-delivery.md:111` and `:114` make
CR01 and CR04 depend on it; `14-DF04-rules.md:5` says *"a minimal registry exists before those
core modules."* DF04 at 4.1 **grows** this registry, it does not introduce it. Without 0.8,
CR01 hits exactly the wall ADR-001 exists to prevent — one phase later.

**Exit.** A synthetic resource can be drafted, submitted, independently approved, posted,
audited and reversed — through real screens, with real authorization, on real Postgres.

> Phase 0 is the whole bet. Rushed, all 18 modules pay interest on it.

---

### Phase 1 — Foundations · FD01–FD03

| # | Module | Size | Exit evidence (spec §19) | Tests |
|---|---|---|---|---|
| 1.1 | **FD01** Identity, access, mandates *(+ auth shell)* | L | Session/grant revocation and independent access-change approval pass; no implicit client access | `01-FD01-identity.md` → *Acceptance tests and exit* |
| 1.2 | **FD02** Evidence, approvals, history, jobs, retention | L | Clean upload → exact-version review → audited effect; rollback and hold tests | `02-FD02-evidence.md` → *Test/exit contract* |
| 1.3 | **FD03** References, mappings, migration staging, search | L | Synthetic source totals and identifiers survive dry run and export; no unknown balance inserted | `03-FD03-migration.md` → *Errors/Test* |

FD01 and FD02 are mutually dependent and the specs stage it correctly: bootstrap identity
schema first, activate privileged grant and mandate verification once FD02's review services
exist. Build them as one slice, not two.

**Exit.** Secure synthetic end-to-end behaviour — the specs' *Foundation milestone*.

---

### Phase 2 — Broker core · CR01–CR03, CR06, CR07

The first point at which the product is worth showing anyone.

| # | Module | Size | Exit evidence (spec §19) | Tests |
|---|---|---|---|---|
| 2.1 | **CR01** Dossiers, requirements, blockers, declarations, work queue | L | Draft-to-close broker scenario with stale evidence and official status separation | `04-CR01-dossiers.md` → *Tests:* |
| 2.2 | **CR02** Costs, invoices, receipts, allocations | L | Issue/correct/reconcile scenario with concurrent allocation and exact totals | `05-CR02-finance.md` → *Test* |
| 2.3 | **CR03** Orders, missions, assets, return closure | L | Partial delivery and separate empty-return closure; conflicting assignment denied | `06-CR03-transport.md` → *Test* |
| 2.4 | **CR06** Client requests, responses, notifications *(+ portal shell)* | L | Client sees only shared data and exact request version; revoked grants take effect | `09-CR06-client-portal.md` → *Tests:* |
| 2.5 | **CR07** File exchange and reconciliation *(broker scope)* | M | Duplicates and out-of-order files handled without repeated effect or false external acceptance | `10-CR07-reconciliation.md` → *Acceptance:* |

Per-module notes:

- **2.1** is where the differentiator lives. `/travail` and `/dossiers/{id}` are the two
  screens that decide whether this product is usable.
- **2.2** blocks on approved numbering, tax and rounding policy before *issue* only.
  Cost capture and invoice drafting ship without it — the ledger tracks that split.
- **2.3** uses a PostgreSQL exclusion constraint for assignment overlap (`btree_gist` is
  required for the UUID equality operator) **in addition to** the row locking the spec
  mandates, not instead of it. Map the constraint violation to `409 ASSIGNMENT_OVERLAP`.
- **2.4** needs separate DTO allowlists for client routes — never staff object serialization.
- **2.5** is the adapter registry plus the synthetic fixture format only. No claimed official
  connection.

**Exit = broker pilot.** Spec §19: *"Broker pilot requires CR01–CR03, CR06 and relevant CR07
workflows plus operational gates."* RED capability is omitted from navigation and from every
claim, which §19 explicitly permits.

> ### Stop-point 1
> A complete customs-broker product. If scope has to be cut, cut it here — what remains is
> coherent and sellable on its own.

---

### Phase 3 — RED core · CR04–CR05

| # | Module | Size | Exit evidence (spec §19) | Tests |
|---|---|---|---|---|
| 3.1 | **CR04** Projects, lots, BOM, deterministic allocation, reversals *(+ field shell)* | L | Concurrent allocations cannot overspend; reverse/repost preserves trace | `07-CR04-red.md` → *Tests use synthetic reviewed rules* |
| 3.2 | **CR05** Obligations, deadlines, guarantees, release evidence | L | Local fulfilment does not release a bank guarantee; verified extension updates due basis | `08-CR05-obligations.md` → *Tests:* |

- **3.1** is the hardest module in the product: deterministic FIFO/LIFO with documented
  tie-breaks, all-or-nothing BOM coverage, exact reversal with dependency checks.
- **3.2**: local clearance must never release a bank guarantee by implication.

⚠️ **Highest risk in the plan, and it is not the code.** Eligibility predicates, permitted
dispositions, conversion precision and aggregation basis are all `assumption to verify` and
need a qualified RED reviewer. Either secure that person **before** starting 3.1, or build
against explicitly synthetic reviewed rules and accept that production activation stays
blocked.

> ### Stop-point 2
> Broker and RED operator, both segments served.

---

### Phase 4 — Differentiators · DF01–DF06

Each activates individually, only once its own evidence and provider policy are approved.
None is a prerequisite for shipping.

| # | Module | Size | Exit evidence (spec §19) | Tests | Activation gate |
|---|---|---|---|---|---|
| 4.1 | **DF04** Rule lifecycle, qualification, impact scanning | L | New rule identifies affected records without rewriting posted history | `14-DF04-rules.md:35`† | Grows the 0.8 registry |
| 4.2 | **DF01** Reviewed extraction, contradictions, mail routing | L | Proposed fields cite source; correction never overwrites approved data silently | `11-DF01-readiness.md:45` | Approved AI provider, region, purpose, data categories |
| 4.3 | **DF02** Contract-aware delay exposure and scenarios | L | Same complete inputs reproduce the estimate; incomplete rates stay unavailable | `12-DF02-delay-costs.md:45` | Real carrier/terminal contract evidence from a customer |
| 4.4 | **DF06** Adapters and scoped machine API | L | Contract fixture and replay tests pass; unverified provider stays disabled | `16-DF06-api-integrations.md:46`† | Contract evidence per claimed live adapter |
| 4.5 | **DF03** Production evidence and RED reconciliation | L | Material variance links to actual movements and reviewed RED correction | `13-DF03-production.md:48` | CR04 + CR07 |
| 4.6 | **DF05** Grounded assistant, scans, recommendations | L | Every factual recommendation is grounded or marked unknown; no executing model output | `15-DF05-advisory.md:48` | Last by dependency — CR04, CR05, DF01, DF03, DF04 |

DF04 leads this phase because the registry is already load-bearing by the end of Phase 2.

† `14-DF04-rules.md` and `16-DF06-api-integrations.md` have no `Tests:` line — their test
lists sit inside the `Errors:` paragraph at the cited line. Every other module spec carries
a labelled `Tests:` line; do not assume it.

---

### Phase 5 — Operations and launch · PL01 remainder, PL02

| # | Item | Size | Exit evidence (spec §19) | Tests |
|---|---|---|---|---|
| 5.1 | **PL01 remainder** — saved views, preferences, controlled offline draft sync | M | Keyboard, French-copy, interrupted field workflow and conflict tests pass | `17-PL01-ux.md` → *Tests:* |
| 5.2 | **PL02** — public site *(+ public shell)*, reports, license and usage, runbooks, restore rehearsal | L | Isolated restore, release readiness and an evidence-backed published capability list | `18-PL02-launch-operations.md` → *Tests:* |

Most of PL01 moved to Phase 0. What remains is genuinely polish — saved views, density
preference, and the offline draft envelope, which depends on
[ADR-004](01-DECISIONS.md#adr-004).

---

## 4. How a module gets built

The specs give the recipe (§19, *Execution order for developers*). Follow it as a **vertical
slice**, one entity family at a time:

```
migration + CHECK constraints
  → domain state & calculation services     (packages/domain — framework-free)
  → transactional + approval commands       (the controlled-command flow)
  → DTOs and routes                         (packages/contracts → OpenAPI)
  → French screens                          (packages/ui primitives)
  → invariant and user-journey tests
  → runbook entry
```

**Never horizontally.** Not "all the migrations", then "all the services". A module half-built
across seven layers cannot be tested, and working alone means nobody else will notice.

**One slice ≈ one session.** A module is 4–8 slices. Open each session with three things:
`CLAUDE.md`, the module's spec file, and the ledger row being closed.

> **Worked example — CR02, slice 3 of 6 ("invoice issue").**
> Migration for `NumberSeriesVersion` / `NumberIssue` with a unique constraint on
> `(series_version_id, sequence_value)` → a domain service that allocates under row lock and
> computes line net/tax/gross with the approved rounding policy → the `issue` command
> binding `{approval_id, issue_date, due_date}`, freezing line values and FX references →
> DTO and `POST /invoices/{id}/issue` → the issue screen → tests for concurrent issue,
> failed transaction consuming neither number nor approval, and `POLICY_REQUIRED` when
> numbering policy is unapproved → runbook note on gap treatment.
> That is one session. Slices 1, 2, 4, 5, 6 are cost capture, drafting, receipts,
> allocations and credit notes.

**Definition of done** (spec §19, unchanged): schemas and migrations, service invariants,
OpenAPI schemas, permitted French screens, audit and history, dependency invalidation, error
behaviour, required tests, runbook. A module with unresolved production policy is
`Prêt techniquement — activation en attente` — **not released**.

---

## 5. Tracking

[`02-DELIVERY-LEDGER.md`](02-DELIVERY-LEDGER.md) holds the ledger the specs require:

`module_id · requirement_id · implementation_ref · test_ref · status · blocking_policy_keys · reviewer · decision_ref`

`planned → in_progress → code_complete → acceptance_pending → released`, or `blocked`.

Rows are **slices, not modules** — but the ledger ships one row per sub-module and each is
split further as it is started. CR02 is four rows and six slices; when a row is split, replace
it with its slices rather than tracking both. A policy key usually blocks one slice, and a module-level
row would stall finished work alongside it — CR02 is the clearest case, where only *issue*
depends on numbering, tax and rounding.

`blocking_policy_keys` is the column that keeps this honest: a policy dependency stays
visible instead of being quietly replaced by a developer's guess. Keys are namespaced
`policy.<module>.<name>` so they can never be confused with capability codes, and every key
coined by this project rather than found in the specs is marked in the ledger.

---

## 6. Starting

In order: **0.1 → 0.2 → 0.7 → 0.3 → 0.4 → 0.5(a) → 0.8**, with 0.9 alongside from day one.
The first four are strictly sequential.

> **0.5(b), 0.5(c) and 0.6 are blocked and are not the next item.**
> [ADR-010](01-DECISIONS.md#adr-010) revisited the order after 0.5(a) shipped: the
> primitives and the staff shell wait on `/travail` and `/dossiers/{id}` being designed,
> because components extracted from proven screens are the ones that survive and the
> source file reached 190 component sets for 103 names by building them speculatively.
> 0.5(c) is blocked on something else entirely — a reviewer who can run CVD simulation.
>
> **After 0.5(a), the next backend item is 0.8.** A session picking work up here should
> not start 0.6.

1. **0.1** — scaffold the monorepo, CI and Compose stack.
2. **0.2** — write the value types and error catalog *before any table exists*. Everything
   downstream is generated from or validated against them.
3. **0.7** — approval policy modes. Small, and it comes before 0.3 for a reason: 0.3's exit
   requires a resource *independently approved*, and a solo builder cannot satisfy separation
   of duty until `dev_single_approver` exists. See [ADR-002](01-DECISIONS.md#adr-002).
4. **0.3** — build the shared kernel and prove the controlled-command flow on a throwaway
   resource. Until this works, no module can be built correctly.
5. **0.4** — the authorization engine, before anything renders real data. 0.3 authorizes
   against the capability registry alone; 0.4 adds scope, classification and module
   availability, and everything after it assumes deny-by-default is real.
6. **0.5 (a)** — port the tokens with their defects fixed, with the contrast test failing the
   build.
7. **0.8** — the minimal typed rule registry CR01 will need. Its done-when consumes both
   0.4 and 0.7, so it cannot move earlier; it has no UI surface, so it is unaffected by the
   design block above and runs in parallel with the Figma work. Its admin screens
   (`/administration/regles/*`) are not part of `/travail` or `/dossiers/{id}` and land
   later without rework.
8. **0.5 (b) and 0.6 — blocked on screen design.** See
   [ADR-010](01-DECISIONS.md#adr-010). **0.5 (c) — blocked on a CVD-simulation reviewer**,
   a different dependency with its own lead time.

9. **0.9, starting now and running in parallel** — classify the ~110 unknowns and begin
   chasing List B. It has the longest lead time in the project, nothing in Phase 3 activates
   without it, and it is the one item that cannot be accelerated by writing code faster.

---

## 7. What this plan does not contain

- **Dates, staffing or budget.** The specs omit them deliberately and so does this.
- **Values a qualified reviewer must supply.** They live in the policy register, block the
  capability that needs them, and surface as `À confirmer`.
- **A claim that any effort sizing is reliable.** `S/M/L` is relative and unfalsifiable by
  construction.
- **Verification of the design-system source.** The token values and the defect counts in
  [03-DESIGN-FOUNDATION.md](03-DESIGN-FOUNDATION.md) were measured from the source Figma
  file; the arithmetic has been recomputed, the file has not been re-read since.
