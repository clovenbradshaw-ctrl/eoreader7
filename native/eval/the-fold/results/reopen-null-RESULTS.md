# /reopen — the null before the number — 2026-09-02

*Driver: `eval/reopen-null.mjs` (SEEDS, REDEAL_SEED env), over the real
`record/explore-record.jsonl` as it stood: 209 open rows (147 source, 62
door).*

The door reports no hit rate of its own — a restore is not a prediction.
The one number it could be tempted to claim, "the last open is the next
open", was measured WITH its null before being written anywhere:

| | rate |
|---|---|
| real record order | **93/208 = 0.447** |
| rows redealt, 50 seeds from `REDEAL_SEED=0` | median 0.034 · range 0.014–0.072 |
| shuffles at or above the real rate | **0/50** |

The record's order carries a real re-open signal (people open the same
thing again far more often than a shuffle would), which is what licenses
a door that restores the LAST open rather than offering a list. It is
not a precision claim about the door: the door's pick is the record's
last open by construction, and no number is reported for that.
