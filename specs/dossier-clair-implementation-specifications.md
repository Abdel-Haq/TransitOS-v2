# Dossier Clair — full implementation plan and specifications

Specification date: 12 September 2026. Single tenant only. English specifications; French UI labels and copy.

[Separate module files and source documents](./README.md)

## Document map

- Shared scope, architecture, role matrix, data conventions, API behavior and required policy register.
- FD01–FD03: foundation modules.
- CR01–CR07: core operational modules.
- DF01–DF06: differentiators.
- PL01–PL02: usability and launch operations.
- Cross-cutting security, non-functional requirements, environments, deployment, testing and phased delivery.
- Supplemental data schemas, action permissions, client projections and API completion rules.

---

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

---

## FD01 — Identity, access and mandates

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Foundation; L. Dependencies: shared contract; FD02 supplies evidence/review services. Bootstrap schema and identity can precede FD02, but privileged grant and mandate-verification commands activate only when those services exist. Single tenant only. Credential ownership remains in the dedicated identity provider; business permissions remain in this application.

### Scope, stories and permissions

- As an administrator, I invite an individually identifiable staff member and assign a reviewed role/scope so responsibility is attributable.
- As a client contact, I sign in and see only explicitly shared records; another client membership cannot broaden access.
- As a declarant, I distinguish customs from PortNet mandate evidence before approving the applicable preparation step.
- As a user, I recover access and revoke sessions without losing dossier history.

Capabilities: `identity.read`, `identity.manage`, `grant.propose`, `grant.approve`, `mandate.write`, `mandate.verify`, `session.revoke`. `access_admin` owns identity/grant administration; a different `access_admin` approves privileged changes. `declarant_reviewer` verifies mandates; agents may draft them on accessible counterparties. Every user may read/revoke their own sessions. External contacts cannot manage organization identity or mandates. No login-as-user feature.

### Screens and French copy

| Route | Title; fields/actions |
|---|---|
| `/connexion` | `Se connecter`; `Adresse e-mail`, `Mot de passe`, `Rester connecté`, `Mot de passe oublié ?`, configured `Continuer avec Google` / `Continuer avec Microsoft`. Provider-hosted branded French forms. |
| `/recuperation` | `Récupérer l'accès`; provider flow; generic `Si un compte correspond à cette adresse, les instructions de récupération seront envoyées.` |
| `/compte/securite` | `Sécurité de mon compte`; `Authentification renforcée`, `Sessions actives`, `Révoquer cette session`. |
| `/administration/utilisateurs`, `/{id}` | `Utilisateurs et accès`; `Nom`, `Adresse e-mail`, `Type de compte`, `Rôles`, `Périmètre`, `Inviter`, `Suspendre`, `Proposer une modification`. |
| `/clients/{id}/mandats`, `/mandats/{id}` | `Mandats et habilitations`; `Type de mandat`, `Référence externe`, `Périmètre autorisé`, `Début de validité`, `Fin de validité`, `Dernière vérification`, `Justificatif`, `Soumettre à vérification`. |

Login return destinations are allowlisted same-origin paths. A user with no grants sees `Aucun dossier ne vous a encore été attribué.` Suspended accounts cannot refresh or initiate sessions.

### Data model

All fields follow shared types/base columns; `?` means nullable.

| Entity | Fields and relations |
|---|---|
| User | `identity_subject:Text UNIQUE`, `email:Text`, `display_name:Text`, `account_type:staff/external`, `status:invited/active/suspended`, `locale:fr`, `last_login_at?:Instant`. Subject, not email, links identity. |
| RoleAssignment | `user_id→User`, `role_code:Role`, `scope:assigned/all_operational_records`, `valid_from:Instant`, `valid_until?:Instant`, `approval_id→ApprovalDecision`. Unique active equivalent assignment. |
| ResourceGrant | `user_id→User`, `resource_id→ResourceRecord`, `actions:Capability[]`, `inherit_shareable_children:Boolean`, `valid_until?:Instant`, `revoked_at?:Instant`, `approval_id?`. |
| CounterpartyMembership | `user_id→User`, `counterparty_id→Counterparty`, `status:active/revoked`; unique pair; membership is identity context, not access. |
| AppSession | `user_id`, `session_token_hash:Text UNIQUE`, `encrypted_provider_tokens:SecretRef`, `assurance:Text`, `auth_time:Instant`, `expires_at:Instant`, `revoked_at?:Instant`, `device_label?:Text`. |
| Invitation | `email`, `account_type`, `proposed_roles:Role[]`, `counterparty_id?`, `token_hash UNIQUE`, `expires_at`, `accepted_subject?`, `status:pending/accepted/expired/revoked`. |
| GrantChange | `target_user_id`, `before_snapshot`, `after_snapshot` using RoleGrantSchema, `review_request_id`, `status:draft/submitted/applied/rejected/stale`. |
| Mandate | `counterparty_id`, `kind:portnet/customs`, `external_reference?:Text`, `scope_codes:Text[]`, `valid_from?:Date`, `valid_until?:Date`, `external_limit?:Decimal`, `verified_remaining?:Decimal`, `verified_at?:Instant`, `verification_valid_until?:Instant`, `evidence_version_id`, `status:draft/pending/verified/revoked/rejected`, `approval_id?`. Limit data is externally observed, not locally presumed. |

### States, rules, validations and failures

Identity invitation is pending until provider verifies account ownership and binds the exact subject. Do not auto-link SSO by email; conflicting subject returns `IDENTITY_LINK_REVIEW` / `Ce compte nécessite une vérification de son identité.` Session expiries/assurance windows are approved configuration, **assumption to verify**; missing production policy blocks login activation. Recovery/MFA enrollment and credential change use provider endpoints/themes, never custom forms that store passwords in application DB.

Mandate draft→pending→verified/rejected; verified→revoked. Effective view is `À vérifier`, `Valide`, `Expiré`, `Révoqué`, `Périmètre insuffisant` or `Vérification périmée`. `verified` requires independent reviewer, evidence, known required coverage and explicit validity basis. Null end date is valid only if reviewed source says no expiry; absence is unknown. Time/limit freshness policy is required to claim operational sufficiency. Local use does not decrement an official-system counter; record local preparation separately. Type substitution prohibited. Invalid ordering of dates is rejected; missing/expired evidence blocks only mandate-dependent controlled actions.

Suspension/revocation removes current session/grant authority immediately at API check; pending notifications and background jobs must reauthorize. User records with history cannot delete. A disabled provider shows `Connexion externe indisponible. Utilisez le mode de connexion autorisé.` only if an authorized alternative exists.

### API and command contracts

All `/api/v1` unless stated; shared DTO/precondition conventions apply.

| Endpoints | Payload / result; capability |
|---|---|
| `GET /auth/login`, `GET /auth/callback` | OIDC redirect/callback with state, nonce, PKCE; callback establishes opaque cookie, returns safe redirect; no arbitrary redirect input. |
| `POST /auth/logout`; `GET /auth/session`; `GET /me/sessions`; `POST /me/sessions/{id}/revoke` | Empty logout; revoke `{reason}`; own-session responses redact tokens. |
| `GET /users`, `GET /users/{id}`; `POST /invitations` | Invitation `{email,account_type,proposed_roles,counterparty_id?}`; `identity.manage`. |
| `POST /users/{id}/suspend`; `POST /users/{id}/reactivate` | `{reason,approval_id}`; session revocation occurs atomically with status change. |
| `POST /grant-changes`; `POST /grant-changes/{id}/submit`; `POST /grant-changes/{id}/apply` | Create `{target_user_id,after_snapshot,reason}`; apply `{approval_id}`; independent review. |
| `GET/POST /mandates`; `GET/PATCH /mandates/{id}` | Mandate draft DTO; filter `counterparty_id,kind,effective_status`; `mandate.write` for mutations. |
| `POST /mandates/{id}/submit`; `/verify`; `/revoke` | Submit `{}`; verify `{approval_id,verified_at,verification_valid_until}`; revoke `{reason,evidence_version_id}`. |

### Acceptance tests and exit

Test client A requesting client B metadata/files/search totals; administrator without business scope; self-grant rejection; unverified SSO collision; expired invitation; replayed recovery token at provider; revoked session/queued export; wrong mandate type; missing end-date basis; stale observed usage limit. Exit: configured identity round trip and French error states work with no role/resource bypass. External credentials and official mandate creation remain out of scope.

---

## FD02 — Evidence, approvals and decision history

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Foundation; L. Depends on FD01 identity. Implements shared evidence/review/job services used everywhere. Single tenant; no tenant IDs or workspace switching. Stories: an agent can identify the accepted document version; a reviewer can inspect exact inputs before approval; an auditor can reproduce a decision; an operator can restore coherent database/files.

### Screens and permissions

`/documents` → `Documents`; `/documents/{id}` → `Versions et utilisations`; `/validations` → `Validations en attente`; `/validations/{id}` → `Examiner la demande`; `/historique/{resource_id}` → `Historique des décisions`; `/administration/conservation` → `Conservation et gels`; `/administration/taches` → `Traitements en arrière-plan`.

Fields: `Type de document`, `Nom du fichier`, `Version`, `Origine`, `Dossier associé`, `Visibilité`, `Motif de remplacement`, `Utilisations concernées`. Actions: `Ajouter un document`, `Comparer les versions`, `Demander une validation`, `Approuver`, `Demander une correction`, `Refuser`, `Exporter les preuves`. Empty copy: `Aucun justificatif n'a été ajouté.`

Capabilities: `evidence.read/write/share`, `review.submit/decide`, `history.read`, `retention.manage`, `job.operate`. Dossier agents contribute in scope; the owning domain's reviewer decides, not every user with a generic review page. Sharing requires the domain owner and classification permission. Auditor reads explicit scope. Platform operator sees health/metadata, not document contents.

### Entity specification

| Entity | Fields / constraints |
|---|---|
| ResourceRecord | `kind`, `parent_id?`, `counterparty_id?`, `classification:internal/client_shareable/restricted`; same id as registered concrete domain entity; parent graph acyclic. |
| Document | `document_type:DocumentType.code`, `display_name`, `current_version_id?`, `classification`, `archived_at?`. |
| DocumentVersion | `document_id`, `previous_version_id?`, `object_key UNIQUE`, `sha256`, `original_name`, `detected_mime`, `byte_length`, `uploaded_by`, `source:upload/email/import/generated`, `source_reference?`, `scan_status:pending/clean/quarantined/failed`, `review_status:unreviewed/accepted/rejected/superseded`, `replacement_reason?`; immutable bytes/metadata. |
| ResourceEvidence | `resource_id`, `document_version_id`, `purpose:Text`, `required_by_rule_version_id?`, `accepted_decision_id?`, `shareable:Boolean`; unique resource/version/purpose. |
| EvidenceDependency | `source_ref:SnapshotRef`, `consumer_ref:SnapshotRef`, `dependency_paths:Text[]`, `dependency_kind:data/rule/evidence`; no dependency cycles. |
| ReviewRequest | `target_ref`, `action_code`, `payload_snapshot:VersionedCommandDTO`, `payload_digest`, `input_refs:SnapshotRef[]`, `reviewer_capability`, `submitted_by`, `state:draft/submitted/decided/cancelled/stale`, `reason?`. |
| ApprovalDecision | `request_id`, `decision:approved/rejected/changes_requested`, `reviewer_id`, `decided_at`, `reason?`, `bound_digest`, `consumed_effect_id?`; immutable. One final decision per submitted request. |
| AuditEvent | `actor_id`, `action_code`, `resource_ref`, `occurred_at`, `request_id`, `before_digest?`, `after_digest?`, `changed_paths:Text[]`, `reason?`, `related_refs[]`; append-only for app DB role. |
| Job / OutboxEvent | Job: `handler_type,payload_schema,payload,dedupe_key UNIQUE,status,lease_owner?,lease_until?,attempts,next_attempt_at?,error_code?,result_ref?`; outbox: `event_type,aggregate_ref,payload_schema,payload,processed_at?`. |
| RetentionHold | `resource_id`, `reason`, `authority_evidence_id`, `started_at`, `released_at?`, `released_by?`. |
| PurgeRequest | `resource_id`, `policy_version_id`, `review_request_id`, `state:proposed/blocked/approved/executed`, `executed_at?`, `tombstone_ref?`. |

### Workflows and rules

Upload allocation→stream to quarantine→verify declared/detected content/length/hash→scan→clean/rejected. Unscanned content cannot preview, download, enter extraction or notify a client. Scan failure is `Contrôle du fichier indisponible. Le document reste en quarantaine.`; retry does not duplicate DocumentVersion. Support PDF, common image and approved structured import files through configured MIME allowlist. Active content/macro files disabled unless separately approved policy; exact limits are **assumption to verify**.

Identical hash within the same dossier prompts reuse of an existing authorized version; do not reveal matches on inaccessible resources. No physical cross-client dedup disclosure. New invoice amendment becomes another version; old accepted usage is preserved. Changing sources computes transitive dependency impact: unconsumed approvals become stale; posted consumers get an impact issue, not an automatic reversal. General note edits do not invalidate unrelated totals; dependency_paths specify relevant inputs.

Submit freezes target/action/payload/inputs. Approve requires independent reviewer with domain permission and clean required evidence. A downstream command atomically consumes approval after rechecking versions and digest. Rejection/change request requires reason. A generic approval endpoint never posts domain records. Job progress labels: `En attente`, `En cours`, `Terminé`, `Échec`, `Annulé`. Lease expiry permits retry; transactional effects remain protected by business idempotency.

Purge needs approved retention policy, no hold, review and controlled removal across object/index/cache/backups lifecycle. Policy duration, lawful tombstone content and backup deletion obligations are **assumption to verify**. While unresolved, production storage activation is gated by privacy policy; deletion cannot guess a duration. Existing records are not destroyed. Export package contains manifest, original/authorized versions, checksums, decisions and unresolved issues; download rechecks grants.

### API

| Endpoints | Contract |
|---|---|
| `POST /document-uploads` | `{resource_id,document_type,filename,mime,byte_length,previous_version_id?,replacement_reason?}` → upload id and authenticated upload route. |
| `PUT /document-uploads/{id}/content`; `POST /document-uploads/{id}/complete` | Binary streaming; complete `{client_checksum?}` → `202 job_id`; server independently verifies. |
| `GET /documents`; `GET /documents/{id}`; `GET /documents/{id}/versions` | Current authorized version metadata and usages. |
| `GET /document-versions/{id}/content` | Stream only clean authorized bytes; private no-store; never return permanent public URLs. |
| `POST /resource-evidence` | `{resource_id,document_version_id,purpose,shareable}`; attach authorization on both endpoints. |
| `POST /reviews`; `GET /reviews`; `GET /reviews/{id}`; `POST /reviews/{id}/submit` | ReviewRequest create contract; submit freezes digest. |
| `POST /reviews/{id}/decisions` | `{decision,reason?}` → immutable decision; verify capability from stored request, not caller input. |
| `GET /resources/{id}/history`; `POST /resources/{id}/evidence-exports` | Export `{as_of?,include_refs[]}` → job; fail if any requested ref inaccessible. |
| `GET /jobs/{id}`; `POST /jobs/{id}/retry`; `/cancel` | `{reason}`; only supported handler cancellation; cannot undo committed effect. |
| `POST /retention-holds`; `POST /retention-holds/{id}/release`; `POST /purge-requests`; `/purge-requests/{id}/execute` | Release/execute require reason/evidence/approval. |

### Test/exit contract

Test upload interrupted/retried, disguised MIME, malware/scanner outage, unauthorized checksum match, changed approval digest, concurrent approval consumption, cascade invalidation, posted-history preservation, held deletion and export after revocation. Restore a synthetic DB/object snapshot and validate every manifest object. No production live provider is needed to complete deterministic tests.

---

## FD03 — Reference data, migration and search

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Foundation; L. Depends on FD01–FD02; financial/RED opening-balance commit adapters become available with CR02/CR04. Foundation can validate/stage these records before those modules exist. Single tenant. Stories: an intake agent reuses accurate client/office references; an operator previews a migration and reconciles balances; an auditor finds original identifiers after cutover.

### Screens and permissions

`/referentiels/clients` (`Clients`), `/referentiels/partenaires` (`Partenaires`), `/referentiels/bureaux` (`Bureaux de douane`), `/referentiels/articles` (`Articles et unités`), `/recherche` (`Rechercher`), `/administration/imports` (`Imports et migration`), `/administration/imports/{id}` (`Contrôler l'import`), `/administration/reprise` (`Reprise des données`).

Labels: `Raison sociale`, `ICE`, `Identifiant fiscal`, `Référence d'origine`, `Devise`, `Unité`, `Correspondance proposée`, `Lignes à corriger`, `Écart de reprise`, `Simuler l'import`, `Valider la reprise`, `Exporter mes données`. Unknown quantities display `Solde non confirmé`, never zero.

Capabilities: `reference.read/write/approve`, `migration.prepare/approve/commit`, `search.read`, `data.export`. Operations users edit draft references; reviewed reference activation uses the appropriate operations/RED/finance reviewer. Platform operator can run import processing but cannot authorize balances solely by technical role. Client contacts may propose their own company changes via CR06, not direct reference writes.

### Entities and fields

| Entity | Fields / relation |
|---|---|
| InstallationProfile | Singleton: `legal_name,address,registration_refs:Identifier[],business_timezone,base_currency_code?,enabled_modules:ModuleCode[],readiness_state`; no organization FK on transactions. |
| Counterparty | `legal_name,roles:(client/supplier/carrier/bank/broker/warehouse)[],identifiers:Identifier[],address?:Address,contact_refs[],status:draft/active/archived`; company identifier kind+normalized value unique when verified. |
| CounterpartyContact | `counterparty_id,display_name,email?,phone?,job_title?,portal_user_id?,status`; no implicit portal invitation. |
| CustomsOffice | `code UNIQUE,name_fr,authority_source,valid_from?,valid_until?,status`. |
| Currency / CurrencyPolicy | Currency `code UNIQUE,label_fr`; policy `currency_code,scale,rounding_mode,source_version_id,review_id`; unknown precision blocks posting. |
| Unit / ConversionRule | Unit `code UNIQUE,label_fr,dimension,allowed_scale`; conversion `from_unit_id,to_unit_id,factor:Decimal,material_id?,effective_from,source_version_id,review_id`. No cross-dimension conversions. |
| Material | `reference UNIQUE,description_fr,default_unit_id,classification_refs[],status`; SH suggestions never imply approved classification. |
| SourceIdentifier | `source_system,entity_kind,external_id,local_resource_id,mapping_version_id`; unique source/kind/external_id. |
| ImportMapping | `name,source_system,source_format,schema_version,field_mappings:MappingSchema,transform_rules:TransformSchema,review_id?,status`. Transforms allowlisted, not executable uploaded code. |
| ImportBatch | `mapping_version_id,document_version_id,file_hash,mode:reference/opening/operational,state:uploaded/validated/review_required/approved/committing/committed/failed/cancelled,review_id?,commit_effect_id?`. |
| ImportRow | `batch_id,row_key,raw_record:DeclaredSourceSchema,proposed_record:TargetDTO,issue_codes[],match_candidates[],resolution?,target_id?`; unique batch/row_key. |
| ReconciliationTotal | `batch_id,dimension:money/quantity,count_kind?,currency_code?,unit_id?,source_total?:Decimal,target_total:Decimal,difference?:Decimal,evidence_ref?,review_id?`. |
| CutoverRecord | `batch_ids[],source_snapshot_at,write_freeze_evidence_id,approved_manifest_id,state:prepared/approved/executed/aborted,executed_at?`. |

