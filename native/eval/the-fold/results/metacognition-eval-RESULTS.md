# metacognition.js — cross-domain replay and necessity demonstration

Re-run: `node eval/metacognition-eval.mjs`. WITNESS_FLOOR = 2
(imported from asserted.js, not re-declared here — POLICIES.md P71's leg 2).

## Domain A — real Wikipedia text (byte-verbatim from
`experiments/mechanical-first-hamlin-johnson.mjs::MATERIAL_TEXT`)

- `vice-president-of:first-term` (S1 wrong twice, right once): **contested** — confirmed 2 of 5, corrected 3
- `succeeded-by` (S1 right both times): **established** — confirmed 3 of 3 time(s) checked

## Domain B — declared invented, structurally analogous, zero shared vocabulary

- `calibrated-by` (S1 wrong twice, right once): **contested** — confirmed 1 of 3, corrected 2
- `housed-in` (S1 right both times): **established** — confirmed 2 of 2 time(s) checked

## Leg 1 (cross-domain replay)

Same code, unmodified, on two domains sharing no vocabulary: the
error-prone cell reads `contested` on both (true /
true), the reliable cell reads `established` on
both (true / true).
**Replay holds: true.**

## Leg 3 (demonstrated necessity)

A mixed cell (one real `contradicted` error, three real but unconfirmable
gaps — `beyond-reach`/`unheard`/`unbound`), read atom by atom through
BOTH classifiers on the identical extraction:

- **Real four-way split:** 2 corrected, 0 confirmed,
  6 held apart as unresolved. Standing: **contested** — confirmed 0 of 2, corrected 2.
- **Naive two-way split** (the Friston-alone design this file's own header
  names — collapse everything non-`bound` into "corrected", because it has
  no unresolved bucket to hold a gap in): 8 of
  8 atoms read as corrections.

Absence of the four-way split does not merely round differently — it
erases the distinction between "the material said no" and "the material
never got a chance to answer," folding 6 disclosed
gaps into what would read as a pattern of repeated error. Presence of it
keeps the one real correction legible against them, which is Ramakrishna's
own plurality applied to a checking ladder: more than one honest outcome
of "S1 said something S2 could not confirm" is real, and forcing them all
into one verdict is the failure, not a simplification of it.

## Disclosed, not claimed

Domain A's relation edges (`contradicted`/`bound`) are hand-typed against
the real, verbatim material shown above — the real relation extractor
(`hypergraph.js::makeRelationReader`) needs `eoreader7/legacy-eoreader6.1`,
an uninitialized submodule in this checkout, and was not run. What IS real
throughout: the classification and ledger code (`metacognition.js`,
unmodified), the material's own bytes for Domain A, and the arithmetic
reported above.
