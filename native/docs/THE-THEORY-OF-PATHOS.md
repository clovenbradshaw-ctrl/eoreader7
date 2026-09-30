# The theory of pathos — what counts as pathos for any given thing being generated

*Written 2026-09-30, answering a direct question asked mid-task, while
`organs/visual-hierarchy.js` was being split into named archons and about
to be pointed at an ad hoc button-color fix: "we need a theory of what
counts as PATHOS for any given thing being generated." Standing:
**nomination** — checkable against `organs/pathos.js`, `kernel/dynamics.js`,
`organs/logos.js`, `organs/experiencer.js`, `organs/pacing.js`,
`docs/THE-WHEEL.md`, and `eval/read-pathos.mjs`, which win any disagreement
with it. This document is the general theory those files already implement
for ONE medium (text); it is stated once here so the next medium does not
re-derive it, and it is tested against this project's own prior work
(`organs/visual-hierarchy.js`'s first cut) rather than only argued for.*

## The one-sentence answer

**Pathos is never a property of the artifact — it is a verdict on whether an
experiencer's ground survives encountering it**, computed by composing four
required inputs (experiencer, rhythm, strain, curve) through one priority
ladder into one of four eliminative outcomes (`ground_holds` / `stale` /
`collapse` / `contested`), and it can say NOTHING ELSE — no rating, no
score, no "how good."

## Why "does it look nice" is categorically wrong, not just empirically weak

`organs/pathos.js`'s own header places it on the wheel (`THE-WHEEL.md`):
*"pathos is the RIM — the felt shape of the fold, the Pattern grain, the
difference the being made."* The wheel's three grains are Ground (constant),
Figure (value), Pattern (rate) — `SEED.md`'s own rows. A static property of
an artifact ("this button is green," "this sentence is short," "this photo
is warm-toned") lives at Ground or Figure grain. **Pathos lives one grain
up: it is never about what the artifact IS, only about what encountering it
CHANGED.** "Does it look nice" asks a Figure-grain question of a Pattern-
grain organ — a category error, not merely a weak signal. This is *why*
this project's aesthetics-halo finding (Tractinsky; perceived beauty shapes
usability RATINGS more reliably than it shapes actual performance) is not
an unlucky empirical fact to work around — it is the visible symptom of
asking the Pattern-grain organ a Ground-grain question and getting a Ground-
grain confound (a rating) back. **No pathos-shaped check may ever return a
positive quality field, in any medium, because the grain it answers at has
no such field to return.**

## The four required inputs, generally

`pathosOf({ text, experiencer, state, fold, delta, beforeFold })` composes
exactly four things. None of the four is optional in principle; `curve` is
the one currently allowed to arrive as an honest, typed gap
(`measured: false`) when the caller has no fold to supply — a gap is never
a verdict, so an unmeasured curve simply cannot fire `collapse`, it does not
default to `ground_holds` by assumption.

### 1. Experiencer — WHO undergoes it, reading WHAT, at WHICH revision

`organs/experiencer.js` (Panini's karaka grammar): `{who, read, revision}`
— `who` and `read` **required, never defaulted**; `revision` optional,
defaults to `null`. *"The experiencer is the BEINGS' witness — the spokes,
the span-free particulars; every belief names which being (for-whom) holds
it."* Pathos without a declared experiencer is refused outright
(`pathosOf` throws) — a feeling "for no one in particular" is kitsch, the
literal corruption this wall exists to name.

**Generalizes to any medium with zero modification.** Already proven twice
in this codebase, byte-for-byte identical, across two unrelated media
(text: `pathos.js`; visual: `organs/visual-hierarchy.js`). This is the
cheapest of the four slots to fill for a new medium — it costs nothing but
the discipline of actually declaring who and what address.

### 2. Rhythm — does variation across the artifact's own natural unit sequence show Murch's cut, or is it a flatline?

`organs/pacing.js` (Handle: Murch): sentence-length **variance** over the
piece's own ordered sequence of units, a **flatline** reading (variance
≈ 0 — "monotone density is Murch's boredom"), and **blink points** (a unit
markedly shorter than the running mean of the units just before it — "the
reader's eye blinking where the thought turns").

**The general shape:** take the medium's own natural sequence of
comparable units (sentences for prose; cuts for film; notes/beats for
music; a declared scan order for a static visual field; commits for a code
review; rows for a table read top-to-bottom); compute a **length or
salience statistic per unit**; ask whether that statistic **varies enough,
relative to its own local context, to be noticed** — never against a fixed
threshold (this project's own standing rule: a threshold with no giver and
basis is an invented rule, `regime-dial.js`).

**Two sub-shapes, not one, found by comparing `pacing.js` to
`pop-out.js`:**
- **Sequential rhythm** (`pacing.js`): unit *N* compared to a *trailing
  window* of the units immediately before it in a genuine reading order.
  Requires the medium to HAVE a reading order.
- **Structural (pairwise) rhythm** (`pop-out.js`, Wolfe & Horowitz 2004):
  a *declared focal unit* compared to *every other unit present*, with no
  reading order assumed at all — the right shape for a field that is taken
  in as a whole (a photograph, a dashboard, a single screen) rather than
  read start to end. `organs/visual-hierarchy.js`'s own header already
  named the mistake of reaching for the wrong sub-shape first: *"this
  repo's first draft borrowed pacing.js's variance formula for this and
  that was the wrong statistic for this phenomenon."*

**Cost to generalize: cheap.** Needs only (a) a declared unit sequence or
field, (b) one salience statistic per unit, (c) a choice between the
sequential and structural sub-shape based on whether the medium has a
reading order. No claim-graph, no recursive reader.

### 3. Strain — does the artifact's own claim structure close without contradiction?

`organs/logos.js` wraps `findClaimCycle` (Kelsen): a **pure graph check**
over a flat array of `{end1, label, end2}` edges — does the claim structure
turn back on itself with nothing external grounding it (begs the
question)? `organs/pathos.js::strainOf` digests a richer record-level state
(`{contested, contradictions, cycles, expired}` — logos's cycle finding
plus a ledger's own standing-contradiction/contested/expired findings) down
to one of three rungs: `report` (clean) / `standard` (something contested
or contradicted or expired) / `strict` (a real cycle, or an unlicensed
turn).

**The general shape:** ANY medium that can be reduced to a flat list of
`{end1, label, end2}`-shaped edges — "these two things stand in this
relation" — gets `findClaimCycle` for free, with **zero new code**. The
work a new medium actually has to do is build the EXTRACTOR from its own
artifact into that edge shape, never a second cycle-detector. Two edge
extractors already exist for two different things a "claim" can mean in
one medium (visual design):
- **Local, implicit claims** (`organs/grouping.js`, Palmer): spatial
  proximity asserts "these belong together" without anyone declaring it —
  a group whose own members sit farther apart than a non-member is a
  self-contradicting claim, the same shape as a claim graph with a cycle,
  just discovered from geometry rather than declared.
- **Global, declared claims** (`organs/design-regime.js`,
  Müller-Brockmann vs. Carson): the artifact (or its author) DECLARES a
  regime ("grid-systematic"), and the check is whether the artifact's own
  token usage keeps that declared premise consistent — logos's exact
  discipline, *"a claim is judged against its own premises, never an
  external ideal,"* stated independently in `design-regime.js`'s own
  header before this document connected the two.

**Cost to generalize: moderate.** The graph-cycle mechanism is free; the
work is building one (or more) extractors that turn the medium's own
structure — declared or implicit — into edges. A medium with no claim-like
relations at all (a single still photograph with one subject and nothing
else) may legitimately have nothing for strain to check; that is a named
gap (`report`, no findings), never a manufactured pass.

### 4. Curve — does the artifact's own record of what it opened get released, or does surprise arrive with no resolution?

`kernel/dynamics.js`: `deriveSurprise(delta)` (which operators fired, which
addresses moved), `deriveTension(fold)` (which obligations/expectations are
still OPEN, and which share grounds with each other — an interaction
network), `deriveRelease(delta, beforeFold, afterFold)` (an obligation that
changed state, with the operations that changed it named as witnesses).
This is the ONLY one of the four that requires the medium to have its OWN
**recursive, incremental reader** — a real, running fold of obligations and
expectations that opens as the artifact is encountered and updates turn by
turn (`eval/read-pathos.mjs`'s real engine:
`createCausalTextPerceiver`/`createRecursiveReader`, producing
`EORelevantFold@1` — `obligations`/`expectations`/`exclusions`/
`activeFrames`). Read at a window boundary, `deriveRelease` asks
specifically: *did the tension that arrived get witnessed and resolved, or
did it just accumulate with nothing releasing it* — `collapse` fires only
when `operations > 0` (something consequential happened) **and**
`release === 0` (nothing resolved it), never from a bare surprise count
alone.

**The general shape:** the medium's own append-only record of what it
PROMISED (opened an obligation/expectation) and whether that promise later
resolved (fulfilled/violated/reframed/superseded), read incrementally
rather than as one static end-state diff. Prose has this because the
kernel's recursive reader already tracks referent/obligation state turn by
turn as text is read. An interactive UI has a real analog waiting to be
built: a user action opens an obligation ("subscribing implies episodes or
an error will appear"), which is released when the UI actually responds, or
stays open (a spinner that never resolves), or is violated (an error with
no explanation). A code review has one too: a PR's own stated intent opens
an obligation each commit either advances or contradicts.

**Cost to generalize: expensive.** This is the one slot that cannot be
filled by a small pure function — it needs a genuine incremental
reader/fold for the medium, the same weight of machinery
`native/kernel/reading.js` already is for text. **A medium with no such
reader yet has an HONEST gap here, not a zero** — exactly how `pathos.js`
itself already handles it (`fold: null` → `curve.measured: false`,
`unmeasured: "no fold supplied"`), never silently treated as
`ground_holds`.

## The composition law: a priority ladder, never an average

`reGroundCondition(read)` is not four independent scores to combine — it is
one decision, checked in a fixed order, and the order is load-bearing:

1. `strain === "strict"` → **`contested`** (a real cycle or unlicensed
   turn in the claim structure — checked FIRST, because an internally
   self-contradicting artifact has nothing else worth measuring).
2. `rhythm.flatline` → **`stale`** (Murch's boredom — the ground stopped
   being tended).
3. `curve.measured && surprise.operations > 0 && release === 0` →
   **`collapse`** (a consequential change arrived and nothing absorbed
   it) — reachable only from a MEASURED curve; an unmeasured one cannot
   fire this branch, so a medium with no incremental reader yet can never
   be falsely convicted of `collapse`, only of `contested` or `stale`.
4. else → **`ground_holds`**.

**Averaging these four into one score would be exactly the mistake this
whole apparatus exists to refuse** — a cycle in the claim structure is not
"one bad point out of four," it invalidates the reading of the other three
entirely (an artifact that contradicts itself has no coherent rhythm or
tension to speak of), which is why it is checked first and short-circuits.

## The self-test: applying the theory to this project's own first cut

`organs/visual-hierarchy.js` (the version committed immediately before this
document) built four checks and called them four parallel "axes" —
exactly the flat, averaging shape the composition law above refuses. Read
against the real theory, each of the four plays a DIFFERENT one of the
roles above, and one role (curve) was never attempted at all:

| what was built | its real role | why |
|---|---|---|
| `contrast.js` (WCAG) | **not pathos at all — this is ETHOS** | it is a hard, received, existence-level gate ("may this reading be perceived by this class of experiencer at all"), the same station `ethos.js` occupies for text (constitutional/domain-legitimacy), never a felt-shape/dynamics question. Composing it into `visualHierarchyRead` alongside the other three as a fourth "axis" mis-stated what kind of check it is. |
| `pop-out.js` (Wolfe) | **rhythm** — the structural (pairwise) sub-shape | correctly identified as such in its own header already; this document just names the general slot it fills. |
| `grouping.js` (Palmer) | **strain**, local/implicit edge extractor | a spatial-proximity claim ("these belong together") that can self-contradict, feeding a `findClaimCycle`-shaped check, not a fourth independent thing. |
| `design-regime.js` (Müller-Brockmann vs. Carson) | **strain**, global/declared edge extractor | a declared-regime-vs-actual-usage claim, the SAME kind of check as grouping at a different scale — both should fold into ONE strain reading, not sit as two separate report rows. |
| *(nothing)* | **curve — a named, honest gap** | no recursive reader exists yet for "a UI encountered over an interaction sequence" the way `native/kernel/reading.js` exists for text read over time. Not silently defaulted to `ground_holds` — genuinely unbuilt, and must say so. |

**The corrected shape is not four parallel findings — it is one
`visualPathosOf` that:** treats `contrastFindings` as a precondition check
(closer to ethos than pathos — reported, but never folded into the
re-ground ladder), folds `groupingFindings` + `regimeFinding` into one
`strain` reading (report/standard/strict, mirroring `strainOf`'s own rungs,
fed by the SAME `findClaimCycle` machinery once the two organs' findings
are expressed as edges), keeps `popOutFindings`'s flatline as `rhythm`, and
carries `curve: { measured: false, unmeasured: "no incremental visual
reader exists yet" }` honestly rather than omitting the slot. Composed
through the identical priority ladder, this produces the SAME four-way
verdict (`ground_holds`/`stale`/`collapse`/`contested`) pathos.js already
produces for text — proof the theory transfers, not merely an analogy.

## How to fill the four slots for the NEXT medium

1. **Experiencer** — declare `{who, read, revision?}`. Free; reuse
   `organs/experiencer.js` verbatim, always.
2. **Rhythm** — pick the medium's natural unit sequence. Does it have a
   real reading order? Use the sequential sub-shape (`pacing.js`'s
   trailing-window variance). Is it taken in as a whole with no fixed
   order? Use the structural sub-shape (`pop-out.js`'s declared-focal-vs-
   context Euclidean difference). Declare the flatline threshold as a
   regime dial (`{value, giver, basis}`) — never invent one.
3. **Strain** — find (or refuse to find) the medium's claim-like
   relations, declared or implicit; extract them as `{end1, label, end2}`
   edges; run `findClaimCycle` unmodified. No relations exist in this
   artifact? Report `report`/clean, honestly — never manufacture an edge
   to have something to check.
4. **Curve** — the expensive one. Ask first whether an incremental,
   fold-producing reader for this medium already exists anywhere in this
   codebase (search before building, this project's own oldest rule).
   None exists? Say so as a typed gap (`measured: false`), exactly as
   `pathos.js` already does when no fold is supplied — never skip the
   field, never default it to a verdict.
5. **Compose** through the SAME priority ladder — strict strain first,
   then flatline rhythm, then unreleased curve, else `ground_holds` — and
   return ONLY that verdict plus its `basis`. No score. No rating. No
   "how good." The verdict is the only thing pathos, at any grain, is
   licensed to say.
