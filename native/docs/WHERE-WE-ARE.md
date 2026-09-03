# Where we are, and where we are going

*Written 2026-09-03, at the user's direction: an essay on the state of the
work and the level each layer stands at. Standing: **nomination** — the same
register as `THE-THREE-MATHEMATICS.md`, `THE-WAYS-OF-KNOWING.md` and
`THE-MODULE-CENSUS.md`. It is a reading of the project, not a law. Where it
disagrees with the code, its tests, or `POLICIES.md`, those win. Numbers are
re-derived from the drivers named beside them; where a number is a record of
what an older, since-corrected instrument said, it says so.*

---

## I. What is actually being built

A reader whose entire state is one append-only record of dated, witnessed,
revisable claims — and whose language model is the mouth of that record,
never its memory and never its judge.

That is not a slogan; it is a constraint that has cost real capability, over
and over, and paid for itself each time. The model may **point** at a
mechanically gathered candidate. It may not **write** content that becomes
ground. It may not decide what is true. Every place that line was crossed
for convenience, a measurement later found the crossing had manufactured
something — a fabricated citation, an echoed decider, a caption forged one
turn later, a "70 degrees and sunny" drafted from nowhere and then *searched
for* as though the model's own invention were the question.

The wager is that a reading assembled this way — slowly, mechanically,
against controls built to kill it — eventually beats a reading assembled
fast and trusted. The wager is not yet won. Most of what follows is an
honest account of exactly how far it is from being won, and of the several
places where the measurements say the remaining distance is a property of
the *material* rather than of the instrument.

---

## II. Six ladders, and where we stand on each

"Level" was carrying at least four different axes in conversation until
`LEVELS.md` split the first two apart. There are six worth tracking, and
they are genuinely independent: a project can be high on one and floored on
another, and confusing them is how a pass ends up tuning the wrong stage.

| ladder | what it measures | where we are |
|---|---|---|
| **Floors (F0–F6)** | grade of operand | **F6 opened**, F5 is the bottleneck |
| **Strata (S0–S3)** | channel of evidence a decision rests on | S0–S2 solid; **S3 is the whole open question** |
| **Breadth (27 cells)** | kinds of act performable | **27/27, nine FULL stances** |
| **Depth (MHC orders)** | complexity of task performable | **stage 13** on rich material, **11** in interaction |
| **Stations (0–9)** | the pipeline, end to end | all built and lit; **station 5 starves the rest** |
| **Ways of knowing (9)** | epistemic surface | all nine present; the hub is five enforced walls |

### Floors — F6 is open, F5 is the choke

Floors are operand grade: F0 units → F1 referents → F2 arrangements → F3
claims → F4½ nesting → F5 corroborated notes → F6 premises.

Floors 0 through 4 are **done to the material's own ceiling**, and that
phrase is doing real work. Three separate levers were measured against the
~20% referent-anchoring bound on narrative prose and the bound held every
time, because it is a fact about what novels assert, not about how well we
read them. The refused list at the end of `NEXT-PASSES.md` exists so nobody
spends a fourth pass there.

F4½ (nesting — a claim in an end slot, so `Tolstoy —states→ claim:…` is an
ordinary note) is built and consumed. Its wall is the reason it is worth
having: **witnesses of an outer note never corroborate the inner claim.**
Two sources agreeing that Tolstoy says X corroborate that *Tolstoy says X*
and give X nothing. `corroborationOf` keeps `direct` and `attributed`
strictly apart with no option to sum them, and a planted leak fails the
assay. Without that wall, nesting manufactures corroboration by restating
attribution — which is exactly how "papers report he said it" becomes
"sources confirm it" in the wild.

F6 (premises — notes that survived corroboration, now composable) opened
2026-09-02 with `organs/derivation.js`. Its ceiling is set by F5.

### Strata — the honest edge of the project

Strata are the channel a decision is *licensed to rest on*: S0 bytes, S1
script (case, punctuation, layout — only a **reader** has these), S2 heard
(the word stream, closed classes, recurrence — a **listener** has these), S3
meaning (reference, predication, paraphrase).

The heard rule — *"the system must be able to work equally well if it only
heard the novel and didn't read it"* — is what makes this a ladder rather
than a taxonomy. S1 evidence may accelerate; an organ whose *decision* rests
on S1 alone is below the bar and must declare it and carry a BECOMING.

