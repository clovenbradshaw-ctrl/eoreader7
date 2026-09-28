# Occupancy through the pipeline, v3 — registered run, 2026-09-28

Driver `occupancy-host-eval.mjs` at 2262a64; W1–W5 pre-registered in
`occupancy-host-eval-v2-RESULTS.md` before the run; `NATIVE_MAX_CHARS=150000`.
Raw: `occupancy-host-eval-v3.json`. Pipeline: `contextVectors` fix (deae43e),
surname fix (84182a6), refined comma wall (2262a64) all IN.

| | prediction | result |
|---|---|---|
| W1 | host arm: Pierre → …Bezúkhov | **held** — both rows: `Monsieur Pierre → Count Cyril Vladímirovich Bezúkhov` ("has become Count Bezúkhov"), `Pierre → …Bezúkhov` ("on unexpectedly becoming") |
| W2 | host arm: ≥ 3 bare-"Merkel" standings; Kant lands | **held** — 8 Merkel standings (Minister for Women and Youth, CDU Secretary-General, Leader of the Opposition, Chancellor, …); `Kant → Full Professor of Logic and Metaphysics` |
| W3 | host arm ≥ 12 standings, zero month/demonym | **failed on the second half** — 37 standings (from 4), but 3 misreads: `September` ("**He** took office on September 26, becoming…"), `January` ("…**City** had won in January, becoming the team…"), `Russian` ("ten Russian **towns** have been named Kutuzovo") |
| W4 | native "The term" row persists | failed — gone (the native's descriptor anchoring moved with the surname fix; the reader's own, not tuned) |
| W5 | Federalist stays 0 | failed — 1, the same modal-reach row ("as may, by cession … become the seat") |
| H1 | ≥ 7 pages | held — 11 of 13 |
| H2 / V5 | the wall, both arms | held — 0 closed-class occupants on either arm; the ablation still admits He/After/She |
| H3 | a two-occupant position | held on one misread (`england` ← FA Cup, Champions League) |
| H5 | a ✓ b ✓ c ✗ d ✓ e ✓ | |
| V6 | native War and Peace | over budget by declaration |

Host arm, Material A, the true rows (a hand read of all 37, disclosed as
that): Murat → Grand Duke of Berg; Kutuzov → General Field Marshal; the eight
Merkel rows; Rehnquist → second chief justice; Ratzinger → Archbishop of
Munich and Freising; Benedict → longest-lived pope (a description, correctly
held once); Cook → Apple (CEO), Cook → first (…chief executive); Nadella →
CEO; Ferguson → UEFA (Coaching Ambassador); Guardiola → captain, → Premier
League (first manager to…), → first manager; Summers → Under Secretary,
→ International Affairs (the same appointment twice, two sentences).
Misreads, all of one family: a `becoming the first…` clause whose subject is
a club or a pronoun the host never established, credited to the nearest
trophy or date (FA Cup → England, Champions League → England, UEFA Super Cup,
UEFA Champions League, January, September), plus `Russian → Kutuzovo`,
`Whig → Republicans`, `George → President` (George W. Bush, the host's
referent is "George"), `Manuel → Dorados` (Juan Manuel Lillo, likewise).

## Pipeline side effect, measured, not tuned

After the surname fix every page's pronoun-binding count FELL (Merkel 19 →
10, Ferguson 12 → 3, Johnson 22 → 16): the bare surname is now a candidate,
the binder's margins thin, and more pronouns fall under the declared floor
as `pronoun_no_margin`. The floor is a discrete bucket doing what the comma
wall did: a decision made at read time with no for-whom present. Named as
the next consumer of `kernel/undecided.js`.

## What the misreads have in common

Each keeps ONE candidate and throws the others away. "He took office on
September 26, becoming…" has two occupant candidates — the clause-initial
unbound "He" and the established "September" — and the reader chose by
nearness. The right record holds both with their evidence (position in the
clause, tier, distance, the comma) and lets a for-whom's rule collapse it;
the strictest rule refuses, the loosest picks September, and BOTH are on the
record with the rule named. That is the reader's next revision
(`kernel/undecided.js`, 291803d), pre-registered as v4 in the driver header
when it lands.
