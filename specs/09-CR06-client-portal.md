## CR06 — Client action portal and notifications

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Core; L. Depends on CR01–CR02, FD01–FD02. Single tenant. Clients are restricted contacts of the operating organization, never tenant accounts or workspace owners. Stories: a client submits the exact requested document; an approver understands a cost before agreeing; an internal agent verifies a response without exposing private notes.

### Screen contract

`/client/actions` (`Mes actions`), `/client/actions/{id}` (`Répondre à la demande`), `/client/dossiers` (`Mes dossiers`), `/client/dossiers/{id}` (`Suivi du dossier`), `/client/factures` (`Mes factures`), `/client/factures/{id}` (`Détail de la facture`), `/client/notifications` (`Notifications`), `/client/compte` (`Mon compte`), `/client/societe` (`Informations de la société`). Staff `/dossiers/{id}/demandes` (`Demandes au client`).

Request page fields: `Ce qui est attendu`, `Pourquoi cette pièce est nécessaire`, `Date souhaitée`, `Document concerné`, `Version à approuver`, `Montant et devise`, `Votre réponse`. Buttons `Ajouter le document`, `Envoyer ma réponse`, `Approuver cette version`, `Demander une précision`, `Refuser avec un motif`. Staff review `Accepter la réponse`, `Demander une correction`. Copy: `Votre réponse a été reçue. Elle doit encore être vérifiée.` Never say accepted when merely uploaded. Empty `Aucune action ne vous est demandée pour le moment.`

### Capabilities and fields

`client_request.create/publish/review` for assigned operations staff; `client_request.respond` for named active recipient with explicit grant; `client_request.approve_cost` requires external_approver and valid counterparty authority record. Internal financial/regulatory approvals remain separate. Client invoice read requires issued+published and resource grant. Contact can propose company changes but cannot alter invoiced legal identity retroactively.

| Entity | Fields / invariant |
|---|---|
| ClientRequest | `dossier_id,counterparty_id,kind:document/field_correction/instruction/cost_approval,title_fr,explanation_fr,requested_from_user_ids[],response_schema:RequestResponseSchema,target_refs:SnapshotRef[],due_at?,state:draft/published/responded/accepted/correction_requested/rejected/cancelled/stale,published_by?,reviewer_id?,related_blocker_id?`. |
| ClientResponse | `request_id,responder_id,payload:StoredResponseSchema,evidence_refs[],target_digest,submitted_at,state:received/in_review/accepted/rejected,review_decision_id?`; immutable; later response supersedes explicitly. |
| ClientAuthority | `user_id,counterparty_id,action_codes[],scope_refs[],authority_evidence_id,valid_until?,verified_decision_id`; used for consequential cost/instruction approval. |
| Notification | `recipient_user_id,resource_ref,template_code,payload:FrenchTemplateSchema,dedupe_key UNIQUE,state:queued/in_app_delivered/read/suppressed,read_at?`. |
| DeliveryAttempt | `notification_id,channel:email/in_app,status:pending/sent/failed,provider_message_id?,last_error_code?,next_attempt_at?`; sent ≠ read or accepted. |
| NotificationPreference | `user_id,template_category,channel,enabled`; security/required action delivery policy overrides only when approved and disclosed. |
| CompanyChangeProposal | `counterparty_id,submitted_by,patch:CounterpartyEditableDTO,input_version,review_id?,state:pending/accepted/rejected/stale`. |
| Announcement | `title_fr,body_fr,recipient_user_ids[],resource_refs[],publish_at?,state:draft/published/withdrawn`; no public confidential HTML. |

### States, validations and failure behavior

Publish validates recipient grant, French instructions, response schema, target version and required authority for approval requests. Published content freezes. Editing material amount/document/instruction creates a new request version and marks outstanding prior request stale. A response checks exact digest and current access; changed target returns `REQUEST_STALE` / `Cette demande a changé. Consultez la nouvelle version avant de répondre.`

Document response references only clean FD02 versions attached to this request. Cost response is `{decision:approve/reject,reason?}`; reject requires reason; approval binds displayed Money, currency, scope and version. Client cannot enter a different amount and have it treated as approval. Accepted client response satisfies only the mapped requirement; internal approver still validates business action.

Notification payload contains minimal text and an authenticated link, not document bytes or confidential financial values in email. Queue after transaction; reauthorize at delivery, suppress if withdrawn/revoked. Default in-app channel; external email only with approved SMTP/provider/destination policy. WhatsApp/SMS integrations remain **assumption to verify**, not silently installed. Reminder schedules are approved configuration; no invented cadence.

Client timeline uses approved French summaries of events; internal rule discussions, disputes not shared, and margin absent. Cached data and downloads require current session/grants. Cannot guarantee deletion of files users already lawfully downloaded; specifications promise future-access revocation, not remote erasure.

### API

| Endpoints | Contract |
|---|---|
| `GET/POST /client-requests`; `GET/PATCH /client-requests/{id}`; `POST /client-requests/{id}/publish`; `/cancel` | Staff DTO; publish `{}`; cancel `{reason}`. |
| `GET /client/actions`; `GET /client/actions/{id}`; `POST /client/actions/{id}/responses` | Client response schema; current target digest required; return received state only. |
| `POST /client-responses/{id}/accept`; `/request-correction`; `/reject` | `{reason?,approval_id?}` plus evidence check; final interpretation belongs domain reviewer. |
| `GET /client/dossiers`; `GET /client/dossiers/{id}`; `GET /client/invoices`; `GET /client/invoices/{id}` | Separate allowlisted DTOs; no generic staff object serialization. |
| `GET /me/notifications`; `POST /me/notifications/{id}/read`; `PATCH /me/notification-preferences` | Own-user only; state/reporting has no hidden recipient list. |
| `POST /client/company-change-proposals`; `POST /company-change-proposals/{id}/apply` | `{patch,input_version}`; apply `{approval_id}`. |
| `GET/POST /announcements`; `POST /announcements/{id}/publish`; `/withdraw` | Staff only mutations; explicit recipient set reauthorized. |

Tests: guessed client ID, shared dossier with internal attachment, revoked recipient during queue, stale cost amount, attachment still quarantined, response not accepted, rejected company edit, duplicate delivery webhook and accessible French form errors. Exit: clients can resolve assigned work without extra privileges or false confirmation.
