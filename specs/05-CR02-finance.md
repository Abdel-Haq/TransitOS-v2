## CR02 — Cost recovery, billing and cash evidence

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Core; L. Depends on CR01, FD01–FD03. A focused receivables/cost subledger, not a general ledger, bank-payment engine or financial-advice system. Single tenant. Finance operator drafts, finance reviewer independently approves/posts; external approver can approve an assigned cost snapshot only.

### Stories and screens

An accountant connects each incurred cost to receipt, authorization and invoice; a reviewer issues a balanced invoice; a client sees exactly what they approved; a director distinguishes actual margin from estimates. `/finances/couts` (`Coûts et débours`), `/finances/couts/{id}` (`Détail du coût`), `/finances/prefacturation` (`Préfacturation`), `/finances/factures`, `/{id}` (`Factures clients`), `/finances/encaissements` (`Encaissements et avances`), `/finances/rapprochement` (`Lettrage`), `/finances/reglements-import` (`Justificatifs de règlement import`), dossier `/finances` tab (`Situation financière`).

Fields: `Client`, `Fournisseur`, `Poste de frais`, `Montant`, `Devise`, `Justificatif`, `Montant engagé`, `Montant constaté`, `À refacturer`, `Avance client`, `Échéance`, `Montant contesté`, `Montant non lettré`, `Motif de correction`. Actions: `Soumettre le coût`, `Préparer la facture`, `Émettre la facture`, `Enregistrer un encaissement`, `Proposer le lettrage`, `Préparer un avoir`.

Capabilities `cost.write/approve`, `invoice.write/issue`, `receipt.write/confirm`, `allocation.propose/post`, `finance.read`, `finance.export`. Margin is internal finance/management only. Customer-visible invoices/costs require explicit publication. Invoice issuance and confirmed receipt/allocations always consume separate approval; client approval is necessary only where policy/request says so and never substitutes internal approval.

### Entities and invariants

| Entity | Fields / relationships |
|---|---|
| CostItem | `dossier_id,supplier_id,category_code,cost_type:fee/pass_through/operating,estimated_amount?:Money,actual_amount?:Money,recoverable:Boolean,source_document_version_id?,supplier_invoice_ref?,external_source_id?,state:draft/in_review/approved/rejected/cancelled,client_approval_id?,internal_approval_id?`. |
| CostCommitment | `cost_id,amount:Money,approved_by_decision_id,expires_at?,supersedes_id?`; immutable versions. |
| Invoice | `counterparty_id,currency_code,document_type:invoice/credit_note,corrects_invoice_id?,draft_reference,issued_number?:Text UNIQUE,issue_date?:Date,due_date?:Date,policy_version_id,state:draft/in_review/issued/cancelled,approval_id?,total_net?:Decimal,total_tax?:Decimal,total_gross?:Decimal`. |
| InvoiceLine | `invoice_id,line_ref,dossier_id,cost_item_id?,description_fr,quantity:Decimal,unit_price:Decimal,tax_rule_version_id?,net:Decimal,tax:Decimal,gross:Decimal,source_allocation_id?`; cost billing uniqueness enforced by CostBillingAllocation. |
| CostBillingAllocation | `cost_item_id,invoice_line_id,amount:Money,status:reserved/posted/reversed`; sum active allocations cannot exceed approved billable amount unless reviewed policy explicitly authorizes fee markup. |
| Receipt | `counterparty_id,amount:Money,received_at,method_code,bank_reference?,source_evidence_id,purpose:invoice_payment/advance,external_event_id?,state:draft/in_review/confirmed/reversed,approval_id?`; external source/event unique when supplied. |
| PaymentAllocation | `receipt_id,invoice_id,amount:Money,state:proposed/posted/reversed,approval_id?,posted_at?`; receipt and invoice client/currency must match. |
| FinancePosting | `posting_kind:invoice_debit/credit_note_credit/receipt_credit/reversal,resource_id,amount:Money,effective_date,reverses_id?,approval_id`; immutable, per-resource effect uniqueness. |
| Dispute | `invoice_id?,cost_id?,counterparty_id,amount:Money,reason,evidence_refs[],state:open/in_review/resolved,reconciliation_action_ref?`. |
| ImportSettlementEvidence | `dossier_id,title_reference,domiciliation_reference?,supplier_id,currency_code,claimed_amount?:Decimal,imputed_amount?:Decimal,bank_reference?,evidence_refs[],status:incomplete/in_review/externally_confirmed,verification_decision_id?`; informational, never a payment posting. |

