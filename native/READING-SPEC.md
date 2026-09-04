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

## S32 — Two anaphora-family capacities, kept out of the kernel's own language: NUL+CON for a declared-absent slot, SYN+CON for a GIVEN-affordance reference

> **giver:** earned-here, user direction (2026-08-30: "be mindful of how to
> make it universal as opposed to NL focused and leveraging the cube as
> much as possible")

**Generality:** specimen-scoped (disclosed; not claimed further — see below
for exactly what is and is not covered)

A theory document mapping the linguistic anaphora family onto the nine
operators (external, not this repo's own — evaluated against this repo's
measured operator semantics rather than assumed) named several capacities
this reader does not yet have: a clause missing an expected argument
(ellipsis) currently just fails to extract, silently, confirmed by reading
`adapters/text/relations.js` — no gap-typing exists there; and a definite
reference to something never individuated but implied by what has been
(bridging — "I bought a car. The engine…") has nowhere to resolve at all.
Both are real gaps. Neither needed a new statistic or a new licensing rule
— both compose entirely out of organs this repo already has, proven
general on their own terms before this pass ever touched them.

**`kernel/completion.js`.** A caller-declared schema's closed role set
(`expectedRoles`, never inferred) plus what one act actually filled
(`filled`) types every unfilled-but-expected role as `EOSlotAbsence@1` —
NUL·Figure, cube-derived (`cellOf("NUL","Figure")`), never hand-typed.
Resolving the absence is CON·Figure — the *same* cell ordinary reference
resolution already occupies (`memory/activation.js`'s own declared cell)
— and is a thin wrapper around `kernel/contest.js`'s real `adjudicate`,
already proven omnimodal by its own test suite. `completion.js` introduces
zero new thresholds: `minActivation`/`minMargin`/`contestedMargin` are
`adjudicate`'s own pre-existing, caller-declared parameters, passed
through unchanged.

**`kernel/affordance-reference.js`.** `kernel/hyperlexicon.js` is not a
part-whole table read narrowly — it is a general relation-composition
ledger, licensed only by a named giver (`giveHyperlexiconAffordance`),
refusing mere observed adjacency (`admitHyperlexiconCandidates` stays at
`standing: "candidate"` forever). "Car affords engine" is one more entry
in that same ledger; nothing new was built to ask it that question.
Minting the implied referent is SYN·Figure (an emergent particular, not
directly stated); binding the bare reference to it is the same CON·Figure
cell again. Ambiguity (two GIVEN affordances into the same key) is refused
as a typed gap, never resolved to whichever was found first — the
`.find()`-first-match failure shape both this repo's and the-fold's own
postmortems already name, checked here before it could recur.

**Why specimen-scoped, stated plainly rather than rounded up.** Both
organs pass the strongest form of P71's first leg: the identical,
unmodified kernel functions were run over two genuinely disjoint domains
each — a musical elided-cadence schema (roman-numeral chord symbols) and
an English VP-ellipsis schema for `completion.js`; an opaque
`COMPONENT:*`-keyed circuit ontology and an English part-whole prior for
`affordance-reference.js` — with zero branching on which. That is a real,
structural fact about the mechanism: neither file imports or references
anything English-shaped, checked by grep as well as by the tests passing.
But P71's second leg (a real falsification case: material the discovery
never saw, where the organ's absence visibly fails and its presence
visibly succeeds) was not run, and neither organ is wired to any adapter
or real consumer yet — `PRIOR-ART-INVENTORY.md`'s own honest category,
"built, tested, unconsumed." Whether typing an absence as NUL actually
improves a real reading over the silent-absence status quo, on real
material, is a claim this pass does not make.

**Files.** `kernel/completion.js`, `kernel/affordance-reference.js` (new,
pure, organs injected — `adjudicate` and `hyperlexicon` respectively, the
cast.js/return-curve.js pattern). `tests/completion.test.js` (10 cases),
`tests/affordance-reference.test.js` (9 cases) — both include a cell-typing
check against the real `cube.js::cellOf` (never hand-restated) and both
close with an OMNIMODAL case immediately followed by an ADAPTER-SHAPED
case exercising the identical unmodified code. Full suite: 346/346 before
this pass, 365/365 after, zero regressions.

## S33 — Four more anaphora-family capacities: one shared adjudicator, four different candidate collectors, cells at three different grains

> **giver:** earned-here, user direction (2026-08-30: "build those other
> capacities")

**Generality:** specimen-scoped (disclosed; not claimed further — same two
legs of P71's bar unmet as S32, see below)

S32 closed ellipsis and bridging. The same theory document named four more
gaps: cataphora, quantifier-bound (donkey) anaphora, modal subordination,
and tense-as-anaphora. All four compose out of organs this repo already
has — three of them reuse `contest.js`'s real `adjudicate` a SECOND, THIRD,
and FOURTH time (S32 was the first), which is the throughline worth
stating plainly: one shared adjudication primitive, four capacities that
each contribute only WHICH candidates are in play and at WHICH grain,
never a competing scoring rule.

**`kernel/pending-sig.js` — bounded cataphora.** Every organ in this repo is
deliberately causal (READING-SPEC S3/S11: lookahead is not reading), so a
forward-pointing SIG cannot be a general search — it is an explicit,
BOUNDED wait: `openSig({id, at, expiresAt, matches})` stays open only until
a caller-declared `expiresAt` on the caller's own clock, `checkArrival`
resolves it the moment a caller-declared `matches` predicate is satisfied
or types an honest `expired` gap if the bound passes first. No adjudicator
composed here at all — there is exactly one thing being waited for, never
several competing candidates, so contest.js's margin machinery has nothing
to adjudicate. SIG·Figure opens it, CON·Figure closes it — the same
resolution cell every other capacity in this family lands on.

**`kernel/scoped-kind.js` — quantifier-bound (donkey) anaphora, via the
cube's own Pattern grain.** "Every farmer who owns a donkey beats it" has
no single donkey for "it" to name — each farmer's own. Ordinary CON always
lands at Figure grain (one particular); the cube already has the cell for
"a pattern, not an instance" (Existence·Pattern, Kind), so this file mints
the bound variable there instead of inventing a fourth existence category:
`mintScopedKind({id, at, scope, key})` is SYN·Pattern (Composing), `scope`
a caller-declared opaque id naming the quantifier's own extent (never
inferred), and `resolveInScope` is CON·Pattern — the SAME terrain the mint
landed on, restricted by construction to candidates sharing the reference's
own scope, adjudicated via `contest.js::adjudicate` exactly like S32's two
capacities.

**`kernel/holder-scope.js` — modal subordination, generalizing a pattern
this repo already had, just not at the kernel level.**
`adapters/text/perspective-claims.js`'s own header already states the
mechanism in prose, for one medium's one boundary: "bindNarrationFrames
runs the organ inside one teller's stretch at a time... P1's
never-carry-a-window rule, one level in." Modal subordination ("A wolf
might come in. It would eat you first.") is the identical question at a
different boundary — a hypothesis's own establishments, not a narrator's.
`kernel/perspective.js`'s `holder` is already open, caller-declared, and
medium-blind by its own header, so a hypothesis is just one more holder,
the same way a narrator already is. `accessibleHolders` walks a
caller-declared accessibility graph (never inferred — no nesting, no
modality, no narrative structure computed here); `admissibleUnder`
produces exactly the predicate shape `adjudicate`'s own `admissible`
parameter already expects; `resolveUnderHolder` composes it with a
caller's own filter (gender, etc.) by ANDing rather than overriding, so
which filter did the refusing stays visible. `perspective.js::READER` is
re-exported rather than restated, the same discipline `cube.js::cellOf`
already gets everywhere else in this family.

**`kernel/temporal-reference.js` — tense-as-anaphora (Partee), and the one
real bug this pass's own tests caught.** A time is individuated exactly
like any other particular (INS·Figure — Entity means "any individuated
particular," not "person or object"); the narrative's own current
reference ground — what a bare past tense currently points to — is
Interpretation·Ground: Atmosphere, "present interpretive ground" in this
kernel's own `terrain-activation.js` header, not a stretch but a direct
reuse of a cell already named for exactly this. Advancing it is REC·Ground,
mirroring `perspective.js`'s own REC discipline field for field (`supersedes`
names what was re-zeroed, kept, never erased). Resolution is deterministic
with exactly one live candidate (not a default — the only possible answer)
and routed to the real `adjudicate` with more than one, which itself
refuses to run without the caller's declared bars — so genuine ambiguity
can never silently fall back to "most recent."

**The bug, found by running it, not by re-reading it (P5.5 again).** The
first cut of `candidateGrounds` filtered only by `at <= sigAt` — so once a
ground was superseded ANYWHERE in the list, it read as excluded even at a
`sigAt` BEFORE the superseding ground had itself happened, and separately,
an ordinary two-step linear narrative (g1 then g2 superseding it) still
surfaced BOTH as live candidates at any point after g2, wrongly demanding
adjudication for a case with no real ambiguity at all — the OMNIMODAL and
ADAPTER-SHAPED tests both caught this on first run, not a re-read. Fixed by
excluding a ground only once its OWN superseding ground has itself happened
by `sigAt` — a supersession that hasn't occurred yet at this point in the
narrative does not retroactively un-happen the ground it will later retire.
Two genuinely independent threads (neither's `from` pointing at the other —
a real flashback, not a retired link) correctly stay separate candidates
throughout, confirmed by a dedicated case pinned as a regression.

**Why specimen-scoped, the same two unmet legs S32 named.** All four pass
the cross-domain leg the same way S32's two did: the identical, unmodified
kernel functions run correctly over a genuinely non-linguistic domain
(a protocol ACK trace; per-batch manufacturing anomalies; a conditional
plan-branch; sensor calibration events) and an English one, zero branching
on which. None introduce a new threshold (all four compose entirely with
`adjudicate`'s own pre-existing, caller-declared parameters, or need none
at all). But no falsification/necessity case was run on any of the four,
and none is wired to a real adapter or consumer — `PRIOR-ART-INVENTORY.md`'s
own honest category again.

**Files.** `kernel/pending-sig.js`, `kernel/scoped-kind.js`,
`kernel/holder-scope.js`, `kernel/temporal-reference.js` (new, pure, organs
injected). `tests/pending-sig.test.js` (9 cases), `tests/scoped-kind.test.js`
(8 cases), `tests/holder-scope.test.js` (10 cases),
`tests/temporal-reference.test.js` (9 cases) — all four include a
cell-typing check against the real `cube.js::cellOf` and close with an
OMNIMODAL case immediately followed by an ADAPTER-SHAPED case over the
identical unmodified code. Full suite: 365/365 before this pass, 401/401
after, zero regressions.

## S34 — `\b` is ASCII-`\w`-only in JS; a surface written in any non-Latin script could never be located by name

> **giver:** earned-here, found running real fetched Война и мир prose
> against the omnilingual-reading question (2026-08-30)

**Generality:** universal (evidence: the identical, unmodified fix closes
the defect on three independent, unrelated scripts — Cyrillic, Greek,
Hebrew — via one shared Unicode word-character class this file already
had; the mechanism is `\b`'s own JS-level ASCII-only definition, not
anything about Slavic morphology or this specimen's own code-switching,
both hypothesized first and refuted by direct test before this fix was
written)

**The measured defect.** Running the-fold's own omnilingual-reading
question against a real, freshly-fetched, correctly-identified Russian
source (`live_priors/11-multi-language/war-and-peace/ru/`, Wikisource's
Война и мир, rendered and byte-verified — not the corpus's own
already-flagged mislabeled `gutenberg-non-en/` directory) through
`eot-sidecar.mjs` produced 8 admitted edges from an 8000-character excerpt
of the novel's famous opening scene. Every one of the 8 was in FRENCH —
the scene's own embedded aristocratic dialogue, real Tolstoy, not
corruption — and NONE were in the surrounding Cyrillic narration, despite
`scriptCoverage` correctly reporting the excerpt fully cased
(`casedShare: 1`) and `extractSurfaces` correctly finding 10 real Cyrillic
surfaces (including the full name "Анна Павловна Шерер") when tested
directly on isolated Russian prose.

**Two hypotheses tested and refuted before the real cause was found (P5.5's
own discipline: check the driver before the theory).** (1) Russian's
grammatical case declension fragments a name across sightings (Анна
Павловна / Анне Павловне / Анны Павловны, three strings for one referent)
— refuted directly: holding a Cyrillic surface EXACTLY fixed across five
repeated sentences (no declension in play at all) still nominated zero
candidate verbs. (2) French dialogue statistically crowds out sparse
Cyrillic recurrence in a short excerpt — refuted the same way: the
zero-candidate result reproduces on PURE Russian text with no French
anywhere in it.

**The real cause.** `discoverRelationVocab`'s `SURFACE_RE` relocates each
candidate surface in the text with `\b(?:NAME)\b`. JavaScript regex has no
Unicode-aware word-boundary mode — `\b` is defined purely against
`\w = [A-Za-z0-9_]`, even under the `/u` flag — so the position immediately
before and after a Cyrillic (or Greek, Hebrew, Armenian, ...) letter is
ALREADY `\W` by `\b`'s own reckoning: there is no word-to-nonword
transition for it to detect, so `\b` never fires there and the surface can
never be located, regardless of how often it recurs. Confirmed directly:
`/\bАнна\b/u.test("Анна Павловна")` → `false`; the identical construction
with the `\b`s removed → `true`; the same failure independently reproduces
for Greek (Ελένη) and Hebrew (דוד) — genuinely unrelated scripts and
language families, the cross-domain leg P71/S31 demands. A name is only
ever safe by ACCIDENT of its first and last character being ASCII —
"Hélène" (a mid-word diacritic) still matches, because `\b` only ever
inspects the two boundary characters, never the content between them.

Three sibling call sites in the same file share the identical shape and
the identical defect, none reached by the measured War-and-Peace specimen
but each independently confirmed broken by direct construction:
`negationBeforeVerbFor` (the negation-detection regex this file's own
header already documents being built for injected non-English priors —
"e.g. Basque's ez, `bin/priors/lang/eu.json`" — an intended use case this
bug would have silently defeated for any script beyond Latin);
`OBJECT_GROUP`'s function-word boundary; and `AUX_GROUP_RE`/
`SUBJECT_SECOND_GUARD`'s aux/negation boundaries (both gated behind
`phrasalPredicates`, default-off, but real and exercised by live_priors'
own DR5 work).

**The fix.** One shared helper, `bWord(pattern) = (?<!${WCHAR})(?:${pattern})(?!${WCHAR})`,
where `WCHAR` is this file's own already-established word-character class
(`W`'s content without its `+` quantifier — `\p{L}\p{N}_'’`, the same set
every surface and verb candidate here is already built from) —
mathematically identical to `\b` for the ASCII-bounded case every existing
test already exercises (a run of `W` characters bounded by non-`W`
characters), now correct for the rest of the alphabet too. All four sites
converted; zero remaining `\b` occurrences in the file.

**Measured after the fix, on the identical specimens.** The pure-Cyrillic
synthetic control (an exactly-recurring name, no declension) now nominates
real verbs and extracts real triples — "Анна Павловна —кашляла→ несколько
дней", "—улыбнулась→ князю Василию", "Князь Василий —поцеловал→ руку Анны
Павловны" — the SAME three-edge count and parallel structure the matched
English control finds on the identical sentence shapes. Greek and Hebrew
synthetic controls independently confirm the same repair. A real Cyrillic
negation word, injected the way the file's own header already names as
the intended pattern, is now correctly located and correctly reads
polarity "-". English extraction is unchanged byte-for-byte (pinned as a
regression).

**Files.** `adapters/text/relations.js` (the `bWord`/`WCHAR` helper; four
call sites converted). `tests/relations.test.js` (5 new cases: the
measured Cyrillic defect and its fix; the declension-vs-boundary
discriminating control; cross-script Greek/Hebrew generality; the
documented non-English-negation-injection use case; an explicit ASCII
byte-identical pin). Full suite: 371/361/10 before this entry, 376/366/10
after — the same 10 pre-existing failures this environment already
carries (the uninitialised `legacy-eoreader6.1` submodule), zero
regressions.

## S35 — a comma glued to a name's own trailing edge was read as a run continuation, gluing two subjects into one surface

> **giver:** earned-here, found aligning the-fold's own three-language War
> and Peace excerpts to the same narrative span and diffing their EOT
> readings (2026-08-30)

**Generality:** universal (evidence: the identical, unmodified fix closes
the defect on the real Cyrillic specimen it was found on AND on a
constructed English specimen sharing nothing but the punctuation shape —
unrelated script, same mechanism; and the fix is the SAME category of
punctuation-adjacency rule this file has now independently earned three
times over — the pipe fix (S18/P38, `extractSurfaces` run-breaking
punctuation) and the bracket fix (P50, `\p{Ps}`/`\p{Pe}` as a Unicode
category rather than an enumeration) both closed a hard-break gap by
naming the GLYPH CLASS that breaks a run rather than the specimen that
exposed it; this is the third glyph, not a new mechanism)

**The measured defect.** Aligning the three War and Peace excerpts
(English/Russian/French, Part One Chapters I–III, matched by narrative
content rather than chapter number — see the alignment note below) and
reading each through `extractSurfaces` surfaced a single spurious
3-token surface in the Russian excerpt: "Пьера Анна Павловна" — Prince
Vasíli's aside about Pierre ("...Пьера..."), a comma, then the scene's
central subject newly introduced ("Анна Павловна"). The comma sits
directly against "Пьера"'s own trailing edge with no space before the
next capitalised token, and the run-walker in
`accumulateSurfaceEvidence` crossed straight over it, reading three
tokens separated only by `split(/\s+/)`'s own whitespace boundaries as
one continuous capitalised run. Reproduced identically on constructed
English prose sharing only the punctuation shape ("Pierre, Anna
Pavlovna" → the same spurious glued "Pierre Anna Pavlovna") before the
fix was written, confirming the defect was general rather than a
Cyrillic-specific parsing accident.

**The real cause.** `accumulateSurfaceEvidence` split each sentence on
`/\s+/` and then stripped leading/trailing punctuation from each token
independently, discarding — with nothing downstream to recover it —
whether that punctuation had sat flush against the token's own edge (no
intervening space) or separated by whitespace from a genuine token
boundary. A multi-word name's own internal space and a comma-then-name
clause boundary look identical once the punctuation is stripped and the
information about its adjacency is gone.

**The fix.** The token walk now keeps, per token, whether punctuation was
glued to its LEADING or TRAILING edge (`leadingJunk`/`trailingJunk`,
tested against the raw pre-strip token) and derives a `hardBreakAfter`
boundary between two adjacent tokens whenever punctuation trailed the
first or led the second — plain whitespace with nothing else is the only
separator a name run may still cross. The capitalised-run walker consults
this boundary before extending a run past `toks[j-1]`, exactly the way
the pipe fix (S18) and bracket fix (P50) each added their own boundary
rule to the same class of run-detection logic elsewhere in this repo's
lineage. A regression control (plain whitespace between two capitalised
tokens, no punctuation anywhere) confirms the fix is a hard-break ADDITION
and not a general tightening — ordinary multi-word names still extract
and merge as one candidate, unchanged.

**Measured after the fix.** Re-run on the real Russian specimen: the
spurious "Пьера Анна Павловна" surface no longer extracts; "Анна
Павловна" and "Пьера" (separately) still do. The constructed English
control: "Pierre Anna" and "Pierre Anna Pavlovna" no longer extract;
"Pierre" and "Anna Pavlovna" still do, and remain two distinct,
never-merged referents through `discoverReferents`.

**Disclosed, not fixed by this pass:** this closes ONE identified cause
of referent fragmentation surfaced by the aligned three-language
comparison. A second, independent cause — `genericTokens`'s
IQR-derived partner fence being sensitive to how many distinct
multi-word surfaces a given excerpt happens to contain, which can make
the identical name-and-title pair generic in a shorter excerpt and not
in a longer one of the same material — was found while re-testing after
this fix and is recorded, deliberately unfixed, in the-fold's own
`POLICIES.md` (the aligned-reading finding) rather than patched here:
tuning `deriveMinPartners`'s formula against this one specimen would be
exactly the "never tune a parameter by checking what it does to a
golden's own score" mistake this repo's own standing rule already
forbids.

**Files.** `adapters/text/surfaces.js` (`accumulateSurfaceEvidence`'s
`leadingJunk`/`trailingJunk`/`hardBreakAfter` tracking; its own header
comment carries the same account). `tests/rich-referents.test.js` (2 new
cases: the comma-glued specimen, both at the surface level and through
`discoverReferents`; the plain-whitespace regression control). Full
suite: 379 tests / 368 passing / 11 failing before and after this
entry's two new cases — 381/370/11 — failure names diffed via
`git stash` rather than counted: byte-identical, zero regressions. The
11 are this environment's own pre-existing set (the uninitialised
`legacy-eoreader6.1` submodule and its dependents), one more than S34's
own 10 because later work between S34 and this entry added a test file
this environment cannot load either.

## S36 — `Cased_Letter` answers "does this letter belong to a case category," not "does this material ever use its other member" — Georgian passed the wrong test

> **giver:** earned-here, found running the-fold's reading pipeline
> against all 516 real UN UDHR translations (2026-08-30)

**Generality:** universal (evidence: the identical, parameter-free fix —
"zero distinct sentences carry a capitalised token outside sentence-
initial position" — closes the defect on three specimens that share
nothing but the shape: Georgian's Mkhedruli, General_Category Ll,
Unicode-cased but never capitalised in real use; the Cherokee syllabary's
traditional block, General_Category Lu, the mirror-image failure; and an
ordinary Latin-alphabet sentence in a lowercase-only romanisation
convention, no exotic script involved at all. Three unrelated scripts,
one unrelated Latin control, one mechanism, no per-script list anywhere)

**The measured defect.** `scriptCoverage` (S24) already asks "can the
capitalisation mechanism see this material's script at all" via
`\p{Cased_Letter}` (Lu/Ll/Lt) share, and this file's own header already
claimed Georgian "ARE bicameral, and are correctly not gapped" — verified,
at the time, against an artificial `.toUpperCase()` transformation, not
against real running text. Running this instrument on all 516 real UDHR
translations found the claim false: a real 10,174-letter Georgian
translation reported `casedShare: 1.0`, `gap: null` — yet `extractSurfaces`
run on that same real material found exactly ZERO real Georgian surfaces.
Every one of the 18 "candidates" it did report came from the file's own
English-language front matter ("Human Rights", "UN General Assembly",
"Paris"), never from the document's 106 sentences of real Georgian prose —
the identical "cased debris" shape this file's header already names as the
hazard for a genuinely caseless script, occurring silently on a script the
gate said was fine.

**The real cause.** `\p{Cased_Letter}` is satisfied by EITHER member of a
case pair — Mkhedruli, modern Georgian's everyday alphabet, is
General_Category Ll (lowercase) on its own, with no Lu companion in
ordinary use (Mtavruli, Georgian's Unicode uppercase block, is a
monumental/decorative variant, not a working capitalisation convention).
So `casedLetters` reads 100% of the material's letters and both existing
gaps correctly stay silent — but `CAP_TOKEN`, the mechanism `scriptCoverage`
exists to protect, requires a capital OUTSIDE sentence-initial position to
count as evidence at all (position is not namehood, the same rule every
sentence-initial exclusion in this file already applies), and a material
that is 100% one case member can never supply one. Confirmed as the same
class, not a Georgian-specific accident, on two more constructions sharing
nothing else: a Cherokee sentence pair using the syllabary's traditional
block (every character defaults Lu — the identical failure from the
opposite direction, additionally caught in part by the pre-existing
all-caps-run exclusion, itself a coincidence rather than a fix for this);
and a plain Latin-alphabet sentence pair written entirely lowercase, no
non-Latin script anywhere, which fails identically — proving the defect
was never about any one alphabet.

**The fix.** A third, structural boundary, matching the file's own
existing two ("zero is not a threshold"): `scriptCoverage` now checks
whether any candidate surface — reusing `accumulateSurfaceEvidence`'s own
`sentenceIndex`, never a second walk — was found in more than zero
sentences; if the union across every candidate is empty, `gap.reason:
"script_case_unused"`. No percentage, no derived quantile, no hand-picked
minimum: the count is either zero or it is not. `scriptCoverage(sentences,
{ evidence })` takes an optional pre-computed evidence accumulator so a
caller already about to call `extractSurfaces` on the same sentences (both
live_priors call sites do) folds the material once, not twice — omitted,
it computes its own, byte-identical to the old bare-`sentences` call for
every existing caller.

**A deliberately un-forced residual, disclosed rather than fixed.** A
second real UDHR specimen, a Cherokee transcription using the MODERN
lowercase-companion block for most characters ("cased" in the corpus's own
label), carries a small number of genuine traditional-block characters
concentrated in exactly ONE title-like fragment recurring across two
sentences — real evidence, at this organ's own "zero is not a threshold"
bar, so it does not gap. Its downstream relation-extraction outcome is
still empty (the concentrated evidence never forms a usable triple), so
the practical outcome matches the genuinely-blind cases even though the
gate does not name it — stated honestly here rather than forcing a second
threshold to also catch it, which this file's own standing rule (never
tune a parameter by checking what it does to one more specimen) forbids
without a corpus-scale measurement this pass did not run.

**Files.** `adapters/text/surfaces.js` (`scriptCoverage`'s third gap
branch and its optional `evidence` parameter; the header's Georgian claim
corrected in place, pointing here). `tests/script-coverage.test.js`
(Georgian moved out of the "must not be gapped" list into a new positive
case alongside the Cherokee and lowercase-Latin constructions; a boundary
pin — exactly one non-initial capital does NOT gap; an evidence-reuse
equivalence case). Full suite: 379/368/11 before, 381/370/11 after,
failure names diffed via `git stash`: byte-identical, zero regressions.
The corpus-side record — the UN UDHR front-matter stripping this same
investigation also closed, the full 516-language census, and the
S34-generality re-verification against real (not only synthetic) material
— is live_priors' own POLICIES.md LP13 (renumbered from LP8 on that repo's own merge).

## S37 — `capitalisationIsSignificant`'s normal approximation was a biased test, not merely an imprecise one — replaced with the exact binomial tail

> **giver:** earned-here — an exact one-sided binomial tail replaces a
> z-score approximation; found auditing `capitalisationIsSignificant` while
> diagnosing a Czech UDHR specimen flagged during the-fold's 516-language
> content comparison (2026-08-30)

**Generality:** universal (evidence: `capitalisationIsSignificant(cap,
lower)` is a pure function of two integers with no script, language, or
corpus dependence anywhere in its own body — every caller across every
material this organ ever reads passes through the identical arithmetic.
The demonstration is not one more specimen but an EXHAUSTIVE enumeration
of the function's own practically-relevant domain: every `(cap, lower)`
pair with `cap, lower >= 1` and `n = cap + lower <= 60`, 1,711 pairs in
total. A check that covers the whole input space is a stronger generality
claim than a second corpus could ever be — there is no third material to
run this against because the function reads no material at all)

**The measured defect.** The old test approximated a one-sided binomial
proportion test with a normal z-bound (`CAP_SIG_Z = 1.645`, the standard
one-sided-95% critical value): `pHat = cap / n > 0.5 + 1.645 *
sqrt(0.25 / n)`. Normal approximations to the binomial are known to be
unreliable at small n and near the tails — textbook material, not a
discovery — but this organ's own callers (`surfacesFromEvidence`, gating
whether a single word's capitalised/lowercase split counts as namehood
evidence) run almost exclusively at SMALL n: a rare surname seen a dozen
times in one document is a typical call, not an edge case. The triggering
specimen (Czech, "Spojených," cap=4/lower=1) did NOT itself flip — exact
p = 0.1875, refused under both the old approximation and the new exact
test — so the investigation widened from one specimen to the function's
whole practical domain rather than stopping at "this case looks fine."

**The real cause, found by exhaustive enumeration.** Of the 1,711 pairs
with `n <= 60`, **24 disagree between the two tests, and all 24 disagree
in the same direction**: the old approximation calls the split
"significant" (admits the word as name-evidence) where the exact tail
says the true one-sided p-value exceeds the declared `CAP_SIG_ALPHA =
0.05` (refuses it). Zero pairs disagree in the opposite direction. This
is a systematic bias, not scattered imprecision: the normal approximation
was structurally too permissive at the small-n range this organ actually
operates in, admitting words as name-evidence on weaker splits than the
declared 0.05 target actually licenses. Two representative flips: `cap=6,
lower=1` (n=7, exact p = 8/128 = 0.0625 — real evidence, one short of the
declared bar) and `cap=7, lower=2` (n=9, exact p ≈ 0.0898). A positive
control at the same scale, `cap=9, lower=1` (n=10, exact p = 11/1024 ≈
0.0107), clears the bar under both tests — the fix narrows a false
positive at low n, it does not raise the bar on genuinely strong evidence.

**The fix.** `capitalisationIsSignificant` now computes the exact
one-sided binomial tail `P(X >= cap | n, p=0.5)` directly, in log-space,
and compares it to the SAME `CAP_SIG_ALPHA = 0.05` the old z=1.645 bound
was already targeting (one-sided 95% is what `z=1.645` approximates —
this fix keeps the standing target and corrects only how it is computed,
never redefines what "significant" means). Log-space is load-bearing, not
stylistic: a naive real-space sum of `C(n,j) * 0.5^n` terms underflows
before the combinatorial terms can matter, because `0.5^n` alone hits the
smallest positive IEEE double subnormal at `n=1074` (`5e-324`) and is
exactly `0` at `n=1075` — a naive implementation would silently return
`0` (never significant) for any word seen more than ~1,075 times, wrong
in the unmeasured direction, and this organ has no declared ceiling on
how often a word may recur in a large document. The log-space recurrence
(`logTerm += log(n-j+1) - log(j)`, log-sum-exp over the kept tail terms)
has no such ceiling.

**Files.** `adapters/text/surfaces.js` (`CAP_SIG_ALPHA` replaces
`CAP_SIG_Z`; `logBinomialTailAtHalf` + the rewritten
`capitalisationIsSignificant`, both documented in place with the flip
count and the underflow reasoning above). `tests/rich-referents.test.js`
(two new cases: a 6-of-7 flip specimen the old approximation wrongly
admitted and the exact test correctly refuses; a 9-of-10 positive control
both tests agree on). Full suite: 381/370/11 before (the code fix alone,
confirmed byte-identical to S36's own committed baseline — no other
caller's outcome moved), 383/372/11 after (the two new cases above pass;
same 11 pre-existing failures by name), zero regressions.

## S38 — a highly-inflected language fragments its own names' case forms into strangers; two received priors close it (declension folding) and its neighbouring gap (a POS-vocabulary gate that never loaded, for any language)

> **giver:** `native/priors/declension-rus.json` — UniMorph (github.com/
> unimorph/rus, CC BY-SA 3.0); `native/priors/pos-{eng,rus,fin}.json` —
> Universal Dependencies (UD_English-EWT, UD_Russian-GSD, UD_Finnish-TDT,
> all CC BY-SA 4.0), found running the-fold's reading pipeline against all
> 516 real UN UDHR translations, then a real fetched Russian War and
> Peace (2026-08-30/31)

**Generality:** universal for the mechanism, specimen-scoped for the
Russian/Finnish/English data shipped this pass (evidence: neither
`native/adapters/text/declension.js` nor `native/scripts/build-pos-
prior.mjs` contains one line of Russian-, Finnish-, or English-specific
code — both take a received, language-declared prior as data and a bare
CoNLL-U/UniMorph file as input respectively; `build-pos-prior.mjs`'s own
header states this and `tests/pos-prior.test.js` proves it by running the
IDENTICAL unmodified `classifyWord` against three independently-built
priors, English/Russian/Finnish, with no per-language branch anywhere in
the consumer. What is specimen-scoped is the DATA: only Russian has a
declension prior today, and only English/Russian/Finnish have POS priors
— extending either to a fourth language is "fetch one more treebank," not
new code, and that is exactly the claim this generality tag makes and no
more).

**The two defects, found together, closed separately.** Blind-spot
comparison across all 516 UDHR translations (this file's own S34/S36/S37
lineage) surfaced two more: (1) `namesCorefer`'s containment/shared-final-
token check compares Cyrillic tokens as exact strings, so a bare Russian
surname's own CASE FORMS — "Кутузов" (nominative), "Кутузова" (genitive/
accusative), "Кутузову" (dative) — read as three unrelated strangers,
never one referent; the identical shape recurs for every name (Anna
Pavlovna's own "Анна"/"Анне"/"Анны"/"Анну" fragment the same way) and for
Finnish's own richer case system. (2) The comment already sitting in
live_priors' own `eot-digest.mjs::loadOrgans` — describing a measured,
working POS-vocabulary gate that drops garbage connectors from real
Gutenberg excerpts (Shakespeare 90→22 edges, the Iliad 65→25, Alice
97→34) — was true of a PAST build, but the code path it describes
imports `legacy-eoreader6.1/packages/engine/perceiver/text/wordclass.js`
and reads `legacy-eoreader6.1/scripts/corpus/pos-eng.json`, and that
submodule is confirmed empty in this checkout (`ls -la` on it: only `.`
and `..`) — so the gate has been silently loading for NEITHER English nor
any of the other 515 languages, and every relation-vocabulary count this
whole session measured was unfiltered raw edges, never the gated ones the
comment describes.

**Why a rule table, not a form->lemma dictionary, for declension.**
Checked directly before designing anything: "кутузов" appears NOWHERE in
UniMorph's 473,482-row Russian paradigm table. A historical or fictional
PERSON's surname is exactly the class of word a general-lexicon resource
will never carry, so what has to generalise is the TRANSFORM (mined from
the 178,843 real noun rows UniMorph does carry — e.g. genitive singular
hard-stem masculine: strip a trailing "а", the single most common
transform in the whole table at 7,541 real instances), never the word.

**Why the check stays pairwise, never a per-word canonical lemma.** The
mined rules are directional but ambiguous taken alone: "ов" is the
dominant Russian genitive-PLURAL ending ("столов" -> "стол"), and Kutuzov
is exactly the common Russian surname class that happens to already END
in "-ов" as part of its own stem. Applying that rule to a bare word in
isolation would corrupt an already-nominative name ("Кутузов" ->
"Кутуз", a word nobody wrote). `declension.js::createDeclensionFolder`
answers a narrower, safer question instead — does inflected surface A
reach EXACTLY the other OBSERVED surface B under some rule — so a false
merge needs two unrelated real names in the same document to coincide on
one exact transformed string, never a single word's own identity being
silently rewritten. `namesCorefer(a, b, { sameStem })` widens the
existing containment/shared-final-token checks with this predicate,
tried in both directions; omitted, behaviour is byte-identical to before
this file existed (checked: `namesCorefer("Кутузов", "Кутузова")` is
`false` with no organ injected, exactly as it always was).

**The floor is declared and swept, not fitted to the reporting
specimen.** `MIN_COUNT = 100` (a rule must recur at least this often in
the mined data to ship) was checked at 10/25/50/100/200 against real
Russian War and Peace prose BEFORE being chosen: every floor in that
range produced ZERO false merges among the real named characters present
(Anna, Pierre, Kutuzov, Vasily, Andrei, Boris, Bolkonsky, Bonaparte,
Napoleon, Mortemar, and more — 38 correct merges at the shipped floor, 43
at the loosest floor tested, still zero wrong ones), with only recall
varying; 100 sits inside that flat region rather than at either edge. A
second, structurally different corpus (the Russian UDHR, legal/
declarative prose rather than narrative) produced zero fires either way —
disclosed honestly as a weak cross-domain check (the document is short
and front-matter-contaminated at the raw-file level this validation read
it at, so few genuinely inflected pairs existed to test against) rather
than claimed as a second positive result.

**The POS-prior fix is a path fix, not a new mechanism.**
`native/adapters/text/wordclass.js` already exists, is self-contained (no
legacy import — confirmed by grep, and by this file's own P69 ratchet
history), and exports exactly the four symbols `makeGrammarLens` needs
(`classifyWord`, `dominantClass`, `POS_PRIOR_META`, `THRAX_META`).
`native/scripts/build-pos-prior.mjs` is new: the SAME CoNLL-U pass-0
parsing `build-construction-prior.mjs` already proved (tab-split, skip
`#` comments, skip multi-word ranges), stopped one pass earlier — the
unconditional form-level tally IS `POSPrior@1`'s own shape, no
conditioning layer needed for this gate. Reused verbatim across all
three languages: `eng` (UD_English-EWT, 204,578 tokens, 16,654 forms),
`rus` (UD_Russian-GSD, 74,900 tokens, 24,524 forms), `fin`
(UD_Finnish-TDT, 162,815 tokens, 46,293 forms) — real, checked counts,
not estimates: English "the" reads 9,064:8:2:1 DET:PRON:ADP:PART,
Russian "и" reads 1,724:84:1 CCONJ:PART:PROPN, Finnish "ja" reads
4,710:8 CCONJ:ADV and "on" reads 3,071:97:1:9 AUX:VERB:ADV:PROPN — every
one the grammatically correct dominant class. live_priors' own
`loadOrgans` still points at the dead legacy paths; retargeting it to
these native files and priors is live_priors' own change (its own
POLICIES.md carries the wiring and the corpus-scale remeasurement).

**Files.** `scripts/build-declension-prior.mjs` (new) + `native/priors/
declension-rus.json` (new, built artifact, committed — 89 rules, 3.9KB).
`adapters/text/declension.js` (new, pure, zero imports —
`createDeclensionFolder`). `adapters/text/surfaces.js` (`namesCorefer`
gained an optional `{ sameStem }`; `discoverReferents` threads it through
unchanged elsewhere). `scripts/build-pos-prior.mjs` (new) + `native/
priors/pos-{eng,rus,fin}.json` (new, built artifacts, committed —
384KB/733KB/1.1MB). `tests/declension.test.js` (new, 9 cases, against the
REAL committed prior — the flagship Kutuzov case, a feminine -а noun
class Anna exercises differently, an unrelated-names control, the
residual-stem floor, the no-prior gap, and one full `discoverReferents`
end-to-end case showing three real Cyrillic case forms of one name merge
into one referent only when the organ is injected, and do not without
it). `tests/pos-prior.test.js` (new, 7 cases, against all three REAL
committed priors). Full suite: 383/372/11 before this entry's own changes
(S37's own committed baseline), 399/388/11 after (16 new cases, all
passing; same 11 pre-existing failures by name), zero regressions.

## S39 — A closed class's language is a declared fact, never an implicit one; an unsupported language is a typed gap, not an accidental non-match

*(Renumbered from S32 on merge — concurrent PRs landed their own S32–S38 first; the numbers moved, nothing about the entries themselves did. S40 below was S33.)*

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

## S40 — Grammatical role by morphology, not position: a case-marking relation extractor, measured against real held-out Latin

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

## S41 — The basin null is degenerate when the basin approaches the population

**Generality:** universal.

**Governing law:** eo-constitution **II.23** (the resolution test, 19th
amendment, sealed) and **II.10** (commensurability). This entry records what
the kernel does about them.

`entity-kind-induction.js::induceEntityKindCandidates` validates a basin with
`random-subset-binding-energy`: random subsets **of the same size, drawn from
the same population**. Run over 174 recurring surfaces of a real book by
the-fold, it returned **one** basin of **149** and marked it validated.

That verdict is vacuous by construction. A random 149-subset of 174 is nearly
the observed set, so the statistic cannot vary with the perturbation. It is
also II.10's own *selection is an axis* violated at the source: a basin is a
connected component, i.e. **chosen for cohesion**, and a set chosen for being
extreme is not placed against subsets drawn at random.

The harm is not a false kind. **It concealed a real one** — with a licensed
null the same material carries structure at observed binding energy 0.2657
against a 200-draw redeal maximum of 0.2009, censored above.

**Two mechanism notes, measured, so the next pass does not re-derive them.**

- `connectedBasins` over a mutual-kNN graph at the derived default
  `neighborCount = ceil(sqrt(n))` percolates: at n=174 the graph is one
  component. Lowering k fragments it, and choosing k so that a known specimen
  separates is specimen-fitting (S31 / the-fold P71) — the null was fixed
  instead, and the structure then cleared without touching a parameter.
- A redeal null **inverts pairwise similarity**. Redealing which entity each
  mention belongs to gives every entity the corpus-average profile, so redealt
  entities are MORE alike than real specialised ones (median 0.400, max 0.950
  over 23,780 pairs). Any agglomeration gated on "observed similarity beats
  the null" stalls at all-singletons. Binding energy — intra minus inter — has
  the direction right because it measures differentiation, not likeness.

**Unchanged here.** No kernel module was edited. The organ's null is correct
for the regime it was built for (a small basin against a large population)
and degenerate outside it; the consuming repo now carries its own
membership-grade test (`the-fold/kind-standing.js`) rather than asking this
one to answer a question it was not built for. Narrowing the organ's own
declared regime, or refusing a basin whose size approaches its population, is
real unstarted work named here rather than done silently.

## S42 — The assertion ledger is kernel, medium-blind, and born with its frame; the reading closure crosses; the ledger cut by surprise finds no section

**Generality:** universal (the ledger, the frame, the stream); the segmentation
result is specimen-scoped (three Wikipedia pages, one oracle) and recorded as
such.

**User direction, verbatim (2026-09-02):** "the hyperlexicon should be part of
eoreader7, medium agnostic" — "make that shift and learn lessons about music
and priors and have all reading be vastly richer. no view from nowhere" —
"the fold should only be an interaction surface."

**What moved, and what it became.** the-fold's assertion ledger (its P57
`hyperlexicon.js`, moved to `native/organs/` earlier the same day) held ends
called subject/verb/object and a gate that asked whether a connector was a
verb — a text reading's vocabulary carried into a store that
`event-arrangements.js` had been feeding arrangements read off MIDI, WAV,
video shots, turbulence fields and the instrument's own record.
`kernel/notes.js` is the ledger one level down with the medium stripped: an
arrangement is two ENDS and a LABEL (`end1/label/end2`, the-fold's P76 earned
names — "an arrangement has ends, not parts of speech"); the only gate is the
one a caller injects (`admit(log, arrangements, { gate })`, a refusal
`{reason, detail, givers}` or null); the two structural refusals
(`incomplete`, `unaddressed`) are the kernel's own; a span is an ADDRESS plus
whatever the medium's adapter put beside it, carried opaque. `notes.test.js`
reads the kernel's executable body and fails if `sentence`, `pronoun`,
`surface`, `token`, `word`, `text`, `verb`, `subject`, `object`, `noun`,
`bar` or `pitch` appears in it — contest.js's own pin, with the grammar words
added. `organs/hyperlexicon.js` is now the TEXT FACE: the same API its callers
speak (`hear` takes subject/verb/object, `foldHyperlexicon` returns them
beside the neutral names), the verb gate as an injected kernel gate, and
`makeHyperlexicon(taskLog)`'s injection unchanged — every existing test
(36/36 across four files, including the one that could not load before)
passes untouched. Stored entries carry the NEUTRAL names only; the SVO names
are the face's projection, computed at fold time, never written twice. One
consumer read stored fields by the old names and broke — `derivation.js`'s
`heard` set, which then reported every derived note "never stated"; it reads
either name now. That is exactly the drift the neutral shape exists to end.

