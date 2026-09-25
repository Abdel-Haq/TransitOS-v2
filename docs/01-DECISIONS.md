# Decisions

Adversarial binary review of `dossier-clair-project-specs` passed 14 of 22 criteria. The
specs are unusually disciplined — the security, authorization, evidence and edge-case design
is genuinely strong and is adopted wholesale. These ADRs record every place where the plan
**departs from** or **resolves** the specs.

Which review finding each ADR answers:

| Finding | Answered by |
|---|---|
| `correct-order` | ADR-001 |
| separation of duty (no criterion covered it) | ADR-002 |
| `types-consistent` | ADR-003 |
| `no-hacky-shortcuts` | ADR-004 |
| `no-placeholders` | ADR-005 |
| `req-coverage` | ADR-006 |
| `follows-patterns` | ADR-006, ADR-007 |
| `no-overengineering` | ADR-008 |
| `boundaries-respected` | ADR-009 |
| build order revisited after 0.5(a) | ADR-010 |
| first screen reads flat | ADR-011 |

Each decision is dated, has a stated rationale, and can be superseded by a later ADR.

---

<a id="adr-001"></a>

## ADR-001 — The UI foundation ships in Phase 0, not as polish

**Status:** accepted · 2026-09-18
**Defect:** `correct-order`

`17-PL01-ux.md:5` sizes the accessible French experience as *"Polish; L. Depends on
CR01/CR03/CR06."* Those three modules specify 9, 6 and 10 screens respectively. The module
that defines density, error placement, focus behaviour, required-field marking and the
disclosure model is scheduled **after** 25 screens that need all of it.

The specs defend this with *"Basic accessibility/responsiveness is required from
foundation"* — but no foundation-level UI contract exists anywhere in the 25 files. It is a
pointer to nothing.

**Decision.** Extract a foundation UI contract into Phase 0 (items 0.5 and 0.6): tokens,
type scale, spacing, elevation, density model, form and error patterns, the state matrix,
and a **review-state component** covering `draft / submitted / approved / rejected /
changes_requested / stale` plus the seven external states — which can co-occur on one row
and have no component anywhere in the specs. PL01 retains only saved views, preferences and
offline draft sync (Phase 5.1).

**Consequence.** Phase 0 is larger. Every subsequent screen is faster and consistent by
construction rather than by retrofit.

---

<a id="adr-002"></a>

## ADR-002 — Approval policy is a configured mode, and solo mode cannot reach production

**Status:** accepted · 2026-09-18
**Defect:** raised in review; no criterion covered it

`00-shared-contract.md` requires that a submitter cannot approve their own controlled
action, across ~6 reviewer capabilities: `finance_operator` drafts an invoice and
`finance_reviewer` issues it; `red_operator` proposes and `red_reviewer` posts; privileged
grant changes need *"a different authorized approver"* (`00-shared-contract.md:64`) who is
*"a different `access_admin`"* (`01-FD01-identity.md:14`).

Two problems. One person cannot develop against this. And at a six-person Moroccan
*transitaire* — the stated target customer — one person genuinely holds three of those
roles, so **as specified, v1 cannot issue an invoice at a firm with one accountant.** The
specs anticipate combined bundles but the block still fires, and the escape hatch is
deferred: *"An alternative policy is assumption to verify and is not implemented as an ad
hoc override."*

**Decision.** Make the approval policy an explicit, versioned, named mode in the policy
register rather than a hard-coded rule:

| Mode | Behaviour | Where allowed |
|---|---|---|
| `independent_reviewer` | Spec default. Submitter ≠ approver, enforced per action family. | Any environment. The production default. |
| `dev_single_approver` | Submitter may approve. Every such approval is stamped `self_approved: true` in `ApprovalDecision` and surfaced in the audit export. | Local + CI **only**. Startup readiness check fails if set in production. |
| `small_org_documented` | Submitter may approve a named subset of action families, requiring a recorded reason and producing a flagged decision. Subset and eligibility are an approved policy value. | Production **only** once a named approver has approved the policy version. Not implemented until a real customer needs it. |

