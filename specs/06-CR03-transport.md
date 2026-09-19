## CR03 — Transport, handoffs and physical closure

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Core; L. Depends on CR01 and foundation. Single tenant; fleet is optional installation functionality, not a separate workspace. No GPS integration, route optimization, maintenance scheduler or certified electronic proof-of-delivery in this release.

### User stories, UI and permissions

A dispatcher creates a delivery order linked to a dossier or independently. An assigned field agent acknowledges responsibility and supplies real event evidence. An operations manager sees that delivery is complete but equipment return remains outstanding.

Screens: `/transport/commandes` (`Commandes de livraison`), `/transport/commandes/{id}` (`Préparer la livraison`), `/transport/missions` (`Missions`), `/transport/missions/{id}` (`Suivi de mission`), `/transport/flotte` (`Flotte et disponibilité`), `/transport/retours` (`Retours à suivre`). Fields `Dossier lié`, `Mode`, `Itinéraire`, `Lieu de prise en charge`, `Destination`, `Transporteur`, `Véhicule`, `Chauffeur`, `Début prévu`, `Fin prévue`, `Prise en charge`, `Livraison`, `Retour du conteneur`, `Justificatif`. Actions `Affecter`, `Accepter la mission`, `Signaler un événement`, `Confirmer la livraison`, `Suivre le retour`.

Capabilities `transport.read/write/assign/confirm`, `fleet.manage`, `mission.event.submit`, `mission.event.verify`. Dispatcher assigns and prepares; field agent submits only assigned event evidence; operations manager verifies physical events where required. Official release evidence uses declarant/authorized CR01 reviewer. External carrier contact may acknowledge a specifically granted mission, never inspect unrelated dossier finances.

### Data entities

| Entity | Fields / relations |
|---|---|
| DeliveryOrder | `dossier_id?,counterparty_id,shipment_id?,operation_type:container/groupage/air/export/other,origin:Location,destination:Location,priority:normal/urgent,planned_start?:Instant,planned_end?:Instant,gross_weight?:Quantity,volume?:Quantity,state:draft/ready/assigned/in_execution/completed/cancelled,readiness_requirement_ids[]`. |
| OrderItem | `order_id,reference,description,quantity:Quantity,container_id?,delivered_quantity:derived`; partial delivery supported only through positive item event quantities. |
| Vehicle | `registration UNIQUE,vehicle_type,status:available/immobilized/retired,capacity_policy_id?,carrier_id?`. |
| Driver | `name,user_id?,carrier_id?,status:active/inactive`; no unnecessary identity document fields. |
| Immobilization | `vehicle_id,start_at,end_at?,reason,evidence_refs[],confirmed_by,cleared_at?`; interval not availability guess. |
| Mission | `reference UNIQUE,carrier_id?,execution_type:internal/external,vehicle_id?,driver_id?,assigned_user_id?,planned_start,planned_end,state:draft/offered/acknowledged/in_progress/delivery_complete/closed/cancelled`. |
| MissionOrder | `mission_id,order_id,assigned_item_quantities:ItemQuantity[],sequence_key`; prevent overassignment under active missions. |
| Assignment | `mission_id,vehicle_id?,driver_id?,effective_start,effective_end,status:active/released,counterparty_contact_id?,acknowledged_at?,acknowledged_by?`. |
| TransportEvent | `mission_id,order_id?,kind:pickup/loading/departure/arrival/delivery/empty_return,occurred_at,received_at,location?:Location,item_quantities:ItemQuantity[],container_id?,submitted_by,evidence_refs[],verification:pending/verified/rejected,verified_by?,supersedes_id?`; immutable observations. |
| ReturnObligation | `order_id,container_id,contract_version_id?,required:Boolean,required_basis_evidence_id,status:unknown/open/confirmed/not_applicable,closing_event_id?`; date target belongs approved contract policy. |

### States and business rules

