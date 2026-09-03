# The module census — every verb, held against the cube

Companion to `THE-27-CELLS.md`, read the other direction. That document is
**cell-first**: 27 addresses, one curated example organ each, drawn from
`organs/capacities.js`'s registry of ~29 entries. This document is
**module-first**: every substantive module across `the-fold` and
`eoreader7` — roughly 220 files once tests, shims, generated data, and
one-off eval drivers are set aside — read once and asked the same
question capacities.js asks of its own 29: what ACT does this do, and
which of the 27 cells (9 operators × 3 grains) does that act occupy, if
any.

Standing: **nomination**, same register as `THE-THREE-MATHEMATICS.md` and
`THE-WAYS-OF-KNOWING.md` — a reading of the codebase, not a law. `POLICIES.md`
and `organs/capacities.js` win on any conflict about what is actually
*registered*; this document's own contribution is everything **outside**
that registry, and its judgments about those modules are this document's
own, not certified elsewhere. Where a row disagrees with capacities.js,
capacities.js is right about what is *registered* — this document says so
explicitly rather than silently overriding it.

**The rule this document is built to honour, stated once so it doesn't
need repeating in every row: the cube classifies MOVES, never content.**
95.7% of naive content-based cell assignments survived shuffling the words
in a paragraph — "what is this module about" is a refuted question. Every
row below answers "what does this module's code DO" instead, and a good
fraction of modules — surface orchestrators, DOM renderers, worker
harnesses, pure data tables, re-export barrels, whole-cube composition
substrates — honestly do not reduce to one act. Those are reported as
`—` (not-applicable) rather than forced into a cell, exactly as
`moves.js`'s own header insists an empty cell must be named as a lead, not
papered over.

---

## 1. Method, so the next pass can extend rather than repeat it

Nine parallel research passes plus one direct gap-fill (below) covered
every non-test, non-shim, non-generated file in `the-fold`'s repo root
and `eoreader7/native/{organs,kernel,adapters,interpretation,memory}` and
its own `assemblies.js` — 221 files, ~370 verb-rows (several files
export more than one distinguishable act; several others export none).
For each file, the standing instruction was:

1. Read the header comment and exported functions (whole file if short;
   header + exports for anything large) and name the DOMINANT verb(s) as
   a short English phrase.
2. **Prefer the file's own word.** A large share of both repos already
   self-declares EO typing in comments — a literal `CELL = {op, grain}`
   export, an `eoOperation({op, grain})` call, or prose like "this is
   DEF · Ground · declared." Where a file says so, this document quotes
   it and marks the row **self-declared**, checked against `cube.js`'s
   actual domain lock (Existence={NUL,SIG,INS}, Structure={SEG,CON,SYN},
   Interpretation={DEF,EVA,REC}) rather than trusted blind — one
   contradiction surfaced this way (§4).
3. Where nothing is declared, reason to the best-fitting operator+grain
   and mark the row **reasoned** — a nomination, not a certified fact.
4. Where a module genuinely performs no single classifiable act, say so
   and name which non-act kind it is (surface/orchestrator, UI/DOM
   rendering, worker/process harness, pure data/registry, re-export
   barrel, whole-cube composition substrate, pure math/statistics
   utility) rather than forcing a row.
5. Where `organs/capacities.js` already registers the file, this
   document says **registered** and gives the capacity id, rather than
   re-deriving what that file already settled.

**One gap, caught and fixed rather than left silent.** An early batch
assignment had an off-by-one that skipped three files —
`the-fold/void-loop.js`, `void-narration.js`, `void-shape.js` — between
two research batches. `void-shape.js` in particular is the registered
`extent` capacity (SEG·Ground), needed to check a suspected overlap with
`the-fold/seg.js`. All three were read directly and are included in §5.1
under "gap-fill," with the seg.js/void-shape.js relationship reported
as a genuine finding (§3), not a duplicate.

**What is deliberately excluded, and why:** test files (`*.test.mjs`,
`*.test.js`, `native/tests/`, `native/conformance/`) test acts, they are
not acts; one-off eval/experiment drivers (`the-fold/experiments/*.mjs`,
`eoreader7/native/eval/**`, `live_priors/scripts/*.mjs`) are re-runnable
measurement records per this project's own standing posture (P19/P27),
not organs; `live_priors` as a whole is a corpus-management repo (fetch
scripts, prior-building scripts) one level removed from the reading
instrument — it supplies received data *to* organs (POS priors,
morphology, determiners) but performs no move of its own on material, so
it is named here and not censused; `handbook/*.md` is prose explaining
the algebra, not code executing it; generated fixtures/JSON results are
data, not verbs.

---

## 2. The legend — expand any `Op·Grain` cell below into terrain and stance

Terrain and stance are always DERIVED from (operator, grain) — never
chosen — so one small table replaces a Terrain/Stance column on every
row that follows:

| Operator | Domain | Mode | at Ground | at Figure | at Pattern |
|---|---|---|---|---|---|
| **NUL** | Existence | Differentiate | Void · Clearing | Entity · Dissecting | Kind · Unraveling |
| **SIG** | Existence | Relate | Void · Tending | Entity · Binding | Kind · Tracing |
| **INS** | Existence | Generate | Void · Cultivating | Entity · Making | Kind · Composing |
| **SEG** | Structure | Differentiate | Field · Clearing | Link · Dissecting | Network · Unraveling |
| **CON** | Structure | Relate | Field · Tending | Link · Binding | Network · Tracing |
| **SYN** | Structure | Generate | Field · Cultivating | Link · Making | Network · Composing |
| **DEF** | Interpretation | Differentiate | Atmosphere · Clearing | Lens · Dissecting | Paradigm · Unraveling |
| **EVA** | Interpretation | Relate | Atmosphere · Tending | Lens · Binding | Paradigm · Tracing |
| **REC** | Interpretation | Generate | Atmosphere · Cultivating | Lens · Making | Paradigm · Composing |

Read a cell like `EVA·Figure` as: row EVA (Relate, Interpretation) ×
column Figure → **Lens, Binding**. This is the whole of `cube.js`.

---

## 3. Headline finding — every cell is independently corroborated, and the ground row is thin everywhere, not just in three cells

`organs/capacities.js` already reaches 27/27 with ~29 curated entries.
The question this census actually answers is different: **once every
other module in both repos is read the same way, does the coverage hold
up, or was it 29 lonely examples?** Tallying the `Cell` column across
every row below (~262 single-cell rows; compound/multi-cell rows like
`cast.js`'s SIG+INS are counted separately in §3.3) gives a real answer.

### 3.1 Every one of the 27 cells has a SECOND organ, independently

Two cells carried exactly one organ in the curated registry before this
pass — `INS·Ground` (`preflight`) and `REC·Ground` (`regime`) — and both
gained a genuinely independent second instance, found for unrelated
reasons by unrelated authors:

- **INS·Ground** — `adapters/text/revision.js` self-declares
  `eoOperation({op:"INS", grain:"Ground"})` for admitting a **raw**
  referent occurrence (before it earns full referent status) — a
  different specimen of "generating ground where none exists" than
  `proof.js::preflightQuery`'s web search, arrived at from the opposite
  direction (perceiving text, not searching the world).
- **REC·Ground** — `kernel/temporal-reference.js` self-declares
  `advanceReferenceGround` as "the narrative's ambient 'now' re-zeroing,
  past kept" — a second, text-native instance of the same re-zero shape
  `source.js::atmosphereBoundaries` (registered as `regime`) reads off
  the engine's atmosphere loop.

No cell in the 27 depends on a single module for its evidence anymore.
That is a stronger claim than 27/27 coverage by itself: it means the
algebra is not a curated fit to 29 hand-picked examples, it is a pattern
that unrelated organs, built for unrelated reasons across text, audio,
and MIDI, keep landing on independently.

### 3.2 The ground row is thin everywhere — not only in the three cells that happened to read zero

Tallying by **grain** across all ~262 single-cell rows:

| Grain | Rows | Share |
|---|---|---|
| Figure | 146 | 56% |
| Pattern | 71 | 27% |
| Ground | 45 | 17% |

`THE-27-CELLS.md` already named "the three empty cells are all
Ground-grain" as a real pattern in the curated 29. This census shows it
generalizes past the registry: **Figure-grain acts — one difference from
its ground, a single referent, edge, or checked claim — outnumber
Ground-grain acts more than three to one across the entire codebase**,
with Pattern (recurrence, corroboration, kind-forming) in between.
Maintaining or declaring an ambient BEFORE any figure appears is
consistently the rarest kind of organ this instrument builds, in every
domain and every mode, not an accident of which 29 examples got chosen
first.

### 3.3 By domain and by mode

| Domain | Ground | Figure | Pattern | Total |
|---|---|---|---|---|
| Existence (NUL/SIG/INS) | 17 | 34 | 20 | 71 |
| Structure (SEG/CON/SYN) | 18 | 63 | 25 | 106 |
| Interpretation (DEF/EVA/REC) | 10 | 49 | 26 | 85 |

| Mode | Ground | Figure | Pattern | Total |
|---|---|---|---|---|
| Differentiate (NUL/SEG/DEF) | 22 | 44 | 17 | 83 |
| Relate (SIG/CON/EVA) | 18 | 70 | 35 | 123 |
| Generate (INS/SYN/REC) | 5 | 32 | 19 | 56 |

**Relate is the dominant mode (47% of all rows), and Generate is the
rarest (21%).** That is the codebase's own self-portrait: this is
overwhelmingly a *checking, binding, and comparing* instrument (the
grounding ladder, the witness tier, referent resolution, corroboration)
built on top of a much smaller core of organs that actually *compose new
wholes* (build-log's births, the reaction circuit's derivations,
templates' renderings, hyperlexicon's re-sightings). Structure is the
densest domain (40%), carried almost entirely by one cell (§3.4) — this
instrument is, above all, in the business of relating things.

### 3.4 The single densest cell, by a wide margin: CON·Figure (Link, Binding)

38 of ~262 rows (14.5%, more than double the next cell) land here.
Partial roster, spanning both repos and multiple media: `hypergraph.js`'s
`makeRelationReader` (registered `relations`), `pronouns.js` (pronoun→
referent, self-declared), `declension.js` (self-declared), `relations.js`
(self-declared, "the graph's medium-specific mouth"),
`relations-case-marked.js`, `contest.js::adjudicate` (independently
self-declared as the SAME cell by four different callers —
`completion.js`, `affordance-reference.js`, `holder-scope.js`,
`pending-sig.js`'s resolution — before `scoped-kind.js` tried and failed
to reuse it at a different terrain, §4), `identity.js` (kernel),
`relation-composition.js`, `discourse-referents.js`, `anchoring.js`,
`morphology.js`, `propernoun-fold.js`, `perspective-claims.js`,
`speaker.js::speakerAt`, `seek.js`, `succession.js`, `chains.js`,
`network-standing.js::directedEdges`, `primary.js::rankPrimary`,
`ranke.js::footnoteLeads`, and `overtones.js::overtoneOverlap` (audio) /
`memory/activation.js` (self-declared `CELL = {op:"CON", grain:"Figure"}`)
— an independent cross-medium convergence on the identical cell, which is
the concrete specimen `THE-THREE-MATHEMATICS.md` §VIII.1 (Binding
transfers across the three mathematics) asks for.

**Second densest: EVA·Figure and DEF·Figure, tied at 22 each** — the
grounding ladder's own two halves (does the material say this / is this
figure legitimate), carried across `grounding.js`, `cite.js`, `quotes.js`,
`web.js`, `priors.js`, `provenance.js`, `firewall.js`, `witness.js` (both
the-fold's code-integrity sense and organs' testimony sense —
**deliberately different acts sharing a name**, flagged in §4),
`kind-standing.js`, `nesting.js`'s wall, `perspective.js`, `obligations.js`
(kernel), `fold-gate.js`, and more.

