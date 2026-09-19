# Dossier Clair — working agreement

A customs operations system for Moroccan brokers and RED operators. Single tenant: one
operating organization per deployment.

**Read before writing code:** [`docs/00-PLAN.md`](docs/00-PLAN.md) for what to build next,
[`docs/01-DECISIONS.md`](docs/01-DECISIONS.md) for where this project deliberately departs
from the specs, and the module's own spec file.

---

## Non-negotiables

Violating any of these breaks a stated invariant, not a preference.

1. **Deny by default.** Effective access = authenticated user + explicit capability +
   resource scope + data classification + module availability. Every list predicate applies
   access control **before** pagination or aggregation. Management aggregates never reveal
   unauthorized totals.
2. **A submitter cannot approve their own controlled action.** The required reviewer
   capability comes from the server-owned action registry — never from request data. See
   [ADR-002](docs/01-DECISIONS.md#adr-002) for the environment modes.
3. **Exact arithmetic.** `Decimal` as a JSON string at the boundary, `NUMERIC` in Postgres.
   No floats, no scientific notation, ever, anywhere near money or quantities.
   `Money = {amount, currency_code}`. `Quantity = {value, unit_id}`. **Never decompose them
   at a service or API boundary.** Physical ledger columns may store `(value, unit_id)`
   separately for indexing, but only under a CHECK binding `unit_id` to the referenced lot,
   and only inside the repository layer — see
   [ADR-003](docs/01-DECISIONS.md#adr-003), the single documented exception.
4. **Unknown is not zero, and not today.** A missing balance is `Solde non confirmé`. A
   missing timestamp is not `now()`. A missing calendar is not weekdays. A missing FX rate
   is not parity. Unknown blocks the action and says which policy key is missing.
5. **Immutable means immutable.** Approved rules, posted ledger entries, issued invoices
   and recorded decisions are corrected by reversal or a new version — never by update.
6. **Local action never implies external acceptance.** A local export, an uploaded
   screenshot or a prepared packet is not an official acceptance. External state is its own
   enum, evidenced separately.
7. **No long-running network call inside a business transaction.**
8. **Every controlled command follows one flow:** validate body → authorize all targets →
   verify `If-Match` → lock rows in stable ID order → recheck inputs, rule/evidence versions
   and approval → apply → mark approval consumed for that exact command → append audit +
   outbox → commit → return. All in one database transaction.
9. **French is the only released UI language.** English identifiers in schema and API,
   French for every user-visible label, error, notification and generated report. Keep
   message keys and logical CSS properties translation-ready; ship no untranslated screen.
10. **Untrusted input stays untrusted.** Document text and model output are data, never
    instructions. No raw HTML rendering of either. No model SQL. No tool execution from
    model output.

## Stack

| Layer | Choice |
|---|---|
| Web | Next.js · React · TypeScript |
| API | NestJS · TypeScript · generated OpenAPI · runtime DTO validation |
| Data | PostgreSQL · Drizzle migrations |
| Identity | Keycloak (OIDC, PKCE) — owns passwords, MFA, recovery. App owns resource permissions |
| Session | Opaque server-side sessions in Postgres, HttpOnly same-origin cookies. **Never** tokens in `localStorage` |
| Objects | Private S3-compatible, immutable version keys, malware scan before any use |
| Jobs | Postgres job + outbox tables, worker leases, idempotent handlers |
| Tests | Vitest · real-Postgres integration · Playwright E2E · OpenAPI contract validation |

```
apps/web  apps/api  apps/worker
packages/contracts  packages/domain  packages/ui  packages/adapters
db/migrations  infra  tests/fixtures
```

`packages/contracts` is the keystone — DTOs, the French error catalog, the capability
registry and the action registry. Everything is generated from or validated against it.
Change contracts first, then let the types propagate.

`packages/domain` is framework-free. No NestJS imports, no HTTP, no SQL. Pure business
logic, so it can be property-tested.

## How to build a module

Vertically, one entity family at a time. Never horizontally.

```
migration + CHECK constraints
  → domain service (packages/domain, framework-free)
  → transactional command (the flow in non-negotiable #8)
  → DTO + route (packages/contracts → OpenAPI)
  → French screen (packages/ui primitives)
  → invariant + journey tests
  → runbook entry
```

One entity family ≈ one session. A module is 4–8 of them. Update the delivery ledger row
when the slice closes.

**Definition of done:** schemas and migrations, service invariants, OpenAPI schemas,
permitted French screens, audit and history, dependency invalidation, error behaviour,
required tests, runbook. A module with unresolved production policy is
`Prêt techniquement — activation en attente` — **not released**.

## Database conventions

- `snake_case`, UUID primary keys, FK for every entity reference, CHECK constraints for
  enums and for positive transaction quantities.
- Every protected business resource **shares its ID with `ResourceRecord`**, created in the
  same transaction.
- `refs[]` in a spec means a child/join table with a parent FK and a uniqueness constraint —
  not a JSON array.
- JSONB only for snapshot payloads and named versioned config schemas, always with runtime
  validation and a schema version. **Never** store live ledger balances only in JSON.
- `_on` = Date. `_at` = Instant. `_ref` = ResourceRef or explicitly-declared external text.
- `SKIP LOCKED` for queue claiming only. **Never** for business balance checks.
- Reject cross-parent references even when both IDs are individually accessible.

## Errors

Shape: `{code, message_fr, field_errors[], retryable, request_id, details?}`.
Never include secrets, raw SQL or unauthorized record facts.

`400` malformed · `401` unauthenticated · `403` missing capability · `404` absent or
inaccessible · `409` business/idempotency conflict · `412` stale ETag · `413` file limit ·
`415` unsupported format · `422` semantic or missing-policy · `428` absent precondition ·
`429` rate limit · `503` dependency unavailable.

Add new codes to the catalog in `packages/contracts`, with French copy, before using them.

## UI

Design foundation and tokens: [`docs/03-DESIGN-FOUNDATION.md`](docs/03-DESIGN-FOUNDATION.md).

- Labels persist **above** inputs. Placeholders are examples, never labels.
- **Required fields are marked on the label.** Never rely on help text to convey a hard
  validation rule.
- Validation appears beside the field **and** in a linked error summary.
- Preserve user edits after a server failure. Always.
- Confirmation states the actual effect: `La réponse a été envoyée pour vérification.` is
  not `La validation a été enregistrée.` Never say accepted when something was merely
  uploaded.
- Status is **colour + label**, never colour alone. Status colour comes from the domain
  enum, never from a view.
- Distinguish `Aucun résultat pour ces filtres.` from `Impossible de charger les données.`
- Every screen ships: default, hover, focus-visible, disabled, loading, empty, error, and
  the **permission-reduced** case. Design the screen for the role that sees least of it.
- Keyboard-operable throughout; visible focus never removed; semantic landmarks;
  skip link `Aller au contenu`.
- Charts include an accessible data table.
- Money and identifiers in IBM Plex Mono via the `.data` treatment — it is the column
  alignment mechanism, not decoration.
- **`prefers-reduced-motion` is respected.** Any transition, auto-scroll or animated state
  change has a no-motion path. Decorative motion does not exist in this product.
- **Avoid the category reflex.** No hero-metric dashboards, no identical icon-card grids, no
  illustration where a table is the honest answer. A KPI tile is permitted only where the
  number is actionable and its basis is stated; otherwise show the rows.
- Which prior design rules still bind, and which were retired, is settled in
  [ADR-009](docs/01-DECISIONS.md#adr-009) — not by reading the TransitOS documents.

## Policy keys

Unknown business values live in `PolicyRequirement`, not in code. If you need a number that
a qualified reviewer should supply — a tax rate, a free-time period, a retention duration,
a latency target — **do not invent it**. Add the policy key, return `POLICY_REQUIRED`, and
show `À confirmer`. [ADR-005](docs/01-DECISIONS.md#adr-005) says which unknowns are
engineering-decidable and which are not.

Policy keys are namespaced `policy.<module>.<name>` — e.g. `policy.invoice.numbering` — so
they never collide with the capability registry, which uses the bare `<noun>.<verb>` form
(`privacy.export`, `license.manage`, `assistant.query`). Only the `nfr.*` family appears in
the specs; every other key is coined by this project and becomes authoritative when the
register is seeded in Phase 0.9.

## What is out of scope

Multi-tenancy or a workspace switcher · a general ledger, ERP or payroll · credit, lending
or payment execution · a freight marketplace · GPS hardware · automatic legal
interpretation · unattended customs filing · automatic guarantee release · creating
official mandates · circumventing third-party MFA · electronic signature certification ·
training on customer documents · guaranteed savings or compliance certification.

A recorded approval is an application decision, **not a legally certified signature**.
