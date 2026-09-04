# "Contradicted" is not one thing — and the n=2 blanket covers a category that is empty here (2026-09-04)

`node native/eval/the-fold/contradiction-kinds.mjs`. **Zero model calls.**

User, over a 3×3×3 periodic table of truth claims: *"'contradicted' isn't one
thing."*

`corroboration.js` never lands a `contradicts` verdict, and its stated reason
is that at n=2 a states/contradicts pair is **undecidable by construction** —
nothing says which of the two sources is wrong. That reason is sound for **one
kind** of contradiction. It is currently a blanket over several, and the
others do not need a third source at all.

## The kinds, and what each actually needs

| kind | what it is | decidable at | the lever |
|---|---|---|---|
| **individuation** | one referent standing for two things — one person's two tenures, two different Smiths | **n=1** | split the referent |
| **provenance** | one text reaching the ledger by two refs | **n=1** | count one witness (`sharedTextGroups`) |
| **force** | one claim describes, the other prescribes or constitutes | **n=1** | not a contradiction; an *ought* does not contradict an *is* |
| **grain** | one about a Figure, one about a Pattern | **n=1** | not a contradiction |
| **contest** | same referents, same grain, same force, real disagreement | **n=3** | seek a third source |

Only the last row is what the n=2 argument is about.

## Measured, on the only real material with detectable contradictions

26 succession assertions; 2 apparent contradictions (A→B and B→A within one
office). Both:

```
office Q4416090
  Q273546 replaces Q474290    tenure 1857-03-04 .. 1859-03-04   (Q273546.json)
  Q474290 replaces Q273546    tenure 1855-03-04 .. 1857-01-07   (Q273546.json)
```

| kind | count |
|---|---|
| individuation | **2** |
| contest | **0** |

**Needing a third source: 0 of 2.** Both are one person (Hannibal Hamlin)
holding one office across **disjoint tenures**, merged by a person-level
projection — and both sides come from the **same file**. It is not two sources
disagreeing. It is one source correctly stating two different facts, which the
reader fused into a self-contradiction.

This is the same defect `derivation-precision.mjs` already names from the
other end (*"the person-level projection threw the tenure away … naming each
tenure dissolves it"*). What is new is the framing: it is not a one-off bug,
it is a **kind of contradiction**, and it is the kind the material can settle
by itself.

**The practical cost of not typing:** `thirdSourceCandidates` would be sent
after both of these. No third source can settle them, because nothing is in
dispute. Every call spent is spent on a question with no answer.

## The control does not separate, and that narrows the claim

Redealing objects within each office (marginals kept, succession destroyed),
20 draws:

| | real | redealt median (range) |
|---|---|---|
| apparent contradictions | 2 | 1 (0–2) |
| typed `individuation` | 2 | 1 (0–2) |

**The test types redealt noise as individuation too**, because "these two
statements are about different tenures" is true of a fabricated adjacency as
well — the redeal keeps each person's tenure dates. So this driver **cannot**
tell an individuation error from a fabricated adjacency, and the claim
"individuation detected" is not earned.

**What is earned is the routing decision**, which is the one the walk actually
has to make: *is a third source the lever here?* For both real pairs the
answer is no, and it is no for the redealt pairs as well — those need the
adjacency refuted, which the veto already does. Typing does not convict; it
says which mechanism to reach for.

## What this argues for

The previous pass found that a contradiction never lands on the record and so
can never reach the cascade, and named the fix: a contest must be a durable
object. This adds the missing half — **that object must carry its KIND.** An
untyped contest routes to the third-source seeker by default, which is right
for one kind and wasted on every other.

## Said against it

- **26 assertions, 2 contradictions, one relation, one domain.** Tiny.
- Only `individuation` is implemented. `force`, `grain` and `provenance` are
  named in the vocabulary and **refused rather than guessed** — the driver
  reports `untyped` and says so.
- The control's failure is stated above and is not a detail: this is a routing
  aid, not a detector.
- Nothing here lands a kind on the record. It measures that kinds exist and
  differ in what they need.

## Files
`contradiction-kinds.mjs` (new), exporting `typeContradiction`.