### Rules, validation and error cases

Draft client needs legal name; activate only with reviewed identifier requirements for intended workflows. Store original and normalized identifiers; normalization is defined per identifier kind, not guessed. Archive prevents new selection but keeps historical documents valid. Unit/FX/rule amendments create versions, not retroactive changes.

Import never silently creates zeros, rates or mandatory identifiers. Validate all rows and record every discrepancy before approval. Exact external identifiers match first; fuzzy matches are candidates only. Same content/mapping/source already committed yields the original batch effect. A different mapping version requires a new reviewed proposal referencing previous commit; it cannot blindly repeat insertions.

Commit references atomically per batch. Opening money/quantity posts must delegate to their owning ledger service with source references; no generic SQL overwrite. A failed domain commit leaves batch uncommitted and retry-safe. Large migration chunking requires an explicit staging ledger and final activation transaction; partial data must not appear live. Cutover requires approved opening totals by currency/unit, or explicit confirmed empty source; unknown totals block. Before live writes, rollback can discard staged activation; after live writes, rollback means reviewed corrective import/restore procedure, not erasing new work.

Search covers authorized exact business refs, client names, DUM refs, dossier metadata and clean permitted document text. Return `resource_kind,id,title_fr,matched_fields,context_label` and safe excerpt; filter ACL before count/rank/page. No inaccessible hints. Source adapters/formats and real opening totals are **assumption to verify**; ship synthetic CSV fixtures as product test formats, not claimed official imports.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /counterparties`; `GET/PATCH /counterparties/{id}`; `POST /counterparties/{id}/activate`; `/archive` | Draft fields; activate `{approval_id}`; archive `{reason}`; filter `roles,status`. |
| `GET/POST /customs-offices`; `GET/POST /materials`; `GET/POST /units`; `GET /currencies` | Typed entity DTO; draft reference writes require `reference.write`; changes via PATCH draft route and `/activate` command. |
| `POST /conversion-rules`; `POST /conversion-rules/{id}/activate` | Versioned conversion + `{approval_id}` activation. |
| `GET/POST /import-mappings`; `POST /import-mappings/{id}/activate` | Mapping schema; independently reviewed activation. |
| `POST /imports`; `GET /imports/{id}`; `GET /imports/{id}/rows` | `{document_version_id,mapping_version_id,mode}` → batch; page by row key. |
| `POST /imports/{id}/validate`; `/resolve`; `/commit` | Validate `{}` job; resolve `{row_key,resolution,target_id?,corrected_fields?,reason}`; commit `{approval_id}` job. |
| `GET /imports/{id}/totals`; `POST /cutovers`; `POST /cutovers/{id}/execute` | Create Cutover DTO; execute `{approval_id}`. |
| `GET /search?q=&kind=&counterparty_id=` | ACL-scoped results; query limits configured. |
| `POST /installation/exports` | `{scope:complete\|selected,resource_ids?}` → authorized export job; manifest records unsupported source fields. |

Errors: `AMBIGUOUS_MATCH` → `Plusieurs correspondances sont possibles. Sélectionnez la bonne référence.`; `OPENING_BALANCE_UNKNOWN` → `Le solde de reprise doit être confirmé.`; `UNIT_MISMATCH` → `Les unités ne sont pas compatibles.` Test malformed files, duplicated keys, float/rounding loss, duplicate batch concurrency, archived references, partial commit rollback, missing totals and private-search leakage. Exit: an authorized synthetic migration can be reconciled and exported with original IDs intact.

---

## CR01 — Dossier preparation and blocker workflow

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Core; L. Depends on FD01–FD03. Uses a minimal approved workflow/rule registry from this module; DF04 later adds change-impact administration. Single tenant. No direct customs filing.

### Stories, screens and authorization

An agent creates an import/export dossier with client, shipment and documents. A declarant reviews the exact article/value packet. A manager assigns a missing-document blocker and sees who must act. A field agent sees independent readiness evidence rather than a generic green status. A client-facing summary reveals only approved external wording.

Screens: `/travail` (`Mon travail`); `/dossiers` (`Dossiers`); `/dossiers/nouveau` (`Créer un dossier`); `/dossiers/{id}` (`Vue d'ensemble`); tabs `/declaration` (`Déclaration`), `/pieces` (`Pièces requises`), `/formalites` (`Formalités`), `/blocages` (`Blocages et actions`), `/historique` (`Historique`). Fields: `Référence`, `Client`, `Bureau de douane`, `Sens`, `Mode de transport`, `Régime`, `Responsable`, `Arrivée prévue`, `Désignation`, `Code SH`, `Quantité`, `Valeur`, `Devise`, `Origine de la valeur`. Actions: `Enregistrer le brouillon`, `Soumettre au déclarant`, `Attribuer une action`, `Signaler un blocage`, `Joindre la preuve`, `Clôturer le dossier`.

Capabilities `dossier.read/create/edit`, `declaration.submit/approve`, `workflow.assign/resolve/override`, `external_observation.verify`. Agent edits scoped drafts; operations manager assigns and resolves internal tasks; declarant reviews customs packets and verifies relevant official observations. Field agent contributes event evidence only. External contact reads published subset via CR06, never internal notes, margin or SH review discussion. An override cannot bypass mandatory approval, legal eligibility, negative quantity or missing official acceptance.

### Data model

| Entity | Fields / relationships |
|---|---|
| Dossier | `reference UNIQUE,counterparty_id,customs_office_id?,direction:import/export,transport_mode:sea/air/road/other,regime_rule_version_id?,owner_id,workflow_template_version_id,status:draft/open/closed/cancelled,expected_arrival?:Instant,shipment_id?,closed_at?,cancellation_reason?`. Draft may omit office/regime; activation cannot. |
| Shipment | `bill_of_lading_ref?,air_waybill_ref?,vessel_name?,voyage_ref?,origin_country?,destination_country?,gross_weight?:Quantity,volume?:Quantity,containers:ContainerRef[]`. |
| DeclarationVersion | `dossier_id,revision_ref,prior_version_id?,currency_code?,valuation_rule_version_id?,fx_rate_version_id?,status:draft/in_review/approved/stale,snapshot_digest,approved_decision_id?`; unique dossier/revision. |
| DeclarationLine | `declaration_version_id,line_ref,material_id?,description,sh_code?,regime_code?,quantity:Quantity,declared_value:Money,country_of_origin?,source_evidence_refs[]`; unique version/line_ref. |
| ValuationComponent | `declaration_version_id,kind:invoice/freight/insurance/adjustment,amount:Money,allocation_method:RuleCode,source_evidence_id,rule_version_id`; all component inclusion rules explicit. |
| CalculationResult | `target_ref,input_refs[],rule_version_ids[],fx_version_id?,line_results:CalculationSchema,total?:Money,state:complete/incomplete,missing_policy_keys[]`; immutable. |
| WorkflowTemplateVersion | `code,operation_applicability:PredicateSchema,steps:StepDefinition[],dependencies:DependencyDefinition[],review_id,status`; definitions use registered events/rules, no arbitrary code. |
| WorkflowStep | `dossier_id,template_step_key,title_fr,owner_id?,state:not_started/in_progress/waiting/ready/completed/not_applicable,counterparty_waiting_id?,completion_evidence_refs[],completion_decision_id?`. |
| Requirement | `step_id,kind:document/mandate/approval/external_event/data,rule_version_id,label_fr,expected_resource_kind,mandatory:Boolean,satisfied_by_ref?,state:missing/submitted/verified/stale/not_applicable`. |
| Blocker | `dossier_id,step_id?,title_fr,description_internal,client_message_fr?,owner_id,requested_from_id?,required_resolution:ResolutionSchema,severity:critical/warning/info,due_at?,state:open/acknowledged/resolved/reopened/cancelled,resolution_evidence_refs[],reason?`. |
| WorkEvent | `step_id,event:start/wait/resume/complete/reopen,occurred_at,actor_id,reason?,external_wait:Boolean`; append-only. |
| ExternalObservation | `resource_id,system_code,event_code,external_reference,evidence_version_id?,adapter_event_id?,observed_at,received_at,verification:pending/verified/rejected,supersedes_id?`. |

### Business rules, transitions and calculations

Dossier draft→open requires active client, applicable office/regime/template and assigned owner. Cancel requires reason; closed→open is a reviewed reopening, preserving original closure. Closing requires every mandatory workflow requirement satisfied or reviewed not-applicable, no blocking critical issue, and selected finance/logistics obligations resolved. Closure never closes separate RED/guarantee liabilities by implication.

Step prerequisites form a directed acyclic graph. Independent steps run in parallel. Ready is derived from current verified requirements. A user may start preparation before all requirements are met, but completion requires the step's rules. An unknown applicability creates `Applicabilité à confirmer` rather than treating the requirement optional. Mandatory official event requirements only accept verified ExternalObservation of the exact event, reference and scope. Carrier release, customs acceptance and terminal exit are separate event codes.

Declaration edits create/update draft versions; submit freezes them; approval through FD02 grants no official-system state. Relevant source changes produce stale review. Calculation engines use approved component inclusion, FX, tax and rounding rule versions; no hard-coded CIF formula where commercial terms change inclusions. Missing inputs return incomplete with no invented numeric total. SH structural checks use approved reference format; format validity is not legal classification approval.

Blocker must have an owner and concrete resolution schema. Acknowledgement does not resolve it. Resolve checks evidence/action completion; changing that evidence reopens the blocker. Counterparty due dates are proposed task targets, not statutory periods. Timers derive non-overlapping WorkEvents; active duration sums start/resume→wait/complete intervals; external waiting sums wait→resume/complete intervals. Missing transition evidence yields incomplete metric, not guessed elapsed work. Dashboard counts use distinct accessible dossiers; summing clients does not duplicate dossiers.

### API

| Endpoints | Command contract / result |
|---|---|
| `GET/POST /dossiers`; `GET/PATCH /dossiers/{id}` | Dossier draft DTO; filters direction/mode/client/office/owner/status/has_blocker; patch cannot set state. |
| `POST /dossiers/{id}/open`; `/close`; `/reopen`; `/cancel` | `{reason?,approval_id?}`; close/reopen require review and policy readiness; returns dossier + unmet requirements on semantic failure. |
| `GET /dossiers/{id}/workflow`; `POST /workflow-steps/{id}/events` | Event `{event,occurred_at,reason?,evidence_refs[]}`; derive ready/completed server-side. |
| `POST /requirements/{id}/evidence`; `/not-applicable` | Evidence `{resource_ref}`; not-applicable `{approval_id,reason,rule_version_id}`. |
| `GET/POST /dossiers/{id}/declarations`; `GET/PATCH /declarations/{id}` | Declaration draft + lines/components; child arrays validated atomically. |
| `POST /declarations/{id}/calculate`; `/submit`; `/approve` | Calculate `{}` returns CalculationResult; approve `{approval_id}` verifies result snapshot. |
| `GET/POST /blockers`; `GET/PATCH /blockers/{id}`; `POST /blockers/{id}/acknowledge`; `/resolve`; `/reopen` | Resolve `{resolution_payload,evidence_refs,reason}` conforms to stored ResolutionSchema; no arbitrary state changes. |
| `POST /external-observations`; `POST /external-observations/{id}/verify` | Observation DTO; verify `{approval_id}`; adapter observations use authenticated adapter path. |
| `GET /dashboards/operations`; `GET /dossiers/{id}/readiness` | Counts, work/wait metrics, ordered blockers and input freshness, no fabricated percentages. |

Errors: `DEPENDENCY_UNSATISFIED` → `Une condition nécessaire n'est pas remplie : {libellé}.`; `REQUIREMENT_UNKNOWN` → `L'applicabilité de cette pièce doit être confirmée.`; `WORKFLOW_CYCLE` → `Ces dépendances créent une boucle.` Tests: parallel/reopened steps, wrong external ref, unreviewed document, missing rules, stale calculation, cancellation with posted money, private dashboard aggregates. Exit: a manual broker case reaches internally closed with inspectable external evidence and no invented official action.

Applicable document lists, valuation formulas, tariff/tax rates, FX sources, official event semantics and workflow-specific required fields are **assumption to verify**. Draft capture remains available; affected readiness, calculation and approval actions return POLICY_REQUIRED until the relevant versioned policies are approved.

---

## CR02 — Cost recovery, billing and cash evidence

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Core; L. Depends on CR01, FD01–FD03. A focused receivables/cost subledger, not a general ledger, bank-payment engine or financial-advice system. Single tenant. Finance operator drafts, finance reviewer independently approves/posts; external approver can approve an assigned cost snapshot only.

### Stories and screens

An accountant connects each incurred cost to receipt, authorization and invoice; a reviewer issues a balanced invoice; a client sees exactly what they approved; a director distinguishes actual margin from estimates. `/finances/couts` (`Coûts et débours`), `/finances/couts/{id}` (`Détail du coût`), `/finances/prefacturation` (`Préfacturation`), `/finances/factures`, `/{id}` (`Factures clients`), `/finances/encaissements` (`Encaissements et avances`), `/finances/rapprochement` (`Lettrage`), `/finances/reglements-import` (`Justificatifs de règlement import`), dossier `/finances` tab (`Situation financière`).

Fields: `Client`, `Fournisseur`, `Poste de frais`, `Montant`, `Devise`, `Justificatif`, `Montant engagé`, `Montant constaté`, `À refacturer`, `Avance client`, `Échéance`, `Montant contesté`, `Montant non lettré`, `Motif de correction`. Actions: `Soumettre le coût`, `Préparer la facture`, `Émettre la facture`, `Enregistrer un encaissement`, `Proposer le lettrage`, `Préparer un avoir`.

Capabilities `cost.write/approve`, `invoice.write/issue`, `receipt.write/confirm`, `allocation.propose/post`, `finance.read`, `finance.export`. Margin is internal finance/management only. Customer-visible invoices/costs require explicit publication. Invoice issuance and confirmed receipt/allocations always consume separate approval; client approval is necessary only where policy/request says so and never substitutes internal approval.

### Entities and invariants

| Entity | Fields / relationships |
|---|---|
| CostItem | `dossier_id,supplier_id,category_code,cost_type:fee/pass_through/operating,estimated_amount?:Money,actual_amount?:Money,recoverable:Boolean,source_document_version_id?,supplier_invoice_ref?,external_source_id?,state:draft/in_review/approved/rejected/cancelled,client_approval_id?,internal_approval_id?`. |
| CostCommitment | `cost_id,amount:Money,approved_by_decision_id,expires_at?,supersedes_id?`; immutable versions. |
| Invoice | `counterparty_id,currency_code,document_type:invoice/credit_note,corrects_invoice_id?,draft_reference,issued_number?:Text UNIQUE,issue_date?:Date,due_date?:Date,policy_version_id,state:draft/in_review/issued/cancelled,approval_id?,total_net?:Decimal,total_tax?:Decimal,total_gross?:Decimal`. |
| InvoiceLine | `invoice_id,line_ref,dossier_id,cost_item_id?,description_fr,quantity:Decimal,unit_price:Decimal,tax_rule_version_id?,net:Decimal,tax:Decimal,gross:Decimal,source_allocation_id?`; cost billing uniqueness enforced by CostBillingAllocation. |
| CostBillingAllocation | `cost_item_id,invoice_line_id,amount:Money,status:reserved/posted/reversed`; sum active allocations cannot exceed approved billable amount unless reviewed policy explicitly authorizes fee markup. |
| Receipt | `counterparty_id,amount:Money,received_at,method_code,bank_reference?,source_evidence_id,purpose:invoice_payment/advance,external_event_id?,state:draft/in_review/confirmed/reversed,approval_id?`; external source/event unique when supplied. |
| PaymentAllocation | `receipt_id,invoice_id,amount:Money,state:proposed/posted/reversed,approval_id?,posted_at?`; receipt and invoice client/currency must match. |
| FinancePosting | `posting_kind:invoice_debit/credit_note_credit/receipt_credit/reversal,resource_id,amount:Money,effective_date,reverses_id?,approval_id`; immutable, per-resource effect uniqueness. |
| Dispute | `invoice_id?,cost_id?,counterparty_id,amount:Money,reason,evidence_refs[],state:open/in_review/resolved,reconciliation_action_ref?`. |
| ImportSettlementEvidence | `dossier_id,title_reference,domiciliation_reference?,supplier_id,currency_code,claimed_amount?:Decimal,imputed_amount?:Decimal,bank_reference?,evidence_refs[],status:incomplete/in_review/externally_confirmed,verification_decision_id?`; informational, never a payment posting. |

### Functional rules and states

Costs draft→in_review→approved/rejected; approved data is immutable, amended through linked replacement/reversal. Exact supplier invoice reference+supplier+currency duplicates flag review; same invoice may support distinct item lines, so never blindly discard all matches. Already billed approved cost cannot change silently. Invoice drafting may reserve approved cost portions; abandoned/cancelled drafts release reservations. In-review invoices cannot edit; return to draft creates a new reviewed version.

Issue in a transaction: validate party/tax/numbering policy, freeze all line values/FX references, lock selected costs and number series, verify client/internal approvals, allocate issued number once, create posting+audit. Failed transaction consumes neither number reservation nor approval; actual mandated gap treatment is policy, **assumption to verify**. Never delete/renumber an issued invoice. Corrections require reviewed credit-note policy; otherwise correction command is unavailable.

Exact arithmetic: per-line net = quantity × unit price under approved rounding; tax uses selected effective tax rule; gross = rounded net + rounded tax. Invoice totals sum finalized line values. Mixed currencies require explicit approved FX conversion before creating invoice lines; no hidden conversion. Due date is contractual input; unknown terms block issue where required, not assumed cash terms.

Allocation posting locks receipt+invoice and checks remaining amounts. Remaining receipt = confirmed amount − posted allocations plus reversed allocations; invoice due = issued gross − applicable posted credit notes − posted receipts. Disputed amount is displayed separately, not subtracted from legally owed balance by default. Customer advance is confirmed unallocated receipt, not revenue. Overdue means positive due after due date using business calendar date; no overdue classification without due date. No negative due from over-allocation.

