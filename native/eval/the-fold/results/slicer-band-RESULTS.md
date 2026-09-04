# The slicer's control, drawn more than once

`node ranke-slicers.mjs` with `BAND=20 SLICERS=containment` — Apollo 11
backwards walk, 40 object-missing partials, gemma2:2b at temperature 0,
faces read from `fixtures/primary-faces/` (offline; no network in this run).

## Why this run exists

Run 4 took the licensing measurement and reported:

| slicer | offered | real states | control states | verdict then |
|---|---|---|---|---|
| containment | 40 | **9** | 1 | separates from control |
| activation | 16 | 2 | 2 | refused by its own control |
| random | 40 | 2 | 3 | refused by its own control |

The control is a **fixed +1 rotation** — deterministic, and therefore one
draw. This project's own P66 says a null drawn once is a null drawn zero
times, and it says it about exactly this shape: a numerator held fixed while
the null is never given a chance to vary. So containment's "separation" was
unlicensed as it stood, and this run draws the null twenty times.

## The budget, declared before the first call

- **One arm: containment.** It is the only arm whose real number sits above
  its own control at all. `activation` (2 vs 2) and `random` (2 vs 3) are
  already at or inside their single-draw null; a band cannot rescue an arm
  whose observed value is already at the null's own level, and spending 40
  passes to establish that would buy nothing. `activation` is additionally
  confounded — it offered 16 of 40 notes, so its refusal mixes *cannot
  choose* with *chose wrong*, which a band does not disentangle either.
- **Twenty draws.** A rank p from D draws cannot go below 1/(D+1). Twenty is
  the smallest D that can reach α = 0.05 by rank alone (1/21 = 0.048). Fewer
  cannot certify at the declared α; more would sharpen a p-value that an
  n = 40 sample does not support.
- **The real arm is not re-run.** Temperature 0, deterministic, already on the
  checkpoint at 9 of 40. Re-running it would spend calls to reproduce a
  number.
- **Cost: ~800 model calls, ~53 minutes** at the 158s/pass run 4 measured.

## What a seeded draw is

`ROTATE_SEED` replaces the fixed +1 rotation with a seeded **derangement** of
the notes' `end2`s — every note gets an object that is not its own, and a
fixed point (a note handed its own object back, which would be a *real* row
smuggled into the null and would pull the null toward the observed value) is
swapped out explicitly. Same subjects, same faces, same slicer, same witness,
same protocol. Only which object each subject is paired with moves.

With both knobs absent the driver is byte-identical to run 4.

## Result

*(pending — this section is written when the run lands, not before)*
