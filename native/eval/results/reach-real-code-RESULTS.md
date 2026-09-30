# The derivation on real code — judged by the TypeScript reference finder (deterministic, no model)

Analyzer: TypeScript 6.0.2 language service (semantic references). Material: the repo's own production modules at commit `da354f57f3`, frozen in `eval/fixtures/real-code/` (organs, kernel, adapters/text), 29 files of 60–800 lines, 86 top-level declarations with 2–25 references elsewhere in the same file. The region is the declaration's first line; the derivation sees only the file text and that line.

`R` = the number of lines that reference the declaration. **R-precision** = the share of the derivation's top-R lines that are true dependents. **Recall (all)** = the share of true dependents that appear ANYWHERE in the ranking. **Worst rank** = how far down the ranking you must read to have every dependent. **Noise** = the share of the file's non-blank lines that the ranking lists at all. `proximity` = the R nearest lines; `random` = R random lines (20 seeded draws); `identifier` = the R best whole-word matches of the declared name — an upper baseline for a derivation that knew which token the edit is about, which the region-only derivation does not.

| | declarations | R-precision: derivation | proximity | random | identifier (knows the token) | recall (all) | hit@6 | median worst rank | median R | noise |
|---|---|---|---|---|---|---|---|---|---|---|
| all | 86 | 0.47 | 0.02 | 0.02 | 0.84 | 1.00 | 0.45 | 5.50 | 2.00 | 0.24 |
| < 150 lines | 12 | 0.37 | 0.00 | 0.03 | 0.71 | 1.00 | 0.37 | 7.00 | 2.00 | 0.27 |
| 150–300 lines | 43 | 0.52 | 0.02 | 0.02 | 0.87 | 1.00 | 0.52 | 5.00 | 2.00 | 0.24 |
| > 300 lines | 31 | 0.42 | 0.04 | 0.01 | 0.85 | 1.00 | 0.39 | 9.00 | 3.00 | 0.23 |

Paired over FILES (the independent unit; per-file mean R-precision; exact sign test on the files that moved):

| comparison | files | derivation higher | other higher | tied | p |
|---|---|---|---|---|---|
| derivation vs proximity | 29 | 28 | 0 | 1 | 0.0000 |
| derivation vs random | 29 | 28 | 0 | 1 | 0.0000 |

Files used:

- `organs/askshape.js` (190 lines, 2 declarations)
- `organs/build-clarify.js` (302 lines, 2 declarations)
- `organs/claim-deriver.js` (232 lines, 1 declarations)
- `organs/coding-policy-trial.js` (186 lines, 5 declarations)
- `organs/current-holder.js` (71 lines, 2 declarations)
- `organs/event-arrangements.js` (94 lines, 1 declarations)
- `organs/gary.js` (361 lines, 3 declarations)
- `organs/hl.js` (104 lines, 1 declarations)
- `organs/kairos.js` (159 lines, 1 declarations)
- `organs/ranke.js` (610 lines, 5 declarations)
- `organs/run-dmca.js` (440 lines, 4 declarations)
- `organs/socratic.js` (174 lines, 2 declarations)
- `organs/surface-findings.js` (176 lines, 1 declarations)
- `organs/variation.js` (215 lines, 3 declarations)
- `organs/what.js` (247 lines, 2 declarations)
- `kernel/atmosphere-math.js` (212 lines, 3 declarations)
- `kernel/commitments.js` (374 lines, 4 declarations)
- `kernel/cube.js` (149 lines, 4 declarations)
- `kernel/eot-rich.js` (256 lines, 3 declarations)
- `kernel/kind-induction.js` (346 lines, 5 declarations)
- `kernel/refutation.js` (489 lines, 3 declarations)
- `kernel/rhythm-priors.js` (276 lines, 5 declarations)
- `kernel/task-log.js` (159 lines, 4 declarations)
- `kernel/universal-grammar.js` (299 lines, 5 declarations)
- `adapters/text/case-marked-language.js` (60 lines, 1 declarations)
- `adapters/text/individuation.js` (354 lines, 5 declarations)
- `adapters/text/numeral-words.js` (123 lines, 3 declarations)
- `adapters/text/role-cues.js` (229 lines, 5 declarations)
- `adapters/text/verb-synonym-disclosure.js` (251 lines, 1 declarations)

