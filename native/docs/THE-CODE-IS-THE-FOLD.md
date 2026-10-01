# The code is the fold

**Standing: nomination.** This document names what the instrument does when a
small model is asked to write code, gives it a lineage, and says where it will
break and what it might unlock. It is checkable against the code and the
record, and both win any disagreement with it. Written 2026-10-01, in answer
to a direct request to look at three things together: "the stigmergic
coding," "allowing the small model to make mistakes and considering its
outputs 'ideas,'" and "using those ideas mechanically to create a coherent
canonicalized folded version, itself folded from the same style of append-only
log." Where a claim here is measured it says so and names the run; where it is
argued it says that; where it is unbuilt it says that. Citations marked † were
checked against the literature on the day of writing. The rest are from memory
and want the same check before they are quoted anywhere.

## 1. The claim

**The model's output is not the code. It is an idea** — a conjecture about
what one named slot of a program might contain, written by a writer who was
shown nothing but that slot's contract. Ideas land on an append-only log as
typed acts. When two ideas contradict, they are settled by running them,
never by asking a model to referee. The code is the **fold** of that log: a
projection, regenerable at any cursor, linted as a composed whole before
anyone is told it is clean.

Three properties make that a method rather than a pipeline:

1. **A writer cannot know the whole, structurally.** The direct correction
   that produced the design, verbatim: *"Individual writers MUST NOT be
   expected to know anything whatsoever about the whole. It is the
   unavoidable dependency order of reality and the stable basins of emergent
   structure that make it coherent."* The first cut asked a model, by
   instruction, not to touch what it was not given, and measured the
   instruction failing (council v2, rounds 7 and 9: a writer closed the
   document, another left the original tail dangling). Isolation is now
   construction: the text is never in the writer's context, so it cannot be
   reproduced. That is L5 — a compliance-critical fact is never left to the
   model's own instruction-following — applied to authorship.
2. **A mistake is data, not an error.** A proposal that fails its checks does
   not vanish. It keeps its place on the log, refused (DEF) with a reason,
   beside the idea that won. The log is therefore a record of what was tried,
   not only of what survived, and the refusals are the raw material of
   everything in §9.
3. **The fold is the only door.** There is no exported way to get a composed
   document without its lint status. `foldCode` returns `{html,
   lintProblems, clean}` as one value, pinned by a test that scans the
   module's own exports. A caller can still ship `clean: false`; it is now an
   act of will, not a default. Nobody can accidentally not-notice.

The vocabulary is the nine operators, used where they are earned and not
forced onto every act:

| act | operator · grain | what it says |
|---|---|---|
| a writer's first idea for an anchor | INS · Figure | a birth |
| a later idea for a settled anchor | SYN · Figure | a revision, never a rebirth |
| a reader's finding about an anchor | SIG · Ground | evidence about it, never a proposal for it |
| adjudication between contested ideas | EVA · Figure | `holds` or `undetermined` |
| the idea that lost | DEF · Figure | refused, with a reason |
| a concession of what the anchor means | REC · Figure | a re-zero to an unsettled gap |

SEG (an anchor found too coarse) and CON (a complementary merge) are named in
the module header and not built. Seven of nine are earned here, and the
header says so rather than claim all nine.

## 2. What it is not

It is not a conversation between agents. No writer addresses another and no
reader calls a writer. The only channel is the shared material.

It is not best-of-N. Best-of-N keeps one candidate and drops the rest; the
unit of selection is the whole program. Here the unit is a slot, the rest
are typed refusals, and a tie is not broken — it is recorded.

It is not a merge. Nothing here combines text. Two ideas for one slot are
never concatenated (the header: "never by silently concatenating both"). When
neither clears, or both do, the contest is EVA'd `undetermined` and the fold
keeps whatever the slot already held. A tie is disclosed, never settled by
picking one arbitrarily.

It is not an agent loop. No model decides what happens next. `code-loop.js`
asks for exactly one of two mechanical actions (READ a real file, PATCH real
bytes), derives the operator from the bytes (`patch.js`: the model is never
trusted with its own op label), runs the caller's declared test command, and
lets the exit code decide. A failing patch is reverted; nothing broken is
ever left on disk.