**No view from nowhere.** `createNotes({ frame })` records what the reader
stood on as the log's own first entry — DEF · Ground · declared, the cell
`frame.js` already gives a declaration of interpretive ground — so a fold can
always say WHOSE reading this is. `frameOf(log)` returns the declaration or
the gap `no_frame` by name; a frameless ledger is not refused (every caller
that predates this would break, and a refusal that breaks the world is not a
wall) but never gets an invented standing. the-fold's `app.js` declares its
ledger's frame from the reader it actually built — organs, which priors had
LOADED at birth (the POS prior, UniMorph verb forms and the morphology prior
are fetched after boot, so a ledger born early says so), which are
deliberately absent, and the model — threaded `runHolonicTask → runPart →
createHyperlexicon({ frame })`.

**The closure crosses.** `hypergraph.js` had been deferred because its
closure reached the surface through `grounding.js → source.js/web.js`. Moved
TOGETHER — hypergraph, cast, grounding, cite, source, asserted, web, measure,
testimony, primary, capacity-runner, experiencer, quotes — the closure imports
nothing outside `native/organs/`; the-fold keeps one-line shims at the old
paths so no importer moves, and `organs/index.js` exports every moved organ by
explicit name (generated off each organ's own `export` statements; collisions
aliased under the organ's prefix). Eleven test files moved with them; the
frozen-provider paths they carried resolve to the native adapters when the
legacy submodule is absent (`ENGINE=legacy` still pins it where it exists) —
`hypergraph.test.mjs`, which Pass 7 measured at 54/58 legacy and 52/58 native,
runs 58/58 native now. One test did not belong to an organ and went back:
web.test.mjs's P13 seam scan reads the-fold's own page files, a fact about
the surface, now `the-fold/web-seam.test.mjs`. `native/package.json` gained
`test:organs` (`organs/*.test.mjs`) beside `test`; the CI gate keeps its
contract (conformance + tests) because several organ tests read material
that exists only locally — the-fold as a sibling, or the gitignored legacy
corpus — and a gate that ran them was red on its first run for reasons that
are not this repo's. The committed `POSPrior@1` also lives in
`eval/the-fold/fixtures/pos-prior-eng.json` now, so the ledger's own tests
and driver need no sibling checkout. Verified: the-fold's real page loaded
in headless Chromium against `serve.mjs` through the shims — boot completed
(`#not-served` removed), zero uncaught exceptions, zero console errors.
Suites, failure names diffed against a clean-worktree baseline: eoreader7
592/23 → 792/22 (the one fixed: hyperlexicon.test.mjs), zero new; the-fold
1052/125 → 940/67, zero new (the 168 moved cases account for every line that
left).

**The music lesson, applied and measured.** `notes.js` reads the ledger as
the stream it is (`stream(log, { by: id | end1 | end2 | label })`, each
element carrying its seq), measures each hearing's surprise under the ground
heard before it (`figures`), and cuts it with `surprise-segments.js` unchanged
(`segment`, null inside the cut, boundaries carried back to entries). Measured
on three real pages read in document order, against the page's own section
headings held aside: **at chance, every grain, every page** — best arm 12%
found vs an 11% null median, 58/200 random placements at or above. A page's
section is a convention of its script, as the sentence was; the ledger's
figures are not there. Two things the run gave anyway: the most surprising
hearings on all three pages are the last ones and they are all furniture
(`category link —is→ on Wikidata`, `Статьи —со→ спам-ссылками`) — surprise
locates the DIET BOUNDARY of a reading untold, a lead for the admission door;
and a real kernel bug — `segment`'s flat cut ran without the stream's own
alphabet as its floor while the recursion's level 0 used it, 1–17 boundaries
against 87–224 on one stream, fixed to the music driver's one rule.
`eval/the-fold/results/notes-segments-RESULTS.md`.

**Enforced:** `tests/notes.test.js` (7: hearing/union/no-op with cells, the
frame entry and its gap, the door with an injected gate and its givers,
attest/concede, injected identity, stream/figures/segment on a planted
rhythm with a shuffle control, the medium pin);
`organs/hyperlexicon*.test.mjs` 36/36 unchanged; the eleven moved files
168/168.

## S43 — The ledger's frame follows the reader and every witness names its recipe; a "diet boundary" by surprise is refuted as a door and kept as a diagnostic

**Generality:** universal (frame redeclaration, the recipe on witnesses);
specimen-scoped for the two measurements (three Wikipedia pages and one
Gutenberg book; the continuation number is on three pages).

**User direction (2026-09-02):** do the first two of "diet-boundary door,
frame as instrument, one cross-source measurement" together, controls built
to fail.

**The frame follows the reader.** `kernel/notes.js::redeclareFrame` —
SUPERSEDE on the frame task, the past kept, an identical redeclaration
appending nothing, a frameless ledger given a frame late getting a birth
frame rather than a revision; `frames()` lists every standing, `frameOf()`
the one in force with its revision count. the-fold's `holon.js` redeclares
on every grounded turn from the reader as it stands, so a prior that loaded
after the ledger's birth is no longer frozen out — P80's disclosed edge,
closed.

**Every witness names its recipe.** the-fold mints a recipe id per distinct
frame (`recipeId`, cached by frame) and `holon.js` lands every mechanical
witness as `<ref>~<recipe>`. `corroboration.js::independentReadings` counts
(source, recipe) pairs, so two pages read by one reader are two sources and
ONE instrument — the shared-instrument failure the music work measured, now
counted in the live app rather than only in drivers. One raw witness
comparison that would have re-asked a source already carrying `~recipe`
(`corroborateLedger`'s skip) now compares through `distinctSources`.

**The diet door, built, measured, refuted.** `dietBoundaries` (a source's
tail run above the null's cut against the shuffle's own tail runs) and
`concedeDiet` were built first against planted structure, where they are
exact, then measured on real material: the three Wikipedia wrappers and
Gutenberg's licence tail form NO run (their ends recur), and the pages cut
back to prose DO fire, on closing sections that are lists. The statistic
measures a tail of ends that never recur — a list — not furniture. The
shuffle controls are silent 8 of 8, so the statistic is sound and the claim
was wrong. `concedeDiet` is unlicensed on real material and wired nowhere;
the refutation sits in the kernel's own header (P60's REFUSED discipline:
named so it is not rebuilt). The ranking that had suggested it ("the most
surprising hearings are the furniture") was a floor artifact — `figures()`
grew its alphabet as it read — corrected to one floor, pinned.

**The first cross-source number.** A prior sedimented from one page's
hearings predicts another page's better than its own shuffle ONLY on the
label stream between the two English pages: 0.2–0.3 bits per hearing,
20/20 shuffles beaten at orders 1, 2 and 3. Nothing transfers on the ends;
English → Russian a small consistent gain through shared labels; Russian →
English nothing. `eval/the-fold/results/diet-boundary-RESULTS.md`.

**Enforced:** `tests/notes.test.js` 10 (redeclaration, the figures floor,
the door against planted structure with shuffle and body-only controls);
`organs/corroboration.test.mjs` unchanged; the-fold suite 940/67 with zero
new failures by name; the real page loaded in headless Chromium clean.

## S44 — Subject walls: five received closed classes end the extractor's subject debris, measured against a random-wall control

**Generality:** universal (English text; the walls are received classes
with their giver, and the control is built to fail).

**User direction (2026-09-02):** floor 5 first, "and if there was
something on floor two, work on the steady foundation as needed." Floor 5
is starved by ends that are debris: a note reading "night I" or "the
window Lucy" can never be corroborated by anything. P74 had named
subject-span debris as the lever nobody pulled.

**What it is.** `relations.js::expandSubjectNP` (the DR4 walk) consults five
walls, each a closed class the register already held or now holds with its
giver: `CLAUSE_OPENERS` and `NEGATION_WORDS` as a trailing trim (the token
before a verb is often the clause's relativizer or the polarity word, not
the subject's last word); `SUBJECT_PRONOUNS` (new) — a pronoun is a whole
subject and a wall to any walk that meets it; a determiner-initial anchor
is already at its own left edge (chains continue across "of" and a
received adposition; a `PREDETERMINERS` (new) token joins the phrase); and
the reader's verb forms (`verbWall`, the POS prior's verb-dominant forms,
threaded from `organs/hypergraph.js`) as a wall through a coordinator — the
verb before the coordinator shares our subject — and as a trailing trim.
A match with no subject left is refused and counted (`refusedSubjects`),
never emitted. `subjectWalls: false` reproduces the earlier walk byte for
byte, so the two are measurable against each other.

**Measured** (`eval/the-fold/subject-wall.mjs`, real Dracula narrative and
the Borodino page, three arms): on narrative prose debris subjects fall
96 → 30 of the bound claims while referent-resolved subjects hold 83 → 78;
the random-wall control (every class replaced by as many random words
from the material) cuts harder and destroys referents (83 → 26). The gain
is from which tokens wall, not from walling. Encyclopedic prose barely
moves (debris 66 → 62); its debris is prepositional-phrase subjects and is
not this pass's. The cost: 93 fewer bound claims on Dracula — 44 refused
for want of a subject, the rest claims that had bound through debris.

**Found by diffing, not by tallying.** The first cut's tally looked right
and its rewrite list did not: "Lucy and I" → "I", "the ruins of the abbey"
→ "of the abbey", "every joint in my body" → "my body". Each was a rule
missing a received exception (a coordinated pronoun; a verb form after a
determiner is a noun; an NP chain across an adposition), fixed and pinned.
`results/subject-wall-RESULTS.md` carries the full table and the named
residue (a common noun glued to a name's left needs the prior's nouns).

**Enforced:** `tests/relations.test.js` 40 → 48, every new case a real
Dracula sentence, each rule's old debris pinned beside its new reading.
Full native suite 468/10 + 335/12, zero new failures by name.

## S45 — Floor 5 run live on CPU: the source count was wrong, and cross-source corroboration is structurally rare on a novel

**Generality:** universal (the source-count fix); specimen-scoped (the two
measurements — one novel, one page pair, one small model).

**User direction (2026-09-02):** "you can run ollama on cpu." Ollama 0.33.2
and gemma2:2b installed in the container (4 cores, no GPU; 2.6–3.5s per
witness read). The witness tier ran live for the first time over a ledger
read from a real book.

**The bug the first run exposed.** `corroboration.js::distinctSources`
compared witness strings with their passage address still on, so a
mechanical witness `part-1.txt#178-275` and a testimony witness
`testimony:part-1.txt` were two sources: the first walk attested eight
notes, every one from the part it had been heard in, and reported the ≥2
gate 2 → 10. Every ≥2-source number this project computed off
chunk-addressed witnesses was inflated the same way — the ~2% book figure
was chunk-distinct. `sourceOfWitness` is the one reduction now (ref
without address or recipe); `independentReadings` keys (source, recipe)
the same way; pinned; `docs/reading-recall-finding.md` carries the
correction.

**The corrected measurement.** Novel (240KB of *Dracula*, six chapter
parts, 474 notes, 60 asks, select protocol): 1 cross-source attestation,
53 `no-testimony`, guard 0 lies — 0.017 clean votes per ask. Two
encyclopedia pages (82 notes with the subject walls on, 30 asks): 1
attestation per arm, generate and select alike, guard 0 lies — 0.033.
This corrects `corroboration-select-vs-generate-RESULTS.md`'s 7 vs 6,
which counted with the old source function over an unwalled ledger.

**What it decides.** NEXT-PASSES gated the memory floor on clean votes
per ask and said that if Tier 1 could not raise it, the floor's DESIGN
is what gets re-examined. It cannot be raised on a novel: a novel does
not restate its propositions across chapters, it re-mentions its
referents, and the witness says so honestly 53 times in 60. The design
question is why a single-source note with a verified address, real ends
and a real label must have a second source before it may reach the
model — a gate chosen when the door admitted junk (P73), guarding now
against a diet that no longer arrives (P74, S44). Corroboration should be
DISCLOSED on a note, not used to withhold it. Named, not built.

**Enforced:** `organs/corroboration.test.mjs` 45 → 46 (the self-attestation
that counted as two sources, and the (source, recipe) key); the-fold's
suite and this repo's, zero new failures by name.

## S46 — Ranke: a claim is chased to the document its account cites; the account and the document are two KINDS of witness, and a novel is never chased

**Generality:** universal (the witness-kind axis in the kernel; the gate;
the landing rule); specimen-scoped (two pages, one witness model, the
faces those pages happened to cite).

**User direction (2026-09-02/03), in order:** "when reading things like
wikipedia, and in general, we must chase primary sources"; the activity is
personified as an agent named after Leopold von Ranke; "if it is citing
something via a hyperlink, it should go read that, not just Wikipedia
shaped sourcing. if it is just quoting someone, it should go try to find
that quote if the source isn't given"; "but that needs a gate so it doesn't
explode in a novel"; "perhaps we toggle this one as this could be very
burdensome"; and the frame for all of it: "we are not making claims about
what is objectively true, just making the richest possible hypergraph of
what claims are about the truth."

**Kernel (`kernel/notes.js`).** A witness's KIND is now read off its
declared prefix (`kindOfWitness`: `testimony:`, `primary:`, `planted:`; a
bare address is a `sighting`) and `standingOf(note)` counts kinds apart
beside sources and instruments (`foldWithStanding` projects it onto every
note). The kernel names no kind's meaning — a report of a performance and
the performance's own decoder are different kinds in every medium, and
which kinds exist is the caller's vocabulary (`notes.test.js` pins the
music-shaped case: `review.txt` sighting + `primary:performance.wav~goertzel`
→ 2 sources, 2 instruments, kinds `{sighting:1, primary:1}`).
`sourceOfWitness`/`recipeOfWitness` are the kernel's, and
`corroboration.js` now imports them instead of keeping its own copy — the
copy stripped `testimony:` alone, so a `primary:` witness would have read
as a source named "primary" (the P22/P24/P25 drift class, caught before
it shipped by the organ's first test).

**Organ (`organs/ranke.js`).** Pure; fetch and search injected. `leadsOf(page)`
is the GATE and the leads: outbound hyperlinks (any host that is not the
page's own or the encyclopedia family's navigation — `extractCitations`,
which is not Wikipedia-shaped past that family skip) and unsourced
quotations (prose only — a quotation crossing a line break or carrying a
URL, footnote arrow or page apparatus is a reference-list fragment, found
live). A page with zero outbound links is `citing: false`, typed
`no_citations`, and yields NO leads of either kind: Dracula's 509 quotation
marks in a 300KB slice produced zero searches and zero fetches. `chase`
ranks link leads by claim overlap (`rankPrimary`; a link sharing no word
with the claim is not a lead for it — 178 of 318 consults on the first run
were blind fetches before this rule), searches relevant quotes, fetches
sequentially under the declared budget, snips each face for the note's
words, and — THE LANDING RULE — lands `primary:<host>#a-b~ranke-v1` only
on the witness tier's own "states" (`witnessNote`, the armed select
protocol); without witness organs every containment hit is reported
`unwitnessed` and nothing lands. `FULL_TEXT_FACES` is one declared address
rule (archive.org `details/<id>` → `stream/<id>/<id>_djvu.txt`), never a
layout scrape.

**Why the landing rule is a rule and not a preference.** The control
(II.23): the same chase over a ledger whose end2s are rotated, served from
the same kept faces. Containment attested 1 real note and 6 redealt ones;
with the witness reading every lead, 0 real and 1 redealt (a debris note
the 2B model signed against a whole book's OCR). Containment finds where
the words co-occur; the witness reads whether the sentence states the
claim; the control is reported beside every number. Full account:
`eval/the-fold/results/ranke-walk-RESULTS.md`.

**What the two pages actually cite.** Of 30 fetches: 18 faces read, 8
answered 403, 4 were shells; the readable ones are catalogue records,
Google Books stubs, one full OCR book (through the address rule), one
transcription, one essay. Zero notes landed on this material — the honest
shape of "chase primary sources" on an encyclopedia battle article: the
primaries are books behind catalogues, and reading them is a different
budget than following a link. Named next: more address rules with givers;
the witness at book scale; a search engine that answers.

**Surface (the-fold, P84).** The ledger block now discloses standing
instead of withholding on it; `/ranke <maxFetches> [maxSearches]` and a
default-off `primary` switch beside `web`; the server route owns the two
crossings and returns leads, the browser's witness reads them.

**Enforced:** `organs/ranke.test.mjs` (6: the real page's leads; the novel
gate on real Dracula bytes; accounts-only standing; link chase — unwitnessed
reports and lands nothing, a witness's no lands nothing, a witness's yes
lands an addressed `primary:` witness whose address reproduces the sentence,
kinds counted apart; quote chase through search; the ledger walk with
declared budgets, cached faces, and the redealt control), `tests/notes.test.js`
(+2: standing kinds, foldWithStanding). Native suites' failure names
identical to HEAD before and after (22 environment names); zero regressions.

**Amended same day — the disclosure measured against a model.**
`eval/the-fold/gate-proof.mjs` + `results/gate-proof-RESULTS.md`: the
ledger block's disclosure (the-fold P84) run headlessly through the real
pipeline on gemma2:2b over this ledger and a new book. The book: old gate
0/8 shown, 0/8 hits; disclosed 6/8 shown, 4/8 hits. The pages, once both
tiers were ranked by the question: 7/8 shown, 6/8 hits (old gate 3/8,
2/8). Two leaks found and closed in the surface's block (an unranked
corroborated tier; the interrogative "what" counted as vocabulary), and a
mechanical no-model mode (`MECHANICAL=1`) that measures reachability in
seconds. Hits measure that the model said a heard claim back with its
standing, never that the claim is true.

**Amended 2026-09-03 — working backwards from an article whose sources
are readable: what the chase would need.** User direction: "try it on an
article that has useable sources and work backwards to what it would need
to do to get the spans that create the equivalent hypergraph
propositions." `eval/the-fold/ranke-backwards.mjs` over the real *Apollo
11* article (524 notes after the bibliography region is dropped): for
every note, the cited faces, and the gap to the nearest span in one,
classified most-demanding-first (`same-sentence` / `morphology` / `window`
/ `partial` with the missing side named / `absent`), with the witness on
containment's leads and the rotated-end2 control on the same faces. Four
runs, each rule earned by a specimen, all in `ranke.js`:
**footnote binding** — a marker in the prose is an in-page link to one
numbered note whose outbound links are the lead for THAT sentence,
consulted before any overlap-ranked link (run 1's overlap ranking chased
the wrong document: the control out-hit the real ledger, 7 to 6);
`markersOfSpan` — a marker at a span's start belongs to the previous
sentence, the sentence's own marker trails it; **document identity** —
`documentMatches` requires a face to carry the citation's own title words,
and on a miss the archive copy is read (31 of 62 footnote-bound addresses
on a fifty-year-old article now serve a portal page); archive wrappers
paired with their targets. **A route failure is not a document gap:**
run 3 read zero archive copies because every Wayback fetch answered 403
on the sandbox's direct egress path (200 through its proxy; Node's fetch
honours `HTTPS_PROXY` only under `NODE_USE_ENV_PROXY=1`), and the kept
index had cached those as gaps — purged, disclosed, rerun. **Run 4:** 83
wrong-document consults, 83 read through the archive; 404 of 524 notes
with a readable cited face; containment reaches 28 (`same-sentence` 18,
control 16; `window` 9, control 5 — parity at every grain, twice
measured: containment is a lead-finder); the witness signed 3 of 65
leads, one of them a genuine paraphrase crossed through the note's own
footnote (Safire's "In Event of Moon Disaster" memo — "provided… a short
speech" for "had prepared… an announcement"); `partial` with the OBJECT
missing is the dominant class at 162 of 226 — the cited document says it
in other words. The named next rung is not a matcher: the witness pointed
at every footnote-bound `partial`, its window chosen by the face's own
referent activation rather than word containment, under a declared
budget, with the control through the identical slicer. Full account:
`eval/the-fold/results/ranke-backwards-RESULTS.md`.

## S47 — The candidate set is the paraphrase seam: `witnessNote` takes an injected list, and the arm below it does not move

**Generality:** universal.

`statingCandidates`' gate is `h1 > 0 && h2 > 0` — BOTH ends must fire
LITERALLY in a sentence for it to be offered to the select protocol. That
gate is right as the default: it is what makes an unsupervised candidate set
trustworthy, and it is why a caller with no better idea gets a conservative
one. It is also, exactly, the wall paraphrase hits — an end the source
states in other words never fires, `cands` comes back empty, and the armed
select protocol (the one whose yes is checked by a sibling swap) never runs
at all. `witnessNote` then falls through to a generate call on a containment
slice, which is the weaker path.

`witnessNote` now takes an optional `candidates` list. A caller holding its
own declared way to choose where a stating sentence would live supplies it.
Everything below is unchanged, and that is the design: the competing-filler
arm, the indiscriminate-pick check, the carried address, the decider-company
wall and the typed refusals all still stand. **A slicer may change WHERE the
model is asked to look; it may never change whether its yes counts.**

Pinned by three cases in `corroboration.test.mjs`, one of them the control
built to fail: an indiscriminate picker over an injected candidate set is
still convicted `indiscriminate`, so the seam cannot be used to buy a vote.
The premise is pinned too rather than assumed — the test asserts
`statingCandidates` returns zero on the paraphrase fixture, which is what an
object-missing partial IS. Omitted, byte-identical to before.

## S48 — `hear()` was asserting two claims from one string match; the second is now a recorded, refusable bridge

**Generality:** universal.

Two readings each establish their OWN universe of referents. `hear()`
unioning two sources' witnesses on an exact triple match was asserting
both that the two propositions are the same AND that the two documents'
referents are the same — the second claim, a bridge between the two
universes, was never made explicit, never recorded, and could not be
conceded. Usually right; silently catastrophic when it is not (two
different Smiths, one note, two witnesses, no way to find out).

**The fix, additive.** Proposition identity still decides the note's id.
A cross-source hearing now also records a `join` on the entry — source,
which prior sources it crossed from, what was assumed, its basis, and a
standing of `"assumed"` — so a corroborated note can be read back as
"corroborated across N bridges nobody checked" rather than a bare count.
An optional `bridge(crossing)` organ may refuse a crossing; refusal never
drops evidence, it splits the sighting onto its own source-scoped note
(`<id>@<source>`) with a typed reason, so a bridge established later still
has two real notes to join. No organ: every crossing allowed, byte-
identical to before. `standingOf` gained `crossings`/`assumedBridges`.

**The gate measurement (`eval/the-fold/bridge-audit-RESULTS.md`).** On
three real Wikipedia pages, 22 of 22 corroborated notes rest on an
assumed bridge — common, not rare, so building bridges as first-class
objects is warranted. A zero-model probe (do the two sources' own
`discoverReferents` universes independently name the joined ends the same
way) was built, and its first cut manufactured false disagreements by
using stricter string identity than `namesCorefer` already licenses
elsewhere in this codebase — fixed at the source. Even corrected, a
seeded, both-ends-redealt control (II.23) matches the real suspect rate
exactly (4.3% both), so **the probe does not separate real bridges from
random ones at this sample size** — a power problem, honestly reported as
undecided rather than as a clearance. 57% of real crossings are
unexaminable by this method at all, because a joined end is often a
definite description `discoverReferents` never captures as a named
referent — the probe inherits the extractor's own reach.

**Files.** `kernel/notes.js` (`hear`'s crossing check, `makeNotes`'
`bridge`/`identityGiver` options, `standingOf`, `fold`'s carried
`joins`/`unbridged`). `tests/notes.test.js` (12 → 17, incl. the control
built to fail: two documents independently stating "Smith chaired the
commission" about two different Smiths — refused with a scripted bridge
organ, silently corroborated without one). `eval/the-fold/bridge-audit.mjs`
+ its results doc. Full native suite: 780/755/16, identical failure names
to HEAD, zero regressions.

**Not built:** bridges as objects with their own witness/provenance/
concession lifecycle (Pass 12 step 2, the-fold's `NEXT-PASSES.md`) — this
entry establishes only that bridges are common and that the naive probe
cannot yet validate them, not that they are safe.

## S49 — Pass 12 step 2: the referent bridge, as a recorded object

**Generality:** universal.

S48 split `hear()`'s conflated match into proposition identity (unchanged)
and referent identity (a `join`, recorded on the note but living nowhere
of its own — no independent witness, no way for two SEPARATE content
notes that happen to rest on the same correspondence to corroborate each
other, no concession). `bridge-audit-RESULTS.md` measured bridges as
common (22/22) and warranted step 2 on that finding alone, explicitly
without claiming any bridge validated.

**The design, derived rather than invented.** Pass 12's own load-bearing
clause: "it is the same set of operations, just at another level." A
bridge is an ARRANGEMENT — one reading's face for a referent, a fixed
declared label (`same-referent-as`), the other reading's face for the
same referent — and `notes.js`'s `hear`/`concede` already compute
SIG/INS/SYN/REC correctly on any arrangement. So `organs/bridges.js` adds
no new ledger mechanism: it derives bridge arrangements from a note's own
`joins` and hears them onto a SEPARATE ledger via the SAME injected
`notes` instance a caller already has. Two content notes that
independently cross the same two sources via the same referent pair now
corroborate ONE bridge object — the capability step 1's per-note `join`
could not represent, because it kept the assumption but never gave it an
identity of its own. A separate ledger, not the content one, because a
bridge is a claim about referent correspondence, never something the
material itself stated — folding it onto content notes would let `fold()`
surface a correspondence no source ever asserted.

**One real gap closed to make this possible.** A `join` recorded only the
ESTABLISHED side's face (`assumed: [prior.end1, prior.end2]`); the
crossing's own `incoming` object already carried the other side's face and
spans, and `hear()` discarded them the moment `bridge()` returned. Widened,
additively (`incomingEnds`, `incomingSpans` on the `join`), so a bridge
has two real faces to show, not one assumed and one invented — pinned in
`tests/notes.test.js` (a real face carried through; a missing one falls
back to the raw end text, never blank).

**Measured on the SAME real material step 1 used**
(`eval/the-fold/bridge-object-measurement.mjs`, no fixtures faked — the
three Wikipedia pages `bridge-audit.mjs` already reads, same production
pipeline unchanged). 46 bridge arrangements derived from 22 joined content
notes, collapsing to 43 distinct bridge objects — **3 corroborated by two
independently-derived content notes**: Austria, Napoleon, and "the Allies"
each correctly recognised as the same referent crossing the Austerlitz and
Third-Coalition pages. This is the capability step 1 could not show: a
finding step 2 exists to make visible, not asserted from the design alone.
Step 1's own probe, re-pointed at the 43 distinct objects instead of raw
crossings, reads `{"suspect":1,"clean":27,"unexaminable":15}` — consistent
with step 1's own numbers; its disclosed limits (a probe that cannot beat
its own redealt control at this sample size; 57% of crossings unexaminable
because a joined end is often a definite description) are UNCHANGED by
this pass and are not re-litigated here.

**Files.** `kernel/notes.js` (the `incomingEnds`/`incomingSpans` widening
on `join`, additive; `tests/notes.test.js` 17 → 19). `organs/bridges.js`
(new — `deriveBridgeArrangements`, `syncBridges`, `bridgeStandingFor`,
`BRIDGE_LABEL`, `BRIDGE_REFUSALS`) + `organs/bridges.test.mjs` (new, 8
cases against the REAL kernel: the flagship corroboration capability; a
CONTROL BUILT TO FAIL — two different face pairs crossing the same two
sources must stay two bridges, never merged; idempotent re-sync; a
concede reaching one end's bridge and not the other's; a crossing REFUSED
upstream by a real `bridge()` organ produces no join and nothing for this
module to see). `eval/the-fold/bridge-object-measurement.mjs` (new, the
real-material run above). Full native suite: 376/355/12 (organs),
488/477/10 (conformance+tests) — identical failure names to HEAD both
suites, zero regressions.

**Not built, named rather than implied done.** No retroactive cascade: a
bridge conceded via `notes.concede` on the bridge ledger does NOT touch
the content ledger's own notes or standings — `bridgeStandingFor` is a
read-only lookup a caller consults, the same posture `dietBoundaries`/
`concedeDiet` already keep apart (a diagnostic and an act, kept separate
until the act itself is measured). No wiring into the-fold's app.js or the
ledger-block disclosure — the-fold's own NEXT-PASSES.md names this as
Pass 12's remaining steps 3 (read a cited/bridged document with the same
full extraction apparatus, replacing the regex-window slicer) and 4
(witnessed paraphrase landing as a bridge), both still real, unattempted
work.
## S50 — Reproduction, generalized out of `quotes.js`; and how many VOICES a ledger is counting