### Functional rules and states

Costs draft→in_review→approved/rejected; approved data is immutable, amended through linked replacement/reversal. Exact supplier invoice reference+supplier+currency duplicates flag review; same invoice may support distinct item lines, so never blindly discard all matches. Already billed approved cost cannot change silently. Invoice drafting may reserve approved cost portions; abandoned/cancelled drafts release reservations. In-review invoices cannot edit; return to draft creates a new reviewed version.

Issue in a transaction: validate party/tax/numbering policy, freeze all line values/FX references, lock selected costs and number series, verify client/internal approvals, allocate issued number once, create posting+audit. Failed transaction consumes neither number reservation nor approval; actual mandated gap treatment is policy, **assumption to verify**. Never delete/renumber an issued invoice. Corrections require reviewed credit-note policy; otherwise correction command is unavailable.

Exact arithmetic: per-line net = quantity × unit price under approved rounding; tax uses selected effective tax rule; gross = rounded net + rounded tax. Invoice totals sum finalized line values. Mixed currencies require explicit approved FX conversion before creating invoice lines; no hidden conversion. Due date is contractual input; unknown terms block issue where required, not assumed cash terms.

Allocation posting locks receipt+invoice and checks remaining amounts. Remaining receipt = confirmed amount − posted allocations plus reversed allocations; invoice due = issued gross − applicable posted credit notes − posted receipts. Disputed amount is displayed separately, not subtracted from legally owed balance by default. Customer advance is confirmed unallocated receipt, not revenue. Overdue means positive due after due date using business calendar date; no overdue classification without due date. No negative due from over-allocation.

Margin view groups by dossier and currency: recognized service net revenue minus approved attributable operating costs; exclude pass-through revenue/cost symmetrically. Report unknown classification or missing actual costs separately. Recognition basis and shared-cost allocation are **assumption to verify**; until approved, return unavailable margin with supporting components rather than fabricated profit. Import settlement evidence is separate and cannot release a guarantee or imply bank transfer.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /costs`; `GET/PATCH /costs/{id}`; `POST /costs/{id}/submit`; `/approve`; `/cancel` | Cost DTO; approve `{approval_id}`; cancel `{reason}` only if no posted billing. |
| `POST /costs/{id}/commitments` | `{amount,approval_id,expires_at?}`. |
| `GET/POST /invoices`; `GET/PATCH /invoices/{id}`; `POST /invoices/{id}/submit`; `/issue`; `/cancel` | Create draft includes `lines[]`; issue `{approval_id,issue_date,due_date}`; cancel only unissued. |
| `POST /invoices/{id}/credit-notes`; `GET /invoices/{id}/document` | `{reason,lines,policy_version_id}` → draft credit note; document is frozen issued version. |
| `GET/POST /receipts`; `POST /receipts/{id}/submit`; `/confirm`; `/reverse` | Confirm `{approval_id}`; reverse `{approval_id,reason}` after dependent allocations reversed. |
| `POST /payment-allocations`; `POST /payment-allocations/{id}/post`; `/reverse` | Allocation draft; post/reverse `{approval_id,reason?}`. |
| `GET/POST /disputes`; `POST /disputes/{id}/resolve` | Resolve `{reason,evidence_refs,resolution_ref?}` does not change money by itself. |
| `GET/POST /import-settlement-evidence`; `POST /import-settlement-evidence/{id}/confirm` | `{approval_id}` with bank evidence; no payment effect. |
| `GET /reports/receivables`; `GET /dossiers/{id}/margin` | Currency-separated totals, calculation date and unresolved assumptions. |

Errors: `COST_ALREADY_BILLED` → `Ce coût est déjà affecté à une facture.`; `ALLOCATION_EXCEEDS_BALANCE` → `Le montant dépasse le solde disponible.`; `CURRENCY_CONFLICT` → `Les devises ne correspondent pas.` Test partial billing, simultaneous allocation, duplicate receipt, changed client approval, credit note limits, unknown tax, inconsistent evidence and margin with missing actuals. Exit: no money movement can be inferred from an unconfirmed document or AI result.
