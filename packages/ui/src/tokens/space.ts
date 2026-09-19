/**
 * Space, radius, stroke and elevation — `docs/03-DESIGN-FOUNDATION.md` §4.
 */
export const SPACE = {
  '01': 2,
  '02': 4,
  '03': 6,
  '04': 8,
  '05': 12,
  '06': 16,
  '07': 20,
  '08': 24,
} as const;

export const RADIUS = {
  xs: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  pilule: 999,
} as const;

export const STROKE = {
  fin: 1,
  accent: 2,
} as const;

/**
 * Three tiers, all two-layer.
 *
 * The source documentation insisted on "no shadow"; the file shipped all three and they
 * read well. The file was right — `03-DESIGN-FOUNDATION.md` §4.
 */
export const ELEVATION = {
  'Élévation/01 · surface': '0 1px 2px #1C21260D',
  'Élévation/app · tuile': '0 1px 2px #1C20240A, 0 6px 16px -4px #1C20240D',
  'Élévation/terrain · carte': '0 1px 2px #1C20240F, 0 4px 12px #1C20240A',
} as const;

export type SpaceStep = keyof typeof SPACE;
export type RadiusToken = keyof typeof RADIUS;
export type ElevationToken = keyof typeof ELEVATION;

/** `03-DESIGN-FOUNDATION.md` §5 — the field surface, and WCAG 2.5.8. */
export const MINIMUM_TOUCH_TARGET = 44;
