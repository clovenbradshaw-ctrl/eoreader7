# Falsifying "too little material" — phasepost-dmd.js on real Frankenstein

S117 shipped disclosing its only tested run (a 20-sentence synthetic
paragraph) as too little material for the eigenvalues to mean anything.
Asked directly to falsify that, not just re-assert it: run the same,
unmodified pipeline against real, book-scale material, then — per II.23 —
do not trust a non-trivial number until it survives a shuffle control.

## The run

`node native/eval/phasepost-dmd-read.mjs <pg84_Frankenstein.txt>` — the
same real Frankenstein text `eval/salience-dmd.mjs` already measured (so a
reader can compare the two DMD drivers directly), real extraction
(`makeRelationReader`), real classification (`phasepost.js`, real
ActPrior@1, real UniMorph lemmatizer), real `contextualModes`, no
fixtures, no mocks. Whole book, 3,392 sentences, **2.6 seconds total**
(extraction 2.1s, classify+decompose 40ms).

**First half of the claim, falsified outright.** At book scale the
eigenvalues are NOT all-zero: 6,313 edges extracted, 775 classified to a
definite cell (5,038 gap + 500 contested, excluded honestly — an 87.7%
exclusion rate, real and disclosed, not smoothed over), spanning **14 of
the 27 cells**. The decomposition is well-formed and non-degenerate: a
real conjugate oscillatory pair (frequency ≈1.463 rad, magnitude 0.0572),
a real alternating (period-2, frequency=π) pair, real decaying modes down
to noise floor. At 20 sentences every eigenvalue was exactly zero; at
3,392 they plainly are not. Material quantity was a real bottleneck, and
book scale clears it.

## The control that actually matters

Top oscillatory magnitude, real reading order, vs. the SAME multiset of
per-unit snapshots (same sparsity, same per-cell totals) with unit ORDER
destroyed by a Fisher-Yates shuffle (seeded, mulberry32, reproducible),
`contextualModes` re-run unmodified on each shuffle — `native/eval/
phasepost-dmd-null.mjs`.

**At 30 draws, the real value beat every shuffle** (real 0.05717, null
max 0.05608, median 0.0310) — 0/30, nominal p ≈ 1/31. Reported honestly at
the time, and flagged honestly as narrow: the gap between the real value
and the null's OWN best draw was ~2%, exactly the shape of a result this
project's own history (P66: "a null drawn once is a null drawn zero
times") says not to trust yet.

**Widened to 100 draws (same seed, so draws 1-30 are identical, draws
31-100 are new — one continuous, reproducible stream), the finding
weakens substantially.** 3 of 100 shuffles now meet or exceed the real
value; one shuffle reaches 0.0721, well above the real run's 0.0572.
Nominal p ≈ (3+1)/(100+1) ≈ 0.040 — still inside the loosest conventional
bound, but nowhere near the confident "0/30" the smaller draw count
suggested, and the sparse 30-draw run turns out to have been exactly the
kind of noisy undersample this project's own repeated lesson warns about.

## What this actually establishes, stated at the calibration it earned

1. **Material-quantity is falsified as a blocker on well-formedness.**
   Real book-scale material produces a real, non-degenerate decomposition
   over a real, richly-populated cell basis. This was the narrower, more
   defensible half of the original disclosure and it holds.
2. **Whether this SPECIFIC statistic (top oscillatory magnitude of a
   phasepost trajectory) detects genuine, order-dependent "rhythm" in a
   reading — as opposed to being explainable by the sparse, spiky shape
   of the classified-act histogram regardless of order — is NOT
   established by this run.** The real value sits inside reach of chance
   at a widened draw count; a confident claim would need either a larger
   draw count still (cheap: ~1.2s/draw, a few more minutes buys a tighter
   estimate), a different statistic less sensitive to sparsity (e.g. total
   spectral energy across all oscillatory modes, not just the top one), or
   both.
3. **The 87.7% exclusion rate is very likely the dominant force acting on
   both numbers.** A trajectory this sparse (775 of 6,313 units nonzero)
   is close to the regime where reordering the FEW nonzero snapshots barely
   changes what the SVD sees — which is exactly why the real value and the
   null's own top draws sit so close together. Whatever real dynamical
   signal exists here is fighting the extraction/classification pipeline's
   own recall ceiling for room to show itself, the same ~2% corroboration
   wall this project has measured elsewhere in a different guise.

## The power check — and a more decisive answer than "inconclusive"

