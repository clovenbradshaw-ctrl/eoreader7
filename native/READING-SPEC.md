# The reading spec — what constrains eoreader7 development and usage

Binding, in V7-CUT.md's own sense: the compatibility law says 6.1 behavior is
the contract and native paths replace legacy only under conformance. This file
restates the parts of `legacy-eoreader6.1/READING-POLICY.md` (P0–P7, attempt
log A1–A25) that this repo's own work violated in one session, each with the
violation that earned its place here, and the standing rules that came out of
re-learning them. Enforced where mechanical by
`native/conformance/reading-spec.test.mjs`. Amend by appending.

## S1 — The constitutional reader is runnable, and it is the baseline

> **giver:** earned-here — 639419d

The reader P0 names — the HOST assembly (`packages/host/corpus.js`:
`createSession` / `admitChunked` / `sessionReferents` = discoveredCast:
surfaces → witnessed referents → pronoun binding → relation vocabulary, with
priors injected) — runs from this repo via
`native/eval/constitutional-read.mjs`. Measured here on Frankenstein with the
language and coref priors injected: 99 referents, 648 pronoun mentions bound /
809 unresolved (typed), 2,925 triples, 25/25 spans byte-verified.

**Rule.** Any claim about what "the reader" does is measured against this
assembly or names precisely which stages it lacks. A native path is not "the
reader" until it reaches stage parity under conformance; until then it is an
assembly with a name and a stagesNotRun list. (P0: "any claim about 'what this
system can do' must name the assembly it was measured on." Earned: this
repo's native path was reported as the reader while missing P2 stages 4–8.)

## S2 — A prefix is a different material, not a smaller one

> **giver:** earned-here — 639419d

`discoverRelationVocab` recurrence is a whole-book statistic and COLLAPSES
under truncation (Dracula whole: 135 recurring; at 7%: 3). No mechanism may be
justified by a sliced measurement; a truncated run says `truncated: true` at
the point of the claim. (P5.5 — the driver, not the theory. Earned: three
claims retracted in `native/eval/results/vocabulary-scale-FINDING.md`.)

## S3 — Lookahead is not reading

> **giver:** earned-here — 639419d

A driver that derives state over the whole text and then scores every unit
with it has read sentence 12 using evidence from sentence 9,000. Such numbers
are LOOKAHEAD BOUNDS and are labeled so. The causal arm is the real reader,
and its difference from the bound is a finding, not an error (measured:
causal finds MORE link forms and FEWER arrangements). (P2 stage 2: "built
only from material already read — `groundUpTo` never slices forward.")

## S4 — Accumulation is the direction; re-grounding is the documented posture; parity gates the swap

> **giver:** earned-here — 639419d

Recall is retrieval over what the Fold holds, and the honest grain is one
proposition — slowness there is an incremental-algorithm defect, never a
license to coarsen (measured: the re-scanning refresh made the
one-proposition grain cost 16× and made batching look necessary). BUT the
6.1 perceiver's periodic re-ground is not an accident: attempt A11 records
it as the design ("the helix does not stream — it re-grounds"), and an
early sentence re-read under a matured closed class is part of the behavior
the compatibility gates certify. Measured here, the hard way: replacing the
re-ground with strict accumulation lost Walton from Frankenstein's cast and
the CI gate caught it — the "more causal" rewrite was a different reader
wearing the name. **Rule:** the accumulate-only reader is real future work
and lands ONLY behind conformance parity with the constitutional read
(cast, bindings, relations); until then `kernel/activation.js` (decay,
dmdWindow) stands as the tested organ, unwired into the perceiver, and the
perceiver's re-ground stays.

## S5 — Activation decays; the rate is measured, not set; length is not reach

> **giver:** earned-here — 639419d

Decay belongs to the kernel — losing activation is a property of anything
read in time (language, music, video), not an NL heuristic. Gamma is derived
from a window (`gammaFor(w) = 1 − 1/w`, tiers.js's own derivation) and the
window is found by the difference that makes a difference
(`kernel/activation.js::dmdWindow`): the shallowest depth at which forgetting
everything older changes no conclusion, with `reach_exceeds_candidates` as a
typed gap — never a silent fall-back to the widest. Two refusals guard the
two old mistakes: never enlarge a window to fix recall (P1.1, attempt A4),
and never derive a window from material LENGTH (the engine's own eight-file
refusal: "the reach of the present is never derived from material length" —
dmdWindow derives from material BEHAVIOR, which is a different claim, made
explicit). `window: null` is the disclosed undecayed control arm, never a
silent default meaning.

## S6 — The kernel never speaks a medium's grammar

> **giver:** earned-here — 639419d

An arrangement has ends, not parts of speech. The kernel takes participants
by ordinal position; `role` is caller-declared annotation the kernel never
interprets. Any kernel read of role names like "subject"/"object" is the
dependency inversion V7-CUT forbids (`spec ← kernel ← adapters`) — measured:
composition and kind-structure went dark on everything a text adapter had
not labeled, "not because the structure was absent but because nobody wrote
'subject' on it." SVO, verbs, and word adjacency live in
`adapters/text/relations.js`, which is "medium-specific by construction" —
and P6 already names that: "text is the special case." Grammar priors REFUSE
candidates and never admit them (P3: "never patch a missing prior by
loosening an engine gate").

## S7 — Priors are injected and stated; their absence is stated too

> **giver:** earned-here — 639419d

Every reported run names which priors were injected. A run without the coref
prior is a result about an unprimed reader and says so. (P3, verbatim policy.)

## S8 — Read the attempt log before attempting

> **giver:** earned-here — 639419d

READING-POLICY's append-only attempt log exists so dead ends are not
re-entered. This session re-entered several (window-derivation shape ≈ A4's
territory, slice measurement ≈ P5.5, SVO-as-reader ≈ A17/P6). The standing
rule: before building any reading mechanism in this repo, check P0–P7 and
A1–A25 for the prior attempt; cite the entry when building on or departing
from it. New refuted attempts are appended there (or here, when v7-specific),
never merely fixed in silence.

## S9 — Low sets possible for high; high sets probability for low

> **giver:** Arthur Koestler, *The Ghost in the Machine* (1967) — the holon and
> hierarchic order's "fixed rules and flexible strategies". The two directions
> below are the Janus-faced holon's two faces: the rootward face, self-assertive
> under its own fixed canon, is what a level makes POSSIBLE; the leafward face,
> integrative and steered from above, is what is made PROBABLE. The law's wording
> and its two worked levers were earned here (`levers-RESULTS.md`, 7f40a42); the
> formulation it converges on is Koestler's and is his to be credited with.
> See `PRIOR-ART-INVENTORY.md`.

The two directions of inference are different in KIND, and every
subassembly declares which direction each of its inputs works:

**Upward is possibility.** What exists at a lower level — the material's
own tokens, occurrences, arrivals — sets what MAY exist above it. Nothing
above may manufacture possibility: a received prior, however good, admits
no form the material does not attest (the constitution's "grammar priors
refuse and never admit" is this law's special case); a plan's words grant
no retrieval the question's words did not (the-fold's holonic deviation,
disclosed there); a measured act licenses no inflection the book does not
contain.

**Downward is probability.** What is established at a higher level — a
measured act, a bound identity, a witnessed structure — sets which of the
possible below is EXPECTED, heard, or admitted. Nothing below may assign
standing by itself: recurrence alone admitting descriptor beings was this
violation, measured ("the murder" recurred like a being and was admitted
like one; levers-RESULTS.md) — the low evidence was real, and the standing
it claimed was the high's to grant.

The session's own levers are the law's worked examples, one per direction:
`anchorSpans` (a BOUND identity — high — licenses a token position — low —
as an anchor; the bare string "he" licenses nothing), and `actClosure`
(the material's tokens — low — are the possibility wall; the measured act
— high — selects which possible forms are heard; the prior only decides
sameness and admits nothing). A violation in either direction reads the
same way at review: an input crossing levels without naming its direction.

## S10 — Three classes of math, one per tier; use the weakest that answers, name every crossing

> **giver:** earned-here — 47394b1

Arithmetic (monotone counting) is the LOG tier: identity and witness.
A count never retreats — an arrival witnessed stays witnessed, the
append-only log only grows, recurrence floors are order comparisons.
Persistence is monotone arithmetic by construction; S9's upward clause is
an arithmetic statement (possibility accumulates by counting, never by
anything fancier).

Geometric (ratios, exponential decay) is the PRESENCE tier: activation
`v·γ^(now−t)`, `gammaFor(w) = 1−1/w`, margins `(top−second)/top`. The
reach of the present is ratio-scale.

Transcendental (log, entropy, KL) is the INFORMATION tier: transfer
entropy, surprisal, aperture width — multiplicative evidence made
additive, importing full probability semantics, the strongest assumptions
on the ladder.

The Network ladder climbs the classes in order, and that is the law's
shape everywhere: count (arithmetic) sets what is POSSIBLE; a null's
frequency ratio (geometric class) grants STANDING; transfer entropy
(transcendental) grants DIRECTION. Each rung of meaning requires at least
the next class of math, with its assumptions earned — never dressed on.

**Rule.** Use the weakest class that answers; name the class at every
crossing. The three failure modes, two already measured in this repo:
(1) an arithmetic quantity in a geometric slot — the fold-unit clock bug,
where observation SIZE advanced the decay exponent and a window measured
as 8 decayed as ~1.5 (kernel/activation.js's own docstring carries it);
(2) a count dressed as standing — recurrence-alone being admission
(levers-RESULTS.md); (3) a transcendental magnitude reported where its
probability semantics are not earned — TE strengths from sparse arrivals
are sound as RANKS, not comparable as magnitudes across pairs with
different arrival counts, and any report of them says which it means.
Corollaries: aggregate multiplicative quantities geometrically or by
order statistics, never by arithmetic mean of ratios (the rhythm prior's
median and the surprise meter's max comply); a floor declared on a
decayed quantity is a cross-class number and says so.

## S11 — A type-level tally never answers an occurrence-level question

> **giver:** earned-here — daccec2

The being-evidence gate (anchoring.js, driven by levers.mjs) decided whether
a descriptor ACTS by asking whether the following word is a verb, answered
from POSPrior@1's type-level counts (`VERB > AUX`). Measured at its own 33
reading positions on Frankenstein: precision 1 in 5 — `had` (AUX 154 / VERB
335) passes the wall and licenses "the murder had been committed", a passive
whose surface subject is the patient. Two distinct error modes, neither a
threshold: linear adjacency across a PP boundary ("the appearance of the
city had…" scores `the city`), and passive voice (grammatical subject is not
agent). **Rule.** Evidence for a per-occurrence question is carried per
occurrence, and the interface must be able to hold it: `beingEvidence:
Map<surface, count>` flattens any per-occurrence resolver before it can
land, so the type signature was the bug. The engine's own roles.js states
the principle ("a surface span is never the thing with a role — the
OCCURRENCE is"); this entry records the price of ignoring it. (Earned:
`native/eval/results/being-superposition-RESULTS.md`,
`being-construction-frankenstein.json`.)

## S12 — A received prior declares what it dropped, because that is where its consumers' collapses come from

> **giver:** earned-here — daccec2

`build-pos-prior.mjs` is faithful to its own discipline ("ambiguity is
preserved, never resolved") and still seeded S11's defect: CoNLL-U carries
HEAD/DEPREL — the construction each `had` sat in — and the prior keeps
`form → {UPOS: count}` alone. The superposition survived; the VARIABLE THAT
WOULD COLLAPSE IT did not, so the first consumer collapsed it globally with
one `>`. Dropping those columns is a boundary drawn (a SEG, in the algebra's
terms) and it was never declared, so downstream the absence read as "the
treebank doesn't know" rather than "the builder cut it." **Rule.** A prior's
build step states what the source carried that the output does not, in the
output's own provenance. And the repair is a conditioning level, not a
smarter threshold: `ConstructionPrior@1`
(`native/scripts/build-construction-prior.mjs`, UD EWT, CC BY-SA 4.0)
conditions an ambiguous form's distribution on the dominant class of the
following token — observable at read time, where HEAD/DEPREL (a parse) are
not. `adapters/text/construction.js::collapseForm` resolves ONE occurrence
against it, with a declared ladder (construction → form → typed gap) and a
third standing beside collapsed and gap: **live** — the cell exists and does
not clear the caller's floor, so the superposition did not collapse, named
as a result. Measured: `had|been → AUX 0.967`, `had|the → VERB` (same form,
two occurrences, two classes), 7 of 12 tag-wall admissions overturned, 0
false rescues — and the two PP cases were predicted NOT to be fixed before
the run, because their defect is S11's boundary error, which a class
collapse cannot see. (Enforced: `native/tests/construction.test.js`, 9
cases against the real priors.)

## S13 — Phase comes from the trajectory; counts cannot carry it, and batch decomposition is lookahead

> **giver:** earned-here — daccec2

Investigated: the quantum formalisms for holding a span's readings in
superposition until context collapses them. The honest boundary, recorded
so it is not re-crossed in either direction: (a) Born/Lüders over a density
matrix built from corpus counts reduces EXACTLY to Bayes' rule — counts give
|amplitude|² and the interference term cannot be estimated from frequencies,
so that dressing adds notation, not physics. (b) What IS computable from
exactly our data: contextuality — sheaf-theoretically, the obstruction to
gluing per-context readings into one global assignment (contextual fraction
by linear programming; for language, which signals, Contextuality-by-Default)
— named as real unbuilt work. (c) What supplies the missing quantity
mechanically: **Dynamic Mode Decomposition** (`native/kernel/dmd.js`, pure,
8 analytic conformance cases). Its eigenvalues are complex — magnitude is
growth/decay, argument is FREQUENCY — estimated from how the reading
evolves, approximating Koopman eigenvalues; a damped rotation ρ=0.95 θ=0.4
is recovered to 1e-6 as a genuine conjugate pair, and two modes mixed
through a dense observation are separated by eigenvalue, not by threshold.
Two standing constraints: batch DMD over a whole reading is S3's lookahead
verbatim — a causal consumer feeds prefixes or streams (Hemati, Williams &
Rowley 2014, incremental, equivalent to batch); and decomposition is not
spreading — memory/activation.js's one-hop rule rejects the similarity
FLOOD, an objection that does not transfer to decomposing an already-read
trajectory, which is why the cap is respected rather than lifted.
**Disclosed name collision:** `kernel/activation.js::dmdWindow` is
Bateson's difference-that-makes-a-difference window; `kernel/dmd.js` is
Dynamic Mode Decomposition. Unrelated meanings, same initials, both keep
their literature's own name; confusing them would misread S5's window
measurement as a modal decomposition or vice versa.

## S14 — The operator order is derivable from the engine's own axes, and the constant disagrees with them

> **giver:** earned-here — daccec2

Measured, in this repo, against the real engine: sorting the nine operators
domain-major, mode-minor by the engine's OWN exported `DOMAINS`
(Existence, Structure, Interpretation) × `MODES` (Differentiate, Relate,
Generate) yields NUL SIG INS · SEG CON SYN · DEF EVA REC — the canonical
helix, where every adjacency is a presupposition (nothing is signed that was
not encountered; nothing bonded across a boundary not drawn; nothing
evaluated against definitions that do not exist). The engine's
`OPERATOR_ORDER` constant (NUL SEG SIG CON EVA DEF INS SYN REC) is the one
constant that disagrees with the engine's own axes, and both places it
diverges are the same failure — an undeclared act: `validateChain` REJECTS
DEF → EVA, the exact sequence grid.js's own wish→testimony fold performs
(latent only because that fold matches by object, not by supersedes-thread);
and kinds.js:469 hard-codes EVA before DEF on the SAME target, where the EVA
tests against `existence`/`constraint` gates computed earlier and never
logged as the DEFs they are. Declare the missing SEG (S12) and the missing
DEF and the canonical order is restored — the constant is a fossil of
undeclared acts, not a dependency fact. **Rule.** `native/kernel/task-log.js`
carries its own copy of the constant; changing it is a behavioral change
gated on conformance (V7-CUT's compatibility law), so the constant STANDS
until that pass, this entry is the recorded reason it is wrong, and no new
native code hard-codes an operator sequence — an ordering claim cites either
the axes derivation or this entry's fossil finding, never the bare constant
as authority.

## S15 — The material states its own decay; read it before declaring one

> **giver:** earned-here — daccec2

A writer chooses every returning mention's FORM from a model of what the
reader still holds (Accessibility Theory; Givón's referential distance), so
the mapping gap-since-last-mention → form-of-return is the writer's own
intended memory curve, measurable per material with no typed dials (dyadic
bins; majority = where a plurality flips). Measured on Frankenstein
(`eval/results/writer-decay-RESULTS.md`): pronoun returns majority only at
gap 1, extinct past 128 — the activation layer; bare-name returns at
83–100% share after gaps of 1,000–4,000 sentences — the identity layer;
definite descriptors PEAK in the middle distance (.627 at 64–127) — the
writer's own re-grounding device. P1's "activation decays, identity does
not" is thereby a measured fact about how writers write, not only this
engine's design. **Rule.** A reader's window and decay for a material are
read from the material (writer-decay for the binding clock;
fold-prediction's continuum for the retrieval clock) before any number is
declared; a declared window where a measured one is available says why. And
the two clocks are never conflated: the binding/present clock is short and
the retrieval/identity clock is undecayed, and handing one layer the
other's clock is the measured way to lose (fold-prediction's own negative).
(Earned: this session declared PRONOUN_PRESENT.window = 8 in three drivers
while the material's own measured answer was ~1–2.)

## S16 — The kernel is omnimodal; the medium's grammar lives in an adapter; every dial is a prior awaiting the material's own measurement

> **giver:** earned-here — daccec2

S15's decay finding, generalized to an architecture rule with a checklist.
The return-curve measurement was rebuilt to it as the exemplar:
`kernel/return-curve.js` knows events, positions, and discovered form
labels — a leitmotif's fragment-vs-full-restatement and a pronoun-vs-name
return are the same curve to it (pinned by a music case in
`return-curve.test.js`, no kernel change); `adapters/text/accessibility.js`
is the NL organ that names prose's forms and reads the curve as a memory
design; and `writerDecay({ prior })` starts from a genre-level prior
(giver named) and supersedes it with the material's own curve once the
material holds more returns — the supersession REPORTED in `basis`, never
silent. **Rule.** A new reading capability lands split this way from the
start (S6 already forbids the kernel speaking a medium's grammar; this adds
the prior→material ladder as the dial discipline), and existing typed dials
are worked off per `eval/results/meta-parameters-INVENTORY.md` — which also
names the dials that must NOT be learned: structural floors (Born gate,
binding's arrivals ≥ 2) are theorems about the mechanism, not models of the
material, and un-typing them would be un-earning them.

## S17 — Forgetting is a recall mechanism when its shape matches the need-odds; the shape is a prior, then a measurement

> **giver:** earned-here — daccec2

The research and the run: `eval/results/forgetting-for-recall-RESEARCH.md`
(five pillars, five fields — Anderson & Schooler's rational analysis;
Bjork's two strengths; Richards & Frankland's transience-prevents-
overfitting; the contextual-interference effect in motor learning, which
is what makes the mechanism omnimodal and kernel-resident per S16; Gers'
forget gate on continual prediction). Measured here, prediction frozen
before the run: on 3,102 prequential next-arrival steps, power-law
activation (ACT-R base-level, received d = 0.5, giver named) beats
undecayed accumulation (0.0582 vs 0.0549, paired z = 3.26) where
exponential decay had lost to it (0.0382) — and the power-law edge is
ORDER-BORNE: under sentence shuffling it vanishes and reverses
(z = −1.55). **Rule.** The retrieval layer's forgetting curve is
power-law (frequency-preserving), never exponential and never absent; the
binding layer's is the writer's measured window (S15); and the two are
never conflated (S15's rule, now with the retrieval half measured too).
The fully-empirical need-odds estimator (the material's own cells, no
functional form) was directionally right and NOT significant (z = 0.72):
per S16's ladder the received prior stands until the material's own
measurement holds more evidence — recorded so nobody reads the prior's
win as a law against measuring. Named, untested, next: memory/
activation.js's df tables and Hebbian edges never forget (edgeSlots is
competition-capping, not decay) — the fan-effect prediction on long
material is the standing open claim this entry leaves on the board.

**Amended by falsification, same day: the received exponent is a
text-scale prior, not a constant of the mechanism.** Put where it could lose (`eval/results/forgetting-falsification-RESULTS.md`,
predictions frozen first): at ENTITY level on a real book the law
strengthened — anticipating which cast referent returns next improves 57%
relative over frequency (z = 5.32, order-borne) — and on real audio
(chroma states at ~46ms frames) the FIXED d = 0.5 form broke exactly as
the frozen risk clause said it might: persistence dominates, recency
crushes the received power-law (z = −51.98), while the material-measured
need-odds estimator ADAPTED to the medium's own arrival statistics and
landed within noise of the persistence oracle at 2.8× the received prior.
**Rule, sharpened.** The omnimodal mechanism is need-odds matching, not
any exponent: the received d = 0.5 is a text-scale prior (Anderson &
Schooler's environments were day-scale text needs), consulted first and
superseded by the material's own measured arrival odds — which text was
too thin per-step to earn and audio earned decisively. Both directions of
S14's ladder are now measured, and phrasing the law as "power law" where
a medium's own odds say otherwise is the newly measured way to lose.

## S17 — The type level names forms; being-identity is decided by evidence order, witnessed downward, and ambiguity is the occurrence layer's question

> **giver:** earned-here — 7db127c

> **Numbering correction (2026-08-29).** This is the second of two entries
> published as S17 — a live collision first reported by
> `eval/prior-art-cited.mjs` and recorded in the-fold's POLICIES.md, whose
> standing decision holds: **not renumbered**, because external citations
> exist to "S17" in BOTH meanings (the-fold's `retrieval.js` and
> measured-memory work cite the first entry; its MHC/coreference lineage
> cites this one) and renumbering would break them. Cite unambiguously as
> **S17-recall** (the first — forgetting as a recall mechanism, giver
> daccec2) and **S17-type** (this one — the type level names forms, giver
> 7db127c). New entries continue in sequence past S23 (S24, S25, ...), so the collision never
> compounds. ASSEMBLIES-AND-ARTIFACTS.md §10 asked for a renumbering;
> resolved this way instead, and the deviation is disclosed there.

Found by the-fold's MHC battery (its POLICIES.md P44) driving
`discoverReferents` over two real Wikipedia materials, then reproduced at
fixture scale (`tests/rich-referents.test.js`, cases 8-10). The old
assignment loop matched an arriving surface against EVERY already-assigned
surface and took the first hit — two measured failures, both
order-dependence:

- **Stranding.** "Mikhail Kutuzov" corefers with both bare "Kutuzov" and
  bare "Mikhail"; first-match-break joined whichever the scan reached first
  and left the other in its own referent. A greedy first-match closure over
  the pairwise rule is not transitive; "is the same being as" necessarily
  is. Measured live: 1 of 24 and 2 of 12 rule-endorsed pairs stranded, all
  one shape.
- **Accretion.** With the bare form assigned first and two real bearers in
  the material, each compound matched the fragment and both landed in one
  referent — two generals merged through a shared first name sitting at
  (not above) the generic fence's strict-exceeds convention.

Three mechanics replaced the scan, and the direction of each is S9's:

1. **Evidence before fragments.** A bare form's counts include every
   occurrence of the compounds containing it, so mention-descending order
   systematically seats fragments first. Assignment now walks a copy sorted
   most-individuated first — established evidence defines the field,
   fragments face it.
2. **Membership is decided against the group's maximal member**, never its
   weakest: a fragment cannot pull in a third party the group's own
   evidence refuses.
3. **Merges are witnessed downward.** A surface merges multiple groups only
   when its own individuating tokens CONTAIN each group's maximal evidence
   ("Mikhail Kutuzov" ⊇ {mikhail}, ⊇ {kutuzov}: the material said it in one
   breath). A surface on the subset side of multiple groups is an ambiguous
   fragment and admits NOTHING.

**The layering law, which is the entry's real content** (caught by the
user, mid-fix, in one sentence: coreference is a solved problem — was this
pass doing it with referents or not?): `discoverReferents` is the TYPE
level. It may say "this form is a spelling-variant of that name" and "this
form belongs to more than one established referent" — and no more. WHICH
being a given mention names is an occurrence-level question, answered by
discourse salience — the same one-hop activation recall `resolvePronouns`
already performs, the anaphor a bare mid-document name is (S15 measured
writers using exactly that device). The first fix attempt admitted an
ambiguous form as its own referent — a third being that does not exist,
asserted at a layer that cannot check it, S11's type-signature bug in a
new coat. What ships instead: the ambiguous form lands as a typed
`ambiguous_surface` gap carrying its candidate referent ids, admission
withheld, closure named as the occurrence layer's (or a per-text prior's).
No occurrence-level machinery was rebuilt in the type pass.

**Residual, disclosed:** a GENERIC bare form with two bearers ("Vane" with
Mary and Helena) still founds its own referent — the singleton-partner
rescue refuses silently rather than reporting multi-candidacy, so that
shape never reaches the ambiguity branch. Unifying the two ambiguity
shapes into one gap is named work, not done here; the pinned Princess wall
(bearers never merge) holds either way.

**Evidence.** `rich-referents.test.js` 10/10 (7 prior + 3 new, one
amended: the two-bearer wall now pins bearer separation and deliberately
not the fragment's landing — the pairwise relation there admits no
violation-free partition, and revising a minimal-violation reading on
later evidence is revision.js's work). Full native suite 140/150 passing
before and after — the identical 10 pre-existing environment failures,
zero regressions. End to end, the-fold's MHC battery: coreference recall
23/24 → 24/24 (War and Peace) and 10/12 → 12/12 (Borodino) against the
rule's own verdicts, precision 4/4 and 3/3 unchanged, order 5 (Nominal)
passing on both materials — and a stage readable for the first time
(9 and 6, each named with its cap).

## S18 — A bridge carries the identity the relation's semantics needs; chemistry is licensed per relation, refuted from the material

> **giver:** earned-here — e1c3a71

`kernel/reaction.js` (2026-08-28) makes licensed composition ITERATE: a
GIVEN hyperlexicon affordance may declare what a reaction YIELDS
(`meta.yields`), so a licensed product is a real derived hyperedge that
re-enters the composition ledger and chains again — one bridge-hop per
step, gated on contact with the present (terrain-activation), to
quiescence or a declared cap, every product's provenance walking to raw
witnessed edges. Multi-hop reach is therefore never spreading activation
(memory/activation.js's own measured refusal of the similarity flood
stands): the front moves because a product lights its own ends, and each
hop is its own act.

**Earned by a real derivation of a falsehood's shape, caught before it
shipped as one.** The first live run of the consuming driver (the-fold
`eval/mechanical-reasoning.mjs`, real Wikidata succession fixtures) derived
BOTH DIRECTIONS of one pair for the U.S. Senate seat — Hamlin held that
office for multiple terms, and a person-level bridge conflates two
different tenures: (A replaces B)'s B is one term, (B replaces C)'s B may
be another, and nothing orders A's accession against C's departure across
them. The identity the bridge needed was the TENURE; the material's
qualifiers name only the PERSON.

**Rule.** A composition affordance is a claim about a RELATION's semantics,
and the bridge's identity is part of those semantics. Before giving
chemistry over a relation, check — by refutation search over the material —
that the bridge identity actually carried satisfies the shape the
composition assumes (for succession closure: `replaces:<scope>` functional
AND inverse-functional over the bridged identity; and the scope itself
belongs IN the relation string, because cross-scope chains through a shared
entity are unsound and a relation that carries its scope never bonds across
it). What survives the search is licensed as the giver's declared risk —
unrefuted-at-this-stage, per the grain theorem (declarations.js), never
proven; what is refuted gets NO chemistry, with the counterexample named.
(Earned: the tenure gate refused the Senate office on Hamlin's own three
distinct predecessors; six single-tenure offices stayed licensed and the
nine facts derived — Grant-after-Lincoln among them — are sound.)

## S19 — Refutation is a veto, never a licence; and a refutation check is licensed by a declared claim, never by a relation's shape

> **giver:** earned-here — 0a01f07

`kernel/refutation.js` (2026-08-28) is the organ S18 called for, built after
the-fold's `eval/falsification-probe.mjs` measured what such a scan can and
cannot do. Both halves of this rule were earned by running it.

**A veto, not a licence.** Six corpora with ground truth declared in advance
returned one decisive pair: a five-fact succession chain and a five-fact
dominance chain, structurally identical by construction (1:1, acyclic, every
referent distinct, both nominated at identical support, both clearing
uniqueness) and opposite in truth — succession composes soundly, "defeated"
does not. The scan cannot tell them apart. Refuting a transitive-composition
claim needs a POSITIVE counterexample, and positive-only material supplies
one only as a **cycle** or a **uniqueness violation**; where neither is
present, open-world absence refutes nothing. So `refuted: false` is never a
licence, every result carries that disclosure, and a scan below two resolved
edges reports `power: "insufficient"` rather than "unrefuted" (P41: the
absence of a refusal is not a check).

**And a check is licensed by a declared claim.** The first cut ran the
uniqueness check on every relation an affordance named, and reported the
derived transitive closure REFUTED — because Colfax is after both Hamlin and
Breckinridge. That is the closure being correct: many-to-many is what
transitivity means. Uniqueness refutes an ADJACENCY claim (one immediate
predecessor) and refutes nothing about a transitive product. A check applied
where its precondition does not hold produces a refutation that means
nothing — A10's trap, one layer in from where S18 records it.

**Rule.** `expectUnique` is declared by the caller and defaults to OFF; a
closure affordance names the side its giver claims is 1:1 (`meta.adjacency`)
and the audit reads that rather than inferring it. A relation whose
cardinality nobody declared gets the cycle check alone — always licensed,
since nothing may be strictly after itself at any cardinality. A uniqueness
check that did not run reports `checked: false`, never a pass.

**Consequence for reaction.js.** `settle({ veto })` takes
`vetoedPairs(audit)` whole and refuses those pairs at the door, tallying
them SEPARATELY from `withheld` — "nobody vouched" and "somebody vouched and
the material refuted them" are different facts, and a concession needs to
tell them apart. `derivedUnder({giver})` surfaces what a now-refuted licence
already produced, because a veto stops future derivation and cannot un-derive
the past; a concession that cannot name what it re-zeroes is a version bump
wearing an operator's name. `admit(entries)` grows the substrate, which is
what makes a standing refutation search meaningful — a licence unrefuted at
four facts is refuted at five, and that is pruning, not learning.

## S20 — Uniqueness and cycles are claims about ONE STANDING; with intervals they become claims at a time

> **giver:** earned-here — 7d41140

`kernel/refutation.js` gained `intervalOf` (2026-08-28). Both refutation shapes
were claims about a referent's whole life: standing twice at one end refuted
uniqueness, and returning to a node refuted acyclicity. Neither is true of a
position HELD MORE THAN ONCE — the same seat, vacated and re-taken, is lawful
succession, and refusing on it destroyed real facts (the-fold priced the
office-scoped version at 15 true per 2 false prevented).

**Rule.** Where the material supplies intervals, a repeat standing refutes only
where two standings OVERLAP, and a cycle refutes only where it CLOSES WITHIN
ONE STANDING of each node. Half-open `[start, end)`, so a handover at the same
instant is disjoint. A missing bound reads as unbounded: disjointness must be
SHOWN, never assumed, because it is what excuses a violation. Excused cases are
listed on the result, never silently dropped. Omitting `intervalOf` leaves both
shapes exactly as they were.

**Corrected by S21, same day:** intervals are one WITNESS of the material's
own order, never its source — a linked list has the full arrow and no
interval anywhere. This section's shapes are the special case of S21's law
where the witness happens to be an interval; the law does not depend on it.

**Measured, and only half of what was predicted.** Applied to the-fold's
succession material this recovered precisely the 15 true facts the office gate
destroyed — and readmitted the 2 false ones, landing byte-identical to no gate
at all. The reason is worth carrying: **intervals fix the GATE's over-refusal;
they do nothing about the COMPOSITION's conflation at a bridge.** A chain
hopping through a multi-tenure referent at referent grain has already lost which
standing it passed through, and no gate downstream can recover it. Uniqueness-
at-a-time is necessary and not sufficient; S18's bridge identity is the other
half, and neither alone holds both recall and precision.

## S21 — The material has its own arrow, and it is not the reader's

> **giver:** earned-here — b15c5db

Every clock this system carried was the READER's: activation decay and
base-level retrieval (P42's two, both metric), reading order (`chainOf`'s
own refusal to compose backwards through the encounter), production order
(`OPERATOR_ORDER`). The material's own irreversibility had no seat at all —
and four patches rebuilt fragments of it locally: a locus smuggled into a
relation name, an interval side-channel, position identity reconstructed
after an adapter destroyed it, and interval-aware cycles when the first
patch proved half.

**The law.** Where a relation carries the world's own irreversibility, that
arrow is **structural, not metric** — an asymmetry in what may compose with
what, never a timestamp on a node. A linked list holds the whole arrow with
no durations anywhere, which is why this is not P42's third clock.
**Positions are temporal; occupants are not**: a thing may hold one
sequence many times, and collapsing its standings onto it deletes the arrow
and manufactures cycles out of returns. Order keys, where the material
supplies them, are OPAQUE and ordered — compared, never parsed; witnesses
of the arrow, never the arrow itself (S20 is this law's interval-witness
special case, and says so).

**The organ.** `kernel/sequence.js`: a sequence is DECLARED
(`declareSequence` — locus, occupant, position, neighbour pointers,
optional order keys, a giver), read into position-grain edges whose
IDENTITY carries the locus (`readSequence`) — so cross-locus composition is
impossible by construction and the kernel's chaining needed no change,
which retired a planned modification to `chainOf` that a blast-radius
audit had priced as the riskiest step. The declared algebra is refutable
and REFUTED FROM THE MATERIAL where violated: `refuteLocus` finds
concurrent standings of different occupants — a POOL of seats filed under
one name — and prediction refuses there (`locus_refuted`).

**Admitted by measurement, not by argument** (the-fold
`eval/sequence-admission.mjs`, predictions declared before the run):
retrieval 47/47 unique-correct where the flat representation conflated 7,
zero wrong; reasoning 95 derived / 31 oracle-true / 0 false at precision
1.000 and depth 6 with NO office gate and NO interval option — strictly
dominating the shipped pareto frontier (5 true @ 1.000; 20 true @ 0.909);
prediction 7 leave-one-out recoveries at zero wrong against a structural-
zero baseline. **The pre-registered prediction arm FAILED FIRST** — three
wrong guesses, every one in a pooled locus ("United States senator": one
name, a hundred concurrent seats, boundaries synchronized by the calendar)
— and is kept verbatim in the results: the failure exposed that the
declared algebra was refutable and nothing checked, and `refuteLocus` is
the wall that failure earned. One correct-by-luck recovery was returned
with it.

**Disclosed residues.** Same-occupant continuity could in principle bridge
two parallel seats of a pooled locus when one occupant switches seats with
abutting dates — unobserved in the measured material, named rather than
waited for. An occupant with no records receives ONE implied standing so
chains through it survive; if it truly held the sequence twice, its
neighbours are conflated exactly as person grain conflated everything —
carried on the result as `impliedRisk`, never silent. And in the amended
prediction arm, `recovered == ceiling` is close to definitional (both
compute unique unrefuted abutment); the arm's empirical content is zero
wrong predictions and recovery a structural-zero baseline cannot reach.

## S22 — Co-presence is evidence, never an answer; and a gap is a refusal the organ REACHED

> **giver:** earned-here

`adapters/text/pronouns.js` refused, categorically, every frame carrying a
named surface (`if (named.size === 0 && ...)`). That veto is text-shaped
twice over: it names "a named surface," and it treats co-presence as
DISQUALIFYING rather than as a difference to be weighed. On encyclopedic
prose most frames carry a name, so the organ reported `bindings: 0,
gaps: 6` — a handful of gaps standing in for a hundred chances, with the
denominator stated nowhere.

**The law.** Where a frame's own membership bears on resolving a deixis it
carries, that membership is a STANDING and never a gate: a contested frame
must clear a stricter declared bar, because the frame supplies a pull the
recall cannot see. **Co-presence raises the BAR; it never raises a SCORE.**
A co-present candidate the reading has not activated enters at its own zero
and loses, exactly as it would had the frame not carried it. That asymmetry
is the whole design — the other direction is nearest-name binding, which
`pronouns.js`'s own header refuses by name and which the kernel must not
smuggle back in.

`kernel/contest.js` holds it. The question — *which of the beings present
did this unlabelled thing point at* — is not a text question, so the organ
is kernel-level and medium-general: a shot with two faces and one
unlabelled gaze, a bar with two instruments and one unattributed motif, a
turn with two labelled speakers and one bare "same as before" are each a
scored-candidate set plus a co-present set, and each calls it unchanged.
Generality is asserted MECHANICALLY, not claimed: `tests/contest.test.js`
reads the module's own executable body and fails if *sentence*, *pronoun*,
*surface*, *token*, *word* or *text* appears in it. The adapter contributes
scores and frame membership; the kernel contributes the verdict. The
adapter's two hard filters (gender, individuation type) are passed in AS
FILTERS, never tiebreaks, and a competitor a filter already excluded does
not raise the bar — charging a reading for an ambiguity it does not face is
not rigour.

**A GAP IS A REFUSAL THE ORGAN REACHED.** One development failure settled
this and is worth keeping: filing a gap for frames the refused regime never
adjudicated broke `gaps.length === 0`, and the assertion was right. "I read
this and could not decide" and "I never read this" are different facts and
must never share a bucket. The denominator moved onto a `regime` block that
every return now carries — which criterion ran, how many frames carried the
deixis, how many carried competitors, how many were actually adjudicated —
where it is a count of frames and cannot be mistaken for a verdict.

**A CONSTANT BAR MEASURES SEPARATION, NOT EVIDENCE.** Measured: scrambling a
material, which destroys the coherence one-hop recall is supposed to read,
RAISES the mean margin (0.028 → 0.053; 0.047 → 0.073), because incoherent
reading scatters activation and leaves a sparse field in which one candidate
stands alone. So `nullAdjudicate` tests the lead against the material's own
permutation null instead — draws, seed and alpha declared, the Born-gate
discipline this kernel already holds elsewhere. The null redistributes WHICH
members were present at the activated frames, sampling member-sets from the
pool the reading itself produced, empties included, so the material's own
presence density is preserved. The real margin beats it only when one member
owns several of the hottest recalled frames — which is what reading IS, and
what scrambled material cannot fake. Degenerate cases come out honest with
no special-casing: a one-member world ties every draw (p = 1, refused —
identity made no difference, so nothing was read).

**Both regimes are DECLARED and default-off, and the shipped organ is
unchanged.** Absent `contestedMargin` and `nullTest`, behaviour is
byte-identical and `tests/pronouns.test.js` passes 9/9 unchanged, so every
prior measurement taken through this organ keeps its denominator. The
constant-margin regime is kept as the named, refuted control arm rather
than deleted. The null regime is not adopted either: it removes the
anti-lift pathology and makes encyclopedic zeros honest, but novel lift did
not rise and its survivors are rare-referent self-echo, which clears a
permutation null without being comprehension. **The bottleneck is the
SIGNAL, not the criterion** — one-hop lexical recall at sentence grain
carries too little identity information for any verdict rule over it to
become reading. This is the third independent measurement to land on that
line, and it confirms `surfaces.js`'s MODEL-tier fence rather than
challenging it.

Full evidence, and the landing-time finding that a null drawn once is a null
drawn zero times, are in the-fold's POLICIES.md P66 and
`the-fold/eval/results/{contested-copresence,null-criterion}-RESULTS.md`.

## S23 — A grain's depth, named as a fact this module already holds

> **giver:** earned-here

`kernel/task-log.js` already imports `GRAINS` from `cube.js` to validate
`append`'s own `entry.grain` field. A real external consumer needed the
same fact in a different shape: not "is this string a grain" but "how deep
is it" — specifically, which grain name is rank 1 (Figure), so a caller can
name it without hardcoding the string.

**The law, restated at this scale.** A fact a module already holds is read
off, never re-derived by a second module maintaining its own copy that can
drift from the first. `GRAIN_RANK` is exactly `Object.fromEntries(GRAINS
.map((g, i) => [g, i]))` — the ordinal position each grain already has in
the one list this file answers to, turned into a lookup table. Nothing
about grain depth was invented to make this addition; it was already
implicit in `GRAINS`'s own order and is now explicit.

Advisory only, matching every other read-only export in this file:
`append`/`projectTasks` consult nothing here. Pinned in
`tests/task-log.test.js` (`GRAIN_RANK` is exactly `GRAINS` in order; rank 1
is Figure; the export is frozen) — a small, isolated addition, checked
against `conformance/native-boundary.test.mjs`'s own wall (a raw substring
scan of every `kernel/*.js` file, not just its imports) before landing,
which is why this entry names no external project by name: that wall is
what makes "no legacy should be used, all eoreader7 only" a checked fact
about this directory rather than a convention someone could quietly drift
from, and a comment explaining provenance is exactly the kind of thing it
is built to catch.

Full suite: 263/263 after landing, 260/260 before — the three new cases
pinning `GRAIN_RANK`, zero regressions.

## S24 — A mechanism that cannot fire on this material says so; it does not return a number

> **giver:** earned-here (the case distinction itself: Unicode Character
> Database, General_Category / `Cased_Letter`)

Every candidate-surface filter in `adapters/text/surfaces.js` reads one
glyph-level property: capitalisation. `CAP_TOKEN`/`LOWER_TOKEN`, the
sentence-initial exclusion, the all-caps typography rules, and
`capitalisationIsSignificant`'s binomial are all questions about case. On a
script that HAS no case, none of them can fire. That is not degradation and
not weak performance — the mechanism is structurally inert, and every count
it returns is about whatever cased debris (a Latin citation, an English
caption) happens to sit in the file.

**Measured, on real material, before this existed.** A Hebrew Wikipedia
article yielded 6 candidate surfaces across 79 sentences; a Korean one 15
across 129. The Hebrew surfaces were `School`, `Athens`, `Raffaello`,
`Internet` — an English image caption, never the article. Each read as a
small, plausible, wholly false result, and nothing in the return said the
organ had not read the language.

**The law.** Where an organ's mechanism cannot apply to the material at all,
it reports that boundary as a typed gap carrying the measurement that
establishes it. This is not a new rule — it is `surfaces.js`'s own tier
discipline, which already states that a missing prior produces a gap and
never a guessed number, applied to the one case where the missing prior is
the writing system itself rather than a coreference judgement.

`scriptCoverage(sentences)` holds it, returning `casedLetters`,
`caselessLetters`, `casedShare`, and a `gap` that is null when the mechanism
is genuinely about this material. Two boundaries, both structural rather than
dials: `casedLetters === 0` with letters present is `script_without_case` —
the mechanism cannot fire at all, and zero is not a threshold; caseless
letters in the MAJORITY is `script_mostly_without_case` — most of the
material is invisible to the mechanism, and majority is where a plurality
flips, the same non-tuned standing this project already declares elsewhere.
The share rides on the gap either way, so a caller cannot read a surface
count without also being told what fraction of the script it was computed
over.

**The distinction is looked up, not listed.** Unicode's own
`General_Category` already separates letters that have case
(`\p{Cased_Letter}` — Lu/Ll/Lt) from those that do not (Lo). Verified
directly against real strings: Latin, Greek, Cyrillic, Georgian and Armenian
are bicameral and are correctly never gapped; Hebrew, Arabic, Hangul, CJK,
Devanagari and Thai are caseless and are. No list of scripts is maintained
here.

**WHAT THIS REFUSES TO DO, and why the refusal is the point.**
`surfaces.js`'s own header records that a blanket algorithmic generalisation
across scripts was tried and REVERTED, on the ground that a silent claim of
cross-script generality is a more severe failure than a disclosed narrow
scope, and that extending coverage requires a giver and an invariance fixture
per script rather than an algorithmic generalisation. Inventing a caseless
substitute for capitalisation here — recurrence, n-gram salience, position —
would be that same reverted move under a new name. So this organ reports the
boundary instead of crossing it. The scripts it gaps are not thereby
readable, and the gap says exactly that.

**A separate failure this does NOT address, named so the two are not
conflated.** Greek is bicameral, is correctly not gapped, and its surface
layer reads genuinely well — 169 candidate surfaces and real Greek proper
nouns (Παπανούτσος, Μιλήσιος, Νόηση) on the article this was built against.
Greek nonetheless yields almost no relation edges, because `relations.js`
matches an English SVO clause shape and `discoverRelationVocab` anchors on
capitalised surfaces. That is the relation layer, not the surface layer, and
it is not about script at all. Closing it needs a real per-language grammar
prior with its own giver; nothing here attempts it.

**Enforced.** `tests/script-coverage.test.js`, 6 cases: five bicameral
scripts never gapped (the overreach guard), six caseless scripts gapped as
`script_without_case`, cased debris in caseless material gapped as
`script_mostly_without_case` carrying its share, the gap firing exactly where
`extractSurfaces` goes blind and not where it does not, letterless material
not gapped, and the reader leaving its input untouched. Both walls were
mutation-tested — disabling the majority rule fails 2, gapping bicameral
material fails 3. Suite 263/263 → 269/269, zero regressions.

## S25 — An assembly is a persistence boundary; its products are sealed projections of the log

> **Numbered S25 at merge:** first written as S24; a concurrent PR landed
> its own S24 (the cannot-fire rule above) on main first. The number moved,
> nothing about the law did — the same renumber-on-merge convention
> the-fold's POLICIES.md already records for its P37/P42.

> **giver:** Herbert Simon, "The Architecture of Complexity" (1962) — Hora
> and Tempus; near-decomposability as a claim about interaction rates. The
> register and concession disciplines are task-log.js's and
> declarations.js's own, promoted to a bigger object; the composition law is
> S9 at assembly scale. The full spec — measured problem statement, laws
> A1–A5, migration order, pre-registered predictions — is
> `native/ASSEMBLIES-AND-ARTIFACTS.md`; this entry is the binding summary.

**A1 — an assembly boundary is a persistence boundary.** S10's three
classes of math partition all state by timescale, and the partition IS the
assembly map: the arithmetic tier (counts, logs, identity) is sealable and
portable; the geometric tier (activation, presence, margins) is the glue of
one live read and is NEVER serialized — the reach of the present cannot be
checkpointed, because by resume-time it isn't the present; the
transcendental tier (nulls, TE, standing) travels only as a verdict record
and is re-granted against new material's own null (network-standing.js's
rule, promoted).

**A2 — the assembly is a registered, contracted object**
(`kernel/assembly.js` mechanics, `native/assemblies.js` content). Its
contract (ops/terrains/stances) is DERIVED from its declared emission cells
via cellOf, never hand-typed; every regime dial carries { value, giver,
basis } (S16); the register is append-only and versions only move forward.
Every measurement names its assembly: a result stamps a registered
id+version or it is quotable as nothing — existing results predating the
register are reconstructed and recorded
(`eval/results/assembly-reconstruction.json`), never retro-stamped.

**A3 — an artifact is a sealed projection of the log**
(`kernel/artifact.js`): Hora's bench, never a database. Sealing is a
checkpoint — refused unless the producing assembly's own conformance
passed on that material; `dropped` (S12) and `regime` (S7) are mandatory;
the seal carries no clock, so regeneration is byte-checkable; a consumer
finding a producer mismatch regenerates, never adapts.
EOExperiencePrior@1/EORhythmPrior@1 are grandfathered (the body IS the
prior, unchanged); CastLedger@1 is the entity assembly's product
(`kernel/cast-ledger.js`).

**A4 — an artifact from any other read enters a new read as a prior: it
nominates and never admits** (`adapters/text/cast-prior.js` for the cast —
only surfaces the new material itself attests are ever offered, with the
encounter's own bytes as evidence; perceive → witness decides, exactly as
for every candidate). Any prefix of the lattice is a complete system:
absence of an upper assembly is TYPED (`assemblyAbsent`), never a zero in
its metrics. The glue between live assemblies in one read is the decaying
tier and only there.

**A5 — containment is what makes partial safe.** Operations carry optional
`provenance.assembly`, stamped where deltas are built; a refuted assembly
concedes WHOLESALE — one REC enumerating exactly its standing contribution
set, named trigger, evidence never deleted; downstream consumers of a
conceded artifact are notified (`derivedUnderConceded`), never rewritten.

**Enforced:** `conformance/assembly-registry.test.mjs`,
`artifact-tier.test.mjs`, `artifact-prior-boundary.test.mjs`,
`concession-cascade.test.mjs` — spec tests 1/2/3/5, all mechanical.
**Named, not run:** the per-boundary severance test (spec step 6) is a
measurement pass needing real materials with predictions frozen first;
§9's P-a/P-b/P-c stand recorded and unrun (P-b's fixture-scale half — the
CastLedger round-trip byte-identity — is already pinned). Per-assembly
dynamics (step 7) and the remaining ledgers (step 8) follow in the
declared order.

## S26 — Normalisation must carry its own offset, and the case that finally proved it

> **Numbered S26 at merge:** first written as S25; a concurrent PR landed
> its own S25 (the assembly-boundary entry above) on main first. The
> number moved, nothing about the law did — the same renumber-on-merge
> convention this file's own S25 entry just recorded, one collision over.

> **giver:** earned-here — the-fold POLICIES.md LP3, 2026-08-29

`stripContainer` already held the law this closes one step over: "everything
downstream anchors spans against this offset and a strip that forgot to
move it would silently shift every citation." `splitSentences` folds
`\r\n`/`\r` to `\n` before it computes a single offset, and until now that
fold was a bare `.replace()` — a transform with no recorded offset, in a
file whose other transform (`stripContainer`) exists specifically to prove
that class of transform must carry one.

**Measured, not argued.** A real Project Gutenberg file with 3,654 CRLF
pairs produced a span whose address, taken at face value, missed its own
source file by 969 bytes. The span resolved only against a private,
un-addressable copy of the text a consumer had kept alongside it — which is
exactly the failure this file's own header names for `stripContainer`:
"correct in every test that only re-reads through this process and is
wrong the moment anyone opens the file."

**`normaliseNewlines(text)` returns `{text, toRaw}`.** `\r\n` -> `\n`
removes one character per pair; bare `\r` -> `\n` is same-length. So the
map back to raw offsets is a monotonic step function, one step per
collapsed CRLF, recorded as checkpoints at each divergence rather than
walked character by character per query. Verified against the actual
specimen: a span at normalised offset 196 now resolves to raw offset 1165
— the true position, confirmed against the real file's own bytes, not a
constructed example.

**`splitSentences` is unchanged.** It still normalises inline and returns
exactly what it always returned — pinned as its own regression
(`splitSentences(raw) === splitSentences(normaliseNewlines(raw).text)`,
byte-for-byte). A caller that wants raw-file addresses normalises first,
passes the normalised text through unchanged (a no-op, since there is
nothing left to collapse), and applies `.toRaw` to any offset before
writing it down. A caller that never calls the new function keeps every
byte of today's behaviour.

**The self-verification invariant this licenses is not bare string
equality, and saying so once here avoids re-deriving it wrong.** A span
that straddles an embedded CRLF legitimately still carries `\r\n` in the
raw file where the read text carries plain `\n` — that character is real,
present in the actual bytes, and `toRaw` names its position correctly. The
check that proves an address is right is `normaliseNewlines(raw.slice(a,
b)).text === text_that_was_read` — reapplying the SAME normalisation to
the raw slice — not naive equality against untouched bytes. One of this
file's own regression tests asserted the wrong invariant first and failed
on exactly this case (a two-line header block splitSentences reads as one
sentence with an embedded `\n`); the fix was the assertion, not the code,
and both versions are worth knowing since a future caller will make the
same mistake this file's own first draft made.

**Files.** `adapters/text/spans.js` (`normaliseNewlines`, new export;
`splitSentences` untouched). `tests/spans-normalise.test.js` (8 cases: the
CRLF/bare-CR/mixed round-trip properties, a synthetic reproduction of the
motivating shape at the same scale as the real file — 42 header lines
before the target — and the composed-with-`splitSentences` case carrying
the corrected invariant above). Full suite 269/269 -> 277/277, confirmed
via `git stash`, zero regressions.
## S27 — A flat excerpt window can land entirely inside a table of contents

Found by an adversarial audit of live_priors' full corpus reading sweep
(the-fold/live_priors, task #9: an investigator, then two independent
skeptics, over a real flagged anomaly — not a hypothetical). A
Gutenberg-mirrored edition of Les Misérables carries no PG START/END
markers at all, so nothing strips its own front matter, and its table of
contents runs to roughly char 21,600 — real narrative prose does not
begin until well past an 8,000-character flat excerpt window. Zero
relation edges were extracted from a book that has hundreds.

**`detectFrontMatterRun(text, {maxScanChars, tocLineMax, tocRunMin,
proseParaMin})` returns `{detected, skipTo, runLength}`.** Paragraphs
(the same blank-line boundary `splitSentences` already treats as harder
than any terminator) are classified TOC-shaped when short and
unterminated; a run of at least `tocRunMin` (8) landing on a genuinely
long (`proseParaMin`, 300 chars) paragraph declares front matter and
names where it ends. Verified against the real specimen: `skipTo` lands
on Victor Hugo's own Preface — genuine authored prose, not the heading
list it follows — and an excerpt built from that point extracts 73 real
relation edges where the flat prefix extracted zero.

**Two safety properties, both found ADVERSARIALLY — by two independent
skeptics verifying the first cut, not by this function's own author —
and both load-bearing.** (1) The terminator check strips
`CLOSING_QUOTES` (this file's own received closed class, `priors.js`)
before testing `SENTENCE_TERMINATORS` — a naive `/[.!?]$/` test misreads
quote-terminated dialogue ("Nor running a chance of arrest?") as
TOC-shaped, because the terminator sits before the closing quote. (2)
`maxScanChars` bounds the search to the document's own front matter —
without it, the identical short-unterminated-line shape matches a
back-of-book alphabetical INDEX just as well as a front-of-book table of
contents, found live firing at 94% depth into an unrelated,
independently-mislabeled file.

**Thresholds are disclosed as read-from-specimens, not
null-derived.** Checked against nine independent control books (Moby
Dick, Pride and Prejudice, Shakespeare's Complete Works, Tom Sawyer,
Dorian Gray, Leaves of Grass, Sherlock Holmes, Alice, Don Quixote) before
shipping: 7/9 correctly never fire, and Moby Dick's real ~28KB
Etymology/Extracts front section — genuine quoted prose, real
terminators — is correctly left alone, confirming this targets TOC
*shape*, not "any front matter." A real specimen sweep across every
other book in the same corpus directory (`tests/spans-frontmatter.test.js`'s
own "REAL SPECIMEN SWEEP" case) fires on no file outside the one known
TOC-bearing specimen, and prints any future disagreement by name rather
than passing blind.

**Not attempted here: a genuinely blind held-out book never watched
while the thresholds were chosen** — every control book named above was
read by name while validating this function, so none of them is truly
blind in the strict sense the original audit's own synthesis asked for.
Disclosed rather than silently claimed otherwise.

**Files.** `adapters/text/spans.js` (`detectFrontMatterRun`, new export;
`splitSentences`/`normaliseNewlines`/`stripContainer` untouched — this
composes with them, never replaces them). `tests/spans-frontmatter.test.js`
(11 cases: 6 synthetic — including both adversarially-found counter-
examples pinned as their own regressions — plus 5 against real corpus
files, skipped rather than failed if the sibling `live_priors` checkout
is absent). Full suite 307/307 -> 318/318, zero regressions.

**Amended same day — found by the real corpus sweep itself, not by a control this pass thought to write.** Wiring `detectFrontMatterRun` into live_priors' full 2,207-source sweep (the actual point of building it) surfaced a SECOND false-positive class the nine-book control set above never exercised, because none of those nine books were markdown-formatted: a real Dutch legal code (`Wetboek van Koophandel`) opens with a YAML frontmatter block, then markdown ATX headings (`##### Artikel 2`) each immediately followed by the single word `Vervallen` ("Repealed") for a dozen consecutive articles — a genuine, legitimate, terse document structure, not an undifferentiated list of chapter titles. It cleared the TOC-run floor and skipped 4,594 real characters, turning a previously-clean 39-edge reading into a 0-edge one — confirmed as a real regression, not a hypothetical, by diffing against the sidecar this exact file produced one commit before this function existed.

**The fix, and why it is general rather than a patch for one file.** A markdown ATX heading (`^#{1,6}\s`) is now excluded from ever counting as TOC-shaped. This is principled, not narrow: a heading is evidence of DELIBERATE document structure — the opposite of an undifferentiated run of plain lines, which is what a Gutenberg-style table of contents actually is. Les Misérables' own TOC uses plain `CHAPTER I—TITLE` lines with no `#` anywhere, so the exclusion changes nothing about the specimen this function was built for (re-verified: `skipTo` unchanged at 20,877). Re-checked against the full `06-government-legal` category (1,221 files, the corpus's own largest and most markdown-heavy directory, each compared against its own pre-existing sidecar) after the fix: **zero regressions, 2 further improvements, 1,219 unchanged.**

**The lesson, stated so the next control set does not repeat it:** a control set of nine novels proved this function safe on PROSE's own front-matter shapes; it said nothing about STRUCTURED document conventions (markdown headings, YAML frontmatter, numbered-clause legal text) that share the same short-unterminated-line surface by pure coincidence. The real corpus sweep is what actually exercises a format's diversity — a curated control set, however careful, only tests what its author thought to include.

Two new regression cases in `tests/spans-frontmatter.test.js`: the synthetic Dutch-legal-code shape (a run of ATX headings each followed by a genuine one-word "Vervallen" body), and the real specimen file itself, read directly. Full suite 318/318 -> 320/320, zero regressions.

## S28 — A wider capture is only as safe as the boundary it refuses to cross

> **giver:** earned-here, live_priors/goldens/reading/DERIVED-RULES.md

Found building DR4 (whole-NP subjects) and DR5 (phrasal predicates) —
`native/adapters/text/relations.js::expandSubjectNP`/`discoverRelationVocab`
— against the-fold/live_priors' own hand-perfected goldens (UDHR, Alice,
Kant, a ripgrep changelog). Both DR4 and DR5 widen what a bare 1-2 token
anchor is allowed to capture; both, on the first cut, widened past a
boundary that must never be crossed, and both were caught only by running
the fix against real prose, not by reasoning about the mechanism in the
abstract.

**DR4's own boundary: a subject NP can never contain an auxiliary verb.**
`expandSubjectNP`'s backward walk had no notion of this. Against the
UDHR's own preamble — a fronted adverbial between an auxiliary and its
main verb ("the peoples of the United Nations **have** in the Charter
reaffirmed…") — the base MATCHER's own bare anchor lands on "the Charter"
(a pre-existing limitation, independent of DR4: the true subject is
nowhere near it), and widening blindly from there walked the ENTIRE
preceding clause — "have", "in", "Nations", "United", "of", "peoples",
"the" — as ordinary NP-internal words, fabricating the whole clause as
one subject. **The fix is a refusal, not a smarter guess**: the walk now
returns `null` (keeping the original, narrower anchor) the instant it
crosses an auxiliary verb before ever finding a determiner or its
`leftBound` — the same standing rule this file's own span-pairing already
states elsewhere, restated one register finer: a wrong wider span is
worse than a coarse one.

**DR5's own boundary: an auxiliary is only auxiliary when a real verb
follows it — never assumed unconditionally.** `tallyAfter`'s first cut
unconditionally skipped every aux/modal occurrence, with no fallback,
looking for a "real" verb past it. But "was"/"is"/"had"/"have" are
frequently the clause's OWN main verb — a bare copula ("There **was**
nothing so very remarkable in that") or possessive ("the book **had**
pictures") — the identical ambiguity this repo's `phasepost.js` already
names for have/has/had ("an auxiliary only when a verb follows"), now
shown to bite the extraction mechanism itself, not just a downstream
mapping layer. Measured live on Alice's Adventures in Wonderland: the
unconditional skip dropped "was" from the vocabulary on every sentence
where nothing verb-like followed it, collapsing a 4-edge reading to 1.
**The fix tallies BOTH readings as independent evidence** — the aux word
itself, and whatever follows it — rather than choosing one; MATCHER's own
greedy `AUX_GROUP_RE` still prefers the longer aux+verb combination
whenever a real vocab verb genuinely follows, so this does not reopen the
swallow bug DR5 exists to close.

**The general lesson, so a third widening pass does not re-learn it a
third time:** a mechanism that widens a narrow, already-working capture
must name the CLASS of boundary a wider capture can never cross (here:
an auxiliary verb, for both DR4 and DR5, independently) — checking "does
this look plausible" against one specimen is not the same as checking
"what is the one thing this widening must never do," and only the second
question caught either bug. Both were found by running the fix against
real prose (the-fold/live_priors' own goldens), not by unit tests against
hand-picked sentences — the goldens exist for exactly this: to catch a
widening mechanism generalizing in a direction its own designer did not
anticipate.

**Measured, honestly, not just fixed.** With both boundaries closed,
DR4/DR5 turned on against the same 4 goldens is a WASH in aggregate (15
matched / 34 missed, identical to DR4/DR5 off) — not the clean win either
rule was built hoping for — but the underlying content moved in both
directions: two genuine recoveries (a determiner correctly kept; a bare
copula edge recovered that the baseline missed entirely), one
scoring-artifact reassignment (not a real capability loss), and two small
real costs (`wrong-relation`/`garbled-object` each +1) from capturing a
wider span that occasionally captures the wrong thing. Full account,
every number, in `live_priors/goldens/reading/DR4-DR5-RESULTS.md`. Both
booleans (`phrasalPredicates`, `nounPhraseSubjects`) stay opt-in and
default false everywhere — the corpus-wide sweep (`eot-digest.mjs`'s own
`main`) omits both, so all 2,208 already-digested sidecars are untouched;
`diff-golden.mjs` opts in explicitly, since re-measuring against the
goldens is exactly its job.

**Files.** `native/adapters/text/relations.js`
(`expandSubjectNP`'s new auxiliary-stop refusal; `tallyAfter`'s dual-tally
for aux occurrences). `native/tests/relations.test.js` (2 new regression
pairs — the auxiliary-crossing refusal, direct and end-to-end; the bare-
copula nomination, and extraction isolated from nomination's own noise —
21 cases total in this file, up from 17). `the-fold/hypergraph.js`
(`makeRelationReader` gained the same two booleans, threaded into its
primary edge-extraction pass and its order-arm null test only —
`read(answer)`'s own checking-tier calls are untouched, a disclosed scope
boundary, not an oversight). `live_priors/scripts/eot-digest.mjs`
(`loadOrgans({phrasalPredicates, nounPhraseSubjects})`, both default
false) + `live_priors/goldens/reading/diff-golden.mjs` (opts in).

Suites: eoreader7 native 341/341 (320 pre-existing + 21 new), confirmed
zero regressions via `git stash` with the untracked new test file moved
aside for the true baseline comparison. the-fold 1485/1433/47,
byte-identical to its own `git stash` baseline (the change is additive
and organ-injected; nothing in the-fold calls relations.js directly).

## S29 — Code lives with the engine; received content lives with the corpus

> **giver:** earned-here, user direction (2026-08-29)

`phasepost.js` (the 27-phasepost overlay — DR1, `live_priors/goldens/
reading/DERIVED-RULES.md`) and its conformance test moved here from
the-fold, alongside a split of what it depends on: the module itself
(`native/adapters/text/phasepost.js`) is pure, organ-injected reading
logic with no the-fold-specific content — the same standing `relations.js`/
`surfaces.js` already hold in this directory — while the RECEIVED lexicon
it reads (`ActPrior@1`, a VerbNet-derived data table, 704KB/48,862 lines)
moved to `live_priors`' `derived-priors/act-priors/`, since a received
lexicon is content, not code.

Found by inspection, not assumed: the-fold's `eval/fixtures/` had
accumulated 11MB across several such received-lexicon fixtures (UniMorph
tables, this one) with no the-fold-specific meaning in any of them — a
repo meant to stay a thin, replaceable consumer of this engine's reading
power had instead become the thing holding the received linguistic data
that power depends on. The fix is the general rule stated in this
section's own title: engine CODE belongs where the engine lives; RECEIVED
CONTENT belongs with the corpus that reads it, regardless of which repo
happened to build the fixture first.

**Scoped, not exhaustive.** Only `act-prior-en.json` and its builder moved
this pass — `unimorph-morphology-prior.json` (which `phasepost.test.mjs`
also reads, for its lemmatizer) stayed in the-fold, because it has other
live the-fold consumers (`hypergraph.test.mjs` among them) this pass was
not asked to touch; the relocated test reaches across to it by relative
path, the same cross-repo pattern this whole project already uses
everywhere a test needs a sibling repo's fixture. Whether the REST of
the-fold's `eval/fixtures/` (several megabytes of UniMorph tables, mostly
consumed by that repo's own MINE-1 benchmark eval drivers) should follow
is real, named, unstarted future work — a separate, larger decision than
this pass' own scope.

**Files.** `native/adapters/text/phasepost.js` (moved, header updated to
name the split); `native/tests/phasepost.test.mjs` (moved, cross-repo
paths updated: cube.js/priors.js/morphology.js are now siblings within
this repo; the ActPrior@1 fixture reads from live_priors; the morphology
prior still reads from the-fold). the-fold: `phasepost.js`,
`phasepost.test.mjs`, `eval/build-act-prior.mjs`,
`eval/fixtures/act-prior-en.json` deleted. live_priors:
`derived-priors/act-priors/act-prior-en.json` + `README.md` (new),
`scripts/build-act-prior.mjs` (moved, output path and header updated).

Suites: eoreader7 357/357 (341 + 16, the same 16 cases moved verbatim,
zero rewritten). the-fold 1470/1470-1418-47-5 accounting (1470 total,
1418 passing, 47 pre-existing failures, 5 skipped — the identical 47
this repo already carried before the deletion, confirmed by name, zero
new regressions from removing four files nothing else referenced).

## S30 — A wider capture must collapse whitespace before it reports, and its own anchor arithmetic must not be fooled by having done so

> **giver:** earned-here, found while measuring DR4/DR5 at full corpus
> scale (`live_priors/goldens/reading/DR45-AT-SCALE-RESULTS.md`)

S28 named the boundary DR4's widening walk must never cross (an
auxiliary verb). This closes a second, independent defect in the same
mechanism — not a boundary the walk crosses, but a REPRESENTATION defect
in what it reports once it stops: a captured span's internal whitespace
was carried through VERBATIM from the raw source bytes, including a
literal `\n` from a hard-wrapped Gutenberg line, while the identical
bytes' own citation span (built from `splitSentences`) already reads as
ordinary prose with a single space. Found on a real specimen from the
at-scale sweep (`01-literature-books/gitenberg/pg1232_The-Prince.txt`):
`subject: "career\nFlorence"` on an edge whose own span text read "During
his official career Florence was free…" with no newline anywhere in it.

**Measured at corpus scale before being fixed, not assumed from one
specimen.** `containsNewline` (a structural signature `live_priors`'
mining pass already tracks across every admitted edge) sat at a 1.56%
baseline rate with DR4/DR5 off; turning DR4 on more than TRIPLED it, to
5.01% — the wider backward walk simply covers more ground where a hard
wrap can occur, so the pre-existing defect (present, at low rate, in the
narrow 1-2 token baseline capture too) became DR4's own dominant
measured cost, named in `DR45-AT-SCALE-RESULTS.md` as "the single
highest-leverage next move."

**The fix: collapse, don't refuse.** Unlike S28's auxiliary boundary
(where crossing it means the walk fabricated the wrong span and must
refuse outright), a hard-wrap newline inside an otherwise-correct span is
a representation problem, not a correctness problem — the bytes matched
are exactly right; only how the captured text is RETURNED needs
fixing. `collapseWs` (module-level, `native/adapters/text/relations.js`)
collapses any run of whitespace (`\s+`, including `\n`, a stray tab, or
multiple hard-wrap-plus-indentation characters together) to a single
ordinary space, applied at the three places a captured span's final text
is produced: the base subject capture, the object capture, and
`expandSubjectNP`'s own widened-span return.

**The bug this fix's own construction nearly reintroduced, caught before
it shipped.** `expandSubjectNP`'s widened span's start OFFSET
(`anchorEnd`, fed into the caller's own `subjectOffset`) was originally
computed as `subjectStart + subject.length` — but once `subject` became
the COLLAPSED (potentially shorter) display string, using its length to
derive a byte offset into the RAW source string undershoots whenever
collapsing actually removed characters (any whitespace run longer than
one character — a hard wrap plus leading indentation, for instance).
Caught by reasoning through the byte-offset semantics before running
anything, the same discipline S28's own auxiliary-crossing bug was
caught by running: the fix reuses `subjEnd` (already in scope, computed
from the RAW, uncollapsed match length, originally built for the
polarity-window's own backward bound) rather than re-deriving a length
from the collapsed string. Pinned as its own regression case — a
whitespace run of MORE than one character, so a naive `subject.length`
would visibly undershoot the true anchor rather than accidentally
landing right by coincidence (a bare single `\n`→`" "` swap is
length-neutral and would not have caught this).

**Why the FUNCTION belongs in the general engine — and why the CLAIM
underneath it does not get to be universal.** `collapseWs` itself names
no format, no site, no language: `\s+` is Unicode's own general
whitespace class, and the mechanical operation (collapse a run of
whitespace to one space) is pure string arithmetic — no belief in it, no
corpus-specific vocabulary, the same status as `.trim()`. But the CLAIM
that licenses applying it here — *a captured span's internal whitespace
never carries content, only incidental line-wrap formatting* — is an
empirical regularity about PROSE, not a logical necessity, and this
project's own corpus already names the registers where it can fail:
`live_priors/goldens/reading/MINED-PATTERNS.md` flags verse/dialogue
material (0.069 density, "a genuinely different sentence shape... no
rule proposed here") and source code as places where a line break can be
load-bearing rather than incidental — a poem's own enjambment, or a
language where whitespace is syntax. Whether "this line break is
incidental" holds for a given document is a REGISTER classification,
exactly the kind of thing that gets more confident the more instances of
a register are read — which is why `MINED-PATTERNS.md` already treats
register statistics as prior-shaped (received, corpus-measured,
revisable) rather than hardcoded, and names wiring them into extraction
behavior as a real, undecided design question rather than something a
bug fix gets to settle by assumption.

**Disclosed, not checked here:** this fix was validated against the
prose registers it was measured on (Gutenberg literature, encyclopedic
material) and was NOT run against `09-source-code` or `15-western-canon`
specifically to confirm it does no harm there. If a future reading finds
a register where internal whitespace inside a captured span IS the
content (a verse line, an indentation-sensitive code block), the right
fix is not reverting `collapseWs` globally — it is scoping WHEN it
applies behind a register-level prior, the same undecided question
`MINED-PATTERNS.md` already named and left open, not re-derived fresh
here.

**Files.** `native/adapters/text/relations.js` (`collapseWs`, module-level;
applied at subject capture, object capture, and `expandSubjectNP`'s
return; the `anchorEnd`/`subjEnd` correction at the `expandSubjectNP` call
site). `native/tests/relations.test.js` (2 new cases: the base-capture
collapse, and DR4's widened-span collapse using a MULTI-character
whitespace run specifically so the anchor-offset regression could not
pass by coincidence — 359 cases total, up from 357).

Suites: eoreader7 native 359/359 (357 + 2, zero regressions — confirmed
by running the full pre-existing suite unchanged before and after).

## S31 — A capability claim and a specimen-shaped fix read identically until a third corpus is asked

> **giver:** earned-here, user direction (2026-08-29)

**Generality:** not-applicable — this entry is the discipline itself, not a
claim about a reading mechanism's reach.

the-fold's POLICIES.md P71 is the paired law; this entry states the same
discipline in this repo's own register, because the failure it names has
already happened on both sides of the fold/native split, not because the
text needs duplicating.

This repo's own history already contains every piece of the gate, each
earned once, in isolation, by a different pass, then left to be re-earned
the next time a different organ needed the same question asked of it. S16's
prior→material ladder tells a structural floor from an empirical dial but
says nothing about VERIFYING that a new dial belongs on one side rather
than the other. S24 reverted "a blanket algorithmic generalisation across
scripts... on the ground that a silent claim of cross-script generality is
a more severe failure than a disclosed narrow scope" — this gate's second
leg, stated for one organ. S28's "what is the one thing this widening must
never do" is this gate's third leg, stated for capture width alone. S30's
own `collapseWs` finding is a fourth, independent instance of the same
question, arriving in this document one entry ahead of this one: a fix
scoped to the prose registers it was actually measured on, with the
register-dependence of the underlying claim named rather than assumed away
("whether 'this line break is incidental' holds for a given document is a
REGISTER classification... a real, undecided design question rather than
something a bug fix gets to settle by assumption"). None of these four was
ever made a standing, checked requirement on every future entry — each was
earned, then left to be re-earned.

**The gate.** A finding earns `universal` here only once: (1) the
mechanism, unmodified, has been re-run over a second corpus sharing its
structural shape and nothing else — the-fold's `eval/grain-refinement.mjs`
is the reference, one 68-line, zero-domain-word core reaching 1.000
precision on both real Wikidata succession and an invented, unrelated
hospital-bed corpus; (2) every threshold or list it introduces names an
external giver or is a structural floor derived from the mechanism's own
shape, per `eval/results/meta-parameters-INVENTORY.md`'s own rule — "a
structural floor is a theorem about the mechanism, not a model of the
material, and turning it into a learned dial would be un-earning it" — read
in the other direction: a MODEL of the material dressed as a theorem about
the mechanism is the same error, inverted; (3) a case built from material
the discovery never saw shows the fix's absence actually failing and its
presence actually succeeding — the-fold's `eval/falsification-probe.mjs` is
the reference, six corpora with ground truth declared before the run,
because a five-fact succession chain and a five-fact dominance chain are
structurally identical by construction and opposite in truth.

**The direction this repo must not get wrong while building the gate that
watches for it.** A mechanism performing differently across two materials
has not necessarily failed to generalize. S24's own caseless-script gap is
not a lower score — it is the mechanism correctly reporting that it cannot
fire on this material at all, a disclosed boundary rather than a violation.
S30's own `collapseWs` fix draws the same line without naming it as such:
the FUNCTION is universal string arithmetic (leg 2's structural floor,
`\s+`, no giver needed beyond Unicode's own whitespace class), while the
CLAIM that licenses using it here — line breaks inside a captured span are
never content — is explicitly disclosed as register-dependent and untested
outside the registers it was measured on, which is `specimen-scoped`
stated honestly rather than `universal` claimed by accident. The-fold's own
MHC content-independence check made the opposite mistake once, reading an
ordinary performance difference as a scale violation before correcting
itself to keep "violation," "performance difference," and "no probe"
apart. Every dial in `meta-parameters-INVENTORY.md` stays honest only if a
future library's material disagreeing with one is read as "this dial needs
a genre prior for this genre," not as "the mechanism was never general" —
this gate exists to keep those two readings from being swapped for each
other.

**The tag.** Every `## S<N>` entry from S31 onward carries
`**Generality:** universal (evidence: ...)` /
`specimen-scoped (disclosed; not claimed further)` /
`not-applicable (names why)` — the identical three-way vocabulary the-fold's
P71 uses, deliberately shared rather than independently invented, because a
fix crossing the fold/native boundary must not need translating between two
disclosure languages depending which repo's law document is open.

**Enforced.** `native/conformance/reading-spec.test.mjs` gained the S26–S30
entries its own S8 test had silently fallen behind on — found while
extending it: the section list stopped at S25 while the spec had already
reached S30, five real sections the suite was not actually checking
existed — and a new case scanning every `## S<N>` header at N ≥ 31 for the
tag. Like the-fold's own enforcement, this checks that the classification
was made, never that it is true — this repo's own S1 rule, "any claim about
what 'the reader' does is measured against this assembly or names precisely
which stages it lacks," applied to the gate that now watches every other
rule.

## S32 — A closed class's language is a declared fact, never an implicit one; an unsupported language is a typed gap, not an accidental non-match

> **giver:** earned-here, user direction (2026-08-30)

**Generality:** specimen-scoped (disclosed; not claimed further) — the
gate shape (declare the language; refuse with a typed reason short of a
registered prior) is the same pattern every declared dial in this codebase
already holds, but this pass adds no second language's pronoun table and
does not run S31's cross-corpus/false-positive demonstration. Whether any
real Latin-script material was ever actually at risk of a coincidental
match under the old, undeclared behavior stays unmeasured; this closes the
exposure by declaration, not by that measurement.

Asked whether the recent pronoun/anaphora work (S16, S22) actually
conforms to "build it as an omnimodal function": the MEDIUM axis does —
`kernel/contest.js` is genuinely medium-general, mechanically enforced (S22)
— but `adapters/text/pronouns.js` carried a second, unaddressed axis. Its
English pronoun regex (`PRONOUN_RE`) and gender table
(`THIRD_PERSON_SINGULAR`, already correctly `giver: lang/en` in priors.js)
ran against whatever text arrived, with no `language` parameter anywhere on
`resolvePronouns`, `resolvePronounsByActivation`, or
`findThirdPersonSingular`. Non-Latin material happened to degrade safely —
the-fold's own MHC omnilingual test found Russian correctly gets zero
pronoun attempts (POLICIES.md P70) — but that safety was an ACCIDENT of
script mismatch, never a declared decision: nothing checked what language
the material was, and nothing would have stopped the same regex running,
and possibly matching, against a Latin-script language this codebase holds
no gender-pronoun prior for at all.

**The fix.** A small per-language registry, `PRONOUN_PRIORS` (one entry
today, `en`, restating `THIRD_PERSON_SINGULAR_META`'s own giver rather than
declaring a second one), replaces the bare constant. All three functions
take a `language` parameter, defaulting to `"en"` — the same shape
the-fold's CLAUDE.md records for its own `createLemmatizer({ language })`
fix (also defaulting to English only when unspecified, also matching every
existing caller unchanged): a declared language with no registered prior
returns immediately, never a silent English guess. Unsupported languages
return ONE typed gap (`no_pronoun_prior_for_language`) for the whole call,
not one per sentence — S22's own denominator law, applied here: "never
attempted" and "attempted and found nothing" must not share a bucket, so
`regime.name` (`"unsupported_language"`, `resolvePronouns` only —
`resolvePronounsByActivation` carries no `regime` block to extend, so its
gap alone carries the same fact) cannot be misread as the other.

**Unchanged, verified.** No existing caller (the-fold's `app.js`,
`hypergraph.js`, `clearance.js`, `seg.js`) passes `language`, so every one
gets the default and is byte-identical: the pre-existing 9/9
`pronouns.test.js` cases pass unchanged, and a new case asserts
`resolvePronouns` with `language` omitted deep-equals the same call with
`language: "en"` declared. Four new cases cover the gate itself. Full
native suite: 255 tests, 251 passing both before and after this change
(the same 4 pre-existing failures — `construction.test.js`,
`hypergraph.test.js`, `morphology-vocab.test.js`,
`network-standing.test.js` — confirmed identical via `git stash`), zero
regressions.

**What this does not do.** No second language's pronoun table is added —
there is nothing yet to register beyond `en`. The omnimodal-by-medium
claim (S22) and the now-declared, still-English-only scope (this entry)
answer two different questions; closing this one does not make pronoun
resolution work in another language, it makes the fact that it does not
a declared gap instead of an accident.

## S33 — Grammatical role by morphology, not position: a case-marking relation extractor, measured against real held-out Latin

> **giver:** earned-here, user direction (2026-08-30)

**Generality:** specimen-scoped (disclosed; not claimed further) — measured
on one language (Latin), one treebank, one register. The mechanism's SHAPE
(a declared per-language case prior, ambiguity preserved, a received
closed class for verb morphology, weak-signal withdrawal on collision) is
a candidate pattern for other case-marking languages, not a demonstrated
one — a second language's own measured prior would be required before
calling it universal.

`adapters/text/relations.js`'s own header states its slot-finding is
POSITIONAL: "the token immediately FOLLOWING a candidate referent
surface... the slot SVO order puts a verb in." That is a fact about
analytic, fixed-word-order languages (English, French, Chinese), not
about clauses in general. The-fold's POLICIES.md P72 already closed the
schema half of this — the arrangement is two ordered ends and a label,
never `subject`/`verb`/`object`, which are a declared SAE-grammar
overlay. This entry closes the other half: a genuinely SECOND extraction
STRATEGY for a language where position carries no signal at all, proving
the neutral shape is required, not merely tidy — building a case-marking
strategy that still recovered "subject" and "object" by a different
signal would have been the same borrowed category surviving through a
new mechanism.

**Why Latin, first — not because it is easy.** S31's own gate: a fix
scoped to a convenient case proves nothing. Latin has free constituent
order and a real, receivable case-ending system, so the claim is
measurable rather than argued. A real, held-out TEST specimen the organ
matches exactly against gold: *"possedit cetera pontus"* — literally
"possessed the-rest the-sea," verb-object-subject order — reports
`end1=pontus` (nominative), `label=possedit`, `end2=cetera` (accusative)
with zero use of position. A positional reader has no rule that gets VOS
order right by construction.

**The prior is measured, the verb morphology is received — a genuine,
measured reason for treating them differently.** `native/priors/
case-marking-lat.json` (`LatinCasePrior@1`, `native/scripts/
build-latin-case-prior.mjs`) mines word-ending -> Case|Number
distributions from UD_Latin-Perseus (1,334 training sentences, CC
BY-NC-SA 2.5 — non-commercial, stated plainly), ambiguity preserved
(`-am` is 100% Acc|Sing; `-is` spans five distinct readings). Verb
personal-ending morphology was tried the SAME mined way FIRST and
rejected on measured coverage: only 75 of 224 distinct 3-character
endings observed in training cleared a volume-5 floor, because personal
endings fragment by conjugation-stem vowel (`-ent`/`-unt`/`-ant` are all
"3rd plural," landing in separate buckets) — a modest corpus sample does
not contain enough of each to earn frequency-based trust. Replaced with
a received closed class (Allen & Greenough's *New Latin Grammar*): the
structural-floor-vs-model-of-the-material distinction this document
already draws (S16's own ladder), now with a case on each side of it in
the same organ.

**Three more real bugs, found by measuring against gold, not by
reasoning about it.** A punctuation-stripping regex that required a
WHOLE token to be punctuation never trimmed "manent." to "manent",
hiding most verb tokens from every suffix check. Bare single-character
personal endings (`-o`/`-m`/`-t`/`-or`) collide constantly with common
noun-case endings (`-o` is also 2nd-declension ablative singular; `-or`
is also the common 3rd-declension nominative agent-noun suffix —
`praedator`, `victor`), forcing a spurious second "verb candidate" on
163 of 222 real single-verb sentences; fixed by withdrawing a `weak`
personal-ending match when the same word also carries a confident
nominal reading, the more specific signal winning rather than either
being dropped outright. A preposition ("Super," over/above) read its own
`-er` ending as a plausible nominative and was reported as a sentence's
subject; closed with a small received Latin preposition list, the same
closed-class-exclusion discipline `priors.js`'s English function-word
sets already hold.

**Measured, not forced higher.** Full pipeline against 380 held-out test
sentences (never used to build the prior), single-finite-verb clauses
only: `end1` vs gold `nsubj` — precision 0.258, recall 0.077; `end2` vs
gold `obj` — precision 0.325, recall 0.118. Isolating case-classification
alone (given the correct token, no verb-finding or competition) shows
why the two are not symmetric: 82% of gold subjects get a confident case
reading but only 36% of those are correctly nominative — nominative is
genuinely the least systematically marked Latin case (3rd-declension
nominatives are often irregular, stem-final-consonant-driven, not
suffix-patterned) — where 88% of gold objects get a confident reading
and 86% of those are correct, because `-um`/`-am`/`-em` are comparatively
unambiguous. Disclosed as exactly that asymmetry, not smoothed toward a
single headline number.

**Disclosed, not attempted.** Multi-clause sentences (559 of 939 test
sentences skipped, named rather than silently scored) — clause
segmentation this organ does not build. Bare-stem imperatives (Latin's
2nd-singular imperative often carries no personal ending at all —
`mitte`, `carpe` — indistinguishable from a noun stem by ending alone).
Noun-phrase-internal agreement — an attributive adjective or participle
sharing its head noun's case (`deiectum leo`, "a fallen lion": both
nominative, one phrase) reads as a second same-case candidate and
correctly gaps as ambiguous rather than guessing which token is the
actual clausal argument — a real ceiling on recall, not a bug.
`esse`'s present-indicative forms only.

Full evidence, every number, every specimen: `native/eval/results/
latin-case-marking-RESULTS.md`; reproduce with `node native/eval/
latin-case-marking-eval.mjs`. `native/tests/relations-case-marked.test.js`
(10 cases) pins the VOS specimen, the shape (`end1`/`label`/`end2`,
never `subject`/`verb`/`object`), every disclosed gap type, and the
weak-ending/preposition fixes as regressions.

**Amended 2026-08-30 — the prior moved to live_priors.** `LatinCasePrior@1`
is a received measurement of an external resource (UD_Latin-Perseus),
independent of any specific text — the same standing `act-priors/
act-prior-en.json` (VerbNet) already holds, and that precedent's own
stated rule applies unchanged: *"a received lexicon is content, not app
logic, so it lives with the corpus."* The file now lives at
`live_priors/derived-priors/case-priors/case-marking-lat.json` (full
provenance restated there); `defaultLatinCasePrior()` loads it via the
same cross-repo relative path `native/tests/phasepost.test.mjs` already
established for `act-priors`. The raw treebank (train/test CoNLL-U,
license, README) stays vendored here as an eval fixture — it is test
material this pass reads FROM, not itself a corpus document this repo
holds — and `build-latin-case-prior.mjs`'s own default output path was
updated to write directly to the new canonical home. Verified
byte-identical: all 10 `relations-case-marked.test.js` cases and the
eval driver's own precision/recall numbers (0.26/0.08 end1, 0.33/0.12
end2 against gold) reproduce unchanged from the new location; full
native suite unaffected (320/331 passing, the same 11 pre-existing
failures by name, before and after).

**Generality:** not-applicable (a provenance/placement decision, not a
reading-behavior claim).
