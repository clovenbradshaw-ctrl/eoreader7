# The understanding scoreboard — baseline, Frankenstein, 2026-08-24

`native/eval/understanding-scoreboard.mjs` asks the two questions V7-CUT.md's
own derived-dynamics clause makes measurable: **does reading further make the
future better predicted** (open identity hypotheses earning their outcomes)
**and the past make more sense** (witnessed recanonicalization of
already-read structure) — scored against a seeded order-destruction null, so
"understanding" has to beat "the same sentences in any order."

Nothing was invented for the score. Every counted event is a consequence
kind the kernel already emits (`identity_hypothesis_opened`,
`discourse_identity_supported`, `identity_split`,
`relation_recanonicalized`, `identity_hypothesis_supported`), and every
"prediction" is a hypothesis the reader itself opened.

## The baseline, measured on the full novel (3,392 sentence encounters)

| | ordered | shuffled #0 | shuffled #1 |
|---|---|---|---|
| hypotheses opened | 898 | 902 | 722 |
| resolved (discourse support) | **1** | 1 | 0 |
| attacked / split | 0 | 0 | 0 |
| past recanonicalized (REC) | 0 | 0 | 0 |
| expectations opened | 0 | 0 | 0 |
| obligations opened | 0 | 0 | 0 |
| provisional left open at end | 897 | 901 | 721 |

Declared numbers: cursors at the material's own quartiles (848/1696/2544);
`SHUFFLE_DRAWS = 2`, `SEED = 0` (runtime budget — a full read is ~2min —
disclosed as licensing no finer claim than "order matters / doesn't").

## The finding

**At this tier, reading Frankenstein in order is indistinguishable from
reading it shuffled.** The reader opens ~900 identity hypotheses per novel
and closes approximately none of them — a 0.1% resolution rate — and the
one resolution appears in a shuffled run too. `deriveRelease` fires zero
times on an entire novel; `deriveTension` networks zero obligations; the
kernel's `remove-provisional` action exists and **no adapter ever emits
it**. The v7 dynamics vocabulary (surprise / tension / release) is
structurally complete and functionally starved: the text adapter feeds it
INS volume and nothing else.

This is not a defect in the scoreboard — it is the scoreboard doing its
job on day one. V7-CUT.md commits to "surprise derives from consequential
DeltaFold; tension from unresolved structure; release from transformations
that resolve or reframe" — and the measurement says the resolve/reframe
half of that cycle currently has no input stream. A reader that
understood the book at the level the book wants to be experienced would
show: hypotheses attacked and split as evidence arrives ("the creature" ≠
"my father"), canonical past edges rewritten under later identity
(pastRemade > 0), and all of it collapsing under the shuffle null. Today's
numbers are the honest zero against which that work can be scored.

## Disclosed limits

- **Grain is the sentence.** The tier ladder ("a book wants to be
  understood as a series of meaningful events, not raw tokens" — the
  altitude gate) is named future work; nothing here claims event-level
  reading.
- **backwardScore counts re-makings by where they LAND**, not by the
  position of the past they rewrite — the REC op does not carry the source
  edge's position. Moot at a baseline of zero; must be sharpened before a
  nonzero result is reported.
- **Two shuffle draws** license only "order matters / doesn't," never an
  effect size. (A fast-run artifact worth recording so it is not re-cited:
  on an 800-sentence truncation the shuffled run appeared to open ~3×
  more hypotheses than ordered; at full length the gap vanishes —
  truncation, not order, was the difference.)
- **Identity alternatives (`textIdentityEvidence`) fire ~once per novel** —
  the support/attack grammar is currently near-inert on real prose, so the
  forward score's live-hypothesis table is nearly empty by construction.

## What would move the score (in order of leverage)

1. **Emit `remove-provisional` / attack evidence from the adapters** — the
   897 open hypotheses are the fuel; resolving or refusing them is release.
2. **Open expectations from relation structure** (a recurring subject with
   an unresolved participant is a prediction about who fills it) so
   `EXPECTATION_STATES` has traffic.
3. **Wire the altitude gate** so cursors and predictions live at the tier
   the material earns, not the sentence.

Reproduce: `node native/eval/understanding-scoreboard.mjs
legacy-eoreader6.1/scripts/adversarial/fixtures/pg84-frankenstein.txt`
(full output committed beside this file).