S0 is disciplined throughout: every span self-verifies against its bytes,
coordinate spaces are declared and never mixed silently, 2,584 of 2,584
hypergraph edges verified on their own addresses. S2 has been the productive
frontier — `discoverCompanyKinds` inhabited the first BECOMING by
discovering the title/name distinction from the heard stream alone
(`kind:before=the` → general, count, emperor, colonel; `kind:before=^` →
kutuzov, napoleon, pierre), naming each kind by its own signature, with a
shuffle control that dissolves every one of them.

**S3 is where the entire remaining difficulty lives.** Reference, predication
and paraphrase are the three things no mechanical organ in either repo can
decide, and the one place the model is genuinely load-bearing. More on this
in §V, because it is the crux.

### Breadth — 27/27, and what that does and does not mean

Run today: `capability-coverage.mjs` reports **27/27 cells, nine FULL
stances, all three grains at 9/9, all three modes at 9/9, no operator at
zero.** Every kind of act the algebra names has at least one registered,
executable organ.

Two honest qualifications, both of which the coverage driver's own header
insists on. First, an empty cell was always a **lead, never a verdict** —
over half the original 18 holes were registry debt (real, tested organs that
had simply never been registered), one was real incapacity (CON·Pattern,
which earned that reading by a falsifiable prediction stated before the
file existed and confirmed on real material), and four were probe error.
Second, and more importantly: **coherence is strictly weaker than
correspondence.** A completed 27 means every kind of act is *performable*.
It says nothing about whether any of them is performed *correctly*. A reader
can be internally coherent, productive, and systematically misreading, and
no amount of map completion detects that. Only an oracle can, and only on
facts.

The independent confirmation worth more than the number itself:
`THE-MODULE-CENSUS.md` read ~220 modules module-first rather than cell-first
and found a **second, independently-discovered organ for every one of the 27
cells** — including the two that had exactly one example before. Unrelated
organs across text, audio and MIDI keep landing on the same cells for
unrelated reasons. That is evidence the algebra is not a curated fit to 29
hand-picked examples.

### Depth — stage 13, with one real ceiling

The MHC battery scores task complexity against a received scale. Current
state: **stage 13 on War and Peace, stage 6 on Borodino**, zero scale
violations across three materials including one non-Latin (Russian).

