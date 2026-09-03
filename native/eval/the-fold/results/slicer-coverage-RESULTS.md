# The zero-call pass, run before the budget was spent (2026-09-02)

**Driver:** `eval/the-fold/slicer-coverage.mjs`. **Subject:** the same 162
object-missing `partial` notes. **Model calls: 0.** **Wall time: 6 seconds.**

## Why this runs first

Every model call in `ranke-slicers.mjs` asks a witness to POINT at which of
K candidate sentences states the proposition. That call can only succeed if
the slicer's top-K *contains* such a sentence, and whether it does is a
property of the ranking alone. So the arms can be examined without a
witness, and P85's own rule says they must be: a call that cannot move a
standing is waste regardless of price.

**Declared budget for this pass: 0 model calls.** It reads the same pool
through the same rankings — `ranke-slicers.mjs` now exports `poolOf`,
`candidatesFor` and the row sets, and guards its own run behind
`import.meta.main`, so this measures the instrument and not a copy of it.
The driver's own output is unchanged: re-running `N=2 SLICERS=random` gives
the identical table it gave before the refactor.

## Two findings, both of which change the design

### 1. `stating` is NOT structurally inert on this class — the premise was pinned on a fixture, not on the population

`slicer-licensing-RESULTS.md` states that `statingCandidates`' both-ends
gate can never fire here — "on an object-missing partial end2 never fires,
by definition of the class", so "the armed select protocol… has never once
run on this material". The supporting test is real and still passes:
`statingCandidates` returns zero on a synthetic paraphrase fixture.

On the real 162 it fires on **64**, a median of 2 candidates each. The class
label `missingSide: "object"` was assigned by the backwards walk's matcher;
`statingCandidates` applies a different, looser content-word gate, and the
two disagree on 40% of the population. Example, host `collectspace.com`:

    note   A special display of Armstrong's suit —was→ unveiled for the
           50th anniversary of Apollo 11 in July 2019
    cand   "We will have Neil Armstrong's spacesuit opening [on display…

The fixture test pinned a fixture. The generalisation from it to the
population was never measured, and is wrong.

### 2. `activation`'s II.23 control is not a control — it is structurally incapable of differing

`rankActivation(face, ends)` reads `ends.end1` only:

    const f1 = featWords(ends.end1);          // end2 is never consulted

The II.23 control rotates **end2**. So the control cannot change what this
arm ranks, and the measurement confirms it exactly: the rotated top-K is
**identical on 69 of 69** notes where the arm offered anything (mean Jaccard
1.00). Any separation the activation arm showed against its control would
have been witness sampling noise across two identical candidate sets, and
any control landing was guaranteed the same eight sentences as the real one.

L3 — "it beats a control built to fail" — could not have been evaluated for
this arm as constructed, in either direction. The n=2 synthetic run that
"validated the mechanism" did not catch this because it did not compare the
control's candidates to the real ones.

The other arms do move under the control: `random` 0.04 mean (identical on
1/162), `containment` 0.32 (8/152), `stating` 0.39 (6/22).

## The rest of the table

**Silence** — how often an arm hands the witness nothing at all, and what
the arm would actually cost at 2 calls per offered note per side:

| arm | silent | offered | median K | calls |
|---|---|---|---|---|
| `stating` | 98 | 64 | 2 | 212 |
| `random` | 0 | 162 | 8 | 648 |
| `containment` | 6 | 156 | 8 | 622 |
| `activation` | 93 | 69 | 8 | 276 |
| | | | **total** | **1758** |

The 2,592 figure priced arms as if they always offer. They do not: `stating`
and `activation` are silent on well over half the population.

**Distinctness** — mean Jaccard between arms' top-K, real side. Every pair
is low (0.01 to 0.23), so no arm is a duplicate of another and none is
removable on redundancy grounds. This is the one part of the design the pass
vindicates as built.

**Embedder:** not run here (`EMB=0`). Typed absence under L5, not a no-op arm.

## What this does not settle

Coverage in the sense that matters — does an arm's top-K contain a sentence
that *actually states the proposition* — still needs labels, and these 162
are object-missing partials precisely because no mechanical organ picks that
sentence out. That is the next cost, and it is one-time and reusable across
every future slicer, against a per-run cost that nothing reuses.

## Consequence for the re-run

Do not spend the licensing budget on the design as it stands. `activation`
needs a control that rotates something it reads, or it needs to consult
end2; until then its L3 line is unmeasurable. And `stating` must be
reported as a live arm on 64 notes rather than as the structurally-inert
baseline the previous doc describes.
