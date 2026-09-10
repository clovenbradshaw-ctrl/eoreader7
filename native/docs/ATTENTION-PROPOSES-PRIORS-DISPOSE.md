# Attention proposes, priors and mechanics dispose

**Standing: nomination.** A theory, not a build — checkable against the code
cited below, none of which has been wired for the purpose described here.
Written 2026-09-09, in response to a direct request to theorize how the
attention system and the priors compose to improve prediction, reading, and
retrieval, after naming attention as the system EO-constitution II.8 refuses
at the engine tier. Every mechanism named below already exists; nothing here
proposes new machinery, only a discipline for connecting machinery that
currently has no input on one side.

## 1. The axiom this theory must not violate

EO-constitution **II.8, the difference test**: *"Does this mechanism build a
nothing, or weight what is present?"* The engine figures by difference
against a ground it rebuilds; attention — softmax over a weighted
combination of what is already there, no perturbation, no null, no rebuilt
ground — is *"the canonical instance and is refused wherever it is the
measurement."* The boundary is not a ban, it is a placement: **"the host may
attend; the measurement never does."**

Three named consequences follow, and this theory is checked against all
three, not just the headline: no averaging of grounds (plural grounds stay
parallel; a re-projection into one belongs to the reader, not the engine); no
injected order (position is measured or received, never added as an
inductive bias); no cheap compatibility (who a surface denotes is a received
prior, never a dot product or learned similarity over surfaces).

So the question this document answers is narrower than "how do we use
attention more" — it is: **where, specifically, can attention be handed a
bounded window and asked to PROPOSE, such that an already-built, unrelated-
to-attention mechanism DISPOSES of the proposal exactly as it would dispose
of any other candidate — never trusting the proposal's own confidence, never
letting the model's judgment become the verdict?**

## 2. The pattern, once, before the three cases

Every seam below has the same shape, and the shape is not new — it is
`organs/testimony.js`'s own discipline (S99), generalized past fact-checking:

1. **The window is bounded by something that already exists and is not
   attention** — an address the holograph already expanded, a neighbourhood
   the graph walk already selected, a candidate list the cube's own typing
   already declared. Attention never chooses its own window; per THE-
   HOLOGRAPH.md's third property, *"the mouth sees no address"* and reads
   only what the record already selected.
2. **Attention proposes ONE constrained thing** — a pick from a numbered
   list, a binary claim, a candidate pattern — never a free-form judgment,
   mirroring testimony.js's `SELECT_SCHEMA` (index into real candidates) over
   its own `generate` protocol (free text that has to be contained
   afterward) wherever a select shape is available at all.
3. **The proposal is never trusted on one ask.** It is asked again under a
   content-free perturbation (reordered candidates, a sibling-swapped
   observation) and the verdict is DERIVED from whether the two answers
   agree — exactly `witness-referent.mjs`'s (this session) reorder-arm
   discipline, which measured, live, that half of a small model's raw picks
   were pure position bias, caught by exactly this check.
4. **The disposing mechanism is the SAME one that would run with no
   attention involved at all** — a null arm, a cube-typed effect check, an
   address-backing check. A proposal that clears is indistinguishable on the
   record from a proposal that arrived by exhaustive search; only the
   proposal's ORIGIN differs, and per S99's "corroboration count is a label
   that rides, not a permission that gates," the origin rides on the record,
   it never gates admission.

## 3. Reading — attention proposes an effect, `interrogateCube`'s declared address disposes

**What already exists and has no input.** `kernel/interrogation.js::interrogateCube`
loops over all 27 declared cube addresses (3 modes × 3 domains × 3 grains,
`cubeAddresses()`) and for each one calls:

```js
const answer = ask ? await ask({ address, observations, neighborhood }) : null;
```

`ask` has never been injected anywhere in this codebase. `deriveSurprise`,
`deriveTension` and `deriveRelease` (`kernel/dynamics.js`) consume this
interrogation's output — so every reading run through the assembled
`createRecursiveReader` currently profiles zero operations, not because
nothing happened, but because nothing was ever asked.

**The proposal.** For each cube address the interrogation visits, hand
attention the SAME `neighborhood` the holograph's own `relevantNeighborhood`
already computed (identity- and hop-bounded, never raw material — no new
retrieval step is introduced here) and ask exactly one question shaped by
that address's own cell: *SIG·Figure — does a new entity enter here, yes or
no, and if yes which candidate surface names it? CON·Ground — does a Field
relation hold here, and which received connector-class evidence would
license it?* The candidates offered are never invented by the model; they
are the address's own declared effect vocabulary (`eoOperation`'s known
shapes), so the model selects, it does not author a schema.

