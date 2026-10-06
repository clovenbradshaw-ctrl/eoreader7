# The 27 houses and the slot colony — the gate is sound where it ran, and ordering the species by their houses buys nothing measurable

`ER7_SPECIES_DIR=<eoreader7 #148 checkout>/native/the-fold node native/eval/the-fold/slot-colony-measure.mjs --exploratory`
Standing: **a measurement of one run, on one set of species** — eoreader7 PR #148's fielded-swarm species and
tasks at commit `e2ce972` (the PR is still a draft and has moved since), twelve species, 80 slots in four task sets,
no model called anywhere. The transcript the numbers below are read from is `slot-colony-run.md` beside this file;
The same run's `--json` is not committed (results/*.json is gitignored); the driver writes it with `--json out.json`. Two runs agree on every non-timing line. **This result is
reproducible only where #148's species exist** (the driver refuses typed, exit 2, without them — P95). No test on
main reads these numbers. Two runs of the final driver agree on every non-timing line except E0, which reads the wall
clock on purpose and varies between runs (learned `wasted` 0×6/1×9, 0×9/1×6, 0×8/1×7 in three runs).

Generality: **specimen-scoped.** One species family, one author's tasks, held-out runs the same author wrote.

## What was asked

The operator's direction: *"use our real swarm and enhance the swarm by creating the 27 houses for them … this all needs
to be deeply falsified."* `organs/slot-colony.js` is the stigmergic colony (kernel/stigmergy.js, the structure-swarm's
discipline) pointed at the slots of a coding unit; `organs/code-habitat.js` gives each species a house — one of the 27
cells of the cube — and a coverage map of what lives where. The driver puts #148's twelve real species into the colony,
each in the house of the act it performs, and registered ten predictions before the first run (header of the driver).

## What the first run said, and what survived the review of it

The first run looked like a pass: H1–H5 held, H2/H3 held by a margin of one or two events. Two things then happened — I
re-ran it and the learned arm differed, and two independent reviewers were told to break the organs and the measurement.
Every finding below was reproduced by me before it was acted on; the reviewers' own numbers are cited only where I
re-measured them.

### The gate is sound — and was exercised far less than "0 of 158" sounds

| claim | measured |
|---|---|
| the colony reproduces `cheapFill`, slot by slot, same species (H1) | 71 of 80 slots filled, identical in all four sets (A 23/23, B 21/23, C 14/20, D 13/14). **Holds.** An independent comparison (reviewer; `swarm.cheapFill` called directly) agrees, down to the emitted code. |
| redealt targets are never filled (H5) | 160 redeals asked for, 158 produced (a constant field cannot be redealt), **0 false fills in every order** |
| …but how often did the gate actually run on them? | **26 of 158.** 132 redealt slots drew no candidate from any species, so they say nothing about the gate. 10 refused candidates exist anywhere in the 80 × 12 table, **all from `decide`.** |
| the null arm can see a cheat (H5b) | 158 of 158 filled when a species reading the true held-out answers is added. **True by construction** — it shows the arm counts a fill when one is made, not that the gate is strong. |
| a second, realistic null (E5): each slot given *another* slot's shown targets | 78 slots, gate evaluated on 12, 0 false fills |

So the honest sentence is: **the held-out gate refused every wrong candidate it was ever offered (26 + 12 slots), and
there were few to refuse.** The first run's "the gate let nothing through" would have been the same sentence with the
denominator hidden.

### Ordering: nothing was resolved, and the registered tests could not have resolved it

