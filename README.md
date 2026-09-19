# Dossier Clair

A customs operations system for Moroccan customs brokers and RED (*régimes économiques en
douane*) operators. Single tenant — one operating organization per deployment.

**The bet:** make every dossier's next action, responsible person, supporting evidence and
financial exposure explicit, so avoidable rework is prevented and blockers are explained
before they become late deliveries, disputed invoices or unresolved customs obligations.
AI assists that work; it is not the promise.

## Read in this order

| | | |
|---|---|---|
| 1 | [`CLAUDE.md`](CLAUDE.md) | Non-negotiables, stack, conventions. Read before writing code. |
| 2 | [`docs/00-PLAN.md`](docs/00-PLAN.md) | Phased implementation plan and what to build next. |
| 3 | [`docs/01-DECISIONS.md`](docs/01-DECISIONS.md) | Nine decisions where this project departs from the specs, and why. |
| 4 | [`docs/03-DESIGN-FOUNDATION.md`](docs/03-DESIGN-FOUNDATION.md) | Tokens, type, components. |
| 5 | [`docs/02-DELIVERY-LEDGER.md`](docs/02-DELIVERY-LEDGER.md) | Status per requirement, and the policy keys blocking release. |

The functional specifications are vendored at [`specs/`](specs/) and are the source of truth
for **what** to build. This repository's docs cover **how** and **in what order**, and record
the places where the specs are not followed as written. Every `file.md:NN` citation in
`docs/` resolves against `specs/`.

> `specs/dossier-clair-implementation-specifications.md` is a **consolidated copy** of the 21
> numbered files, not additional content. Never count or search both — it is what produced
> the "99 assumptions" double-count corrected in [ADR-005](docs/01-DECISIONS.md#adr-005).
> `specs/sources/` holds the two prompt documents the specs were generated from.

## Status

Planning. No code yet. Next step is Phase 0.1 — monorepo, CI and the Compose stack.
Build order for Phase 0 is **0.1 → 0.2 → 0.7 → 0.3 → 0.4 → 0.5(a) → 0.6 → 0.8**, with 0.9
running in parallel from day one.

## Two things to know up front

**Unknown business values are never invented.** 49 markers across the specs flag *assumption to verify* values — tax rates, statutory deadlines, carrier free time, retention
durations, service targets. They live in a policy register, they block activation of the
capability that needs them, and the UI says `À confirmer`. Code completion and production
readiness are separate milestones.

**Local action never implies official acceptance.** A local export, an uploaded screenshot
or a prepared packet is evidence, not an acceptance. Official systems remain authoritative
for official submissions and decisions. A recorded approval is an application decision, not
a legally certified signature.
