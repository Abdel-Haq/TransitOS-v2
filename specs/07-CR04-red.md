## CR04 — RED ledger, BOM and deterministic clearance

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Core; L. Depends on foundation; does not require broker dossier module for an operator-only installation. Single tenant. Local customs accounting is distinct from official acceptance. No assumed mapping between AT/ATPA/EF or other labels; approved regime registry supplies applicable definitions.

### Stories, UI and permission boundary

A RED operator records import lots and export demand; a production contributor proposes BOM composition; a RED reviewer examines allocation eligibility and approves a posting; an auditor reproduces historical balances and reversals.

Screens: `/red/projets` (`Projets RED`), `/red/projets/{id}` (`Situation du projet`), `/red/importations` (`Flux d'importation`), `/red/exportations` (`Flux d'exportation`), `/red/nomenclatures` (`Nomenclatures de fabrication`), `/red/apurements` (`Propositions d'apurement`), `/red/apurements/{id}` (`Vérifier l'imputation`), `/red/journal` (`Journal et sommier`), `/red/bilans` (`Bilans et feuilles de décharge`). Fields `Autorisation`, `Régime`, `Lot d'entrée`, `Référence DUM`, `Article`, `Quantité importée`, `Quantité restante`, `Unité`, `Nomenclature applicable`, `Méthode d'imputation`, `Justification`. Actions `Enregistrer un flux`, `Proposer une imputation`, `Soumettre au contrôle`, `Comptabiliser`, `Préparer une contrepassation`.

Capabilities `red.read/write/submit/post/reverse`, `bom.write/approve`. RED operator drafts; RED reviewer independently posts/reverses; production contributor can draft BOM/movement inputs, not change customs balances. Rule reviewer approves eligibility/units rules. No administrator bypass of ledger invariants.

### Entities, fields and relations

| Entity | Fields / invariant |
|---|---|
| RedProject | `reference UNIQUE,counterparty_id,customs_office_id,regime_rule_version_id,authorization_evidence_id,authorization_reference,opened_on,state:draft/active/closed,currency_code?`; active needs approved applicability. |
| CustomsFlow | `project_id,direction:import/export,dum_reference,declared_on,external_reference?,external_status_ref?,source_evidence_id,state:draft/in_review/recorded/reversed`; unique project/direction/DUM ref/version chain. |
| FlowArticle | `flow_id,line_ref,material_id,quantity:Quantity,customs_value?:Money,origin_country?,source_refs[]`; unique flow/line_ref. |
| ImportLot | `flow_article_id UNIQUE,project_id,material_id,admission_date,original_quantity:Quantity,eligibility_attributes:ApprovedEligibilitySchema,obligation_id?`; immutable origin; balance derived. |
| Bom | `reference UNIQUE,finished_material_id,status:active/archived`. |
| BomVersion | `bom_id,effective_from,effective_until?,output_quantity:Quantity,source_evidence_refs[],state:draft/in_review/approved/superseded,approval_id?`; no overlapping approved applicability without explicit version selection. |
| BomComponent | `bom_version_id,material_id,input_quantity:Quantity,conversion_rule_version_id?`; quantity ratio is material input / defined output, no inferred yield. |
| AllocationProposal | `project_id,strategy:manual/fifo/lifo,input_refs[],eligibility_rule_version_id,bom_version_ids[],state:draft/in_review/approved/stale/posted/rejected,candidate_exclusions:ReasonSchema[],approval_id?`. |
| ExportCoverage | `proposal_id,export_article_id,covered_output_quantity:Quantity,bom_version_id?`; represents product coverage once, not once per material. |
| AllocationLine | `coverage_id,import_lot_id,material_id,consumed_input_quantity:Quantity,conversion_rule_version_id?,eligibility_explanation`; all components of coverage must be satisfied. |
| RedLedgerTransaction | `project_id,kind:import/clearance/adjustment/reversal,effective_on,source_ref,approval_id,reverses_id?,posted_at`; immutable, unique source/approved effect. |
| RedLedgerEntry | `transaction_id,import_lot_id,material_id,delta_quantity:Decimal,unit_id,allocation_line_id?`; import positive, clearance negative, reversal exact negation of referenced entries. |
| CoveragePosting | `transaction_id,export_article_id,delta_output_quantity:Decimal,unit_id,coverage_id`; positive when covering export, reversal negative. |

