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
addresses of its mentions — is a projection of the constitutional reader's
log (§7): the `EOReferent@1`, `EOMention@1` and `fedBy` entries the reader
wrote as it read, keyed to the addresses it gave at birth, never a second
scan of the bytes by a cheaper organ. A first cut projected it from a
presence index instead — every capitalised surface, no floor, no case
significance, no scripts — and that is the violation §7 records. The Lens
block and the handed sentences are two faces of one activation: the
claims, and the sentences they were read from.

**The cut, corrected, and the replacement rule (2026-09-07, the-fold
`0d2cf4d`).** The shared cut had offered the whole candidate set as one of
its own depths, and a set whose every row carries a distinct act agrees
with itself — the "measured" window was the ceiling wearing a
measurement's face (the Lens handed 94 lines about one referent; the
sentence window rode its 48-sentence ceiling on every question of three
runs). Now only the ladder's rungs below the set are candidates; when none
reproduces the reach the kernel says so and the ladder's top is handed as
the declared budget, named a ceiling on the record. And the Lens replaces
the sentences it was computed from: at a resolution that hands the Lens,
the sentences are the ones that ground its shown acts (at the ceiling, the
declared lines' acts), ranked and cut by the same `lensCut` the Lens block
spends. Measured with no model on the 13 activating questions of a real
25-turn run: sentences 4,196 characters median at level 1 against 1,059 at
level 3, every grounding act grounded; the Lens 1,743 characters, at its
ceiling on 9 of 13 and said so; handed in all 2,772 against 4,196. The
ladder compresses, and where it cannot it names the budget instead of a
measurement. (`eval/the-fold/holograph-compression.mjs` reproduces this
where the reading and the ledger are in the checkout.)

## 7. The reading policies the holograph stands on

A holograph is only as true as the log it projects from. If the log was
written by a cheaper organ than the reader — a scan for capital letters, a
string index, a chapter chunker — every block above is a compression of
the wrong reading, and no wall at the mouth's door can recover what the
reader never heard. So this section is the reading law as it binds the
holograph, the way it was violated the first time the holograph ran, and
the shape it has now. The law itself lives in `READING-SPEC.md`,
`READING-POLICY.md` (P0–P7), `LEVELS.md` and `THE-NULL-STATES.md`;
what follows cites, never restates.

**The reader is the constitutional one, and nothing else writes the log
(S1, S25, S80).** Material enters through `createRecursiveReader` with the
`causalTextPerceiver` and `reviseTextFold` assembly and `textEncounters`
over the bytes as they are. What that reader writes is the log: an
`Encounter@1` per sentence, observations whose `graphEntries` carry the
occurrences it heard (`EOReferentOccurrence@1`, `EOLexicalOccurrence@1`),
and at each refresh the beings it has established (`EOReferent@1` with its
surfaces, its provenance and the mention that fed it), their mentions, the
identity hypotheses it holds and the gaps it reached. An address is given
at birth and kept (S80); a referent's id is a birth, not a spelling. The
assembly is the persistence boundary (S25): what persists is the log of
that assembly under that recipe, and the reading resumes from its cursor
by reconstructing the fold from the log (`reconstruct`), never by reading
again.

**Presence is not establishment (S24, P38).** A being is on the record
when the reader admitted it by evidence — recurrence past the floor the
material itself sets, a surface that survives the case and script rules
below — not when a capital letter occurs. A mechanism that cannot fire
says so: a sentence-initial capital the reader refused is a typed refusal,
not a name, and an absence the record states needs two bars (the index
resolving nothing and the bytes lacking the surface). The number that
makes this concrete, measured on Crime and Punishment (1.15 MB, 3,743
paragraphs): the presence index counts 333 "referents" and 4,570 sentences
carrying one; the constitutional reader establishes 113 and addresses
4,018 sentences. The 220 the presence index adds are the ones the law
refuses — capitalised runs with no second occurrence, sentence openers,
titles, "God Which".

**Reading is omnilingual and omnimodal by construction, or it is not the
reader (S6, S16, S34–S39).** The kernel speaks no medium's grammar; the
text face declares its script, whether case is significant in it
(`capitalisationIsSignificant` is a fact about a script, not a default),
its declension and its closed classes, each with a giver. A scan that
looks for `[A-Z]` has decided that every script is English and every
language marks names by case; Cyrillic, Hebrew, Arabic and Chinese
material read through it are read as having no beings at all, silently.
The violation this names: the first holograph built its address book
from capitalised runs, and would have handed a Russian reader an empty
Atmosphere with no refusal on the record. The projection now reads
referents off the log with `caseless: true` — the reader's own rules
decided case where case decides anything.

**Lookahead is not reading, and decay is measured (S3, S5).** The reader
is causal: a sentence is scored only with what came before it, and a
driver that derives state over the whole text and then scores every unit
with it has produced a lookahead bound, labeled as one, never a reading.
Reading the whole material before the first turn is not lookahead — the
log is still written in sequence, one encounter at a time; lookahead is
scoring a unit with later evidence during the read. Activation decays at
a rate the material measures, and the cut on any projected block is
`dmdWindow` over that activation. A harness that chunks by chapter and
hands the top three chunks has replaced the measured cut with a number
nobody earned, and it measures the harness (P88).

**Identity is by the order of evidence (S17), and the loops decide on it
(P170).** Two surfaces are one being when the reader's evidence says so,
in the order it arrived, and a later refresh may reassign a fragment to
the fuller name and record that it did (`EOReferentMerge@1`). Every
decision the conversation makes about who is meant — anaphora, the
restatement, the address check, the absence, self-consistency across
turns — resolves through that index and never through a string. A
question-side candidate is every token the index can resolve, in the
reader's case, not the capitalised ones. A reader that gives an address at
birth (S80) leaves the fragments it later folded on the log as separate
ids, and it records the folding (`EOReferentMerge@1`); the projection
applies that record transitively, then its coreference organ's own
containment where a partial form sits inside exactly one fuller being —
«Luzhin» inside «Mr Luzhin», «Raskolnikov» inside «Rodion Romanovitch
Raskolnikov» — and keeps a form inside two beings' surfaces («Petrovitch»,
Luzhin's and Porfiry's) as S17's ambiguous bare form. On Crime and
Punishment: 113 addresses, 100 beings, 5 ambiguous forms kept. A name
resolves by its longest registered surfaces, never also by the fragments
inside them (maximal munch). What this does not fold, said plainly: a
diminutive («Rodya») and a transliteration variant («Petrovich» for
«Petrovitch») are received priors with givers, not rules, and are not
built.

