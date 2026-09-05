# The null, at zero model calls — and the selection is only 10% better than chance (2026-09-04)

**Audit 2026-09-05 (the-fold P95 / S65): reproducible only where the walk's fixtures exist.** The walk names 106 faces; 86 were untracked at `5541af4` (32 minutes after this doc). The driver now REFUSES with a typed `fixture_absent` gap and exit 2 on any checkout lacking them (`lib/walk-fixtures.mjs`, pinned by `native/tests/walk-fixtures.test.js`) — never a narrowed pool. On this checkout it refuses.

`node native/eval/the-fold/cited-source-null.mjs`. **Zero model calls.**

User, on a plan to spend ~350 calls on a null band for the walk: *"what are
you running calls for? that's a lot, i feel like the point of making RULES is
so we can do minimal calls."*

Correct, and it is this repo's own discipline. `reading-wall-RESULTS` ran its
zero-call pass **before** declaring a budget, and the budget it then declared
was smaller because of what the free pass had already settled. I skipped that
step and went straight for the spend.

## The decomposition that makes it free

The walk spent 60 asks and skipped 6,483 pairs **without** an ask. The
skipping is mechanical: a note–source pair is feasible only when the note's
two ends co-occur somewhere in that source (`endsCopresentWindow`). **The
stage that decides what gets asked costs nothing, so it can be nulled for
nothing** — and it is the stage that determines everything downstream.

## The measurement

Object deranged across every admitted edge — same subjects, same verbs, same
multiset of objects, same witnesses, same spans, only **which object belongs
to which subject+verb** destroyed. 20 draws.

| | real | redealt median (range) | draws ≥ real |
|---|---|---|---|
| **feasible pairs** | **2,384** | 2,176 (2,118–2,265) | **0 / 20** |
| notes with ≥1 feasible source | 490 | **499** (472–524) | — |

**The candidate set carries the relation, and barely.** 2,384 against a null
median of 2,176 is a **9.6% lift**, outside every draw at rank p ≈ 0.048 — a
real signal at the floor of what 20 draws can resolve.

**And at the note level there is no separation at all.** Real 490 against a
null median of 499: destroying every relation leaves *more* notes reachable.
The pair-count lift is diffuse; it is not that the right notes become
reachable.

## What that says about the 0.033

The witness was handed 60 pairs drawn from a pool only a tenth better than a
pool with the relations destroyed, and refused 56 of them. **The refusals were
right.** The two it accepted failed inspection — a claim about the lunar
module decided by a sentence about a camera mount, and a claim about returning
to the CSM decided by a photo caption of the crew driving to the launch pad.

So the constraint is not the witness's recall and not the corpus's
independence. **It is the selection**: a candidate set at 1.1× chance cannot
be turned into corroboration by any judge placed after it, and 350 model calls
would have bought a number that this pass got for nothing.

## The near-miss, recorded

The first version of this driver called `endsCopresentWindow(note, text, …)`
with the arguments reversed and the ends unwrapped — the real signature is
`(sourceText, {end1, end2}, opts)`, as the walk's own call at
`corroboration.js:956` shows. **Both arms read 0 feasible pairs**, and the
driver duly printed the confident opposite conclusion: *the candidate set does
not carry the relation*. A null and a real number that are both zero is a
broken instrument, not a finding; it was caught only because the walk had
already spent 60 asks and 60 > 0. II.23 catching the person writing the check,
again.

## Said against it

- One corpus, 16 sources, one derangement scheme.
- p ≈ 0.048 is the smallest p 20 draws can report; it means "outside every
  draw", not "strongly separated". More draws would sharpen it and cost
  nothing.
- Feasibility is necessary for corroboration, not sufficient. A candidate set
  with a real lift could still be judged badly — this bounds the ceiling, it
  does not explain the two bad votes.
- `window: 400` is `endsCopresentWindow`'s own default and a known hand-picked
  constant (P4 debt, named at its definition). It is not derived here.

## Files
`cited-source-null.mjs`, `results/cited-source-null.json`.
