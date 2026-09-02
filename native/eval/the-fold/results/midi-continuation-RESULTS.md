# Continuing Bach mid-stream from a prior, taught no music (2026-09-02)

**Driver:** `eval/the-fold/midi-continuation.mjs` (re-runnable; `SPLIT=`,
`ORDER=`, `CONTINUE=`, `SEED=`). **Material:** two real public-domain files
(`fixtures/midi/SOURCES.md`): the C-major Prelude, WTC I (549 notes) and the
Goldberg Aria (418 notes). **Floor 0:** `adapters/midi/midi.js` — note events
with tick addresses, writer round-trips byte-exact. **Kernel:**
`kernel/continuation.js` — medium-blind; its code names no medium
(pinned by a source scan). **Outputs:** `results/midi/*.mid` — the original,
the heard part followed by each continuation, and the shuffled control, so a
person can listen.

Every event is only what the file says — MIDI pitch number, duration in
ticks, gap to the next onset in ticks. No scale, key, chord or meter is named
anywhere. The one received convention is note NAMING (c4 = 60), used for
display and as the kind organ's vocabulary.

## 1. Does a hearing predict its own continuation? (prequential, bits per note; lower is better)

The first 60% of each piece is heard; a prior is sedimented from it; the
held-out 40% arrives one note at a time and the prior is charged its
surprise BEFORE seeing each note.

| source | prelude (220 held out) | aria (168 held out) |
|---|---|---|
| own hearing, order 1 | **3.18** · top-1 28% | 6.80 · top-1 6.5% |
| own hearing, order 3 (backoff to longest) | 3.42 · top-1 34% | **6.79** |
| SHUFFLED hearing — the control built to fail | 5.05 · top-1 2% | 7.31 · top-1 0% |
| own + the other piece's symbols (cross-work) | 4.89 | 6.95 |

The hearing predicts the rest far better than its own shuffle — 1.6–1.9
bits per note better, and on the prelude a third of the next notes are
exactly the prior's most expected. The control fails as it must.
Cross-work SYMBOLS hurt on both pieces: the other piece's notes are the
wrong distribution for this piece.

Order 1 beat order 3 on the prelude: backing off to the longest context ever
heard is overconfident on a piece whose figure recurs with variation. That
is a fact the next section reads off the stream instead of guessing.

## 2. Structural analogy — the shape of a stream's moves, from anything

Symbols cannot cross media; the SHAPE of a step can: at every event the next
one repeats what stood d back (`r1, r2, …`), returns to something older
(`old`), or is new. A shape prior sedimented from a novel (Dracula, 40,000
words), from the instrument's own operational record (3,172 events), or
from the other piece, bears on the hearing's own symbol prior as a product
of experts.

| shape prior on the hearing | prelude | aria |
|---|---|---|
| none (hearing alone, order 3) | 3.42 | 6.79 |
| the hearing's own shapes | 3.50 | 6.85 |
| shapes of the novel | 3.78 | 7.03 |
| shapes of the record log | 3.48 | 6.85 |
| shapes of the other piece | 3.68 | 6.89 |
| shapes of a SHUFFLED novel (control) | 3.84 | 7.05 |
| everything merged | 3.60 | 6.80 |

**An honest negative at this grain:** no structural analog reduced the
surprise on Bach; the closest (the record log's shapes) is a wash, and the
shuffled novel is the worst — so the shape prior is measuring something
(order matters to it), but what a novel's word-moves know about how a
Bach line moves is, at a three-event window over exact
pitch/duration/gap tokens, nothing useful. Whether a coarser token (pitch
class only; duration only) or a longer window would let structure cross is
the next measurement, not a claim.

## 3. What actually happens decides — the prequential mixture

Eight sources kept as experts (the hearing at orders 1, 2, 3; the other
piece's symbols; the hearing under the novel's / the record's / the other
piece's shapes; the shuffled control). Each real note charges each expert
its surprise; weights are 2^(−cumulative bits), renormalised; the mixture
predicts and generates. Nothing chosen by hand.

- **Prelude:** mixture 3.41 bits/note; the weight went entirely to
  `hearing@1` (its own surprise 3.39); the lead changed hands
  `hearing@1 → hearing@3 (note 4) → hearing@1 (note 78)` and stayed. The
  shuffled control ended at weight 0.000 with surprise 5.44.
- **Aria:** mixture 7.00; the weight went to the CROSS-WORK expert
  (`+prelude symbols`, 6.98) — the one source the single-source table
  above said hurt. Read the two together: the aria's alphabet is so sparse
  (220 distinct events in 418 notes) that the prelude's counts on the few
  shared tokens were, note by note, slightly less surprising than the
  aria's own — a fact about THIS stream that no prior choice would have
  found. The lead changed hands four times.

**A defect this measurement found and fixed:** the first mixture scored
10.32 on the prelude — worse than every expert, which a mixture cannot be.
A near-zero mixture mass (the leading expert had never seen the note; the
others gave it a sliver) was charged at its true value, ~30 bits, while a
single expert's exact zero was charged at the declared alphabet floor. One
floor now applies to every scorer. The pinned bound holds: mixture ≤ best
expert + log2(N)/n.

## 4. The continuations, judged by the organs that read the original

| continuation of the prelude (64 notes) | reproduces the original's recurrent pitch pairs (103 at ≥2) | novelty (3-grams the hearing never contained) |
|---|---|---|
| order-3 prior, longest context | 7% | **0%** — pure replay |
| with analogy (all shapes merged) | 17% | 0% |
| **the mixture** (the stream chose order 1) | 15% | 25% |
| shuffled control | 3% | 100% |
| the real rest of the piece | 47% | 83% |

The order-3 continuation replays — every note drawn at grain 3, the prior
having heard that exact context before — which the numbers above already
predicted (order 3 was overconfident). The mixture's choice of order 1
gives a continuation that is a quarter new and reproduces twice the
arrangements the replay does. The real rest of the piece is 83% new: Bach
moves on far more than any of these. Kinds the organ discovered in the
whole prelude (9, e.g. `kind:before=c4 = {e4, f4}`): 56% recovered on heard
+ continuation — and 56% on heard + shuffled, because the heard part alone
carries them; the kind organ cannot separate the continuations at this
length. The aria yielded no kinds at all (alphabet too sparse for the
declared floors) — a disclosed absence.

## What this establishes, and what it does not

- A prior sedimented from what was heard, teaching nothing, predicts a
  real piece's continuation far better than chance and better than its own
  shuffle — the control fails as it must, on both pieces.
- Generation from that prior is real and listenable; at longest-context it
  is replay, and the stream itself (the mixture) prefers the shorter
  context that generates something new.
- Structural analogy from other media is BUILT and MEASURED and, at this
  token grain and window, does not reduce surprise on Bach. Kept as a
  negative result with its control, not as a feature.
- The mixture is the right instrument for "which source is most
  predictive": it read a different answer off each piece, and one of them
  (the aria) contradicted the hand-chosen table.
- Nothing here is correspondence: "predicts Bach's next note" is coherence
  with one file. Whether a continuation is *good music* is a question for
  a listener, and the .mid files are there for that.