**Generality:** universal.

`organs/quotes.js` already followed a quotation to the bytes. Its matching
core — normalize both sides through ONE fold, search, map the hit back to
real addresses, report whether the RAW units matched or only the folded ones
— is not about quotations at all, and quotation marks are one text-specific,
entirely optional SIGNAL that a reproduction is being CLAIMED. Marks give
two of three cases:

```
claimed + found    -> a real quotation           (quotes.js today)
claimed + absent    -> a fabricated quotation     (quotes.js today)
NOT claimed + found -> material repeated with nothing saying so
```

The third had no representation anywhere in this instrument, and it is the
one that decides how many INDEPENDENT voices a ledger counts.

**`kernel/reproduction.js` (new), medium-blind.** `locate` and `sharedRuns`,
with the caller's own `fold` (a normalized sequence plus a map back to the
original's coordinates) and its own `sameRaw`. Nothing in its body names a
medium; `tests/reproduction.test.js` reads the source and fails if one
appears, and — more to the point — RUNS the same organ over a non-text event
stream. That test earned its keep immediately: it caught `String(...).slice`
in the kernel, a text operation on material that was an array.

**`organs/quotes.js` now delegates to it.** `locateSegment` is the kernel
organ with this file's fold injected; what stays here is what is genuinely
about quotations (the edge-punctuation strip — a quotation's closing period
is routinely the quoting sentence's). One implementation of "is this
reproduced here", not two. 13/13 unchanged.

**The terrain, because it decided the shape.** A reproduction is
STRUCTURE·FIGURE — a Link between two bodies, `A repeats B`, landed as an
ordinary arrangement, corroboratable and concedable. The rule that a
repeated witness is not a second voice is INTERPRETATION·FIGURE — a lens:
declared, giver named, defeasible, never baked into arithmetic
(`repetitionLens`). What the counts become is INTERPRETATION·GROUND, which
is why `organs/voices.js` reports beside `standingOf` and never overwrites
it. A lens whose repeated application demonstrably moved that ground would
be a PARADIGM; nothing here measures that.

**No statistic anywhere.** A shape-based furniture detector was measured
first and refused: on real `splitSentences` units a navbox scored z = 5.29
against real prose at z = 2.55 over 200 shuffle draws — a real signal that
does not separate safely, the same class already refused once as "sound
statistic, wrong claim". Reproduction needs no threshold and no null because
it is an observation about units, with both addresses, re-read.

**PER CLAIM, never per source pair** — the sharpest rule. Two pages sharing
a navbox are one voice for the navbox's content and remain two independent
voices for everything else. A witness is demoted only when THAT NOTE'S OWN
span sits inside the shared run; the control built to fail pins exactly this.

**Measured on three real Wikipedia pages** (`eval/the-fold/voices-measurement.mjs`):
277 reproduced runs / 38,718 units found in 2.2s, the largest a 7,806-unit
transcluded template. Of the 10 notes the ledger calls corroborated,
**0 stand on two independent voices** — all 10 are one voice repeated. Two
bugs were found by running it rather than reasoning about it: both witnesses
of a pair were demoted, leaving ZERO voices (repetitions are reported in
both directions — fixed to connected components, one voice per group, never
zero); and repetition was not followed TRANSITIVELY, so a note witnessed by
two pages that met only through a third, non-witnessing body survived as
"two voices". Both pinned as regressions.

**The cross-domain leg (P71), and it separates two claims that would
otherwise be one.** Replayed unmodified on two net-new pages in a different
century, subject and article family (Alan Turing / Bletchley Park): the
FINDER transfers — 135 runs / 6,702 units, including a shared bibliography
row and Churchill's "Action This Day" memo carried on both pages, neither
marking the other — while the CORRECTION collapses nothing, because that
pair corroborates nothing (0 notes reach two sources at all). The
correction is bounded by the thing it corrects, and this repo already
measures that at ~2% (P83). A second arm reproducing arm 1's 10-of-10
would have meant the two materials were less independent than claimed.
That arm also shows what shared units do NOT distinguish: transclusion, a
shared bibliography row, and two pages quoting one origin wear one shape,
and the units do not carry the answer — which is exactly what the per-claim
gate above exists for, since two pages quoting one memo are one voice for
the memo and stay two for their own commentary on it. Both arms:
`eval/the-fold/results/voices-RESULTS.md`.

**What it never says**: that a repeater is dishonest, that an origin is
right, that either claim is true, or which body came first. Every collapse
carries `contextChecked: false` — shared units are shared units, and whether
a repeater used its origin faithfully needs the origin read in its own
context, which nothing here does.

**`contextChecked` was the named next rung, and it is REFUSED on
measurement** — kept so it is not retried. The design: for a found run, read
what each body CLAIMS around it (marked as a quotation on each side? same
origin named?) — the one cell `reproduction.js`'s own table tabulates and
never checks. Four findings against it. (1) The interesting cell is empty:
**3 of 412 runs** are claimed on one side only, and all three are *titles*,
where quoting is typographic convention rather than attribution. (2) The
mutual-quotation cell is **2/14 precise** measured through the repo's own
`quotes.js::extractQuotedSpans` — arm 2's 2 are one real case (Churchill's
memo), arm 1's 12 are all reference-list scaffolding, landing there because a
maximal run begins at the closing quote of an adjacent citation TITLE. (3)
Separating those needs per-site formatting rules — the trap `succession.js`
is condemned by name for. (4) The fallback of comparing the two sides'
extracted arrangements instead is already on record as flat
(`organs/corroboration.js`'s header: every mechanical identity tried measured
flat across two real pages), and `makeRelationReader` refuses a run-sized
window as too small to measure a vocabulary from. Two earlier, cruder probes
of the same idea each produced a plausible number that dissolved on
inspecting the sample rather than the count. The shape is not wrong — real
mutual quotation of one origin is exactly `ranke.js`'s input — these bodies
just do not supply the specimens.

