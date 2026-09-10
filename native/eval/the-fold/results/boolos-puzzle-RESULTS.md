# The Hardest Logic Puzzle Ever — two new organs, one real bug, and a shape-matching answer to "can it read the riddle" (2026-09-10)

Three real deliverables, in the order they were built and tested.

## 1. Two new organs

**`organs/embedded-query.js`** — the embedding-lemma combinator: `saysDa(honesty, propositionTruth)` returns the LITERAL WORD a True or False speaker utters (never null-vs-guessed for Random) in answer to "If I asked you 'P?', would you say da?" Closed-form, no recursion — a question about a question, but a single identity to evaluate, not a loop. Also carries `NULL_WITNESS`/`isNullWitness` — a declared witness kind for testimony that is a coin flip *by construction*, distinct from every other "weak"/"unresolved" standing elsewhere in this codebase, which are always facts about the reader's power to examine, never about the source's own mechanism.

**`organs/distinguishing-plan.js`** — `SYN·Pattern` (the same cell `relative-pattern.js::correspond` occupies, a different act): `planDistinguishingQueries(hypotheses, candidateQueries, {budget})` exhaustively searches a small, explicit hypothesis space for an adaptive query plan that resolves every hypothesis within budget, refusing (never guessing) when none exists. `executePlan` walks a synthesized plan against real observed answers.

## 2. A real bug, caught by the test suite, not by review

The first draft of `embedded-query.js` returned an abstract "yes/no" boolean and pushed the da/ja translation into a separate `wordFor(answerTruth, {yesWord, noWord})` step. This is wrong: the actual lemma is about the **literal uttered word**, fixed regardless of secret meaning — not about "yes/no" as an abstract value that then gets mapped to a word. A test asserting the true, stronger invariant ("the god literally says 'da' when P is true, for both True and False, regardless of which word secretly means yes") caught the mismatch immediately. Fixed by collapsing the module to compute word-identity directly (`saysDa`/`word`), with no word-mapping parameter anywhere — there was nothing to map.

Separately, `distinguishing-plan.js`'s first draft modeled "no signal" (Random) as a third *observable* branch. Real bug, caught the same way: `boolos-puzzle.mjs`'s first full run failed 2 of 6 real hypotheses. Random's coin flip still produces an ordinary true/false word on the wire — the uncertainty is *which* branch it lands in, never a third channel. Fixed with the `EITHER` sentinel: a hypothesis whose query answer is nondeterministic is placed into **both** branches, and a plan is only valid once every such duplicated hypothesis resolves correctly on **both** branches it could land in.

Both fixes are the direct, measured proof of this session's own standing discipline: a control built to fail catches what review alone would have shipped wrong.

## 3. The puzzle, solved, verified 1200+ trials

`boolos-puzzle.mjs`: 6-hypothesis space (3! assignments of true/false/random to A/B/C), 18 candidate queries built from the embedding lemma, a 3-question plan synthesized by `distinguishing-plan.js`, executed against all 6 real hypotheses, 200 trials each (1200 total, including the genuinely random branches) — 100% correct every time.

## 4. "Can the system read the riddle?" — shape-matching, not NLU

The honest limit named earlier this session stands: there is no general mechanism here for turning arbitrary English into a verified formalization, because (unlike a citation) a riddle's own text carries no ground truth to check a proposed formalization against. What's buildable, and built: **`organs/puzzle-templates.js`** — a small, closed, growing library of recognized puzzle SHAPES, each with a mechanically-checkable signature (closed regex over named agents, a closed role vocabulary, an explicit word-ambiguity clause, a stated query budget — the same "detect by shape, not by understanding" move `arithmetic.js::detectArithmetic` already makes) and a verified formalization recipe, registered by a named giver (Boolos 1996).

**Checked, not assumed live_priors coverage first:** the corpus's only "wordplay" holding is Guardian cryptic-crossword clues — a different genre entirely, no direct match for this puzzle class. The `.eot.json` sidecar pattern the corpus does carry (confirmed real: `schema/source/structure/propositions/acts/gaps`) is the right infrastructure *shape* for this kind of template registry, even though this specific puzzle wasn't already sitting there.

**`eval/the-fold/puzzle-template-end-to-end.mjs`** proves the whole chain, raw text in, verified solved plan out, four cases:

1. The **exact original wording** (en-dash, footnote marker and all) — matched, solved, verified.
2. A **fully renamed paraphrase** (different agent letters, different role words — Honest/Liar/Unpredictable instead of True/False/Random — different yes/no words, same budget) — matched, extracted correctly, solved, verified. This is the proof it's genuine shape-matching, not string matching.
3. The **same paraphrase with the budget dropped to 2** — correctly, honestly **refused**: 3 questions is the puzzle's real minimum, and the planner reports `undetermined` rather than fake a shorter solution. Not a bug — the intended behavior, caught by testing an intentionally-impossible case.
4. A **non-puzzle sentence** — correctly refused at the signature-match stage, before any solving is even attempted.

## Files

`organs/embedded-query.js`, `organs/distinguishing-plan.js`, `organs/puzzle-templates.js` — new. `tests/embedded-query.test.js` (15 cases, including an independent brute-force cross-check), `tests/distinguishing-plan.test.js` (10 cases) — new, both passing. `eval/the-fold/boolos-puzzle.mjs`, `eval/the-fold/puzzle-template-end-to-end.mjs` — new, re-runnable drivers. Full native suite: 1294/1296 passing, the same 1 pre-existing failure (`spans-frontmatter.test.js`, unrelated corpus fixtures) confirmed unrelated, zero regressions.
