## FD01 — Identity, access and mandates

Shared implementation requirements: [product, security and API conventions](./00-shared-contract.md) · [detailed schemas and action permissions](./20-data-api-contract-details.md). This module can be copied separately with those contracts; dependencies below remain required.

Foundation; L. Dependencies: shared contract; FD02 supplies evidence/review services. Bootstrap schema and identity can precede FD02, but privileged grant and mandate-verification commands activate only when those services exist. Single tenant only. Credential ownership remains in the dedicated identity provider; business permissions remain in this application.

### Scope, stories and permissions

- As an administrator, I invite an individually identifiable staff member and assign a reviewed role/scope so responsibility is attributable.
- As a client contact, I sign in and see only explicitly shared records; another client membership cannot broaden access.
- As a declarant, I distinguish customs from PortNet mandate evidence before approving the applicable preparation step.
- As a user, I recover access and revoke sessions without losing dossier history.

Capabilities: `identity.read`, `identity.manage`, `grant.propose`, `grant.approve`, `mandate.write`, `mandate.verify`, `session.revoke`. `access_admin` owns identity/grant administration; a different `access_admin` approves privileged changes. `declarant_reviewer` verifies mandates; agents may draft them on accessible counterparties. Every user may read/revoke their own sessions. External contacts cannot manage organization identity or mandates. No login-as-user feature.

### Screens and French copy

| Route | Title; fields/actions |
|---|---|
| `/connexion` | `Se connecter`; `Adresse e-mail`, `Mot de passe`, `Rester connecté`, `Mot de passe oublié ?`, configured `Continuer avec Google` / `Continuer avec Microsoft`. Provider-hosted branded French forms. |
| `/recuperation` | `Récupérer l'accès`; provider flow; generic `Si un compte correspond à cette adresse, les instructions de récupération seront envoyées.` |
| `/compte/securite` | `Sécurité de mon compte`; `Authentification renforcée`, `Sessions actives`, `Révoquer cette session`. |
| `/administration/utilisateurs`, `/{id}` | `Utilisateurs et accès`; `Nom`, `Adresse e-mail`, `Type de compte`, `Rôles`, `Périmètre`, `Inviter`, `Suspendre`, `Proposer une modification`. |
| `/clients/{id}/mandats`, `/mandats/{id}` | `Mandats et habilitations`; `Type de mandat`, `Référence externe`, `Périmètre autorisé`, `Début de validité`, `Fin de validité`, `Dernière vérification`, `Justificatif`, `Soumettre à vérification`. |

Login return destinations are allowlisted same-origin paths. A user with no grants sees `Aucun dossier ne vous a encore été attribué.` Suspended accounts cannot refresh or initiate sessions.

### Data model

All fields follow shared types/base columns; `?` means nullable.

| Entity | Fields and relations |
|---|---|
| User | `identity_subject:Text UNIQUE`, `email:Text`, `display_name:Text`, `account_type:staff/external`, `status:invited/active/suspended`, `locale:fr`, `last_login_at?:Instant`. Subject, not email, links identity. |
| RoleAssignment | `user_id→User`, `role_code:Role`, `scope:assigned/all_operational_records`, `valid_from:Instant`, `valid_until?:Instant`, `approval_id→ApprovalDecision`. Unique active equivalent assignment. |
| ResourceGrant | `user_id→User`, `resource_id→ResourceRecord`, `actions:Capability[]`, `inherit_shareable_children:Boolean`, `valid_until?:Instant`, `revoked_at?:Instant`, `approval_id?`. |
| CounterpartyMembership | `user_id→User`, `counterparty_id→Counterparty`, `status:active/revoked`; unique pair; membership is identity context, not access. |
| AppSession | `user_id`, `session_token_hash:Text UNIQUE`, `encrypted_provider_tokens:SecretRef`, `assurance:Text`, `auth_time:Instant`, `expires_at:Instant`, `revoked_at?:Instant`, `device_label?:Text`. |
| Invitation | `email`, `account_type`, `proposed_roles:Role[]`, `counterparty_id?`, `token_hash UNIQUE`, `expires_at`, `accepted_subject?`, `status:pending/accepted/expired/revoked`. |
| GrantChange | `target_user_id`, `before_snapshot`, `after_snapshot` using RoleGrantSchema, `review_request_id`, `status:draft/submitted/applied/rejected/stale`. |
| Mandate | `counterparty_id`, `kind:portnet/customs`, `external_reference?:Text`, `scope_codes:Text[]`, `valid_from?:Date`, `valid_until?:Date`, `external_limit?:Decimal`, `verified_remaining?:Decimal`, `verified_at?:Instant`, `verification_valid_until?:Instant`, `evidence_version_id`, `status:draft/pending/verified/revoked/rejected`, `approval_id?`. Limit data is externally observed, not locally presumed. |