**The disposal.** The answer becomes one `EOInterrogation@1.changed`/
`effects` entry — but only after surviving the reorder-arm check (§2.3): ask
the same cube address twice, candidate order reversed, keep the effect only
if both asks name the same one. A cube address whose answer flips under mere
reordering is refused exactly as an insensitive witness is refused — the
model is echoing position, not discriminating structure, at THAT address,
this turn; it says nothing about the other 26 addresses or the next turn.

**The measurement, stated so it cannot be gamed by a better-sounding zero.**
S97 already measured the baseline this has to beat: 87 encounters, zero
operations. Wiring `ask` this way and getting a NON-zero `deriveSurprise`
is not success by itself — S100's own sequencing warning applies directly:
*"wiring the dynamics onto a reading whose referents are 14% covered
produces better-typed zeros, not better readings."* The real test is
whether a reading run this way scores higher recall against a hand-built
golden (`eval/lavar/golden-tool.mjs`) than the SAME chapter read with `ask`
absent, at the identical mandatory-object and grain-typing floors — never
"the surprise number moved," which a differently-shaped zero could also
produce.

## 4. Prediction — attention proposes a candidate pattern, the null arm disposes

**What already exists and has no input.** `kernel/expectations.js`'s full
lifecycle (`EXPECTATION_STATES`: open, strengthened, weakened, fulfilled,
violated, reframed, superseded) and `kernel/terrain-math.js::interpretiveParadigmModels`
already refuse to mint a Paradigm unless `members.length >= 2` AND
`independentGrounds.size >= 2` AND `compressionGain > 0` (verified directly
in the function, this document). Both are driven entirely by what already
recurred often enough to be visible to exhaustive grouping — nothing
currently PROPOSES a candidate pattern for this machinery to test; it can
only confirm what brute enumeration already surfaced.

