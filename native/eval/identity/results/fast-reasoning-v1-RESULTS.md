# The ladder as a reasoner, v1 — registered run, 2026-09-28

Driver `eval/identity/fast-reasoning.mjs` (predictions P1–P8 fixed in its
header before the run); model `onnx-community/Qwen2.5-0.5B-Instruct` q4 on
CPU in-process (no Ollama in this container); 34 claims (20 true, 14
false) over War and Peace (11,132 chunks) and Dracula (2,028), key fixed
before the run; retrieval 3 passages per claim. 222 model calls, 548 s of
model time, 575 s wall. Witness rung OFF (needs a constrained decoder).

| | prediction | result |
|---|---|---|
| P1 | ON spends fewer model calls than OFF | **held** — 30 vs 34 |
| P2 | ON's correct count ≥ OFF's | **held** — 4 vs 0 |
| P3 | zero fabrications on either arm | **held** — 0 and 0 |
| P4 | shuffled control: the mechanical rung binds fewer true claims | **vacuous** — the control was BROKEN BY CONSTRUCTION: the shuffle joined sentence OBJECTS ("[object Object]"), the chunker made one termless chunk, retrieval returned nothing, every claim `section_unavailable`. Not a result. |
| P5 | pass 2 spends fewer judge calls than pass 1 | **failed** — 30, 30, 30: no habit was ever learned (below) |
| P6 | the habit rung answers only anchored judgments | **vacuous** — no habit rows |
| P7 | injected negations concede every holding habit | **vacuous** — no holding habit |
| P8 | shipped prompt yields the most anchored-chosen, fewest contested | **failed** — shipped 34 contested / 0 chosen; question-first 25 contested + 9 none; prohibition 32 + 2. No arm anchored anything. |

## What the run actually found

**The judge never points.** Asked for the deciding words and one verdict
word, the 0.5B model answers with the bare word — `holds` — on 34 of 34
asks (probe: prose was literally "holds"). The reader
(`organs/judgment-reader.js`) did exactly what it is for: one committed
candidate, nothing it points at in the section, CONTESTED — never the
verdict. So no judgment landed, no habit was learned, and the ladder's
model rung contributed nothing but cost.

**The wall was load-bearing.** The model's raw, unanchored verdicts, had
they shipped: true→holds 17/20, true→refused 3/20, false→refused 8/14,
**false→holds 6/14**. Six fabrications on the OFF arm were refused by the
anchoring wall alone. P3 held BECAUSE the wall held, not because the
model was right.

**The mechanical rung, no model:** 4 true claims bound, 0 wrong, 0
fabrications (Weyrother succeeded Schmidt; Borodinó the greatest glory;
Makár Alexéevich Bazdéev's brother; Balashëv's letter the last Napoleon
sent). 22 of 34 claims yielded no relation claim at all from the
retrieved passages (copula + adjective/number complements — "was the
brightest", "is fifty-nine" — the extractor's known shape), 8 read `open`.

**Question-first is worse** (9 asks committed to nothing), the one E4
reading that is not vacuous; Gary's "question last" stands.

## What v2 changes, and why it is the reader's business, not the prompt's

A model that will not quote can still POINT. v2 numbers the section's
sentences in the ask and the reader accepts a pointed number as the
decider — anchored by construction in the section, and only when the
pointed sentence carries the claim's own first content word and one
more (P31 company), so a lazy point at any sentence is still contested.
The verdict is still read off the model's one committed word; the model
still decides nothing.
