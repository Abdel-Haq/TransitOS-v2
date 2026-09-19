# Supplemental data and API contracts

This section resolves shared shorthand used in the module tables. It supplements the shared contract; it does not authorize new business operations. All schema definitions are versioned, reject undeclared keys and preserve exact Decimal strings. Unknown business parameter values remain **assumption to verify**.

## Physical model conventions

Use snake_case table/column names, UUID primary keys, foreign keys for every entity reference and CHECK constraints for enums, positive transaction quantities and required field combinations. A relation written `refs[]` is a child/join table with parent FK, referenced FK, ordinal where display order matters, and a uniqueness constraint on parent/reference unless explicitly supporting repeated lines. Arrays of primitive codes may be constrained PostgreSQL arrays. Snapshot payloads and approved named configuration schemas use JSONB with runtime validation and schema-version metadata; never store live ledger balances only in JSON.

Each concrete protected business resource shares its ID with ResourceRecord; create both in the same transaction. Child resources inherit parent scope only according to the shared authorization policy. Avoid FK cycles at creation by making source/approval references nullable until the corresponding transition requires them. Business draft statuses do not permit missing structurally necessary references: a draft invoice still needs its client, while issuing additionally requires tax/numbering policy. Reject cross-parent references even when both IDs are individually accessible.

Common module shorthand `review_id` or `review_request_id` references ReviewRequest; `approval_id` and `verified_decision_id` reference ApprovalDecision. `source_version_id` references DocumentVersion unless the field explicitly names a rule, mapping or other version. `source_document_id` on an immutable observation means DocumentVersion ID; use physical column `source_document_version_id` to remove ambiguity. Dates ending `_on` and admission/effective dates are Date; `_at` fields are Instant. Foreign business references ending `_ref` can be a ResourceRef or external text only where the entity explicitly says so; never resolve external text as a local UUID implicitly.

Immutable event rows may have a separate processing envelope whose status changes; event content does not. For example, ClientResponse payload is immutable while its review status changes with an audit event. Every status mutation increments envelope version. Approved rule/BOM/contract content is immutable even if its lifecycle metadata later becomes superseded.

Add transactional `IdempotencyRecord(principal_id,method,path,key,request_digest,state:in_progress/completed,result_status?,result_body?,resource_ref?,created_at,completed_at?)`, unique principal/method/path/key. Failed effects that roll back cannot leave a successful response. Persist terminal committed result in the same transaction as synchronous effect. Async command persists durable job reference and original response. Retention is approved policy; domain effect keys remain durable independently.

## Reusable value types

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

### Versioned numeric and calendar policies

| Entity | Required fields / invariant |
|---|---|
| FxRateVersion | `from_currency_code,to_currency_code,rate:Decimal,rate_date:Date,source_evidence_id,review_id,state:draft/approved/superseded`. Positive rate explicitly expresses one source-currency unit in destination currency. No implicit reciprocal/triangulation; every calculation records selected version. |
| NumberSeriesVersion | `document_kind:invoice/credit_note,format_segments:SeriesSegment[],reset_policy:none/calendar_year,timezone,effective_from,source_evidence_id,review_id,state`. Segment is literal text, year or sequence; policy values are supplied by finance, **assumption to verify**. |
| NumberIssue | `series_version_id,sequence_value:bigint,rendered_number:Text,document_resource_id,issued_at`. Unique series/sequence, rendered number within document kind and document resource. Allocate under row lock within issue transaction. Never reuse an issued number; cancellation records remain. |
| CalendarPolicyVersion | `code,timezone,period_unit:calendar_day/business_day/hour,weekdays_included:Code[],excluded_dates:Date[],included_dates:Date[],start_inclusive:Boolean,end_inclusive:Boolean,partial_period_rule:floor/ceiling/exact_fraction,ambiguous_time_rule:earlier/later/reject,nonexistent_time_rule:shift_forward/reject,source_evidence_id,review_id,state`. Values supplied by reviewed contract/regulatory policy. Date rules use local calendar, not UTC-day addition. |

Use explicit configured start boundary, stop boundary and local timezone. A date-only source requiring an instant is incomplete unless its rule supplies that conversion. Clock precision and rounding occur only at the approved step. The software must not default an unknown calendar to ordinary weekdays or unknown FX to parity.

Administration routes `/administration/regles/devises` (`Devises et conversion`), `/administration/regles/numerotation` (`Numérotation des documents`) and `/administration/regles/calendriers` (`Calendriers de calcul`). Internal APIs `GET/POST /fx-rate-versions`, `/number-series-versions`, `/calendar-policy-versions`; `GET /{collection}/{id}`; `POST /{collection}/{id}/submit`, `/activate`. Draft PATCH permitted; approved content never changes. Financial reviewers activate currency/number policy; qualified rule reviewer activates regulatory calendar, with finance/transport reviewer for commercial applicability. Each is independently reviewed. CurrencyPolicy from FD03 follows the same version lifecycle via `/currency-policies`.

## Mapping, workflow and comparison schemas

