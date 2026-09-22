# Experiment: how discovered structure should make the EOT skeleton, and how flesh should grow on it (2026-09-21)

## The question

The generation pipeline (native/the-fold: `eot-draft.js` → `arrange.js` →
`steer.js` → `prosify.js` → archons → `loop-check.js`) now has four kinds of
structure it can discover in any source.

- **Referents**: who each statement names (`referents.js`).
- **Kinds**: series such as rated observations and graded recommendations, found by the engine's own kind organ (`kinds.js` over kernel/kind-induction.js + entity-kind-induction.js) at p = 0.008 on the OHS dossier.
- **Terrain and stance** for every EOTRich address, through `cellOf(op, grain)` (kernel/cube.js). Measured on OHS, stance leans separate the acts that words could not.
  - Making: a recommendation.
  - Composing: a motion carried.
  - Tracing: reported speech.
  - Binding: classifying.
  - Unraveling: an outcome.
  - Clearing: negation, weak until weighted by rarity.
- **Extent**: the dates and years each statement carries.

Nobody knows yet the best way to turn that structure into the EOT skeleton,
or the best way to put flesh on the skeleton recursively. So this is an
experiment, not a build order: the same sources, several arms, measured the
same way.

## Arms

**Skeleton arms** need no model. They are cheap, so every arm runs on every source.

| arm | how the EOT outline is made |
|---|---|
| A0 control | the committed arrangement: beings joined by the occupancy and runs nulls, size split, time repair |
| A1 kinds first | kinds fold each series into one stated kind plus saturating spans; the rest stays in material order |
| A2 stance moves | sections by rarity-weighted stance lean, ordered by the form's moves: frame → findings → prescriptions → outcomes → accounts → decisions |
| A3 terrain roles | sections by rarity-weighted terrain lean |
| A4 terrain × stance | A2 and A3 combined, with kinds folded inside |
| A5 mouth-led | raw paragraphs, membership decided only by the one-question yes/no votes |

**Flesh arms** run on the best two skeletons.

- **F1**, today's path: each section's prose is drawn whole, with finer draws and floors beneath it.
- **F2**, level by level (Hora). Every level is loop-checked against the one below.
  1. One sentence per section. That makes a complete abstract, usable on its own.
  2. Each sentence grows to a paragraph carrying the section's kind and spans.
  3. The remaining spans are woven in.

## Measures, the same for every arm

