# The Holograph

**Standing: nomination.** This document names what the instrument does when
it hands a reading to a consumer, gives it a lineage, and says what it might
unlock. It is checkable against the code and the record, and both win any
disagreement with it. Written 2026-09-07, the day the idea was named, with
its first measurements still running (the pending ones are marked).

## 1. The claim

The record is the object. What any consumer is handed — the mouth, a reader,
a person at the page — is not the object but a small pattern computed from
it: a few addressed holons, each standing in for the material it was
computed from, from which any part of the whole can be re-expanded by the
record. Never by the consumer.

Three properties make that a holograph rather than a summary:

1. **Every part points at the whole.** Each line the record produces carries
   an address into the record — a byte range in a source, a turn, a note's
   witnesses — and the record can expand that address to the bytes, the
   claims around them, the referent's whole neighbourhood. The line is small;
   what it refers to is not. This is the standing rule about holonic objects
   in slots ("one address refers losslessly to a whole universe") applied to
   what is handed, not only to what is stored.
2. **Abstraction compresses.** A Lens line (a claim with its standing) stands
   in for the sentence it was read from. A Paradigm line (an act that recurs
   between two referents) stands in for every occurrence of it. An
   Atmosphere line (where the conversation stands) stands in for the run of
   exchanges it was computed over. So the more resolution a consumer is
   handed, the less it should need — the level ladder is a compression
   ladder, and if it does not compress, the abstraction failed, not the
   consumer.
3. **The consumer never gets the addresses.** A model handed an address will
   write one, and a written address is a fabrication order. The pattern
   reaches the mouth with every address struck (one wall at the mouth's
   door, `firewall.js::mouthFacing`); the record keeps them all and attaches
   them to the answer afterwards, mechanically (`cite.js`). Re-expansion is a
   door the record opens (`/reopen`, the quote door, the record check), not
   a thing the mouth does.

The consequence the whole design bets on: the size of what the mouth sees
becomes independent of the size of the material. A novel or a shelf of them
costs the same few hundred tokens per turn, because the reading happened
once, at admission, by structure, and a turn is a query over it cut where
widening stops making a difference.

## 2. What it is not

It is not retrieval-augmented generation. RAG hands a model raw chunks chosen
by string similarity and lets the model read them. The holograph hands
computed readings, resolved by referent identity, cut by a measured window,
with the addresses held back. The model reads nothing; it voices.

It is not a summary written by a model. The one place a model used to read
the discourse whole — the summary-refresh call that wrote the fold's topic,
flow and entities — is exactly what the Atmosphere block replaces with a
reading computed from referent sets per exchange. A paraphrase is the thing
the old PAST DISCOURSE block warned the model not to mine; a reading has no
such warning to give.

It is not lossy compression of tokens. Every line is exact and re-expandable
to bytes. What is lost is only what was never in the reading — and that is a
fact about the reader, disclosed on the record, not a property of the
pattern.

## 3. Prior art

The name is a metaphor with a real ancestry, and several technical lineages
converge on the shape.

**Optics and the brain.** Gabor's holography (1948) records an interference
pattern from which the whole image is reconstructed, and any fragment of the
plate reconstructs the whole at lower resolution — the property the metaphor
borrows. Pribram's holonomic brain theory (1971; 1991) proposed memory
distributed that way, after Lashley's equipotentiality findings. We take
the shape, not the physics: a fragment of the record (one line) reconstructs
the whole through its address, not through superposition.

**Associative and high-dimensional memory.** Hopfield networks (1982) made
memory content-addressable: a partial pattern recovers a whole one. Kanerva's
Sparse Distributed Memory (1988) addressed memory by high-dimensional
similarity, which this instrument uses directly — the keyless field of
`relative.js` is a 4,096-bit sparse representation with a measured null band
(GFP Pass 32). Plate's Holographic Reduced Representations (1995) bind
structures into fixed-width vectors by circular convolution and recover the
components approximately; it is the nearest technical use of the word, and
the point of difference is exact: HRRs recover approximately from a
superposition, the holograph recovers exactly from an address. We keep the
name for the property (every part carries the whole) and reject the
mechanism (superposition) where the record already has something lossless.

**Hypertext.** Bush's memex (1945) and Nelson's transclusion — inclusion by
reference rather than by copy, from the hypertext work of the 1960s and named
in *Literary Machines* (1980) — are the direct ancestors of "addresses over
restated text." A line in a block is a transclusion the mouth cannot follow
and the record can. Content-addressed storage (git's objects; the
content-addressed builds and recipe identities this repo already keeps, P68)
is the same idea for identity: the address is the hash of what it names.

