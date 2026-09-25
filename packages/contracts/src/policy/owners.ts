/**
 * Who can answer a policy question — `00-shared-contract.md:121–129`, verbatim.
 *
 * `engineering` is the only addition, and it is what List A means:
 * [ADR-005](../../../docs/01-DECISIONS.md#adr-005) splits the register on ownership, and
 * an item nobody outside the team needs to approve should not sit `unresolved` blocking
 * day-one work.
 */
export const POLICY_OWNERS = {
  engineering: {
    label_fr: 'Équipe technique',
    scope: 'Decided at bootstrap and recorded as an approved version. List A.',
    source: 'docs/01-DECISIONS.md#adr-005',
  },
  regulatory_reviewer: {
    label_fr: 'Référent réglementaire qualifié',
    scope:
      'Supported regimes, document applicability, duties/tax/valuation, permitted RED discharges, deadlines and extensions.',
    source: '00-shared-contract.md:123',
  },
  finance_reviewer: {
    label_fr: 'Responsable financier',
    scope: 'Invoice numbering, tax, rounding, currency scales, FX source, pass-through treatment.',
    source: '00-shared-contract.md:124',
  },
  commercial_reviewer: {
    label_fr: 'Référent commercial et transport',
    scope: 'Carrier free time, tier rates, clock/calendar and overlap rules.',
    source: '00-shared-contract.md:125',
  },
  production_red_reviewer: {
    label_fr: 'Référent production et RED',
    scope: 'Production units, BOM yields, allowed exception treatment.',
    source: '00-shared-contract.md:126',
  },
  privacy_owner: {
    label_fr: 'Responsable sécurité et confidentialité',
    scope:
      'Identity session and assurance durations, upload limits, retention and holds, AI destinations and legal bases.',
    source: '00-shared-contract.md:127',
  },
  integration_owner: {
    label_fr: 'Responsable des intégrations',
    scope: 'File schemas, API credentials and contracts, notification destinations.',
    source: '00-shared-contract.md:128',
  },
  service_owner: {
    label_fr: 'Responsable de service',
    scope:
      'Capacity, latency, recovery, support and availability objectives, region, pricing and licence conditions.',
    source: '00-shared-contract.md:129',
  },
} as const;

export type PolicyOwner = keyof typeof POLICY_OWNERS;
export const POLICY_OWNER_CODES = Object.keys(POLICY_OWNERS) as readonly PolicyOwner[];

/** Everyone but engineering. These are the people the project has to go and find. */
export const EXTERNAL_OWNERS = POLICY_OWNER_CODES.filter((o) => o !== 'engineering');
