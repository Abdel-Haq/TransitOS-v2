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
