# Predictive processing in the loop + a model-free build

The loop now predicts P(green) before spending each test round and
learns from the error after — and a driver with no mouth anywhere
built a 3/4-green workspace from failing tests, stopping with a typed
residual exactly where novel logic begins.

Reproduce with:

```
node native/eval/the-fold/create-learn.mjs
node --test native/the-fold/forecast.test.mjs native/tests/tournament.test.js
```

## Forecast: the quantitative face of expectation

`native/the-fold/forecast.js` — Laplace tallies per `(op, language,
syntax)` key (`CodeForecast@1`, frozen updates, session-scoped).
Unknown keys predict 0.5 with the basis said out loud; `forecastError`
is signed outcome-minus-p. This is deliberately NOT
`kernel/expectations.js` (Bharata's qualitative states as fold ops) —
different mechanism, nothing imported, nothing re-derived; the round
record speaks fulfilled/violated over these numbers.

Wiring (`code-loop.js`): every tested patch records
`forecast: { key, p, trials, error }`; the prior updates before the
next round. Pre-test refusals (gaps, keyword, syntax) teach nothing —
only a real verdict is an observation. `|error| ≥ 0.5` with history
appends a Surprise line to the next note. Tournament gained a `rank`
seam (priors propose trial order, higher first, stable ties; throwing
ranks degrade to caller order) — winner rule unchanged.

## The build: create-learn.mjs (zero model calls)

Fixture: tip calculator, `test_bill.py` (stdlib unittest, 4 tests) +
`app.py` missing `serve`, missing `import json`, correct
`total`/`share`. Driver loop: run → match failure → remedy → predict →
syntax-check → apply → observe → record.

| step | failure | remedy (derived, never invented) | predicted | outcome |
|---|---|---|---|---|
| 1 | ImportError `serve` | stub `serve/2` — arity from the TEST's own call sites (`callArityOf`, import lines blanked, own-def skipped) | 0.5 (unknown) | won (ImportError gone; suite still red) |
| 2 | NameError `json` | `import json` — received stdlib confirms, INS after the leading docstring | 0.5 (unknown) | won (NameError gone) |
| 3 | NotImplementedError (stub body) | none matches | — | **residual**: novel logic — the mouth's doorway, measured as remainder |

Final: 3/4 green, prior `INS|python|checked: 2/2`. Docstring held
position 0 (an earlier run demoted it — fixed, pinned). The residual
is the finding, not a failure: the mechanical tier clears collection,
imports, and scaffolding, and stops exactly where invention starts.

## Supporting fixes this pass needed

- `callArity` only sees declared names — useless for a missing callee.
  New `callArityOf(text, fileName, name)` (shared `arityAt` core);
  `callArity` refactored onto it, byte-identical behavior pinned.
- Import fix above a module docstring kills `__doc__` — anchor moved
  after the leading docstring block (prefix-unique by construction),
  pinned.
- Raw NUL separator bytes keep slipping into `mechanical.js` via
  hand-typed separators — replaced with `\u0000` escapes twice now;
  the RESULTS note from last pass stands (check binary-cleanliness
  when touching that file).

## Calibration honesty

Two observations is not calibration — it is a ledger with two rows.
The claim here is the MECHANISM (predict → record → update → surprise
threshold), pinned by 4 forecast unit tests, not the numbers. Real
calibration needs the battery (per-remedy tallies over dozens of
tasks), named below. The prior is session-scoped; cross-run
persistence is named unattempted (a pooled prior would need the
Ostrom treatment — per-workspace keys, never a global pool).

## Disclosed, not attempted

- Engine arity not yet preferred over comma-count inside `callArity`
  (both exist; merge needs a producer tag per row).
- Test enumeration, JS syntax gate, fixer-driver composition (as
  named in py-engine-RESULTS).
- `runCodeLoop` end-to-end stays driver-tested; forecast paths are
  helper- and record-pinned only (no live mouth in this environment
  run — driver used execSync + unittest, zero model calls).

## Generality

**Generality:** mechanism-universal (predict-observe-update around any
verdict source; remedy-table shape for any language with recipes +
checker); specimen-scoped for every number (one 4-test fixture, two
observations, one residual).