It is not a safety layer. The coherence gate's argument is capability: a
mechanism that removes the grounding becomes measurably worse at its job, not
merely less safe. *"If we have a morality governor, people will turn it off."*
The only version of this that holds is one nobody would want to disable
(`coherence-gate-ALIGNMENT-NOTES.md`, tier 3).

## 3. Prior art

The shape has several ancestries, and its parts are individually old. What
the project adds is a particular joint between them, said precisely in each
paragraph below.

**Stigmergy.** Grassé coined the word in 1959† for termites: the trace left
in the environment by one action stimulates the next, by the same or another
agent, with no plan and no message. Wilson's *The Ants* is the handle this
repo already uses (`kernel/stigmergy.js`: deposits, evaporation, a learned
order of routes, a scout that still tries the untried). Dorigo's ant-colony
optimization (1992) made the trail an algorithm, and the open-source and
wiki literature (Heylighen, Elliott, mid-2000s) argued that large-scale
human collaboration on shared artifacts is stigmergic. We take the
coordination law and refuse the metaphor where it would mislead: in
coding, the trace is a typed entry with an address, and what is deposited is
an idea, not a chemical.

**Blackboards and tuple spaces.** Hearsay-II (Erman, Hayes-Roth, Lesser,
Reddy, built 1971–76, published 1980)† is the direct ancestor of the shape:
independent knowledge sources that never call each other, alter hypotheses
on a shared store at several levels, and are scheduled by what the store
currently holds. Gelernter's Linda (1985) made the shared space a
programming model. The 2025 LLM blackboard systems† (for example
arXiv:2507.01701 and arXiv:2510.01285) revive it: a central agent posts a
request, subordinate agents volunteer. Two differences are the whole point.
In those systems the agents read the board and decide; here **no model
reads the board** — the fold is mechanical, and the only models are the
writers, each blind to everything but its slot. And the board is
append-only and typed by an operator algebra, so a contradiction is a first-
class event with a defined resolution, not a state to be argued about.

**Proposal and mechanical selection.** This is the closest living kin, and
the field converged on it independently. AlphaCode† (Li et al., 2022)
sampled at scale and filtered by program behavior. CodeT† (Chen et al.,
2022) generated tests and chose among solutions by dual execution agreement
— the observation that the oracle can itself be a model's idea. FunSearch†
(Romera-Paredes et al., *Nature*, Dec 2023) paired an LLM that offers
creative code with an automated evaluator that "guards against hallucinations
and incorrect ideas," keeping an island database of programs by score.
AlphaEvolve† (2025) extended that to whole codebases with several
objectives. Agentless† (Xia et al., 2024) showed that a fixed
localize–repair–validate path, with no model deciding the next action, beat
the open-source agents on its benchmark. Cobbe et al.'s verifiers (2021),
Wang et al.'s self-consistency (2022) and Koza's genetic programming (1992)
are the older members of the family. Several of them keep more than one
winner — FunSearch's database holds many programs — so "keep the winner and
discard the rest" is too strong as a description of the whole family. What we
have not found is a system that selects against a score over a whole program
or a population **and** keeps the losers, slot by slot, as a typed record with
a stated reason. The joint we propose: the unit is a named slot, the losers
are data, and the artifact is the fold of a log rather than a population or a
single program. (That is a claim about what we found, not a survey.)

**The log as truth.** Event sourcing, and Kleppmann's "turning the database
inside out" (2015): the log is the record, every view is a projection, and
replay reproduces state. CRDTs (Shapiro et al., 2011) make concurrent
operations commute so replicas converge without coordination — an elegant
way to avoid conflict, and one we deliberately do not use, because commuting
two contradictory pieces of code is not a repair. Patch theory is nearer:
Mimram and Di Giusto's "A Categorical Theory of Patches"† models a merge as
a pushout, and Pijul builds on it. It resolves how edits to lines compose.
Naming the slot first changes the question to "which candidate for this
slot," which a pushout cannot answer and a test can.

