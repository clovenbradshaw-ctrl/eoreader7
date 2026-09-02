# The sequence type's admission gate — measured, failed once, earned (2026-08-28)

Driver: `eval/sequence-admission.mjs` (offline, re-runnable; writes
`sequence-admission.json`). The bar, set by direct user instruction before any
of this ran: *"this needs to demonstrably improve retrieval and reasoning
before admission"* — *"and prediction."* So the type was built as a prototype,
measured against the shipped apparatus on the committed fixtures with
predictions declared first, and promoted to `eoreader7/native/kernel/sequence.js`
only on the verdict below. P60's own lesson, applied prospectively rather than
retrospectively for once.

## What was measured, against what

One declaration serves both corpora — the real Wikidata succession tenures and
the invented hospital-bed control — because the domain difference is field
values, never module behaviour:

```
declareSequence({ relation, locus, occupant, position, predecessor, successor,
                  orderedBy, until, giver })
```

Order keys are OPAQUE (compared, never parsed — the module contains no date
arithmetic, scanned mechanically). Positions carry the locus in their identity,
so cross-locus composition is impossible with the kernel unchanged — which
retired the planned `chainOf` modification the blast-radius audit had priced
as this plan's riskiest step.

## M1 — retrieval

| | queries | uniquely correct | conflated | wrong |
|---|---|---|---|---|
| flat person-grain (shipped shape) | 47 | 40 | **7** | — |
| sequence, position grain | 47 | **47** | 0 | **0** |

Every conflation is a multi-standing holder — the entities that matter most
are exactly where the flat shape fails. At-time coverage (100 standings
answerable vs 0) is reported as coverage only: scoring it would be circular,
and the driver says so rather than claiming it.

## M2 — reasoning

| arm | derived | oracle-true | false | precision | depth |
|---|---|---|---|---|---|
| A shipped (office gate) | 9 | 5 | 0 | 1.000 | 2 |
| B/F (no gate / interval gate) | 26 | 20 | 2 | 0.909 | 2 |
| **sequence closure** | **95** | **31** | **0** | **1.000** | **6** |

No office gate, no `intervalOf`, four affordance rows instead of 24 — and it
**strictly dominates the frontier no shipped arm could**: better recall than
B/F at better precision than B/F, better precision than nothing and better
recall than everything. The recall comes from **continuity edges** (48 of 118)
— same occupant, same locus, strictly abutting standings — which exist only
because dates are material: the middle terms of a long tenure carry no
pointers at all, and continuity is what keeps the line whole across them.
The control corpus holds 5/5 at 1.000 with its declared trap absent.

## M3 — prediction, where the pre-registration FAILED

Leave-one-out: every statement of a fact removed (both directions, all
records), then predict the missing neighbour.

| arm | recovered | wrong | refused | ceiling |
|---|---|---|---|---|
| pre-registered (as declared) | 8 | **3** | 59 | 12 |
| with `refuteLocus` | **7** | **0** | 63 | 7 |
| flat baseline | 0 | — | — | structural zero |

**The pre-registered arm failed, and the failure is kept verbatim.** All three
wrong guesses sit in Q4416090 — "United States senator", **one locus name for
a hundred concurrent seats**. Hamlin and Q358277 both hold 1851-03-04 →
1853-03-04 *simultaneously* in the raw fixture; the March-4 turnover
synchronizes boundaries across seats; strict abutment crossed into a parallel
seat and named the wrong occupant.

That is not a harness bug — it is the module's own declared algebra
(`functionalPerPosition`) being violated by the declaration, with the corpus
holding the positive counterexample and **nothing checking**. The
comment-not-a-wall shape, again. `refuteLocus` is the wall that failure
earned: concurrent standings of different occupants refute the locus as a
POOL; prediction refuses there (`locus_refuted`); one correct-by-luck house
recovery was returned along with the three wrong ones. Refuted from the data:
senate, house, and one more pooled office — none declared by hand.

**Two disclosures on the amended arm, so nobody over-reads it.** First,
`recovered == ceiling` there is close to definitional (both compute unique
unrefuted abutment); the arm's *empirical* content is zero wrong predictions
and recovery a structural-zero baseline cannot reach, plus 5/5 on the fully
dated control. Second, the pre-registered ceiling itself was sloppier than
the affordance (it never required uniqueness) — a defect of the
pre-registration, disclosed rather than papered over.

## The verdict

```
gates: M1 ✓   M2 ✓   M3_asPreRegistered ✗ (kept)   M3_withLocusRefutation ✓
admitted: true
```

Admission rides the amended arm and says so: the failure produced a refutation
organ the algebra had promised and lacked — completing a declared commitment,
never tuning a threshold toward a pass.

## What this replaces, and what it retires

The four patches this type subsumes, each of which was rebuilding a fragment
of the same missing thing: `replaces:<office>` (the locus in the relation
name; 24 affordance rows → 4), `intervalOf` (the order witness out of band),
`person#office#start` (position identity reconstructed), and interval-aware
cycles (the same dimension, hit twice). The planned kernel `chainOf`
constraint + role propagation is **retired unbuilt** — locus-in-identity makes
it unnecessary for this type, which the admission run demonstrated rather than
argued.

## Disclosed residues

- Same-occupant continuity could bridge two parallel seats of a pooled locus
  if one occupant switched seats with abutting dates — unobserved in this
  material, named rather than waited for.
- An occupant with no records gets ONE implied standing (chains through it
  survive); if it truly held the sequence twice, its neighbours are conflated
  exactly as person grain conflated everything. Carried as `impliedRisk` on
  every result.
- The three shipped drivers (`derivation-precision`, `grain-refinement`,
  `mechanical-reasoning`) still use the `replaces:<office>` encoding. They are
  the *record* of the measurements that got here and are left byte-stable;
  new work should declare a sequence instead.
