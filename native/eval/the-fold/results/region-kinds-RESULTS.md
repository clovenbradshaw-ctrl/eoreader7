# "What kind of stuff am I looking at" — the model fails it, a threshold holds it, and my own arm was fitted

`node native/eval/the-fold/region-kinds.mjs` — three real Wikipedia pages, an
independent oracle, live `gemma2:2b` on CPU for the model arm.

**Generality: universal for the finding, specimen-scoped for the region arm**
(P71). The model result and the threshold result replay across three pages.
The region arm does not, and that is this document's main negative.

## Why this was asked

Inspecting all 22 corroborated notes on the Wikipedia set found two are
Wikipedia maintenance furniture — one is literally the hidden tracking
category `Short description —is→ different from Wikidata` — and the other
twenty are all between two articles that **share 20 verbatim sentences**,
including Nelson's signal and "Davout's soldiers had 48 hours to march 110 km
(68 mi)". One text in two places is one witness, not two. So the corroborated
denominator several results documents rest on is not what it was taken to be,
and the cause is upstream: the reader cannot tell an article's body from its
furniture.

User direction: *"it's going to need to create a way to understand what type
of stuff it's looking at… it needs to be making kind induction… let's build in
a model call and then work backwards to see if we can minimize or even get rid
of it."*

## The oracle, and why it is honest

`region-oracle.mjs` builds ground truth from the page's own HTML classes —
`navbox`, `infobox`, `hatnote`, `catlinks`, `references`, `<table>`. That is a
channel `extractReadable` throws away, so no reader in this project can see it
at any tier: it is the document's author declaring what each block is, in a
channel the reader is blind to. Method needs no HTML parser — strip each
region kind, re-extract, see which lines vanish.

**It says the reader ingests mostly furniture.** On the Borodino page: 990
lines, of which **26.9% prose**, 46% navbox, 13% reference list, 5% infobox,
4% category links. The other two pages: 24.5% and 23.1% prose.

## The arms, Borodino

| arm | admits | precision | recall | F1 | junk admitted |
|---|---|---|---|---|---|
| gemma2:2b, 25 calls | 906 / 990 | 0.275 | 0.936 | 0.425 | 72.5% |
| admit everything | 990 | 0.269 | 1.000 | 0.424 | 73.1% |
| `length >= 72` | 163 | 0.840 | 0.515 | **0.639** | 16.0% |
| shape-recurrence (floor 5) | 228 | 0.434 | 0.372 | 0.401 | 56.6% |
| region, cap 1 | 189 | 0.878 | 0.624 | **0.730** | 12.2% |

## Finding 1 — the model does not do this task, and it is not the prompt

**gemma2:2b is statistically indistinguishable from admitting everything**:
F1 0.425 against 0.424, precision 0.275 against a base rate of 0.269. It
answered "prose" for 906 of 990 lines, navboxes included.

The obvious objection is that a 40-line window is too much to ask. Measured
directly, on a 120-line slice spanning a real regime change:

| window | calls | admits | precision | recall | F1 |
|---|---|---|---|---|---|
| 10 | 12 | 119 / 120 | 0.042 | 0.833 | 0.080 |
| 40 | 3 | 116 / 120 | 0.034 | 0.667 | 0.066 |
| *(base rate 0.050; admit-everything F1 0.095)* | | | | | |

At ten lines per call it still admits 119 of 120, at a precision **below the
base rate**. The failure is not the window and not the prompt.

**So the method returned the opposite of what it assumes.** There was no
ceiling to work backwards from — the model is below the trivial baseline. The
answer to "is this just going to require a model" is, at 2.6B, no: it requires
something a model of this size does not supply. Disclosed: one model, one
size. A larger model may well do this, and nothing here tests that. But small
instruct models are what this project ships (`model-routing.js` refuses
reasoning models by pin), so the arm that matters is the mechanical one.

## Finding 2 — a single declared threshold is the stable result

| page | prose | `length >= 72` F1 | precision | junk admitted |
|---|---|---|---|---|
| Borodino | 26.9% | 0.639 | 0.840 | 16.0% |
| Austerlitz | 24.5% | 0.654 | 0.821 | 17.9% |
| Third Coalition | 23.1% | 0.618 | 0.915 | 8.5% |

Precision 0.82–0.92 across all three, junk admitted down from ~75% to 8–18%.
One line of code, no vocabulary, no site rules, no model.

**Its disclosed cost is recall**: it drops roughly half the prose (0.47–0.54).
For an admission door that is likely the right side to be wrong on — a dropped
sentence is a gap, an admitted navbox row is a false assertion — but it is a
cost, not a free win. **And 72 is a hand-picked constant** (it came from a
length bucket boundary, not from a measurement). That is P4 debt and is named
as such rather than dressed up.

