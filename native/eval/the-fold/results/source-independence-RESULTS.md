# One text in two places is one witness — and on this fixture, that is all of them

`node native/eval/the-fold/source-independence.mjs` — three real Wikipedia
pages, zero model calls.

**Generality: universal.** The organ holds no site rule and no vocabulary; it
compares sentences a caller's own splitter produced, at floors the caller
declares, with a control built to fail.

## The finding

| | corroborated notes |
|---|---|
| as the reader builds it today | **22** |
| with the admission door alone | 9 |
| with source independence alone | 2 |
| **with both** | **0** |

**On this three-page fixture there is no genuine cross-source corroboration at
all.** Every one of the 22 was either the publishing system's own furniture or
one text counted twice. The two halves are complementary: the door removes
what independence cannot see (maintenance categories, navbox fragments), and
independence removes what the door cannot (real prose, syndicated verbatim).

The two that survive independence alone are exactly the two the door removes —
`Prince —von→ Schwarzenberg` and `Short description —is→ different from
Wikidata`.

## The organ

`corroboration.js::sharedTextGroups` is the mirror of the shared-instrument
count already beside it. That one says *two sources read by one instrument are
one READING*. This one says **two sources carrying one text are one SOURCE**.
`distinctSources` takes an optional `groupOf` and collapses them; omitting it
is byte-identical to before it existed.

Conservative by construction: two sources are independent unless shown
otherwise, and grouping is transitive by union-find — if A syndicates B and B
syndicates C, all three are one text however little A and C share directly.

## The measured design decision: grouping runs on DOOR-FILTERED text

Measured both ways, and the difference is the whole decision:

| | borodino × austerlitz | borodino × third-coalition | austerlitz × third-coalition | groups |
|---|---|---|---|---|
| raw | 14 | 11 | 24 | **1** (all three collapse) |
| door-filtered | **0** | 1 | **8** | **2** (exactly two collapse) |

On raw text all three collapse — but Borodino's overlap with the others is
entirely chrome: navbox rows, reference formatting, category lines, which *any*
two pages from one site share. Grouping on raw text would collapse any two
pages from one publishing system regardless of content.

The door-filtered answer is the true one. Wikipedia's War of the Third
Coalition article copies its Austerlitz section from the Austerlitz article,
verbatim — *"sensing trouble, napoleon ordered his own heavy guard cavalry
forward"*, *"by 1400 hours, the allied army had been dangerously separated"* —
and Borodino shares nothing but chrome with either.

## The control (II.23)

Sentences redealt among the sources, keeping every sentence and every source's
count exactly, destroying only which document a sentence came from. 40 draws:
**real 8, redealt median 3 (range 2–6), outside every draw.** These documents
share a text, not a vocabulary.

## What this changes

Every corroboration number this project has published on this fixture set was
counting a text more than once. That is the second correction of the same
denominator: S45 found `distinctSources` was comparing chunk-addressed
witnesses and counting two chunks of one book as two sources; this finds it
counting two pages of one text as two sources.

**It does not mean the mechanism is weak.** It means this fixture was never
three independent sources, and the "~2% corroboration wall" was measured on
corpora that could not corroborate. Getting a genuinely independent corpus —
different publishers, not different pages of one — is what would let the wall
be measured at all.

## Disclosed

- `minSentenceLength` 40 and `minShared` 2 are declared, not derived.
- Sentence identity is exact after whitespace and case normalisation. A
  paraphrased reuse is invisible to this organ, so it under-detects
  syndication rather than over-detecting it — the conservative direction.
- Three pages, one site. A genuinely independent corpus is the next thing this
  needs, and it is not in the fixtures.
