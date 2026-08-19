# Continuing the hypergraph investigation — from grammar recovery to reader-asserted structure

This is a handoff prompt, written to be self-contained for whoever (or
whatever session) picks this up next. It closes out one investigation and
opens a different one, on the user's own direction: *"something wrong come
around to a lot of that — we don't need to rediscover grammar as linguists
think of it, we need to discover real structure and MEANING, which must
always be asserted by a reader (even a mechanical one)."*

## Where the last investigation actually landed, honestly

`hypergraph.js` scores MINE-1 in the 22–34% / 17–43% band across NINE
different vocabulary configurations (`eval/results/mine-1-FINAL-COMPARISON.md`)
— UniMorph vocabulary widening, lemma-aware verb/object matching, span-role
per-occurrence resolution, clause-level framing, a determiner-adjacency
disambiguation vote, a targeted veto version of the same. Every one of them
is a different way of answering the SAME question better: **"is this word,
right here, a verb (or the same verb as that one)?"** Plain UniMorph
(unfiltered) stayed the pareto-best of all nine, and the honest ceiling
analysis in that file says why further layering on this axis won't move
the number: `unbound` sits at 35–39% of examined facts in every variant,
untouched by any vocabulary change, because it's a **paraphrase-tolerance
gap** — `bound` requires exact triple-shape convergence between two
independently-extracted readings of the same fact — not a vocabulary gap.
Read that file in full before doing anything else; it is the actual
account of nine failed attempts at the wrong axis, not a summary of
successes.

Separately, `eval/results/mine-1-official-methodology-RESULTS.md` found
that scoring the SAME graph under MINE-1's own entailment-style rubric
(embedding retrieval + hand-judged inference, honestly disclosed as
unblinded/uncalibrated) landed at 80% — above every published baseline
including KGGen. Read together, these two results say the same thing from
opposite sides: **the graph's underlying content is not obviously the weak
link. The exact-structural-match verdict is measuring its own strictness
more than the graph's quality.** And the one attempt this session made to
widen `bound` itself (a graph-neighborhood `inferred` verdict) was built,
found to fabricate on two adversarial cases, made safe, and then proven —
mathematically and empirically (0/1,575 fires) — to be dead code once made
safe. Full account in `hypergraph.js`'s own 2026-08-19 header amendment.

## The actual diagnosis — read this part slowly, it's the point

Every one of those nine configurations, and the `inferred` dead end, was
an attempt to get closer to a LINGUIST'S formal category — part of speech,
lemma identity, verb-hood — and trust it as ground truth once recovered.
That is the wrong move, and it's the same wrong move this codebase's own
architecture has already refused, repeatedly, everywhere else:

- `operators.js`'s own measurement (95.7% cell-assignment survival under
  word-shuffling) is exactly the refutation of "a category can be read off
  a passage and trusted" — that's why "the cube is not a content
  classifier" is load-bearing law, not a stylistic choice.
- L2 (`CLAUDE.md`, the-fold): "capitalisation is a differentiator, never
  the primary signal" — a surface cue narrows candidates, it never decides
  identity on its own.
- The earlier fix TONIGHT (referents over stemming, `formIdOf`) already
  drew this exact line for NOUN identity: identity is not a string
  property, it's something a reader has to construct and can get wrong.
  This prompt is asking you to draw the SAME line for the VERB side, one
  level up — not "which token is this the same word as," but **"is this
  really a predicate at all, and how would a reader know, and what would
  make it withdraw the claim."**

A part of speech is not a fact a word carries. It's a linguist's
after-the-fact description of how a word got used in one utterance.
Treating a POS/lemma table (UniMorph) or a proxy for one (span-role,
determiner-adjacency) as ground truth to RECOVER is importing an external,
ungrounded authority — precisely the move `nul.js`'s whole apparatus and
this file's own grounding ladder (`bound`/`contradicted`/`unbound`/
`beyond-reach`/`unheard` — five typed verdicts, never a boolean) exist to
refuse everywhere else in this repo. **It has just never been applied
reflexively, to the extractor's own act of proposing an edge.**

`checkGrounding` already distinguishes `examined` from `clean`.
`corroborateAtoms` already counts perspectives instead of asserting a bit.
`hypergraph.js`'s own verdict ladder already refuses to collapse "is this
claim true" into yes/no. All of that machinery treats a MODEL's claim as
a hypothesis needing disclosed support before it gets to stand. **Nothing
in this repo yet treats `extractRelations`'s own "this word is the verb of
this clause" as the same kind of hypothesis.** It's currently a lookup
(vocabulary membership + adjacency heuristics), not an assertion with a
ground, a disclosed confidence, and a refusal path. That's the actual bug
class underneath all nine plateaued attempts — sharpening the lookup table
can't fix a category-mistake about what kind of thing the lookup is doing.

## What "a reader must assert it" concretely means to build

Not a bigger vocabulary. A mechanism where a candidate edge is a claim the
extractor STAKES, with evidence, and can be made to withdraw:

