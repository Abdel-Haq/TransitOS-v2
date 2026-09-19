import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensToCss } from '../tokens/css.js';
import { verifyContrast, verifyNonTextFillBand } from '../verify-contrast.js';

/**
 * Runs as part of `pnpm --filter @dc/ui build`.
 *
 * `docs/00-PLAN.md` Phase 0.5(a) — *"A contrast unit test asserts every status pair ≥ 4.5
 * and every control boundary ≥ 3.0 and **fails the build**."* A test that only runs under
 * `pnpm test` is not a build gate; this is, and it emits the stylesheet in the same pass
 * so the CSS can never be generated from tokens that did not pass.
 */
const violations = verifyContrast();
const bandWarnings = verifyNonTextFillBand();

if (violations.length > 0) {
  console.error(`\nContrast gate failed — ${violations.length} pair(s) below threshold:\n`);
  for (const v of violations) {
    console.error(`  ${v.pair}`);
    console.error(`    measured ${v.measured.toFixed(2)}, required ${v.required.toFixed(2)}`);
    console.error(`    ${v.detail}\n`);
  }
  console.error('Fix the token, or change docs/03-DESIGN-FOUNDATION.md first and say why.\n');
  process.exit(1);
}

if (bandWarnings.length > 0) {
  console.error('\nA ramp step 09 now clears AA against white:\n');
  for (const v of bandWarnings) {
    console.error(`  ${v.pair} — ${v.measured.toFixed(2)}\n  ${v.detail}\n`);
  }
  process.exit(1);
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'tokens.css');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, tokensToCss(), 'utf8');

console.log(`contrast gate passed · tokens.css written`);
