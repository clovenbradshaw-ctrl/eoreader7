# How far without an LLM — e2e reasoning driver, first pass

`eval/reasoning-e2e-no-llm.mjs` asks a small set of questions against real
prose and answers them using only mechanical organs already in this repo —
`hypergraph.js`'s real extraction/judgment (`makeRelationReader`), its
direct graph-query door (`queryEdges`/`queryFillers`), and
`verification.js`'s nine-cell taxonomy. **Zero model calls anywhere in the
run.** Full raw output is reproducible with `node eval/reasoning-e2e-no-llm.mjs`.

## Environment note, disclosed rather than glossed over

This session's sandbox does not carry a live `eoreader6.1` checkout matching
what CLAUDE.md's later sections describe (HL, `interpretation/hl.js`,
per-source testimony) — that work either never landed on `eoreader6.1`'s
real git history or landed on a branch this sandbox cannot see. What *is*
real and present at `eoreader6.1` commit `51cf2ae` (the pinned snapshot
named in this repo's own migration notes) is the layer this driver actually
exercises: `perceiver/text/{spans,surfaces,relations,material}.js`. Against
that pin, `hypergraph.test.mjs`/`verification.test.mjs`/`grid.test.mjs` run
at 111/119 passing (verification.js and grid.js fully green; the 8
hypergraph.js failures are unrelated morphology/lemmatizer-organ drift, not
touched by this driver). This driver only uses what's green.

## What got a real, mechanical answer

**Tier 1 — direct claim verification** (`report.read(claim)`, i.e. `judge()`):
- `"Lincoln appointed Seward"` → `bound` (the material states this edge).
- `"Lincoln appointed Chase"` → `unbound`, with the nearest real edge named
  (`Lincoln —appointed→ Seward`) — a genuine near-miss disambiguation: the
  material says Lincoln *nominated* Chase, a different verb, and the
  extractor correctly refused to conflate them.
- `"Seward did not negotiate the Alaska purchase"` → `unbound` (not
  `contradicted` — see Limits, below).
- `"Lincoln appointed Napoleon"` → `unbound`, again with the nearest real
  edge offered rather than a bare refusal.

**Tier 2 — direct graph queries** (`queryFillers`, no sentence ever
extracted for these): "who did Lincoln appoint?" → Seward; "who did Lincoln
nominate?" → Chase. Answered straight off the material's own edge set.

**Tier 3 — novel answers, genuinely composed, not stated anywhere as one
sentence:**
- *"What did Lincoln's Secretary of State go on to negotiate?"* — no
  passage says this. It's built by chaining `Lincoln —appointed→ Seward`
  with `Seward —negotiated→ the Alaska purchase`, two edges from two
  different sentences, addressed to both.
- *"Who chose the person who administered Grant's oath?"* — chains
  `Chase —administered→ Grant` with `Lincoln —nominated→ Chase`.

Both are real two-hop graph composition: a question the material never
answers in one place, answered correctly by walking two real, addressed
edges. This is the actual headline finding — **novel, in the literal
sense of "never stated," and correct, with zero generation involved.**

**Tier 4 — verification.js's nine-cell taxonomy:** on the bound claim,
4 of 9 cells compute a real verdict (Void/Entity/Field/Link all `holds`);
on the no-such-referent claim, Link correctly flips to `fails`. The other
5 cells (Kind, Network, Atmosphere, Lens, Paradigm) report
`not_yet_executable` with a named reason each — exactly the state CLAUDE.md
already discloses for this module, reproduced live rather than assumed.

## Limits, found live rather than assumed

- **Negation isn't caught as contradiction here.** `judge()`'s own
  negation-squaring machinery lives in `capacity-runner.js`
  (`negationCandidates`/`squarePolarity`), not in bare `report.read()`. Fed
  a claim through `read()` alone, a negated claim that opposes a real
  positive edge lands `unbound`, not `contradicted` — correct behavior for
  this door, but a reminder that "contradicted" is a `capacity-runner.js`-
  level guarantee, not a `hypergraph.js`-level one on its own.
- **Sentence shape matters a lot.** An early draft of the corpus used
  fronted adverbials ("Seward *later* negotiated...") and the extractor
  anchored the verb on "later" instead of "negotiated" — the same
  fronted-adverbial gap this repo's own CLAUDE.md already names for
  MINE-1. Plain SVO sentences extract cleanly; anything more literary
  needs the wider clause coverage this repo's own notes already flag as
  unbuilt.
- **A name needs a non-sentence-initial occurrence to be trusted as a
  referent at all** (L2's own rule: capitalization alone never suffices).
  An early corpus draft had "Lincoln" appear only sentence-initially and
  the whole extraction fell over — every edge came back with a
  garbled subject. One corroborating mid-sentence mention per name fixed
  it. This matches CLAUDE.md's own SEED-SPEAKER finding, reproduced on
  fresh material rather than taken on faith.

## Bottom line

For prose written in plain SVO shape with real referent recurrence, this
repo's mechanical stack alone (no model call) can: verify a claim against
material, disambiguate a near-miss, refuse an absent referent while
still naming the nearest real fact, answer a query the material never
states as one sentence directly off the graph, and — most notably —
**compose a genuinely novel two-hop answer from two independently stated
facts.** It cannot yet do negation-as-contradiction outside
`capacity-runner.js`'s wrapper, and it is honestly limited by sentence
shape (fronted adverbials, relative clauses) exactly where this repo's own
CLAUDE.md already says it is.
