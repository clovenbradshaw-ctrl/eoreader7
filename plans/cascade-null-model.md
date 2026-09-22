# Spec: a measured null for cascade reach (2026-09-22)

## The question

`native/kernel/cascade.js` already does real graph-topology work: `dependentsIndex`
inverts a dependency list once, and `cascade` walks a single multi-source BFS
over it, returning every reachable id with its shortest depth from a seed.
It backs both the license-withdrawal cascade and the derived-note withdrawal
cascade (derivation.js's `withdrawDerived`, reaction.js's `withdraw`).

What it does not say: whether a given cascade's reach is *unusual*. A
withdrawal that takes out 40 downstream ids at depth 3 is reported as 40 at
depth 3, full stop — nothing compares that to what a same-sized seed set
would reach by chance in the same graph. That is the same gap
`no-handset-thresholds-prefer-born-null` and
`referent-universe-hop-bounded-null` name elsewhere in this repo: a number
with no null behind it invites a hand-picked "that seems big" instead of a
measured claim.

## Current state (unchanged by this spec)

```js
export function dependentsIndex(items, dependsOn, idOf = (item) => item.id)
export function cascade(index, seeds, { seen = new Set() } = {})
```

Both stay exactly as they are. Callers that don't want a null comparison
(derivation.js, reaction.js today) pay nothing extra — no new allocation, no
new pass, same hot path.

## Addition

Two new exports, built strictly on top of the existing two — no
reimplementation of the walk:

```js
/**
 * cascadeNull(index, seedCount, opts) — the empirical distribution of
 * cascade() reach for `trials` synthetic seed sets of size `seedCount`,
 * drawn uniformly (without replacement) from the graph's own id universe
 * (every key and every dependent id already present in `index`).
 * Returns { reachedCounts: number[], maxDepths: number[] }, each array
 * length `trials`, unsorted (caller sorts if it wants percentiles) —
 * this function hands back a distribution, never a verdict.
 */
export function cascadeNull(index, seedCount, { trials = 200, rng = Math.random } = {})

/**
 * cascadeSurprise(index, seeds, opts) — runs the real cascade, then
 * cascadeNull at the same seed count, and reports where the real result
 * falls in that distribution.
 * Returns { reached, maxDepth, rank, trials }, where rank is
 * count(nullReachedCounts <= reached) / trials — 1.0 means this cascade
 * reached farther than every synthetic trial, 0.0 means every synthetic
 * trial reached at least as far. No alpha, no pass/fail: the rank is the
 * measurement, and the caller (or the ledger) decides what to do with it.
 */
export function cascadeSurprise(index, seeds, { trials = 200, rng = Math.random } = {})
```

Implementation notes:

- The id universe for sampling is built once per call from `index`: every
  key, plus every id inside every key's `Set`. `dependentsIndex` already
  guarantees these are the only ids that can ever appear in a `cascade`
  result, so this is the correct (and only) population to draw synthetic
  seeds from — sampling outside it would just inflate every trial's reach
  with guaranteed misses.
- `cascadeNull` calls the existing `cascade(index, syntheticSeeds)`
  unmodified, once per trial. `trials = 200` is a starting default, not a
  claim of sufficiency — see Tests below for how it gets checked, not
  asserted.
- `rng` is injectable so tests are deterministic; production callers accept
  the `Math.random` default.

## Where the result goes

`project-fold-prequential-scoring` already names a designed-but-unbuilt
null battery on the ground ledger. `cascadeSurprise`'s `{ reached, maxDepth,
rank, trials }` is sized to be logged there directly when a withdrawal
cascade runs — "this withdrawal's rank against its own null was 0.97" is a
queryable historical fact, not a number printed once and discarded. Wiring
that logging call is a separate, later step; this spec only adds the
function that produces the number.

## Tests (new file: `native/kernel/cascade-null.test.mjs`)

1. **Determinism.** Fixed `rng` (seeded PRNG, not `Math.random`) → two calls
   to `cascadeNull` with identical inputs produce identical output arrays.
2. **Known shape, chain graph.** A pure chain `a→b→c→...→z` (25 nodes):
   `cascade` from any single seed reaches a predictable count depending on
   position; `cascadeNull` with `seedCount = 1` over many trials should
   produce a reached-count distribution whose mean matches the analytic
   expectation (average tail length from a uniformly random start) within a
   tolerance band — this catches a sampling bug, not just a wiring bug.
3. **Known shape, star graph.** One hub with 24 leaves, hub→each leaf:
   seeding the hub reaches all 24; seeding a leaf reaches 0. `cascadeSurprise`
   seeded on the hub should return `rank` near 1.0 (every synthetic
   single-leaf draw reaches far less); seeded on a leaf should return `rank`
   near 0.0.
4. **Unbiasedness sanity check.** Over many repeated calls to
   `cascadeSurprise` where the "real" seeds are themselves drawn the same
   way as the null (uniformly random, same count), the resulting `rank`
   values should be roughly uniform on [0, 1] — if they cluster, the null
   sampling is not comparable to the real-seed distribution and the whole
   measurement is invalid.
5. **Existing suite unaffected.** `native/kernel/cascade.test.mjs` (if
   present) and any derivation.js/reaction.js tests exercising withdrawal
   pass unchanged — confirms the addition is additive, not a rewrite.

## Out of scope

- Point-to-point path/distance between two named nodes. `cascade` is
  multi-source-to-everywhere; nothing here needs single-target shortest
  path, so it is not added speculatively.
- Centrality, community detection, or any ranking measure beyond reach and
  depth. `splitProposals` in `kind-universe.js` already does narrow
  connected-components for kind induction; this spec does not generalize it
  because nothing yet calls for a general partitioner.
- Wiring `cascadeSurprise` into the ground ledger's recording path — left
  for the ledger's own owner to schedule, since it touches ledger-write
  code this spec's diff does not otherwise need to touch.