Margin view groups by dossier and currency: recognized service net revenue minus approved attributable operating costs; exclude pass-through revenue/cost symmetrically. Report unknown classification or missing actual costs separately. Recognition basis and shared-cost allocation are **assumption to verify**; until approved, return unavailable margin with supporting components rather than fabricated profit. Import settlement evidence is separate and cannot release a guarantee or imply bank transfer.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /costs`; `GET/PATCH /costs/{id}`; `POST /costs/{id}/submit`; `/approve`; `/cancel` | Cost DTO; approve `{approval_id}`; cancel `{reason}` only if no posted billing. |
| `POST /costs/{id}/commitments` | `{amount,approval_id,expires_at?}`. |
| `GET/POST /invoices`; `GET/PATCH /invoices/{id}`; `POST /invoices/{id}/submit`; `/issue`; `/cancel` | Create draft includes `lines[]`; issue `{approval_id,issue_date,due_date}`; cancel only unissued. |
| `POST /invoices/{id}/credit-notes`; `GET /invoices/{id}/document` | `{reason,lines,policy_version_id}` → draft credit note; document is frozen issued version. |
| `GET/POST /receipts`; `POST /receipts/{id}/submit`; `/confirm`; `/reverse` | Confirm `{approval_id}`; reverse `{approval_id,reason}` after dependent allocations reversed. |
| `POST /payment-allocations`; `POST /payment-allocations/{id}/post`; `/reverse` | Allocation draft; post/reverse `{approval_id,reason?}`. |
| `GET/POST /disputes`; `POST /disputes/{id}/resolve` | Resolve `{reason,evidence_refs,resolution_ref?}` does not change money by itself. |
| `GET/POST /import-settlement-evidence`; `POST /import-settlement-evidence/{id}/confirm` | `{approval_id}` with bank evidence; no payment effect. |
| `GET /reports/receivables`; `GET /dossiers/{id}/margin` | Currency-separated totals, calculation date and unresolved assumptions. |

Errors: `COST_ALREADY_BILLED` → `Ce coût est déjà affecté à une facture.`; `ALLOCATION_EXCEEDS_BALANCE` → `Le montant dépasse le solde disponible.`; `CURRENCY_CONFLICT` → `Les devises ne correspondent pas.` Test partial billing, simultaneous allocation, duplicate receipt, changed client approval, credit note limits, unknown tax, inconsistent evidence and margin with missing actuals. Exit: no money movement can be inferred from an unconfirmed document or AI result.

---

## CR03 — Transport, handoffs and physical closure

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Core; L. Depends on CR01 and foundation. Single tenant; fleet is optional installation functionality, not a separate workspace. No GPS integration, route optimization, maintenance scheduler or certified electronic proof-of-delivery in this release.

### User stories, UI and permissions

A dispatcher creates a delivery order linked to a dossier or independently. An assigned field agent acknowledges responsibility and supplies real event evidence. An operations manager sees that delivery is complete but equipment return remains outstanding.

Screens: `/transport/commandes` (`Commandes de livraison`), `/transport/commandes/{id}` (`Préparer la livraison`), `/transport/missions` (`Missions`), `/transport/missions/{id}` (`Suivi de mission`), `/transport/flotte` (`Flotte et disponibilité`), `/transport/retours` (`Retours à suivre`). Fields `Dossier lié`, `Mode`, `Itinéraire`, `Lieu de prise en charge`, `Destination`, `Transporteur`, `Véhicule`, `Chauffeur`, `Début prévu`, `Fin prévue`, `Prise en charge`, `Livraison`, `Retour du conteneur`, `Justificatif`. Actions `Affecter`, `Accepter la mission`, `Signaler un événement`, `Confirmer la livraison`, `Suivre le retour`.

Capabilities `transport.read/write/assign/confirm`, `fleet.manage`, `mission.event.submit`, `mission.event.verify`. Dispatcher assigns and prepares; field agent submits only assigned event evidence; operations manager verifies physical events where required. Official release evidence uses declarant/authorized CR01 reviewer. External carrier contact may acknowledge a specifically granted mission, never inspect unrelated dossier finances.

### Data entities

| Entity | Fields / relations |
|---|---|
| DeliveryOrder | `dossier_id?,counterparty_id,shipment_id?,operation_type:container/groupage/air/export/other,origin:Location,destination:Location,priority:normal/urgent,planned_start?:Instant,planned_end?:Instant,gross_weight?:Quantity,volume?:Quantity,state:draft/ready/assigned/in_execution/completed/cancelled,readiness_requirement_ids[]`. |
| OrderItem | `order_id,reference,description,quantity:Quantity,container_id?,delivered_quantity:derived`; partial delivery supported only through positive item event quantities. |
| Vehicle | `registration UNIQUE,vehicle_type,status:available/immobilized/retired,capacity_policy_id?,carrier_id?`. |
| Driver | `name,user_id?,carrier_id?,status:active/inactive`; no unnecessary identity document fields. |
| Immobilization | `vehicle_id,start_at,end_at?,reason,evidence_refs[],confirmed_by,cleared_at?`; interval not availability guess. |
| Mission | `reference UNIQUE,carrier_id?,execution_type:internal/external,vehicle_id?,driver_id?,assigned_user_id?,planned_start,planned_end,state:draft/offered/acknowledged/in_progress/delivery_complete/closed/cancelled`. |
| MissionOrder | `mission_id,order_id,assigned_item_quantities:ItemQuantity[],sequence_key`; prevent overassignment under active missions. |
| Assignment | `mission_id,vehicle_id?,driver_id?,effective_start,effective_end,status:active/released,counterparty_contact_id?,acknowledged_at?,acknowledged_by?`. |
| TransportEvent | `mission_id,order_id?,kind:pickup/loading/departure/arrival/delivery/empty_return,occurred_at,received_at,location?:Location,item_quantities:ItemQuantity[],container_id?,submitted_by,evidence_refs[],verification:pending/verified/rejected,verified_by?,supersedes_id?`; immutable observations. |
| ReturnObligation | `order_id,container_id,contract_version_id?,required:Boolean,required_basis_evidence_id,status:unknown/open/confirmed/not_applicable,closing_event_id?`; date target belongs approved contract policy. |

### States and business rules

Order ready requires core shipment/locations/client fields and verified mandatory release prerequisites. Standalone orders still require a counterparty, explicit operation type and a reviewed readiness template; they are not exempt from applicable checks. Linking a dossier copies shipment facts into a source-bound snapshot; later dossier changes raise a review issue, never silently overwrite dispatcher edits.

Assignment requires explicit planned interval with end after start. Lock vehicle/driver rows and reject overlaps with active assignments or immobilization; touching end/start boundaries are non-overlapping. PostgreSQL exclusion constraint can enforce interval overlap in addition to service checks. Unknown time window blocks firm assignment; draft planning remains possible. Capacity checks require configured compatible units/capacity; absence means `Capacité non vérifiée`, not fit.

Mission draft→offered→acknowledged→in_progress→delivery_complete→closed. Offer records recipient; only recipient or audited authorized dispatcher confirmation of external acknowledgement may acknowledge. Start requires current readiness and acknowledgement. A changed official prerequisite pauses controlled progression and raises blocker; it does not erase actual field observations. Delivery complete requires all assigned quantities delivered with evidence. Return requiredness must be established; unknown prevents full closure. Closed requires verified applicable return events. No duplicate delivery quantity or equipment return.

Backdated evidence allowed with reason and both occurred/received timestamps; contradictory chronological events go to review. Field agent cannot backdate an official acceptance. Correction appends superseding event and recomputes projections with visible impact; it cannot silently reverse invoices. Cancelling after partial execution requires a plan for remaining items/return obligations and management review. Reports distinguish verified events, pending claims, actual waiting and planned schedule.

### APIs

| Endpoints | Contract |
|---|---|
| `GET/POST /delivery-orders`; `GET/PATCH /delivery-orders/{id}`; `POST /delivery-orders/{id}/ready`; `/cancel` | Order+items DTO; ready `{}` validates current prerequisites; cancel `{reason,approval_id?}`. |
| `GET/POST /missions`; `GET/PATCH /missions/{id}`; `POST /missions/{id}/offer` | Mission draft; offer `{assignee_user_id? ,counterparty_contact_id?,order_assignments[],vehicle_id?,driver_id?}`. |
| `POST /missions/{id}/acknowledge`; `/start`; `/close` | Acknowledge `{evidence_refs?}`; start `{occurred_at}`; close `{approval_id}` when required by template. |
| `POST /missions/{id}/events`; `POST /transport-events/{id}/verify`; `/correct` | Event DTO; verify `{approval_id}`; correct `{replacement_event,reason,approval_id}`. |
| `GET/POST /vehicles`; `GET/PATCH /vehicles/{id}`; `GET/POST /drivers` | Reference/availability DTO; no status toggle bypassing immobilization. |
| `POST /vehicles/{id}/immobilizations`; `POST /immobilizations/{id}/clear` | `{start_at,end_at?,reason,evidence_refs}`; clear `{occurred_at,reason,evidence_refs}`. |
| `GET /return-obligations`; `POST /return-obligations/{id}/confirm`; `/not-applicable` | Confirm `{closing_event_id,approval_id}`; not-applicable requires approved contract basis. |
| `GET /reports/transport` | Filters carrier/vehicle/driver/client/period; distinct missions and verified event-based durations. |

Errors: `ASSIGNMENT_OVERLAP` → `Une affectation existe déjà sur ce créneau.`; `ASSET_IMMOBILIZED` → `Ce véhicule est immobilisé.`; `RETURN_OUTSTANDING` → `Le retour du conteneur n'est pas confirmé.`; `EVENT_ORDER_CONFLICT` → `L'ordre des événements doit être vérifié.` Test concurrent dispatch, partially delivered order, unknown return terms, stale release, external acknowledgement evidence, overlapping immobilization and corrected timestamps. Commercial deadlines/rates remain **assumption to verify**, implemented in DF02 rather than guessed here.

---

## CR04 — RED ledger, BOM and deterministic clearance

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Core; L. Depends on foundation; does not require broker dossier module for an operator-only installation. Single tenant. Local customs accounting is distinct from official acceptance. No assumed mapping between AT/ATPA/EF or other labels; approved regime registry supplies applicable definitions.

### Stories, UI and permission boundary

A RED operator records import lots and export demand; a production contributor proposes BOM composition; a RED reviewer examines allocation eligibility and approves a posting; an auditor reproduces historical balances and reversals.

Screens: `/red/projets` (`Projets RED`), `/red/projets/{id}` (`Situation du projet`), `/red/importations` (`Flux d'importation`), `/red/exportations` (`Flux d'exportation`), `/red/nomenclatures` (`Nomenclatures de fabrication`), `/red/apurements` (`Propositions d'apurement`), `/red/apurements/{id}` (`Vérifier l'imputation`), `/red/journal` (`Journal et sommier`), `/red/bilans` (`Bilans et feuilles de décharge`). Fields `Autorisation`, `Régime`, `Lot d'entrée`, `Référence DUM`, `Article`, `Quantité importée`, `Quantité restante`, `Unité`, `Nomenclature applicable`, `Méthode d'imputation`, `Justification`. Actions `Enregistrer un flux`, `Proposer une imputation`, `Soumettre au contrôle`, `Comptabiliser`, `Préparer une contrepassation`.

Capabilities `red.read/write/submit/post/reverse`, `bom.write/approve`. RED operator drafts; RED reviewer independently posts/reverses; production contributor can draft BOM/movement inputs, not change customs balances. Rule reviewer approves eligibility/units rules. No administrator bypass of ledger invariants.

### Entities, fields and relations

| Entity | Fields / invariant |
|---|---|
| RedProject | `reference UNIQUE,counterparty_id,customs_office_id,regime_rule_version_id,authorization_evidence_id,authorization_reference,opened_on,state:draft/active/closed,currency_code?`; active needs approved applicability. |
| CustomsFlow | `project_id,direction:import/export,dum_reference,declared_on,external_reference?,external_status_ref?,source_evidence_id,state:draft/in_review/recorded/reversed`; unique project/direction/DUM ref/version chain. |
| FlowArticle | `flow_id,line_ref,material_id,quantity:Quantity,customs_value?:Money,origin_country?,source_refs[]`; unique flow/line_ref. |
| ImportLot | `flow_article_id UNIQUE,project_id,material_id,admission_date,original_quantity:Quantity,eligibility_attributes:ApprovedEligibilitySchema,obligation_id?`; immutable origin; balance derived. |
| Bom | `reference UNIQUE,finished_material_id,status:active/archived`. |
| BomVersion | `bom_id,effective_from,effective_until?,output_quantity:Quantity,source_evidence_refs[],state:draft/in_review/approved/superseded,approval_id?`; no overlapping approved applicability without explicit version selection. |
| BomComponent | `bom_version_id,material_id,input_quantity:Quantity,conversion_rule_version_id?`; quantity ratio is material input / defined output, no inferred yield. |
| AllocationProposal | `project_id,strategy:manual/fifo/lifo,input_refs[],eligibility_rule_version_id,bom_version_ids[],state:draft/in_review/approved/stale/posted/rejected,candidate_exclusions:ReasonSchema[],approval_id?`. |
| ExportCoverage | `proposal_id,export_article_id,covered_output_quantity:Quantity,bom_version_id?`; represents product coverage once, not once per material. |
| AllocationLine | `coverage_id,import_lot_id,material_id,consumed_input_quantity:Quantity,conversion_rule_version_id?,eligibility_explanation`; all components of coverage must be satisfied. |
| RedLedgerTransaction | `project_id,kind:import/clearance/adjustment/reversal,effective_on,source_ref,approval_id,reverses_id?,posted_at`; immutable, unique source/approved effect. |
| RedLedgerEntry | `transaction_id,import_lot_id,material_id,delta_quantity:Decimal,unit_id,allocation_line_id?`; import positive, clearance negative, reversal exact negation of referenced entries. |
| CoveragePosting | `transaction_id,export_article_id,delta_output_quantity:Decimal,unit_id,coverage_id`; positive when covering export, reversal negative. |

### Algorithms and business rules

Recording approved import flow atomically creates lots and positive ledger entries. Recording an export declares demand but does not consume imports. Available input = sum posted lot deltas in its base unit. Remaining output demand = declared export article quantity minus posted coverage deltas. Never sum raw-material component quantities to calculate product coverage. Different units/materials remain separate; aggregate percentage is unavailable unless an approved aggregation basis exists. UI uses `Taux non calculable avec les données disponibles.`

For each coverage request: validate project/regime scope, materials, authorization, admissible dates and other reviewed eligibility predicates. Reject unsupported legal treatment. Convert only through approved dimension/material-specific rules. If BOM applies, required component input = desired output / BOM output quantity × component input; rounding per approved unit policy. Consume eligible lots until every component is covered. If insufficient input, present the maximum fully supported coverage only if deterministically computable; otherwise a blocking shortage. Do not post a partly satisfied BOM coverage.

FIFO orders eligible imports by admission date ascending, then recorded timestamp ascending, then lot ID ascending. LIFO uses admission date descending, recorded timestamp descending, lot ID ascending. These are deterministic implementation tie-breaks, not legal assumptions. Manual selection still enforces identical eligibility rules. Preview proposals do not reserve balances.

Approval binds allocations, input balances, rules and BOM versions. Posting locks affected import lots and export articles in stable ID order and recomputes balances/eligibility. If anything materially differs, return stale, do not substitute different lots. Post all coverage/components or none, consume approval once and emit ledger event. No negative available balance or overcovered export. DB constraints enforce positive original/line quantities and unique posting effects; transaction-level checks enforce cross-row sums.

Reversal proposal references original transaction and exact opposite entries/coverage. If reversing an import would invalidate downstream clearance, block with dependency list; require reviewed dependent reversals/correction plan. Never rewrite imported origin quantities or historical BOM usage. Project closure requires no unresolved local balances/mandatory obligations and applicable external evidence; local stock zero alone is insufficient.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /red-projects`; `GET/PATCH /red-projects/{id}`; `POST /red-projects/{id}/activate`; `/close` | Draft DTO; activate/close `{approval_id}`. |
| `GET/POST /customs-flows`; `GET/PATCH /customs-flows/{id}`; `POST /customs-flows/{id}/submit`; `/record` | Flow + articles; record `{approval_id}` → transaction for import or recorded export demand. |
| `GET /import-lots`; `GET /import-lots/{id}/balance` | Balance by `as_of` effective date and posted-at observation cutoff, both returned. |
| `GET/POST /boms`; `POST /boms/{id}/versions`; `POST /bom-versions/{id}/submit`; `/approve` | Version+components; approve `{approval_id}`. |
| `POST /allocation-proposals`; `GET /allocation-proposals/{id}`; `POST /allocation-proposals/{id}/calculate`; `/submit`; `/post` | Create `{project_id,strategy,export_requests:[{article_id,quantity}],manual_lot_choices?,rule_version_id,bom_version_ids[]}`; post `{approval_id}`. |
| `POST /red-transactions/{id}/reversal-proposals`; `POST /red-reversal-proposals/{id}/post` | Create `{reason,evidence_refs}`; post `{approval_id}` after dependency checks. |
| `GET /red-projects/{id}/journal`; `/balance`; `POST /red-projects/{id}/exports` | `{report_kind:balance/discharge/journal,as_of,posted_cutoff}` → evidence-linked export job. |

Errors: `INSUFFICIENT_LOT_BALANCE` → `Le stock disponible ne permet pas cette imputation.`; `INCOMPLETE_BOM_COVERAGE` → `Tous les composants nécessaires ne sont pas couverts.`; `LOT_INELIGIBLE` → `Ce lot ne respecte pas les conditions d'imputation.`; `REVERSAL_DEPENDENCY` → `Des opérations dépendantes doivent être corrigées avant cette contrepassation.`

Tests use synthetic reviewed rules, never fake legal rates: FIFO/LIFO ties, multi-component/multi-lot coverage, mixed units, shortages, concurrent posting, stale export demand, full rollback, import reversal dependency and historical balance reproduction. Regulatory regimes, permitted dispositions, conversion precision and aggregation basis remain **assumption to verify**.

---

## CR05 — Obligations, deadlines and guarantee closure

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Core; L. Depends on CR04 and shared rule/evidence services. Single tenant. Regulatory deadlines and bank release decisions are not invented. Stories: a manager knows the next obligation; a reviewer approves a documented extension; a finance/RED reviewer distinguishes locally reconciled from externally released guarantees.

### UI, roles and stories