**What IS measured thick, from the same runs**: cross-body reproduction
between two articles of one encyclopedia is a FURNITURE observation — page
chrome, maintenance categories, navbox rows, reference scaffolding,
bibliography publisher strings, 366 of 412 runs — resting on shared units
with both addresses, re-read, where this project's shape-based furniture
detector was refused for not separating safely. A LEAD, never a verdict: it
catches real shared prose too, and recurrence breadth was tested as a
narrowing and refused (the 2-of-3 and 3-of-3 buckets each hold both furniture
and content). It bears on the blanking gap directly — `blankLabelRows` via
`sentenceWithBlanking` is structurally defeated here, since `splitSentences`
pre-atomizes navbox bullets so a per-sentence pass can never meet its own
`minRun` of 4. Reported, not fixed.

**Disclosed residue**, found by reading the rule rather than by a failure:
grouping is by repetition COMPONENT, which is coarser than "carrying the
same run" — two witnesses carried by DIFFERENT templates that happen to sit
in one component can be collapsed together. The tighter rule groups by the
covering run's own material (overlap, not equality: the same template
measured 7,794 units on one page and 7,806 on another). Not built.

**Files.** `kernel/reproduction.js` + `tests/reproduction.test.js` (11).
`organs/voices.js` + `organs/voices.test.mjs` (7). `organs/quotes.js`
(delegation only). `eval/the-fold/voices-measurement.mjs` +
`results/voices-RESULTS.md` + five fixtures (three for arm 1, two for arm 2,
none shared — that is what makes it a replay).
Suites: organs 383/362/12, conformance+tests 499/488/10 — identical failure
counts to baseline, zero regressions.
## S51 — Furniture is decided with the page in view; the evidence for a run lives across chunks

