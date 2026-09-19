import { RAMPS } from './ramps.js';

/**
 * Status tones — `docs/03-DESIGN-FOUNDATION.md` §2. Ink on fill, pill shape, **always with
 * a label**.
 *
 * `CLAUDE.md` §UI: *"Status is colour + label, never colour alone. Status colour comes
 * from the domain enum, never from a view."* Both halves matter. Colour alone fails for
 * the ~8% of men with a colour vision deficiency, and terracotta, ambre and rouge sit in
 * adjacent hue space and converge under protanopia and deuteranopia — so a badge without
 * text is three badges that look the same.
 *
 * `info` is terracotta, not blue. [ADR-007](../../../docs/01-DECISIONS.md#adr-007): the
 * source file had `statut/info` as terracotta on four screens and legacy azure on five,
 * and one value had to win. Terracotta was consistent on 14 of 14 accent frames.
 */
export interface StatusTone {
  readonly ink: string;
  readonly fill: string;
  readonly inkRef: string;
  readonly fillRef: string;
}

const tone = (ink: string, inkRef: string, fill: string, fillRef: string): StatusTone => ({
  ink,
  fill,
  inkRef,
  fillRef,
});

export const STATUS_TONES = {
  succès: tone(RAMPS.vert['12'], 'vert/12', RAMPS.vert['03'], 'vert/03'),
  info: tone(RAMPS.terracotta['11'], 'terracotta/11', RAMPS.terracotta['02'], 'terracotta/02'),
  violet: tone(RAMPS.violet['11'], 'violet/11', RAMPS.violet['03'], 'violet/03'),
  neutre: tone(RAMPS.gris['11'], 'gris/11', RAMPS.gris['03'], 'gris/03'),
  danger: tone(RAMPS.rouge['11'], 'rouge/11', RAMPS.rouge['03'], 'rouge/03'),
  // Clears AA by 0.03. The remedy would be a darker ink at `ambre/12`, which does not
  // exist in the ramp — and inventing a step would break this system's own rule that a
  // step is added when a use appears. So the pair stays and the contrast gate holds it:
  // retune `ambre` and the build fails loudly instead of the badge failing silently.
  attention: tone(RAMPS.ambre['11'], 'ambre/11', RAMPS.ambre['03'], 'ambre/03'),
} as const;

export type StatusToneName = keyof typeof STATUS_TONES;
export const STATUS_TONE_NAMES = Object.keys(STATUS_TONES) as readonly StatusToneName[];

/**
 * The accent chip: white on a solid terracotta fill, 5.84.
 *
 * Separated from the `info` pill by **step and shape** — ADR-007. `info` is dark ink on a
 * pale tint in a pill; the chip is white on a solid in a tag. Distinguishing them by hue
 * alone would have failed, because they are the same hue.
 */
export const ACCENT_CHIP = {
  ink: '#FFFFFF',
  fill: RAMPS.terracotta['11'],
  inkRef: 'white',
  fillRef: 'terracotta/11',
} as const satisfies StatusTone;