`MappingSchema = {source_schema_id,target_resource_kind,fields:[{source_path,target_path,transforms:AllowlistedTransform[],required:Boolean}]}`. Paths must exist in the source schema and target draft DTO. `TransformSchema` is the same ordered transforms registry, not separate executable code. A transform is discriminated: `trim`, `nfc`, `parse_date(format,timezone?)`, `parse_decimal(decimal_separator,group_separator?)`, `lookup(reference_kind,key_field)`, `normalize_identifier(rule_version_id)` or `convert_unit(conversion_rule_version_id)`. Locale/date formats are explicit reviewed values; ambiguous parse is an error. No arbitrary expressions, JavaScript, SQL, shell, file paths or HTTP calls.

`DeclaredSourceSchema`, `SourceRecordSchema` and `DeclaredAdapterSchema` identify a validated JSON Schema document by immutable schema ID/version/digest; format owner supplies the actual external fields. `TargetDTO` selects a registered draft command schema by resource kind, never an arbitrary table. Record original input and normalized output separately. Unsupported source fields appear in the import report and cannot silently disappear.

`AcknowledgementSchema = {external_id_path,status_path,status_mapping:[{source_value,normalized_state}],reported_at_path?,signature_contract_ref?,required_evidence_fields:Text[],supersession_rule_ref?}`. Only documented mapping can produce accepted/rejected states; unknown statuses remain unknown. A local file format is not evidence that an official system accepts it.

`StepDefinition = {code,label_fr,owner_capability,required:Boolean,requirement_codes:Code[],completion_event_codes:Code[]}`. `DependencyDefinition = {predecessor_code,successor_code}`; validate every reference, reject self edge/cycle and freeze published template. Workflow instantiation copies approved template version and scope. Completion events reference registered domain events, not UI checkbox values.

`ResolutionSchema` is one of `document(document_type,verification_required)`, `field(field_path,validation_rule_version_id)`, `decision(action_code)`, `external_observation(system_code,accepted_states[])`, `task(completion_event_code,evidence_required)`, or `all(requirements[])`. Completion revalidates underlying facts and current evidence; unknown never resolves a blocker. A manual operational override is a distinct reviewed decision and is forbidden for legal/ledger invariants.

`ComparisonSchema = {inputs:[{document_type,field_path,normalization_steps}],unit_rule_version_id?,rounding_policy_id?,tolerance_rule_version_id?}`. Compare like typed values only. Missing input yields incomplete; no unknown-to-zero conversion. `CalculationSchema = {formula_code,formula_version,inputs:[{name,value:TypedValue,source_ref}],outputs:[{name,value:TypedValue}],rounding_policy_ids:UUID[],missing_inputs:ReasonSchema[]}`. Formula implementation comes from version-controlled code and binds reviewed rule parameters.

`ApprovedEligibilitySchema = {schema_version_id,attributes:[{key:Code,value:TypedValue,evidence_refs:EvidenceRef[]}]}`. Attributes and types must match the selected regime's approved schema. Absence of an eligibility attribute remains unknown. Minimal rule registry introduced before core shares the DF04 RuleDefinition/RuleVersion tables and evaluator; there is no temporary competing rule store.

## Controlled commands and permissions

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

### RED correction envelope

Add `RedReversalProposal(transaction_id,reason,evidence_refs[],input_refs[],review_id,state:draft/in_review/approved/stale/posted/rejected,result_transaction_id?)`. Exact reversal negates the original transaction's lot/coverage effects; callers do not provide arbitrary negative quantities. Source transaction may be reversed only once; preserve permanent unique reversal link. Any dependency that makes reversal invalid must first be corrected through its own reviewed action.

`RedCorrectionDTO` is `reverse {transaction_id,reversal_proposal_id}` or `reverse_and_replace {transaction_id,reversal_proposal_id,replacement_allocation_proposal_id}`. Replacement uses CR04's normal eligibility, quantity, BOM, locks and approval checks. Commit reverse-and-replace atomically; if replacement fails, neither effect becomes visible. Other disposition/adjustment types stay unavailable until a reviewed legal rule and domain command specification exist. DF03 can explain unsupported waste/return treatment without inventing a posting command. Opening entries use FD03's reviewed opening adapter and cannot be created as arbitrary corrections.

## Client projection and response schemas

Client dossier DTO allowlist: `id,reference,operation_label_fr,client_visible_status_fr,published_timeline_entries,next_client_action_ids,shared_document_refs`. Each child still requires current access. No internal workflow identifiers, staff notes, margins, undisclosed disputes, model prompts or raw evidence metadata. Client invoice DTO allowlist: `id,number,issued_on,counterparty_legal_snapshot,published_lines,tax_breakdown,total,currency_code,due_on?,published_payment_balance,published_document_ref`. Return only issued, explicitly shared records; values derive from finance services. A field absent due to unknown approved policy is represented as null plus safe French reason, never invented.

`RequestResponseSchema` and `StoredResponseSchema` are discriminated by request kind:

