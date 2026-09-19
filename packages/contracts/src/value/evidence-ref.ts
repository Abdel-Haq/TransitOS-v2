import * as z from 'zod';

/**
 * `00-shared-contract.md:52` — *"`{document_version_id: UUID, locator?: {page_label?:Text,
 * field_path?:Text, excerpt?:Text}}`; locators must point to the source, not fabricated
 * positions."*
 *
 * The locator is the interesting half. Every field is optional, but an empty locator
 * object is not: a locator that locates nothing is the fabricated position the spec
 * forbids, so it is rejected rather than stored as `{}`. Omit the locator instead.
 *
 * `page_label` is a **label**, not an index — documents have covers, annexes and
 * restarted numbering, and a reviewer needs the label printed on the page they are
 * looking at.
 */
export const evidenceLocatorSchema = z
  .object({
    page_label: z.string().min(1).optional(),
    field_path: z.string().min(1).optional(),
    excerpt: z.string().min(1).optional(),
  })
  .strict()
  .refine(
    (l) => l.page_label !== undefined || l.field_path !== undefined || l.excerpt !== undefined,
    {
      message:
        'An evidence locator must point at something. Omit the locator rather than sending an ' +
        'empty one (00-shared-contract.md:52).',
    },
  );

export type EvidenceLocator = z.infer<typeof evidenceLocatorSchema>;

export const evidenceRefSchema = z
  .object({
    document_version_id: z.uuid(),
    locator: evidenceLocatorSchema.optional(),
  })
  .strict();

export type EvidenceRef = z.infer<typeof evidenceRefSchema>;