**Wholes and parts.** Koestler's holon (1967) — a thing that is a whole to
its parts and a part to its whole — is why the layer that runs a task as
parts is called `holon.js`, and why the grains of the cube (Ground, Figure,
Pattern) nest. Bateson's difference that makes a difference (1972) is the
cut: every block is trimmed where showing one more line changes nothing about
what the question reaches (`dmdWindow`, the same measurement the record
window and the history window spend).

**The log as truth.** Event sourcing, and the Choreo lineage this project's
own `store.js` names ("the log is truth, projection is convenience"): the
record is append-only, the fold is a transient projection (P159), and a
block is one more projection — bounded, cut, disposable, regenerable.

**The language-model literature.** Retrieval-augmented generation (Lewis et
al., 2020) is the baseline the holograph replaces. "Lost in the middle" (Liu
et al., 2023) measured that long prompts degrade a model's use of what is in
them, which is the cost side of the argument. Prompt compression (LLMLingua,
Jiang et al., 2023) compresses tokens statistically; the holograph compresses
by structure and stays exact. MemGPT (Packer et al., 2023) pages memory in
and out of a context window under the model's own control; here nothing is
paged and nothing is under the model's control. GraphRAG (Edge et al., 2024)
is the closest cousin: precomputed summaries over an entity graph handed to
the model. The differences are the ones this project has already paid for:
no model writes the summaries (they are templated from a checked ledger),
identity is the index's rather than a string's, the cut is measured, and the
addresses never reach the model.

## 4. How we got here

The path is on the record, and it was not designed in advance.

- **The log is the record; the fold is a projection** (P159, 2026-09-05).
  Once the record was the object, everything else became a projection of it,
  and a projection can be as small as its consumer needs.
- **The record store is unbounded; only the projection is bounded**, and the
  record window is measured, not set (P45's `deriveRecordWindow` over
  `dmdWindow`). The cut existed before there was anything to cut.
- **Addresses leave the model's view** (2026-08-18). Measured: an
  instruction to cite addresses produced a fabricated "[4]"; the address
  became the record's to attach. The holograph's third property was a law
  before the holograph had a name.
- **The holonic-objects rule** ("prefer addresses over restated text in
  prompts, records, exports") and a scratchpad measurement that never
  landed: an id-to-log-position index, a tenth of the fold's size, reaching
  one entity's whole neighbourhood in milliseconds — set aside then as "a
  substitute for links that should exist." It was the holograph's shape,
  found early and put down.
- **Referents at the centre** (P170, 2026-09-07). The conversation's loops
  were rebuilt on the referent index after a first cut on strings was
  stopped; in the process it was found that nothing had ever handed the turn
  the index at all. A block can only be resolved by identity once identity
  is what the turn holds.
- **The discourse had collapsed to one line.** The assembly that fold.js
  still describes — base, PAST DISCOURSE, ON RECORD, material, the last
  exchanges — had lost two of its three resolutions from the answering turn
  since mid-August, and the one that remained was a model's paraphrase. The
  three resolutions were built to restore it, one per grain of the
  Interpretation domain: Atmosphere, Lens, Paradigm.
- **"The whole point of abstraction is to compress."** The first wiring put
  the blocks beside the passages. The correction reframed the ladder: higher
  holons replace the lower material they were computed from, and the
  passages leave the prompt at level 2. The name came in the same breath:
  this is a holograph.
- **Two norms restored** on the way: the mouth sees no address (the blocks,
  the expectation facts and the snip block had all put them back), and the
  eval reads with the page's own chunking (it had inherited chapter-sized
  chunks from another rig; P88's rule about stating the reader's
  configuration, broken by inheritance).

## 5. What it may unlock

Each of these is a consequence of the three properties, not a promise; the
ones with a number attached have that number pending.

- **Prompt cost independent of material.** A turn becomes a few hundred
  tokens whatever was attached, which is what makes a 2B model sufficient
  and a turn a matter of seconds rather than a minute. Pending: the
  compression ladder (A0 versus A3, same 25 turns, pre-registered as
  monotone).
- **Memory that does not degrade with length.** What a turn reaches is the
  activation over referents cut by the measurement, not a context window
  that fills. A thousand-turn conversation and a ten-turn one hand the mouth
  the same size of pattern.
- **Fewer corrections.** A draft written from a Lens that opens "What is
  said about Sonia:" has little room to miss Sonia. Pending: re-asks per 25
  turns (pre-registered as prediction 6). The additive control already
  measured that blocks added beside the passages earn nothing here.