### Algorithms and business rules

Recording approved import flow atomically creates lots and positive ledger entries. Recording an export declares demand but does not consume imports. Available input = sum posted lot deltas in its base unit. Remaining output demand = declared export article quantity minus posted coverage deltas. Never sum raw-material component quantities to calculate product coverage. Different units/materials remain separate; aggregate percentage is unavailable unless an approved aggregation basis exists. UI uses `Taux non calculable avec les données disponibles.`

For each coverage request: validate project/regime scope, materials, authorization, admissible dates and other reviewed eligibility predicates. Reject unsupported legal treatment. Convert only through approved dimension/material-specific rules. If BOM applies, required component input = desired output / BOM output quantity × component input; rounding per approved unit policy. Consume eligible lots until every component is covered. If insufficient input, present the maximum fully supported coverage only if deterministically computable; otherwise a blocking shortage. Do not post a partly satisfied BOM coverage.

FIFO orders eligible imports by admission date ascending, then recorded timestamp ascending, then lot ID ascending. LIFO uses admission date descending, recorded timestamp descending, lot ID ascending. These are deterministic implementation tie-breaks, not legal assumptions. Manual selection still enforces identical eligibility rules. Preview proposals do not reserve balances.

Approval binds allocations, input balances, rules and BOM versions. Posting locks affected import lots and export articles in stable ID order and recomputes balances/eligibility. If anything materially differs, return stale, do not substitute different lots. Post all coverage/components or none, consume approval once and emit ledger event. No negative available balance or overcovered export. DB constraints enforce positive original/line quantities and unique posting effects; transaction-level checks enforce cross-row sums.

Reversal proposal references original transaction and exact opposite entries/coverage. If reversing an import would invalidate downstream clearance, block with dependency list; require reviewed dependent reversals/correction plan. Never rewrite imported origin quantities or historical BOM usage. Project closure requires no unresolved local balances/mandatory obligations and applicable external evidence; local stock zero alone is insufficient.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /red-projects`; `GET/PATCH /red-projects/{id}`; `POST /red-projects/{id}/activate`; `/close` | Draft DTO; activate/close `{approval_id}`. |
| `GET/POST /customs-flows`; `GET/PATCH /customs-flows/{id}`; `POST /customs-flows/{id}/submit`; `/record` | Flow + articles; record `{approval_id}` → transaction for import or recorded export demand. |
| `GET /import-lots`; `GET /import-lots/{id}/balance` | Balance by `as_of` effective date and posted-at observation cutoff, both returned. |
| `GET/POST /boms`; `POST /boms/{id}/versions`; `POST /bom-versions/{id}/submit`; `/approve` | Version+components; approve `{approval_id}`. |
| `POST /allocation-proposals`; `GET /allocation-proposals/{id}`; `POST /allocation-proposals/{id}/calculate`; `/submit`; `/post` | Create `{project_id,strategy,export_requests:[{article_id,quantity}],manual_lot_choices?,rule_version_id,bom_version_ids[]}`; post `{approval_id}`. |
| `POST /red-transactions/{id}/reversal-proposals`; `POST /red-reversal-proposals/{id}/post` | Create `{reason,evidence_refs}`; post `{approval_id}` after dependency checks. |
| `GET /red-projects/{id}/journal`; `/balance`; `POST /red-projects/{id}/exports` | `{report_kind:balance/discharge/journal,as_of,posted_cutoff}` → evidence-linked export job. |

Errors: `INSUFFICIENT_LOT_BALANCE` → `Le stock disponible ne permet pas cette imputation.`; `INCOMPLETE_BOM_COVERAGE` → `Tous les composants nécessaires ne sont pas couverts.`; `LOT_INELIGIBLE` → `Ce lot ne respecte pas les conditions d'imputation.`; `REVERSAL_DEPENDENCY` → `Des opérations dépendantes doivent être corrigées avant cette contrepassation.`

Tests use synthetic reviewed rules, never fake legal rates: FIFO/LIFO ties, multi-component/multi-lot coverage, mixed units, shortages, concurrent posting, stale export demand, full rollback, import reversal dependency and historical balance reproduction. Regulatory regimes, permitted dispositions, conversion precision and aggregation basis remain **assumption to verify**.