Screens `/obligations` (`Échéances et obligations`), `/obligations/{id}` (`Justifier l'obligation`), `/garanties` (`Cautions et garanties`), `/garanties/{id}` (`Suivi de la garantie`), `/garanties/{id}/demandes` (`Demandes de mainlevée`). Fields `Objet`, `Date de départ`, `Règle appliquée`, `Échéance calculée`, `Responsable`, `Pièces manquantes`, `Date de vérification`, `Montant garanti`, `Montant demandé`, `Confirmation bancaire`. Actions `Préparer une prorogation`, `Soumettre la justification`, `Demander la mainlevée`, `Enregistrer la réponse`, `Confirmer la clôture`.

Capabilities `obligation.write/review/close`, `guarantee.write/request/verify`. RED operator prepares; RED reviewer approves customs obligation outcomes; finance reviewer verifies bank evidence in accessible guarantees. Release requires both configured domain checks; one user's combined roles still cannot approve their own proposal. External client sees only shared action/evidence requests.

### Model

| Entity | Required fields / nullable fields |
|---|---|
| Obligation | `resource_id,kind:customs_deadline/documentary/return/bank_followup,title_fr,owner_id,rule_version_id?,start_date?,computed_due_date?,date_basis_evidence_id?,state:unresolved/open/in_review/fulfilled/externally_closed/cancelled,closure_policy_version_id,closed_decision_id?`. Transport return may reference CR03 obligation rather than duplicate authority. |
| ObligationCalculation | `obligation_id,input_refs[],rule_version_id,result_date?,missing_keys[],calculated_at`; immutable. |
| ExtensionRequest | `obligation_id,requested_due_date,reason,evidence_refs[],external_status_ref?,approved_due_date?,state:draft/submitted/accepted/rejected,review_id?`; local proposal cannot alter due date. |
| Alert | `obligation_id,rule_version_id,severity:info/warning/critical,trigger_key,first_detected_at,last_evaluated_at,state:active/acknowledged/resolved,suppression_until?,suppression_reason?`; unique active obligation/trigger/rule version. |
| Guarantee | `reference UNIQUE,bank_counterparty_id,beneficiary_counterparty_id,amount:Money,deposit_date?,expiry_date?,source_evidence_id,state:draft/active/release_requested/partially_released/released/cancelled`. |
| GuaranteeLink | `guarantee_id,red_project_id,flow_id?,allocated_amount:Money,allocation_policy_version_id,approval_id`; allocation cannot exceed guarantee amount unless documented amendment updates guarantee. |
| GuaranteeRequest | `guarantee_id,request_kind:release/restitution/call,requested_amount:Money,evidence_refs[],external_reference?,state:draft/approved_locally/submitted/acknowledged/accepted/rejected,review_id?,external_observation_id?`. Recording a call does not execute it. |
| GuaranteeReleaseEvent | `request_id,confirmed_amount:Money,bank_observation_id,verification_decision_id,effective_on`; immutable, idempotent external event identity. |

### Rules, calculations and error cases

Due date calculated only from approved rule: source event/date, calendar/month semantics, timezone and business-calendar adjustment explicitly defined by that rule. Unknown period/calendar/start date yields unresolved and no computed date. Never reuse generic marketing durations. Severity derives approved escalation predicates evaluated against the remaining obligation; UI displays due date and basis, not just color. Acknowledgement is not resolution; snooze does not change legal due date, and critical obligation remains visible in aggregates.

Extension accepted requires reviewed actual external acceptance and approved due date; preserve original calculation/history, then recompute alerts. If rejection or unknown external state, original due date remains. Fulfilling local quantity/evidence requirements sets `fulfilled`; `externally_closed` additionally requires exact official/bank closure evidence when the closure policy requires it. If source changes, reopen review without deleting external observation history.

Guarantee requests use same currency as guarantee. Sum confirmed release amounts cannot exceed guaranteed amount less prior confirmed releases, under lock. Requested or acknowledged amount is not released balance. Partial release enabled only under reviewed policy and explicit bank evidence; otherwise request remains pending. Full local RED clearance does not automatically release guarantee or free a bank limit. Guarantee amendments/versioning require independent review; cancellation unavailable after confirmed release/call history without a correction plan.

### APIs

| Endpoints | Contract |
|---|---|
| `GET/POST /obligations`; `GET/PATCH /obligations/{id}`; `POST /obligations/{id}/calculate` | Draft metadata; calculate `{}` returns calculation + unresolved keys. |
| `POST /obligations/{id}/extensions`; `POST /extension-requests/{id}/record-outcome` | Request DTO; outcome `{external_observation_id,approval_id,approved_due_date?}`. |
| `POST /obligations/{id}/fulfill`; `/close` | `{approval_id,evidence_refs[]}`; external close also `{external_observation_id}` where required. |
| `GET /alerts`; `POST /alerts/{id}/acknowledge`; `/suppress` | Acknowledge `{}`; suppress `{until,reason,approval_id?}` per reviewed alert policy. |
| `GET/POST /guarantees`; `GET/PATCH /guarantees/{id}`; `POST /guarantees/{id}/activate` | Draft guarantee; activate `{approval_id}`. |
| `POST /guarantees/{id}/links`; `POST /guarantees/{id}/requests` | Link DTO / request DTO. |
| `POST /guarantee-requests/{id}/submit`; `/record-outcome` | Submit `{approval_id,submission_evidence_id}` records manual external send; outcome `{external_observation_id,confirmed_amount?,approval_id}`. |
| `GET /reports/obligations` | Outstanding duties, unresolved dates and verified guarantee balances, separated by currency/regime. |

Errors: `DUE_DATE_UNKNOWN` → `L'échéance ne peut pas être calculée sans règle validée.`; `BANK_CONFIRMATION_REQUIRED` → `La mainlevée doit être confirmée par un justificatif bancaire vérifié.`; `RELEASE_EXCEEDS_GUARANTEE` → `Le montant dépasse le solde garanti.` Tests: month/calendar boundaries, unknown rule, rejected extension, snoozed critical alert, partial release concurrency, stale bank evidence, and cleared stock with unreleased guarantee. Exact legal periods, release policy and alert thresholds are **assumption to verify**; these unknowns block relevant actions, not evidence collection.

---

## CR06 — Client action portal and notifications

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Core; L. Depends on CR01–CR02, FD01–FD02. Single tenant. Clients are restricted contacts of the operating organization, never tenant accounts or workspace owners. Stories: a client submits the exact requested document; an approver understands a cost before agreeing; an internal agent verifies a response without exposing private notes.

### Screen contract

`/client/actions` (`Mes actions`), `/client/actions/{id}` (`Répondre à la demande`), `/client/dossiers` (`Mes dossiers`), `/client/dossiers/{id}` (`Suivi du dossier`), `/client/factures` (`Mes factures`), `/client/factures/{id}` (`Détail de la facture`), `/client/notifications` (`Notifications`), `/client/compte` (`Mon compte`), `/client/societe` (`Informations de la société`). Staff `/dossiers/{id}/demandes` (`Demandes au client`).

Request page fields: `Ce qui est attendu`, `Pourquoi cette pièce est nécessaire`, `Date souhaitée`, `Document concerné`, `Version à approuver`, `Montant et devise`, `Votre réponse`. Buttons `Ajouter le document`, `Envoyer ma réponse`, `Approuver cette version`, `Demander une précision`, `Refuser avec un motif`. Staff review `Accepter la réponse`, `Demander une correction`. Copy: `Votre réponse a été reçue. Elle doit encore être vérifiée.` Never say accepted when merely uploaded. Empty `Aucune action ne vous est demandée pour le moment.`

### Capabilities and fields

`client_request.create/publish/review` for assigned operations staff; `client_request.respond` for named active recipient with explicit grant; `client_request.approve_cost` requires external_approver and valid counterparty authority record. Internal financial/regulatory approvals remain separate. Client invoice read requires issued+published and resource grant. Contact can propose company changes but cannot alter invoiced legal identity retroactively.

| Entity | Fields / invariant |
|---|---|
| ClientRequest | `dossier_id,counterparty_id,kind:document/field_correction/instruction/cost_approval,title_fr,explanation_fr,requested_from_user_ids[],response_schema:RequestResponseSchema,target_refs:SnapshotRef[],due_at?,state:draft/published/responded/accepted/correction_requested/rejected/cancelled/stale,published_by?,reviewer_id?,related_blocker_id?`. |
| ClientResponse | `request_id,responder_id,payload:StoredResponseSchema,evidence_refs[],target_digest,submitted_at,state:received/in_review/accepted/rejected,review_decision_id?`; immutable; later response supersedes explicitly. |
| ClientAuthority | `user_id,counterparty_id,action_codes[],scope_refs[],authority_evidence_id,valid_until?,verified_decision_id`; used for consequential cost/instruction approval. |
| Notification | `recipient_user_id,resource_ref,template_code,payload:FrenchTemplateSchema,dedupe_key UNIQUE,state:queued/in_app_delivered/read/suppressed,read_at?`. |
| DeliveryAttempt | `notification_id,channel:email/in_app,status:pending/sent/failed,provider_message_id?,last_error_code?,next_attempt_at?`; sent ≠ read or accepted. |
| NotificationPreference | `user_id,template_category,channel,enabled`; security/required action delivery policy overrides only when approved and disclosed. |
| CompanyChangeProposal | `counterparty_id,submitted_by,patch:CounterpartyEditableDTO,input_version,review_id?,state:pending/accepted/rejected/stale`. |
| Announcement | `title_fr,body_fr,recipient_user_ids[],resource_refs[],publish_at?,state:draft/published/withdrawn`; no public confidential HTML. |

### States, validations and failure behavior

Publish validates recipient grant, French instructions, response schema, target version and required authority for approval requests. Published content freezes. Editing material amount/document/instruction creates a new request version and marks outstanding prior request stale. A response checks exact digest and current access; changed target returns `REQUEST_STALE` / `Cette demande a changé. Consultez la nouvelle version avant de répondre.`

Document response references only clean FD02 versions attached to this request. Cost response is `{decision:approve/reject,reason?}`; reject requires reason; approval binds displayed Money, currency, scope and version. Client cannot enter a different amount and have it treated as approval. Accepted client response satisfies only the mapped requirement; internal approver still validates business action.

Notification payload contains minimal text and an authenticated link, not document bytes or confidential financial values in email. Queue after transaction; reauthorize at delivery, suppress if withdrawn/revoked. Default in-app channel; external email only with approved SMTP/provider/destination policy. WhatsApp/SMS integrations remain **assumption to verify**, not silently installed. Reminder schedules are approved configuration; no invented cadence.

Client timeline uses approved French summaries of events; internal rule discussions, disputes not shared, and margin absent. Cached data and downloads require current session/grants. Cannot guarantee deletion of files users already lawfully downloaded; specifications promise future-access revocation, not remote erasure.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /client-requests`; `GET/PATCH /client-requests/{id}`; `POST /client-requests/{id}/publish`; `/cancel` | Staff DTO; publish `{}`; cancel `{reason}`. |
| `GET /client/actions`; `GET /client/actions/{id}`; `POST /client/actions/{id}/responses` | Client response schema; current target digest required; return received state only. |
| `POST /client-responses/{id}/accept`; `/request-correction`; `/reject` | `{reason?,approval_id?}` plus evidence check; final interpretation belongs domain reviewer. |
| `GET /client/dossiers`; `GET /client/dossiers/{id}`; `GET /client/invoices`; `GET /client/invoices/{id}` | Separate allowlisted DTOs; no generic staff object serialization. |
| `GET /me/notifications`; `POST /me/notifications/{id}/read`; `PATCH /me/notification-preferences` | Own-user only; state/reporting has no hidden recipient list. |
| `POST /client/company-change-proposals`; `POST /company-change-proposals/{id}/apply` | `{patch,input_version}`; apply `{approval_id}`. |
| `GET/POST /announcements`; `POST /announcements/{id}/publish`; `/withdraw` | Staff only mutations; explicit recipient set reauthorized. |

Tests: guessed client ID, shared dossier with internal attachment, revoked recipient during queue, stale cost amount, attachment still quarantined, response not accepted, rejected company edit, duplicate delivery webhook and accessible French form errors. Exit: clients can resolve assigned work without extra privileges or false confirmation.

---

## CR07 — File exchange, external observations and reconciliation

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Core; L. Depends on CR01, CR04 and FD02. Single tenant. Source formats, external-system schemas and authoritative acknowledgement contracts are **assumption to verify**. Implement the adapter registry and documented synthetic fixture format now; do not advertise an official connection until tested against approved specifications.

### Stories, scope, screens and permissions

An operator imports an authorized official-system export and reviews discrepancies. A reviewer distinguishes local export from official acceptance. An auditor sees exactly which external row caused a correction. No direct database overwrite, credential scraping or arbitrary executable mapping.

Screens `/rapprochements` (`Rapprochements`), `/rapprochements/nouveau` (`Importer un état`), `/rapprochements/{id}` (`Comparer les données`), `/echanges` (`Échanges externes`), `/echanges/{id}` (`Preuves de transmission`), `/administration/formats` (`Formats d'échange`). Fields `Système source`, `Version du format`, `Date de l'état`, `Référence externe`, `Valeur source`, `Valeur locale`, `Écart`, `Décision proposée`, `Accusé de réception`. Actions `Prévisualiser`, `Conserver la valeur locale`, `Proposer une correction`, `Marquer comme non rapproché`, `Préparer l'export`, `Joindre un accusé`.

Capabilities `exchange.prepare/read`, `reconciliation.import/resolve/approve/apply`, `external_observation.verify`. Operator imports in authorized scope. Domain reviewer approves each money/RED/declaration effect; technical integration role cannot override domain review. External clients cannot view cross-client batches.

### Model

| Entity | Fields / relationships |
|---|---|
| ExchangeFormatVersion | `system_code,format_code,version_label,schema:SourceRecordSchema,identity_fields:Text[],mapping_version_id,evidence_contract?:AcknowledgementSchema,state:draft/approved/retired,approval_id`; unique system/format/version. |
| ExchangePacket | `system_code,direction:outbound/inbound,format_version_id,resource_refs:SnapshotRef[],document_version_id,state:prepared/submitted/acknowledged/accepted/rejected/unknown,external_reference?,external_observation_id?`; immutable packet content. |
| ReconciliationBatch | `format_version_id,source_document_version_id,source_snapshot_at?,input_local_refs[],state:parsing/review_required/in_review/approved/applying/applied/failed,counterparty_scope_ids[],approval_ids[]`. |
| ReconciliationDifference | `batch_id,source_row_key,local_resource_id?,field_path,source_value:TypedValue,local_value?:TypedValue,normalized_value?:TypedValue,classification:equal/missing_local/missing_external/conflict/ambiguous/invalid,resolution:pending/keep_local/propose_change/link/ignore,reason?,proposed_command?:VersionedCommandDTO`. |
| ReconciliationEffect | `difference_id,domain_effect_id,approval_id,applied_at`; unique difference/proposed version. |
| ExternalReceipt | `packet_id,system_code,external_event_id,evidence_document_id?,authenticated_adapter_event_id?,reported_state,observed_at,received_at,verified_decision_id?`; unique system/external_event_id when authoritative. |

### Rules and state changes

Parse only clean files. Validate encoding, columns, dates, decimal/unit/currency interpretation and schema version. Ambiguous dates or localized numerals require mapping policy; do not guess. Match using declared official identifiers and scope before optional human link. No fuzzy auto-match of obligations/financial records. Equal normalized values may close a difference; tolerance is zero unless a reviewed domain tolerance exists. Raw source remains unchanged.

Every proposed change must compile to a domain command with input versions and required reviewer capability. Keeping local/ignoring requires reason; ignoring a difference never changes official status or proves compliance. Approval applies to exactly the reviewed changes. At apply, lock relevant rows and reject stale values. Batch must either commit atomically through domain services or remain staged; no partial financial/quantity effects presented as complete. If implementation chunks large batches, chunk effects stay inactive until explicit reviewed activation; practical batch limits are required deployment policy.

Outbound prepared packet is a frozen snapshot. Manual submission requires source-specific evidence and reference; local file download alone leaves prepared. Verified acknowledgement means receipt only; accepted requires acceptance event as defined by approved contract. An unrelated receipt, unverifiable signature or wrong reference cannot update the packet. Late/reordered events append observations; current state is derived by explicit source transition rules, not latest received timestamp alone. Source changes after packet preparation mark it stale for sending without rewriting historical acceptance.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /exchange-formats`; `POST /exchange-formats/{id}/approve` | Versioned schema/mapping; approve `{approval_id}`. |
| `POST /reconciliation-batches`; `GET /reconciliation-batches/{id}`; `GET /reconciliation-batches/{id}/differences` | `{format_version_id,source_document_version_id,source_snapshot_at?,resource_scope_ids[]}` → job/batch. |
| `POST /reconciliation-differences/{id}/resolve` | `{resolution,reason,linked_resource_id?,proposed_value?}`; service builds typed domain command, not arbitrary SQL. |
| `POST /reconciliation-batches/{id}/submit`; `/apply` | Apply `{approval_ids[]}`; each effect verifies owning-domain authority. |
| `POST /exchange-packets`; `GET /exchange-packets/{id}`; `GET /exchange-packets/{id}/content` | `{system_code,format_version_id,resource_refs[]}` generates frozen export. |
| `POST /exchange-packets/{id}/submission-evidence`; `/receipts` | Evidence `{external_reference,document_version_id,observed_at}`; receipt DTO creates pending observation. |
| `POST /external-receipts/{id}/verify` | `{approval_id}`; updates projection only if verified contract allows transition. |

Errors: `UNSUPPORTED_FORMAT` → `Ce format d'échange n'est pas pris en charge.`; `EXTERNAL_REFERENCE_MISMATCH` → `L'accusé ne correspond pas à cet échange.`; `RECONCILIATION_STALE` → `Les données locales ont changé. Relancez la comparaison.`; `AMBIGUOUS_SOURCE_VALUE` → `Cette valeur source ne peut pas être interprétée sans règle validée.`

Acceptance: malformed/repeated file, same file under new filename, concurrent local edit, multi-domain review, missing receipt contract, mismatched reference, out-of-order acceptance and rollback under worker failure. Exit: every applied change maps back to source row, approved command and resulting effect; no local action fabricates external acceptance.

---

## DF01 — Reviewed extraction and cross-document readiness

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Differentiators; L. Depends on CR01–CR02 and FD02. Single tenant. Manual preparation remains usable without AI. Scope: invoice/undertaking/prior-DUM/provider-expense extraction, guarded email routing and deterministic contradiction review. No model-written approvals or final official classifications.

### Stories, French screens and permission boundary

