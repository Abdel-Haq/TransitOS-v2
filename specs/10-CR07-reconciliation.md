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