**Code that is not bytes.** Meyer's design by contract (1992) and Claessen
and Hughes's QuickCheck (2000) are the lineage of the anchor's contract: a
declared input/output test executed on the candidate. Unison stores
definitions by the hash of their syntax tree, and Simonyi's Intentional
Programming and projectional editors treat the text as a view. The
correction that fixed the anchor's identity, verbatim: *"A codebase is not a
series of bytes. It is a series of meaningful arrangements of functions that
transform bytes that enter their periphery."* Hence an anchor's identity is
the function it computes, tested by running it, not the markup that
implements it today.

**Conjecture and refutation.** Popper (1963): knowledge grows by bold
conjecture and attempted refutation, and the source of a conjecture is
irrelevant to its standing. That is the stance, stated in two sentences. A
small model's output is a conjecture, a contract is an attempted
refutation, and the origin rides on the record without ever gating
admission. The house form of it is `ATTENTION-PROPOSES-PRIORS-DISPOSE.md`:
the host may attend, the measurement never does, and `structure-swarm.js`'s
own fold invariant — *the colony may try anything and is believed about
nothing.*

**In house.** `THE-ENZYME-PIPELINE.md` and `THE-STIGMERGIC-PIPELINE.md`
(many enzymes over one artifact tensor, coordinating only through it;
invariants I-one-writer, I-orthogonal, I-append, I-unitarity),
`THE-LOG-IS-THE-MEMORY.md` (the fold holds nothing the log lacks),
`THE-HOLOGRAPH.md` (the consumer gets a pattern, the record keeps the whole)
and `THE-CORE-MECHANISM.md`'s three families of comparison, which §4 uses.

## 4. The theory

**Ignorance is the guarantee.** The reason isolation works is not that the
model is told to behave. It is that the failure is impossible: a writer
handed an anchor's contract and current content cannot emit the document's
closing tag, because that text is not in its context and the fold never asks
it to reproduce it. The same shape is why `find`/`add` patching fails at the
rate it does (§6): when the model must copy old bytes exactly, the most
common failure is that it does not. An anchor removes the copy. This is
argued here, not yet measured for anchors.

**Three kinds of disposal, matched to three kinds of idea.** Reading the
module against `THE-CORE-MECHANISM.md`, and labelling it as a reading:

| disposal | what it compares the idea against | family |
|---|---|---|
| the anchor's contract, executed | an output declared before the candidate ran | prediction |
| `wellFormed` on the composed whole | a declared license for what a document is | deduction |
| `coherenceGate` on candidate vs current whole | the whole rebuilt with exactly one slot changed | perturbation |

`adjudicate` tries the contract first, because it is local, cheap and exact,
and falls back to the whole-document checks only when the contract is absent
or cannot discriminate. The whole-document pass is the second line of
defence for problems no single contract could see, not the primary decider.

**Temporality is a real axis, and REC is what makes it one.** `foldCode(log,
template, {atSeq})` replays to any cursor. An ordinary SYN replaces a value.
A REC does something different in kind: it concedes what the anchor *meant*
and returns it to an unsettled gap until something INS-es it again, so a
cursor just before a REC and one just after can disagree about the anchor's
meaning, not only its latest value. This is `grid.js::concedeEvaluation` and
`build-log.js::rezeroBuild` one register over. It is the operator that lets
a log carry an *understanding* changing, which a diff cannot.

**A pointer is a referent.** An anchor's settled value may be content or a
pointer to another anchor (`resolveAnchor` follows the chain, refusing a
cycle). It is `nesting.js`'s `claim:<id>` end-slot in code: two anchors that
must behave identically can be one referent addressed twice, so they cannot
silently drift apart. The splice-only version could not express that
invariance at all.

**The scaffolding is the product.** The standing measurement behind the
whole bet is `harness-baseline-RESULTS.md`: twenty basic Python tasks, the
engine's own `/v1/code` loop, no hand-written solutions. A synthesized stub
with no model scores 0/20. gemma2:2b alone scores 15/20 in two runs. After
the tournament, annealing, executed diagnosis and arity fixes, two small
mouths together reach 19/20 (95%), with single-run variance of about two
tasks. The document's own sentence is the thesis: *"Mouths are
interchangeable; the scaffolding is the product."* That is a measurement of
the `code-loop` path, with whole-file `find`/`add` patches and an external
test as the void. It is evidence for the method's premise, and it is not
evidence for the anchor log, which has not been run that way (§7, R1).

