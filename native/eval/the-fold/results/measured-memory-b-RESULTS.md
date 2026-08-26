# Increment B — the two curves, measured

Run 2026-08-26. `node eval/measured-memory-b.mjs` reproduces every number
below (seed 20260826, deterministic). Increment of `wiring-the-measured-
memory-v2` (see the spec); this is B1 (`kernel/return-curve.js`, eoreader7,
real) and B2 (this conversation's own need-odds vs. the received ACT-R
prior, `retrieval.js`'s real mechanism) run at a scale their own unit tests
(fold.test.mjs, retrieval.test.mjs) should not pay for.

**No real 40+ turn conversation transcript with record citations exists on
this disk.** fold.js's store stopped discarding history this same pass
(increment A), but nothing has run the live app long enough yet to leave a
real log behind. Rather than wait for one, this driver builds a SYNTHETIC
conversation with GROUND TRUTH BY CONSTRUCTION — this repo's own
established fallback when no real corpus exists (hl-acquire.test.mjs's
invented chronicle; P29's `asserted-eval.mjs` synthetic adversarial suite)
— and says so plainly rather than dressing a constructed fixture up as
captured data. Four topics, each with its own hand-declared return cadence
(`gapTurns`) and prose, over 90 synthetic turns; full construction in the
driver's own header. **The numbers below are a check that the construction
and the real math agree, not a discovery about how people actually write —
a real transcript's numbers would be that discovery, and are named as real,
unattempted future work below.**

## B1 — the writer's own return-form curve

```
returns measured: 30, forms discovered: ["pronoun","regloss"]
  gap 2-3:   total 22, counts {pronoun:22, regloss:0}
  gap 4-7:   total 3,  counts {pronoun:0,  regloss:3}
  gap 8-15:  total 1,  counts {pronoun:0,  regloss:1}
  gap 16-31: total 2,  counts {pronoun:0,  regloss:2}
  gap 32-63: total 2,  counts {pronoun:0,  regloss:2}
majorityWindow: {pronoun: 3, regloss: 63}
```

**Frozen prediction, stated before the run: pronoun's own majority window
is narrower than regloss's.** HELD (3 < 63) — the construction's own
declared rule (recently-active topics get a pronoun-shaped return, dormant
ones get the full re-gloss, S15's real-book finding applied by hand rather
than measured here) is exactly what `returnCurve` reads back out of the
event stream, unchanged from `kernel/return-curve.js`'s own real
implementation. This confirms the composition is wired correctly; it is not
a claim about real conversational writing, which this driver has no data
for.

**What this buys increment A, concretely, and what it does not (disclosed,
not silently assumed done).** `dmdWindow` needs CANDIDATE depths declared —
"which depths are worth testing is not this function's to guess"
(`kernel/activation.js`'s own header). B1's own bin floors are a
principled, discovered source for that list:

```
candidate depths B1's own bins would hand to dmdWindow: [2, 4, 8, 16, 32]
```

`fold.js::deriveRecordWindow` ships this pass with a caller-declared
`candidates` default (`[2,4,8,16,32]`, chosen independently — see fold.js's
own header) rather than this exact join wired live; the join is real,
concrete, and shown to work here, and threading `returnCurve`'s own bins
into `deriveRecordWindow`'s `candidates` argument at a real call site is
named next work, not done in this pass.

## B2 — this conversation's own need-odds vs. the received ACT-R prior

```
koniag (gapTurns=3):  26 returns over 90 turns — MEASURED (superseded)
harbor (gapTurns=9):   3 returns over 90 turns — retrieval_no_margin
audit  (gapTurns=22):  3 returns over 90 turns — MEASURED (superseded)
zoning (gapTurns=40):  2 returns over 90 turns — retrieval_no_margin
```

**Frozen prediction, stated before the run: koniag's frequent returns earn
a measured supersession of the ACT-R prior; zoning's rare ones do not.**
HELD. A conversation this short cannot earn real evidence for a topic that
returns only twice in 90 turns — the declared prior correctly stands for
`zoning`, exactly as S17's own rule requires ("the received prior stands
until the material's own measurement holds more evidence").

**A genuine surprise, reported rather than smoothed over: `audit` also
measured, at only 3 returns — the same count as `harbor`, which did not.**
The prediction did not cover `audit` either way, so this is neither a held
nor a refused prediction — it is new information the run surfaced.
`recordCitation`'s own training loop (retrieval.js) bumps EVERY already-live
record's tally on each citation event, not only the cited topic's own — so
`audit`'s cell accumulated trials from every OTHER topic's returns too
(koniag's 26, in particular), while `harbor`'s did the same but happened to
land in a differently-shaped (recency, frequency) cell by the time it was
queried. This is the real, disclosed mechanics of a shared cell-tally
table: a rare topic's own evidence floor can clear early if it happens to
share a population cell with a frequent one, and late if it does not — a
property of the mechanism, not a bug, and worth naming so a future reader
does not mistake "measured" for "this specific topic personally has five
trials of its own."

## What is validated, and what remains disclosed future work

Validated for real, by this run: B1's mechanism (`returnCurve`, unmodified,
against fold.js-shaped events) and B2's mechanism (`retrieval.js`'s real
need-odds/ACT-R composition) both behave exactly as increments A and C's
own unit tests already showed at small scale, holding up at conversation
scale with realistic-shaped (if constructed) return patterns. Not done
here, named rather than implied: a real captured conversation's own numbers
(this instrument has not been run live long enough yet to produce one);
wiring B1's own bins into `deriveRecordWindow`'s `candidates` argument at a
live call site; a `returnCurve`-based measurement of `MAX_FOLDS_IN_PROMPT`
(fold.js's own header names why this pass leaves that specific window
declared rather than measured — no tokenizer for a fold's free text).
