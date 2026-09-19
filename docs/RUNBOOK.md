# Runbook

Operational procedures. One entry per capability, added as the slice that needs it lands
(`CLAUDE.md` §*How to build a module*). Phase 0.1 opens it with the environment itself.

---

## Local development

```bash
cp .env.example .env          # every value is a development value; edit nothing to start
pnpm install
docker compose -f infra/compose.yaml --env-file .env up --build
```

Everything is reachable on **one origin**, `http://localhost:8080`:

| Path | Service |
|---|---|
| `/` | web (Next.js) |
| `/api` | API (NestJS) |
| `/identity` | Keycloak |

MinIO's console is on `:9001` and Postgres on `:5432`, both outside the proxy because
neither is browser-facing in the product.

**Why the proxy exists in development.** The session cookie is HttpOnly and same-origin.
If the API sat on its own port locally and behind a proxy in production, production would
be the only environment where the cookie behaviour is exercised. `@dc/config` refuses to
start when `APP_BASE_URL` and `API_BASE_URL` differ in origin, so the mistake cannot be
made quietly.

### Faster inner loop

Dependencies in Docker, apps on the host:

```bash
docker compose -f infra/compose.yaml --env-file .env up postgres keycloak minio clamav
pnpm --filter @dc/api dev        # :3001
pnpm --filter @dc/web dev        # :3000
```

Note that this bypasses the proxy, so the two origins differ and the API will refuse to
start. Point `APP_BASE_URL` and `API_BASE_URL` at the same host-side origin, or run the
`proxy` service too. This is deliberate friction: it is the same friction a misconfigured
deployment would hit, and it is better met here.

### First start is slow

ClamAV downloads its signature database on first run — several minutes. Its healthcheck
has a 300 s start period and the API does not depend on it, so the rest of the stack comes
up meanwhile. A scan request before the scanner is ready must fail closed, never pass.

---

## Migrations

The migration job is **separate from API startup** and the API never runs one —
`19-security-operations-delivery.md:65`: *"Run migration job separately from API startup.
Do not start multiple competing automatic schema migrations."*

```bash
pnpm db:migrate                                                   # host
docker compose -f infra/compose.yaml --env-file .env run --rm migrate   # in the stack
```

A PostgreSQL advisory lock serializes concurrent runs, so two deployments rolling at once
queue rather than race through the same DDL. The lock is session-scoped: if the job dies
mid-migration the lock releases instead of wedging every future deployment.

Migrations are idempotent and CI runs them twice to prove it. A retried deployment has to
converge, and the expand-first migration strategy of `19-…` depends on it.

The job validates the **whole** application configuration, not just the database URL. That
is deliberate: a schema change is the hard-to-reverse step of a deployment, so a bad
configuration should stop the deployment *before* the schema moves, not after.

---

## Readiness

| Endpoint | Meaning |
|---|---|
| `GET /api/healthz` | Liveness. Touches no dependency. An orchestrator that restarts the API because Postgres blinked turns one outage into two. |
| `GET /api/readyz` | Readiness. `200` when every dependency probe is up, `503` otherwise. |

Configuration is validated **before** the HTTP server binds. Invalid required
configuration exits `78` (`EX_CONFIG`) with every problem listed at once — not the first,
and not the first category, so one restart diagnoses the whole deployment.

`readyz` returns `503` until the dependency probes exist. Each probe lands with the slice
that owns it: Postgres at 0.3, identity at 1.1, object store and scanner at 1.2. An
unimplemented probe reports `unchecked`, which is not `up` — `CLAUDE.md` non-negotiable #4,
unknown is not zero. The endpoint does not claim readiness it has not established.

**Secrets never appear in this response.** The payload is assembled from an allowlist in
`packages/config/src/readiness.ts`; a denylist would have to be maintained alongside every
field added to `AppConfig`, and the first one anyone forgets is the one that leaks. A test
resolves every secret and asserts none of them, nor their locators, reach the payload.

---

## Secrets

Configuration holds *references*, never values: `DATABASE_URL_REF=env:DATABASE_URL` or
`file:/run/secrets/database_url`. Resolution is a separate, explicit call, so the config
object is safe to log.

**In staging and production, `env:` refs are rejected.** Environment variables leak into
process listings, crash dumps, child processes and anything that serializes `process.env`.
Deployed secrets are mounted files backed by the secret store of `19-…:16`. Locally, `env:`
is allowed so a laptop needs no secret store.

