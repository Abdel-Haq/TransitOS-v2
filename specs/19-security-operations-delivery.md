# Cross-cutting security, operations and delivery

This section applies to every module. It defines implementation requirements, not a claim that the product already complies with a law or achieves a service level. Business and service thresholds remain **assumption to verify** until approved. The product is single tenant: one operating organization per separately deployed environment.

## Security and privacy specification

| Area | Required implementation | Release evidence |
|---|---|---|
| Identity | Verify OIDC issuer, audience, signature, expiry, state and nonce; use PKCE. Regenerate session after authentication. Server-side token storage encrypted with deployment-managed keys. Expired, revoked or suspended identities cannot create or retrieve work. | Provider integration tests and revoked-session negative tests. |
| Session and privileged operations | Secure, HttpOnly, same-origin cookies; CSRF tokens for browser mutations; logout revokes application session. Administrative privilege changes, confidential exports and approval actions require assurance from the approved identity policy. Assurance and session durations are **assumption to verify**; no production fallback to unlimited sessions. | Policy readiness check and assurance-expired test. |
| Authorization | Apply capability, resource, classification and current grant predicates at service boundaries, queries, background delivery and document streaming. Client routes use separate DTO allowlists. Revalidate job initiator before publishing results. | Role/resource matrix tests, including revoked parent grants, restricted children and aggregate leakage. |
| Separation of duties | Actor cannot approve their own controlled proposal. Server derives required reviewer capability from action registry. Do not trust role, actor, approval status or approver supplied in request data. | Self-approval, capability escalation and altered-payload tests. |
| Application attack surface | Runtime input schemas reject undeclared keys. Parameterized SQL; output encoding; restrictive CSP suited to selected frontend; no raw HTML rendering of document/model output; outbound URL allowlist; sanitize downloadable filenames and CSV formula cells. | Injection, stored XSS, SSRF, path traversal and formula injection cases. |
| Transport and storage | HTTPS at public boundary and authenticated protected service connections. Private object storage; approved at-rest encryption and key custody for database, objects and backups. Object requests pass current application authorization. | Infrastructure policy checks and unauthorized object/download tests. |
| Uploads | Stream into quarantine; validate content type against detected format and approved limits, scan before preview/extraction/download. Reject executable or unsupported content; scanner failure remains quarantined. Archive expansion constrained by configured limits. | Malformed, mismatched, infected, oversized and scanner-outage tests. |
| Secrets | Keep credentials in deployment secret store, referenced by name/version in config. Never return credentials, tokens, signed download URLs or business documents in logs. Rotate using provider-supported overlap/revocation procedure. | Secret scanning, log fixture inspection and rotation rehearsal. |
| Audit | Domain effect, consumed approval and audit record commit atomically. Application roles cannot edit audit records. Audit captures actor, action, time, resource version, decision/evidence refs and request correlation. Privileged infrastructure access has separate external logs. | Transaction rollback test, write-permission checks and audit export verification. |
| Abuse protection | Configured rate limits for authentication-related app endpoints, public forms, expensive searches, exports and integrations; backpressure for jobs. Unknown production limits block public activation of affected endpoints. | Rate-limit tests using synthetic policy, no invented deployed threshold. |
| AI and extraction | Explicit approved provider, region, purpose and data categories. Send the minimum authorized input. Treat all retrieved content as untrusted data. No tool execution or automatic filing/posting from model output. | Prompt injection fixtures, source ACL tests and outbound payload inspection. |
| Dependency and supply chain | Pinned dependencies and container digests; generated dependency inventory; scan source, images and migrations in CI. Security owner records release acceptance or remediation for findings according to approved policy. | Release manifest linked to scan artifacts; unresolved acceptance policy blocks production approval. |

### Moroccan privacy and compliance decisions

