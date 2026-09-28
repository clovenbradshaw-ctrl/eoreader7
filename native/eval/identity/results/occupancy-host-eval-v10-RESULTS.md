# Occupancy through the pipeline, v10 — registered run, 2026-09-28

Driver at 06d2a5a; Z13–Z16 pre-registered before the run;
`NATIVE_MAX_CHARS=150000`. Raw: `occupancy-host-eval-v10.json`. Two organ
changes since v9: the complement's HEAD PHRASE (up to its first
preposition) is what the cast is asked about (e8211c7), and nesting is
read off name trees (ab0472e, `name-spans.js`).

| | prediction | result |
|---|---|---|
| Z13 | War and Peace: exactly one slot, `one_being`, zero splits | **failed** — the Moscow position is gone, and a `napoleon` position took its place: *"The letter taken by Balashëv was the last **Napoleon** sent to Alexander"* and *"the battle of Borodinó was **Napoleon's** senseless flight from Moscow"*. Head phrases *"the last Napoleon sent"* and *"Napoleon's senseless flight"* both carry the name as a MODIFIER (a reduced relative's subject; a possessor), and the cast was asked about the phrase, not its head |
| Z14 | entry 33, state 24; `locusVia: cast` below v9's | **failed on the bound, held in substance** — entry 33, state 24; cast 18 → 13. The bound was written `< 13` against the wrong baseline (v6's 13, not v9's 18). Admission unchanged, as predicted; the movement is real |
| Z15 | Guardiola's `england` locus still a position | **failed, and the failure is the fix**: *"FA Cup → England"* and *"Champions League → England"* were adjunct resolutions (*"first ever men's team **in England** to win…"*); with the head asked, both are surface loci, the false position Y1 already named never forms, and no ambiguous pairs remain on Material A |
| Z16 | WP state rows with a cast-resolved locus < 17, listed | **held** — 13. The list is the next finding: `Weyrother → Austrian`, `Circassian → Sónya`, `Balashëv → Napoleon`, `Pfuel → Wolzogen` — every one a head phrase that is NOT a name (an adjective, a possessive, a noun with a name inside it) |

## The one rule the run wrote

A preposition closes a head phrase, but a head phrase is not a head. *"the
last Napoleon sent"*, *"Napoleon's senseless flight"*, *"the Austrian
general"* each hold a name and are not named by it. The cast should be
asked only when the head phrase READS AS A NAME — `nameSpans` (the organ
this session built for occupants) answering that every token is a title,
a particle or a capitalised name token: *"Count Bezúkhov"* yes; *"the last
Napoleon sent"* no. Built next (v11), the same organ at the third seam.

## What holds

The Bezúkhov slot is `one_being` under structural nesting (Monsieur
Pierre / Pierre is `full`), withheld from attack, the occupants' own
merge proposed. Admission is untouched by either fix (33 entry / 24
state, byte-identical rows). Every remaining false position on the real
material is now the locus side — a name inside a phrase — and none is the
occupant side.