Also rejected in staging and production: plain `http` for any base URL or the issuer, and
the `local-dev-unapproved` policy-set sentinel — `19-…:63`, *"do not auto-create production
policies from local defaults."*

---

## Module availability

`ENABLED_MODULES` enables optional modules (DF01–DF06). Core modules are always on. An
unrecognised id **fails startup** rather than being ignored, because a typo that silently
leaves a module disabled is indistinguishable from a deliberate choice.

Startup only computes the enabled set. Module availability enters the access decision in
the authorization engine at Phase 0.4.

---

## Contracts

`packages/contracts` is the keystone. DTOs, the French error catalog and the capability,
role and action registries live here, and everything downstream is generated from or
validated against them. Change contracts first, then let the types propagate.

### The registries are extracted, not authored

Every entry in the capability, role and action registries carries a `source` of the form
`file.md:line` pointing into `specs/`, and `registry.test.ts` reads those lines from disk
and asserts they still say what the entry claims. That test is what keeps "extracted from
the specification" true rather than aspirational, and it fails loudly when a spec edit
shifts a line.

If a module needs a capability that is not registered, **the specification does not name
it.** Add it with a citation, or raise it as a specification gap. Do not coin one — see
[ADR-001](01-DECISIONS.md#adr-001).

### Separation of duty is about identity, not capability codes

The action registry transcribes `20-data-api-contract-details.md:65–78`. Three properties
of that table are easy to get wrong, and each one is a hole:

- Four rows require *"a different `access_admin`"*, *"different scoped `dispatcher`"*, a
  *"different designated privacy reviewer"* and *"different `platform_operator`"*. The
  reviewer holds the **same capability** as the submitter. Checking that the reviewer
  capability differs from the submitter's would pass a self-approval on all four.
- An action can require several independent decisions against one frozen payload, and
  every one must be present before effect.
- One qualified person may satisfy several required decisions. `:79` — *"do not invent a
  required staff count."* Requiring a headcount would make the product unusable at the
  six-person firm it targets.

`submitterMayNeverDecide` states the universal rule; `distinct_person` marks the narrower
constraint the four rows add.

### Regenerating the OpenAPI document

```bash
pnpm --filter @dc/api build && node apps/api/dist/main.js   # then GET /api/v1/openapi
```

The document is **3.1.0**, not Nest's 3.0 default. OpenAPI 3.0 schemas are a modified
draft-04 subset, while the component schemas come out of Zod as draft 2020-12 — the
dialect 3.1 uses. A 3.0 document embedding 2020-12 schemas is rejected by validators and
misread by generators, silently and in whichever direction they guess.

### Why there is no arithmetic in this package

`Decimal` has `scaleOf` and `signOf`, and deliberately no `add`, `multiply` or `round`.
Exact arithmetic belongs in `packages/domain` against a real decimal library, and rounding
comes from reviewed `CurrencyPolicy` (`00-shared-contract.md:49`), never from a default.
A convenient `add` here is how a float creeps back into the ledger.

---

## Approval policy modes

[ADR-002](01-DECISIONS.md#adr-002). `APPROVAL_POLICY_MODE` is startup configuration, gated
by environment identity, and `packages/domain/src/approval` evaluates it.

| Mode | Behaviour | Where |
|---|---|---|
| `independent_reviewer` | The spec default. The submitter cannot supply any required decision. | Any environment. |
| `dev_single_approver` | The submitter may decide. Every such decision is stamped `self_approved: true`. | Local and CI **only** — startup exits `78` if it is set in staging or production. |
| `small_org_documented` | Named so the production question stays visible. **Not implemented.** | Blocks with `POLICY_REQUIRED` and the key `policy.approval.small_org_subset`. |

### Why solo mode is refused rather than warned

A deployment running `dev_single_approver` has separation of duty switched off while every
screen still reads `Approuvé`. Nothing in the UI would show it, and the audit trail would
look like a normal approval. The only safe treatment is a process that will not start.

`small_org_documented` blocks rather than falling back to `independent_reviewer`. Falling
back is the safe direction and still wrong: the deployment asked for something and would
silently not get it.

### What `self_approved` means, and what it does not

It is stamped only when the separation genuinely did not hold. If both the submitter and
an independent reviewer recorded a decision, the evaluator takes the independent one and
stamps nothing — so a `self_approved` row in the audit export is always a real finding,
never noise from an extra click.

### Why there is no approver headcount

`20-data-api-contract-details.md:79` — *"A reviewer may satisfy multiple required
capabilities if explicitly granted and qualified; do not invent a required staff count."*
One qualified person may close several required decisions. At the six-person *transitaire*
this product targets, counting distinct approvers would make it unusable, and the
specification forbids inventing the number.

Four actions do need a second person in the same role — `privilege.expand`,
`transport.exception`, `privacy.request`, `installation.approve` — because the
separation-of-duty table puts the same role on both sides. `secondPersonRolesFor` returns
them, so a screen can say *"this needs another `access_admin`"* instead of showing a block
the user cannot clear by granting themselves more capability.

---

## The shared kernel

Phase 0.3. Seven tables in `db/src/schema/kernel.ts`, transcribed from
`02-FD02-evidence.md:19–25` and `20-data-api-contract-details.md:15`, plus `kernel_probe`
— the one resource kind this project coined.

### Why a coined resource kind

The flow had to be proven end to end before any module existed. Borrowing a real kind like
`cost_item` would have pre-empted CR02's schema, and a kind that lived only in tests would
have left the flow unproven against the real CHECK constraints, indexes and row locks.
`kernel_probe` is a kernel fixture and never a business resource; `COINED_RESOURCE_KINDS`
names it and a test asserts it stays the only one.

### The order of the controlled-command flow is not stylistic

`CLAUDE.md` non-negotiable #8 and `00-shared-contract.md:92`:

```
validate → authorize → If-Match → lock → recheck → apply → consume approval
  → audit + outbox → commit
```

- **Authorize before lock** so a denial never holds a lock.
- **Lock before the `If-Match` recheck.** Reading the version, deciding it matches, then
  locking leaves a window where another transaction commits in between. `execute.ts` locks
  first and rechecks after, and `kernel.integration.test.ts` proves it: remove `.for('update')`
  and the concurrency test fails with *two* winners instead of one.
- **Consume the approval in the same transaction as the effect.** That is what stops one
  approval from authorizing two effects, and a partial unique index on
  `consumed_effect_id` backs it at the database rather than only in the code path taken.

### Idempotency and rollback

The claim is written inside the same transaction as the effect, so a rollback takes the
claim with it — `20-…:15`, *"Failed effects that roll back cannot leave a successful
response."* A retry after a failure is a fresh attempt, not a permanently poisoned key.
Same key and same body replays the stored result without a second effect; a different body
is `409 IDEMPOTENCY_CONFLICT`.

### `SKIP LOCKED` belongs to the queue and nowhere else

`00-shared-contract.md:40`. Skipping a locked row is right when another worker already
holds the job and catastrophic in a balance check, where it silently drops a row from a
total. It appears exactly once, in `claimJobs`.

The lease is a deadline, not a flag: a worker that dies leaves a lease that expires and
the job returns to the queue, so there is no janitor process to forget.

**`db.execute` returns the driver's raw rows.** Drizzle's camelCase mapping applies to the
query builder only, so `claimJobs` maps its `RETURNING` columns by hand. Casting instead
compiles cleanly and hands every caller `undefined` — which it did, until a real worker
run printed `no handler for "undefined"`. Running the thing found what the tests did not.

### Retry limits are not set here

`PROVISIONAL_MAX_ATTEMPTS` in the worker is marked against `policy.jobs.max_attempts`†
and is not an approved value. It becomes real when the policy register lands in 0.8.

---

## Authorization

Phase 0.4. The decision is in `packages/domain/src/access` — pure, no HTTP, no SQL, no
clock — and `db/src/kernel/access.ts` loads what it needs and builds list predicates.

`00-shared-contract.md:64`: *"Effective access = active authenticated user + explicit
capability + resource scope + data classification + current module availability. Deny by
default."* Five terms, all required, evaluated in that order. Deny by default is
structural: the function returns a denial unless a branch explicitly allows, and there is
no fall-through.

### The request no longer states its own capabilities

`Principal` carries a user id and nothing else. Phase 0.3 had a capability list on the
request; once the engine landed, that list was either ignored or trusted, and only one of
those is safe. Roles and grants are loaded from the database on every command — same
reasoning as non-negotiable #2.

### 403 or 404 is not a style choice

`403` names a capability the user holds nowhere, which discloses nothing about what
exists. Everything else — out of scope, restricted without a grant, module disabled — is
`404`, because a `403` would confirm the resource is there. `00-shared-contract.md:103`
groups *"absent/inaccessible"* under 404 for exactly this reason.

### Inheritance stops at the first wall

`:84` — grants inherit *"to permitted child records only when `client_shareable=true`"*
and *"`internal` records never inherit external access."* The walk stops at the first
ancestor that is not shareable. A chain `dossier(shareable) → cost(internal) →
attachment(shareable)` must not reach the attachment: the internal record in the middle is
a wall, not a transparent link.

`restricted` needs its own direct grant, and is not reachable by inheritance **or** by
`all_operational_records`. Broad scope is the strongest thing a staff role holds, and
restricted still beats it — otherwise a management report is the leak.

### Access control goes in the WHERE, not after the SUM

`:53` — *"All list predicates include access control before pagination/aggregation."*
`accessiblePredicate` returns a SQL condition to compose into the `WHERE`. Paging first
returns short pages; summing first returns a number the user was never entitled to, and
the number is usually the thing they wanted.

**With no grants and no assignments the predicate is `false`, not `TRUE`.** A predicate
that degenerates to TRUE on an empty grant list is the single worst bug this file could
contain, so the empty case is explicit and tested.

### Nothing is cached

`:84` — *"invalidate caches after revocation."* Three indexed reads per command. A cache
here is a revocation that has not taken effect yet, which is the failure the spec names.
When one eventually earns its place it must be keyed so a revocation can evict it.

### 86 of 121 capabilities have no role

The specs call roles *"fixed capability bundles"* and never enumerate them: role
attribution lives in module prose. `ROLE_BUNDLE_ENTRIES` grounds what can be grounded —
reviewer attributions from the action registry, plus the handful of module sentences that
name a role and a capability together — and `UNASSIGNED_CAPABILITIES` lists the rest.

They all deny by default, so the gap fails closed and is countable rather than papered
over with a plausible bundle. Completing it is `policy.identity.role_bundles`†, supplied
by the organization's access reviewer.

---

## Design tokens

Phase 0.5(a). `packages/ui/src/tokens` is the enforcement of
[`docs/03-DESIGN-FOUNDATION.md`](03-DESIGN-FOUNDATION.md); the document remains the prose.

### Single-valued is the whole point

The source design system had **17 of 22 token names resolving to more than one value** —
the same `fond/application` was `#f0f0f3` on the dashboard and `#fcfcfd` on thirteen other
frames — so a screen could not be built from tokens without first checking what the last
screen did.

Every semantic token here carries a `ref` (`gris/01`, `terracotta/11`, `white`), and
`tokens.test.ts` asserts the hex still equals that ramp step. A hand-edited value cannot
drift from its ramp without failing.

### The ramps stay sparse

A step is added when a use appears, not speculatively. `gris` has no `07` and `ambre` has
no `12`, and both absences are load-bearing — `ambre/12` is exactly the step someone would
invent to "fix" the `attention` tone, which would break the rule that produced the ramp.

### The contrast gate fails the build, literally

```bash
pnpm --filter @dc/ui build      # tsc -b && node dist/bin/check-tokens.js
```

It runs in CI as its own `pnpm build` step, not under `pnpm test`: a check that only runs
in the test job is not a build gate. It emits `packages/ui/dist/tokens.css` in the same
pass, so the stylesheet cannot be generated from tokens that did not pass.

Verified by retuning `ambre/11` one notch lighter:

```
Contrast gate failed — 1 pair(s) below threshold:
  statut/attention
    measured 4.00, required 4.50
    ambre/11 on ambre/03 — a status badge carries a label, so it is text
```

**Why it exists:** `attention` clears AA by **0.03**. The source system flagged that and
never fixed it. Any future retune of `ambre` would break a badge that still looks fine.

The gate compares the **unrounded** ratio, so a pair at 4.4999 fails rather than rounding
up to a pass. `ratio()` rounds only for display, and carries the repository's one
documented `Math.round` exception — a contrast ratio is a dimensionless display figure,
not money.

### Steps 09–10 carry no text

`verifyNonTextFillBand` asserts the rule rather than the ratios: if white on a step-09
fill ever clears AA, someone retuned a ramp and the band definition needs revisiting
before a button starts using it. `violet/09` at 4.97 already clears it and is excluded
from the assertion — it is the documented exception that proves one passing ramp does not
make the band safe. Filled buttons take **step 11** without exception.

### CSS custom properties are generated

French names stay authoritative in TypeScript; the CSS names are ASCII-slugged
(`fond/inversé` → `--dc-fond-inverse`) because downstream tooling is reliably worse at
accented custom property names than the spec says it should be. The `prefers-reduced-motion`
default lives here too — it is a system-wide default, not a decision each component makes.
