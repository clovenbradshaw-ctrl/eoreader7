# The ladder as a reasoner, v3 — registered run, 2026-09-28

Driver at 43781a7 + the V3 header; the-fold judge at bbaaea7
(point-then-word). Same model, key, retrieval. 262 model calls, 821 s
model time, 847 s wall. ONE change: the judge asks twice — the number of
the deciding sentence, then one word over that sentence alone.

| | prediction | result |
|---|---|---|
| P1 | ON fewer model calls than OFF | **held** — 34 vs 39 |
| P2 | ON's correct ≥ OFF's | **held** — **7 vs 3** |
| P3 | zero fabrications shipped | **held** — 0 and 0 (OFF's one wrong answer refused a TRUE claim — an error, not a fabrication) |
| P4 | shuffled control binds fewer true claims mechanically | **held** — 4 vs 1 |
| P5 | habits cut judge calls pass over pass | **held** — 30 → 27 → 27 judge asks; 34 → 28 → 28 model calls |
| P6 | the habit rung answers only what the judge settled anchored | **held** — claims 2, 11, 20, exactly the three the judge landed |
| P7 | injected negations concede every holding habit | **vacuous, the driver's fault** — the injection looked habits up under the driver's own `claim:<i>` key while judge.js keys them by the claim's folded arrangement; 0 habits found, nothing injected. Not a result. |
| P8 | shipped ask lands the most chosen, fewest none | **held** — shipped 4 chosen / 30 none; question-first 0 / 34; prohibition 1 / 33 |
| P9 | the judge lands ≥ 1 chosen on ON | **held** — 3 |

## What the run found

**The ladder reasons, cheaply, and does not lie.** ON pass 1: 7 of 34
claims answered, 7 correct, 0 wrong, 0 fabrications, at 34 model calls —
four claims by the relation reader at zero cost, three by the judge at two
calls each (Braunau was Kutúzov's headquarters; Mademoiselle Bourienne
the coquettish girl; Mina the brightest). OFF, the judge alone: 3 right,
1 wrong, 39 calls. Correct answers per model call: **0.21 ON vs 0.08
OFF**; pass 2 with habits: **0.25**, the three judged claims answered from
the ledger with no model at all.

**Twenty-seven claims stay open** — the judge pointed at a sentence that
did not carry the claim's words (27 `none`), and the wall held. Of the 14
false claims, none was ever asserted: the model's word was only asked
over an anchored sentence, and no false claim anchored. That is the
design working: a small model made to point before it may speak.

**The question must come last, measured a third time.** With the
question first the judge could not point at all (34 none); a prohibition
appended cost three of the four landings. Gary's rules stand.

**Costs disclosed.** A judged claim spends two calls; 27 of 30 judge
asks spend one call on a point the wall refuses. The mechanical rung
reads no relation from 22 claims (copula + adjective/number complements).
The habit ledger: 3 learned, 3 live, 0 conceded — the concession test is
v4's, with the driver's key fixed.
