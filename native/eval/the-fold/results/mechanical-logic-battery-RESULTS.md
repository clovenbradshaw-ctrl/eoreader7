# Mechanical logic battery — five more shapes (2026-09-10)

Follow-up to `mechanical-reasoning-scope-RESULTS.md`'s single proof of
concept, per direct request: "test this with other logic tasks."
`mechanical-logic-battery.mjs` — five cases, each a different SHAPE of
the underlying algebra (not just a harder instance of the same shape),
run against eoreader7's real `reaction.js`/`refutation.js`/
`hyperlexicon.js`. Zero model calls anywhere. All five pass.

## Results

| case | shape | result |
|---|---|---|
| TC1 | 2-hop transitive (baseline, re-run) | PASS — `alice —older_than→ carol` |
| TC2 | 4-hop transitive chain | PASS — full `monday —before→ friday` span derived, quiescent in 3 steps |
| TC3 | non-transitive adjacency closing into a DIFFERENT relation | PASS — `reign4 —eventually_follows→ reign1`, never wrongly labeled `immediately_follows` |
| TC4 | a cycle in the premises | PASS — `refuteRelation` catches it (`refuted: true`, `reasons: ["cycle"]`, `power: "sufficient"`) |
| TC5 | an undeclared relation | PASS — correctly returns `derived: []` and a typed `withheld` entry, never guesses `alice parent_of carol` |

## TC2 — depth alone doesn't break anything

A 4-hop chain (`monday < tuesday < wednesday < thursday < friday`)
derives all 6 possible spans (every pair, not just the adjacent ones —
`monday→wednesday`, `monday→thursday`, `monday→friday`, `tuesday→
thursday`, etc.) and reaches quiescence in 3 reaction passes. `settle()`
handles arbitrary chain depth without any change to how it's called —
the mechanism scales with premise count, not with a hand-written
recursion depth.

## TC3 — the case reaction.js's own header specifically warns about

This is the one this codebase's own comments call out by name: composing
"immediately follows" with itself does NOT mean "immediately follows" is
transitive — reign4 does not immediately follow reign1, it EVENTUALLY
follows it. Declaring the wrong composition law here (`transitive`
instead of `closureAffordances`'s four-row `composes` table) would be a
real, subtle error a naive implementation could make silently. The
mechanism gets it right by construction: `closureAffordances({base:
"immediately_follows", yields: "eventually_follows", ...})` produces the
four legal composition rows, and the derived facts land under the NEW
relation name, never the base one.

## TC4 — the important negative result

Running `refuteRelation` on the cyclic premise set (`alice > bob > carol
> alice`) correctly catches it: `refuted: true`, reason `cycle`. But the
driver also shows what happens WITHOUT that check: the reaction step has
**no built-in notion of "this is contradictory"** — `step()`/`settle()`
answer "what composes," not "is this sound." Left unchecked, the same
cyclic premises derive a fully circular belief set: `alice —older_than→
carol`, `bob —older_than→ alice`, `carol —older_than→ bob` — every pair
now "older than" every other pair, a nonsense total order with no
foundation.

**This is the one finding from this battery that changes the design.**
`mechanical-reasoning-scope-RESULTS.md` described refutation as a
downstream check ("checked the same way a mechanically-derived
succession chain already is"). This result shows it has to be closer to
upstream than that: **a relation's premises should be refuted BEFORE
composition runs against them, or at minimum before any derived fact
from that relation is trusted** — composition itself is happy to build
on a contradiction. `reaction.js`'s own `settle({veto})` parameter exists
for exactly this (it takes `refutation.js::vetoedPairs`'s output and
refuses to compose across a vetoed PAIR of relations) — but that vetoes
a *composition rule*, not a relation whose own raw premises are already
inconsistent. Closing that gap for real — refusing to even attempt
composition over a relation that fails its own cycle/uniqueness check —
is a small, concrete next step, not yet built here.

## TC5 — confirms the honest-refusal behavior generalizes

No declaration at all for `parent_of` (a real relation that genuinely
isn't transitive — a parent's parent is a grandparent, not a parent).
`settle()` returns zero derived facts and a typed `withheld` entry
naming the pair and its standing (`"unknown"`). This is the same
behavior `mechanical-reasoning-scope-RESULTS.md` predicted from reading
the code; this confirms it holds in practice, not just in the one
declared-relation case already proven.

## What this battery adds to the standing recommendation

Unchanged: premises as EOT edges, a declared composition law, the kernel
derives — model never judges the composed answer. **Added, concretely:**
a real wiring must run `refuteRelation` over a relation's own accumulated
premises and treat a `refuted: true` result as a hard stop on composing
THAT relation further, not merely as a fact to disclose after the fact.
TC4 is the proof that skipping this step doesn't fail loudly — it fails
by confidently producing a self-contradictory answer, which is worse
than the mechanism simply not knowing.

## The gate, forced (same day, on direct instruction: "let's force it to run")

`kernel/reaction.js` gained `refutedAffordances(fold, entries, options)`
— `affordancesFromDeclarations` wrapped so that a GIVEN declaration is
only ever converted into chemistry for a relation `refuteRelation` has
examined and NOT refuted, reusing `refutation.js`'s own `afterVeto`
rather than a second veto implementation. There is no path from a
declaration to composed chemistry that skips the check — a caller does
not need to remember to call `refuteRelation` first, because
`refutedAffordances` calls it internally, always.

Re-run against TC4's identical cyclic premises: `survivors: []`,
`vetoed: [{key: "older_than", reasons: ["cycle"]}]`, and the guarded
substrate now derives **nothing** — where the unguarded path (kept in
the driver, side by side, as the regression this exists to prevent)
still derives the circular `alice/bob/carol` mess. An under-examined
relation (fewer than two resolved edges — refutation has no positive
counterexample to find yet) still survives, matching
`refutation.js`'s own stated asymmetry: absence of a refusal is not a
check, but it is also not itself a refutation.

**Files.** `kernel/reaction.js` (`refutedAffordances`, new, imports
`refuteRelation`/`afterVeto` from `refutation.js` — no circular
dependency, checked). `tests/reaction.test.js` (3 new cases: a cyclic
relation's declaration dropped before composition; a clean relation
composes identically to the unguarded path; an under-examined relation
survives). Full suite: 1261 tests, 1259 passing, 1 pre-existing failure
(`spans-frontmatter.test.js`, missing corpus fixtures, confirmed via
`git stash` to fail identically with or without this change) — zero
regressions.
