/**
 * `packages/ui` — the design foundation, carried over with its defects fixed.
 *
 * Phase 0.5(a): tokens, type scale and elevation, every token single-valued.
 * Phase 0.5(b) adds the primitives Phase 1–2 consumes; 0.5(c) the chart sequence.
 *
 * `docs/03-DESIGN-FOUNDATION.md` is the prose; this package is the enforcement.
 */
export { RAMPS, WHITE, NON_TEXT_FILL_STEPS, type RampName } from './tokens/ramps.js';
export {
  SEMANTIC,
  SEMANTIC_NAMES,
  TEXT_ON_GROUND,
  token,
  type SemanticToken,
  type SemanticTokenName,
} from './tokens/semantic.js';
export {
  STATUS_TONES,
  STATUS_TONE_NAMES,
  ACCENT_CHIP,
  type StatusTone,
  type StatusToneName,
} from './tokens/status.js';
export {
  FONT_FAMILIES,
  TYPE_SCALE,
  TYPE_TOKENS,
  BODY_TOKEN,
  MINIMUM_PROSE_SIZE,
  MICRO_LABEL_EXCEPTIONS,
  type TypeStyle,
  type TypeToken,
} from './tokens/type.js';
export {
  SPACE,
  RADIUS,
  STROKE,
  ELEVATION,
  MINIMUM_TOUCH_TARGET,
  type SpaceStep,
  type RadiusToken,
  type ElevationToken,
} from './tokens/space.js';
export { SURFACES, type Surface, type SurfaceName } from './tokens/surfaces.js';
export { tokensToCss, cssVariableName } from './tokens/css.js';
export {
  contrastRatio,
  relativeLuminance,
  ratio,
  channels,
  ColourError,
  AA_TEXT,
  AA_LARGE_TEXT,
  NON_TEXT,
} from './contrast.js';
export { verifyContrast, type ContrastViolation } from './verify-contrast.js';
