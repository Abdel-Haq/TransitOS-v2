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
