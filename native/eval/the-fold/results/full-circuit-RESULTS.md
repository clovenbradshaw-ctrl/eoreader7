# The full circuit — three ways of knowing in relay, measured (2026-09-02)

*Driver: `eval/full-circuit.mjs`, re-runnable, deterministic (every arm
seeded). Answers the direct question "does our core mechanism do all
three?" — the honest answer being no, no single mechanism does, on
purpose — by upgrading "the pieces compose" to "the circuit is measured":
one material, all three ways in relay, every handoff's refusal exercised
and reported.*

## The material

A relay of handovers a→b→c→d→e recorded twice (two sources) and read by
two instruments, with noise tokens between handovers and ONE planted
cycle-closer (e→a) in source-1 only. Ground truth by construction: `a
precedes c` is TRUE and never stated; `e precedes a` is planted,
uncorroborated, and would make the relation cyclic at composition.

## Nine walls, all held

| # | handoff | way of knowing | what held |
|---|---|---|---|
| 1 | discovery | perturbation | `e←d` beats the search-aware ceiling (0.500), corroborated 2 sources × 2 instruments; control passed |
| 1' | noise arm | apophasis | pure noise: 0 findings — a measured absence, seeded |
| 2 | arrangements | ostension | 1,020 event-ordinal spans self-verified at the cut; every note addressed |
| 3 | corroboration | triangulation | the planted e→a (1 source) is STOPPED; the 4 real handovers proceed |
| 4 | acquisition | refutation | `precedes` becomes a functional CANDIDATE over the corroborated edges; nothing is GIVEN |
| 5 | no-license control | (construction, denied) | with no declaration the chemistry derives **0** — construction cannot self-license |
| 5' | declaration | testimony | a NAMED giver promotes the candidate; the license carries the name |
| 6 | composition | construction | **6 never-stated facts derived** (a before c, a before e at depth 2 via 3 paths…), each walking to real addresses; no self-loop |
| 7 | veto (clean) | refutation | raw+derived audited: 0 refutations |
| 7' | veto (leaky) | refutation | the control arm that SKIPS wall 3 lets e→a through: pre-audit refutes 3, post-audit 3, **derived 0** — the cycle is caught by the second wall |

## Three findings the run paid for

**1. Kinds and arrangements answer different questions, and a relay
needs both.** Discovery found only `e←d`, and that is correct: a KIND asks
"what always precedes X", and every MIDDLE station in a relay both
receives (preceded by its predecessor) and hands over (phrase-initial,
preceded by noise), so b/c/d sit at share exactly 0.50 — split company —
and cannot beat a 0.50 ceiling. The ARRANGEMENT a→b is still 100%
recurrent at floor 2. The first draft's wall asserted "≥3 chain kinds"
and was wrong about the material, not the organ.

**2. Polarity is a declaration on a non-text edge.** The acquisition scan
gates on `polarity === "+"` and silently skipped every arrangement-derived
edge on the first run (they carried none). A handover stream has nothing
that could say "a did NOT precede b", so the adapter DECLARES positive
polarity by construction — found by the scan's silence, not by review.

**3. Two independent walls, one corruption.** The planted e→a is stopped
by triangulation (one source) — and when triangulation is deliberately
skipped, it is stopped by refutation (the cycle it closes). Neither wall
knows about the other; the corruption cannot pass without defeating both.

## What this establishes, and what it does not

Every product of construction walks to an ostension address; every
license names its giver; every count is of independent readings; and
the separation between the three ways is enforced at every handoff — a
count never becomes a license, a license never becomes a count, a
product never escapes its provenance. What it does NOT establish is
correspondence: the relay's facts are true by construction, and a real
material would need the same circuit run against an oracle (P60's own
derivation-precision posture) before any derived fact is reported as
more than coherent.