| pooled over the held sets B+C+D (57 slots) | filled | attempts | wasted |
|---|---|---|---|
| declared (the species' own order) | 48 | 370 | 2 |
| derived (the chain of each species' house) | 48 | 441 | 1 |
| reversed (control built to cost more) | 48 | 582 | 7 |
| learned (taught on A, unit clock) | 48 | 331 | 0 |

- **H4 holds**: the reversed order wastes 7 against 2, so the metric *can* see an order that is bad.
- **H2 and H3 held by the letter and carry almost nothing.** Derived wastes one fewer event than declared, learned two fewer.
  Both are two or fewer events out of 57 slots. A ledger with the head→route association *shuffled* wasted no more than the
  learned one in 2 of 20 seeds (and no more than declared in 16 of 20) — the control is weak, not decisive.
- **H6 and H7 cannot be passed.** The registered bar was "strictly better than 95% of random orders". **36.9% of random
  orders already waste nothing**, so even a perfect order could beat at most 63.1% of them. The first run printed
  FALSIFIED for all of them without noticing the bar was unreachable. They are **UNRESOLVED on this metric**, and the
  driver now says so (the registered rule's own word is printed beside it).
- All ten refused candidates come from one species, so an order wastes work only by trying `decide` before the species that
  clears a slot. That is a one-parameter structure, and it is *learnable*: among
  random orders that waste nothing on set A, **90.1% also waste nothing on B+C+D, against 36.6% unconditionally (E8).**
  So order is not noise — a good order transfers — but the thing that transfers is "put `decide` late", and the houses do
  not say that.
- **The houses did not carry the order (H6, corrected).** The first run said the real house assignment beat 90.1% of
  random assignments. That number was a driver bug: the random assignment was drawn inside a lambda `sim` called once per
  *slot*, so each slot saw a different assignment. One draw per trial: the real assignment is better than 2,100 of 5,000
  random ones, ties 1,137, worse than 1,763 — and 35% of random assignments already waste nothing.
- **The effect that the chain order does show is a change of who fills a slot (E4).** Under derived order,
  **18 slots are filled by `optional` instead of `copy`** (NUL·Figure precedes CON·Figure in the chain). H2's "same fills"
  compared counts and ids, not species, and missed it. It is house-dependent: placing `optional` and `coalesce` beside
  `copy` in CON·Figure (they *are* copy with a fallback) removes it (reviewer, 576 defensible assignments: the number of
  slots changing species is 0 in 160 of them, 9 in 128, 18 in 288). The 18 are not "wrong": they are the data not
  choosing (below).
- **Cost, not `wasted`, is where order shows.** On `attempts`, learned is the cheapest of every random order's 100,000
  (223), declared is in the best 0.6% (262 — copy first), reversed in the worst 3% (474). On ms (one wall-clock
  measurement per order) learned costs *more* than derived in every run here — 556 against 396 in the final one — despite wasting
  less and attempting less: `wasted` can mislead about cost, because `compose` and `decide` are nearly all of the time. Absolute `wasted` also couples to the number
  of passes (a refused candidate is re-gated in every pass); `skipUnchanged` removes exactly 72 attempts in every order
  and changes no `wasted` (E6).
- The fixed-order table is a simulation of the colony; after the review fixed a leak (it had been built with every
  sibling's fill present, which a colony does not have: 13 refusals became 10), **simulation and real colony agree on
  `wasted` in all four orders** (2/2, 1/1, 7/7, 0/0).
- E7, teaching on one set and judging the rest: learned wasted 0 / 2 / 3 / 2 (taught on A / B / C / D), derived 1 / 1 / 2 /
  2, declared 2 / 2 / 4 / 4. Learned is no worse than declared in 4 of 4 splits and strictly better in 3; it beats
  derived only when taught on A. E0, wall-clock teaching, 15 times: learned wasted 0×8, 1×7 — below declared's 2 in all 15.
  (The unit clock was introduced because the wall clock made two identical runs differ: ties between equal-strength trails
  are broken by mean latency.)

### Replication and underdetermination: the registered tests were too small

- **H8 held on 12 of the 71 fills** (three tasks have six runs). Every C(n,3) choice of shown examples for the 23 tasks
  with at least five runs (E1): 65 of the 71 fills covered, 316 refits, **909 of 972 (slot × other-triple) refilled; 17
  slots are lost under at least one triple.** By the species that made the baseline fill: `decide` 9/36, `compose`
  219/252, `joinPresent` 78/80, `coalesce` 52/53, and `copy` 253/253, `branch` 200/200, `argmax` 27/27, `null` 34/34,
  `topk` 9/9, `map` 9/9, `optional` 19/19. **A categorical rule fitted to three examples is the fragile fill.**
- **H9 held (0 of 21 multi-clearing slots disagree) only because crossover recombines present values.** Setting each
  parameter, and each key of each object parameter, to null and then removing it (E2): **21 of 21 disagree**, 12 of them in
  value after treating `undefined` as `null` (copy vs optional vs coalesce; joinPresent vs template). Where two species clear
  the gate and the data has no absent value, the order that picks one is arbitrary — which is exactly the 18 slots above.
- 59 of 71 fills rest on at most two held-out runs; 6 on one. All 71 fills land in pass 1, so **the retry-and-environment
  machinery (the stigmergy the colony is named for) was never exercised on this data.**
- Leave one species out (E3): `compose` −33 (30 slots it alone clears, plus three `decide` cascades), `decide` −4, `branch`
  −3, `argmax` −3; **`copy` −0, by construction** — every copy slot is string-valued and `optional` covers it.

### The houses as a map

6 of the 27 houses are occupied (NUL·Figure, CON·Figure, SYN·Figure, SYN·Pattern, DEF·Figure, EVA·Figure); 21 are
"leads". **A list that is 21 of 27 cannot say what to build first** — nearly every house is relevant to nearly every unit.
What the unfilled slots say is more actionable: 9 slots, six of them numeric or categorical derivations in two tasks
(`bookFine`, `gradeRow`), none of which any species reaches.

## What the review found in the organs (all fixed, each with a test written first and a mutation that kills it)

The organ's 18 original tests passed on every one of these. The reviewers' repros, re-created by me as failing tests:

1. **A species was handed the colony's live objects.** It could replace the slot's gate, rename the slot, forge a fill in
   the environment map, delete a real fill (making a *leaky* gate report clean), or empty the map every call so the run never
   terminated. A species now gets a frozen view of the slot without its gate, a copy of the environment, and the gate as a
   counted `env.gate`; fills, trails and rows are written only from values the colony captured first.
2. **The null arm could pass vacuously.** No redeals, no species, or species that offer nothing on a redealt slot gave
   `gate_holds` having exercised nothing, and a dependent species was never exercised because nothing filled. The verdicts
   are now `gate_leaky`, `gate_holds`, `gate_holds_partial` (some slots never saw a candidate) and `untested`; fills are
   counted from the rows, not from the final map.
3. **A throwing or rejecting gate killed the whole run** and lost every earlier fill and trail (only `fill` was in the
   `try`). It is now a refused candidate, flagged on the row.
4. **A duplicate or missing slot id masked an unfilled slot**; a non-string kind built a trail head by coercion. Both are
   typed refusals now.
5. **A falsy candidate (0, "", false) was silently never gated.**
6. **A redeal equal to the real target** (a constant field) is not a false target; `redealt` now excludes it and reports what
   it dropped.
7. **The species could use the gate as an oracle** (reviewer's repro: one enumerated 145 candidates against it and recovered
   the held-out function). The four of #148's species that choose by the held-out runs (optional, coalesce, joinPresent, and
   `solveField` inside compose) do this *by design*, so the gate is not removable — it is now counted. On the real slots
   `accept` is called once per slot, so no selection among several shown-fit candidates occurs.
8. **`derived` was not "derived, not typed".** The rank is the cube's, but the input is the cell the caller typed for each
   species, so it compares two caller-authored orders. The headers say so now, and the default order is `declared`.
9. **`unitOf` failed open**: one `null` among the shown targets turned ten houses into "not relevant" and removed them from
   the leads; a throwing `want()` crashed it; `shown: -1` sliced off the last run. Unknown structure is now `unmeasured`
   (`relevant: null`), and a house a fill lands in despite being "not relevant" is flagged.
10. `SYN·Pattern` ("a list-valued field") was relevant to an object of scalars; `residentCell("constructor·Figure")` raised
    a raw `TypeError` and `"CON·Figure·garbage"` was accepted as `CON·Figure`.

**Found, not fixed (not this module's to change):** `kernel/cube.js::cellOf` looks up with truthiness on a plain object, so
`cellOf("constructor", "Figure")` throws a raw TypeError instead of returning a gap (`residentCell` now guards it);
`kernel/stigmergy.js::routeOrderFor` places a route with only failed deposits ahead of routes never tried (the colony never
deposits a failure, so it is unaffected). Reported by the review and **not reproduced here**: `deposit` copies the whole
ledger per fill (about 64 s for 16,000 distinct slot kinds), a reverse-order dependency chain does about n² attempts, a
never-settling `fill` hangs the run (no timeout). The candidate is still stored by reference — a species can mutate it
after the gate passed.

## What may and may not be said

May: the held-out gate refused every wrong candidate it was offered; the colony is a faithful reimplementation of
`cheapFill` on 80 slots; reversing the order costs measurably; a good order transfers across task sets; the null arm
reports what it exercised; the fills that depend on which three examples were shown are the categorical ones.

May not: "the houses derive a better order" (the real assignment is no better than random ones and one re-housing removes
its only effect); "the gate was tested on 158 slots" (it ran on 26); "H2/H3 hold" without the two-events caveat and the
18-slot identity change; "the stigmergy was exercised" (every fill landed in pass 1); "the habitat map says where the next
species goes" (21 of 27 houses are leads).

**Coherence is not correspondence.** Every held-out run was written by the person who wrote the tasks; agreement with
them is the gate's meaning, not intent.

## Next, and what would change this reading

- Species for the unfilled slots (the `bookFine` / `gradeRow` numeric and categorical derivations) — the one result that
  moves a number the operator cares about. Each new species should be tried on a *new* set written after it, never set A.
- A task set where a slot genuinely needs a second pass (a field that reads a sibling's computed value) so the
  environment half of the stigmergy is exercised at all.
- A `decide` that does not break under a change of shown triple (36 baseline fills, 9 refilled) — the largest single source
  of fragility measured here.
- A cost metric (ms on a quiet machine, replicated) instead of `wasted`; and a house assignment fixed *before* the run by
  something other than the author's reading of each species.
