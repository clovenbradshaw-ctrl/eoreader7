# The 27 cells — what each one is, and how it is used

A reference, assembled 2026-08-29 under the same discipline as
`CHAT-POLICIES.md` and its three siblings: **summarize and point, never
re-derive**. `POLICIES.md` wins on any conflict (P58 for the move space,
P64 for the connection pass, P65 for the development pass);
`CAPABILITY-POLICIES.md` carries the map's laws; the eval results docs win
on numbers. This is a standing document — amendments append.

**The cell/organ ASSIGNMENTS here are generated, not hand-tallied.**
Every address, face and organ attribution below was produced by walking
the REAL cube (`eoreader7/native/kernel/cube.js::algebraAddresses`)
against the REAL registry (`capacities.js`) — the same walk
`eval/capability-coverage.mjs` runs. The PROSE around each assignment
(definitions, the "Used" examples, the judgments) is this document's own
and goes stale on its own schedule. To regenerate and check the
assignments, run that driver (it imports the eoreader7 sibling checkout,
so both repos must sit side by side); if it and this document disagree,
the driver is right.

---

## 1. How to read an address

The space is **27 cells = 9 operators × 3 grains**. Everything else is
DERIVED from that pair — there is no third free axis to declare
("remember that it's 27 cells, not 9×9×9" — user correction, on the
record in CLAUDE.md's stance section):

- an **operator** is a (mode, domain) pair — 9 operators, 9 distinct
  pairs, verified mechanically;
- **stance** = (mode, grain) — *what kind of act this is*;
- **terrain** = (domain, grain) — *what kind of place it lands on*.

So the one address `NUL·Figure` unfolds, with nothing chosen, into:
Differentiate (mode) · Existence (domain) · Figure (grain) → terrain
**Entity**, stance **Dissecting**. Each stance names 3 cells (one per
domain); each terrain names 3 cells (one per mode). The projection
arithmetic is asserted, not trusted, in `eval/capability-coverage.mjs::
assertGeometry` — 7 checks.

**The three modes** (what the act does):

| mode | the act |
|---|---|
| Differentiate | cut something apart from something — a floor, a test, a seam |
| Relate | put something beside something — identity, an edge, a judgment |
| Generate | bring something into being — a birth, a composition, a new ground |

**The three domains** (where the act operates):

| domain | operators | the register |
|---|---|---|
| Existence | NUL SIG INS | what exists — voids, entities, kinds |
| Structure | SEG CON SYN | how things hang together — fields, links, networks |
| Interpretation | DEF EVA REC | what the reader holds — atmospheres, lenses, paradigms |

**The three grains** (the size of the difference — Bateson's ladder,
`nul/index.js`'s own header): **Ground** — the ambient a figure will be
read against; **Figure** — one difference from its ground; **Pattern** —
the difference a figure made to the next ground, a recurrence.

**The rule above all of it: cells classify MOVES, never content.**
95.7% of cell assignments survived shuffling the words inside 2,527
paragraphs — deriving a cell from a passage is a refuted move, and it
stays refuted. An edge does not HAVE a cell; it was ADMITTED UNDER one.
A cell is the type of an ACT.

---

## 2. The 27, cell by cell

Status vocabulary, used exactly: **executes** — reachable live from the
terminal / `/act` door through `capacity-runner.js`; **organ** — real,
tested code that runs in its own module and tests, registered as a typed
pointer (asking the runner returns `not_yet_executable`, never a silent
no-op); **EMPTY** — no registered organ, with the gate named. 24 of 27
carry organs; the three empty cells are all Ground-grain, one per mode —
the whole remaining gap is the Ground row.

### Existence — NUL · SIG · INS (what exists)

**NUL·Ground — Void · Clearing** — `measure`
(`measure.js::runMeasurement`). Differentiating the ground itself: a
declared statistic tested against a licensed, deliberately broken null
(P19's measuring door — `series: … broken:<perturbation> draws:`). The
gate refuses statistic/perturbation pairs the registry has not licensed,
because a statistic insensitive to its perturbation fails invisibly.
*Used:* the `/measure` door; 1,021 real drone flights read *censored
above* against the declared null while a spectrum-preserving null called
the same observation unremarkable — two nulls, opposite readings, which
is the licensing gate's whole justification, found live.

**NUL·Figure — Entity · Dissecting** — `clear`
(`clearance.js::makeClearance`). Does this figure clear its ground —
P22's own named integration, built P65: the establishment ladder over a
presence set (P38's law: an index answering "does this exist" is not an
index answering "is this established"). Typed refusal per rung
(`no_presence` / `below_recurrence_floor` / `ambiguous_surface`), the
floor disclosed by measurement, a pronoun rung only under declared
numbers with a typed skip (P41 — a skip never upgrades a standing).
*Used:* on the Second Schleswig War article, 84 referents establish and
258 are refused — bare "Frederick" EXISTS in that material and is NOT
established, which is the distinction this cell is for.

**NUL·Pattern — Kind · Unraveling** — `kindnull` (eoreader7
`native/kernel/entity-kind-induction.js::testKindMembers`, built P65). A
DECLARED kind membership challenged against the same random-subset
binding-energy null the inducer runs on its own basins: the caller holds
the hypothesis, the field answers. Refusals structural, never tuned
(`unknown_members` / `under_powered` / `no_boundary`); a failing set is a
verdict with the measurement attached, never a refusal. *Used:* the
Danevirke basin re-confirmed at p=0.008; a scattered control read
cleared=false at p=0.264 — the null discriminates, it does not
rubber-stamp.

**SIG·Ground — Void · Tending** — `settle`
(`void-loop.js::whatWouldSettle`). Naming what is absent as the
QUESTIONS that would settle it, ordered by what settles fastest — a gap
the loop can name is a question it can ask (P53's second amendment).
`holon.js::searchedVoid` is the same kind of act one register over: a
search that ran and found nothing is SIGNED as a void the model receives,
never mistaken for a search that was never attempted (P32). *Used:*
Johnson admitted-but-unplaced produced the specific question that would
place him; when a 0.5B reader answered it wrongly, the extent wall
refused the answer rather than corrupting the space. A second act lives at
this cell OUTSIDE the-fold's registry: eoreader7's
`adapters/text/surfaces.js` stamps its own `CELL = { op: "SIG", grain:
"Ground" }` — presence extraction as signing what exists in the ground —
which is why `eval/complicated-reading.mjs` labels its stage 1
"SIG·Ground (presence)": a documented typing in the adapter's own code,
not a registry row here.

**SIG·Figure — Entity · Binding** — `cast`
(`cast.js::makeReferentIndex`; **executes**). Referent identity: names
resolve to WHO, not to byte strings (P11) — one implementation of "the
same name," which the resolver and the relation tier (`hypergraph.js`
takes the injected index) project from — the witness tier deliberately
does NOT: it stays byte- and string-anchored by its own design (P32). `distinguish` lands as the SIG half of a SIG+INS pair
("to sign a figure and individuate it are one motion at the surface, two
operators in the algebra"). *Used:* `act distinguish who-is-here at
Entity from encounter ground excerpt.txt broken:rotation` runs the real
organ over real dropped material — `Bezukhov, Rostova` found, the result
attached to the act's own INS entry.

**SIG·Pattern — Kind · Tracing** — `kinds` (eoreader7
`native/kernel/kind-induction.js::projectKinds`, registered P65).
Recurring kind candidates signed PROVISIONALLY from a population's own
interaction field — every basin carries its own null arm, tiny
populations are refused as underpowered, and nothing is promoted by
induction alone. *Used:* on the Schleswig cast, co-arrival features alone
surfaced basin[4] = bustrup, selk, stockfleth_company, vedelspang — the
February retreat's micro-geography, discovered from structure with no
word semantics anywhere.

**INS·Ground — Void · Cultivating — EMPTY.** Generating ground where
none exists. The real candidate is P23's preflight
(`gatherPreflightMaterial`: a materialless grounded turn gets ONE search
before the model drafts — generating the ground the checks need), which
lives in `app.js`, the fold-architecture session's contract; registration
waits on that boundary rather than being guessed at (CAPACITY-DEVELOPMENT-
PLAN.md, Tier 2).

**INS·Figure — Entity · Making** — `cast` + `build`
(`build-log.js::makeBuildLog`). Birth. The INS half of `distinguish`
individuates the signed figure (and is where a capacity's RESULT
attaches — results attach, they never re-type); a build's log begins
PROPOSE · INS · Figure — "birth is Generate·Existence by the handbook's
own axes." *Used:* every code artifact in the Folds panel is born here;
every `cast` execution lands its referents on this cell's entry.

**INS·Pattern — Kind · Composing** — `skill`
(`skills.js::runSkilledTask`). A known procedure instantiated onto new
material (P14): when a skill claims a task on its declared anchors, zero
model calls; the model's remaining job is slot-filling, one
grammar-constrained call at most. The admission gate is the cell's
discipline: a skill without a check is refused as a wish. *Used:* the
skill → slot-fill → model ladder, every descent a typed `open` entry.

### Structure — SEG · CON · SYN (how things hang together)

**SEG·Ground — Field · Clearing** — `extent`
(`void-shape.js::spaceFrom`). The extent a question's space must cover,
AND ITS UNITS, made operative — the module's own declared SEG·Ground
row. *Used:* `placeFiller` refuses spans the extent cannot contain
(widening an extent is a deliberate act with its own REC, never a side
effect); and the cell's sharpest lesson is its own failure mode: a
year-grain extent read `Hannibal Hamlin (1861-1865)` as complete and
could not see Johnson's six weeks inside 1865 — the defect was THIS
cell's ("the extent to be covered, and its units"), not the loop's.

**SEG·Figure — Link · Dissecting** — `patch`
(`build-log.js::applyOps`). The delta carriage's cut primitive: one
`{op: "SEG", find}` snips one span out of one artifact (P16). The act is
derived OFF THE BYTES (`deriveOp`/`readOps`) — never off a model's label,
because measured live, both small models say "INS" while supplying a
replacement. *Used:* the delta carriage's DELETION-typed ops land here — `{op:
"SEG", find}` with an empty `add`; `deriveOp` types a replacement SYN
and an insertion INS (other cells' acts), and a revision whose ops fail
to apply descends to the full-code SUPERSEDE fallback, touching no ops
at all ("ops that apply → patch entry; ops that don't → the old
full-code ask"). Application is strict-first, `every` only as the
disclosed rescue of an ambiguous match.

**SEG·Pattern — Network · Unraveling** — `unravel`
(`unravel.js::unravel`, built P65 — the plan's one no-candidate frontier
cell). Cutting a pattern apart at its own seams: parameter-free
separation at the network's bridges (a structural fact, not a score), a
2-edge-connected network refused `no_seam` rather than cut with an
invented threshold, cut edges addressed by the caller's own indices.
*Used:* the Schleswig belief graph (gated by clearance) cut at 16 seams
into a war-narrative core and its one-edge asides — `british —army→
india` named as exactly the aside it is.

**CON·Ground — Field · Tending — EMPTY.** Maintaining the connective
ground. The candidate is the running summary's own machinery (fold.js's S1
store; `app.js::refreshSummary` and `fold.js::advanceSummaryFold`) — but
the aperture gate that
JUDGES whether ground is carried is already registered (EVA·Ground), and
splitting maintain-the-ground from judge-the-ground needs a cleaner
boundary than a nomination can draw from outside those modules; both
belong to the fold-architecture session. Gated, not guessed.

**CON·Figure — Link · Binding** — `relations`
(`hypergraph.js::makeRelationReader`; **executes**). The material's own
subject–verb–object edges, read against a vocabulary measured from the
text itself — the grounding ladder's relation tier (five typed verdicts:
bound / contradicted / unbound / beyond-reach / unheard), the seam
`evaluate` computes through (P36), every edge span-verified against real
bytes (P56: 2,584/2,584). *Used:* `query subject:X verb:Y` answers from
the graph referent-aware; on the Schleswig article, 578 edges heard, the
connector-boundary ceiling shown as heard rather than cleaned up.

**CON·Pattern — Network · Tracing** — `network`
(`network.js::makeNetworkBinder`). A recurring ARRANGEMENT found and
bound: recognizers injected, `RECURRENCE_FLOOR = 2`, a cycle of one shape
binds nothing (CON *relates*), an unrecognized line is a hole and never a
wildcard. **The exemplar cell of the whole map**: its emptiness was
CONVICTED the only way that is allowed — a falsifiable prediction stated
before the file existed (a Figure-grain reader on Pattern-grain material
returns ZERO edges, not few), confirmed on a real fetched list page —
then P58 built this organ in answer, and P64 registered it. *A grain gap
floors; a vocabulary gap degrades* — measure which, before spending a
tenth vocabulary configuration.

**SYN·Ground — Field · Cultivating** — `compile`
(`predigest.js::compilePriors`). Sedimented readings merged into ONE
carried experiential ground (P60): compile-once priors with a corpus
manifest and received-priors inventory (pointers with givers, typed gaps
for absences, never copies). Compiling never promotes a standing.
*Used:* 111 works sedimented in 34.1s into a 174KB standing artifact the
mechanical-reasoning drivers then stand on.

**SYN·Figure — Link · Making** — `hear`
(`hyperlexicon.js::makeHyperlexicon`). A re-sighting folds into the SAME
note with witnesses and spans unioned (P57): first sighting INS·Figure
(a birth, terrain Entity), later sightings SYN·Figure (corroboration
makes it structural — same stance, the terrain moves; a finding that fell
out of the arithmetic rather than being designed). `admit` returns
`turnedAway` and it is not optional. *Used:* two pages agreeing become
one note with two witnesses, never two notes; the P57 door is where the
grammar lens is wired asymmetrically.

**SYN·Pattern — Network · Composing** — `graph`
(`relations-chain.js::chainRelations`). Relations linked to
document-order neighbours and referent siblings — "relations only make
sense linked." *Used:* every hop out of a statement gets one shape
(`↑ before` / `↓ after` / `⇢ shared cast`), the Explore pivot's own
machinery. The kernel's reaction circuit (P60/P63 — the two-hop
aunt/uncle derivation, every hop carrying provenance to real byte
addresses) composes at the same stance, Composing at Network — but that
reading is THIS DOCUMENT'S OWN NOMINATION, not a documented typing (the
circuit's own `withdraw` is typed REC·Pattern in the P64 ledger, and
nothing in reaction.js stamps a cell); the registered organ carries the
cell alone.

### Interpretation — DEF · EVA · REC (what the reader holds)

**DEF·Ground — Atmosphere · Clearing — EMPTY.** Defining the
interpretive ambient. Two candidates are named (the constitution's one
folded paragraph, `constitution.js::CONSTITUTION_PROMPT`; the
compiled-priors load) and neither typing is obvious enough to nominate
without a worked case — what would a SPECIMEN even be, a turn whose
interpretive ground is definably different with the definition absent?
Until that has a measured answer the cell stays honestly empty. It is
also the only cell whose absence has never produced a live incident.

**DEF·Figure — Lens · Dissecting** — `priors`
(`priors.js::checkPrior`). One claim checked against the live_priors
corpus, provenance-carrying, zero egress. In the void loop this is THE
cut: DEF is the only Dissecting cell in the loop's declaration, and
cardinality is the single cut — exactly the cell whose absence produced
the two-filler-slot-read-as-one specimen (P53). *Used:* the CELL is where the loop's cut lands — through `grid.js`'s
DEF acts, not through `checkPrior` (two acts, one cell), and the loop is
not yet wired into a live turn (P53's own disclosure); `checkPrior`'s
live use is the claim-checking tier over live_priors.

**DEF·Pattern — Paradigm · Unraveling** — `declare`
(`hl-acquire.js::acquireCandidates`). Candidate functional/transitive
declarations acquired from real material in two disclosed tiers —
REFUTED and CANDIDATE, never GIVEN — because `functional(r)` is a
Pattern-grain claim and the grain theorem says a corpus can refute one
but never earn one (P37). *Used:* HL's R2 functional exclusion is worth
exactly as much as this cell's register; the "advises"-looks-clean-until-
one-more-sentence trap is its conformance case.

**EVA·Ground — Atmosphere · Tending** — `atmosphere`
(`aperture.js::meterSnapshot`). The reader's own accumulated ground,
metered: a second tier-stack meter pointed at the conversation's
discourse stream, its verdicts CONSUMED as posture and never displayed —
the summary-refresh gate (a summary is carried when no arrival crossed
the null's median; refreshed exactly where the ground moved), the startle
regime (surprise contracts the present window toward the exchange that
caused it). *Used:* measured live — the safe gate saved 2/9 refresh
calls and never went stale; the unsafe one saved 8/9 and shipped a stale
topic.

**EVA·Figure — Lens · Binding** — `web` (`web.js::extractReadable`) +
`witness` (`witness.js::witnessCode`). Judging a figure through a lens.
`web` is P13's one sanctioned egress: a flagged claim's own words
searched, pages judged by the SAME containment fold as everything else,
verdicts never phrased stronger than "stated by N of M pages (K distinct
hosts)." `witness` is the structural half of the patch parliament: does
one landing actually compile — the EVA every build-log patch passes
through. *Used:* the proof-seeking chip walk; every landed patch's
witness aims the next ask.

**EVA·Pattern — Paradigm · Tracing** — `standing`
(`capacity-runner.js::mergeTestimony`). A claim's standing ACROSS
witnesses — AGREE / SINGLE / DISAGREE / CONTRADICTED / UNDETERMINED — a
property of the
SET that no member carries (P39). A self-witness (`self:model`) never
co-signs corroboration alone; a self-witness opposed by a real refusal is
still a real disagreement, on the record. *Used:* the crown render
("According to X, …") draws from this cell's output; the MHC battery's
order-13 (metasystematic) item runs THIS organ, because evaluating at
Paradigm grain is exactly what metasystematic coordination is.

**REC·Ground — Atmosphere · Cultivating** — `regime`
(`source.js::atmosphereBoundaries`). The ambient reading regime's
tolerance-triggered re-zero. The literal numeric firing site is the
ENGINE's `loops/atmosphere.js` ("rezero — a new ambient ground begins");
`atmosphereBoundaries` is the-fold's consumer, turning those firings
into chunk boundaries through the injected `readAtmosphere` — the
registry row's own parenthetical, restored here. *Used:* atmosphere reads run at hop = window (the calibrated
stride); the recourse-locality measurement (2026-08-21) is this cell's
own disclosed finding — regions grow to cover nearly a whole read before
conceding, recompute grows near-linearly, kept as a named open question
rather than papered over.

**REC·Figure — Lens · Making** — `rezero`
(`build-log.js::makeBuildLog` — its returned `rezeroBuild` is the
re-zero act, matching the registry's own fn column). A judged projection's ground conceded
and the next ground born: a complaint at a widget IS a re-zero
(EVIDENCE · REC · Figure carrying the operator's words verbatim, then a
fresh ground with no `supersedes` — a re-zero concedes a ground, it does
not compile a new whole out of the old one). `grid.js::concedeEvaluation`
is the same act for checked claims (P36 mirrors it exactly): a later
evaluate that disagrees with an earlier determined verdict concedes it
first. *Used:* every "I don't like the colors" that lands on its own
fold instead of forking a new one.

**REC·Pattern — Paradigm · Composing** — `reshape`
(`void-loop.js::reshape`). A finding contradicting the DECLARED SPACE
re-zeros the space itself — the paradigm, not one figure: reshaping
resets the stance ladder, carries testimony across, and returns
extensionally-refused candidates to `wish`, because their refusal rested
on the extent just conceded. The kernel's `declarations.js::concede` and
`reaction.js::withdraw` (with its transitive cascade) are the engine-side
siblings. *Used, measured live:* FDR's space reshaped `1933-1937 →
1933-1945`, re-admitted the re-opened filler, descended twice — and then
refused to commit, because "Henry Wallace" alone is a true sentence and a
wrong answer.

---

## 3. How the cells are used together

**Acts land ON cells — the composition law.** The terminal's `act`
command and chat's `/act` door speak one grammar (`<verb> [<object>] at
<terrain> from <stance> …`, grid.js), and every landed act is typed by
operator and grain on an append-only log. `distinguish` is the worked
pair: one motion at the surface, two cells in the algebra — SIG then INS
at the DECLARED terrain's grain (at Entity that is SIG·Figure/INS·Figure;
P22's own worked example at Network lands SIG·Pattern/INS·Pattern),
`checkCubeProgression` silent across the pair at any grain. Two
stance faces coexist and must not be merged: the DERIVED stance is a
property of a cell (computed, cannot be wrong); the DECLARED stance
(`from <stance>`) is the actor's posture, refusable three ways.

**The void loop is three cells, read off — not chosen.** Answering a
question runs DEF·Figure (cut the candidates out) → EVA·Figure (bind
each to the ground) → REC·Pattern (compose a new ground when the binding
fails). Two facts fell out of the table rather than being designed: DEF
is the loop's only Dissecting cell, and DEF/EVA share a terrain and
differ only in stance — you cut with the lens, then bind with it, which
is why they are a loop. The loop's own stance law generalizes grid.js's
one pinned illegality: it may not CLOSE from the posture that proposed
its fillers, or the EVA between was ceremony.

**Coverage is a diagnostic — and an empty cell is a lead, never a
verdict (P64's law).** `moves.js` enumerates the 27 and computes
coverage against the registry; `eval/capability-coverage.mjs` reads all
three faces and grades every empty cell's neighbours as leads. Three
kinds of hole share any zero: REGISTRY DEBT (the organ exists,
unregistered — 10 of the 18 then-empty cells, P64), REAL INCAPACITY (convictable
only by a stated-then-confirmed falsifiable prediction — CON·Pattern is
the sole exemplar, and its organ now exists), and PROBE ERROR reported
as incapacity (P44's four wrong probes). The companion diagnostic: *a
grain gap floors, a vocabulary gap degrades* — when a reading returns
ZERO of something rather than few, look for the empty cell before tuning
the vocabulary.

**Reading a complicated text is the cells in sequence.**
`eval/complicated-reading.mjs` is the worked demonstration: SIG·Ground
presence → NUL·Figure establishment (each stage consuming the previous
stage's admissions AND refusals) → CON·Figure stated edges → SEG·Pattern
separation gated by clearance → SIG·Pattern/NUL·Pattern kinds with the
declared door confirming and the control refused. The refusals are
load-bearing: 258 below-floor refusals are what keep the belief graph
clean enough for the null to mean anything.

**What the map does NOT say** (CAPABILITY C7, restated at every count so
nobody inflates it): 24/27 means every kind of act outside the Ground
gaps is performable SOMEWHERE — never that any is performed correctly.
Coherence is strictly weaker than correspondence: cells, stances and
affordances are constrained only by coherence, productivity, and a named
giver's declared risk, and only an ORACLE checks facts. Depth is the
OTHER axis entirely — the MHC battery (P44) scores how high an ORDER of
task the organs reach (stage 9 on War and Peace, stage 6 on Borodino,
with a real order-7 pronoun ceiling), and pairing depth per cell is the
map's own named future work. And most registry rows are typed pointers:
two CAPACITIES execute live from the terminal (`cast` and `relations` —
`cast` spans SIG·Figure and INS·Figure, so three cells carry an
executing organ);
everything else runs in its own module and tests, and asking the runner
returns `not_yet_executable` — a real refusal naming what is missing,
never a silent no-op.

---

## 4. The three empty cells, plainly

All three are Ground-grain — one per mode. The kinds of act this
instrument cannot yet perform anywhere are the maintaining-the-ground
kinds:

| cell | stance | what it would be | the gate |
|---|---|---|---|
| INS·Ground | Cultivating | generating ground where none exists | the candidate (P23's preflight) lives in app.js — the fold-architecture session's boundary |
| CON·Ground | Tending | maintaining the connective field | maintain-vs-judge needs the owning session's own boundary (the judge, EVA·Ground, is already registered) |
| DEF·Ground | Clearing | defining the interpretive ambient | no workable specimen yet — the one absence that has never produced a live incident |

Per C4, all three are LEADS: no falsifiable emptiness-prediction has
been stated for any of them, so none may be read as incapacity. And by
the lead-grading's own rule (`moves.js::neighbours` — an empty cell whose
SAME OPERATOR is occupied at a neighbouring grain is the strongest kind
of lead), all three are the strongest kind: the coverage driver measures
every one of the three operators occupied at BOTH other grains
(CON → CON·Figure and CON·Pattern; DEF → DEF·Figure and DEF·Pattern;
INS → INS·Figure and INS·Pattern).
