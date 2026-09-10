# Hard logic battery (2026-09-10)

Five cases chosen to find real gaps, not confirm easy wins. Run against
the actual production machinery (`notes.js`, `hyperlexicon.js`,
`derivation.js`, `reaction.js`, `refutation.js`, `regime.js`) — no
fixtures faked, no toy reimplementations. `hard-logic-battery.mjs`.

## Results

| case | what it tests | result |
|---|---|---|
| TC-A: lex specialis | a general obligation vs. a matching specific exception | **CONFIRMED GAP** |
| TC-B: lex posterior | two co-valid claims, one enacted later | **CONFIRMED GAP** |
| TC-C: contested link mid-chain | build on disputed ground, cascade on concession | **PASS** (real machinery) |
| TC-D: lawful reuse vs. real violation | uniqueness + time-interval reasoning | **PASS** |
| TC-E: modus tollens | propositional inference the algebra can't do | **PASS** (correctly refuses) |

## TC-A and TC-B: two real, related gaps in `precedence()`

Both are legal-reasoning principles this codebase's own `force`/
`entrenchment` rules don't capture, and both were predicted before
running (not discovered by accident):

**Lex specialis** — a general prohibition (O-force) and a matching
specific exception (P-force) were run through `precedence()`. Result:
the general rule wins, every time, because `force` compares O > default
> P unconditionally. A real reader wants the *specific* rule to win when
its conditions are actually met ("no parking" / "except residents on
Sundays") — but nothing in the four-field tag encodes *specificity* or
*scope subsumption* at all. The fix isn't a bigger force table; it's a
genuinely new axis — "does claim A's declared scope contain claim B's" —
that would need to run *before* the force step, not instead of it.

**Lex posterior** — two claims, identical force, identical grain, both
validly in scope right now, differing only in when they were enacted.
`precedence()` correctly reports `tied` rather than guessing — which is
honest, but also confirms the gap: the four-field tag has a *validity
window* (from/until — when a claim applies) but no separate *enactment
timestamp* (when it was made), so "the newer one supersedes" has no field
to read. These are different facts about a claim and the current tag
conflates the concept of "in scope" with "comes into effect and
persists," never a wall-clock enactment date used purely for ranking
conflicting in-scope claims against each other.

Both are named, not fixed here — deepening either is real, scoped work
(matching this codebase's own "don't deepen a branch pre-emptively" rule
from the seed document that motivated `regime.js`).

## TC-C: the deliberate "build on contested ground" design, proven live

This is the strongest result in the batch because it runs the REAL
ledger end to end, not a simplified stand-in. A four-node chain
(`a precedes b precedes c precedes d`) was heard onto a real
`hl.createHyperlexicon()` log; `precedes` was declared to compose into
`eventually_precedes`; the middle link (`b precedes c`) was disputed by
a second source.

**Before any concession**: `derive()` still composed `a —eventually_precedes→ d`
straight through the disputed link — confirming `derivation.js`'s own
documented design (the finding that shaped the earlier `is_settled`
scoping decision this session): a contested note is not refused as a
premise, it enters composition carrying its dispute, with the derived
fact's `restsOn` correctly recording `contested: 1`.

**After settling the dispute against the note and conceding it**: the
SAME `derive()` call on the updated log no longer produces
`a —eventually_precedes→ d` at all — the cascade (`withdrawDerived`'s own
mechanism) correctly took the derived product down with the premise it
rested on. This is the falling machinery this repo built and named
(`exposure`/`withdrawDerived`/P86-P97-era work) actually observed working
on a hand-built specimen, not merely read about.

## TC-D: interval-aware uniqueness, confirmed through the new gate

Two synthetic cases: the same person holding one office across two
disjoint terms (lawful re-election) vs. the same person holding two
different offices during an overlapping period (a genuine incompatibility).
Run through `refutedAffordances` (built earlier today) with `intervalOf`
threaded through — the lawful case survives (`refuteRelation`'s own
`overlapEvidence` correctly excuses non-overlapping reuse), the violating
case is refused with `reasons: ["interval-overlap"]`. Confirms the
interval-aware refutation logic this codebase already had is reachable
through the new forced gate, not just through the older, unguarded path.

## TC-E: the honesty test — correctly refuses to fake reasoning it can't do

Modus tollens ("if A then B; not B; therefore not A") is propositional —
it needs a negation operator over whole implications. `reaction.js`'s
algebra composes *relations between referents*; declaring "implies"
transitive only gives forward chaining (A implies B, B implies C,
therefore A implies C), which is a different inference entirely and not
what modus tollens needs. There is no declared affordance shape anywhere
in this system that could produce "not A" from these premises. Confirmed
as a correctly out-of-scope case — the point of testing it wasn't to see
if the system could do it, but to confirm nothing here would fake an
answer if asked to.

## What this changes about the standing recommendation

`mechanical-logic-battery-RESULTS.md`'s five-case battery (transitive
chains, closure, cycles, undeclared relations) proved the CORE mechanism
sound. This battery proves two additional things: the mechanism handles
a real end-to-end contested-premise lifecycle correctly (TC-C, TC-D), and
it has two specific, named, not-yet-built gaps for real legal/ordinance
reasoning (lex specialis, lex posterior) that are exactly the kind of
"pick one branch, based on which the real corpus is actually breaking on"
work the reasoning-seed document itself called out as the right next
step — not attempted blind here.
