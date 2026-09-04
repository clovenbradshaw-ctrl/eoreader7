# contest-ladder, resolved against its own null

Ran 2026-09-04. **40 redeals, 0 model calls.** Null: each assertion's object shuffled among assertions of the same office — marginals kept exactly, the succession relation destroyed.

A number outside the shuffle's range is LICENSED. A number inside it is RETRACTED. A number equal to the shuffle's best draw is AT THE EDGE and claims nothing.

| metric | good | real | null median | null range | verdict |
|---|---|---|---|---|---|
| `derivedFacts` | high | **9** | 3.5 | 1–8 | **LICENSED** |
| `trueAgainstOracle` | high | **5** | 1 | 0–4 | **LICENSED** |
| `falseAgainstOracle` | low | **0** | 0 | 0–0 | **AT THE EDGE** |
| `precisionOnDecided` | high | **1** | 1 | 1–1 | **AT THE EDGE** |
| `layerSize` | high | **9** | 3.5 | 1–8 | **LICENSED** |
| `worstConcessionShare` | low | **0.333** | 0.55 | 0.2–1 | **NOT COMPARABLE** |
| `meanConcessionShare` | low | **0.084** | 0.08 | 0.077–0.09 | **NOT COMPARABLE** |
| `crossSourceDisagreements` | low | **0** | 2 | 0–4 | **AT THE EDGE** |
| `gateDerivedFacts` | high | **0** | 0 | 0–0 | **AT THE EDGE** |

## What each row is asking

* `derivedFacts` — does the layer above the floor actually fill
* `trueAgainstOracle` — how many derived facts an oracle built from OTHER properties confirms
* `falseAgainstOracle` — hard convictions
* `precisionOnDecided` — the ratio this repo has already caught being uninformative once
* `layerSize` — the denominator the two rows below are shares OF — if this differs across arms, those rows compare nothing
* `worstConcessionShare` — concentration is fragility — CONFOUNDED by layer size, see above
* `meanConcessionShare` — how evenly the layer's load is spread — CONFOUNDED by layer size, see above
* `crossSourceDisagreements` — how many genuine n=2 disagreements the material contains
* `gateDerivedFacts` — what the shipped >=2-source gate yields

## Retractions

* **`falseAgainstOracle` claims nothing.** Real 0; the shuffle reaches 0–0 (median 0), and 40 of 40 draws match or beat it.
* **`precisionOnDecided` claims nothing.** Real 1; the shuffle reaches 1–1 (median 1), and 35 of 35 draws match or beat it.
* **`crossSourceDisagreements` claims nothing.** Real 0; the shuffle reaches 0–4 (median 2), and 3 of 40 draws match or beat it.
* **`gateDerivedFacts` claims nothing.** Real 0; the shuffle reaches 0–0 (median 0), and 40 of 40 draws match or beat it.

## Not comparable (a stronger statement than retracted)

The real layer holds **9** derived facts; the shuffle's holds 1–8. A SHARE of the layer is therefore a different quantity in each arm, and these rows were not scored at all:

* `worstConcessionShare` — real 0.333, shuffle 0.2–1. **The comparison was not made, because it cannot be.** A fragility claim needs a layer-size-matched null, which does not exist yet.
* `meanConcessionShare` — real 0.084, shuffle 0.077–0.09. **The comparison was not made, because it cannot be.** A fragility claim needs a layer-size-matched null, which does not exist yet.

This is why the earlier 17.4%-vs-39.3% fragility result and this run's 19.0% do not reconcile: neither was measured against a null whose layer was the same size.
