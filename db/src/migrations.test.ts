import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const META = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations', 'meta');
const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

interface Journal {
  entries: { idx: number; tag: string; when: number }[];
}

/**
 * Guards on the migration chain itself.
 *
 * These exist because the chain broke once and nothing noticed: `meta/0002_snapshot.json`
 * was deleted during unrelated cleanup, so the next `drizzle-kit generate` diffed against
 * `0001` and produced a migration that recreated four tables that already existed. It only
 * surfaced when the migration was run. A repository can carry a broken chain silently, and
 * the person who finds out is whoever next regenerates.
 */
describe('the migration chain is intact', () => {
  const journal = JSON.parse(readFileSync(join(META, '_journal.json'), 'utf8')) as Journal;
  const snapshots = readdirSync(META).filter((f) => f.endsWith('_snapshot.json'));
  const sqlFiles = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'));

  it('has a snapshot for every journal entry after the first', () => {
    // drizzle generates a snapshot per migration; a gap makes the next generate diff
    // against the wrong baseline.
    for (const entry of journal.entries) {
      if (entry.idx === 0) continue;
      const expected = `${String(entry.idx).padStart(4, '0')}_snapshot.json`;
      expect(snapshots, `${entry.tag} → ${expected}`).toContain(expected);
    }
  });

  it('has a SQL file for every journal entry', () => {
    for (const entry of journal.entries) {
      expect(sqlFiles, entry.tag).toContain(`${entry.tag}.sql`);
    }
  });

  it('has a journal entry for every SQL file', () => {
    // A .sql on disk that the journal does not list never runs, which is worse than a
    // missing migration: the schema looks present in review and is absent in the database.
    const tags = new Set(journal.entries.map((e) => e.tag));
    for (const file of sqlFiles) expect(tags, file).toContain(file.replace('.sql', ''));
  });

  it('numbers entries contiguously from zero', () => {
    expect(journal.entries.map((e) => e.idx)).toEqual(journal.entries.map((_, i) => i));
  });

  it('chains each snapshot to the previous one', () => {
    let previousId: string | undefined;
    for (const entry of journal.entries) {
      if (entry.idx === 0) continue;
      const snapshot = JSON.parse(
        readFileSync(join(META, `${String(entry.idx).padStart(4, '0')}_snapshot.json`), 'utf8'),
      ) as { id: string; prevId: string };
      if (previousId !== undefined) {
        expect(snapshot.prevId, `${entry.tag} prevId`).toBe(previousId);
      }
      previousId = snapshot.id;
    }
  });

  it('creates each table exactly once across the whole chain', () => {
    // The specific failure that motivated this file.
    const created = new Map<string, string>();
    for (const entry of journal.entries) {
      const sql = readFileSync(join(MIGRATIONS, `${entry.tag}.sql`), 'utf8');
      for (const match of sql.matchAll(/CREATE TABLE "([^"]+)"/g)) {
        const table = match[1]!;
        expect(
          created.has(table),
          `${table} created in both ${created.get(table)} and ${entry.tag}`,
        ).toBe(false);
        created.set(table, entry.tag);
      }
    }
    expect(created.size).toBeGreaterThan(0);
  });
});
