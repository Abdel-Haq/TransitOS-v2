# Design foundation

Carried over from the TransitOS Figma system per [ADR-006](01-DECISIONS.md#adr-006), with
its defects fixed. Every value below was read from the live source file and every contrast
ratio recomputed from sRGB.

The source system scored 10/22 on adversarial review, but almost every failure was
bookkeeping — duplicate bindings, no components page, stale frames — not judgement. What
follows is the part worth keeping, corrected.

---

## 1. What was wrong, and what changed

| Defect in the source | Evidence | Resolution |
|---|---|---|
| 17 duplicated variable names, 22 redundant variables | `accent/aplat` existed twice; `statut/info-fond` four times | **One value per token name.** Enforced by a build-time check |
| Same token, different colour per screen | `fond/application` = `#f0f0f3` on the dashboard, `#fcfcfd` on 13 other frames | Single source; the token is the ground, screens do not override |
| `statut/info` split across the product | terracotta on 4 screens, azure on 5 | One value — terracotta, [ADR-007](01-DECISIONS.md#adr-007) |
| `info` identical to `accent` | `#ad4318` / `#fbe8e0` for both | Separated by step **and** shape — [ADR-007](01-DECISIONS.md#adr-007) |
| Input boundary at 1.22:1 | Filled `#e8e8ec` on `#ffffff`, no border | Bordered treatment at `gris/09`, **3.30:1** |
| Muted icons below 3:1 | `#8b8d98` on `gris/03` = 2.90, on `gris/04` = 2.70 | `icône/discrète` → `gris/10` `#80838D` |
| No required-field marking | `clients.create` marked none; the rule sat in a prose panel | Required marked on the label, always |
| 190 component sets for 103 names | 13× `Icône`, 2× `Bouton` with incompatible APIs | One component per name, in `packages/ui`, code not Figma |
| Imported-kit leftovers shipping | `Labels/Primary` `#000000` live on two Terrain frames | Not carried over |
| Docs contradicted the file | "no shadow" vs three live elevation tokens; "six ramps" vs eight | This document is the single source |

---

## 2. Colour

Eight ramps. The source documentation claimed six; the file had eight and was right.

**Usage bands** — the most valuable idea in the source system. The step tells you what it
is *for*:

| Steps | Band | Use |
|---|---|---|
| 01–02 | `fonds` | Page and app backgrounds |
| 03–05 | `composant` | Component surfaces, badge fills, hover, selected row |
| 06–08 | `bordures` | Borders, dividers, control outlines |
| 09–10 | `aplats` | **Non-text fills only** — bars, dots, meters, chart segments |
| 11–12 | `texte` | Text and icons |

The break between 08 and 09 is sharp and deliberate. Do not treat a ramp as a gradient.

> ⚠️ **Steps 09–10 cannot carry white text.** On the source ramps white measured 2.35–3.76
> against step 09. Filled buttons take **step 11**. This was a documented rule in the source
> system and it is retained.

### Ramps

```
gris        01 #FCFCFD  02 #F9F9FB  03 #F0F0F3  04 #E8E8EC  05 #E0E1E6
            06 #D9D9E0  08 #B9BBC6  09 #8B8D98  10 #80838D  11 #60646C  12 #1C2024
gris-chaud  02 #F4F1ED  03 #ECE8E3                        (field surface — warm, outdoors)
terracotta  02 #FDF4F0  03 #FBE8E0  09 #E26B40  10 #C8501F  11 #AD4318
vert        02 #F4FBF7  03 #E6F7ED  10 #0F9B5A  11 #0E834C  12 #153F31
ambre       02 #FEFBF3  03 #FFF7E0  09 #F79009  11 #A66107
rouge       02 #FFF8F7  03 #FFEFED  05 #FFD3CD  09 #F04438  10 #E22E20  11 #CF1E12
violet      03 #F4F0FE  09 #7355EB  11 #5B3ACB
marine      11 #172542                                     (inverted field bar)
```

Sparse by design — these are the steps actually consumed. Add a step when a use appears,
not speculatively.

### Semantic tokens

```
fond/application      gris/01   #FCFCFD    page ground
fond/surface          white     #FFFFFF    cards
fond/composant        gris/04   #E8E8EC    inset surfaces, table stripes
fond/discret          gris/02   #F9F9FB
fond/inversé          gris/12   #1C2024    primary action, projection panels
fond/terrain          gris-chaud/03 #ECE8E3
fond/terrain-inversé  marine/11 #172542

texte/fort            gris/12   #1C2024    16.39 on white · 15.98 on gris/01
texte/faible          gris/11   #60646C     5.94 on white
texte/inversé         white     #FFFFFF
icône/forte           gris/12   #1C2024
icône/discrète        gris/10   #80838D     3.78 white · 3.33 gris/03 · 3.10 gris/04
bordure/composant     gris/09   #8B8D98     3.30 on white — the control boundary
bordure/discrète      gris/06   #D9D9E0     decorative separators only
accent/aplat          terracotta/10 #C8501F non-text fills
accent/texte          terracotta/11 #AD4318  5.84 on white
```

### Status tones

Ink on fill, pill shape, **always with a label**.

| Tone | Ink | Fill | Ratio |
|---|---|---|---|
| `succès` | `vert/12` `#153F31` | `vert/03` `#E6F7ED` | 10.57 ✓ |
| `info` | `terracotta/11` `#AD4318` | `terracotta/02` `#FDF4F0` | 5.39 ✓ |
| `violet` | `violet/11` `#5B3ACB` | `violet/03` `#F4F0FE` | 6.44 ✓ |
| `neutre` | `gris/11` `#60646C` | `gris/03` `#F0F0F3` | 5.22 ✓ |
| `danger` | `rouge/11` `#CF1E12` | `rouge/03` `#FFEFED` | 4.89 ✓ |
| `attention` | `ambre/11` `#A66107` | `ambre/03` `#FFF7E0` | 4.53 ⚠️ |

> ⚠️ `attention` clears AA by **0.03**. The source system flagged this and never fixed it,
> and any future retune of `ambre` breaks it silently.
>
> **Decision: accept 4.53 for now, with a guard.** The obvious remedy — a darker ink at
> `ambre/12` — is not available: that step does not exist in the ramp above, and inventing
> one would violate this document's own rule that a step is added when a use appears, not
> speculatively. So: keep the pair, and add a **contrast unit test** in `packages/ui` that
> asserts every status ink/fill pair ≥ 4.5. It fails the build if `ambre` is ever retuned.
> That converts silent fragility into a loud one, which is the point.

**Never colour alone.** Every badge carries text. This protects the CVD case: terracotta,
ambre and rouge sit in adjacent hue space and converge under protanopia and deuteranopia.

**The primary action is the dark neutral `#1c2024`, not the brand hue** — 16.39:1 with
white. This is load-bearing, not stylistic: with the primary action neutral, nothing
important depends on distinguishing terracotta from rouge by hue. Terracotta carries links,
selection, info and accent chips.

**Charts need their own palette.** Status tones are unsuitable for categorical encoding,
and a three-segment vert/orange/rouge donut is exactly the three that collapse under
protanopia. Direct labels and ordering carry the data; colour is secondary.

A validated categorical sequence does not exist yet and is **Phase 0.5 deliverable (c)**:
six colours, each adjacent pair ≥ 3:1 from its neighbours, checked under
Viénot–Brettel–Mollon simulation for protanopia and deuteranopia, with a fixed order. It is
needed before DF02 exposure reporting (4.3) and PL02 reports (5.2), and it is the one
inherited colour defect this document does not close on its own.

---

## 3. Type

**IBM Plex Sans** for prose and UI. **IBM Plex Mono** for all data. Self-hosted — no CDN,
because the field surface is offline-capable and one external URL breaks it.

Mono is structural. Every reference, amount, date, rate and account number renders in it:
`DOS-2026-00184`, `MSCU 483920-1`, `500 000,00 MAD`. It aligns figures in a column and
makes an identifier visually distinct from prose. Set `slashed-zero` — `0` and `O` are
genuinely confusable in container numbers.

| Token | Family | Size / line-height | Weight | Tracking |
|---|---|---|---|---|
| `Titre/03` | Sans | 16 / 24 | 600 | 0 |
| `Titre/04` | Sans | 18 / 26 | 600 | 0 |
| `Titre/05` | Sans | 20 / 28 | 600 | 0 |
| `Titre/06` | Sans | 24 / 32 | 600 | 0 |
| `Titre/07` | Sans | 28 / 36 | 600 | 0 |
| `Titre/08` | Sans | 32 / 40 | 600 | 0 |
| `Corps/01` | Sans | 12 / 18 | 400 | 0 |
| `Corps/01-accent` | Sans | 12 / 18 | 500 | 0 |
| `Corps/02` | Sans | 14 / 20 | 400 | 0.16 |
| `Corps/02-accent` | Sans | 14 / 20 | 500 | 0.16 |
| `Corps/03` | Sans | 16 / 24 | 400 | 0 |
| `Corps/01-terrain` | Sans | 13 / 18 | 400 | 0 |
| `Étiquette/01` | Sans | 11 / 16 | 600 | 0.60 |
| `Étiquette/02` | Sans | 12 / 18 | 600 | 0.50 |
| `Donnée/01` | Mono | 12 / 18 | 400 | 0 |
| `Donnée/02` | Mono | 14 / 20 | 400 | 0 |
| `Donnée/03` | Mono | 24 / 32 | 600 | 0 |
| `Donnée/04` | Mono | 32 / 40 | 600 | 0 |

Body is **`Corps/02` at 14 px**. The source design system documented 12.5 px and the file
used 12–14; 14 is chosen because this product is read for hours and 11–12 px was carrying
52% of the source file's text nodes. Density still matters — do not inflate to
marketing-SaaS whitespace — but the floor is 12 px, and `Étiquette/01` at 11 px is for
uppercase micro-labels only.

Hierarchy below heading level is carried by **weight and size**, not by further greying.
The neutral ramp only offers two AA-safe text steps (`gris/11` and `gris/12`).

---

## 4. Space, radius, elevation

```
espace  01:2  02:4  03:6  04:8  05:12  06:16  07:20  08:24
rayon   xs:4  md:8  lg:12  xl:16  xxl:20  pilule:999
trait   fin:1  accent:2
```

Three elevation tiers, all two-layer:

| Token | Shadow | Use |
|---|---|---|
| `Élévation/01 · surface` | `0 1 2 #1C21260D` | Cards on app screens |
| `Élévation/app · tuile` | `0 1 2 #1C20240A` + `0 6 16 -4 #1C20240D` | Dashboard tiles |
| `Élévation/terrain · carte` | `0 1 2 #1C20240F` + `0 4 12 #1C20240A` | Field cards |

The source documentation insisted on "no shadow"; the file shipped all three and they read
well. The file was right.

---

## 5. Surfaces

Five, each with a fixed frame:

| Surface | Ground | Frame |
|---|---|---|
| Staff app | `fond/application` | 1440 × 1024, 232 px rail |
| Field | `fond/terrain` | 390 × 844, **≥ 44 px touch targets** |
| Client portal | `fond/discret` | 1280 × 900, `max-w-5xl` |
| Auth | `fond/discret` | 448 px card |
| Public site | `fond/surface` | full-width marketing |

Navigation chrome is **light** — a deliberate change from the source documentation, which
mandated dark chrome. What that convention protected is retained by other means:
`fond/inversé` `#1c2024` still carries the primary action and the projection panels that
distinguish *live estimate* from *stored record*. In a product about money and customs that
distinction is the single most valuable convention in the UI; do not lose it.

---

## 6. Components owed by Phase 0

The specs need roughly twenty primitives. Build these, and only these, before screens start:

**Shell** — app rail · top bar · field app bar · portal header · page header

**Data** — table (sortable column, row, cell, empty, pagination) · card · meta strip ·
KPI tile · meter · timeline · detail panel · inverted projection panel

**Status** — status badge (6 tones × 2 sizes) · **review-state component** · filter chip ·
alert · banner · empty state

**Forms** — field (label, required marker, hint, error, `because`) · input · select ·
textarea · checkbox/radio · fieldset · dropzone · button · bulk bar

> **Build the tones Phase 1 actually consumes, not the full matrix.** A 7 tones × 3 sizes ×
> 5 states button is 105 permutations designed before a single real screen has said which
> are used. Start with `primary` / `secondary` / `ghost` / `danger` at two sizes, and add a
> tone when a screen needs it — the same rule this document applies to ramp steps.

**Feedback** — toast/live region · skeleton/busy region · confirmation that can state
consequences

Two of these do not exist in the source system and are load-bearing here:

- **The review-state component.** `draft / submitted / approved / rejected /
  changes_requested / stale`, plus seven external states, which **can co-occur on one row**.
  Every controlled record in the product carries it. Nothing in the specs designs it.
- **A confirmation that carries consequences.** Deleting an empty draft and deleting a
  dossier with an issued invoice and an engaged guarantee are not the same act. The
  confirmation has to be able to say so.

The required marker is the literal string **`Obligatoire`**, per `17-PL01-ux.md:13` — not
an asterisk, not a colour. Fix it once in the `field` primitive.

Two field props from the source system are worth reproducing exactly: `conditional` (marks
a field that only applies in the current state) and `because` (states *why* it just
appeared — *"requis pour le circuit ROUGE"*). Rare, and genuinely good.
