import type { SemanticTokenName } from './semantic.js';

/**
 * The five surfaces — `docs/03-DESIGN-FOUNDATION.md` §5.
 *
 * Each has a fixed frame and one ground. They share a design system, not authorization
 * assumptions (`00-shared-contract.md:31`): the same button looks the same everywhere and
 * means nothing about what the viewer may do.
 *
 * Only the staff shell is built in Phase 0.6. The other four ship with the phase that
 * first renders them: auth with FD01 (1.1), client portal with CR06 (2.4), field with
 * CR04 (3.1), public site with PL02 (5.2).
 */
export interface Surface {
  readonly ground: SemanticTokenName;
  readonly frame: string;
  /** WCAG 2.5.8 minimum, where the surface is touch-first. */
  readonly minimumTouchTarget?: number;
  readonly phase: string;
}

export const SURFACES = {
  staff: { ground: 'fond/application', frame: '1440 × 1024, 232 px rail', phase: '0.6' },
  terrain: {
    ground: 'fond/terrain',
    frame: '390 × 844',
    minimumTouchTarget: 44,
    phase: '3.1 (CR04)',
  },
  portail: { ground: 'fond/discret', frame: '1280 × 900, max-w-5xl', phase: '2.4 (CR06)' },
  auth: { ground: 'fond/discret', frame: '448 px card', phase: '1.1 (FD01)' },
  public: { ground: 'fond/surface', frame: 'full-width marketing', phase: '5.2 (PL02)' },
} as const satisfies Record<string, Surface>;

export type SurfaceName = keyof typeof SURFACES;