**The thinnest non-Ground cell: SEG·Pattern (Network, Unraveling), at 3**
— `unravel.js` (registered, self-declared), `nesting.js::depthOf`,
`surprise-segments.js::recursiveSegments`. Cutting a *recurring pattern*
apart at its own seams (rather than cutting one figure, or one ground) is
rare by the nature of the act: it needs a whole structure to already
exist before there is anything to unravel.

### 3.5 Cut by stance instead of grain, and the thinness sharpens into something actionable

§3.2-3.3 cut the same 262 rows by grain and by domain/mode separately.
Stance (mode × grain, cutting across all three domains at once — the
axis `capacities.js`'s own "9 FULL stances" milestone tracks) is a third
cut, and it is the one that turns "the Ground row is thin" into a
specific, checkable claim rather than a general impression:

| Stance | Ground∪Figure∪Pattern cells | Rows | Share |
|---|---|---|---|
| Binding | SIG·Figure, CON·Figure, EVA·Figure | 70 | 27% |
| Dissecting | NUL·Figure, SEG·Figure, DEF·Figure | 44 | 17% |
| Tracing | SIG·Pattern, CON·Pattern, EVA·Pattern | 35 | 13% |
| Making | INS·Figure, SYN·Figure, REC·Figure | 32 | 12% |
| Composing | INS·Pattern, SYN·Pattern, REC·Pattern | 19 | 7% |
| Clearing | NUL·Ground, SEG·Ground, DEF·Ground | 22 | 8% |
| Unraveling | NUL·Pattern, SEG·Pattern, DEF·Pattern | 17 | 6% |
| Tending | SIG·Ground, CON·Ground, EVA·Ground | 18 | 7% |
| **Cultivating** | **INS·Ground, SYN·Ground, REC·Ground** | **5** | **2%** |

**Binding and Cultivating are the two extremes, 14× apart, and the gap
is bigger than either the Generate-mode share (21%) or the Ground-grain
share (17%) alone would predict for their intersection** — Cultivating
is thinner than independence between the two would suggest, a real
interaction rather than two ordinary-sized thin factors compounding.

**The correct reading of this is narrower than "a missing capacity," and
worth stating precisely so it isn't overclaimed.** Every Cultivating
organ censused here runs constantly in a live reading —
`source.js::atmosphereBoundaries` chunks every ingested document,
`predigest.js::compilePriors` sediments every prior reading,
`proof.js::preflightQuery` fires on every materialless grounded turn. The
thinness is not absence and not low usage; it is **redundancy** — how
many INDEPENDENT organs exist at that cell to check each other by
agreement or disagreement. This is `organs/corroboration.js`'s own
question (`distinctSources`/`independentReadings`/`distinctRecipes` —
does ≥2 independent instruments back this claim) asked one level up,
about the codebase's organs rather than about a claim in the material:
Binding's 70 rows can and do converge on each other (§3.4's `contest.js::
adjudicate`, self-declared identically by four separate callers, is
exactly this kind of convergence); Cultivating's organs have no sibling
to disagree with. A subtle bug in any one of them would go unnoticed by
this instrument's own triangulation machinery, not because nobody looked,
but because there is structurally nothing else there to compare it to.

**This does independently corroborate one standing claim, from an
unrelated direction.** `NEXT-PASSES.md` already declared floors 0-4
(arithmetic and geometry — units, edges) done to the material's own
ceiling and named the remaining work "calculus over earned units":
accumulation, judgment, revision, i.e. Pattern-grain. §3.2's grain tally
(Ground 17% / Pattern 27% / Figure 56%) reaches the identical priority
from a bottom-up verb count, a completely different method than the
top-down reasoning that produced the original claim. Two independent
measurements landing on the same answer is worth more than either alone.

**What this section does NOT license:** neither the order-7 pronoun
ceiling nor the ~2% corroboration wall (both measured and diagnosed
elsewhere, with named causes — cold-start activation and paraphrase-
intolerance respectively) traces to a thin cell here. Reading a low
organ-count as the CAUSE of a measured ceiling would be the same
coherence-for-correspondence swap `P60`'s own precision-retraction
already caught this project making once; this section only claims that
the calculus layer is structurally sparse in DISTINCT IMPLEMENTATIONS,
not that any specific measured ceiling is explained by it.

---

## 4. Discrepancies this pass surfaced, disclosed rather than silently fixed

