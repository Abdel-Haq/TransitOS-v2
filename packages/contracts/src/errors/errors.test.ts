import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ERROR_CATALOG, ERROR_CODES, HTTP_STATUS, isErrorCode } from './catalog.js';
import {
  apiErrorSchema,
  buildError,
  renderMessage,
  httpStatusFor,
  ErrorCatalogError,
} from './api-error.js';

const REQUEST_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const SHARED_CONTRACT = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../../specs/00-shared-contract.md'),
  'utf8',
);

describe('error catalog', () => {
  it('reproduces the twelve shared codes of 00-shared-contract.md verbatim', () => {
    // The French copy is the product. A paraphrase here is a different sentence on a
    // user's screen from the one the specification agreed.
    for (const code of [
      'REQUIRED',
      'INVALID_REFERENCE',
      'FORBIDDEN',
      'NOT_FOUND',
      'VERSION_CONFLICT',
      'POLICY_REQUIRED',
      'APPROVAL_REQUIRED',
      'APPROVAL_STALE',
      'EXTERNAL_EVIDENCE_REQUIRED',
      'DUPLICATE',
      'DEPENDENCY_UNAVAILABLE',
      'NO_DATA',
    ] as const) {
      expect(SHARED_CONTRACT, code).toContain(`| ${code} |`);
      expect(SHARED_CONTRACT, `${code} copy`).toContain(ERROR_CATALOG[code].message_fr);
    }
  });

  it('gives every code French copy and an HTTP status from :103', () => {
    const statuses = new Set<number>(Object.values(HTTP_STATUS));
    for (const code of ERROR_CODES) {
      const d = ERROR_CATALOG[code];
      expect(d.message_fr.length, code).toBeGreaterThan(0);
      // No untranslated code ever reaches a screen — CLAUDE.md non-negotiable #9.
      expect(d.message_fr, code).not.toMatch(/^[A-Z_]+$/);
      expect(statuses.has(d.http_status), code).toBe(true);
    }
  });

  it('marks only genuinely retryable failures retryable', () => {
    // Retrying a 403 just burns the rate limit. Retrying a 503 is the point.
    expect(ERROR_CATALOG.DEPENDENCY_UNAVAILABLE.retryable).toBe(true);
    expect(ERROR_CATALOG.REQUEST_IN_PROGRESS.retryable).toBe(true);
    for (const code of ['FORBIDDEN', 'NOT_FOUND', 'REQUIRED', 'DUPLICATE'] as const) {
      expect(ERROR_CATALOG[code].retryable, code).toBe(false);
    }
  });

  it('carries the protocol codes the copy table omits', () => {
    // :100 names IDEMPOTENCY_CONFLICT and REQUEST_IN_PROGRESS and :88 names the
    // no-approver case, but none appears in the French table. They are user-visible, so
    // they need copy like anything else.
    expect(SHARED_CONTRACT).toContain('IDEMPOTENCY_CONFLICT');
    expect(SHARED_CONTRACT).toContain('REQUEST_IN_PROGRESS');
    expect(SHARED_CONTRACT).toContain(ERROR_CATALOG.NO_ELIGIBLE_APPROVER.message_fr);
  });

  it('maps an unknown code to 500 rather than guessing', () => {
    expect(httpStatusFor('FORBIDDEN')).toBe(403);
    expect(httpStatusFor('SOMETHING_NEW')).toBe(500);
    expect(isErrorCode('SOMETHING_NEW')).toBe(false);
  });
});

describe('buildError', () => {
  it('takes the French copy and retryability from the catalog, never from the caller', () => {
    const error = buildError('FORBIDDEN', { request_id: REQUEST_ID });
    expect(error.message_fr).toBe(ERROR_CATALOG.FORBIDDEN.message_fr);
    expect(error.retryable).toBe(false);
    expect(apiErrorSchema.safeParse(error).success).toBe(true);
  });

  it('always includes field_errors, even empty', () => {
    // The shape at :102 is not optional; a client that has to branch on presence will
    // eventually forget to.
    expect(buildError('NOT_FOUND', { request_id: REQUEST_ID }).field_errors).toEqual([]);
  });

  it('interpolates POLICY_REQUIRED', () => {
    const error = buildError('POLICY_REQUIRED', {
      request_id: REQUEST_ID,
      placeholders: { libellé: 'Taux de TVA' },
    });
    expect(error.message_fr).toBe(
      "Configuration à valider : Taux de TVA. Cette action n'est pas disponible.",
    );
  });

  it('refuses to ship an uninterpolated placeholder to a screen', () => {
    expect(() => buildError('POLICY_REQUIRED', { request_id: REQUEST_ID })).toThrow(
      ErrorCatalogError,
    );
    expect(() => renderMessage('POLICY_REQUIRED', {})).toThrow(/libellé/);
  });

  it('omits details entirely when there are none', () => {
    expect('details' in buildError('NO_DATA', { request_id: REQUEST_ID })).toBe(false);
  });

  it('rejects an error object with an unexpected key', () => {
    const error = { ...buildError('NO_DATA', { request_id: REQUEST_ID }), sql: 'SELECT 1' };
    // :102 — "Never include secrets, raw SQL or unauthorized record facts." The strict
    // schema is the last line of defence when something appends a debugging field.
    expect(apiErrorSchema.safeParse(error).success).toBe(false);
  });

  it('carries field errors through', () => {
    const error = buildError('REQUIRED', {
      request_id: REQUEST_ID,
      field_errors: [
        {
          field_path: 'counterparty_id',
          code: 'REQUIRED',
          message_fr: 'Ce champ est obligatoire.',
        },
      ],
    });
    expect(apiErrorSchema.parse(error).field_errors).toHaveLength(1);
  });
});