**Consequence.** Development is unblocked immediately. The production question stays
visible as a policy key rather than being silently solved by a developer. `self_approved`
is queryable, so nobody can later claim the separation held when it did not.

---

<a id="adr-003"></a>

## ADR-003 — `Quantity` is used in the ledger, not decomposed

**Status:** accepted · 2026-09-18
**Defect:** `types-consistent`

The shared dictionary defines `Quantity | {value: Decimal, unit_id: Unit.id}`. Three
entities then split it into loose sibling fields:

- `07-CR04-red.md:30` — `RedLedgerEntry | …,delta_quantity:Decimal,unit_id,…`
- `07-CR04-red.md:31` — `CoveragePosting | …,delta_output_quantity:Decimal,unit_id,…`
- `13-DF03-production.md:23` — `MaterialVariance | …,unit_id,expected_consumption?:Decimal,
  observed_consumption?:Decimal,linked_customs_consumption?:Decimal,variance?:Decimal` —
  **four Decimals sharing one loose `unit_id`**

These are immutable customs ledger rows. A unit mismatch here is exactly what the
`Quantity` type exists to prevent, and it becomes unauditable after posting.

**Decision.** `Quantity` is the type at every service and API boundary, in all three cases —
no exceptions, including `MaterialVariance`, whose four measures each become their own
`Quantity` (`expected?`, `observed?`, `linked_customs?`, `variance?`). One shared `unit_id`
across four unrelated measures is not a layout detail; it is the defect.

Physically, `RedLedgerEntry` and `CoveragePosting` may keep `(delta_quantity, unit_id)` as
separate columns for index and aggregation reasons, under two conditions: a CHECK constraint
binds `unit_id` to the referenced `ImportLot`'s unit, and nothing outside the repository
layer ever sees the decomposed form. This is a storage representation, not a type.

> `CLAUDE.md` non-negotiable #3 states the rule in its absolute form — *never decompose* —
> because that is the form every session should internalise. This ADR is the single
> documented exception, and it is a physical-column exception only.

---

<a id="adr-004"></a>

## ADR-004 — Terrain gets a first-party session refresh

**Status:** accepted · 2026-09-18
**Defect:** `no-hacky-shortcuts`

`01-FD01-identity.md` specifies *"Provider-hosted branded French forms"* at `/connexion`
with Google/Microsoft brokering, and Keycloak owning recovery. `17-PL01-ux.md` then
requires *"Sync requires fresh authenticated session"*.

A Keycloak-hosted login page is a cross-origin document load. The field-agent surface is
used at a port, on a dropped connection, by someone whose session has just expired — which
is precisely when a cross-origin redirect cannot load. The specs never acknowledge the
collision.

**Decision.**
1. Keycloak remains the credential authority. No custom password storage. Unchanged.
2. The API holds refresh tokens server-side and exposes a **same-origin** refresh endpoint.
   A field agent with a valid application session never needs a cross-origin document load
   to keep working.
3. Application session lifetime for the field surface is a separate policy key from the
   staff surface, and is deliberately longer.
4. When the session cannot be refreshed offline, the UI states it plainly:
   `Session expirée — reconnexion nécessaire dès le retour du réseau.` Queued drafts are
   **retained**, never silently discarded, and never synced under an unauthenticated session.
5. No offline capture claims to be verified. A queued field observation is evidence
   awaiting review, exactly as the specs require.

---

<a id="adr-005"></a>

## ADR-005 — The assumption register splits into two lists

**Status:** accepted · 2026-09-18
**Defect:** `no-placeholders`

