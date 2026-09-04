# Should the referent index read the furniture-blanked page?

Ran 2026-09-04. **0 model calls, offline, 20 null draws per page.**
Driver: `cast-furniture.mjs`.

## The decision, not a bug

`hypergraph.js` reads `chunk.blanked` for extraction and states in its own
header that it deliberately did **not** extend that to the referent index:

> *"What the change removes is navbox EDGES, not navbox REFERENTS. Blanking
> the index's input too is a separate decision with its own cost (a name
> genuinely introduced in a caption or a list is then unknown to the reading)
> and is not taken here."*

A real benefit on one side, a real cost on the other, and no measurement of
either. This measures both.

## What was changed

`cast.js` gained `{ blanked }` on all three faces (`makeReferentIndex`,
`makeCastHandles`, `makeCastResolver`). **Opt-in; omitted, every caller is
byte-identical** — 584 pass / 0 fail / 1 todo, unchanged. The readback gate is
`hypergraph.js`'s own, reused rather than re-derived.

## The two axes, and why there are two

**Enrichment (deciding, HIGH is good).** Junk-only referents removed per real
name lost. This is what "these characters are furniture" *means*: the region
is enriched for referents that exist only there. A ratio by construction.
**Pre-registered before its numbers were seen**, after the cost axis had
already returned its answer — so it cannot have been chosen to fit a result.

**Cost per character blanked (secondary, LOW is good).** Real names destroyed
per 1000 characters. Necessary but not sufficient: a selection can be exactly
as cheap as random and still be furniture if it takes far more junk for the
same price.

**Magnitude — reported, never scored.** A first cut scored "total surfaces
changed" and read the real arm as *inside* its own null. That statistic is
wrong: a contiguous run torn out of live prose destroys whole sentences, so a
random blanking changes more by being more destructive. That is a fact about
the null, not about furniture.

The null is size-matched by construction: the same *number* of characters
blanked, placed in one contiguous run at a seeded offset elsewhere in the same
chunk, newlines preserved so segmentation is untouched.

## Result

| page | blanked | enrichment | null range | cost/1k | null | verdict |
|---|---|---|---|---|---|---|
| battle-of-borodino | 5.2% | **5.00** | 4.07–4.62 | 3.19 | 3.72 | **BEATS NULL** |
| war-and-peace | — | **6.23** | 4.65–5.64 | — | — | **BEATS NULL** |
| battle-of-austerlitz | — | 8.14 | 5.60–10.00 | — | — | inside |
| abraham-lincoln | — | 6.54 | 5.40–6.72 | 2.05 | 2.12 | inside |
| alan-turing | 4.6% | 8.83 | 5.70–8.83 | 1.15 | 1.34 | inside |
| apollo-11 | 5.5% | 2.55 | 2.38–2.87 | 5.73 | 5.86 | inside |

Totals across six pages: **716 furniture-only referents removed, 136 real
names lost, 194 gained.**

**2 of 6 pages beat their own size-matched null — on both axes,
independently.** They are the two Tolstoy pages, which are exactly where the
defect was found. The measurement confirms the finding where it was found and
**refuses to generalize it.**

## What this licenses

A **CANDIDATE**, in `declarations.js`'s own two-tier sense: unrefuted at this
stage, licensing a disclosed flag, never a conviction. Not a global rule, and
specifically not a hand-coded wall — which is what would have shipped without
the null. The grain theorem is why: *"this region is furniture"* is a
Pattern-grain claim a corpus can refute and can never earn, no matter how many
pages accumulate.

The four pages inside their null are not evidence that furniture blanking is
harmful there. They are evidence that **on those pages it cannot be told apart
from removing an equal quantity of arbitrary text**, which is a different and
weaker statement, and the one the record should carry.

## Samples, so the categories are checkable

**Furniture-only removed** (lived only inside blanked regions):
`caulaincourt michel ney joachim`, `tolly pyotr bagration dow`,
`berenstain bears meet bigpaw`, `wikiproject wikify`,
`gravity walking simulator`, `crater radio telescope`

**Real names lost** (the cost the deferral named — still present in what
survived): `marshals ney`, `peninsular war`, `artificial intelligence`,
`module pilot michael collins`, `los angeles`, `cbs radio`

## Next

The per-page result is the input a rule-learner needs, not a conclusion.
`acquireCandidates` / `recheckCandidates` / `promoteAndDeclare`
(`hl-acquire.js`) already implement propose → recheck-cumulatively → concede
with a named trigger, for `kind: "functional"`. A chrome candidate is the same
shape with a different refutation predicate, and the enrichment-beats-null
test above is what a proposal has to clear.