The gap between the two materials is a *performance* difference, not a scale
violation, and the distinction was itself a fix: the first version of the
content-independence check reported every per-material difference under one
heading, which is simply false — the MHC's content-independence is a claim
about the *scale* (a task's order does not depend on what it is about), never
that a performer succeeds equally across domains. Three outcomes are now kept
apart: violation, performance difference, and no-probe.

Borodino's cap is real and named: order 7 is pronoun binding, and Borodino's
prose is dominated by collectives, so every frame comes back
`pronoun_no_margin`. On Russian, order 7 fails with **zero pronouns even
attempted** — `resolvePronouns` runs an English-only closed class. That is an
absent mechanism, not a weak one, and it is named as unbuilt rather than
papered over.

A second, separate battery scores **interaction** — conducting an act,
reading what came back, computing the next act from it, predicting before
acting. That reaches **stage 11 against three genuinely different real
counterparts** (this repo's act grammar over the engine kernel, a real
`python3 -i` subprocess, a real `sh` subprocess), with the scale holding: no
order changed its order-hood with the counterpart.

### Stations — everything built, one starving the rest

All ten stations of the pipeline are built and live. `WHAT-IS-BEING-BORN.md`
carries the station-by-station delta table, and **that table is now stale in
four rows** — worth saying plainly, because a stale map is worse than none:
the obligation ledger exists (`/must`), `kind-standing` has its caller
(`fold-gate.js`, which vetoes the Castle Dracula → Count Dracula merge on
real bytes), the speaker boundary is built (110 sections of the real
*Dracula*, reading like the novel's own contents), and the SVO overlay wipe
is done — `hypergraph.js` carries only the earned `end1/label/end2` names, so
a re-introduction fails loudly.

What remains true, and is the single most important sentence in this
document: **station 5 starves everything downstream.**

---

## III. The one number that governs everything

The assertion ledger hears a note the first time (INS·Figure) and folds a
re-sighting into it (SYN·Figure), unioning witnesses and spans. A note with
two *independent* witnesses is corroborated. That is the machine's whole
theory of knowing something.

Measured live, on CPU, with the walls on:

| material | clean votes per ask | precision guard |
|---|---|---|
| a real novel (240KB of *Dracula*, six sources) | **0.017** | 0 lies on 4 planted fabrications |
| an encyclopedic page pair | **0.033** | 0 lies |

One note in sixty. And the older, much-quoted "~2.2% of notes reach two
witnesses" figure is an **overstatement** — `distinctSources` was comparing
witness strings with their chunk addresses still attached, so two chunks of
one book counted as two sources. Found by the first walk over a real book,
where every "corroborated" note had been corroborated by its own source.
Fixed, pinned, and every ≥2-source number computed before that day is a
record of what the old instrument said rather than something this project
re-derives.

**This is not a weak witness. It is the material, measured.** A novel does
not restate its propositions in other chapters; it re-mentions its
referents. The walk found the one thing a diary genuinely says twice
("the case of Renfield grows more interesting") and honestly reported that
everything else a chapter asserts, it asserts once. Cross-source
corroboration is the wrong question to ask of a single book, and the
mechanism answered it without manufacturing a yes.

The design consequence has already landed: the ≥2 gate on the ledger's mouth
is **gone** (P84). A single-witness note now reaches the model on its own
relevance to the question, with its corroboration *disclosed* — "stated in
more than one place" / "stated once so far" — rather than withheld. The gate
was chosen when the admission door admitted junk; the door no longer does,
and the gate was starving the model of a book's whole reading to guard
against a diet that no longer exists.

---

## IV. What the last week actually established — mostly by refutation

The negative results are the asset. Four in particular reshaped the plan:

**Identity is refuted as the corroboration lever.** Folding note identity by
referent face plus lemma yields **0 joins** on real pages, within-book and
cross-document alike. The flagship pair fails by name:
`sameLemma("withdraws", "retreated")` is false. That is not a morphology gap
to be closed; it is synonymy, which morphology does not touch.

**Bridges can be witnessed, and witnessing cannot make more of them.** A
witness asked directly about a referent correspondence *discriminates* —
8 of 12 real versus 2 of 12 on a mispaired control built to fail, Fisher
exact p = 0.0180, identical across two runs at temperature 0. And it is
bounded by the match that made it: **12 of 12 candidates had two faces that
were the identical string.** A bridge exists only where the exact-triple
match already fired, so a paraphrase never becomes a candidate and no
witness is ever asked about it. The general form, worth carrying: *an organ
that reads a correspondence can only examine correspondences something else
already proposed.*

**No slicer earns a license, and the guard the rule names cannot guard the
slot.** The licensing run for candidate slicers read, at face value, like
containment separates from its control 9 to 1. Reading the nine *landings*
rather than counting them: page furniture. «Support the Museum». «Visit the
Apollo Journals Website». A video caption. Applying the decider-company wall
post-hoc, containment's 9-vs-1 becomes **1-vs-0** — no signal left to license
anything with. And the structural finding underneath it: the wall the
licensing rule names as the non-learned guard on that slot **is not below
the select path at all**, and cannot be switched on, because it works by
requiring an end's own literal words and the seam exists precisely to reach
cases where those words are absent. They are mutually exclusive as designed.

**Distributional company is dead as act identity.** `saw`/`wrote` scores
0.744; the genuine synonym pair `looked`/`gazed` scores 0.585. Company at
±1 token measures syntactic frame, not act. The control caught it before it
shipped.

Against those four, one large positive: on 158 real entities and 28 real
succession edges, the reaction circuit derived **224 never-stated facts, 223
true, 0 false**, judged by an oracle the derivation never reads, with **0 of
50 shuffled controls matching**. Mechanical composition over checked
premises works, and works at scale, when the premises exist. The scarcity of
premises is the problem, not the composition.

---

## V. Where we are going

### The choke-point, and the ordering

The ordering has not moved and should not be re-derived: **ends → identity →
corroboration → the ledger's mouth → chat memory.** Fixing note identity
before the ends are real would corroborate noise. The mouth is now open
(P84), so the live constraint is the two links before it.

And the last week narrowed *identity* considerably. "Are these two notes the
same proposition?" is a conjunction of three claims, not one, and they have
completely different standings:

| conjunct | mechanical today? | giver |
|---|---|---|
| the **ends** resolve to the same referents | largely yes — referent index within a document, bridges across, Wikidata QIDs | `wikidata.js` closes chains mutually by qid |
| the **polarity** agrees | yes | `NEGATION_WORDS`, a received closed class, `lang/en` |
| the **labels** denote the same act | **no — this is the whole wall** | none exists |

Two of three are solved. The residue is exactly one question: verb synonymy.
**Amended the same day — the ends conjunct is solved as REFERENT identity,
which is weaker than it reads, and the synonymy residue turned out empty.
See the amendment at the end of this document.**

Note also what the 0-join result did and did not test. It tested ends **and**
label jointly, and its own diagnosis attributed the zero to the label half —
which means the ends half has **never been measured alone**. A proposer that
requires only ends correspondence and deliberately drops the label conjunct
is not a re-run of a refuted experiment; it splits the conjunction at exactly
the joint the postmortem named. That is the cheap, offline, zero-model-call
thing to do first, and it decides whether the label question is even worth
taking.

### The reframe: the model was standing in for a giver we did not have

The place the model is genuinely load-bearing turns out to be *one* question
wearing three costumes: *do these differently-worded things say the same
thing?* — asked of two notes (identity), of a claim and a passage (witness),
and of a claim and a cited document (Ranke).

And that question does not want a model. It wants a **giver**. "These two
labels denote the same act" is a Pattern-grain claim, and the grain theorem
is explicit: a corpus can *refute* one and can never *earn* one. So no amount
of further reading will produce it, which is why every distributional attempt
has failed and will keep failing.

This is also the honest answer to "can we not leverage Wikipedia?" — yes, but
as a **received prior with a named giver**, routed through the chemistry
table's existing rule (*only a GIVEN affordance with a named giver licenses
composition*), never as evidence a corpus earns. Wikidata QIDs and redirects
already serve the *ends* half and are the strongest thing we have. Wiktionary
synonym sets are the only Wikipedia layer that speaks to the actual wall, and
they are thesaurus-grade — loose, unranked, over-generous — so they would need
their own licensing run judged on **marginal admits**, never on aggregate
coverage.

There is a second candidate route (two labels repeatedly joining the same
resolved end-pair across independent sources) which is *not* refuted, and it
has a fatal structural problem worth naming so nobody spends a pass on it
blind: **it is starved by the very wall it would break.** A label-pair
recurring on one end-pair across two independent sources is exactly as rare
as corroboration itself — one in sixty. The distributional route needs the
scarcity solved before it can solve the scarcity. A received prior has no
such problem; it arrives whole, and its size is independent of how well the
reading is going.

The receiving apparatus for this landed two days ago. `commitments.js` gives
the ledger Interpretation's triad: `declare` (DEF — requires a giver *and* a
purpose, lands as a **wish**), `evaluate` (EVA — requires a ground and a
declared perturbation, promotes to **testimony** or **refused**), `concede`
(REC — requires a verbatim trigger, and a conceded commitment makes its
withheld notes readable again, which is the property a filter cannot have).
A commitment never counts as a witness; the fold is unchanged by any
commitment that is not in force; and `redeal` runs the whole thing on a
scratch log so an experiment never lands on the record.