**Generality:** universal.

`blankLabelRows` calls something furniture only when it sees `minRun`
CONSECUTIVE cells. Its one consumer (`hypergraph.js::readSentenceText`)
applied it to one sentence of one already-chunked passage, and the median
chunk of a real page is 31–72 characters — so a navbox arrives already
atomised into one-bullet passages and the run of four can never form.
Measured across six real committed fixtures: **2,313 characters blanked as
shipped against 28,607 with the page in view — 12.4× overall**, and 7.5× to
53.2× per page, the Russian one moving furthest because its furniture is
least visible to an English POS gate. (The defect was first found on three
other pages at 57× / 13× / 63×; those fixtures live on another PR's branch
and are cited as provenance, not as reproducible here.) The sentence boundary
is not the constraint: per-sentence and
per-passage blanking agree at 1.000 / 1.000 / 0.852. The PASSAGE boundary is.
An earlier reading of this same defect blamed the sentence scoping and was
wrong; measuring the two apart is what showed so.

**The general rule this is an instance of: an organ that decides on a RUN
cannot be scoped below the run.** Cross-line, cross-chunk or cross-document
evidence has to be gathered where that evidence still exists, and handed down
— never re-derived inside a unit too small to hold it.

**What shipped.** `chunkSource` gains an optional injected `blankFurniture`
organ (the precedent is its own `atmosphere` organ; absent is byte-identical
to before). It blanks the whole page ONCE and attaches each chunk's own span
as `chunk.blanked`. `chunk.text` is never touched, so every address still
reads back — this only ever ADDS a parallel copy. `readSentenceText` prefers
it, read at the sentence's own offset, applying pronoun substitution AFTER
(the reverse of the fallback's order, because the copy is aligned to the
original and pronoun substitution is length-changing). Nothing re-splits
anything, so the drift `blank-furniture-sentence-drift` names is prevented
exactly as before: the segmentation is computed once off untouched bytes and
a rewrite is only ever applied within one already-fixed sentence's span.