**49 `assumption to verify` markers on actual values**, across the 21 numbered spec files,
covering roughly 110 enumerated values. `grep -o -i` returns 99 occurrences in total: 49 in
the numbered specs, 49 duplicates in `dossier-clair-implementation-specifications.md` (a
consolidated copy of those same files), and 1 in `specs/README.md`, which *defines* the
convention rather than marking a value. So: 99 raw → 50 unique → **49 on values**. The ~110
figure is a hand count of the values named behind those 49, and moves by ±7 depending on
whether compound phrases like *"duties/tax/valuation"* count as one unknown or three.
(Counted 2026-09-18, recounted 2026-09-19; an earlier figure of 99 in this plan was the raw
occurrence count.) The mechanism is honest and well built —
`PolicyRequirement(key, scope_module, label_fr, schema, status, value?, …)` with
`unresolved/proposed/approved/superseded` and defined fail-closed behaviour. But it mixes
two very different kinds of unknown, and treating them alike blocks day-one work for no
reason.

**Decision.** Split the register on ownership:

**List A — engineering-decidable now.** Decide at bootstrap, record as an
approved policy version with `source: engineering_default`, move on. Examples: list
page-size default and maximum, job retry/backoff/lease durations, upload size limits,
archive expansion limits, rate-limit values for synthetic testing, request timeouts,
pagination cursor limits, search query limits.

**List B — genuinely external.** Needs a qualified regulatory reviewer, finance
reviewer, commercial reviewer, security/privacy owner or service owner. Stays `unresolved`.
Blocks activation of the affected capability, exactly as specified. Examples: supported
regimes and document applicability, duties/tax/valuation, invoice numbering and tax rules,
carrier free time and tier rates, BOM yields and permitted exception treatment, retention
durations, CNDP transfer formalities, all NFR targets.

The per-item classification is **not yet done** — it is Phase 0 deliverable 0.9, producing
`docs/04-POLICY-REGISTER.md`. Until that exists, treat the A/B division as a method, not a
finding, and do not quote a ratio.

**Consequence.** List B has the longest lead time in the whole project and nothing in
Phase 3 activates without it. Start chasing it in week one, not when the code is ready.

---

<a id="adr-006"></a>

## ADR-006 — The TransitOS design foundation carries over; its defects do not

**Status:** accepted · 2026-09-18
**Basis:** user decision, 2026-09-18

The TransitOS Figma file scored 10/22 on the same review. But the failures were almost all
*bookkeeping* — duplicate variable bindings, no components page, stale frames — not taste.
The foundation underneath is good and was expensive to produce: a terracotta accent system,
a properly named IBM Plex scale with line-heights and tracking, a three-tier elevation
system, a status→tone contract, and a ~40-component vocabulary.

**Decision.** Port the foundation into `packages/ui` in Phase 0. Rebuild all screens against
the new information architecture. Fix on the way in — full detail in
[03-DESIGN-FOUNDATION.md](03-DESIGN-FOUNDATION.md):

- Every token single-valued. The source file had 17 duplicated names and 22 redundant
  variables, and it shipped: `fond/application` rendered `#f0f0f3` on one screen and
  `#fcfcfd` on thirteen others, and `statut/info` rendered terracotta on four screens and
  azure on five.
- `Champ` gets one boundary strategy: the **bordered** treatment at `gris/09` `#8B8D98`
  (3.30:1 on white). The filled variant measured **1.22:1** and is dropped.
- `icône/discrète` moves to `gris/10` `#80838D` — 3.78 on white, 3.33 on `gris/03`,
  3.10 on `gris/04`. Clears 3:1 on every surface in the system; `gris/09` did not.
- Required fields are marked on the label. The source design marked none, and carried a
  hard validation rule in a prose side panel instead.
- Light chrome is adopted deliberately and the old "dark chrome" rationale is retired. The
  inverted surface `#1c2024` is retained for the primary action and for live-vs-frozen
  projection panels, which is what that convention was actually protecting.

---

<a id="adr-007"></a>

## ADR-007 — `info` is terracotta, separated from `accent` by step and shape

**Status:** accepted · 2026-09-18
**Basis:** user decision, 2026-09-18

In the source file `statut/info-*` resolved two ways, and the terracotta resolution was
**byte-identical** to the accent: `statut/info-encre #ad4318 == accent/texte #ad4318`, and
`statut/info-fond #fbe8e0 == accent/fond #fbe8e0`. An info badge and an accent chip were
the same pixels.

