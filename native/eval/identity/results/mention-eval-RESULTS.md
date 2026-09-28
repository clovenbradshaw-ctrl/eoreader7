# Identity induction over War and Peace — mention-eval.mjs, first live run and its fix, 2026-09-28

`mention-eval.mjs` had never been run. It builds each name's universe from
every SENTENCE it is mentioned in (`mention-record.mjs`: hop-1 = the
sentence's own content words, hop-2 = which other present characters
co-occur, `namesNode`), over the real Project Gutenberg text of *War and
Peace*, and puts `makeIdentityInduction` to three tests: a TWIN split
(half a real name's own occurrences moved to a synthetic `#twin` node — the
correct verdict is always BOUND, since it is the same material cut in two),
a SHUFFLE (which name owns which mention redealt — the correct verdict is
never BOUND), and eighteen DECLARED pairs read off the novel before the run
(four same, two impure — a surname naming several referents, twelve
different).

## What the first run found

Test 3 ("they carry weight" — does x depart from an average node of its
kind more than a random same-size draw would) failed on every one of the
sixteen twin-split pairs, all sixteen reading `unbound(idle)`. Pierre's own
twin — built from occurrences that are literally half of Pierre's own
material, 16.6% of the pooled mention count across all thirty tracked
names — read idle on that attempt, and the code comment written at
diagnosis time (`kernel/identity-induction.js:214-217`) records the same
reading held for all sixteen: *"a planted twin of Pierre — 16.6% of the
pooled mention count — read idle 16/16 times."*

The cause was contamination, not a weak test. `weight(x, ...)` compared x
against a background built from `allOcc` — every tracked name's
occurrences POOLED, x's own included — and drew its null from that same
pool. For a well-attested name this is circular: the pool a large-share
node is compared against, and the pool its null is drawn from, are each
partly ITSELF, so the null resembles x by construction and "carries
weight" grows *harder* to earn exactly for the best-attested names —
backwards. A sixteen-node synthetic control (built earlier the same
session, each node an even ~6.25% share) never had the power to surface
this: no node in it was ever large enough to contaminate its own
comparison.

## The fix

`weight(x, hop, drop, rng)` now excludes x's own occurrences from both
sides of the comparison: `pool = allOcc.filter(o => !own.has(o))`, and the
background it departs from, and the null it is ranked against, are both
built from `pool` alone (`kernel/identity-induction.js:225-238`). This is
test 4's own already-standing convention — `others = nodes.filter(n => n
!== a && n !== b)` — carried one register over to test 3.

## The result, this same run repeated after the fix

Idle twins fell from 16/16 to 5/16 — `Bezukhov`, `Andrew`, `Bolkonski`,
`Countess Mary`, `Bonaparte`, every one of them a genuinely small-share
name (72–222 raw mentions against Pierre's 1,963) where "not enough weight
to confirm" is now a real reading rather than the contamination artifact.
The eleven names the fix moved past idle include the two the diagnosis
named directly: Natasha (10.3% share) and Pierre (16.6% share) both now
CARRY weight on their own twin — confirming test 3 no longer penalizes the
best-attested names for being well-attested.

```
split (twin) idle, before:  16/16
split (twin) idle, after:    5/16   (Bezukhov, Andrew, Bolkonski, Countess Mary, Bonaparte)
```

None of the sixteen twins, nor any of the eighteen declared pairs, reaches
BOUND in this run — moving past test 3 does not move past test 5
(`dynamics`, the trajectory/order test), which is where all eleven
now-carrying twins, and all four declared-same pairs, are refused instead
(`reason: "no_dynamics"` — the per-window rank could not be computed for
one or both names, `ra`/`rb` null). This is a SEPARATE, undiagnosed gap:
whether it is a genuine density problem (a `#twin` built from half a name's
occurrences, spread across forty windows, can leave several windows
empty), or a defect in how `Pierre` and `Bezukhov` — two DIFFERENT spelled
names for one referent — distribute across the book's own windows even at
full mention count, is not established here. It is named, not chased,
because it is a different test than the one this pass diagnosed and fixed,
and closing it needs its own live run and its own root cause the way this
one got.

```json
{"split":{"unbound":16},"shuffle":{"unbound":66},
 "declaredSame":{"unbound":4},"declaredDifferent":{"unbound":12},
 "dynamicsAlone":{"split":{"unbound":11,"null":5},
                  "declaredSame":{"unbound":4},"declaredDifferent":{"unbound":12}}}
```

The shuffle control (which name owns which mention redealt — correctly
never BOUND) reads 66/66 unbound, as it must: the fix widens what test 3
can confirm, never what it will fabricate. The twelve declared-different
pairs stay unbound throughout, in every configuration, as they must.

## Regression

The full 70-case pre-existing identity-family test suite passes unchanged.
A new regression (`tests/identity-induction.test.js`) pins the fix directly:
a dominant node (~93% share by construction, `ownProb: 0.1` — weakly
distinctive, the shape most likely to fail on the pre-fix null) is
confirmed to FAIL `carries` on the unpatched code (verified via `git
stash`) and PASS on the patched code. The full native suite
(`conformance/*.test.mjs tests/*.test.js`) was re-run in full afterward:
same 42 pre-existing failures, by name, before and after — zero
regressions anywhere in the suite from this change.

## Reproduction

```
node eval/identity/mention-eval.mjs \
  ../../live_priors/11-multi-language/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt \
  eval/identity/results/mention-eval-fixed.json
```

Frame: `{draws:200, alpha:0.05, seed:7, minOccurrences:20, maxHop:2,
smooth:0.5, resolution:10, minFeatureCount:2, trajectory:{windows:40,
basis:24, draws:60}}` — every number declared, none defaulted (P9, P4).
