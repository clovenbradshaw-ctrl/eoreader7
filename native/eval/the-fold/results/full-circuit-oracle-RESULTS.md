# The full circuit against an independent oracle — real Wikidata, 2026-09-02

*Driver: `eval/full-circuit-oracle.mjs`, re-runnable, deterministic. The
measurement `full-circuit.mjs` said it could not make: CORRESPONDENCE,
not coherence. Material: 23 real Wikidata entities, 28 succession edges
(P1365/P1366). Oracle: the same entities' P580/P582 term dates —
different properties, so the judge cannot leak into the derivation.*

## What this material gave triangulation — for real

A succession edge X←Y is witnessed by **X's own record** (P1365
"replaces Y") and by **Y's own record** (P1366 "replaced by X"): two
SOURCES through two INSTRUMENTS — same scope, different rule, the
spatial run's law by construction. 22 of 28 edges corroborate; 6 are
single-witness. And a corroborated edge resolves IDENTITY AT TENURE
GRAIN for free: the mutual match names which of Y's tenures X succeeded
— exactly the grain P60's fourth amendment showed a one-to-one relation
needs (a nine-time senator is nine occurrences, not one entity).

## The arms

| arm | edges | derived | TRUE | FALSE | UNVERIFIABLE |
|---|---|---|---|---|---|
| N naive (person grain, all edges) | 28 | 11 | 7 | 0 | 4 |
| **C the circuit (tenure grain, corroborated only)** | 22 | **8** | **8** | **0** | **0** |
| R redealt, 50 seeds (the null) | ~19–22 | — | — | pooled FALSE 0.268 | — |

C's eight never-stated facts include *Ulysses S. Grant after Abraham
Lincoln* (presidency), *Schuyler Colfax after Hannibal Hamlin* and
*Andrew Johnson after John C. Breckinridge* (vice presidency), *David M.
Key after Parson Brownlow* (Senate) — each with provenance to byte
addresses in the record, none stated by any record.

## The finding that mattered: the oracle itself had to pass II.23

**First cut — FAILED.** With the person-grain verdict ("SOME term of X
begins after SOME term of Y ends" — P60's own, verbatim), a redealt
material (succession targets shuffled within each office, marginals
kept, the relation destroyed) scored precision **0.75 / 0.67** on two
seeds and, over 50 seeds, a derived fact was TRUE with **p≈0.82 under
the null**. Any two holders of one office are time-ordered, and a
multi-term holder gives "after" several chances, so the verdict is
nearly always true for a random pair. The circuit's 8/8 had p≈0.21
under that null and 4/49 shuffles matched it: **not discriminated.** A
fixed 0.6 gate in the first draft was the wrong test and was replaced by
the distribution.

This quietly undercuts P60's own precision claims (0.842 → 1.000),
which compared arms against each other on this same permissive oracle
and never asked what a shuffle would score.

**The fix — the grain lesson applied to the judge.** The circuit
composes at TENURE grain, so it can be judged there: THIS tenure of X
begins at/after THAT tenure of Y ends. The judge reads only P580/P582;
the derivation read only P1365/P1366 and tenure INDICES (E-prime's own
posture — dates never entered the derivation). Under the tenure-grain
verdict the null's TRUE rate falls to p≈0.73, and — the licensed,
run-level statistic — **0 of 49 redealt circuits produced 0 FALSE at
≥8 decided facts**, where the real circuit did. Discriminated at
α = 0.05. (The pointwise binomial, p≈0.083, assumes independent facts;
transitive products share edges, so the empirical run-level null is the
honest one. Both are reported.)

## The three ways, scored

- **Triangulation's value, measured:** the 3 facts the naive arm derives
  that the circuit does not are EXACTLY its 4 unverifiable ones —
  single-witness edges reach facts the oracle cannot judge. Corroboration
  kept the circuit inside what the oracle can see (0 unverifiable), which
  is what "independent witnesses" buys: not more facts, but facts that
  can be checked.
- **Construction's reach:** 8 never-stated, oracle-TRUE facts from 22
  corroborated edges, 0 false.
- **Perturbation's role here** was as the control on the ORACLE, and it
  caught a real defect in the judge — which is the first time in this
  project a null has been spent on the oracle rather than on the
  material. It should not be the last.

## Honest scope

23 entities is small. The discrimination is at α = 0.05 on a run-level
null of 49 draws, not a large-sample result; the naive arm's 0 FALSE
here (vs P60's 2) reflects this driver's both-ends-in-material filter,
not a change in the naive method. A larger succession corpus is the
obvious next material, and the tenure-grain verdict should be carried
back into `derivation-precision.mjs` so P60's arms are re-scored under
a judge that passes resolution.

---

## The wide run — 158 entities (same day)

*`eval/fetch-succession.mjs` crawled P1365/P1366 two hops out from the
committed 23 seeds (158 entities, 201 succession edges) into NEW fixture
files; the committed 23-entity set is untouched so P60 and the first run
stay reproducible. `MATERIAL=… ORACLE=… node eval/full-circuit-oracle.mjs`.*

| arm | edges | derived | TRUE | FALSE | UNVERIFIABLE | offices refuted |
|---|---|---|---|---|---|---|
| N naive (person grain, all edges) | 201 | 137 | 117 | 0 | 20 | 7 |
| **C the circuit (tenure grain, corroborated)** | 156 | **224** | **223** | **0** | 1 | **0** |
| R redealt, 50 seeds | 156 | — | — | pooled FALSE 0.463 | — | — |

**Resolution, now unambiguous.** Under the tenure-grain null a derived
fact is TRUE with p≈0.54 — chance, as a random pair of dated tenures
should give — and the circuit's 223/223 has p≈0 under it; **0 of 50
shuffles matched.** Discriminated, robustly, at the scale the 23-entity
run could only suggest.

**The grain result reverses P60's cost at scale.** P60 priced the
office gate at "15 true facts lost per 2 false prevented" because a
multi-tenure holder made the person-grain relation non-functional and the
whole office was refused. At tenure grain nothing is refused (7 → 0
offices), and the circuit derives **101 facts the naive arm cannot
reach** — all TRUE — while giving up 21 naive-only facts, **19 of which
the oracle cannot judge at all** (single-witness edges). Corroboration
did not cost reach; it traded unverifiable reach for verifiable reach,
and tenure grain then added reach on top.

Sample of the 223: *Henry Wilson after Andrew Johnson* (vice presidency),
*Hannibal Hamlin after John Fairfield* (Senate), *Theodore M. Pomeroy
after Galusha A. Grow* (Speaker) — none stated by any record, each with
byte-address provenance.
