# Dossier Clair — implementation specification

## Shared product and engineering contract

Source of truth: [competing product strategy and roadmap](./sources/competing-product-strategy-roadmap-prompts.md). This specification refines its FD01–PL02 items; it does not add a marketplace, ERP or official filing platform. Specification date: 12 September 2026.

**Language:** specifications, schema identifiers and API identifiers are English. Every user-visible label, validation message, notification, email and generated explanatory report text is French. Original customer/source documents retain their language. Arabic translation is deferred pending verified need; prepare the architecture without publishing untranslated screens.

**Decision versus unknown:** schema, workflow and stack choices below are explicit implementation decisions. Unknown legal, financial, commercial and capacity values are marked **assumption to verify**. They become versioned configuration requirements with a defined unavailable/blocked behavior. Developers can implement and test these behaviors without choosing an undocumented business value. Production activation of the affected capability requires an approved value; completing code does not resolve a policy unknown.

Identifiers, protocol status codes, schema versions, cardinalities and algorithmic invariants are specifications, not invented business statistics. No delivery dates, tariff amounts, statutory durations, SLA targets or performance promises are supplied.

### Scope and boundaries

In scope: identity/mandates; evidence, approvals and history; migration/master data; broker dossiers; costs/billing/payment recording; transport handoffs; deterministic RED ledger/BOM/clearance; obligations/guarantees; client actions; documented file reconciliation; reviewed extraction/contradictions; contract cost scenarios; production reconciliation; rule impact review; grounded advisory; limited API/adapters; accessible French UI; deployment, documentation and operational reporting.

Out of scope: tenant infrastructure, organization switching, shared cross-customer data; full general ledger/ERP/payroll; credit/lending and payment execution; freight marketplace; GPS hardware/tracking network; automatic legal interpretation; unattended customs filing or guarantee release; creating official mandates; circumventing third-party MFA; private-message scraping; electronic-signature certification; automatic customer-document training; guaranteed savings or compliance certification. A recorded approval is an application decision, not a legally certified signature.

### Architecture and stack — implementation decision

Use a modular monolith with separate web/API/worker processes and one dedicated data environment per operating organization. No tenant table, tenant ID, shared organization data partition, tenant provisioning or workspace selector. A singleton installation configuration holds the operating organization's identity; counterparties are business records. Distinct operating organizations require separate deployments. Development/staging/production are separate environments, not tenants.

