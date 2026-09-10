# How far "all possible reasoning mechanical" actually goes (2026-09-10)

User's correction to the earlier routing proposal, verbatim: *"why aren't
we doing most of that mechanically? the model can assert, it gets
EOT-ized, and it must follow dependency orders."* Then: *"we want all
possible reasoning to be mechanical."* This replaces Piece 2 of
`model-routing-design-PROPOSAL.md` ("escalate to a bigger model for
reasoning-depth questions") — that was the wrong fix. Escalating model
size doesn't make a model's *arithmetic-on-relations* trustworthy any
more than it makes its arithmetic-on-numbers trustworthy (the capability
ladder's own non-monotonic arithmetic result already proved that once).
The fix is the same shape `arithmetic.js` already uses, generalized: the
model supplies the premises, the kernel derives the answer.

## Proof of concept, working, zero model calls for the reasoning step

`mechanical-transitive-reasoning.mjs`, run against the exact specimen
that tripped gemma2:2b and llama3.2 (`model-capability-ladder-
RESULTS.md`): "Alice is older than Bob. Bob is older than Carol. Is
Carol older or younger than Alice?"

```
Derived facts:
  alice —older_than→ carol  (giver: derived:p1+p2)

Question: Is Carol older or younger than Alice?
Answer: YOUNGER_THAN (derived: alice -older_than-> carol, inverted; zero model calls)
```

The premises (`alice older_than bob`, `bob older_than carol`) are hand-built
here as `EOHyperedge@1` edges — in a real turn a small model's job would be
narrowed to STRUCTURED EXTRACTION of the premises from the prompt (name
the ordered pairs a comparative chain states), never the comparison
itself. `older_than` is declared `transitive` (one line, one named giver —
`declarations`/`reaction.js`'s own law: composition is a giver's claim,
never a default). `reaction.js::createReactionSubstrate` then derives
`alice —older_than→ carol` through the kernel's real chain-finding and
composition machinery (P60's own reaction circuit — this is not new
infrastructure, it's the first real caller outside eoreader7's own eval
suite to point it at a live specimen). The final "older or younger" is a
one-entry inverse-relation lookup, not a judgment.

**One real bug found building this, worth recording:** `hyperedge()`'s
chain-finder (`relation-composition.js::projectedEdge`) silently refuses
any edge with no `witness` field — the first cut of this driver built
edges without one and got zero chains, zero derived facts, with no error.
Not a defect in the kernel (an unwitnessed edge genuinely shouldn't
compose — P5.2's own discipline, a claim needs an address), but worth
naming because it is exactly the kind of silent-gap failure this
codebase's own postmortems keep catching in OTHER people's code
(P22/P24/P39's drift-class bugs) — caught here the same way those were,
by running it and reading the actual output rather than trusting the
wiring.

## What generalizes, and how far

The mechanism this proves out is: **premises as EOT edges → a declared
composition law → a derived fact, provenance-addressed.** That's not
specific to "older than." It's the SAME shape as:

- **Transitive comparatives**: older/younger, before/after, taller/
  shorter, ancestor-of, contains/contained-by. One `transitive(r)`
  declaration each — a small, closed, giver-named table (the same
  posture `priors.js`'s closed classes already take), not a per-question
  re-derivation.
- **Non-transitive adjacency closing into a transitive product**
  (`closureAffordances`, already built and exercised at scale in P60's
  own succession-chain work: `replaces(c,b) ∘ replaces(b,a)` doesn't
  yield `replaces(c,a)`, it yields a DIFFERENT relation the giver must
  name — "succeeded transitively"). This is the general form for any
  "X immediately precedes Y" chain a question states, not just
  presidential succession.
- **Arithmetic embedded in a reasoning question** ("if a train leaves at
  3:15pm and arrives at 5:40pm...") — already covered by `arithmetic.js`
  once the premises are extracted as a computable expression; the
  capability-ladder specimen only reached a model because the app-level
  door wasn't exercised in this raw-Ollama experiment, not because the
  mechanism is missing.
- **Consistency checking, for free**: `refutation.js::refuteRelation`
  already vetoes a derived chain that violates a declared uniqueness or
  cycle constraint (P60's own pruning result — a licensed composition
  that turns out to produce a genuine contradiction gets caught and
  conceded, not silently believed). A mechanically-derived answer is
  checked the same way a mechanically-derived succession chain already
  is in production.

## Where the real wall is — and it's not model size

`declarations.js`'s own law, several times over in this codebase's
history (P60's four amendments): **composition is licensed by a named
giver, never inferred from the corpus, and only two declared kinds exist
— `transitive` and `composes`.** This is not a gap to close by trying
harder; it is the grain theorem, tested and re-confirmed multiple times
(P60's own falsification probe: a structurally identical dominance chain
and succession chain cannot be told apart by scanning alone — only a
giver's claim about what the RELATION MEANS can license composing it).
So "all possible reasoning mechanical" has a real, principled edge, not
an accidental one:

- **A relation the giver has declared transitive/composable**: fully
  mechanical, arbitrary chain depth, checked for cycles/uniqueness,
  provenance to the premises. This is now proven, not just designed.
- **A relation nobody has declared anything about**: the composition
  step correctly refuses (`withheld`, not guessed) — and THIS is where a
  model is legitimately needed, but only to READ the relation off the
  question (does it look like a comparative/succession/containment
  shape that a closed table should cover) or to DECLARE a new giver-named
  affordance explicitly (the `/declare` door already exists for a person
  to do this by hand) — never to compute the composed answer itself.
- **Genuine semantic/world judgment** (does this paraphrase entail that
  one, is this argument sound) stays outside this mechanism entirely —
  P44's own standing wall: coherence never establishes correspondence.

## Revised recommendation, replacing Piece 2 of the routing proposal

Drop "escalate reasoning-depth questions to a bigger model." Replace
with: **extract premises mechanically (a small model's narrowed job, or
a closed-class parser for common comparative phrasing), declare the small
set of common comparative/succession relation kinds as transitive/
composes ONCE (not per turn), derive through the kernel's real
composition machinery, and only fall back to a model's own free judgment
when the relation genuinely isn't in the declared set** — at which point
the honest move is a typed `withheld` disclosure (this codebase's own
standing posture: absence licenses withholding, never manufactures a
guess), not a bigger model guessing anyway. Piece 1 (mechanical
arithmetic) and Piece 3 (confabulation witness, real containment check)
from the original proposal are unchanged by this.
