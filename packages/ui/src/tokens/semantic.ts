import { RAMPS, WHITE } from './ramps.js';

/**
 * Semantic tokens — `docs/03-DESIGN-FOUNDATION.md` §2.
 *
 * **Every token is single-valued.** That is the whole point of this file. The source
 * design system had 17 of 22 token names resolving to more than one value — the same
 * `fond/application` was `#f0f0f3` on the dashboard and `#fcfcfd` on thirteen other
 * frames — so a screen could not be built from tokens without checking what the last
 * screen did. Here a name maps to exactly one ramp step, and `tokens.test.ts` asserts the
 * hex still matches the step it claims, so a hand-edited value cannot drift from its ramp.
 *
 * `ref` is not decoration: it is what makes the token auditable. A raw hex here would be
 * a value with no provenance.
 */
export interface SemanticToken {
  readonly value: string;
  /** `ramp/step`, or `white`. The source of truth for the value. */
  readonly ref: string;
  readonly use: string;
}

const t = (value: string, ref: string, use: string): SemanticToken => ({ value, ref, use });

export const SEMANTIC = {
  // --- Grounds -----------------------------------------------------------------------
  // gris/03, not gris/01. The carried-over value sat 1.03 from the white card it holds —
  // below perceptual threshold, so a card did not read as a plane, it read as the page.
  // See [ADR-011](../../../docs/01-DECISIONS.md#adr-011).
  'fond/application': t(RAMPS.gris['03'], 'gris/03', 'page ground'),
  'fond/surface': t(WHITE, 'white', 'cards'),
  'fond/composant': t(RAMPS.gris['04'], 'gris/04', 'inset surfaces, table stripes'),
  'fond/discret': t(RAMPS.gris['02'], 'gris/02', 'client portal and auth ground'),
  'fond/inversé': t(RAMPS.gris['12'], 'gris/12', 'primary action, projection panels'),
  'fond/terrain': t(RAMPS['gris-chaud']['03'], 'gris-chaud/03', 'field ground'),
  'fond/terrain-inversé': t(RAMPS.marine['11'], 'marine/11', 'field app bar'),

  // --- Text and icons ----------------------------------------------------------------
  'texte/fort': t(RAMPS.gris['12'], 'gris/12', 'body and headings'),
  'texte/faible': t(RAMPS.gris['11'], 'gris/11', 'secondary text'),
  'texte/inversé': t(WHITE, 'white', 'text on fond/inversé'),
  'icône/forte': t(RAMPS.gris['12'], 'gris/12', 'actionable icons'),
  // gris/10, not gris/09: 09 measures 2.90 on gris/03 and 2.70 on gris/04, both below
  // the 3.0 of WCAG 1.4.11. The source system used 09 and failed on every inset surface.
  'icône/discrète': t(RAMPS.gris['10'], 'gris/10', 'non-actionable icons'),

  // --- Boundaries --------------------------------------------------------------------
  // The control boundary. An input must be perceivable at its edge — the source system
  // used a filled surface with no border at 1.22:1 and called it a field.
  // The stroke ladder. One weight used everywhere is what reads as flat, whatever that
  // weight is — depth comes from hierarchy between strokes, not from thickness.
  //
  // gris/10, not gris/09. A control sits on the card *or* on the page, and gris/09 is
  // 3.30 on white but only 2.90 on the gris/03 page — under the 3.0 of WCAG 1.4.11. The
  // boundary has to clear its threshold on every ground it can touch, which is what
  // `verify-contrast` now checks.
  'bordure/composant': t(RAMPS.gris['10'], 'gris/10', 'control outlines — the boundary'),
  'bordure/structure': t(RAMPS.gris['08'], 'gris/08', 'header baselines, section dividers'),
  'bordure/discrète': t(RAMPS.gris['06'], 'gris/06', 'hairlines inside a plane'),

  // --- Accent ------------------------------------------------------------------------
  'accent/aplat': t(RAMPS.terracotta['10'], 'terracotta/10', 'non-text fills'),
  'accent/texte': t(RAMPS.terracotta['11'], 'terracotta/11', 'links, selection, accent text'),
} as const;

export type SemanticTokenName = keyof typeof SEMANTIC;

export const SEMANTIC_NAMES = Object.keys(SEMANTIC) as readonly SemanticTokenName[];

export const token = (name: SemanticTokenName): string => SEMANTIC[name].value;

/**
 * Grounds a token may legitimately sit on, for the contrast gate.
 *
 * Not every token appears on every ground: `icône/discrète` is checked against the three
 * surfaces it actually renders on, because checking it against `fond/inversé` would fail a
 * pairing nothing produces.
 */
/** Grounds a control can sit on. A boundary must clear 1.4.11 against every one of them. */
export const CONTROL_GROUNDS: readonly SemanticTokenName[] = [
  'fond/surface',
  'fond/application',
  'fond/discret',
  'fond/composant',
];

export const TEXT_ON_GROUND: readonly {
  readonly token: SemanticTokenName;
  readonly ground: SemanticTokenName;
  readonly threshold: number;
}[] = [
  { token: 'texte/fort', ground: 'fond/surface', threshold: 4.5 },
  { token: 'texte/fort', ground: 'fond/application', threshold: 4.5 },
  { token: 'texte/fort', ground: 'fond/composant', threshold: 4.5 },
  { token: 'texte/fort', ground: 'fond/discret', threshold: 4.5 },
  { token: 'texte/faible', ground: 'fond/surface', threshold: 4.5 },
  { token: 'texte/faible', ground: 'fond/application', threshold: 4.5 },
  { token: 'texte/inversé', ground: 'fond/inversé', threshold: 4.5 },
  { token: 'texte/inversé', ground: 'fond/terrain-inversé', threshold: 4.5 },
  { token: 'accent/texte', ground: 'fond/surface', threshold: 4.5 },
  { token: 'accent/texte', ground: 'fond/application', threshold: 4.5 },
  { token: 'icône/forte', ground: 'fond/surface', threshold: 4.5 },
  // Icons are non-text under WCAG 1.4.11, so 3.0 is the bar, not 4.5.
  { token: 'icône/discrète', ground: 'fond/surface', threshold: 3.0 },
  { token: 'icône/discrète', ground: 'fond/application', threshold: 3.0 },
  { token: 'icône/discrète', ground: 'fond/composant', threshold: 3.0 },
  // bordure/composant is checked against every control ground by `verify-contrast`;
  // these two are listed for the specimen table.
  { token: 'bordure/composant', ground: 'fond/surface', threshold: 3.0 },
  { token: 'bordure/composant', ground: 'fond/application', threshold: 3.0 },
];
