# The received object boundary, measured — refuted at book scale (2026-09-02)

**Audit 2026-09-05 (the-fold P95 / S65): unreproducible-by-construction since the-fold `2214e1a` (P80, 2026-09-03).** The `boundedObjects` opt-in this doc's verdict kept was removed from the-fold's `hypergraph.js` with P80; `makeRelationReader` ignores the unknown option, and the re-run printed three byte-identical arms (1,590 edges, debris 0.459 each) while still reporting "moved by the cut: 53" — address-key collisions, not moves. The driver now REFUSES with a typed `organ_unreachable` gap when the material offers cuttable objects and the bounded arm is identical to the baseline; `native/tests/object-boundary.test.js` pins that refusal on synthetic edges with the real boundary set and discloses which state the production reader is in. The numbers below are a dated record of a run made while the organ existed; nothing reads them.

**Driver:** `eval/the-fold/object-boundary.mjs` (re-runnable; `BOOK=`, `CAP=`,
`SEED=`). **Material:** Project Gutenberg Dracula (pg345), the first 400
passages of `chunkSource`. **Reader:** the-fold's production bundle
(`makeRelationReader`, NP subjects on, POS prior on) — the same organs a live
turn runs. **Mechanism under test:** `relations.js::objectBoundaryFrom` —
the POS prior's ADP/SCONJ-dominant forms at `minShare 0.5` (hypergraph.js's
own `GRAMMAR_MIN_SHARE`, cited not re-chosen) plus the received clause
classes, applied as a POST-TRIM on the captured object's text. 118 forms.

## Why it was built

Live, the-fold 2026-09-02: below the corpus floor the measured function-word
class is null, so an object ran to the clause terminator and carried its
adjuncts into its identity — `andrew johnson|replaced|hannibal hamlin in
march 1865` never bridged to `hannibal hamlin|replaced|…`, floor 6 composed
nothing until the debris was hand-conceded, the uniqueness veto fired on
the ledger's own noise, and the model saw three notes for one fact. A
received class needs no corpus to exist (the subject side's `leadingStrip`
already makes that argument), so the hypothesis was: cut the object at the
first adposition after its first token.

## What the first cut taught, before the measurement could even run

The first version widened the object group's STOP CLASS. Edge count went
1644 → 2647 — a shorter match let the scan resume inside the truncated
adjunct and find a second "edge" there ("whilst the courage of the day
—is→ upon me"). A redealt random stop set did the same (2276), so the
extra edges were a property of shortening, not of where the cut landed.
The mechanism became a post-trim: match set, offsets and clause reach
byte-identical to baseline; only the object's text shortens.

## The numbers

| arm | edges | distinct objects | debris rate | end2Face rate | median object tokens |
|---|---|---|---|---|---|
| baseline | 1644 | 1551 | 0.465 | 0.058 | 3 |
| bounded (post-trim) | 1673 | 1421 | 0.000 | 0.038 | 2 |
| redealt control (same-size random non-boundary forms) | 1644 | 1551 | 0.463 | 0.058 | 3 |

- The +29 edges in the bounded arm are a per-sentence `limit` newly
  admitting matches once trimmed duplicates collapse — pairing is therefore
  by the edge's own address start + verb, not by index (found by running).
- "Debris rate" is tautologically 0 for the bounded arm (it counts the very
  tokens the cut removes); it is a description, not evidence. The evidence
  is the next line.

**Paired by address, 1644 of 1644; moved by the cut: 782. Among the moved,
end2Face GAINED 15, LOST 48.**

The marginal pairs (LP11 — judged on what moved, never the aggregate) say
why: in narrative prose the object's referent very often sits AFTER the
preposition — "to take me **to the Count**" → "to take me"; "something
like them **in Hampton Court**" → "something like them"; "a Russian **from
Varna**" → "a Russian". The class-level cut removes the referent, not the
adjunct. The VP specimen ("Hannibal Hamlin **in March 1865**") is the case
where the referent precedes the adjunct — real, and specimen-scoped (P71).

**Cost:** 0 of 102 known referent surfaces on this slice carry a boundary
token inside them; the cut never truncated inside one. (The "Duke of
Wellington" cost is pinned in `tests/relations.test.js` as a disclosed
behaviour; it did not arise on this material.)

**Control:** the redealt boundary reads debris 0.463 vs baseline 0.465 —
within one edge; it did not lower it. The control passes, and it is a weak
control: random forms rarely occur in objects at all, so it mostly tests
that the measure is not trivially satisfied by any cut.

## The lexicon on this text

92.6% of token occurrences are attested by the POS prior (UD_English-EWT),
but only 63.0% of types (3,100 of 4,917). The out-of-vocabulary mass is
names (mina ×39, harker ×17, seward ×16, dracula ×16, whitby ×13, hawkins
×13, murray ×12) and period vocabulary (cannot ×20, morrow ×11, to-night).
260 object-token types cannot be classified at all, so no cut is possible
there. The prior is a treebank of contemporary English web text; a 1897
novel is at the edge of it. Whatever boundary rule ships is bounded by
this coverage on this material — the honest number to carry beside any
"the cut fixed X%".

## Verdict

**Refuted as a universal rule; kept opt-in; not shipped in the production
reader.** `objectBoundary` stays in `extractRelations` (byte-identical when
omitted), `objectBoundaryFrom` stays exported and pinned, hypergraph.js's
`boundedObjects` stays an opt-in organ, `borodino-ledger.mjs` carries a
`BOUNDED` flag so the next measurement is one env var away.

**What the measurement points at instead.** The identity the ledger keys on
is the EARNED FACE (`end2Face`), and where a face is earned, trailing debris
in the display never mattered — the id was already clean. The debris bit
the live specimen because NO face was earned there at all. So the lever is
not a class-level cut, it is (a) why the face wire earned nothing on a
three-sentence paste, and (b) a referent-aware trim — cut after an earned
face only when nothing earned follows — which is a rule about referents,
not about adpositions, and belongs at `hypergraph.js::endpoint`, not in the
extractor.
