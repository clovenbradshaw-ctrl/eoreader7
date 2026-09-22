# The generation pipeline's next build: terrain × stance arrangement (2026-09-21)

## Why

The generation pipeline (native/the-fold: `eot-draft.js` → `arrange.js` →
`steer.js` → `prosify.js` → archons → `loop-check.js`) still groups and
selects a source's statements with hand-built heuristics: shared named beings,
word overlap. On a real four-document dossier (the OHS audit records) that
failed both ways. First one section swallowed 69 of 78 sentences, then there
were 34 sections, and the final selection left out every audit finding
(lessons 65–68).

The engine's own cube should be doing this. Every EOTRich address the parser
attaches (native/kernel/eot-rich.js via `eot-notation.js`) maps through
`cellOf(op, grain)` (native/kernel/cube.js) to one of nine **terrains**, what
a statement is about, and one of nine **stances**, what it does.

Measured on the OHS dossier, a statement's stance lean against the dossier's
own baseline already separates the acts that words could not:

| stance | the act | example |
|---|---|---|
| Making | prescribing | "Management should continue efforts to implement…" |
| Composing | deciding | "A motion … was made, seconded, and carried." |
| Tracing | reported speech | "Councilmember Welsch presented her request…" |
| Binding | classifying | "The Division is a division within Metro Social Services." |
| Unraveling | an outcome | "Status: Implemented." |
| Clearing | absence (negation is `DEF·Ground`) | "The Division did not retain the minutes." (weak until rarity-weighted) |

The kind organ (kernel/kind-induction.js + kernel/entity-kind-induction.js,
capacities `kinds` / `kindnull`) was fed statement evidence by
`native/the-fold/kinds.js`. It found the audit's real series at p = 0.008: the
risk ratings (×6) and the recommendation statuses (×7).

## Build order

Test each step on the OHS and Cumberland probes before any live run.

1. **Statement profile.**
   - Addresses: every node, feature, arc and marker cell of a statement's EOTRich record.
   - Mapping: each address goes through `cellOf` to a terrain and a stance.
   - Weighting: each address is weighted by its surprisal in *this* source, −log(share of that terrain/stance among all its addresses), so a rare act (Clearing is 1% of the OHS addresses) counts. No constants.
   - Output: each statement's lean, its profile minus the source baseline.
   - Test: a recommendation leans Making, a motion Composing, reported speech Tracing, a negated finding Clearing.
2. **Kinds, fixed.**
   - Span saturation counts a statement's distinctive values (rating and status words), not only beings and figures. It chose 0 of 6 risk-rating spans.
   - The label feature ("Observation B,", "Recommendation D.1,") gets its own null, because a numbered series is evidence at any size. The global prevalence floor dropped "Observation A…F" (6 of 140).
   - A basin spread through the whole source is ground, not a section. Reuse the occupancy and runs nulls in `arrange.js`; an 83-statement basin was measured.
3. **Terrain × stance outline** (`arrange.js`).
   - Sections are statements grouped by kind, and otherwise by shared dominant terrain role and stance move, kept adjacent. This replaces the being-union and Jaccard merge.
   - Order follows the form's moves: Binding (frame) → Clearing/Dissecting (findings) → Making (prescriptions) → Unraveling (outcomes) → Tracing (accounts) → Composing (decisions). The material's order is kept within a move, and time inversions are still repaired.
   - A kind section states the kind once (`kindSentence`, with computed counts such as "six of seven implemented") and carries its saturating spans, each linked to its exact bytes.
4. **Steering prompt** (`steer.js`).
   - Each section is rendered for the mouth as information: its role and move in one plain line, the kind sentence if any, then the saturating spans verbatim.
   - One question per call, yes/no, no apparatus words. Re-run Gary's audit (the-fold/gary.js) over every prompt.
5. **Stance and Lens mismatch** (Kidder & Todd, `archon-rules.js`). A prose sentence whose stance or Lens differs from the source statements it carries becomes a finding that licenses restore. Two cases:
   - a Making/Composing cause where the source only Traces ("the audit's findings sparked…");
   - a recommendation credited to the committee when the source's Lens is the auditors.
6. **Loop check** (`loop-check.js`). It already measures facts carried, the ask's questions answered, and findings licensing a revision. Add that every section's move is still present: a dropped move is a loss.

## Open, not decided here

Should negation and absence verbs address to `NUL`, putting them on the Void
terrain, in the universal grammar? Today negation lands at `DEF·Ground`
(Atmosphere) and "lacks" is `CON·Figure` (Link). The grammar belongs to the
"EOT enrichment" session. The stance face already carries absence as Clearing.