Order ready requires core shipment/locations/client fields and verified mandatory release prerequisites. Standalone orders still require a counterparty, explicit operation type and a reviewed readiness template; they are not exempt from applicable checks. Linking a dossier copies shipment facts into a source-bound snapshot; later dossier changes raise a review issue, never silently overwrite dispatcher edits.

Assignment requires explicit planned interval with end after start. Lock vehicle/driver rows and reject overlaps with active assignments or immobilization; touching end/start boundaries are non-overlapping. PostgreSQL exclusion constraint can enforce interval overlap in addition to service checks. Unknown time window blocks firm assignment; draft planning remains possible. Capacity checks require configured compatible units/capacity; absence means `Capacité non vérifiée`, not fit.

Mission draft→offered→acknowledged→in_progress→delivery_complete→closed. Offer records recipient; only recipient or audited authorized dispatcher confirmation of external acknowledgement may acknowledge. Start requires current readiness and acknowledgement. A changed official prerequisite pauses controlled progression and raises blocker; it does not erase actual field observations. Delivery complete requires all assigned quantities delivered with evidence. Return requiredness must be established; unknown prevents full closure. Closed requires verified applicable return events. No duplicate delivery quantity or equipment return.

Backdated evidence allowed with reason and both occurred/received timestamps; contradictory chronological events go to review. Field agent cannot backdate an official acceptance. Correction appends superseding event and recomputes projections with visible impact; it cannot silently reverse invoices. Cancelling after partial execution requires a plan for remaining items/return obligations and management review. Reports distinguish verified events, pending claims, actual waiting and planned schedule.

### APIs

| Endpoints | Contract |
|---|---|
| `GET/POST /delivery-orders`; `GET/PATCH /delivery-orders/{id}`; `POST /delivery-orders/{id}/ready`; `/cancel` | Order+items DTO; ready `{}` validates current prerequisites; cancel `{reason,approval_id?}`. |
| `GET/POST /missions`; `GET/PATCH /missions/{id}`; `POST /missions/{id}/offer` | Mission draft; offer `{assignee_user_id? ,counterparty_contact_id?,order_assignments[],vehicle_id?,driver_id?}`. |
| `POST /missions/{id}/acknowledge`; `/start`; `/close` | Acknowledge `{evidence_refs?}`; start `{occurred_at}`; close `{approval_id}` when required by template. |
| `POST /missions/{id}/events`; `POST /transport-events/{id}/verify`; `/correct` | Event DTO; verify `{approval_id}`; correct `{replacement_event,reason,approval_id}`. |
| `GET/POST /vehicles`; `GET/PATCH /vehicles/{id}`; `GET/POST /drivers` | Reference/availability DTO; no status toggle bypassing immobilization. |
| `POST /vehicles/{id}/immobilizations`; `POST /immobilizations/{id}/clear` | `{start_at,end_at?,reason,evidence_refs}`; clear `{occurred_at,reason,evidence_refs}`. |
| `GET /return-obligations`; `POST /return-obligations/{id}/confirm`; `/not-applicable` | Confirm `{closing_event_id,approval_id}`; not-applicable requires approved contract basis. |
| `GET /reports/transport` | Filters carrier/vehicle/driver/client/period; distinct missions and verified event-based durations. |

Errors: `ASSIGNMENT_OVERLAP` → `Une affectation existe déjà sur ce créneau.`; `ASSET_IMMOBILIZED` → `Ce véhicule est immobilisé.`; `RETURN_OUTSTANDING` → `Le retour du conteneur n'est pas confirmé.`; `EVENT_ORDER_CONFLICT` → `L'ordre des événements doit être vérifié.` Test concurrent dispatch, partially delivered order, unknown return terms, stale release, external acknowledgement evidence, overlapping immobilization and corrected timestamps. Commercial deadlines/rates remain **assumption to verify**, implemented in DF02 rather than guessed here.
