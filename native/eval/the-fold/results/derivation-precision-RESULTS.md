# Did the chemistry actually help? Measured (2026-08-28)

Driver: `eval/derivation-precision.mjs` (re-runnable, fully offline; writes
`eval/results/derivation-precision.json`). Prompted by a direct challenge —
*"prove if this actually helped"* — against P60, which measured that the
mechanism RUNS and never measured whether it HELPS.

**What P60 established, and what it did not.** It established that the circuit
derives 9 never-stated facts with provenance to real byte addresses. It never
checked whether those 9 facts are **true**, and it never measured whether the
licensing gate **prevents** anything — the gate's value was asserted from the
Senate counterexamples, never from an outcome. It also never ran the obvious
control: would a naive transitive join find the same facts with none of the
apparatus?

## The oracle, and why it is independent

The derivation reads P1365 (`replaces`) / P1366 (`replaced by`) qualifiers.
The oracle reads P580 (`start time`) / P582 (`end time`), committed as
`eval/fixtures/succession-terms.json` with its giver and retrieval date.
**Different properties — the oracle cannot agree with the derivation by
construction**, and the whole run reproduces with no network.

A claim *"X held O after Y"* scores TRUE when some term of X begins at or after
some term of Y ends; FALSE when every term of X begins strictly before every
term of Y ends; UNVERIFIABLE when either side has no dated term in O. The TRUE
reading is deliberately generous for multi-term holders — a person really can
hold an office both before and after someone else — so **a FALSE is a hard,
unambiguous conviction**.

## Four arms

| arm | derived | true | false | unverifiable | precision on decided |
|---|---|---|---|---|---|
| **A** shipped (office gate) | 9 | 5 | **0** | 4 | **1.000** |
| **B** gate removed | 26 | 20 | 2 | 4 | 0.909 |
| **C** naive join, zero apparatus | 23 | 16 | 3 | 4 | 0.842 |
| **D** per-bridge gate (P60's disclosed future work) | 10 | 6 | **0** | 4 | **1.000** |

Every false fact in every arm sits in **one office, Q4416090** — precisely the
office the gate refused. The convictions are unambiguous on the raw dates:
Amos Nourse held that seat Jan–Mar 1857 and Lot M. Morrill from 1861 onward, so
*"Nourse after Morrill"* is backwards; David T. Patterson held it 1866–1869 and
Parson Brownlow 1869–1875, so *"Patterson after Brownlow"* is backwards. The
naive join additionally emits *"Amos Nourse after Amos Nourse"* — a self-loop.

## The two findings

**1. The veto helps, and it is the part that helps.** Precision 0.842 → 1.000
against the no-apparatus control; all three false facts eliminated, including
the self-loop. This is a real, measured outcome, not the assertion P60 shipped.

**2. The chemistry adds no derivation power at all.** `chemistryFoundThatNaiveMissed: 0`
— the naive 2-hop closure finds **every** fact the licensed chemistry finds,
plus 14 more. The apparatus is a **filter, not a generator**. Its contribution is
refusal and provenance; the *deriving* is a 20-line transitive join. P60's
framing ("the physics and chemistry of the cube", a reaction front propagating)
described the mechanism accurately and oversold what the mechanism BUYS.

## The cost, now priced instead of named

The office gate suppressed 17 facts: **2 false and 15 true**. All 17 in the one
refused office. The refusal is office-scoped, so a single multi-tenure holder
(Hamlin) forfeits every composition in that office — including true facts about
people who held it exactly once. **7.5 true facts destroyed per false fact
prevented.**

P60 named "the finer per-bridge gate" as future work. Arm D builds it — refuse a
composition whose *bridge* is multi-tenure, measured from the material's own
edges, never from the oracle. It holds precision at 1.000 and recovers **1** of
the 15 lost true facts. So the disclosed future work is directionally right and
**is not the fix**: most of those 15 genuinely pass through a multi-tenure
bridge and are true anyway, because the specific tenures happen to line up — and
no material-internal test can see that.

**What would actually fix it is not a cleverer gate.** It is admitting term
DATES as material. The oracle settles every one of these cases in one
comparison; the derivation cannot, because it only ever received adjacency. The
honest next step is ingesting P580/P582 as edges, not another veto.

## Disclosed

- 4 facts are UNVERIFIABLE in every arm (the holder has no dated term for that
  office in Wikidata). They are counted apart and never scored as either.
- One office, one material, 25 admitted facts. These are ratios on a small
  fixture, not rates.
- The oracle is Wikidata scoring Wikidata, on different properties. It is
  independent of the derivation, not of the source.

---

## Amended same day — two more arms, and this document's conclusion corrected

The driver gained arms **E** (tenure-scoped material, `<person>#<office>#<start>`)
and **E'** (identical, tenures named by statement index instead of start date).

| arm | derived | true | false | precision |
|---|---|---|---|---|
| E tenure-scoped material | 9 | 5 | **0** | **1.000** |
| E' tenure by statement index (no dates) | 9 | 5 | **0** | **1.000** |

Two things follow, and the second corrects this document.

**Soundness without a veto.** Arm E reaches 1.000 with **no office gate at
all** — the refusal becomes unnecessary once the material individuates finely
enough. That is the right shape.

**But "admit term dates" was the wrong name for it.** E and E' produce an
identical fact set (`datesOnlyNameTenures: true`), so the start dates
contributed an *identifier* and nothing else. What does the work is **occurrence
identity**. Worse, `person#office#start` is politics-shaped — it hardcodes
"someone holds an office for a term."

Both points are pursued in `grain-refinement-RESULTS.md`, which states the rule
without a domain in it (a uniqueness violation is evidence the endpoint grain is
too coarse) and demonstrates a 68-line domain-free core running unmodified over
this material and an invented non-political corpus, reaching 1.000 precision on
both.

**One number here is also superseded.** The "15 true facts destroyed" figure was
measured against material of 3 pages and 25 facts. Reading 23 pages raises
entity-grain derivation to 101 facts with 31 verified true — so the recall
ceiling was set by how little had been read, not only by the gate.
