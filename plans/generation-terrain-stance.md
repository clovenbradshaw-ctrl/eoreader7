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
