# Occupancy through the pipeline, v2 — registered run, 2026-09-28

Driver `occupancy-host-eval.mjs` at f5030a0 (pre-registered 6ba5bc7, amended
once before the rerun to cap the native arm — `NATIVE_MAX_CHARS=150000`).
Raw: `occupancy-host-eval-v2.json`. The FIRST v2 attempt, uncapped, was
killed at 75 minutes without finishing: the native reader's per-reprojection
rescan is superlinear on a whole book, and a `Promise.race` wall cannot
pre-empt synchronous work. That overrun is V6's own result.

Pipeline state for this run: the `contextVectors` fix (deae43e) IN; the
surname fix (84182a6, found DURING this run by falsification) NOT in.

| | prediction | result |
|---|---|---|
| H1 | host arm admits on ≥ 7 of 13 pages | **failed** — 4 standings on 4 pages (v1: 26 on 8): the walls removed the misreads and exposed that almost every true subject on these pages was a bare surname the host had no referent for |
| H2 | no closed-class occupant on the mentions arm; ablation admits some | held (0 vs 10) |
| H3 | a position with two occupants | failed — 0 (too few standings to recur) |
| H4 / V3 | Pierre → Count Bezúkhov | **failed, and the failure is the comma wall's**: both sentences refused — "Monsieur Pierre**,** has become Count Bezúkhov"; "Pierre**,** on unexpectedly becoming Count Bezúkhov" |
| H5 | a Kant (host) ✗ · b Middlemarch refused ✓ · c Federalist 0 ✓ · d novels 0 positions ✓ · e Gorbachev ✓ | 4 of 5 |
| V1 | month/demonym occupants → 0, total < 26 | **held** — 0 and 4 |
| V2 | native arm admits bare "Merkel" | **held** — 9 standings on the Merkel page, e.g. `Merkel → Minister for Women and Youth`, `→ Secretary-General of the CDU`, `→ Leader of the Opposition`, `→ Chancellor` |
| V4 | native arm lands Kant | **held** — `Kant → Full Professor of Logic and Metaphysics` |
| V5 | H2 on both arms | **failed on the native arm** — one row: occupant "The term" (a `descriptor`-tier mention the native anchored to "September") |
| V6 | native War and Peace inside 10 min | **failed** — over budget by declaration after the 75-minute overrun |

Native arm, Material A: 20 standings (19 `cast`, 1 `descriptor`), 12 pages
read in 0.3–6 s each. Host arm War and Peace 118 s; the native arm was
over budget on every novel and the Federalist.

## What the run taught, in order

1. **The comma wall was compensating for the surname gap, and it cost the
   one standing this work is for.** "In December 2015, Merkel was named"
   was misread as December only because *Merkel* was no mention; once the
   pipeline supplies the surname, the last mention before the transition is
   Merkel and no wall is needed. The wall then refuses "Pierre, on
   unexpectedly becoming Count Bezúkhov" for nothing. Refined after the run
   (pinned in `occupancy-testimony.test.js`): a comma refuses only when the
   stretch after it holds a subject-shaped phrase the pipeline did not
   establish — a determiner-led phrase or a capitalised run — otherwise the
   mention before the comma is the subject.
2. **The surname gap is not the glue.** `eval/identity/falsify/surname.mjs`:
   bare `Merkel` IS a surface (122 mentions) and IS admitted by
   `discoverReferents`; it vanished because the host's share-derived closed
   class (`functionWordSet`, ≥ 0.6 % of tokens) held "merkel" — a
   biography's subject is its most frequent token — and the extractor's veto
   ran before the "never seen lowercase" test. Fixed in both extractors
   (84182a6); the host now carries bare Merkel/Murat/Benedict/Kant.
3. **The native reader is the better mention supply today and the worse
   citizen**: it reads bare surnames (V2, V4 held on it where the host
   failed) but admits "The term" as a being and cannot read a book in an
   hour. The rescan cost is named as the reader's next cut; the
   determiner-led referent is the reader's own, reported not patched.
4. **The controls still fail where they must**: the capitalised-run
   ablation keeps admitting He/After/She/Since; the Federalist stays at
   zero; the three novels yield no position by pattern.

## v3, pre-registered here (run next, same driver, `NATIVE_MAX_CHARS=150000`)

Pipeline: surname fix in (84182a6); reader: refined comma wall in.
- W1 host arm, War and Peace: ≥ 1 standing `Pierre → …Bezúkhov` (v1 found 2)
- W2 host arm, Merkel page: ≥ 3 standings whose occupant surface is bare
  "Merkel"; H5a holds on the host arm (Kant → Full Professor…)
- W3 host arm, Material A: ≥ 12 standings (from 4), still zero month or
  demonym occupants (V1's shape)
- W4 the native "The term" row persists — the reader's own, reported
- W5 the Federalist stays at zero standings on the host arm