**The frame is declared with the ledger, and the witness carries the
recipe (S42, S43).** What the reader stood on — assembly, priors,
levers, provider — is the log's first entry, and every witness on a note
names `<source>~<recipe>`, so two readings of one book by two recipes
are two instruments and corroboration counts them apart. The driver
writes `results/readings/<corpus>-<assembly>.jsonl` with its cursor and
`results/ledgers/<corpus>-<recipe>.jsonl` beside it; a run that changes
the reader gets a new file, never a rewritten one.

**A number is enforced by the test that reads its computation (S64,
S65), and mouths are compared by record (S68).** The figures a run is
judged by — tokens per call, calls per turn, re-asks, absences, voids,
positions, authorship over the turns where one was measurable, the
record-backed claims and the mouth's additions — are computed once in
`eval/the-fold/lib/conversation-compare.mjs` and read by
`tests/conversation-compare.test.js` on by-construction rows. Two mouths
are compared on what their answers' records bind and what they add, never
on prose.

**A void and a cut are events with a cursor (S69, S70, S71).** A name the
question asks for that the reading has not established is declared a void
on the ledger with its scope — how much of the material was read when it
was declared — and re-zeroed the moment a link fills it. The scope comes
from the admission cursor, never from a hand-set count; the projection
tells the mouth "looked for and not found so far" with that scope, and
"Still reading: k of n" while the cursor moves.

**Heard, not read (LEVELS, the heard rule).** The system has to work as
well if it only heard the novel. Every organ above is stream-fed and
address-keyed, and the reader admits one encounter at a time in sequence,
so a read that arrives as a stream over a day and a read that arrives at
once produce the same log to the byte. What a script carries (S1 stratum)
may accelerate the reading and never silently decide it.

