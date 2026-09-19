import * as z from 'zod';

/**
 * `00-shared-contract.md:51` — *"`{kind: registered ResourceKind, id: UUID}`. Backed by
 * `ResourceRecord(id,kind,parent_id?,counterparty_id?,classification)` and a concrete
 * domain row using the same id; validate FK/resource kind. Prevent dangling polymorphic
 * references."*
 *
 * The kind list is **closed**. A polymorphic reference whose kind is an arbitrary string
 * is a dangling reference waiting to happen, and the spec asks for exactly the opposite.
 * Modules widen it by editing this file — `packages/contracts` is the keystone, so
 * contracts change first and the types propagate (`CLAUDE.md` §Stack).
 *
 * Seeded from the cross-module relation spine at `00-shared-contract.md:55`. Nothing here
 * is invented: every kind below appears in that line or in the `ResourceRecord`
 * definition at `02-FD02-evidence.md:19`.
 */
export const RESOURCE_KINDS = [
  // Counterparty → Dossier → …
  'counterparty',
  'dossier',
  'declaration_version',
  'blocker',
  'client_request',
  'cost_item',
  'delivery_order',
  // RedProject → ImportLot / ExportFlow → AllocationProposal → LedgerTransaction
  'red_project',
  'import_lot',
  'export_flow',
  'allocation_proposal',
  'ledger_transaction',
  // BomVersion + ProductionBatch → ProductionReconciliation
  'bom_version',
  'production_batch',
  'production_reconciliation',
  // RuleVersion + EvidenceVersion → ReviewRequest → ApprovalDecision → posted command
  'rule_version',
  'evidence_version',
  'review_request',
  'approval_decision',
  // Obligation → GuaranteeRequest → ExternalObservation
  'obligation',
  'guarantee_request',
  'external_observation',
  // Documents attach through ResourceEvidence
  'resource_evidence',
] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const resourceKindSchema = z.enum(RESOURCE_KINDS);

export const resourceRefSchema = z
  .object({
    kind: resourceKindSchema,
    id: z.uuid(),
  })
  .strict();

export type ResourceRef = z.infer<typeof resourceRefSchema>;

/**
 * `02-FD02-evidence.md:19`. Not a severity ladder — three different rules:
 *
 * - `internal` never inherits external access at all.
 * - `client_shareable` may inherit to a permitted child under an explicit `ResourceGrant`.
 * - `restricted` requires its own explicit grant even for a general dossier reader.
 */
export const DATA_CLASSIFICATIONS = ['internal', 'client_shareable', 'restricted'] as const;
export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];
export const dataClassificationSchema = z.enum(DATA_CLASSIFICATIONS);

export const sameResource = (a: ResourceRef, b: ResourceRef): boolean =>
  a.kind === b.kind && a.id === b.id;
