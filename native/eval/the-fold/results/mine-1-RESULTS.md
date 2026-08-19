# MINE-1 against the house verdict reader — the baseline run (name-only)

**Superseded as the live number, kept as the frozen baseline.** This
document and its numbers describe the reader BEFORE `hypergraph.js` grew
recurring-form subject resolution (same day, later). `eval/mine-1.mjs` is
unchanged and still reproduces the CURRENT numbers, which are higher — see
`mine-1-forms-RESULTS.md` for the after-fix results and exactly what
changed. The machine-readable record of THIS run is frozen at
`mine-1-baseline-run.json` (a copy of `mine-1-run.json` taken before the
fix landed) — `mine-1-run.json` itself now holds the current, post-fix
numbers, since re-running the unchanged script against the changed reader
naturally overwrites it. This document's own prose and numbers below are
left exactly as originally written, as the historical record of what the
name-only reader scored. Priority 1 of `goldens/EXTERNAL-BENCHMARKS.md`
("The Goldens"), Section A.

## What ran, and what didn't

MINE-1's published protocol has two moving parts this environment cannot
run unmodified: an embedding index for top-8-plus-2-hop retrieval, and an
LLM judge (`gpt-5` in kg-gen's own `_1_evaluation.py`) — no `OPENAI_API_KEY`
is configured here. Rather than substitute a different judge and present
the number as if it were comparable to the published table, that arm was
left **unrun** — a typed absence, disclosed here, not a silent swap.

What ran instead is the second arm the goldens document itself proposed:
`hypergraph.js`'s five-verdict relation reader — the same mechanism that
grounds a fold answer against its attached material, here pointed at 105
essays and their 1,575 attached facts nobody chose for this project. No
embeddings, no judge call, no training, no schema, nothing tuned against
this run's own score (the whole scoring rule — worst-verdict-wins,
`no_claims_extracted` as its own typed gap — was fixed in `eval/mine-1.mjs`
before the run, and is unchanged since).

## The material

105 essays, 15 attached facts each (1,575 facts total) — the real dataset
behind MINE-1 (`kyssen/kg-gen-evaluation-essays` /
`kg-gen-evaluation-answers` on Hugging Face, linked from kg-gen's own repo,
`github.com/stair-lab/kg-gen`), retrieved 2026-08-18 and copied into
`eval/fixtures/mine1-essays.json` for the same reproducibility reason
`eval/measure-real-data.mjs` copies its own CSV rather than reading it live.
(The MINE-1 paper's own abstract rounds to "100 articles" — the published
dataset ships 105; this run reports the real count.) Short informational
essays across varied topics — dinosaurs, roller coasters, board games,
Egyptian burial practices, sleep science — genuinely nobody's house corpus.

## The numbers

```
105 essays, 1575 attached facts

essays with no measurable relation vocabulary at all: 29/105

of 1575 facts:
  no_claims_extracted (no SVO shape found in the fact sentence): 1038 (65.9%)
  of the 537 facts that DID extract at least one relation claim:
    bound         (essay binds this edge)             : 92  (17.1%)
    contradicted  (essay binds the opposite polarity) : 0   (0.0%)
    unbound       (no edge like this in the essay)    : 76  (14.2%)
    beyond-reach  (an endpoint doesn't resolve)        : 307 (57.2%)
    unheard       (verb outside essay's own vocab)     : 62  (11.5%)

headline (bound / all 1575 attached facts, MINE-1's own denominator): 5.8%
headline (bound / 537 facts this reader could even read a claim from): 17.1%
```

## Reading this the right way round

**This is not a MINE-1 score in the published table's sense**, and reporting
it as one would be exactly the "the silence is just the mouth's word-order
prior failing" mistake the agency-civic golden's own README warns against.
The published protocol's denominator is "does the RETRIEVED SUBGRAPH support
the claim" — a generous, embedding-similarity-gated question. This run's
denominator is stricter and different in kind: "does `extractRelations`,
reading the fact sentence with the essay's own measured vocabulary and
referent index, produce a claim it can bind at all" — closer to *recall of
the reading mechanism itself* than to *recall of a retrieval-plus-judge
pipeline*. The two numbers are not the same measurement, and the arm that
would make them comparable (the LLM-judge run) is the one this environment
could not run. Read as what it actually is — a lower bound on how much of
MINE-1's own material this project's mechanical reader can even form an
opinion about — 5.8%/17.1% is a real, if modest, number.

