# Prior-art inventory — what past readers already proved, and where each organ's v7 seat is

The archive on this disk IS the past versions: eoreader6.1's engine and its
attempt log (READING-POLICY A1–A25 — each entry a mistake made once),
module headers that carry eoreader5's lessons forward verbatim
(morphology.js: "ported from eoreader5's packages/def/morphology.js, which
had already earned the two decisions I got wrong building this from
scratch"), and the-fold's measured reading lineage. eoreader4.x is frozen
by constitution (I.2: nothing ported un-re-earned) and is represented here
only through what 5/6 already re-earned from it.

This file is the repo-scale application of "search for the organ before
you write one": every engine organ below is BUILT, TESTED, and (as of this
writing) unconsumed by the native v7 reading path. Each names its recorded
evidence and its natural seat. Consuming one is a pass; this file is so
the pass starts at the organ, not at a blank buffer.

## Consumed this session (the pattern, demonstrated)

| organ | recorded evidence | v7 seat it now fills |
|---|---|---|
| `perceiver/text/pronouns.js` (as adapter) | challenge-23 apparatus regression | per-teller binding + activation arm |
| `perceiver/text/morphology.js` | eoreader5 lessons in its header; the-fold MINE-1 lemma pass (zero contradictions) | `adapters/text/morphology.js::actClosure` — vocabulary 43 acts → 120 attested forms, edges +39% on top of anchorSpans |
| `bin/priors/pos/en-ud-ewt.json` | build-pos-prior incident (CLAUDE.md) | anchoring head gate; agency-witness AUX refusal |

## Unconsumed, with seats named

**`emergence/binding.js`** — per-pair permutation-null co-arrival
significance, direction and polarity via transfer entropy. P6's own
verdict: the SVO tier is "the thin layer"; THIS is "the substantive
product." constitutional-read lists it in stagesNotRun. Seat: the Network
terrain — terrain-activation currently lights raw co-arrival pairs;
binding.js is what turns a lit pair into a significance-tested edge. The
goldens/network incident (6.1 CLAUDE.md) records the cost of hand-rolling
it instead.

**`perceiver/text/roles.js::resolveSpanRole`** — instance-level role
resolution by the same one-hop recall pronouns trust. Recorded limitation:
needs same-role vocabulary recurring within the material (book-scale yes,
short passage no). Seat: the descriptor-being evidence gate (levers-
RESULTS.md stopped at "agency by measured-verb adjacency"; resolveSpanRole
is the per-occurrence upgrade — but the golden must come first, same
reason).

**`perceiver/text/wordclass.js`** — POSPrior classification, Thrax map,
`dominantClass` with declared floor. Seat: candidate-verb standing in
`discoverRelationVocab` already reads raw treebank counts inline; wordclass
is the clarified subassembly for the same question, and carries the
type-vs-instance composition test.

**`emergence/tiers.js` + `surprise.js`** — decaying priors per tier,
Bayesian surprise with a continuation null; the-fold measured the startle
regime live (narrowed presence under surprise). Seat: the v7 kernel has
activation (P1's first clause) but no surprise-modulated regime — a reader
whose window never contracts under startle reads less like a human than
one whose does. dmdWindow measures the calm reach; surprise is what
licenses departing from it.

**`perceiver/text/narrator.js` / `presence.js`** — unread here beyond
their names; named so the next pass greps before building anything
narrator- or presence-shaped.

**`emergence/kinds.js` / `jati.js`** (population/kind, stages 7–8) — the
constitutional read's remaining stagesNotRun. Seat: the Kind terrain,
which every lexicon run so far reports honestly empty.

## The standing rule this file enforces

Before building any reading mechanism in native/: grep this file, then the
engine, then the attempt log (S8). If the organ exists, the pass consumes
it through an adapter and cites its evidence. If it genuinely does not,
the reason is stated where the new code lives (6.1 CLAUDE.md: "when a
rewrite is still the right call").
