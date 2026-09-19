# Dossier Clair — competing product strategy

**Positioning:** a customs operations system for Moroccan brokers and RED operators that makes every dossier’s next action, responsible person, supporting evidence and financial exposure explicit.

The competitive bet is to prevent avoidable rework and explain blockers before they become late deliveries, disputed invoices or unresolved customs obligations. AI assists this work; it is not the product’s main promise.

“Dossier Clair” is a working name; trademark and domain availability are **assumption to verify**. This is a proposed product design, not an implemented or proven superior product.

Baseline: [vTransit audit, roadmap and prompts](./vtransit-audit-roadmap-prompts.md), containing 85 feature entries. Research checked on 11 September 2026. The original audit’s public-page limits remain in force.

## Evidence rules

- **Documented workflow:** supported by the official or first-party sources below.
- **Audited:** supported by the supplied vTransit audit; advertised functionality is not runtime proof.
- **Assumption to verify:** a plausible operational pain, customer preference, competitive gap, prioritization or commercial hypothesis requiring observation/interviews or product access.
- **Proposed:** a design decision or acceptance requirement for our product, not a claim about vTransit.
- **Not visible:** unknown in the audit; never silently relabeled “missing.”

Ranks are ordinal product priorities, not measured loss scores. S/M/L are relative engineering estimates. No market sizes, customer counts, fees, savings percentages, regulatory deadlines, delivery dates or performance targets are invented.

## 1. Target clients and buying decision

| Client / user | Buying or operating role | Job to accomplish | Relevant pain and validation |
|---|---|---|---|
| Moroccan transit/customs brokerage owner or operations director | Proposed initial buyer | Deliver dossiers reliably, supervise exceptions and protect fees/cash | Wants visibility into blocked work and unrecovered advances; willingness to switch and budget are **assumption to verify**. |
| Déclarant / senior customs reviewer | Daily user and approval authority | Prepare defensible declarations and correct discrepancies | Rechecking identifiers, valuation inputs and revised documents is a workflow-based pain hypothesis; frequency is **assumption to verify**. |
| Intake agent / dossier assistant | Daily user | Collect documents and keep dossiers current | Chasing attachments, identifying the latest version and rekeying repeated facts are **assumption to verify** through real dossier observation. |
| Field agent / dispatcher / driver coordinator | Daily user | Complete inspection, release, pickup, delivery and equipment return handoffs | Multiple parties control different events; failed handoffs and mobile constraints are **assumption to verify**. |
| Brokerage accounting / treasury staff | Daily user and financial approver | Track approved disbursements, invoicing, collections and supporting receipts | Lost cost evidence, unbilled costs and confusing customer advances are **assumption to verify**. |
| RED operator: importer, exporter, textile processor or other approved industrial operator | Second buyer segment; customs/compliance manager often sponsor | Explain import lots, consumption, discharges, deadlines and guarantees | Ledger/production mismatches and laborious justification are **assumption to verify**; applicability depends on the operator’s actual regime and authorizations. |
| RED production, warehouse and finance staff | Contributors | Supply actual movements, BOM versions, exception evidence and guarantee records | Operational stock and customs balances may diverge for legitimate or erroneous reasons; actual causes are **assumption to verify**. |
| Broker’s end client: importer/exporter operations or finance contact | Restricted external user, usually not buyer of this deployment | Supply missing information, approve instructions/costs and understand progress | Wants an answer to “what do you need from me?” instead of a status label; preference is **assumption to verify**. |
| RED operator’s external broker, customer or reviewer | Invited external collaborator where authorized | Provide or review only assigned dossier evidence | Access scope and approval authority are **assumption to verify**, explicitly configured per business relationship. |
| Organization IT / security / audit staff | Approval gate and service owner | Verify data access, continuity, exports and evidence | Need demonstrable controls rather than security slogans; procurement requirements are **assumption to verify**. |

**Initial market choice — proposed:** begin with brokers handling recurring import dossiers and coordinating several client/transport/finance handoffs. Add RED production reconciliation after the deterministic ledger works. Do not require brokers to adopt manufacturing screens or RED operators to adopt a fleet module. Module configuration is installation-wide; both use the same permission and evidence foundations.

**Not the initial scope:** freight marketplace, full ERP, payroll, GPS hardware platform, lending, payment execution or replacement for government systems. Official systems remain authoritative for official submissions and decisions.

## 2. How the work actually connects

The source-backed facts below inform the design. They do not establish the prevalence of pain at any particular business.

