/**
 * The type scale — `docs/03-DESIGN-FOUNDATION.md` §3.
 *
 * **IBM Plex Sans** for prose and UI, **IBM Plex Mono** for all data, both self-hosted.
 * `CLAUDE.md` §UI calls the mono treatment *"the column alignment mechanism, not
 * decoration"*: every reference, amount, date, rate and account number renders in it, and
 * `slashed-zero` is on because `0` and `O` are genuinely confusable in a container number.
 *
 * Self-hosted is not a preference. The field surface is offline-capable, and one CDN URL
 * breaks it — `09` §5 #6, retained.
 */
export const FONT_FAMILIES = {
  sans: "'IBM Plex Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const;

export interface TypeStyle {
  readonly family: 'sans' | 'mono';
  /** px */
  readonly size: number;
  /** px */
  readonly lineHeight: number;
  readonly weight: 400 | 500 | 600;
  /** px */
  readonly tracking: number;
}

const s = (
  family: 'sans' | 'mono',
  size: number,
  lineHeight: number,
  weight: 400 | 500 | 600,
  tracking = 0,
): TypeStyle => ({ family, size, lineHeight, weight, tracking });

export const TYPE_SCALE = {
  'Titre/03': s('sans', 16, 24, 600),
  'Titre/04': s('sans', 18, 26, 600),
  'Titre/05': s('sans', 20, 28, 600),
  'Titre/06': s('sans', 24, 32, 600),
  'Titre/07': s('sans', 28, 36, 600),
  'Titre/08': s('sans', 32, 40, 600),

  'Corps/01': s('sans', 12, 18, 400),
  'Corps/01-accent': s('sans', 12, 18, 500),
  /** Body. 14 px — the product is read for hours. */
  'Corps/02': s('sans', 14, 20, 400, 0.16),
  'Corps/02-accent': s('sans', 14, 20, 500, 0.16),
  'Corps/03': s('sans', 16, 24, 400),
  'Corps/01-terrain': s('sans', 13, 18, 400),

  /** Uppercase micro-labels only — the one place 11 px is permitted. */
  'Étiquette/01': s('sans', 11, 16, 600, 0.6),
  'Étiquette/02': s('sans', 12, 18, 600, 0.5),

  'Donnée/01': s('mono', 12, 18, 400),
  'Donnée/02': s('mono', 14, 20, 400),
  'Donnée/03': s('mono', 24, 32, 600),
  'Donnée/04': s('mono', 32, 40, 600),
} as const;

export type TypeToken = keyof typeof TYPE_SCALE;
export const TYPE_TOKENS = Object.keys(TYPE_SCALE) as readonly TypeToken[];

export const BODY_TOKEN: TypeToken = 'Corps/02';

/**
 * The floor. 12 px for anything read as prose; `Étiquette/01` at 11 px is the documented
 * exception for uppercase micro-labels, where the caps height carries the size.
 */
export const MINIMUM_PROSE_SIZE = 12;
export const MICRO_LABEL_EXCEPTIONS: readonly TypeToken[] = ['Étiquette/01'];
