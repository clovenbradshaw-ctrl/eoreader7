# A uniqueness violation is a grain signal — tested across two domains (2026-08-28)

Driver: `eval/grain-refinement.mjs` (offline, re-runnable). Prompted by a direct
correction: *"be sure these edges are not politics shaped but learn anything."*
The correction was right, and the first fix this session produced was shaped.

## What was wrong with the fix I had just built

`eval/derivation-precision.mjs`'s arm E named each tenure `person#office#start`.
It works, and it hardcodes *"someone holds an office for a term."* It would go
dark on any material nobody labelled that way — which is **the same mistake
`relation-composition.js`'s own header records the kernel making once already**:

> AN ARRANGEMENT HAS ENDS, NOT PARTS OF SPEECH. These were
> `find((p) => p.role === "subject")` … composition chaining, a kernel concern,
> silently required material some adapter had labelled with Greek grammar, and
> went dark on everything else — not because the structure was absent but
> because nobody wrote "subject" on it.

Greek grammar the first time, a political role schema the second.

## The general rule, with no domain in it

> An edge relates **occurrences** — the episodes its ends actually belong to —
> not the durable entities those episodes belong to. When a relation the
> material presents as one-to-one is violated at entity grain, that is evidence
> **the grain is too coarse**, not evidence the relation is unsound. Refine to
> the material's own occurrence identity and re-scan. If the violation
> dissolves, the grain was the defect.

This also reframes P60's veto: the uniqueness violation was pointing at a
fixable modelling error, and P60 read it as a permanent property of the
material.

## The core is domain-free, checked rather than claimed

The core (`edgeAt` / `scanAt` / `deriveAt` / `refineGrain`) is **68 lines
containing zero occurrences of** person, office, tenure, patient, bed, occupant,
slot, succession, politic, senate, president, vice, or wikidata — asserted by a
scan in this driver's own run, not by eye. Every domain word lives in the
adapters, which is the correct dependency direction (spec ← kernel ← adapters).

## Two adapters, one unmodified core

| adapter | grain | derived | true | false | unver. | precision |
|---|---|---|---|---|---|---|
| Wikidata succession (real, political) | entity | 101 | 31 | 2 | 68 | 0.939 |
| | **occurrence** | 49 | 12 | **0** | 37 | **1.000** |
| Hospital-bed occupancy (invented, non-political) | entity | 9 | 8 | 1 | 0 | 0.889 |
| | **occurrence** | 5 | 5 | **0** | 0 | **1.000** |

**The non-political control carried a trap declared in the fixture before the
run.** `occupancy-synthetic.json`'s own `groundTruth` states that Ada occupies
BED-7 in two non-contiguous episodes, so person-grain composition should yield
*"Brix after Chen"* — backwards, since Brix left on Jan 19 and Chen did not
leave until Feb 2. That is **exactly** the single false fact at entity grain,
and it is gone at occurrence grain. Predicted, then observed.

**Precision reaches 1.000 in both domains with no veto anywhere** — soundness
from the material being finer, not from refusing a relation.

## The grain signal distinguishes two cases, and says which

- Synthetic BED-7: **"GRAIN DEFECT — the violation dissolves when ends are
  occurrences."** The corpus is complete, so refinement fully individuates.
- Real Wikidata (3 relations): **"real — the violation survives refinement."**
  The material is partial: many counterpart mentions cannot be bound to an
  occurrence (no dated boundary, or that entity's page was never read), so
  those ends stay coarse and some conflation remains. Refinement still removes
  every false fact, but it does not fully dissolve the violation.

That difference is reported, not assumed — and it is the honest reason the same
mechanism reads differently on complete and partial material.

## What this corrects in my own previous amendment

The prior amendment concluded *"the fix is admitting term DATES as material."*
That is not right either, and the same driver shows why: naming occurrences by
**statement index** instead of by start date reproduces an identical fact set
(`datesOnlyNameTenures: true` in `derivation-precision.json`), and the synthetic
adapter names occurrences by episode boundary with no dates in the identifier at
all. **Dates were one adapter's way of naming occurrences.** What does the work
is occurrence identity; the dates are incidental to it.

## Disclosed

- The Wikidata oracle scores only the 23 entities whose pages were read, so 68
  of 101 entity-grain facts are UNVERIFIABLE and precision is reported on
  decided facts only. Recall across grains is not comparable while that many
  facts are unscored.
- Occurrence grain derives fewer facts than entity grain in both domains. Some
  of that loss is correct (unsound compositions refused); some is material the
  adapter could not bind. These are not separated here.
- The synthetic corpus is invented for this test and deliberately small. It
  proves the core needs no edit across domains; it is not a rate.