| Source | Documented operational fact | Product implication — proposed |
|---|---|---|
| [PortNet mandates and identity FAQ](https://www.portnet.ma/faq) | PortNet delegation differs from customs procuration. Delegations can be limited; staff access is individual and MFA-based. | Track both mandate types and their verification evidence; never solve delegation by sharing an importer’s credentials. |
| [PortNet carrier release service](https://www.portnet.ma/bon-a-delivrer-maritime-aerien-mead) | The Bon à Délivrer involves carriers/forwarders, recipients and handling operators; the service supports electronic exchange. | Model carrier release separately from customs clearance and physical exit. A checked internal task is not an official authorization. |
| [PortNet external-trade services](https://www.portnet.ma/portnet-commerce-exterieur) | Procedures include titles, product-specific authorizations/conformity, mandates and bank-guarantee requests. | Build configurable applicability and dependency checks rather than one universal checklist. |
| [Maersk Morocco import terms](https://www.maersk.com/local-information/europe/morocco/import) | This carrier distinguishes terminal storage from combined demurrage/detention; relevant start/end events and contractual free time differ. | Store the actual shipment contract and event basis. Do not apply one carrier’s schedule to all shipments. |
| [Office des Changes: importation of goods](https://www.oc.gov.ma/fr/personnes-morales/importations-de-biens) | Import settlement is linked to domiciliation, customs imputation and documentary conditions, with exceptions. | Distinguish supplier settlement evidence from broker disbursements/customer payments; surface missing evidence without executing banking operations. |
| [Office des Changes: domiciliation FAQ](https://www.oc.gov.ma/fr/faq/la-souscription-et-la-domiciliation-d-un-engagement-d-importation-sont-elles-obligatoires-avant) | Bank checks include consistency between the commercial contract and import undertaking. | Compare those records with invoice and declaration data before a reviewer approves a preparation packet. |
| [CNDP foreign-transfer guidance](https://www.cndp.ma/transfert-de-donnees-a-letranger/) | Foreign personal-data transfers have a specific legal process; relevant underlying processing formalities matter. | Make hosting, AI destinations and supporting privacy records inspectable. Single tenancy alone does not establish compliance. |

**Typical broker flow — illustrative synthesis:** client instructions and mandate → documents/title/required control evidence → declaration preparation and official-system handoff → separate clearance/carrier/terminal readiness checks → pickup/delivery/return where applicable → complete cost evidence and customer billing. Activities can overlap, be rejected or reopen; the exact route is **assumption to verify** by operation type and customer.

**Typical RED flow — illustrative synthesis:** authorized regime/project → import lots → warehouse/production movements and applicable BOM → export or another legally supported discharge route → reviewed allocation → reconciliation, deadline monitoring and guarantee follow-up. Detailed permitted discharge types, legal periods and calculation rules are **assumption to verify** with current ADII material and a qualified reviewer. This research does not establish a complete current RED rulebook.

## 3. Pain points ranked by impact

Ranking prioritizes potential compliance/financial consequences, then blocked execution, recurring work and adoption friction. Frequency, monetary impact and order within a specific customer are **assumption to verify**. RED risks rank highest for RED operators; carrier delays may rank highest for a broker’s maritime desk.

| Rank / pain | Who is affected | Daily friction, failure and consequence | Evidence and vTransit shortfall | Proposed response |
|---|---|---|---|---|
| P01 — A wrong or unsupported action is treated as safe | Déclarant, RED manager, director | Outdated evidence or an unreviewed calculation can drive the wrong declaration/allocation; later justification becomes difficult. | Audit confirms human-review claims but conflicting agent-autonomy wording; approval mechanics and rule versions **not visible**. Actual incidents: **assumption to verify**. | Version-bound approvals, evidence provenance, deterministic checks and explicit unknown states. |
| P02 — Dossier is “in progress,” but nobody owns the blocker | Agents, director, end client | People chase updates while a missing instruction, document or external response has no owner; work waits at handoffs. | vTransit has timelines, filters and alerts; dependencies, blocker ownership and acknowledged handoffs **not visible**. Pain frequency: **assumption to verify**. | Dependency board with owner, next action, request recipient and external-wait evidence. |
| P03 — Logistics costs continue after apparent completion | Dispatcher, client finance, brokerage owner | Pickup is confused with end of equipment liability; contract/free-time rules are checked manually or too late. | Audit shows generic aging and cost examples, not verified contract-based clocks or empty-return closure. Carrier workflow documented in [Morocco terms](https://www.maersk.com/local-information/europe/morocco/import); avoidable loss is **assumption to verify**. | Separate operational events and contract-aware cost forecasts, with missing inputs shown explicitly. |
| P04 — RED balance cannot be explained from production evidence | RED compliance, warehouse, production | Revised BOMs, partial flows or exceptions require manual reconstruction; a calculated clearance rate may hide unsupported consumption. | BOM/FIFO/LIFO are advertised; historical production linkage and exception treatment **not visible**. Actual manufacturing patterns: **assumption to verify**. | Lot-to-production-to-discharge traceability, reviewed exception records and reproducible evidence packs. |
| P05 — Correct information exists, but in conflicting versions | Intake agent, déclarant, client | New invoice replaces old invoice; totals or identifiers differ across attachments and someone must compare them again. | Extraction and deduplication exist in audit; semantic contradiction checks and downstream invalidation **not visible**. Concordance matters in [domiciliation guidance](https://www.oc.gov.ma/fr/faq/la-souscription-et-la-domiciliation-d-un-engagement-d-importation-sont-elles-obligatoires-avant). Frequency: **assumption to verify**. | Cross-document checks, version diffs and targeted re-review. |
| P06 — Data and statuses diverge between local and official systems | Operations, RED, accounting | Teams export, rekey and reconcile; “sent,” “accepted” and “posted locally” can be confused. | File exchange is advertised and API is explicitly future; acknowledgement and exception handling **not visible**. Actual rekeying effort: **assumption to verify**. | Reusable mappings, discrepancy queue, submission evidence and explicit source timestamps. |
| P07 — Costs are advanced or incurred without clean recovery | Accounting, director, client finance | Receipts arrive late, costs are disputed, draft charges are forgotten and margin looks better than it is. | vTransit covers pre-invoicing and receivables; cost commitments, client approvals and unbilled leakage workflow **not visible**. Scale: **assumption to verify**. | Cost-to-receipt-to-approval-to-invoice chain, advances reconciliation and exception queue. |
| P08 — Access or mandate is wrong at the moment of action | Broker staff, importer, IT | An absent/expired mandate or deactivated employee creates a preventable handoff failure or access risk. | Named roles are advertised; mandate-specific controls and MFA **not visible**. Distinct mandates and individual access documented by [PortNet](https://www.portnet.ma/faq). Incident rate: **assumption to verify**. | Mandate register, verification freshness and individual access; no shared external credentials. |
| P09 — “Released” conflates several independent decisions | Field agent, carrier, client | A vehicle or client is told to proceed while a carrier, terminal or product-control prerequisite remains unresolved. | Formality stages exist; independent release prerequisites and applicability rules **not visible**. [PortNet release workflow](https://www.portnet.ma/bon-a-delivrer-maritime-aerien-mead) supports the distinction; failures are **assumption to verify**. | Evidence-backed readiness checklist with separate official and physical events. |
| P10 — Bank/title/guarantee follow-up becomes a separate spreadsheet | Importer finance, RED manager | A locally complete customs step is mistaken for completed bank evidence or a released guarantee; staff chase closure separately. | Guarantees advertised; bank-confirmed closure and import-settlement evidence matching **not visible**. Relevant process documented by [Office des Changes](https://www.oc.gov.ma/fr/personnes-morales/importations-de-biens) and [PortNet services](https://www.portnet.ma/portnet-commerce-exterieur). Prevalence: **assumption to verify**. | Distinct local, submitted and externally confirmed closure states with evidence. |
| P11 — Clients are informed but cannot resolve the issue | End clients, account managers | Status calls continue because the client cannot see exactly which document, instruction or cost approval is needed. | Tracking/billing/notifications advertised; structured client actions and versioned approvals **not visible**. Client willingness to use a portal: **assumption to verify**. | Action inbox, controlled upload, cost approval and plain-language blocker summaries. |
| P12 — Audit preparation depends on one experienced person | Director, auditor, RED manager | Staff reconstruct why a value, regime, allocation or amendment was accepted; absence of the person delays answers. | Journal and reports advertised; reproducible source-to-decision export **not visible**. Dependence on individuals: **assumption to verify**. | Exportable decision history, source versions, approvals and calculation inputs. |
| P13 — Changing software risks losing operational memory | Buyer, IT, accounting | Historical references, open balances and attachments must survive migration while current work continues. | Data import advertised; mapping previews, dry-run reconciliation and rollback **not visible**. Switching reluctance: **assumption to verify**. | Reconciled migration, limited-scope pilot, preserved identifiers and complete exit export. |
| P14 — Field work and repetitive screens slow data capture | Agents, dispatch, end clients | Small-screen forms, poor connectivity or unsuitable language force later re-entry. | Mobile/offline/localization behavior **not visible**. Device conditions, French/Arabic needs and volume of repetition: **assumption to verify**. | Responsive task flows first, then validated language support and safe offline drafts. |
| P15 — Security and service promises are hard to verify | Buyer, IT, compliance | Buyer cannot tell where documents go, how restoration works or what support covers. | Security/support claims exist, but operational proof and detailed terms **not visible**; broken recovery template links were observed. | Testable restore/export controls, processing-destination records and accurate service documentation. |

**Competitive honesty:** the only directly observed faults here are presentation/routing issues and contradictory public wording. Most product-level shortfalls are unanswered questions in the public evidence. “vTransit lacks” below means **not established in the baseline; assumption to verify in a product demonstration**, unless explicitly marked future.

## 4. Match, improve or drop every baseline feature

**Match:** necessary capability, implemented well without making it the differentiation. **Improve:** preserve the underlying job and add the stated proposed behavior. **Drop:** omit the particular pattern or unsupported scope, with a replacement where needed. Decisions do not reclassify baseline confirmation status.

Roadmap references identify the delivery item. The original audit preserves evidence URLs for each feature; links to the main feature families are included here: [Transit](https://vtransit.ma/transit), [RED](https://vtransit.ma/red), [documentation](https://vtransit.ma/documentation), [pricing](https://vtransit.ma/tarifs).

### Public website and access

| ID | Baseline feature | Decision | One-line reason / proposed treatment | Delivery |
|---|---|---|---|---|
| W01 | Product discovery | Improve | Explain broker and RED outcomes within one configurable product instead of forcing an ambiguous product choice. | PL02 |
| W02 | Product and role navigation | Improve | Organize around each role’s work and provide a clear configured login destination. | PL01, PL02 |
| W03 | Interactive product previews | Improve | Use explicitly synthetic, executable scenarios that demonstrate blocker resolution rather than simulated success metrics. | PL02 |
| W04 | Product/plan comparison | Improve | Publish an accurate capability/service matrix and quote scope without inventing price tiers. | PL02 |
| W05 | Demo/contact request | Match | A simple request path is sufficient; the demonstration should follow a prospect’s verified workflow. | PL02 |
| W06 | Subscription request and plan preselection | Improve | Carry requested modules and deployment scope into a reviewable proposal, not a pretend checkout. | PL02 |
| W07 | Assisted activation | Improve | Couple onboarding to migration reconciliation, named ownership and a restore/cutover checklist. | FD03, PL02 |
| W08 | Contact channels | Match | Keep familiar channels, while formal decisions remain recorded on the dossier. | PL02 |
| W09 | Documentation and glossary | Improve | Add task guides, data templates, rule sources, connector limitations and correction examples. | FD03, PL02 |
| W10 | FAQ | Match | Give concise, consistent answers about approval boundaries, access and data handling. | PL02 |
| A01 | Client login | Improve | Offer individual accounts with dossier-scoped actions and explicit invitation/revocation. | FD01 |
| A02 | Staff/admin login | Improve | Use a coherent entry flow with server-enforced role separation and privileged-action controls. | FD01 |
| A03 | Remember me | Improve | Make persistent sessions revocable and subordinate to privileged-action reauthentication. | FD01 |
| A04 | Password recovery | Match | Implement secure, understandable recovery without template debris. | FD01 |
| A05 | Profile, company and announcements navigation | Improve | Turn account/company edits into authorized workflows and announcements into relevant notices. | CR06 |
| A06 | Sign out | Match | Invalidate sessions reliably, including cached client access. | FD01 |
| A07 | Role-based permissions | Improve | Add field/action boundaries, client relationships and version-bound approvals. | FD01, FD02 |
| A08 | Google/Microsoft SSO | Match | Support configured providers where the buyer needs them; no fake provider buttons. | FD01 |

### Transit

| ID | Baseline feature | Decision | One-line reason / proposed treatment | Delivery |
|---|---|---|---|---|
| T01 | Seven-stage dossier lifecycle | Improve | Preserve milestones but model parallel prerequisites, returns and accountable handoffs. | CR01 |
| T02 | Email-based intake | Improve | Route uncertain messages to review and preserve attachment/version provenance. | FD02, DF01 |
| T03 | Dossier identity and shipment metadata | Improve | Validate reusable client/route identifiers and expose contradictions before downstream use. | FD03, CR01 |
| T04 | Article ventilation and declaration preparation | Improve | Show source-backed field review and invalidate approval when relevant inputs change. | CR01, DF01 |
| T05 | DUM document checklist | Improve | Determine required evidence from reviewed operation rules rather than one universal checklist. | CR01 |
| T06 | Customs value and duty/tax estimate | Improve | Make rate/FX/source versions and uncertain inputs visible in every estimate. | CR01 |
| T07 | Formality milestones | Improve | Separate internal completion from official acceptance and attach the corresponding evidence. | CR01, CR07 |
| T08 | Shipment release and delay exposure | Improve | Use contract-specific event clocks and explicitly model empty return where applicable. | CR03, DF02 |
| T09 | Dossier document library | Improve | Add version relationships, review state, controlled retention and downstream-use tracing. | FD02 |
| T10 | Attachment deduplication | Match | Use exact-content fingerprints and safe duplicate handling; do not silently merge similar files. | FD02 |
| T11 | Commercial invoice extraction | Improve | Compare extracted values against other documents and show unresolved contradictions. | DF01 |
| T12 | Import undertaking extraction | Improve | Link source fields to invoice/contract/title consistency checks and reviewer decisions. | DF01 |
| T13 | Prior DUM reuse | Improve | Copy only approved reusable facts and force revalidation of time-sensitive fields. | DF01 |
| T14 | Reviewed article import and SH warnings | Improve | Bind approval to the exact reviewed version and show the basis of every warning. | DF01 |
| T15 | Expense request from supplier document | Improve | Match expense suggestions to commitments, receipts and existing billed/unbilled costs. | CR02, DF01 |
| T16 | Incoming email classification | Improve | Preserve uncertainty, correct routing and prevent attachment exposure across clients. | FD02, DF01 |
| T17 | Business-data assistant | Improve | Answer with authorized source records and open the corresponding actionable work list. | DF05 |
| T18 | Delivery orders | Match | Support both dossier-linked and standalone work with consistent shipment inheritance. | CR03 |
| T19 | Internal/external missions | Improve | Require explicit assignment acknowledgement and evidence for handoff/closure. | CR03, PL01 |
| T20 | Fleet, assignments and immobilization | Match | Keep reliable assignment and availability controls; exclude speculative fleet/telematics expansion. | CR03 |
| T21 | Transport statistics | Improve | Explain waiting causes and completion events, not only activity totals. | CR03, PL02 |
| T22 | Expenses, disbursements and pre-invoicing | Improve | Trace each cost from commitment through approval, evidence and customer billing. | CR02 |
| T23 | Customer invoicing | Match | Provide verified local invoice/correction rules and accounting handoff without building a full ERP. | CR02 |
| T24 | Receivables indicators | Improve | Separate unpaid invoices, disputed amounts, client advances and unallocated receipts. | CR02 |
| T25 | Sales, purchases, customer payments and data areas | Drop | Drop vague ERP breadth inferred from menu labels; retain necessary billing, receipts and reference data in focused modules. | CR02, FD03 |
| T26 | Dossier and margin dashboard | Improve | Show blocked work, missing cost evidence and explainable realized/estimated margin. | CR01, CR02 |
| T27 | Operational filters | Improve | Add saved role views and direct access to each blocker’s next action. | CR01, PL01 |
| T28 | Aging and blocked/unpaid alerts | Improve | Prioritize by explicit obligation, owner and known cost exposure instead of undifferentiated alerts. | CR01, DF02 |
| T29 | Average time by status | Improve | Distinguish active work from client/external waiting with documented event semantics. | CR01, PL02 |
| T30 | Anomalies and disputes | Improve | Link causes, evidence, responsibility and resolution to the affected cost or dossier step. | CR01, CR02 |
| T31 | External client access | Improve | Give clients a structured action inbox, not merely tracking and notifications. | CR06 |

### RED

| ID | Baseline feature | Decision | One-line reason / proposed treatment | Delivery |
|---|---|---|---|---|
| R01 | Economic-regime projects | Match | Support only reviewed regime definitions and authorizations applicable to the installation. | CR04 |
| R02 | Import/export DUM flows | Improve | Preserve source acknowledgements and article/lot provenance through corrections. | CR04, CR07 |
| R03 | Manual and automatic clearance controls | Improve | Separate proposal, approval and posting with live balance checks. | CR04 |
| R04 | FIFO/LIFO matching | Improve | Apply eligibility before ordering and make the allocation calculation reproducible. | CR04 |
| R05 | Discharges and accounting clearance | Improve | Use auditable adjustments/reversals rather than destructive ledger editing. | CR04 |
| R06 | Remaining stock, clearance rate and compliance status | Improve | Show quantity reconciliation and unresolved evidence instead of a misleading universal green status. | CR04, DF03 |
| R07 | BOM composition | Improve | Version BOMs and link approved usage to actual production and discharge evidence. | CR04, DF03 |
| R08 | Missing-BOM recommendation | Improve | Make missing applicable BOM evidence a named resolution task, with controlled exception handling. | CR04, DF03 |
| R09 | Statutory deadline alerts | Improve | Tie each due date to a reviewed rule and recorded extension evidence where applicable. | CR05, DF04 |
| R10 | Bank guarantees | Improve | Separate local reconciliation, requested release and bank-confirmed release. | CR05 |
| R11 | Customs statement reconciliation | Improve | Add reusable mappings, uncertainty review and non-destructive discrepancy resolution. | CR07 |
| R12 | Journal and sommier A.T. | Improve | Make historical balances reproducible at the chosen reporting date. | CR04 |
| R13 | Audit and conformity reports | Improve | Export source-to-decision evidence with rule versions and unresolved exceptions. | FD02, DF03 |
| R14 | RED dashboard | Improve | Lead with obligations needing action and traceable exposure, not headline totals alone. | CR04, CR05 |
| R15 | Setup checklist | Improve | Require reconciled opening balances and validated reference data before operational sign-off. | FD03 |
| R16 | Client and reference-data modules | Match | Provide validated reusable records and controlled amendments. | FD03 |
| R17 | Global search | Improve | Search authorized dossier, document, client and obligation context with useful result explanations. | FD03, PL01 |
| R18 | Balance export and discharge sheet | Improve | Attach the exact source versions, calculation basis and correction history. | CR04, DF03 |
| R19 | Document knowledge base and semantic retrieval | Improve | Index provenance/effective dates and exclude inaccessible or superseded evidence from unsupported answers. | DF05 |
| R20 | Customs conversational assistant | Improve | Cite accessible evidence, distinguish guidance from decisions and admit unresolved rules. | DF05 |
| R21 | Conversation list and prompt shortcuts | Match | Offer useful history/shortcuts with approved retention and permissions. | DF05 |
| R22 | Clearance advisor | Improve | Compare feasible options and explain why a proposal is eligible, risky or incomplete. | DF05 |
| R23 | Portfolio monitoring agent | Improve | Automate investigation while requiring version-bound human approval for business mutations. | DF05 |
| R24 | Manual scans, scheduled scans and run history | Improve | Expose stale inputs, skipped work, retries and exact proposed changes. | DF05 |
| R25 | Recommendation feedback and reuse | Improve | Retain corrections as organization-owned evidence and test recurring errors without silent model training. | DF05 |
| R26 | Profile and settings | Match | Provide permission-controlled preferences, job/provider configuration and audit history. | FD01, PL02 |

### Integration, hosting and service

| ID | Baseline feature | Decision | One-line reason / proposed treatment | Delivery |
|---|---|---|---|---|
| S01 | Data import onboarding | Improve | Make migration dry-run, reconciled, reversible and traceable to original identifiers. | FD03 |
| S02 | PortNet/BADR file exchange | Improve | Show mapping versions, official acknowledgements and unresolved import differences. | CR07 |
| S03 | Third-party API | Improve | Deliver a tested limited contract before claiming live partner connections; baseline calls APIs future. | DF06 |
| S04 | Encryption | Match | Verify storage/transport/key handling in the actual deployment and describe it accurately. | FD02, PL02 |
| S05 | Dedicated hosting and CNDP positioning | Improve | Provide processing-destination and compliance evidence instead of treating hosting as proof of legality. | FD02, PL02 |
| S06 | Encrypted backups and recovery plan | Improve | Make restoration reproducible and test database/document consistency. | FD02, PL02 |
| S07 | Hosting monitoring | Match | Monitor actual service/job health with documented escalation ownership. | FD02, PL02 |
| S08 | On-premise and signed license | Match | Support a verifiable installation license and customer-controlled deployment when contracted. | PL02 |
| S09 | Dedicated SLA, support and onboarding | Improve | Define service scope and escalation around actual restoration/support capabilities. | PL02 |
| S10 | Plan capacities and AI allowance | Drop | Drop token-led product packaging; show approved installation scope and transparent usage/cost controls without invented “unlimited” promises. | PL02 |

“Drop” does not mean removing a working customer capability during migration. Existing business dependencies must be reconciled first. Payment recording remains in CR02; usage observability remains in PL02.

## 5. Added features that address the highest-impact pains

These are **proposed gaps relative to public evidence**, not verified omissions from vTransit’s authenticated product. Each requires competitive demonstration and customer validation.

| New capability | Pain addressed | Concrete behavior | Baseline distinction | Delivery |
|---|---|---|---|---|
| Owned blocker and dependency board | P01, P02, P09 | Every blocked step states what is missing, who can resolve it and which evidence closes it. | Goes beyond advertised stages/alerts; dependency ownership **not visible**. | CR01 |
| Separate mandate register | P08 | Track customs and PortNet mandates, coverage, validity and when status was last verified. | Mandates **not visible**. Local tracking does not create an official mandate. | FD01 |
| Cross-document contradiction review | P01, P05 | Compare invoice, contract, title, packing/shipment and declaration facts; route only relevant changes for re-review. | Goes beyond OCR and exact-file duplicates; contradiction engine **not visible**. | DF01 |
| Carrier/terminal/physical release readiness | P02, P09 | Show independent prerequisite evidence with unknown/stale/confirmed states. | Fine-grained readiness checks **not visible**. | CR01, CR03 |
| Contract-aware cost and return clocks | P03 | Follow actual cost-start/stop events, contract terms and empty-return obligations; compare scenarios only with sufficient inputs. | Contract engine and equipment-return closure **not visible**. | CR03, DF02 |
| Evidence-linked cost recovery | P07 | Connect commitment, client approval, receipt, cost line and billed/recovered status. | Full chain **not visible**. | CR02 |
| Client action inbox | P02, P05, P11 | Request a named document, corrected field, instruction or exact cost approval; show receipt versus acceptance separately. | Structured client actions **not visible**. | CR06 |
| Production-to-customs reconciliation | P04, P12 | Explain differences among imported material, production use, applicable exceptions and approved discharge. | Actual production/exception evidence workflow **not visible**. | DF03 |
| Rule-change impact review | P01, P04, P12 | A reviewer records a rule change; the system identifies potentially affected dossiers without silently changing historical decisions. | Versioned impact analysis **not visible**. | DF04 |
| Externally confirmed closure | P10 | Maintain separate requests, acknowledgements and accepted bank/customs outcomes. | Evidence-backed closure state machine **not visible**. | CR05, CR07 |
| Rehearsed migration and unrestricted exit export | P13 | Preview source mapping, reconcile open quantities/money, approve cutover and export organization-owned data/evidence. | Reconciled cutover and exit pack **not visible**. | FD03, PL02 |
| Safe mobile drafts and handoff capture | P14 | Capture assigned-task notes/uploads on small screens; optional offline drafts synchronize without finalizing business decisions. | Mobile/offline behavior **not visible**. | PL01 |

Do not add private WhatsApp scraping, credential-sharing bots or unapproved official-system automation to create the appearance of integration. A user-authorized upload/forwarding path works before approved connectors exist.

## 6. Why clients would switch, and what is harder to copy

**For brokers:** replace a passive dossier list with a working queue that connects client requests, clearance readiness, logistics events and cost recovery. The switching case is demonstrated on their own authorized historical/open dossiers: find a real inconsistency, resolve an actual blocker and reconcile the resulting invoice evidence. Savings and switching intent remain **assumption to verify**.

**For RED operators:** explain each remaining obligation from import through production or other approved disposition to discharge and external confirmation. The value proposition is a defensible answer to “why is this balance still open?” rather than a reassuring percentage.

**For staff:** fewer duplicate edits and searches, clearer ownership and correction history. **For end clients:** a concise request list, an understandable reason for delay and a clear boundary between forecast and confirmed outcome.

No UI feature is uncopyable, and the audit gives no basis to claim that vTransit cannot implement these ideas. The harder-to-copy advantage would be accumulated execution quality:

| Advantage to build | Why copying the interface is insufficient | Proof needed |
|---|---|---|
| Reviewed Moroccan workflow/rule library | Requires maintained sources, applicability decisions and tests for real exceptions. | Reviewer provenance, regression fixtures and a visible update process; ability to sustain it is **assumption to verify**. |
| Organization-specific evidence and correction history | Useful mapping, exception resolution and document corrections accumulate through actual use. | Reproducible decisions and fewer repeated errors in a measured pilot; outcomes are **assumption to verify**. |
| Reliable migration and reconciliation adapters | Real files differ; trust comes from reconciled balances and safe retry/correction behavior. | Successful dry runs using authorized customer exports, with unresolved differences disclosed. |
| Connected accountability across operations and money | Blockers, releases, return evidence and billing must agree across multiple modules. | End-to-end scenarios that preserve invariants under amendments and failed handoffs. |
| Credible delivery/support practice | Restore competence, careful cutover and accessible support are operational capabilities, not screenshots. | Restore results, clear ownership, accurate service terms and customer references when earned. |

These assets stay within each deployment. **No pooled customer documents, cross-customer learning network or undisclosed model training.** Shareable product improvements may use public/licensed rules and approved synthetic cases. Customers own and can export their records; retention lock-in is not the moat.

### Switching and validation plan

Begin with an authorized sample of representative dossiers, including amendments and exceptions, without claiming a sample size. Observe a déclarant, intake agent, accounting user, field coordinator and client contact; for RED, include warehouse/production and compliance. Validate the pain order and actual module scope before committing to every item below.

Run a comparison against the current process using the same cases: unresolved blockers, repeated data entry, discrepancies found before approval, unbilled supported costs, unexplained RED quantity differences and time to assemble evidence. Define metric denominators and targets with the customer; all target values are **assumption to verify**. Keep initial trials out of official submission and production posting. Reconcile opening balances before cutover and preserve a documented fallback.

Pricing model: propose an installation/module/service agreement with transparent provider usage, subject to validated support economics. Exact price, billing basis, support hours and included consumption are **assumption to verify**. The competing proposition must not depend on being cheaper than an undisclosed vTransit quote.

## 7. Single-tenant product architecture

One application deployment serves one operating organization. Its database, document storage, configuration, credentials, backups and jobs are dedicated to that deployment. **No tenant tables, tenant IDs, tenant provisioning, cross-organization workspace switching or shared customer-data plane.**

Clients, suppliers, brokers, carriers and banks are business counterparties, not application tenants. Branches, desks and warehouses may be business records under the same organization. A separate operating organization requires a separate deployment. External accounts receive only explicitly authorized records/actions through server-enforced permissions. A client filter is a record filter, not a workspace switcher.

Start with a modular application and transactional database/document store using the repository’s existing stack if present; introducing a microservice estate is not a goal. Proposed modules: identity/mandates, evidence, master data/migration, dossier workflow, finance, transport, RED ledger, obligations, client actions, reconciliation and optional intelligence. Use decimal-safe money/quantities, explicit units, versioned records, reversible corrections and durable idempotent jobs. These are design choices, not claims about the competitor’s architecture.

Keep separate states for **draft → reviewed → approved locally → submitted externally → acknowledged/accepted externally**, applying only the states relevant to the workflow. Official acceptance requires actual external evidence. Human approval binds the exact inputs/rule versions; a changed input invalidates or explicitly reopens dependent approval. AI has no direct ledger, payment, external-submission or guarantee-release authority.

## 8. Phased roadmap

Effort: **S** localized change; **M** connected feature; **L** cross-module or integration work. These are provisional estimates; stack maturity and team capacity are **assumption to verify**. Order within a phase follows dependencies. Basic access security, backups and accessibility start in foundation; polish is not a reason to defer them.

| Phase | Goal | Release gate |
|---|---|---|
| Foundation | Trust the identity, evidence and opening data. | Permission checks, evidence history, restore baseline and reconciled migration work. |
| Core | Complete real broker and RED operations without depending on AI. | Supported dossiers can close with reconciled quantity/money/evidence; official outcomes are never fabricated. |
| Differentiators | Prevent contradictions and expose avoidable risk early. | Readiness, cost, production and rule-impact scenarios pass customer-reviewed tests. |
| Polish | Make daily work and buying/deployment consistently usable. | Field/client UX, service documentation, deployment and outcome reports reflect actual behavior. |

| Item | Phase | Goal and scope | Modules / pains | Effort | Dependencies | Risks |
|---|---|---|---|---|---|---|
| FD01 — Identity, access and mandates | Foundation | Individual staff/client identity, MFA, configured SSO, role/action permissions and separately evidenced mandate types. | Identity, mandate register; P01/P08/P15 | L | None | Identity linking errors; local mandate state mistaken for external truth. |
| FD02 — Evidence and decision history | Foundation | Versioned files/events, deduplication, permissions, version-bound approvals, baseline encryption/backup/restore and durable jobs. | Documents, approvals, audit; P01/P05/P12/P15 | L | FD01 | Source leakage, lost provenance, excessive retention, inconsistent restore. |
| FD03 — Migration and reference data | Foundation | Client/office/material references, preserved identifiers, import dry run, opening-balance reconciliation, search and cutover/exit export. | Import, master data; P05/P06/P13 | L | FD01–FD02 | Unsupported source exports, false duplicate merges, incorrect opening balances. |
| CR01 — Dossier and blocker workflow | Core | Declaration/DUM preparation, reviewed calculations, applicable document/release prerequisites, named blockers, handoffs and operational dashboards. | Dossiers, work queue; P01/P02/P05/P09 | L | FD01–FD03 | Over-rigid checklist, unreviewed rules, confusing internal and official completion. |
| CR02 — Costs, billing and cash evidence | Core | Commitments/receipts/client advances, approvals, pre-invoicing, invoices/corrections, receivables and import-settlement evidence links. | Finance; P07/P10 | L | CR01 | Tax/FX mistakes; confusing supplier settlement with broker receipts; duplicate billing. |
| CR03 — Transport and physical closure | Core | Delivery orders/missions, fleet conflicts, handoff evidence, pickup/delivery/return events and known external prerequisites. | Transport; P02/P03/P09 | L | CR01 | Dispatch against stale evidence, missing returns, contradictory timestamps. |
| CR04 — RED ledger and deterministic clearance | Core | Authorized regime projects, import/export lots, stock/journal, versioned BOM, manual/FIFO/LIFO proposals and approved posting/export. | RED, BOM, reporting; P01/P04/P12 | L | FD01–FD03 | Over-allocation, unit errors, concurrent posting, unsupported legal assumptions. |
| CR05 — Obligations and guarantee closure | Core | Source-backed due dates, exceptions/extensions where reviewed, actionable alerts and request/confirmation guarantee states. | Compliance, guarantees; P01/P04/P10 | L | CR04 | Wrong rule applicability, false release/compliance status, stale bank evidence. |
| CR06 — Client action portal | Core | Document/instruction/cost requests, controlled uploads/approvals, client-visible timeline, billing and account/company notices. | Portal, notifications; P02/P05/P11 | L | CR01–CR02, FD01–FD02 | Cross-client disclosure, unauthorized client approval, ignored notification channels. |
| CR07 — File exchange and reconciliation | Core | Supported PortNet/BADR/customs files, mapping versions, sent/accepted evidence and discrepancy resolution. | Interchange, reconciliation; P06/P10/P12 | L | CR01, CR04, FD02 | Format drift, unavailable acknowledgements, unsafe repeated imports. |
| DF01 — Cross-document readiness review | Differentiators | Reviewed extraction, field provenance, semantic contradictions, prior-DUM reuse and change-impact re-review. | AI review, readiness; P01/P05 | L | CR01–CR02, FD02 | False matches, missing contradictions, stale approvals, provider data exposure. |
| DF02 — Contract-aware delay exposure | Differentiators | Versioned actual contract clocks/rates, separate equipment/storage obligations and explainable scenarios. | Cost forecast, logistics; P03 | L | CR02–CR03 | Wrong commercial terms, double-counting charges, unreliable event times. |
| DF03 — Production-to-RED evidence | Differentiators | Actual production/material movements, applicable exceptions, customs-balance comparison and reviewable evidence exports. | Production adapter, RED; P04/P12 | L | CR04, CR07 | Unknown units/yields, legally unsupported discharge treatment, noisy ERP data. |
| DF04 — Rule-change impact review | Differentiators | Reviewed rule register, effective-date handling, impacted-case proposals and controlled re-review. | Rule registry, obligations; P01/P04/P12 | L | CR01, CR05 | Stale legal source, wrong applicability, retroactive rewriting. |
| DF05 — Grounded advisory and scans | Differentiators | Authorized knowledge/chat, feasible option comparison, scheduled/manual investigations, feedback and approval-bound proposals. | Retrieval, advisory jobs; P01/P02/P04/P12 | L | CR04–CR05, DF01, DF03–DF04 | Hallucination, prompt injection, stale proposals, duplicate execution. |
| DF06 — Supported API and adapters | Differentiators | Versioned internal API, selected ERP/accounting adapters and official-system adapters only with documented access/specifications. | API, integration; P06/P10/P13 | L | CR02, CR04, CR07, FD01 | Partner access unavailable, divergent balances, API permission bypass. |
| PL01 — Fast, accessible field UX | Polish | Saved task views, keyboard operation, responsive capture, verified language needs and safe offline drafts for approved use cases. | Staff/client/mobile UX; P02/P11/P14 | L | CR01, CR03, CR06 | Stale local data, lost drafts, confusing translations, shared-device exposure. |
| PL02 — Credible launch and operations | Polish | Outcome reports, real demo journeys, accurate module/service comparison, documentation, deployment/license packaging, monitoring/support and restore proof. | Website, service, operations; P13/P15 | L | Foundation/core and chosen launch differentiators | Unsupported promises, on-premise support burden, usage-cost surprises. |

The repeated L estimates reflect broad work packages, not a schedule. Split them into repository-sized tickets after discovery. A broker launch can use the broker core with DF01/DF02; RED launches require CR04/CR05 and applicable RED differentiators. Do not market an omitted module as delivered. Exact launch scope is **assumption to verify** with the first buyer.

## 9. Standalone coding prompts

Every prompt below repeats the architectural and evidence constraints so it can be used independently. Acceptance criteria are proposed product requirements. Inspect the repository first; preserve working code, identify missing dependencies and use test adapters where outside access is unavailable. Do not describe test adapters as live integrations.

### FD01 — Identity, access and mandates

```text
Build identity, permissions and mandate tracking for Dossier Clair, a Moroccan broker/RED operations product. Inspect the repository and reuse its stack. Keep one operating organization per deployment: no tenant tables, tenant IDs, tenant provisioning or workspace switching. External clients and brokers are permission-restricted counterparties, not tenants.

Implement individual login, recovery, logout, revocable sessions, MFA and configured Google/Microsoft SSO. Define roles and action/field permissions for operations, declarant review, accounting, administration and external clients. Model PortNet and customs mandates separately with source evidence, permitted scope, validity and last verification; local tracking never grants an official mandate. Source context: https://www.portnet.ma/faq. Mandate rules not established by approved specifications must say “assumption to verify.” Never store shared importer credentials or automate around official MFA.

Acceptance criteria:
- Direct API, list, search and download requests enforce role and client-record permissions.
- Recovery tokens are single-use/expiring; logout and access revocation invalidate applicable sessions.
- Privileged actions require the configured authentication assurance; SSO validates identity and never links by unverified email.
- A mandate record distinguishes type, scope, verified status and stale/unknown state; expired or insufficient evidence cannot appear valid.
- Tests cover cross-client access, role changes, mandate mismatch, recovery misuse and unavailable identity-provider configuration.
```

### FD02 — Evidence and decision history

```text
Implement Dossier Clair's evidence foundation using the current repository stack. One organization per deployment only; no tenant IDs, tenant provisioning or workspace switching. Build versioned document storage, content fingerprints, provenance, event history, correction/reversal records and version-bound approvals. Business changes must retain actor, reason, input version and relevant rule version. Similar files are not necessarily duplicates.

Add durable idempotent job handling and baseline encrypted storage/transport, secret handling, backups and an isolated restore procedure appropriate to the actual deployment. Retention, recovery targets and AI processing destinations are “assumption to verify” until approved. Do not claim that single tenancy or encryption establishes CNDP compliance; see https://www.cndp.ma/transfert-de-donnees-a-letranger/.

Acceptance criteria:
- Authorized users can trace a decision to its exact source versions; unauthorized users cannot retrieve source blobs or history.
- Replacing a relevant source marks dependent approval stale and prevents unreviewed posting.
- Duplicate jobs/uploads cannot duplicate business effects; uncertain similarity is reviewable rather than auto-merged.
- Supported corrections preserve prior evidence and clearly identify the replacement/reversal.
- Restore verification covers database and file consistency; logs exclude secrets and document contents.
- Tests cover access denial, stale approval, retry, correction history and restore integrity.
```

### FD03 — Migration and reference data

```text
Build validated reference data and migration for Dossier Clair. Inspect current code and supported source formats; do not invent access to a competitor database. Maintain one organization per deployment without tenant IDs or workspace switching. Clients, offices, materials and counterparties are business records.

Implement reusable reference validation, original-ID preservation, mapping previews, duplicate candidates, import dry runs and opening quantity/money reconciliation. Include document links, permissions and evidence history where the source export supports them. Support a reviewed cutover and a complete organization-owned exit export. Search and onboarding completion must reflect actual authorized records. Undocumented schemas, missing balances and source-export availability must remain “assumption to verify.”

Acceptance criteria:
- Invalid rows and ambiguous matches are shown before commit; no silent merge or inferred opening balance.
- Each imported record retains source file/row/identifier provenance and mapping version.
- Re-running an import is safe; quantity totals reconcile by unit and monetary totals by currency.
- Cutover is blocked until required reconciliation differences are reviewed; rollback does not erase later live work.
- Exit exports include a manifest and unresolved limitations and can be validated against persisted records.
- Tests cover malformed files, duplicate import, ambiguous counterparties, balance differences and permission-scoped search.
```

### CR01 — Dossier and blocker workflow

```text
Build the deterministic broker dossier workflow for Dossier Clair. Reuse existing code and preserve a single-tenant deployment: no tenant IDs or workspace switching. Implement dossier metadata, article ventilation, document requirements, DUM preparation, reviewed value estimates, formalities and a dependency board. Keep parallel work, rejection/reopening and external waits explicit rather than forcing every action through a linear status list.

Each blocker needs an owner, next action, required evidence and affected step. Separate customs clearance, carrier release and terminal/physical readiness; https://www.portnet.ma/bon-a-delivrer-maritime-aerien-mead documents a distinct carrier-release process. Applicable documents, tariffs, FX and statutory rules require reviewed sources; unknown values are “assumption to verify,” never invented rates. An internal checkbox cannot certify official acceptance.

Acceptance criteria:
- A supported dossier can move through preparation and handoffs with persisted, auditable state.
- Unsatisfied dependencies identify actionable blockers and prevent only the relevant controlled transitions.
- Changed source inputs reopen dependent review; authorized overrides require recorded reasons and cannot fabricate external outcomes.
- Estimates display source/FX/rule basis or explicit unavailable inputs and use decimal-safe calculations.
- Dashboards reconcile to records and distinguish active work from external/client waiting.
- Tests cover parallel steps, amendments, missing release evidence, permissions and precision.
```

### CR02 — Costs, billing and cash evidence

```text
Implement Dossier Clair's focused dossier finance module. Inspect and extend the repository; keep one organization per deployment, with no tenant IDs or workspace switching. Scope is commitments, provider receipts, approved costs, customer advances, pre-invoicing, invoices/corrections, payment allocation, receivables and explainable margin—not a full ERP or payment-execution platform.

Link each cost to evidence, applicable client approval and billed/recovered status. Distinguish broker receipts/advances from an importer's supplier settlement. Record title, domiciliation, customs-imputation and bank evidence when relevant; official context: https://www.oc.gov.ma/fr/personnes-morales/importations-de-biens. Tax, numbering, settlement eligibility and currency rules require approved configuration; otherwise mark “assumption to verify.” Never execute a payment or imply bank acceptance from local bookkeeping.

Acceptance criteria:
- Cost-to-evidence-to-approval-to-invoice links remain traceable and cannot be billed twice on retry.
- Advances, receivables, disputed amounts and unallocated receipts are separately reconciled.
- Margin distinguishes known actual costs from estimates/unconfirmed costs and documents pass-through treatment.
- Issued-record corrections use controlled history; client approvals bind exact amounts, currencies and versions.
- Missing bank evidence remains unresolved rather than “settled.”
- Tests cover precision, allocation, duplicate billing, stale approvals and unauthorized financial changes.
```

### CR03 — Transport and physical closure

```text
Implement transport and physical closure for Dossier Clair using existing repository conventions. Single tenant only: no tenant IDs or workspace switching. Support dossier-linked/standalone delivery orders, internal/external missions, truck/driver assignment, immobilization and explicit handoff acknowledgement. Track applicable pickup, gate-out, delivery and empty-return evidence separately.

Readiness depends on reviewed external prerequisites, not merely a dossier status. Preserve source timestamp and verification freshness. The actual carrier contract determines which events close equipment obligations; https://www.maersk.com/local-information/europe/morocco/import illustrates why delivery and container return can differ. Do not invent GPS, carrier APIs, legal permissions or contract terms; missing operational rules are “assumption to verify.”

Acceptance criteria:
- Linked orders preserve dossier relationships while standalone orders remain supported.
- Assignment conflicts and immobilized assets follow explicit validated rules.
- Handoffs record the responsible party, acknowledgement and supporting evidence.
- Delivery cannot silently close a separately outstanding return obligation.
- Stale/missing release evidence is visible and governed by reviewed transition rules; override never fabricates official release.
- Tests cover concurrent assignments, out-of-order events, reopened delivery, outstanding return and client access.
```

### CR04 — RED ledger and deterministic clearance

```text
Build Dossier Clair's RED project and clearance ledger. Inspect existing models and keep a single-tenant system with no tenant IDs or workspace switching. Support only reviewed regime definitions, import/export DUM articles, lots, quantities/units, versioned BOMs, discharge proposals, journal balances and evidence-linked exports.

Implement manual and FIFO/LIFO proposal generation with explicit eligibility before ordering. Separate proposal, authorized human approval and atomic posting. Use adjustments/reversals for corrections and maintain historical BOM/calculation versions. Current legal regime definitions, permitted discharges, yields and conversion factors must come from approved sources; missing definitions are “assumption to verify.” No LLM may determine authoritative ledger arithmetic or post directly.

Acceptance criteria:
- Stock, discharge and remaining quantities reconcile by material/unit and reporting date.
- Ineligible lots, missing required BOMs and unsupported conversions produce reviewable errors.
- Approval revalidates current balances and input versions and posts exactly once under concurrency.
- Allocations cannot overconsume eligible quantities or create unexplained negative stock.
- Journal, dashboard and balance/discharge exports reproduce the same source history.
- Tests cover FIFO/LIFO ordering, ties, partial allocations, concurrent approvals, reversals and BOM amendments.
```

### CR05 — Obligations and guarantee closure

```text
Implement deadline obligations and bank-guarantee follow-up for Dossier Clair. Reuse the repository's single-tenant architecture; no tenant IDs or workspace switching. Model each obligation with its source, applicable reviewed rule, owner, outstanding evidence and closure conditions. Keep approved extensions or exceptions versioned where the business rules actually support them.

For guarantees, separate local balance reconciliation, requested release, external acknowledgement and confirmed release. Do not infer bank approval from complete local clearance. Statutory periods, severity boundaries, guarantee allocation and permitted partial release remain “assumption to verify” without approved specifications. PortNet lists guarantee request workflows at https://www.portnet.ma/portnet-commerce-exterieur, but that is not a complete rules contract.

Acceptance criteria:
- Every calculated date identifies its approved rule and inputs; missing rules yield unknown status.
- Alerts identify the responsible user and concrete missing action/evidence and deduplicate repeated events.
- A supported extension preserves the original due-date history and recomputes dependent alerts.
- Confirmed guarantee release requires authorized external evidence; requests and local clearance remain distinct.
- Dashboard obligation states reconcile to ledger and evidence records.
- Tests cover boundary dates, stale evidence, partial release where configured, extension review and unauthorized closure.
```

### CR06 — Client action portal

```text
Build a client action portal for Dossier Clair, not a separate tenant application. Preserve the repository stack and one operating organization per deployment: no tenant IDs or workspace switching. External clients receive only record/action permissions explicitly assigned by the organization.

Implement requests for named documents, field corrections, instructions and exact cost approvals, with a clear client-visible reason and status. Distinguish uploaded/received evidence from reviewer acceptance. Show permitted dossier progress, billing and notifications plus authorized account/company changes and relevant announcements. Notifications use configured channels; portal preference and channel adoption remain “assumption to verify.” Do not build private-message scraping or public document links.

Acceptance criteria:
- Clients can resolve assigned requests without access to internal notes, other clients or unapproved financial details.
- Instructions/cost approvals bind the authorized person and exact reviewed version; material changes require renewed approval.
- Uploads are securely attached and remain pending until accepted by the appropriate reviewer.
- Notifications are idempotent and clearly distinguish external waiting from a client action.
- Revocation prevents direct-link, cached and download access.
- Tests cover cross-client attempts, replayed approval, replaced documents, channel failure and restricted company edits.
```

### CR07 — File exchange and reconciliation

```text
Implement supported file interchange and reconciliation for Dossier Clair. Keep one organization per deployment with no tenant IDs or workspace switching. Inspect available schemas, fixtures and adapters; the baseline only establishes file-based PortNet/BADR exchange, not a public API contract. Do not invent external endpoints or success acknowledgements.

Create versioned import mappings, validation previews, discrepancy queues and reviewed reconciliation against local dossiers/RED flows. Preserve original files and source row identifiers. Separate prepared, exported, externally submitted, acknowledged and accepted states where relevant. Missing external evidence or undocumented schemas must say “assumption to verify.” Approved changes must reuse deterministic business services and preserve historical values.

Acceptance criteria:
- Supported formats have documented schemas and fixtures; unsupported input fails with an actionable explanation.
- Ambiguous, unmatched and invalid records remain visible before any posting.
- Reimported content cannot duplicate quantities, costs or official-status events.
- Review shows original/local/proposed values and binds approval to the current versions.
- “Accepted externally” requires identifiable evidence; a successful local export cannot produce it.
- Tests cover malformed files, mapping changes, duplicate imports, concurrency and unauthorized resolution.
```

### DF01 — Cross-document readiness review

```text
Build cross-document readiness review for Dossier Clair on the existing evidence and dossier services. One organization per deployment only; no tenant IDs or workspace switching. Implement draft extraction for invoices, import undertakings, prior DUMs and provider expenses plus guarded email classification. Compare relevant identifiers, quantities, amounts/currencies and source versions across approved document types.

Use deterministic comparisons where rules exist and label probabilistic matches as suggestions. Show source document/page/field provenance, contradictions and the exact downstream approvals affected by a revision. Contract/title concordance is relevant in https://www.oc.gov.ma/fr/faq/la-souscription-et-la-domiciliation-d-un-engagement-d-importation-sont-elles-obligatoires-avant. Tolerances, reusable fields and provider permissions are “assumption to verify” until approved. AI cannot silently resolve contradictory evidence.

Acceptance criteria:
- Extracted fields remain drafts with source links and explicit missing values.
- Contradictions are reviewable side by side; duplicate appearance never automatically establishes equivalence.
- Only affected approvals are marked stale according to documented dependencies; posting rejects stale versions.
- Prior-DUM reuse forces review of time-sensitive inputs and never copies official acceptance.
- Repeated extraction/application cannot duplicate articles, expenses or file routing.
- Tests cover inconsistent currencies/identifiers, amended invoices, ambiguous routing, provider failure and unauthorized approval.
```

### DF02 — Contract-aware delay exposure

```text
Build a contract-aware logistics cost/exposure engine for Dossier Clair. Reuse current transport/finance services and keep one organization per deployment; no tenant IDs or workspace switching. Model terminal storage and equipment-related obligations separately where the actual shipment contract distinguishes them.

Store reviewed rate/free-time terms, units, currency, effective basis, event start/stop definitions and any documented overlap/exclusion rules. https://www.maersk.com/local-information/europe/morocco/import is an example, not a universal tariff. Compute explainable estimates and compare user-specified timing scenarios only when inputs support them. Missing terms, event times, forecasting assumptions and savings claims must remain “assumption to verify”; never substitute a generic rate or promise avoided costs.

Acceptance criteria:
- Each estimate exposes its contract version, event basis, calculations and missing inputs.
- Delivery and empty return close only their configured obligations.
- Overlapping charges are not double-counted when the reviewed contract defines combination/exclusion rules.
- Scenario changes do not mutate actual transport events or posted invoices.
- Revised terms/events visibly supersede estimates without rewriting approved history.
- Tests cover boundaries, time zones, tier changes, missing terms, late evidence and conflicting events using synthetic contracts.
```

### DF03 — Production-to-RED evidence

```text
Implement production-to-customs reconciliation for Dossier Clair. Inspect the existing RED ledger and any documented production/ERP exports. Maintain one organization per deployment without tenant IDs or workspace switching. Connect imported lots, actual material movements, production batches, applicable BOM versions and proposed discharge evidence.

Represent legitimate exceptions such as returns, wastage or subcontracting only when reviewed business/legal specifications define their treatment. Do not invent permitted discharge routes, yields or conversion coefficients; unknown treatment is “assumption to verify.” Distinguish operational production quantities from approved customs postings. Provide a reviewer with explainable differences and an exportable source-to-decision evidence pack.

Acceptance criteria:
- Material quantities reconcile by unit across the supported movement chain; unexplained differences are explicit.
- Actual production input cannot overwrite a customs ledger entry directly.
- Each proposed adjustment identifies its evidence, applicable rule/BOM version and reviewer.
- Historical consumption is reproducible after later BOM or production amendments.
- Evidence exports include source identifiers, approvals, calculation versions and unresolved exceptions without claiming official certification.
- Tests cover partial production, unit mismatch, documented exceptions, duplicate ERP events and amended source records.
```

### DF04 — Rule-change impact review

```text
Build a reviewed rule register and change-impact workflow for Dossier Clair. Reuse current dossier/obligation services. Keep a single-tenant deployment: no tenant IDs or workspace switching. Store rule provenance, authoritative source URL/document, jurisdiction/regime applicability, effective dates, reviewer and supersession history.

A qualified authorized reviewer must approve rule applicability before operational use. Identify potentially affected open cases when an approved rule changes; show which calculations or approvals need reconsideration. Discovery of a new document is not approval of its legal meaning. Unresolved interpretation and current RED legal details remain “assumption to verify.” Do not silently scrape-and-activate law or rewrite historical approved cases.

Acceptance criteria:
- Draft, reviewed, active and superseded rule states have clear permissions and audit history.
- Proposed impacts link to case inputs and show why each case may be affected.
- Unsupported applicability remains unresolved instead of producing a confident compliance label.
- Historical outputs can be reproduced using their original rule versions.
- Re-review changes only approved affected records and preserves the previous result and reason.
- Tests cover effective-date boundaries, supersession, ambiguous applicability, rejected changes and unauthorized activation.
```

### DF05 — Grounded advisory and scans

```text
Implement grounded advisory for Dossier Clair on top of existing deterministic business services. Single tenant only: no tenant IDs or workspace switching; do not pool customer documents or feedback across deployments. Provide permission-scoped knowledge retrieval, business-data questions, conversation history, clearance option comparison, manual/scheduled scans and reviewer feedback.

Answers cite accessible source passages/records, distinguish effective versus superseded material and admit insufficient evidence. Allocation arithmetic must come from the tested ledger engine. The agent proposes next actions but has no direct payment, official-submission, guarantee-release or ledger authority. Approved actions must use existing services with version-bound human review. Provider configuration, retention, scan timing and success targets are “assumption to verify” until approved.

Acceptance criteria:
- Retrieval and cached outputs cannot expose inaccessible/deleted documents or another client's records.
- Recommendations explain eligibility, missing inputs and alternatives without fabricated legal certainty.
- Model output cannot bypass approvals; changed inputs invalidate stale proposals before execution.
- Scheduled/manual retries do not duplicate proposals or business effects; failures and skipped work are visible.
- Feedback remains owned by the deployment and is never silently used for external training.
- Tests cover prompt injection, missing evidence, stale approval, provider outage and duplicate jobs.
```

### DF06 — Supported API and adapters

```text
Build a limited documented API and approved adapters for Dossier Clair. Inspect current services and actual partner specifications first. Keep one organization per deployment; no tenant IDs, tenant provisioning or workspace switching. Expose verified business operations with the same permissions and approval rules as the UI.

Version schemas, pagination, errors and idempotent mutation contracts. Add selected ERP/accounting or official-system adapters only when access, credentials, formats and acknowledgement behavior are documented and authorized. Otherwise deliver a clearly marked test adapter and report “assumption to verify.” Do not automate around MFA, share external accounts, invent BADR/PortNet APIs or execute payments. Preserve raw external references and separate imported observations from accepted local business changes.

Acceptance criteria:
- Every endpoint has schema documentation and permission/ownership tests.
- Mutations reuse existing validated business services and cannot bypass human approval.
- Retry, pagination and concurrent changes have deterministic tested behavior.
- Each live adapter identifies its documented contract and supported operations; unavailable access is visible.
- External acknowledgements carry provenance and cannot be fabricated by a local success response.
- Contract tests cover schema drift, partial failures, duplicate events, reconciliation and revocation.
```

### PL01 — Fast, accessible field UX

```text
Improve Dossier Clair's staff/client usability without changing business rules. Inspect the existing interface and preserve one organization per deployment: no tenant IDs or workspace switching. Build accessible task-focused views, keyboard navigation, saved filters, responsive uploads and concise blocker/action summaries.

Validate language/device needs before expanding localization; French/Arabic requirements and field connectivity are “assumption to verify.” If approved, support proper language formatting and RTL where relevant. Implement offline drafts only for approved capture use cases, such as notes or queued uploads. Do not allow offline final declaration approval, ledger posting, guarantee release or financial authorization. Local sensitive-data storage must follow explicit security/retention policy.

Acceptance criteria:
- Core task flows work with keyboard, visible focus, labels and clear error recovery.
- Small-screen users can see the next action, owner and evidence without losing essential context.
- Saved filters preserve authorization and behave consistently across reloads.
- Offline drafts show pending/conflict states, synchronize idempotently and recheck permissions/current versions.
- Logout/revocation handles local cached material according to policy; shared-device behavior is tested.
- Tests cover interruption, duplicate synchronization, stale drafts, RTL if enabled and accessible validation.
```

### PL02 — Credible launch and operations

```text
Prepare Dossier Clair for a credible launch using actual implemented capabilities. Reuse the repository stack and preserve one operating organization per deployment: no tenant IDs, tenant provisioning or workspace switching. Implement accurate public journeys, configured login links, module/service comparison, demo/contact requests, documentation and operational outcome reports.

Create clearly synthetic demo cases that demonstrate blocker resolution and evidence reconciliation. Package supported deployment/license configuration, monitoring, isolated restoration, support ownership and complete exit exports. Show installation/provider usage transparently without fabricated prices, “unlimited” promises or token-led sales tiers. Hosting, privacy and AI-destination claims require actual evidence; support targets, pricing and performance goals remain “assumption to verify” until approved. Do not send real prospect messages or publish/deploy without the task's authorization.

Acceptance criteria:
- Public claims, screenshots and module availability match implemented behavior; no broken navigation or template debris.
- Request forms validate, preserve intended scope and use a test delivery adapter in verification.
- Outcome reports define denominators and separate observed results from estimates; no invented ROI.
- Deployment and isolated restore instructions are exercised for supported environments, including document/database consistency.
- License/usage failures follow documented behavior and do not silently destroy or trap customer data.
- Document release checks, unresolved assumptions, support boundaries and tested exit-export completeness.
```
