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
