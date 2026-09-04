# The cited-source corpus IS independent — and the independence floor does not scale (2026-09-04)

`node native/eval/the-fold/cited-source-independence.mjs`. **Zero model calls.**

`source-independence-RESULTS.md` found the three-page Wikipedia fixture was
never three independent sources: 22 corroborated notes went to **0** under the
admission door and independence together. It closed by naming what was
missing — *"a genuinely independent corpus: different publishers, not
different pages of one"* — and that corpus was never sought. The
Ranke-backwards material is one: an article measured against **the sources it
cites**, 106 cached faces over 34 distinct hosts. This is that measurement.

## The finding

| | |
|---|---|
| cited faces referenced by at least one note | 106 |
| distinct hosts among them | 34 |
| **independent texts, door-filtered** | **89** |
| collapsed into a shared text | 17 |
| groups holding more than one face | 3 |

**This corpus is genuinely independent, and it is the first one measured here
that is.** Where the Wikipedia fixture collapsed to nothing, 89 of 106 faces
here stand as their own text. The syndication that does exist is exactly what
the organ was built to catch, caught:

| group | faces | hosts |
|---|---|---|
| the American Presidency Project's documents and their Internet Archive mirrors | 15 | presidency.ucsb.edu + web.archive.org |
| archive duplicates | 3 | web.archive.org |
| archive duplicates | 2 | web.archive.org |

One publisher mirrored, plus two small sets of duplicate snapshots. Nothing
else in the corpus shares a text.

## The methodological finding, which is the more portable one

**The declared floor of `minShared` 2 decides nothing at this corpus size, and
its null runs the wrong way.** Measured, before any number above was read:

| minShared | real collapsed | null median (range) | redeals reaching real |
|---|---|---|---|
| 2 | 18 | **27** (24–30) | **20/20** |
| 3 | 17 | 17 (12–19) | 10/20 |
| **4** | **17** | 11 (8–15) | **0/20** |
| 5 | 16 | 9 (7–12) | 0/20 |
| 6 | 16 | 8 (5–10) | 0/20 |
| 8 | 13 | 4 (2–8) | 0/20 |

At the inherited floor the redealt corpus collapses **more** than the real one
(27 against 18). That is not noise swamping a signal; it is a threshold
calibrated on three sources being carried onto 106. Three sources are 3 pairs;
106 are 5,565, and two documents sharing two long sentences by chance is
near-certain somewhere in a pool that size.

Read down the table, the real number barely moves (18 → 13 across the whole
sweep) while the null falls fast (27 → 4). That is the signature of real
syndication: the collapse is carried by pairs sharing **many** sentences, not
by pairs scraping past a floor.

**So the driver now reads its floor off the null** rather than inheriting one:
it sweeps upward and takes the smallest value no redeal reaches. On this
corpus that is 4, derived, printed with its own sweep on every run.
`MIN_SHARED` still overrides for reproducing an old number.

## The control (II.23)

Sentences redealt among the faces, every sentence and every face's count kept,
only which document a sentence came from destroyed. 40 draws at the derived
floor: **real collapsed 17, redealt median 12 (8–15), outside every draw.**

## What this does and does not settle

- It settles the **denominator**. Every corroboration rate this project has
  published was measured on material that could not corroborate. This corpus
  can. A corroboration number measured here would be the first meaningful one.
- It does **not** measure corroboration. No ledger was built and no witness
  was asked; this pass answers only "are these sources independent."
- **Disclosed:** 259 of the walk's 674 rows come through `web.archive.org`,
  whose underlying publisher the host field cannot see. Independence is decided
  here by shared text, not by host, which is the right way round — but it
  means the 34-host count is a weaker statement than the 89-text one.
- **Disclosed:** sentence identity is exact after whitespace and case
  normalisation, so a paraphrased reuse is invisible. The organ under-detects
  syndication rather than over-detecting it, which is the conservative
  direction.
- `minSentenceLength` 40 is still declared, not derived. Only `minShared` was
  moved onto the null this pass.

## Files
`cited-source-independence.mjs` (new).
