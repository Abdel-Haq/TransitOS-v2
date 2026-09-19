# Dossier Clair — specification index

Implementation plan and specifications, dated 12 September 2026. English specification text; French UI labels and copy. Single operating organization per deployment. Unknown business, regulatory and service values are marked **assumption to verify**, with explicit blocked or unavailable behavior.

The source strategy remains the scope baseline. Engineering choices in these specifications are proposed implementation decisions, not verified vendor capabilities or legal conclusions. Code-complete and production-ready are separate milestones.

[Consolidated Markdown specification](./dossier-clair-implementation-specifications.md) · [Source strategy and roadmap](./sources/competing-product-strategy-roadmap-prompts.md) · [Original audit](./sources/vtransit-audit-roadmap-prompts.md)

## Separately copyable sections

- [Shared product, architecture, roles, data and API contract](./00-shared-contract.md)
- [FD01 — Identity, access and mandates](./01-FD01-identity.md)
- [FD02 — Evidence, approvals and decision history](./02-FD02-evidence.md)
- [FD03 — Reference data, migration and search](./03-FD03-migration.md)
- [CR01 — Dossier preparation and blocker workflow](./04-CR01-dossiers.md)
- [CR02 — Cost recovery, billing and cash evidence](./05-CR02-finance.md)
- [CR03 — Transport, handoffs and physical closure](./06-CR03-transport.md)
- [CR04 — RED ledger, BOM and deterministic clearance](./07-CR04-red.md)
- [CR05 — Obligations, deadlines and guarantee closure](./08-CR05-obligations.md)
- [CR06 — Client action portal and notifications](./09-CR06-client-portal.md)
- [CR07 — File exchange, external observations and reconciliation](./10-CR07-reconciliation.md)
- [DF01 — Reviewed extraction and cross-document readiness](./11-DF01-readiness.md)
- [DF02 — Contract-aware delay exposure and scenarios](./12-DF02-delay-costs.md)
- [DF03 — Production-to-RED evidence and reconciliation](./13-DF03-production.md)
- [DF04 — Rule registry and change-impact review](./14-DF04-rules.md)
- [DF05 — Grounded assistant and advisory scans](./15-DF05-advisory.md)
- [DF06 — Supported API and integration adapters](./16-DF06-api-integrations.md)
- [PL01 — Accessible French staff, client and field experience](./17-PL01-ux.md)
- [PL02 — Credible launch, service and deployment operations](./18-PL02-launch-operations.md)
- [Cross-cutting security, operations and delivery](./19-security-operations-delivery.md)
- [Supplemental data and API contracts](./20-data-api-contract-details.md)

Read the shared contract and supplemental data/API definitions with each module. Security, deployment, testing and milestones are in the cross-cutting delivery section. Module API tables describe the product’s internal API; they do not claim access to official external APIs.
