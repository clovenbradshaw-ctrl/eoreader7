# Occupancy through the pipeline, v11 — registered run, 2026-09-28

Driver at 4c5b140; Z17–Z19 pre-registered before the run;
`NATIVE_MAX_CHARS=150000`. Raw: `occupancy-host-eval-v11.json`. ONE change
from v10: the cast is asked about a complement's head phrase only when the
phrase READS AS A NAME (`nameShaped`, `name-spans.js` at its third seam —
every token a title, particle or capitalised name token; a title only
before the head).

| | prediction | result |
|---|---|---|
| Z17 | War and Peace: exactly one slot, `one_being`, zero splits | **held** — the `napoleon` position of v10 is gone; the one slot is `count_bezukhov`, collapsed `one_being` under `nested_names` (Monsieur Pierre / Pierre `full`), withheld from attack, the occupants' own merge proposed. Z6, Z10 and Z13 hold again with it |
| Z18 | entry 33, state 24; `locusVia: cast` < 13 | **held** — 33 / 24 unchanged (admission untouched, as in v9 and v10); cast 13 → **5**, surface 48, link 4 |
| Z19 | WP cast-resolved state loci < 13, listed | **held** — 13 → **5**, and the five are the next finding (below) |
| Z15 | *(v10's: Guardiola still a position)* | still "fails" — the false position never forms, which is what the head fix was for |

## The five that remain, read

| clause | what it is |
|---|---|
| *"that Circassian was Sónya"* (×2) | a true IDENTITY statement: the copula equates a description with a being. Not a locus — the material's own merge evidence (a description → a name), the shape `identity-evidence.js` already reads as copula support. Belongs in the identity organ's supports, not in a position |
| *"With Pfuel was Wolzogen"*, *"Among the Russian prisoners rescued by Denísov and Dólokhov was Pierre Bezúkhov"* | SUBJECT–VERB INVERSION after a fronted phrase: the subject FOLLOWS the copula. The reader took the last mention before the verb as the occupant and the true subject as the locus — backwards. A fronted PP/adverbial (*With X*, *Among the …*) is a clause the subject has moved out of; `clause-spans.js`'s own gap 2 (fronted subordinate clauses) is the same shape one level up |
| *"Weyrother was the Austrian general who had succeeded Schmidt"* | a demonym adjective inside a description, resolved because the cast holds `Austrian` as a referent (the same admission the being-kind arm refuses on the occupant side). A locus-side `BEING_KIND` is the symmetric fix, not yet built |

None of the five is a position; `positionsByPattern` holds them as
descriptions, and no false position remains on War and Peace or on the 13
pages. The false positions the copula family surfaced in v9 were all one
defect — a name inside a phrase taken for the phrase's head — and it is
closed by structure, not by a list.

## What the four runs (v8 → v11) settle

- *All states are transitions, and NUL is the transition of
  non-transition*: live, 24 + 60 NUL·Ground standings, walls holding.
- Nesting read off name trees: Bezúkhov `one_being`, siblings `none`,
  bare heads and given names `ambiguous` → contested.
- The locus is a head, and a head must read as a name — the same
  `name-spans.js` at three seams (occupant nesting, complement head,
  name-shaped gate).

## Open, named

1. Copula identity (*"that Circassian was Sónya"*) as identity SUPPORT
   rather than a locus — route a name-shaped complement that resolves to
   a cast BEING into `mergeEvidence`'s supports.
2. Subject inversion after a fronted phrase — the occupant slot must
   read the post-verbal subject when the pre-verbal material is a PP.
3. A locus-side being-kind: a demonym or month is not a locus either.
4. Cyril: still unheard — named by his title, never predicated into it.