An agent reviews invoice fields with source locations; a declarant sees why documents disagree; an accountant accepts expense suggestions without duplicating a cost. Screens `/documents/{id}/extraction` (`Vérifier l'extraction`), `/dossiers/{id}/coherence` (`Cohérence des pièces`), `/reception/messages` (`Messages à classer`), `/reception/messages/{id}` (`Vérifier le rattachement`). Fields `Valeur extraite`, `Valeur retenue`, `Pièce source`, `Emplacement`, `Confiance annoncée`, `Divergence`, `Conséquences de la modification`. Actions `Corriger`, `Conserver comme inconnu`, `Accepter la sélection`, `Soumettre au contrôle`, `Rattacher au dossier`.

Capabilities `extraction.run/review/apply`, `contradiction.resolve`, `message.route`. Agents review drafts; declarant approves declaration application; finance reviewer approves controlled cost effects. A provider/job identity can create extraction drafts only. Email access is explicitly configured to approved mailboxes; sender address is not sufficient authority to attach documents to a client.

### Entities

| Entity | Fields / schema |
|---|---|
| ExtractionRun | `document_version_id,extractor_type:invoice/undertaking/dum/provider_invoice,provider_config_version_id,prompt_version_id?,output_schema_version,state:queued/running/review_required/failed/cancelled,job_id,error_code?,usage_ref?`. |
| ExtractedField | `run_id,path,value?:TypedValue,source_locator?:EvidenceLocator,provider_confidence?:Decimal,status:unreviewed/accepted/corrected/unknown/rejected,reviewed_value?:TypedValue,reviewer_id?,reason?`. Confidence shown only if supplied with documented meaning; no manufactured score. |
| ExtractionApplication | `run_id,target_ref,selected_paths[],proposed_command:VersionedCommandDTO,input_refs[],review_request_id,state:proposed/approved/stale/applied,effect_id?`; unique approved application effect. |
| ComparisonRuleVersion | `code,document_types[],field_paths[],normalization_steps:AllowlistedTransform[],operator:eq/sum_eq/identifier_eq/unit_compatible,parameters:ComparisonSchema,effective_from,review_id`. |
| Contradiction | `dossier_id,rule_version_id,input_field_refs[],values:TypedValue[],severity:info/warning/blocking,state:open/in_review/resolved/stale,resolution_reason?,retained_field_ref?,approval_id?`. |
| InboundMessage | `mailbox_config_id,provider_message_id UNIQUE_WITH_MAILBOX,received_at,sender,subject,body_document_ref,attachment_version_ids[],routing_state:unassigned/proposed/assigned/rejected,proposed_resource_ids[],assigned_resource_id?,routing_decision_id?`. |

### Algorithms, validation and states

Request extraction only for clean authorized documents and approved provider/destination policy. Fixed output JSON schema rejects extra fields, invalid decimals, unsupported units and invented mandatory values. Missing fields are null with unknown status; no source location means `Source non localisée` and manual source review required. Do not display provider confidence as verified accuracy. Timeouts/provider invalid output leave retryable failed run and preserve reviewer edits in a separate application version.

Document comparison uses approved mappings: normalized invoice/title/contract identifiers, line sums, currencies, units and document versions. Equality rules use exact values unless explicitly configured tolerance. Semantic/AI similarity suggests candidate comparison, never resolves it. Inconsistent references, amounts or versions become contradictions tied to exact fields. A reviewer resolves by retained evidence and rationale or requests corrected document; cannot alter original source. Changed source creates stale contradiction/application and targeted re-review. Posted consumers create impact tasks rather than automatic reversals.

Prior-DUM reuse copies only approved allowlisted reusable fields; dates, amounts, FX/rules, mandate status and official acceptance are never silently copied as current. Article import creates a draft declaration version. Expense extraction proposes CostItem and checks existing supplier reference/document relationships. Approval/apply through existing domain service remains idempotent. Extractor cannot directly post an invoice or quantity ledger.

Email classification proposes a dossier using known refs and accessible client context; ambiguous/missing match remains unassigned. Attachment scan precedes routing. Reviewer needs source mailbox and destination permissions; delivery to external client requires subsequent publish action. Mailbox/provider contracts, thresholds and actual legal validation rules are **assumption to verify**; fallback is manual entry/routing.

### API

| Endpoints | Contract |
|---|---|
| `POST /extraction-runs`; `GET /extraction-runs/{id}`; `GET /extraction-runs/{id}/fields` | `{document_version_id,extractor_type}` → job; provider selected from approved config, not user-supplied URL. |
| `PATCH /extraction-runs/{id}/field-reviews` | `{reviews:[{path,status,reviewed_value?,reason?}]}`; current run/application versions required. |
| `POST /extraction-applications`; `POST /extraction-applications/{id}/submit`; `/apply` | `{run_id,target_ref,selected_paths[]}`; apply `{approval_id}` via domain service. |
| `POST /dossiers/{id}/comparison-runs`; `GET /dossiers/{id}/contradictions` | Compare `{rule_version_ids?}` uses only approved applicable rules. |
| `POST /contradictions/{id}/resolve` | `{retained_field_ref?,reason,approval_id,evidence_refs[]}`. |
| `GET /inbound-messages`; `GET /inbound-messages/{id}`; `POST /inbound-messages/{id}/route` | Route `{resource_id,reason,approval_id?}` under mailbox/destination permissions. |

Errors: `EXTRACTION_UNSUPPORTED` → `Ce document doit être saisi manuellement.`; `SOURCE_CONTRADICTION` → `Les pièces présentent des informations différentes. Une vérification est nécessaire.`; `ROUTING_AMBIGUOUS` → `Le dossier destinataire doit être confirmé.` Tests: hallucinated field, malformed output, wrong currency, amended invoice, duplicate apply, unknown SH basis, multiple clients with same reference, model failure after human edits and malicious document instructions. Exit: AI accelerates drafts while preserving every human decision boundary.

---

## DF02 — Contract-aware delay exposure and scenarios

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Differentiators; L. Depends on CR02–CR03. Single tenant. Estimates are separate from actual supplier charges and invoices. Contract terms are **assumption to verify** until customer supplies reviewed carrier/terminal evidence. No universal free-time/rate schedule.

### Stories, screens and roles

A dispatcher sees which missing return event keeps an obligation open. A finance reviewer reproduces a forecast from actual contract terms. A manager compares hypothetical pickup/return dates without changing real events.

Screens `/transport/exposition` (`Frais et échéances logistiques`), `/transport/commandes/{id}/contrat` (`Conditions applicables`), `/transport/commandes/{id}/simulation` (`Simuler les frais`). Fields `Contrat source`, `Version applicable`, `Franchise`, `Événement de départ`, `Événement de fin`, `Calendrier`, `Tranche tarifaire`, `Devise`, `Date envisagée`, `Données manquantes`. Buttons `Saisir les conditions`, `Soumettre les conditions`, `Calculer l'estimation`, `Comparer les scénarios`. Always badge forecast `Estimation — non facturée` and scenario `Hypothèse de travail`.

Capabilities `logistics_contract.write/approve`, `exposure.read/calculate`, `scenario.write`. Dispatcher drafts known terms; finance reviewer independently approves amounts/contract rules with operational validation; clients view forecasts only if explicitly published with assumptions. Calculation service is deterministic and has no invoice-issue authority.

### Model

| Entity | Fields / invariants |
|---|---|
| LogisticsContract | `carrier_id?,terminal_counterparty_id?,reference,source_evidence_id,status:active/archived`. |
| LogisticsContractVersion | `contract_id,effective_basis:booking/pricing_date/discharge/explicit,effective_from,effective_until?,applicability:ShipmentPredicate,state:draft/in_review/approved/superseded,approval_id`. Overlapping matches require explicit reviewed selection. |
| ChargeRule | `contract_version_id,charge_kind:storage/demurrage/detention/combined/other,label_fr,currency_code,unit_basis:container/item/weight/volume,start_event_code,end_event_code,start_inclusive:Boolean,end_inclusive:Boolean,calendar_policy_version_id,partial_period_rule:ceil/floor/prorata,free_periods:Decimal,applicability:ChargePredicate,combination_group?`. All policy fields explicitly supplied. |
| ChargeTier | `charge_rule_id,from_period:Decimal,to_period?:Decimal,rate:Decimal,rate_unit_code`; non-overlapping ordered tiers, no implicit missing range or free tier. |
| ChargeCombinationRule | `group_code,mode:additive/exclusive/highest/combined_replaces,member_rule_ids[],replacement_rule_id?,source_evidence_id,approval_id`; mode must reflect actual contract, not automatic optimization. |
| ExposureSnapshot | `order_id,contract_version_id,event_refs[],calculation_at,state:complete/incomplete/conflicting,lines:ChargeCalculationLine[],totals_by_currency:Money[],missing_inputs[],digest`; immutable. |
| Scenario | `order_id,name_fr,base_snapshot_id,event_overrides:HypotheticalEvent[],state:draft/calculated/stale,comparison_result_ref?`; cannot store overrides into actual events. |

### Exact calculation behavior

Select reviewed contract by explicit applicable basis/reference, not newest date. Resolve verified actual start/stop events; if stop is missing use a user-selected scenario horizon only for a forecast, explicitly labelled. An unknown event timestamp is not “today” by default. Calendar policy defines timezone, chargeable day boundaries, holidays, inclusivity and partial-period treatment. Compute elapsed chargeable periods under that policy, then chargeable periods = max(elapsed periods − free periods, zero). The zero floor is arithmetic, not a quoted free period.

For each chargeable period slice apply its configured tier rate × approved unit multiplier using exact decimal arithmetic. Tier boundaries must cover the requested horizon or return incomplete. Proration denominator and rounding require approved policy; absent values block. Apply combination rule before currency totals; no silent addition of combined detention plus separately billed detention. Different currencies remain separate unless explicit FX scenario requests approved FX basis.

An earlier stop than start or conflicting verified event versions returns conflicting with evidence links. Recomputed snapshot supersedes its forecast projection but does not rewrite approved invoices. A scenario shows baseline and candidate totals and difference only where both complete with compatible basis; label difference `Écart estimé`, never “savings achieved.” Delivery closes only applicable delivery clock; empty return closes equipment clock if contract says so. Source terms/event amendments mark scenarios stale.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /logistics-contracts`; `POST /logistics-contracts/{id}/versions`; `GET/PATCH /logistics-contract-versions/{id}` | Version DTO contains complete charge rules/tiers/combination rules. |
| `POST /logistics-contract-versions/{id}/submit`; `/approve` | Approve `{approval_id}` binds full terms and source evidence. |
| `POST /delivery-orders/{id}/exposure-calculations`; `GET /exposure-snapshots/{id}` | `{contract_version_id,forecast_horizon?:Instant,fx_version_id?}`; no assumed horizon. |
| `POST /delivery-orders/{id}/scenarios`; `GET/PATCH /scenarios/{id}`; `POST /scenarios/{id}/calculate` | `{name_fr,base_snapshot_id,event_overrides[]}`; override codes/timestamps validated. |
| `GET /reports/logistics-exposure` | Known/unknown buckets and currency-separated forecast totals with freshness timestamp. |

Errors: `CONTRACT_TERMS_INCOMPLETE` → `Les conditions du contrat doivent être complétées et validées.`; `CHARGE_OVERLAP_UNRESOLVED` → `Le cumul de ces frais doit être confirmé.`; `EVENT_TIME_UNKNOWN` → `La date nécessaire au calcul n'est pas confirmée.` Tests: calendar changes, boundary inclusion, tier gap, combined charges, partial periods, missing return, scenario isolation, stale contract and currency mismatch. Exit: every estimate is reproducible from terms and event snapshots without fabricated rates.

---

## DF03 — Production-to-RED evidence and reconciliation

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Differentiators; L. Depends on CR04, CR07 and FD02. Single tenant. Production data is observed business evidence, not authority to adjust customs balances. Customer manufacturing processes, permitted wastage/subcontracting/returns treatment and source ERP contracts are **assumption to verify**; unsupported treatments remain unresolved.

### Stories, UI and access

A warehouse contributor records actual material movements. A production contributor associates a batch with the BOM version actually used. A RED reviewer explains a variance without rewriting history. An auditor exports a product-to-import evidence chain.

Screens `/production/lots` (`Lots de production`), `/production/lots/{id}` (`Consommations et justificatifs`), `/production/mouvements` (`Mouvements de matière`), `/production/rapprochements` (`Rapprochement production–RED`), `/production/rapprochements/{id}` (`Expliquer les écarts`). Fields `Lot de production`, `Article fabriqué`, `Quantité produite`, `Matière`, `Quantité consommée`, `Nomenclature utilisée`, `Référence d'entrée`, `Écart constaté`, `Traitement proposé`, `Justificatif`. Buttons `Importer les mouvements`, `Déclarer une consommation`, `Expliquer un écart`, `Proposer une correction RED`, `Exporter la chaîne de preuve`.

Capabilities `production.write/import/read`, `production_reconciliation.propose`, `production_reconciliation.approve`. Production role submits observed facts; RED operator drafts reconciliation; independent RED reviewer approves customs consequences, with rule reviewer if legal interpretation is unresolved. No production permission directly writes RedLedgerEntry.

### Entities

| Entity | Fields / relation |
|---|---|
| ProductionBatch | `reference UNIQUE,finished_material_id,output_quantity:Quantity,produced_on,bom_version_id?,source_system?,external_id?,evidence_refs[],state:draft/submitted/accepted/corrected`; source/external_id unique when supplied. |
| ProductionMovement | `batch_id?,material_id,quantity:Quantity,kind:receipt/consumption/output/return/waste/transfer,occurred_at,source_reference?,external_event_id?,source_document_id,origin_location_id?,destination_location_id?,supersedes_id?,state:observed/in_review/accepted/rejected`. Positive amount; kind defines operational meaning. |
| ProductionLotLink | `movement_id,import_lot_id,linked_quantity:Quantity,link_basis:explicit_source/reviewer,evidence_refs[],review_id?`; no fuzzy automatic consumption linkage. |
| ProductionReconciliation | `batch_ids[],red_project_id,input_refs[],bom_version_ids[],rule_version_ids[],state:draft/calculated/in_review/approved/stale/applied,review_id?`. |
| MaterialVariance | `reconciliation_id,material_id,unit_id,expected_consumption?:Decimal,observed_consumption?:Decimal,linked_customs_consumption?:Decimal,variance?:Decimal,missing_inputs[],explanation?,treatment_rule_version_id?,state:unresolved/explained/proposed/accepted`. |
| ProductionCorrectionProposal | `reconciliation_id,variance_ids[],domain_command:RedCorrectionDTO,review_id,state:draft/in_review/approved/stale/applied,reversal_proposal_id?,result_transaction_id?`. |

### Rules and state transitions

Import validates original IDs, positive quantities, unit dimensions, source dates and duplicate events. Accepted movement is immutable; corrections append superseding movement and notify dependents. A movement marked waste/return/transfer does not by itself prove an allowed customs discharge. Require approved disposition rule and evidence before any proposed customs treatment.

For compatible material/unit groups, expected consumption uses the exact reviewed BOM ratio applied to observed output. Observed consumption sums accepted operational consumption less explicitly linked accepted returns under reviewed operational rule. Linked customs consumption derives posted allocation lines, not proposed allocations. Variance fields compare like dimensions at the same reporting cutoff; absence of output/BOM/unit rule yields null + missing inputs. Do not add quantities across material/unit groups.

Do not infer that all production inputs belong to an imported RED lot: explicit mapping or reviewer evidence required. Split links cannot exceed the accepted movement quantity. Source timestamps may precede data entry; preserve occurred/received separately. Submitted reconciliation freezes all operational/customs/BOM versions. Apply validates they are current and delegates to CR04 reversal/adjustment service with approved treatment. No direct balance overwrite. Evidence updates after posting create impact review, not retroactive BOM recomputation.

Export includes original import sources, operational movements, applicable BOM/rule versions, reviewer decisions, resulting customs transactions and unresolved differences. It explicitly distinguishes internal accounting from external acceptance and says `Rapport interne de justification` rather than claiming official certification.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /production-batches`; `GET/PATCH /production-batches/{id}`; `POST /production-batches/{id}/submit` | Batch DTO; draft only mutable. |
| `GET/POST /production-movements`; `POST /production-movements/{id}/accept`; `/correct` | Accept `{approval_id}` by authorized operational reviewer; correct `{replacement,reason,approval_id}`. |
| `POST /production-lot-links` | `{movement_id,import_lot_id,linked_quantity,evidence_refs,approval_id?}`. |
| `POST /production-reconciliations`; `GET /production-reconciliations/{id}`; `POST /production-reconciliations/{id}/calculate`; `/submit` | Reconciliation source refs and version selection; calculations deterministic. |
| `POST /material-variances/{id}/explanations` | `{explanation,evidence_refs,treatment_rule_version_id?}`. |
| `POST /production-correction-proposals`; `POST /production-correction-proposals/{id}/apply` | Draft typed RED correction; apply `{approval_id}`. |
| `POST /production-reconciliations/{id}/evidence-export` | `{as_of}` → job; manifest contains every included version. |

Errors: `PRODUCTION_LINK_UNPROVEN` → `Le lien entre cette consommation et le lot d'importation doit être justifié.`; `DISPOSITION_RULE_UNKNOWN` → `Le traitement douanier de cet écart doit être validé.`; `BOM_HISTORY_MISMATCH` → `La version de nomenclature ne correspond pas aux données examinées.` Tests: mixed domestic/imported material, partial output, returned input, missing BOM, duplicate ERP event, conversion mismatch, late correction and forbidden direct ledger mutation. Exit: every approved correction is traceable and reversible through CR04.

---

## DF04 — Rule registry and change-impact review

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Differentiators; L. Depends on CR01/CR05 and foundation. A minimal registry exists before those core modules for manually reviewed seed policies; this item adds source management, applicability UI and impact analysis. Single tenant. No automated legal interpretation or automatic activation of scraped content.

### User stories, UI and authorization

A qualified reviewer records a sourced rule with effective dates. An operations manager sees which open cases may be affected. An auditor reruns a historical calculation using its original version. Screens `/regles` (`Règles et sources`), `/regles/{id}` (`Versions de la règle`), `/regles/versions/{id}` (`Examiner l'applicabilité`), `/regles/impacts` (`Dossiers à réexaminer`), `/regles/impacts/{id}` (`Analyse d'impact`). Fields `Source officielle`, `Référence du texte`, `Date de publication`, `Date d'effet`, `Régime concerné`, `Conditions d'application`, `Interprétation retenue`, `Référent habilité`, `Incertitudes`. Actions `Proposer une version`, `Soumettre l'interprétation`, `Activer la version`, `Évaluer les impacts`, `Demander un nouvel examen`.

Capabilities `rule.write/submit/approve/activate`, `rule_impact.read/assess`. Only qualified `rule_reviewer` can approve; record qualification/authority evidence, do not assume competence from administrator status. Independent reviewer required. Domain reviewer must separately approve affected business changes.

