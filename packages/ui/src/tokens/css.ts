import { ELEVATION, RADIUS, SPACE, STROKE } from './space.js';
import { SEMANTIC, SEMANTIC_NAMES } from './semantic.js';
import { STATUS_TONES, STATUS_TONE_NAMES, ACCENT_CHIP } from './status.js';
import { FONT_FAMILIES, TYPE_SCALE, TYPE_TOKENS } from './type.js';

/**
 * The tokens as CSS custom properties.
 *
 * Generated rather than hand-maintained: a stylesheet and a TypeScript object that drift
 * apart is the same class of defect as the duplicate token names this system was carried
 * over to fix, just one layer down.
 *
 * Names are ASCII-slugged — `texte/fort` becomes `--dc-texte-fort`, `fond/inversé` becomes
 * `--dc-fond-inverse`. The French names stay authoritative in TypeScript; CSS custom
 * property names allow the accents but tooling downstream reliably does not.
 */
const slug = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

export const cssVariableName = (name: string): string => `--dc-${slug(name)}`;

export function tokensToCss(): string {
  const lines: string[] = [
    '/* Generated from packages/ui/src/tokens. Do not edit by hand — run `pnpm --filter @dc/ui build`. */',
    ':root {',
    '  /* Colour — semantic */',
  ];

  for (const name of SEMANTIC_NAMES) {
    lines.push(`  ${cssVariableName(name)}: ${SEMANTIC[name].value}; /* ${SEMANTIC[name].ref} */`);
  }

  lines.push('', '  /* Colour — status tones (ink on fill, always with a label) */');
  for (const name of STATUS_TONE_NAMES) {
    const t = STATUS_TONES[name];
    lines.push(`  ${cssVariableName(`statut-${name}-encre`)}: ${t.ink};`);
    lines.push(`  ${cssVariableName(`statut-${name}-fond`)}: ${t.fill};`);
  }
  lines.push(`  ${cssVariableName('accent-puce-encre')}: ${ACCENT_CHIP.ink};`);
  lines.push(`  ${cssVariableName('accent-puce-fond')}: ${ACCENT_CHIP.fill};`);

  lines.push('', '  /* Type */');
  lines.push(`  ${cssVariableName('police-sans')}: ${FONT_FAMILIES.sans};`);
  lines.push(`  ${cssVariableName('police-mono')}: ${FONT_FAMILIES.mono};`);
  for (const name of TYPE_TOKENS) {
    const s = TYPE_SCALE[name];
    lines.push(
      `  ${cssVariableName(`${name}-taille`)}: ${s.size}px;`,
      `  ${cssVariableName(`${name}-interligne`)}: ${s.lineHeight}px;`,
      `  ${cssVariableName(`${name}-graisse`)}: ${s.weight};`,
    );
    if (s.tracking !== 0) {
      lines.push(`  ${cssVariableName(`${name}-approche`)}: ${s.tracking}px;`);
    }
  }

  lines.push('', '  /* Space, radius, stroke */');
  for (const [step, px] of Object.entries(SPACE)) lines.push(`  --dc-espace-${step}: ${px}px;`);
  for (const [name, px] of Object.entries(RADIUS)) {
    lines.push(`  ${cssVariableName(`rayon-${name}`)}: ${px}px;`);
  }
  for (const [name, px] of Object.entries(STROKE)) {
    lines.push(`  ${cssVariableName(`trait-${name}`)}: ${px}px;`);
  }

  lines.push('', '  /* Elevation */');
  for (const [name, shadow] of Object.entries(ELEVATION)) {
    lines.push(`  ${cssVariableName(name)}: ${shadow};`);
  }

  lines.push('}', '');

  // `prefers-reduced-motion` is non-negotiable #10 of the source brief, adopted in
  // ADR-009. It lives with the tokens because it is a system-wide default, not a
  // component's decision to make.
  lines.push(
    '@media (prefers-reduced-motion: reduce) {',
    '  *, *::before, *::after {',
    '    animation-duration: 0.01ms !important;',
    '    animation-iteration-count: 1 !important;',
    '    transition-duration: 0.01ms !important;',
    '    scroll-behavior: auto !important;',
    '  }',
    '}',
    '',
  );

  return lines.join('\n');
}
