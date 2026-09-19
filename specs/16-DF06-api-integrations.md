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
