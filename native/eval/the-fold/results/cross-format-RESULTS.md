# The threshold was a fact about one rendering convention — and the arm that isn't

`node native/eval/the-fold/cross-format.mjs` (zero model calls) and
`region-kinds.mjs` on the three real pages.

**Generality: universal.** Pre-registered on constructed-oracle renderings,
then replayed on three real pages it was not developed against, then replayed
across three renderings of one document. That is all three legs of P71.

## Why this was run

The previous pass found that `length >= 72` — one declared threshold, no
vocabulary — scored F1 0.62–0.65 at precision 0.82–0.92 across three
Wikipedia pages, beating a live model that scored at the level of admitting
everything. User direction was to check whether any of it is about
**documents** or just about Wikipedia: *"feed it a markdown that then suddenly
has a table inside of it. feed a similar thing as a PDF right?"*

## The test

One document — real sentences and a real strength table, arranged by this
driver — rendered three ways, with the oracle carried by **construction**:

- **markdown** — pipe table, one line per paragraph
- **plaintext** — same content, table space-aligned, paragraphs unwrapped
- **wrapped** — same content, paragraphs hard-wrapped at 72 columns

**Predictions were written into the driver before it was run.** P1: the
threshold holds on markdown and plaintext. P2: it **breaks** on wrapped,
because a PDF's text layer is hard-wrapped at page width and every prose line
lands near the wrap column. P3: the shape arm degrades less. P4: no prediction
for the model.

## P2 confirmed, and it is not a small effect

| arm | markdown | plaintext | wrapped | spread |
|---|---|---|---|---|
| admit everything | 0.435 | 0.455 | 0.786 | 0.351 |
| `length >= 72` | 0.769 | 0.769 | **0.148** | 0.621 |
| shape median >= 72 | 0.769 | 0.769 | **0.148** | 0.621 |

Recall on the wrapped rendering collapses to **0.091** — one prose line in
eleven. The Wikipedia result was a fact about a rendering convention (one line
= one paragraph), not about documents.

**P3 is refuted, and the refutation is of my own arm.** The shape arm degrades
*identically*, to three decimal places, because at cap 1 the encoding carries
a length bucket and the bucket is the entire signal. It was the length
threshold wearing a costume. Reported rather than quietly dropped.

## P5 — the arm that survives, declared before it was run

Wrapping destroys per-line length but **preserves the paragraph**. A wrapped
paragraph is a run of consecutive lines at the wrap column ending in a short
one; a table is a run of short lines. So the question is not *is this line
long* but *does this line fill the measure, in a run* — and the measure is not
supplied, it is read off the document's own line lengths (the 90th
percentile), so nothing in the arm knows what a page width is, what a format
is, or what site it is reading.

| arm | markdown | plaintext | wrapped | spread |
|---|---|---|---|---|
| `length >= 72` | 0.769 | 0.769 | 0.148 | 0.621 |
| **fills the measure** | 0.727 | 0.727 | **0.936** | **0.209** |

It costs a little on unwrapped renderings and wins by 0.79 F1 on the one that
kills the threshold.

## And it replays on the real pages, where the threshold won

| page | `length >= 72` | fills the measure |
|---|---|---|
| Borodino | F1 0.639 · prec 0.840 · junk **16.0%** | F1 **0.641** · prec **0.916** · junk **8.4%** |
| Austerlitz | F1 0.654 · prec 0.821 · junk **17.9%** | F1 **0.670** · prec **0.909** · junk **9.1%** |
| Third Coalition | F1 0.618 · prec 0.915 · junk 8.5% | F1 **0.648** · prec 0.913 · junk 8.7% |

Better F1 on all three, and the meaningful gain is **precision stability**:
0.909–0.916 against the threshold's 0.821–0.915, with junk admitted roughly
halved on two of the three pages. Against the reader's current state — which
admits everything — junk goes from **73–77% down to 8–9%**.

This is the opposite of the previous pass's region arm, which won only on the
page it was developed against. That one was fitted and is recorded as refuted;
this one was pre-registered elsewhere and replayed here.

## Disclosed

- **The real PDF round-trip did not run.** LibreOffice is installed in this
  container and cannot load any source file (`Error: source file could not be
  loaded`, for HTML and plain text alike, with and without an explicit user
  profile). The `wrapped` rendering is the PDF text layer's *defining*
  property, and everything a real PDF adds on top — hyphenation at line
  breaks, repeated page headers and footers, column-order scrambling — makes
  the case harder, not easier. But it was not measured, and no claim is made
  that it was.
- **`0.9` and `0.8` are hand-picked constants** (the percentile that estimates
  the measure, and the fraction of it a line must reach). That is the same P4
  debt `72` carried, moved rather than paid. What changed is that the
  parameters are now *relative to the document* instead of absolute, which is
  why the arm survives a rendering change at all.
- **Recall is ~0.5 on the real pages.** Half the prose is still dropped. For
  an admission door that is likely the right side to be wrong on — a dropped
  sentence is a gap, an admitted navbox row is a false assertion — but it is a
  cost.
- The cross-format document is small (17–34 lines) and its *arrangement* is
  this driver's, though every sentence and table cell is real. It measures
  survival across renderings, and nothing about scale.
- Wrapping changes the base rate (28% prose unwrapped, 65% wrapped), which is
  why "admit everything" scores 0.786 there. That is a real property of
  wrapping — it multiplies prose lines and not table rows — not a confound
  engineered around.
- No arm's admitted lines are claimed to be TRUE. This measures what reaches
  the door.

## What this is for

The reader currently ingests 73–77% furniture from a Wikipedia page. Two of
the 22 "corroborated" notes on that page set are Wikipedia maintenance
categories, and the other twenty are two articles sharing 20 verbatim
sentences. Getting the door right is upstream of every corroboration number
this project has published.