- **Skeleton** (no model): the ask's questions covered; how much of the source the kinds fold; move-order violations and time inversions; section count against the declared form; the largest section's share of statements.
- **Piece** (`loop-check.js`): facts carried, the ask's questions answered, findings still licensing a revision, model calls and seconds.
- **Judgment**: a blind pairwise editor verdict with the sources open (which piece is better, plus each piece's factual errors). This catches invented causes and misattribution.

## Sources

- Cumberland: tidy, already shaped like an essay.
- OHS: four real audit documents, messy.
- A meeting transcript.
- A narrative.

A method that only works on audit reports is only for audit reports.

## Order

1. Build the statement profile: rarity-weighted terrain and stance leans.
2. Run all six skeleton arms offline on all four sources, into one table.
3. Run F1 and F2 live on the two best skeletons.
4. Get the blind editor verdicts.

Each step's results are appended to this file.

## Open, not decided here

Should negation and absence verbs address to `NUL`, the Void terrain, in the
universal grammar? Today negation is `DEF·Ground` (Atmosphere) and "lacks" is
`CON·Figure` (Link). The "EOT enrichment" session owns the grammar. The
stance face already carries absence as Clearing.

## Results

### Step 1 — statement profile (`native/the-fold/profile.js`)

Built and falsifiable: `profile-falsify.test.mjs`. Every EOTRich address maps
through `cellOf` to a terrain and a stance; each address is weighted by its
surprisal in its own source, and a statement's lean is its weighted share
minus the source's baseline. A statement with no parse has no profile
(stated, never guessed).

Baselines across the four sources (the grammar's common ground is the same
everywhere — Binding ~36–40%, Tracing ~18–22%; the acts that separate the
dossier are the rare ones):

| source | statements | stance baseline (top) | terrain baseline (top) |
|---|---|---|---|
| cumberland | 23 | Binding 39.6, Tracing 22.2 | Entity 34.8, Network 22.2 |
| ohs | 506 | Binding 39.8, Tracing 18.3, Making 8.6 | Entity 33.9, Network 17.4 |
| transcript | 929 | Binding 36.9, Tracing 17.7, Tending 14.1 | Entity 31.0, Link 17.0 |
| narrative | 59 | Binding 36.3, Tracing 22.1 | Entity 31.1, Network 22.8 |

Making (a recommendation) is an OHS act; Tending (care work) an
OHS-transcript act. Clearing (negation) and Composing (a decision) sit below
the top four on every source — the rarity the surprisal weighting exists for.

### Step 2 — six skeleton arms, offline, on all four sources

Runner: `native/eval/the-fold/skeleton-arms.mjs`; full table and samples in
`native/eval/the-fold/results/terrain-stance-2026-09-21/`. A5 (mouth-led)
needs the model and runs with the flesh arms. Measures, per
`measureArm`: sections; largest share (statements in the biggest section /
all); split (author paragraphs whose statements land in 2+ sections);
inversions (a section whose dates all precede the one before); kind fold
(statements inside a kind section / all); coherence (within-section /
across-section claim-word Jaccard, >1 means sections hold together more than
chance pairs); vsForm (section count minus the declared 5-paragraph essay
form; no ask stated a length). Every arm covers every question the ask names
(no arm drops statements; the ask's questions are 1/1 or 2/2 everywhere).

| source | arm | sections | largest | split | inversions | kindFold | coherence | vsForm |
|---|---|---|---|---|---|---|---|---|
| cumberland | A0 | 8 | .17 | 1 | 0 | 0 | 1.94 | 3 |
| cumberland | A1 | 9 | .26 | 7 | 0 | .48 | 2.47 | 4 |
| cumberland | A2 | 8 | .30 | 7 | 0 | 0 | 1.22 | 3 |
| cumberland | A3 | 9 | .22 | 7 | 2 | 0 | 1.13 | 4 |
| cumberland | A4 | 11 | .26 | 7 | 1 | .48 | 2.48 | 6 |
| ohs | A0 | 35 | .07 | 1 | 0 | 0 | 2.28 | 30 |
| ohs | A1 | 36 | .07 | 0 | 0 | 0 | 2.25 | 31 |
| ohs | A2 | 9 | .20 | 33 | 0 | 0 | 1.59 | 4 |
| ohs | A3 | 9 | .18 | 33 | 1 | 0 | 1.80 | 4 |
| ohs | A4 | 65 | .08 | 33 | 1 | 0 | 2.55 | 60 |
| transcript | A0 | 2 | 1.00 | 1 | 0 | 0 | 1.85 | −3 |
| transcript | A1 | 1 | 1.00 | 0 | 0 | 0 | — | −4 |
| transcript | A2 | 10 | .19 | 1 | 0 | 0 | 1.57 | 5 |
| transcript | A3 | 10 | .14 | 1 | 1 | 0 | 1.72 | 5 |
| transcript | A4 | 76 | .08 | 1 | 2 | 0 | 2.24 | 71 |
| narrative | A0 | 16 | .14 | 1 | 0 | 0 | 1.68 | 11 |
| narrative | A1 | 22 | .15 | 6 | 1 | .15 | 1.87 | 17 |
| narrative | A2 | 10 | .15 | 14 | 1 | 0 | 1.24 | 5 |
| narrative | A3 | 9 | .17 | 14 | 1 | 0 | 1.30 | 4 |
| narrative | A4 | 24 | .15 | 14 | 1 | .15 | 1.56 | 19 |

Reading, arm by arm:

- **A0 (control)** keeps the author's paragraphs whole (split 1 on three
  sources) and holds the best coherence on OHS and narrative. It fails on
  the transcript — a single-line Whisper transcript has one block seam, so
  the arrangement has nothing to split and puts the whole 929 statements in
  one section (largest 1.00). It also overshoots the declared form on OHS
  (35 sections against 5): the control's "no section larger than the
  largest paragraph" has no paragraph to bound it.
- **A1 (kinds first)** folds the induced kinds on cumberland (48% of the
  statements, "5 alike" + "6 alike") and narrative (15%); on OHS both
  induced kinds are ground — their members spread through more than half the
  source, so the majority rule keeps them out, and A1 becomes the
  paragraphs, 36 sections.
- **A2 (stance moves)** fits the declared form on OHS (9 sections) and
  rescues the transcript (10 sections, largest .19) — but it shatters
  author paragraphs (OHS split 33): a stance pulls statements together
  across the source, out of their paragraphs.
- **A3 (terrain roles)** matches A2 on form-fit, beats it on OHS coherence
  (1.80) at the cost of an inversion.
- **A4 (terrain × stance, kinds folded) is the finding.** The joint face
  holds statements together better than any single face — the highest
  coherence on every source (2.55 OHS, 2.24 transcript, 2.48 cumberland) —
  but it explodes the section count (65–76 on the large sources) because
  every distinct (terrain, stance) pair becomes its own section. The pair
  needs an adjacency/merge licensing step (the original design's "kept
  adjacent"), not a global grouping. That is the arrangement build: group
  by kind, otherwise by shared dominant terrain role and stance move **kept
  adjacent**, with a null licensing a merge.

**The two skeletons for the flesh phase: A0 and A2.** A0 is the only arm
that keeps paragraphs whole on the sources that have paragraphs, and it is
the committed pipeline. A2 is the only arm that survives the transcript and
the only one that lands on the declared form for the messy dossier. A4's
design — not its raw output — is what the flesh phase's arrangement should
adopt.

### Step 3 — F1 vs F2, live, on A0 (two test calls; A2 not yet run)

A real bug was caught reading `flesh2.js` before spending a call on it:
`mL3` was declared `const` and reassigned on the level-3-undo branch —
`TypeError` at runtime, but only when L3 is actually judged worse than L2,
so it does not fire on every run. Fixed (now `let`); `flesh2-falsify.test.mjs`
adds regression coverage for the undo path.

A second, data-side bug: `drive-flesh-arms.mjs`'s default ground was the raw
PDF-derived audit text, letterhead and page headers included
(`plans/ohs/ground/AUD-HID-FOLLOWUP-2025.txt` — "METROPOLITAN NASHVILLE
GOVERNMENT / OFFICE OF INTERNAL AUDIT", the committee members' names as a
header line). It had already leaked straight into a floored piece in an
earlier run. Fixed: the default is now `fixtures/ohs-followup-audit.md`, the
same document with the letterhead and page furniture stripped, paragraphs
only. All step-3 numbers below are against the clean ground.

Runner: `native/eval/the-fold/drive-flesh-arms.mjs --arm A0 --flesh F1|F2`.
Full JSON and final pieces in `native/eval/the-fold/results/terrain-stance-2026-09-21/`
(`flesh-f1-a0.json`, `flesh-f2-a0.json`, `pieces/retest-f1-a0.txt`,
`pieces/retest-f2-a0.txt`).

| | F1 (draw whole, finer recurse) | F2 (level by level, Hora) |
|---|---|---|
| seconds | 388 | 353 |
| model calls | 35 (prose 14, tighten 3, turns 2, steer 16) | 38 (prose 19, turns 3, steer 16) |
| facts at the floor | 10 of 15 | 12 of 15 |
| archon findings, first read | 6 | 3 |
| findings still licensing a revision | 4 | 3 |
| mouth votes licensed | 8 of 16 | 7 of 16 |

F2's own level checkpoints (`levels` in its JSON): L1 (one sentence per
section) carried 4 of 15 facts — a real abstract, already readable, at the
cost of 13 findings still licensing a revision; L2 (grown to a paragraph)
jumped to 15 of 15 facts, 3 findings; L3 (remaining spans woven in) made no
change — L2 had already saturated the section, so L3's only job (floor
whatever L2 missed) had nothing left to do. The turns pass was undone live:
`check: Loop · turns · worse · undone` on the ledger — loop-check.js caught
a transition that made the piece worse and reverted it, mid-run, exactly as
designed.

