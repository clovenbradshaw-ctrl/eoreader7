# The ladder as a reasoner, v8 — registered run, 2026-09-28

Driver at e45c901 (adjacency in the copula reader). 155 model calls, 560 s
model time. The raw JSON for this run was NOT written: the working tree
was switched to `main` for the merge while the run was finishing and the
output directory no longer existed at write time (ENOENT); the driver's
printed ladder is the record, quoted here verbatim.

| | prediction | result |
|---|---|---|
| P14 | zero fabrications on the CONTROL arm too | **held** — 0 on the shuffled book, 0 on the real one |
| P11 | ≥ 8 true bound, none refused, no false `holds` | **held** — 13 (4 relations + 9 copula), 0, 0 |
| P12 | ≥ 10 right at ≤ 34 calls | **held** — 14 right, 0 wrong, 23 calls: **0.61 correct per model call** |
| P1–P5 | | held — ON 23 vs OFF 39 calls; 14 vs 3 right; real 13 vs shuffled 6 mechanical; 21 → 20 → 20 judge asks, one habit learned and used |
| P13 | the shuffled control's mechanical binds rise | recorded: 6 vs 13 — they do not rise; the control's binds are the sentences the shuffle left whole |

## What adjacency cost and bought

One true copula claim stopped binding (13 vs v7's 14 — its sentence
states the complement a word away from the copula) and the judge landed
it instead at two calls, so the ladder's answers are unchanged (14 right,
0 wrong) at two more calls. What it bought is the control: v7's one
fabrication on the shuffled book is gone, and no arm of any run has
shipped a false claim since v1.

Final numbers across eight registered runs, same 34 claims, same 0.5B
judge: correct answers per model call **0.08** (the judge alone) →
**0.21** (the ladder, v3) → **0.25** (with habits) → **0.61–0.67** (with
the copula reader on the mechanical rung, v7–v8). Zero fabrications on
every arm of every run; every control that broke was recorded as vacuous
and rebuilt before it counted.
