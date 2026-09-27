# Russian role by competing cues — pre-registered test-split run, 2026-09-27

Driver `eval/russian-role-cues-eval.mjs test`; predictions committed first in
545784e (`eval/russian-role-cues-lib.mjs` header). Learned on UD_Russian-GSD
train; developed on dev; test read once. 316 single-finite-verb clauses. Gold:
nsubj / obj attached to the finite verb, the same gold for every arm.

| arm | first end (nsubj) P / R | second end (obj) P / R |
|---|---|---|
| **all channels** | **0.698 / 0.405** | **0.449 / 0.242** |
| case reader (ending + order tie-break) | 0.402 / 0.235 | 0.200 / 0.121 |
| position baseline, handed the gold verb | 0.333 / 0.445 | 0.109 / 0.374 |
| infant (no role labels, clear endings only) | 0.219 / 0.160 | 0.051 / 0.088 |
| ending only | 0.395 / 0.075 | 0.667 / 0.022 |

**P1 held** (beats the case reader on both). **P2 held** (beats position on
precision; loses on recall, as predicted). **P3 held**. **P4 held**: the
infant arm fails.

Removing any one channel costs recall or precision; none is free, and
removing word order or adjacency trades recall for precision (0.72 / 0.37,
0.75 / 0.36), so neither is ignored. Refusals: 92 clauses undecided at the
ln 2 margin, 17 with two verb candidates, 10 with none.

**What the infant arm shows.** Taught only by words whose ending is clear
(top case reading >= 0.9), it learned from 3,172 words, of which 81 were
nominative and 6 accusative: Russian's clear endings are almost all oblique.
Endings alone cannot bootstrap who did what; the missing teacher is the
scene — who was seen to act — not a better ending rule.

**Still weak.** Object-first clauses: 1 of 7 read right. The ending does not
yet override order often enough where it is decisive.
