# Build high on one source, and carry what would knock it over (2026-09-04)

`node native/eval/the-fold/premise-levels.mjs`. **Zero model calls.**

User: *"I don't think it should be ONLY, it should make it another level of
knowledge"* and then, sharper: *"we should be able to build very high with a
single source, but it is unstable knowledge, able to be knocked over easily."*

`premisesOf` (derivation.js) still sorts every note into **premises or
stopped** on a hard floor. That is the last binary in the chain and it sits
where new facts are composed. This pass measures what it does, whether a
graded level could replace it, and — after the first two answers came back
negative — what CAN be measured instead.

## 1. The gate, applied to real material, empties the layer

| premises by source count | |
|---|---|
| 1 source | **24** |
| 2 sources | 1 |

| arm | derived | true | false | unverifiable | precision |
|---|---|---|---|---|---|
| **floor 2 — the shipped gate** | **0** | 0 | 0 | 0 | — |
| floor 1 — no gate | 23 | 16 | 3 | 4 | 0.842 |

One premise clears a two-source floor, and a single premise composes with
nothing. **Floor 2 does not trade recall for precision here; it produces
nothing at all.** The `floor 1` row reproduces `derivation-precision`'s arm C
(23 / 16 / 3 / 0.842) exactly, which is what says this closure is faithful.

**And the gate has never run.** `premisesOf` is called only from
`makeDerivation`; `makeDerivation` is named in `capacities.js` as a registry
string and invoked by no driver. `derivation-precision.mjs` — the one
derivation result with an independent oracle — builds the reaction substrate
directly and bypasses it. The gate is unit-tested against synthetic notes and
has never met real material.

## 2. A level graded by truth cannot be tested here — twice over

**No variation to grade.** 24 of 25 premises sit at one source, so every
derived fact's weakest premise is 1. The ladder has one rung.

**And the judge cannot separate.** Real precision 0.842 against 12 redeals
(the succession destroyed, marginals kept): **0.714, 0.727, 0.76, 0.8, 0.8,
0.818, 0.833(real), 0.875, 0.885, 0.955, 1.0, 1.0, 1.0** — five redeals BEAT
the real number. The oracle is TRUE for a generous share of random
within-office pairs, which `derivation-precision-resolution.mjs` already
warned. **Grading knowledge levels by truth on this harness would be grading
against noise.**

## 3. What survives: stability is structural, and needs no oracle

The user's framing is the one that measures. Build freely; carry how far a
concession would propagate. `concede` (REC·Figure) already withdraws every
product resting on a premise transitively — this prices that concession, and
because it is a property of the dependency graph rather than of the world, it
is untouched by the oracle's failure above.

| | |
|---|---|
| derived facts | 23 |
| resting on at least one single-source premise | **23 (100%)** |
| withdrawn by the single most costly concession | **4 (17%)** |
| longest chain | 3 links |

**Both halves of the user's sentence are confirmed, and the second is milder
than feared.** Every derived fact here is single-source knowledge — under the
shipped gate none of it exists. All 23 are knock-over-able. But the worst
single concession takes **17%** of the layer, not the whole thing.

### The control, and its direction

A hub-shaped dependency is the fragile one, so the question is whether the
real material concentrates **more** than chance, not merely whether it
differs. Succession redealt, 12 draws, share of derived facts resting on the
single most load-bearing premise:

**real 17.4%, redealt median 39.3% (29.2–55.6), real below every draw.**

Real succession **spreads** its load. The teetering-tower shape is what
destroying the relation produces, not what the relation has. Single-source
knowledge built on real structure is broad and shallow, not tall and thin.

## What this argues for

Not a gate, and not a truth-graded score. **A disclosed fragility**: admit at
one source, and carry on every derived fact both the weakest premise in its
chain and the count that would fall with it. That is computable now, on
material that exists, with no oracle and no model.

## Said against it

- **Three Wikidata fixtures, 25 premises, 23 derived facts.** Small, one
  domain, one relation.
- The 17% figure is one corpus's dependency shape and should not be quoted as
  a general property.
- Corroboration barely varies here (24/25 at one source), which is the same
  scarcity that made floor 5 look stuck. **The ladder should be built and
  tested on the 34-host cited-source corpus** (`cited-source-independence-RESULTS.md`),
  where independence was just shown to be real and would actually vary.
- Nothing here measures whether a two-source premise is *better*. It measures
  what a one-source premise *costs*.

## Files
`premise-levels.mjs` (new).

---

# Addendum, same day — the other Ns can arrive, and there is nowhere for them to land

User: *"a scientist can have an N=1 and build an entire worldview, and in fact
that's the only way to start. the other Ns must be able to come and knock it
down tho."*

The first half is confirmed above. This is the second half, traced through the
code rather than argued. **Zero model calls; this is a structural audit.**

## The demolition machinery is complete, and nothing calls it

`concedePremise` (derivation.js) concedes a premise **and** withdraws every
product resting on it, transitively, each withdrawal appended as its own
REC·Pattern entry naming its `trigger` and what it `cascadedFrom`, nothing
deleted. It refuses a concession with no trigger. It is well built and it is
tested.

Its only callers are `derivation.test.mjs`. Same for `withdrawDerived`.

## And nothing *could* call it, because a contradiction never lands

In the entire corroboration walk the log is assigned in **exactly one place**:

```
910:  let next = log;
988:    if (!r.refused) { next = r.log; attested.push({...}); }
```

Line 988 is inside the **attestation** branch. The contradiction branch
(981–984) writes only `contradictSources`, an in-memory `Map` the file's own
comment marks `THIS RUN`, and a `contradicted` array returned for display.

So a contradicting source is heard, tallied, reported — and discarded when the
function returns. It cannot persist, cannot accumulate, and can never reach
the cascade. **The record has a place for agreement and no place for
disagreement.**

## The reason is principled, and it justifies less than it is doing

The file states it: at n=2 a states/contradicts pair is **undecidable by
construction** — nothing says which of the two sources is wrong, so landing a
contradiction would be a conviction the evidence does not support. That is
correct, and it is the same withhold-rather-than-convict rule that keeps the
lie count at zero everywhere else.

But it justifies **not convicting**. It does not justify **forgetting**. That
two sources disagree about a note is true whoever turns out right, and it is
precisely the thing a third source would settle. `thirdSourceCandidates`
exists to go find that third source — and nothing carries the contest forward
to make the search worth mounting later.

## What it costs, concretely

On the succession material measured above: the most load-bearing premise
carries 4 of the 23 derived facts. If a contradiction could land on it and
cascade, those 4 would be withdrawn, each naming its trigger.

Today the number that falls, for any premise, under any amount of contradicting
evidence, in any number of runs, is **0**.

## The gap, named

Not "land contradictions" — that is the conviction the n=2 argument correctly
refuses. **A contest must be a durable object on the record**: this note, these
sources stating, these sources contradicting, unresolved. Then a third source
can settle it, a settled contest can trigger a concession, and the concession
already knows how to bring down everything resting on it.

Corroboration accumulates across runs. Contest evaporates at the end of each
one. That asymmetry is the whole gap between "can be knocked down" and "is
never actually at risk."

## Files
Read-only audit — `organs/corroboration.js` (lines 910, 981–988),
`organs/derivation.js` (`concedePremise`, `withdrawDerived`).
