import { describe, expect, it } from 'vitest';
import { contrastRatio, ratio, relativeLuminance, ColourError, channels } from './contrast.js';
import { RAMPS, WHITE } from './tokens/ramps.js';
import { SEMANTIC, SEMANTIC_NAMES, TEXT_ON_GROUND, CONTROL_GROUNDS } from './tokens/semantic.js';
import { ACCENT_CHIP, STATUS_TONES, STATUS_TONE_NAMES } from './tokens/status.js';
import {
  TYPE_SCALE,
  TYPE_TOKENS,
  MICRO_LABEL_EXCEPTIONS,
  MINIMUM_PROSE_SIZE,
  BODY_TOKEN,
} from './tokens/type.js';
import { ELEVATION } from './tokens/space.js';
import { SURFACES } from './tokens/surfaces.js';
import { tokensToCss, cssVariableName } from './tokens/css.js';
import { verifyContrast, verifyNonTextFillBand } from './verify-contrast.js';

describe('contrast maths', () => {
  it('matches the WCAG reference extremes', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#FFFFFF')).toBe(1);
    expect(ratio('#000000', '#FFFFFF')).toBe(21);
    expect(ratio('#FFFFFF', '#FFFFFF')).toBe(1);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#1C2024', WHITE)).toBeCloseTo(contrastRatio(WHITE, '#1C2024'), 10);
  });

  it('rejects anything that is not a six-digit hex', () => {
    for (const bad of ['#FFF', 'FFFFFF', '#GGGGGG', 'rebeccapurple', '']) {
      expect(() => channels(bad), bad).toThrow(ColourError);
    }
  });
});

