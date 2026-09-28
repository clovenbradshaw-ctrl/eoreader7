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
| pronoun binder floor (`pronouns.js`) | bound or `pronoun_no_margin` gap | top, runnerUp, margin — the gap carries them and nothing reads them | **measured, and not the lever** (v4, X2 gap): the gaps place, but 24 of 26 transition-clause pronouns were never attempted (P66's skip of co-present frames). **The skip is a typed gap now** (0c560de, `pronoun_frame_named`, the co-present names as its contested set): v6 Z5 counts 107 such candidates reaching a transition clause on 13 pages, 30 carrying the page's topic — a candidate set on the record where there was silence |
| surface extraction (`surfaces.js`) | in / out: closed-class veto, `capitalisationIsSignificant` | the binomial's own numbers, the lowercase count; the KIND of the candidate | **converted at the collapse, not the extractor** (v5, Y1/Y2 held): the cast still admits months and countries by a name's evidence; every candidate carries COMPANY (`verbShare`, `prepShare`, read with the POS prior) and `BEING_KIND` refuses a preposition's companion by name — seven misreads out, every career kept; topic `verbShare` .40–.72 vs months ≈ 0 on 12 pages |
| referent merge (`discoverReferents`) | a hard merge in the host's cast | the merge's basis, the surfaces it absorbed | **converted** (e1f9a31, `kernel/merge-standing.js`): a merge is a CON·Figure support of an `EOIdentityAlternative@1`, a locus with ≥ `minOccupants` distinct occupants a SEG·Figure attack, judged by the real `deriveIdentityRevision`, replayable. v6 Z1: the Bezúkhov merge split on the fold from the material's own testimony |
| occupant distinctness (`merge-standing.js`'s floor) | "two occupant ids = two occupants" | the occupants' own identity alternatives | **converted** (81e910b, v8 Z6/Z7 held): a locus at the floor is an `EOUndecided@1` — `position` or `one_being` — collapsed per for-whom under `NESTED_NAMES` (the adapter's nesting reading declared; with none declared the old trust is the named rule `CAST_DISTINCTNESS`). Bezúkhov collapses `one_being`: no split, and *Monsieur Pierre = Pierre* opens as its own live hypothesis; Guardiola stays a position. The mirror hole, found by the same run: **locus distinctness** — Cold War's `Soviet` face carried two different loci (leader of / successor state of), a position out of one shared token. Next conversion |
| complement typing (locus / kind / state) | capitalisation and determiners | the complement itself; recurrence across occupants (needs breadth) | **partly**: `complementTyping: "none"` keeps every complement and lets the pattern decide; measured on 13 pages the pattern needs a corpus |
| a state clause (`X was Count Y`) | not testimony at all — only entries (became / was appointed) were read | the locus a being HOLDS, said by the copula; Cyril's kind of evidence | **converted** (2e67c14, v9): *all states are transitions, and NUL is the transition of non-transition* — the copula family holds a locus as a NUL·Ground standing, read last so no entry is re-read as a state; walls hold (Z11/Z12). Cost, measured: 24 state rows on 13 pages, 60 standings on War and Peace where v8 had 4, most of them descriptions not positions — `positionsByPattern` is the honest test, as it was always meant to be |
| name nesting (`merge-standing`'s `nested` evidence) | token-set containment | which token is the head, which are given, which decoration | **converted** (ab0472e, `name-spans.js`): a name is a tree like a clause — head root, title / particle / given subordinate — and nesting is a LEVEL: `full` (Monsieur Pierre / Pierre), `prefix` (John Adams / John Quincy Adams, P251), `head` (Bezúkhov / Pierre Bezúkhov), `given` (Pierre / Pierre Bezúkhov), `none` (Pierre Bezúkhov / Count Cyril Vladímirovich Bezúkhov — siblings). Only `full` nests; every partial level reaches the kernel as ambiguous and contests the slot |
| the locus of a complement | the whole predicate asked against the cast | the predicate's own head vs its adjuncts | **converted** (e8211c7, from v9's Moscow position): only the head phrase is resolved; "the most enjoyable balls in Moscow" is a surface locus, "Grand Duke of Berg" no longer resolves to Berg |
| a copula clause with a fronted phrase (`With Pfuel was Wolzogen`) | the last mention before the verb is the occupant | the displaced subject after the copula | **converted** (7118bc9, then 29e4b92 after v12 measured the first cut firing 859 times on adjuncts): refused `inverted_subject` only on BOTH marks — no comma before the copula and a name-shaped complement — the displaced subject carried, never landed backwards |
| a copula equating a description with a being (`that Circassian was Sónya`) | a locus held | the material's own merge evidence | **converted** (7118bc9): the row lands as a NUL standing and carries `identity`; the driver feeds it to the identity organ as a support (v12: `circassian <-> sonya` live on the fold beside the cast's own), never a position |
| what has not been fully ingested | a reader's reach was nowhere on the record; a claim cited a span as if read | reach per holon, the typed gaps and open slots inside it | **converted** (51ed090, `kernel/ingestion.js`): unread / partial / read read off the record per holon; a claim resting on a holon not fully read is named; the judgment it asks for carries the ENCLOSING section's full text and the for-whom's frame, the judge answers with a point, and the collapse is that for-whom's — the standing never moves |
| which grammar is reading | English by import | the material's declared language, the holonic level being read | **converted** (51ed090, `adapters/text/grammar.js`): `grammarFor(language)` / `grammarAt(language, level)` — every organ pointed at with its giver; no grammar for a language is a typed gap, and the copula family and fronted-phrase reading stand down for it |
| sentence splitting | a hard cut | the abbreviation ambiguity ("Harry S.") | not yet — the soft line break inside a clause (`became the\nlatter` → locus `the`, v6; `the Austrian\ngeneral` → `the Austrian`, v11) is closed: a newline is a space, length-preserving, in the occupancy reader |
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

Run for real (v6, 2026-09-28): the identity organ did split it — four
alternatives, SEG·Figure, witness `War and Peace#s3036`, replayed. And the
run's own honesty is the next row of the census: the two occupants that
carried the attack were *Monsieur Pierre* and *Pierre* — one being, two
cast ids — while Cyril, who held the title before Pierre, never appears in
a *becoming* clause at all. Right verdict, wrong evidence. The distinctness
the floor counted was the cast's, and the cast was the thing on trial;
occupant distinctness has to be its own uncollapsed standing before it
can attack anything. `results/occupancy-host-eval-v6-RESULTS.md`.

And it is (v8): the locus is a slot, the nesting names collapse it to
`one_being`, nothing splits, and the fold holds two live hypotheses — the
cast's merge and the occupants' — neither asserted. The true split waits
on Cyril, whom no *becoming* clause names: a state, not a transition.
`results/occupancy-host-eval-v8-RESULTS.md`.
