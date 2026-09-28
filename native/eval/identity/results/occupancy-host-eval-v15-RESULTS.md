# Occupancy through the pipeline, v15 — registered run, 2026-09-28

Driver at 332e410; Z29–Z31 pre-registered before the run;
`NATIVE_MAX_CHARS=150000`. Raw: `occupancy-host-eval-v15.json`. ONE change
from v14: the locus-side veto reads the complement's HEAD NOUN — the word
before the first received clause opener or subject pronoun — never a
trailing relative clause's last verb. (Z26/Z27 print FAILED as they did in
v14: they are v14's registrations, superseded by Z30/Z31, left in the
ladder so the record shows what was asked and when.)

| | prediction | result |
|---|---|---|
| Z29 | Material A entry 33 again (Benedict's row returns); state 24 | **held** — 33 / 24; *"the longest-lived pope whose age can be verified"* reads `pope` now |
| Z30 | vetoes < 26; no relative-clause-shaped veto left; *"the same as ever"* still vetoed | **failed on one row** — 23 vetoes, "the same as ever" vetoed twice, and ONE residual: Middlemarch *"that you have deserved it"* — a clause, not a phrase; with its demonstrative stripped the pronoun stands FIRST, and the cut was anchored on whitespace only |
| Z31 | Cyril's naming rows on `locusSurface` /Count Bezúkhov/, control zero, the title's cast face his own full name | **held** — 4 rows (one `naming+cast`), control 0, every row's face *"Count Cyril Vladímirovich Bezúkhov"* |
| Z17–Z25, Z28 | | held unchanged (Z18/Z21/Z25 back to held with the row's return) |

## The residual, read

*"The reward … became that you have deserved it"* is a clause in
complement position. It is not a position and the veto's verdict is right;
the word it convicted on (`deserved`) is again the clause's verb rather
than a head, because `HEAD_NOUN_CUT` demanded whitespace before the opener
and the pronoun was the phrase's first token. One anchor (`^|\s+`), pinned,
V16 registered. Everything the cut was built for held: `verified`,
`attended`, `wished`, `seen`, `chosen`, `expected` are gone from the veto
list; what remains are adjectives, adverbs, gerunds and idioms — *the
best*, *the nicest*, *the latter*, *the same as ever*, *Thy doing* — none
of them a position.

## Numbers

WP 43 standings (v14: 42 — one relative-clause locus returned as a
description), 14 vetoes (15); Middlemarch 30; Material A 33 / 24.
