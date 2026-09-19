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