Recommended and then run: before trusting (or dismissing) the 3/100
result above, confirm the shuffle-null test can detect a TRUE, planted
signal at this same sparsity at all. `native/eval/
phasepost-dmd-power-check.mjs`. Two real things were found building it,
neither assumed:

**A real bug in the test statistic itself, caught before it could corrupt
anything else.** "Top oscillatory magnitude" was coded as `im !== 0`
(complex-conjugate pairs only) — which silently excludes a genuine
period-2 mode, which DMD represents as a REAL, NEGATIVE eigenvalue
(frequency = π, im = 0). The real Frankenstein run's own SECOND-largest
mode (0.0523 @ freq=π) was exactly this shape and was never actually
being tested by the original statistic. Fixed to "any eigenvalue whose
frequency is meaningfully non-zero" — complex pair or real period-2
alike — before any further measurement.

**A genuinely decisive finding: even a 100%-clean, noise-free planted
rhythm is not reliably visible at this sparsity.** A 4-cell cyclic signal
(A→B→C→D→A…, period 4, matching the real book's own recovered period ≈4.3)
was built at the IDENTICAL sparsity ratio (12.3% of units carry a
snapshot, matching Frankenstein's 775/6,313 exactly) across 40
independent random placements of which positions get observed. **Only
14 of 40 (35%) placements showed ANY detectable rhythmic eigenvalue at
all** — the rest read flat zero, not weak: a perfectly real, unambiguous
ground-truth rhythm, invisible more often than not, purely because of
WHERE the sparse observations happened to fall relative to the cycle's
phase.

**And when a clean rhythm IS detected, it does not reliably beat its own
shuffle-null either.** Taking the median-magnitude detected instance
(0.0849) and running the same 100-draw shuffle-null on it: **7 of 100
shuffles met or exceeded it** (nominal p≈0.079) — worse odds than the
real Frankenstein run's own 3/100. A pure-noise control at the same
sparsity (no structure at all) showed **38 of 100 of ITS OWN shuffles**
meeting or exceeding its own "real" value — a false-fire rate far above
any conventional 5% level, meaning the null's own CALIBRATION is
questionable at this sparsity, not only its power.

**One methodological inconsistency, caught and disclosed rather than
silently patched under time pressure:** the noise-mixing "matched
magnitude" arm calibrated using bare `decompose()` (full-length, no
window search) but the final measurement used `contextualModes()` (which
runs its OWN window search and can converge on a much shorter window —
64 units instead of the full 1,500 in this run) — the two disagreed
sharply (calibration predicted ≈0.064, the actual windowed run measured
0). This arm's specific number is dropped rather than reported past a
known apples-to-oranges comparison; the clean-arm and noise-arm findings
above did not have this inconsistency (both used `contextualModes`
consistently throughout) and stand on their own.

**The honest conclusion is stronger than "the Frankenstein result is
inconclusive" — it is that this specific test (unit-per-edge trajectory,
top-rhythmic-magnitude statistic, ~88% sparsity) cannot currently
distinguish real order-dependent structure from noise in either
direction, confirmed by a proper positive control, not merely suspected
from a close call.** The 87.7% exclusion rate — the extraction/
classification pipeline's own recall ceiling, not a defect in DMD's math —
is the dominant, named cause: at this density, reordering the few
non-empty snapshots barely changes what the SVD sees, for a real signal
exactly as much as for a fake one.

## Honest scope, and the prioritized next lever

One book, one language (English), one statistic, one seed for the main
run (the power check swept 40 independent placements). Given the power
check's own finding, the highest-priority unattempted lever is now named
precisely rather than left as one option among several: **reduce the
sparsity itself** — a coarser unit grain (per-sentence or per-paragraph
snapshots, summing multiple edges per snapshot instead of one-edge-one-
unit) directly attacks the 87.7% exclusion rate the power check
identified as the dominant cause of low test power, and is worth trying
BEFORE a second book or a different statistic, since neither of those
would matter if the underlying signal-to-noise ratio stays this thin. A
second book (replication) and a total-spectral-energy statistic (less
sensitive to a single lucky/unlucky mode) remain real, named,
unattempted alternatives, secondary to the sparsity fix.

## Files

`native/eval/phasepost-dmd-read.mjs`, `native/eval/phasepost-dmd-null.mjs`,
`native/eval/phasepost-dmd-power-check.mjs` (all new, re-runnable — not
committed regression tests, matching this project's own standing posture
for eval drivers, P19/P27).
