# The ladder as a reasoner, v4 — registered run, 2026-09-28

Driver at 5be1c45 (driver fixes only: the injection under judge.js's own
habit key, "never <verb>" negations, the revision loop over every claim;
E4 skipped, measured in v3). 192 model calls, 669 s model time, 691 s wall.

| | prediction | result |
|---|---|---|
| P1–P6, P8, P9 | as v3 | **held**, byte-for-byte v3's numbers (7/34 right, 0 wrong, 0 fabrications, 34 → 28 calls with habits) |
| P7 | every holding habit is conceded on the injected book, none answers `holds` against the negation | **failed — and the failure is the finding.** 3 holding habits; **1 conceded** (Braunau: the relation reader read the injected "Braunau never was the headquarters of Kutúzov" as `contradicted`, the habit was conceded with that trigger quoted, and the mechanical rung then answered `refused` — correct against the injected book); **2 answered `holds`** (Mademoiselle Bourienne, Mina), because the reader reads NO claim from a copula + adjective sentence, so the injected negation never reached the revision loop, the decider was still in the section, and the habit answered by containment. |

## What v4 settles

**Concession works where the reader can read.** The full loop ran live
on real bytes: a habit learned from a judge, a contradiction inserted
into the book, the relation tier reading it, REC on the ledger with the
trigger quoted, the mechanical rung taking over with the right answer.

**A habit is only as revisable as the eyes that watch it.** Where the
extractor is blind (22 of 34 claims here), nothing in the material can
contradict a habit through the relation tier, so a habit answering by
containment alone can outlive a negation sitting one sentence away. That
is not a bug in the habit ledger; it is a missing wall at the habit RUNG:
before a habit answers, the section must be checked for a negated
restatement of its own decider. v5 adds exactly that wall (judge.js: a
sentence sharing the decider's company and carrying a received negation
word stands the habit down — not applicable, the judge is asked again),
and re-registers P7.
