# The arm lied — and the reason is that this is the first run where the guard was actually tested (2026-09-04)

`FACE_ONLY=1 node native/eval/the-fold/cited-source-walk.mjs`. gemma2:2b,
73 model calls, 227s. Budget and bar declared before the first call.

## The declared bar, and the raw result

> *beat 0.033 clean votes per ask, with 0 lies, and with votes that survive
> reading.*

| | ledger | asks | attested | clean votes/ask | **lies** |
|---|---|---|---|---|---|
| copresence selector | 919 notes | 60 | 2 | 0.033 | 0 |
| **referent selector** | **55 notes** | 60 | 9 | **0.150** | **2** |

**4.5× the rate — and the arm lied.** Two of the four planted fabrications
were attested. This is the first time an arm has failed the precision guard in
this project's history, and the number that looks like a win is what the lying
bought.

## Why it lied, which is the finding

Not because the selector is worse. Because **this is the first run in which
the planted fabrications were actually asked about.**

| | ledger | asks | share of notes reachable |
|---|---|---|---|
| every prior walk | 919 notes | 60 | ≤ 6.5% |
| this walk | 55 notes | 60 | **all of them** |

A planted fabrication diluted in 919 notes is almost never selected, so
"0 lies" measured that the guard was never reached — not that the witness
refused it. Restricting the ledger to the 51 the referent path selects made
the guard small enough to actually fire, and it fired.

**So every `0 lies` reported by a walk in this repo is suspect on the same
grounds.** (The *calibration* batches are not: `WITNESS_OPERATING_POINT`'s
0/36 came from batches that deliberately asked about fabrications, so those
were genuinely exposed. It is the walks' own planted guards that were
diluted.)

And the fabrications here are the hard kind by construction: a real
subject+verb with **another note's object from the same document**. Their ends
are therefore highly co-present, the select protocol finds real sentences
containing both, and it picks one.

## Reading the nine

Of 9 attested, by inspection:

- **2 are planted fabrications.** Lies.
- **~5 have deciders that do not state the claim.** `the lunar module —was→ on
  the lunar surface` decided by a sentence about where a *camera was mounted*;
  `Armstrong and Aldrin —returned→ to the CSM` decided by a caption of the
  crew *driving to the launch pad before launch*; `the spacecraft's apex cover
  —was→ jettisoned` decided by a sentence about the *Boost Protective Cover*.
  The first two are the same two bad votes the copresence run produced.
- **2 look genuinely clean.** `Armstrong stepped off the LM ladder onto the
  Moon's surface` ← *"At about 109 hours, 42 minutes after launch, Armstrong
  stepped onto the moon."* And `Bill Anders served as backup CMP` ← *"The
  Apollo 11 backup crew of Commander James A. Lovell, CMP William A.
  Anders…"*

**The genuinely clean rate is ~2 in 60 — 0.033. Unchanged.** The entire
apparent gain is lies and topic adjacency.

## What this reverses

Three passes ago I concluded, from the selector's null, that *"the constraint
is not the witness's recall — it is the selection."* That was half right and
the wrong half was load-bearing. Fixing the selection raised throughput 4.5×
and **none of the added volume survived reading.** With the selector improved,
the judge is now demonstrably the binding constraint: shown a genuinely
better-selected candidate set, the witness attests fabrications at 2 in 4.

Byte containment is not entailment; per-end company is not entailment. Both
walls passed every one of these. That has now been said four times on four
corpora, and this is the first time it was said by a **failed guard** rather
than by my reading of a marginal decider.

## Said against it

- 4 planted fabrications is a tiny guard. 2 of 4 is a wide interval; the
  right move is a larger planted set, which costs nothing to build and only
  asks to run.
- The clean/unclean split among the 9 is my reading, printed in full above so
  it can be disputed.
- One arm, one model, one corpus, one budget.
- The 51-note ledger is 5.6% of the material, so this arm's recall ceiling is
  low by construction; the comparison is on precision, not coverage.

## The next measurement, and it is cheap

Re-run with a **much larger planted set** (say 25 fabrications among the 51)
so the guard has power, and report the false-attestation rate directly. That
is the number `WITNESS_OPERATING_POINT` claims to be 0/36 for generate and has
never had for select at ask-time. One 60-ask run.

## Files
`cited-source-walk.mjs` (`FACE_ONLY=1`), `results/cited-source-walk.json`.
