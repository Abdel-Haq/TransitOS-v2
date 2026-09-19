## FD03 — Reference data, migration and search

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Foundation; L. Depends on FD01–FD02; financial/RED opening-balance commit adapters become available with CR02/CR04. Foundation can validate/stage these records before those modules exist. Single tenant. Stories: an intake agent reuses accurate client/office references; an operator previews a migration and reconciles balances; an auditor finds original identifiers after cutover.

### Screens and permissions

`/referentiels/clients` (`Clients`), `/referentiels/partenaires` (`Partenaires`), `/referentiels/bureaux` (`Bureaux de douane`), `/referentiels/articles` (`Articles et unités`), `/recherche` (`Rechercher`), `/administration/imports` (`Imports et migration`), `/administration/imports/{id}` (`Contrôler l'import`), `/administration/reprise` (`Reprise des données`).

Labels: `Raison sociale`, `ICE`, `Identifiant fiscal`, `Référence d'origine`, `Devise`, `Unité`, `Correspondance proposée`, `Lignes à corriger`, `Écart de reprise`, `Simuler l'import`, `Valider la reprise`, `Exporter mes données`. Unknown quantities display `Solde non confirmé`, never zero.

Capabilities: `reference.read/write/approve`, `migration.prepare/approve/commit`, `search.read`, `data.export`. Operations users edit draft references; reviewed reference activation uses the appropriate operations/RED/finance reviewer. Platform operator can run import processing but cannot authorize balances solely by technical role. Client contacts may propose their own company changes via CR06, not direct reference writes.

### Entities and fields

| Entity | Fields / relation |
|---|---|
| InstallationProfile | Singleton: `legal_name,address,registration_refs:Identifier[],business_timezone,base_currency_code?,enabled_modules:ModuleCode[],readiness_state`; no organization FK on transactions. |
| Counterparty | `legal_name,roles:(client/supplier/carrier/bank/broker/warehouse)[],identifiers:Identifier[],address?:Address,contact_refs[],status:draft/active/archived`; company identifier kind+normalized value unique when verified. |
| CounterpartyContact | `counterparty_id,display_name,email?,phone?,job_title?,portal_user_id?,status`; no implicit portal invitation. |
| CustomsOffice | `code UNIQUE,name_fr,authority_source,valid_from?,valid_until?,status`. |
| Currency / CurrencyPolicy | Currency `code UNIQUE,label_fr`; policy `currency_code,scale,rounding_mode,source_version_id,review_id`; unknown precision blocks posting. |
| Unit / ConversionRule | Unit `code UNIQUE,label_fr,dimension,allowed_scale`; conversion `from_unit_id,to_unit_id,factor:Decimal,material_id?,effective_from,source_version_id,review_id`. No cross-dimension conversions. |
| Material | `reference UNIQUE,description_fr,default_unit_id,classification_refs[],status`; SH suggestions never imply approved classification. |
| SourceIdentifier | `source_system,entity_kind,external_id,local_resource_id,mapping_version_id`; unique source/kind/external_id. |
| ImportMapping | `name,source_system,source_format,schema_version,field_mappings:MappingSchema,transform_rules:TransformSchema,review_id?,status`. Transforms allowlisted, not executable uploaded code. |
| ImportBatch | `mapping_version_id,document_version_id,file_hash,mode:reference/opening/operational,state:uploaded/validated/review_required/approved/committing/committed/failed/cancelled,review_id?,commit_effect_id?`. |
| ImportRow | `batch_id,row_key,raw_record:DeclaredSourceSchema,proposed_record:TargetDTO,issue_codes[],match_candidates[],resolution?,target_id?`; unique batch/row_key. |
| ReconciliationTotal | `batch_id,dimension:money/quantity,count_kind?,currency_code?,unit_id?,source_total?:Decimal,target_total:Decimal,difference?:Decimal,evidence_ref?,review_id?`. |
| CutoverRecord | `batch_ids[],source_snapshot_at,write_freeze_evidence_id,approved_manifest_id,state:prepared/approved/executed/aborted,executed_at?`. |

### Rules, validation and error cases

Draft client needs legal name; activate only with reviewed identifier requirements for intended workflows. Store original and normalized identifiers; normalization is defined per identifier kind, not guessed. Archive prevents new selection but keeps historical documents valid. Unit/FX/rule amendments create versions, not retroactive changes.

Import never silently creates zeros, rates or mandatory identifiers. Validate all rows and record every discrepancy before approval. Exact external identifiers match first; fuzzy matches are candidates only. Same content/mapping/source already committed yields the original batch effect. A different mapping version requires a new reviewed proposal referencing previous commit; it cannot blindly repeat insertions.

Commit references atomically per batch. Opening money/quantity posts must delegate to their owning ledger service with source references; no generic SQL overwrite. A failed domain commit leaves batch uncommitted and retry-safe. Large migration chunking requires an explicit staging ledger and final activation transaction; partial data must not appear live. Cutover requires approved opening totals by currency/unit, or explicit confirmed empty source; unknown totals block. Before live writes, rollback can discard staged activation; after live writes, rollback means reviewed corrective import/restore procedure, not erasing new work.

Search covers authorized exact business refs, client names, DUM refs, dossier metadata and clean permitted document text. Return `resource_kind,id,title_fr,matched_fields,context_label` and safe excerpt; filter ACL before count/rank/page. No inaccessible hints. Source adapters/formats and real opening totals are **assumption to verify**; ship synthetic CSV fixtures as product test formats, not claimed official imports.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /counterparties`; `GET/PATCH /counterparties/{id}`; `POST /counterparties/{id}/activate`; `/archive` | Draft fields; activate `{approval_id}`; archive `{reason}`; filter `roles,status`. |
| `GET/POST /customs-offices`; `GET/POST /materials`; `GET/POST /units`; `GET /currencies` | Typed entity DTO; draft reference writes require `reference.write`; changes via PATCH draft route and `/activate` command. |
| `POST /conversion-rules`; `POST /conversion-rules/{id}/activate` | Versioned conversion + `{approval_id}` activation. |
| `GET/POST /import-mappings`; `POST /import-mappings/{id}/activate` | Mapping schema; independently reviewed activation. |
| `POST /imports`; `GET /imports/{id}`; `GET /imports/{id}/rows` | `{document_version_id,mapping_version_id,mode}` → batch; page by row key. |
| `POST /imports/{id}/validate`; `/resolve`; `/commit` | Validate `{}` job; resolve `{row_key,resolution,target_id?,corrected_fields?,reason}`; commit `{approval_id}` job. |
| `GET /imports/{id}/totals`; `POST /cutovers`; `POST /cutovers/{id}/execute` | Create Cutover DTO; execute `{approval_id}`. |
| `GET /search?q=&kind=&counterparty_id=` | ACL-scoped results; query limits configured. |
| `POST /installation/exports` | `{scope:complete\|selected,resource_ids?}` → authorized export job; manifest records unsupported source fields. |

Errors: `AMBIGUOUS_MATCH` → `Plusieurs correspondances sont possibles. Sélectionnez la bonne référence.`; `OPENING_BALANCE_UNKNOWN` → `Le solde de reprise doit être confirmé.`; `UNIT_MISMATCH` → `Les unités ne sont pas compatibles.` Test malformed files, duplicated keys, float/rounding loss, duplicate batch concurrency, archived references, partial commit rollback, missing totals and private-search leakage. Exit: an authorized synthetic migration can be reconciled and exported with original IDs intact.
