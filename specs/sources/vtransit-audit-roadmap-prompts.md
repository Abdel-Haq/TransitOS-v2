# vTransit: feature inventory, phased roadmap, and coding prompts

Audit date: 11 September 2026. Scope: publicly discoverable pages of [vtransit.ma](https://vtransit.ma/), navigation menus, footer destinations, interactive marketing states, documentation, pricing, subscription forms, and discovered public authentication pages.

The project remains **single tenant: one organization per deployment**. Multiple staff users and restricted external client accounts are compatible with that architecture. Product selection on the marketing site is a commercial choice. It must not become tenant selection, tenant IDs, or workspace switching.

## 1. Evidence and limitations

- **Confirmed — UI:** a control or navigation behavior was observed directly. This confirms its public presentation, not successful backend execution.
- **Confirmed — advertised:** the site explicitly describes the capability. Runtime implementation is **not visible** unless stated otherwise.
- **Confirmed — preview:** a capability or control appears in a marketing illustration or application screenshot. Its runtime behavior is **not visible**.
- **Inferred:** a possible behavior suggested by labels or context, without an explicit description or verified workflow.
- **Not visible:** the source does not establish the answer. This does not mean the capability is absent.

No account was created, no demo/subscription/recovery form was submitted, and no credentials were entered. Authenticated workflows, database schemas, backend rules, live integrations, and source-code completeness are **not visible**. Public screenshots contain illustrative records and metrics; these are not production totals, performance guarantees, or default configuration values.

No existing implementation or prior “complete/partial/new” feature matrix was supplied. Consequently, the roadmap uses **partial-evidence completion candidates**, not verified implementation defects. The coding agent must inspect the repository before deciding what already works. “New” is reserved for explicitly future functionality or clearly labeled proposals.

### Pages and states reviewed

| URL / surface | Coverage and result |
|---|---|
| [Home](https://vtransit.ma/) | Full page, Products/Solutions/Resources menus, product links, contact links, footer, WhatsApp destination. |
| [Transit](https://vtransit.ma/transit) | Full page; all seven cycle states; AI, transport, monitoring, security, and pricing sections. |
| [RED](https://vtransit.ma/red) | Full page; Dashboard, Dossier RED, Agent d’apurement, and Assistant IA preview tabs; animated clearance illustration; pricing. |
| [Pricing](https://vtransit.ma/tarifs) | Both product selections, return-to-selection control, every displayed plan, FAQ and subscription destinations. |
| [Documentation](https://vtransit.ma/documentation) | Getting started, concepts, Transit, RED, AI, security, integrations. These are sections of one page, not separate technical manuals. |
| [FAQ](https://vtransit.ma/faq) | All eleven questions expanded and read. |
| [About](https://vtransit.ma/a-propos) | Mission, product positioning, human control, data hosting claims, contact. |
| [Demo/contact](https://vtransit.ma/demo) | Name, company, professional email, phone, submit control and contact-consent text; no submission. |
| [Subscription](https://vtransit.ma/inscription) | Default Starter state, name/company/email fields, grouped plan selector and submit control. |
| [Standard](https://vtransit.ma/inscription?plan=standard), [Intelligence](https://vtransit.ma/inscription?plan=intelligence), [Transit on-premise](https://vtransit.ma/inscription?plan=transit-onpremise) | Each URL opened; corresponding product and plan were selected correctly. |
| [Starter](https://vtransit.ma/inscription?plan=starter), [Pro](https://vtransit.ma/inscription?plan=pro), [Entreprise](https://vtransit.ma/inscription?plan=enterprise), [RED on-premise](https://vtransit.ma/inscription?plan=on_premise) | Each URL opened; corresponding product and plan were selected correctly. |
| [Security footer destination](https://vtransit.ma/transit#securite) | Section of Transit, not an independent security page. CNDP footer link opens email, not a privacy policy. |
| [Application entry](https://app.vtransit.ma/) | Address shown in RED preview; visiting it redirects to the client login below. The public entry does not establish which RED version is behind it. |
| [Client login](https://app.vtransit.ma/authentication/login), [recovery](https://app.vtransit.ma/authentication/forgot_password) | Email/password, remember-me, recovery email form. Recovery account menu also inspected. |
| [Staff login](https://dynamic.vtransit.ma/admin/authentication), [staff recovery](https://dynamic.vtransit.ma/admin/authentication/forgot_password) | Search-discovered public pages; login and recovery controls inspected. Staff/admin role interpretation is inferred from the route. |
| [Second client login](https://dynamic.vtransit.ma/authentication/login), [recovery](https://dynamic.vtransit.ma/authentication/forgot_password) | Reached through the staff page’s home link; same client-facing login/recovery pattern. |
| [Main account](https://app.vtransit.ma/clients/profile), [company](https://app.vtransit.ma/clients/company), [announcements](https://app.vtransit.ma/clients/announcements) | Each redirects to login; content **not visible**. |
| [Second account](https://dynamic.vtransit.ma/clients/profile), [company](https://dynamic.vtransit.ma/clients/company), [announcements](https://dynamic.vtransit.ma/clients/announcements) | Each redirects to login; content **not visible**. |
| [robots.txt](https://vtransit.ma/robots.txt), [sitemap.xml](https://vtransit.ma/sitemap.xml) | Both returned a page-not-found document when fetched; no additional route inventory obtained. |

Products menu destinations are `/transit#cycle`, `#ia`, `#transport`, `#pilotage`, `#securite`, and `/red#fonctionnalites`, `#agent`, `#apercu`, `#ia`, plus pricing. Solutions links reuse these product sections. Resources links lead to documentation, FAQ, About, and security. The footer address link is a same-page `#` link, not a map. Email, telephone and WhatsApp links are contact channels; they do not prove an in-product messaging integration. [Navigation evidence](https://vtransit.ma/)

Recovery-page accessibility content also exposes leftover template profile/messages/activities/tasks links. All four paths below returned 404 on both `app.vtransit.ma` and `dynamic.vtransit.ma`. They are **not evidence of real messaging or task-management features**:

| Template destination | app host | dynamic host |
|---|---|---|
| Personal information | [404](https://app.vtransit.ma/metronic/demo7/custom/apps/user/profile-1/personal-information.html) | [404](https://dynamic.vtransit.ma/metronic/demo7/custom/apps/user/profile-1/personal-information.html) |
| Messages | [404](https://app.vtransit.ma/metronic/demo7/custom/apps/user/profile-3.html) | [404](https://dynamic.vtransit.ma/metronic/demo7/custom/apps/user/profile-3.html) |
| Activities | [404](https://app.vtransit.ma/metronic/demo7/custom/apps/user/profile-2.html) | [404](https://dynamic.vtransit.ma/metronic/demo7/custom/apps/user/profile-2.html) |
| Tasks | [404](https://app.vtransit.ma/metronic/demo7/custom/apps/userprofile-1/overview.html) | [404](https://dynamic.vtransit.ma/metronic/demo7/custom/apps/userprofile-1/overview.html) |

This covers all unique public content destinations discovered through the reviewed navigation and related screens. It cannot establish “every page” behind authentication, undisclosed subdomains, or unlinked routes. Those remain **not visible**.

## 2. Feature inventory

Role names explicitly present on the site include **déclarant, agent, comptabilité, client externe**, and a **direction** audience in Solutions. RED screenshots show **Admin**. RED’s importers, exporters, textile processors and bonded-warehouse operators are business audiences, not a verified permission matrix. Where a role below is proposed from context it is labeled **inferred**. Unspecified field rules, limits, permissions, formulas and persistence behavior are **not visible**.

### Public website, access and onboarding

| ID | Feature | Category | What it does | User roles | Business rules / unknowns | Status | Evidence |
|---|---|---|---|---|---|---|---|
| W01 | Product discovery | Website | Separates Transit cabinet operations from RED economic-regime operations. | Public visitor | Two advertised products; no shared-login or shared-data rule established. | Confirmed — UI | [Home](https://vtransit.ma/) |
| W02 | Product and role navigation | Website | Menus link to features and role-oriented sections. | Visitor; déclarant, direction, accounting audiences | Role links navigate to public sections; they do not authenticate or assign roles. | Confirmed — UI | [Navigation](https://vtransit.ma/) |
| W03 | Interactive product previews | Website | Switches Transit cycle content and RED screenshots. | Visitor | Marketing demonstrations; operational actions inside screenshots are not executable workflows here. | Confirmed — UI | [Transit cycle](https://vtransit.ma/transit#cycle), [RED previews](https://vtransit.ma/red#apercu) |
| W04 | Product/plan comparison | Commercial | Displays plans after choosing a product. | Prospect | All prices on quotation; plan details below. | Confirmed — UI | [Pricing](https://vtransit.ma/tarifs) |
| W05 | Demo/contact request | Acquisition | Collects name, company, professional email and phone for follow-up. | Prospect; receiving staff role **not visible** | Advertises a 45-minute demo and consent to be contacted. Scheduling backend and delivery **not visible**. | Confirmed — UI | [Demo](https://vtransit.ma/demo) |
| W06 | Subscription request and plan preselection | Acquisition | Collects name, company, email, desired plan; URL selects the plan. | Prospect | Seven observed plan values; default RED Starter; request form, with no payment/password field observed. Backend activation **not visible**. | Confirmed — UI | [Subscription](https://vtransit.ma/inscription), [Standard example](https://vtransit.ma/inscription?plan=standard) |
| W07 | Assisted activation | Onboarding | Team provisions access and supplies credentials after a request. | Prospect; provisioning operator **inferred** | FAQ says dedicated subdomain, within 24 working hours, without commitment. Operational process and cancellation procedure **not visible**. | Confirmed — advertised | [FAQ](https://vtransit.ma/faq) |
| W08 | Contact channels | Support | Email, telephone, WhatsApp contact links. | Visitor | Sending a message is separate from navigation; response guarantees **not visible** beyond FAQ wording. | Confirmed — UI | [Home/footer](https://vtransit.ma/), [Demo](https://vtransit.ma/demo) |
| W09 | Documentation and glossary | Help | Explains dossier, regime, DUM, ventilation, apurement, BOM, guarantee and setup. | Déclarants, management and IT audiences | Detailed schemas, API reference, import templates and version history **not visible**. | Confirmed — UI | [Documentation](https://vtransit.ma/documentation) |
| W10 | FAQ | Help | Expandable explanations of product, AI, hosting and subscription. | Visitor / customer | Human declarant validation explicitly mandatory. | Confirmed — UI | [FAQ](https://vtransit.ma/faq) |
| A01 | Client login | Authentication | Email/password form and sign-in button. | Client | Credential policies, session duration, MFA and successful sign-in **not visible**. | Confirmed — UI | [app login](https://app.vtransit.ma/authentication/login), [dynamic login](https://dynamic.vtransit.ma/authentication/login) |
| A02 | Staff/admin login | Authentication | Separate public authentication screen. | Staff/admin **inferred** | Separation of permissions and successful sign-in **not visible**. | Confirmed — UI; role inferred | [Staff login](https://dynamic.vtransit.ma/admin/authentication) |
| A03 | Remember me | Authentication | Checkbox on login forms. | Login user | Persistence duration and revocation rules **not visible**. | Confirmed — UI | [Client login](https://app.vtransit.ma/authentication/login), [staff login](https://dynamic.vtransit.ma/admin/authentication) |
| A04 | Password recovery | Authentication | Email entry and submit/confirm controls. | Account holder | Delivery, token expiry, reuse prevention and reset-completion screen **not visible**. | Confirmed — UI | [Client recovery](https://app.vtransit.ma/authentication/forgot_password), [staff recovery](https://dynamic.vtransit.ma/admin/authentication/forgot_password) |
| A05 | Profile, company and announcements navigation | Client account | Menu offers account, company information and announcements. | Client **inferred** | Destinations redirect unauthenticated users to login; fields, editing and announcement delivery **not visible**. | Confirmed — UI links; functionality inferred | [Recovery menu](https://app.vtransit.ma/authentication/forgot_password), [account](https://app.vtransit.ma/clients/profile), [company](https://app.vtransit.ma/clients/company), [announcements](https://app.vtransit.ma/clients/announcements) |
| A06 | Sign out | Authentication | Logout link appears in the client account menu and RED screenshot. | Account holder | Actual invalidation behavior **not visible**. | Confirmed — UI/preview | [Recovery menu](https://app.vtransit.ma/authentication/forgot_password), [RED preview](https://vtransit.ma/red#apercu) |
| A07 | Role-based permissions | Authorization | Restricts what users can see. | Déclarant, agent, accounting, external client | Fine-grained permission claim; action-by-role matrix **not visible**. | Confirmed — advertised | [Security](https://vtransit.ma/transit#securite) |
| A08 | Google/Microsoft SSO | Authentication | Enterprise plan advertises identity-provider sign-in. | RED Entreprise users | Provider configuration, protocols, role mapping and login buttons **not visible**. | Confirmed — advertised | [RED pricing](https://vtransit.ma/tarifs) |

### Transit operations, documents and AI

| ID | Feature | Category | What it does | User roles | Business rules / unknowns | Status | Evidence |
|---|---|---|---|---|---|---|---|
| T01 | Seven-stage dossier lifecycle | Customs operations | Reception → declaration → DUM → formalities/liquidation → logistics/release → GED → expenses/billing. | Déclarant; agent | One dossier timeline. Transition prerequisites, reopening and cancellation **not visible**. | Confirmed — advertised/preview | [Cycle](https://vtransit.ma/transit#cycle) |
| T02 | Email-based intake | Intake | Receives pieces, preclassifies them with AI and initializes the timeline. | Agent **inferred** | Sender routing, ambiguous matches and supported mail providers **not visible**. | Confirmed — advertised/preview | [Cycle, Reception](https://vtransit.ma/transit#cycle) |
| T03 | Dossier identity and shipment metadata | Data capture | Preview includes client, customs office, regime, operation type, bill of lading, vessel and expected date. | Agent / déclarant **inferred** | Required fields, numbering and uniqueness **not visible**. | Confirmed — preview | [Reception](https://vtransit.ma/transit#cycle) |
| T04 | Article ventilation and declaration preparation | Declaration | Captures article descriptions, SH codes, regime, value and currency with line review. | Déclarant | Docs describe ten-digit Moroccan SH codes; code-validity reference and valuation rules **not visible**. | Confirmed — advertised/preview | [Cycle](https://vtransit.ma/transit#cycle), [Concepts](https://vtransit.ma/documentation#concepts) |
| T05 | DUM document checklist | Customs documents | Brings together invoice, packing list, bill of lading, origin certificate and import undertaking. | Déclarant **inferred** | Preview marks documents validated or awaiting signature; no electronic-signature workflow established. | Confirmed — preview | [Cycle, DUM](https://vtransit.ma/transit#cycle) |
| T06 | Customs value and duty/tax estimate | Customs calculation | Preview shows FOB, freight, insurance, CIF and estimated duties/taxes. | Déclarant **inferred** | Actual rates, FX source, rounding and calculation engine **not visible**. | Confirmed — advertised/preview | [Cycle, DUM](https://vtransit.ma/transit#cycle) |
| T07 | Formality milestones | Customs operations | Tracks registration, physical inspection, liquidation, release authorization and warehouse exit. | Agent / déclarant **inferred** | Actor and timestamps displayed; ordering/approval constraints **not visible**. | Confirmed — advertised/preview | [Formalities](https://vtransit.ma/transit#cycle) |
| T08 | Shipment release and delay exposure | Logistics | Displays container, weight, volume, mode, aging and storage/demurrage exposure. | Operations user **inferred** | Advertised 24h/48h thresholds; actual charge tariffs and timer start/reset rules **not visible**. | Confirmed — advertised/preview | [Logistics](https://vtransit.ma/transit#cycle) |
| T09 | Dossier document library | GED | Centralizes files and document statuses. | Authorized dossier users **inferred** | Versioning, retention, file limits and signature capture **not visible**. | Confirmed — advertised/preview | [GED](https://vtransit.ma/transit#cycle) |
| T10 | Attachment deduplication | GED | Identifies repeated files using a cryptographic fingerprint. | Authorized dossier users **inferred** | Described scope is within a dossier; algorithm **not visible**. Preview shows a flagged duplicate, not proof of physical removal. | Confirmed — advertised/preview | [AI](https://vtransit.ma/transit#ia), [GED](https://vtransit.ma/transit#cycle) |
| T11 | Commercial invoice extraction | AI extraction | Extracts header, lines, amounts and currency from PDF/image to prefill declarations. | Déclarant validates | Human review required; provider, limits and measured accuracy **not visible**. | Confirmed — advertised | [AI](https://vtransit.ma/transit#ia), [FAQ](https://vtransit.ma/faq) |
| T12 | Import undertaking extraction | AI extraction | Extracts number, bank, dates, currency and FOB value from OC form. | Déclarant validates | Must pass review; validation against external systems **not visible**. | Confirmed — advertised | [AI](https://vtransit.ma/transit#ia) |
| T13 | Prior DUM reuse | AI extraction | Reads a previous DUM to prefill a new dossier. | Déclarant validates | Rules for carrying forward versus refreshing fields **not visible**. | Confirmed — advertised | [AI](https://vtransit.ma/transit#ia) |
| T14 | Reviewed article import and SH warnings | AI-assisted declaration | Moves extracted invoice rows into dossier ventilation; shows confidence and SH warnings. | Déclarant | Review is mandatory before applying; confidence thresholds **not visible**. | Confirmed — advertised/preview | [AI](https://vtransit.ma/transit#ia) |
| T15 | Expense request from supplier document | AI / expenses | Reads a provider invoice and suggests an expense category. | Accounting / expense reviewer **inferred** | User validation described; approval levels and payment execution **not visible**. | Confirmed — advertised | [AI](https://vtransit.ma/transit#ia) |
| T16 | Incoming email classification | AI / communication | Associates messages with dossier or client context. | Operations user **inferred** | Confidence, reassignment, mailbox permissions and retention **not visible**. | Confirmed — advertised | [AI](https://vtransit.ma/transit#ia) |
| T17 | Business-data assistant | AI analytics | Answers natural-language questions about business data. | Authorized users | Advertised to respect roles and regimes; supported queries and write capabilities **not visible**. | Confirmed — advertised | [AI](https://vtransit.ma/transit#ia) |

### Transit transport, finance and collaboration

| ID | Feature | Category | What it does | User roles | Business rules / unknowns | Status | Evidence |
|---|---|---|---|---|---|---|---|
| T18 | Delivery orders | Transport | Creates orders from a dossier or independently, covering container/groupage/air/export operations. | Transport planner **inferred** | Inherits priority, route, storage, weight and volume when linked to a dossier. | Confirmed — advertised | [Transport](https://vtransit.ma/transit#transport) |
| T19 | Internal/external missions | Transport | Builds missions from available orders, records pickup/arrival/delivery timestamps. | Dispatcher / driver **inferred** | Assignment, partial delivery, proof of delivery and external-provider terms **not visible**. | Confirmed — advertised/preview | [Transport](https://vtransit.ma/transit#transport) |
| T20 | Fleet, assignments and immobilization | Fleet | Tracks trucks, statuses, assignments, history and immobilization alerts/confirmation/marking. | Fleet operator **inferred** | Maintenance schedules, GPS and dispatch conflict rules **not visible**. | Confirmed — advertised | [Transport](https://vtransit.ma/transit#transport) |
| T21 | Transport statistics | Reporting | Reports activity by truck, driver and client. | Management **inferred** | Metric definitions and export formats **not visible**. | Confirmed — advertised | [Transport](https://vtransit.ma/transit#transport) |
| T22 | Expenses, disbursements and pre-invoicing | Finance | Selects fees, disbursements and costs for customer billing. | Accounting | Documents describe aggregation of honoraria and disbursements; taxation, locking and invoice posting **not visible**. | Confirmed — advertised/preview | [Fees](https://vtransit.ma/transit#cycle), [Docs](https://vtransit.ma/documentation#transit) |
| T23 | Customer invoicing | Finance | Advertises billing tied to dossiers and client visibility. | Accounting; external client sees own billing | Numbering, credit notes, tax handling and final issuance workflow **not visible**. | Confirmed — advertised | [Transit](https://vtransit.ma/transit), [Client access](https://vtransit.ma/transit#pilotage) |
| T24 | Receivables indicators | Finance reporting | Hero preview displays overdue/unpaid invoices and unallocated payments. | Accounting / management **inferred** | Aging calculation and allocation workflow **not visible**; preview values are examples. | Confirmed — preview | [Transit hero](https://vtransit.ma/transit) |
| T25 | Sales, purchases, customer payments and data areas | Business modules | Module labels appear in the hero preview. | **not visible** | Full sales/purchasing/payment-entry/master-data behavior cannot be inferred from labels alone. | Inferred | [Transit hero](https://vtransit.ma/transit) |
| T26 | Dossier and margin dashboard | Monitoring | Displays open dossiers, logistics, anomalies and cumulative margin. | Direction audience | Margin formula, costs included and currencies **not visible**. | Confirmed — advertised/preview | [Monitoring](https://vtransit.ma/transit#pilotage) |
| T27 | Operational filters | Monitoring | Filters dossiers by status, client, office, urgency and operation type. | Operations / direction **inferred** | Filter combinations, saved views and export **not visible**. | Confirmed — advertised | [Monitoring](https://vtransit.ma/transit#pilotage) |
| T28 | Aging and blocked/unpaid alerts | Monitoring | Highlights logistics age, blocked dossiers and overdue invoices; preview shows severity. | Operations / accounting **inferred** | 24h/48h logistics thresholds advertised; other severity thresholds and delivery channels **not visible**. | Confirmed — advertised/preview | [Monitoring](https://vtransit.ma/transit#pilotage), [hero](https://vtransit.ma/transit) |
| T29 | Average time by status | Reporting | Hero preview compares elapsed processing times by status. | Direction **inferred** | Calendar versus working time and aggregation method **not visible**. | Confirmed — preview | [Transit hero](https://vtransit.ma/transit) |
| T30 | Anomalies and disputes | Collaboration | Dedicated count and per-dossier journal. | Dossier users **inferred** | Ownership, resolution states and escalation **not visible**. | Confirmed — advertised | [Monitoring](https://vtransit.ma/transit#pilotage) |
| T31 | External client access | Client portal | Lets clients follow their dossiers, billing and notifications. | External client | Own-client restriction is strongly implied by wording; actual permission enforcement **not visible**. | Confirmed — advertised; restriction inferred | [Client access](https://vtransit.ma/transit#pilotage) |

### RED operations and intelligence

| ID | Feature | Category | What it does | User roles | Business rules / unknowns | Status | Evidence |
|---|---|---|---|---|---|---|---|
| R01 | Economic-regime projects | RED core | Manages projects identified as AT, EF, IT, MA and IM. | RED operator audience; Admin shown | Labels confirmed; precise definitions and per-regime lifecycle rules **not visible**. Screenshots also use ATPA; do not assume equivalence. | Confirmed — advertised/preview | [RED modules](https://vtransit.ma/red#modules), [preview](https://vtransit.ma/red#apercu) |
| R02 | Import/export DUM flows | RED core | Records customs entry and exit flows associated with dossiers. | RED operator **inferred** | Multi-article imports shown; field schema and mutation rules **not visible**. | Confirmed — advertised/preview | [RED modules](https://vtransit.ma/red#modules), [Dossier preview](https://vtransit.ma/red#apercu) |
| R03 | Manual and automatic clearance controls | Apurement | Dossier screenshot offers manual clearance and auto-clearance actions. | Admin shown; authorized operator **inferred** | Manual allocation procedure and write approval **not visible**. | Confirmed — preview | [Dossier RED](https://vtransit.ma/red#apercu) |
| R04 | FIFO/LIFO matching | Apurement | Matches export discharge quantities to import lots. | RED operator / declarant reviewer | FIFO/LIFO explicitly advertised; eligibility, ordering ties, rounding and concurrency rules **not visible**. Human validation required by docs. | Confirmed — advertised | [Features](https://vtransit.ma/red#fonctionnalites), [Docs](https://vtransit.ma/documentation#ia) |
| R05 | Discharges and accounting clearance | RED ledger | Tracks discharge events and their history. | RED operator **inferred** | Reversal, adjustments and posting controls **not visible**. | Confirmed — advertised/preview | [Modules](https://vtransit.ma/red#modules), [Dossier](https://vtransit.ma/red#apercu) |
| R06 | Remaining stock, clearance rate and compliance status | RED monitoring | Shows current stock, cleared proportion, deadline and regulatory status. | Admin shown | Formulas and authority of the displayed compliance assessment **not visible**. | Confirmed — preview | [Dossier](https://vtransit.ma/red#apercu) |
| R07 | BOM composition | Manufacturing / RED | Maps finished products to consumed materials for calculated discharges. | Textile processors; operator **inferred** | Composition-based calculation advertised; versioning, scrap, unit conversion and yield rules **not visible**. | Confirmed — advertised | [Features](https://vtransit.ma/red#fonctionnalites) |
| R08 | Missing-BOM recommendation | RED validation | Dossier screenshot warns that an export lacks BOM and links to configuration. | Admin shown | Detection shown; whether it blocks posting **not visible**. | Confirmed — preview | [Dossier](https://vtransit.ma/red#apercu) |
| R09 | Statutory deadline alerts | Compliance monitoring | Graduates info, warning and critical alerts. | RED operator audience | Site cites 12–24 months depending on regime; exact legal mapping, extensions and alert thresholds **not visible**. This is a site claim, not verified legal advice. | Confirmed — advertised | [Features](https://vtransit.ma/red#fonctionnalites) |
| R10 | Bank guarantees | Guarantees | Tracks AT-linked guarantees from deposit to release. | RED operator; finance role **inferred** | Allocation, partial release, expiry and bank-confirmation rules **not visible**. | Confirmed — advertised | [Features](https://vtransit.ma/red#fonctionnalites) |
| R11 | Customs statement reconciliation | Integration | Imports customs statements and compares them with local flows. | RED operator **inferred** | Matching keys, file formats and discrepancy-resolution rules **not visible**. | Confirmed — advertised | [Features](https://vtransit.ma/red#fonctionnalites) |
| R12 | Journal and sommier A.T. | Compliance ledger | Advertises an AT register/journal. | Operator / auditor **inferred** | Required columns, immutable history and official export format **not visible**. | Confirmed — advertised | [Modules](https://vtransit.ma/red#modules) |
| R13 | Audit and conformity reports | Reporting | Advertises traceability and compliance reports. | Auditor / management **inferred** | Actual audit trail schema, report definitions and certification **not visible**. | Confirmed — advertised | [Modules](https://vtransit.ma/red#modules) |
| R14 | RED dashboard | Monitoring | Displays active dossiers, customs value, clearance rate, critical alerts, monthly discharges, upcoming/overdue deadlines, activity and active regimes. | Admin shown | Screenshot includes less-than-7-day and less-than-30-day buckets; these do not establish configurable defaults or statutory deadlines. | Confirmed — preview | [Dashboard](https://vtransit.ma/red#apercu) |
| R15 | Setup checklist | Onboarding | Screenshot lists client, customs office, first RED dossier and first import DUM setup. | Admin shown | Four checklist steps visible; automatic completion logic **not visible**. | Confirmed — preview | [Dashboard](https://vtransit.ma/red#apercu) |
| R16 | Client and reference-data modules | Master data | Sidebar and checklist expose Clients, Référentiels, and customs-office setup. | Admin shown | CRUD behavior, imports, deduplication and field rules **not visible**. | Confirmed — preview; management behavior inferred | [Dashboard](https://vtransit.ma/red#apercu) |
| R17 | Global search | Navigation | Search field suggests dossiers, DUMs and clients. | Admin shown | Search behavior, ranking and permission scoping **not visible**. | Confirmed — preview; behavior inferred | [Previews](https://vtransit.ma/red#apercu) |
| R18 | Balance export and discharge sheet | Reporting | Dossier screenshot offers balance export, discharge sheet and history document controls. | Admin shown | File formats and contents **not visible**. | Confirmed — preview | [Dossier](https://vtransit.ma/red#apercu) |
| R19 | Document knowledge base and semantic retrieval | Knowledge / RAG | Indexes regulations, circulars and contracts for contextual retrieval. | Authorized RED user **inferred** | pgvector named in marketing text; deployed architecture, supported formats and indexing limits beyond plans **not visible**. | Confirmed — advertised | [RED AI](https://vtransit.ma/red#ia) |
| R20 | Customs conversational assistant | AI | Answers using business documents and regulatory material. | RED operator audience | Human decision retained; source currency and response quality **not visible**. | Confirmed — advertised | [RED AI](https://vtransit.ma/red#ia), [FAQ](https://vtransit.ma/faq) |
| R21 | Conversation list and prompt shortcuts | AI interface | Screenshot shows saved conversations, new-conversation control and customs/SH/circular/DUM shortcuts. | Admin shown | Screenshot mentions 30-day conservation; actual retention policy and deletion behavior **not visible**. Provider badge is not a provider-selection contract. | Confirmed — preview | [Assistant screenshot](https://vtransit.ma/red#apercu) |
| R22 | Clearance advisor | Decision support | Recommends lot allocation/prioritization with regulatory justification. | RED operator / declarant reviewer | Human validation required; no verified autonomous customs filing. | Confirmed — advertised | [RED AI](https://vtransit.ma/red#ia), [Docs](https://vtransit.ma/documentation#ia) |
| R23 | Portfolio monitoring agent | AI agent | Scans lots, identifies critical deadlines, matches exports/imports and recommends allocations. | RED operator; Admin shown | Marketing says autonomous multi-step execution; docs require human approval and screenshot says advisory only. Execution boundary is ambiguous. | Confirmed — advertised/preview | [Agent](https://vtransit.ma/red#agent), [preview](https://vtransit.ma/red#apercu), [FAQ](https://vtransit.ma/faq) |
| R24 | Manual scans, scheduled scans and run history | AI operations | Screenshot shows scan/launch controls, next scan information and prior scans. | Admin shown | Schedule settings, retry policy and run limits **not visible**; screenshot schedule is not a product guarantee. | Confirmed — preview | [Agent screenshot](https://vtransit.ma/red#apercu) |
| R25 | Recommendation feedback and reuse | AI quality | Screenshot counts accepted/rejected/false-positive feedback and says prior rejections inform subsequent runs. | Admin shown | Counterexample selection, retention and model-training behavior **not visible**; do not infer fine-tuning. | Confirmed — preview | [Agent screenshot](https://vtransit.ma/red#apercu) |
| R26 | Profile and settings | Administration | Sidebar exposes profile/settings; agent text mentions a model configured in settings. | Admin shown | Settings fields, available models and permission rules **not visible**. | Confirmed — preview | [Agent screenshot](https://vtransit.ma/red#apercu) |

### Shared integration, hosting and commercial capabilities

| ID | Feature | Category | What it does | User roles | Business rules / unknowns | Status | Evidence |
|---|---|---|---|---|---|---|---|
| S01 | Data import onboarding | Migration | Docs describe importing clients, dossiers and invoices. | IT / operator **inferred** | File schemas, validation, migration tooling and rollback **not visible**. | Confirmed — advertised | [Getting started](https://vtransit.ma/documentation#demarrage) |
| S02 | PortNet/BADR file exchange | Integration | Imports/exports files and reconciles external exports with local flows. | Authorized operator **inferred** | No live direct connection established; formats and reconciliation rules **not visible**. | Confirmed — advertised | [Integrations](https://vtransit.ma/documentation#integrations) |
| S03 | Third-party API | Integration | Future API for third-party connections. | Integration developer **inferred** | Explicitly coming later; endpoints, authentication, release date and supported actions **not visible**. | Confirmed — advertised as future | [Integrations](https://vtransit.ma/documentation#integrations) |
| S04 | Encryption | Security | Advertises AES-256 storage encryption and TLS 1.3 transport encryption. | All authorized users | Key management, configuration evidence and true end-to-end encryption architecture **not visible**. | Confirmed — advertised | [Security](https://vtransit.ma/transit#securite) |
| S05 | Dedicated hosting and CNDP positioning | Hosting | Advertises dedicated infrastructure and compliance with Moroccan law 09-08. | Organization / IT | Hosting location, certification, subprocessors and legal substantiation **not visible**. | Confirmed — advertised | [Security](https://vtransit.ma/transit#securite), [FAQ](https://vtransit.ma/faq) |
| S06 | Encrypted backups and recovery plan | Reliability | Advertises automatic encrypted backups, tested restoration and documented recovery plan. | IT / operator **inferred** | Frequency, retention, RPO and RTO **not visible**. | Confirmed — advertised | [Security](https://vtransit.ma/transit#securite) |
| S07 | Hosting monitoring | Reliability | Advertises continuous hosting/monitoring. | IT / operator **inferred** | Alert routing, incidents and measured uptime **not visible**. | Confirmed — advertised | [Home](https://vtransit.ma/) |
| S08 | On-premise and signed license | Deployment | Offers installation on customer infrastructure and signed licensing. | Organization / IT | Installation requirements, license checks, offline behavior and upgrade rules **not visible**. | Confirmed — advertised | [Pricing](https://vtransit.ma/tarifs), [FAQ](https://vtransit.ma/faq) |
| S09 | Dedicated SLA, support and onboarding | Service | Enterprise/on-premise plans advertise dedicated support; RED Enterprise includes onboarding. | Customer organization | SLA metrics, response times, exclusions and contract terms **not visible**. | Confirmed — advertised | [Pricing](https://vtransit.ma/tarifs) |
| S10 | Plan capacities and AI allowance | Commercial configuration | Advertised feature bundles, user/project/document/storage/token allowances. | Customer organization | Displayed limits below; metering, overages, resets and enforcement **not visible**. | Confirmed — advertised | [Pricing](https://vtransit.ma/tarifs) |

### Pricing and numeric rules actually visible

Every displayed monetary price is **sur devis / quotation required**. Currency, billing interval, taxes, payment methods, discounts, trial length and overage charges are **not visible**. Do not substitute example invoice values for subscription prices. [Pricing](https://vtransit.ma/tarifs)

| Product / plan | Advertised inclusion | Users | Projects | Knowledge documents | AI tokens/month | Storage |
|---|---|---|---|---|---|---|
| Transit Standard | Dossier cycle, dashboards, GED, expenses/pre-invoicing, multiple users/roles; excludes AI | not visible | not visible | not visible | AI excluded | not visible |
| Transit Intelligence | Standard plus transport, extraction, reviewed article import, email classification/deduplication and business assistant | not visible | not visible | not visible | 1 M | not visible |
| Transit On-premise | Intelligence plus own infrastructure, signed license and dedicated SLA/support | not visible | not visible | not visible | Custom | not visible |
| RED Starter | Assistant, RAG and clearance advisor | 2 | 2 | 200 | 250 K | 1 Go |
| RED Pro | Starter capabilities plus agentic clearance | 5 | 50 | 2,000 | 1 M | 10 Go |
| RED Entreprise | Pro plus dedicated SLA/support, Google/Microsoft SSO and onboarding | Unlimited, advertised | Unlimited, advertised | Unlimited, advertised | Unlimited, advertised | Unlimited, advertised |
| RED On-premise | Advertises all Enterprise capabilities, own servers and signed license | Inherits Enterprise claim | Inherits Enterprise claim | Inherits Enterprise claim | Inherits Enterprise claim | Inherits Enterprise claim |

Source for all plan values: [interactive pricing](https://vtransit.ma/tarifs). “Unlimited” is commercial wording; contractual fair-use or technical boundaries are **not visible**. These values are evidence for comparison, not instructions to introduce a subscription system into the single-tenant application.

### Ambiguities that affect implementation

| Finding | Evidence | Consequence |
|---|---|---|
| Autonomy conflicts with mandatory human validation. | [RED agent](https://vtransit.ma/red#agent), [FAQ](https://vtransit.ma/faq), [Docs](https://vtransit.ma/documentation#ia), [advisory-only screenshot](https://vtransit.ma/red#apercu) | Implement analysis/proposals automatically; require authorized human approval for business mutations. |
| “All business functionality in Standard” conflicts with transport listed under Intelligence. | [Transit pricing](https://vtransit.ma/transit#tarifs), [Pricing](https://vtransit.ma/tarifs) | Resolve entitlement wording before adding feature gates. Do not silently remove transport from existing users. |
| Docs say Transit starts via demo, but Transit plan links open subscription requests. | [Pricing](https://vtransit.ma/tarifs), [Standard request](https://vtransit.ma/inscription?plan=standard) | Keep request routing coherent; do not invent automated checkout. |
| RED advertises a multi-tenant platform. | [RED modules](https://vtransit.ma/red#modules) | Out of scope for this project. Preserve one organization per deployment; no tenant IDs or workspace switcher. |
| Preview host opens a client login rather than establishing RED application identity. | [RED preview](https://vtransit.ma/red#apercu), [app login](https://app.vtransit.ma/authentication/login) | Treat screenshot features and login evidence separately; do not assume every host shares one application. |
| APIs are future, whereas file integration is described as current. | [Integrations](https://vtransit.ma/documentation#integrations) | Complete file workflows before designing an API; no invented PortNet/BADR endpoints. |
| Recovery templates expose broken/demo navigation. | [Recovery](https://app.vtransit.ma/authentication/forgot_password) and 404 links above | Remove template artifacts; do not add task management or inbox features based on them. |
| Encryption/hosting/compliance are claims without implementation evidence. | [Security](https://vtransit.ma/transit#securite) | Verify configuration and restore procedures. Do not claim certification or end-to-end encryption from TLS and disk encryption alone. |
| Several regulatory labels and timings are broad or inconsistent. | [RED](https://vtransit.ma/red), [Docs](https://vtransit.ma/documentation#red) | Require a versioned, reviewed rules source; do not hard-code legal periods from marketing. |

Features not established by this review include online payment/checkout, GPS tracking, mobile applications, OCR accuracy guarantees, electronic signatures, direct customs filing, complete ERP/accounting functionality, MFA, public API endpoints and authenticated workflow success. Their status is **not visible**, rather than “missing.”

## 3. Ordered roadmap

**P = partial evidence:** an advertised or previewed area to inspect and finish only where the repository reveals a gap. **N = new:** explicitly future functionality or a proposed addition. Existing complete behavior should be retained and verified, not rebuilt. Effort is a relative engineering estimate: **S** localized; **M** several connected components; **L** cross-module/data/integration work. Durations, staffing and costs are **not visible**.

Every phase preserves single-tenant storage, deployment and authorization. External client accounts receive access through business-record relationships and permissions inside the same organization. No tenant model, tenant ID, tenant provisioning system, or workspace switching is proposed.

| Phase | Goal | Exit condition |
|---|---|---|
| 0 — Establish truth and access | Reconcile public claims with code and define safe access. | Verified baseline, clear public routes, authentication and permission matrix. |
| 1 — Complete Transit execution | Make the dossier-to-delivery-to-billing path coherent. | Authorized users can process a reviewed dossier end to end, with auditable calculations and client visibility. |
| 2 — Complete deterministic RED operations | Make stock, clearance and deadlines reliable before AI orchestration. | Reviewed lot allocation, BOM use, guarantees and reconciliation preserve ledger invariants. |
| 3 — Add grounded assistance | Provide useful recommendations with controlled approval. | Answers cite accessible sources; agents cannot silently mutate customs records. |
| 4 — Operate and integrate | Verify deployability, reliability and documented interfaces. | Restore evidence and operational controls exist; API work follows an approved contract. |

| Order / item | Phase; type | Goal and scope | Affected modules / inventory | Effort | Dependencies | Principal risks |
|---|---|---|---|---|---|---|
| RM01 — Verified baseline and public journeys | 0; P + N proposal | Map existing code to evidence; correct contradictory copy, broken template links and access guidance; verify demo/subscription request handling; add public route inventory if absent. | Website, docs, lead requests, route metadata; W01–W10, S10 | M | None | Wrong product routing, duplicate requests, inaccurate commercial promises. |
| RM02 — Authentication and permissions | 0; P | Complete login/recovery/logout, role enforcement and external-client access boundaries; integrate advertised SSO only where configured and in scope. | Auth, roles, account/profile/settings; A01–A08, R26 | L | RM01 | Access leakage, account linking errors, recovery abuse, unknown existing identity stack. |
| RM03 — Master data, intake and GED | 1; P | Complete client/customs-office reference data, dossier creation, file intake, document library, deduplication and validated data imports. | Master data, intake, email, GED; T02–T03, T09–T10, R15–R17, S01 | L | RM02 | Bad imports, duplicate records, file exposure, ambiguous email routing. |
| RM04 — Customs dossier workflow | 1; P | Complete seven stages, article review, DUM checklist, value breakdown and formalities with auditable transitions. | Dossiers, declarations, DUM, formalities; T01, T04–T08 | L | RM03 | Incorrect customs rules, rounding/FX errors, incompatible status models. |
| RM05 — Reviewed extraction | 1; P | Finish invoice, undertaking, prior-DUM and supplier-expense extraction; reviewed article application and email classification. | AI jobs, review UI, declarations, GED, expenses; T11–T16 | L | RM03–RM04 | Hallucinated fields, duplicate application, wrong dossier assignment, provider/data handling. |
| RM06 — Transport execution | 1; P | Complete linked/standalone orders, internal/external missions, fleet assignments, immobilization and operational reporting. | Transport, fleet, dossier logistics; T18–T21 | L | RM04 | Conflicting assignments, out-of-order events, undocumented delivery variants. |
| RM07 — Finance and margin | 1; P | Finish expense/disbursement selection, billing handoff, receivables indicators and explainable margins. Verify payment features before extending them. | Expenses, invoices, payment allocations, reporting; T22–T26 | L | RM04; RM05 for AI suggestions | Duplicate billing, currency/tax errors, unsupported accounting assumptions. |
| RM08 — Monitoring and client portal | 1; P | Complete filters, elapsed-time views, alerts, anomaly journal and client dossier/billing/notification access. Verify account/company/announcement behavior. | Dashboard, notifications, disputes, client portal; T26–T31, A05 | L | RM02, RM04, RM06–RM07 | Misleading metrics, alert noise, cross-client exposure, unclear publication rules. |
| RM09 — RED projects and ledger | 2; P | Complete regime projects, DUM flows, stock ledger, journal, dashboard and traceable report/export views. | RED projects/imports/exports/discharges/reporting; R01–R02, R05–R06, R12–R18 | L | RM02–RM03 | Unreviewed regime definitions, inconsistent quantities, destructive corrections. |
| RM10 — Clearance and BOM engine | 2; P | Complete manual/FIFO/LIFO allocation, BOM calculations and missing-BOM handling with human approval. | RED allocation, stock, BOM; R03–R08 | L | RM09 | Over-allocation, concurrent posting, incorrect conversions, historical BOM changes. |
| RM11 — Deadlines and guarantees | 2; P | Complete versioned deadline rules, severity alerts, extensions where supported, and deposit-to-release guarantee tracking. | Compliance rules, alerts, guarantees; R09–R10, R14 | L | RM09–RM10 | Wrong statutory timing, false compliance labels, unauthorized releases. |
| RM12 — File reconciliation | 2; P | Finish file-based customs/PortNet/BADR import-export validation, discrepancy review and controlled resolution. | Import adapters, reconciliation, ledger; R11, S02 | L | RM09–RM10 | Format drift, duplicate imports, ambiguous matches, accidental ledger overwrite. |
| RM13 — Grounded assistants | 3; P | Complete knowledge indexing, semantic retrieval, conversation UX and business-data/customs answers with sources and permission checks. | Knowledge, chat, retrieval, reporting; T17, R19–R22 | L | RM02, RM07, RM09, RM12 | Unsupported regulatory answers, stale sources, data leakage, uncertain retention. |
| RM14 — Advisory clearance agent | 3; P | Complete scheduled/manual scans, proposed allocations, human approval, feedback and run history. | Agent jobs, recommendations, approvals; R22–R25 | L | RM10–RM13 | Silent writes, stale proposals, duplicate jobs, misleading “autonomous” claims. |
| RM15 — Single-tenant operations and deployment | 4; P | Verify encryption, backups/restores, monitoring, deployment/license handling and any existing installation-wide usage controls. | Infrastructure, jobs, licensing/configuration; S04–S10 | L | RM02 and implemented modules | Untested restore, secret exposure, license lockout, undefined operational targets. |
| RM16 — Documented third-party API | 4; N, explicitly future | Design and implement a limited versioned API around verified business workflows and documented authorization. | API, service layer, API docs; S03 | L | RM02, RM04, RM09–RM12, RM15 | Premature contract, data exposure, duplicate writes, unavailable external-system specifications. |

RM01 includes the new proposal to expose trustworthy client access guidance and route metadata if missing. RM16 is the only capability explicitly described as future on the reference site. All other work remains conditional on repository findings. No online checkout, generic ERP, GPS system, electronic signing system or autonomous customs filing is added.

## 4. Standalone coding prompts

Each prompt is independent: copy the whole block for that item. The acceptance criteria are **proposed implementation requirements**, not claims that those behaviors were observed on the reference site.

### RM01 — Verified baseline and public journeys

```text
Inspect the current repository and improve the public vTransit journeys. Reference https://vtransit.ma/, https://vtransit.ma/tarifs, https://vtransit.ma/documentation, https://vtransit.ma/faq, https://vtransit.ma/demo and https://vtransit.ma/inscription. Public evidence confirms navigation, plan selection and request forms, not backend delivery. Preserve the existing stack and working features. Keep this project single tenant: no tenant model, tenant IDs, workspace switching or automated tenant provisioning.

First produce a code-backed complete/partial/not-found matrix. Then fix verified gaps in navigation, documentation, plan-to-request routing and form handling. Treat all prices as quotation-based unless approved configuration says otherwise. Resolve transport entitlement and AI-autonomy wording against actual behavior; do not invent commercial policy. Remove leftover template navigation from public authentication layouts. Add a public route inventory/sitemap and a configured client-login link if absent; never invent an application destination.

Acceptance criteria:
- All intended public navigation and footer links resolve; invalid routes show a useful 404.
- Each supported plan URL preserves the correct product and selected plan through the request form.
- Forms validate inputs, prevent accidental duplicate sends, expose accessible success/error states and use the existing delivery/persistence adapter; tests use a fake adapter, not real outreach.
- No payment checkout or price is fabricated; no success state appears before delivery/persistence succeeds.
- Docs distinguish implemented file exchange from future API work and require human approval for AI business decisions.
- Report files changed, checks run, remaining unknowns and code evidence for the baseline.
```

### RM02 — Authentication and permissions

```text
Inspect and complete authentication and authorization in the existing single-tenant application. Public references are https://app.vtransit.ma/authentication/login, https://app.vtransit.ma/authentication/forgot_password, https://dynamic.vtransit.ma/admin/authentication and https://vtransit.ma/transit#securite. Login, remember-me, recovery and named roles are visible; backend rules are not. Do not assume the two reference hosts use the same codebase. Preserve the repository's identity stack. Do not introduce tenants, tenant IDs or workspace switching.

Verify login, session handling, recovery and logout. Establish a reviewed action-by-role matrix for declarant, agent, accounting, external client and existing administration roles. Enforce permissions on the server and in downloads/search, including business-record ownership for external clients. Inspect profile/settings routes. Google/Microsoft SSO is advertised on RED Enterprise: reuse or finish it only when actual identity configuration and product scope support it; never create pretend provider buttons.

Acceptance criteria:
- Unauthenticated protected routes reject access or redirect appropriately; direct requests cannot bypass authorization.
- External clients cannot read another client's dossiers, files, billing, search results or notifications.
- Logout invalidates the session; remember-me follows documented repository policy.
- Recovery uses non-enumerating responses and single-use expiring tokens with no secret logging; reset tests run only in a test environment.
- Configured SSO validates issuer/audience/state and does not link accounts by unverified email; missing configuration is reported explicitly.
- Tests cover allowed and denied actions, client ownership and recovery-token misuse.
```

### RM03 — Master data, intake and GED

```text
Complete verified gaps in master data, dossier intake and document management. Reference https://vtransit.ma/transit#cycle, https://vtransit.ma/transit#ia, https://vtransit.ma/red#apercu and https://vtransit.ma/documentation#demarrage. Evidence covers dossier metadata, email/file intake, client/customs-office setup, document statuses, cryptographic duplicate detection and advertised data imports; schemas and retention are not visible. Inspect existing code first and preserve working behavior. The application remains one organization per deployment, without tenant IDs or workspace switching.

Connect clients, customs offices and shipment metadata to dossier creation. Complete secure file attachment, document listing/statuses and within-dossier fingerprint deduplication. Reuse existing email intake adapters; unmatched or ambiguous messages must enter a review queue. Validate imports of existing supported client/dossier/invoice data formats. Build search and setup progress only from actual persisted records and existing permission rules.

Acceptance criteria:
- A valid dossier and its authorized documents remain available after reload; invalid references return actionable validation errors.
- Upload/download authorization is enforced server-side; file-type/size rules come from documented configuration.
- Repeated intake of the same file does not silently create duplicate business effects; users can see how duplicates were handled.
- Import preview identifies invalid rows and duplicate keys before commit; repeated imports are safe.
- Ambiguous email classification cannot silently attach confidential files to the wrong client.
- Setup completion and search results reflect persisted, authorized data; tests cover duplicate intake and access denial.
```

### RM04 — Customs dossier workflow

```text
Inspect and complete the Transit dossier workflow described at https://vtransit.ma/transit#cycle and https://vtransit.ma/documentation#transit. The seven public stages are Reception, Declaration, DUM, Formalities/liquidation, Logistics/release, GED and Expenses/billing. Preserve existing status models and working transitions, adapting them only where code evidence shows a gap. Keep a single-tenant application with no tenant IDs or workspace switching.

Implement reviewed article ventilation with SH code, regime, value and currency; a DUM document checklist; customs value breakdown; and actor/timestamp tracking for formalities. Site references to SH length and duty estimates do not supply authoritative tariff, FX, tax or legal rules. Reuse reviewed rules/configuration and document missing inputs rather than fabricating rates. Keep estimates distinguishable from finalized declarations.

Acceptance criteria:
- An authorized operator can follow the supported end-to-end dossier path with persisted data and a traceable timeline.
- Required transition conditions are explicit and tested; unauthorized transitions fail server-side.
- Article/value edits remain reviewable; monetary calculations use decimal-safe handling and an identified currency/FX source.
- Duty/tax calculations display their rule source and estimate status, or clearly state unavailable when rules are absent.
- DUM checklist status does not imply electronic signature or customs submission that the system cannot perform.
- Tests cover a valid lifecycle, invalid transition, permission denial and calculation precision.
```

### RM05 — Reviewed extraction

```text
Inspect and finish AI-assisted extraction using https://vtransit.ma/transit#ia and https://vtransit.ma/faq as evidence. Public scope includes commercial invoice, import undertaking, prior DUM, supplier-expense extraction, invoice-to-article import and email classification. Every extraction requires human review. Keep the existing stack and single-tenant architecture; no tenant IDs or workspace switching.

Use the existing provider/job interfaces to create validated draft extraction results linked to their source documents. Show editable extracted fields, missing values and SH warnings. Require an authorized reviewer before applying selected fields to declarations or expenses. Preserve provenance and correction history. Classify emails into dossier/client context with an unresolved state for uncertain matches. Do not hard-code sample confidence scores, fabricate provider results or automatically approve customs data.

Acceptance criteria:
- Supported input types yield drafts or explicit processing errors, never silently accepted records.
- Missing or unsupported values remain unknown; source document/page references are retained where available.
- Approval is enforced server-side and applies the reviewed version exactly once.
- Re-running a job or retrying approval cannot duplicate articles or expense requests.
- Human edits survive subsequent job completion; stale drafts require re-review.
- Tests use controlled extraction fixtures and cover invalid output, provider failure, duplicate application and permission denial.
```

### RM06 — Transport execution

```text
Complete verified transport gaps using https://vtransit.ma/transit#transport as the reference. Advertised features are dossier-linked or standalone delivery orders, internal/external missions, truck assignments, immobilization and reports by truck/driver/client. GPS, maintenance scheduling and electronic proof-of-delivery are not established. Inspect the existing implementation and preserve its stack. Keep one organization per deployment with no tenant IDs or workspace switching.

Connect order creation to dossiers and support standalone orders through existing models. Preserve the documented inherited shipment fields, allow authorized mission assignment and record event timestamps. Keep dossier logistics and mission status coherent. Represent immobilized vehicles explicitly and derive transport reports from real events. Do not invent logistics prices, timing targets or external-carrier contracts.

Acceptance criteria:
- Both linked and standalone orders persist correctly; linked orders retain their dossier relationship and documented inherited values.
- Mission pickup/arrival/delivery events have validated ordering and an audit trail for corrections.
- Conflicting assignments and immobilized-vehicle use follow explicit repository rules and cannot be silently accepted.
- Internal/external mission differences are represented without assuming every carrier is a login user.
- Reports reconcile to underlying orders/missions and contain no example metrics in production.
- Tests cover order inheritance, assignment conflicts, event ordering and dossier synchronization.
```

### RM07 — Finance and margin

```text
Inspect and complete expenses, pre-invoicing, receivables and margin reporting. Sources: https://vtransit.ma/transit#cycle, https://vtransit.ma/transit#pilotage and https://vtransit.ma/documentation#transit. The site advertises selection of honoraria/disbursements/costs and shows overdue/unpaid invoices, unallocated payments and margin indicators. Full accounting and payment workflows are not established by the preview. Preserve the existing finance implementation. Keep the project single tenant without tenant IDs or workspace switching.

Complete verified gaps in approved expense selection, draft billing handoff, existing invoice issuance and allocation logic. Document the margin formula and its treatment of pass-through disbursements, currencies and taxes using approved business rules. Do not invent tax rates, invoice numbering, credit-note rules, payment gateways or a general ledger. Retain provenance from dossier costs to billed lines.

Acceptance criteria:
- An expense cannot be billed twice through retry or repeated selection.
- Draft and issued invoice behavior follows explicit state rules; finalized changes use the existing controlled correction mechanism.
- Decimal-safe totals and margin reconcile to source lines; unsupported FX/tax inputs are flagged rather than guessed.
- Receivable aging and unallocated-payment totals match persisted records under a documented calculation date.
- Only permitted users can approve or issue financial records; external client visibility is scoped.
- Tests cover duplicate billing, precision, allocation totals and restricted financial actions.
```

### RM08 — Monitoring and client portal

```text
Complete operational monitoring and external-client visibility using https://vtransit.ma/transit#pilotage and https://app.vtransit.ma/authentication/forgot_password as evidence. Scope includes filters, aging/blocked/unpaid indicators, average time by status, anomalies/disputes and client access to dossiers, billing and notifications. Account/company/announcement links are visible but protected contents are not. Inspect and extend actual repository modules only. Maintain one organization per deployment; external clients are restricted accounts, not tenants. Add no tenant IDs or workspace switcher.

Connect dashboard metrics to real records with documented time and margin definitions. Implement advertised logistics aging indicators after defining timer start/reset semantics; do not generalize the visible 24h/48h thresholds to unrelated alerts. Finish anomaly journals and client views. Verify account/company/announcement modules before changing them, and do not build messages/tasks from broken template links.

Acceptance criteria:
- Supported filters combine consistently and dashboard totals reconcile with underlying lists.
- Aging calculations use a documented clock/time zone and handle state changes and overdue boundaries.
- Anomaly entries retain actor/time/context and follow an explicit resolution model.
- External clients can access only their permitted dossiers, documents, invoices and notifications, including direct URL requests.
- Notifications are deduplicated and use only configured channels; no email/SMS sending is invented.
- Tests cover metric boundaries, empty states, client isolation and unauthorized publication/editing.
```

### RM09 — RED projects and ledger

```text
Inspect and complete deterministic RED records using https://vtransit.ma/red#modules and https://vtransit.ma/red#apercu. Public scope includes regime projects, import/export DUM flows, discharges, stock, clearance rate, journal/sommier AT, dashboard and report/export controls. Labels AT/EF/IT/MA/IM and screenshot ATPA do not establish a legal mapping. Preserve existing reviewed definitions and record unresolved mappings. Keep a single-tenant application: no tenant model, tenant IDs or workspace switching.

Complete project and DUM relationships, article quantities/units, ledger events and read models. Derive stock and clearance metrics from auditable records. Preserve historical corrections using the repository's adjustment/reversal mechanism rather than destructive edits. Connect journal, dossier balance and discharge-sheet exports to the same source data. Avoid calling a report legally certified or compliant without an approved specification.

Acceptance criteria:
- Project, client, customs-office and DUM references remain consistent and validated.
- Stock and clearance calculations reconcile to ledger entries with explicit units and precision.
- Corrections retain the original event, actor and reason; duplicate operations cannot duplicate quantities.
- Dashboard, dossier, journal and exports reconcile for the same filters and reporting date.
- Missing regulatory definitions produce an explicit unresolved state, not a fabricated compliance result.
- Tests cover ledger reconciliation, correction history, duplicate operations and unauthorized access.
```

### RM10 — Clearance and BOM engine

```text
Complete the RED clearance engine after inspecting the current ledger and allocation code. Evidence: https://vtransit.ma/red#fonctionnalites, https://vtransit.ma/red#apercu and https://vtransit.ma/documentation#ia. Scope is manual allocation, FIFO/LIFO matching, BOM-based consumption and missing-BOM handling. Human approval is mandatory despite autonomous marketing wording. Preserve the existing stack and single-tenant design; add no tenant IDs or workspace switching.

Implement or finish deterministic allocation proposals using reviewed lot eligibility and ordering rules. Make the selected matching strategy explicit. Calculate material consumption from the applicable BOM version and known units; do not invent yields, wastage or conversion factors. Separate proposal generation from approved ledger posting. Use atomic persistence to prevent competing approvals from consuming the same remaining quantities.

Acceptance criteria:
- Manual and FIFO/LIFO proposals identify source lots, destination flows, quantities, strategy and reasons.
- Incompatible units/materials or missing required BOM configuration produce actionable validation errors.
- Allocations cannot exceed available import/export quantities or create negative remaining stock.
- Only an authorized human can approve; approval rechecks current balances and posts atomically once.
- BOM changes do not silently recalculate already posted historical consumption.
- Tests cover FIFO/LIFO ordering, tie handling, partial allocation, concurrent approval, missing BOM and reversals.
```

### RM11 — Deadlines and guarantees

```text
Inspect and complete RED deadline monitoring and bank-guarantee tracking. References: https://vtransit.ma/red#fonctionnalites and https://vtransit.ma/documentation#red. The site advertises info/warning/critical alerts and guarantees from deposit to release, but its general 12–24-month statement is not an authoritative rules table. Preserve existing approved policy. Keep the application single tenant with no tenant IDs or workspace switching.

Represent deadline rules with source, version/effective date and applicable regime. Support extensions only where approved existing business rules define them. Derive alerts from remaining obligations and documented timing semantics. Link guarantees to relevant declarations and track supported lifecycle events. Do not automatically release a guarantee because a local dashboard shows full clearance, and do not invent legal durations or bank rules.

Acceptance criteria:
- Every calculated statutory due date identifies the applied rule; missing rules are clearly unresolved.
- Alert severity and date boundaries are deterministic, configurable under authorization and tested.
- Supported deadline changes retain reason, actor and history and recompute dependent alerts.
- Guarantee status changes require authorized evidence and preserve audit history.
- Cleared/extended obligations do not leave stale duplicate alerts; unknown compliance is not shown as compliant.
- Tests cover deadline boundaries, missing rules, extensions where supported and unauthorized release attempts.
```

### RM12 — File reconciliation

```text
Complete file-based reconciliation for customs statements and PortNet/BADR exports. References: https://vtransit.ma/red#fonctionnalites and https://vtransit.ma/documentation#integrations. The source confirms import/export by files; schemas, matching keys and direct APIs are not visible. Inspect existing adapters and available sample fixtures. Keep the current stack and a single-tenant deployment, with no tenant IDs or workspace switching.

Implement only documented file formats supported by repository fixtures or approved specifications. Preserve original files and provenance, validate rows, preview matches/discrepancies and require authorized resolution before business-record changes. Use existing RED ledger services for approved changes. Do not silently overwrite local records, infer undocumented external endpoints or pretend unmatched rows reconcile successfully.

Acceptance criteria:
- Each supported file format has a documented schema and validated fixture; unsupported formats fail clearly.
- Import previews expose valid, invalid, unmatched and ambiguous rows with understandable reasons.
- Reimport/retry is idempotent, including the same content under a different filename.
- Discrepancy resolution records reviewer, source row and resulting change and preserves original evidence.
- Concurrent or stale reconciliation cannot overwrite newer approved ledger state.
- Tests cover malformed files, duplicate import, ambiguous matching, precision and unauthorized resolution.
```

### RM13 — Grounded assistants

```text
Inspect and complete the document-grounded customs assistant and permitted business-data Q&A. Sources: https://vtransit.ma/red#ia, https://vtransit.ma/red#apercu and https://vtransit.ma/transit#ia. Public evidence includes knowledge indexing, semantic retrieval, conversation lists, customs shortcuts and role-aware answers; actual provider configuration and retention policy are not established. Reuse existing search/vector/provider infrastructure. Keep one organization per deployment, without tenant IDs or workspace switching.

Finish document ingestion with indexing status, source provenance and effective dates where available. Enforce user permissions during retrieval and structured business queries. Return source-linked answers and separate documentary facts from recommendations. Preserve editable prompts and conversation history according to reviewed retention policy; do not hard-code a screenshot's retention label as policy. Business writes must remain outside conversational answer generation.

Acceptance criteria:
- Failed ingestion is visible and retryable; documents cannot appear indexed before processing completes.
- Factual answers cite accessible document passages or identify the underlying authorized business records.
- Insufficient/conflicting evidence produces a clear uncertainty response rather than invented law, amounts or deadlines.
- Inaccessible or deleted documents cannot leak through retrieval, cached answers or new conversation queries.
- Uploaded content is treated as data, never instructions to bypass permissions or execute actions.
- Tests cover retrieval access, missing evidence, deleted sources, provider failure and retention behavior.
```

### RM14 — Advisory clearance agent

```text
Inspect and complete the RED clearance agent using https://vtransit.ma/red#agent, https://vtransit.ma/red#apercu, https://vtransit.ma/faq and https://vtransit.ma/documentation#ia. Marketing mentions autonomous execution, but FAQ/docs require human validation and the screenshot labels investigation advisory-only. Implement autonomous analysis with authorized human approval for business mutations. Preserve the existing stack and single-tenant architecture; no tenant IDs or workspace switching.

Finish manual/scheduled portfolio scans, deadline/BOM findings, proposed matching strategies, run history and reviewer feedback. Reuse the deterministic clearance engine, not model arithmetic, for proposed quantities. Store accepted/rejected/false-positive feedback and use prior rejections only as documented contextual evidence. Make execution status explicit and handle retries through the existing job system. Do not perform customs filing, guarantee release or ledger posting from an unapproved model response.

Acceptance criteria:
- A scan creates traceable findings and proposals without changing balances or declaration state.
- Each proposal identifies inputs, calculation/rule version, justification and current approval state.
- Approval requires permission, revalidates current data and posts atomically exactly once through existing business services.
- Rejected/stale proposals cannot execute; changed inputs require a fresh review.
- Scheduled scans do not overlap incorrectly; failures/cancellation/retries appear in run history.
- Tests cover unauthorized execution, stale approval, duplicate jobs, model failure and feedback handling.
```

### RM15 — Single-tenant operations and deployment

```text
Inspect and verify deployment, encryption, recovery and operational controls. References: https://vtransit.ma/transit#securite, https://vtransit.ma/tarifs and https://vtransit.ma/faq. Advertised capabilities include encrypted storage/transport, backups, recovery planning, monitoring, own-infrastructure deployment, signed licensing and plan allowances. Claims are not implementation evidence. Preserve one organization per deployment: do not create tenant IDs, tenant provisioning, cross-tenant infrastructure or workspace switching.

Inspect actual infrastructure and produce a factual gap list, then implement verified operational gaps. Use established secret/key management. Document and test restoration in an isolated environment. Verify existing license handling and installation-wide usage controls only if the application already needs them; do not add a billing platform to reproduce marketing plans. Quotas must use approved configuration, not invented overage policy. State unknown RPO/RTO/retention/SLA requirements explicitly.

Acceptance criteria:
- Deployment documentation covers configuration, secrets, migrations, startup and recovery for the actual supported environment.
- Encryption claims are backed by configuration evidence; do not claim end-to-end encryption or legal certification without support.
- A backup can be restored in isolation and validated for database/file consistency with a recorded outcome.
- Health/job failures surface to configured monitoring without exposing documents or credentials.
- Any existing license/usage controls have tested boundary and failure behavior without undocumented data loss or lockout.
- Report operational targets still requiring policy decisions and the precise checks executed.
```

### RM16 — Documented third-party API

```text
Build a bounded third-party API for the existing single-tenant application after inspecting its business services. Evidence: https://vtransit.ma/documentation#integrations explicitly says APIs are coming; it supplies no endpoints, authentication scheme or external-system contract. Treat this as new work, not an existing feature to clone. Preserve the current stack. Do not add tenant IDs, tenants, workspace switching, or invented PortNet/BADR connections.

First derive and document the minimal resource/operation contract from verified application workflows. Reuse approved authentication and permission patterns. Prefer existing read operations initially; add mutations only where deterministic validation, approval and audit services already support them. Version the contract, document pagination/filtering/errors and keep external adapters separate from internal business rules. Missing partner specifications must remain explicit integration gaps.

Acceptance criteria:
- API documentation describes every implemented endpoint, its authorization, request/response schema and examples using synthetic data.
- Requests enforce the same permissions and external-client ownership rules as the UI, including downloads and lists.
- Lists have deterministic pagination; invalid input and unauthorized access return documented errors.
- Supported mutations use existing business services, idempotency and audit records; AI approval requirements cannot be bypassed.
- No placeholder endpoint claims a successful external connection or customs submission.
- Contract tests cover schemas, permissions, pagination, validation, duplicate mutation and version compatibility.
```