### States, rules, validations and failures

Identity invitation is pending until provider verifies account ownership and binds the exact subject. Do not auto-link SSO by email; conflicting subject returns `IDENTITY_LINK_REVIEW` / `Ce compte nécessite une vérification de son identité.` Session expiries/assurance windows are approved configuration, **assumption to verify**; missing production policy blocks login activation. Recovery/MFA enrollment and credential change use provider endpoints/themes, never custom forms that store passwords in application DB.

Mandate draft→pending→verified/rejected; verified→revoked. Effective view is `À vérifier`, `Valide`, `Expiré`, `Révoqué`, `Périmètre insuffisant` or `Vérification périmée`. `verified` requires independent reviewer, evidence, known required coverage and explicit validity basis. Null end date is valid only if reviewed source says no expiry; absence is unknown. Time/limit freshness policy is required to claim operational sufficiency. Local use does not decrement an official-system counter; record local preparation separately. Type substitution prohibited. Invalid ordering of dates is rejected; missing/expired evidence blocks only mandate-dependent controlled actions.

Suspension/revocation removes current session/grant authority immediately at API check; pending notifications and background jobs must reauthorize. User records with history cannot delete. A disabled provider shows `Connexion externe indisponible. Utilisez le mode de connexion autorisé.` only if an authorized alternative exists.

### API and command contracts

All `/api/v1` unless stated; shared DTO/precondition conventions apply.

| Endpoints | Payload / result; capability |
|---|---|
| `GET /auth/login`, `GET /auth/callback` | OIDC redirect/callback with state, nonce, PKCE; callback establishes opaque cookie, returns safe redirect; no arbitrary redirect input. |
| `POST /auth/logout`; `GET /auth/session`; `GET /me/sessions`; `POST /me/sessions/{id}/revoke` | Empty logout; revoke `{reason}`; own-session responses redact tokens. |
| `GET /users`, `GET /users/{id}`; `POST /invitations` | Invitation `{email,account_type,proposed_roles,counterparty_id?}`; `identity.manage`. |
| `POST /users/{id}/suspend`; `POST /users/{id}/reactivate` | `{reason,approval_id}`; session revocation occurs atomically with status change. |
| `POST /grant-changes`; `POST /grant-changes/{id}/submit`; `POST /grant-changes/{id}/apply` | Create `{target_user_id,after_snapshot,reason}`; apply `{approval_id}`; independent review. |
| `GET/POST /mandates`; `GET/PATCH /mandates/{id}` | Mandate draft DTO; filter `counterparty_id,kind,effective_status`; `mandate.write` for mutations. |
| `POST /mandates/{id}/submit`; `/verify`; `/revoke` | Submit `{}`; verify `{approval_id,verified_at,verification_valid_until}`; revoke `{reason,evidence_version_id}`. |

### Acceptance tests and exit

Test client A requesting client B metadata/files/search totals; administrator without business scope; self-grant rejection; unverified SSO collision; expired invitation; replayed recovery token at provider; revoked session/queued export; wrong mandate type; missing end-date basis; stale observed usage limit. Exit: configured identity round trip and French error states work with no role/resource bypass. External credentials and official mandate creation remain out of scope.