## Finding 3 — my region arm was fitted, and the cross-page replay caught it

The shape-recurrence arm failed first, and the diagnostic said why: it asked
*is this shape unique* and admitted the non-recurring lines, on the theory
that prose is shape-unique. It is shape-**uniform**.

```
navbox    500 lines,  35 distinct shapes | top: S:._a            x271
reflist   128 lines,  36 distinct shapes | top: M:._._a_0_._a.   x55
prose     266 lines,  72 distinct shapes | top: L:a_a_a_a_a_a_   x40

prose line lengths:     median 88      furniture: median 14
```

So the question was moved a grain up: cut the shape stream into regions with
`kernel/surprise-segments.js` (whose own header says *the caller's instruments
decide what an event is* — here an event is a line's shape), and judge each
region by its own median line length at the same threshold.

The first attempt cut 12 regions and admitted zero, with **all eleven
boundaries in the last 40 lines**. Diagnosed without looking at the score: a
prequential order-2 reader needs its alphabet small enough that N observations
cover |A|² contexts. At N = 990, |A| ≤ 9 gives ~10 observations per context.
Measured alphabet sizes: cap 1 → 8 (15.5 obs/context), cap 2 → 18 (3.1), cap 3
→ 31 (1.0), cap 12 → 164 (0.04). **Only cap 1 meets it.** A reader that never
converges cannot find a peak.

That criterion was declared before any score was seen, and it predicted the
ranking: cap 1 → F1 0.730, cap 2 → 0.395, cap 12 → 0.000.

**And then it did not replay.**

| page | `length >= 72` | region arm |
|---|---|---|
| Borodino (developed on) | 0.639 | **0.730** |
| Austerlitz | **0.654** | 0.489 |
| Third Coalition | **0.618** | 0.208 |

The region arm wins on the one page it was developed against and loses badly
on the two it was not — 8 and 3 admitted regions against Borodino's 26. That
is the signature of fitting, and the convergence criterion did not protect
against it: the criterion was applied *while looking at one page*, and the
number of regions the segmenter cuts varies from 100 to 51 across the three.

**Reported as refuted.** P71's cross-material replay is why this is a
paragraph in a results document and not a shipped organ. Without it, 0.730
would have been the headline.

## What did replay: the regions are real

The control holds on **all three pages**: adjacent lines share a shape far
more often than shuffling produces — Borodino 33.0% against a shuffled median
of 9.6%, outside all 50 shuffles, and the same verdict on the other two. Shape
regions exist. What has not been found is a way of *using* them that survives
a page it was not built on.

## Disclosed

- The oracle's `prose` class means "not inside any named furniture block",
  which sweeps in page chrome — `Search`, `Jump to content`, `Add topic`.
  Prose's 25th-percentile length is 9 characters. Every arm's precision
  against it therefore reads pessimistically, the length arm most of all.
- The strip-and-diff method mis-assigns a line whose exact text appears in two
  region kinds (an infobox belligerent that is also a navbox entry). First
  claimer wins; the effect is small and is not corrected.
- Three pages, one site, one language. The cross-format test the direction
  actually asked for — the same content as markdown with a table inside it,
  and as a PDF — is **not run here**, and it is the next thing that should be.
- No claim is made that any arm's admitted lines are TRUE. This measures what
  reaches the door, not what is right.

---

## Amendment (same day) — the threshold was a rendering artifact, and the arm that replaces it

`cross-format-RESULTS.md` carries the full account. The short version, because
it changes Finding 2 above:

`length >= 72` scored 0.769 on markdown and plaintext and **0.148** on the
same content hard-wrapped at 72 columns — recall 0.091, one prose line in
eleven. Hard-wrapping is the defining property of a PDF's text layer, so the
Wikipedia result was a fact about ONE rendering convention (one line = one
paragraph), not about documents.

The shape arm degraded identically, to three decimals, because at cap 1 its
length bucket was the whole signal — it was the threshold in a costume.

**`fills the measure`** replaces both: does this line reach 80% of the
document's own 90th-percentile line length, in a run of at least two? The
measure is read off the document, so the arm knows nothing about page widths,
formats or sites. Pre-registered on the constructed-oracle renderings, then
replayed here:

| page | `length >= 72` | fills the measure |
|---|---|---|
| Borodino | 0.639 · junk 16.0% | **0.641 · junk 8.4%** |
| Austerlitz | 0.654 · junk 17.9% | **0.670 · junk 9.1%** |
| Third Coalition | 0.618 · junk 8.5% | **0.648 · junk 8.7%** |
| wrapped rendering | 0.148 | **0.936** |

Precision 0.909–0.916 across the real pages against the threshold's
0.821–0.915. Junk admitted falls from the reader's current 73–77% to 8–9%.
