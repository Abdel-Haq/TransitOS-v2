import { contrastRatio, NON_TEXT, ratio } from './contrast.js';
import { RAMPS, WHITE } from './tokens/ramps.js';
import { CONTROL_GROUNDS, SEMANTIC, TEXT_ON_GROUND } from './tokens/semantic.js';
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

  // The control boundary of WCAG 1.4.11, against **every ground a control can sit on**.
  //
  // Checking it against white alone is how the ground and the boundary drifted apart:
  // gris/09 measures 3.30 on white and 2.90 on a gris/03 page, so darkening the page
  // silently pushed every filter chip and input on it under threshold. A boundary is only
  // as good as its worst adjacent surface.
  for (const ground of CONTROL_GROUNDS) {
    check(
      `bordure/composant on ${ground} (WCAG 1.4.11)`,
      SEMANTIC['bordure/composant'].value,
      SEMANTIC[ground].value,
      NON_TEXT,
      'an input must be perceivable at its edge, on whichever surface it sits',
    );
  }

  // The structural stroke is a divider, not a control boundary, so 1.4.11 does not apply
  // to it — but it must stay distinguishable from the hairline, or the ladder collapses
  // back into the one-weight-everywhere flatness it exists to prevent.
  const hairline = ratio(SEMANTIC['bordure/discrète'].value, SEMANTIC['fond/surface'].value);
  const structural = ratio(SEMANTIC['bordure/structure'].value, SEMANTIC['fond/surface'].value);
  if (structural / hairline < 1.25) {
    violations.push({
      pair: 'bordure/structure against bordure/discrète',
      measured: structural,
      required: hairline * 1.25,
      detail:
        'the structural stroke is too close to the hairline to read as a different weight; ' +
        'three strokes that look alike are one stroke used three times',
    });
  }

  // A card must read as a plane sitting on the page. Below roughly 1.1 it does not — the
  // carried-over pair was 1.03, which is the flatness this ladder exists to fix.
  const cardOnPage = ratio(SEMANTIC['fond/surface'].value, SEMANTIC['fond/application'].value);
  if (cardOnPage < 1.1) {
    violations.push({
      pair: 'fond/surface on fond/application',
      measured: cardOnPage,
      required: 1.1,
      detail:
        'a card this close to its page ground does not read as a separate plane; either ' +
        'separate them by value or commit to the stroke ladder and say so in the document',
    });
  }

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
