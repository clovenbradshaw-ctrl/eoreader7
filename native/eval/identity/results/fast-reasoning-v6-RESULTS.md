# The ladder as a reasoner, v6 — registered run, 2026-09-28

Driver at 5be1c45 + the V6 header; the-fold judge at b91b2d9. 195 model
calls, 723 s model time. ONE change from v5: the counter-decider wall
reads the CLAIM's own company as well as the decider's.

| | prediction | result |
|---|---|---|
| P1–P6, P8, P9 | as v3–v5 | **held**, same numbers |
| P7 | no habit answers `holds` against its injected negation; ≥ 1 conceded | **held** — 0 of 3 answered; Braunau conceded through the relation tier (REC, trigger quoted) |
| P10 | stood-down habits go to the judge at ≤ 2 calls each | **held** — Braunau → mechanical `refused` (0 calls); Bourienne and Mina → stood down, judge asked, `none` (1 and 2 calls) |

## Where the line stands after six runs

**Correct answers per model call, the number this was for:** the judge
alone 0.08 (3 right, 1 wrong, 39 calls); the ladder 0.21 on first sight
(7 right, 0 wrong, 34 calls); 0.25 on the second pass (28 calls, three
answered from habits with no model). Zero fabrications on every arm of
every run — the raw model wanted to ship six.

**What answers without a model:** the relation reader (4 of 34 claims,
never wrong), and habits once learned (3 of 34 on pass 2). **What still
needs a model:** the 27 claims the reader reads nothing from — copula +
adjective or number complements ("was the brightest", "is fifty-nine")
— and of those the judge could point at only three; on 24 it pointed at a
sentence without the claim's words and the wall held.

**What a habit or a prior could take next.** (1) The extractor's blind
class is the largest cost: a copula reader for adjective and number
complements would move most of the 22 `no_claim` rows into the
mechanical rung at zero calls. (2) The judge's point rate (3 of 30) is
the retrieval's as much as the model's: the pointed section is three
retrieved chunks by term overlap, and the right sentence was often not
among them; a habit learned on the QUESTION's retrieval could carry the
section address itself. (3) The witness rung is still off for want of a
constrained decoder in-process; with Ollama it is one more rung between
habit and judge, already built.

**Prompting, measured (Gary's rules):** one part per ask; no example
value in an instruction (v2: it was the answer); the question last (v3:
first, the judge could not point at all); no prohibition (v3: it cost
three of four landings).