**Ideas are cheap, and cheap ideas collapse.** The same document measures
what a small mouth does with freedom: it repeats itself. Cold draws cycled
two attractors for nine straight draws on one task; another task re-sent the
identical failing body 78 times across 34 runs. "The right answer was never
IN the cold distribution." The fix was an annealing schedule over draws
(temperature from about 0.18 to 0.74), which converted the first stuck task
on its first annealed run. So an idea is not free: its diversity has to be
bought, and it can be measured.

## 5. How we got here

The path is on the record, and nobody designed it in advance. Each step is a
correction.

- **A pipeline of grounded critics** (council v1). Four readers, each citing
  scripture as the operative reason to act well, funnelled into one
  synthesis call that rewrote the whole file. The funnel is where both live
  regressions landed (a broken ternary, a lost `<audio>` tag).
- **Remove the funnel** (`podcast-nary-autonomy-falsify.mjs`): two isolated
  writers, one orthogonal feature each, a literal string splice, zero
  synthesis calls. 3/3 against 0/3 on the two known defects, on one small
  model and one task — the script's own disclosure.
- **Remove the scripture** (`podcast-nary-structural-properties`): the same
  3/3 with the four properties renamed to what they structurally are —
  calibration, consistency, invariance, other-modeling — and no citation in
  any writer's prompt. Identical outcome and a little faster. If the
  citations had been carrying weight, the mechanism would have been
  moralizing rather than reasoning; their absence mattering not at all is
  the stronger result.
