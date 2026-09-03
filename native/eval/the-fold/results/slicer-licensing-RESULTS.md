# When does the system earn an LLM or an embedder? (2026-09-03)

**Driver:** `eval/the-fold/ranke-slicers.mjs`. **Subject:** the 162
object-missing `partial` notes the Apollo 11 backwards walk left standing
(`ranke-backwards-RESULTS.md`) — the article states a proposition, the cited
source is readable and genuinely states it, and *the source says it in other
words*. **Population, not sample:** all 162, no budget truncation.

This is a licensing test, not a leaderboard. The question is not "which
slicer is best" but "has any learned component earned a slot, and by what
rule would it lose one".

## The rule, pre-registered in the driver's header before the run

A learned component (a model that reads, an embedder that ranks) earns a
slot when all five hold, and is refused when any fails.

**L1 — parity is the license.** The mechanical organ already in the tree
must be measured AT PARITY WITH ITS OWN CONTROL on this question. Parity
means the instrument carries zero information here, and that is the only
condition under which a model call is not P30 waste: where the mechanical
organ separates from control, a call buys what is already free. Run 4
established parity for containment at every grain; this driver re-measures
it as an arm rather than citing it, so the license is re-earned in the same
run it is spent in.

**L2 — it beats the cheap organ at the same reach.** Not "beats nothing".
P60's fourth amendment is the standing reminder that the skipped control is
the dumb baseline.

**L3 — it beats a control built to fail (II.23).** Every arm runs twice:
once on the real ledger, once with end2 rotated to the next note's object,
through the identical slicer, the identical witness and the identical
faces. An arm that lands rotated claims as often as real ones is measuring
topic, not proposition, and is refused on the spot.

**L4 — its authority is bounded to what the control covers.** An embedder
may RANK; it may never DECIDE. A model may POINT (the select protocol —
there is nothing to write, so the echo failure mode is structurally
impossible); it may never WRITE a fact. Every wrong answer either can give
must be catchable by an organ that is not itself learned: here the
sibling-swap arm, the indiscriminate-pick check, the decider-company wall
and the distinct-source count all sit below the model, and none of them is
a model. This is why `witnessNote` gained an injectable candidate set and
NOT a second protocol.

**L5 — the absence is typed.** A component that cannot run reports a named
gap; it never silently becomes a no-op arm that then reads as "no lift".

**The retirement clause** — the ratchet applied to learned parts: when a
mechanical organ is later measured to separate from control at the same
reach, the learned component is WITHDRAWN from that slot. Earning a slot is
not owning it.

## What is compared

`statingCandidates`' gate is `h1 > 0 && h2 > 0`: BOTH ends must fire
LITERALLY. On an object-missing partial end2 never fires, by definition of
the class — so the armed select protocol, the good one whose yes is checked
by a swap, has never once run on this material, and `witnessNote` fell
through to a generate call on a containment slice. The `stating` arm
measures exactly that rather than asserting it.

The five arms differ ONLY in how they rank. The candidate pool is identical
(`statingCandidates`' own minLen/maxLen), the count is identical (its own
limit of 8 — the giver is the existing default, not a new number), and the
witness below them is byte-identical:

| arm | ranking | learned? |
|---|---|---|
| `stating` | the unmodified both-ends gate | no |
| `random` | a seeded shuffle — **the confound control** | no |
| `containment` | the claim's content words present, morphology folded | no |
| `activation` | where end1's REFERENT is active (kernel `createActivation`, window 3) | no |
| `embedding` | cosine to the claim sentence (all-MiniLM-L6-v2, q8, local) | yes |

**The `random` arm is not decoration.** Every arm except `stating` relaxes
the both-ends gate, which by itself hands the select protocol eight
sentences it never had. If a random eight lands as often as a ranked eight,
the lift belongs to the relaxed gate and not to any slicer, and reporting a
ranked arm's number without this one would credit the wrong thing.

