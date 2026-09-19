## DF02 — Contract-aware delay exposure and scenarios

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Differentiators; L. Depends on CR02–CR03. Single tenant. Estimates are separate from actual supplier charges and invoices. Contract terms are **assumption to verify** until customer supplies reviewed carrier/terminal evidence. No universal free-time/rate schedule.

### Stories, screens and roles

A dispatcher sees which missing return event keeps an obligation open. A finance reviewer reproduces a forecast from actual contract terms. A manager compares hypothetical pickup/return dates without changing real events.

Screens `/transport/exposition` (`Frais et échéances logistiques`), `/transport/commandes/{id}/contrat` (`Conditions applicables`), `/transport/commandes/{id}/simulation` (`Simuler les frais`). Fields `Contrat source`, `Version applicable`, `Franchise`, `Événement de départ`, `Événement de fin`, `Calendrier`, `Tranche tarifaire`, `Devise`, `Date envisagée`, `Données manquantes`. Buttons `Saisir les conditions`, `Soumettre les conditions`, `Calculer l'estimation`, `Comparer les scénarios`. Always badge forecast `Estimation — non facturée` and scenario `Hypothèse de travail`.

Capabilities `logistics_contract.write/approve`, `exposure.read/calculate`, `scenario.write`. Dispatcher drafts known terms; finance reviewer independently approves amounts/contract rules with operational validation; clients view forecasts only if explicitly published with assumptions. Calculation service is deterministic and has no invoice-issue authority.

### Model

| Entity | Fields / invariants |
|---|---|
| LogisticsContract | `carrier_id?,terminal_counterparty_id?,reference,source_evidence_id,status:active/archived`. |
| LogisticsContractVersion | `contract_id,effective_basis:booking/pricing_date/discharge/explicit,effective_from,effective_until?,applicability:ShipmentPredicate,state:draft/in_review/approved/superseded,approval_id`. Overlapping matches require explicit reviewed selection. |
| ChargeRule | `contract_version_id,charge_kind:storage/demurrage/detention/combined/other,label_fr,currency_code,unit_basis:container/item/weight/volume,start_event_code,end_event_code,start_inclusive:Boolean,end_inclusive:Boolean,calendar_policy_version_id,partial_period_rule:ceil/floor/prorata,free_periods:Decimal,applicability:ChargePredicate,combination_group?`. All policy fields explicitly supplied. |
| ChargeTier | `charge_rule_id,from_period:Decimal,to_period?:Decimal,rate:Decimal,rate_unit_code`; non-overlapping ordered tiers, no implicit missing range or free tier. |
| ChargeCombinationRule | `group_code,mode:additive/exclusive/highest/combined_replaces,member_rule_ids[],replacement_rule_id?,source_evidence_id,approval_id`; mode must reflect actual contract, not automatic optimization. |
| ExposureSnapshot | `order_id,contract_version_id,event_refs[],calculation_at,state:complete/incomplete/conflicting,lines:ChargeCalculationLine[],totals_by_currency:Money[],missing_inputs[],digest`; immutable. |
| Scenario | `order_id,name_fr,base_snapshot_id,event_overrides:HypotheticalEvent[],state:draft/calculated/stale,comparison_result_ref?`; cannot store overrides into actual events. |

### Exact calculation behavior

Select reviewed contract by explicit applicable basis/reference, not newest date. Resolve verified actual start/stop events; if stop is missing use a user-selected scenario horizon only for a forecast, explicitly labelled. An unknown event timestamp is not “today” by default. Calendar policy defines timezone, chargeable day boundaries, holidays, inclusivity and partial-period treatment. Compute elapsed chargeable periods under that policy, then chargeable periods = max(elapsed periods − free periods, zero). The zero floor is arithmetic, not a quoted free period.

For each chargeable period slice apply its configured tier rate × approved unit multiplier using exact decimal arithmetic. Tier boundaries must cover the requested horizon or return incomplete. Proration denominator and rounding require approved policy; absent values block. Apply combination rule before currency totals; no silent addition of combined detention plus separately billed detention. Different currencies remain separate unless explicit FX scenario requests approved FX basis.

An earlier stop than start or conflicting verified event versions returns conflicting with evidence links. Recomputed snapshot supersedes its forecast projection but does not rewrite approved invoices. A scenario shows baseline and candidate totals and difference only where both complete with compatible basis; label difference `Écart estimé`, never “savings achieved.” Delivery closes only applicable delivery clock; empty return closes equipment clock if contract says so. Source terms/event amendments mark scenarios stale.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /logistics-contracts`; `POST /logistics-contracts/{id}/versions`; `GET/PATCH /logistics-contract-versions/{id}` | Version DTO contains complete charge rules/tiers/combination rules. |
| `POST /logistics-contract-versions/{id}/submit`; `/approve` | Approve `{approval_id}` binds full terms and source evidence. |
| `POST /delivery-orders/{id}/exposure-calculations`; `GET /exposure-snapshots/{id}` | `{contract_version_id,forecast_horizon?:Instant,fx_version_id?}`; no assumed horizon. |
| `POST /delivery-orders/{id}/scenarios`; `GET/PATCH /scenarios/{id}`; `POST /scenarios/{id}/calculate` | `{name_fr,base_snapshot_id,event_overrides[]}`; override codes/timestamps validated. |
| `GET /reports/logistics-exposure` | Known/unknown buckets and currency-separated forecast totals with freshness timestamp. |

Errors: `CONTRACT_TERMS_INCOMPLETE` → `Les conditions du contrat doivent être complétées et validées.`; `CHARGE_OVERLAP_UNRESOLVED` → `Le cumul de ces frais doit être confirmé.`; `EVENT_TIME_UNKNOWN` → `La date nécessaire au calcul n'est pas confirmée.` Tests: calendar changes, boundary inclusion, tier gap, combined charges, partial periods, missing return, scenario isolation, stale contract and currency mismatch. Exit: every estimate is reproducible from terms and event snapshots without fabricated rates.
