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
