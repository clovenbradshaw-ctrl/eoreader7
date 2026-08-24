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

**`emergence/binding.js` — CONSUMED (kernel/network-standing.js).**
P6's "substantive product," now run over the native reading's arrivals:
275 raw co-arriving pairs -> 83 with standing on Frankenstein; refusals
are the finding as much as the edges (Elizabeth–Clerval, co-arrivals 36,
p=0.075 — frequent company is not a bond). Two walls added by
measurement: the arrival floor (a single shared arrival produced a
DEGENERATE null reading p=0 — standing granted where the test could not
run; binding's own structural minimum of 2 closes it, cited), and the
LINK_SPEC cut (draws 199, alpha 0.05) cited from the certified consumer.
Disclosed residue: Clerval–Henry ranks as a top "bond" because the native
path has not merged the alias — self-company reads as a bond until
coreference does (the-fold P40's referentFace lesson, surfacing here).
Transfer-entropy direction/polarity (the organ's other half) remains
unconsumed. Not yet wired into terrain projection — driver + kernel organ
only.

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
