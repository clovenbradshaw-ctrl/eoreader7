# Ground / figure / pattern by surprise — music finds its bar, English does not find its sentence (2026-09-02)

**Kernel:** `kernel/surprise-segments.js` (medium-blind, pinned: names no
medium). GROUND is the prior so far; FIGURE is an event's surprise measured
before it arrives; a boundary is a local peak of surprise at or above the
(1−α) quantile of the surprises the SHUFFLED stream produces under the
same reader (the null is inside the segmenter); PATTERN is the next level:
segments become tokens (their move-shape signature, symbol-free) and the
same cut runs again. **Driver:** `eval/the-fold/surprise-segments.mjs`.
Declared: order 3, α 0.05, 20 shuffles for the cut, minLength 3, depth 3.
**Alignment null:** the same number of boundaries placed uniformly at
random, 200 draws.

User direction: "the system has no view from nowhere and never is without
Bayesian priors … music exists in statements too — in ground / figure /
pattern that need to be segmented recursively."

## Music

| piece (oracle never shown: the file's own bar, 4 × ticksPerBeat) | cut | boundaries | within 1 note of a bar start | count-matched random | random at/above |
|---|---|---|---|---|---|
| Prelude in C, 549 notes, 34 bars | 5.83 bits | 77 (median segment 5) | **34%** | median 18%, 95th 26% | **0 of 200** |
| Goldberg Aria, 418 notes, 23 bars | 7.79 bits | 125 (median 3 = minLength) | 18% | median 17% | 65 of 200 |

**The Prelude's figure is where its ground is most wrong.** Boundary
spacing: 3×23, 4×15, **8×9**, 5×8 — the piece's own 8-note figure and its
halves. Recursion: 549 events → 77 cuts (23 kinds) → 16 cuts (10 kinds) →
4 cuts (4 kinds): pattern condensing out of figures, level by level, with
nothing named. The Aria is chance: 254 distinct events in 418 notes make
nearly every note a first occurrence, every segment collapses to the
minimum length — a ground that is never right has no figures, only
novelty.

## Text — Dracula, first 11,189 words; oracle: the script's own 520 sentence ends and 99 paragraph ends, held aside

| stream the segmenter saw | cut | boundaries (median segment) | within 1 word of a sentence end | random | at/above |
|---|---|---|---|---|---|
| lowercase words | 11.10 bits | 3,001 (3 words) | 13% | 13% | 179/200 |
| word MOVES (repeat/return/new, symbol-free) | 2.39 bits | 239 (29 words) | 10% | 14% (95th 17%) | 186/200 — *below* chance |
| POS classes (the received UD prior's dominant class; 15 classes, 828 OOV → "X") | 4.00 bits | 1,869 (5 words) | 14% | 13% (95th 15%) | 59/200 |

**English sentence ends are not where the ground is most wrong — at any
of three grains.** Raw words: every unseen word is a "figure" (3,001
cuts). Moves: the segments are sentence-SIZED (median 29 vs the script's
20) but sit below chance on sentence ends — the move-grammar changes
inside sentences more than between them. POS classes, the received
prior's ground: the cut is real (4.00 bits, 1,869 boundaries) and the
recursion condenses (1,602 → 342 → 57 cuts; 578 → 61 → 39 kinds), but
the boundaries still land on sentence ends at chance. A sentence is a
convention of the script, not a peak of surprise in the class stream.

## What this establishes, and what it does not

- The kernel works: on a stream whose ground can be right, surprise finds
  the figure (the Prelude's bar, 0/200; the synthetic figures in the pins).
- The thesis holds in music and, as stated, fails in English at the word,
  move and class grains. The honest reading is not "statements have no
  ground/figure" but that their figures do not live at these grains: the
  statement's own units are the ARRANGEMENTS (floor 2 — who did what to
  whom) and the NOTES of the ledger (floor 5), streams where recurrence is
  dense and the ground can be right. Segmenting THOSE by surprise is the
  next measurement, and the-fold's hyperlexicon is already that stream.
- A prior is what makes a ground possible at all: the POS prior turned a
  hapax-dominated stream into one the reader could predict (11.10 → 4.00
  bits to cut). It did not make the sentence appear, because the
  sentence is not there to appear.
- Which representation to read a stream at is itself a source to be
  chosen by what actually happens — the mixture's job, not a hand's.
