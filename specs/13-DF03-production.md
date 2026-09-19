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