### Schema and deterministic rule language

| Entity | Fields |
|---|---|
| RuleDefinition | `code UNIQUE,category:eligibility/documents/valuation/tax/deadline/disposition/rounding/contract/closure,owner_user_id,description_fr`. |
| RuleVersion | `rule_definition_id,version_label,source_document_version_ids[],source_urls[],publication_date?,effective_from:Date,effective_until?:Date,jurisdiction_code,regime_codes[],operation_codes[],predicate:PredicateSchema,effect:EffectSchema,interpretation_fr,uncertainties_fr[],state:draft/in_review/approved/active/superseded/rejected,approval_id?`; source-backed version immutable after approval. |
| ReviewerQualification | `user_id,scope_codes[],evidence_version_id,valid_from,valid_until?,verified_by`; activation checks current scope. |
| RuleImpactRun | `new_rule_version_id,prior_rule_version_ids[],evaluation_date,case_scope_refs[],job_id,state:queued/running/completed/failed`. |
| RuleImpactCase | `run_id,resource_ref,current_input_refs[],old_result_ref?,candidate_result_ref?,classification:affected/unaffected/unresolved,reason_fr,required_review_ids[],state:unassessed/review_requested/accepted_no_change/correction_proposed/closed`. |

PredicateSchema is a typed tree: `all[]`, `any[]`, `not`, or leaf `{field_path,operator:eq/in/lt/lte/gt/gte/exists,value:TypedValue}`. Field paths come from module allowlist; no scripting/SQL/HTTP. Evaluation is three-valued true/false/unknown. Missing value makes comparison unknown; all/any use deterministic three-valued logic. Unknown never counts as eligible or not-applicable.

EffectSchema is discriminated: `require_evidence(requirement_code,document_type)`, `set_deadline(start_field,period_value,period_unit,calendar_policy_id,inclusive,adjustment)`, `validate_relation(field_paths,comparison_rule_id)`, `calculate(formula_code,parameters)`, `allow_disposition(disposition_code,constraints)`, `set_rounding(scale,mode)`, `require_closure(evidence_codes[])`. Formula codes are audited application functions, not uploaded executable code. Numeric business parameters are supplied only by approved sources; **assumption to verify** until then.

### State/validation/error behavior

Draft→in_review→approved/rejected; approved→active only when sources, qualified independent decision, effect schema and dates are complete. Active→superseded preserves history. Reject overlapping active versions for identical applicability unless explicit priority/supersession rule resolves them. Merely downloading a document creates source evidence, not a RuleVersion with presumed interpretation.

Date-of-applicability field must be named by consuming workflow: declaration date, import admission date or another approved basis. Never universally apply today’s rule to historical cases. New active rule creates a proposed impact scan, not automatic domain mutation. Evaluate open cases and any explicitly scoped historical cases without rewriting their inputs. Unknown applicability yields unresolved issue. `accepted_no_change` requires explanation; `correction_proposed` creates a normal domain review request. A legal question with unresolved interpretation blocks only the affected controlled action.

API `/api/v1`: `GET/POST /rules`, `GET /rules/{id}`, `POST /rules/{id}/versions`, `GET/PATCH /rule-versions/{id}` (draft only); `POST /rule-versions/{id}/submit`, `/activate` `{approval_id}`, `/supersede` `{replacement_version_id,approval_id,reason}`; `POST /rule-impact-runs` `{new_rule_version_id,scope_refs[],evaluation_date}` → job; `GET /rule-impact-runs/{id}/cases`; `POST /rule-impact-cases/{id}/assess` `{classification,reason,proposed_action_ref?}`; `GET/POST /reviewer-qualifications` and reviewed revoke command.

Errors: `RULE_APPLICABILITY_UNKNOWN` → `L'applicabilité de cette règle doit être confirmée.`; `RULE_OVERLAP` → `Plusieurs règles actives couvrent le même cas.`; `REVIEWER_NOT_QUALIFIED` → `L'habilitation requise pour cette règle n'est pas enregistrée.` Test effective-date boundaries, missing predicate input, overlap, supersession, historical replay, unauthorized activation and impact result with no automatic business change. Exit: every active effect and impacted decision is source/version attributable.

---

## DF05 — Grounded assistant and advisory scans

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Differentiators; L. Depends on CR04–CR05, DF01, DF03–DF04. Single tenant. No pooled documents/feedback across deployments. The assistant has read/query/propose tools only; it never possesses credentials/capabilities for payment, official filing, guarantee release or direct ledger writes.

### Stories, screens and permissions

A user asks which accessible dossiers need action; a reviewer compares eligible clearance proposals; an operator sees failed/stale scans; an auditor inspects the source for a recommendation.

Screens `/assistant` (`Assistant métier`), `/assistant/conversations/{id}` (`Conversation`), `/connaissances` (`Base documentaire`), `/assistant/recommandations` (`Recommandations`), `/assistant/recommandations/{id}` (`Examiner la proposition`), `/assistant/analyses` (`Analyses et historique`), `/assistant/analyses/{id}` (`Détail de l'analyse`). Fields `Question`, `Sources utilisées`, `Données manquantes`, `Hypothèses`, `Version des règles`, `Dernière actualisation`. Actions `Poser une question`, `Ouvrir les dossiers concernés`, `Comparer les options`, `Soumettre à validation`, `Signaler une erreur`, `Lancer une analyse`. Copy `Les informations disponibles ne permettent pas de conclure.` when unsupported; label `Proposition à vérifier`.

Capabilities `knowledge.read/index`, `assistant.query`, `scan.run/configure`, `recommendation.review`. A user can query only records they may read. Service scans operate under an explicitly scoped service identity and produce per-authorized-recipient results; no all-data scan sent to an unauthorized user. Approving a recommendation delegates to the owning domain's reviewer and FD02.

### Entities

| Entity | Fields |
|---|---|
| KnowledgeEntry | `document_version_id,source_kind:official/customer/internal,effective_from?,effective_until?,supersedes_id?,index_state:pending/indexed/failed/withdrawn,provider_config_version_id?`. |
| KnowledgeChunk | `entry_id,locator,text,embedding?,embedding_config_id?,classification,source_digest`; permissions inherited and rechecked, not copied as permanently trusted ACL. |
| Conversation | `owner_user_id,title_fr,scope_refs[],retention_policy_version_id,state:active/archived`; no default cross-user sharing. |
| AssistantMessage | `conversation_id,role:user/assistant,text_fr?,source_refs:EvidenceRef[],business_refs:SnapshotRef[],model_config_version_id?,tool_result_refs[],state:pending/completed/failed,usage_ref?`. User text retains entered language; assistant UI replies French. |
| AdvisoryRun | `initiated_by,scope_refs[],input_watermark,rule_version_ids[],schedule_id?,job_id,state:queued/running/completed/partial/failed/cancelled,skipped_items:ReasonSchema[]`. |
| Recommendation | `run_id?,conversation_id?,action_code,target_ref,input_refs[],explanation_fr,missing_inputs[],alternatives:ProposalAlternative[],domain_proposal_id?,review_request_id?,state:draft/ready_for_review/in_review/approved/stale/rejected/executed`. |
| AdvisoryFeedback | `recommendation_id,user_id,classification:useful/rejected/false_positive/factual_error,reason_fr,evidence_refs[],reviewed:Boolean`; never a training-consent record. |
| AdvisorySchedule | `name_fr,scope_refs[],calendar_schedule:ScheduleSchema,timezone,enabled,service_identity_id,overlap_policy:skip_with_notice`, reviewed config. |

### Functional and failure rules

Index only clean approved-access documents with permitted processing destination. Mark unindexed failures clearly; extraction success is not indexing success. Retrieval first determines authorized source IDs, then searches text/vector subset and rechecks before generation. Cite precise available source locators, not fabricated page labels. Superseded material can support historical questions only when labelled and matched to as-of date; it cannot silently justify current compliance. Deleting/revoking a source invalidates index, summaries and reusable cache dependencies.

Structured business queries call allowlisted read services with current authorization; no model SQL execution. Calculations/eligibility/options use deterministic CR04/DF02 services. An answer distinguishes facts, assumptions, missing inputs and proposed actions. Regulatory questions lacking active sourced rules receive uncertainty, not a confident invented deadline. Prompt content from documents is untrusted data. Do not follow embedded requests to change permissions or contact outsiders.

Recommendation submission creates domain proposal and FD02 review, binding exact versions. Approved→executed happens only after a human invokes the domain command; assistant tool set cannot invoke it. Stale inputs require re-review, not auto-updated approval. Scan schedule/durations/token ceilings/model retention are approved config, **assumption to verify**. Prevent overlapping same-scope schedule runs; report skipped run, not silent success. Feedback may be retrieved as local reviewed counterexample context; external training off by default and out of scope.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /knowledge-entries`; `POST /knowledge-entries/{id}/index`; `/withdraw` | Entry DTO; index uses approved configuration → job. |
| `GET/POST /conversations`; `GET /conversations/{id}`; `POST /conversations/{id}/messages` | `{text,scope_refs?,as_of?}` → message/job; poll status or authorized same-origin event stream. |
| `GET /assistant-messages/{id}` | French answer, citations, assumptions, missing inputs and verified tool refs. |
| `POST /advisory-runs`; `GET /advisory-runs/{id}`; `POST /advisory-runs/{id}/cancel` | `{scope_refs[],analysis_kind}`; cancellation cannot undo executed domain effects. |
| `GET /recommendations`; `GET /recommendations/{id}`; `POST /recommendations/{id}/submit` | Submit `{selected_alternative_id,reason?}` → domain proposal/review, not posted effect. |
| `POST /recommendations/{id}/feedback` | `{classification,reason_fr,evidence_refs[]}`; no external transmission. |
| `GET/POST /advisory-schedules`; `PATCH /advisory-schedules/{id}` | Reviewed enabled/disabled schedule config; no arbitrary cron execution commands. |

Errors: `AI_PROCESSING_NOT_APPROVED` → `Le traitement par ce fournisseur n'est pas autorisé.`; `ANSWER_UNSUPPORTED` → `Aucune source accessible ne permet de confirmer cette réponse.`; `RECOMMENDATION_STALE` → `La proposition doit être recalculée et réexaminée.` Tests: prompt injection, cross-client retrieval, stale permission cache, obsolete rule, invented citation, provider outage, duplicate scan, false arithmetic and approved-but-stale proposal. Exit requires measured fixture results and disclosed unresolved quality targets, never a marketing accuracy claim.

---

## DF06 — Supported API and integration adapters

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Differentiators; L. Depends on CR02/CR04/CR07 and FD01–FD02. Single tenant. The internal endpoints specified in every module are the initial API contract. External clients receive only an explicit subset through scoped machine identity; there is no tenant header, tenant query or workspace selection.

### Stories, UI and permissions

An integration owner documents an approved external contract and tests it in a sandbox. A reviewer sees imported differences before a business posting. An operator retries a failed exchange without duplicate effects. Screens `/administration/integrations` (`Intégrations`), `/administration/integrations/{id}` (`Configuration de l'intégration`), `/administration/integrations/{id}/executions` (`Exécutions et erreurs`), `/administration/acces-api` (`Accès API`), `/documentation/api` (`Documentation de l'API`). Fields `Système`, `Contrat technique`, `Environnement`, `Opérations autorisées`, `Dernier test`, `Référence du secret`, `Dernier accusé`, `État`. Actions `Tester la connexion`, `Proposer l'activation`, `Désactiver`, `Relancer l'échange`, `Révoquer l'accès`.

Capabilities `integration.configure/test/activate`, `api_client.propose/approve/revoke`, `integration_run.read/retry`. Platform/integration operator configures; access administrator independently approves expanded machine permissions; business reviewers authorize financial/RED effects. Secret values never return in read DTOs or logs.

### Data model and adapter interface

| Entity | Fields |
|---|---|
| IntegrationDefinition | `code UNIQUE,label_fr,adapter_type:file/erp/accounting/mail/official,contract_source_refs[],supported_operations:ActionCode[],schema_version,adapter_version`. |
| IntegrationConfigVersion | `definition_id,environment:sandbox/production,approved_base_url?,secret_ref?,mapping_version_id?,allowed_operations[],state:draft/tested/approved/active/disabled,processing_destination_policy_id?,activation_review_id?`. |
| MachinePrincipal | `identity_subject UNIQUE,name,allowed_capabilities[],resource_scope_refs[],status:proposed/active/revoked,approval_id,credential_metadata_ref`; credentials in provider/vault, not app plaintext. |
| IntegrationRun | `config_version_id,operation_code,request_resource_refs[],idempotency_key,status:queued/running/sent/awaiting_ack/completed/failed/unknown,external_reference?,response_evidence_id?,job_id,last_error_code?`. |
| AdapterEvent | `integration_id,external_event_id,received_at,reported_at?,body_hash,signature_verification:verified/failed,raw_evidence_id?,normalized_record:DeclaredAdapterSchema,processing_state:received/review_required/applied/rejected`; unique integration/event_id. |

Adapter functions: `validateConfig(config)→issues`; `validatePayload(operation,payload)→issues`; `prepare(operation,snapshot)→ExchangePacket`; `send(packet,idempotencyKey)→{external_reference?,transport_state}`; `verifyReceipt(raw,headers)→verifiedReceipt|error`; `normalize(verifiedReceipt)→TypedObservation`. Adapter never mutates another module's tables. `send` unavailable for a file-only adapter; manual transmission records evidence in CR07.

### Integration inventory and activation gates

| Integration | Initial supported path | Live activation condition / fallback |
|---|---|---|
| Keycloak + Google/Microsoft | FD01 OIDC; optional configured identity brokering | Verified issuer/client/redirects and identity linking; local provider flow remains if approved. |
| File imports/exports | FD03/CR07 documented synthetic and customer-approved schemas | Approved actual format/version/fixture; unsupported official format says unavailable. |
| PortNet/BADR/other official systems | File/manual evidence first | Official documented access, credentials, schemas and acknowledgement semantics are **assumption to verify**; no invented API or browser bypass. |
| ERP/production/accounting | Approved export files; later specific documented adapter | Reconciled sandbox and mapping/version contract; incoming observations still require domain review. |
| Bank/guarantee | Manual verified documents | No payment API. Any read-only status adapter needs approved bank contract and source authenticity; otherwise manual confirmation. |
| Email/notifications | Approved mailbox adapter + SMTP/provider | Mailbox/destination consent and security policy; without config use in-app/manual upload. |
| AI/OCR/embeddings | Named provider adapter | Approved destination/model/output schema and retention; disabled if unapproved, manual workflows remain. |
| Object store/scanner | Deployment-local services | Integrity/access/scan tests; scanner failure quarantines documents. |

### API contract, errors and tests

Generate OpenAPI from shared DTOs and explicit route permissions. Partner API allowlist initially includes authorized reads and staging-import endpoints; it excludes approval/issue/post/release endpoints. If a later integration needs a mutation, it must create a proposal through the same domain workflow, never use human approval credentials. Authenticate machine principals with configured OIDC client credentials; check audience, issuer, expiry, scope and active local principal. No browser token as a machine credential.

Webhooks require authenticated source/signature scheme, replay-window policy and unique event ID. Unknown verification scheme or missing event identity disables live ingestion. Raw untrusted payload is quarantined evidence, never executed. Callback URLs and outbound domains are explicitly allowlisted; block private-network/metadata destinations unless required deployment-local service is registered. Timeouts/retries/backoff/page sizes/rate limits are configurable policy, **assumption to verify**. If network outcome is unknown, query documented status or mark unknown; do not blindly resend irreversible external operations.

Endpoints: `GET/POST /integrations`, `GET /integrations/{id}`, `POST /integrations/{id}/config-versions`, `POST /integration-config-versions/{id}/test` → job, `/activate` `{approval_id}`, `/disable` `{reason}`; `GET/POST /machine-principals` (proposal), `POST /machine-principals/{id}/activate` `{approval_id}`, `/revoke` `{reason}`; `POST /integration-runs` `{config_version_id,operation_code,resource_refs[]}`, `GET /integration-runs/{id}`, `POST /integration-runs/{id}/retry` `{reason}`; `POST /integrations/{id}/events` signed adapter-specific body; `GET /openapi.json` and authorized docs UI.

Errors: `INTEGRATION_NOT_ACTIVE` → `Cette intégration n'est pas activée.`; `EXTERNAL_OUTCOME_UNKNOWN` → `Le résultat externe est inconnu. Vérifiez l'état avant de relancer.`; `ADAPTER_SCHEMA_CHANGED` → `Le format reçu ne correspond plus au contrat validé.` Test revoked principal, cross-client scope, schema drift, forged/replayed event, SSRF URL, timeouts after send, idempotent normalization and partner attempt to call posting command. Exit: every claimed live adapter has contract evidence and passing integration tests; fake adapters are visibly sandbox-only.

---

## PL01 — Accessible French staff, client and field experience

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Polish; L. Depends on CR01/CR03/CR06. Basic accessibility/responsiveness is required from foundation; this item improves workflow speed and optional offline drafts. Single tenant, no organization/workspace switcher. No new financial/regulatory state machine.

### Stories and screen inventory

A keyboard user completes a dossier form without a mouse. A field agent captures an assigned mission note on a small screen. A client understands a validation error without technical jargon. An operator saves a useful filtered work view.

Screens `/travail/vues` (`Mes vues enregistrées`), `/terrain` (`Mes missions terrain`), `/terrain/missions/{id}` (`Mission terrain`), `/brouillons` (`Brouillons à synchroniser`), `/compte/preferences` (`Préférences`). All module detail routes use responsive layouts; do not build a separate unrestricted mobile API.

UI standards: field labels persist above inputs; placeholders are examples, never labels. Required fields show `Obligatoire`. Validation appears beside field and in a linked error summary. Preserve user edits after server failure. Confirmation states specify the effect: `La réponse a été envoyée pour vérification.` versus `La validation a été enregistrée.` All table columns/buttons and download names are French except official identifiers/source titles. Dates and money format with French locale; storage remains exact UTC/Decimal. Render server-translated safe error codes, not English exception strings.

### Data and permissions

| Entity | Fields |
|---|---|
| SavedView | `owner_user_id,resource_kind,name_fr,filters:AllowlistedFilterSchema,sort:AllowlistedSortSchema,columns:ColumnCode[],is_default:Boolean`; owner-only until explicit shared-view feature is specified. |
| UserPreference | `user_id,locale:fr,display_density:comfortable/compact,timezone_override?,notification_ui_preferences:PreferenceSchema`; timezone change affects display only, not contract calendars. |
| OfflineDraftEnvelope | Browser-local only: `draft_uuid,user_subject,resource_ref,base_version,kind:note/upload_metadata,event_payload:AllowedDraftSchema,created_at,last_edited_at,sync_state:local/pending/conflict/synced/failed`; attachments cached only if separate policy allows. |
| DraftSyncReceipt | Server: `draft_uuid,user_id,resource_ref,received_at,result_ref,status:accepted/conflict/rejected,payload_digest`; unique user/draft_uuid protects replay. |