A Wiktionary revision is a giver we can name and can concede when it is
wrong. A model is neither.

### Three things that would change the shape

1. **Feed station 3's earned referent index into station 4's extraction.**
   Ends currently anchor on fragments — 7.5% referent-anchored, with debris
   like `of Moscow —took→ …` still reaching the ledger. The extractor never
   consults the cast. This is named as the single highest-leverage unbuilt
   wire, and everything above it inherits the improvement.
2. **Point the witness at footnote-bound partials with a window chosen by
   referent activation** rather than by word containment. Of 404 notes with a
   readable cited face, 226 are `partial` and 162 of those are missing the
   *object* — the source says it in other words, at the right sentence,
   already located by the footnote binding. Containment sits at parity with
   its control at every grain, twice measured; it finds where a note's words
   live and does not find the claim.
3. **Finish Phase 4 — the-fold as only a surface.** Roughly seventy modules
   still sit in the interaction repo that are not interaction. The rule
   learned by moving the last one: **move a closure together, never a file.**

### Two reconciliations already closed, so nobody reopens them

The operator-order divergence is settled and settled *at the source*: the
canonical chain is NUL SIG INS SEG CON SYN DEF EVA REC, and the divergent
constant was a restatement that had drifted from the tables in the very
module it imports. The fix removed the restatement rather than flipping a
literal, so the drift is now structurally impossible. And the SVO wipe is
done. Every earlier note flagging either as pending is spent.

---

## VI. What would falsify this

An honest account owes its own failure conditions, and this project's are
unusually crisp.