- **The skeleton-first turn.** With the pattern in hand, the record can
  compose the answer's skeleton and the mouth can be reduced to voicing it,
  which makes authorship 1 by construction and the mouth's contribution a
  measured delta. That is the next build, and the holograph is its
  precondition.
- **Model swap as a measurement.** Several mouths voicing one pattern in the
  room, the smallest delta wins the turn; "which model" stops being a mood.
- **Learning synonymy from use.** Each time the mouth restates a Lens claim
  in other words and a witness confirms the source states it, the record
  gains a paraphrase pair with a witness — the seam `noteIdentity` left open,
  filled from conversation rather than corpus.
- **Omnimodal by construction.** The record's holons are medium-blind (the
  kernel's notes carry ends, labels, addresses); a Lens over a score or a
  film shot renders the same way. The mouth never sees the medium, only the
  reading.
- **Provenance for free, and a room that shares patterns.** Every line
  expands to bytes on demand, so provenance is not an extra layer; and two
  instances can exchange patterns without exchanging corpora, which is what
  a sealed room needs.
- **Curiosity as a void.** The reader's own questions computed from what the
  record reports unfilled, so a conversation can be conducted by the
  instrument on both sides with a person as a third witness.

## 6. Activation is the retrieval

Chunks were the container a string matcher needed to score, and the raw
passage the mouth used to be handed. Under the holograph neither use
survives, and what replaces them is one mechanism the record already had:
activation.

A question activates referents — its own, resolved through the index, or
the last answer's when it names none. The activation spreads one hop over
what the record holds about them: the mentions the index established (every
sentence where an active referent stands, with its address), and the notes
whose ends resolve to them (whose other ends become active at one hop). The
sentences those mentions and notes were read from are the ground, ranked by
hop and by how many active referents they carry, and cut where showing one
more changes nothing about what the question reaches — `dmdWindow` at the
sentence grain, reach measured as the active referents and acts the shown
sentences carry. Term retrieval survives only as the fallback for a question
that resolves to no referent, disclosed as a surface reading.

The grain of the cut is the act, not the referent. Measured the first time
the organ ran through the turn: with reach counted by referents alone, one
sentence about Porfiry "covered" him and the next, which said something
different about him, was cut. So a shown sentence's reach includes the acts
the relation reader hears in it about the active referents — the same
claims the Lens block lists — and a sentence adds reach only when it carries
an act no shown sentence carries. The reader runs over at most a declared
ceiling of candidate sentences per hop, so a protagonist who stands in a
thousand sentences never costs a thousand reads at a turn.

So retrieval is not a step before reading; it is a query over the reading.
The unit is the sentence, because that is what the organs read; the reach is
the neighbourhood, because that is what a referent is; and the cut is
measured, because a hand-picked count of chunks was the one number in the
turn nothing had earned. The address book this needs — referent id to the
addresses of its mentions — is a projection of the index, which the whole
novel yields in under two seconds, so nothing in this path waits on the
relation reader's full admission. The Lens block and the handed sentences
are two faces of one activation: the claims, and the sentences they were
read from.

## 7. The walls that stay

The holograph inherits every limit of the reading it compresses. The Lens is
only as full as the relation reader's recall, and that reader hears a
fraction of what a passage states (the paraphrase wall named by MINE-1 and
P74, now visible per turn as the authorship number). Coherence is not
correspondence: a pattern can be complete, consistent and wrong, and only an
oracle on facts can say so (P60's judge, shuffled). And a consumer that
cannot re-expand — a person reading a block without the record — has a
summary, not a holograph; the property lives in the pair, not in the text.

## 8. Where it stands in the code

- `resolutions.js` — the three blocks, the shared cut, the address strike on
  handed text.
- `holon.js` — the blocks handed on every branch; the passages leave the
  prompt at level 2; `mouthFacing` around every model call.
- `firewall.js` — `strikeAddresses`, `mouthFacing`.
- `dialogue.js` — identity through the index for everything the loops decide.
- `eval/the-fold/conversation.mjs` — `--resolutions`, `--material`,
  `--chunking`; the ladder's arms.
- `activation-retrieval.js` — the retrieval as activation over mentions and
  notes, cut at the sentence grain; term retrieval as the disclosed fallback.
- `eval/the-fold/holograph-reading.mjs` — reading by address against reading
  by string, with a redealt-address control.
- Pending numbers: the compression ladder (A0, A3, A3p, A2, A1) and the two
  holograph-reading runs; their results directories are named in the-fold
  POLICIES P171 when it lands.
