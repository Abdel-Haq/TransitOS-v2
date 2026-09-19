-- Extensions the schema depends on, installed before any table exists.
--
-- pgcrypto      gen_random_uuid() for the UUID primary keys of CLAUDE.md §Database
--               conventions. Postgres 13+ also exposes it from core, but naming the
--               extension keeps the dependency explicit rather than version-implied.
-- btree_gist    required by the assignment-overlap exclusion constraint of CR03
--               (docs/00-PLAN.md §Phase 2). Core Postgres ships no GiST operator class
--               for uuid, so an EXCLUDE combining `=` on a uuid column with `&&` on a
--               range does not compile without it.
--
-- Both are idempotent, so re-running this migration against a partially built database
-- is safe. Nothing here creates a table: the shared kernel is Phase 0.3.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
