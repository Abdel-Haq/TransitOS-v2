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
