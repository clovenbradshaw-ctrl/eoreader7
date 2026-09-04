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

---

## Amendment — wired into the door, measured end to end, and its limit named

`organs/source.js` gained `measureOf` / `blankBelowMeasure` (+ 7 conformance
cases in `organs/measure-blanking.test.mjs`), at the **existing**
length-preserving blanking seam `blankLabelRows` already occupies — so
offsets stay valid and addresses still name the real file (P5.2). The measure
is the caller's declaration, computed once over the whole document;
`percentile`, `fill` and `minRun` are all declared and none is defaulted.
`endsASentence` was factored out of `blankLabelRows` rather than restated, so
P50's terminal-punctuation-as-a-class rule has one implementation.

**Two real bugs, both found by running it rather than reasoning about it.**

1. The trailing-short-line rule could not tell a paragraph's last line from
   the FIRST ROW of a table sitting right after it, and admitted `| a | b |`
   on exactly that arrangement. Fixed by requiring a sentence terminator to
   carry a short line — conservative in the right direction: it can drop a
   real trailing line that ends mid-thought, and can never admit a table row.

2. **A blank line was breaking every run.** Runs were computed over all lines,
   and in a real extracted page paragraphs are separated by blank lines — so
   no two filling lines were ever adjacent, the run rule fired almost nowhere,
   and two of three pages kept **1%** of their lines. A blank line separates
   paragraphs; it does not make each paragraph a lone line. Fixed: 1%/13%/1%
   became 12%/12%/10%.

### End to end on the three real pages

| | before the door | after |
|---|---|---|
| lines kept | 990 / 1002 / 990 | 121 / 124 / 102 (10–12%) |
| notes | 934 | 821 (88%) |
| declared junk notes | 3 | **0** |
| notes naming the material's own subjects | 214 | 181 (85%) |
| corroborated | 22 | 9 |

The junk is named, not counted: `Short description —is→ different from
Wikidata` (a Wikipedia maintenance category), `Prince —von→ Schwarzenberg` (a
navbox name fragment), `Russian —partisan→ movement [ ru ]` (an interlanguage
marker). All three gone. 85% of subject-naming notes survive, and one of the
apparent losses is itself furniture the filter miscounted (`Battle of Borodino
by Peter —von→ Hess`, an image caption), so retention reads pessimistically.

### The limit, and it is the more important half

**The nine surviving corroborated notes are still the syndicated ones** —
"Napoleon ordered the attack", "the Allies were still fighting over Sokolnitz
and Telnitz", "the Grande Armée had grown to a force of 350". Those are among
the 20 verbatim sentences the Austerlitz and Third Coalition articles share.

So the door removed the furniture half of the corroboration problem (2 of the
22) and cannot touch the syndication half (the other 20), because those notes
were never furniture. **One text in two places is one witness**, and no
admission door detects that — it needs source independence, which is a
different organ and is not built.

### The run rule, split and both numbers reported

Whether a filling line needs a filling NEIGHBOUR does not have one answer:

| arm | markdown | plaintext | wrapped | real pages (F1) |
|---|---|---|---|---|
| fills the measure (run) | 0.727 | 0.727 | 0.936 | 0.641 / 0.670 / 0.648 |
| fills alone (no run) | **1.000** | **1.000** | 0.837 | 0.563 / 0.612 / 0.612 |

`fills alone` is perfect on documents whose paragraphs are single lines and
has the smaller spread (0.163 vs 0.209); the run rule wins on all three real
pages. The run rule ships because the real pages are the target, and the
disagreement is recorded rather than resolved by preference.