**Two controls at different strengths, both reported.** The rotated-end2
arm is the across-ledger control (an unrelated proposition). The
sibling-swap *inside* the witness is the harder, same-document one: it
swaps a competing filler drawn from the very candidates the picker just
read. An arm has to survive both.

**One difference from run 4, stated so the comparison is not overread.**
Run 4's containment instrument was the single best sentence through the
GENERATE path. This driver's `containment` is the same ranking promoted to
the SELECT protocol, so the comparison here isolates ranking with the
protocol held fixed; run 4's generate-path number stays the historical
baseline and is not the same measurement.

## Status: the rule is landed, the measurement is NOT taken

**Nothing in this document reports a licensing verdict on real material.**
Two full passes were launched and neither finished: the first starved on a
default fetch budget, the second was killed when the container running it
restarted about ten minutes in. The driver, the seam it spends, and the
tests around both are landed and green; the numbers are not taken.

What IS established, and what is not:

- **Established, by test:** `witnessNote` accepts an injected candidate set,
  and the arm below it does not move. An indiscriminate picker over an
  injected list is still convicted `indiscriminate`. The premise is pinned
  rather than assumed: `statingCandidates` returns ZERO on a paraphrase
  fixture, which is what an object-missing partial is.
- **Established, by construction:** the five arms rank over one identical
  pool at one identical count under one identical witness, so the comparison
  isolates ranking.
- **Mechanism validated, n=2, NOT evidence:** on a hand-built synthetic face
  the table already discriminated — `stating` offered nothing on the
  control, `activation` landed one and its control zero, `embedding` landed
  one and *also landed one on its rotated control*, which the driver
  correctly printed as REFUSED by its own control. Two notes decide nothing
  about paraphrase. It shows the licensing machinery runs and can convict.
- **Not established:** whether any slicer crosses paraphrase on real
  material; whether the lift belongs to a ranking or merely to relaxing the
  both-ends gate; whether the embedder earns its slot.

## The cost, priced after the fact, which is the wrong order

| | |
|---|---|
| notes | 162 |
| arms (4) x sides (2) x calls per witness (2) | 16 |
| **total model calls** | **2,592** |

Measured on the CPU this ran on, a 4-core Xeon at 2.1GHz with no GPU:
prefill 124 tok/s, decode 18 tok/s. The select prompt carries eight
candidate sentences and returns a tiny JSON object, so about 98% of the
token work is prefill. That is roughly two hours of model time.

**This is a design fault, not a hardware fault, and it is the same fault
P85 was drafted to prevent.** A call that cannot move a standing is waste
regardless of price. The minimum design that answers the licensing question
is `random` plus ONE candidate slicer over a declared sample: 480 calls at
60 notes, five times cheaper, at lower resolution. The full cross-product
was queued without a budget argument, which is exactly the discipline P9
exists to impose. A re-run should declare its budget first and justify each
arm against what it can move.

## Two other faults worth not repeating

**A `pgrep -f` waiter matches itself.** Every `until ! pgrep -f
'ranke-slicers.mjs'` loop had that literal in its own command line, so the
waiters could never fire and every status check reported RUNNING whether or
not it was. Watch a PID.

**A pipe ending in `tail` shows nothing until the process exits**, so a
progress-free log is not evidence of a slow run. Both long passes were
watched through exactly that pipe.

## Re-running it

    cd eoreader7/native/eval/the-fold
    # ollama must be up with gemma2:2b; the embedder needs the-fold's
    # node_modules (@huggingface/transformers, already a declared dependency
    # there for the void-loop reader) and NODE_USE_ENV_PROXY=1 behind a proxy
    NODE_USE_ENV_PROXY=1 N=162 node ranke-slicers.mjs

Each arm is written to `results/ranke-slicers.json` the moment it lands and
a re-run skips what is already there, so a restart costs one arm rather than
a pass. `FRESH=1` discards the checkpoint. `SLICERS=` selects arms,
`N=` the declared note budget, `SEED=` the random arm's seed.
`results/slicer-analyze.mjs` prints the license table and the cross-arm
overlap from one or more result files.