**The stated gate on the whole plan:** if the memory floor cannot raise
clean-votes-per-ask measurably, then the floor's *design* gets re-examined,
not its tuning. That gate fired once already, and the re-examination landed
(the ≥2 mouth gate is gone). The number itself has still not moved. If the
giver route also fails to move it, the conclusion is not "try a tenth lever"
— it is that cross-source corroboration is the wrong currency for reading a
single work, and the ledger needs a different theory of when a note may be
trusted.

**The standing wall, which no amount of internal success crosses:**
coherence is strictly weaker than correspondence. Twenty-seven cells, nine
full stances, every wall holding, every control failing where it should —
all of that establishes that the instrument is internally consistent and
productive. It does not establish that anything it reads is true. Only an
oracle does, and only on facts, and the two planes must never share
machinery or the instrument begins proving its own cognition correct.

**The prediction that could break the theory layer:** the three-mathematics
reading claims the nine stances are the same triad instantiated in three
mathematics, which predicts that a stance proven in one domain transfers to
another. That has exactly one earned point so far (the Binding stance's
algebra reproduced across three real organs on real material, zero core
edits) and one more from the depth axis (DEF·Ground derived from its two
depth-siblings before it was built, then built with zero departures). Two
points is not a law. A stance that provably does not transfer would break it,
and the document says so in its own §VIII.

---

## VII. The short version

Breadth is finished: every kind of act is performable, and an independent
module-first census found a second organ for all 27 cells. Depth is high:
stage 13 on rich material, stage 11 in live interaction, no scale violations
across three materials including a non-Latin one. The floors are built
through F6. The strata are disciplined through S2.

Everything now hangs on one number — one corroborated note per sixty asks —
and on the single question that number reduces to: *do these
differently-worded things say the same thing?* Two of that question's three
conjuncts are already mechanical. The third is a Pattern-grain claim, which
means no corpus will ever earn it, which means the answer is a named giver
and a revisable commitment rather than a cleverer statistic.

The apparatus for receiving that answer is built. What is not yet built is
the proposer that hands it the candidates — and the first, free measurement
that would tell us whether the candidates exist at all.

---

## Amendment (2026-09-03, same day) — the free measurement was taken, and it moved two of this document's own claims

`eval/the-fold/ends-only-proposer.mjs`; full account in
`eval/the-fold/results/ends-only-proposer-RESULTS.md`; spec entry S55.
Two materials, zero model calls.

**The ends conjunct is solved as REFERENT identity, and that is weaker than
§V read as.** An arrangement's ends are not referents. "the battle", "the
battlefield", "control of the battle" are different ends resolving to one
referent, and keying on the referent answers *are these about the same two
things* — which is not the question. Measured: 19 candidates on the
Wikipedia set against **25** under deranged resolution, so the proposal is
refuted by its own control; six keys absorbed 6, 5, 2, 2, 2 and 2 distinct
raw end-pairs. `Kutuzov —arrived→ at the battlefield` and `Kutuzov
—retreated→ from the battlefield on 8 September` key identically.

**The synonymy residue is empty, and this is the more useful result.**
Decomposing every cross-source pair whose raw ends collide: 22 collided on
ends *and* label (already folded), and **zero** collided on ends while
differing in label. Across 1,404 notes on two genres, exactly one pair
anywhere is blocked by the label alone. A paraphrase never gets as far as
having matching ends. So the Wiktionary route §V recommends would have had
one candidate to act on — buying it would have bought nothing. The argument
that a Pattern-grain claim needs a giver rather than a model still stands
whole; the giver it needs is simply not a thesaurus.

**And the one candidate names the giver it does need.** `The door —is→
shut` / `The door —was→ shut` — tense, not synonymy, and `sameAct` does not
fold it: the vendored morphology prior carries **zero of eight** English
copula forms, keeping only an irregular tail from which the copula was
dropped. Reach over this material's own labels: the copula is 29% of
Wikipedia label heads and **50% of Dracula's**. Half a novel's assertions
are copular and the organ deciding whether two labels denote the same act
is blind to every one of them.

**What §V's "three things that would change the shape" should now read as.**
Item one is unchanged and confirmed with a number: 53% of Wikipedia notes
and 99% of Dracula notes have at least one end resolving to no referent in
their own universe, so lever 3 caps everything above it. Item two is
unchanged. A new, cheaper item joins them: restore the copula to the
morphology prior and commit its builder — which is currently absent from
the repository, with its input path pointing at a previous session's
scratchpad. A received prior whose builder is not committed cannot be
corrected, only replaced.