**THE READBACK GATE, and it was found by running rather than reasoning.**
`chunk.text` is `body.trim()` while `start`/`end` span the UNTRIMMED body, so
a chunk's text is not always `text.slice(start, end)`: 6 of 747 Frankenstein
chunks differ by a leading space, and `chunkRows` reconstructs delimited rows
rather than slicing them. Blindly slicing the blanked page would shift the
blanks by one character in the first case and read somewhere else entirely in
the second. So a chunk receives a copy only when that copy is verifiably ITS
OWN text with nothing but spaces substituted — same length, every position
either identical or blanked. P5.2's discipline applied to this mechanism
itself: a parallel copy that cannot be shown to be the same text is not one.
On six real pages the gate attached a copy to 990 of 2,920 chunks — the rest
carried no furniture, and an identical copy is not retained. The two scopes
are ADDITIVE and the reader's own organ is authoritative: the page copy is
consulted only by a reader that is itself blanking, and that reader's own
per-sentence pass still runs over the result.

**THE BUG THIS SHIPPED WITH, found by adversarial review, fixed, and pinned.**
`splitSentences` normalises newlines, which is LENGTH-CHANGING, so a
sentence's offset addresses a NORMALISED copy while `chunk.blanked` is
aligned to the RAW text. On CRLF material they diverge by one character per
preceding CRLF pair, and the first guard was a LENGTH check — which a shifted
window passes exactly. Reproduced on a CRLF document with NO furniture in it:
three of four sentences corrupted, text beginning mid-word, and the edge
extracted from it still carrying the clean address of the sentence it was
meant to be — garbage with a good address, the worst failure shape here. It
was invisible because every fixture in this repo is LF-only and the one
book-reading control opened by stripping CRLF, normalising the failing input
away before testing it. Fixed by converting through the material's own
`normaliseNewlines.toRaw` when the caller injects it, and by verifying every
candidate PER CHARACTER — usable only where each position is the sentence's
own character or a space; otherwise the reader falls back, feature off and
never wrong. **The generalisation: a guard that checks length is not a guard
on content, and a control handed pre-normalised material is not a control.**

**Result.** Furniture-derived notes **98 → 1** across six pages (3.96% →
0.04%), measured exactly through each note's own span against the blanked
chunk it addresses — the blanker's own verdict read at the note's address, no
hand list. Gone from the ledger: `"Short description —is→ different from
Wikidata"`, `"Commons category link —is→ on Wikidata"`, `"Russian —adapted→
into films / operas / plays"`.

**The cost, disclosed and not summed.** 118 bindings stop being `bound`: 47
not extracted, 40 `unbound`, 19 `beyond-reach`, 12 `unheard`. 75 of the 118
were furniture-derived or mis-parsed. Of the 43 real ones, the one that was
root-caused reframes the category — `"A divisional system" —was→ "introduced
in 1806"` is still extracted identically and moves to `beyond-reach` because
its subject had been resolving as a RECURRING FORM whose recurrence was
partly navbox rows; removing them dropped it below the floor. That is a
correction resting on withholding, not a conviction. Several other losses are
paired with strictly better gains (`"The" —capsule→ "communicator …"` becomes
`"The capsule communicator" —was→ "an astronaut …"`).

**Controls (II.23).** A page with no furniture must not move: `ddg-results`
is unchanged on every axis. A real book must not lose real prose: Gutenberg
Frankenstein loses **0.054%** of read text, dominated by the title block and
table of contents, with a real tail — the epistolary sign-offs (`"Your
affectionate brother, / R. Walton"`) and prose running into an indented
Wordsworth quotation. A UK statute blanks only its YAML frontmatter, no
statute body.

**The gain and the risk are the same mechanism, stated because it bounds
where this may be pointed.** Navbox rows and screenplay dialogue are both
short lines separated by blank lines; only page scope makes either visible.
Verse, recipe steps and glossaries were already blanked before this change
(identical at every scope) — that false positive is inherited, not
introduced. Dialogue is the one shape newly exposed, and the book control is
where it shows up for real.

**A metric that measured nothing, recorded so it is not retried.** A
mis-parsed-label column (a label settling as a non-verb under
`makeGrammarLens` at the declared `minShare: 0.5`) reads 0→0 everywhere: the
reader's own POS-prior vocabulary gate already ran during extraction, so any
label reaching a note has passed the same prior at the same threshold and the
lens cannot fire afterwards. Redundant by construction, not a bug.

**OPT-IN, AND THAT IS THE DECISION, not a deferral.** By direction
(2026-09-03), `blankFurniture` stays an organ a caller injects rather than a
default: no existing caller's behaviour changes, and a reading that wants
page-scoped furniture asks for it. The argument for shipping it on was real —
P43's rule, that a prior which CLOSES a false binding is a correctness fix —
and it is declined here for a reason this entry can state plainly: the
measured cost is not only the 43 real relation losses but a NEWLY EXPOSED
false-positive shape (screenplay dialogue is structurally identical to a
navbox under this blanker), and an adversarial review found silent corruption
in this very path, hidden by the fact that every fixture here is LF-only. A
default is the wrong place for a mechanism whose blind spot was invisible to
its own test material. What would change it: a caller measuring the arms on
ITS OWN material, which is what `eval/the-fold/furniture-page-context.mjs`
exists to make cheap.

**Scope, stated because the headline reads wider than it is:** this reaches
EXTRACTION only. `indexFor(list)` and the sentences `pronounBindingsFor`
reads are built from the UNBLANKED text, so a name occurring only inside
furniture still enters the referent index and can still be a pronoun's
antecedent — verified. The change removes navbox EDGES, not navbox
REFERENTS; blanking the index's input too is a separate decision with its own
cost and is not taken here.

**Corrected from the first draft:** `chunkRows` does NOT reconstruct its
rows — it slices and strips one trailing newline, so delimited chunks do read
back and do receive a copy. The original "0 of 3 never match" came from
comparing with strict equality against a span carrying that newline. What is
true of CSV is that its rows are short non-terminal lines, so this blanker
calls a data table furniture — and did so before this change too.

**Files.** `organs/source.js` (`withPageBlanking`, `chunkSourceRaw`),
`organs/hypergraph.js` (`passageBlanked`, `readSentenceText`),
`organs/source-page-blanking.test.mjs` (17 cases, real organs, including the
four CRLF regressions above, two end-to-end cases proving the reader CONSUMES
the copy and is inert on furniture-free prose, and one proving a reader
without the organ is unaffected by a chunker that had one), `eval/the-fold/furniture-page-context.mjs` +
`results/furniture-page-context-RESULTS.md`. Full suite: 22 failures,
identical by name to `origin/main` — zero regressions.

## S52 — The reading unit was the wrong suspect: the witness's own ARM is the ceiling

**Generality:** not-applicable — this is a measurement over shipped organs; no
organ changed, no default moved, no number was tuned.

S49's corpus measurement (3/9 on a 9KB excerpt, 0/9 on the whole book) traced
one item by hand, found retrieval correct and the candidate correct, and
diagnosed the reading UNIT. It named a wider unit as the next move. That move
was about to be taken; this says do not take it.

`eval/the-fold/activation-unit-probe.mjs` runs the REAL path — real
`chunkSource`, real `retrieve`, real `witnessSentences` over the real joined
source — with the model replaced twice: an **always-no** recorder (what did the
path SHOW it?) and a **perfect reader** (what could a flawless model land?).
The material is read off the organs' own arguments, never parsed back out of a
prompt.

**8 of 9 entailed items reached the model already holding a single sentence
carrying both ends of the claim in full.** A wider reading unit cannot improve
material that is already adequate.

**A perfect reader lands 4 of 9.** Five are unlandable by any model, and the
walls are measured apart because they need different fixes:

- one **retrieval miss** — the generate fallback got a slice from the wrong
  chapter; the material never arrived;
- three **no competing filler** — the arm harvests its swap from the candidate
  list's own capitalized surfaces, and with ONE candidate those surfaces are
  the claim's own ends, so the pool is empty and an unarmed yes is refused
  however correct;
- one **end2 paraphrased in the claim** — the swap is a literal string replace,
  so a claim saying "the people who had abandoned it" for end2 "inhabitants"
  produces an arm identical to the claim. Found because that item HAS a filler
  and still refuses.

**The ceiling halves with scale: 8/9 excerpt, 4/9 corpus** — the excerpt hands
its whole 9KB as one source (candidates rich in names, arms build), the corpus
retrieves three narrow passages (one candidate, no names but the ends). So the
excerpt/corpus gap is substantially a PROTOCOL ceiling narrowing as retrieval
narrows. And the two drivers use different batteries over different material,
so "3/9 vs 0/9" never compared one item set at two scales; against their own
ceilings the real model scored 3 of 8 reachable and 0 of 4 reachable.

The arm is not wrong — unarmed select measured p(states|fabricated) = 1/8 live
(P32), and refusing an unarmed yes is the correct posture. What is measured is
that its AMMUNITION runs out exactly where retrieval is narrowest, so the
refusal rate carried an undeclared scale artifact.

**Where the activation lever actually is**, named and NOT built: the arm's
sibling pool, drawn from the reader's own referent state (`makeReferentIndex`
and the surfaces it resolved) rather than by capitalization from one sentence —
a pool that does not shrink when retrieval narrows; and a swap through the
referent/lemma an end resolves to rather than a literal replace, which survives
a claim that paraphrases its own end. Neither may relax the arm itself: a
richer pool changes only what the picker is asked to confuse the end WITH.

Four probe bugs are kept in the write-up because each produced a plausible
table with an inverted conclusion — reimplementing the path instead of running
it, reading a prompt to learn what was shown, a wrong field name (`shown`, not
`text`), and a wrong schema (`{answer}`, not `{states}`). The measurement only
became trustworthy once every arm was read against the organ's own source.

**Files.** `eval/the-fold/activation-unit-probe.mjs`,
`results/activation-unit-RESULTS.md`. No production file touched.

## S53 — The witness arm's two walls, widened and measured; the ceiling becomes scale-invariant

**Generality:** universal — the widenings are declared organ parameters with no
material-specific constant, measured on two materials at two scales with a
control built to fail on both. Neither is enabled by default.

S52 measured the witness ceiling at 4 of 9 on a corpus against 8 of 9 on a
wider source and located the whole loss in the arm, refusing `unarmed-select`
for two distinct reasons. Both are now closed, DECLARED and OFF by default, so
every existing caller is byte-identical:

