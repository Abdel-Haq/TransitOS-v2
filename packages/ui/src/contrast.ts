/**
 * WCAG 2.x relative luminance and contrast ratio.
 *
 * Implemented here rather than pulled from a package for one reason: this is the function
 * the build gate depends on, and a dependency that silently changes its rounding changes
 * which token pairs pass. It is fifteen lines from the specification.
 *
 * https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 * https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */

const CHANNEL = /^#([0-9a-fA-F]{6})$/;

export class ColourError extends Error {}

export const channels = (hex: string): [number, number, number] => {
  const match = CHANNEL.exec(hex);
  if (match === null) throw new ColourError(`Expected a six-digit hex colour, got "${hex}"`);
  const value = match[1]!;
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
};

/** Relative luminance, 0 (black) to 1 (white). */
export const relativeLuminance = (hex: string): number => {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Contrast ratio, 1 to 21. Order-independent. */
export const contrastRatio = (a: string, b: string): number => {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * WCAG 2.2 thresholds this product holds itself to.
 *
 * `AA_TEXT` is 1.4.3 for normal-size text. `NON_TEXT` is 1.4.11, which governs the
 * boundary of a control — `CLAUDE.md` §UI requires an input's edge to be perceivable, and
 * an unbordered filled field at 1.22:1 was the defect this design system was carried over
 * to fix.
 */
export const AA_TEXT = 4.5;
export const AA_LARGE_TEXT = 3.0;
export const NON_TEXT = 3.0;

/**
 * Rounded to two places, the way `03-DESIGN-FOUNDATION.md` quotes ratios.
 *
 * The repository bans `Math.round` — rounding comes from reviewed `CurrencyPolicy`, never
 * from a default (`CLAUDE.md` non-negotiable #3), and the ESLint rule is deliberately
 * blunt so it fires here. This is the documented exception: a contrast ratio is a
 * dimensionless display figure, not a monetary or quantity value, and nothing downstream
 * computes from the rounded number. The gate itself compares the **unrounded**
 * `contrastRatio`, so a pair at 4.4999 fails rather than rounding up to a pass.
 */
// eslint-disable-next-line no-restricted-properties -- display rounding of a contrast ratio; see above
export const ratio = (a: string, b: string): number => Math.round(contrastRatio(a, b) * 100) / 100;
