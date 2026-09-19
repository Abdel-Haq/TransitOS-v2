/**
 * The sixteen role codes of `00-shared-contract.md:66–83`, with the French UI labels the
 * spec gives verbatim.
 *
 * `:64` — *"Fixed capability bundles below may be combined by an authorized
 * administrator; combination does not bypass separation-of-duty checks."* So a role is a
 * bundle, not an identity: holding both `finance_operator` and `finance_reviewer` still
 * does not let one person draft and issue the same invoice. That check lives in the
 * action registry, not here.
 *
 * The `staff` / `external` split matters: `:85` — *"`internal` records never inherit
 * external access"*, and *"Client membership alone grants nothing."*
 */

export interface RoleDefinition {
  /** The French label shown in the UI. Verbatim from `00-shared-contract.md`. */
  readonly label_fr: string;
  readonly audience: 'staff' | 'external';
  readonly source: string;
}

export const ROLE_REGISTRY = {
  access_admin: {
    label_fr: 'Administration des accès',
    audience: 'staff',
    source: '00-shared-contract.md:68',
  },
  operations_manager: {
    label_fr: "Responsable d'exploitation",
    audience: 'staff',
    source: '00-shared-contract.md:69',
  },
  dossier_agent: {
    label_fr: 'Agent de dossier',
    audience: 'staff',
    source: '00-shared-contract.md:70',
  },
  declarant_reviewer: {
    label_fr: 'Déclarant habilité',
    audience: 'staff',
    source: '00-shared-contract.md:71',
  },
  finance_operator: {
    label_fr: 'Comptabilité',
    audience: 'staff',
    source: '00-shared-contract.md:72',
  },
  finance_reviewer: {
    label_fr: 'Responsable financier',
    audience: 'staff',
    source: '00-shared-contract.md:73',
  },
  dispatcher: {
    label_fr: 'Coordination transport',
    audience: 'staff',
    source: '00-shared-contract.md:74',
  },
  field_agent: {
    label_fr: 'Agent terrain',
    audience: 'staff',
    source: '00-shared-contract.md:75',
  },
  red_operator: {
    label_fr: 'Gestionnaire RED',
    audience: 'staff',
    source: '00-shared-contract.md:76',
  },
  red_reviewer: {
    label_fr: 'Responsable conformité RED',
    audience: 'staff',
    source: '00-shared-contract.md:77',
  },
  production_contributor: {
    label_fr: 'Production et stock',
    audience: 'staff',
    source: '00-shared-contract.md:78',
  },
  rule_reviewer: {
    // `:79` — *"qualification recorded, not inferred from role alone."* Holding this role
    // is necessary and not sufficient; DF04 checks the recorded qualification too.
    label_fr: 'Référent réglementaire',
    audience: 'staff',
    source: '00-shared-contract.md:79',
  },
  auditor: {
    label_fr: 'Audit',
    audience: 'staff',
    source: '00-shared-contract.md:80',
  },
  platform_operator: {
    // `:81` — *"application permissions do not grant business-content read."*
    label_fr: 'Exploitation technique',
    audience: 'staff',
    source: '00-shared-contract.md:81',
  },
  external_contact: {
    label_fr: 'Contact client',
    audience: 'external',
    source: '00-shared-contract.md:82',
  },
  external_approver: {
    // `:83` — *"never acts as internal declarant/finance/RED reviewer."*
    label_fr: 'Approbateur client',
    audience: 'external',
    source: '00-shared-contract.md:83',
  },
} as const satisfies Record<string, RoleDefinition>;

export type RoleCode = keyof typeof ROLE_REGISTRY;

export const ROLE_CODES = Object.keys(ROLE_REGISTRY) as readonly RoleCode[];

export const STAFF_ROLES = ROLE_CODES.filter((r) => ROLE_REGISTRY[r].audience === 'staff');
export const EXTERNAL_ROLES = ROLE_CODES.filter((r) => ROLE_REGISTRY[r].audience === 'external');

export const isRoleCode = (value: string): value is RoleCode => value in ROLE_REGISTRY;
