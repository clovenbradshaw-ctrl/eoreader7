# code-draw-standing — calibration run

Re-run: `node native/eval/the-fold/code-draw-standing-calibrate.mjs`.

Ledger: `state/lang-competency.jsonl`, 1163 checked rows with a
`-v5` config. Split 582/581 train/validate by
row-index parity (declared, fixed, never re-rolled).

## Trained cells (train split only)

- `code-draw:bok-absent`: **contested** — confirmed 176 of 435, corrected 259
- `code-draw:rounds-exhausted+bok-absent`: **contested** — confirmed 73 of 147, corrected 74

## Validation operating point (heldOut read only here, offline)

n=581, firesOn=581, precision=0.532, recall=1.000
(tp=309 fp=272 fn=0 tn=0). Base failure rate in the
validation split: 0.532.

## Honest finding, this run

Every cell the train split populated reads `contested` (against
`WITNESS_FLOOR`), so on THIS ledger, as it stands today, the monitor fires
on essentially every validation row and its precision equals the split's
own base failure rate (confirmed: they match).
**This is the current signature vocabulary discriminating no better than
chance on this ledger** — not a bug in the calibration, a real measured
result: `gemma2:2b`'s failure rate on these held-out coding tasks (0.55
overall) is high enough, and near-uniform enough across the two cells this
ledger's own recorded fields (`rounds`, `regressions`) currently
distinguish, that neither cell is a clean win over the other. Two concrete,
disclosed reasons, not glossed over: (1) `bokDisagreement` had never been
recorded before this pass (0 of 204 bok-arm rows carry it), so
the one feature the task most wanted to test — candidate disagreement — has
contributed NOTHING to this calibration; future runs of `lang-competency-run.mjs`
will populate it and a re-run of this driver will then be able to measure
whether it discriminates. (2) `hasRegressions` is only ever non-null on the
`rec2` arm (68 of 1163 rows), so it is rarely the deciding
feature in a signature either. The monitor, calibrated honestly, currently
functions as "fires on any code draw" — which is a true statement about
this ledger's failure rate, not a useful escalation signal. Escalating past
this needs either more `bokDisagreement` data (a second calibration run
once it accumulates) or additional in-flight features not yet in this
file's closed vocabulary — named as the next step, not invented here.

## Disclosed limitations

- The split is by row index, not stratified by model/language/task — a
  ledger dominated by one model's runs could bias both splits the same way.
- `bokDisagreement` is a NEW field (this pass); 204 of
  204 historical bok-arm rows predate it and read `bok-absent`
  honestly rather than a guessed value.
- This is a report of ONE run over the ledger as it stood when run — re-run
  as the ledger grows; the numbers above are not a frozen claim.
