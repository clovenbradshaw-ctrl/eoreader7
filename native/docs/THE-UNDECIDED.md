# The undecided reading — superposition until a for-whom collapses it

*Standing: nomination (2026-09-28). A census of where this reader decides
too early, read off the code; the code and its tests win any disagreement.*

## The direction, verbatim

> Are we putting things too much into discrete buckets rather than using
> physics, putting things into a superposition until they collapse at a
> certain reading at a for whom somewhere?

> This shouldn't be just in a small part of the pipeline but everywhere
> where it makes something better.

> Will this let the uncollapsed reading persist in the ledger and we can
> shift our interpretation of identity on the fly?

## The shape (kernel/undecided.js)

One record for a reading that has not collapsed — `EOUndecided@1`: a slot,
its candidates, each candidate's evidence as named features, the cursor, the
giver; standing `open`, frozen, content-addressed. One act that collapses
it — `EOCollapse@1`: EVA at a cursor, FOR a for-whom, under a NAMED rule,
appended and pointing at the record, never rewriting it. Verdicts `chosen /
contested / none`. `standingOf(record, collapses, forWhom)` reads the latest
collapse per for-whom; two for-whoms hold two verdicts on one slot at once.

Persisted on the fold's own `unresolvedAlternatives` (the slot
`EOIdentityAlternative@1` already rides in): opening a slot lands as
SIG·Ground (a mark on the Void — NUL cannot carry a payload, and rightly),
a collapse as EVA·Figure; `reconstruct` replays both; `openSlots(fold,
forWhom)` reads them back. Pinned end to end.

**The second half of the physics.** A superposition with no measurement
rule is a bag of maybes. What makes a collapse honest is what performs it —
a declared rule with its giver, a cursor, a for-whom. So the wall moves
from the record to the mouth: every candidate is kept; an uncollapsed
candidate is never asserted.

## Where the reader decided too early — the census

| site | the bucket | evidence thrown away | status |
|---|---|---|---|
| identity organ (`kernel/identity.js`, `contest.js`) | — | — | **already superposed**: live_hypothesis / distinct / refused; the contested set returned, never a winner |
| occupancy: the occupant slot | "last mention, else refuse" | every other mention, the unbound pronoun, the capitalised run never admitted | **converted** (48b5b22): `NEAREST_ESTABLISHED` is the default collapse; a looser for-whom collapses the same record otherwise |
| occupancy: what a locus IS | merged being vs position, decided by whoever got there first | the cast's merge vs the testimony's occupants | **converted** (5223c86): `LOCUS_BY_PATTERN`; the Bezúkhov record holds both, two for-whoms, both stand |
| pronoun binder floor (`pronouns.js`) | bound or `pronoun_no_margin` gap | top, runnerUp, margin — the gap carries them and nothing reads them | **measured, and not the lever** (v4, X2 gap): the gaps place, but 24 of 26 transition-clause pronouns were never attempted (P66's skip of co-present frames) and the two tops that exist are margin-0 ties over a cast of months and countries. The bucket under it is surface admission |
| surface extraction (`surfaces.js`) | in / out: closed-class veto, `capitalisationIsSignificant` | the binomial's own numbers, the lowercase count; and the KIND of the candidate (a month keeps the company of "in", "on", a number) | **next** — the veto is ordered after the lowercase evidence (84182a6) but months, countries and demonyms are admitted as beings by a name's own evidence; kind-standing's company profile carried as a feature on every candidate is the principled cut, never a month list |
| referent merge (`discoverReferents`) | a hard merge in the host's cast | the merge's basis, the surfaces it absorbed | **not yet in the host**; the native reader lands `EOReferentMerge@1`, which `hindsight.js` can re-address — the identity organ's alternative is the shape to reuse |
| complement typing (locus / kind / state) | capitalisation and determiners | the complement itself; recurrence across occupants (needs breadth) | **partly**: `complementTyping: "none"` keeps every complement and lets the pattern decide; measured on 13 pages the pattern needs a corpus |
| sentence splitting | a hard cut | the abbreviation ambiguity ("Harry S.") | not yet |
| admission door (the-fold) | admit / refuse per source per question | the overlap counts, the company | not a candidate: the question IS the collapse; keep |

## What the collapse must never do

- Assert an uncollapsed candidate (the mouth's wall, P186 territory).
- Rewrite the undecided record (append-only; a concession is a new REC).
- Collapse without a for-whom, a cursor and a named rule with a giver.
- Use the collapse to smuggle a threshold the material never licensed —
  `contestRule` reuses `contest.js`'s declared floors; a plain predicate
  declares itself as one.

## The identity case, concretely

"Count Bezúkhov" in War and Peace: the host's cast merged *Pierre Bezúkhov*
and *Count Cyril Vladímirovich Bezúkhov* into one being under the title; the
material says "Pierre, on unexpectedly becoming Count Bezúkhov". The record
now holds `being` (evidence: the merge) and `position` (evidence: two
occupant referents). The reader's for-whom collapses it to `position`; a
cast-trusting for-whom collapses it to `being`; both are on the fold, and a
question at a cursor picks the one its asker declared. That is identity
shifting on the fly with the past whole — what `hindsight.js` then answers is
which earlier entries were about the being the re-addressing touched.