describe('every token is single-valued', () => {
  it('resolves each semantic token to the ramp step it claims', () => {
    // The defect this system was carried over to fix: 17 of 22 token names in the source
    // resolved to more than one value, so a screen could not be built from tokens without
    // checking what the last screen did. A hand-edited hex drifting from its ref is the
    // same failure returning.
    for (const name of SEMANTIC_NAMES) {
      const { value, ref } = SEMANTIC[name];
      if (ref === 'white') {
        expect(value, name).toBe(WHITE);
        continue;
      }
      const [ramp, step] = ref.split('/') as [keyof typeof RAMPS, string];
      expect(RAMPS[ramp], `${name} → ${ref}`).toBeDefined();
      expect((RAMPS[ramp] as Record<string, string>)[step], `${name} → ${ref}`).toBe(value);
    }
  });

  it('resolves each status tone to its ramp steps', () => {
    for (const name of STATUS_TONE_NAMES) {
      const t = STATUS_TONES[name];
      for (const [value, ref] of [
        [t.ink, t.inkRef],
        [t.fill, t.fillRef],
      ]) {
        const [ramp, step] = ref!.split('/') as [keyof typeof RAMPS, string];
        expect((RAMPS[ramp] as Record<string, string>)[step], `${name} → ${ref}`).toBe(value);
      }
    }
  });

  it('uses only uppercase six-digit hex, so two spellings cannot mean one colour', () => {
    for (const steps of Object.values(RAMPS)) {
      for (const [step, hex] of Object.entries(steps)) {
        expect(hex, step).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });

  it('keeps the ramps sparse rather than complete', () => {
    // "Add a step when a use appears, not speculatively." gris has no 07 and ambre no 12,
    // and both absences are load-bearing: ambre/12 is exactly the step someone would
    // invent to fix the attention tone.
    expect('07' in RAMPS.gris).toBe(false);
    expect('12' in RAMPS.ambre).toBe(false);
    expect(Object.keys(RAMPS.marine)).toEqual(['11']);
  });
});

describe('the ratios the design document quotes', () => {
  it.each([
    ['texte/fort on white', '#1C2024', WHITE, 16.39],
    ['texte/fort on gris/01', '#1C2024', '#FCFCFD', 15.98],
    ['texte/faible on white', '#60646C', WHITE, 5.94],
    ['icône/discrète on white', '#80838D', WHITE, 3.78],
    ['icône/discrète on gris/03', '#80838D', '#F0F0F3', 3.33],
    ['icône/discrète on gris/04', '#80838D', '#E8E8EC', 3.1],
    ['bordure/composant on white', '#8B8D98', WHITE, 3.3],
    ['accent/texte on white', '#AD4318', WHITE, 5.84],
  ])('%s is %s', (_name, a, b, expected) => {
    expect(ratio(a, b)).toBe(expected);
  });

  it.each([
    ['succès', 10.57],
    ['info', 5.39],
    ['violet', 6.44],
    ['neutre', 5.22],
    ['danger', 4.89],
    ['attention', 4.53],
  ] as const)('statut/%s is %s', (name, expected) => {
    const t = STATUS_TONES[name];
    expect(ratio(t.ink, t.fill)).toBe(expected);
  });

  it('gives the accent chip 5.84, separating it from statut/info by step and shape', () => {
    // ADR-007. info is dark ink on a pale tint in a pill; the chip is white on a solid in
    // a tag. They are the same hue, so hue could never have told them apart.
    expect(ratio(ACCENT_CHIP.ink, ACCENT_CHIP.fill)).toBe(5.84);
    expect(ratio(STATUS_TONES.info.ink, STATUS_TONES.info.fill)).toBe(5.39);
  });
});

describe('the contrast gate', () => {
  it('passes on the shipped tokens', () => {
    expect(verifyContrast()).toEqual([]);
    expect(verifyNonTextFillBand()).toEqual([]);
  });

  it('covers every status tone and every documented ground pairing', () => {
    // A gate that checks three pairs and passes is worse than none: it reads like
    // coverage. Count what it actually asserts.
    expect(STATUS_TONE_NAMES.length).toBe(6);
    expect(TEXT_ON_GROUND.length).toBeGreaterThanOrEqual(16);
  });

  it('would fail if ambre were retuned by a single step', () => {
    // The whole reason the gate exists. attention clears AA by 0.03, so the next person
    // who lightens ambre/11 "slightly" breaks a badge that still looks fine.
    const retuned = '#B06A0C'; // one plausible notch lighter
    expect(ratio(retuned, RAMPS.ambre['03'])).toBeLessThan(4.5);
    expect(ratio(RAMPS.ambre['11'], RAMPS.ambre['03'])).toBeGreaterThanOrEqual(4.5);
  });

  it('holds the non-text fill band', () => {
    // Steps 09–10 carry no text. violet/09 at 4.97 is the documented exception that
    // proves it: one passing ramp does not make the band safe.
    expect(ratio(WHITE, RAMPS.violet['09'])).toBe(4.97);
    for (const [name, step] of [
      ['ambre', RAMPS.ambre['09']],
      ['terracotta', RAMPS.terracotta['09']],
      ['gris', RAMPS.gris['09']],
      ['rouge', RAMPS.rouge['09']],
    ] as const) {
      expect(ratio(WHITE, step), name).toBeLessThan(4.5);
    }
  });
});

describe('depth — ADR-011', () => {
  const r = (a: keyof typeof SEMANTIC, b: keyof typeof SEMANTIC) =>
    ratio(SEMANTIC[a].value, SEMANTIC[b].value);

  it('separates a card from the page it rests on', () => {
    // The defect that produced this section: the carried-over pair was 1.03, below
    // perceptual threshold, so a card read as the page rather than as a plane on it.
    expect(r('fond/surface', 'fond/application')).toBeGreaterThanOrEqual(1.1);
  });

  it('keeps the control boundary above 3.0 on every ground a control can sit on', () => {
    // A boundary is only as good as its worst adjacent surface. gris/09 measured 3.30 on
    // white and 2.90 on the gris/03 page — checking against white alone is how the ground
    // and the boundary drifted apart.
    for (const ground of CONTROL_GROUNDS) {
      expect(r('bordure/composant', ground), ground).toBeGreaterThanOrEqual(3.0);
    }
  });

  it('gives the stroke ladder three distinguishable weights', () => {
    const hairline = r('bordure/discrète', 'fond/surface');
    const structural = r('bordure/structure', 'fond/surface');
    const boundary = r('bordure/composant', 'fond/surface');
    expect(hairline).toBeLessThan(structural);
    expect(structural).toBeLessThan(boundary);
    // Three strokes that look alike are one stroke used three times.
    expect(structural / hairline).toBeGreaterThanOrEqual(1.25);
    expect(boundary / structural).toBeGreaterThanOrEqual(1.25);
  });

  it('ships three elevation tiers, all two-layer or single-layer but never none', () => {
    expect(Object.keys(ELEVATION)).toHaveLength(3);
    for (const [name, shadow] of Object.entries(ELEVATION)) {
      expect(shadow, name).toMatch(/px/);
    }
  });
});

describe('type scale', () => {
  it('keeps every prose size at or above the 12 px floor', () => {
    for (const name of TYPE_TOKENS) {
      if (MICRO_LABEL_EXCEPTIONS.includes(name)) continue;
      expect(TYPE_SCALE[name].size, name).toBeGreaterThanOrEqual(MINIMUM_PROSE_SIZE);
    }
  });

  it('documents the one 11 px exception rather than hiding it', () => {
    expect(TYPE_SCALE['Étiquette/01'].size).toBe(11);
    expect(MICRO_LABEL_EXCEPTIONS).toEqual(['Étiquette/01']);
  });

  it('sets body at 14 px', () => {
    expect(TYPE_SCALE[BODY_TOKEN].size).toBe(14);
  });

  it('gives every style a line height greater than its size', () => {
    for (const name of TYPE_TOKENS) {
      const s = TYPE_SCALE[name];
      expect(s.lineHeight, name).toBeGreaterThan(s.size);
    }
  });

  it('renders every data token in mono', () => {
    // The column alignment mechanism, not decoration — CLAUDE.md §UI.
    for (const name of TYPE_TOKENS) {
      const expected = name.startsWith('Donnée/') ? 'mono' : 'sans';
      expect(TYPE_SCALE[name].family, name).toBe(expected);
    }
  });
});

describe('surfaces', () => {
  it('gives each of the five a ground that is a real token', () => {
    expect(Object.keys(SURFACES)).toHaveLength(5);
    for (const [name, surface] of Object.entries(SURFACES)) {
      expect(SEMANTIC_NAMES, name).toContain(surface.ground);
    }
  });

  it('puts the 44 px touch minimum on the field surface', () => {
    expect(SURFACES.terrain.minimumTouchTarget).toBe(44);
  });
});

describe('generated CSS', () => {
  const css = tokensToCss();

  it('emits every semantic token', () => {
    for (const name of SEMANTIC_NAMES) {
      expect(css, name).toContain(`${cssVariableName(name)}: ${SEMANTIC[name].value};`);
    }
  });

  it('slugs accented French names to ASCII', () => {
    // The French names stay authoritative in TypeScript; downstream tooling is reliably
    // worse at accented custom property names than the spec says it should be.
    expect(cssVariableName('fond/inversé')).toBe('--dc-fond-inverse');
    expect(cssVariableName('icône/discrète')).toBe('--dc-icone-discrete');
    expect(cssVariableName('Élévation/01 · surface')).toBe('--dc-elevation-01-surface');
    expect(css).not.toMatch(/--dc-[a-z0-9-]*[éèêàçôûï]/);
  });

  it('carries the prefers-reduced-motion default', () => {
    // Non-negotiable #10 of the source brief, adopted in ADR-009. A system-wide default,
    // not a decision each component gets to make.
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('never emits a colour that is not in a ramp', () => {
    const known = new Set<string>([WHITE]);
    for (const steps of Object.values(RAMPS))
      for (const hex of Object.values(steps)) known.add(hex);
    for (const hex of css.match(/#[0-9A-F]{6}(?![0-9A-F])/g) ?? []) {
      expect(known, hex).toContain(hex);
    }
  });
});
