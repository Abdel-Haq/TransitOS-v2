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