Maintain a processing register recording purpose, categories of personal/business data, source, authorized recipients, processors, storage/processing locations, retention policy, legal basis and responsible reviewer. Determine the applicable Moroccan formalities with a qualified privacy owner. In particular, foreign data transfers require assessment of the applicable CNDP process; hosting or AI outside Morocco must not be enabled merely because a vendor offers encryption. See [CNDP: transfers abroad](https://www.cndp.ma/transfert-de-donnees-a-letranger/). The exact formalities, legal basis, required notices and approved destinations are **assumption to verify**.

Before enabling real personal data, record that assessment and approved processors. Before outbound processing, validate the configured destination against the approved processing register. A denied destination produces `Destination de traitement non autorisée.` and leaves the document available for authorized local/manual work. This is a technical control; the application does not determine legal adequacy itself.

Privacy requests are handled by an authorized privacy owner through evidence-backed review. Locate records by verified subject identifiers; distinguish subject access from unrestricted dossier export. Rectify mutable data through normal versioned correction; retain lawful accounting/regulatory evidence under the approved policy. Erasure cannot bypass a legal hold. Record the decision and minimum permitted tombstone. Retention durations, exemptions and request deadlines are **assumption to verify**; never hard-code a duration from this document.

Use FD02 ReviewRequest actions `privacy.export`, `privacy.rectify`, `privacy.erase`, with target scope, identity-verification evidence and policy-version references. Add `/administration/confidentialite` (`Confidentialité et conservation`) for authorized reviewers; list pending reviews and holds. Reuse FD02 export/purge jobs, not a second deletion implementation. Organization designates eligible existing users through explicit capabilities; an access administrator cannot gain business access simply by opening this screen.

Customs rules, invoice contents, retention and guarantees need qualified source-backed validation. Internal decisions, electronic acknowledgements and evidence exports must not display certification claims. Official acceptance remains an externally evidenced state throughout the application.

## Non-functional requirements

These requirements define how acceptance is measured. Unapproved target values are recorded as **assumption to verify**, displayed as `Objectif à confirmer`, and cannot be marked passed. Synthetic test configuration must be visibly separate from production policy.

| Requirement | Measurement and test | Configured acceptance basis |
|---|---|---|
| Transaction integrity | Real PostgreSQL concurrent posting, duplicate delivery, crash/retry and reversal tests; compare ledger and coverage invariants. | No double effects, negative available balances or partial transaction effects; these are logical invariants, not service statistics. |
| Exact calculation | Property and fixture tests for decimal arithmetic, currency, unit conversions, date boundaries, tier coverage and reversals. | Exact approved formula results; tolerance only where a reviewed rule explicitly defines it. |
| Request responsiveness | Measure server latency distribution and browser interaction latency per named operation under declared dataset and concurrency. Exclude queue processing from synchronous response metric. | `nfr.api_latency`, `nfr.ui_latency`, workload and percentiles: **assumption to verify**. |
| Background processing | Measure queued-to-start and start-to-terminal durations by job type; inspect starvation, retry and lease recovery. | `nfr.job_latency`, retry/backoff/lease policy and backlog alert levels: **assumption to verify**. |
| Availability | Define eligible service window, successful user journey, maintenance treatment and monitored dependencies. | `nfr.availability` and support coverage: **assumption to verify**. No uptime claim before agreement and measurement. |
| Recovery | Restore isolated copy of database, referenced document objects, approved config and identity configuration. Verify business totals, manifests and credentials handling. | `nfr.rpo`, `nfr.rto`, backup schedule/retention and recovery dataset: **assumption to verify**. |
| Capacity | Exercise approved dossier/document/ledger sizes, concurrent users, uploads and exports; report observed saturation and failure behavior. | `nfr.capacity` and resource budget: **assumption to verify**. No guessed client count or storage quota. |
| Accessibility | Keyboard-only workflows, focus restoration, semantic names, error association, screen-reader paths, contrast, zoom and reduced-motion checks. | Formal standard/version and supported assistive technologies: **assumption to verify**. Do not publish conformance without review; functional keyboard access is mandatory now. |
| Language and dates | Automated missing-key checks plus French human review; DST/timezone and date-only boundary fixtures. | No untranslated application copy in released paths; business calendars independent of display preferences. |
| Auditability | Follow each controlled effect back to inputs, actor, approval and evidence; export and recompute snapshot digest. | Complete trace for every posted controlled action; no silent edits. |
| Observability | Structured redacted logs, metrics and trace correlation across request/job/outbox. Monitor failed auth, quarantines, stale jobs, unknown external outcomes, backup failures and policy readiness. | Alert routing and escalation coverage: **assumption to verify**. Each alert links a French operator runbook. |

## Environments and deployment

### Environment contract

| Environment | Data and dependencies | Allowed actions |
|---|---|---|
| Local development | Isolated PostgreSQL, object store, Keycloak and worker; synthetic fixtures and fake adapters; local secrets ignored by version control. | Developer resets only synthetic state. No production credentials or real outbound recipients. |
| CI/test | Disposable services and database per test run; deterministic provider fakes and explicitly versioned fixtures. | Schema migration, contract, concurrency and end-to-end tests. No real external filing, email delivery or money movement. |
| Staging | Separate database, buckets, identity realm, keys and service credentials; synthetic or approved irreversibly anonymized data. | Full release and isolated restore rehearsal; external sandbox only under verified contract. |
| Production | Dedicated organization deployment, approved region/providers/policies, own secrets and private storage. | Authorized live operations. Initial activation and infrastructure promotion recorded by platform operator under release approval. |

Configuration is validated at startup: `APP_BASE_URL`, `API_BASE_URL`, `DATABASE_URL` secret ref, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, OIDC secret ref, `SESSION_KEY_REF`, `OBJECT_STORE_ENDPOINT`, private bucket name, object-store credentials ref, scanner endpoint, business timezone, environment identity, approved policy-set ID and enabled-module list. Adapter secrets and model/provider configuration are separate scoped references. Secret strings never appear in readiness responses. Optional unconfigured modules remain disabled. Required invalid configuration makes the process not ready; do not auto-create production policies from local defaults.

Deployment topology: reverse proxy routes web and same-origin API; API/worker share only authorized database/object services; identity provider has its own persistence and administrative interface. Expose administrative infrastructure only over approved management access. Run migration job separately from API startup. Do not start multiple competing automatic schema migrations. A single-host production install is acceptable only if its verified availability/recovery requirements permit it; topology approval is **assumption to verify**.

### Release procedure

1. Build immutable images from reviewed commit; record dependency inventory, contracts and migration identifiers in ReleaseRecord. Run required tests and security checks.
2. Confirm target configuration, approved policy readiness, operator access and backup/recovery evidence. Lock release operations to prevent concurrent deployments.
3. Apply backwards-compatible expand migrations first. If incompatible migration is unavoidable, enter explicit maintenance mode, stop accepting affected writes, drain or safely suspend workers and record the migration/restore plan before executing it.
4. Deploy compatible API/web/worker versions. Jobs store payload schema version; workers process only supported versions and quarantine unsupported jobs for review. Workers resume leased work with domain idempotency.
5. Run non-destructive production smoke checks: identity, authorized read, object service, queue health and policy readiness. Synthetic write checks use designated synthetic records only if the approved operational policy permits them; never post to live ledgers merely for monitoring.
6. Enable approved modules after smoke checks and business readiness gates pass. Publish only capabilities actually released. Observe service metrics against approved targets.
7. Contract/remove obsolete schema only in a later compatible release after validating no active reader/job requires it. Record operator and resulting release state.

Rollback uses the previous compatible image; it never blindly restores an older database over newly created business records. Failed forward migrations stop affected writes and require a rehearsed corrective migration or approved recovery procedure. External outcomes are reconciled after rollback; no duplicate resubmission of an unknown outcome.

### Backup, restore and incident procedure

BackupRun captures database recovery position, object manifest and checksum references, identity configuration backup reference, application/config versions, key-recovery references and completion status. Protect backup keys separately. PostgreSQL and immutable objects must be recoverable to a coherent point: a database snapshot is insufficient if referenced document versions are absent. Backup frequency, retention, location and key custody are **assumption to verify**.

Restore always targets an isolated environment with outbound integrations disabled. Validate object existence/digests, domain foreign keys, ledger/coverage totals, invoice/payment balances, evidence/approval links and pending external outcomes. Measure actual recovery time and recovered data point. Promotion requires an approved incident recovery decision, controlled ingress cutover, credential/session revocation as appropriate and explicit reconciliation of events received after the restored point. A restore test cannot alter the live production instance.

Runbooks must cover: identity outage, scanner outage, object loss, database failure, stuck jobs, stale approvals, suspected credential exposure, failed backup, disputed external outcome and legal hold. Each records detection, safe containment, named responsible capability, recovery steps, data reconciliation and evidence required to close. Incident communication recipients and legal notification requirements are **assumption to verify**; no automatic externally addressed message without approved routing.

## Testing and definition of done

Maintain a requirement-to-test manifest keyed by module ID, business invariant and action code. Tests demonstrate behavior; counts or coverage percentages are not substitutes for required cases.

- Unit/property: rules, exact arithmetic, typed conversions, state transitions, source dependency invalidation, deterministic FIFO/LIFO and reversals. Generate edge cases for empty/partial/duplicate inputs and date boundaries.
- Database integration: real PostgreSQL constraints, migrations, concurrent approvals/postings/allocations, stable lock order, failed transaction rollback, idempotency retention and queue lease recovery. An in-memory database cannot certify these invariants.
- API contracts: generated OpenAPI matches controllers and validation; malformed/unknown fields rejected; ETags and safe error schemas consistent; list ACL before pagination; machine endpoints obey allowlist.
- End-to-end: French staff, reviewer, field agent and client journeys; same-record concurrent edits; restricted document lifecycle; missing-policy blocked path; partial completion, cancellation and corrections.
- Adapters: recorded synthetic contract fixtures, signature failures, duplicated/out-of-order events, expired credentials, interrupted send and unknown remote outcome. Live tests only against a permitted documented sandbox.
- Security/privacy: cross-client object access, staff with no scope, revoked job/download access, self-approval, uploads, prompt injection, redacted logs, retention hold and provider destination denial.
- Migration/recovery: dry run against synthetic legacy data with known totals; no silent unmapped fields; fail/retry deterministic; staged activation; full isolated restore and export manifest verification.
- User acceptance: named broker and RED reviewers validate realistic draft-to-close cases using approved rules. Record accepted fixture expectations and unresolved observations rather than inventing operational assumptions.

A module is complete when schemas/migrations, service invariants, OpenAPI schemas, permitted French screens, audit/history, dependency invalidation, error behavior, required tests and runbook are present. A code-complete module with unresolved production policy is marked `Prêt techniquement — activation en attente`, not released. Production release requires approved unknowns relevant to enabled scope, successful migration/restore rehearsal and no unresolved release-blocking test or accepted-security-policy violation.

## Phased delivery plan and milestones

Effort is relative S/M/L from the strategy, not elapsed time. All roadmap items are L in the baseline; do not convert to invented weeks or staffing. Each row is a separately reviewable delivery item. Shared schemas may be implemented early to satisfy dependencies; that does not imply the full dependent module is released.

| Phase / milestone | Item / goal and scope | Dependencies | Effort | Exit evidence | Main risk |
|---|---|---|---|---|---|
| Foundation / secure skeleton | FD01 — Identity, explicit access and mandate verification. | Shared contract; FD02 audit/review primitives bootstrapped alongside identity. | L | Session/grant revocation and independent access-change approval pass; no implicit client access. | Identity/mandate authority assumptions. |
| Foundation / trusted evidence | FD02 — Versioned documents, reviews, history, jobs and retention. | FD01 principals/capabilities; initial schema bootstrap is joint. | L | Clean upload → exact-version review → audited effect; rollback and hold tests. | Storage, retention and reviewer policy unresolved. |
| Foundation / reconciled inputs | FD03 — References, mappings, migration staging and search. | FD01–FD02. Opening ledger activation waits for CR02/CR04. | L | Synthetic source totals and identifiers survive dry-run/export; no unknown balance inserted. | Legacy quality and source formats. |
| Core / broker workflow | CR01 — Dossiers, requirements, blockers, declarations and work queue. | Foundations; minimal typed rule registry from DF04 contract. | L | Draft-to-close broker scenario with stale evidence and official status separation. | Unverified workflow/regulatory applicability. |
| Core / monetary evidence | CR02 — Costs, invoices, receipt evidence and allocations. | CR01, FD02–FD03; approved monetary policies. | L | Issue/correct/reconcile scenario with concurrent allocation and exact totals. | Tax/numbering rules and source payment evidence. |
| Core / physical execution | CR03 — Orders, missions, assets and return closure. | CR01 and FD02–FD03. | L | Partial delivery and separate empty-return closure; conflicting assignment denied. | Incomplete carrier/event evidence. |
| Core / RED integrity | CR04 — Projects, lots, BOM, deterministic allocation and reversals. | Foundations; minimal rule registry. CR01 link optional for standalone RED work. | L | Concurrent allocations cannot overspend; reverse/repost preserves trace. | Unit/BOM/eligibility interpretation. |
| Core / obligations | CR05 — Due dates, extensions, guarantees and release evidence. | CR04 and FD02; finance linkage uses CR02 where applicable. | L | Local fulfillment does not release bank guarantee; verified extension updates due basis. | Deadline and release policy uncertainty. |
| Core / client collaboration | CR06 — Assigned requests, reviewed replies and client approvals. | FD01–FD02, CR01; invoice/cost views require CR02. | L | Client sees only shared data and exact request version; revoked grants take effect. | Authority and accidental oversharing. |
| Core / evidence exchange | CR07 — File packets, staging, differences and reconciled effects. | CR01, CR04, FD02; FD03 mapping infrastructure and CR02 adapter where financial effects are enabled. | L | Duplicates/out-of-order files handled without repeated effect or false external acceptance. | Unpublished/unstable file schemas. |
| Differentiators / fewer document errors | DF01 — Reviewed extraction and cross-document readiness. | CR01–CR02, FD02; approved provider policy. CR07 supplies imported evidence where used. | L | Proposed fields cite source; correction never overwrites approved data silently. | Extraction errors and confidentiality. |
| Differentiators / defensible delay exposure | DF02 — Contract-based exposure and scenarios. | CR03, CR02, FD02 and approved contract/calendar inputs. | L | Same complete inputs reproduce estimate; incomplete rates stay unavailable. | Missing terms and double-counted charges. |
| Differentiators / manufacturing trace | DF03 — Production evidence and RED reconciliation. | CR04, CR07, FD02. | L | Material variance links to actual movements and reviewed RED correction. | Ambiguous yield/waste/legal treatment. |
| Differentiators / rule change control | DF04 — Full rule lifecycle, qualification and impact scanning. | CR01, CR05 and FD02; early registry already in use. | L | New rule identifies affected records without rewriting posted history. | Incorrect legal interpretation or effective dates. |
| Differentiators / grounded decisions | DF05 — Cited advisory, scans and reviewable recommendations. | CR04–CR05, DF01, DF03–DF04 and FD02. | L | Every factual recommendation is grounded or marked unknown; no executing model output. | Unsupported advice and retrieval leakage. |
| Differentiators / supported connectivity | DF06 — Documented adapters and scoped machine API. | CR02, CR04, CR07 and FD01–FD02. | L | Contract fixture and replay tests pass; unverified provider stays disabled. | Provider access, credentials and outcome ambiguity. |
| Polish / usable daily work | PL01 — Accessible French UX, saved views and controlled draft sync. | Released core screens; design/accessibility primitives start in foundation. | L | Keyboard, French-copy, interrupted field workflow and conflict tests pass. | Offline privacy and device constraints. |
| Polish / credible operations | PL02 — Public claims, documentation, reporting, license/usage and production runbooks. | Actual enabled capabilities; FD02/FD03 export and all cross-cutting gates. | L | Isolated restore, release readiness and evidence-backed published capability list. | Unapproved commercial/SLA terms and recovery gaps. |

Foundation milestone exits with secure synthetic end-to-end behavior. Broker pilot requires CR01–CR03, CR06 and relevant CR07 workflows plus operational gates. RED pilot requires CR04–CR05 and relevant CR07/production source evidence; production adjustment functionality requires DF03. A broker pilot can omit unreleased RED capabilities from navigation and claims. Differentiators activate individually only after their own evidence and provider/rule policies are approved. Final operational milestone validates the selected deployed scope, not hypothetical future capabilities.

### Execution order for developers

Create architecture records and shared schema/error/authorization packages first. Bootstrap identity, ResourceRecord, reviews, audit and outbox together, then documents and reference staging. Implement each business module vertically: migration and constraints → domain state/calculation services → transaction/approval commands → API contracts → French screens → invariant and user-journey tests → operational runbook. Commit opening balances only after the owning domain adapter passes its tests. Add extraction/advisory/integrations after deterministic domain services; they call proposal interfaces and cannot bypass them.

Maintain a delivery ledger with `module_id,requirement_id,implementation_ref,test_ref,status,blocking_policy_keys,reviewer,decision_ref`. Allowed statuses: `planned/in_progress/code_complete/acceptance_pending/released/blocked`. A policy dependency is visible rather than replaced by a developer guess. Dates, staffing, budget and pilot organization are **assumption to verify** and deliberately absent.
