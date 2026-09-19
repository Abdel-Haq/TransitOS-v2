import { contrastRatio, NON_TEXT, ratio } from './contrast.js';
import { RAMPS, WHITE } from './tokens/ramps.js';
import { SEMANTIC, TEXT_ON_GROUND } from './tokens/semantic.js';
import { ACCENT_CHIP, STATUS_TONES, STATUS_TONE_NAMES } from './tokens/status.js';

/**
 * The contrast gate.
 *
 * `docs/03-DESIGN-FOUNDATION.md` §2 asks for exactly this, and says why: the `attention`
 * tone clears AA by **0.03**. The source system flagged that and never fixed it, and any
 * future retune of `ambre` would break it silently — a badge that still looks fine and no
 * longer is. This converts silent fragility into loud fragility, which is the point.
 *
 * It runs as part of `pnpm --filter @dc/ui build`, not only under `pnpm test`, so a token
 * change cannot reach a screen without passing through it.
 */
export interface ContrastViolation {
  readonly pair: string;
  readonly measured: number;
  readonly required: number;
  readonly detail: string;
}

export function verifyContrast(): ContrastViolation[] {
  const violations: ContrastViolation[] = [];

  const check = (pair: string, a: string, b: string, required: number, detail: string): void => {
    const measured = ratio(a, b);
    if (contrastRatio(a, b) < required) {
      violations.push({ pair, measured, required, detail });
    }
  };

  // Every status ink/fill pair ≥ 4.5. A status badge is text, and the label is not
  // optional — `CLAUDE.md` §UI, status is colour *and* label.
  for (const name of STATUS_TONE_NAMES) {
    const tone = STATUS_TONES[name];
    check(
      `statut/${name}`,
      tone.ink,
      tone.fill,
      4.5,
      `${tone.inkRef} on ${tone.fillRef} — a status badge carries a label, so it is text`,
    );
  }

  check(
    'accent/puce',
    ACCENT_CHIP.ink,
    ACCENT_CHIP.fill,
    4.5,
    `${ACCENT_CHIP.inkRef} on ${ACCENT_CHIP.fillRef} — the accent chip, separated from ` +
      `statut/info by step and shape rather than hue (ADR-007)`,
  );

  // Every text and boundary token on every ground it actually renders on.
  for (const entry of TEXT_ON_GROUND) {
    check(
      `${entry.token} on ${entry.ground}`,
      SEMANTIC[entry.token].value,
      SEMANTIC[entry.ground].value,
      entry.threshold,
      `${SEMANTIC[entry.token].ref} on ${SEMANTIC[entry.ground].ref} — ${SEMANTIC[entry.token].use}`,
    );
  }

  // The control boundary of WCAG 1.4.11, stated as its own check because it is the
  // defect this design system was carried over to fix: the source shipped a filled
  // field with no border at 1.22:1.
  check(
    'bordure/composant on fond/surface (WCAG 1.4.11)',
    SEMANTIC['bordure/composant'].value,
    SEMANTIC['fond/surface'].value,
    NON_TEXT,
    'an input must be perceivable at its edge',
  );

  return violations;
}

/**
 * Steps 09–10 are non-text fills. This asserts the rule rather than the ratios: if white
 * on a step-09 fill ever passes AA, someone has retuned a ramp, and the band definition
 * needs revisiting before a button starts using it.
 */
export function verifyNonTextFillBand(): ContrastViolation[] {
  const violations: ContrastViolation[] = [];
  for (const [rampName, steps] of Object.entries(RAMPS)) {
    const nine = (steps as Record<string, string>)['09'];
    if (nine === undefined) continue;
    // violet/09 is 4.97 and already clears AA — documented, and precisely why one passing
    // ramp does not make the band safe. It is excluded from the assertion, not from the
    // rule: filled buttons take step 11 without exception.
    if (rampName === 'violet') continue;
    if (contrastRatio(WHITE, nine) >= 4.5) {
      violations.push({
        pair: `white on ${rampName}/09`,
        measured: ratio(WHITE, nine),
        required: 4.5,
        detail:
          `${rampName}/09 now clears AA against white. Steps 09–10 are documented as ` +
          `non-text fills; if that is changing, change 03-DESIGN-FOUNDATION.md §2 first.`,
      });
    }
  }
  return violations;
}
