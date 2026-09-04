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

    real 9   null median 2 (1-5), 20 draws   0 at or above real   rank p 0.048

Draws, sorted: `1 1 1 1 1 1 2 2 2 2 2 3 3 3 3 3 3 3 4 5` (mean 2.3).

**Containment's separation survives the properly-drawn null.** Every one of
the twenty seeded derangements landed below the observed 9, so the rank p is
the floor twenty draws can reach.

## Three things this does and does not license

**It clears the declared alpha with no room whatsoever.** A rank p from D draws
cannot go below 1/(D+1), so 0.048 is not "comfortably under 0.05" — it is the
smallest number this budget could have produced. **One** draw at or above 9
would have made it 0.095 and failed. The budget was sized to be able to reach
alpha, and it reached it exactly; a finding at the edge of what its own design
can express is worth reporting as such rather than as a margin.

**Run 4's single draw was luckier than it deserved.** The fixed +1 rotation
returned 1, which sits at the *bottom* of the null's real spread. So "9 against
1" overstated the separation: the honest comparison is 9 against a median of 2
with a ceiling of 5. The conclusion is the same and the reported margin was
not. That is the whole reason P66 exists — a single draw is not wrong, it is
uninformative about its own variability, and it flatters or damns at random.

**The null is not zero, and that number is a false-positive rate.** The control
rotates each note's object to another note's, so every rotated claim is one the
source does not make. The witness signs 1 to 5 of them per pass — a median of
2 in 40, about **5%**. Any use of this tier downstream inherits that: of the 9
real landings, roughly 2 would have landed on a proposition the source never
stated. The measurement licenses the slicer; it does not make the witness
clean, and reporting the 9 without the 2 would be the single-draw error in a
different costume.

## Against the pre-registered licensing rule (P85)

| | condition | verdict |
|---|---|---|
| L1 | parity is the license | met — containment *as a decider* measured at parity with its own control at every grain in run 4, which is what makes the model call not P30 waste |
| L2 | beats the cheap organ at the same reach | met — random offered the same 40 notes and landed 2; containment landed 9 |
| L3 | beats its own control built to fail | **met, and only now** — 9 against a 20-draw null, 0 at or above, p = 0.048 |
| L4 | authority bounded to what the control covers | met by construction — the slicer only ever RANKS where to look; the armed select protocol decides, and the sibling-swap arm, the indiscriminate-pick check and the distinct-source count below it are all mechanical |
| L5 | the absence is typed | met — `no_candidate`, `refused:no-testimony`, `refused:indiscriminate` are counted apart on every draw |

`activation` and `random` remain **refused by their own single-draw controls**
and were deliberately not banded: an arm whose observed value already sits at
or inside its null cannot be rescued by drawing that null more often, and
`activation` is additionally confounded — it offered 16 of 40 notes, so its
refusal mixes *cannot choose* with *chose wrong*.

## What is still not established

- **One page, one model, 40 of 162 notes.** The population is the Apollo 11
  backwards walk's object-missing partials; nothing here speaks for another
  page or another model. "Paraphrase is crossable" and "paraphrase is
  crossable by a 2B model at this slicer" are the same measurement.
- **Calls through one model are one instrument.** Twenty draws vary the null,
  not the reader. This buys a licence, never corroboration.
- **The real arm was not redrawn**, by design — it is deterministic at
  temperature 0. So this measures the null's spread, not the observation's.

**Generality:** specimen-scoped — the licence is for containment-as-slicer on
this note population; the P66 lesson it re-earns (a deterministic control is
one draw, and one draw reports no spread) is universal.
