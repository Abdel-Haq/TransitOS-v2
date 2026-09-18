# Dossier Clair — implementation plan

Derived from `dossier-clair-project-specs` (25 files, 18 modules, 12 Sept 2026).
Execution model: **solo builder + Claude Code.**

The specs already contain a phased delivery plan (§19) and an execution order for
developers. This document does not replace them. It does four things they do not:

1. **Adds Phase 0.** The specs sequence the UI module (PL01) as *"Polish; depends on
   CR01/CR03/CR06"* — after the modules that specify 25 screens between them. That is
   backwards, and it is the defect that will cost the most if left alone. See
   [ADR-001](01-DECISIONS.md#adr-001).
2. **Resolves the eight defects** found in the specs by adversarial review, as decisions
   rather than open questions. See [01-DECISIONS.md](01-DECISIONS.md).
3. **Adapts to solo.** The specs deliberately omit staffing — *"Dates, staffing, budget
   and pilot organization are assumption to verify and deliberately absent."* Solo changes
   the binding constraint, and the plan has to say so out loud (§1 below).
4. **Makes it executable in Claude Code sessions** — sized slices, contract-first, with a
   delivery ledger.

---

## 1. The honest constraint

The specs size every one of the 18 modules as **L**. Taken literally that is 18 large
modules, 114 named UI routes, 16 roles and 5 shells, built by one person.

**Code volume is not the binding constraint.** With a contract-first setup, Claude Code
can generate the bulk of 114 CRUD-and-review screens from typed DTOs. What does not scale
is everything around it:

| Constraint | Why solo strains it |
|---|---|
| **Policy resolution** | 99 `assumption to verify` markers. Most need a qualified regulatory reviewer, a finance reviewer or a privacy owner. A solo builder is none of those, and the specs correctly refuse to let code invent the values. |
| **Separation of duty** | The authorization model requires that a submitter cannot approve their own controlled action, across ~6 distinct reviewer capabilities. One person cannot satisfy it. [ADR-002](01-DECISIONS.md#adr-002) gives the engineering answer; it does not give a production answer. |
| **Review capacity** | Generated code still has to be read. A module of this shape is ~15–25 files of domain logic plus migrations plus tests. Generation is fast; verification is not. |
| **Domain correctness** | FIFO/LIFO allocation, BOM coverage, partial-period charge tiers and exact decimal arithmetic are not code-generatable from a description. They need fixtures written by someone who knows the right answer. |

**What this means in practice.** Phases 0–2 (foundation + broker core) are genuinely
achievable solo. CR04/DF03 (the RED ledger and production reconciliation) are the two
items where solo most likely stalls — not on code, but on needing a qualified RED reviewer
to validate eligibility and yield treatment. Plan for that, do not discover it.

You chose full scope after I argued for a thin slice. That is recorded as
[ADR-008](01-DECISIONS.md#adr-008) and the plan below delivers it. The sequencing is
arranged so that **stopping early still leaves a shippable product** at the end of Phase 2
and again at the end of Phase 3 — if the RED half proves unaffordable, the broker product
stands on its own.

---

## 2. Architecture baseline

Taken from the shared contract, unchanged.

```
apps/web        Next.js + React + TypeScript — staff app, client portal, public site
apps/api        NestJS + TypeScript — REST, generated OpenAPI, runtime DTO validation
apps/worker     Job + outbox processor, worker leases, idempotent handlers
packages/contracts   DTOs, error catalog, capability registry, action registry  ← keystone
packages/domain      Framework-free business logic, calculations, state machines
packages/ui          Design system + component library                          ← Phase 0
packages/adapters    Integration adapters behind a fixed interface
db/migrations        SQL via Drizzle
infra                Compose, images, reverse proxy
tests/fixtures       Versioned synthetic fixtures
```

- **PostgreSQL** with exact numeric arithmetic. Decimal as string at the API boundary,
  `NUMERIC` in the database. No floats anywhere near money or quantities.
- **Keycloak** owns passwords, MFA and recovery. The application owns resource permissions.
- **Private S3-compatible object storage**, version-specific immutable keys, malware scan
  before any preview, download, extraction or notification.
- **Jobs and outbox in PostgreSQL** — no broker. `SKIP LOCKED` for queue claiming only;
  never for business balance checks.

`packages/contracts` is the keystone. Everything else is generated from or validated
against it. Solo throughput depends on that being true from day one, not retrofitted.

---

## 3. Phases

Effort is **relative**, following the specs' own refusal to invent weeks. `S/M/L` is
sizing against each other, not calendar time.

### Phase 0 — Foundation kernel *(not in the specs; see ADR-001)*

Nothing in Phases 1+ can be built correctly without this, and every hour spent here is
repaid 114 times.

| # | Item | Size | Done when |
|---|---|---|---|
| 0.1 | Monorepo, toolchain, CI, test harness, Compose stack (Postgres + Keycloak + MinIO + scanner) | M | `docker compose up` gives a working local environment; CI runs migrations against real Postgres |
| 0.2 | `packages/contracts` — shared value types (`Money`, `Quantity`, `Decimal`, `ResourceRef`, `EvidenceRef`, `SnapshotRef`, `TypedValue`), the French error catalog, the capability registry, the action registry | L | Every type from spec §20 is expressed and unit-tested; OpenAPI generates |
| 0.3 | **Shared kernel schema** — `ResourceRecord`, `ReviewRequest`, `ApprovalDecision`, `AuditEvent`, `Job`, `OutboxEvent`, `IdempotencyRecord` | L | The controlled-command flow executes end to end on a synthetic resource: validate → authorize → `If-Match` → lock → recheck → apply → consume approval → audit + outbox → commit |
| 0.4 | Authorization engine — capability + resource scope + classification + module availability, deny by default | L | Role/resource matrix tests pass, including revoked parent grants, restricted children and aggregate leakage |
| 0.5 | **`packages/ui` — design system** carried from TransitOS with its defects fixed ([ADR-006](01-DECISIONS.md#adr-006), [03-DESIGN-FOUNDATION.md](03-DESIGN-FOUNDATION.md)) | L | Tokens, type scale, elevation, and the ~20 primitives the specs actually need; every token single-valued; contrast validated |
| 0.6 | **UI application shell** — the five surfaces, navigation, the review-state component, French locale, accessibility primitives | L | A screen can be built from primitives in an hour, not a day |
| 0.7 | Approval policy modes ([ADR-002](01-DECISIONS.md#adr-002)) | S | `dev_single_approver` works locally and **fails the production readiness check** |

**Exit:** a synthetic resource can be drafted, submitted, independently approved, posted,
audited and reversed — through real screens, with real authorization, on real Postgres.

> Phase 0 is the whole bet. If it is rushed, every one of the 18 modules pays interest.

### Phase 1 — Foundations *(specs: FD01–FD03)*

| # | Module | Size | Exit evidence (from spec §19) |
|---|---|---|---|
| 1.1 | **FD01** Identity, access, mandates | L | Session/grant revocation and independent access-change approval pass; no implicit client access |
| 1.2 | **FD02** Evidence, approvals, history, jobs, retention | L | Clean upload → exact-version review → audited effect; rollback and hold tests |
| 1.3 | **FD03** References, mappings, migration staging, search | L | Synthetic source totals and identifiers survive dry-run and export; no unknown balance inserted |

FD01 and FD02 are mutually dependent; the specs stage it correctly — bootstrap identity
schema first, activate privileged grant and mandate verification once FD02 review services
exist. Build them as one slice, not two.

**Exit:** secure synthetic end-to-end behaviour. This is the specs' "Foundation milestone".

### Phase 2 — Broker core *(specs: CR01–CR03, CR06, CR07 partial)*

The first point at which the product is worth showing anyone.

| # | Module | Size | Notes |
|---|---|---|---|
| 2.1 | **CR01** Dossiers, requirements, blockers, declarations, work queue | L | The differentiator lives here. `/travail` and `/dossiers/{id}` are the two screens that decide whether this product is usable |
| 2.2 | **CR02** Costs, invoices, receipts, allocations | L | Blocked on approved numbering/tax/rounding policy before *issue* — drafting works without it |
| 2.3 | **CR03** Orders, missions, assets, return closure | L | Use a PostgreSQL exclusion constraint for assignment overlap, as the spec suggests |
| 2.4 | **CR06** Client requests, responses, notifications | L | Separate DTO allowlists for client routes — never staff object serialization |
| 2.5 | **CR07** File exchange and reconciliation *(broker scope)* | M | Adapter registry + synthetic fixture format only. No claimed official connection |

**Exit = broker pilot.** Spec §19: *"Broker pilot requires CR01–CR03, CR06 and relevant
CR07 workflows plus operational gates."* RED capability is omitted from navigation and
from any claim.

**This is stop-point 1.** A complete customs-broker product. If scope has to be cut, cut
it here and the result is still a coherent thing to sell.

### Phase 3 — RED core *(specs: CR04, CR05)*

| # | Module | Size | Notes |
|---|---|---|---|
| 3.1 | **CR04** Projects, lots, BOM, deterministic allocation, reversals | L | The hardest module in the product. Deterministic FIFO/LIFO with documented tie-breaks; all-or-nothing BOM coverage; exact reversal |
| 3.2 | **CR05** Obligations, deadlines, guarantees, release evidence | L | Local clearance must never release a bank guarantee by implication |

⚠️ **Highest solo risk.** Not the code — the *correctness oracle*. Eligibility predicates,
permitted dispositions, conversion precision and aggregation basis are all
`assumption to verify` and need a qualified RED reviewer. Secure that person **before**
starting 3.1, or build it against explicitly synthetic reviewed rules and accept that
production activation is blocked.

**Exit = RED pilot.** **Stop-point 2.**

### Phase 4 — Differentiators *(specs: DF01–DF06)*

Each activates individually, only after its own evidence and provider policy are approved.

| # | Module | Size | Gate |
|---|---|---|---|
| 4.1 | **DF04** Rule registry, qualification, impact scanning | L | Build early — Phases 2–3 already consume a minimal registry. This grows it, it does not replace it |
| 4.2 | **DF01** Reviewed extraction, contradictions, mail routing | L | Approved AI provider, region, purpose and data categories |
| 4.3 | **DF02** Contract-aware delay exposure and scenarios | L | Needs real carrier/terminal contract evidence from a customer |
| 4.4 | **DF06** Adapters and scoped machine API | L | Every claimed live adapter needs contract evidence and passing tests |
| 4.5 | **DF03** Production evidence and RED reconciliation | L | Depends on CR04 + CR07 |
| 4.6 | **DF05** Grounded assistant, scans, recommendations | L | Last by dependency — needs CR04, CR05, DF01, DF03, DF04 |

DF04 moves to the front of this phase because the minimal rule registry is already load
bearing by the end of Phase 2. The specs acknowledge this (*"early registry already in
use"*) but sequence the module late; bringing it forward avoids a migration.

### Phase 5 — Operations and launch *(specs: PL01 remainder, PL02)*

| # | Item | Size |
|---|---|---|
| 5.1 | **PL01 remainder** — saved views, preferences, controlled offline draft sync | M |
| 5.2 | **PL02** — public site, reports, license/usage, runbooks, restore rehearsal | L |

Most of PL01 was pulled into Phase 0. What remains here is genuinely polish: saved views,
density preference, and the offline draft envelope — which depends on
[ADR-004](01-DECISIONS.md#adr-004) being settled first.

---

## 4. How each module gets built

The specs give the recipe (§19, "Execution order for developers"). Follow it exactly, as
a **vertical slice**:

```
migration + constraints
  → domain state & calculation services      (packages/domain, framework-free)
  → transaction & approval commands          (the controlled-command flow)
  → API contracts                            (packages/contracts → OpenAPI)
  → French screens                           (packages/ui primitives)
  → invariant & user-journey tests
  → operational runbook
```

Never build horizontally — never "all the migrations", then "all the services". A half-built
module across seven layers cannot be tested, and solo means nobody else will notice.

**Sizing for Claude Code sessions.** One vertical slice of one *entity family* is roughly
one session: the migration, its constraints, its domain service, its commands, its DTOs and
its tests. A module is 4–8 such slices. Start each session by pointing at `CLAUDE.md`, the
module's spec file and the delivery ledger row.

**Definition of done** (spec §19, unchanged): schemas and migrations, service invariants,
OpenAPI schemas, permitted French screens, audit and history, dependency invalidation,
error behaviour, required tests, and a runbook. A module with unresolved production policy
is marked `Prêt techniquement — activation en attente`, **not released**.

---

## 5. Tracking

Maintain the delivery ledger the specs require —
[`02-DELIVERY-LEDGER.md`](02-DELIVERY-LEDGER.md):

`module_id, requirement_id, implementation_ref, test_ref, status, blocking_policy_keys, reviewer, decision_ref`

Statuses: `planned / in_progress / code_complete / acceptance_pending / released / blocked`.

The point of `blocking_policy_keys` is that a policy dependency stays **visible** instead of
being quietly replaced by a developer guess. That column is the one that keeps this honest.

---

## 6. First five things to do

1. Scaffold the monorepo and Compose stack (0.1).
2. Write `packages/contracts` value types and the error catalog (0.2) — before any table exists.
3. Build the shared kernel and prove the controlled-command flow on a throwaway resource (0.3).
4. Port the design system into `packages/ui` with the token defects fixed (0.5).
5. Split the 99 assumptions into *engineering-decidable now* and *policy-blocked*
   ([ADR-005](01-DECISIONS.md#adr-005)) and start chasing the second list immediately —
   it has the longest lead time and nothing in Phase 3 can be activated without it.