1. **Search for the organ before writing one — this repo's own rule, from
   `eoreader6.1/CLAUDE.md`.** Before inventing a new statistic: read
   `nul/index.js`'s `LICENSED` perturbation table end to end and ask
   whether a test for "is this really the predicate" already exists there
   under a different name (a perturbation that swaps the candidate verb
   for an adjacent word and asks whether the sentence's own measurable
   structure — via whatever series `nul.ground()`/`nul.pattern()` already
   accept — moves more than chance). Read `emergence/activation.js` and
   `perceiver/text/roles.js::resolveSpanRole` again, not for their current
   application (they were both already tried and topped out — see
   `mine-1-span-role-RESULTS.md`) but for whether the underlying one-hop
   causal-recall MECHANISM, not the type-vs-instance verb classifier built
   on top of it, has an unused mode that answers "does the local context
   corroborate this candidate independently" rather than "which known
   category does this resemble."

2. **A self-corroboration test, not a bigger lookup.** For a candidate
   edge, ask the material itself: does something SHAPED like this triple
   (same rough subject/object identity, a possibly different verb SURFACE)
   recur elsewhere in the text? If corroboration only ever comes from the
   SAME sentence that produced the candidate, that's not independent
   evidence — say so, refuse, and let the edge stand as `unheard`-style
   disclosed-limit rather than silently kept. This is the SAME shape as
   `corroborateAtoms`'s refs/distinct-sources discipline ("two chunks of
   one file are one perspective"), applied to an edge instead of an atom.

3. **A genuinely new eval harness, decoupled from MINE-1's `bound`/
   `unbound` rubric — because that rubric is now KNOWN to measure verdict
   strictness more than graph quality (the 80%-under-entailment-scoring
   result proves it).** Concretely:
   - A stratified, BLIND hand-precision check — pull a genuinely random
     sample of edges (not "the ones that scored `bound`"), write the
     rubric down BEFORE looking at any aggregate number (the eoreader6.1
     "never tune against a golden's score" discipline, applied to
     *scoring the metric itself*, not just to a threshold), and report the
     result even if it's ugly.
   - A synthetic adversarial suite, purpose-built to break structural
     matching in KNOWN ways already named in this repo and never
     addressed: passive voice, relative clauses, fronted adverbials,
     coordinated verb phrases (`goldens/agency-civic`'s own README names
     these as the next concrete extractor gap). Score each case as
     correctly-extracted / honestly-refused / silently-wrong — never
     collapse the last two.
   - A paraphrase-robustness check: take a handful of MINE-1 facts, hand-
     write 2–3 independent paraphrases each, and measure whether the
     READER's own self-corroboration mechanism (point 2 above) treats them
     as the same claim — this is a real, falsifiable test of whether
     "meaning" as this repo means it (asymptotic convergence across
     independent readings, the P12 grounding-ladder framing) is actually
     happening, versus exact-string matching wearing a semantic costume.

4. **Every number this produces needs the same discipline this whole
   night already ran on**: state a threshold's justification BEFORE
   running it against a golden, not after (the `minArrivals=4` structural
   derivation is the house example — worth re-reading in
   `eoreader6.1/CLAUDE.md`'s "never tune a parameter" section); disclose a
   negative result with the same weight as a positive one (every file this
   session produced does this — keep doing it); stay local-only, no
   hosted judge, mechanical organs only, per P1/P4/P20 — a "reader" here
   means code that stakes a typed, falsifiable claim, never a model asked
   to construe meaning and trusted on its own say-so.

## Concrete opening moves, in order

1. Re-read `hypergraph.js`'s current verdict ladder start to finish and
   mark, line by line, which comparisons are genuinely structural (does
   this edge's shape match that edge's shape) versus which are secretly
   POS/grammar assumptions dressed as structure (verb-string equality,
   `sameAct`, `verbForms` membership — all of these are "is this the right
   kind of word" checks, not "did the material actually assert this").
2. Read `nul/index.js`'s `LICENSED` table and `emergence/activation.js`
   fully before writing anything — the search-first rule is not optional
   here, this repo has already paid for skipping it once (`goldens/network`'s
   postmortem, `eoreader6.1/CLAUDE.md`'s own opening section).
3. Prototype the self-corroboration idea as a small, PURE, standalone
   function against 3–5 real essays by hand, read the actual output the
   way `mine-1-next-steps.md`'s two rejected attempts did ("read the
   triples, don't trust the theory") — BEFORE wiring anything into
   `hypergraph.js` itself.
4. Build the new eval harness as a SEPARATE script under `eval/`, not a
   patch to the existing MINE-1 runners — it is answering a different
   question ("is this graph meaningful," not "does this graph match
   MINE-1's fact list structurally") and conflating the two files would
   hide that distinction.
5. Report honestly, including if this reframe also plateaus. The standing
   rule for this whole investigation, restated: a result that kills an
   idea is exactly as valuable as one that ships, and goes in the write-up
   either way.

## What NOT to do

Do not add a tenth vocabulary-widening configuration to the existing
nine. Do not resurrect the `inferred` graph-hop verdict in any form — it
was killed by two adversarial cases, not by taste, and the proof that its
safe version is dead code is a real proof, not a hunch. Do not treat a
higher `bound` percentage, by itself, as evidence of anything — this
whole prompt exists because that number was already shown to mostly track
verdict strictness. The target is a reader that can SAY WHY it believes an
edge and say when it doesn't, not a bigger score.
