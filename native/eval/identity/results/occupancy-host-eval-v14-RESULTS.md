# Occupancy through the pipeline, v14 — registered run, 2026-09-28

Driver at 800adac; Z26–Z28 pre-registered before the run;
`NATIVE_MAX_CHARS=150000`. Raw: `occupancy-host-eval-v14.json`. TWO organs
live, both opt-in by injection: locus-side being-kind (`locus_not_nominal`,
an asymmetric veto read with the POS prior) and naming as testimony
(`namedOccupants`, patronymics typed by `PATRONYMIC_RU`).

| | prediction | result |
|---|---|---|
| Z26 | the veto fires; no vetoed complement was a v13 POSITION | **failed** — 26 vetoes (WP 15, Middlemarch 6, Federalist 3, GE 1, Material A 1), every one a word with zero NOUN/PROPN share; but *"the same as ever"* WAS a v13 "position" (two occupants), and the veto removed it |
| Z27 | Cyril's naming row appears at the locus matching /Count Bezúkhov/; the Count→Prince control yields zero | **failed as written** — 4 naming rows, all Cyril's full name, control 0; the rows' `locus` field is the cast's own display face of the title referent, which is **"Count Cyril Vladímirovich Bezúkhov"** — the regex matched the surface and not the face |
| Z28 | the Bezúkhov slot with Cyril among its occupants collapses `contested`; the predicated-only slot still `one_being` | **held** — `contested`, "some occupant pairs nest (2/6)"; predicated: `one_being` (1/1) |
| Z18, Z21, Z25 | Material A entry 33 | **failed** — entry **32**: *"Benedict became the longest-lived pope whose age can be verified"* is vetoed on `verified` |

## What the two failures say, read

**Z26.** The prediction was wrong about v13, not the veto about the
material. v13's own "positions" include *"the same as ever"* — a locus
that recurred across two occupants because two people were each *"the
same as ever"*. `positionsByPattern`'s pattern evidence (recurrence across
occupants) cannot tell a position from an idiom; the veto can, and did.
The registered test read v13's position list as ground truth, which it
never was. Recorded FAILED as registered; the reading stands.

The one real loss is the Benedict row. The head phrase is cut at
prepositions only, so *"the longest-lived pope whose age can be verified"*
keeps its relative clause and the veto reads the clause's last word,
`verified` (VERB), instead of the head noun `pope`. Fifteen of the 26
vetoes are of the same shape — a complement whose LAST word is a verb
because a relative clause (*"the first he had attended"*, *"the man any
girl would have chosen"*) trails the head noun. Those loci were never
positions either, but the veto convicted them on the wrong word. The fix
is a cut, not a threshold: the head phrase ends at a received clause
opener or a subject pronoun as well as at a preposition (V15).

**Z27.** The naming rows are there — four, one resolved through the cast
(`naming+cast`), three by surface — and the control is zero. What the
field read exposed is the finding: the cast's referent for the TITLE
`Count Bezúkhov` wears Cyril's full name as its display face. The cast
folded *"Count Cyril Vladímirovich Bezúkhov"* into the same referent as
*"Count Bezúkhov"*, so in the cast the title IS Cyril, and Pierre's
*becoming Count Bezúkhov* reads, at the cast, as becoming Cyril. That is
the conflation the whole line is about, now visible on a field. The
naming rows resolve to that very referent (at 1754), which is why Z28's
slot holds Pierre's faces (nesting) against a third occupant that nests
with none: `contested`, as predicted.

## Numbers that moved

WP 42 standings (v13: 42) — the 15 vetoed loci were all `held_once`
descriptions; Middlemarch 30 (30); Material A 32 entry / 24 state (33 /
24). Everything else in the ladder — Z17, Z19, Z20, Z22, Z23, Z24 — held
unchanged.