**The shape of the failure matches the agency-civic golden's own finding,
independently, on completely different material.** 65.9% of facts produce
no SVO triple at all, and of the ones that do, 57.2% land `beyond-reach` —
the subject or object doesn't resolve to a referent this reader's index
established. `perceiver/text/surfaces.js`'s referent discovery leans on
capitalized, recurring surfaces; these essays are encyclopedic and
topic-general ("Butterflies undergo a remarkable transformation…",
"Caterpillars are voracious eaters…") rather than narrative-with-named-
characters, so common nouns as grammatical subjects rarely register as
referents at all. This is the exact prediction `goldens/EXTERNAL-
BENCHMARKS.md` Section B made before this run: *"recall drops further than
on narrative prose, for the same nominalized-predicate reason already
measured on the civic golden."* It did — civic prose measured 13.3% recall
against a human/LLM-panel majority; MINE-1's encyclopedic essays measure
17.1% against the fraction of facts this reader can even read a claim from,
and 5.8% against MINE-1's own full fact count. Two different corpora,
two different annotation methods, the same joint the mouth breaks at:
subjects without a name.

**Zero contradictions is itself informative, not just a zero.** These are
essays paired with facts DRAWN FROM those same essays (the dataset's own
construction, not adversarial), so a genuinely contradictory edge would be
a data or extraction bug, not a real finding — and none turned up across
537 read claims. That is a mild, real check on the mechanism's honesty
(it isn't inventing opposite-polarity edges out of nothing), worth stating
plainly rather than leaving as an unremarked zero in a table.

**37/105 essays produced at least one `bound` fact**, concentrated in essays
with more proper-noun-bearing content (Ancient Egyptian Burial Practices:
5/15 bound; Space Exploration: 3/15) — the same registration-on-names
pattern, visible essay by essay in `mine-1-run.json`.

## What would close the gap to a real MINE-1 comparison

1. **The LLM-judge arm**, run with a configured API key, scored on the
   IDENTICAL 105-essay/1,575-fact set (already fixture'd here) so the two
   numbers sit beside each other honestly instead of one being guessed at.
2. **The agreement rate between the two arms** — the actual substrate-swap
   ablation `EXTERNAL-BENCHMARKS.md` Section A proposed — is unmeasurable
   until (1) exists. Nothing here should be read as that comparison; it is
   half of it.
3. Independent of a judge: widening `relations.js`'s referent-resolution
   reach to plain, non-proper-noun subjects (already named as the concrete
   next step in the agency-civic golden's own "what would change this
   status" section) would very likely move the 57.2% `beyond-reach` share
   more than any change to this reader's scoring rule — worth re-running
   against this exact fixture before declaring it fixed, per this project's
   own house rule against declaring a mechanism fixed by inspection.

This result **stays in the repository regardless of how modest the number
is** — the agency-civic golden's own rule, applied here: a golden that only
gets committed when it confirms the thing under test is not a golden.

## Follow-up: what DID close the gap — see `mine-1-forms-RESULTS.md`

Priors (below) didn't move the number — wrong corpus, not a broken
mechanism. What did: `beyond-reach` (the dominant failure below) was mostly
subjects like "Butterflies" that never resolve to a referent at all,
because `cast.js` requires a proper name. `host/terrains.js` had already
solved this exact starvation for the Network graph ("recurring-form
co-arrival binding" — concept documents starve the cast ladder). Applying
the same identity to `hypergraph.js`'s subject gate nearly tripled bound
facts (92 → 222) and dropped `beyond-reach` from 307 to 87. Full write-up,
before/after numbers, and the two bugs caught while building it:
`mine-1-forms-RESULTS.md`.

## Follow-up: does `live_priors` help? No — see `mine-1-priors-RESULTS.md`

The obvious next question is whether letting the reader consult
`live_priors` — the curated reference corpus `priors.js` already knows how
to check a claim against — would recover more of these facts than the
essay's own material alone. It was tested directly (`eval/mine-1-priors.mjs`,
whole corpus treated as activated, no toggle gating): **0 of 1,575 facts**
landed `stated-by-library`. `live_priors` is a curated philosophy/classics/
law/foundational-science canon, not a general trivia encyclopedia — it has
no shelf for roller coasters, board games, or butterfly metamorphosis, so
there was nothing there to find. Full write-up in
`eval/results/mine-1-priors-RESULTS.md`.