**Reading the two final pieces side by side** (both are real, both cite the
same 15 facts):

- F1's *first* prose draft of its opening section invented an unfilled
  placeholder — "conducted by [Name of Audit Committee]" — naming an entity
  the source never names. The archon/fold/tighten pass caught and removed it
  before the final piece; it does not survive. A real save, and evidence the
  bracket-placeholder case needs its own check (`inventedNameRuns` doesn't
  fire on it, because it isn't a capitalized proper-noun run).
- F1's *final* piece still carries a genuine meta-leak that nothing caught:
  "**Note:** You can continue this section by adding more details about the
  implementation of the remaining recommendations." — the mouth addressing
  the reader about the essay, not part of the essay. `isMetaSentence` does
  not fire on this phrasing. F2's final piece has no meta-leak.
- A clause that reads like a restatement in both pieces — "Recommendation
  B.1, on updating the policies…" followed later by "Outstanding action:
  continue the update process for the Coordinated Entry policy…" — is
  **not** a duplication bug: both are distinct verbatim sentences in the
  source (checked against `fixtures/ohs-followup-audit.md`), both genuinely
  true, both floored because the mouth never wove them into one sentence.
  This is the floor mechanism holding under a weak mouth, not a defect.

**Read from two calls, not a sweep — provisional.** F2 finished faster,
with fewer open findings, no meta-leak, and its own live proof that the
loop-check machinery does what it is for (catching and reverting a bad
loop, not just measuring after the fact). F1's fold/tighten pass caught one
invented placeholder that F2 never produced in the first place, because F2
never gives the mouth an open-ended enough prompt to invent one — the L1
abstract prompt is narrow, and each subsequent level is narrowly scoped to
"grow this" or "weave this in." That may be F2's real advantage: not that
it writes better prose, but that its narrower prompts leave the mouth less
room to invent. Needs A2 (and more than two calls) to become a finding
rather than a lean.
