# Occupancy through the pipeline, v8 — registered run, 2026-09-28

Driver at 3c0bf7c; Z6–Z8 pre-registered in the header before the run;
`NATIVE_MAX_CHARS=150000`. Raw: `occupancy-host-eval-v8.json`. ONE change
from v7: `nested` (the adapter's `nestedOccupants` — one name's tokens
inside another's, diacritics folded) is declared to `mergeEvidence`, so
every locus at the floor is an `EOUndecided@1` (position | one_being)
collapsed under `NESTED_NAMES` (81e910b). Everything else was expected
byte-identical to v7.

| | prediction | result |
|---|---|---|
| Z6 | War and Peace: `count_bezukhov` collapses `one_being`; zero SEG splits; the occupants' own alternative opened | **held** — `chosen: one_being`, rule `nested_names`, *"every occupant pair nests (1/1)"*; splits 0; `monsieur_pierre <-> pierre` opened as a live hypothesis on the fold |
| Z7 | Guardiola's `england` locus still collapses `position`; its split stands | **held** — `position`, *"no occupant pair nests (0/1)"*, 1 split (the same false position Y1 already names; under `BEING_KIND` it does not exist) |
| Z8 | every slot reported | 3 slots on 21 texts: War and Peace (one_being), Guardiola (position), **Cold War (position)** — see below |
| Z1 | *(v6's prediction: a split naming pierre bezúkhov)* | **now fails, by design** — Z6 supersedes it. The split v6 celebrated rested on one being's two names; the organ now says so and withholds |
| Z3, Z4, Z5, Y1, Y2, H1 | byte-identical to v7 | **identical** |

## The third slot, read honestly

Cold War, locus `ref:auto:soviet`, occupants `mikhail` and `russian`:
*"Mikhail Gorbachev became [leader of the] Soviet Union…"* and *"the
Russian Federation became the Soviet Union's successor state"*. The locus
resolver landed both on the referent `Soviet` — the first is *leader of
the Soviet Union*, the second *the Soviet Union's successor state* — so
the "position" is two different loci sharing one referent face. The
collapse is right for the names it was given (Gorbachev and the Russian
Federation do not nest) and the standings under it are wrong. Occupant
distinctness was the v6 hole; **locus distinctness is its mirror**, and
the same shape closes it: a locus is a span, not a referent face, until
the resolver has earned more than a shared token. Named, not built.

## What this settles

The v6 finding is closed at the organ: a two-holder locus no longer
inherits distinctness from the cast. The Bezúkhov reading on the fold is
now *"the cast's merge is a live hypothesis; so is Monsieur Pierre = Pierre"*
— both uncollapsed, both on the record, neither asserted — which is the
honest state of what the material has said so far. Cyril is still unheard
(no *becoming* clause names him), so the true split cannot yet be earned
from testimony alone; a state reading (*"the count, who was dying"*) is the
missing evidence, and it is a different pattern family.

## Still open, named

- Locus distinctness (above): the Cold War slot.
- Cyril's occupancy is a state, not a transition — no pattern hears it.
- Soft line breaks inside a clause (`became the\nlatter`).
- Benedict's topic (`XVI`); the native "The term" descriptor referent.
