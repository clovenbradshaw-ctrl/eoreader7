# P85's licensing run, finally taken — and the wall it names cannot do the job it is named for

`node native/eval/the-fold/ranke-slicers.mjs` with `N=40
SLICERS=containment,activation,random`. Live `gemma2:2b` on CPU, 220 model
calls, ~13 min. The target set is the one P85 declared: the 162
object-missing `partial` notes from the Apollo 11 backwards walk, 40 walked.

P85 shipped the licensing rule and said plainly of its own evidence:
*"Measured? Not yet… the verdict is not taken, and this entry claims none."*
The run died with its container twice. This is that verdict.

## The license table

| slicer | offered | real "states" | control "states" | verdict |
|---|---|---|---|---|
| containment | 40/40 | 9 | 1 | separates from control |
| activation | **16/40** | 2 | 2 | **REFUSED by its own control (II.23)** |
| random (confound) | 40/40 | 2 | 3 | **REFUSED by its own control (II.23)** |
| embedding | — | — | — | `unavailable`, typed (L5) — the package is absent from this checkout |

Read at face value: containment separates, the two others do not, and the
confound control behaves as a confound control should. The proposed better
slicer — referent activation, the one that can see "the crew", "it", "the
module" — could not even OFFER candidates on 24 of 40 notes, and on the 16
it could, it landed real and control at the same rate.

## The table is not the finding. The sample is.

Reading containment's nine landings rather than counting them:

| claim | the decider the witness signed |
|---|---|
| Armstrong —began→ his descent to the lunar surface | «Schmitt then introduced Jones to the other 11 Apollo astronauts…» |
| Aldrin —tossed→ the bag down | «Buzz Aldrin Sets Foot on the Moon **This video shows**…» |
| Armstrong —uncovered→ a plaque mounted on the LM ladder | «**Support the Museum**» (random arm, same failure shape) |
| Apollo —has→ come close to the excitement… | «**Visit the Apollo Journals Website**» (activation arm) |

Page furniture, navigation links and video captions, signed as testimony.

Applying the decider-company wall — the check `witnessNote`'s GENERATE path
already runs, post-hoc over the recorded landings, using the same
`textFeatures`/`sameAct` organs:

| arm | landings | survive the wall | fail |
|---|---|---|---|
| real · containment | 9 | **1** | 8 |
| real · activation | 2 | 1 | 1 |
| real · random | 2 | 0 | 2 |
| control · containment | 1 | 0 | 1 |
| control · activation | 2 | 1 | 1 |
| control · random | 3 | 1 | 2 |

**Containment's 9-vs-1 separation becomes 1-vs-0.** There is essentially no
signal left to license anything with. This reproduces exactly the pattern
S50 already recorded about a different probe: *"two earlier, cruder probes
of the same idea each produced a plausible number that dissolved on
inspecting the sample rather than the count."*

## The structural finding: L4's named guard cannot guard this slot

P85's L4 says a learned component's authority is bounded by non-learned
organs below it, and names them: *"the sibling-swap arm, the
indiscriminate-pick check, **the decider-company wall**, and the
distinct-source count all sit below the model and none of them is a
model."*

**The decider-company wall is not below the select path at all.** It runs
only on the generate path. The select path skips it on a justification
stated in `witnessNote`'s own comment:

> "The decider is verbatim by construction, so the decider-company wall
> below is satisfied structurally and the echo failure mode cannot occur."

That conflates two different failure modes. Verbatim-ness does make the
ECHO mode impossible — a model pointing at a candidate cannot invent one.
It says nothing about whether the decider is RELATED to the claim.
`statingCandidates`' own `h1 > 0 && h2 > 0` gate covered relatedness in
practice, which is why the gap stayed invisible — **until callers began
INJECTING candidate lists, which is precisely the seam P85 added for
slicers, and which bypasses that gate entirely.**

**And the wall cannot simply be switched on, because it forbids the very
thing the seam exists for.** This was implemented and measured, not
reasoned about: applying the per-end company wall to the select path breaks
`corroboration.test.mjs`'s own pinned capability test, whose premise is
stated in the test itself —

> "end2 never fires literally — this is what an object-missing partial IS"

The wall works by requiring each end's own words (modulo morphology) in the
decider. The seam exists to reach cases where an end's words are absent.
**They are mutually exclusive as designed.** The change was reverted; the
suite is back to its baseline 11 failures, identical by name.

So the honest state of the slicer slot: **no non-learned organ currently
guards relatedness on it, L4 is unsatisfied there, and no slicer earns a
license.** Not because slicing is a bad idea — because its landings are
dominated by an unguarded failure mode, and the guard the rule names is the
one guard this seam cannot use.

## What would actually close it (named, not built)

A relatedness guard for injected candidates has to be one that does not
require an end's literal words, since that is the case being reached. Two
shapes are available in this repo and neither is measured for this:
referent identity on the ends (`makeReferentIndex`, so "the crew" resolves
to the crew rather than matching on letters), or the arm's sibling pool
drawn from the reader's own referent state rather than from capitalized
surfaces in one candidate list. Both are the same move — resolve the end,
then ask about the referent — and both are exactly what a same-day probe of
the arm independently landed on.

## Disclosed

- n = 40 of 162, one page, one model, one temperature. The embedder arm
  never ran (typed `unavailable`, L5 satisfied), so the embedder half of
  P85's question is still unanswered.
- The post-hoc company wall is applied here as a MEASUREMENT over recorded
  landings, not as shipped behaviour. Nothing in `corroboration.js` changed.
- The one containment landing that survives the wall, and the one
  activation landing that does, were not adjudicated against an oracle.
  "Survives a mechanical relatedness check" is not "is true".