- `document`: requested document types and required count/alternatives from approved requirement; response `{document_version_ids:UUID[],comment_fr?:Text}`. Do not guess count; validate against the published request.
- `field_correction`: allowlisted `{field_path,current_value:TypedValue,expected_type}`; response `{changes:[{field_path,value:TypedValue}],comment_fr?}`. Creates a proposal only.
- `instruction`: frozen instruction and target digest; response `{decision:approve/reject,reason?:Text,target_digest:Text}`. Rejection requires reason and approval requires verified authority.
- `cost_approval`: exact displayed Money, purpose and digest; response `{decision:approve/reject,reason?:Text,target_digest:Text}`. No mutable client-submitted amount.

`CounterpartyEditableDTO = {legal_name?,address?,contact_changes?:[{contact_id?,display_name,email?,phone?,job_title?}]}`. Omit identifiers, status, roles and bank/payment details from client-editable changes. Staff verifies legal-name/address consequences before apply; issued snapshots remain unchanged.

`FrenchTemplateSchema = {template_code,template_version,resource_ref,variables:registered named values}`. Allowed notification variables are safe record label, required action label and authenticated application-relative path; confidential amounts/content stay behind authentication. Templates are versioned French text, never arbitrary caller HTML. Recipient access rechecked at render/delivery.

## Preferences, schedules and operational schemas

`AllowlistedFilterSchema = {resource_kind,clauses:[{field,operator:eq/in/before/after,is_null?:Boolean,value?:TypedValue}]}`; fields/operators must match list endpoint allowlist. No raw SQL. `AllowlistedSortSchema = {field,direction:asc/desc}`; append stable ID tie-breaker. Saved columns reference server-declared permitted ColumnCode values. Saved views cannot grant access.

`PreferenceSchema = {show_read_notifications:Boolean}`. Notification channel/category settings remain NotificationPreference records. `AllowedDraftSchema` is `note {text_fr,resource_ref}` or `upload_metadata {filename,document_type,resource_ref}`; content uploads still follow quarantine. Offline input does not assert a verified business event or official status. Sync presents differences and requires user resolution on changed base version.

`ScheduleSchema = {kind:once/daily/weekly/monthly,timezone,local_time,starts_on,ends_on?,weekdays?:Code[],day_of_month?:Integer,missing_day_policy?:skip/last_day,ambiguous_time_rule:earlier/later/reject,nonexistent_time_rule:skip/shift_forward}`. Validate fields by kind; once includes an explicit local date. No default cadence or durations. Occurrence key is schedule ID/version/intended local occurrence; unique execution dedupes retries. Store computed UTC firing time and basis timezone. Disable schedule when required values or permission are missing. Advisory overlap is skip-with-notice as DF05 specifies.

`LicenseSchema = {schema_version,installation_binding:Text,module_codes:ModuleCode[],issued_at,valid_from,valid_until?,contract_reference}`. Installation binding is a locally generated deployment fingerprint stored only in singleton configuration, not a tenant identifier in business rows. Signed format and issuer/key rotation contract are **assumption to verify**; module/license enforcement remains unconfigured until supplied. Validation rejects unknown signed-payload fields and unknown module codes. A signature verifies issuer integrity; it does not authorize unpublished commercial terms.

`ReportDefinition.filter_schema` references the same allowlisted filters; `integrity_results`, restore checks and reconciliation results contain `{check_code,status:passed/failed/unavailable,message_fr,evidence_ref?}` records. `SafeDTO` is a named per-error schema registered in OpenAPI; default is absent. Never copy raw exception context into it.

## API completion rules

Every table-listed GET/POST pair expands to two distinct OpenAPI operations. Abbreviated action paths such as `/cancel` inherit the immediately preceding collection/item base in that table row. Supplemental routes use the same `/api/v1` prefix. Do not implement literal template placeholders such as `/{collection}` as unrestricted generic controllers; generate concrete typed routes for the named collections.

CreateDTO includes business-authored fields only: exclude common IDs/timestamps/actors, lifecycle status, derived totals, hashes, approval decisions, verified flags and external acceptance. A command-specific source observation may supply reported status as unverified input; verification is separate. PatchDTO is that allowlist restricted to mutable lifecycle state. ReadDTO includes permitted derived fields and ETag; staff entities are not serialized directly to clients. Child arrays represent transactional nested commands; unrelated parents cannot be reassigned by PATCH.

Pagination and every resource collection use authorized stable keysets. Filter parameter shorthand `client` means `counterparty_id`, `office` means `customs_office_id`, `owner` means `owner_id`; OpenAPI exposes only canonical names. Date ranges use `from` inclusive and `until` exclusive with Date/Instant type declared per endpoint. Invalid/ambiguous calendar input is `422`, not coerced.

For upload allocation/streaming, submit/complete commands carry idempotency keys while byte-stream requests use the upload-session token, expected checksum and offset/content-range contract chosen for the approved storage provider; do not create a second document on stream retry. File size/chunk limits are **assumption to verify**. Auth redirect/callback and public read endpoints follow their protocol rather than the generic command body convention; public demo request is the explicitly authorized unauthenticated mutation with abuse controls.

All missing business schemas, provider contracts or policy values have a tracked PolicyRequirement. Developers implement the typed registry, validation and unavailable path; they must not silently create plausible customs values. A capability is production-ready only after its relevant concrete schema/policy fixtures are approved and tested.