- **Remove the byte range** (`code-anchor-log.js`, landed 2026-09-30, #144).
  A writer given an arbitrary slice has nothing structurally stopping it
  overstepping the slice. A named anchor with a contract does. The same pass
  found the whole-file harness echoing a 2,500-character file unchanged six
  times running while "fixing" one thing, and was then "fixed" with ad hoc
  splicing scripts instead of the system already in the repo. The drive
  script is the correction of that.
- **In parallel, the code loop** (`/v1/code`, 2026-09-19 to 09-29):
  find/add patches, the operator derived from bytes, tests as the void,
  revert on failure, a tournament of K draws per round, a witness for the
  attractor cycle, and three real local-model bugs found live in one run
  (`0ca24c0`): an undiagnosed connection failure, a model-id prefix Ollama
  rejected, and a syntax checker that reported a stale error for five
  consecutive rounds.

The pattern is the project's: the failure was measured first, the principle
was named after, and each simplification made the next failure more
informative.

## 6. Where it stands in the code

| piece | state |
|---|---|
| `code-anchor-log.js` — propose, settle, resolve pointers, adjudicate, concede, fold at cursor | built; 10/10 tests, no model in them; driven live by one-writer-per-anchor scripts |
| the anchor drivers (`drive`, `refold`, `revise-style`, `pathos-repair-loop`, `visual-polish`) | exercised with gemma2:2b; one contract (`escapeHtml`) of four anchors |
| `coherence-properties.mjs` — behavioral scorers, self-check against tampering | measured: 3/4 wrongly halted legitimate edits before the behavioral rewrite, 5/5 adversarial cases after |
| `code-loop.js` — K draws, annealing, revert, derived op, executed diagnosis | measured: 0/20 control, 75% single mouth, 95% two mouths; a different artifact model (files, not anchors) |
| `kernel/stigmergy.js` — deposit, evaporation, learned order | built; used by `structure-swarm`, `hard-read`, the route layer, and (since 2026-10-01) `slot-colony.js` and the fielded swarm's app path (#148); **still not imported by the anchor log or `code-loop.js`** — §11 |
| `podcast-app-council.mjs` v2 and `podcast-app-ledger.js` — the production council | still the byte-span splice over a whole-file ledger; the anchor log is not wired in |
| `code-structure.js` — declarations, call edges, a DMD-cut `codeGist` | built; reads code structure; identity from declaration syntax, never casing |
| SEG and CON on the anchor log | named, not built |

## 7. Roadblocks

These are ordered by how much of the claim stands on them.

**R1. The two halves have not met.** The anchor log can adjudicate several
ideas for one slot, but `adjudicate` has only ever seen candidates built by
hand in unit tests; the drive scripts propose one writer per anchor per
round, so no contest has happened with real small-model proposals. The code
loop has real plural proposals, but it keeps the first green and discards
the rest, and because its server process "has no browser ledger to land it
on," its refusals are returned as round records, not appended to a log. One
path has the plurality and no log; the other has the log and no plurality.
The central claim of §1 — plural ideas, reconciled mechanically, on the
log — is therefore unmeasured. *(An earlier reading of this repo in this
session said the ideas are never plural in a live run. That was true of the
anchor path and false of the code path; it is corrected here.)*

**R2. Diversity collapse.** §4's attractors are the first real wall. If a
small model offers the same wrong idea nine times, adjudication has nothing
to adjudicate. Temperature is a blunt tool: the annealing schedule is a
sampler parameter chosen against one task, and the swarm's exploration rate
(`EXPLORE = 0.35`) is, in its own comment, "chosen by hand, not yet measured
against a null" — the same debt P4 names for every constant in this repo.

**R3. The oracle is the bottleneck, and it is also an idea.** The fold is
exactly as good as its contracts. Today one of four anchors has one;
everything else falls through to well-formedness and the coherence gate,
which are structural. And a contract written by the same small model is a
conjecture too — CodeT's lesson. It needs its own disposal: a contract that
passes a deliberately broken candidate, or fails a known-good one, is not an
oracle. This is II.23 applied to the checker (a statistic earns its use by a
control built to fail, and a gate that fails everything or nothing has
resolved nothing). The coherence gate's own history is the warning: its
scorers wrongly halted three of four legitimate edits until they were made
behavioral.

**R4. The decomposition is hand-supplied.** The skeleton, the anchor list and
the neighbours' interfaces are typed by a person, and the drive script says
so. Each prompt contains sentences like "there is ALREADY a function named
`escapeHtml(str)`." That is the *"dependency order of reality"* the
correction said would make the whole coherent, and today it is a human's
reading, in prose, in a prompt. `revise-style` is the same debt one level
down: it did the SEG's job with a regular expression, merging a rule inside
the `style` anchor, and it reads a file from a previous session's scratch
directory, so it cannot be re-run.

**R5. Identity is a string.** Two writers who name the same function
differently never unify, and two who name different functions identically
collide. The reading side already knows better: `code-structure.js` refuses
to grant a function identity from the shape of its name, and the notes ledger
measured that distributional company cannot identify an act (`saw`/`wrote`
beat `looked`/`gazed`). The anchor log uses neither. It is the referent
problem again, in the one domain where it is most solvable (§9).

**R6. Stigmergy without a pheromone.** The coding path has the shared
environment and none of the feedback. Nothing makes a prompt shape that
cleared its contract likelier next time. The layer exists
(`deposit`/`routeOrderFor`, a seven-day half-life) and is unused here. And it
comes with the oldest hazard in the family: reinforcement over a fixed
oracle converges on whatever the oracle rewards. The swarm met this with a
search-aware ceiling (trying more raises the bar) and held-out replication
before admitting a find as a skill. The coding path has neither yet.

**R7. Two ledgers for one app, and an unmigrated production path.**
`podcast-app-ledger.js` (whole-file rounds, which the council uses) and
`code-anchor-log.js` (anchors) record the same artifact in two shapes. The
council still splices byte spans, which is what the anchor log's header says
it replaces.

**R8. Cost, on this hardware.** Anchors multiply calls: anchors × draws ×
rounds. `OLLAMA_NUM_PARALLEL=1` serializes generation however independent the
writers are; one 8B model took 19 minutes per task; a measured 55% run was
contention, not regression; and on its worst run the streamed path lost 8 to
12 of 15 coder-model draws to truncation (named, not yet isolated), which
burns ideas in transit. A scheme whose
selling point is cheap ideas has to keep them cheap.

**R9. The wall that does not move.** All of the above establishes
**coherence**: the fold is lint-clean, every contract passes, nothing
regressed. None of it establishes **correspondence** with what the person
wanted. A model can write a clean, contract-satisfying, regression-free
counter that nobody asked for. Only a person is an oracle for intent, which
is why the header ends in *"perhaps getting a manual INS."*

## 8. What is next

Each step carries a control built to fail, which is the house rule: a run
that reports only successes has demonstrated nothing.

1. **Make the ideas plural on the log.** For each anchor, draw K annealed
   proposals, run them through `adjudicate` with a contract, and land every
   proposal and refusal on the append-only log. Measure P(exactly one
   clears), P(tie) and P(none) against single-draw pass rate on the same
   anchors. *Controls: a contract every candidate passes (tie rate must read
   1.0) and one none can pass (none must read 1.0). If the statistic does not
   move when the axis moves, it has not resolved anything. Falsifier: K draws
   do not beat one draw, or ties dominate.* This also closes R1 and begins
   R2.
2. **Make the anchor the address of the delta.** The code loop's `find` fails
   by not matching (38% of 109 patch rounds `unlocated`, 76% of those the
   model authoring new code where it should copy old bytes). If a patch
   addresses an anchor instead of bytes, the failure class should be absent
   by construction. *Control: the unlocated rate on anchored edits against the
   38% baseline. If it is not near zero, the writer was shown something other
   than the anchor's content.*
3. **Derive the interfaces from the fold's own call graph.** `code-structure.js`
   already extracts declarations and call edges. Generate each writer's
   "there is already a function X" from that, not from a person's prose.
   *Control: prompts regenerated from the graph must match the hand-typed
   ones on pass rate. If they do worse, the hand-typed text was carrying
   something the graph does not.* Closes R4's first half.
4. **Build SEG.** Split an anchor found too coarse by its own structure (a
   stylesheet's rules are the obvious unit). *Control: replay the dark-theme
   revision through SEG and require byte equality with the regex merge it
   replaces.* Closes the second half of R4 and the unrepeatable script.
5. **Close the feedback loop, held out.** Deposit a trail only when a
   candidate clears a contract it was *not* selected on, route prompt shapes
   by trail, evaporate with a declared half-life (I-half-life). *Falsifier:
   trail-guided draws must beat shuffled-trail draws on held-out anchors.* R6.
6. **Identity by execution.** Unify two anchors only if they agree on the
   contract's inputs and on a perturbed set, replacing a duplicate with a
   pointer. *Control: two anchors that agree on the contract and differ off
   it must not unify — the falsification probe's twins, one register over.*
   R5.
7. **Migrate the council** onto the anchor log and make the whole-file ledger
   a projection of it. R7.
8. **Snapshot the fold.** The ledger's own storage law (recent raw, then
   folded snapshots, then release) applied to code, so the fold at entry
   10,000 is not a 10,000-entry replay.

## 9. What it may unlock

**Small models above their weight class, anywhere.** If the scaffolding is
the product, the model is a swappable part, and the 0/20 → 95% result says
how much of the work the part does not do. A 2B model on a phone is a
legitimate colony member.

**A fleet with no coordinator.** Writers share nothing but the log, with no
mutex and no shared mutable buffer between them (I-lockfree). That is the
property a heterogeneous, unreliable fleet needs: Heimdall's phones, a
laptop, a larger model that only joins for contested anchors. A writer that
drops mid-proposal costs one idea, not a coordination protocol. "Mouths are
interchangeable" stops being an observation and becomes a design rule.

**Identity for code, which prose never gets.** The notes ledger measured that
two statements' sameness cannot be read off their words, and the only
licensed route is a witness. Code has a better one: run both on the same
inputs. Behavioural equivalence is testable, so duplicate functions can be
found, collapsed into one referent, and kept from drifting. This is the one
place the referent problem is easier than in text.

**Review as reading the refusals.** Every proposal that lost is on the log
with a reason. Code review becomes reading the DEF entries — what was
tried, what broke, which check refused it — rather than reconstructing
intent from a diff. A REC marks the cursor at which an understanding changed
and records the stated trigger.

**A temporal semantics for code.** `foldCode` at a cursor answers "what did
this mean on Tuesday," and a build is reproducible from the log alone. Blame
at the anchor, with a reason, not at the line.

**A prior over failure.** The refusals accumulate into what small models get
wrong in this domain, as a received prior with its giver named, handed to the
next writer as facts about what has failed here and not as prohibitions
(the house rule, measured the hard way). `code-loop.js` already does it in
miniature: the attractor witness tells the model "this exact code already
failed."

**The same shape for everything with a slot and a contract.** A piece of
long-form prose is already a build (P191); a notebook analysis is already a
skill admitted through a gate; a UI is a template with anchors. Whether the
shape is medium-free is the open question the media runs keep answering the
same way: nothing new found, which is the weak evidence for generality and
not yet a proof.

## 10. The walls that stay

Nothing here crosses from coherence to correspondence (R9). The person is the
only oracle for intent, and the honest claim is not autonomy but that the
number of decisions only a person can make gets small and visible.

A contract is a conjecture until a control built to fail has failed it. The
fold is clean only relative to its oracles, and the self-check protecting the
oracle from tampering raises the cost of an attack without making it
impossible; deleting the gate is a governance question, and no code answers
it. What protects it at that tier is the thesis, and the thesis is
falsifiable: if grounded-versus-ungrounded ever stops showing a capability
advantage on some task, the argument weakens exactly there, and that is a
result.

And the ideas have to stay ideas. The moment a model's proposal is believed
because it is confident, fluent, or the first to arrive, the log has become
a transcript and the fold a guess.

## 11. Update 2026-10-01 — the colony and the 27 houses, measured

What was built since the first draft of this document, and what it does and does
not bear on:

- `organs/slot-colony.js` is the real colony (kernel/stigmergy.js, the
  structure-swarm's discipline) sent at the slots of a coding unit;
  `organs/code-habitat.js` gives each filler a house — one of the 27 cells — and
  a coverage map. The species it was measured with are the fielded swarm's
  twelve (eoreader7 #148), which are **mechanical fillers, not model ideas**:
  nothing in that measurement bears on §8 step 1, the plural-ideas experiment,
  and that experiment is still the one this document waits on.
- What the measurement settles: the held-out gate refused every wrong
  candidate it was offered (on 26 redealt and 12 cross-slot slots, 10 refusals
  in all, every one from one species); the colony reproduces the swarm's own
  fills exactly; **ordering the species by their houses, by hand, or by learned
  trail did not measurably beat the others** (the registered tests for it could
  not be passed — 37% of random orders already waste nothing); the one visible
  effect of the chain order is that 18 slots change which species fills them,
  and that depends on how the species were housed. The fills that depend on
  *which three examples were shown* are the categorical ones (`decide` refilled
  9 of 36 under other triples; `copy`, `branch`, `argmax` did not move).
- What it changes here: §3's "all of them keep the winner" was too strong and is
  softened; §6's stigmergy row is updated (the colony and #148 use it; the
  anchor log still does not) — with the finding that on these 80 slots every
  fill landed in pass 1, so the retry-and-environment half of the colony was
  never exercised;
  and the houses are a **map, not an oracle** — 21 of 27 are "leads", which
  cannot say what to build first.
- The review that preceded this update found the organ unsound against a
  hostile or merely buggy species (a species could rewrite its own gate, forge
  a fill, or erase a leak) and the null arm able to pass without exercising the
  gate. Both are fixed with tests written first; the account is in
  `eval/the-fold/results/slot-colony-RESULTS.md`.

## 12. Pending

- Step 1 of §8 is the measurement the whole document waits on. Nothing in §1
  about plural ideas is established until it runs.
- The citations unmarked in §3 are from memory.
- §4's claim that anchors remove the copy-old-bytes failure is argued, not
  measured; §8.2 is its test.
- No pointer to this document has been added to a `CLAUDE.md` yet; that is
  the house practice and is left for a decision.
- §11's colony result is one run on one species family; the species were
  fitted on the same task sets, and the held-out runs were written by the person
  who wrote the tasks. A set written after the species, and a real-model
  proposer in place of the mechanical ones, are both still to do.

*Standing: nomination. The code wins disagreements; the controls win
arguments about the code; the log keeps both.*
