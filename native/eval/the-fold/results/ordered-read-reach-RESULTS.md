# The lookup is noise; the resolved referent is not (2026-09-04)

**Audit 2026-09-05 (the-fold P95 / S65): reproducible only where the walk's fixtures exist.** Same walk file, same 86 of 106 faces absent, same rule: the driver refuses with a typed `fixture_absent` gap and exit 2 (`lib/walk-fixtures.mjs`, `native/tests/walk-fixtures.test.js`) rather than narrowing to the 20 on disk. On this checkout it refuses.

`node native/eval/the-fold/ordered-read-reach.mjs`. **Zero model calls.**

User: *"remember that we need to walk the activation in order and truly read
things"* — after I proposed to fix the selection with a better **scoring
function** over a static document. Ranking better makes a better lookup. It is
still not reading.

And before that: *"is that right? or is it when there is a difference that
makes a difference?"* — which corrected the statistic. A gap measured across
the whole pool is worthless when the system only ever looks at sixty pairs.
The gap has to exist where the decision is made.

## Two ways for a claim's ends to be "present" in a source

| arm | rule |
|---|---|
| **A — lookup** | the ends' word-features turn up within ±400 chars of each other (`endsCopresentWindow`, what the walk uses today) |
| **B — ordered read** | some edge in that source has its **resolved referent face** matching the ends |

B needs no new machinery. The reader already walks passages in order and binds
pronouns against what it has already met, publishing the earned referent as
`end1Face`/`end2Face`. **That face exists only because the reader had
context** — it is the ordered read's own product.

## The result

915 notes, 16 independent sources, object deranged for the null (marginals
kept, relation destroyed), 20 draws.

| | real | redealt median (range) | draws ≥ real | p |
|---|---|---|---|---|
| **A — lookup** | 491 | **500** (474–525) | 18 / 20 | **0.905** |
| **B — ordered read** | **51** | 39 (30–48) | **0 / 20** | **0.048** |
| B only (what order adds) | 0 | 0 (0–1) | 20 / 20 | 1.000 |

**The lookup carries no information at all.** Destroying every relation leaves
*more* notes reachable than the real ledger does. p ≈ 0.905 is not a weak
signal; it is the absence of one. The walk's 60 asks were drawn from a set
selected by a rule that cannot tell a real ledger from a scrambled one.

**The resolved referent does carry information.** 51 against a null median of
39, outside every one of 20 draws. This is the first quantity measured in this
whole line of work that separates from its null **at the note level**.

**And it adds no recall.** B-only is 0: every note the face path reaches, the
window reached too. So ordered reading does not find new evidence here.

## What it does instead, which is the point

It picks a **much smaller and much better-justified set**. 51 notes instead of
491 — and the 51 are the part that is not noise, while the 491 are
indistinguishable from a scrambled ledger.

That is the difference that makes a difference. The budget is 60 asks. Asking
about the 51 the face path selects, instead of 60 drawn from a near-random
491, is the entire decision the walk makes, and it is now the one thing the
free measurement has an opinion about.

Coverage is the cost: 51 of 915 notes is 5.6%. The face path is
high-precision and low-recall, which is the right shape for a budget of 60 and
the wrong shape for a ledger of 915.

## Said against it

- One corpus, 16 sources, one derangement scheme, 20 draws. p ≈ 0.048 is the
  smallest 20 draws can report.
- B ⊂ A **in this corpus**. The case ordered reading should win — a
  confirming sentence whose subject arrives as a bare pronoun, with the name
  nowhere near — is exactly what the window misses, and it did not appear
  here. These notes mostly have named ends already; a corpus of narrative
  prose would test it far harder than a citation set does.
- Arm B's object side still falls back to a surface match when no object face
  resolved, so B is not a pure ordered-read arm.
- `window: 400` remains `endsCopresentWindow`'s own hand-picked default.

## The next thing this licenses, and its cost

Re-run the walk asking **only** about the 51, same budget, same guard. If the
face-selected set produces more clean votes than the near-random set did, the
selection was the constraint and this is the fix. That is one run of ~60 asks,
not a band — the free pass has already narrowed what needs buying.

## Files
`ordered-read-reach.mjs`, `results/ordered-read-reach.json`.