Capabilities: own saved views/preferences; field contribution inherits `mission.event.submit` for assigned mission. Offline mode grants no permissions. It cannot approve a declaration, post a ledger/invoice, release a guarantee or submit official data. Offline attachment storage, duration and shared-device policy are **assumption to verify**; until approved, only in-memory drafts are supported and UI states that closing the browser loses them.

### Interaction and state rules

Navigation is semantic landmarks with skip link `Aller au contenu`. Dialogs trap/restore focus correctly; dropdowns and date controls keyboard operable; visible focus never removed. Statuses use text/icons as well as color. Charts include accessible data tables. Long operations show cancellable progress where supported and persistent job link. Inline edits have explicit save/cancel; no financial posting on blur. Empty filtered list distinguishes `Aucun résultat pour ces filtres.` from failed loading `Impossible de charger les données.`

Client/field views prioritize reference, next action, owner/contact and evidence; hide desktop-only secondary columns behind accessible disclosure, not inaccessible horizontal content. Keyboard shortcuts must be discoverable and cannot override text entry. Saved filters are revalidated against current schema and permissions; obsolete field gives migration notice instead of broadening query.

Offline operation: when policy enabled, cache only allowed minimal drafts in IndexedDB, partition by local user subject and purge on explicit logout/retention policy. Display `Hors connexion — brouillon non transmis`. Sync requires fresh authenticated session, current permission and target version. On mismatch, show server/current/local side-by-side and require user reconciliation; never last-write-wins. A verified field observation can be queued for review, not treated as confirmed while offline. User revocation cannot remotely erase an already disconnected device; block sync and purge on next authorized application contact. Do not promise impossible immediate offline erasure.

French is the only released UI language. Keep message keys and logical CSS properties translation-ready. Arabic/RTL activation requires reviewed copy and customer need (**assumption to verify**); no untranslated placeholders shipped. User-entered original text/source language is not forcibly translated.

### API

`GET/POST /me/saved-views`, `GET/PATCH /me/saved-views/{id}`, `POST /me/saved-views/{id}/archive`; `GET/PATCH /me/preferences`; `POST /draft-sync` `{draft_uuid,resource_ref,base_version,kind,payload}` → receipt+result or conflict DTO with only authorized fields; `GET /me/draft-sync-receipts/{draft_uuid}`. Draft sync delegates to draft/event submission services, never posting commands. Standard idempotency/ETags apply.

Tests: keyboard-only create/respond/review flows; screen-reader names; non-color status meaning; long French text; locale/decimal parsing; zoom/reflow; dropped connection during upload; duplicate sync; revoked grant; changed record; logout cache cleanup; saved filter schema drift. Accessibility target is WCAG AA conformance for chosen supported standard, with exact version recorded at bootstrap as technical compliance target; browser/device matrix and measured latency budgets are **assumption to verify**. Exit: no UI flow bypasses API policy and all visible product copy is French.

---

## PL02 — Credible launch, service and deployment operations

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Polish; L. Depends on foundation/core plus the explicitly chosen launch differentiators. Single tenant. This item packages tested behavior and operational proof; it must not claim undeployed modules, certifications, unlimited capacity or numerical savings.

### Stories, UI and capabilities

A prospect understands supported workflows and requests a scoped demonstration. An installation operator sees required configuration and actual health. A customer can retrieve organization-owned data independently of a commercial dispute. A service owner publishes support boundaries backed by restore/runbook evidence.

Public routes `/` (`Accueil`), `/solutions` (`Solutions`), `/fonctionnalites` (`Fonctionnalités`), `/offre` (`Offre et déploiement`), `/documentation` (`Documentation`), `/faq` (`Questions fréquentes`), `/contact` (`Parlons de votre projet`), `/demonstration` (`Demander une démonstration`), `/confidentialite` (`Confidentialité`). Staff `/rapports` (`Rapports`); operator `/administration/installation` (`État de l'installation`), `/administration/exploitation` (`Santé et traitements`), `/administration/sauvegardes` (`Sauvegardes et restauration`), `/administration/licence` (`Licence et modules`), `/administration/consommation` (`Consommation des services`), `/administration/exports` (`Export de mes données`).

Form labels `Nom`, `Société`, `Adresse e-mail professionnelle`, `Téléphone` (optional), `Besoins`, `Modules souhaités`, `Mode de déploiement souhaité`; action `Envoyer ma demande`. Confirmation `Votre demande a été enregistrée. Notre équipe vous recontactera.` only after persistence. No invented reply time. Data-use copy comes from approved privacy notice. Public request is not account creation, checkout or agreement signature.

Capabilities `public_lead.manage`, `installation.configure`, `health.read`, `backup.operate`, `license.manage`, `usage.read`, `report.read/export`, `data.export`. Reports obey business grants; technical operator cannot read business content just because they run backups. Complete exit export requires explicit authorized organization data custodian scope and audit. Public lead endpoint is narrow and rate limited; it cannot assign roles or activate modules.

### Model

| Entity | Fields |
|---|---|
| LeadRequest | `name,company,email,phone?,needs_fr?,requested_modules[],deployment_preference:hosted/on_premise/undecided,privacy_notice_version,contact_basis_acknowledged:Boolean,state:received/assigned/closed,assigned_user_id?`; no self-provisioning. |
| CapabilityPublication | `module_code,implemented_release_id,public_label_fr,description_fr,status:available/pilot/not_published,verification_report_id`; presentation checks actual release. |
| ReleaseRecord | `version_label,source_commit,image_digests[],migration_ids[],schema_contract_digest,test_report_refs[],deployed_at?,environment,approved_by?`. |
| InstallationLicense | `signed_payload:LicenseSchema,signature,key_id,verification_state:unconfigured/valid/invalid/expired,enabled_optional_modules[],valid_until?,contract_ref?`; verified by pinned issuer public key. |
| UsageEvent | `provider_code,operation_code,resource_ref?,units:UsageUnit[],provider_reported_cost?:Money,request_id UNIQUE,occurred_at`; unknown price remains null. |
| ServicePolicyVersion | `support_scope_fr,approved_response_targets?:TargetSchema,availability_objectives?:TargetSchema,recovery_objectives?:TargetSchema,approval_id,status`. No invented targets. |
| BackupRun / RestoreRun | Backup `manifest_ref,db_snapshot_ref,object_snapshot_ref,started_at,completed_at?,status,integrity_results`; restore `backup_run_id,isolated_environment_ref,checksums_result,reconciliation_result,review_id?,status`. |
| ReportDefinition | `code,label_fr,permission_code,filter_schema,calculation_version,denominator_description_fr`; ReportRun `definition_id,input_watermark,filters,result_ref,missing_inputs[],created_by`. |

### Functional rules and errors

Public capability list is curated from implemented release evidence; no fake “live” screenshots. Demo records are clearly labelled `Données de démonstration`, use synthetic documents and disabled live destinations. Demonstration may show blocker resolution and reconciliation, not prefilled invented ROI. SEO/sitemap includes only intentional public pages; exclude client/admin/auth callbacks. Contact form writes LeadRequest and outbox transaction; duplicate submission key returns same request, not repeated outreach.

Reports identify filters, as-of clock, source watermark, formula and unresolved fields. Broker blocker counts are distinct dossiers; financial metrics separated by currency; work/wait timing follows CR01; RED balances follow CR04. Do not average unlike units or present unmeasured time saved. Reports export through FD02 with current permissions. Staff-level performance scoring is not introduced.

Usage display distinguishes measured provider units, known provider cost and unknown price. Pricing, billing basis, ceilings and contractual limits are **assumption to verify**. Configurable budgets may stop new optional AI work only when approved; they cannot bypass financial/RED consistency or hide failed jobs. License errors disable newly gated optional work only under approved contract behavior; always preserve authorized historical read, correction-required visibility, export and security controls. No data destruction, silent downgrade, remote kill of access or invented grace period. Missing commercial policy shows `Conditions de licence à confirmer` and cannot publish a promise.

Environment operational details are in the delivery/operations section. Backup success means snapshot created; restore verification is a separate recorded result. Restore failure displays `Restauration non validée — consultez les contrôles.` rather than a healthy badge. CNDP/security statements link actual processing/hosting configuration and reviewed notices, never automatically declare certification.

### API

| Endpoints | Contract |
|---|---|
| `POST /public/demo-requests` | Lead DTO, abuse controls, idempotency; no authentication required, no sensitive uploads. |
| `GET /public/capabilities`; `GET /public/documentation-index` | Published DTO only; no internal module config. |
| `GET /lead-requests`; `POST /lead-requests/{id}/assign`; `/close` | `{assigned_user_id}` / `{reason}`; outbound contact not automatically inferred from assignment. |
| `GET /installation/readiness`; `GET /installation/health`; `GET /installation/usage` | Redacted policy/health/usage DTOs; no secrets/foreign clients. |
| `POST /installation/licenses/verify`; `/activate` | `{signed_payload,signature,key_id}`; activate `{approval_id}`; signature verification precedes changes. |
| `POST /backup-runs`; `GET /backup-runs/{id}`; `POST /restore-runs`; `GET /restore-runs/{id}` | Restore `{backup_run_id,isolated_target,approval_id}`; never overwrite production via this endpoint. |
| `GET /report-definitions`; `POST /report-runs`; `GET /report-runs/{id}` | `{definition_code,filters,as_of}` → job/snapshot; export current ACL check. |
| `POST /installation/exports`; `GET /installation/exports/{id}` | Uses FD03 export service and FD02 job access; no duplicate export implementation. |

Tests: public form retry/provider failure, expired/forged license, optional AI pause without data lockout, missing usage price, private report projection, incomplete backup object, failed restore checks and source-watermark report reproduction. Exit: French website/runbooks match delivered behavior, chosen production requirements are approved and validated, and recovery/export proof exists.

---

## Cross-cutting security, operations and delivery

This section applies to every module. It defines implementation requirements, not a claim that the product already complies with a law or achieves a service level. Business and service thresholds remain **assumption to verify** until approved. The product is single tenant: one operating organization per separately deployed environment.

### Security and privacy specification

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

#### Moroccan privacy and compliance decisions