Consistent with this project's own rule for the last time a table like
this caught something (`organs/capacities.js`'s header: "two entries were
caught wrong by that check while this table was being written and are
worth naming rather than quietly fixing") — three findings, kept exactly
as found:

**A real, quotable domain contradiction: `kernel/scoped-kind.js`.** The
file's own header prose claims its mint/resolution pair lands on
"Existence·Pattern, Kind" — but its own code calls `cellOf("SYN",
"Pattern")` and `cellOf("CON", "Pattern")`, and SYN/CON are
**Structure**-domain operators (SEG/CON/SYN), which can never reach
`Kind` (an Existence-only terrain, reached only by NUL/SIG/INS). The code
mechanically computes `Network` both times — internally consistent with
itself, but not with what the module's own comments say it is doing.
This is not fixed here (it is eoreader7 kernel code, and this document is
a census, not a patch); it is named so the next pass that touches
`scoped-kind.js` does not have to re-derive the mismatch.

**A softer looseness, not a contradiction: `kernel/temporal-reference.js`.**
Its `RESOLUTION_CELL` comment for `resolveAnaphoricTense` says the act
"lands on the same terrain the target (a ground) lives in" — but the
target ground is established by `advanceReferenceGround` at `REC·Ground`
(terrain **Atmosphere**), while `cellOf("CON","Ground")` mechanically
computes terrain **Field**. Both are legitimately `Ground`-grain, so the
comment likely means "grain," not "terrain" — read charitably rather than
flagged as a bug, but worth a one-word fix (grain→terrain precision) next
time this file is touched.

**Not a bug, but worth stating plainly so it is never mistaken for one:
`grid.js`'s composed acts (the terminal/act-language layer) may declare a
terrain that diverges from the operator's domain lock, by explicit,
documented design** — CLAUDE.md's own "terrain reconciliations" already
name this ("terrain is medium-blind, past the engine's own domain lock…
`at <terrain>` is authoritative here, never re-derived from the verb's
own operator letters"). Two rows in this census surface real instances:
`the-fold/web-hunt.js` composes an EVA act (Interpretation-domain)
declared `at Link` (a Structure terrain) through `grid.js`, and
`capacity-runner.js::landSelfAssertion` composes a DEF act
(Interpretation-domain) declared `at Field` (a Structure×Ground terrain)
the same way. **These are a second, separate convention from the strict
`cube.js`/`capacities.js` registry**, which does lock terrain to domain —
the terminal's composition law and the registry serve different purposes
(an actor's declared posture vs. a classified organ), and this document
keeps them apart rather than reporting either as contradicting the other.

**Two same-named, different-cell modules, kept apart on purpose.**
`witness.js` exists twice with unrelated meanings: `the-fold/witness.js`
+ `organs/witness-sentences.js`'s underlying `corroboration.js::witnessNote`
family occupy the **testimony** sense (EVA·Figure, "does a passage say
this is true") while `the-fold/witness.js` itself is **code-compile
checking** (also reasoned EVA·Figure, coincidentally the same cell but a
completely different act — does a built artifact actually compile) and
`kernel/witness.js` is a third, distinct act (INS·Figure — admitting a
challenged candidate into a confirmed Observation). None of the three
should be read as the same organ under three names.

---

## 5. The full census

Columns: **Module** — path, repo-relative. **Verb** — the act, as a short
phrase. **Cell** — `Op·Grain`, or `—` when not-applicable (expand via §2).
**Basis** — *self-declared* (quoted or code-literal), *registered*
(capacities.js gives this exact module+fn a capacity id), *reasoned*
(this pass's own nomination), or *not-applicable*. **Note** — one clause.

### 5.1 `the-fold/` — repo root, alphabetical batch 1 of 4 (aperture.js – grid.js)
| Module | Verb | Cell | Basis | Note |
|---|---|---|---|---|
| aperture.js | measure/gate S1's belief-width and contract the present window on surprise | EVA·Ground | reasoned (capacities.js registers `atmosphere`→EVA/Atmosphere for this file's `meterSnapshot`) | registry-assigned, not self-declared in file |
| app.js | dispatch a chat turn across dozens of doors/organs | — | not-applicable | confirmed surface/orchestrator: 50+ `*Turn` fns (arithmeticTurn, twoPassTurn, holonicTurn, actTurn, runTurn, reopenTurn, mustTurn, rankeTurn…) |
| arithmetic.js | detect + mechanically compute an arithmetic expression, never let the model generate the number | SYN·Figure | reasoned | compose the answer as a whole from operands+operator; moderate confidence, no clean canonical fit |
| artifact.js | cut a turn's raw text into typed segments (prose/code/table) | SEG·Figure | reasoned | header: "parseSegments is the whole surface"; cf. build-log.js/fold-log.js's own note "artifact.js literally snips the segment… PROPOSE = SEG·Figure" for this exact mechanism |
| bound.js | build a decoding-grammar (enum schema) so facts must be chosen, never spelled | DEF·Figure | reasoned | draws the boundary of legal model output |
| build-log.js | maintain a build as an append-only, multi-operator task-log projection | — | not-applicable (self-declares per-entry) | spans INS(birth)/SYN(supersede)/REC(re-zero)/NUL(ask)/SIG(scout)/DEF(refuse)/EVA(witness) — substrate, not one act |
| builds.js | append-only content-addressed build log: hash, diff, project code | — | not-applicable | pure log/hash utility; CLAUDE.md: "unwired except `referencedBuild`/`BUILD_MESSAGE_MAX`" |
| chains.js | verify a generic chain's adjacency by cross-checked pointers, find closed segments | CON·Figure | reasoned | genre-blind generalization of relation-linking; also does SEG-like segmentation (secondary) |
| claims.js | accumulate every tier's verdict for one claim into one epistemic state | — | not-applicable | pure ledger/registry (Map-based accumulator + renderer), no task-log/operator typing of its own |
| clearance.js | establish whether a figure clears its ground (presence→recurrence→ambiguity→binding ladder) | NUL·Figure | **self-declared**: `CELL = { op: "NUL", grain: "Figure" }` | domain(NUL)=Existence matches stated Figure→Entity, consistent |
| code-scout.js | resolve an instruction's words to a declared code referent's definition span | SIG·Figure | reasoned (cf. build-log.js's own `scoutBuild` = "SIG·Figure·produced… attention lands ON the log," the identical act) | also bundles `deltaOps` (SEG/INS/SYN-typed edit derivation), secondary |
| consequence.js | promote a reference to standing only on recurrence AND measured consequence | EVA·Pattern | reasoned | Pattern grain = "the difference that made a difference to the next ground," exactly recurrence+consequence |
| constitution.js | fold the constitution into one model-facing prompt paragraph + an article→organ enforcement table | — | not-applicable | pure data/registry (a string constant + a table + two filters) |
| crown.js | render a merge verdict into one template-assembled, trace-verified sentence | SYN·Figure | reasoned | "renderCrown… the one public entry point"; a whole composed from claim-field tokens + closed connectives |
| description-standing.js | decide whether a definite description is a genuine referent, by company self-consistency vs. population null | NUL·Figure | reasoned (cf. clearance.js's self-declared identical "does this figure clear its ground" shape, applied to descriptions) | II.23-style null-spending establishment test |
| dialogue-graph.js | classify how a stated edge fares in a second speaker's graph across turns (adopted/contested/echoed/untouched) | EVA·Pattern | reasoned | tracks a figure's fate turn-over-turn — Pattern grain by definition |
| editor.js | wire the monaco code editor (load, create, get/set value, syntax-highlight) | — | not-applicable | UI/library-wiring module, no operator content |
| explore-bridge.js | translate a chat ref address into an Explore-tab URL, depositing the source text | — | not-applicable | narrow cross-app plumbing/bridge (address translation + one POST + window.open) |
| fact-block.js | extract a deduped, question-ranked fact digest from the material's bound edges for the model to read first | SYN·Figure | reasoned | composes the fact block from already-bound relation edges; `dedupeSourceText` is a secondary SEG-like helper |
| firewall.js | refuse model-facing text that names this instrument's own apparatus | DEF·Figure | reasoned | "the wall between the TALKING and the THINKING, enforced" — a boundary/refusal act |
| fold-log.js | maintain a fold as an append-only, multi-operator task-log projection | — | not-applicable (self-declares per-entry) | same shape as build-log.js; PROPOSE still typed SEG here (the convention build-log.js's own header says was later corrected to INS) — likely a stale/superseded duplicate |
| fold.js | fold a turn into System-1 paraphrase + System-2 addressed record, bounded for the prompt | CON·Ground | reasoned (capacities.js registers `field`→CON/Ground for this file's `advanceSummaryFold`) | file also bundles record-building/prompt-assembly beyond the registered act |
| folds-pane.js | sort/filter/parse the Folds panel's data (no DOM) | — | not-applicable | pure UI-support utility |
| github-pane.js | wire the GitHub tab: device-flow connect, pull/push one file, sync skills/history | — | not-applicable | surface/orchestrator (UI pane dispatching several independent egress actions onto github.js's pure helpers) |
| github.js | shape device-flow/Contents-API payloads, base64, repo-path convention, pull-merge diffs | — | not-applicable | pure data/shape utilities, zero network (egress lives in explore-server.mjs) |
| grid.js | parse the terminal language's composition law into typed events on an append-only log | — | not-applicable | multi-operator composition-law engine spanning all nine operators/terrains/stances — the substrate other capacities compose against, not one act |

### 5.2 `the-fold/` — repo root, alphabetical batch 2 of 4 (ground-ledger.js – relations-chain.js)

| Module | Verb | Cell | Basis | Note |
|---|---|---|---|---|
| ground-ledger.js | freeze a ground version, score a turn against it once (retroactivity refused) | INS·Figure | self-declared: code `operator: "INS", grain: FIGURE` | RESULT entries carry no operator per produce()'s discipline |
| handbook.js | parse a markdown TOC into an addressable chapter list | — | not-applicable | pure data/table |
| holon.js | decompose a task into parts, run retrieve→execute→check→correct per part | — | not-applicable | surface/orchestrator |
| interact.js | conduct/verify/corroborate/enumerate/intervene on a counterpart that answers back | — | not-applicable | separate axis — MHC interaction rungs 5-11, parallel to the 9-op cube |
| library.js | fold append-only add/remove ledger into "My files" | — | not-applicable | pure data/registry |
| links.js | check a cited URL against material containment then fetched bytes; strip dead links | EVA·Figure | reasoned | mirrors web.js's registered EVA·Figure one register over, for URLs |
| log-pane.js | render Log tab record rows; toggle terminal drawer | — | not-applicable | UI/DOM rendering |
| metacognition.js | accumulate confirmed/corrected standing per declared cell from S1↔S2 agreement, revisable | INS/SYN·Figure (observe); REC·Figure (concede) | self-declared: code `operator: prior ? "SYN" : "INS"`; concede lands REC·Figure | classifyAtom/assessAgreement are un-typed helpers |
| mhc-interact.js | score which MHC interaction order a counterpart-driven task completed | — | not-applicable | separate axis |
| mhc.js | run a declared-order task against real organs, score quantally | — | not-applicable | separate axis — Commons's MHC depth scale, explicitly distinct from the cube |
| model-routing.js | pick which model id serves a turn | — | not-applicable | pure routing logic |
| moves.js | enumerate the 27-cell move space; compute organ coverage | — | not-applicable | meta/registry tool |
| network.js | bind a recurring shape-typed line arrangement into an unlabelled system, null-tested | CON·Pattern | self-declared + registered (`network`) | — |
| pace.js | measure this instrument's own call latency/throughput | NUL·Ground | reasoned | echoes measure.js's NUL·Ground ethos |
| pass-delta.js | diff S1's vs S2's asserted names into confirmed/extended/corrected/diverged | EVA·Figure | reasoned | — |
| periodicity.js | test a declared line-shape period's lift against a within-population shuffle null | NUL·Pattern | reasoned | same shape as testKindMembers's registered cell (different organ occupies it today) |
| predigest.js | merge sedimented per-work priors into one compiled, carried experiential ground | SYN·Ground | registered (`compile`) | also builds assertionEdges, a separate unregistered facet |
| priors-toggles.js | fold append-only most-specific-wins on/off ledger over corpus paths | — | not-applicable | pure data/registry |
| priors.js | check a claim's status against live_priors, fold into provenance-carrying verdict | DEF·Figure | self-declared/registered (`priors`) | — |
| proof.js | turn a flagged claim into a world-search query; fold fetched pages into counted verdict | — | not-applicable | multi-capacity — only preflightQuery registered (INS·Ground); rest unregistered EVA-like logic |
| provenance.js | classify each answer sentence onto its ground (material vs model) from checks already run | DEF·Figure | reasoned | same cell as priors.js's checkPrior |
| proxy-api.js | translate OpenAI/Ollama wire request into one turn shape | — | not-applicable | wire-protocol adapter |
| read-source.js | adapt network.js's bound arrangements into seek.js's nav interface | — | not-applicable | adapter/surface bridging two organs |
| referent-fold.js | decide whether every occurrence of a bare candidate sits inside a longer established one's occurrences | SIG·Figure | reasoned | portable core is medium-agnostic by design |
| reflex.js | record the instrument's own cognitive acts on an append-only self-plane ledger; measure its surprise | — | not-applicable | self-plane organ, multi-function |
| relations-chain.js | link extracted relation edges to document-order neighbours and referent-siblings into a graph | SYN·Pattern | self-declared + registered (`graph`) | — |

### 5.3 `the-fold/` — repo root, alphabetical batch 3 of 4 (render.js – void-hl.js)

| Module | Verb | Cell | Basis | Note |
|---|---|---|---|---|
| render.js | render block/inline markdown-ish structure into DOM nodes | — | not-applicable | UI/DOM rendering |
| reopen.js | pick the last-opened source/fold/door from the append-only record | SIG·Figure | reasoned | marks/points at one past event, never re-admits |
| retrieval.js | recall which dormant records are relevant to a new question (cue-based activation) | SIG·Ground | reasoned | ranks whole citation history as ambient ground for a new cue |
| sameness.js | judge whether a set of records is a kind, an identity, or unrelated | NUL·Pattern | reasoned | kind=real value disagreement over shared slots |
| seed.js | ingest an external repo's file as a new build's seed, provenance carried forward | INS·Figure | reasoned | mirrors build-log.js's PROPOSE=INS·Figure |
| seek.js | resolve who/what stands in relation R to anchor A, from any 4-question source | CON·Figure | reasoned | same family as hypergraph.js's registered CON·Figure reader |
| seg.js | check whether a declared time unit (years/months/days) is fit to state the material's own spans | SEG·Ground | reasoned (cross-ref to CLAUDE.md SEG·Ground phrase — NOTE: that phrase's literal referent is void-shape.js::spaceFrom, registered as `extent`. seg.js may be a DISTINCT, overlapping SEG·Ground candidate — possible cluster/duplicate, flag for synthesis) | see note |
| segmentation.js | propose/supersede/concede a segment's extent or a pronoun's binding, cursor-dated | SEG·Figure | self-declared: "Both are SEG·Figure acts" | — |
| shape.js | ask a model, schema-constrained, for an answer's SHAPE before any content | INS·Figure / SYN·Figure | self-declared (partial) | "admits"←INS, "composition"←SYN verbatim; cardinality untyped |
| skills.js | dispatch a task through skill-match → slot-fill → model | — | not-applicable | surface/orchestrator |
| sources-store.js | persist/restore loaded sources to/from OPFS | — | not-applicable | pure browser-storage adapter |
| store-sql.js | derive insert/update/delete ops by diffing two live SQL snapshots | SEG·Figure | reasoned | "diff raw state, emit granular typed ops" |
| store.js | maintain database rows as append-only EOT event log, projected fresh each read | INS·Figure / SYN·Figure / NUL | self-declared: "insertRow is INS... updateRow is SYN... deleteRow is NUL" | multi-cell |
| succession.js | parse Wikipedia succession-box fields, resolve who held an office when | CON·Figure | reasoned | condemned-but-live per CLAUDE.md ("should never have been made") |
| tables.js | detect a table/chart question and build it from state, no model call | — | not-applicable | UI/data-presentation |
| templates.js | render data into one of the nine terrain-native representations | — (spans 9 cells) | self-declared per-builder (TERRAINS const) | no single file-level act |
| term-lessons.js | step a fixed, mechanically-graded terminal tutorial | — | not-applicable | pure data table + stepper |
| term-sql-worker.js | run sqlite inside a severed Worker | — | not-applicable | worker/process harness |
| term.js | dispatch terminal input across sandboxed runtimes and fold doors | — | not-applicable | surface/orchestrator; its `act` command composes grid.js's CON/SIG/INS/EVA/REC acts |
| title-fold.js | merge name fragments into one referent by additive(title)-vs-functional(name) qualifier | SIG+INS | reasoned | same referent-individuation family as cast.js |
| transcribe-log.js | append one transcription-pipeline layer to the log | — | not-applicable | pure IO/persistence client |
| transcribe.js | transcribe an audio blob to text via in-browser Whisper ASR | INS·Figure | reasoned (lower confidence) | births a new readable entity from raw bytes |
| unravel.js | cut a belief-graph network apart at its own structural bridges | SEG·Pattern | self-declared: `CELL = { op: "SEG", grain: "Pattern" }` | registered |
| verification.js | decompose a claim's checkability into EVA's full 9-cell taxonomy | — (spans 9) | self-declared: "composes ALREADY-COMPUTED results... runs no organ itself" | — |
| void-brief.js | declare the void (anchor/slot/extent/admits) a live question implies | — | not-applicable | surface/orchestrator; computes NUL/SIG/SEG/DEF inputs for void-shape.js |
| void-hl.js | judge a read edge's admission via HL's declared functional/transitive rules | EVA·Figure | reasoned | matches void loop's documented split (READING=model, JUDGING=HL=EVA·Figure) |

**`seg.js` flagged a suspected overlap with `void-shape.js` (both look
SEG·Ground-shaped) — resolved below by reading `void-shape.js` directly;
they turn out complementary, not duplicate (see also §3, §6).**

**Gap-fill (three files a batch-assignment off-by-one skipped, read directly — see §1):**

| Module | Verb | Cell | Basis | Note |
|---|---|---|---|---|
| void-shape.js | declare a question's void across all nine operators; compute the extent's uncovered remainder | — (spans 9, but SEG·Ground is its clearest single registered act) | self-declared per-row: `["SEG","Ground","extent","the extent to be covered, and its units"]`; registered in capacities.js as `extent`/spaceFrom | multi-cell declaration table (NUL slot/SIG anchor/INS admits/SEG extent/CON relation/SYN composition/DEF cardinality/EVA admission/REC reopensOn), same shape as templates.js/verification.js |
| seg.js | mechanically check whether a span's STATED UNIT is fit to state it (collapsed/indistinguishable/unreadable), by comparing two grains | SEG·Ground | reasoned — own header frames itself explicitly as "a real SEG judgment... arrived at [mechanically]", answering the "AND ITS UNITS" half of void-shape.js's own declared SEG·Ground row | **genuine second organ at the SEG·Ground cell, unregistered** — complementary to void-shape.js::spaceFrom (which declares the extent) rather than a duplicate: spaceFrom asks "what extent", seg.js asks "is the unit adequate to state that extent" |
| void-loop.js | run a DEF(cut)→EVA(bind)→REC(compose) loop over a declared void, admitting/refusing fillers | — (orchestrates 3 cells in sequence) | self-declared literal 9-row cube table in header + explicit "three stances are Dissecting->Binding->Composing" | contains 2 already-registered named sub-acts: `whatWouldSettle`=SIG·Ground (`settle`) and `reshape`=REC·Pattern (`reshape`); the loop-driving functions (openLoop/proposeFrom/admit/descend/closeLoop) are the DEF/EVA/REC composition substrate itself, not one cell — same "process, not act" shape as grid.js/build-log.js |
| void-narration.js | turn a void declaration already computed elsewhere into real-time prose narration for the "thinking" panel | — | not-applicable | UI/presentation — explicitly about HOW TO PHRASE disclosure (paragraphs not field/value rows), never performs an operator move itself |

### 5.4 `the-fold/` — repo root, alphabetical batch 4 of 4 (web-claim.js – witness.js), plus `.mjs` servers/workers and `explore/`

| Module | Verb | Cell | Basis | Note |
|---|---|---|---|---|
| web-claim.js | annotate a question's answer-slot as singular/plural/unknown from closed-class grammar | DEF·Figure | self-declared: "the DEF-shape proxy for an open web-ground slot" | DEF op reused unchanged from grid.js |
| web-hunt.js | escalate an undetermined local evaluate to a web-corroborated verdict, conceding prior on disagreement | EVA·Figure (+ conditional REC) | self-declared, uses grid.js's concedeEvaluation | DOMAIN-MISMATCH FLAGGED: grid.js's act declares terrain "Link" (Structure) for an EVA (Interpretation) op — but this is grid.js's DOCUMENTED "medium-blind terrain" convention for the terminal act-language (CLAUDE.md: "terrain is medium-blind... at <terrain> is authoritative, never re-derived from the operator"), NOT a cube.js math violation — a deliberate divergence between the terminal/act layer and the strict registry/cube.js domain-lock |
| webllm-client.js | manage in-tab WebLLM engine worker lifecycle | — | not-applicable | worker/process harness |
| webllm-rung.js | decide model config/request shape/failure typing | — | not-applicable | mixed config utility |
| webllm-worker.js | forward messages to WebLLM's RPC handler | — | not-applicable | worker harness, 9-line forwarder |
| wheels.js | resolve transitive dependency closure of a package against pyodide lock | CON·Pattern | reasoned | graph-closure walk, zero egress |
| widget.js | route a chat complaint to the build it concerns, compute mechanical patches | — | not-applicable (dispatcher) | self-declares "SIG · scout" for scoutSpan; computes SYN-shaped patch in literalSwap; own act (deciding SYN/REC/new-build) lands elsewhere |
| wikidata.js | resolve entity identity + typed position-claims from Wikidata for exact id-based chain closure | SIG·Figure | reasoned (analogy to cast.js) | also holds separate null-tested nomination cluster (secondary act) |
| witness.js | mechanically verify a produced code artifact's internal integrity | EVA·Figure | self-declared elsewhere (CLAUDE.md: "the witness lands EVA") | witnessRegressed extends to Pattern-grain comparison |
| explore-server.mjs | serve pages + dispatch ~40 API routes to nearly every organ | — | not-applicable | surface/orchestrator |
| explore-worker.mjs | admit a file, run host engine terrain/kinds readers off-thread | — | not-applicable | worker/process harness |
| fold-proxy.mjs | intercept opencode chat-completion requests, inject system prompt, relay to Ollama | — | not-applicable | surface/orchestrator, transparent proxy |
| page-graph.mjs | walk page's transitive load-graph, classify edges local/vendored/external/remote/bare | CON·Pattern | reasoned | same graph-closure shape as wheels.js |
| proxy-runner.mjs | run one full holonic chat turn headlessly against Ollama for proxy endpoints | — | not-applicable | surface/orchestrator |
| serve.mjs | serve static files + a few API routes | — | not-applicable | surface/orchestrator |
| skill-runner.mjs | execute a skill body in empty vm sandbox; admit new skill candidates mechanically | — | not-applicable | worker/process harness; admitSkill's gate reads INS-like but not self-declared |
| term-js-worker.mjs | sandboxed JS REPL, egress severed at boot | — | not-applicable | worker harness |
| term-php-worker.mjs | sandboxed PHP runtime, egress severed at boot | — | not-applicable | worker harness |
| term-py-worker.mjs | sandboxed Python (pyodide), egress severed after first exec | — | not-applicable | worker harness |
| term-r-worker.mjs | sandboxed R (webR), egress severed in this file's scope only | — | not-applicable | worker harness; header discloses webR's nested worker is unsevered |
| term-ruby-worker.mjs | sandboxed Ruby (ruby.wasm), egress severed at boot | — | not-applicable | worker harness |
| explore/explore.js | render Explore tab UI, pivot/zoom across nine terrain views | — | not-applicable | UI/DOM rendering; labels views by terrain they DISPLAY but performs no act itself |
| explore/preview.js | render a file's native face into the DOM | — | not-applicable | UI/DOM rendering |

### 5.5 `the-fold/` — the 28 shims (moved to `eoreader7/native/`, forwarded here for stale importers)

CLAUDE.md's own migration record ("Moved down a level," "The boundary")
already documents this move; listed here only so the module census has
one place naming where each shim's real code now lives — its verb is
censused at the destination, in §5.6.

| Shim (the-fold/) | Destination |
|---|---|
| asserted.js | `organs/asserted.js` |
| binding-core.js | `organs/binding-core.js` |
| capacities.js | `organs/capacities.js` |
| capacity-runner.js | `organs/capacity-runner.js` |
| cast.js | `organs/cast.js` |
| cite.js | `organs/cite.js` |
| corroboration.js | `organs/corroboration.js` |
| event-arrangements.js | `organs/event-arrangements.js` |
| experiencer.js | `organs/experiencer.js` |
| fold-gate.js | `organs/fold-gate.js` |
| frame.js | `organs/frame.js` |
| grammar-lens.js | `organs/grammar-lens.js` |
| grounding.js | `organs/grounding.js` |
| hl-acquire.js | `organs/hl-acquire.js` |
| hl.js | `organs/hl.js` |
| hypergraph.js | `organs/hypergraph.js` |
| hyperlexicon.js | `organs/hyperlexicon.js` |
| kind-standing.js | `organs/kind-standing.js` |
| measure.js | `organs/measure.js` |
| nesting.js | `organs/nesting.js` |
| obligation.js | `organs/obligation.js` |
| primary.js | `organs/primary.js` |
| quotes.js | `organs/quotes.js` |
| sequence.js | `kernel/sequence.js` |
| signal.js | `organs/signal.js` |
| source.js | `organs/source.js` |
| speaker.js | `organs/speaker.js` |
| testimony.js | `organs/testimony.js` |
| web.js | `organs/web.js` |

Also genuinely local, not a shim: `webllm-worker.js` (9-line RPC
forwarder to the in-tab model — a real, small worker harness, not a
re-export).

### 5.6 `eoreader7/native/organs/` — text-and-medium-aware organs (31 files, `index.js` and `capacities.js` excluded — barrel and registry respectively)

index.js confirmed: pure re-export barrel, no classifiable act.

| Module | Verb | Cell | Basis | Note |
|---|---|---|---|---|
| asserted.js | classify an edge's corroboration standing from statement recurrence | INS·Pattern | reasoned | standingOf |
| asserted.js | build a word-salad null (shuffle each sentence, re-extract) to test an edge's shape-sensitivity | NUL·Pattern | reasoned | orderArm |
| binding-core.js | the Binding stance's algebra (figure seeks unique clearing counterpart in a field, foil-checked) | Relate·Figure (domain-blind core) | self-declared: "SIG·Figure(cast)...CON·Figure(relations)...EVA·Figure(witness)" | ONE CORE INSTANTIATED AT 3 CELLS depending on caller — not itself one cell (§VIII.1 transfer proof) |
| capacity-runner.js | dispatch a capacity id to cast/relations/EVA branch | — | not-applicable | makeCapacityRunner/runCapacity — orchestrator |
| capacity-runner.js | square/re-check a computed verdict via negation/specificity/connector-class checks | EVA·Figure | reasoned | squarePolarity+checkObjectSpecificity+checkConnectorClass |
| capacity-runner.js | parse an act line, land it, run+attach matching capacity, REC-concede first | — | not-applicable | landAct — orchestrator |
| capacity-runner.js | project a claim's landed entries into one reading per source | — | not-applicable | perSourceReadings+speakerWho — projection |
| capacity-runner.js | merge multiple per-source readings into one cross-witness verdict | EVA·Pattern | reasoned | mergeTestimony |
| capacity-runner.js | land the model's own bare assertion as testimony from itself as witness | DEF·Figure | reasoned; DOMAIN FLAG | landSelfAssertion calls grid.parseAct("define...at Field from generate") — DEF(Interpretation) declares terrain "Field"(Structure×Ground) — CLAUDE.md's own documented deliberate grid.js divergence (terrain declared, not re-derived) |
| cast.js | resolve name surfaces to individuated referents | SIG+INS·Figure | known (capacities.js registry) | makeReferentIndex/makeCastResolver/makeCastHandles |
| cite.js | attribute a sentence to a passage only when overlap beats a retrieval-drawn null | EVA·Figure | reasoned | attribute |
| cite.js | attach every sentence's best-supporting passage by structural argmax/containment | CON·Figure | reasoned | coverage — no null margin |
| cite.js | mechanically strip any bracketed address the model itself produced | SEG·Figure | reasoned | stripSelfCitations |
| corroboration.js | scout candidate stating-sentences and rival names from real activation | SIG·Ground | reasoned | statingCandidates+competingFiller+proposeCandidates |
| corroboration.js | decide whether asking about a note would move anything before spending a call | DEF·Ground | reasoned | askValue+endsCopresentWindow — value-of-information gate |
| corroboration.js | one note, one source: slice->ask->sibling-swap->ask->derive verdict | EVA·Figure | reasoned | witnessNote |
| corroboration.js | walk the whole ledger under a budget, landing every "states" until settled | EVA·Pattern | reasoned | corroborateLedger |
| corroboration.js | rank not-yet-witnessing sources as candidates for a further vote | REC·Figure | self-declared: "REC·Figure at the fifth turn" | thirdSourceCandidates |
| corroboration.js | declare the witness protocol's measured operating point as a comparable frame | DEF·Pattern | self-declared: "DEF·Pattern at the fifth turn" | WITNESS_OPERATING_POINT+calibrationFrames |
| corroboration.js | individuate distinct sources/instrument-readings backing a note | INS·Figure | reasoned | distinctSources/independentReadings/distinctRecipes |
| derivation.js | gate which F5 notes clear declared source/instrument floor to stand as premises | NUL·Ground | reasoned (sibling of measure.js's admit) | premisesOf |
| derivation.js | project licensed chemistry from GIVEN tier of declarations register | SIG·Ground | reasoned | chemistryFor |
| derivation.js | UNLICENSED CONTROL: plain transitive closure, no provenance/veto | SYN·Pattern | reasoned (control counterpart to derive) | naiveJoin |
| derivation.js | PERTURBATION CONTROL: permute premises' objects within a relation | NUL·Pattern | reasoned | redeal |
| derivation.js | derive never-stated facts from corroborated premises under named veto-checked licence | SYN·Pattern | self-declared: "A derived note is SYN·Pattern·derived" | derive/makeDerivation — registered (`derive`) |
| derivation.js | concede a premise / cascade-withdraw everything derived from it | REC·Figure / REC·Pattern | self-declared | concedePremise, withdrawDerived |
| event-arrangements.js | recurrence-gated adjacency arrangements from non-text event stream, event-ordinal addressed | CON·Pattern | reasoned | arrangementsFrom, floor-2 for non-text media |
| experiencer.js | stamp a belief with the identity (who/read/revision) doing the believing | SIG·Figure | reasoned | requireExperiencer/withExperiencer |
| fold-gate.js | veto a reported referent-merge that fails a declared kind's membership test | DEF·Figure | reasoned | reviewMerges — review-not-prevention |
| frame.js | declare a judgment's interpretive ground before comparing verdicts, refuse cross-frame comparisons | DEF·Ground | **self-declared**: "frame.js — DEF·Ground: Clearing at Atmosphere" | registered (`frame`) |
| grammar-lens.js | classify a connector span's Thrax part-of-speech (verb vs not) | DEF·Figure | reasoned | makeGrammarLens/classifyConnector |
| grammar-lens.js | report population-wide rate of non-verb connectors (disclosed diagnostic) | DEF·Pattern | reasoned | mismatchedConnectors |
| grounding.js | check every numeric/name atom against union of given passages, absence typed | DEF·Figure | reasoned | checkGrounding (+numberCompany/numberSupporters, P31) |
| grounding.js | count how many passages/sources state each atom | EVA·Pattern | reasoned | corroborateAtoms |
| grounding.js | blank scaffolding then cut checkable numeric/name atoms out of prose | SEG·Figure | reasoned | blankStructure+extractAtoms+extractCheckableAtoms |
| grounding.js | render findings as record lines | — | not-applicable | unsupportedClaims — projection |
| hl-acquire.js | refute (or leave candidate) a Pattern-grain functional-hood claim via counterexample scan | EVA·Pattern | reasoned | scanFunctionalCandidates |
| hl-acquire.js | land surviving candidates as new PROPOSE declarations | INS·Pattern | reasoned | acquireCandidates — registered (`declare`) |
| hl-acquire.js | concede refuted candidates; promote a candidate to given with named giver | REC·Pattern | reasoned | recheckCandidates/promoteAndDeclare |
| hl.js (organs) | turn hypergraph.js's edges into an HL stage (adapter only) | — | not-applicable | stageFromEdges — "the adapter, and only the adapter"; logic lives in engine's interpretation/hl.js |
| hypergraph.js (organs) | extract material relation vocabulary/edges, judge answer's claims (bound/contradicted/unbound/beyond-reach/unheard) | CON·Figure | known (capacities.js registry) | makeRelationReader — registered (`relations`) |
| hypergraph.js (organs) | directly query produced edge graph for matches/distinct slot-fillers, no organs needed | CON·Figure | reasoned (same cell, weaker sibling) | queryEdges/queryFillers |
| hypergraph.js (organs) | extract relations for a case-marked (non-positional) language via case not word order | CON·Figure | reasoned; explicit 2nd typology, same cell by design | makeCaseMarkedRelationReader — end1/label/end2 only |
| hypergraph.js (organs) | filter/report which claims belong on record's unsupported list | — | not-applicable | relationFindings/relationsClean — projection |
| hyperlexicon.js (organs) | admit a subject/verb/object sighting: birth then corroborate | INS·Figure / SYN·Figure | self-declared: "first sighting INS, later sightings SUPERSEDE·SYN" | hear/admit — text face of kernel notes.js; registered (`hear`) |
| kind-standing.js | test whether a referent's context-vector similarity clears the population-null bar for a declared kind | EVA·Figure | reasoned | kindMembership/kindFit |
| kind-standing.js | refuse a referent-fold only on positive evidence of different kind-standings | DEF·Figure | reasoned | foldPermitted |
| kind-standing.js | discover company-signed kinds from a heard stream, licensed by shuffle-null | INS·Pattern | reasoned | discoverCompanyKinds |
| measure.js | gate a declared (statistic,perturbation) pair against licensed table before measuring; dispatch router | NUL·Ground | self-declared (frame.js quotes directly) + known (capacities.js registry `measure`) | admit+runMeasurement |
| measure.js | place observed series/pairing/across-comparison against a shuffled null, typed verdict | EVA·Figure | reasoned | measureSeries/measurePairs/measureAcross |
| measure.js | identify a fetched file's container kind by magic bytes first, text heuristic second | SIG·Pattern | reasoned | sniffContainer |
| measure.js | decode raw bytes/tabular rows into numeric series a measurement runs against | SEG·Ground | reasoned | wavSamples/seriesFromMedia/seriesFrom/arrivalsFrom |
| measure.js | parse declaration line; suggest measurable surfaces; render table/phrase/usage | — | not-applicable | parseMeasure/probeMaterial/licensedPairs/phrase/toTable/usage |
| nesting.js | walk a claim's nested claim:<id> chain to resolution depth | SEG·Pattern | reasoned | depthOf |
| nesting.js | separate an inner claim's own corroboration from an outer note's attribution (THE WALL) | DEF·Figure | reasoned | attributionsOf/corroborationOf |
| nesting.js | assay that no attribution witness leaked into inner claim's own witness set | EVA·Figure | reasoned | leakCheck |
| nesting.js | relate attributions with caller-declared opposing stances into a disagreement report | CON·Figure | reasoned | disagreement |
| obligation.js | admit declared enumerated clauses from text, refusing un-enumerated prose | SEG·Ground | reasoned | admitObligations |
| obligation.js | append a typed standing-change entry to one clause | INS·Figure | reasoned | mark |
| obligation.js | project current standings and completeness across whole clause enumeration | NUL·Pattern | reasoned | standings/coverage |
| primary.js | extract a saved page's outbound citations, deduplicated, document-order | SEG·Figure | reasoned | extractCitations |
| primary.js | classify one citation by a declared class ladder | SIG·Figure | reasoned | classifyCitation |
| primary.js | rank a page's citations for a claim by overlap/class/order | CON·Figure | reasoned | rankPrimary |
| primary.js | extract every sentence of a fetched face stating a claim's tokens, self-verified offsets | SEG·Figure | reasoned | snipClaim |
| primary.js | fold a walk's consulted primary sources into typed, counted verdict | EVA·Figure | reasoned | foldPrimary |
| quotes.js | extract every quoted span with content/close offsets | SEG·Figure | reasoned | extractQuotedSpans |
| quotes.js | follow each quotation to source bytes; typed verdict | EVA·Figure | reasoned | verifyQuotes/locateSegment |
| quotes.js | rewrite drifted quotes to source's own bytes, attach earned addresses | SYN·Figure | reasoned | applyQuotes |
| ranke.js | gate what a page offers to chase; refuse a page that cites nothing | SEG·Ground | reasoned | leadsOf |
| ranke.js | bind footnote marker to outbound links; verify fetched face is the cited document | CON·Figure / EVA·Figure | reasoned | footnoteLeads(CON); documentMatches(EVA) |
| ranke.js | for one ledger note: rank leads, fetch, snip, witness, attest a primary: witness | EVA·Figure | reasoned | chase |
| ranke.js | walk a whole ledger's account-only notes, budgeted, chasing each to primary sources | EVA·Pattern | reasoned | chaseLedger |
| signal.js | discover kinds from an instrument-produced event stream under search-aware null, report/refuse | INS·Pattern | reasoned | findSignal |
| signal.js | destroy company while keeping marginals — the one perturbation this organ spends | NUL·Pattern | reasoned | scramble |
| source.js | strip container boilerplate/furniture before chunking | SEG·Ground | reasoned | stripContainer/stripItalicsMarkup/blankLabelRows |
| source.js | cut a source into byte-addressed chunks — the address ground | SEG·Ground | reasoned (frame.js cites as sibling) | chunkSource/atmosphereBoundaries — registered (`regime`, via atmosphereBoundaries) |
| source.js | mechanical term-overlap retrieval: bind a question's words to matching chunks | CON·Figure | reasoned | retrieve |
| source.js | check every address the answer cites was actually among chunks given | DEF·Figure | reasoned | checkCitations |
| source.js | compose offered chunks into the prompt block a model reads | SYN·Figure | reasoned | buildSourceBlock |
| source.js | report what the question asked that no given chunk was used to answer | NUL·Figure | reasoned | openQuestions |
| source.js | read a source's own self-declared Title:/Author: header as labeled identity | SIG+INS·Figure | reasoned (analogy to cast.js) | declaredIdentity |
| source.js | identify what kind of material a chunk is | INS·Pattern | reasoned | identifyMaterial |
| source.js | parse delimited rows into a table | SEG·Figure | reasoned | delimitedTable/splitDelimited |
| speaker.js | is this line a section heading, who does it declare | SEG·Figure | reasoned | readHeading |
| speaker.js | build whole section->speaker binding table for a document | CON·Ground | reasoned | speakerSections |
| speaker.js | who speaks at one byte offset (typed absence, never nearest-guess) | CON·Figure | reasoned | speakerAt |
| testimony.js | bound the witness's read to anchor sentences + neighbours | SIG·Ground | reasoned | witnessSlice |
| testimony.js | construct the sibling-swapped competing-filler candidate (perturbation arm) | NUL·Figure | reasoned | siblingSwap |
| testimony.js | locate the source's own most-deciding sentence for a claim | SEG·Figure | reasoned | locateDecider |
| testimony.js | derive states/contradicts/refused from (claim,sibling) answer pair, mechanically | EVA·Figure | reasoned | foldTestimony/foldSelect |
| web.js | strip container chrome, extract readable title/description/text | SEG·Ground | reasoned | extractReadable — registered (`web`) |
| web.js | recognize a feed by root element, detect bot-challenge page | INS·Pattern | reasoned | extractFeed/looksLikeChallenge |
| web.js | parse search endpoint HTML into typed results or typed refusal | SEG·Figure | reasoned | parseSearchResults/unwrapDdgHref |
| web.js | fold append-only history jsonl into current per-id entries | SYN·Pattern | reasoned | foldWebHistory |
| web.js | extract/validate candidate URLs from text; normalize a URL | SEG·Figure | reasoned | extractUrls/normalizeUrl/hostOf |
| witness-sentences.js | ask witness whether any passage states each unsettled answer sentence, budgeted | EVA·Figure | reasoned | witnessSentences — thin wrapper over corroboration.js's witnessNote |

**CON·Figure and EVA·Figure are by far the densest cells among these
31 organs** — a "check/bind against ground" act is this directory's most
common shape by a wide margin. `capacity-runner.js::landSelfAssertion`'s
DEF act declaring terrain "Field" is the `grid.js`-convention divergence
already named in §4, not a fresh finding.

### 5.7 `eoreader7/native/kernel/` — medium-agnostic mechanisms, batch 1 of 2 (activation.js – kind-graph-structure.js)

Several of these files are enforced by a source-scan test that fails if
the module's own body ever mentions "sentence," "pronoun," "text," or
"word" — the abstraction in these verb phrases (a figure seeking its
counterpart in a field, rather than a pronoun seeking its referent) is a
constraint this codebase holds deliberately, not a sign the module lacks
a verb.

| Module | Verb | Cell | Basis | Note |
|---|---|---|---|---|
| activation.js (kernel) | measure the reach (window) of the present via "difference that makes a difference" | SEG·Ground | reasoned | dmdWindow — window IS an extent, unit=observations |
| activation.js (kernel) | maintain each key's decaying presence in the ambient, lazily | SIG·Ground | reasoned | createActivation/observe; explicitly NOT identity |
| affordance-reference.js | mint an emergent referent licensed by a given composition affordance | SYN·Figure | **self-declared**: "Minting the implied referent is SYN·Figure" | refuses on 0 or >1 licensing affordances |
| affordance-reference.js | bind the bare reference to the synthesized referent | CON·Figure | **self-declared**: "the same cell ordinary reference resolution occupies" | thin wrapper |
| artifact.js (kernel) | certify conformance and seal a projection as boundary-crossable, refusing decay-tier leakage | DEF·Figure | reasoned | sealArtifact+artifactTierViolations |
| assembly.js | declare an assembly's licensed contract (ops/terrains/regimes) up front | DEF·Ground | reasoned | assembly() |
| assembly.js | admit a new assembly version into the append-only register | INS·Figure | reasoned | registerAssembly |
| assembly.js | check each operation's cell against its assembly's declared contract | DEF·Figure | reasoned | contractViolations, typed refusal rows |
| assembly.js | re-zero every standing contribution of a refuted assembly, wholesale, named trigger | REC·Pattern | **self-declared**: "ONE REC (Pattern grain — the concession is the ∀-shaped act)" | nothing deleted, marked via projection |
| atmosphere-math.js | read unresolved obligations as a factor graph, measure frustration/tension | EVA·Ground | **self-declared** domain+grain | terrain matches filename |
| cast-ledger.js | project fold's individuated referents + mention counts into a canonical ledger | SIG·Figure | reasoned | parallels "project*→SIG" one grain down from projectKinds |
| cast-ledger.js | check conformance and seal the ledger as boundary-crossable artifact | DEF·Figure | reasoned | wraps artifact.js's act |
| completion.js | type an expected-but-unfilled role as a positive event rather than silence | NUL·Figure | **self-declared**: `ABSENCE_CELL = cellOf("NUL","Figure")` | VP-ellipsis/gapping/sluicing generalized |
| completion.js | resolve the declared absence to a winning earlier-filled candidate | CON·Figure | **self-declared**: `RESOLUTION_CELL = cellOf("CON","Figure")` | reuses contest.js |
| contest.js | bind an unlabelled deixis to its best-scoring candidate; co-presence raises the bar never the score | CON·Figure | reasoned, corroborated by 3 independent callers self-declaring this exact cell | adjudicate+nullAdjudicate; proven medium-general (text/film/music) |
| continuation.js | sediment a recurring predictive pattern from a heard stream | SIG·Pattern | reasoned | sedimentPrior/mergePriors/sedimentShapePrior |
| continuation.js | predict/generate likely continuation, score actual events prequentially | EVA·Pattern | reasoned | matches THE-CORE-MECHANISM's PREDICTION family; observed/generated kept apart |
| dmd-stream.js | — | — | not-applicable | pure streaming linear-algebra substrate |
| dmd.js | — | — | not-applicable | pure batch DMD math library |
| dynamics.js | — | — | not-applicable | diagnostic/summary reader, no operator move itself |
| emergent-terrain.js | — | — | not-applicable | incremental index/orchestrator spanning 4 terrains at once, deliberately multi-cell |
| entity-kind-induction.js | discover candidate kinds as stable interaction-affinity basins, validated against random-subset null | SIG·Pattern | **self-declared**: "SIG·Pattern — signing a recurring kind, provisionally" | — |
| entity-kind-induction.js | challenge a DECLARED kind membership against the same random-subset null | NUL·Pattern | **self-declared** verbatim | testKindMembers, registered as `kindnull` |
| expectations.js | open a new anticipated structure into the fold | INS·Figure | **self-declared**: "opening an expectation is INS" | — |
| expectations.js | transition an expectation's state (strengthen/weaken/fulfill/violate); REC if reframed | EVA·Figure | **self-declared** via code | reframed branch is REC·Figure |
| experience-priors.js | sediment which relations/networks/terrains/stances/operators recurred across prior readings | SIG·Pattern | reasoned | continuation.js names this file's own standing "WHICH" |
| experience-priors.js | compare current network signature against remembered cross-work prior | EVA·Pattern | reasoned | same PREDICTION-family shape as continuation.js |
| experienced-reading.js | — | — | not-applicable | orchestrator merging/seeding priors |
| fold.js (kernel) | establish the empty (or seeded) ambient Fold a reading starts from | NUL·Ground | reasoned | receivedGround |
| fold.js (kernel) | — | — | not-applicable | eoOperation/deltaFold: shared typed-op factory every kernel module mints through |
| fold.js (kernel) | fold/compile a stream of operations into current accumulated Fold state | SYN·Ground | reasoned | applyObservation/applyDelta/reconstruct |
| holder-scope.js | resolve a reference restricted to what its holder may reach | CON·Figure | **self-declared**: "the same cell ordinary reference resolution already occupies" | composes contest.js's adjudicate under a scope filter |
| hypergraph-projection.js | replay the log to a cursor, compile current graph state | SYN·Ground | reasoned | parallels fold.js's reconstruct |
| hypergraph-projection.js | — | — | not-applicable | hyperlexiconAt orchestrator |
| hypergraph.js (kernel) | construct a relation connecting participants | CON·Figure | reasoned | hyperedge() |
| hypergraph.js (kernel) | trace the bounded multi-hop neighborhood around seed references | CON·Pattern | reasoned | relevantHypergraphNeighborhood |
| hyperlexicon.js (kernel) | nominate a recurring observed adjacency as a composition candidate, never licensing it | SIG·Pattern | reasoned | admitHyperlexiconCandidates |
| hyperlexicon.js (kernel) | declare a GIVEN, giver-named affordance that licenses composition of one pair | DEF·Figure | reasoned | giveHyperlexiconAffordance — "the chemistry table" |
| identity.js (kernel) | open/strengthen a live identity alternative on supporting evidence | CON·Figure | **self-declared**: "opens/strengthens a live alternative via CON" | — |
| identity.js (kernel) | separate two forms under attack (constitutive contradiction) | SEG·Figure | **self-declared**: "SEG separates the forms" | — |
| identity.js (kernel) | record refusal of the prior identity reading | DEF·Figure | **self-declared**: "DEF records refusal of the prior identity reading" | — |
| identity.js (kernel) | rewrite canonical relation projections once identity evidence changes | REC·Figure | **self-declared**: "Canonical relation projections are then REC-written" | raw witnessed edges stay untouched |
| index.js (kernel) | — | — | not-applicable | pure re-export barrel of whole kernel surface |
| interrogation.js | find/trace the graph neighborhood relevant to given observations | CON·Pattern | reasoned | delegates to hypergraph.js's identical act |
| interrogation.js | — | — | not-applicable | interrogateCube/deriveEOTransformations/cubeAddresses: sweeps ALL 27 cells, a meta-driver over the whole space |
| kind-graph-structure.js | surface recurring structural features per entity, semantic-label-free | SIG·Pattern | reasoned | disclaimed as "candidate structure," feeds entity-kind-induction.js |

**SIG·Pattern — "nominate/sediment a recurring regularity, provisionally,
without licensing" — is the single most common reasoned cell in this half
of `kernel/`:** five independent files converge there
(`continuation.js`, `experience-priors.js`, `hyperlexicon.js`,
`kind-graph-structure.js`, `entity-kind-induction.js`'s inducer).
**CON·Figure is second**, shared verbatim across four files'
self-declarations, all composing `contest.js::adjudicate`.

### 5.8 `eoreader7/native/kernel/` — medium-agnostic mechanisms, batch 2 of 2 (kind-induction.js – witness.js)

| Module | Verb | Cell | Basis | Note |
|---|---|---|---|---|
| kind-induction.js | sign a recurring kind candidate from a population's feature profile | SIG·Pattern | **registry-quoted** (capacities.js "kinds") | legacy earnedKindProjection is a second, disabled-by-default act, reasoned NUL·Pattern |
| lexicon.js | — | — | not-applicable | pure projection/report over terrain counts |
| network-standing.js | grant co-arriving pairs standing as an edge, licensed only by their own permutation null | CON·Pattern | **self-declared** (file header) | presence(low)/standing(high) kept apart |
| network-standing.js | orient and polarize an already-standing pair via a three-null direction gate | CON·Figure | reasoned | directedEdges, runs only on already-admitted pairs |
| notes.js | birth an arrangement never heard before | INS·Figure | **self-declared**: "First sighting is INS · Figure · produced" | hear() no-prior branch |
| notes.js | corroborate a re-sighting (union witnesses/spans into same note) | SYN·Figure | **self-declared**: "SUPERSEDE · SYN · Figure" | hear() prior-exists + attest(), registered (`hear`) |
| notes.js | declare the reader's own standing/frame before anything is heard | DEF·Ground | **self-declared**: "DEF · Ground · declared" | createNotes/redeclareFrame |
| notes.js | concede (re-zero) a note the reader takes back | REC·Figure | **self-declared** (code: operator:"REC", grain:FIGURE) | concede/concedeDiet |
| notes.js | cut the ledger's own hearing-stream by surprise against a shuffled null | SEG·Figure (+Pattern) | reasoned | segment/dietBoundaries/figures; EXPLICITLY REFUTED as an admission door, kept only as diagnostic |
| obligations.js (kernel) | open/resolve a standing scriptural-style obligation | DEF·Figure | **self-declared** (literal default params op="DEF", grain="Figure") | carryObligations is bookkeeping only |
| orientation.js | — | — | not-applicable | "conditions attention but is not witness" |
| pending-sig.js | register a forward-pointing reference, bounded on caller's clock | SIG·Figure | **self-declared** (PENDING_CELL) | openSig |
| pending-sig.js | resolve (or expire) that pending reference against a later act | CON·Figure | **self-declared** (RESOLUTION_CELL) | checkArrival |
| perception.js | nominate unconfirmed percept candidates from priors + perceiver organs | SIG·Figure | reasoned (strong analogy to pending-sig.js) | "nomination is not admission" |
| perspective.js | distinguish a holder from the reading itself | DEF·Figure | **self-declared** | opening a holder |
| perspective.js | hold a claim against some ground | EVA·Figure | **self-declared** | ordinary belief-holding |
| perspective.js | re-zero (concede) a holder's belief, kept not erased | REC·Figure | **self-declared** | — |
| reaction.js | compose a licensed derived edge from two chained edges under a GIVEN affordance | SYN·Pattern | **registry-quoted** (capacities.js "derive") | settle/step; measured "filter not generator" |
| reaction.js | withdraw a derived fact (and transitive dependents) when licence refuted | REC·Pattern | **registry-quoted** (capacities.js "reshape", attributed not literal) | cascading, never bulk delete |
| reading-tasks.js | propose a task from a materially-consequential obligation (birth) | INS·Figure | reasoned (ENTRY_KINDS.PROPOSE = INS·Figure convention) | taskForObligation/proposeObligationTasks |
| reading-tasks.js | gather relevant hypergraph neighborhood as a task's evidence | CON·Pattern | reasoned | executeClarificationTask |
| reading.js | test whether a nominated candidate survives challenge before witness | NUL·Figure | reasoned (matches clearance.js's registered NUL·Figure) | challengeCandidates |
| reading.js | (the reading loop itself) | — | not-applicable | createRecursiveReader/step/read — orchestrator spanning many cells |
| refutation.js | find a POSITIVE counterexample (uniqueness violation/cycle) against a declared composable relation | EVA·Pattern | reasoned | refuteRelation/auditChemistry/afterVeto/vetoedPairs — "a veto, never a gate" |
| relation-composition.js | detect one incidence: two witnessed edges touch at a shared referent bridge | CON·Figure | reasoned | chainOf/activate/rememberEdge |
| relation-composition.js | nominate a recurring (left,right) predicate pair from independent chain witnesses | CON·Pattern | reasoned | candidates/independentChainIds |
| relation-composition.js | construct one licensed bridge-fact from a chain under a GIVEN affordance | SYN·Figure | reasoned ("the calculus of relations") | evaluateChains/evaluateRelationCompositions |
| return-curve.js | — | — | not-applicable | pure statistics utility, no operator semantics |
| rhythm-priors.js | derive/merge a portable, defeasible WHEN-prior across works | DEF·Pattern | reasoned (standing:"defeasible_experience_prior", witnessed:false) | deriveRhythmPrior/mergeRhythmPriors |
| rhythm-priors.js | score a target reading's own mention-gaps against carried prior's expectation | EVA·Pattern | reasoned | scoreRhythmExpectations |
| rng.js | — | — | not-applicable | pure deterministic RNG/shuffle utility |
| scoped-kind.js | mint a quantifier-bound indefinite as a pattern ranging over its scope | SYN·Pattern (as coded) | **CONTRADICTION FLAGGED**: header claims Existence·Pattern/Kind but cellOf("SYN","Pattern") is Structure-domain, mechanically computes Network, never Kind | MINT_CELL — SYN can never reach Kind; module's own stated premise contradicts its own cellOf call |
| scoped-kind.js | resolve the bound reference to a winning candidate via contest.js::adjudicate | CON·Pattern (as coded) | **same contradiction** | RESOLUTION_CELL; at least self-consistent with MINT (both Network) |
| sequence.js | declare a domain's next-in-sequence mapping/algebra, giver required | DEF·Pattern | reasoned | declareSequence |
| sequence.js | read records into position-grain chained edges | SYN·Pattern | reasoned | readSequence |
| sequence.js | find a positive counterexample (concurrent occupants) refuting declared single-file algebra | EVA·Pattern | reasoned (same family as refutation.js) | refuteLocus |
| sequence.js | predict a missing neighbour by strict boundary-key abutment | CON·Figure | reasoned | predictNeighbour, refuses on ambiguity |
| surprise-segments.js | cut a stream where one event's surprise (under shuffled null) peaks | SEG·Figure | self-declared framing + reasoned operator | surprises/segmentBySurprise |
| surprise-segments.js | recur the cut hierarchically | SEG·Pattern | reasoned (matches unravel.js's registered cell) | recursiveSegments/segmentToken |
| task-log.js | append/project a general-purpose EO log | — | not-applicable | cell-agnostic substrate; home of DERIVED (not restated) OPERATOR_CHAIN |
| task-log.js | audit whether a thread's operator/grain trajectory holds canonical order | EVA·Pattern | reasoned | checkCubeProgression, advisory only |
| temporal-reference.js | individuate a time as a referent | INS·Figure | **self-declared**: "a time, individuated exactly like any other particular" | establishTime |
| temporal-reference.js | re-zero the narrative's ambient reference-ground to a newly established time | REC·Ground | **self-declared** | advanceReferenceGround, supersedes kept |
| temporal-reference.js | resolve an anaphoric tense to the current live reference-ground | CON·Ground | **self-declared but imprecise** — comment conflates "terrain" with "grain" (target ground actually lives in Atmosphere per REC·Ground, but cellOf("CON","Ground") mechanically computes Field) | resolveAnaphoricTense, softer looseness not a hard contradiction |
| terrain-activation.js | — | — | not-applicable | cross-cutting physics substrate (decay, one hop), consumed by every terrain uniformly |
| terrain-math.js | measure local incidence/coupling density of current edge set | CON·Ground | self-declared domain/grain + reasoned operator | structuralFieldGeometry |
| terrain-math.js | measure connected-component topology (cycle rank/Betti-1) | CON·Pattern | self-declared domain/grain + reasoned operator | relationNetworkComponents |
| terrain-math.js | nominate a candidate compressible explanatory regime (MDL) | DEF·Pattern | self-declared domain/grain + reasoned operator | interpretiveSignature; "not yet a full prospective Paradigm gate" |
| terrain-state.js | — | — | not-applicable | persistent (non-decaying) terrain index — identity/persistence counterpart to terrain-activation |
| witness.js (kernel) | admit a nominated candidate into a definite, evidence-backed Observation | INS·Figure | reasoned (matches notes.js's "first sighting is INS·Figure") | **NB: DIFFERENT from organs/witness.js / the-fold's witness.js — code-compile checking (EVA·Lens) — do not conflate** |

`scoped-kind.js`'s header/code contradiction is the finding elevated to
§4; roughly 20 of the 27 cells are independently touched by this half of
`kernel/` alone, with about 11 of its 26 files pure infrastructure or
orchestration carrying no single move.

### 5.9 `eoreader7/native/adapters/text/` — the English-text-specific reading organs (26 files)

Unlike `kernel/`, these ARE language-specific (pronouns, capitalization,
morphology, syntax) by design — this is the layer where a medium's own
grammar is read. Six files carry a literal `CELL`/comment self-declaration
(`relations.js`, `declension.js`, `spans.js`, `pronouns.js`, `surfaces.js`,
`segments.js`), all domain-consistent.

Note on method: 6 files self-declare a CELL/comment (relations.js, declension.js, spans.js, pronouns.js, surfaces.js, segments.js) — all domain-consistent, no contradictions found.

| Module | Verb | Cell | Basis | Note |
|---|---|---|---|---|
| revision.js | admit new referent occurrences/referents into the fold | INS·Ground / INS·Figure | self-declared: `eoOperation({op:"INS", grain:"Ground"\|"Figure"})` | raw occurrence=Ground, admitted referent=Figure |
| revision.js | bind discourse links/hyperedges/identity hypotheses into the fold | CON·Figure | self-declared: `op:"CON", grain:"Figure"` | — |
| individuation.js | perceive a determiner-marked descriptor occurrence (unresolved identity) | SIG·Ground | reasoned | mirrors surfaces.js's SIG·Ground |
| individuation.js | bind recurring descriptors across encounters into a defeasible identity hypothesis | CON·Pattern | reasoned | recurrence-scale sibling of declension.js's CON·Figure |
| individuation.js | project a hypothesis into a new provisional referent | INS·Figure | reasoned | matches revision.js's literal INS·Figure |
| recursive.js | orchestrate causal per-sentence perception | — | not-applicable | harness composing other files' acts |
| recursive.js | wrap split sentences as Encounter@1 objects | — | not-applicable | thin schema adapter over spans.js's SEG·Ground |
| phasepost.js | classify an already-extracted edge's verb as one of the 9 operators, at occurrence grain | DEF·Figure | reasoned | mirrors construction.js; itself computes cells for OTHER acts via injected cellOf |
| relations.js | nominate candidate verb vocabulary from recurrence statistics | SIG·Ground | reasoned | parallel to surfaces.js |
| relations.js | extract subject-verb-object triples | CON·Figure | **self-declared**: "CON · Link · Binding — subject·verb·object triples; the graph's medium-specific mouth" |  |
| relations-case-marked.js | extract a role triple by case morphology instead of position | CON·Figure | reasoned (explicit analogy to relations.js) | header: "two ordered ends and a label, never subject/verb/object" |
| declension.js | bind two observed surface forms via a productive case transform | CON·Figure | **self-declared**: "CELL: CON · Structure · Figure (Link)" | pairwise only |
| wordclass.js | classify a word-TYPE's attested part-of-speech distribution (ambiguity preserved) | DEF·Ground | reasoned | type-level ambient distribution |
| accessibility.js | decide whether material's own return-curve or a genre prior sets the activation clock | EVA·Ground | reasoned | becomes the ambient memory-decay clock |
| vocabulary.js | license scan positions from an already-bound pronoun identity | SIG·Figure | reasoned | — |
| vocabulary.js | gather verb-agency evidence for candidate descriptor-beings | CON·Figure | reasoned | — |
| spans.js | gate whether survived bytes read as real material or a container error page | NUL·Ground | reasoned | existence check, distinct from file's own declared cut act |
| spans.js | strip container boilerplate/find front matter/split sentences | SEG·Ground | **self-declared**: "SEG · Field · Clearing — sentence segmentation" |  |
| construction.js | collapse a form's superposed word-class AT ONE OCCURRENCE via local context | DEF·Figure | reasoned | instance-level sibling of wordclass.js |
| discourse-referents.js | bind two descriptor occurrences via explicit apposition | CON·Figure | reasoned (matches revision.js) | — |
| discourse-referents.js | project linked occurrence components (size >=2) into new referents | INS·Figure | reasoned (matches revision.js) | — |
| pronouns.js | bind a third-person pronoun to a referent by one-hop activation recall | CON·Figure | **self-declared**: "CON · Link · Binding — a pronoun bound to a referent by one-hop recall" |  |
| material.js | tokenize text and build the frequency-table ground | SIG·Ground | reasoned | — |
| material.js | classify one word content-vs-function against a declared relevance threshold | EVA·Figure | reasoned | — |
| material.js | causal (prefix-only) surprisal series across chunks | EVA·Pattern | reasoned | prediction family, no perturbation spent |
| anchoring.js | bind a definite/possessive descriptor to an admitted referent by one-hop recall | CON·Figure | reasoned (header: literally pronouns.js's own mechanism) |  |
| anchoring.js | admit a recurring never-anchored descriptor as a new being, gated on agency evidence | INS·Figure | reasoned | same admission shape as individuation.js/revision.js |
| perspective-claims.js | map a cast's surfaces to referent ids | — | not-applicable | pure reformatting utility |
| perspective-claims.js | run pronoun binding per narration frame, return byte ranges | CON·Figure | reasoned (inherits pronouns.js) | frame-scoping only |
| perspective-claims.js | resolve a (surface, offset) query against previously bound pronoun ranges | CON·Figure | reasoned | consumer lookup |
| perspective-claims.js | pick an arrangement-end's claim key, priority-ordered among candidates | DEF·Figure | reasoned | — |
| surfaces.js | extract candidate referent surfaces & fold name-variant coreference | SIG·Ground | **self-declared**: "SIG · Void · Tending — candidate referent surfaces, from the text's own statistics" | bundles namesCorefer/discoverReferents |
| segments.js | find structural boundaries (headings/outline) by form alone | SEG·Ground | **self-declared**: "SEG · Field · Clearing — structural boundaries found by form and nothing else" |  |
| contextual-dmd.js | decompose a windowed motif-count sequence into dynamic modes | SYN·Pattern | reasoned | construction whose conclusion is tested for recurrence-stability |
| identity-evidence.js | generate appositional identity support (descriptor<->name) | CON·Figure | reasoned | — |
| identity-evidence.js | attack a live identity alternative via separated co-presentation | EVA·Figure | reasoned | refutation signal |
| priors.js (adapters/text) | — | — | not-applicable | pure received closed-class data tables, each entry carries _META.giver |
| cast-prior.js | nominate referents a sealed prior cast attests in THIS material | SIG·Ground | reasoned | A4.1 nomination, never admits |
| morphology.js | test whether two inflected forms are the same act (pairwise, received lemmatizer) | CON·Figure | reasoned (same shape as declension.js, verbs not nouns) |  |
| morphology.js | widen a measured verb vocabulary to every attested inflection | CON·Pattern | reasoned | material-wide closure of the pairwise identity above |
| attribution.js | perceive quotation-mark structure & embedded-telling frames | SIG·Ground | reasoned | structural presence-marking |
| attribution.js | resolve an injected prior into byte-addressed "who narrates" frames | DEF·Ground | reasoned | declares ambient narrator-identity atmosphere |
| attribution.js | bind one quoted span to an admitted speaker via verb-adjacency evidence | CON·Figure | reasoned | — |
| propernoun-fold.js | fold an inflected proper-noun form onto its single attested lemma (strand if ambiguous) | CON·Figure | reasoned (analogy to declension.js) | — |

**Two convergence points dominate this directory:** CON·Figure (pairwise
identity/binding — pronoun, descriptor, apposition, declension,
morphology, and case-marked relations all land here) and SIG·Ground (raw
presence-marking that becomes an ambient set later figures are read
against).

### 5.10 `eoreader7/native/adapters/{midi,audio}/`, `interpretation/`, `memory/`, and `assemblies.js`

| Module | Verb | Cell | Basis | Note |
|---|---|---|---|---|
| adapters/midi/midi.js — parseMidi | individuate raw SMF bytes into addressed, ordinal note-events | INS·Figure | reasoned | LEVELS.md floor 0 for MIDI, but no cube cell self-declared |
| adapters/midi/midi.js — writeMidi | construct one closed SMF byte stream from a declared list of individuated notes | SYN·Figure | reasoned | inverse of parseMidi; nice INS/SYN complementary pair in one file |
| adapters/audio/overtones.js — discoverHarmonics | test whether a frame's peak-frequency energy survives redealing its overtone frequencies | EVA·Figure | reasoned | per-frame perturbation null; matches THE-CORE-MECHANISM family-1 (perturbation) |
| adapters/audio/overtones.js — overtoneOverlap | score the shared-partial edge between two frequencies | CON·Figure | reasoned | SAME CELL as memory/activation.js's self-declared CON·Figure — cross-medium Binding-stance instance |
| interpretation/declarations.js — proposeCandidate/promote | declare a candidate functional/transitive/composes rule, then promote on a named giver | DEF·Pattern | self-declared: `operator:"DEF", grain:"Pattern"` | two moments of one DEF thread |
| interpretation/declarations.js — concede | concede a declaration a later stage refuted, named trigger | REC·Pattern | self-declared: `operator:"REC", grain:"Pattern"` | mirrors grid.js's concedeEvaluation |
| interpretation/declarations.js — foldDeclarations/createDeclarationLog | project the log into current given/candidate/conceded standings | — | not-applicable | pure read/projection |
| interpretation/hl.js — declareFunctional/declareTransitive/declareComplete | state a general rule about a relation/domain, gated on named giver | DEF·Pattern | self-declared prose | Pattern grain per "functional(r) is a Pattern-grain claim" |
| interpretation/hl.js — atomic/read (R1 match, R2 functional exclusion) | judge one single-edge claim against the stage | EVA·Figure | self-declared prose | attach() layers a perturbation-sensitivity gate |
| interpretation/hl.js — forall/exists (R5 grain-theorem quantifiers) | judge a quantified claim, refusing upward entailment on an open domain | EVA·Pattern | self-declared prose | — |
| interpretation/hl.js — closureEdges (R6 transitive closure) | derive new edges by transitive closure under a declared license, provenance recorded | SYN·Pattern | **TENSION FLAGGED**: hl.js's own header frames ALL of R1-R6 as one Interpretation/EVA act, but THE-CORE-MECHANISM.md calls this exact "deduction" shape "CON/SYN, not EVA" and reaction.js's chemistry (analogous) is nominated SYN·Pattern in THE-27-CELLS.md | reconciliation needed, not resolved by either source alone — this census resolves PER-RULE (DEF for declarations, EVA for R1/R2/R5, SYN·Pattern reasoned only for R6) rather than accepting either blanket claim |
| interpretation/hl.js — createStage/addAnchor/addEdge/extendStage | build/hold the stage (the hypergraph model HL judges) | — | not-applicable | the material judged, not the judging act |
| memory/activation.js — codeOf/recall/encodeFrame/readForward | wire Hebbian associations while reading; retrieve by one recurrent (CA3) completion hop | CON·Figure | **self-declared**: `export const CELL = Object.freeze({ op: "CON", grain: "Figure" })` | rerank/resonance is a disclosed unwired second ground, not separately typed |
| assemblies.js | register which organs compose each named reading assembly (a data table) | — | not-applicable | pure registry/orchestrator; NETWORK/KIND/LENS/SEQUENCE/DYNAMICS rows explicitly carry `cells: []` — unmeasured, disclosed not hidden |

`overtones.js::overtoneOverlap` (audio) and `memory/activation.js`
(text/general) landing CON·Figure independently is the cross-medium
specimen already elevated to §3.4 and §6. Two more reconciliations worth
naming rather than re-deriving: `signal.js` (organs) sits in the same
PERTURBATION family (`THE-CORE-MECHANISM.md`) as `overtones.js::
discoverHarmonics`'s per-frame null — a second cross-medium instance of
the same family, one register over from Binding. And `organs/
hyperlexicon.js`'s admission act (`hear` — INS·Figure/SYN·Figure,
Existence/Structure domain, per CLAUDE.md's "stance on the admission
record") is a different function from whatever function eventually
projects the ledger into current state (which `THE-THREE-MATHEMATICS.md`'s
"every `fold*` is an integration" claim would bear on) — likely two
different cells for two different functions in that file, not one; this
census's own §5.6 row for `hyperlexicon.js` covers only the admission act.

---

## 6. Candidates for future registration — named, not registered

`organs/capacities.js`'s own admission bar is real: each of its ~29 rows
was hand-checked for domain-legality, and several (`skill`, `build`) were
caught wrong and fixed before shipping. A census is not that check. The
modules below are the clearest candidates this pass found — self-declared
or strongly reasoned, occupying a real cell, not yet in the registry —
named so a future pass can verify and admit them rather than re-discover
them, never registered here.

| Candidate | Cell | Why it stands out |
|---|---|---|
| `kernel/identity.js` | CON·Figure, SEG·Figure, DEF·Figure, REC·Figure | one file, four self-declared cells, a complete open→attack→refuse→rewrite choreography — as clean a worked example as `void-loop.js`'s own three-cell loop |
| `kernel/perspective.js` | DEF·Figure, EVA·Figure, REC·Figure | a second complete self-declared triple (open a holder → hold a claim → re-zero it) |
| `adapters/text/revision.js` | INS·Ground, INS·Figure, CON·Figure | self-declared; INS·Ground is one of the two thinnest cells in the whole census (§3.1) |
| `kernel/temporal-reference.js` | INS·Figure, REC·Ground, CON·Ground | self-declared triple; REC·Ground is the other thinnest cell |
| `kernel/completion.js` | NUL·Figure, CON·Figure | self-declared; its `ABSENCE_CELL` is a genuinely different NUL·Figure act from `clearance.js`'s (typing an unfilled role as a positive event, vs. establishing a filled one) — a complementary pair at one already-registered cell, the same shape as §3's seg.js/void-shape.js finding |
| `adapters/midi/midi.js` | INS·Figure, SYN·Figure | the only MIDI-specific pair in the census; `parseMidi`/`writeMidi` is a clean individuate/compose complement, and the only organ censused for this medium |
| `memory/activation.js` | CON·Figure | self-declared `CELL` export; lands on the IDENTICAL cell `adapters/audio/overtones.js::overtoneOverlap` independently reaches — the concrete cross-medium specimen `THE-THREE-MATHEMATICS.md` §VIII.1 asks for |
| `organs/corroboration.js::thirdSourceCandidates` | REC·Figure | self-declared ("REC·Figure at the fifth turn"); a second organ at the cell `build-log.js::rezeroBuild` (`rezero`) occupies, for an unrelated act (ranking further witnesses, not conceding a build) |
| `organs/corroboration.js::WITNESS_OPERATING_POINT`/`calibrationFrames` | DEF·Pattern | self-declared; a second, measurement-calibration-specific organ alongside `hl-acquire.js` (`declare`) |
| `kernel/notes.js::concede` | REC·Figure | self-declared (`operator:"REC"`); the ledger's own re-zero, distinct from `build-log.js`'s |
| `organs/derivation.js::premisesOf` | NUL·Ground | reasoned, sibling of `measure.js`'s self-declared `admit`; a second gate at the cell carrying the whole measuring door's law |
| `the-fold/seg.js` | SEG·Ground | reasoned; genuinely complements the registered `extent` (§3, §7) rather than duplicating it — answers "is the unit adequate," not "what is the extent" |
| `the-fold/links.js` | EVA·Figure | reasoned, explicit mirror of the registered `web` (`extractReadable`) one register over, for URLs found IN an answer rather than searched for |
| `the-fold/wikidata.js` | SIG·Figure | reasoned, by direct analogy to `cast.js`'s own registered typing — resolves entity identity the way `cast` resolves referent identity, one source over |

---

## 7. What this document does not say

**This is one pass, agent-assisted, not a certification.** Every row
marked *reasoned* is a nomination — the same epistemic status
`THE-27-CELLS.md`'s own "coherence is strictly weaker than
correspondence" already claims for the curated registry, extended here to
a much larger, less individually-scrutinized set. A *self-declared* row
is stronger evidence (the module's own author already committed to it in
writing, often with the domain-legality already checked by the author)
but is still this document's own reading of that comment, not a
re-verified fact — the one contradiction this pass found (§4) was sitting
in a self-declaring file for however long it has existed, undetected
until an outside read compared the prose to the code.

**Large files were skimmed, not fully read.** `app.js` (480KB), `holon.js`
(148KB), `explore-server.mjs` (136KB), and several 20–130KB organ files
(`hypergraph.js`, `capacity-runner.js`, `corroboration.js`, `grounding.js`,
`measure.js`, `source.js`, `ranke.js`, `term.js`, `serve.mjs`) were read by
header comment and exported-function signature, not line by line. Their
classification (mostly "surface/orchestrator" or a short list of
dominant acts) is very likely right at the grain this document works at,
but a function this pass did not individually notice is a real,
acknowledged blind spot, not a claim that no such function exists.

**No new null was spent, no generality gate was run.** `POLICIES.md`
P71's own gate (universal / specimen-scoped / not-applicable, with a
cross-domain replay and a demonstrated-necessity case) governs claims
that a MECHANISM works generally. This document makes no such claim for
any organ — it only reports what act a module's own code already
performs, on the same evidentiary footing `capacities.js`'s own `what`
fields already use. Whether an unregistered candidate in §6 actually
holds up under that gate is exactly the work registering it would
require, and is not done here.

**Coverage is still not correctness.** Restated because it bears
restating at every count, per `THE-27-CELLS.md`'s own CAPABILITY C7:
every cell being independently touched by two or more organs means every
KIND of act is performable somewhere, in more than one place — never that
any one of them is performed correctly, or that its stated cell is the
only defensible one. Only an oracle checks facts (`P60`); this document
checks *acts*, and even that only by reading, not by running anything.

**`live_priors` was checked, not censused.** Its `scripts/` are corpus
acquisition and prior-building, one level removed from any organ that
reads material — they hand received data to organs (a POS prior, a
determiner list, a case-marking table) but perform no move on material
themselves. Naming this exclusion once, here, is this document's whole
treatment of that repo; nothing there needed a row.

---

*Generated by nine parallel research passes plus one direct read, against
the real `cube.js`/`capacities.js`, 2026-09-03. Regenerate by re-reading
the files named in §1 and re-checking any `Cell` value the same way
`eval/capability-coverage.mjs` checks the curated registry — against
`cube.js`'s actual `OP_MODE`/`OP_DOMAIN`/`TERRAIN_BY_DOMAIN`/
`STANCE_BY_MODE` tables, never against this document's own prose.*