- **`fillerPool`** — a second source of competitors for `competingFiller`,
  searched ONLY when the candidates offer none. A caller passes the surfaces
  its own reader established (`discoverReferents`' `DEF.admit` events), a pool
  that does not shrink when retrieval narrows. Candidates are searched first
  and win: a competitor the picker has just read is the strongest thing to
  confuse an end with; one it has not read is weaker ammunition, not better.
- **`armEitherEnd`** — when the literal swap of end2 is a no-op because the
  claim paraphrases its own end2, swap end1 instead. Which end a claim states
  literally is an accident of wording, not a fact about whether it can be
  tested; an arm on either end asks the picker the same question.

**The ceiling: 4/9 → 8/9 on the corpus, unchanged at 8/9 on the excerpt.** The
widening closes a scale artifact and adds nothing where there was none. The one
item still unlandable in each arm is a retrieval miss whose slice genuinely
does not state the claim — the honest refusal, not a wall. The reader-resolved
pool is 6 surfaces on the corpus's three passages and 23 on the excerpt:
thinnest exactly where it is needed, and still enough.

**The control (II.23), over all sixteen battery items rather than the nine
entailed ones.** FALSE twins landing `states`: 2 of 7 as shipped, 2 of 7
widened, **0 added**. Those two are the measuring oracle's own construction —
it answers on both-ends-in-full, so a false claim whose ends both occur gets a
yes by definition — and the live gemma2:2b run recorded zero lies across the
FALSE set. Reporting shipped and widened side by side is what separates the
instrument's leaks from the protocol's. And the arm still works: the
indiscriminate picker (yes to everything, same index whatever it is asked) is
refused on all sixteen with the widenings on.

**Not established: no model ran.** This measures what a flawless reader could
land, which needs none. The real run scored 0 of 4 reachable, so a ceiling of 8
is 8 chances at a reading the model was failing every time — stated as a
prediction that can be checked and be wrong. Enabling either widening live is a
separate decision on `verbForms`' own terms, and P43's test says which way it
leans: this WIDENS what can be heard rather than closing a false binding.

**Files.** `organs/corroboration.js`, `organs/witness-sentences.js`,
`organs/corroboration.test.mjs` (+3 cases, each wall with a control that the
default is untouched), `eval/the-fold/activation-unit-probe.mjs`,
`results/activation-unit-RESULTS.md`. Full native suite: 24 failures before and
after, identical by name — zero regressions.

## S54 — Pass 12 step 4: a witness reads a bridge, and the reading is bounded by the match that made it

**Generality:** universal.

S49 recorded referent bridges as their own corroboratable objects and named
its own gap in the same breath: a bridge reaches `corroborated` only when a
SECOND independently-derived content note happens to assume the identical
correspondence, so 40 of that run's 43 bridges stood `single-witness` with
nothing in the mechanism able ever to move them. `organs/bridge-witness.js`
is the asking.

**The question is not any other witness's question**, which is why it is not
answered by reusing one. `corroboration.js::witnessNote` (and `ranke.js`
through it) asks *does this source state this PROPOSITION* — a claim against
a body of text. A bridge asks *do these two MENTIONS, each already read in
its own document, name the SAME REFERENT* — a correspondence between two
already-addressed spans, never a search. `testimony.js::buildSelectMessages`
is worded for the first question and would put the wrong question to the
model, so this file writes its own prompt on the SAME schema shape
(`{stated, sentence}`, point-never-write) and reuses `foldSelect` UNCHANGED:
one response-parser, two questions.

**The arm mirrors witnessNote's real+decoy shape rather than folding both
into one multi-candidate call** (P85's own postmortem: every arm in this
codebase runs twice; one call risks position bias contaminating both
readings). The decoy is a SIBLING bridge candidate — same incoming source,
different prior face — a real competing referent from the very document
being read. An unarmed "same" is refused, not trusted (witnessNote's own
"an unchallenged yes is not a second witness"); an unarmed "no" still
stands, because withholding trust in a yes is not disbelieving a no.

**DIAGNOSTIC AND ACT KEPT APART**, `dietBoundaries`/`concedeDiet`'s own
precedent: `witnessBridge` decides and touches no ledger;
`applyBridgeWitness` lands a `same` as an additional witness and, on a
`different`, returns a NAMED SUGGESTION (a ready `concede` trigger) rather
than conceding — retracting a bridge is a decision this file leaves to
whoever holds that authority.

**Measured on real material** (`eval/the-fold/bridge-witness-measurement.mjs`,
the three fixtures S49 used, the SAME production pipeline copied from
`bridge-object-measurement.mjs` rather than reimplemented — a driver that
rebuilds the path it measures reports on a pipeline nobody runs, and this
project paid for that once already). Live `gemma2:2b`, 60 calls, 161s, run
twice at temperature 0 with identical results:

| arm | landed "same" |
|---|---|
| real correspondence | 8 of 12 |
| MISPAIRED control, wrong by construction | 2 of 12 |

**Fisher exact, one-sided, α = 0.05 declared before the run: p = 0.0180.**
The control separates. A bare inequality would not have been a result.

**THE FINDING THAT MATTERS MORE, and it bounds the whole pass: 12 of 12
examined candidates have two faces that are the IDENTICAL STRING.** Not a
sampling accident — a bridge exists only where `hear()`'s exact-triple match
already fired, so a paraphrased restatement never produces a join, never
becomes a bridge candidate, and is never put to a witness. **Witnessing
bridges therefore cannot touch the ~2% corroboration wall** (P74/P83), which
is caused by propositions never matching in the first place; this organ
operates strictly downstream of the match that never happened. Step 4 makes
bridges ACCOUNTABLE; it does not make more of them.

**A landed witness does not raise `standing`** — every witnessed bridge
still reads `single-witness`, deliberately: `standingOf` counts distinct
SOURCES, and one model reading two passages is not a second source. It
appears in `kinds` instead (`{"bridge-inferred":1,"bridge-witness":1}`),
counted apart and never summed — P84's own rule for `primary:` against
account witnesses, applied one register over.

**Files.** `organs/bridge-witness.js` (new; `contextOf`,
`buildBridgeSelectMessages`, `witnessBridge`, `applyBridgeWitness`,
`decoysFor`, `witnessBridgesFor`, `BRIDGE_WITNESS_KIND`) +
`organs/bridge-witness.test.mjs` (new, 15 cases against the REAL kernel and
REAL bridges.js, `selectAsk` scripted so every wall is covered offline —
including a CONTROL BUILT TO FAIL: a picker that says yes to everything is
refused `indiscriminate`. Mutation-checked: stripping the indiscriminate
check, trusting an unarmed yes, and making `same` land nothing each fail the
suite). `organs/bridges.js` (one line: `priorSideKey` exported, so a caller
deriving a bridge id independently computes the identical id rather than
restating the rule). `eval/the-fold/bridge-witness-measurement.mjs` +
`results/bridge-witness-RESULTS.md`.

**Gates.** organs 415 tests / 396 pass / 11 fail / 8 skipped; conformance+
tests 499/488/10 — failure NAMES diffed against a baseline with this pass's
files removed and `bridges.js` reverted: identical, zero regressions.

**Disclosed limits.** The control may be easy (a mispaired passage is
usually off-topic, so "different" is cheap); a harder same-topic control is
named and unbuilt. n = 12, one material, one model. 4 of 12 real
correspondences read "different" and no oracle adjudicated them. And the
organ is unmeasured on non-identical faces, because this material produces
none — the case bridges were designed for is the case this material cannot
exercise.

**Concurrent-work note.** `eoreader7` PR #16 (`codex/hyperlexicon-deep-
reading`, open, 9,649 additions, based on a pre-S48 main) independently
develops "earned identity at the shared bridge" in an entirely separate file
set (`kernel/relation-composition.js`, `kernel/identity-groupoid.js`,
`kernel/identity-quotient.js`, `kernel/hyperlexicon.js` the chemistry table).
It touches none of `kernel/notes.js`, `organs/bridges.js`,
`organs/testimony.js` or `organs/corroboration.js`, so there is no
file-level conflict with this pass — but the two are thematically
convergent, and reconciling them is real, named, unattempted work rather
than something either side should assume away.
## S55 — P85's licensing run, taken: the company wall cannot guard the slot L4 names it for

**Generality:** universal.

P85 shipped the five-condition licensing rule for a learned component and
said of its own evidence: *"Measured? Not yet… the verdict is not taken,
and this entry claims none."* Its run died with its container twice. Taken
now (`eval/the-fold/ranke-slicers.mjs`, N=40 of the 162 object-missing
partials, live `gemma2:2b`, 220 calls): **no slicer earns a license.**

| slicer | offered | real | control | verdict |
|---|---|---|---|---|
| containment | 40/40 | 9 | 1 | separates from control |
| activation | 16/40 | 2 | 2 | REFUSED by its own control (II.23) |
| random (confound) | 40/40 | 2 | 3 | REFUSED by its own control (II.23) |
| embedding | — | — | — | `unavailable`, typed (L5) |

**The table is not the finding; the sample is.** Containment's nine
landings include deciders like «Support the Museum», «Visit the Apollo
Journals Website», a video caption, and an unrelated Schmitt sentence —
page furniture signed as testimony. Applying the decider-company wall
post-hoc over the recorded landings (the same `textFeatures`/`sameAct`
organs the generate path uses) takes containment from **9-vs-1 to 1-vs-0**:
8 of 9 fail. S50 already recorded this exact pattern once — a plausible
number that dissolves on inspecting the sample rather than the count.

**THE STRUCTURAL FINDING.** P85's L4 bounds a learned part's authority by
non-learned organs and names them, *"the sibling-swap arm, the
indiscriminate-pick check, the decider-company wall, and the
distinct-source count."* The decider-company wall **is not below the select
path at all** — it runs only on the generate path, skipped there on a
justification stated in `witnessNote`'s own comment: *"the decider is
verbatim by construction, so the decider-company wall below is satisfied
structurally."* That conflates two failure modes. Verbatim-ness does make
the ECHO mode impossible; it says nothing about whether the decider is
RELATED. `statingCandidates`' `h1 > 0 && h2 > 0` gate covered relatedness in
practice, which is why the gap was invisible — until callers began
INJECTING candidate lists, the seam P85 itself added for slicers, which
bypasses that gate.

**And the wall cannot simply be switched on.** Implemented and measured
rather than reasoned about: applying it to the select path breaks
`corroboration.test.mjs`'s own pinned capability test, whose premise the
test states outright — *"end2 never fires literally — this is what an
object-missing partial IS."* The wall requires each end's own words; the
seam exists to reach cases where an end's words are absent. **Mutually
exclusive as designed.** The change was reverted; organs is back to its
baseline 11 failures, identical by name.

So: the slicer slot has **no non-learned organ guarding relatedness**, L4
is unsatisfied there, and no slicer earns a license — not because slicing
is wrong, but because its landings are dominated by an unguarded failure
mode and the named guard is the one this seam cannot use.

**Named, not built.** A guard for injected candidates must not require an
end's literal words, since that is the case being reached. Two shapes exist
in this repo and neither is measured for this: referent identity on the
ends (`makeReferentIndex` — resolve "the crew" to the crew rather than
matching letters), or the arm's sibling pool drawn from the reader's own
referent state rather than capitalized surfaces in one candidate list. Both
are the same move — resolve the end, then ask about the referent.

**Files.** `eval/the-fold/results/ranke-slicers-RESULTS.md` (the full
account, the landings quoted, the post-hoc wall table) and
`results/ranke-slicers-run4.json` (raw). No production file changed:
`corroboration.js` is byte-identical to before this entry.

**Disclosed.** n = 40 of 162, one page, one model, one temperature. The
embedder arm never ran, so the embedder half of P85's question is still
open. The two landings that survive the post-hoc wall were not adjudicated
against an oracle — surviving a mechanical relatedness check is not being
true.

## S56 — The ledger gets Interpretation's triad: sameness and significance as declared, revisable commitments

**Generality:** universal. The mechanism holds no vocabulary of any medium
or language; it is `DEF`/`EVA`/`REC` over an append-only act log, and its
tests are organ-free on purpose so the walls stay testable wherever this
repo is checked out.

**What shipped.** `kernel/commitments.js` (+ `tests/commitments.test.js`,
19 cases against the real `makeNotes()`). Three verbs over one log:

* `declare(kind, members, giver, purpose)` — **DEF**. A giver AND a purpose
  are required; either missing is a typed refusal. Lands as a **wish**.
* `evaluate(id, ground, broken, verdict)` — **EVA**. A named ground and a
  declared perturbation are required, and the verdict must be `holds` or
  `refused`. Promotes the wish to **testimony**, or **refuses** it.
* `concede(id, trigger)` — **REC**. The trigger is carried verbatim. A
  conceded commitment's withheld notes become readable again.

Three kinds: `same-as` (two notes are one proposition), `does-not-matter`
(withhold), `matters` (an override that beats a withholding).
`readUnder(log, notes, {include})` is the projection: same-as classes fold
with witnesses and spans unioned, first face kept; every touched note is
marked with what it was read under. `redeal` is the II.23 control, and it
runs on a **scratch** `createTaskLog()` so an experiment never lands on the
record.

**The four walls, each mutation-checked.** (1) `fold()` is byte-identical
under any set of commitments not in force — an interpretation is not a
hearing. (2) A commitment **never counts as a witness**; corroboration is
untouched by declaring anything. (3) **Recoverability** — conceding a
`does-not-matter` makes its notes readable again, which is exactly the
property a filter cannot have and is why this is a ledger rather than a
predicate. (4) A conceded *commitment* is not a conceded *note*
(`concededNotes` in `kernel/notes.js` gained an ends filter for this; it had
been listing null-ended commitments as notes).

**Why this and not a same-as table.** The load-bearing user correction:
*"that may be its identity, but it's not its MEANING."* Two notes'
propositional sameness is not a fact the material states, and no corpus can
earn it — a Pattern-grain claim. So it enters the record the only way such a
claim may: declared by a named giver, evaluated against a ground with a
perturbation, and conceded when it turns out wrong. The apparatus is the
receiving end for a prior, not a decision procedure.

## S57 — The ends-only proposer, refuted; and the gap the refutation named

**Generality:** universal. The claim is about what a referent-grain key can
say about propositional identity, measured on two genres with a control
built to fail. The morphology gap it uncovers is English-specific and is
named as such.

**What was asked.** P74 measured the same-proposition conjunction (ends
correspond AND labels denote the same act) and got zero joins, blaming the
label half. So the ENDS half had never been measured alone. This driver
(`eval/the-fold/ends-only-proposer.mjs`, zero model calls) drops the label
conjunct and asks whether ends-only correspondence proposes any candidates
at all.

**Three findings, in order of how much they change the plan.**

1. **Referent identity is the wrong grain for propositional identity, and
   its own control says so.** 19 candidates on the Wikipedia set, 25 under
   deranged resolution — resolution contributes nothing a wrong universe
   would not. Reading the landings says why: six keys absorbed 6, 5, 2, 2,
   2 and 2 distinct raw end-pairs. `Kutuzov —arrived→ at the battlefield`
   and `Kutuzov —retreated→ from the battlefield on 8 September` key
   identically as *kutuzov / the battle*. **An arrangement's ends are not
   referents** — "the battle", "the battlefield", "control of the battle"
   are different ends resolving to one referent, and collapsing them
   answers *are these about the same two things*, which is not the
   question.

2. **The synonymy program has essentially nothing to work on.** Decomposing
   every cross-source pair whose RAW ends collide: 22 collided on ends AND
   label (already folded by `hear()`), and **zero** collided on ends while
   differing in label. Across 1,404 notes on two genres, exactly one pair
   anywhere is blocked by the label alone. A paraphrase does not get as far
   as having matching ends, so the label never becomes the blocker.

3. **That one pair is tense, and `sameAct` does not fold it.** `The door
   —is→ shut` / `The door —was→ shut`. The vendored `MorphologyPrior@1`
   carries **zero of eight** English copula forms, by an artefact of its own
   design: 224,550 pairs read, 216,011 dropped as rule-recoverable, 5,531
   kept as the irregular tail — and a suffix rule cannot get from *was* to
   *be*, so the copula should have been kept and was not (the shipped
   artifact's `irregular` field is empty). Reach, measured over this
   material's own labels: the copula is **29%** of Wikipedia label heads and
   **50%** of Dracula's, and the prior carries none of it. Every consumer of
   `sameAct` silently reads every copular restatement as a different act.

**Disclosed, and it blocks the fix here:** the prior's provenance names
`scripts/build-morphology-prior.mjs`, which is **not in this repository**,
with an `input` path pointing at a previous session's scratchpad. The prior
cannot be rebuilt from this checkout. That is itself the finding — a
received prior whose builder is not committed cannot be corrected, only
replaced.

Full numbers, the samples, and the disclosed limits:
`eval/the-fold/results/ends-only-proposer-RESULTS.md`.

## S58 — A hole in a received prior is closed by a second named giver

**Generality:** universal for the rule, English-specific for the hole.

`sameAct` — the organ that decides whether two labels denote the same act —
was blind to the most common verb in English. `createLemmatizer` built from
`MorphologyPrior@1` alone answers **false** for `is`/`was`, `is`/`are`,
`was`/`were` and `is`/`be`, so every copular restatement read as a different
act: **29% of encyclopedic label heads and 50% of a novel's**.

**It is the giver's hole, not the builder's.** UniMorph English carries
**zero rows for the lemma `be`** across all 652,477 of them, while every other
top-frequency irregular (have, do, go, say, get, make, know, take, see, come,
think, give) carries five verb rows apiece. The three rows in which `am`,
`are` and `were` appear at all are tagged `N;SG` — the noun senses.

So it is closed the only way a received hole may be: by a **second named
giver**. `priors.js::COPULA_PARADIGM` (`giver: "lang/en"`, scope declared as
*"the copula's paradigm alone; tense is not carried"*) is merged through
`createLemmatizer`'s new optional `supplement`. The two givers' reaches are
reported **apart and never summed** — `size` counts the prior's own entries,
`supplemented` counts what the second giver added — so one giver's reach can
never be mistaken for the other's.

**Not merged by default, and that is a decision.** Folding `is` with `was`
says the two are the same ACT, not that they are the same claim: a consumer
binding a present-tense claim to past-tense material has widened what it
hears. Every caller injects it deliberately. `BECOMING copula-tense-aware`
names what is missing — no organ here carries tense — and reports its own gap
without failing the suite.

**And the builder is recovered.** The prior's provenance named
`scripts/build-morphology-prior.mjs`, which was not in the repository, with an
input path into a previous session's scratch directory — so the prior could be
replaced but never corrected. It is committed now and reproduces the shipped
artifact **exactly**: `pairs_read` 224,550, `rule_recoverable_dropped`
216,011, `kept` 5,531, identical forms table. Three divergences were found by
measuring rather than guessed: `stemsOf` is now **exported** from
`morphology.js` and imported by the builder rather than restated (a five-way
divergent restatement produced a wholly different artifact — the same lesson
`OPERATOR_ORDER` taught, which is to remove a restatement rather than flip
it); the tag filter is every tag, not verbs alone; and `pairs_read` counts
rows where form differs from lemma while `kept` counts distinct forms.

Enforced by `conformance/copula-supplement.test.mjs` — including a case that
**fails the day UniMorph ships `be`**, so the supplement is retired rather
than left duplicating a giver that now carries it.

## S59 — The population is not what the class label says: a hub is none of its documents, chrome is what a host says everywhere, a ranked link is a guess

**Generality:** universal.

The licensing measurement S47 was written for was taken (2026-09-02,
`eval/the-fold/results/slicer-coverage-RESULTS.md`), and the first thing it
returned was not a number but a census: of 64 object-missing partials read
whole, 32 were not the cited document at all. Seventeen Apollo Lunar
Surface Journal transcripts had all answered from one portal page; six
NSSDCA pages from one status page; a chapter of SP-4223 answered for
fifteen propositions that are in a different chapter; and every one had
passed `documentMatches`, because a portal's title carries the journal's
name and a chapter of a book carries the book's. Nineteen of 52 faces
opened with the same 156 navigation lines, and a token-overlap classifier
had read "Lunar Surface Technology" in that menu as partial support for
"descent to the lunar surface". And 131 of the 162 had never been cited:
the note carried no footnote, so the walk had taken the best-overlapping
link the page contained as a guess, and `partial` admitted the guess.

Four rules now stand in `organs/ranke.js` and the backwards walk, each a
measurement of the fixture against itself and none a threshold:

- **`redirectHubs(index)`** — a final address that more than one distinct
  cited path resolved to is a hub, and a face read from it is none of the
  documents cited. Two is the floor: one document cannot be the resolution
  of two citations. An archive copy normalises to its target (any snapshot,
  either scheme), so snapshots of one document are never two citations —
  measured, because they were, and three same-sentence hits went
  `unreadable` before the fix. A hub face is a typed gap `redirect-hub`
  carrying the archive address of the cited URL.
- **On a hub gap the citation's own archive wrapper is the route** (P84).
  The walk gave up on any gap; now `redirect-hub` reaches for the wrapper
  the footnote carried, else the public archive's address for the target.
- **`stripChrome(text, siblings)`** — the leading and trailing lines a face
  shares verbatim with a sibling face of the same host. A sibling is a
  different final address; the same page fetched under two spellings is a
  duplicate, and a face compared with its duplicate is all chrome by
  construction — measured, because it was: 90 false `all-chrome` gaps, now
  4. The body is written beside the raw face as `<key>.body.txt` and the row
  points at it, so every downstream reader sees what the walk classified.
  A face with no sibling keeps its chrome, typed as zero removed.
- **`lead: "citation" | "guess"`** on every row. A footnote is a citation. A
  ranked link is a guess, and a guess that happens to be right is still not
  what the page cited.

Re-walked offline against the run-4 cache in ten seconds with no model
call: same-sentence 18 of 18 preserved; object-missing partials 162 → 127,
of which 30 are citations; wrong-document faces 47 notes → 3; faces with
navigation chrome 80 notes → 3; median candidate pool 191 → 74 sentences.
The paraphrase population on this page is on the order of thirty notes, and
the reading wall S47's seam exposed — the witness pointing at the stating
sentence 4 times in 11 with 0 wrong — is measured against that, not
against a menu.

The rule the day taught, stated once: **before a model call is priced, ask
whether it can succeed given what is in front of it.** The slicers'
coverage of the labeled sentence was a property of the ranking alone, read
in six seconds with no witness; it bounded every call the cross-product
would have spent, and it made the budget argument the earlier pass had
skipped. Pinned in `ranke.test.mjs`: hubs, the archive normalisation, lost
paths, chrome, the duplicate-is-not-a-sibling case, and the lone face.

## S60 — The reading wall is read before it is spent on: three refusals are right, two are the arm, two are the reader (2026-09-02)

**Generality:** universal (read the refusals at zero calls before buying
a hypothesis; a control asked more questions finds more); specimen-scoped
(the twelve notes, the one model).

S48 left one number: with the labeled stating sentence among the eight,
the witness landed 4 of 11 and refused 7. `eval/the-fold/reading-wall-zero.mjs`
dumps, at zero calls, what the witness was shown on every labeled note —
the claim string (`claimOfNote`'s `end1 label end2` fragment), the article
sentence the note was cut from, the eight with the labeled sentence's
position, and the arm claim. Three of the seven resolve without a model:
one note's stating sentence is not in the eight, one is labeled partial
("April 12" is not on the page), one is prospective. Position is not it.
Eleven of eleven arm claims are ungrammatical — `competingFiller` swaps a
phrase-valued end2 whole for a single name (`Hornet launched Apollo`).

The one hypothesis bought (≤96 declared, 70 spent,
`results/reading-wall-RESULTS.md`): the fragment is the wall — show the
article's own sentence instead, mechanically. Refused by its measurement:
3 landings against the fragment's 5, and `indiscriminate` rose from 3 to
5, because a longer claim shares more words with more candidates and the
picker keys on shared words. `claimOfNote` is unchanged.

Two corrections to S48's report. The witness DOES point at the wrong thing
when the claim is ill-formed: one control landing in 23 per form, both on
claims the extraction cut from an infobox or a list. And a landing can be
on an unlabeled sentence that states less than the claim (a photo caption
"all wearing BIGs" for "worn until the isolation facility") — the byte
address is what shows it. What remains is two notes the arm cannot test
(the phrase-valued-end swap is designed, not built) and two the reader
does not cross; those stay refused and disclosed under P84(1).

`ranke-slicers.mjs` records per-note verdicts on every checkpoint now;
tallies alone made the seven recoverable only by subtraction.

## S61 — The hypergraph is rich by default: a received prior's verb is an act on first arrival, the chain rides in the act, and a capitalised recurrence is a surface (2026-09-02)

**Generality:** universal (the three gates; the surface guard; the
walk-level null); specimen-scoped (the counts).

User: *"I think the hypergraph should be this rich ALWAYS"*, after S49's
notes-against-notes pass showed every note on both sides folding to
`subject —were→ the rest of the sentence`. Read at zero calls one gate at
a time (`eval/the-fold/results/rich-extraction-RESULTS.md`): the
recurrence floor keeps unsupervised vocabulary discovery honest but
starves a one-page face, where *placed* arrives once and can never be an
act; UniMorph English is a 10k-form sample that lacks *placed, retrieved,
launched*; and DR5's auxiliary chain was built and never wired into the
walk. `organs.attestedVerbs` (declared, off in the organ, byte-identical
otherwise) admits a form a received prior attests as verb-dominant on its
first arrival; the walk passes UniMorph ∪ UD English-EWT verb-dominant
forms with the chain on, by default (`RICH=0` reproduces every earlier
run). The leak it opened — *Buzz* recurs, UD attests *buzz*, the widening
read `Armstrong and —buzz→ Aldrin` — is closed on both widening paths by
the passage's own casing: a form capitalised away from a sentence start
more often than lowercase is a surface, not an act.

Walk-level null, offline, 0 calls, 150 faces: notes 524 → 674, bare-
auxiliary acts 245 → 131, same-sentence real 31 → 57 against control 21 →
31, through the note's own footnote 8 → 17 against 2 → 5. Half the
same-sentence gain is notes of three content words or fewer, said plainly;
a length-aware null is owed before that count stands alone. What the rich
graph still lacks is named: coordination as one edge, passives unturned,
the object as the whole predicate, the vocabulary gap. Three labels need
re-keying on their article sentence. 111 model calls were spent
undeclared by the walk's own witness on the live and first offline runs;
recorded, and `WITNESS=0` on every measurement run since.

## S62 — Null the free stage before buying the paid one; and measure the null where the budget is spent

**Generality:** universal.

User, 2026-09-04, on a plan to spend ~350 model calls drawing a null band for
a walk that had just returned 0.033: *"what are you running calls for? that's
a lot, i feel like the point of making RULES is so we can do minimal calls."*
Then, on the statistic itself: *"is that right? or is it when there is a
difference that makes a difference?"* And then: *"we should have always been
doing this."* That last is correct and this entry exists to say so on the
record: **every walk in this repo before today spent model calls without ever
nulling the stage that chose what to ask about.**

**The shape of the mistake.** A measurement that spends calls has a mechanical
stage in front of it that decides which pairs the model ever sees — here
`endsCopresentWindow`, which skipped 6,483 pairs for free and passed 60. That
stage costs nothing, and it bounds everything after it. Spending on the judge
before nulling the selector buys a number about a candidate set nobody has
checked.

**Three rules, each with the measurement that earned it.**

1. **Null the SELECTOR, not only the judge.** Derange the relation with
   marginals kept — same subjects, verbs, objects, witnesses, spans, only
   which object belongs to which subject destroyed — and recount what the
   selector admits. Measured (`ordered-read-reach.mjs`, 915 notes, 16
   independent sources, 20 draws): the copresence lookup admits **491** notes
   against a redealt median of **500**, with 18 of 20 draws at or above real,
   **p ≈ 0.905**. That is not a weak signal, it is the absence of one. The
   guard the walk *did* carry — four planted fabrications, 0 attested — is
   four points chosen by hand and answers a different question.

2. **Measure the null WHERE THE BUDGET IS SPENT, not across the pool.** A gap
   averaged over everything the system ignores is not information about
   anything it does. Measured: over the whole pool the selector reads a 9.6%
   lift at p ≈ 0.048 and looks alive; at the note level, where the ask is
   actually chosen, it reads p ≈ 0.905 and is dead. The same instrument, the
   same corpus, opposite verdicts — the aggregate was the wrong statistic.

3. **A real number and a null that are BOTH ZERO is a broken instrument, not a
   finding.** `cited-source-null.mjs`'s first draft called
   `endsCopresentWindow(note, text)` with the arguments reversed; both arms
   read 0 feasible pairs and it printed the confident conclusion that the
   candidate set carried nothing. It was caught only because a walk had
   already spent 60 asks, so 0 was known to be wrong. Check that the real arm
   reproduces a number you already have before reading any null against it.

**What the free pass bought, stated as the reason to keep doing it.** The
~350 declared calls were never spent. The zero-call pass settled more than
they would have: it killed the lookup (p ≈ 0.905), found the one selector in
this corpus that does separate — the reader's own resolved referent face,
**51 real against a redealt median of 39, outside every one of 20 draws,
p ≈ 0.048** — and narrowed the next spend from a band to a single 60-ask run
against that 51. **The first quantity in this line of work to separate from
its null at the note level was found for nothing.**

**Refused, so it is not retried:** ranking the candidate pool by a stronger
similarity score. That is a better lookup, not a reading, and rule 2 says why
it would have measured true and useless — the gap would have moved in the
aggregate while the top of the list stayed the same.

## S63 — A cross-document referent is instantiated the same way a within-document one is; and the cast's own furniture wall was still open

**Generality:** specimen-scoped. The cast furniture-wall fix itself is
universal (it closes a real gap in `cast.js` for every caller), but this
entry's headline claim — a referent's reality-kind, read from a name-level
cross-source correspondence — is measured, not universal: the same
measurement below shows it real but noisy on this material, and the
generic-token refinement tried against that noise is shown to cost more
than it buys on this specific cast's own pre-existing fragmentation.

User direction, near-verbatim: cross-document referent identity "is the
same thing as when we instantiate an entity... just a cross document
entity, a different type of being-hood" — and the-fold should organically
discover, by kind induction, that some referents are real, some fictional,
some a fictionalization of a real one, with Borodino named as the specimen
(the real battle, and Tolstoy's own literary account of it, mixing real
historical figures with invented characters).

**The first half was already the design — `organs/bridges.js`'s own
header states it almost verbatim** ("it is the same set of operations,
just at another level"): a referent bridge is an ARRANGEMENT heard onto
its own ledger through the identical `hear()`/`concede()` machinery an
ordinary within-document entity uses. `bridge-witness.js` (S52, merged
the day before this entry) can even ask a model to confirm one, measured
with a real null (Fisher exact p=0.018). Its own disclosed boundary: a
bridge exists only where an exact (subject, verb, object) triple matched
across documents — 12 of 12 examined candidates were identical strings,
so a paraphrase never becomes a bridge candidate. That ceiling, not the
concept, is what stood between the design and the Borodino specimen.

**Chasing the second half found a live, previously-undiagnosed production
bug, not a missing feature.** `rashomon-contrast.mjs` (the most recent
related work, the corrected successor to a retracted Rashomon run) had
already found and named the next step: "a furniture wall on the cast, not
only on admission" — Wikipedia navbox link text (unrelated Tolstoy story
titles, an unrelated battle) was entering `cast.js`'s referent index and
merging with real people (Barclay de Tolly and Pyotr Bagration fused into
one referent carrying the infobox abbreviation "DOW"). Tracing exactly
where this lived found it was not a missing organ: `source.js::chunkSource`
already computes a page-aware, furniture-blanked `chunk.blanked` field
whenever a caller passes `blankFurniture` (P82) — but `cast.js`'s
`makeCastHandles`/`makeReferentIndex` read `p.text` unconditionally, so
every caller that had wired `blankFurniture` into `chunkSource` believing
it protected the cast (the-fold's own production `addSource`/web-fetch
`chunkSource` calls did NOT even do that much — this pass found and fixed
both) got no benefit at all.

**The naive fix (read `.blanked` whenever present) broke a real,
independently-tested architectural rule.** `hypergraph.js`'s
`readSentenceText` already enforces, and `source-page-blanking.test.mjs`
already tests, "a reader that never asked for blanking does not get it
from the chunker" — a caller's own injected organ is authoritative, never
a side channel it has no relationship with. `hypergraph.js` internally
calls `cast.js::makeReferentIndex(organs)` to resolve edge endpoints
(`import { makeReferentIndex } from "./cast.js"`, line 163), passing its
whole `organs` bundle straight through — so an unconditional `.blanked`
read made a reader that was deliberately NOT given `blankFurniture` see
page-scoped blanking anyway, through referent identity rather than
sentence text, and that exact test caught it. Fixed the same way
`readSentenceText` already does it: `cast.js` now takes an optional
`blankFurniture` (any truthy value — never invoked, only checked, since
the blanking already happened at `chunkSource` time) and consults
`.blanked` only when the CALLER of `makeCastHandles`/`makeReferentIndex`
opted in. `hypergraph.js` needed no change at all — its own `organs`
bundle already carries `blankFurniture`, so `makeReferentIndex(organs)`
was already threading it through. The-fold's three cast.js call sites and
this repo's own `rashomon-contrast.mjs` now opt in explicitly.

**Measured on the real fetched Battle of Borodino page** (`cast.test.mjs`,
5 cases, the first direct unit tests this module has ever had): the two
fused garbage referents disappear entirely once opted in; Barclay de
Tolly's surname reappears as its own (still partial) referent rather than
fused into Bagration's; a reader that never opts in is provably
byte-identical to before this fix, even when the SAME passages carry a
`.blanked` field for another consumer's sake.

**`organs/reality-kind.js`** is the new capacity (`realityKind`, INS·Kind
— a SECOND organ at the cell `skill` already occupies, resolved and the
registry checked BEFORE writing per P92's own rule): real / fictionalized-
real / fictional, instantiated per referent from a caller-DECLARED genre
(fiction/nonfiction — never induced) and a NAME-LEVEL cross-source
correspondence (`namesCorefer`, the same sameness test `cast.js`'s own
`resolve()` uses for within-document identity) — deliberately NOT routed
through `bridges.js`'s own exact-triple ledger, because two independently
authored accounts of one event essentially never share a full triple
verbatim (`rashomon-contrast-RESULTS.md` measured 1 shared claim in 1,663
on this EXACT material) and routing through it would answer "fictional"
for nearly everyone, Napoleon included — not because he is fictional, but
because the bridge mechanism's own disclosed ceiling was never built to
reach a paraphrase. A name is a narrower object than a whole asserted
relation, and an exact match on one is common where an exact match on the
other is vanishingly rare. "Fictional" is deliberately never phrased as
"does not exist" — every row carries `checkedAgainst`, naming exactly
which nonfiction sources were examined, the withhold-vs-convict rule
applied to a new axis.

**Verified against the user's own falsifiable prediction, live, on the
real fixtures already in this repo** (`wikipedia-battle-of-borodino.html`,
`tolstoy-borodino.txt`): Napoleon and Kutuzov correctly correspond across
the encyclopedic and novelistic accounts and read `fictionalized-real`;
Bezukhov, Bolkonsky, and Rostova never do and read `fictional`. 178
correspondences found across 289 Tolstoy referents; a hand spot-check of
20 (not just counted — read, this project's own standing discipline)
found roughly two-thirds genuine (Moscow, Smolensk, Shevardino Redoubt,
Murat, Bennigsen, Kutuzov, Napoleon among them) and the rest real, named
noise: generic military-rank/unit words ("Colonel", "Division") admitted
as matchable surfaces by the cast in the first place, and at least one
likely collision with an unrelated person sharing a common name (a
Wikipedia bibliography author named Boris, not the novel's own character).

**A second, real, measured finding — a proposed fix for the first noise
class was tried, found to cost more than it buys, and shipped opt-in
rather than on.** `surfaces.js::genericTokens` (already built, unrelated
to this file, an IQR-fenced measure of how many distinct partner tokens a
name-token co-occurs with — "so two Princesses never merge") looked like
the exact tool for "pierre" being too common a given name to individuate
a match on its own, and DOES fix that specimen (Tolstoy's bare "Pierre",
this excerpt's only surface for him, no longer corresponds to a real but
different officer, "Jean Pierre Lanabère Charles", once gated). Run on
the real fixture rather than assumed safe: the SAME statistic, computed
over this cast's own pre-existing prose-coreference fragmentation
(Napoleon alone surfaces as seven distinct garbage referents on the
Wikipedia side — "How Napoleon", "Napoleon Europe", "Napoleon Against
Kutuzov" among them, each contributing a different partner token), pushes
"napoleon" AND "kutuzov" past the identical fence — refusing the two
correspondences the whole specimen is about, for a reason that has
nothing to do with either being a common name. Pinned as its own test
(`cast.test.mjs`'s sibling reads this fixture's own generic set directly
and asserts both names are wrongly in it), shipped as a real, tested,
OPT-IN organ parameter — off in the demonstrated configuration, on for a
caller who has separately dealt with the underlying fragmentation.

**Disclosed, not silently narrower than it sounds.** The generic-military-
word noise class (Colonel/Division as matchable "referents" at all) is an
upstream referent-admission question this pass did not touch. A stronger
correspondence signal — composing this file's name-level check with
`bridges.js`'s own corroborated triples where one exists, the stronger
winning — is real, scoped, unattempted future work, named rather than
implied done. The prose-coreference fragmentation the generic-token
finding surfaced is a pre-existing, separate engine limitation (distinct
from the furniture bug this same pass fixed), not addressed here.

**Files.** `organs/cast.js` (the furniture-wall fix, additive, backward
compatible) + `organs/cast.test.mjs` (new, 5 cases — this module's first
direct unit tests). `organs/reality-kind.js` + `organs/reality-kind.test.mjs`
(8 cases, including the real-fixture falsifiable-prediction test and the
generic-token guard's own measured benefit-and-cost). `organs/capacities.js`
(`realityKind` registered, 27/27 cells unchanged, geometry re-asserted).
`eval/the-fold/rashomon-contrast.mjs` (the same furniture-wall fix applied
to its own passage construction, so its own cast is no longer the thing
this entry just fixed). the-fold's `app.js` (both `chunkSource` call sites
— `addSource`, the one choke-point every attachment/paste/upload/library
pull passes through, and the web-fetch path — now pass `blankFurniture`;
all three cast.js construction sites opt into it). Full suites, failure
names diffed via `git stash` rather than counted: the-fold 1025/958/67
before and after (zero regressions); eoreader7 core 555/543/10 and organs
441→449/437/11 before and after (the 8 new reality-kind cases the only
count change, same 11 pre-existing names both times).