Maintain a processing register recording purpose, categories of personal/business data, source, authorized recipients, processors, storage/processing locations, retention policy, legal basis and responsible reviewer. Determine the applicable Moroccan formalities with a qualified privacy owner. In particular, foreign data transfers require assessment of the applicable CNDP process; hosting or AI outside Morocco must not be enabled merely because a vendor offers encryption. See [CNDP: transfers abroad](https://www.cndp.ma/transfert-de-donnees-a-letranger/). The exact formalities, legal basis, required notices and approved destinations are **assumption to verify**.

Before enabling real personal data, record that assessment and approved processors. Before outbound processing, validate the configured destination against the approved processing register. A denied destination produces `Destination de traitement non autorisée.` and leaves the document available for authorized local/manual work. This is a technical control; the application does not determine legal adequacy itself.

Privacy requests are handled by an authorized privacy owner through evidence-backed review. Locate records by verified subject identifiers; distinguish subject access from unrestricted dossier export. Rectify mutable data through normal versioned correction; retain lawful accounting/regulatory evidence under the approved policy. Erasure cannot bypass a legal hold. Record the decision and minimum permitted tombstone. Retention durations, exemptions and request deadlines are **assumption to verify**; never hard-code a duration from this document.

Use FD02 ReviewRequest actions `privacy.export`, `privacy.rectify`, `privacy.erase`, with target scope, identity-verification evidence and policy-version references. Add `/administration/confidentialite` (`Confidentialité et conservation`) for authorized reviewers; list pending reviews and holds. Reuse FD02 export/purge jobs, not a second deletion implementation. Organization designates eligible existing users through explicit capabilities; an access administrator cannot gain business access simply by opening this screen.

Customs rules, invoice contents, retention and guarantees need qualified source-backed validation. Internal decisions, electronic acknowledgements and evidence exports must not display certification claims. Official acceptance remains an externally evidenced state throughout the application.

### Non-functional requirements

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

### Environments and deployment

#### Environment contract

| Environment | Data and dependencies | Allowed actions |
|---|---|---|
| Local development | Isolated PostgreSQL, object store, Keycloak and worker; synthetic fixtures and fake adapters; local secrets ignored by version control. | Developer resets only synthetic state. No production credentials or real outbound recipients. |
| CI/test | Disposable services and database per test run; deterministic provider fakes and explicitly versioned fixtures. | Schema migration, contract, concurrency and end-to-end tests. No real external filing, email delivery or money movement. |
| Staging | Separate database, buckets, identity realm, keys and service credentials; synthetic or approved irreversibly anonymized data. | Full release and isolated restore rehearsal; external sandbox only under verified contract. |
| Production | Dedicated organization deployment, approved region/providers/policies, own secrets and private storage. | Authorized live operations. Initial activation and infrastructure promotion recorded by platform operator under release approval. |

Configuration is validated at startup: `APP_BASE_URL`, `API_BASE_URL`, `DATABASE_URL` secret ref, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, OIDC secret ref, `SESSION_KEY_REF`, `OBJECT_STORE_ENDPOINT`, private bucket name, object-store credentials ref, scanner endpoint, business timezone, environment identity, approved policy-set ID and enabled-module list. Adapter secrets and model/provider configuration are separate scoped references. Secret strings never appear in readiness responses. Optional unconfigured modules remain disabled. Required invalid configuration makes the process not ready; do not auto-create production policies from local defaults.

Deployment topology: reverse proxy routes web and same-origin API; API/worker share only authorized database/object services; identity provider has its own persistence and administrative interface. Expose administrative infrastructure only over approved management access. Run migration job separately from API startup. Do not start multiple competing automatic schema migrations. A single-host production install is acceptable only if its verified availability/recovery requirements permit it; topology approval is **assumption to verify**.

#### Release procedure

1. Build immutable images from reviewed commit; record dependency inventory, contracts and migration identifiers in ReleaseRecord. Run required tests and security checks.
2. Confirm target configuration, approved policy readiness, operator access and backup/recovery evidence. Lock release operations to prevent concurrent deployments.
3. Apply backwards-compatible expand migrations first. If incompatible migration is unavoidable, enter explicit maintenance mode, stop accepting affected writes, drain or safely suspend workers and record the migration/restore plan before executing it.
4. Deploy compatible API/web/worker versions. Jobs store payload schema version; workers process only supported versions and quarantine unsupported jobs for review. Workers resume leased work with domain idempotency.
5. Run non-destructive production smoke checks: identity, authorized read, object service, queue health and policy readiness. Synthetic write checks use designated synthetic records only if the approved operational policy permits them; never post to live ledgers merely for monitoring.
6. Enable approved modules after smoke checks and business readiness gates pass. Publish only capabilities actually released. Observe service metrics against approved targets.
7. Contract/remove obsolete schema only in a later compatible release after validating no active reader/job requires it. Record operator and resulting release state.

Rollback uses the previous compatible image; it never blindly restores an older database over newly created business records. Failed forward migrations stop affected writes and require a rehearsed corrective migration or approved recovery procedure. External outcomes are reconciled after rollback; no duplicate resubmission of an unknown outcome.

#### Backup, restore and incident procedure

BackupRun captures database recovery position, object manifest and checksum references, identity configuration backup reference, application/config versions, key-recovery references and completion status. Protect backup keys separately. PostgreSQL and immutable objects must be recoverable to a coherent point: a database snapshot is insufficient if referenced document versions are absent. Backup frequency, retention, location and key custody are **assumption to verify**.

Restore always targets an isolated environment with outbound integrations disabled. Validate object existence/digests, domain foreign keys, ledger/coverage totals, invoice/payment balances, evidence/approval links and pending external outcomes. Measure actual recovery time and recovered data point. Promotion requires an approved incident recovery decision, controlled ingress cutover, credential/session revocation as appropriate and explicit reconciliation of events received after the restored point. A restore test cannot alter the live production instance.

Runbooks must cover: identity outage, scanner outage, object loss, database failure, stuck jobs, stale approvals, suspected credential exposure, failed backup, disputed external outcome and legal hold. Each records detection, safe containment, named responsible capability, recovery steps, data reconciliation and evidence required to close. Incident communication recipients and legal notification requirements are **assumption to verify**; no automatic externally addressed message without approved routing.

### Testing and definition of done

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

### Phased delivery plan and milestones

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

#### Execution order for developers

Create architecture records and shared schema/error/authorization packages first. Bootstrap identity, ResourceRecord, reviews, audit and outbox together, then documents and reference staging. Implement each business module vertically: migration and constraints → domain state/calculation services → transaction/approval commands → API contracts → French screens → invariant and user-journey tests → operational runbook. Commit opening balances only after the owning domain adapter passes its tests. Add extraction/advisory/integrations after deterministic domain services; they call proposal interfaces and cannot bypass them.

Maintain a delivery ledger with `module_id,requirement_id,implementation_ref,test_ref,status,blocking_policy_keys,reviewer,decision_ref`. Allowed statuses: `planned/in_progress/code_complete/acceptance_pending/released/blocked`. A policy dependency is visible rather than replaced by a developer guess. Dates, staffing, budget and pilot organization are **assumption to verify** and deliberately absent.

---

## Supplemental data and API contracts

This section resolves shared shorthand used in the module tables. It supplements the shared contract; it does not authorize new business operations. All schema definitions are versioned, reject undeclared keys and preserve exact Decimal strings. Unknown business parameter values remain **assumption to verify**.

### Physical model conventions

Use snake_case table/column names, UUID primary keys, foreign keys for every entity reference and CHECK constraints for enums, positive transaction quantities and required field combinations. A relation written `refs[]` is a child/join table with parent FK, referenced FK, ordinal where display order matters, and a uniqueness constraint on parent/reference unless explicitly supporting repeated lines. Arrays of primitive codes may be constrained PostgreSQL arrays. Snapshot payloads and approved named configuration schemas use JSONB with runtime validation and schema-version metadata; never store live ledger balances only in JSON.

Each concrete protected business resource shares its ID with ResourceRecord; create both in the same transaction. Child resources inherit parent scope only according to the shared authorization policy. Avoid FK cycles at creation by making source/approval references nullable until the corresponding transition requires them. Business draft statuses do not permit missing structurally necessary references: a draft invoice still needs its client, while issuing additionally requires tax/numbering policy. Reject cross-parent references even when both IDs are individually accessible.

Common module shorthand `review_id` or `review_request_id` references ReviewRequest; `approval_id` and `verified_decision_id` reference ApprovalDecision. `source_version_id` references DocumentVersion unless the field explicitly names a rule, mapping or other version. `source_document_id` on an immutable observation means DocumentVersion ID; use physical column `source_document_version_id` to remove ambiguity. Dates ending `_on` and admission/effective dates are Date; `_at` fields are Instant. Foreign business references ending `_ref` can be a ResourceRef or external text only where the entity explicitly says so; never resolve external text as a local UUID implicitly.

Immutable event rows may have a separate processing envelope whose status changes; event content does not. For example, ClientResponse payload is immutable while its review status changes with an audit event. Every status mutation increments envelope version. Approved rule/BOM/contract content is immutable even if its lifecycle metadata later becomes superseded.

Add transactional `IdempotencyRecord(principal_id,method,path,key,request_digest,state:in_progress/completed,result_status?,result_body?,resource_ref?,created_at,completed_at?)`, unique principal/method/path/key. Failed effects that roll back cannot leave a successful response. Persist terminal committed result in the same transaction as synchronous effect. Async command persists durable job reference and original response. Retention is approved policy; domain effect keys remain durable independently.

### Reusable value types

| Type | Shape and validation |
|---|---|
| Identifier | `{kind:Code,value:Text,normalization_rule_version_id?:UUID,normalized_value?:Text,verification_evidence_id?:UUID}`. Server computes normalization only from reviewed rule; original retained. No universal ICE/IF length/checksum invented. |
| Address | `{line_1:Text,line_2?:Text,city?:Text,postal_code?:Text,country_code?:Code}`. Country code from versioned reference list. Workflow-specific completeness checked on activation/issue. |
| Location | Reference entity `{code:Code UNIQUE,label_fr:Text,address?:Address,kind:port/warehouse/factory/customer/depot/other,status:draft/active/archived}`. No live geolocation implied. |
| ContainerRef | Reference entity `{number:Text,normalization_rule_version_id?:UUID,normalized_number?:Text,type_code?:Code,source_evidence_id?:UUID,status:active/archived}`. Enforce verified format/uniqueness only under the configured identifier rule. |
| TypedValue | Discriminated `{type:text/code/date/instant/decimal/money/quantity/boolean/null,value:corresponding type}`. Null value is literal null. Decimal does not silently become Money. |
| ReasonSchema | `{code:Code,message_fr:Text,resource_ref?:ResourceRef,field_path?:Text,policy_key?:Code}`; omit inaccessible resource details. |
| UsageUnit | `{kind:Code,value:Decimal,source:provider/measured,measurement_ref:Text}`; kind comes from selected provider schema; no assumed price. |
| TargetSchema | `{metric_code:Code,operator:lte/gte/eq,target:Decimal,unit_code:Code,measurement_window:ScheduleSchema,workload_profile_ref:UUID,evidence_refs:EvidenceRef[]}`. Service owner supplies values. |

Location and ContainerRef are reference data owned by FD03. Expose `GET/POST /locations`, `GET/PATCH /locations/{id}`, `POST /locations/{id}/activate`, `/archive`, and equivalent `/containers` reference routes. Operations manager reviews activation; identifier policy changes use rule review. French fields: `Lieu`, `Type de lieu`, `Adresse`, `Numéro de conteneur`, `Type de conteneur`. These support the already scoped transport/production records; no fleet-tracking product is added.

#### Versioned numeric and calendar policies

| Entity | Required fields / invariant |
|---|---|
| FxRateVersion | `from_currency_code,to_currency_code,rate:Decimal,rate_date:Date,source_evidence_id,review_id,state:draft/approved/superseded`. Positive rate explicitly expresses one source-currency unit in destination currency. No implicit reciprocal/triangulation; every calculation records selected version. |
| NumberSeriesVersion | `document_kind:invoice/credit_note,format_segments:SeriesSegment[],reset_policy:none/calendar_year,timezone,effective_from,source_evidence_id,review_id,state`. Segment is literal text, year or sequence; policy values are supplied by finance, **assumption to verify**. |
| NumberIssue | `series_version_id,sequence_value:bigint,rendered_number:Text,document_resource_id,issued_at`. Unique series/sequence, rendered number within document kind and document resource. Allocate under row lock within issue transaction. Never reuse an issued number; cancellation records remain. |
| CalendarPolicyVersion | `code,timezone,period_unit:calendar_day/business_day/hour,weekdays_included:Code[],excluded_dates:Date[],included_dates:Date[],start_inclusive:Boolean,end_inclusive:Boolean,partial_period_rule:floor/ceiling/exact_fraction,ambiguous_time_rule:earlier/later/reject,nonexistent_time_rule:shift_forward/reject,source_evidence_id,review_id,state`. Values supplied by reviewed contract/regulatory policy. Date rules use local calendar, not UTC-day addition. |

Use explicit configured start boundary, stop boundary and local timezone. A date-only source requiring an instant is incomplete unless its rule supplies that conversion. Clock precision and rounding occur only at the approved step. The software must not default an unknown calendar to ordinary weekdays or unknown FX to parity.

Administration routes `/administration/regles/devises` (`Devises et conversion`), `/administration/regles/numerotation` (`Numérotation des documents`) and `/administration/regles/calendriers` (`Calendriers de calcul`). Internal APIs `GET/POST /fx-rate-versions`, `/number-series-versions`, `/calendar-policy-versions`; `GET /{collection}/{id}`; `POST /{collection}/{id}/submit`, `/activate`. Draft PATCH permitted; approved content never changes. Financial reviewers activate currency/number policy; qualified rule reviewer activates regulatory calendar, with finance/transport reviewer for commercial applicability. Each is independently reviewed. CurrencyPolicy from FD03 follows the same version lifecycle via `/currency-policies`.

### Mapping, workflow and comparison schemas

`MappingSchema = {source_schema_id,target_resource_kind,fields:[{source_path,target_path,transforms:AllowlistedTransform[],required:Boolean}]}`. Paths must exist in the source schema and target draft DTO. `TransformSchema` is the same ordered transforms registry, not separate executable code. A transform is discriminated: `trim`, `nfc`, `parse_date(format,timezone?)`, `parse_decimal(decimal_separator,group_separator?)`, `lookup(reference_kind,key_field)`, `normalize_identifier(rule_version_id)` or `convert_unit(conversion_rule_version_id)`. Locale/date formats are explicit reviewed values; ambiguous parse is an error. No arbitrary expressions, JavaScript, SQL, shell, file paths or HTTP calls.

`DeclaredSourceSchema`, `SourceRecordSchema` and `DeclaredAdapterSchema` identify a validated JSON Schema document by immutable schema ID/version/digest; format owner supplies the actual external fields. `TargetDTO` selects a registered draft command schema by resource kind, never an arbitrary table. Record original input and normalized output separately. Unsupported source fields appear in the import report and cannot silently disappear.

`AcknowledgementSchema = {external_id_path,status_path,status_mapping:[{source_value,normalized_state}],reported_at_path?,signature_contract_ref?,required_evidence_fields:Text[],supersession_rule_ref?}`. Only documented mapping can produce accepted/rejected states; unknown statuses remain unknown. A local file format is not evidence that an official system accepts it.

`StepDefinition = {code,label_fr,owner_capability,required:Boolean,requirement_codes:Code[],completion_event_codes:Code[]}`. `DependencyDefinition = {predecessor_code,successor_code}`; validate every reference, reject self edge/cycle and freeze published template. Workflow instantiation copies approved template version and scope. Completion events reference registered domain events, not UI checkbox values.

`ResolutionSchema` is one of `document(document_type,verification_required)`, `field(field_path,validation_rule_version_id)`, `decision(action_code)`, `external_observation(system_code,accepted_states[])`, `task(completion_event_code,evidence_required)`, or `all(requirements[])`. Completion revalidates underlying facts and current evidence; unknown never resolves a blocker. A manual operational override is a distinct reviewed decision and is forbidden for legal/ledger invariants.

`ComparisonSchema = {inputs:[{document_type,field_path,normalization_steps}],unit_rule_version_id?,rounding_policy_id?,tolerance_rule_version_id?}`. Compare like typed values only. Missing input yields incomplete; no unknown-to-zero conversion. `CalculationSchema = {formula_code,formula_version,inputs:[{name,value:TypedValue,source_ref}],outputs:[{name,value:TypedValue}],rounding_policy_ids:UUID[],missing_inputs:ReasonSchema[]}`. Formula implementation comes from version-controlled code and binds reviewed rule parameters.

`ApprovedEligibilitySchema = {schema_version_id,attributes:[{key:Code,value:TypedValue,evidence_refs:EvidenceRef[]}]}`. Attributes and types must match the selected regime's approved schema. Absence of an eligibility attribute remains unknown. Minimal rule registry introduced before core shares the DF04 RuleDefinition/RuleVersion tables and evaluator; there is no temporary competing rule store.

### Controlled commands and permissions

`VersionedCommandDTO = {schema_version:Code,action_code:Code,target_ref:ResourceRef,payload:registered action DTO,input_refs:SnapshotRef[]}`. The server assembles canonical action payload and dependencies at submission. Caller-selected `reviewer_capability`, `approved_by`, input digest, effects or lifecycle state are rejected. Approval decision checks the server-owned action registry, submitter independence, current scope, evidence and input versions. Action DTO schemas and capability registry are checked into `packages/contracts`, exported to OpenAPI and covered by route tests.

| Action family | Submitter / operator | Required independent reviewer |
|---|---|---|
| Role/resource/machine privilege expansion | `access_admin` prepares; platform operator may propose machine config. | Different `access_admin` with scoped access-change approval. |
| Operational reference/workflow/override | Scoped operations staff. | `operations_manager`; regulatory requirements cannot use operational override. |
| Declaration and mandate official evidence | `dossier_agent` or scoped declarant submits. | `declarant_reviewer` with verified applicable authority. |
| Cost, invoice, receipt and payment allocation | `finance_operator`. | `finance_reviewer`. |
| Transport event correction/readiness exception | Field agent or dispatcher. | Different scoped `dispatcher` or `operations_manager`; official clearance still declarant review. |
| RED projects/BOM/flows/allocation/reversal | `red_operator`. | `red_reviewer`. |
| RED deadline/guarantee regulatory outcome | Scoped RED operator. | `red_reviewer`; financial release evidence also needs `finance_reviewer` where monetary effect is requested. |
| Production operational acceptance | `production_contributor`. | `operations_manager` with `production.accept`; a RED reconciliation additionally requires `red_reviewer`. |
| Rules and interpretations | Scoped draft author. | Qualified `rule_reviewer`; domain applicability requires the corresponding finance/RED/declarant capability when relevant. |
| Client cost/instruction consent | Named external recipient. | `external_approver` with verified ClientAuthority; separate internal review remains mandatory. |
| Privacy export/erase and retention exceptions | Explicit privacy operator capability on a scoped user. | Different designated privacy reviewer capability plus required lawful policy evidence. No default assignment to all administrators. |
| Integration activation, restore, deployment policy | `platform_operator`. | Different `platform_operator` with explicit `installation.approve`; access expansion separately requires access reviewer. |

When an action requires several independent capability decisions, store them against the same frozen review payload and require every required decision before effect. The submitter cannot supply any of them. A reviewer may satisfy multiple required capabilities if explicitly granted and qualified; do not invent a required staff count. If the organization cannot fulfill the approved policy, display the pending state; no automatic self-approval exception.

Informational request response acceptance by scoped operations staff is not a monetary/regulatory approval. Domain-controlled outcomes require the appropriate action above even if an API table marks `approval_id?`: optional applies only to an informational transition. Endpoint `/approve` consumes an existing FD02 decision; it does not create unchecked approval by toggling state. Exact capability keys for generic references are `reference.read`, `reference.write`, `reference.approve`, with applicability-specific reviewer check above.

#### RED correction envelope

Add `RedReversalProposal(transaction_id,reason,evidence_refs[],input_refs[],review_id,state:draft/in_review/approved/stale/posted/rejected,result_transaction_id?)`. Exact reversal negates the original transaction's lot/coverage effects; callers do not provide arbitrary negative quantities. Source transaction may be reversed only once; preserve permanent unique reversal link. Any dependency that makes reversal invalid must first be corrected through its own reviewed action.

`RedCorrectionDTO` is `reverse {transaction_id,reversal_proposal_id}` or `reverse_and_replace {transaction_id,reversal_proposal_id,replacement_allocation_proposal_id}`. Replacement uses CR04's normal eligibility, quantity, BOM, locks and approval checks. Commit reverse-and-replace atomically; if replacement fails, neither effect becomes visible. Other disposition/adjustment types stay unavailable until a reviewed legal rule and domain command specification exist. DF03 can explain unsupported waste/return treatment without inventing a posting command. Opening entries use FD03's reviewed opening adapter and cannot be created as arbitrary corrections.

### Client projection and response schemas

Client dossier DTO allowlist: `id,reference,operation_label_fr,client_visible_status_fr,published_timeline_entries,next_client_action_ids,shared_document_refs`. Each child still requires current access. No internal workflow identifiers, staff notes, margins, undisclosed disputes, model prompts or raw evidence metadata. Client invoice DTO allowlist: `id,number,issued_on,counterparty_legal_snapshot,published_lines,tax_breakdown,total,currency_code,due_on?,published_payment_balance,published_document_ref`. Return only issued, explicitly shared records; values derive from finance services. A field absent due to unknown approved policy is represented as null plus safe French reason, never invented.

`RequestResponseSchema` and `StoredResponseSchema` are discriminated by request kind:

- `document`: requested document types and required count/alternatives from approved requirement; response `{document_version_ids:UUID[],comment_fr?:Text}`. Do not guess count; validate against the published request.
- `field_correction`: allowlisted `{field_path,current_value:TypedValue,expected_type}`; response `{changes:[{field_path,value:TypedValue}],comment_fr?}`. Creates a proposal only.
- `instruction`: frozen instruction and target digest; response `{decision:approve/reject,reason?:Text,target_digest:Text}`. Rejection requires reason and approval requires verified authority.
- `cost_approval`: exact displayed Money, purpose and digest; response `{decision:approve/reject,reason?:Text,target_digest:Text}`. No mutable client-submitted amount.

`CounterpartyEditableDTO = {legal_name?,address?,contact_changes?:[{contact_id?,display_name,email?,phone?,job_title?}]}`. Omit identifiers, status, roles and bank/payment details from client-editable changes. Staff verifies legal-name/address consequences before apply; issued snapshots remain unchanged.

`FrenchTemplateSchema = {template_code,template_version,resource_ref,variables:registered named values}`. Allowed notification variables are safe record label, required action label and authenticated application-relative path; confidential amounts/content stay behind authentication. Templates are versioned French text, never arbitrary caller HTML. Recipient access rechecked at render/delivery.

### Preferences, schedules and operational schemas

`AllowlistedFilterSchema = {resource_kind,clauses:[{field,operator:eq/in/before/after,is_null?:Boolean,value?:TypedValue}]}`; fields/operators must match list endpoint allowlist. No raw SQL. `AllowlistedSortSchema = {field,direction:asc/desc}`; append stable ID tie-breaker. Saved columns reference server-declared permitted ColumnCode values. Saved views cannot grant access.

`PreferenceSchema = {show_read_notifications:Boolean}`. Notification channel/category settings remain NotificationPreference records. `AllowedDraftSchema` is `note {text_fr,resource_ref}` or `upload_metadata {filename,document_type,resource_ref}`; content uploads still follow quarantine. Offline input does not assert a verified business event or official status. Sync presents differences and requires user resolution on changed base version.

`ScheduleSchema = {kind:once/daily/weekly/monthly,timezone,local_time,starts_on,ends_on?,weekdays?:Code[],day_of_month?:Integer,missing_day_policy?:skip/last_day,ambiguous_time_rule:earlier/later/reject,nonexistent_time_rule:skip/shift_forward}`. Validate fields by kind; once includes an explicit local date. No default cadence or durations. Occurrence key is schedule ID/version/intended local occurrence; unique execution dedupes retries. Store computed UTC firing time and basis timezone. Disable schedule when required values or permission are missing. Advisory overlap is skip-with-notice as DF05 specifies.

`LicenseSchema = {schema_version,installation_binding:Text,module_codes:ModuleCode[],issued_at,valid_from,valid_until?,contract_reference}`. Installation binding is a locally generated deployment fingerprint stored only in singleton configuration, not a tenant identifier in business rows. Signed format and issuer/key rotation contract are **assumption to verify**; module/license enforcement remains unconfigured until supplied. Validation rejects unknown signed-payload fields and unknown module codes. A signature verifies issuer integrity; it does not authorize unpublished commercial terms.

`ReportDefinition.filter_schema` references the same allowlisted filters; `integrity_results`, restore checks and reconciliation results contain `{check_code,status:passed/failed/unavailable,message_fr,evidence_ref?}` records. `SafeDTO` is a named per-error schema registered in OpenAPI; default is absent. Never copy raw exception context into it.

### API completion rules

Every table-listed GET/POST pair expands to two distinct OpenAPI operations. Abbreviated action paths such as `/cancel` inherit the immediately preceding collection/item base in that table row. Supplemental routes use the same `/api/v1` prefix. Do not implement literal template placeholders such as `/{collection}` as unrestricted generic controllers; generate concrete typed routes for the named collections.

CreateDTO includes business-authored fields only: exclude common IDs/timestamps/actors, lifecycle status, derived totals, hashes, approval decisions, verified flags and external acceptance. A command-specific source observation may supply reported status as unverified input; verification is separate. PatchDTO is that allowlist restricted to mutable lifecycle state. ReadDTO includes permitted derived fields and ETag; staff entities are not serialized directly to clients. Child arrays represent transactional nested commands; unrelated parents cannot be reassigned by PATCH.

Pagination and every resource collection use authorized stable keysets. Filter parameter shorthand `client` means `counterparty_id`, `office` means `customs_office_id`, `owner` means `owner_id`; OpenAPI exposes only canonical names. Date ranges use `from` inclusive and `until` exclusive with Date/Instant type declared per endpoint. Invalid/ambiguous calendar input is `422`, not coerced.

For upload allocation/streaming, submit/complete commands carry idempotency keys while byte-stream requests use the upload-session token, expected checksum and offset/content-range contract chosen for the approved storage provider; do not create a second document on stream retry. File size/chunk limits are **assumption to verify**. Auth redirect/callback and public read endpoints follow their protocol rather than the generic command body convention; public demo request is the explicitly authorized unauthenticated mutation with abuse controls.

All missing business schemas, provider contracts or policy values have a tracked PolicyRequirement. Developers implement the typed registry, validation and unavailable path; they must not silently create plausible customs values. A capability is production-ready only after its relevant concrete schema/policy fixtures are approved and tested.

