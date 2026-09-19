## DF04 — Rule registry and change-impact review

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Differentiators; L. Depends on CR01/CR05 and foundation. A minimal registry exists before those core modules for manually reviewed seed policies; this item adds source management, applicability UI and impact analysis. Single tenant. No automated legal interpretation or automatic activation of scraped content.

### User stories, UI and authorization

A qualified reviewer records a sourced rule with effective dates. An operations manager sees which open cases may be affected. An auditor reruns a historical calculation using its original version. Screens `/regles` (`Règles et sources`), `/regles/{id}` (`Versions de la règle`), `/regles/versions/{id}` (`Examiner l'applicabilité`), `/regles/impacts` (`Dossiers à réexaminer`), `/regles/impacts/{id}` (`Analyse d'impact`). Fields `Source officielle`, `Référence du texte`, `Date de publication`, `Date d'effet`, `Régime concerné`, `Conditions d'application`, `Interprétation retenue`, `Référent habilité`, `Incertitudes`. Actions `Proposer une version`, `Soumettre l'interprétation`, `Activer la version`, `Évaluer les impacts`, `Demander un nouvel examen`.

Capabilities `rule.write/submit/approve/activate`, `rule_impact.read/assess`. Only qualified `rule_reviewer` can approve; record qualification/authority evidence, do not assume competence from administrator status. Independent reviewer required. Domain reviewer must separately approve affected business changes.

### Schema and deterministic rule language

| Entity | Fields |
|---|---|
| RuleDefinition | `code UNIQUE,category:eligibility/documents/valuation/tax/deadline/disposition/rounding/contract/closure,owner_user_id,description_fr`. |
| RuleVersion | `rule_definition_id,version_label,source_document_version_ids[],source_urls[],publication_date?,effective_from:Date,effective_until?:Date,jurisdiction_code,regime_codes[],operation_codes[],predicate:PredicateSchema,effect:EffectSchema,interpretation_fr,uncertainties_fr[],state:draft/in_review/approved/active/superseded/rejected,approval_id?`; source-backed version immutable after approval. |
| ReviewerQualification | `user_id,scope_codes[],evidence_version_id,valid_from,valid_until?,verified_by`; activation checks current scope. |
| RuleImpactRun | `new_rule_version_id,prior_rule_version_ids[],evaluation_date,case_scope_refs[],job_id,state:queued/running/completed/failed`. |
| RuleImpactCase | `run_id,resource_ref,current_input_refs[],old_result_ref?,candidate_result_ref?,classification:affected/unaffected/unresolved,reason_fr,required_review_ids[],state:unassessed/review_requested/accepted_no_change/correction_proposed/closed`. |

PredicateSchema is a typed tree: `all[]`, `any[]`, `not`, or leaf `{field_path,operator:eq/in/lt/lte/gt/gte/exists,value:TypedValue}`. Field paths come from module allowlist; no scripting/SQL/HTTP. Evaluation is three-valued true/false/unknown. Missing value makes comparison unknown; all/any use deterministic three-valued logic. Unknown never counts as eligible or not-applicable.

EffectSchema is discriminated: `require_evidence(requirement_code,document_type)`, `set_deadline(start_field,period_value,period_unit,calendar_policy_id,inclusive,adjustment)`, `validate_relation(field_paths,comparison_rule_id)`, `calculate(formula_code,parameters)`, `allow_disposition(disposition_code,constraints)`, `set_rounding(scale,mode)`, `require_closure(evidence_codes[])`. Formula codes are audited application functions, not uploaded executable code. Numeric business parameters are supplied only by approved sources; **assumption to verify** until then.

### State/validation/error behavior

Draft→in_review→approved/rejected; approved→active only when sources, qualified independent decision, effect schema and dates are complete. Active→superseded preserves history. Reject overlapping active versions for identical applicability unless explicit priority/supersession rule resolves them. Merely downloading a document creates source evidence, not a RuleVersion with presumed interpretation.

Date-of-applicability field must be named by consuming workflow: declaration date, import admission date or another approved basis. Never universally apply today’s rule to historical cases. New active rule creates a proposed impact scan, not automatic domain mutation. Evaluate open cases and any explicitly scoped historical cases without rewriting their inputs. Unknown applicability yields unresolved issue. `accepted_no_change` requires explanation; `correction_proposed` creates a normal domain review request. A legal question with unresolved interpretation blocks only the affected controlled action.

API `/api/v1`: `GET/POST /rules`, `GET /rules/{id}`, `POST /rules/{id}/versions`, `GET/PATCH /rule-versions/{id}` (draft only); `POST /rule-versions/{id}/submit`, `/activate` `{approval_id}`, `/supersede` `{replacement_version_id,approval_id,reason}`; `POST /rule-impact-runs` `{new_rule_version_id,scope_refs[],evaluation_date}` → job; `GET /rule-impact-runs/{id}/cases`; `POST /rule-impact-cases/{id}/assess` `{classification,reason,proposed_action_ref?}`; `GET/POST /reviewer-qualifications` and reviewed revoke command.

Errors: `RULE_APPLICABILITY_UNKNOWN` → `L'applicabilité de cette règle doit être confirmée.`; `RULE_OVERLAP` → `Plusieurs règles actives couvrent le même cas.`; `REVIEWER_NOT_QUALIFIED` → `L'habilitation requise pour cette règle n'est pas enregistrée.` Test effective-date boundaries, missing predicate input, overlap, supersession, historical replay, unauthorized activation and impact result with no automatic business change. Exit: every active effect and impacted decision is source/version attributable.
