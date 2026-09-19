import type { ReactNode } from 'react';

export const metadata = {
  title: 'Dossier Clair',
  description: 'Système d’exploitation douanière pour transitaires et opérateurs RED.',
};

/**
 * French is the only released UI language — CLAUDE.md non-negotiable #9 — so `lang`
 * is set once, here, and `dir` is explicit so the logical CSS properties the design
 * foundation mandates have something to resolve against.
 *
 * The real shell, with navigation, locale and accessibility primitives, is Phase 0.6.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