Terracotta is chosen for `info`. Since the new system owns both tokens, the collision is
resolved rather than inherited:

| Role | Ink | Fill | Shape | Contrast |
|---|---|---|---|---|
| `statut/info` — a *state* | `terracotta/11` `#AD4318` | `terracotta/02` `#FDF4F0` | pill (`rayon/pilule`) | **5.39** ✓ |
| `accent` chip — an *action or selection* | `base/blanc` `#FFFFFF` | `terracotta/11` `#AD4318` solid | tag (`rayon/xs`) | **5.84** ✓ |

Tinted versus solid, plus pill versus tag. That is a much stronger separation than two
tint steps, and it maps onto the real semantic difference: a status is something the record
*is*, an accent chip is something you can *do*. Both pass AA with margin, and the info
pairing improves on the original 4.93:1.

> Rejected: `terracotta/10` `#C8501F` as chip ink on `terracotta/03` measures **3.83:1** —
> below AA for text. It is an `aplats`-band step and must not carry text, exactly as the
> source design system's own §2.3 warned.

> Note the trade this closes. Spec 08 §2.5 warned that terracotta, ambre and rouge collapse
> under protanopia. That analysis concluded the primary action must stay the **dark
> neutral**, not the brand hue — and the source design did follow that rule
> (`#1c2024`, 16.39:1). Keep it. With the primary action neutral, terracotta carries links,
> selection, info and accent, and nothing load-bearing depends on telling it apart from
> rouge by hue alone.

---

<a id="adr-008"></a>

## ADR-008 — Full scope, with named stop-points

**Status:** accepted · 2026-09-18
**Basis:** user decision, 2026-09-18, after a recorded objection
**Defect:** `no-overengineering`

The objection, recorded so it is not relitigated: 114 routes, 16 roles, 5 shells, a
deterministic RED ledger, an AI assistant and a 9-page marketing site — against a strategy
document in which **every single target-client pain is labelled `assumption to verify`**
and the evidence base is a competitor's public website. The stated differentiator is
testable in about six screens.

That objection was raised and overruled. Full scope is the plan.

**Decision.** Build all 18 modules, sequenced so that **stopping early still leaves
something coherent**:

- **Stop-point 1** — end of Phase 2. A complete customs-broker product. RED omitted from
  navigation and from every claim, as spec §19 explicitly permits.
- **Stop-point 2** — end of Phase 3. Broker + RED operator, both segments served.
- Phase 4 differentiators activate **individually**, each behind its own evidence and
  provider gate. None of them is a prerequisite for shipping.

**Consequence.** Full scope is delivered, and the two most likely failure modes — running
out of runway, and being unable to secure a qualified RED reviewer — leave a working
product rather than a half-built one.

---

<a id="adr-009"></a>

## ADR-009 — The Livewire architecture is retired, not bypassed

**Status:** accepted · 2026-09-18
**Defect:** `boundaries-respected`