| Layer | Selected implementation | Boundary |
|---|---|---|
| Web | Next.js, React and TypeScript; French message catalog; semantic accessible components | Public site, staff app and client portal share a design system, not authorization assumptions. No business secrets in browser code. |
| API | NestJS/TypeScript REST with generated OpenAPI and runtime DTO validation | Authoritative permission, state and calculation checks; browser actions call these services. [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction) supports contract generation. |
| Persistence | PostgreSQL; SQL migrations through Drizzle; exact numeric arithmetic | Domain tables belong to modules. Cross-module reads through services; no direct foreign-module mutations. |
| Documents | Private S3-compatible object storage; version-specific immutable keys; malware scanning | All reads pass current authorization; no publicly readable bucket. |
| Identity | Dedicated Keycloak instance/realm per installation, OIDC authorization-code flow with PKCE; Google/Microsoft brokering when configured | Keycloak owns passwords, MFA and credential recovery. Application owns resource permissions. [Keycloak OIDC](https://www.keycloak.org/securing-apps/oidc-layers). No custom password database. |
| Session | API-managed opaque server-side sessions in PostgreSQL; secure HttpOnly cookies | Browser never stores access/refresh tokens in localStorage. API refreshes tokens securely and enforces current local user/grants. |
| Jobs | PostgreSQL job/outbox tables, worker leases, idempotent handlers | Queue claiming may use SKIP LOCKED; business balance checks must not skip locked rows. [PostgreSQL SELECT](https://www.postgresql.org/docs/current/sql-select.html). |
| Retrieval | PostgreSQL full-text search; optional pgvector and provider adapters for DF05 | Embeddings/chunks inherit evidence access rules; vector/model dimensions depend on selected provider. |
| Tests | Unit/property tests, real PostgreSQL integration tests, Playwright end-to-end, OpenAPI contract validation | Reuse supported repository test tooling if it already fulfills these contracts. |
| Deployment | OCI containers, reverse proxy, dedicated database/object store/identity; Compose for local and supported single-host installs | Production topology follows verified capacity/recovery requirements. No mandatory Kubernetes estate. [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting). |

Exact dependency versions, infrastructure sizing and hosting provider are **assumption to verify** at bootstrap. Select mutually compatible supported stable releases, pin lockfiles/images by digest, record an architecture decision and scan dependencies. If an existing repository already meets these contracts, retain it and document equivalence rather than rewriting purely to match named libraries.

Suggested monorepo layout: `apps/web`, `apps/api`, `apps/worker`, `packages/contracts`, `packages/domain`, `packages/ui`, `packages/adapters`, `db/migrations`, `infra`, `tests/fixtures`. All posted mutations and their audit/outbox records commit in one database transaction. Cross-module calls remain in that transaction where an invariant spans modules.

### Shared data dictionary

All entities have `id: UUID` generated server-side, `created_at: Instant`, `created_by: UserRef|SystemActor`, `updated_at: Instant`, `version: bigint`. Mutable updates increase version atomically. Immutable records retain the common fields but cannot update content. IDs are opaque; human business references are separate. Fields are required unless marked `?`; optional `?` permits null. Parent references are foreign keys, not free strings. State/enumeration codes are English in storage, mapped to French in UI. No business record stores an organization/tenant foreign key.

| Type | Exact contract |
|---|---|
| Text / Code | Unicode NFC; trim outer whitespace for codes, retain original source value separately. Reject empty required values. Do not strip punctuation from official identifiers without an approved normalization rule. |
| Instant / Date | UTC timezone-aware timestamp / calendar date. Display in installation business timezone, initially proposed Africa/Casablanca; confirm at setup. Never calculate legal days by adding fixed UTC hours. |
| Decimal | JSON string, PostgreSQL NUMERIC; finite exact base-ten value; no floats or scientific notation at external API boundary. |
| Money | `{amount: Decimal, currency_code: Currency.code}`. Precision/rounding from reviewed CurrencyPolicy. No currency conversion without an explicit FX version. |
| Quantity | `{value: Decimal, unit_id: Unit.id}`. Precision and conversion from reviewed unit rules. Zero is allowed for derived balances; required transaction quantities must be positive. |
| ResourceRef | `{kind: registered ResourceKind, id: UUID}`. Backed by `ResourceRecord(id,kind,parent_id?,counterparty_id?,classification)` and a concrete domain row using the same id; validate FK/resource kind. Prevent dangling polymorphic references. |
| EvidenceRef | `{document_version_id: UUID, locator?: {page_label?:Text, field_path?:Text, excerpt?:Text}}`; locators must point to the source, not fabricated positions. |
| SnapshotRef | `{resource: ResourceRef, version: bigint, content_digest: Text}`. Canonical serializer defined in shared contracts; sort keys, preserve Decimal strings, omit no required field. |
| JSON | Only where a named schema/version is specified; reject undeclared keys. Never use untyped JSON for quantities, money, permissions or ledger entries. |

Relational deletion policy: referenced records cannot hard-delete. Draft business records are cancelled or archived; immutable postings are corrected by reversal/new entries. Privacy deletion follows FD02 retention/legal-hold workflow with minimal lawful tombstones. Unique constraints are named in module sections; all foreign keys indexed. Index frequent access by parent/client/status/owner/due date and stable sort key. All list predicates include access control before pagination/aggregation.

Cross-module relation spine:

`Counterparty → Dossier → DeclarationVersion / Blocker / ClientRequest / CostItem / DeliveryOrder`; `RedProject → ImportLot / ExportFlow → AllocationProposal → LedgerTransaction`; `BomVersion + ProductionBatch → ProductionReconciliation`; `RuleVersion + EvidenceVersion → ReviewRequest → ApprovalDecision → posted command`; `Obligation → GuaranteeRequest → ExternalObservation`; documents attach through `ResourceEvidence`; all resources register in `ResourceRecord` for permissions/history.

### Authorization contract

Effective access = active authenticated user + explicit capability + resource scope + data classification + current module availability. Deny by default. Fixed capability bundles below may be combined by an authorized administrator; combination does not bypass separation-of-duty checks. No self-granting privileged role; changes to administration/approval powers require a different authorized approver. Initial operator provisions the initial administrators out of band, with an audited bootstrap record, then disables bootstrap.

| Role code | UI label | Allowed responsibility; exclusions |
|---|---|---|
| `access_admin` | `Administration des accès` | Users, grants, role assignments and identity settings. No automatic dossier/document/finance read or business approval. |
| `operations_manager` | `Responsable d'exploitation` | Assigned operational dossiers, workload, handoffs, client requests and operational overrides. No automatic financial or regulatory approval. |
| `dossier_agent` | `Agent de dossier` | Create/edit assigned draft dossiers, documents and tasks; submit for review. Cannot approve declarations or post financial/RED records. |
| `declarant_reviewer` | `Déclarant habilité` | Review declaration evidence, official observations and applicable mandates within scope. Cannot approve own submitted business change. |
| `finance_operator` | `Comptabilité` | Draft costs/invoices/receipt records and propose allocations. No invoice issue or receipt/allocation confirmation. |
| `finance_reviewer` | `Responsable financier` | Approve costs, issue invoices/corrections and confirm monetary postings. No payment execution. |
| `dispatcher` | `Coordination transport` | Orders, missions, asset assignment and transport readiness within scope. |
| `field_agent` | `Agent terrain` | Acknowledge assigned missions and submit event evidence. Cannot assert official clearance or approve financial changes. |
| `red_operator` | `Gestionnaire RED` | Draft projects, flows, BOMs and allocation/reconciliation proposals. |
| `red_reviewer` | `Responsable conformité RED` | Approve reviewed RED postings and obligation closure within scope. |
| `production_contributor` | `Production et stock` | Submit actual production movements/evidence; no customs posting. |
| `rule_reviewer` | `Référent réglementaire` | Approve rule applicability/version and assess change impact; qualification recorded, not inferred from role alone. |
| `auditor` | `Audit` | Read explicitly scoped records, decision history and evidence exports; no mutations. |
| `platform_operator` | `Exploitation technique` | Configuration/health/restore/license operations; application permissions do not grant business-content read. Host administrators remain technically privileged and subject to organizational controls. |
| `external_contact` | `Contact client` | Explicitly shared dossiers and assigned requests/invoices. Client membership alone grants nothing. |
| `external_approver` | `Approbateur client` | Additionally approves exact assigned client instruction/cost snapshots; never acts as internal declarant/finance/RED reviewer. |

Staff access scopes: explicit assigned resources or an explicitly granted `all_operational_records` scope limited to the role's capabilities. External scopes: `ResourceGrant(user_id,resource_id,actions,valid_until?)`; grants may inherit to permitted child records only when `client_shareable=true`. `restricted` documents require a separate explicit grant even for general dossier readers. `internal` records never inherit external access. A record attached to several parents requires permission for the requested context; generated combined evidence/reports require access to every included record and never publish a broader copy. Recheck authorization on every download/job delivery and invalidate caches after revocation. Management aggregates never reveal unauthorized totals.

Default approval policy is independent reviewer: submitter cannot approve their own controlled action. This is a product decision, not a legal claim. An alternative policy is **assumption to verify** and is not implemented as an ad hoc override. With no eligible reviewer, keep the item pending and show `Aucun approbateur habilité n'est disponible.`

### Universal state, approval and consistency rules

Review states: `draft` (`Brouillon`) → `submitted` (`À vérifier`) → `approved` (`Approuvé`) / `rejected` (`Refusé`) / `changes_requested` (`À corriger`); later relevant changes mark unconsumed approval `stale` (`À réexaminer`). A new version requires a new review. Cancelling does not delete history.

Controlled command flow: validate body → authorize all targets → verify `If-Match` → lock relevant rows in stable ID order → recheck inputs, rule/evidence versions and approval → apply changes → mark approval consumed for the exact command → append audit + outbox → commit → return. A previously consumed approval cannot authorize another effect. A posted transaction does not silently disappear when evidence changes; create an impact issue and require an approved correction. No long-running network call inside a business transaction.

External states are independent: `not_submitted` (`Non transmis`), `prepared` (`Prêt à transmettre`), `submitted` (`Transmis`), `acknowledged` (`Réception confirmée`), `accepted` (`Accepté par l'organisme`), `rejected` (`Rejeté par l'organisme`), `unknown` (`Statut externe inconnu`). A local export or uploaded screenshot is not automatically accepted evidence; an authorized reviewer verifies manual evidence or a documented adapter authenticates it. Each external observation stores actor/source, observed time, received time and evidence.

### REST/API contract applying to every module

Base `/api/v1`. These are **new internal product endpoints**, not claimed PortNet/BADR endpoints. Browser access uses same-origin session+CSRF; partner service access is DF06 and uses scoped machine identity. CORS denies unconfigured origins. Command endpoints require `Idempotency-Key`; updates/commands on existing resources also require `If-Match` using the version ETag. CSRF and auth headers are omitted from module tables for readability, not optional.

- `GET /collection`: `{items:[ReadDTO],next_cursor?:Text}`. Common filters `status`, `counterparty_id`, `owner_id`, `updated_after`, and module-listed fields; reject unsupported filters. Stable sort `created_at,id`, configurable allowlisted alternatives. Cursor binds filter/sort/user scope; no page counts that leak private data. Page-size default/maximum are deployment requirements, **assumption to verify**, not hard-coded business values.
- `GET /collection/{id}`: permission-filtered DTO + ETag. `POST /collection`: create DTO from entity fields excluding generated/derived/state/actor fields; nullable fields optional; explicit module notes override draft requirements. Return `201` + resource. `PATCH`: allowlisted mutable draft fields only; absent means unchanged, null allowed only for `?`; array child replacement is atomic and retains IDs for retained rows.
- Commands return `200` updated resource/effect reference, or `202 {job_id,status_url}` when asynchronous. No arbitrary state PATCH. No generic public delete endpoint. Cancellation/archive uses an explicit command with a reason.
- Idempotency uniqueness `(principal,method,path,key)`. Same key+same canonical body returns the original durable result; different body returns `409 IDEMPOTENCY_CONFLICT`. Concurrent in-flight duplicate returns `409 REQUEST_IN_PROGRESS` with safe retry guidance. Business unique external IDs additionally protect retries after idempotency record retention.
- Module API tables specify additional command fields; `approval_id` refers to FD02 and `reason:Text` is nonempty. DTO relation IDs are validated by type, existence and authorization, not trusted from clients.
- Error object: `{code:Text,message_fr:Text,field_errors:[{field_path,code,message_fr}],retryable:Boolean,request_id:UUID,details?:SafeDTO}`. Never include secrets, raw SQL or unauthorized record facts. HTTP: `400` malformed, `401` unauthenticated, `403` missing capability, `404` absent/inaccessible scoped resource, `409` business/idempotency conflict, `412` stale ETag, `413` configured file limit, `415` unsupported format, `422` semantic/missing-policy validation, `428` absent precondition, `429` configured rate limit, `503` dependency unavailable. Numeric codes are protocol semantics.

| Error code | French copy |
|---|---|
| REQUIRED | `Ce champ est obligatoire.` |
| INVALID_REFERENCE | `La référence sélectionnée n'est pas disponible.` |
| FORBIDDEN | `Vous n'êtes pas autorisé à effectuer cette action.` |
| NOT_FOUND | `Cet élément est introuvable ou inaccessible.` |
| VERSION_CONFLICT | `Cet élément a été modifié. Rechargez-le avant de continuer.` |
| POLICY_REQUIRED | `Configuration à valider : {libellé}. Cette action n'est pas disponible.` |
| APPROVAL_REQUIRED | `Une validation habilitée est nécessaire.` |
| APPROVAL_STALE | `Les données ont changé depuis la validation. Un nouvel examen est nécessaire.` |
| EXTERNAL_EVIDENCE_REQUIRED | `Ajoutez une preuve vérifiée de la décision de l'organisme.` |
| DUPLICATE | `Un enregistrement correspondant existe déjà. Consultez-le avant de continuer.` |
| DEPENDENCY_UNAVAILABLE | `Le service requis est indisponible. Votre saisie a été conservée.` |
| NO_DATA | `Aucune donnée disponible pour cette sélection.` |

All visible enum labels and module-specific errors extend this catalog. Unknown required policy appears to users in French as `À confirmer`; the English requirement register retains **assumption to verify**.

### Information architecture

Staff navigation: `Mon travail`, `Dossiers`, `Transport`, `Finances`, `Régimes économiques`, `Échéances et garanties`, `Clients et référentiels`, `Documents`, `Rapprochements`, `Assistant`, `Rapports`, `Administration`. Show only enabled, permitted modules. No organization selector. A client filter says `Client`, never `Espace de travail`.

Client navigation: `Mes actions`, `Mes dossiers`, `Mes factures`, `Notifications`, `Mon compte`. Public: `Accueil`, `Solutions`, `Fonctionnalités`, `Offre et déploiement`, `Documentation`, `Questions fréquentes`, `Contact`, `Se connecter`. Detail screens use French breadcrumbs, visible record reference, status, owner, next action and history. Screen routes and field labels are enumerated in each module below.

### Required policy register and fail-closed behavior

Store `PolicyRequirement(key,scope_module,label_fr,schema,status,value?,evidence_refs[],approved_by?,approved_at?,effective_from?)`. States `unresolved/proposed/approved/superseded`. Only approved versioned values are usable; do not deploy placeholder production values. Critical configuration failing schema validation prevents activation of that capability, not unrelated manual work.

| Unknown — assumption to verify | Owner to supply/approve | Buildable behavior while unknown |
|---|---|---|
| Supported regimes, document applicability, duties/tax/valuation, permitted RED discharges, deadlines/extensions | Qualified regulatory reviewer | Draft data allowed; affected official preparation approval/posting/calculation blocked. |
| Invoice numbering/tax/rounding, currency scales, FX source, pass-through treatment | Finance reviewer | Draft amounts preserved; issue/conversion/margin requiring missing rule blocked or marked unavailable. |
| Carrier free time, tier rates, clock/calendar and overlap rules | Commercial/transport reviewer | Track events; no estimated charge without complete approved contract inputs. |
| Production units, BOM yields and allowed exception treatment | Production + RED reviewer | Preserve observed movements; no automatic customs adjustment. |
| Identity session/assurance durations, upload limits, retention/holds, AI destinations and legal bases | Security/privacy owner | Production activation blocked for relevant subsystem; local tests use explicitly synthetic configuration. |
| File schemas, API credentials/contracts, notification destinations | Integration owner | Offline/file draft review and named fake adapters only; no claim of live connectivity. |
| Capacity, latency, recovery, support/availability objectives, region and pricing/license conditions | Service owner | Instrument measurements and run variable-load tests; do not advertise or pass production readiness without approved targets. |

Module-specific requirements reference these keys rather than replacing unknowns with developer guesses.
