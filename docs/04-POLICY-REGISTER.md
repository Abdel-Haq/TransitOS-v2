# Policy register

**Phase 0.9.** The 85 unknown business values the specifications
mark `assumption to verify`, classified on ownership per
[ADR-005](01-DECISIONS.md#adr-005).

> **Generated from `packages/contracts/src/policy/register.ts`.** Do not edit by hand —
> run `pnpm --filter @dc/db build` and regenerate. The register is the data; this document
> is a view of it, and `pnpm db:seed` writes the same data into `policy_requirement`.

| | |
|---|---|
| Total entries | **85** |
| List A — engineering-decidable, already approved | **15** |
| List B — external, blocking | **70** |
| People to find | **7** |

Derived from the 49 `assumption to verify` markers in `specs/`, with compound markers
split into the discrete values behind them. Six markers define the convention rather than
naming a value — `00-shared-contract.md:9`, `:123`, `:135`, `19-…:3`, `:36` and
`20-…:3` — and produce no entry. `19-…:133` holds dates, staffing and budget out of
scope deliberately.

---

## What to do with this

**List A is done.** Fifteen values were decidable by the team, are recorded as approved
with `source: engineering_default`, and block nothing. They are listed at the end so a
reviewer can challenge any of them.

**List B is the ask.** Seventy questions across seven roles. Each one names what it blocks,
so a reviewer can see the cost of leaving it open rather than being handed a list of
schema fields.

Nothing here is a guess. An unresolved key returns `POLICY_REQUIRED` and the screen shows
`À confirmer`; it never falls back to a plausible number. That is the whole mechanism —
`CLAUDE.md` §Policy keys.

**Start now.** List B has the longest lead time in the project and nothing in Phase 3
activates without it. Finding the people is the work; the answers are usually quick once
the right person is in the room.

---

## Who is needed

| Role | Code | Questions | Modules blocked |
|---|---|---|---|
| Référent réglementaire qualifié | `regulatory_reviewer` | 14 | CR01, CR04, CR05, DF01, DF04 |
| Responsable financier | `finance_reviewer` | 10 | CR02, CR05, FD03 |
| Référent commercial et transport | `commercial_reviewer` | 4 | CR03, CR06, DF02 |
| Référent production et RED | `production_red_reviewer` | 3 | DF03, FD03 |
| Responsable sécurité et confidentialité | `privacy_owner` | 13 | DF05, FD01, FD02, PL01, PL02 |
| Responsable des intégrations | `integration_owner` | 7 | CR06, CR07, DF01, DF03, DF06, FD03 |
| Responsable de service | `service_owner` | 19 | DF05, FD02, PL01, PL02 |

---

## List B — the questions

### Référent réglementaire qualifié — 14 questions

`regulatory_reviewer` · Supported regimes, document applicability, duties/tax/valuation, permitted RED discharges, deadlines and extensions.
Source: `00-shared-contract.md:123`

#### `policy.regime.applicability`

**Régimes douaniers pris en charge** · CR01 · `04-CR01-dossiers.md:58`

Which customs regimes this installation supports, and the conditions under which each applies.

*Blocked while unresolved:* Declaration readiness, official preparation approval, every regime-dependent rule.

#### `policy.regime.document_lists`

**Documents exigibles par régime** · CR01 · `04-CR01-dossiers.md:58`

Which documents each regime and operation requires, and when each becomes mandatory.

*Blocked while unresolved:* Readiness scoring, the blocker list, declaration approval.

#### `policy.valuation.formula`

**Formules de valeur en douane** · CR01 · `04-CR01-dossiers.md:58`

How customs value is computed, per regime and incoterm.

*Blocked while unresolved:* Every declaration calculation. Draft capture stays available.

#### `policy.tariff.rates`

**Droits et taxes applicables** · CR01 · `04-CR01-dossiers.md:58`

Duty and tax rates by tariff heading, with their effective dates.

*Blocked while unresolved:* Duty calculation, declaration approval.

#### `policy.regime.event_semantics`

**Sémantique des événements officiels** · CR01 · `04-CR01-dossiers.md:58`

What each official event means for the dossier — which one starts a clock, which one closes an obligation.

*Blocked while unresolved:* Deadline computation, external state interpretation.

#### `policy.dossier.required_fields`

**Champs obligatoires par flux** · CR01 · `04-CR01-dossiers.md:58`

Which fields each workflow requires before submission.

*Blocked while unresolved:* Submission validation. Draft capture stays available.

#### `policy.red.eligibility`

**Régimes économiques autorisés** · CR04 · `07-CR04-red.md:59`

Which economic regimes this operator may use, and under what conditions.

*Blocked while unresolved:* RED posting, project activation.

#### `policy.red.dispositions`

**Apurements autorisés** · CR04 · `07-CR04-red.md:59`

Which discharge routes are permitted for each regime.

*Blocked while unresolved:* Ledger discharge, RED closure.

#### `policy.red.aggregation_basis`

**Base d’agrégation des soldes** · CR04 · `07-CR04-red.md:59`

At what level balances aggregate — per lot, per heading, per project — since it changes every reported figure.

*Blocked while unresolved:* Balance reporting, discharge eligibility.

#### `policy.deadline.periods`

**Délais légaux et prorogations** · CR05 · `08-CR05-obligations.md:47`

The statutory period for each obligation, what may extend it, and by how much. `Unknown is not today` — a missing period blocks rather than defaults.

*Blocked while unresolved:* Due-date computation. `DUE_DATE_UNKNOWN` until resolved.

#### `policy.calendar.policy`

**Calendriers de calcul des délais** · CR05 · `08-CR05-obligations.md:47`

Working days, public holidays, inclusive boundaries and partial-period rule. A missing calendar is not weekdays.

*Blocked while unresolved:* Every deadline. Shared with the commercial reviewer for contract clocks.

#### `policy.obligation.alert_thresholds`

**Seuils d’alerte des échéances** · CR05 · `08-CR05-obligations.md:47`

How far ahead each obligation type raises an alert, and what makes one critical.

*Blocked while unresolved:* Deadline alerting. The list still shows real dates.

#### `policy.rule.parameters`

**Paramètres numériques des règles** · DF04 · `14-DF04-rules.md:25`

Every numeric parameter an approved rule effect consumes — periods, scales, thresholds.

*Blocked while unresolved:* Rule activation. A rule may be drafted and reviewed without them.

#### `policy.extraction.legal_validation`

**Règles de validation légale des extractions** · DF01 · `11-DF01-readiness.md:32`

Which extracted fields carry legal weight, and what validates them.

*Blocked while unresolved:* Applying an extraction to an official field. Manual entry stays available.

---

### Responsable financier — 10 questions

`finance_reviewer` · Invoice numbering, tax, rounding, currency scales, FX source, pass-through treatment.
Source: `00-shared-contract.md:124`

#### `policy.invoice.numbering`

**Numérotation des factures** · CR02 · `20-data-api-contract-details.md:37`

Series format, reset policy, timezone and effective date for invoice numbers.

*Blocked while unresolved:* Invoice issue. Cost capture and drafting ship without it.

#### `policy.invoice.gap_treatment`

**Traitement des ruptures de séquence** · CR02 · `05-CR02-finance.md:34`

What the mandated treatment is when an issue transaction fails and leaves a gap in the series.

*Blocked while unresolved:* Nothing directly — but the runbook cannot be written without it.

#### `policy.invoice.tax`

**Règles de TVA à la facturation** · CR02 · `04-CR01-dossiers.md:58`

Tax rates and their applicability rules per service and client type.

*Blocked while unresolved:* Invoice issue.

#### `policy.invoice.rounding`

**Arrondi des montants facturés** · CR02 · `20-data-api-contract-details.md:3`

Scale and rounding mode, and at which step of the calculation it is applied.

*Blocked while unresolved:* Invoice issue. Rounding never comes from a default.

#### `policy.invoice.credit_note`

**Politique des avoirs** · CR02 · `05-CR02-finance.md:34`

When a credit note is permitted, and how it references the invoice it corrects.

*Blocked while unresolved:* The correction command is unavailable until this is approved.

#### `policy.currency.scale`

**Précision par devise** · FD03 · `00-shared-contract.md:49`

Decimal scale and rounding for each currency in use.

*Blocked while unresolved:* Any monetary calculation in that currency.

#### `policy.currency.fx_source`

**Source des taux de change** · FD03 · `04-CR01-dossiers.md:58`

Which published rate is authoritative, and on which date it is read. A missing rate is not parity.

*Blocked while unresolved:* Every conversion. No conversion without an explicit FX version.

#### `policy.finance.revenue_recognition`

**Base de reconnaissance du revenu** · CR02 · `05-CR02-finance.md:40`

When service revenue is recognized, and how pass-through is excluded symmetrically.

*Blocked while unresolved:* The margin view returns unavailable with its components rather than a figure.

#### `policy.finance.cost_allocation`

**Répartition des coûts partagés** · CR02 · `05-CR02-finance.md:40`

How a cost spanning several dossiers is attributed.

*Blocked while unresolved:* Margin per dossier.

#### `policy.guarantee.release_policy`

**Conditions de mainlevée des garanties** · CR05 · `08-CR05-obligations.md:47`

What evidence releases a guarantee, and what a partial release requires. A bank confirmation is required and cannot be inferred.

*Blocked while unresolved:* Guarantee release. Balances remain visible.

---

### Référent commercial et transport — 4 questions

`commercial_reviewer` · Carrier free time, tier rates, clock/calendar and overlap rules.
Source: `00-shared-contract.md:125`

#### `policy.carrier.free_time`

**Franchises accordées par transporteur** · DF02 · `12-DF02-delay-costs.md:5`

Free-time period per carrier, terminal and container type, with the event that starts the clock.

*Blocked while unresolved:* Every delay-cost estimate. Events are still tracked.

#### `policy.carrier.tiers`

**Barèmes de surestaries et de détention** · DF02 · `12-DF02-delay-costs.md:5`

Tier boundaries and rates, and how overlapping charges combine.

*Blocked while unresolved:* Cost estimation. No estimate without complete approved inputs.

#### `policy.transport.commercial_deadlines`

**Délais commerciaux de transport** · CR03 · `06-CR03-transport.md:53`

Return terms, release validity and the deadlines each carrier contract imposes.

*Blocked while unresolved:* Return-outstanding alerts and readiness exceptions.

#### `policy.notification.reminder_cadence`

**Cadence des relances client** · CR06 · `09-CR06-client-portal.md:34`

How often a pending client action is chased. No invented cadence.

*Blocked while unresolved:* Automatic reminders. A request is still visible in the portal.

---

### Référent production et RED — 3 questions

`production_red_reviewer` · Production units, BOM yields, allowed exception treatment.
Source: `00-shared-contract.md:126`

#### `policy.bom.yields`

**Rendements de nomenclature** · DF03 · `13-DF03-production.md:5`

Expected yield per BOM, and the tolerance beyond which a variance needs review.

*Blocked while unresolved:* Production reconciliation. Movements are still recorded.

#### `policy.production.exception_treatment`

**Traitement des écarts de production** · DF03 · `13-DF03-production.md:5`

Permitted treatment of wastage, subcontracting and returns. An unsupported treatment stays unresolved rather than being approximated.

*Blocked while unresolved:* Customs adjustment from a production variance. No automatic adjustment either way.

#### `policy.unit.precision`

**Précision et conversion des unités** · FD03 · `07-CR04-red.md:59`

Decimal precision per unit and the approved conversion factors between them.

*Blocked while unresolved:* Mixed-unit allocation and RED posting.

---

### Responsable sécurité et confidentialité — 13 questions

`privacy_owner` · Identity session and assurance durations, upload limits, retention and holds, AI destinations and legal bases.
Source: `00-shared-contract.md:127`

#### `policy.identity.session_duration`

**Durée des sessions** · FD01 · `01-FD01-identity.md:45`

Idle and absolute session lifetimes. There is no production fallback to an unlimited session.

*Blocked while unresolved:* Production login activation.

#### `policy.identity.assurance`

**Niveaux d’assurance requis** · FD01 · `19-security-operations-delivery.md:10`

Which operations require re-authentication or stronger assurance, and how long that assurance lasts.

*Blocked while unresolved:* Privileged administration, confidential export, approval actions in production.

#### `policy.privacy.retention`

**Durées de conservation** · FD02 · `19-security-operations-delivery.md:28`

Retention duration per data category, with its lawful basis. Deletion cannot guess a duration.

*Blocked while unresolved:* Production storage activation and every purge.

#### `policy.privacy.tombstone`

**Contenu des enregistrements résiduels** · FD02 · `02-FD02-evidence.md:39`

The minimum lawful content of a tombstone left behind by an erasure.

*Blocked while unresolved:* Purge execution.

#### `policy.privacy.backup_deletion`

**Obligations de suppression dans les sauvegardes** · FD02 · `02-FD02-evidence.md:39`

What an erasure obliges in backups, and within what window.

*Blocked while unresolved:* Closing an erasure request.

#### `policy.privacy.request_deadlines`

**Délais de traitement des demandes** · FD02 · `19-security-operations-delivery.md:28`

The statutory deadline for answering an access, rectification or erasure request.

*Blocked while unresolved:* Privacy request SLAs and their alerting.

#### `policy.privacy.transfer_formalities`

**Formalités de transfert hors du Maroc** · PL02 · `19-security-operations-delivery.md:24`

The applicable CNDP process for any hosting, processing or AI destination outside Morocco. Vendor encryption is not an answer to this.

*Blocked while unresolved:* Any non-Moroccan hosting or AI provider.

#### `policy.ai.destination`

**Destinations de traitement par IA** · DF05 · `19-security-operations-delivery.md:24`

Approved provider, region, purpose, data categories and legal basis, per use.

*Blocked while unresolved:* Every DF01 and DF05 capability.

#### `policy.ai.retention`

**Conservation chez le fournisseur de modèle** · DF05 · `15-DF05-advisory.md:34`

What the provider retains, for how long, and whether it trains on it.

*Blocked while unresolved:* DF05 activation.

#### `policy.document.active_content`

**Traitement des fichiers à contenu actif** · FD02 · `02-FD02-evidence.md:33`

Whether macro-bearing or active-content files are accepted at all, and under what control.

*Blocked while unresolved:* Nothing — they are refused until separately approved.

#### `policy.offline.attachment_policy`

**Stockage hors ligne sur appareil partagé** · PL01 · `17-PL01-ux.md:24`

Whether attachments may be stored offline, for how long, and what a shared device changes.

*Blocked while unresolved:* Offline attachment caching. In-memory drafts work now, and the UI says they are lost on close.

#### `policy.incident.notification`

**Destinataires et obligations de notification** · PL02 · `19-security-operations-delivery.md:85`

Who is told about an incident, within what deadline, and what the legal notification duty is.

*Blocked while unresolved:* Any externally addressed automatic message. Runbooks still record and contain.

#### `policy.identity.role_bundles`

**Capacités attachées à chaque rôle** · FD01 · `docs/01-DECISIONS.md#adr-011`

Which capabilities each of the sixteen roles holds. The specs call roles fixed capability bundles and never enumerate them; 35 of 121 capabilities are grounded in module prose and 86 are not.

*Blocked while unresolved:* Every unassigned capability denies by default. Nothing is silently granted, but a role may be unable to do its job.

---

### Responsable des intégrations — 7 questions

`integration_owner` · File schemas, API credentials and contracts, notification destinations.
Source: `00-shared-contract.md:128`

#### `policy.exchange.schemas`

**Schémas des fichiers d’échange** · CR07 · `10-CR07-reconciliation.md:5`

The real file formats and acknowledgement contracts of each exchange partner.

*Blocked while unresolved:* Any claim of an official connection. Synthetic fixtures and manual evidence work now.

#### `policy.integration.contracts`

**Contrats d’accès aux systèmes officiels** · DF06 · `16-DF06-api-integrations.md:31`

Documented access, credentials, schemas and acknowledgement semantics for PortNet, BADR or any official system. No invented API, no browser bypass.

*Blocked while unresolved:* Every live adapter. File and manual evidence is the route until then.

#### `policy.integration.signature_scheme`

**Schéma de signature des webhooks** · DF06 · `16-DF06-api-integrations.md:42`

How an inbound event is authenticated, and how its unique event id is formed.

*Blocked while unresolved:* Live ingestion stays disabled without it.

#### `policy.migration.source_formats`

**Formats des données à reprendre** · FD03 · `03-FD03-migration.md:41`

The real source formats and the true opening balances to migrate.

*Blocked while unresolved:* Migration commit. Synthetic CSV fixtures are product test formats, not imports.

#### `policy.notification.destinations`

**Canaux et destinations de notification** · CR06 · `09-CR06-client-portal.md:34`

Approved SMTP or provider, sender identity and destinations. WhatsApp and SMS are not silently installed.

*Blocked while unresolved:* External email and messaging. The in-app channel is the default and works now.

#### `policy.mailbox.contracts`

**Accès aux boîtes mail sources** · DF01 · `11-DF01-readiness.md:32`

Mailbox provider contract, credentials and the confidence threshold for routing.

*Blocked while unresolved:* Automatic mail routing. Manual entry and routing work now.

#### `policy.production.erp_contracts`

**Contrats ERP de production** · DF03 · `13-DF03-production.md:5`

Source ERP schemas and event semantics for production movements.

*Blocked while unresolved:* Automatic production import. Manual submission works now.

---

### Responsable de service — 19 questions

`service_owner` · Capacity, latency, recovery, support and availability objectives, region, pricing and licence conditions.
Source: `00-shared-contract.md:129`

#### `policy.nfr.api_latency`

**Objectif de latence API** · PL02 · `19-security-operations-delivery.md:42`

Target percentiles per named operation, under a declared dataset and concurrency. `nfr.api_latency`.

*Blocked while unresolved:* Production readiness. Measurement runs now; it cannot be marked passed.

#### `policy.nfr.ui_latency`

**Objectif de latence d’interaction** · PL02 · `19-security-operations-delivery.md:42`

Browser interaction latency target per named operation. `nfr.ui_latency`.

*Blocked while unresolved:* Production readiness.

#### `policy.nfr.job_latency`

**Objectif de latence des traitements** · PL02 · `19-security-operations-delivery.md:43`

Queued-to-start and start-to-terminal targets by job type, and the backlog alert level. `nfr.job_latency`.

*Blocked while unresolved:* Production readiness.

#### `policy.nfr.availability`

**Objectif de disponibilité** · PL02 · `19-security-operations-delivery.md:44`

Eligible service window, what counts as a successful journey, maintenance treatment, support coverage. `nfr.availability`. No uptime claim before agreement and measurement.

*Blocked while unresolved:* Any availability commitment.

#### `policy.nfr.rpo`

**Perte de données maximale admissible** · PL02 · `19-security-operations-delivery.md:45`

How much data the organization accepts losing. `nfr.rpo`.

*Blocked while unresolved:* Backup schedule design and production readiness.

#### `policy.nfr.rto`

**Délai de reprise maximal** · PL02 · `19-security-operations-delivery.md:45`

How long a full restore may take. `nfr.rto`.

*Blocked while unresolved:* Production readiness. The restore rehearsal runs regardless.

#### `policy.backup.schedule`

**Fréquence, rétention et lieu des sauvegardes** · PL02 · `19-security-operations-delivery.md:81`

Backup frequency, retention, storage location and who holds the recovery keys. Follows from the RPO above.

*Blocked while unresolved:* Production readiness.

#### `policy.nfr.capacity`

**Capacité cible** · PL02 · `19-security-operations-delivery.md:46`

Dossier, document and ledger volumes, concurrent users, upload and export sizes. `nfr.capacity`. No guessed client count or storage quota.

*Blocked while unresolved:* Capacity testing sign-off and infrastructure sizing.

#### `policy.platform.rate_limits`

**Limites de débit en production** · PL02 · `16-DF06-api-integrations.md:42`

Production request limits per principal and per endpoint class.

*Blocked while unresolved:* Production readiness. The synthetic limit above covers testing.

#### `policy.platform.browser_matrix`

**Navigateurs et appareils pris en charge** · PL01 · `17-PL01-ux.md:40`

Which browsers, versions and devices are supported, and which are merely tolerated.

*Blocked while unresolved:* The published support commitment. Development targets current evergreen browsers.

#### `policy.platform.assistive_technologies`

**Technologies d’assistance prises en charge** · PL01 · `19-security-operations-delivery.md:47`

Which screen readers and assistive technologies are tested against. Conformance is not published without review.

*Blocked while unresolved:* Any published accessibility conformance claim.

#### `policy.platform.rtl_activation`

**Activation de l’arabe et du sens RTL** · PL01 · `17-PL01-ux.md:34`

Whether Arabic is released, and who supplies the reviewed copy. The architecture is prepared; no untranslated screen ships.

*Blocked while unresolved:* Arabic release only. French is the released language.

#### `policy.license.terms`

**Conditions de licence et de facturation** · PL02 · `18-PL02-launch-operations.md:36`

Pricing, billing basis, ceilings and contractual limits.

*Blocked while unresolved:* Usage display shows measured units and known cost, never a price.

#### `policy.license.signature`

**Format signé et rotation des clés de licence** · PL02 · `20-data-api-contract-details.md:113`

Signed licence format, issuer and key-rotation contract.

*Blocked while unresolved:* Module and licence enforcement stays unconfigured until supplied.

#### `policy.assistant.token_ceiling`

**Plafond de consommation de l’assistant** · DF05 · `15-DF05-advisory.md:34`

Token or cost ceiling per period, and what happens when it is reached.

*Blocked while unresolved:* DF05 activation. A budget may stop optional work only once approved.

#### `policy.platform.topology`

**Topologie de déploiement approuvée** · PL02 · `19-security-operations-delivery.md:65`

Whether a single-host install meets this organization’s availability and recovery requirements.

*Blocked while unresolved:* Production deployment sign-off.

#### `policy.platform.hosting`

**Hébergeur et dimensionnement** · PL02 · `00-shared-contract.md:36`

Hosting provider, region and infrastructure sizing. Region interacts with CNDP above.

*Blocked while unresolved:* Production deployment.

#### `policy.ops.alert_routing`

**Routage et escalade des alertes** · PL02 · `19-security-operations-delivery.md:50`

Who receives which alert, and how escalation works outside business hours.

*Blocked while unresolved:* Operational readiness. Alerts are still raised and logged.

#### `policy.approval.small_org_subset`

**Périmètre du mode « petite organisation »** · FD02 · `docs/01-DECISIONS.md#adr-002`

Which action families a submitter may approve under `small_org_documented`, who is eligible, and what reason must be recorded. Coined by this project — the specs defer the alternative approval policy without naming it.

*Blocked while unresolved:* `small_org_documented` refuses to run. `independent_reviewer` is the production default.


---

## List A — decided, approved, recorded

Recorded with `source: engineering_default` and the bootstrap system actor as approver.
No human approved these, and the register says so rather than borrowing a name.

Any of them can be superseded by a reviewer at any time: they are ordinary approved policy
versions, not constants.

| Key | Label | Value | Source |
|---|---|---|---|
| `policy.platform.page_size_default` | Taille de page par défaut | `50` | `00-shared-contract.md:101` |
| `policy.platform.page_size_maximum` | Taille de page maximale | `200` | `00-shared-contract.md:101` |
| `policy.platform.cursor_ttl` | Durée de validité du curseur de pagination | `PT15M` | `00-shared-contract.md:101` |
| `policy.jobs.max_attempts` | Nombre maximal de tentatives par tâche | `5` | `19-security-operations-delivery.md:43` |
| `policy.jobs.backoff_seconds` | Temporisation initiale entre tentatives | `10` | `19-security-operations-delivery.md:43` |
| `policy.jobs.lease_seconds` | Durée du bail de traitement | `60` | `19-security-operations-delivery.md:43` |
| `policy.document.max_bytes` | Taille maximale d’un document | `52428800` | `02-FD02-evidence.md:33` |
| `policy.document.chunk_bytes` | Taille de segment de téléversement | `8388608` | `20-data-api-contract-details.md:125` |
| `policy.document.base_mime_allowlist` | Formats de document acceptés | `["application/pdf","image/jpeg","image/png","image/tiff","text/csv","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]` | `02-FD02-evidence.md:33` |
| `policy.api.request_timeout_seconds` | Délai d’expiration des appels sortants | `30` | `16-DF06-api-integrations.md:42` |
| `policy.api.replay_window_seconds` | Fenêtre anti-rejeu des webhooks | `300` | `16-DF06-api-integrations.md:42` |
| `policy.api.synthetic_rate_limit` | Limite de débit pour les essais synthétiques | `600` | `16-DF06-api-integrations.md:42` |
| `policy.platform.accessibility_standard` | Norme d’accessibilité retenue | `WCAG 2.2 AA` | `17-PL01-ux.md:40` |
| `policy.assistant.scan_schedule` | Cadence des analyses de l’assistant | `0 3 * * *` | `15-DF05-advisory.md:34` |
| `policy.assistant.scan_timeout_seconds` | Durée maximale d’une analyse | `900` | `15-DF05-advisory.md:34` |