**What was violated, named.** The first holograph (2026-09-07, the
morning's arms) built its mention book from `cast.js::makeReferentIndex`
— a presence index with no recurrence floor, built for citation checks —
over capitalised runs, rescanned the bytes at every turn, chunked a novel
by chapter in the harness, cut the absence veto at a hand-set bar, left
the triggers' language undeclared, and gave a void no scope. Each is a
rule above, broken. Each was found by the review the user asked for, not
by a test, which is the finding under the finding: the reading law had
no test at the projection's seam.

**What the fix is.** `the-fold/reading-log.js` projects the address book
from the constitutional reader's log — `foldReading` gathers the
referents, mentions and feeders across the log's observations,
`readingIndexFromLog` is the index the loops resolve through, and
`mentionBookFromLog` is what activation walks. The reader's own
`surfaceIndex`/`surfacesIn` attach the pre-birth mentions the log has
no `EOMention@1` for (only the birthing mention is fed), and an
ambiguous surface is counted, never attached. `stepChunks` feeds the
reader chunk by chunk with one global sequence (per-chunk numbering
collided the encounter refs). The driver reads the whole corpus before
turn 1 by default (`--read-ahead all`, 209 s for the novel, contended)
or progressively under a budget, persists the reading and resumes it.
The absence veto reads the material's own vocabulary; the triggers name
their language; a void carries the cursor's scope. The page still runs
the presence index at the turn — read-on-arrival with the constitutional
reader in a worker is the owed step, and until it lands the page's
holograph is the reading of the wrong reader.

**What reading yields, by grain.** Referents (Entity) with the addresses
of every mention; claims (Link) with spans, witnesses and standing;
recurrence (Network) from witness counts; the material's atmosphere as a
regime with its re-zero points; kinds (Kind) with their nulls; declared
voids and cuts with their timelines; and the keyless field for recall by
cue. Each is addressed to bytes that read back, and each is a projection
some consumer can be handed without the material.

**What reading cannot do, and says so.** The relation reader hears a
fraction of what a passage states, and the paraphrase wall is the one
every recent pass hit; the authorship number is that wall per turn.
Lowercase referents ("the pawnbroker") are ends of claims, never beings,
unless they recur into the subject slot. And coherence is not
correspondence: a reading can be complete, consistent and wrong, which
only an oracle on facts can say.

## 8. The walls that stay

The holograph inherits every limit of the reading it compresses. The Lens is
only as full as the relation reader's recall, and that reader hears a
fraction of what a passage states (the paraphrase wall named by MINE-1 and
P74, now visible per turn as the authorship number). Coherence is not
correspondence: a pattern can be complete, consistent and wrong, and only an
oracle on facts can say so (P60's judge, shuffled). And a consumer that
cannot re-expand — a person reading a block without the record — has a
summary, not a holograph; the property lives in the pair, not in the text.

## 9. Where it stands in the code

- `resolutions.js` — the three blocks, the shared cut, the address strike on
  handed text.
- `holon.js` — the blocks handed on every branch; the passages leave the
  prompt at level 2; `mouthFacing` around every model call.
- `firewall.js` — `strikeAddresses`, `mouthFacing`.
- `dialogue.js` — identity through the index for everything the loops decide.
- `eval/the-fold/conversation.mjs` — `--resolutions`, `--material`,
  `--chunking`, `--retrieval`, `--admit`; the ledger on disk under
  `results/ledgers/`; the ladder's arms.
- `activation-retrieval.js` — the retrieval as activation over mentions and
  notes, cut at the sentence grain; term retrieval as the disclosed fallback.
- `reading-log.js` — the address book and the referent index as a
  projection of the constitutional reader's log (`foldReading`,
  `readingIndexFromLog`, `mentionBookFromLog`, `stepChunks`); the presence
  index retired from the holograph's path (§7).
- `eval/the-fold/conversation.mjs` — `--reading constitutional|cast`,
  `--read-ahead all|<ms>`; the reading on disk under `results/readings/`
  with its cursor; resume by `reconstruct`.
- `eval/the-fold/lib/conversation-compare.mjs` + `tests/conversation-compare.test.js`
  — the run figures computed once and read by a test (S64/S65); mouths
  compared by record-backed claims and additions (S68).
- `eval/the-fold/holograph-reading.mjs` — reading by address against reading
  by string, with a redealt-address control.
- Pending numbers: the compression ladder (A0, A3, A3p, A2, A1) and the two
  holograph-reading runs; their results directories are named in the-fold
  POLICIES P171 when it lands.
