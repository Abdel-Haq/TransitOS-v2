import { createHash } from 'node:crypto';
import * as z from 'zod';
import { canonicalize } from './canonical.js';
import { resourceRefSchema } from './resource-ref.js';

/**
 * `00-shared-contract.md:53` — *"`{resource: ResourceRef, version: bigint,
 * content_digest: Text}`."*
 *
 * JSON has no bigint, so `version` crosses the boundary as a string of digits. Accepting
 * a JSON number here would silently round any version above 2^53, and the version is what
 * `If-Match` compares.
 */
export const versionSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)$/, { message: 'version is a non-negative integer, sent as a string.' });

export const DIGEST_ALGORITHM = 'sha256';
const DIGEST_PREFIX = `${DIGEST_ALGORITHM}:`;

export const contentDigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/, {
  message: 'content_digest is "sha256:" followed by 64 lowercase hex characters.',
});

export const snapshotRefSchema = z
  .object({
    resource: resourceRefSchema,
    version: versionSchema,
    content_digest: contentDigestSchema,
  })
  .strict();

export type SnapshotRef = z.infer<typeof snapshotRefSchema>;

/**
 * The digest of a snapshot payload, over its canonical form.
 *
 * Algorithm-prefixed on purpose. A bare hex string is undistinguishable from the next
 * algorithm's, and these values outlive the code that wrote them — an approval recorded
 * today is evidence years from now.
 */
export const contentDigest = (payload: unknown): string =>
  DIGEST_PREFIX + createHash(DIGEST_ALGORITHM).update(canonicalize(payload), 'utf8').digest('hex');

/**
 * True when `payload` is exactly what the snapshot recorded.
 *
 * This is the check that makes an approval safe to consume: `00-shared-contract.md:92`
 * requires the controlled command to *"recheck inputs, rule/evidence versions and
 * approval"* before applying, and a matching digest is what "unchanged" means.
 */
export const matchesSnapshot = (snapshot: SnapshotRef, payload: unknown): boolean =>
  snapshot.content_digest === contentDigest(payload);