**The correction this must not re-commit.** `eval/the-fold/discovered-reading-kinds.mjs`
already lived through the failure mode this section could walk straight back
into: a design where *"a model would propose a rule and a gate verify it"*
was corrected, 2026-09-03, user direction verbatim — *"the system isn't
developing a rule. it's discovering it."* Letting the model AUTHOR the
pattern and a gate merely rubber-stamp it made the model the source of
truth wearing a gate's clothing. This section's proposal is legitimate only
if it is genuinely the SAME discipline as that correction's replacement
(`kind-standing.js::discoverCompanyKinds`'s own null arm), not a relapse
into "propose-then-verify" dressed in null-arm language.

**The proposal, kept strictly upstream of truth.** Attention, handed the
same bounded neighbourhood a reader would see, may propose a candidate
signature — *"X often precedes Y here"* — as an **opened (INS), zero-standing**
expectation object. It is exactly as disposable as a candidate produced by
exhaustively enumerating every pairwise co-occurrence in the window; its
only claimed advantage is being a much-better-than-random guess, which saves
the null arm from having to test every combinatorial candidate blindly. It
is never asked to also rate its own confidence, name its own significance,
or skip the null arm because it "seems obvious" — those would each smuggle
the model back into the measurement.

**The disposal.** Unchanged, literally: the same `interpretiveParadigmModels`
call, the same floors, run on the SAME candidate whether it arrived by
enumeration or by an attention proposal. A model-proposed pattern that fails
`compressionGain > 0` or the independent-grounds floor is refused exactly as
an enumerated one is; nothing about its origin earns it a lower bar.

**The measurement, and the exact three-way outcome that would falsify this
section.** Run pattern discovery WITH and WITHOUT the attention-proposal
step, same corpus, same null-arm floor, and read which of three things
happened — `eval/lavar/surprise-decay-wholebook.mjs` (this session) is the
existing instrument, already measuring novel-rate decay (r = −0.330 on the
current 12-chapter run) as exactly the kind of signal a better-seeded search
should move:

1. **Nothing moves.** The same Paradigms clear either way, at the same
   speed — attention added nothing measurable; disclose and drop it.
2. **The same Paradigms clear, faster or on less enumeration.** A real,
   disclosed efficiency win — never overstated as "the model found
   something the null arm couldn't," because it did not.
3. **MORE Paradigms clear with attention, or novel-rate decays differently
   in its presence, in a way that survives with the proposal step DISABLED
   and pure enumeration substituted at the identical floor.** If disabling
   the proposal step and enumerating exhaustively finds the SAME set, (3)
   collapses into (2). If it finds a DIFFERENT, smaller set, something
   downstream is silently trusting the model's filtering rather than the
   null arm's — which is the one outcome that means this section's
   discipline failed by its own axiom, and the fix is not "tune it," it is
   "find and close the leak."

## 5. Retrieval — attention composes the already-selected set; it never selects the set

**The line already drawn, verbatim.** THE-HOLOGRAPH.md §2: *"It is not
retrieval-augmented generation. RAG hands a model raw chunks chosen by
string similarity and lets the model read them. The holograph hands computed
readings, resolved by referent identity, cut by a measured window, with the
addresses held back."* Selection is already, correctly, not attention's job
— `kernel/interrogation.js::relevantNeighborhood` walks `relevantHypergraphNeighborhood`
by identity and `maxHops`, never by embedding similarity or any "cheap
compatibility" the constitution names and refuses.

**Where attention is legitimately invited: composition, not selection.**
Once the neighbourhood is fixed by identity and hops — a `drill.mjs`-shaped
dump (this session: Alice, 152 arrangements book-wide, zero with a resolved
being-partner) is exactly this kind of already-selected, address-backed
set — attention may be asked to rank or phrase which of the ALREADY-CHOSEN
claims belong first in a size-bounded answer. This is squarely a mouth
question (register, salience, what to say first), never an engine question
(who is relevant), and it is the same boundary `the-fold/firewall.js::mouthFacing`
already enforces mechanically: every address is struck before a message
reaches the model (`holon.js`'s own comment: *"THE MOUTH'S DOOR: no address
reaches the model, whatever any renderer wrote"*), and `organs/cite.js`
reattaches the real addresses to whatever the mouth produced, afterward,
mechanically. Attention never sees, and therefore cannot fabricate, the
address it is composing around.

**The one place this theory extends the existing wall, rather than just
reusing it.** The boundary of "what attention is even allowed to compose
over" — `maxHops`, the neighbourhood's own size — should itself be found by
a null test rather than a hand-picked constant: expand hops until a null
(a redealt/shuffled graph of the same size) starts returning material
indistinguishable from noise, and stop there — the standing discipline
already held for exactly this kind of boundary (referent-universe sizing,
hop-bounded by a null, never hand-picked). Extending that discipline to
`relevantNeighborhood`'s own `maxHops` default is the one piece of new
scoping this section asks for; it is a null-arm measurement, not an
attention capability.

**The measurement, and its own hard failure condition.** `cite.js`'s
existing address-attachment check is the disposal mechanism, unmodified: an
attention-composed answer succeeds only if EVERY claim in it still resolves
to a real address afterward. An answer that reads better but drops even one
claim's address on the way has failed retrieval, full stop, regardless of
how much richer it reads than `drill.mjs`'s raw dump — fluency is not the
metric this section is allowed to improve; address-backed completeness is.

## 6. What makes these one theory and not three unrelated ideas

In every case, attention is handed a window something else already bounded,
proposes exactly one constrained thing, and is disposed of by a mechanism
that was going to run whether or not attention was involved at all. What
attention buys, in every case, is never correctness — correctness was
already the disposing mechanism's job before this document existed. What it
buys is speed and density: fewer blind enumerations in prediction, real
non-zero input to a currently-starved interrogation in reading, better
composition of an already-vetted set in retrieval.

The single check that governs whether this theory is holding, across all
three seams, at any point someone builds against it: **disable the attention
step and substitute the mechanical fallback (exhaustive enumeration, no
`ask`, raw ranked dump) at the IDENTICAL floor.** If the disposing mechanism's
own output changes when attention is removed, attention was doing some of
the disposing — which this document's own axiom (§1) refuses. If only the
speed or the density of what clears changes, the theory held.

## 7. What this document does not claim

It does not claim any of the three sections is built — `ask` is still
unwired, `interpretiveParadigmModels` still has no proposal input, and
`relevantNeighborhood`'s `maxHops` is still a constant, not a null-derived
one. It does not claim attention will help — §4's own three-way outcome
names "nothing moves" as a live, expected possibility, not a failure of the
theory. And it does not relax II.8 anywhere: every seam above is attention
occupying the host's seat exactly as the constitution already permits,
never smuggled into the engine's.