Review of the specs failed `boundaries-respected` on the grounds that they replace a
documented architecture: `docs/ui-ux/02` §2 of the TransitOS repository requires
*"real `<form method="POST">` elements"* (`:61`), and `09` §5 raises both that rule (#8) and
*"Every data-changing interaction is a Livewire round-trip"* (#7) to non-negotiables. The specs mandate a
separate REST API with `Idempotency-Key` and `If-Match` ETags consumed by a Next.js client —
which does not extend that pattern, it replaces it.

The plan inherited that defect without answering it. This ADR answers it.

**Finding of fact.** The TransitOS repository contains `README.md` and `docs/ui-ux/` only —
no `composer.json`, no `package.json`, no application code. The Livewire architecture was a
**documented intention, never an implementation.** There is no dominant pattern to bypass
because there is no code.

**Decision.** Dossier Clair is a new product on the specified stack. Three non-negotiables
from `09` §5 are Livewire-specific and are formally retired:

| Retired | Why it no longer applies |
|---|---|
| #7 *"Server-rendered. Every data-changing interaction is a Livewire round-trip. No optimistic UI, no client-side store."* | Superseded by the REST contract. **The design consequence is kept**: pending states are still designed, because a round trip is still visible. |
| #8 *"Field capture forms must stay native `<form method="POST">`."* | The offline mechanism is now the draft envelope of ADR-004. The underlying requirement — that capture works when JS is degraded and is never silently lost — is carried by ADR-004 §4. |
| #12 *"No `@tailwindcss/forms`. Form chrome comes from the `@layer base` recipe."* | A Tailwind-specific gotcha. Form chrome now comes from `packages/ui`. |

**Three more are superseded by decisions taken elsewhere in this document**, and are listed
here so this table is the single place to learn which prior rules still bind:

| Superseded | By what |
|---|---|
| #1 *"Evolve, don't replace — the component library, the type scale and the surface recipes are unchanged."* | The library is rebuilt in code as `packages/ui`, the body step changes (#11 below), and the filled input recipe is replaced by a bordered one — both in `03-DESIGN-FOUNDATION.md` §1, rows *"190 component sets for 103 names"* and *"Input boundary at 1.22:1"*. [ADR-006](#adr-006) is the carryover contract that replaces #1. |
| #2 *"Light content, dark chrome."* | Retired for light chrome in `03-DESIGN-FOUNDATION.md` §*Surfaces* (*"Navigation chrome is **light** — a deliberate change from the source documentation"*) and [ADR-006](#adr-006). What the convention protected — `fond/inversé` distinguishing *live estimate* from *stored record* — is kept explicitly. |
| #11 *"12.5 px body is correct for this product."* | Body is `Corps/02` at 14 px — `03-DESIGN-FOUNDATION.md` §*Type scale* — because 11–12 px carried 52% of the source file's text nodes. The density intent is kept: floor 12 px, no marketing whitespace. |

**Two were neither retained nor recorded, and are adopted now:** #10's
`prefers-reduced-motion` clause and #13's category-reflex guard were absent from every
document in this repository until this revision. Both are now in `CLAUDE.md` §*UI* and
`03-DESIGN-FOUNDATION.md`.

The other **seven** non-negotiables in `09` §5 — #3, #4, #5, #6, #9, #10 and #13 — are
retained and reflected in `CLAUDE.md` and `docs/03-DESIGN-FOUNDATION.md`. Six retirements,
seven retentions, thirteen accounted for. Retirement is deliberate and recorded; it is not
silent drift.

---

<a id="adr-010"></a>

## ADR-010 — Screen design precedes the component library

**Status:** accepted · 2026-09-19
**Supersedes the build order of:** [ADR-001](#adr-001) for items 0.5(b) and 0.6

Phase 0 was ordered `… → 0.5(a) → 0.6 → 0.8`, which puts the staff shell and the
primitives before any screen exists. With 0.5(a) shipped — tokens, type scale, elevation,
behind a contrast gate — the next items in that order are a component library and an
application shell built for screens nobody has designed.

**Decision.** **0.5(b) primitives and 0.6 staff shell do not start until `/travail` and
`/dossiers/{id}` are designed in Figma.** Both are blocked on that work. `0.8` becomes the
next backend item and runs in parallel, because the rule registry has no UI surface.

**Why this order and not the plan's.** Components extracted from proven screens are the
ones that survive. Components designed first are guesses about what screens will need, and
the guesses accumulate: the source design file reached **190 component sets for 103
names** — `13×` `Icône`, `2×` `Bouton` with incompatible APIs — which is what speculative
component-building looks like after two years. That defect is recorded at
`03-DESIGN-FOUNDATION.md` §1 and [ADR-006](#adr-006) carries the fix, and the fix is worth
nothing if this project rebuilds the same pile from the other direction.

`00-PLAN.md` §Phase 2 already says `/travail` and `/dossiers/{id}` *"are the two screens
that decide whether this product is usable."* A primitive set that has not served either
of them is untested against the only screens that matter.

**The concrete blocker is the review-state component.** 0.6's exit condition requires it
to render *"internal state and external state simultaneously on one row, in every status
tone"* — six review states (`00-shared-contract.md:90`) against seven external states
(`:94`), which are independent by design and may co-occur in any combination. That is a
layout problem about density, truncation and scan order in a real table, with real French
labels of real length, next to everything else a row carries. It cannot be designed in
isolation and then discovered to be wrong once a screen exists; it has to be designed
*in* the screen it lives in. Building it first would mean building it twice.

**0.5(c) is separately blocked**, and on a different thing: it needs a qualified reviewer
who can run Viénot–Brettel–Mollon protanopia and deuteranopia simulation over a candidate
categorical sequence. That is not a design-file dependency and not something this project
can resolve by writing code. It is tracked as an unassigned reviewer in the delivery
ledger alongside the List B owners of [ADR-005](#adr-005).

**Consequence.** Phase 0's backend track finishes on 0.8 and 0.9 while the design track
runs. Nothing in Phase 1 renders before the shell exists, so the critical path now runs
through the Figma work — which is the honest picture, and was already true before this ADR
made it visible. If the design work stalls, the correct response is to say so, not to
unblock 0.6 by inventing screens in code.

---

<a id="adr-011"></a>

## ADR-011 — Depth is a system, and it is spent by role

**Status:** accepted · 2026-09-25
**Amends:** [ADR-006](#adr-006) — `fond/application` is no longer carried over unchanged
**Raised by:** the first `/travail` screen

The first real screen came back flat. Measuring it rather than arguing about it gave the
reason in one number: a white card sat **1.03** from the page ground it rested on. That is
below perceptual threshold, so the card did not read as a plane — it read as the page. The
row separators were **1.40**, and the three elevation tiers the system ships were not used
at all.

Every plane in the screen was within 1.03–1.40 of its neighbour, and the only tool that
creates depth was unspent.

**Decision 1 — the page ground moves down.** `fond/application` goes from `gris/01`
`#FCFCFD` to `gris/03` `#F0F0F3`, putting a white card at **1.14** from its ground rather
than 1.03. Modest on purpose: the separation is carried mainly by the stroke ladder below,
and a darker page costs contrast everywhere else.

**Decision 2 — the control boundary moves with it.** This is the part that would have
shipped broken. Darkening the page drags every boundary on it down too: `gris/09` measures
3.30 against white and only **2.90** against a `gris/03` page, under the 3.0 of WCAG
1.4.11. So `bordure/composant` becomes `gris/10` `#80838D`, which clears on every ground a
control can sit on — 3.78 on a card, 3.33 on the page, 3.10 on an inset.

The contrast gate missed this, because it checked boundaries against white and against a
ground that was nearly white. It now checks every boundary against **every ground a control
can touch**, and separately asserts that a card is at least 1.1 from its page. A boundary
is only as good as its worst adjacent surface.

**Decision 3 — three strokes, spent by role.** One weight everywhere is what reads as flat,
whatever that weight is; depth comes from hierarchy between strokes, not from thickness.

| Token | Step | On a card | Role |
|---|---|---|---|
| `bordure/discrète` | `gris/06` | 1.40 | hairlines **inside** a plane |
| `bordure/structure` | `gris/08` | 1.91 | header baselines, section dividers |
| `bordure/composant` | `gris/10` | 3.78 | control outlines — the boundary |

`bordure/structure` is a new token. The system's rule is that a step is added when a use
appears, not speculatively, and the use appeared: a table header needs to separate from its
body without another hairline. The gate asserts the structural stroke stays at least 25%
above the hairline, so the ladder cannot quietly collapse back into one weight.

**Consequence.** Either depth mechanism works — elevation, or a committed stroke ladder.
What cannot work is the combination the first screen had: weak strokes *and* no elevation.
`03-DESIGN-FOUNDATION.md` §*Depth* now says which to spend where, and §*Density* covers the
three composition failures the same screen exposed — a shallow type hierarchy, uniform row
rhythm, and urgency encoded only in colour.

None of this is the component library. These are foundation decisions, so they are not
blocked by [ADR-010](#adr-010); they are the constraints the screens are designed against.
