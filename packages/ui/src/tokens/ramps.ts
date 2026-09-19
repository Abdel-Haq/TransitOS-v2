/**
 * The eight colour ramps of `docs/03-DESIGN-FOUNDATION.md` §2.
 *
 * **Sparse by design.** These are the steps actually consumed — `gris` has no `07`, and
 * `ambre` has no `12`. A step is added when a use appears, not speculatively. Filling the
 * gaps "for completeness" is how a ramp becomes a gradient people interpolate along, and
 * the usage bands below stop meaning anything.
 *
 * **Usage bands** — the step says what it is *for*:
 *
 * | Steps | Band | Use |
 * |---|---|---|
 * | 01–02 | `fonds` | Page and app backgrounds |
 * | 03–05 | `composant` | Component surfaces, badge fills, hover, selected row |
 * | 06–08 | `bordures` | Borders, dividers, control outlines |
 * | 09–10 | `aplats` | **Non-text fills only** — bars, dots, meters, chart segments |
 * | 11–12 | `texte` | Text and icons |
 *
 * The break between 08 and 09 is sharp and deliberate.
 */
export const RAMPS = {
  gris: {
    '01': '#FCFCFD',
    '02': '#F9F9FB',
    '03': '#F0F0F3',
    '04': '#E8E8EC',
    '05': '#E0E1E6',
    '06': '#D9D9E0',
    '08': '#B9BBC6',
    '09': '#8B8D98',
    '10': '#80838D',
    '11': '#60646C',
    '12': '#1C2024',
  },
  /** Warm neutral for the field surface — outdoors, in daylight. */
  'gris-chaud': {
    '02': '#F4F1ED',
    '03': '#ECE8E3',
  },
  terracotta: {
    '02': '#FDF4F0',
    '03': '#FBE8E0',
    '09': '#E26B40',
    '10': '#C8501F',
    '11': '#AD4318',
  },
  vert: {
    '02': '#F4FBF7',
    '03': '#E6F7ED',
    '10': '#0F9B5A',
    '11': '#0E834C',
    '12': '#153F31',
  },
  ambre: {
    '02': '#FEFBF3',
    '03': '#FFF7E0',
    '09': '#F79009',
    '11': '#A66107',
  },
  rouge: {
    '02': '#FFF8F7',
    '03': '#FFEFED',
    '05': '#FFD3CD',
    '09': '#F04438',
    '10': '#E22E20',
    '11': '#CF1E12',
  },
  violet: {
    '03': '#F4F0FE',
    '09': '#7355EB',
    '11': '#5B3ACB',
  },
  /** Inverted field bar. One step, one use. */
  marine: {
    '11': '#172542',
  },
} as const;

export type RampName = keyof typeof RAMPS;
export type RampStep<R extends RampName> = keyof (typeof RAMPS)[R];

/** White is not a ramp step. It is the card ground and the inverted text colour. */
export const WHITE = '#FFFFFF';

/**
 * Steps 09–10 are **non-text fills only**.
 *
 * `03-DESIGN-FOUNDATION.md` §2: white against step 09 measured `ambre/09` 2.35,
 * `terracotta/09` 3.28, `gris/09` 3.30, `rouge/09` 3.76 — and `violet/09` 4.97, the one
 * step that clears AA. One passing ramp does not make step 09 safe, so filled buttons take
 * **step 11** without exception. `contrast.test.ts` holds that line.
 */
export const NON_TEXT_FILL_STEPS = ['09', '10'] as const;
