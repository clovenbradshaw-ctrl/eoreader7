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

## S64 — A committed eval result is not enforcement until a test reads it; and the three drifts that kept a stage-13 reading on the books for six days

**Generality:** universal for the two organ rules and the driver migration below (each is a structural rule with no tuned number, replayed on a second material and on synthetic controls in both directions); the stage readings themselves are specimen-scoped, as every MHC number here has always been.

The-fold's own **P94** is the paired entry (the law, the fold-side files, the audit); this is the engine side. The user's challenge, verbatim: *"I don't believe we can reason at level 13 with war and peace, prove it."* The honest answer was that it could not be proven — and the proof of that is the finding.

**What the doc said, and what the driver did.** `native/eval/the-fold/results/mhc-RESULTS.md` reported War and Peace at **stage 13 (Metasystematic)**. Re-run live on 2026-09-05 against the identical committed fixtures — twice, the second time from clean `origin/main` worktrees in both repos to rule out the session's own unmerged branch — it reported **"Stage: none readable"**: order 5 `failed` ("gathered 60/60 … kept apart 17/19"), and orders 6, 8, 9, 10, 12, 13 `unmeasured (organ_unreachable)` on **all three** materials, each saying "this material offers no edge whose two ends are both admitted referents." Borodino, whose order 5 passed, capped at stage 5 for the same reason.

**Three independent drifts, dated.** The stage was measured for real on 2026-08-30 (P70's third amendment). Then:

1. **2026-08-30, same day — `WORKING_PASSAGES` 40 → 70** (raised to give order 10 a specimen) pulled the article's back matter into the candidate pool for the first time. The Translations bibliography ("Oxford University Press", ×3, beside Cambridge and Cornell University Press) and the Adaptations list ("Natasha, Pierre & The Great Comet of 1812") sit at characters 48,469 and 54,682 — both past the old 48,000 cutoff. Two organ defects the front matter never exercised then produced two false merges on the fold's own individuation rule (below), order 5 failed, and `stageFrom` — correctly — read no stage across a failed floor. Isolated with one variable: the identical code over the first 40 passages has neither surface in its pool and zero false merges; over 61 it has both.
2. **2026-09-01 — `readsNothing`** (floor 4½'s wall, consumed by `mergeTestimony`): a hold carrying no address no longer counts toward corroboration. The battery's order-13 readings (`readAcross`) were built with `read: []`, so no claim could reach AGREE and the arm reported "the two claims' merges do not differ" on every material.
3. **2026-09-02 16:02 — the SVO wipe** (`ffbbc0b`; the-fold P76/P80): edges carry only `end1/label/end2`. The battery read `e.subject/e.verb/e.object` at **47 sites** and was never migrated. JavaScript answers a missing property with `undefined`, not an error: every edge failed the specimen filter's `clean(e.subject)`, `candidates` came back empty, and the driver reported the absence as a property of the **material**. That is P41 committed by the very file whose own header warns about the identical shape one level up ("a driver that hardcodes one [engine layout] reports 'organ unreachable' … a statement about the SYSTEM when it is a statement about a path").

The results file was carried through the eval migration at 2026-09-02 10:00 — already wrong two ways, wrong a third way six hours later, and read as truth for three more days. Nothing read the number, so nothing failed. **eo-constitution III.5 — a typed gap no test reads is a report, not an enforcement — applies to a committed measurement exactly as it applies to a gap.**

**Organ rule 1 — a token with no letters breaks a capitalised run** (`adapters/text/surfaces.js`, both `accumulateSurfaceEvidence`'s scan and `extractLeadingSurfaces`, which is that scan with one stated difference). A whitespace-delimited token that strips to nothing — a bare "&", a spaced dash, a stray colon, a numeral — vanished from `toks` with no break recorded, so the tokens either side read as adjacent and the run-walker bridged across. "Natasha, Pierre & The Great Comet of 1812" extracted **"Pierre The Great Comet"** — a surface the material never contains (`indexOf` = −1) — and merged the character with the 1811 comet through it. The comma fix (S44's lineage) catches junk glued to a token's own edge; this is the one shape that check cannot see. Fix: `pendingHardBreak`, folded into the next real token's `leadingJunk`. The category is "no letters" — never a list of marks (P50); a spaced dash is pinned to break the same way.

**Organ rule 2 — containment is not transitive through a shared anchor** (`discoverReferents`). The two-bearer rules (S17) catch a fragment bridging two *existing* groups. Their shared blind spot: assignment is most-individuated-first, so the anchor arrives first and every fragment then faces its maximal member alone, one at a time. "Oxford University" and "University Press" are each a subset of "Oxford University Press"'s tokens, each matched it on its own, and both were absorbed — though they never match *each other* ({oxford, university} and {university, press} overlap on one token and neither contains the other). There was only ever one group in play, never two to bridge. Fix: each group carries its `children` (every member but the current maximal; a witnessed merge carries the folded groups' members across), and a fragment arriving into a single matched group is held against those children for **partial overlap without containment**; a conflict lands as the *same* typed `ambiguous_surface` gap the two-bearer wall uses, now naming `conflictsWith`. Membership is still decided against the maximal only — the design S17 chose to keep a weak member from admitting a third party is untouched. Disjoint siblings never conflict: {ilya, andreyevich} and {rostov} under "Ilya Andreyevich Rostov" keep merging (pinned as the control). **Disclosed cost, pinned rather than hidden:** {ilya, rostov} against a sibling {ilya, andreyevich} is the same structural shape as the publisher case and is refused too — only world knowledge (a person carries a patronymic, a press does not) tells them apart, and this tier does not have it. Measured on the real fixtures, the rule's whole cost is **one refusal**: "University Press" on War and Peace (the intended one); Borodino's single refusal ("Pyotr", two bearers) is the pre-existing wall.

**The driver, migrated at one seam, not 47 edits.** `edgesOf(reader)` lays the driver's vocabulary over the earned names and keeps them, so the same objects still satisfy `queryEdges`/`queryFillers`; it is memoised per reader (a fresh `.map()` per call handed `deriveSpec` and `buildItems` different objects for one reading, and order 9's `indexOf` refused every material with "the specimen is not among this reading's own edges" — found on the first migrated run, not reasoned about); the order-10 redeal sets both names; and an edge carrying *neither* vocabulary is refused **loudly, as a fact about the driver**. `readAcross` readings now carry the address they read (the claim's own refs, else the passage), `readPerSource`'s existing convention.

**Measured, before and after, same fixtures.** War and Peace: none readable → **stage 13**; order 5 gathered 60/60 → 51/51, withheld 17/19 → **11/11** (the pool shrank because the fabricated surfaces are gone and one fragment is refused — LP11's marginal accounting, above). Borodino: 5 → **stage 6** (its real order-7 ceiling, unchanged); order 5 27/27 → 32/32 and 2/2 → 6/6 — *more* pairs adjudicated, all clean, because runs the "&" rule now splits are real names (and one bare given name, "Pyotr", refused as ambiguous between its bearers — the S17 two-bearer gap doing its job, not the overlap rule). Orders 9 and 13 measured and passing on both English materials. borodino-ru stays "none readable" on the disclosed register limits (`Огюст Коленкур | Огюст` stranded; `Италии Евгения Богарне | Италии Евгений` merged — S39/S40's own), untouched here. Scale held: 0 order changed its order-hood with the content.

**Enforced now, not reported.** `native/eval/the-fold/lib/coref-agreement.mjs` is the order-5 computation moved out of `deriveSpec` verbatim (comments kept — they record three wrong versions of the probe) so ONE implementation serves the driver and `native/tests/mhc-order5-precision.test.js`, which asserts zero wrong merges and zero strandings on both English fixtures on every suite run, logs the refusals by name, and pins the two false merges that found this. `native/tests/rich-referents.test.js` grew five cases: the "&" glue, the spaced dash (the category), the Oxford overlap, the disjoint control, and the disclosed Ilya cost. Every new test was run against the *unfixed* organs first and failed on exactly the expected cases while the control passed — a pin built to fail, per II.23.

**What is not claimed.** 13 is the same cascade-gated number it was: it stands on order 5's precision on these two fixtures and will move again the next time the pool moves. It says nothing about correspondence. And the stale doc is one instance caught because a reader disbelieved it; P94 carries the audit of the others.

**The audit of the other results docs, run from this side and stopped at 3 of 13** (the-fold P94 carries the full account and the continuation). Its own first finding: only five of the thirteen wipe-exposed drivers write a tracked results file; the rest are transcriptions of stdout, so a `git diff` of `results/` measures nothing for them and had to be replaced by reading stdout against the doc. `admission-gate` drifted by one `the`-labeled note in its blind arm (32 → 31 admitted, 18 → 17 junk, 18 → 17 gate refusals), gated arms byte-identical. `asserted-eval` cannot run here: it imports `legacy-eoreader6.1/packages/engine/perceiver/text/spans.js` by path and that submodule is uninitialized, its remote outside the session's reach — the migrated tests were given the native fallback, this driver was not. `cited-source-null` and `ordered-read-reach` both read `results/ranke-backwards.json`'s faces and skip absent ones silently, and 86 of the 106 the walk names were untracked (`5541af4`, 09-04 11:52) after both docs landed (11:20, 11:29): the live pool is 20 faces, printed as the same "16 independent sources"; on that pool the null's 18 draws (7,316–7,672) all exceed the real 7,271 where the doc had a 9.6% lift — the doc's run is not refuted; its re-run is impossible from the repo. Both drivers now print the walk's face count, the absent count and the pool used, and say the numbers are not comparable. Nine drivers unrun: `full-circuit`, `hyperlexicon-door-probe`, `mechanical-reasoning`, `object-boundary`, `pruning-timeline`, `rashomon-contrast`, `reasoning-e2e-no-llm`, `subject-wall`, `vendored-prior-eval`. The rule this earns: a fixture a driver needs and `.gitignore` refuses is a result nobody can reproduce, and the driver should refuse rather than narrow — a decision for the next pass, not taken here.

**Files.** `adapters/text/surfaces.js`; `eval/the-fold/mhc-battery.mjs`; `eval/the-fold/lib/coref-agreement.mjs` (new); `tests/mhc-order5-precision.test.js` (new); `tests/rich-referents.test.js`; `eval/the-fold/results/mhc-RESULTS.md` + `mhc-battery.json` regenerated from the real run; `eval/the-fold/cited-source-null.mjs` and `eval/the-fold/ordered-read-reach.mjs` (the skipped-face disclosure, numbers untouched).

## S65 — The audit finished: a driver refuses what its checkout lacks, and a transcription doc is enforced by the test that reads its computation

**Generality:** universal for the three rules (a walk-based driver refuses absent fixtures; a driver whose opt-in organ no longer reaches the reader refuses rather than printing identical arms; a print-only results doc is enforced by moving its computation into `lib/` and reading it from `node --test`) — each is structural, carries no tuned number, and was built to fail one way and pass the other on synthetic material before touching the real one; every count named below is specimen-scoped and dated.

The-fold **P95** is the paired entry (the law and the fold-side files); this is the engine side. S64 stopped the audit at 3 of 13 drivers and left the fixture decision open. This pass took the decision, ran the remaining nine, and made the four transcription docs enforceable.

**The fixture rule, decided: refuse.** `lib/walk-fixtures.mjs::walkFaces(walkJson, fixtureDir)` splits every face the walk's real rows name into present and absent and returns a typed `fixture_absent` gap when any is missing; `cited-source-null.mjs` and `ordered-read-reach.mjs` print `describeWalkGap` and exit 2 before building a pool. Committing the 86 faces was declined: the docs are dated records of one run, not claims about the repo, and the 09-04 rule that regenerable eval output stays out of the tree holds. Both docs now say "reproducible only where the walk's fixtures exist"; on this checkout 106 are named, 20 present, 86 absent, and both drivers refuse. `native/tests/walk-fixtures.test.js` pins the mechanism on synthetic walks and DISCLOSES the real walk's state — asserting all present would fail on every honest checkout, asserting them absent would freeze the gap as a target.

**The nine, run with no cap, classified.** Every one is offline; the longest took 35 s. For the drivers that write a tracked artifact, `git diff -- results/` was the measure; for the transcription docs, stdout was read against the doc by hand — then made unnecessary.

- `full-circuit` — **reproduces exactly**: ceiling 0.500, 1,020 spans, 4 handovers proceed and e→a stopped, 6 never-stated facts, a-before-e at depth 2 via 3 paths, leaky arm 3/3/0. One transcription error: "Nine walls" over a table of ten rows.
- `mechanical-reasoning` — **reproduces**: `mechanical-reasoning.json` byte-identical.
- `pruning-timeline` — **reproduces in every number**; the JSON's declared-giver string (the driver's own path) was stale from the 09-02 eval migration. Regenerated.
- `reasoning-e2e-no-llm` — **every verdict reproduces; the display had drifted**: `undefined —undefined→ undefined` for all nine edges, every "read as" and "nearest" — S64's unmigrated `e.subject/e.verb/e.object` reads, in a second driver. Migrated at one seam.
- `hyperlexicon-door-probe` — **drifted, finding intact**: arm A 29 → 30 notes, arms B/C bound 15 → 16, notes 10 → 12, still 0 hand-listed closed-class labels. The two new notes are the article's Russian title, `Война —и→ мир` / `миръ`: a Cyrillic "and" reaching the ledger as a label neither the probe's English hand list nor the English POS prior can see. The probe now reports labels the prior has no entry for beside the hand-list count — measured, never listed; the column also holds "discusses", a real verb the treebank lacks, so it reads as the prior's reach on this material, not a verdict on the label.
- `subject-wall` — **drifted by one to six edges per arm; the direction stands** (Dracula: referent rate legacy 23% / walls 28% / random 10%; debris 27% / 11% / 15%). Not isolated to one organ (S63/S64 are the candidates). Found first as an ENOENT: the driver's book path was pinned to another machine's home directory (`/home/user/live_priors/…`) — unreproducible from any other checkout by construction. Now resolves the sibling `live_priors` clone, honours `BOOK=`, refuses typed when absent; `subject-wall.json` regenerated.
- `rashomon-contrast` — **drifted**: A 1,471/1,466/1 → 1,445/1,441/0, B 1,669/1,663/1 → 1,619/1,614/0 — the pool moved and the single shared claim is gone; S63's cast wall (the doc's own "next 1") and S64's surface rules are the candidates, not isolated here; 0.0% on both arms stands. Its JSON is gitignored and its slot-level table is not computed by the driver at all: a report by construction, named as such.
- `object-boundary` — **unreproducible-by-construction since the-fold `2214e1a` (P80, 2026-09-03)**: the `boundedObjects` opt-in the doc's verdict kept was removed with P80; `makeRelationReader` ignores the unknown option; the re-run printed three byte-identical arms (1,590 edges, debris 0.459) and still "moved by the cut: 53" — address-key collisions, not moves. P41 in a third driver. `lib/object-boundary.mjs::boundedCutGap` refuses, typed `organ_unreachable`, when the baseline carries cuttable objects and the bounded arm is identical; the driver exits 2.
- `vendored-prior-eval` — **unreproducible-by-construction**: its three corpora are research-use text kept gitignored and never committed (its own header). Refuses typed instead of an ENOENT stack.
- And `asserted-eval`, which S64 could not run: here the frozen provider's submodule is initialized, it ran in 38 s, and its doc **reproduces** — the only diff was its own wall-clock field (32.6 s → 37.7 s), a seam the runner names rather than counts.

**Enforcement, the S64 pattern applied four times.** Each transcription driver's computation moved verbatim into `lib/` and a `node --test` file reads it every run: `lib/full-circuit.mjs` + `tests/full-circuit.test.js` (ten walls and the by-construction numbers, pinned exactly — the material is built, not a specimen); `lib/door-probe.mjs` + `tests/hyperlexicon-door-probe.test.js` (the RULE: A admits closed-class labels, B and C admit none, the gate turns away nothing B did not refuse; counts and the ≥2-witness zero disclosed, never asserted); `lib/object-boundary.mjs` + `tests/object-boundary.test.js` (the refusal, built to fail on a reader that ignores the opt-in and pass on one that applies it, with the real boundary set from the committed prior; the production reader's state disclosed); `lib/reasoning-e2e.mjs` + `tests/reasoning-e2e.test.js` (every tier's verdict table). The libs take their organs as arguments (the coref-agreement posture), so the drivers keep mirroring the live turn through the-fold's modules and the tests read the engine's own adapters — which return the identical tables. That is ONE reader (the-fold's `hypergraph.js` re-exports the engine's) over two adapter providers, the frozen one and the native one; it corroborates the adapters, not the reader, and both are reported as such. `lib/mhc-control.mjs::controlRule` gives the MHC battery its typed `control_absent` refusal for a one-material run (`tests/mhc-control.test.js`), closing the "none readable" that was the invocation and not the material.

**The runner, kept:** `native/eval/the-fold/audit-results.sh` carries the driver→artifact→enforcement map, runs every driver with no cap, and reports one of `reproduces` / `DRIFTED` / `refused, typed: <gap>` / `print-only; enforced by: <test or none>` — never `diff lines: 0` for a driver that only prints. Its own run this pass: five refused typed, four print-only-enforced, one print-only-unenforced (`rashomon-contrast`, plus `admission-gate` from S64's set), two reproduce, two drifted in their tracked JSON as described.

**What the pass does not claim.** The four drifted docs still carry their original numbers with the audit line above them; a doc is not rewritten to match a re-run whose reader has moved, it is dated. Nothing here restores `boundedObjects` — P80 removed it on purpose, and the object-boundary doc's verdict ("refuted, kept opt-in") is now "refuted, and the opt-in is gone; the numbers are a record". The Cyrillic connector is a finding handed forward, not fixed: it is the door admitting a closed-class label in a script the prior does not cover, the same shape as the labels P73 closed for English.

**Suites, failure names diffed.** eoreader7 native: 593 tests, 592 pass / 0 fail / 1 todo → 619, 618 / 0 / 1; the 26 new are the six test files above; no name left or joined the failing set. The-fold: see P95.

**Files.** `eval/the-fold/lib/{walk-fixtures,mhc-control,full-circuit,door-probe,object-boundary,reasoning-e2e}.mjs` (new); `tests/{walk-fixtures,mhc-control,full-circuit,hyperlexicon-door-probe,object-boundary,reasoning-e2e}.test.js` (new); `eval/the-fold/{cited-source-null,ordered-read-reach,mhc-battery,full-circuit,hyperlexicon-door-probe,object-boundary,reasoning-e2e-no-llm,subject-wall,vendored-prior-eval}.mjs`; `eval/the-fold/audit-results.sh` (new); `results/{pruning-timeline,subject-wall}.json` regenerated; eleven `results/*-RESULTS.md` / `vendored-prior-eval.md` stamped with their audit line.

## S66 — The wiped names, read hit by hit: three drivers migrated at one seam, a wall-clock moved off the record, a dead flag removed

**Generality:** universal for the rule (a driver that displays or keys a reader edge or claim row reads `end1/label/end2`, and adopts the SVO names only through one declared seam — a `sae` map or its own claim-to-triple mapping — never a bare property read that JavaScript answers with `undefined`); every count below is specimen-scoped and dated. The-fold **P96** is the paired entry.

**The grep, read.** Pass 14 item 5 named the grep and said each hit is read, not counted. On 2026-09-05 it hit 14 drivers. Legitimate: `cited-source-null`, `cited-source-walk`, `select-false-rate`, `ordered-read-reach`, `rashomon-contrast` and `copresence-audit` map bound claims to `{subject, verb, object}` at their own seam before any read; `mhc-battery` reads through `sae`/`edgesOf` (S64); `asserted-eval`, `object-boundary`, `ranke-backwards` use `end1 ?? subject` fallbacks; every note-level read (`hl.foldHyperlexicon`, `foldWithStanding`, `hear`) is the hyperlexicon's own SVO face (`toSVO`, kernel/notes.js); `complicated-reading` reads the ADAPTER's triples (`adapters/text/relations.js::extractRelations` still returns `subject`); `crosslingual-eval` reads the legacy host; the synthetic drivers (`falsification-probe`, `premise-levels`, `derivation-precision`, `contest-ladder`, `pruning-timeline`, the kinds pipelines) build their own SVO material. Three read the wiped names off organ output and were wrong silently: `mine-1-official-graph` (`built.edges` — every node in its export would be `undefined`; re-run after the seam: 105 essays, 7,408 nodes, 3,873 edges, 0 graph-empty; the committed export predates the wipe and is left as its dated record), `try-grid-on-transcript` (`reader.edges` — `e.subject.toLowerCase()` threw on the first edge), `material-dialogue-stress` (`relationReport.claims` — every crown candidate skipped as "empty subject/verb/object after sanitizing", and `relationClaims` recorded as three `undefined`s per claim). Each migrated at ONE seam, the `sae` shape S64 introduced, and nowhere else.

**Item 4.** `asserted-eval.mjs` prints `armed at N draws` to stdout and the elapsed seconds to stderr; `results/asserted-eval.md` regenerated and diffs to zero against the previous run's numbers. **Item 2, the flag half.** `lib/borodino-ledger.mjs` no longer accepts `BOUNDED`: P80 removed `boundedObjects` from the reader and the flag had selected nothing since 2026-09-02 while reading as a lever; the referent-aware trim `object-boundary-RESULTS.md` pointed at is capability work, still named there. `objectBoundaryFrom` is no longer imported by the ledger builder.

**Suites.** native 619 / 618 / 1 todo before and after; organs 449 / 449. No organ changed; every edit is in `eval/the-fold/`.

## S67 — The product assay: the finish line as a lib, a driver and a test; `foldDerived` projects `restsOn`

**Generality:** universal for the rule (a product bar is a runnable object; its zero-call walls are read by a test; a breached wall carries its mechanism and is logged, not pinned) and for the two mechanisms (P43's negation inversion and the sub-floor `tokensShare` object match replay on any English prose the production reader is handed); every count is the built corpus's own and dated. The-fold **P97** is the paired entry.

**Files.** `eval/the-fold/lib/product-assay.mjs` (CORPUS, CORPUS_SHUFFLED, QUESTIONS, FABRICATIONS, GIVER, `runProductAssay`, `constitutionIdentity`), `eval/the-fold/product-assay.mjs` (prints; `MODEL=`/`MODELS=` spends declared calls through the-fold's `runHolonicTask`), `tests/product-assay.test.js` (ten earned walls asserted, two disclosed walls logged with mechanism, by-construction numbers pinned: 2 passages, 6 notes, 1 derived with a giver and 0 without, 1 contest landed with no leak, 1 exposed and 1 withdrawn), `results/product-assay-RESULTS.md` (dated transcription + the one model run), `organs/derivation.js` (`foldDerived` now projects `restsOn`).

**The reader, headless, in production configuration.** `RELATION_READER_OPTIONS` is the app's object key for key — POS prior, UniMorph verb forms as `verbForms` and `oovLexicon`, `nounPhraseSubjects`, `phrasalPredicates`, `attestedVerbs`, the morphology-prior lemmatizer, received determiners and negation words, `blankLabelRows`, `resolvePronouns` — and the frame is derived from it by the-fold's `reader-frame.js` (P96), with `connectorLens: null` declared (the browser builds it from a fetch; the door's gate does not run here, its own disclosed behaviour). The grid is built as app.js builds it (native `cube.js` operators, native task-log).

**Walls, first run.** 0 configuration · 1 addressed (21/21 spans, source coordinates) · 2 stated-once · 3 derivation (after the projection fix) · 3b derived-in-record · 4a contest-detected **BREACHED** · 4b contest-recorded · 4c contest-in-record · 5 deterministic (0 of 6 claim ids shared with the deranged corpus) · 6 fabrication **BREACHED** (1 of 4 bound) · 7 derived-not-material · 8 recourse (entries 10 → 12).

**4a, the mechanism.** "The Northgate Observatory never opened in 1889" enters the ledger as `never opened`, polarity `-` (DR5 folds the adverb into the act). The draft "The Northgate Observatory opened in 1889" against that source: the act `opened` never meets `never opened`, so the read is `unbound`, not `contradicted`; `perSourceReadings` maps only `contradicted` to `refused`; `mergeTestimony` reads holds + undetermined → SINGLE. With DR5 off the same sentence reads `did`/`not …` — P43's inverted shape — and the draft is `unheard`. There is no configuration of the shipped reader under which a negated statement produces `contradicted`, so the DISAGREE case of `mergeTestimony` is unreachable from prose negation; the only live path to a contest is a model witness.

**6, the mechanism.** Below `CORPUS_MINIMUM` the object side of `endpointsMatch` falls to `tokensShare`, where one shared token binds (hypergraph.js's own disclosed fallback, kept because the type-level `commonTerms` measure refuses itself at turn scale). "the Royal Society in 1887" ⊃ `in 1887` ⊂ "the Northgate Observatory in 1887" → bound. Every live turn's retrieved passages are sub-floor.

**Not done here.** Neither mechanism is repaired: both sit at the draft checker and are Pass 19's walls, where the mouth is handed the record and its draft is checked against the record's claims rather than re-read against passages. The assay is the instrument that will say when they hold.

**Suites.** native 619 → 626 tests, 618 → 625 pass, 1 todo; organs 449 / 449.

## S68 — Object specificity at the judge, and the model-swap diff: the record is model-independent, the mouth's additions are counted

**Generality:** universal for the two rules (with `objectSpecificity` a claim binds only to an edge whose object states every content token of the claim's object, stem-tolerant, else `unbound` with the nearest edges named; the thing a model swap compares is the AnswerRecord — the record-backed claim set and the count of claims nothing backs — never the prose); every count is the built corpus's own and dated. The-fold **P100** is the paired entry.

**Object specificity** (`organs/hypergraph.js`, opt-in, declared by construction in the reader's frame): P36's rule, which `capacity-runner.js::checkObjectSpecificity` applied only on the `/act evaluate` path, moved into `judge()`'s bound branch so every consumer of the reader inherits it — the draft checker, the arrival read, the assay. Below `CORPUS_MINIMUM` the object match was `tokensShare` alone and one shared token bound: "the Royal Society in 1887" to "the Northgate Observatory in 1887" on `in 1887`. With the option on, the product assay's wall 6 holds — **4/4 fabricated drafts refused** — while walls 1, 2 and 5 hold unchanged (21/21 true spans still bind, the stated-once note still reaches the record, the deranged corpus still shares 0 claim ids). Default off: 626/625/1 todo, organs 449/449 byte-identical.

**The model-swap diff** (`eval/the-fold/model-swap-diff.mjs`, results doc beside it): the real `runHolonicTask` with the production reader and a ledger read on arrival, gemma2:2b (14 calls, 74 s) against llama3.2:latest (24 calls, 219 s) on the three assay questions. Nothing-backs = 0 held for **neither** model; record-backed sets identical on **0/3**. The bar is restated in P100 rather than tuned toward.

**Files.** `organs/hypergraph.js` (`objectSpecificity`), `eval/the-fold/lib/product-assay.mjs` (enables it), `eval/the-fold/model-swap-diff.mjs` (new), `results/model-swap-diff-RESULTS.md` (new, dated).


## S69 — The cut: a denial is a SEG note apart from the link it denies; the contest lands at the door; negation is tracked through time

**Generality:** universal for the three rules (a denial is heard as a SEG·Figure cut with the link's ends and never its id, so a denying source is never a witness of the link it denies; a cut meeting its link, in either order, lands CON·Figure·CONTESTED at the door with the denying bytes as decider, never a verdict and never a second link; every act that touches a claim — link, cut, contest, settlement, concession — is an event with a seq, projected in order by `negationTimeline`, never a state read off the present fold). The negation fold at the reader is English-tagged (`organs.negationWords`, `lang/en`; the aux + "not" shape and the leading adverb shape). Counts are the built corpus's own and dated. The-fold **P104** is the paired entry; `docs/THE-NULL-STATES.md` is the nomination this implements.

**The failure it closes.** S67's wall 4a: "never opened in 1889" entered the ledger as `never opened` polarity `-`, the draft "opened in 1889" read `unbound`, and the only live path to a contest was a model witness. The first repair — fold the negation at the reader so the act is `opened` with polarity `-` — made it worse: the denial was then admitted as a WITNESS of the link, and the dispute at the door was refused `source_already_witnesses`. A link with a minus sign is not a second reading of the link; it is a different act (THE-NULL-STATES: SEG·Figure was the empty cell).

**What ships.** `organs/hypergraph.js::foldNegation(t)` after `negationLed`: "never X" folds to act X polarity `-`; aux + "not" + V folds to V polarity `-`; applied to material triples and to the claim side alike. `kernel/notes.js`: `hear(…, cut)` births `cut:<noteId>` as `SEG` (description "denied: …", entry `cut: true`, `because` = the decider the face read); `admit` maps `polarity: "-"` to a cut, carries `decider` (set by the face — the kernel never reads a medium's own field, the OMNIMODAL pin still holds), and when a cut meets its link on the same log lands `dispute(link, {source, because: decider, span, kind: contest})`; `fold` excludes cuts, `foldCuts` projects them with `heardAt`; `negationTimeline(log, linkId)` projects link / cut / contest / settled / conceded events with their seqs and a `standing` for each of the three. `organs/hyperlexicon.js` passes `polarity` and `decider` through the door and exports `foldCuts`, `negationTimeline`, `isCutId`, `CUT_PREFIX`. the-fold's `read-on-arrival.js` maps `polarity` on every admitted edge.

**Measured.** Product assay: **12/12 walls held** (was 10 + 2 breached at S67, 11 at S68). Wall 4b: one CON·Figure·CONTESTED on the record, kind contest, decider the denying source's own bytes, landed at the door and not doubled by the spine; leak assay byte-identical; derivation reports the contested premise. The by-construction pins moved for the reason the design says: 6 notes → **5 links + 1 cut**; the deranged corpus yields 6 links (the deranged object no longer pairs the cut with a link) against 5 real, 0 shared.

**Through time.** A cut, a link and their contest are never read off the present fold alone. `negationTimeline` is the reading: heard-at seqs on both, the contest's seq and settlement, the concession's seq and trigger; a conceded cut leaves `foldCuts` and stays in the timeline with its concession after it. This is the shape the void will take (DEF·Ground, the other empty cell): a declared emptiness over an extent is an event with a cursor, re-zeroed by one arrival — another event — and its timeline is readable at any cursor. Not built here; the design is THE-NULL-STATES' own and the timeline function is its template.

**Not done.** The void object; a derived sentence's own ground mark; the live page has not yet produced a contest through the arrival read (the assay proves the door; the page is the next run). The witness tier's `contradicted` verdict on prose still does not fire (S67's other half); the door no longer needs it for a stated denial.

**Suites.** native 629 tests / 628 pass / 1 todo (BECOMING); organs 449 / 449; `tests/notes.test.js` 23 (four new: the cut apart from the link; the contest at the door in either order; a cut is never a witness; the timeline); `tests/product-assay.test.js` 7/7 with the moved pins.

## S70 — The void: a declared emptiness with its scope, re-zeroed by one arrival, tracked through time

**Generality:** universal for the rules (a void names its scope or is refused; a void over an extent the reader has not finished is a fact about the reader — `reached: false` — never a finding about the material; a void is an EVENT with a seq, cancelled by one arrival landed as REC·Ground with the filling named, and `voidTimeline` reads declared / redeclared / filled / conceded in order; a denial never fills a void; a void never convicts and never enters the link fold; the mouth relays a declared void and never declares one). The-fold **P105** is the paired entry; `docs/THE-NULL-STATES.md` (DEF·Ground, the second empty cell) the nomination; the user's standing instruction the reason: *"remember to track negation and void through time."*

**What ships.** `kernel/notes.js`: `declareVoid(log, {end1, label, end2?, scope, because})` → `void:<noteId>` as DEF·Ground (`no_scope` without sources / cursor / extent; `not_empty` where a live link already fills the ends; a second declaration supersedes, a new event); `foldVoids` (live: not filled since last declared, not conceded; `reached` read off `scope.read >= scope.total`); the door re-zeros every live void a heard LINK fills (`admit` returns `rezeroed`; cuts never fill); `rezeroVoid(log, id, {by, witness})` for a filling a face's own organ found (`no_filling` / `no_open_void`); `concede` works on a void; `voidTimeline(log, id)`. The face (`organs/hyperlexicon.js`) speaks SVO for all of it. Product assay **wall 9, void-through-time: 13/13 walls held** — no-scope refused, unread extent `reached: false`, declared open before the mouth, one arrival ("The Northgate Observatory closed in 1950.") re-zeroed it at the door, timeline `declared → filled`.

**Suites.** native 631 → 633 tests (`notes.test.js` 26); organs 449 / 449; `product-assay.test.js` 8/8.

## S71 — Re-zero under a stream: a void fills at the first stating arrival, never at a denial; the open set is order-invariant, the cursors are not

**Generality:** universal for the rules (voids declared before reading are events with cursors; the fill cursor is order-dependent and the final open set order-invariant; a denial never fills; a void still open when the search reached the end is a finding, and one left by a truncated read is a fact about the reader) — pinned on the built corpus; counts are its own. The-fold NEXT-PASSES Pass 24 is the plan entry; `results/void-rezero-stream-RESULTS.md` the transcription; `tests/void-rezero-stream.test.js` the enforcement.

**Files.** `eval/the-fold/lib/void-rezero-stream.mjs` (`streamOf`, `VOIDS_BEFORE_READING`, `shuffled`, `runStream`, `runVoidRezeroStream`), the driver, the test. `lib/product-assay.mjs` exports `organs` and `readCorpus` for its siblings.

**Numbers.** Forward: filled@3 / @4 / @3, `closed-never` open reached true (7/7), cut at 6 filled nothing; denial-first: cut@1, exact void filled@4; 20 shuffles: one open set, 5 distinct cursors per filled void; truncated at 2: all open, reached false; deranged: a different fill set.

## S72 — Settlement by arrival: a third source corroborates or leads, never settles; only a recorded settlement closes a contest; the seeker is blind to numeric ends under its default featurizer

**Generality:** universal for the rules (a restating third source raises the standing and leaves the contest open — P89; a silent one is no candidate; a co-present one is a candidate and never a landing; a source that already spoke is never a candidate; `settleDispute` alone settles, with outcome and trigger, and `negationTimeline` reads link → cut → contest → settled (→ conceded)); the numeric-end finding is about the default `textFeatures` and holds for any note whose end is a bare numeral. The-fold NEXT-PASSES Pass 27 is the plan entry; `results/settlement-by-arrival-RESULTS.md` the transcription; `tests/settlement-by-arrival.test.js` the enforcement (5 tests). Files: `eval/the-fold/lib/settlement-by-arrival.mjs`, the driver.

## S73 — The mouth's absence leak, one question, two mouths: the void tier in the prompt turns a dodge into a stated gap and cuts a fabrication

**Generality:** not-applicable (a dated model arm — one question, two small models, one run; `results/absence-leak-RESULTS.md` carries the table). Two measure findings are universal and shipped: absences are witness-refused sentences only (the-fold P106 amended — the instrument's own finding strings are not the mouth's sentences), and `voidInScope` matches the label exactly, so an act-labelled void misses a slot-shaped absence until the label is folded through morphology (named, not done). Driver `eval/the-fold/absence-leak.mjs` binds the sentence witness as app.js does.

## S74 — an alias is declared by the material; the fold researches, the model points

**Generality:** universal.

Two things landed together, from one live research walk on a real subject
this project had never read (`eval/the-fold/civic-research-walk.mjs`, a
generic driver; the pilot subject — a local nonprofit and the city
government that funds it — is deliberately not named here: see the
amendment below for why nothing about a specific research subject is kept
in this repo at all).

### The organ: `organs/aliases.js`

`surfaces.js::namesCorefer` folds a name shortened by DROPPING WORDS and,
measured, does not fold one shortened by INITIALS — an organisation's real
initialism did not fold to its own full name. The patch that suggests
itself, deriving an initialism and comparing it, is refused on this
project's standing grounds: a rule that DERIVES a name can INVENT one.

Prose declares its own short forms, at addresses. `declaredAliases` reads
them, and the shapes it reads with are RECEIVED — `live_priors` measured
which shapes English prose actually uses (LP15, `AliasDeclarationPrior@1`;
the parenthetical fires 23,375 times at 0.478 confirmed, every connective
phrase in single digits or never). This organ holds no declaration
vocabulary of its own, both floors are the caller's, every admitted gloss is
walled against the material's own USE of it (`minUses`, giver: the
structural minimum 2 this project uses wherever recurrence has to mean
anything), and the declaring sentence's byte span is re-read before an alias
ships (P5.2). **An acronym is one subtype of alias and needs no rule of its
own; nothing here knows what an acronym is.**

Verified live: reading its first pages, the walk learned two of the
subject's own short forms directly from the material's own glosses, each
citing the sentence that taught it. 11 conformance cases against the REAL
prior, no fixture written for them (rewritten 2026-09-05 to use synthetic
organisations — see the amendment below).

### The walk, and six defects it exposed

The driver is the fold researching: `preflightQuery` derives the opening
search, then `proofQuery(claimOfNote(n))` over the ledger's own thin notes
and `preflightQuery(name, TASK)` over the names its own reading named, in
rounds. Reading, snipping, standing and the prose are all mechanical —
`crown.js`/`compose.js` render model-free, and the model's entire authority
is the select protocol. Measured: 91 calls, every one an index-pick, nothing
it wrote in the document.

Each of these is a general lesson about running this class of task, found
by running it, not by reasoning about it, and each is fixed in the process
rather than in the output:

1. An aggregator's recirculation furniture became notes, and the expansion
   spent several fetches chasing an unrelated site the aggregator merely
   linked to. → a declared anchor floor that gates SPENDING and ordering,
   never admission.
2. A search every face refused was cached as `[]`, making "the upstream
   refused us" indistinguishable from "the web has nothing" for every later
   run. → a refusal is never cached as an answer.
3. A feed answers a STRING; the fold asked a QUESTION. Asked for a second
   source on a real funding vote naming a real board member, it was offered
   an unrelated business, an unrelated technical topic sharing the member's
   surname, and a distant, unrelated public figure. → a result must carry
   the question's own content words before it earns a fetch.
4. A generic encyclopedia article on the subject's own common-noun category
   (the kind of body it is, not the body itself) shared several words with
   the question and would have swamped the ledger with propositions about
   nothing in particular. → a page that never NAMES the subject is kept,
   addressable, and not read. Word overlap cannot tell a named organisation
   from a common noun.
5. A warm search cache made the whole expansion no-op — the code skipped a
   query because it was cached, rather than reusing the cached results. → the
   cache prevents a re-fetch, not a re-read.
6. The composition accepted only containment-found spans, so the
   corroboration walk's attestations — the paraphrase evidence the walk is
   SPENT to get — were silently discarded and §3.1 read "none" while several
   notes had reached two sources. → a reading counts whether its evidence
   was found by containment or attested by the witness, and says which.

One heuristic was REFUTED by measurement before it shipped: median sentence
length does not separate an index page from an article (a real news article
measured 3, a section front 9). It was dropped rather than tuned.

### Disclosed

**The control, three times, and what it finally said.** The first redealt
control (II.23) rotated each object to the next note's and spent 0 asks —
every rotated proposition was refused by the mechanical co-presence gate
before the model was consulted: a result about the gate, no test of the
model. The second kept each subject and drew a DIFFERENT object that
genuinely co-occurs with it in the read pages (`endsCopresentWindow`, the
walk's own gate) — and still spent 0 asks, because the door refused every
edge as `unaddressed`: the ledger's own wall, right to insist, and the
reason the arm was silently empty. The third carries the co-presence
window itself as each false proposition's address — a real span of a real
page, the place a careless reader would look — and reached the model.

**It attested 6 of 89 (0.067 per ask) against the real arm's 6 of 74
(0.081).** By II.23's own reading, a control that attests at the real arm's
rate means the walk is measuring topic overlap, and the document's §3.1
("stated by more than one source") may not be read as corroboration on
this material. The document says so in its own §5. What the run did NOT
yet print is WHICH six false propositions were attested — a swap that
happens to produce a true statement is a leaky control, not a fooled
model — and that inspection was the named next step before either reading
could be trusted. **Built in the amendment below.**

`web.archive.org`'s replay path answers 403 to this environment even for
URLs its own availability API reports as archived, so several large local
outlets (403/429) were absent from the ledger on the pilot run. That is a
fact about a run's reach in this environment, and the output says so.

### Amended 2026-09-05 — de-identified: no research subject preserved, only the lessons

**Generality:** universal.

Direct user instruction: *"i dont want you to preserve any content specific
to this research on nashville in the repos, only preserve the lessons we
learned about how we need to run tasks like this."* Every proper noun
naming the pilot subject, its funders, its officials, or any fact about it
is removed from every file in this repository and its sibling repos —
`organs/aliases.js`'s doc comments and `aliases.test.mjs`'s fixtures now
use synthetic organisations invented for the tests alone (a "Regional
Transit Authority", a "Central Zoning Board", a "Riverside Housing Trust",
a "County Commission" — none real); the driver itself was renamed from a
subject-bearing filename to `civic-research-walk.mjs` and rewritten to
require `TASK` with **no default** — a driver that ships with a subject
baked in is carrying research content, not a template, so a bare
invocation now refuses rather than quietly re-running whatever it was last
pointed at. What is preserved, per the same instruction, is everything
this pass actually learned about HOW to run a task like this — the
findings above (both defects and the control's own reading) are kept in
full, because they are facts about the MECHANISM's measured behavior, not
facts about the pilot subject: a call count, an attestation rate, or "a
generic encyclopedia article can swamp a ledger with off-subject
propositions" reveals nothing about who or what was investigated.

This amendment also folds in three further user directions from the same
session, acted on together before the walk is ever run again.

**On saving:** *"priors are only so the reader doesn't start fresh. but it
shouldn't be saving these test documents."* A PRIOR is a measured artifact
of a permanent corpus (LP15's alias-declaration shapes, over live_priors)
that exists precisely so a reader does not start cold on every run — it
stays. A TEST DOCUMENT is one run's own fetched material and its own
produced reading, naming a real, specific, living subject — it does not
stay, ever, in this repo. `.gitignore` covers any `*-READING.md` this
driver shape produces; the earlier pilot's own reading and its 7.5MB
fetched-page cache were untracked from git and deleted from local disk,
both regenerable by re-running the driver, neither belonging here.

**On discovery over seeding:** a companion plan draft (the-fold's own
NEXT-PASSES.md) had proposed hand-declaring which document CLASSES matter
for a subject (a legislative record, a financial filing, an audit) as seed
sources, naming specific real government and nonprofit-filing websites.
Refused directly by the user: *"im not telling you the answer, it should
discover that."* Checked against the driver itself first, and it already
held the line: no document, site, or record class has ever been named in
this file — the fold derives every query from the declared TASK and its
own reading (the subject's own names, the ledger's own thin notes), and
`TASK` is the one required, human-set line. The refusal generalizes: **a
reader may be told what is being asked; it may not be told where to
look.** Discovery is not merely cheaper than seeding — a hand-picked
source list is exactly the kind of authority the read-frankenstein
register already distrusts on the noun side (L2's capitalisation veto, the
cube refused as a content classifier); this is the same distrust on the
corpus side.

**On where the next run happens:** *"prep this and we'll run locally."*
Confirmed for starting the next lever too — "same answer." Nothing was
executed on any real subject this pass; the ground for a local run was
built instead: portable sibling-repo paths (`THE_FOLD_DIR`/
`LIVE_PRIORS_DIR`/`ALIAS_PRIOR` env overrides replacing three absolute
imports, defaulting to the sibling-checkout layout this project already
develops under), a `CHECK=1` preflight — sibling files found, Ollama
reachable, the declared model pulled — that exits before any search,
fetch, or model call is spent (a real bug in its first draft, an `||` in
the exit-code branch that made a FAILED check under `CHECK=1` exit 0, was
caught by testing the failure path deliberately, not assumed passing
because the success path worked), and a header comment rewritten as the
run instructions in full.

**S62's own two selectors are now a declared runtime choice, not only a
measurement.** `corroboration.js::facesReachable` is the referent-face
selector S62 measured separating (p≈0.048) where literal co-presence does
not (p≈0.905), extracted from where it was first built
(`ordered-read-reach.mjs`'s Arm B) into a reusable, tested organ rather
than re-derived per driver — the same asymmetry it was measured with is
kept exactly (a resolved face required on the subject side, a literal
fallback kept on the object side, because an object is frequently a bare
description with no face to resolve and narrowing recall there was never
measured). `corroborateLedger` takes an optional `reachable(sourceRef,
ends)` that REPLACES the co-presence admission decision when supplied —
never ANDs with it, because ANDing a measured-noisy gate onto a
measured-separating one would silently suppress exactly the recall the
better selector exists to recover. `SELECTOR=referent-face` wires it into
BOTH walk arms identically, via a per-page carry of each bound edge's own
`end1Face`/`end2Face` alongside its raw text. `candidatePairs` is added to
the walk's return (S60: read the wall at zero calls) so a run can report
how many pairs were even proposed before either prefilter had a chance to
refuse one.

**The named-but-unbuilt inspection from the pilot run — which six control
propositions were attested, and whether the swap is leaky — is built.**
Every attested control proposition is now printed with its subject, label,
swapped object, the address the witness pointed at, and a mechanical check
against the REAL ledger: does it already join the same subject to the same
swapped object under ANY label. A swap the material also independently
states convicts the control's OWN construction (its no-shared-content-word
rule did not guarantee no-shared-fact), not the model; only a genuinely
false attested swap bears on whether the model can be fooled, and the
reading now says which is which rather than reporting a bare rate.

**Tests.** Two new cases in `corroboration.test.mjs`: `facesReachable`'s
asymmetric behavior (both faces resolve; object falls back to raw; subject
has no fallback and refuses; no edges refuses), and `corroborateLedger`'s
`reachable` override actually replacing the admission decision in both
directions (opening a pair co-presence would refuse; closing one it would
admit) — proving it is a replacement, not a widening. `aliases.test.mjs`'s
11 cases were rewritten onto synthetic organisations, same semantics,
still passing. Full organs suite: 437/449, the same 11 pre-existing
failures confirmed identical by name via `git stash` (all in
`grammar-lens.js`/`frame.js`, unrelated to this change), zero regressions.
The driver's `CHECK=1`, its TASK-required refusal, and a zero-budget
`OFFLINE=1` smoke run against a synthetic subject were all verified end to
end against this worktree's real Ollama before committing.

**Not yet run.** No research walk was executed on any real subject in this
container, this pass or the last. The next run happens on the user's own
machine, against their own material. What ships here is the ground for
that run and the general lessons a pilot already taught it — nothing about
who or what the pilot was.

## S75 — A census of nulls through time: a draft's null changes TYPE as the read advances, and every closing cursor is the arrival of the thing

**Generality:** universal for the rules (a not-yet-stated draft reads `unheard` while its verb is unread and `bound` at exactly the cursor its passage arrives — the null composes downward from the unread extent, and its TYPE is a fact about how far the read got; a fabrication is `unbound` from the cursor its verb is heard; a derived-only sentence is `unbound` at the reader from the cursor its verb arrives and derived on the record from the cursor its second premise lands — the third ground, P102, on a timeline; the cut and its contest land at one cursor; a shuffled order moves every closing cursor and no final census; a truncated read is typed by `unread > 0`, never as findings) — pinned on the built corpus; counts are its own. The-fold NEXT-PASSES Pass 26 is the plan entry; `results/null-census-RESULTS.md` the transcription; `tests/null-census.test.js` the enforcement (4 tests). Files: `eval/the-fold/lib/null-census.mjs`, the driver.

**Numbers.** Forward: founded bound@1 (stated@1), opened unheard@1 → bound@3 (stated@3), repaired unheard@1 → bound@4 (stated@4); bakery unbound@1 and comets unheard@1 to the end; derivedOnly unheard@1 → unbound@2, derived@5; cut@6 = contest@6; final census unread 0, cuts 1, contests 1, derived 1. Truncated at 2: unread 5, opened/repaired still unheard, 0 contests, 0 derived. 12 shuffles: one census; 5–6 distinct closing cursors per stated draft, 5 distinct contest cursors.

**What it says.** THE-NULL-STATES law 5 holds as measured: the same draft wears `unheard`, then `bound`, and which it wears is decided by the cursor, not by the draft. A reader that reports `unheard` without its `unread_extent` beside it has reported a verdict wearing a count.

**Amended same day — `fillingsSince(log, seq)`.** The re-zeros landed at or after a caller's cursor, so a turn can ask what moved its ground since it began (the-fold P109 consumes it: a filled void forces the summary refresh). Pinned in `notes.test.js` (27).

## S76 — The perceivers beyond text take their seat: audio, image and video crossed under parity; the measuring door reads decoded media as each medium's own series

**Generality:** universal for the crossing rule (a perceiver crosses from the frozen provider only under a parity test over the same decoded material — the ratchet morphology-parity.test.mjs already runs); specimen-scoped for the fixtures.

`native/adapters/audio/` now holds the frozen 6.1 field perceiver (reading.js and its six helpers) and eoreader6's pure `reduce.js` (rms, flux, locate) with `material.js` re-exporting it and decoding through ffmpeg; `native/adapters/image/material.js` reads scanline luminance, `native/adapters/video/material.js` motion energy per transition, both ffmpeg-decoded and disclosed as such. `conformance/media-perceiver-parity.test.mjs` 4/4 against the frozen provider on `eval/the-fold/fixtures/media/`.

`organs/measure.js::seriesFromMedia` accepts decoded media — `{kind:"image", buf, w, h}`, `{kind:"video", frames, w, h, fps}`, `{kind:"pcm", samples, sampleRate, container}` — beside bytes; `reduce` may be `{audio, image, video}`; a decoded image or video frames in scanlines or transitions (floor 1), PCM and bytes in samples (floor 2, as before). `probeMaterial` teaches each decoded medium its one channel and names the node-side decoder for an undecoded container (`DECODABLE`). `tests/measure-media.test.js` 5/5; the-fold `measure.test.mjs` 51/51 unchanged.

The essay's next step — a line of reading out of a frame (extents, fillers, eliminations over the perceiver's units) — is named, not built. `eval/the-fold/lib/frontier-25.mjs` carries the five media declarations (the-fold P115) and the twenty-five tasks; `tests/frontier-25.test.js` reads the zero-call arm.

## S77 — The long-stream stress: six kinds of large material, a chat of N turns through the real turn, a probe every fifth turn scored with no model (2026-09-05)

**Generality:** universal for the rules (the bank is read off the material with no model; a probe is scored by whether an atom appears, never by a model's opinion; the ledger is threaded and the recency window is the app's own; a failed turn does not advance the transcript; the configuration is printed first). Specimen-scoped for every number a run produces (pace, hit rates, drift) — dated results, none read by a test.

The driver `eval/the-fold/long-stream.mjs` attaches six files of six kinds (a novel, a Greek text, a markdown record, a source file, a JSON dump, a Wikipedia page rendered to text), runs `runHolonicTask` with the product reader configuration (`lib/product-assay.mjs::organs`, frame and recipe printed), threads the ledger and the grid across turns with the app's own recency window, and every fifth turn asks one of four probes built from a fact bank read off the material with no model: a cloze over a whole-token atom (recall), "what did you answer N turns ago" against the transcript's own atoms (memory, with the P122 contradiction check run against the earlier answer), a false premise with one atom moved (injection: held / both / evaded / capitulated), and two sources' exact difference (reasoning: right / partial / wrong). `lib/long-stream.mjs` is pure and read by `tests/long-stream.test.js` (six pins, one a control: an unrelated answer is not a hit). `long-stream-score.mjs` writes summary.md/json — recall by source kind, memory by distance, drift per 100 turns. The-fold records it as P124; the runbook is `eval/the-fold/LONG-STREAM-RUNBOOK.md`. Numbers: dated results, none read by a test (P94).

## S78 — The fold is a transient projection of the log: the tip is extended in place, transience is declared by the chain's owner, a superseded turn's fold is reconstructed on demand (2026-09-07)

**Generality:** universal for the mechanism (a forward delta stream retains nothing; ownership is declared, never inferred from an array; a state that has been superseded is read as the log's projection at its seq); specimen-scoped for every number in the-fold POLICIES.md **P166**, which carries the law and the measurements.

The kernel's memory work landed as the-fold **P157–P166** (eoreader7 commits d0e2e49 … 0bcb90d and this one) and is written up in `native/docs/THE-LOG-IS-THE-MEMORY.md`. The mechanism this entry names is in `kernel/fold.js`: `STREAM` (owned array → its newest delta node; nodes link forward; a view holds the node it last consumed), `own`/`advance`/`isOwned`, `tipOf(list, transient)` (the tip in place under a declared transience, a once-only owned copy of what the fold did not create, an unowned copy otherwise), `chainView` (folds forward from where it stood; a copy recomputes from scratch), and the `{ transient }` option threaded through `applyObservation`, `applyDelta`, `reconstruct` and `kernel/reading.js`'s step. The reader's turn carries `fold` as an accessor: the live tip while it is the tip, `reconstruct(log.slice(0, at), seed)` once superseded.

**What the gate is.** `native/eval/read-cost.mjs --identity` (log hash + node/link hashes at four cursors), `--trace --against <baseline>` (per-step graphEntries hashes; names the first diverging step; baselines captured from a clean worktree of the previous HEAD), and `tests/fold-transient.test.js` (array identity across 500 steps; a schema view returning the same array after a step; a counted compute across a copy; the pure default; the frozen-tip fallback; the superseded-turn accessor). **A timing is never the assertion** — a performance regression is invisible to every correctness check in this tree, so the invariant is pinned as structure.

**Kept copy-on-write on purpose:** `upsertById` (obligations, expectations, provisional, exclusions, alternatives, frames, priors) and `removeById` — `deriveRelease(delta, beforeFold, afterFold)` reads obligations before and after in the same step, and that question needs two arrays.

## S79 — The time term: profile two sizes, rank inclusive time by growth, fix the term whose share grows, gate every step byte-for-byte against the old code (2026-09-07)

**Generality:** universal for the method and the three mechanisms it produced (a layer over a persistent chain-view state for this sentence's extras; a view that swaps an update in place only for the fields it can name and recomputes otherwise; a fold step that applies appended before updated); specimen-scoped for every number, which the-fold POLICIES.md **P167** carries with the ladder.

The mechanism this entry names is spread over the reading's per-sentence path and is documented at each site: `adapters/text/discourse-referents.js` (`DiscourseState` persistent-or-layer, groups per root, the counted compute `discourseStats`), `adapters/text/recursive.js` (`surfaceIndex`/`surfacesIn`, exact to `containsSurface`), `adapters/text/individuation.js` (the maintained hypothesis list; `changedOnly` with `pending`), `kernel/fold.js` (`isNoop` — an update that changes nothing records nothing), `kernel/hypergraph.js` (same-object re-index skipped; `entries` lazy per graph), `adapters/text/relations.js` (the matcher per vocabulary), `kernel/identity.js` (`edgeIndex` by participant value, positions, canonicals; `extraEntries`; the counted build `identityStats`), `adapters/text/anchoring.js` (the cast per array), `adapters/text/identity-evidence.js` (live alternatives by first token), `adapters/text/surfaces.js` (per-call `normOf`/`individuating`).

**The gate is the method's own defect record.** `native/eval/read-cost.mjs --trace --against` a baseline captured from the old code in a clean worktree — 240 KB at every 25th step, 480 KB at every 50th — plus `--identity` at 60 KB. It refused two of this pass's own cuts before they landed (P167 tells both), and neither was visible to any test in `tests/`. Before claiming a term is closed here, run both differentials with a heap flag, one at a time, and count the computes (`discourseStats`, `identityStats`) rather than trusting the profile's absolute seconds, which are contended.

**Handed forward, not fixed:** anchoring's recall (the posting walk), the refresh's re-clustering (a reading change — P165's oscillation lives there), and the relation matcher's alternation.

## S80 — A referent's address is given at birth and kept across refreshes; the clustering's partition is untouched (2026-09-07)

**Generality:** universal for the mechanism (rename after clustering, never re-cluster; earliest-born address wins; a split keeps the address with the majority of its bearers; a merge of two prior addresses is testimony with a witness); specimen-scoped for the numbers in the-fold POLICIES.md **P168**.

`adapters/text/surfaces.js::discoverReferents(surfaces, { prior })` — `prior` is the previous refresh's `{ refs, born, next }`; the clustering runs unchanged and the clusters are then renamed; `addresses` is returned for the next refresh. `adapters/text/recursive.js::createCausalTextPerceiver({ addresses })` — `"birth"` (default) carries `born`/`bornNext` in its cache and hands `prior` over; `"founder"` is the reading as it was, kept for reproducibility. A merge of two prior beings comes back in `merges` with its own basis, and the perceiver's reassignment loop skips surfaces already covered by one.

**The gate is the partition invariant**, not the hashes: `tests/addresses-birth.test.js` proves clusters identical refresh by refresh on real material under both rules, with a rename asserted to have happened. The hashes moved by design (`read-cost.mjs` header, with the old values beside the new).

## S81 — A projection of the reading applies the reader's own evidence; a measured cut never offers the whole set; a higher holon bounds the material it was computed from (2026-09-07)

**Generality:** universal for the mechanism (the-fold `reading-log.js`, `resolutions.js::dmdCut/lensCut`, `activation-retrieval.js`; eoreader7 `eval/the-fold/conversation.mjs --reading constitutional`, `holograph-compression.mjs`); the counts are one novel's, transcribed from the compression driver, which refuses when the reading and the ledger are not in the checkout (S65).

> **giver:** earned-here — the-fold `6e74f0e`, `0d2cf4d`; eoreader7 `bed533e`

The holograph (`docs/THE-HOLOGRAPH.md` §7) is a pattern computed from the log, and a log written by a cheaper organ than the reader gives a compression of the wrong reading. Three laws this entry pins, each found by running the constitutional reader through a real conversation:

1. **The address book is a projection of the reader's log, and identity is the reader's.** `EOReferent@1`, `EOMention@1`, the feeders, the reader's own per-sentence surface matcher over its own referents' surfaces; a run resolves by its LONGEST registered surfaces (maximal munch — «Rodya Pyotr Petrovitch» is «Rodya» + «Pyotr Petrovitch», never also «Petrovitch»); fragments fold into beings only by recorded `EOReferentMerge@1` testimony and by the reader's coreference organ placing a partial form inside exactly ONE fuller being (S17 witnessed downward). A refresh address change is `EOReferentReassignment@1`, not a merge, and keeps both live addresses; a form inside two stays its own, counted. On Crime and Punishment: the address and being counts are measured from this distinction; the presence index (the-fold P38) remains separate.
2. **The whole set is never a candidate depth.** `dmdWindow` asked whether dropping everything beyond depth d changes the conclusion; a caller that lists the whole set among the depths gets agreement by construction. The ladder's rungs below the set are the candidates; when none reproduces the reach the kernel's own gap (`reach_exceeds_candidates`) is the finding and the ladder's top is handed as a declared budget named a ceiling — never "measured". A set within the declared lines with no rung below it is handed whole.
3. **A higher holon bounds the material it was computed from.** At a resolution that hands the Lens (the ledger's notes about the active referents, ranked by active referents carried, co-activation, standing, recurrence, cut at the act grain), the sentences handed are the ones that GROUND its shown acts (at the ceiling, the declared lines' acts); below it the sentences carry the full reach. Measured with no model on 13 activating questions: sentences 4,196 chars median at level 1 against 1,059 at level 3 with every grounding act grounded; the Lens 1,743 chars at its ceiling on 9 of 13; handed in all 2,772 against 4,196.

**Live, the same two turns through the real mouth** (gemma2:2b, the reading replayed): 1,928 and 2,107 prompt tokens a call against 10,573 and 7,381 before; 39 s and 88 s a turn against 335 and 340; window 8 measured, the Lens at its ceiling (24 of 74) and said so; both turns addressed.

**Control that failed as it should:** before law 2 the Lens handed 94 lines about one referent and the sentence window rode its 48-sentence ceiling on every question of three runs (windows 48, 48, 48 … in the rows), reported under a "measured" basis.

**Enforced:** the-fold `reading-log.test.mjs`, `resolutions.test.mjs`, `activation-retrieval.test.mjs`; eoreader7 `tests/conversation-compare.test.js`.

**Handed forward:** the page's read-on-arrival with the constitutional reader; an activation-ranked salience for the Lens at its ceiling with a redealt-cue null; diminutives and transliteration variants as received priors with givers (S39's posture); the reader's patronymic folding on Russian names (S38's class).

## S82 — A hyphen-joined run is one token of the relation matcher; a document is summarized by its ledger per grain, against a summary its authors wrote, with a null (2026-09-07)

**Generality:** universal for the token rule (`adapters/text/relations.js::W`) and for the driver's method (`eval/the-fold/document-holograph.mjs`: arms over the ledger's notes, k = the gold's own note count or the document's grounds, 200 seeded random draws as the null, the gold read by the same reader); specimen-scoped for the numbers, transcribed in `eval/the-fold/results/document-holograph-RESULTS.md` from two documents that come with an authored summary — a paper's abstract, a biography's lead — held out.

> **giver:** earned-here — this checkout, uncommitted

1. **The object crossed no hyphen.** `W` was `[\p{L}\p{N}_'’]+` and `OBJECT_GROUP` joins W tokens by whitespace only, so on the function-word-bound branch — the one any real pool takes — an object ended at the first hyphen, quote or dotted abbreviation: "experiments in X-ray imaging" → "experiments in X", "his steam-powered … generator" → "his steam", "a two-phased system" → "a two". The same sentences read whole under the `.+?` branch a five-sentence pool falls to (no function words), which is how it hid from every short-passage test. A run joined by U+002D/U+2010/U+2011 is one W; the joiner class is named, not `\p{Pd}` (en and em dashes stand between tokens, S50). Native suite 714/713/0 (one pre-existing TODO). Still cut, unchanged and named: a quoted object and a dotted abbreviation. The recipe id hashes the frame, not the reader's source — ledgers persisted before this read under the same id as ledgers read after it; re-read before comparing.

## S83 — A POS-vocabulary gate needs treebank-shaped attestation; a paradigm table cannot supply it (2026-09-08) — pointer

**Generality:** universal — UniMorph's silence on non-inflecting words is structural, not a coverage gap, so the finding holds for any language and any size of paradigm table. *(This field was missing and `conformance` refused the entry under S31; the value is taken verbatim from this entry's own second paragraph — "the finding, general beyond the five languages it was measured on" — not authored here. Added 2026-09-09 by the S95 pass, which found S83 uncommitted in the worktree and carried it in.)*

live_priors' POLICIES.md **LP16** is the full account; this is the pointer, kept short on purpose. Two new organs, both real and tested, neither the production fix: `native/scripts/build-pos-prior-from-unimorph.mjs` (a second `POSPrior@1` builder, reading UniMorph's inflectional paradigm tables instead of a UD treebank) and `native/organs/connector-witness.js` + its test (a witness/select-protocol alternative to a treebank gate, asking a small local model whether a candidate connector functions as a clause's predicate — P32's generate-and-arm shape, an exact binomial significance in place of a hand-picked pass bar). Both were built before checking whether this repo's own already-measured precedent applied ("a received prior beats induction, tested," the-fold CLAUDE.md's MINE-1 entry) — it did, and building either before checking was the mistake LP16 names in full.

**The finding, general beyond the five languages it was measured on:** UniMorph enumerates a lemma's own inflected forms and is structurally silent on anything that does not inflect — closed-class connectors (conjunctions, articles, most postpositions) are absent from it by construction, not by an oversight a bigger file would fix. `relations.js::discoverRelationVocab`'s own gate (`verbDominant = !attested ? (lexiconKnows !== false) : verbShare > 0.5`, line ~450) admits an unattested word by default — "a witness cannot refuse what it never saw" — so a resource that never attests a closed-class word can never gate one, however large it is. A UD treebank does not have this gap (it annotates every token of real running text, closed classes included) and is the resource this gate actually needs. The shipped fix is `build-pos-prior.mjs` — unmodified, already language-general — run against real UD treebanks for Greek/Turkish/Hebrew/Korean/Farsi. Turkish's own residual noise (agglutinative case-inflected nouns still slipping through) is the identical gate mechanism failing open on treebank-coverage sparsity rather than UniMorph's structural silence — a different scale of the same "cannot refuse what it never saw" shape, named open in LP16, not fixed here.

## S84 — the production reader's own organ factory was English-only with no parameter to say so; a real conversation over the Greek New Testament found it, and the holograph now has a second language's numbers (2026-09-08)

**Generality:** universal for the mechanism (a shared organs factory silently hardcoding one language is a class of bug, not a Greek-specific one); specimen-scoped for the compression numbers (one book, 12 turns).

live_priors' POLICIES.md LP16 carries the corpus-reading half of this session; this entry is the production-reader half, found chasing "get the New Testament working and chase the holograph of it" — the first time this repo's own `conversation.mjs`/`holograph-compression.mjs` pair has been pointed at anything but English prose.

**The bug, and why it is worse than a missing gate.** `eval/the-fold/lib/product-assay.mjs::organs()` — "the same production organs a live chat turn stands on," used by `conversation.mjs` and every driver built on it — hardcoded an English `POSPrior@1` AND an English UniMorph `verbForms` set with no language parameter anywhere. A first run over real Matthew prose (112,260 bytes, 81 chunks) admitted **0 heard**. The cause is not the ordinary "cannot refuse what it never saw" gap LP16/S83 already name: `discoverRelationVocab`'s `lexiconKnows = verbForms.has(token)` returns **false**, never `null`, for a Greek word absent from an English verb-form set — so `verbDominant = (lexiconKnows !== false)` is false for every single Greek connector. An English lexicon does not stay silent about a foreign word; it wrongly asserts "not a verb" for every one of them. Checked directly (a standalone `discoverRelationVocab` call, no posPrior at all) that the underlying candidate-discovery chain works fine on this text (42 sentences, 125 candidate surfaces, 19 referent events, 44 verb candidates including the real `δὲ`) — the block was entirely the English-hardcoded lexicon, not surface detection.

**The fix, additive.** `organs({ language = "eng" } = {})` — every existing caller (product-assay.test.js's 8 pinned cases, every other driver) is byte-identical, verified by running the suite unchanged. A non-English `language` loads `fixtures/pos-prior-<lang>.json` when present (`pos-prior-grc.json` built the same way as S83's five, from `UD_Ancient_Greek-PROIEL` — chosen over Modern Greek's `ell` because Koine's own bare particles carry polytonic diacritics modern orthography dropped in 1982, and because PROIEL's own corpus includes the Greek New Testament, the closest genre match this material has) and omits `verbForms`/`oovLexicon`/`createLemmatizer` entirely for anything but English — the safe default (never refuse what a gate was never built to judge), never a wrong one. `conversation.mjs` grew `--language` (default `eng`, recorded in the run's own `config.json` for provenance). Re-run: **154 heard** across the same 81 chunks, 0 code change beyond passing `--language grc`.

**The holograph, chased for real, and honestly not scale-matched to the standing English run.** `holograph-compression.mjs --run <the grc run>` — no refusal, no faked shape: 51 beings, 147 notes, 9 of 12 questions activated. Level 1 (raw sentences) sits at its 24-sentence ceiling on 8 of 9 activating questions, median 3,744 chars handed; level 3 (Lens + grounding sentences) hands a median of 687 chars — **18.3% of level 1**, a stronger compression ratio than the standing English run's own 56.3% (Crime and Punishment, 25 turns: median 2,412 of 4,287 chars) — with grounded share at 100% on both. **Not read as "Greek compresses better"**: this run is a twelfth the turn count and roughly a fortieth the note count of the English baseline, so a smaller Lens with less to draw from is the more likely explanation than anything language-specific, and nothing here licenses the stronger claim without a scale-matched run to actually test it against.

**Named, not attempted:** a scale-matched Greek run (more turns, a longer or multi-book source) before treating the 18.3%-vs-56.3% gap as a real cross-language finding rather than a scale artifact; the deeper clause-shape ceiling live_priors' own LP16 amendment measured on this same excerpt (76% of Greek edges are one repeated verb from Matthew's genealogy; real narrative verbs — ἀποκριθεὶς, βαπτισθεὶς, πληρῶσαι — confirmed absent from the admitted set) is untouched by this pass, which fixed the admission gate, not the extractor's own participial/quotation blind spot (A17/A19's own named, unattempted future work, on the English side too).

2. **The conversation holograph summarizes where a reader asked; the ledger can be asked whole.** Over the paper a 6-turn run surfaced 1 of the abstract's 5 claims and kept 3 beings of 29 candidates. Over the ledger alone, with no model and no question: the note read in the most places (`witness`) hands 3 of 5 in 4 lines (architecture, training efficiency, the 28.4 BLEU result), 29% of the abstract's content words at the 98th percentile of the null; at the document's own size (17 grounds) 63% of its ends and 47% of its words. On the biography the same arm sits at the 6th percentile — with one protagonist, end-degree is the most generic sentence about him — and coverage over WHO is named (`beings`) is the arm above the null (24% of the lead's words, 100th, z 2.6; 38% of its numerals, z 4.1). Position (`lead`) is at chance on the paper and the 0th percentile on the biography. A composite of both identities is above the null on both and visibly worse than the right arm on each.

3. **The summary is per grain, and the ledger says which grain it carries.** Where the notes carry beings (61 of 289 on the biography) a Ground block — who is named, coverage-cut — reads the material; where they carry none (1 of 29 on the paper) a Pattern block — what recurs — does; the count is on the reading before any arm runs. The cut with reach = the ends shown never converges (`dmd` 24▲ on every arm: each note is its own difference, S81 law 2's tautology); the document's grounds by the atmosphere's forward rule (beings, else ends at binding's floor) are the size a summary takes when no gold names one. No extractor crosses a synthesis: `triples` 0% on both documents — "fell into relative obscurity" is in no body sentence.

**Enforced:** `tests/relations.test.js` — the object crosses a hyphen under the function-word bound.

**Handed forward:** the novel (a 1.15 MB read through `relationsFor` with the book as pool did not finish; the driver needs the persisted-ledger path); a cut whose conclusion is coarser than the ends shown; the document holograph as `resolutionBlocks` with `active` drawn from the ledger's own grain instead of a question; `read-run.mjs` grouping notes by co-activation rather than by each referent's identity (the same five notes under four company names).

## S85 — A merge needs a witness against it too, not only for it: `refuteIdentity`, the pairwise twin of P79's kind gate (2026-09-08)

**Generality:** universal for the mechanism (reuses `kindMembership`'s own population-is-the-null contract unmodified, on real bytes); specimen-scoped for the synthetic father/daughter fixture used to demonstrate the failure mode it closes (no real corpus with a labelled false person/person merge was on hand this pass).

Prompted by an outside essay's own close reading of `fold-gate.js` ("The Holograph: its ancestry..."), which named the gap precisely: `reviewMerges`/`foldPermitted` (P79/Tier 4 #10) veto a merge only when its two sides read DIFFERENT declared-kind standings — real, and validated on Castle Dracula/Count Dracula (place vs. person), but structurally blind to a same-kind false merge (two persons, wrongly folded) because both sides read the identical kind verdict and `foldPermitted` permits by construction. "Sonia folds into her own father Marmeladov" (the-fold's own compliance-pass finding, POLICIES.md, referent-merge review) is exactly this shape and this gate cannot see it.

**The fix is not a new statistic.** `kindMembership(x, members, vecs, {alpha})` already asks "does x's company resemble the declared members' more than the population's does" — P79's validated population-is-the-null question. `refuteIdentity(a, b, vecs, {alpha})` asks the identical question with the OTHER side of a proposed merge standing in as a singleton kind (`kindMembership(a, [b], ...)` and symmetrically `kindMembership(b, [a], ...)`), so no kind needs declaring at all — the pair the merge already names IS the test. This is deliberately NOT the mechanism the-fold's own CLAUDE.md already refuted for word identity ("act identity by distributional company is DEAD" — raw cosine with no population, no null: `saw`/`wrote` 0.744 beat the genuine synonym pair `looked`/`gazed` 0.585). The difference is the same one that already separates P79 from its own refuted attempts: rank against a real population, never a bare threshold on raw similarity.

**Two typed verdicts either side of `undetermined`** (kind-standing's own withhold-vs-convict rule, applied here): `confirmed` (both sides read `member` of the other's singleton kind — no measured distinction survives), `refuted` (at least one side reads `not_member` — a real, population-null-surviving distinction separates them), `undetermined` (either side too thin a profile to test — absence is a fact about the reading, never evidence of a different being). `reviewIdentityMerges(passages, merges, {splitSentences, population, alpha})` is `reviewMerges`'s shape with no `kind` parameter, sorting every reported merge into exactly one bucket.

**Validated by its own controls**, the same discipline P79 states for itself: a synthetic father/daughter pair sharing a surname-shaped token but starkly different he/his-vs-she/her company is `refuted` (population of 9 other referents, alpha 0.1); a genuine single being under two non-overlapping surfaces (a name and an epithet, symmetric syntactic slots) is NOT refuted; a thin profile reads `undetermined`, never `refuted`. Two fixture defects were found and fixed building the positive control before it passed honestly, both disclosed in the test file's own comments: a surface pair where one string CONTAINS the other (`contextVectors` has no notion of nested matches, so the shorter surface's vector is contaminated by the longer phrase's own leading-token company) and a shared filler word ("and") used as connective tissue for every filler character, which manufactured spurious near-neighbors in the null population — both are real properties of the shipped organs, not something this pass patched, and avoiding them was the fixture's job, not the mechanism's.

**The flagship, on real bytes, no declared kind:** proposing Van Helsing and Renfield (two real, clearly distinct people) as one merge over the real Dracula text lands `refuted` or `undetermined` — never `confirmed` — with no kind declaration anywhere in the call, alongside the pre-existing Castle Dracula/Count Dracula kind-gate flagship, both passing.

**Files.** `native/organs/fold-gate.js` (`refuteIdentity`, `reviewIdentityMerges`, additive — `reviewMerges`/`REFUSALS` untouched) + `native/organs/fold-gate.test.mjs` (5 new cases plus the existing 3, all passing). `native/organs/index.js` re-exports both. Full native suite: 1219/1221 passing before and after (the one failure is S83's own pre-existing missing-Generality-line gap, unrelated).

**Handed forward, not attempted here:** wiring `reviewIdentityMerges` as a live caller against `EOReferentMerge@1` entries the way `reviewMerges` is documented as review-not-prevention for the kind case — this pass built and validated the organ, the same review-only posture, but did not thread it into any turn path; and re-running it against the REAL Crime and Punishment reading's own Sonia/Marmeladov merge once that reading is available in this checkout, rather than only the synthetic demonstration above.

**Amended 2026-09-08 — tried for real, and the real bug is a different shape than the one built above; caught, and a second, more serious finding follows it.**

Ran the mechanism against the real `pg2554_Crime-and-Punishment.txt` (900,000-byte slice, `extractSurfaces`/`discoverReferents` with production defaults) rather than only the synthetic demonstration. Two things followed, in order.

1. **`discoverReferents` reported ZERO merges on this slice, yet the Sonia/Marmeladov confusion is right there in `.events`.** Bare `Marmeladov` and `Mr Marmeladov` — the FATHER's own surname everywhere else in the text — land on `ref:auto:sofya_semyonovna_marmeladov`, the DAUGHTER's referent (founded by "Sofya Semyonovna Marmeladov", most-individuated-first). This is not a recorded merge event at all: it is the ORDINARY containment-based first assignment a bare surname gets, one level upstream of anything `reviewIdentityMerges` can see (that function can only examine what `discoverReferents` chose to LABEL a merge). `reviewReferentAssignments` (new, same file) closes this by grouping `discoverReferents`' own `.events` by `referent_id` and reviewing every surface in a group against the group's own anchor — no merge-bookkeeping dependency at all — and it DOES catch this specimen: `Marmeladov` and `Mr Marmeladov` read `refuted` against the group's anchor on the real text.

2. **The first anchor rule was itself wrong, measured wrong before being trusted.** Anchoring on the longest (most-individuated) surface — mirroring `discoverReferents`' own assignment-order convention — flagged `Sofya`, `Sofya Ivanovna` and `Sofya Semyonovna` as ALSO refuted against that anchor, alongside the real catch. Reading the raw vectors: the full ceremonial form "Sofya Semyonovna Marmeladov" occurs almost nowhere as its own exact phrase (4 total company mentions); bare "Sofya" carries 82, dominated by `after=semyonovna` (it is nearly always the LEADING word of a longer form, not a standalone use). The longest surface is reliably the sparsest one in real prose, not the most representative. Fixed by anchoring on MASS (the richest surface `contextVectors` actually has evidence for) instead of length — no new statistic, the same vectors read for what they already are.

3. **The mass fix did not fix the real problem, and this is the honest result, not a clean win.** Anchoring on mass correctly picks "Sofya" as the anchor and still catches `Marmeladov`/`Mr Marmeladov` — but ALSO now flags "Sofya Semyonovna Marmeladov" and "Sofya Semyonovna" as `refuted` against their own true anchor. Across the whole slice: **50 of 57 within-group comparisons read `refuted`, 0 read `undetermined`.** An 88% refute rate, with essentially no `undetermined` verdicts on a book whose vast majority of the 401 candidate surfaces are mentioned only a handful of times, is not a working gate — it is a mechanism systematically over-triggering, most likely because ±1-token company genuinely varies by which name FORM is used (formality, syntactic role) independent of who is meant, at the scale and sparsity a real book's population actually has — a much weaker signal for WITHIN-group same-being confirmation than it is for the coarser KIND-membership question P79 validated it on.

**Standing, stated plainly: `reviewReferentAssignments` is real, exercised on real bytes, and demonstrably catches the specimen it was built for — and it is NOT yet a trustworthy gate.** It should not be wired into anything that acts on its verdict (a display, a veto, a flag shown to a reader) until it is calibrated properly: precision and recall against a labelled set of real within-group pairs (true single-being variants) and real cross-group confusions (true false merges), across many referent groups, not eyeballed on one specimen. That calibration is the actual next step, named and not attempted here — this amendment is the measurement that shows it is necessary, not optional.

**Files, same as above** (`fold-gate.js`, `fold-gate.test.mjs`, `index.js`) plus `reviewReferentAssignments`, additive, same review-not-prevention posture. Full native suite unaffected (the synthetic fixtures in `fold-gate.test.mjs` still pass; no test currently pins the real-book false-positive rate, which is exactly the calibration gap this amendment names).

**Amended again, same day — the over-triggering is FIXED, and the cause was mine, not the statistic's.** The amendment above reported 50 of 57 within-group comparisons refuted and called for calibration before trusting anything. Two causes were hypothesised and measured in order; the first was wrong and is recorded as wrong.

1. **Sibling contamination — hypothesised, measured, REFUTED as the cause.** `kindMembership` derives its population from `vecs.keys()` minus the declared member, and the first cut passed the whole group into `contextVectors`, so a group's own siblings silently became null draws. The reasoning was sound and the direction of the predicted error was right; the effect was not there. Excluding them moved the rate from 50/57 to 49/57. Kept anyway (a sibling genuinely is not "other"), but named here as not the fix, so nobody re-derives it as one.

2. **The real cause: requiring BOTH directions.** `refuteIdentity` asked `kindMembership(a,[b])` AND `kindMembership(b,[a])` and confirmed only if both read `member`. Measured, per-direction, on the real text (267-referent population, alpha 0.1): `Sofya Semyonovna`→anchor `member` p=0.004, `Sofya Ivanovna`→anchor `member` p=0.037, `Marmeladov`→anchor `not_member` p=0.101, `Mr Marmeladov`→anchor `not_member` p=0.483 — **the candidate→anchor direction separates the daughter's true variants from her father's surname cleanly.** The anchor→candidate direction reads `not_member` on every one of those rows, true and false alike (p=0.322/0.367/0.363/0.382): a rich anchor tested against one thin variant's singleton kind is roughly equally unlike everything in a large population, so that direction carries no signal. ANDing a working test with a constant yields the constant. Symmetry was never `kindMembership`'s contract — its declared members are meant to be the well-evidenced reference set — and requiring it is structurally biased toward refusal whenever the two sides carry unequal evidence, which is nearly always true of name variants.

**After the directional fix, on the same slice: 34 refuted / 23 confirmed of 57** (from 50/7), with the specimen resolving correctly in BOTH directions — `Marmeladov` and `Mr Marmeladov` refuted, `Sofya Semyonovna` and `Sofya Ivanovna` confirmed. `fold-gate.test.mjs`'s real-bytes flagship now pins all four, plus that the gate neither refuses everything nor confirms everything.

**Stated before the run, per S83's own demand that a measurement declare what would mean it measured only itself:** a "fix" that flipped the rate to ~0% refuted would have meant the null had become trivially beatable (population too small or too dissimilar), not that the gate worked. It did not — it landed at 60%, with the known-good and known-bad rows separating.

**A third fix, found by the test suite rather than by reasoning:** moving `contextVectors` inside the per-candidate loop (to scope the population per comparison) re-scanned all 12,418 sentences per candidate and took the real-book test from 99s past 280s. `contextVectors` is a corpus scan and its result is one map whichever subset is asked for; the loop now SELECTS from a single pre-pass. 99s → 1.9s.

**Still open, named and not fixed:** `undetermined` is 0 of 57 on this slice. `kindMembership` only reports `unknown` when a candidate has no vector at all or the population is under two, so a surface mentioned ONCE still receives a confident verdict off one data point. A minimum-evidence floor (a declared mass below which the verdict is `undetermined` rather than either) is the obvious next thing and is not built here. The 60% rate is also still not calibrated against a labelled set — what changed is that the gate now demonstrably discriminates on the specimen it was built for, which it did not before; that is not the same as a measured precision.

**Amended a third time, same day — asked to show it improving recall and operating semantically, it does neither, and the flagship's pass is a weaker fact than it reads as.**

Two measurements, both with failure criteria declared before running.

**A. Semantic — half true, and the half that fails is fatal to the claim.** Under the shipped unmatched null on the real text: `Sonia ~ Sofya` **confirmed, p=0.038** — zero characters shared, one person, and no string matcher reaches that. Real semantic signal. But the controls: `Sonia ~ Razumihin` **confirmed p=0.004** and `Sonia ~ Dounia` **confirmed p=0.008** — two different characters, confirmed MORE strongly than the true pair. The verdict is not selective. What the statistic actually reads is that both surfaces are frequent, central names, because the population they must be "unusual against" is dominated by thin, rare ones. A frequency confound wearing identity's clothes — the same shape as the-fold's already-recorded refutation of distributional act-identity (`saw`/`wrote` 0.744 beating `looked`/`gazed` 0.585), reproduced here at referent grain.

**B. Recall — no improvement measured.** Splitting the merged Marmeladov node by the gate's own verdicts, scored by an oracle independent of the gate's input (gendered markers in the sentence, never ±1-token company): the merged pool reads 73.5% majority purity (25 masc / 9 fem of 34 unambiguous); the confirmed-with-anchor bucket reads **58.3%**, and the refuted bucket **72.7%**. Both still read masculine. The split did not clean anything up. Declared in advance that buckets no cleaner than the pool would mean it bought nothing; they are not cleaner.

**One hypothesis tested and refuted along the way:** that the discrimination was carried by sentence position rather than company. Stripping the two pure-position features (`before=^`, sentence-final) makes the Marmeladov refusal *stronger* (p 0.101 → 1.000), not weaker. It is not positional.

**The diagnosed cause, and why its obvious fix is not shipped.** A mass-matched null — drawing the population from surfaces of comparable company mass, so "unusually close" is asked among surfaces that had a comparable chance to be — fixes exactly the two false positives (7 of 8 probes correct at a ×2 band, against 6 of 8 unmatched). It also collapses the population to 5–6 draws, where p has a resolution of ~0.2, and the one genuinely semantic join (`Sonia ~ Sofya`) falls over at p=0.429. Confound when the population is broad; no resolution when it is narrow. Trading one unreliability for another is not a fix, so it is prototyped and NOT shipped.

**What this means for the flagship test, stated so it cannot be misread:** it passes, and on its own it looks like a working gate. It is not one. Separating `Marmeladov` from `Sofya` is real but is weak evidence, not a demonstration that the gate distinguishes beings — the controls say it confirms different people as readily as the same one. `fold-gate.test.mjs` now PINS that defect as its own test case (`KNOWN DEFECT (pinned)`), asserting the false positives, so the suite states the limitation rather than letting three green flagship assertions imply a capability the measurement refuses. If someone fixes the gate, that test fails loudly and should be rewritten to assert the fix.

**Standing, revised down:** `refuteIdentity`/`reviewReferentAssignments` are real organs that run on real material and surface a real defect in the reading. They are NOT an identity detector, and the ±1-token company vector under a population null appears unable to become one — squeezed from both sides by the confound and the resolution. Anything that consumes these verdicts must treat them as a lead to be checked against bytes, never as a finding.

## S86 — The reading cannot hear: every being it finds is found by capitalisation, and nothing else (2026-09-08)

**Generality:** universal (a property of `extractSurfaces`' candidate generation, measured on real prose in three scripts; nothing in it is specific to this book).

`native/docs/LEVELS.md` carries the heard rule as a standing rule, in the user's own words: *"the system must be able to work equally well if it only heard the novel and didn't read it."* This entry measures the current distance from it, prompted by that rule being invoked against a referent-identity failure (S85).

**The measurement.** The real production path (`splitSentences` → `extractSurfaces` → `discoverReferents`) over 900,000 bytes of real Crime and Punishment, transformed one variable at a time:

| input | candidate surfaces | referent groups |
|---|---|---|
| as printed (control) | 401 | 287 |
| punctuation softened, case KEPT | 411 | — |
| **lowercased only** | **0** | **0** |
| Hebrew prose (script has no case) | **0** | — |
| Korean prose (script has no case) | **0** | — |

**Not a degradation — a collapse.** Zero of 401 surfaces and zero of 287 referents survive the loss of case. The punctuation control rules out every other orthographic cue: softening quotation marks and dashes while keeping case leaves the count intact (401 → 411). Capitalisation is not the primary signal for finding a being; it is the **only** signal.

**L2 is honoured in the refusal and bypassed in the generation.** The engine's own law says capitalisation is a differentiator, never the primary signal, and `extractSurfaces` does honour it where it refuses — it vetoes sentence-initial capitals as evidence rather than admitting on them. But the veto operates on a candidate set that is itself 100% capitalisation-derived. A rule applied to the survivors of a filter cannot constrain what the filter let through in the first place.

**Two consequences, both larger than the specimen that found this.**

1. **The heard rule is not approximately met; it is met at zero.** Anything downstream of referent discovery — the cast, the identity gate (S85), the merges, the holograph's beings, `dialogue.js`'s name resolution — inherits this. A system that finds no beings without capital letters is not a reading that happens to also work when heard; it is a reading that only works when read.
2. **The omnilingual work has a floor under it that was not measured.** S83/S84 built `POSPrior@1` for Greek, Turkish, Hebrew, Korean and Farsi and measured the admission gate. Hebrew and Korean have no case distinction at all, and the measurement above returns zero surfaces for both — so in those two languages there is nothing for a POS prior to gate, because there are no candidate beings to begin with. The Greek run's 154 heard notes are consistent with this rather than counter-evidence: Greek has capitals. This is not a claim that the priors were wasted; it is a claim that a layer beneath them was never checked and does not hold for caseless scripts.

**What this does NOT establish.** Whether a heard-legal candidate generator is achievable, and at what cost. The obvious direction — recurrence and discourse position rather than orthography, which is how a listener actually does it, and what S17-type already says is the occurrence layer's job — is named, not attempted, and not costed here. Nothing in this entry proposes a replacement; it measures the size of the gap, which was not previously on the record as a number.

**Files.** None changed. This is a measurement of shipped behaviour, reproducible from the pipeline as it stands.

**Amended immediately, same day — the entry above OVERSTATED its scope, and the correction matters more than the original claim.** "The reading cannot hear" is wrong. One layer cannot hear. The measurement above tested `extractSurfaces` and generalised from it to the reading, which was not licensed — a second entry point, tested after the user pushed back on the conclusion, hears perfectly:

| layer | as read | as heard (lowercased) |
|---|---|---|
| kinds — `discoverCompanyKinds` over real Crime and Punishment | 13 kinds | **14 kinds** |
| beings — `extractSurfaces` over the same bytes | 401 surfaces | **0** |

The kind layer is fully case-independent and returns slightly MORE under the ear, because lowercasing merges case variants of the same word. This is exactly what `kind-standing.js`'s own header already claimed for itself ("measured on the real War and Peace HEARD stream — case- and diacritic-folded, the ear has no case") and it holds, unmodified, at book scale.

**The corrected finding, which is narrower and more useful:** the heard rule is met by the layer that discovers what KIND of thing a word is, and violated absolutely by the layer that discovers WHICH BEINGS the material holds. The defect is `extractSurfaces`' candidate generation, not the reading.

**And this locates the fix rather than only the gap.** The repository already contains a working, book-scale demonstration that structure can be discovered from company alone with no orthographic cue — `discoverCompanyKinds` is that demonstration, shipped and measured. What has never been built is the same posture applied one grain over, to beings: recurrence and discourse position instead of capitalisation, which is both how a listener actually resolves a referent and what S17-type already assigns to the occurrence layer. That is a considerably better position than S86's first draft implied, and the first draft should not have implied otherwise on one entry point's evidence.

**The methodological lesson, since it is the second time in two days:** S86's first draft generalised from one organ to a whole pipeline without testing a second organ. S83's own warning — state before running what result would indicate the instrument measured only itself — has a sibling this pass needed and did not apply: state before generalising what OTHER entry point would have to agree for the generalisation to hold. One measurement of one function is a fact about that function.

## S87 — A being-finder that hears: the heard rule met by construction, and the floor raised from zero (2026-09-08)

**Generality:** universal for the mechanism (composed from `discoverCompanyKinds`, whose case-independence is measured, plus a received POS prior in the asymmetric polarity S83 established; nothing in it names a determiner, an article, or a language); specimen-scoped for the recall and precision figures (one novel, one 20-name cast).

S86 measured `extractSurfaces` at zero under the ear and its amendment located the fix rather than only the gap: the KIND layer already hears, so the repository already held a working book-scale demonstration that structure is discoverable from company alone. `native/organs/heard-surfaces.js` is that posture applied one grain over, to beings.

**The signal is one `kind-standing.js` already measured and stated in its own header** — general/count/emperor announce `before=the`; kutuzov/napoleon/pierre announce `before=^` "with determiners absent" — together with the structural rule that same header licenses a consumer to lean on: a kind signed by a WORD is a frame-kind, a kind signed by POSITION alone is not, and "`^` is not a word of any language, so this is structure, not English." A being-candidate is a recurring term belonging to a positionally-signed kind. No word list, no closed class, no language named.

**One refinement was tried and REFUSED on its own measurement.** Positional signature alone admits everything that opens a sentence, which in dialogue-heavy prose is largely discourse particles (but/what/how/why/well/yes/listen). The obvious cut — require a lower sentence-initial share — was measured first: real names run 0.13–0.42, openers run 0.30–0.77, ranges that OVERLAP. Any cut there is a threshold tuned against the answer, which eoreader6.1's own CLAUDE.md forbids outright. Not added.

**What did work is the received prior, in S83's own asymmetric polarity.** `POSPrior@1` refuses a form the treebank SETTLES into a class that cannot name a being, and ADMITS a form it never saw — and that polarity is the whole mechanism, because a treebank of ordinary prose has every conjunction and has never heard of "raskolnikov". A second alignment mattered: a UD treebank splits clitics (`that's` → `that` + `'s`), so contracted forms are unattested and sail through the admit-the-unseen rule; consulting the stem before the clitic is asking the giver its own question in its own units, not a rule about English. Measured on 900 KB of real Crime and Punishment, lowercased:

| stage | candidates | cast recovered | note |
|---|---|---|---|
| `extractSurfaces` (the read path) | **0** | 0/20 | S86's collapse, pinned as this suite's control |
| positional signature alone | 48 | 5/20 | ~10% precision — half discourse particles |
| + POS prior, asymmetric | 24 | 5/20 | function words refused, contractions survive |
| + clitic-aligned lookup | **12** | **5/20** | ~7 of 12 are genuine beings |

Seven of the twelve are real (`raskolnikov, sonia, razumihin, nastasya, marmeladov`, plus `koch` — a real minor character — and `jesus`). Hebrew synthetic prose, where `extractSurfaces` returns 0 because the script has no case at all, returns exactly its three names.

**Stated plainly, because the numbers invite overclaiming: this raises a floor, it does not replace `extractSurfaces`.** Recall is 5 of a 20-name cast against the read path's 20 of 20. It is unigram-only, so multi-token names ("Sofya Semyonovna") have no heard equivalent here. It needs space-delimited script, so Korean returns 0 — its agglutinated particles (지민은 / 지민에게) mean no token recurs, the same shape S83 named for Turkish, and Chinese/Japanese are out of reach for the same reason one step further. All three limits are in the module's own header, not discovered later.

**Enforced.** `native/organs/heard-surfaces.test.mjs`, 7 cases. The flagship asserts BOTH halves on real bytes: that `extractSurfaces` returns exactly 0 on the lowercased novel (S86's measurement, pinned so it cannot silently change) and that this module recovers real named beings from those same bytes. Also pinned: the gate only ever removes, never invents; a missing prior refuses nothing; and the returned shape is `extractSurfaces`' own `{surface, mentions, sentences}`, so `discoverReferents` consumes it unchanged and the two paths are comparable on one downstream.

**Not wired into any production path.** The organ exists, is exported from the seam, and is tested; choosing when a reading should hear rather than read is a decision with its own costs, not something this entry takes unilaterally.

## S88 — A being with no proper name and normal capitalisation still defeats `extractSurfaces`: kinship terms need a third signal, proposed by LaVar and not yet built (2026-09-09)

**Generality:** specimen-scoped (one 127-word children's book measured directly; the proposed mechanism is stated generally but untested against a second specimen).

S86/S87 measured that capitalisation is `extractSurfaces`' *only* signal and that it collapses to zero the instant case is lost (a lowercased novel, a caseless script). This entry is a different failure of the same organ, found by LaVar (the reading-agent directive at `eoreader7/LAVAR.md`) reading a real, NORMALLY-capitalised text directly rather than by stripping case from one that already worked: `live_priors/18-childrens-books/global-digital-library/en/273_I-Love-My-Mom.txt`, read via `native/eval/lavar/read-real.mjs` through the real `createRecursiveReader`/`createCausalTextPerceiver` pipeline, S86's own case intact throughout.

**Measured.** `surfacesFromEvidence` over this text's real accumulated evidence returns exactly two surfaces: `"Lee"` (the mother's given name, stated once, in the story's first six words, never repeated) and `"WHEEEEEEE"` (an onomatopoeic exclamation). The story's actual protagonist — referred to as "my mom" / "she" / "her" roughly ten times across eleven sentences, unmistakably the being the whole text is about — is never admitted as a surface at all, because "mom" is never capitalised (it is a common noun, not a proper name) and every mention of the narrator ("I") is a pronoun, out of `surfaces.js`'s declared scope by design (READING-POLICY P3.2 — pronoun binding is a different organ's job). Downstream: zero referent bindings, zero relation edges, in a text whose entire content is one relation-dense mother-daughter routine.

**This is not S86's gap reappearing.** S86 is about losing a signal that WAS present (case, stripped). Here the signal `extractSurfaces` looks for was never present in the source at all — the material's own convention for naming its cast is kinship terms ("mom") and pronouns, not proper names, and this is not a formatting accident: a large share of children's literature, first-person narration with an unnamed narrator, and ordinary dialogue about family members shares this convention. `heard-surfaces.js` (S87) does not close this either — its being-candidate signal is a positionally-signed kind (sentence-INITIAL recurrence, the `before=^` signature real names carry); "my mom"/"her mom" is essentially never sentence-initial, so it would not surface as a candidate there regardless of case.

**Proposed, not built:** a third being-candidate signal, sibling to capitalisation (S86) and sentence-initial position (S87) — a common noun that recurs bound to a POSSESSIVE DETERMINER (my/her/his/your/our) is very often denoting one particular, individuated being rather than a generic member of its class ("my mom" names one person; "a mom" or "some moms" does not). This is a positional signature exactly in S87's own sense (`before=my|her|his|your|our`, not a word list of kinship nouns — the determiner class is what signs it, the same way `before=^`/`before=the` sign S87's existing kinds), so it composes with that module's existing mechanism rather than requiring a new one: a candidate generator, not a new kind of gate. **Untested.** No implementation, no measurement of precision/recall, no check against a second specimen. Named here, per this suite's own "disclosed, not fixed, on purpose" discipline (S69 and others), as the next thing to try — not attempted blind in the same pass that found it.

**Files.** None changed by this entry. `native/eval/lavar/read-real.mjs` (new, this session) is the driver that surfaced it, reading real material through the real production pipeline rather than a synthetic probe.

## S89 — Omnimodal means the kernel is blind, never that a medium's real structure gets thinned to look uniform (2026-09-09)

**Generality:** universal (a stated design rule, not a specimen measurement).

User direction, verbatim, the session this was written: *"the fact is word order and often capitalization DOES contain meaning in english and we should not ignore that"* / *"we just need to have the reader learn to use the relative rules, but we dont want to ignore any meaningful structure to make something omnimodal."*

**The rule.** `native/kernel/` stays medium-blind by design (`notes.js`'s own header: "no sentence, word, verb, note-as-music, bar, frame-of-film" — enforced by a test that fails if one appears). That blindness lives in the KERNEL. Every ADAPTER (`native/adapters/text/`, and whatever a future audio/video/code adapter turns out to be) is expected to use everything real its own medium and language actually offer — capitalisation and word order in English, whatever the analogous structure is elsewhere — in full, not thinned toward some lowest common denominator in the name of "omnimodal." Omnimodal is a property of the KERNEL's vocabulary (arrangement, admit, fold — none of it naming a medium), never a mandate that every adapter perform equally well, or use equally little, across every medium. A mechanism scoped to one language is not thereby a defect.

**Already the law, not a new invention — this entry gathers it under one number.** EO-constitution Article II.13, "the script earning test": a mechanism scoped to one language or script is not a defect; asserting it is script-agnostic without a cross-script fixture, or without naming that scope as a received giver, is — the silence is the more severe failure than the scope. `legacy-eoreader6.1/READING-POLICY.md`'s P7.1 already applies this once (the diacritic fold: "the blanket combining-mark strip was tried and reverted for silently claiming cross-script generality"), and `surfaces.js`'s own scope note applies it a second time (an algorithmic substitute for capitalisation on caseless scripts was tried and reverted on the identical constitutional ground). Both predate this entry; neither had a policy number of its own in either doc to be found under.

**How to apply it, concretely, when a mechanism returns nothing on some material.** The question is never "how do we make this mechanism work everywhere" if that means weakening what it correctly does where it DOES apply. The question is: does this material's own medium/language have a real, analogous signal this mechanism simply isn't reading yet (S87's positional-signature fix for caseless scripts; S88's proposed possessive-determiner signal for kinship-term casts) — build or propose THAT, additive, never subtractive. Or does it genuinely have none yet (Chinese/Japanese being-discovery, checked this session: tried once via an algorithmic capitalisation-substitute, reverted per II.13, and no working replacement exists — confirmed independently on real Japanese prose in `native/eval/the-fold/results/asserted-crosslingual.md`, same `no_candidate_surfaces` gap) — then the honest sidecar is a disclosed, typed gap (`script_without_case`, `needsWitness: true`), not a thinner reading of the languages that DO have the signal. A gap disclosed is not a failure this rule asks anyone to close by degrading what already works.

**Filing note:** this entry, S90, and S91 below were first written into `legacy-eoreader6.1/READING-POLICY.md` as P8/P9/A26 — the wrong file. That file documents the OLD `packages/engine/` architecture (its own P0–P7 all cite `packages/host/corpus.js`); everything cited here is `native/`. Moved same session, before anyone built on the misfiled copies; the legacy file's own note at the same spot points back here.

## S90 — A relation shape that CAN be n-ary is not the same as one that IS — check what actually gets fed to it before calling it universal (2026-09-09)

**Generality:** universal for the mechanism (checked against every current constructor); specimen-scoped for "the Fox and the Grapes" as the motivating example.

The kernel's real general-purpose relation shape is `EOHyperedge@1` (`native/kernel/hypergraph.js::hyperedge`): an ORDERED, ARBITRARY-LENGTH `participants` array, its only structural requirement `participants.length > 0` — genuinely medium-agnostic, and proven so (`notes.js`'s own ledger has been fed arrangements from MIDI, WAV, video, turbulence fields). `end1/label/end2` (`arrangementOf`, the shape the-fold's P76 renamed subject/verb/object into) is a NARROWER PROJECTION of that hyperedge, built specifically for the witness/corroboration ledger (`relation-composition.js`'s `firstEnd`/`secondEnd` explicitly take only `participants[0]` and `participants[length-1]`) — a specialization, not the promotion to a general mechanism its own surrounding comments can read as implying.

**Checked, and it matters:** every actual constructor that currently exists — `native/adapters/text/recursive.js`, `derivation.js`, `sequence.js`, `reaction.js`, every eval script — populates exactly 2 participants. Nobody feeds `hyperedge()` a true 3-argument relation ("gave X to Y") or a genuinely 1-argument one, because the one text extractor wired everywhere (`native/adapters/text/relations.js`) hard-requires a subject group AND a mandatory object group (`if (!subject || !object) continue`) before it will emit anything at all. A true intransitive clause ("the Fox jumped") can never satisfy that gate, in any configuration, however rich the downstream kernel machinery is — because the object slot is mandatory upstream of it. This is not a defect in the n-ary hyperedge schema; it is a defect in the one adapter everyone currently reads through, which never asks the richer schema for more or fewer than two ends. `live_priors/scripts/eot-sidecar.mjs` and `eot-digest.mjs` both read this same narrow path — `relation-composition.js`'s chaining, `reaction.js`'s composition circuit, and `notes.js`'s witness/cut/void apparatus exist and are tested, but none of it is wired into either script; it is reachable today only through the-fold's own `app.js`/`holon.js` and `native/eval/the-fold/` drivers.

**The lesson, general beyond this one gate:** "we already renamed the fields to something medium-neutral" is a claim about NAMING, not about whether the mechanism feeding those fields is actually using the generality on offer. Before citing a shape as evidence of a universal mechanism, check what actually constructs it — the same discipline S89 asks for the being-discovery side, applied here to the relation-arity side.

## S91 — Batching a reader's vocabulary update is a performance compromise, not a model of reading — and the compromise had gone stale (2026-09-09)

**Generality:** universal for the mechanism (the incremental-fold change applies to every caller); specimen-scoped for the specific numbers (Alice, one 14-sentence children's book).

`native/adapters/text/recursive.js::createCausalTextPerceiver`'s `refreshEvery` batched how often the reader projects its accumulated evidence into a usable verb vocabulary and referent cast — originally because an earlier `refresh()` re-scanned the WHOLE prefix every call (O(n²), 75s on Frankenstein / ~80min on Les Misérables). A later pass (the `foldedTo`/`relationRefreshFrom` split) made `refresh()` itself incremental, folding only evidence NEW since the last call — but nobody re-checked whether batching was still buying anything after that fix landed, so `refreshEvery: 25` kept being reused as if the old cost model still applied.

**Found:** reading a real 14-sentence children's book (`18-childrens-books/global-digital-library/en/273_I-Love-My-Mom.txt`) through the real pipeline at that default produced zero relation edges and zero referent bindings — the text ends before the reader's own vocabulary-update cycle fires a second time. **Measured** on a real novel (Alice in Wonderland, 1687 sentences): `refreshEvery: 1` costs 5.68s against 2.34s at `refreshEvery: 25` — 2.4x slower, nowhere near the old O(n²) blowup — and finds MORE structure (11950 vs 11669 graph entries), because continuous updating stops holding the verb vocabulary and cast frozen at a stale earlier batch. User direction, verbatim: *"why are we doing batches at all?"* / *"people don't work like that."*

**Changed:** `refreshEvery`'s default is now 1. No fixed batch size is safe against every material length (a book shorter than the batch gets nothing; a book not an exact multiple loses its trailing fraction — invisible on a long novel, total on a short one), so the fix removes the batch boundary rather than picking a smaller one. A caller with its own measured performance reason may still declare a larger value explicitly. Every existing caller (`native/tests/referent-merge.test.js`, `resume-state.test.js`, `hypergraph.test.js`, `addresses-birth.test.js`, `native/conformance/artifact-prior-boundary.test.mjs`) already declared its own `refreshEvery` explicitly and is unaffected; all 20 cases still pass.

**Open, not yet attempted.** The archived sidecars (`native/eval/the-fold/results/readings/archive/`, recipe `causalTextPerceiver_reviseTextFold_refresh25`) were all read at the stale default and were not re-read here.

## S92 — A whole-document script verdict cannot answer a per-sentence question; a mixed-script document needs the same test run per segment (2026-09-09)

**Generality:** universal for the mechanism (any document, any script pair); checked against a real English+Mandarin synthetic fixture, not yet against a real mixed corpus specimen (none exists in live_priors' current corpus).

**Why this was needed.** User direction, verbatim: *"the EOT files needs to know how to handle if one text is in english and mandarin."* `surfaces.js::scriptCoverage` (S24/S36) already answers "can the capitalisation mechanism see this document's script at all" — but it FOLDS every sentence's letters into one document-wide `casedShare`. A document genuinely mixing English (Latin, cased) and Mandarin (Han, caseless) sentences would average into one "mostly cased" or "mostly caseless" number either way, and nothing would say WHICH sentences are the caseless ones — exactly the information a per-segment reader needs to know where `extractSurfaces`/`extractRelations` can and cannot see at all.

**Built, not just proposed — reusing the existing organ's own test, not a new script list (II.13; CLAUDE.md's "search for the organ before you write one").** `surfaces.js::scriptCoverageBySentence(sentences)` runs the SAME per-character `\p{Cased_Letter}` vs. `\p{L}` test `scriptCoverage` already uses (same giver: Unicode UCD General_Category), just per sentence instead of folded across the document. Returns `{order, casedLetters, caselessLetters, casedShare, dominant}` per sentence — `dominant` is `"cased"`, `"caseless"`, `"mixed"` (a tie), or `null` (no letters at all — a bare heading, a typographic scene-break row of asterisks — never coerced into a bucket it was never evidence for).

**Scope, stated as plainly as every other boundary in this file:** this is script identification (Latin vs. Han vs. …), NOT language identification. A Latin-script loanword or proper noun inside an otherwise-Han sentence still counts toward that sentence's `casedLetters`, same as it would inside `scriptCoverage`'s own whole-document tally — this cannot tell "this is English" apart from "this is French written in the Latin alphabet." For the concrete case named above — a document whose sentences are EITHER English (Latin, cased) OR Mandarin (Han, caseless), never a third script — that is exactly the distinction `dominant` needs to draw, and no further claim is made past it.

**Wired into `EOTReading@1`** (`live_priors/scripts/eot-sidecar.mjs`, `eot-digest.mjs`): `script.bySentence[]` (document-level array) and a `script: {dominant, casedShare}` field zipped onto each entry of the existing `propositions[]` per-sentence ledger (LP10) — the SAME row that already says whether a sentence yielded a proposition or a gap now also says what script it was written in, rather than a second document a caller has to join by hand.

**Cross-script fixture (the II.13 invariance test this claim needed before it was admissible at all):** `native/tests/script-coverage.test.js` — a 3-sentence English/Mandarin/English document resolves per-sentence exactly (`cased`, `caseless`, `cased`); a sentence with a Latin proper noun embedded inside otherwise-Han text still resolves `caseless` (majority rules, per-sentence, same as the whole-document version); a no-letters sentence resolves `dominant: null`. Verified live on the real Chapter 1 of Alice reading below: its two scene-break rows of asterisks (`"*      *      *      *      *"`) correctly resolve `dominant: null` rather than being forced into `cased` — the one place this pure-English chapter actually exercises the "no letters" branch.

**Disclosed, not built:** no real mixed English/Mandarin document exists yet in live_priors' corpus to validate this against real (not synthetic) material — named here as the open validation this mechanism still needs before it earns a `checked against real material` generality claim of its own, the same standing S89's omnimodal principle already holds itself to.

## S93 — `collapseWs` was applied to the subject and object of an extracted relation, but not the verb — a hard-wrapped source line put a raw newline inside a verb label (2026-09-09)

**Generality:** universal (any hard-wrapped source text; any negated or auxiliary+verb phrasal predicate whose match happens to straddle a line-wrap).

**Found** hand-checking Chapter 1 of Alice's real reading, propositions like `little Alice | was\nnot going | to do that in a hurry` and `I'll | could\nnot remember | ever having seen such a thing` — a literal newline character sitting inside the verb label, inherited from the SOURCE FILE'S OWN print-formatting line wrap (Project Gutenberg hard-wraps at ~70 chars; `...but the wise little Alice was` ends one line, `not going to do _that_...` starts the next). `adapters/text/relations.js`'s subject (line 922) and object (line 959) extraction both already ran their raw slice through `collapseWs` (module-level, `replace(/\s+/g, " ")`) for exactly this reason — a hard-wrapped line break normalized to a single space — but the auxiliary/negation chain feeding the verb label (`auxText`, line 956) only called `.trim()`, which strips the ends and leaves any embedded break untouched.

**Fixed:** `auxText = phrasalPredicates ? collapseWs((m[2] ?? "").trim()) : ""` — same treatment subject and object already got. Re-ran Chapter 1's own reading after the fix: identical edge count and coverage (76 edges, 56.2%, this is a string-formatting fix, not an extraction-gate change), zero remaining embedded newlines in any verb label. Full native suite (648 tests) unaffected.

## S94 — Hand-checking a real, clean reading against its source: four named construction classes the positional English reader still gets wrong, and an honest account of what "gap" actually contains (2026-09-09)

> **PARTIALLY SUPERSEDED, same day, by [S95](#s95--an-observation-is-typed-by-its-cell-in-the-cube-not-by-an-english-part-of-speech-and-a-reading-is-a-ledger-that-nests-by-address-2026-09-09).** This entry's four named construction classes and its gap accounting still stand. What does NOT stand is the sentence below reading *"the connector slot holding a PREPOSITION, not a verb"* as evidence of a **defect**. A preposition-labelled arrangement is not a broken Link — it is a **Field** (`CON · Ground · Tending`), a different cell of the same cube, and refusing it discarded real structure while counting the discard as cleanliness. User's own challenge, verbatim: *"are we convinced this is wrong? isn't this Ground Figure Pattern?"* Read S95 before treating any grain difference recorded here as an error.

**Generality:** universal for all four construction classes named below (each is a standing feature of English, not a property of this one chapter); specimen-scoped for the counts (Chapter 1 of Alice, `01-literature-books/gutenberg/pg11-alice-ch1.txt`, 89 sentences, 76 admitted edges).

User direction, verbatim: *"produce a high quality EOT file, hand check it all if you have to."* This is that hand-check — every one of the 76 admitted propositions read against the real sentence it came from, and every one of the 39 gap sentences read too, rather than trusting `admission.gate: "clean"` (which only means nothing FALSE got in, never that everything true was found — LP10's own distinction) or the 56.2% coverage number alone.

**Roughly 50 of 76 admitted propositions are straightforwardly correct** (e.g. `The rabbit-hole | went | straight on like a tunnel for some way`, `Do bats | eat | cats?`, `little Alice | was not going | to do that in a hurry`), another ~14 are correct but under-segmented or truncated at a clause boundary in a way that loses no real content (`there | was | not a moment to be lost: away went Alice like the wind` folds two clauses into one object; several parenthetical asides are cut at the open-paren). The remaining dozen cluster into four NAMED, general failure classes, not a dozen unrelated mistakes:

1. **Gerund/catenative-complement subject loss.** `decided on | going | into the garden at once`, `longed | get | out of that dark hall`, `size for | going | through the little door into that lovely garden`, `in my | going | out altogether` — a verb taking a non-finite (gerund or infinitive) complement clause, where the real subject sits BEFORE the matrix verb (`she decided on...`, `how she longed to...`) but the subject-boundary walk instead grabs a fragment of the complement clause itself. Four instances, same shape every time.
2. **WH-fronted embedded-clause subject loss.** `ever | get | out again` (from "wondering how she was ever to get out again"), `world she | was | to get out again` (from "how in the world she was to get out again") — an embedded question fronts its WH-phrase ("how... ever", "how in the world"), and the positional reader's subject search lands on a word from inside the fronted material instead of the true subject after it. Two clear instances here; several more B-tier (recoverable-but-fragmentary) cases share the same cause (`how many miles I've | fallen`, `Latitude or Longitude I've | got | to?`).
3. **Coordinated-clause elided subject not reattributed.** `and | found | in it a very small cake`, `and | was | just in time to hear it say`, `and | went | on saying to herself` — three instances, all one shape: "she opened it, AND found...", "AND was...", "AND went..." — a compound sentence where the second and third verbs share the FIRST clause's subject by ellipsis, and the extractor takes the coordinator itself ("and") as the subject rather than carrying "she" forward across the conjunction.
4. **Subject–verb inversion misread as plain SVO.** `In another moment down | went | Alice after it` — a fronted adverbial with stylistic subject-verb inversion ("down went Alice" = "Alice went down") is read by simple linear position as if "In another moment down" were the subject and "Alice" the object — exactly backwards. This is the sharpest concrete case yet of the session's own standing principle (S89's header; user direction *"word order... DOES contain meaning in English"*): word order carries real information, but English's own convention for it is not perfectly rigid, and a purely positional reader has no signal for the cases where the convention itself inverts.

Two further, singular findings, each real but not yet a pattern: an object truncated at a coordinate-adjective comma (`Alice | found | Alice in a long` — "a long, low hall" cut after "long"), and one referent-binding miss where "she" resolved to a wrong candidate surfaced as "I'll" instead of "Alice" (`I'll | could not remember | ever having seen such a thing`) — a concrete instance of the exact gap `recipe.descriptor.resolvePronouns` already discloses ("unvalidated against a golden").

**None of the four classes above were fixed this pass.** Each would touch the core positional subject/object-boundary walk in `relations.js` — general-purpose code every other reading depends on — and fixing one construction class correctly, generally, without narrowing to fit this one chapter's own examples, is real, scoped future work in its own right (the same discipline S90 already holds itself to: disclosed, not patched blind in the same pass that found it).

**What "gap" actually contains — read, not assumed.** Of the 39 gap sentences: 2 are the chapter's own heading fragments ("CHAPTER I.", "Down the Rabbit-Hole" — not clauses at all), 6 are the typographic scene-break asterisk rows (correctly `dominant: null` per S92, not prose), roughly 18 are genuine short exclamations/interjections with no subject-verb-object structure to find at all ("Oh dear!", "Down, down, down.", "Dinah my dear!", "thump! thump!" — S90's mandatory-subject-and-object gate is CORRECT to refuse these; they are real English, just not clause-shaped), a handful are dialogue-attribution tags whose verb ("said", "thought") may not have cleared this reading's own recurrence-gated vocabulary floor, and the remainder are genuine misses sharing the same four classes named above (`How brave they'll all think me at home!`, `I wish you were down here with me!`). "Every word in an EOT tuple" is not reachable while the extraction gate requires a mandatory object (S90) and real English routinely produces subjectless, objectless, verbless utterances — this chapter's own coverage ceiling, honestly, is somewhere below 100% for a real, principled reason, not a bug to chase to zero.

## S95 — An observation is typed by its cell in the cube, not by an English part of speech; and a reading is a ledger that nests by address (2026-09-09)

**Generality:** universal. The grain rule holds for every medium the cube covers; the ledger form holds for every source with byte addresses. The English interpretation named below is scoped, deliberately, to English.

This is a RULE, not a finding, and it supersedes the parts of S94 and of `live_priors/scripts/eot-sidecar.mjs`'s flat schema that conflict with it. It came out of one reading (Chapter 1 of Alice) under six corrections, each of which is now law rather than an observation about that chapter.

### 1. Grain, not error. A part of speech types an observation's CELL; it never refuses it.

`relations.js`'s own header declares it builds `CON · Link · Binding` — so **every** arrangement it emits is stamped Figure/Link whatever it actually found, and anything that is not a discrete act between two discrete ends then reads as a broken Link. It is not broken. `cube.js` already names what it is:

```
TERRAIN_BY_DOMAIN.Structure = { Ground: "Field", Figure: "Link", Pattern: "Network" }
```

| the connector settles as | cell | terrain · stance | what it actually is |
|---|---|---|---|
| verb, participle | `CON · Figure` | Link · Binding | a discrete act binding two ends |
| preposition | `CON · Ground` | Field · Tending | a state, a manner, a co-presence |
| conjunction | `SEG · Figure` | Link · Dissecting | a distinction drawn, not a relation asserted — a different MODE, never a weaker CON |
| noun, adjective, adverb, pronoun, article | — | — | **REFUSED**, and the refusal is a line — see the amendment below |
| unsettled | — | — | **`grain_gap`, and the observation is KEPT IN FULL** |

**Amended same day (S96's own measurement forced it).** The last row above was originally "anything else, *or* unsettled → grain gap, kept", and collapsing those two answers is wrong in both directions. **Unsettled is not a judgement**: the received prior has no verdict (the infinitive marker "to" is UD `PART`, deliberately outside Thrax's eight categories), so neither has the reading — a typed gap, observation kept. **Settled as a class that cannot head a relation IS a judgement, and the prior licenses it**: a noun, adjective, adverb or pronoun in the connector slot is not a relation at some other grain, it is an extraction artifact (`she | eyes | …`, `she | generally | …`, thrown up by anchoring on a bound pronoun whose next token is not a predicate). Refusing it is P56's asymmetry used exactly as written — settled means refusable — and it is **not** the mistake this entry corrects. That mistake was refusing a *preposition*, which heads a real relation at Ground grain. **The line is whether the class can head a relation at all, never whether it is a verb.** Measured on Chapter 1: 22 refusals (19 adverb, 3 pronoun), and every Field survives.

Measured on Chapter 1: 61 `CON·Figure·Binding`, 12 `CON·Ground·Tending`, 8 `SEG·Figure·Dissecting`, 54 grain gaps. Before this rule, the twelve Fields (`burning | with | curiosity`, `seen a rabbit | with | a waistcoat-pocket`, `walking hand in hand | with | Dinah`) were **refused as non-verb connectors** — real structure discarded, and the discard reported as a clean gate. P56's asymmetry is unchanged and still binding; what it now refuses is a GRAIN CLAIM, never the observation. A missing prior produces a typed gap, never a guessed grain.

### 2. Never write English's part-of-speech names onto a record. Scope them once, higher up.

No line may say `subject`, `verb` or `object`. P76 already renamed those to `end1`/`label`/`end2` after the kernel went dark on every non-English arrangement (`relation-composition.js`: *"AN ARRANGEMENT HAS ENDS, NOT PARTS OF SPEECH"*); this carries it the rest of the way — an observation is typed by its cell, and the English reading of that cell is **declared once**, in the recipe, scoped to the language and reader that assumed it:

> *Figure/Link, in English, here:* the label is a finite verb or participle; `end1` is what English grammar would call the subject and `end2` the complement — **true of this reader and this language only.**

A reader of another language then replaces one declaration instead of finding English grammar smeared across 133 records. This is V7-CUT's dependency law (spec ← kernel ← adapters) applied to the ledger's own vocabulary.

### 3. A reading is an append-only ledger of observations, one per JSONL line.

The log is the artifact; the tree is a projection of it (S78's rule for the reader's own fold, applied to what gets written down). Storing the tree erases the reading that produced it — a tree can only ever show the final state, so a reading that learns something on page 9 about page 2 becomes unrecordable.

### 4. Observations nest BY ADDRESS. Never by pointer, never by order.

No `parent`, no `in`, no `children` on any line. An observation at `[7363,7384]` is inside one at `[1170,7900]` because of what those numbers are; containment is **computed**, never declared. Three consequences, all load-bearing: the source path is written **once** (the flat sidecar repeated it **741 times — 35,568 bytes, 19% of a 185 KB file** describing an 11.5 KB chapter); lines may arrive in any order; and a revision appended at the end slots into the structure with nothing rewritten.

### 5. Structural elements are INFERRED observations, at the same line shape, carrying their basis.

Chapters, sections, paragraphs and sentences are the same schema at a wider extent — not a separate structural layer. The word is **inferred**, and it is load-bearing: a document has no markup, it has bytes and typographic conventions that a reader *interprets*. A blank line is not a paragraph break, it is evidence read as one. So each carries `inferred: true` and the evidence that licensed it, which makes it contestable exactly like a proposition. (Chapter 1's two asterisk rows are **scene breaks**; the flat reading filed all six such rows as `no_relation_extracted` gaps and charged them against its own coverage.)

### 6. The origin document is preserved byte-exact. Structure is recorded against it, never carved out of it.

If containment is computed from offsets, any edit to the source silently invalidates every address in every ledger ever written against it. Therefore: **a chapter is not a file**, it is an observation at `[start,end)` on the origin; **front matter is recorded with a role, never stripped** (deleting it shifts every offset after it); and the source's sha256 is line 0, so a ledger about bytes that no longer exist says so instead of resolving to the wrong text.

**Caught by this rule, immediately:** `pg11-alice-ch1.txt`, extracted earlier the same session, had been silently normalised from the book's real CRLF to LF by the tool that wrote it — a second origin, already drifted, with every address in it off by one byte per line. Found only because a paragraph regex written for `\n\n` matched nothing at all. `spans.js::normaliseNewlines` (S26) is invertible for exactly this reason: read in normalised space, map every address back through `toRaw`, leave the file alone.

**Files.** `native/eval/lavar/eot-jsonl.mjs` (the ledger + the projection). `native/kernel/cube.js` (`cellOf`, unchanged — this rule only started using what was already there). Measured against `live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt`: 281 lines, 12 chapters, 24 paragraphs, 87 sentences, 133 arrangements, 2 revisions, 79 KB of ledger against 141 KB of book.

**Open, and named rather than hidden.** The earned verb vocabulary is thin (22 verbs from 87 sentences), so nested arrangements whose verb never recurs are not looked for at all; and 54 of 133 arrangements carry a grain gap, most of them the infinitive marker "to" (UD `PART`, outside Thrax's eight categories). Neither is fixed here. `live_priors/scripts/eot-sidecar.mjs` still writes the flat `.eot.json` form and has NOT been migrated to this rule — that migration is real, scoped, unattempted work, and until it happens the two formats disagree and this one is the correct one.

## S96 — First-person deixis: "my"/"I" names the speaker, never a stable entity — the relation tier's SVO match cannot see who utters a pronoun (2026-09-09, renumbered from this pass's own S95 — a concurrent session claimed it first)

**Generality:** universal (any two documents whose first-person subjects happen to share content words — nothing about the fix or the wall it closes is specific to English pronouns beyond `organs.firstPerson` itself being a received, English-tagged closed class; a language with its own first-person closed class would receive the identical wall through the identical parameter, unbuilt here). Specimen-scoped for the one live measurement (`gemma2:2b`, seed 1, the ESL-style fixture) in `eval/the-fold/results/first-person-deixis-RESULTS.md`.

The-fold's POLICIES.md **P180** is the paired entry, with the fuller narrative; this is the organ-side account.

**The bug, live.** A the-fold turn asked `gemma2:2b` "In one short sentence, what is your favorite color and why?"; it answered "My favorite color is blue. It reminds me of the sky and brings a sense of peacefulness."; the relation tier's `judge()` (`native/organs/hypergraph.js`) marked the first sentence `bound`, cited to a generic ESL "10 lines about my favorite color" example-sentence page the preflight web search had fetched — an entirely different, anonymous author's "my favorite color is blue," structurally identical to the model's own, treated as the same claim. The user's own question ("how could this possibly be 'confirmed'?") named the defect precisely: this tier's SVO matching compares TOKENS, never SPEAKERS, and a first-person pronoun's referent is the speaker, not a stable entity two independent documents could both be talking about.

**Root cause, exactly.** `endpoint()`'s own `useForms` path grants a subject identity through a RECURRING CONTENT WORD ("favorite"/"color" both recurring `>= FORM_MIN_ARRIVALS` times in the fetched page) whenever the string does not resolve to a real cast referent — the identical mechanism S50/the MINE-1 work built to rescue concept-document subjects like "Butterflies" from starving the referent gate. That mechanism has no notion of speaker at all: "My favorite color" (the model's own claim) and "My favorite color" (the page's own sentence) tokenize identically, so they collapse onto the same `form:` identity and `endpointsMatch` reports them as one claim. This is the referent-model-not-pointers failure class this whole tier exists to avoid, one register in — occurrence-counting over strings mistaken for reference to one thing.

**The fix, in `judge()`.** A new wall, checked on the claim's RAW subject string before any endpoint resolution runs: `firstPersonLed(t.subject)` (a received closed class, `priors.js`'s own `FIRST_PERSON`, giver `lang/en`, tested against the subject's own first token — the identical `firstToken`/`negationLed` shape P43's polarity wall already uses one register over) refuses the claim `beyond-reach` against every edge in the material UNLESS the caller has separately declared `organs.sameSpeakerRef` — `(ref) => boolean` — and at least one edge's own source ref satisfies it. Checked before `subj`/`obj` are even computed, so the wall cannot be defeated by ANY resolution path (named referent, recurring form, or bare content-word overlap) — it does not merely disable forms for this one case, it refuses the comparison outright.

**The escape hatch is real and tested, not merely gestured at.** `organs.sameSpeakerRef` narrows which edges a first-person claim may be judged against to those whose ref the caller can attest shares the answer's own speaker (the natural candidate being the self plane's `self:`-addressed record, P15 of the-fold's POLICIES.md) — and, once narrowed, ORDINARY checking resumes: a first-person claim that genuinely matches a self-attributed edge binds normally (with real corroboration, real polarity checks, everything this tier already does), while a first-person claim the self-plane material does not state reads `unbound` (a real check ran and found nothing) rather than `beyond-reach` (no check could run at all) — the two verdicts are deliberately different facts, and the escape hatch's own edge-scoping is what keeps an unrelated document from ever re-entering the search even once the hatch is open (pinned in `hypergraph.test.mjs`: a self-attributed edge and an unrelated web edge both present, only the self-attributed one is ever cited). Nothing in the-fold currently threads a self-plane passage into this reader's material list, so `sameSpeakerRef` ships unwired in production and every first-person claim is refused unconditionally today — the conservative, correct default until that organ exists.

**Provider-dependent, disclosed rather than glossed over.** The whole exploit — and therefore the whole fix — depends on `nounPhraseSubjects` (DR4) keeping "my"/"I" attached to its own noun phrase; the FROZEN legacy provider's `relations.js` does not implement that flag (confirmed directly: `extractRelations("My favorite color is blue.", {verbs, nounPhraseSubjects:true})` under `legacy-eoreader6.1` still strips the possessive to "favorite color"), so under legacy this wall has nothing to fire on — not because the wall is wrong, but because legacy never hands `judge()` a subject carrying "my" as its own first token in the first place. Production has run the native provider exclusively since P69; `hypergraph.test.mjs`'s new cases are pinned to native explicitly for this reason, following the same disclosed-gap precedent Pass 7 already established for the referent-bar mechanism.

**Measured live**, not only in the synthetic unit tests: `eval/the-fold/first-person-deixis-eval.mjs` calls the real `gemma2:2b` (seed 1, deterministic) with the reported prompt, reads the real answer through the real production reader against an ESL-shaped fixture, and confirms both the defect (`bound`, cited to the unrelated page) and the fix (`beyond-reach`) end to end — `eval/the-fold/results/first-person-deixis-RESULTS.md`.

**Files.** `native/organs/hypergraph.js` (`organs.firstPerson`/`organs.sameSpeakerRef`, the `firstPersonLed` helper beside `negationLed`, the wall in `judge()`, `candidateEdges` replacing `edges` at the two `sameSubjVerb`/`sameVerbObj` filters). `native/organs/hypergraph.test.mjs` (8 new cases: the defect, the fix, a third-person control proving the wall is deictic and not blanket, opt-in backward-compatibility, and three cases proving the `sameSpeakerRef` escape hatch — refuses by default, resumes ordinary checking once opened, never lets an unrelated ref ride along). `eval/the-fold/first-person-deixis-eval.mjs` + its results doc (new). Full native suite: 1221/1223 passing before and after (the same two pre-existing entries — the `BECOMING copula-tense-aware` TODO and S83's own missing Generality line, confirmed unrelated by isolating this change with `git stash`), zero regressions.

## S96 — Capitalisation starves the VERB tier too, not only being-discovery; the lever that fixes it was built, tested, and wired into nothing (2026-09-09)

**Generality:** universal for the defect (any material narrated in pronouns rather than repeated names — which is most English prose fiction); universal for the lever; specimen-scoped for the counts (Chapter 1 of Alice, 87 sentences).

**Found by reading the whole chapter word for word against its own ledger**, on user direction: *"read the entire extracted chapter word for word. we need this first EOT to be perfect."* It was not perfect. It was not close, and the counts had been hiding it — 133 arrangements over 87 sentences reads like coverage until you check WHICH clauses they are.

**The defect.** `discoverRelationVocab` nominates a token as a candidate verb only when it FOLLOWS a candidate referent surface, and surfaces are found by capitalisation. Chapter 1 is narrated almost entirely in pronouns, so `ran`, `took`, `saw`, `found`, `knelt`, `ventured` were never nominated at all: **22 verbs earned from 11.7 KB of prose.** What the ledger recorded skewed to copulas and to whatever clause happened to sit beside a capitalised name; what it missed was the chapter's actual events — Alice beginning to get tired, the White Rabbit running past her, the Rabbit taking the watch from its pocket, Alice taking down the marmalade jar, Alice finding herself in the long hall. Every published number about this reading was a measurement of the reader's own starvation, not of the material.

This is **S86's capitalisation-only finding biting the VERB tier**. S86, S87 and S88 all treat the single-signal problem as being-discovery; none of them records that the same signal starves the verb vocabulary, which is why an English novel written in pronouns reads as nearly empty rather than as obviously broken.

**The lever already existed and was wired into nothing.** `discoverRelationVocab` accepts `anchorSpans`; `tests/levers.test.js` pins the property that matters — *"a name anchor and a bound-pronoun anchor SHARE the tally"* — and the producer chain is `adapters/text/perspective-claims.js::bindNarrationFrames` → `adapters/text/vocabulary.js::boundAnchorSpans`. Checked all three consumers before writing anything: not this driver, not `adapters/text/recursive.js`, not `live_priors/scripts/eot-sidecar.mjs`. This is the `build-pos-prior.mjs` incident from CLAUDE.md's own "search for the organ before you write one" section, repeating: a real, tested organ one directory over, one call away.

The same test file pins what the lever does NOT do, and it is the reason it is safe: *"unbound pronouns contribute NOTHING — the wall is positional, the string 'he' anchors nowhere by itself."* A pronoun licenses a discovery anchor only once BOUND to a referent. This widens what can be heard without lowering what must be earned.

**THE TRAP, and the reason this entry amends S95's own table.** The obvious move — pass `posPrior` to `discoverRelationVocab` the way the production recipe does, to filter the junk the anchors let in — **deletes the entire Ground grain.** Measured, both ways, on the same chapter:

| configuration | verbs earned | arrangements | Link | Field | Distinction |
|---|---|---|---|---|---|
| no anchors (the old reading) | 22 | 133 | 61 | 12 | 8 |
| anchors, no gate | 43 | 193 | — | — | — |
| anchors + `posPrior` on the VOCABULARY | 22 (a different, cleaner 22) | 84 | 84 | **0** | **0** |
| anchors + POS on the ARRANGEMENT | 43 | 162 | 83 | **36** | kept |

`posPriorGate` gates the vocabulary to verb-dominant forms, so "with", "after" and "or" never enter it, never become connectors, and `burning | with | curiosity` cannot be found at all. **The production recipe's own vocabulary gate encodes the Link-only assumption UPSTREAM of grain typing, and S95's rule cannot take effect behind it.** The gate belongs on the arrangement's connector, where the same received prior TYPES what was found instead of NARROWING what may be found — same evidence, same P56 asymmetry, one tier later.

**Still open, named rather than tuned away.** Ambiguous tokens (`very`, `so`, `own`, `my`, `best`) settle at no class under a 0.5 share, so they land in the grain-gap bucket and are kept alongside the legitimate unsettled cases like "to" — 43 grain gaps on this chapter, a mix of real absence-of-verdict and extraction artifact that this reading cannot currently tell apart. Chasing that further would mean fitting one chapter. And the anchors bind 40 of 87 sentences; the other 27 are refused by the recall floor, so their verbs remain unhearable.

**Not migrated.** `adapters/text/recursive.js` (the production reader) and `live_priors/scripts/eot-sidecar.mjs` still pass no `anchorSpans` and still gate the vocabulary rather than the arrangement. Every sidecar in that corpus carries this defect. That migration is real, scoped, unattempted work.

## S97 — Identity is a centre of expansion; ascending compresses and drilling re-expands; and surprise is graded, measured around the being (2026-09-09)

**Generality:** universal for the three rules; the corpus-decay check below is stated as a falsifiable prediction and is **currently untestable on this instrument** — see the last section, which is the honest part of this entry.

### 1. A referent is a centre of expansion, never a label on an arrangement's end.

`docs/THE-HOLOGRAPH.md` §1: an address expands to "the bytes, the claims around them, **the referent's whole neighbourhood**." So identity is the world folded around a being, and the being is the point the folding happens at. An `end1Ref` hanging off an arrangement is the annotation, not the thing; the thing is what the record can expand that id into. `kernel/reading.js` already wires `relevantNeighborhood` (with `adapters.selectNeighborhood`) for exactly this.

### 2. Ascending the terrain ladder COMPRESSES; drilling down RE-EXPANDS. They are inverses, and the ladder is a compression ladder.

`THE-HOLOGRAPH.md` §2, verbatim: "the level ladder is a compression ladder, and if it does not compress, the abstraction failed, not the consumer." Figure→Pattern (Entity→Kind, Link→Network, Lens→Paradigm) is the ascent. Drilling down is the same move reversed — and the record performs it, never the consumer, because "a model handed an address will write one, and a written address is a fabrication order."

**The top three tiers are admitted by prediction, mechanically.** `kernel/terrain-math.js::interpretiveParadigmModels` refuses to form a Paradigm unless `compressionGain > 0`, with ≥2 members and ≥2 independent grounds. A model that does not predict its members more cheaply than listing them is **not admitted**. Prediction is the entry fee for the Pattern tier; surprise is what later challenges it (`deriveSurprise`'s own `patternEffects`). `shannonEntropy` sits in the same file.

### 3. Surprise is GRADED and measured around the being — never a flag on the few observations that contradict something.

User direction, verbatim: *"it should all be surprising to some degree to move our knowledge of what we learn about alice for example."* Every arrangement moves what is known about the being it concerns, by some amount. The first thing said about Alice moves everything; the twentieth restatement of a relation already recorded moves almost nothing. The denominator is the being's own neighbourhood at the moment the observation arrives, walked in address order (= reading order). Nothing is thresholded: the measure counts what is new — a relation this being was never in, a partner it was never joined to — and the number rides for a consumer to weigh.

**A partner is a REFERENT, never a string.** The first cut used the other end's raw text and saturated instantly (novel-rate 1.00, familiar 0) because a full object phrase never repeats verbatim — measuring string variety and calling it knowledge. Same defect as ends-that-are-strings, one layer up, and worse there because it saturates a measurement rather than merely thinning one.

### 4. The first book read is the most surprising book ever read — and that decay is the instrument's own falsifiable check.

User direction, verbatim: *"the first book we read will be the most surprising book we've ever read."* This follows from the bootstrap with no slack: with no accumulated prior, everything is novel, so surprise is maximal by construction. As priors accumulate the novel-rate must FALL. **If it does not fall across a corpus, the priors are not accumulating and the reading is not learning** — which makes the decay curve a standing test of the whole apparatus, not a nice property of it.

**Measured, and it does not yet run.** Chapter 1 with no prior and Chapter 2 carrying Chapter 1 both report novel-rate **1.00, familiar 0**. Two separate attempts to make the number move failed, and the cause is not the metric: only 26 of 187 arrangements carry a referent at all, and those 26 spread across ~20 distinct verbs, so nothing recurs and every observation is novel by default. **The check is blocked on referent coverage, and is reported as blocked rather than as a passing result** — a decay curve computed over 26 observations would be a number about the sample, not about learning.

### 5. Two bypasses found the same day, both the "organ with no input" shape (P88).

**The driver bypassed the assembled reader.** `eval/lavar/eot-jsonl.mjs` called `extractRelations` directly instead of driving `createRecursiveReader`, and so hand-rolled a reading loop that discards four quantities the assembled reader already returns from every step (`reading.js:93`): `surprise` (`kernel/dynamics.js::deriveSurprise`, the delta's own profile — touched addresses, recanonicalizations, expectation and pattern effects), `tension` (`deriveTension` — open obligations, their interaction network, and how long each has persisted: this is strain), `release` (`deriveRelease`), and `relevantFold` (the neighbourhood). All four were reinvented worse or lost.

**And the assembled reader's dynamics are themselves inert, because nothing injects `ask`.** `kernel/interrogation.js::interrogateCube` reads `const answer = ask ? await ask({…}) : null`, so with no `ask` adapter every cube address answers `changed: false` with no effects, the delta carries no operations, and `deriveSurprise` profiles nothing. Measured: 87 encounters stepped through `createRecursiveReader` over Chapter 1 produce **zero surprise operations on every step** and 14 graph entries. Grepped: `createRecursiveReader` is called only by `tests/` and the docs — no production caller anywhere, and no caller at all injects `ask`. **A naive migration onto the assembled reader would have reported `surprise: 0` as though it were a measurement of the material.** Wiring `ask`/`revise` is the real work this names and does not attempt.

## S98 — How a reading is graded: the hand-rolled golden, its two properties, and the first honest baseline (2026-09-09)

**Generality:** universal for the method; the numbers are specimen-scoped (Alice chapters 1–3, 801 hand-authored propositions).

Everything before this entry measured the reader against itself. S98 is the method that stops that, and the first numbers it produced.

### 1. The golden is authored BEFORE the engine runs, and the engine never sees it.

`CLAUDE.md`'s own standing rule — "the engine never sees the reference — it is scored against it after the fact" — applied to reading. Author the golden by reading the chapter; only then run the reader; only then score. Reversing that order produces calibration against the answer key, which is the same defect as tuning a threshold against a golden's own score, aimed at the reference instead of the parameter.

### 2. Two properties make a golden trustworthy, and both were learned by getting them wrong.

**EVERY ANCHOR RESOLVES.** A golden quote absent from the chapter is an assertion about a text that does not exist. Enforced mechanically (`eval/lavar/golden-tool.mjs check`).

**EVERY SENTENCE IS ACCOUNTED FOR — silence is forbidden.** An omitted sentence cannot be distinguished from a missed one. Each sentence carries either a proposition or an explicit `EMPTY` claim naming why a reader draws nothing from it (an interjection, a vocative, an exclamative, a typographic row). This is LP10's "a real proposition or a typed gap, never a silent absence" turned on the reference rather than the reading.

**The incident this rule is named for.** Chapter 3's first golden held 47 propositions, covered 98 of 134 sentences, and its author believed it complete. It was missing the chapter's entire ending — seven sentences after the line that reads like a close. The coverage check caught it; **re-reading would not have, because a second read stops in the same place for the same reason.** The rewritten golden holds 257 propositions at 134/134. A golden that is a highlights reel also flatters the engine: the same reading scored 11% against the thin golden and 6.6% against the complete one.

### 3. Clause level, not salient-event level.

A chapter of ~134 sentences carries ~250 propositions, not ~50. Dialogue attributions (`X said …`) are propositions. Embedded recitations are propositions of a recited text and are marked as such rather than omitted, so a scorer can separate frame-crossing from extraction failure. Intransitive clauses are recorded with an empty second end rather than dropped — they are the reference's own statement that no object exists.

### 4. The first honest baseline.

| chapter | golden propositions | recall | emitted |
|---|---|---|---|
| 1 | 271 | 12.9% (35) | 162 |
| 2 | 273 | 14.3% (39) | 157 |
| 3 | 257 | 6.6% (17) | 135 |
| **total** | **801** | **11.4% (91)** | **454** |

**What the shape says, beyond the number.** 454 arrangements emitted against 91 that a reader would draw: the reader is not under-producing, it is producing largely the wrong things, and any work that raises emission without raising recall is moving the wrong quantity. **66 of 801 propositions (8.2%) are intransitive** and cannot be admitted under any configuration while `relations.js` requires both a subject group and an object group (S90) — a hard floor under every other improvement, now measured across three chapters instead of inferred from one.

### 5. Files.

`eval/lavar/golden-tool.mjs` (`sentences` | `check` | `build` | `score`). `eval/lavar/goldens/aiw-ch{1,2,3}.clauses.txt` — the authored source, one proposition per line, pipe-delimited, because hand-typing hundreds of JSON objects is its own error surface. `goldens/aiw-ch{1,2,3}.json` — built only when `check` passes, so a golden that fails either property cannot be scored against.

## S99 — Wiktionary is a prior, a model is a witness, and the two must not be confused (2026-09-09)

**Generality:** universal for the tier rule; the negative measurement it corrects is specimen-scoped and already on the record.

**Search first, and the record already answers half of this.** `docs/WHERE-WE-ARE.md` carries a MEASURED NEGATIVE on the Wiktionary route: across **1,404 notes on two genres, exactly one pair anywhere was blocked by the label alone**, because "a paraphrase never gets as far as having matching ends." Buying Wiktionary synonym sets for note-merging would have bought one candidate. That result stands and is not reopened here.

**What it does not close.** That test was of ONE use — merging paraphrased notes by synonymy. The ambiguity this reader actually carries is a different shape, and the goldens now name it: 66 intransitive clauses that the extraction gate cannot admit; 54 grain gaps in chapter 1 alone, dominated by tokens (`to`, `very`, `so`, `own`) that do not settle in a POS prior; and a possessive determiner (`our`) absent from every received determiner class, which is why a copular identity stated plainly in chapter 3 never fired and chapter 1's expectation is still open with its own corroboration sitting two chapters later.

Wiktionary speaks to all three, and to none of them as a thesaurus: **per-sense transitivity**, **sense-level part of speech**, and **closed-class membership**. Whether the available dumps actually carry those markings usably is unverified and is the first thing to check — a licensing run judged on **marginal admits, never aggregate coverage** (the same discipline LP11 already declares).

**THE TIER RULE, which is the durable part.** `WHERE-WE-ARE.md`, verbatim: *"A Wiktionary revision is a giver we can name and can concede when it is wrong. A model is neither."*

- **A lexicon joins the RECEIVED PRIORS.** It has a giver, a revision, and a concession path. It may gate, refuse, and type.
- **A model joins the WITNESSES.** `organs/testimony.js` holds the discipline: ONE claim, ONE page, ONE binary question asked TWICE (the claim, then its sibling-swapped twin), with the verdict derived mechanically from the pair — because gemma2:2b returned the right `because` and the wrong label, so classification was taken away from the model entirely. Its testimony lands typed beside the byte and structural tiers; it never becomes a prior, and it never gates.

A contested address (two readings of the same bytes, S95) is exactly the shape the witness tier answers: a binary question about one passage. A grain gap is exactly the shape the prior tier answers. Sending either to the other tier is the confusion this entry exists to prevent.

## S100 — The admission door still refuses what S95 says to keep, and the plan that follows from the three-chapter baseline (2026-09-09)

**Generality:** universal for the defect; the ordering below is derived from measurements over Alice ch1–3 and should be re-derived when the corpus widens.

### The defect: the Ground grain survives on an accident of wiring

`organs/hyperlexicon.js::admit` — the door every text reading passes through — carries one English gate:

```js
c?.settled && c.thraxClass && c.thraxClass !== VERB_CLASS
  ? { reason: REFUSALS.NOT_A_VERB, detail: `"${label}" settles as ${c.thraxClass}` }
```

A settled non-verb connector is refused. That refuses **every Field**: `burning | with | curiosity` settles "with" as a preposition and is turned away as "not a verb" — exactly the mistake S95 corrected, sitting live in the admission path.

**It is not firing today, and that is luck rather than design.** `live_priors/scripts/eot-sidecar.mjs` calls `admit(log, edges, { witness })` with no `classifyConnector`, and its recipe documents the organ as "per-EDGE DISCLOSURE ONLY, never gates admission." So the Ground grain is preserved because nobody wired the gate — and a future pass tightening precision would switch it on and silently delete a whole terrain.

**The fix is S96's correction one tier over:** the door should TYPE by grain, not REFUSE by non-verbness. Same received prior, same P56 asymmetry, one decision later — a settled preposition becomes `CON·Ground`, a conjunction `SEG·Figure`, and only a class that cannot head a relation at all (noun, adjective, adverb, pronoun) is refused. This is the third place the same confusion has been found: the vocabulary tier (S96), this driver's own typing (S95), and now the kernel-facing door.

**What the hyperlexicon is actually for, since this keeps being misread.** It is the TEXT FACE of `kernel/notes.js`, and its mechanism is accumulation across sightings — first sighting INS, re-sighting SYN, witnesses and spans unioned. The specimen it was built against was a wrong answer given "because nothing accumulated." Its value is therefore in the MERGE: the same assertion arriving from a second surface. In a single-document sidecar it is given a fresh ledger per file (a shared one would leak identity across documents), so it acts as a door and barely accumulates at all.

### The plan, ordered by measured leverage rather than by appetite

The baseline every item is judged against: **801 hand-authored propositions, 11.4% recall, 454 emitted against 91 a reader would draw** (S98). The ordering constraints are real and are stated with each item, because doing these in the wrong order produces numbers that cannot be interpreted.

**1. Type at the door instead of refusing (this entry).** Not a recall gain — a regression guard. Cheap, and it must land before anyone tries to improve precision, because the obvious precision move is to arm the gate that deletes the Ground grain.

**2. The mandatory-object gate (S90).** `relations.js` requires both a subject group and an object group, so **66 of 801 propositions (8.2%) cannot be admitted under any configuration.** This is the largest measured single gain available and it is a hard floor under everything else. Its own risk is precision: the gate currently suppresses a great deal of junk along with the intransitives, so this must be scored against all three goldens, not one.

**3. Referent coverage.** 26 of 187 arrangements carry a referent in ch1; 11 of 135 in ch3, where the bound-pronoun join reached `inBoundRange: 0`. **Two separate measurements are blocked behind this**: the surprise decay check (S97 — it reports 1.00 novel-rate on both chapters because 26 observations across ~20 verbs cannot recur) and any claim about the being-centred neighbourhood. Nothing downstream of referents can be honestly measured until this moves.

**4. Inject `ask` (S97).** `interrogateCube` reads `ask ? await ask(…) : null`, so `deriveSurprise`/`deriveTension`/`deriveRelease` profile nothing and 87 encounters yield zero operations. **Deliberately after 3**, because wiring the dynamics onto a reading whose referents are 14% covered produces better-typed zeros, not better readings.

**5. Wiktionary as a received prior (S99).** Per-sense transitivity, sense-level POS, closed-class membership — judged on marginal admits, never aggregate coverage, and only after checking the dumps actually carry those markings usably. **Deliberately after 2**, because transitivity's whole value is telling the extraction gate when no object is expected; bought before the gate can act on it, it buys nothing. The already-measured negative on the synonym route (1,404 notes, one candidate) stands and is not reopened.

**6. The precision problem, which is not yet diagnosed.** 454 emitted against 91 real is the largest number on the board and nobody has read the 363 non-matching arrangements to find out what they are. Until someone does, "improve precision" is not a task, it is a wish. This wants its own measurement pass before it becomes work.

**What is deliberately NOT on this list.** Migrating `eot-sidecar.mjs` to the ledger form (LP18/LP19) is real and disclosed, but it changes the artifact rather than the reading, so it buys no recall and should not be sequenced against items that do. And no item here may be scored on one chapter: three goldens exist precisely so that a number moving on one and not the others is visible as a specimen effect rather than a gain.

## S101 — 100% of a book's own words are recoverable from its ledger alone; the whole-book baseline, and four honest experiments against it (2026-09-09)

**Generality:** specimen-scoped. The recoverability metric itself is meant universally — it is a property `eot-jsonl.mjs` must hold for any chapter of any document — but the numbers in this entry (the 100%-recoverable result, the rereading gains, the witness-consistency rate, the drill-down shapes, the surprise-decay correlation) are all measured on one book, Alice in Wonderland chapters 1–12, and are reported at the strength they earned there, not generalized past it.

### The metric, stated so it can be checked, not asserted

User's own test, verbatim: *"can you reproduce the verbatim text from the holograph? that's the test."* `eval/lavar/recoverability.mjs` makes this literal: take every `role:"sentence"` and `role:"scene-break"` address on a chapter's ledger (the two roles `eot-jsonl.mjs` emits unconditionally, for every span, whether or not a proposition was ever extracted from it), merge them into a non-overlapping tiling of the chapter's byte window, and diff the reconstructed word sequence against the chapter's own words, in order. A byte range nothing addresses is a GAP — text nothing on the ledger ever heard, which no amount of drilling or rereading downstream could recover, because it was never admitted in the first place. This is deliberately NOT the golden-recall metric (S98) — it is a structural property of the ledger's own address coverage, independent of how much semantic content was extracted from what it covers.

One false positive found and fixed before trusting the number: ch1's two asterisk scene-break rows are tiled by BOTH `scene-break` and `sentence` roles (`splitSentences` treats each asterisk line as its own degenerate sentence too) — a `sentence` and a `scene-break` address citing the SAME bytes is not a defect, it is the holograph's own design ("every part points at the whole," plural lenses on one span), so the script merges overlapping tiles before checking for gaps rather than flagging the overlap as a failure.

**Measured, all 12 chapters, after reading each with every earlier chapter's earned vocabulary and cast as prior (26,171 words total): 100% recoverable, zero gaps, in every chapter.** `node eval/lavar/recoverability.mjs all`.

### The whole-book reading itself

Every chapter of Alice in Wonderland now has a ledger (`eval/lavar/results/pg11_Alice_s_Adventures_in_Wonderland-ch{1..12}.eot.jsonl`), each read with `--prior=` naming every chapter before it — the same reread mechanism S97 built, run the length of the book rather than three chapters deep. Hand-rolled clause-level goldens exist for chapters 1–4 (1,192 propositions total, each independently verified for zero unresolved anchors and full sentence coverage, per S98's own discipline) as the calibration set; extending goldens to chapters 5–12 is real, scoped, unattempted work, not required for the recoverability bar above, which holds over the whole book regardless.

### Experiment 1 — the power of rereading, measured against a much deeper prior than S97 tried

S97 reread ch1 with ch2 as prior. This pass rereads ch1, ch2, ch3 and ch4 each with **every other chapter in the book** as prior (ch1 gets 2–12; ch2 gets 1,3–12; and so on) — the deepest prior a reread of this book can carry.

| chapter | recall before | recall after whole-book reread | propositions found | contested addresses |
|---|---|---|---|---|
| ch1 | 12.8% (35/273) | **22.3% (61/273)** | +84 new, 82 unchanged | 18 |
| ch2 | 14.2% (39/274) | **21.2% (58/274)** | +88 new, 99 unchanged | 19 |
| ch3 | 8.2%\* | 8.2% (21/257) | +35 new, 83 unchanged | 12 |
| ch4 | 12.4% (48/388) | 12.9% (50/388) | +54 new, 176 unchanged | 13 |

\*ch3's golden was rebuilt mid-session (S98); the "before" figure here is its first post-rebuild score, already carrying ch1–2 as prior.

Recall nearly DOUBLED on ch1 and ch2 from rereading alone — zero new bytes read, zero code changed, purely from a fuller earned vocabulary letting the reader recognize verbs and relations in the SAME sentences it had already seen. `getting up | and | picking the daisies` — the exact coordinate branch hand-added to ch1's golden earlier this session as a fix for a truncated coordination — was independently found by the engine on this reread, confirming that fix targeted real, recoverable content rather than an artifact of hand-authoring.

**The gain is not uniform, and the reason is legible, not mysterious.** ch1 and ch2's FIRST readings had the thinnest priors (ch1: none; ch2: ch1 only), so a full-book reread had the most vocabulary left to add. ch4's first reading already carried priors 1–3, so most of the available gain was already banked before this pass — rereading has diminishing returns once a reasonable prior is already loaded, which is itself a testable, now-measured claim rather than an assumption.

**Every reread stayed inside S95's own rule.** `reread delta: N already recorded (not restated), M newly found, K contested addresses` on every run — nothing was overwritten; disagreements at the same address (e.g. ch1: `it | to | her that she ought to have wondered` [pass 1] vs `it occurred | to | her that...` [pass 2], where "occurred" only became an earned verb after reading the rest of the book) landed as typed `EOTContest@1` lines, untyped by kind per `kernel/notes.js`'s own rule, not silently resolved. And the whole book still passed the recoverability check above AFTER all four rereads — the append-only mechanism holds under a harder test than S97 ran it against.

### Experiment 2 — a local model as a witness on the ledger's own disclosed ambiguity, never as an oracle

Target: `role:"void"` lines — a third-person pronoun the reader's own recall floor already refused to bind (S95's SIG·Ground), not invented ambiguity. User's framing, verbatim: *"experiment with a local model pushing the 'physics' or 'chemistry' (not json oracle-ing)."* The discipline held to is `organs/testimony.js`'s own (S99): the model (gemma2:2b — kept small on purpose) never generates a referent from nothing; it SELECTS a number from a candidate list drawn from the chapter's own cast, and it is never trusted on one answer — the identical question is asked twice with the candidate list order reversed, a perturbation carrying no semantic content, and the verdict is DERIVED mechanically from whether the two answers name the same candidate. A pick that flips under mere reordering is echoing list position, not discriminating the referent, and is refused exactly as testimony.js refuses a witness whose verdict does not move under its own sibling-swap arm.

**Measured, 18 probes across 6 chapters (`eval/lavar/witness-referent.mjs`, results in `eval/lavar/results/witness-referent-results.json`): 9 consistent, 6 order-sensitive (refused), 3 unreadable.** Half the model's raw picks were pure position bias — exactly the failure mode this design exists to catch, caught.

**Consistency is not correctness, and one case proves it rather than just asserting it.** The model consistently picked "Mouse" for "he" in `Fury said to a mouse, That he met in the house` — surviving the reorder-arm cleanly — but ch3's own hand-built golden (line 184: `Fury | met | that in the house`) already resolves "he" as FURY, the poem's subject, not the mouse it met. A garden-path pronoun in embedded verse defeated a small model stably and confidently. The experiment's real finding is not "9 referents resolved" — it is that order-invariance is a necessary filter, not a sufficient one, and every "consistent" verdict here ships disclosed as unverified against ground truth, never as settled.

### Experiment 3 — drilling down: a referent's whole-book neighbourhood, and what its shape reveals

`kernel/hypergraph.js` + `kernel/interrogation.js` already carry a real neighbourhood-expansion organ (checked before writing anything new, per CLAUDE.md's own rule) — set aside with a stated reason, not missed: it walks the OLDER `Observation@1`/`EOHyperedge@1` schema family, and this session's `EOTObservation@1` ledger (S95) is a different schema it has no case for; feeding it this ledger directly would silently return an empty neighbourhood every run (P88's own trap). `eval/lavar/drill.mjs` does the same THING against the schema this session actually produces: union a referent's touches across all 12 chapters by surface (a being's auto-id is discovered fresh per chapter — S95's per-document boundary — so the same character can carry different ids book-wide).

- **Alice: 152 arrangements across all 12 chapters, 61 distinct labels — and ZERO with a resolved being-partner on the other end.** Every one of Alice's bound actions is with an object, not another being. This is the referent-coverage gap named in S100 item 3, now shown at whole-book scale rather than single-chapter: the reader knows what Alice DOES far better than who she does it WITH or TO.
- **The White Rabbit: 4 arrangements total, all in chapters 11–12.** Not a bug — checked directly against the ledger's own entity lines, which DO cast the Rabbit in chapters 1, 2 and 4. In those early chapters the Rabbit is narrated almost entirely as "it" (background, scurrying, rarely named), and those pronoun occurrences mostly land as unbound `void` lines rather than resolved arrangements. In the trial (ch11–12) the Rabbit is a named court official, repeatedly called "the White Rabbit," and those explicit namings bind cleanly. The SAME character's referent coverage swings on narrative register — pronoun-density versus name-density — not on anything about the character.
- **Dinah: zero arrangements, anywhere in the book**, despite being one of the most emotionally load-bearing referents in the text (Alice's homesickness token, invoked in nearly every chapter) — because Dinah is always talked ABOUT from a distance ("I wish you could see her," "she is such a dear quiet thing"), never physically on stage, and those embedded, reported-speech mentions sit outside the local-binding window the recall floor uses. The reader currently has no mechanism for a being who is only ever discussed, never present.

### Experiment 4 — the surprise-decay corollary, re-run at n=12 instead of n=2

S97's corollary: *"the first book we read will be the most surprising book we've ever read"* predicts novel-rate should FALL as priors accumulate. S97 measured this within single chapters and found it BLOCKED — novel-rate pinned at 1.00 on both ch1 (no prior) and ch2 (ch1 prior), because each chapter's own surprise tracker reset to zero every process run, independent of the vocabulary prior, and only 26-of-187 / 11-of-135 arrangements carried any referent to test recurrence against at all.

`eval/lavar/surprise-decay-wholebook.mjs` walks all 12 chapters' ledgers as ONE continuous stream, keeping a single `known` registry (labels/partners seen per referent) across chapter boundaries — the fix the single-chapter version was missing, not just more data. **The block is resolved: novel-rate is no longer pinned at 1.00 anywhere** (it ranges 0.375–0.739 across the 12 chapters). **The predicted direction holds, weakly: Pearson r = −0.330 between chapter order and novel-rate (ch1: 0.690 → ch12: 0.615), explaining roughly 11% of the variance.** This is real signal, not noise dressed up — but it is not a clean monotonic decay (ch3 dips to 0.455, ch4 rebounds to 0.714, ch9 is the actual floor at 0.375, and ch11–12's trial reintroduces old characters in new courtroom actions, landing in the middle of the range rather than at a new low). Reported at the strength it earned: the corollary is no longer unmeasurable, and the one measurement available leans its way, weakly.

### What this pass leaves for later, named rather than silently dropped

Goldens for chapters 5–12 (would let every experiment above run at full-book granularity instead of the 4-chapter calibration set). Feeding the EOT ledger schema through `kernel/hypergraph.js`'s real neighbourhood organ via a translation layer, instead of `drill.mjs`'s direct query. A being-who-is-only-discussed mechanism (Dinah's gap). And the S100 plan itself is untouched by this pass — it is still the ordered list to work through for RECALL; this entry is about a different axis, whether the ledger hears everything it is given, and whether accumulated reading measurably deepens what it hears from the SAME bytes.

## S102 — Spiralling out to a second text found a bug the first text's own convention could never exercise; and a lexicon is a prior, structurally incapable of carrying a referent (2026-09-09)

**Generality:** specimen-scoped for the transfer numbers (measured on The Picture of Dorian Gray only); universal for the heading-detection fix and the lexicon-loader's structural guarantee, both of which are properties of `eot-jsonl.mjs` itself, not of any one book.

**User direction, verbatim:** *"when you're confident, spiral out and do another text and use the priors from this as background for prediction and anything else that makes sense, though obviously not cross pollenating referents."*

### The bug S101's own recoverability check found on contact with a second book

Alice in Wonderland gives every chapter a real title line ("Down the Rabbit-Hole"). `eot-jsonl.mjs`'s chapter-heading regex — duplicated in `golden-tool.mjs` and `recoverability.mjs`, per this repo's own "reconcile, don't just dedupe" rule (`CLAUDE.md`) — captured whatever text sat on the line right after "CHAPTER I." and called it the title, without ever checking whether that line WAS a title. The Picture of Dorian Gray's chapters carry no title line at all — "CHAPTER I." goes straight to prose — and the regex swallowed the paragraph's own first physical line ("The studio was filled with the rich odour of roses, and when the light") as a fake title, shifting the chapter window's start to mid-sentence.

**Caught by the metric this session already built, not by inspection.** `recoverability.mjs 1 <dorian-gray-path>` reported 99.39% instead of 100%, with the gap landing exactly at the swallowed line's second physical line — the sentence that started under the fake "heading" was excluded by the window filter, byte for byte. AIW's own convention never exercised this branch, so it shipped as "100% recoverable, universal metric" in S101 while carrying a defect the corpus hadn't tested for yet — precisely why "spiral out" was worth doing rather than declaring victory on one book.

**The fix, applied identically in all three files:** a real title is bounded by blank lines on both sides, the same convention that makes it a heading rather than running prose. `raw[candidateEnd] === "\n"` (checked in each file's own coordinate space — normalised for `eot-jsonl.mjs`, raw CRLF for `recoverability.mjs`/`golden-tool.mjs`, since ledger addresses must match the origin bytes) distinguishes "Down the Rabbit-Hole\n\nAlice was..." (real title, blank line follows) from "...the light\nsummer wind..." (prose, no blank line follows — the naive capture was one physical line of a wrapped sentence). Regression-checked against all 12 AIW chapters and all 4 goldens after the fix: **identical numbers, byte for byte, zero change** — the fix only ever fires on the branch AIW never took. Dorian Gray chapters 1–3, re-read clean: **100% recoverable, all three.**

### A lexicon prior, made structurally incapable of carrying a referent

S99 places a lexicon in the received-priors tier, distinct from a witness. This entry adds the corollary the user's instruction demanded: a prior that crosses DOCUMENTS must not be able to carry REFERENT IDENTITY across them, because S95's per-document boundary makes identity non-transferable — Alice is not a candidate referent for a book that never mentions her, no matter how the vocabulary transfers.

`eot-jsonl.mjs` gained `--lexicon=<path>`, a loader kept deliberately narrower than `--prior=N` (same-document reread, which legitimately carries `cast` because it is the SAME beings). The lexicon file's shape has **no `cast` field the loader ever reads** — not "an empty array," a missing code path — so a lexicon cannot leak a referent by construction, not by the discipline of whoever built the file. It must name its own `giver` or the driver refuses to run.

**The lexicon built:** every verb earned across all 12 AIW chapters' own `.prior.json` files, unioned — 287 verbs, giver stated as "Alice in Wonderland, chapters 1–12, unioned." Fed into a genuinely cold first read of The Picture of Dorian Gray, chapter 1 (a different author, era-adjacent register, completely disjoint cast, no prior connection to AIW beyond both being English prose):

| | cold (no lexicon) | lexicon-primed |
|---|---|---|
| propositions | 285 | 377 (+92, +32%) |
| verbs earned from ch1's own bytes | 53 | 53 (unchanged — the lexicon adds, never replaces) |
| vocabulary after union | 53 | 317 (264 of the 287 offered verbs were new to this chapter) |
| typed absences | 145 | 72 |
| refusals | 50 | 246 |
| entities / voids (cast discovery) | 10 / 134 | **10 / 134 — byte-identical** |

**Referent isolation verified empirically, not just designed.** Dorian Gray's cast across chapters 1–3 (Dorian Gray, Lord Henry, Basil Hallward, Lady Brandon, plus known capitalised-word noise already documented elsewhere — Church, English, Greek, Grosvenor, Mr) was grepped against every AIW referent id and surface: zero matches anywhere except the lexicon's own disclosed `giver` string, which NAMES Alice in Wonderland as a citation, not as a referent. The entity/void counts being byte-identical between the cold and lexicon-primed reads is the strongest evidence available that the lexicon touched vocabulary and nothing else — if cast discovery had moved at all, the isolation claim would need re-examining rather than asserting.

**What the transfer bought, honestly.** More propositions ATTEMPTED (yield up 32%), but referent-bearing arrangements did not scale with it (37 with a referent id on the cold read of a smaller pool vs. 25 on the lexicon-primed read of a larger one) — the newly unlocked verbs are disproportionately NOT the ones that resolve to a referent. This mirrors S100's own item-2 observation about the mandatory-object gate: raising yield and raising referent coverage are different axes, and a lever that moves one is not assumed to move the other without checking.

### What this pass leaves for later

Only 3 of Dorian Gray's 20 chapters were read (enough to demonstrate cross-document transfer and referent isolation, not a whole-book claim the way S101 makes one for AIW — no golden exists for this book at all, so no recall number is claimed, only the structural ones above). Whether the transfer gain holds, grows, or saturates across a full second book is real, scoped, unattempted work.

### Addendum — the lexicon wired up as a standing, composable resource, not a one-off file

User direction, verbatim, after asking what the loader's no-cast guarantee actually meant: *"do we need it?"* then *"ok wire it up"* once the answer held up. Two changes:

**`eval/lavar/build-lexicon.mjs`** generalizes the inline one-off script that built the AIW lexicon: given a document's basename, it unions every `.prior.json` that document has earned (all chapters, or a named subset) into a `<basename>.lexicon.json`, giver stated automatically from the chapters it drew on. It reads `.prior.json` files and writes `{giver, verbs}` — the same structural guarantee as the loader (no code path here ever looks at `.cast` either). Regenerating AIW's lexicon through this tool reproduced the original 287-verb set byte for byte; a second lexicon was built for Dorian Gray (183 verbs, its own 3 read chapters) — the shelf now has two entries, growing with every document read rather than staying a single hand-built artifact.

**`--lexicon=` now takes a comma-separated list**, composing like `--prior=` already does, each entry independently required to name its own `giver`. Verified live: a genuinely new third text (A Tale of Two Cities, ch1, never read before) offered both lexicons at once — AIW's 287 verbs contributed 281 new, Dorian Gray's 183 contributed 113 more on top of that (70 already covered by AIW+the chapter's own vocabulary), each figure disclosed per-lexicon on the `EOTReadingPass@1` line rather than folded into one opaque total. Propositions found rose 76→90 on the same 20 sentences with zero new bytes read.

**A different, unrelated finding surfaced by the same test, disclosed rather than chased:** A Tale of Two Cities restarts "CHAPTER I." at the start of every Book (Book the First, Book the Second, Book the Third each number their own chapters from I), which `eot-jsonl.mjs`'s flat sequential-ordinal chapter detection does not account for — reading "chapter 1" of this file does not reliably mean what it means for a single-book novel. The scratch read that surfaced this was discarded rather than kept as a result, since its numbers reflect the wrong window, not the material. Fixing multi-book chapter numbering is real, scoped, unattempted work — named here so it is not rediscovered as new.

## S103 — Five languages, hand-evaluated: the ledger's address layer is language-general, the referent layer is not — it doesn't just underperform, it hijacks (2026-09-09)

**Generality:** specimen-scoped for every number (one Wikipedia article per language, one language-agnostic recoverability property tested five ways); universal for the mechanism-level findings (the `\b` boundary bug, the capitalisation-hijack failure mode) — both are properties of code and a script family, not of these five specific articles.

**User direction, verbatim:** *"do 5 more and evaluate by hand. do other languages"* — then, mid-turn, the reason stated directly: *"the other languages is crucial because it shows us if we are doing too much of an english shaped solution."*

### Finding the material: two corpus directories, one already-diagnosed defect, extended

`live_priors/01-literature-books/gutenberg/`'s language-tagged files (`pg10671_The_Iliad__Greek_.txt`, `pg17270_The_Aeneid__Latin_.txt`, `pg2636_Faust__German_.txt`, `pg5196_Don_Quixote__Spanish_.txt`) were checked before use and found to be five DIFFERENT books entirely (Erasmus Darwin's *The Botanic Garden*; an anonymous *Interlude of Wealth and Health*; Rafael Sabatini's *Historical Nights' Entertainment*; an unrelated "Romance of Santa Catalina") — none of it what the filename claims, none of it non-English. A search of other sessions' transcripts (`search_session_transcripts`) surfaced `live_priors/digested/CORPUS-INTEGRITY-FINDING.md`, an existing, more thorough version of the same finding against a DIFFERENT directory, `11-multi-language/gutenberg-non-en/`: **all 20 of 20 files checked disagree with their own path.** That document's own recommendation was followed rather than re-litigated: it names `11-multi-language/wikipedia-lang/` as individually verified, real, giver-cited (Wikipedia, CC BY-SA 4.0, real pageids) text in exactly the languages this pass needed. This entry's own gutenberg/ finding is new information (a THIRD corrupted directory, not the two already on record) and is filed as an addendum to that document rather than a separate one, per its own closing invitation.

### The five readings

French (fra), Turkish (tur), Korean (kor), Modern Greek (ell), Hebrew (heb) — chosen for script spread (Latin / Latin-agglutinative / Hangul / Greek / Hebrew-RTL) with a real POS prior already built for each (`native/priors/pos-{fra,tur,kor,ell,heb}.json`, Universal Dependencies treebanks, built by a concurrent session). Each source is a real Wikipedia "Philosophy" article, wrapped in a bare `CHAPTER I.\n<title>\n\n` header (the ONLY origin modification — the body is byte-identical to the verified corpus file) so `eot-jsonl.mjs`'s chapter-window detection has something to find; a Wikipedia article carries no narrative chapter structure of its own.

**`--lang=` added, deliberately narrow.** Swaps two things only: the POS prior path, and the pronoun regex the void-detector scans for (a small, disclosed, best-effort list per language — this project's own `NEGATION_WORDS`/`DEFINITE_DETERMINERS` precedent, never a claimed-complete paradigm). Everything else — sentence splitting, capitalisation-based referent discovery, the whole subject-inheritance nesting model, the positional (not case-marked) end-role assignment `eot-jsonl.mjs`'s own priors list already calls out by name ("case-marking is another language's prior, not a missing feature of this one") — is carried over from the English reading UNCHANGED, on purpose: the question is where those assumptions hold and where they silently produce nothing, not whether five languages can be made to look adapted.

**A bug found in the adaptation meant to TEST for English-shapedness, which is its own finding.** JavaScript's `\b` is an ASCII-only boundary (`\w` = `[A-Za-z0-9_]`) even with the `u` flag — a boundary check immediately against a Greek letter, a Hebrew letter, or Turkish's dotless-ı never fires, because both sides of the position read as "non-word" to `\b` and no transition is seen. Measured directly (`node -e`) before trusting any downstream number: `/\bαυτός\b/iu.test("και αυτός είναι")` → **false**; the same pattern without `\b` → true. The first pass's Greek reading reported **zero** voids — not because Greek pronouns are rare in the text (10 raw occurrences confirmed by grep) but because the boundary check silently never matched one. Fixed with an explicit `(?<![\p{L}\p{N}])...(?![\p{L}\p{N}])` lookaround; Greek's void count went 0 → 72 on the identical text, and Turkish's went 3 → 0 (the reverse direction — the broken check had been producing false positives there, not false negatives; Turkish's own pro-drop tendency plus this short article's register may simply not use the listed pronouns at the rate assumed). English, French and the Korean/Hebrew substring checks (which never used `\b`) were unaffected — verified by rerunning the AIW goldens byte-for-byte identical after the fix.

### Result 1 — the address layer does not care what language it is holding

`recoverability.mjs` (S101's own metric, made language-parametric via a `bookPath` argument for this pass) reports **100% recoverable, zero gaps, in all five languages** — Hebrew's right-to-left script, Korean's Hangul with no inter-character spacing signal, Greek's diacritics, all included. Sentence-splitting on terminal punctuation and the ledger's address-nesting architecture (S95) are the one part of this whole pipeline that is genuinely, measurably language-general. This is the positive half of the finding, and it should not be read past what it says: it is a claim about BYTE COVERAGE, not about whether anything USEFUL was extracted from those bytes — see Result 2.

### Result 2 — a gradient by script distance from Latin/capitalised, that collapses into something worse than "nothing" for two of five

| language | sentences | propositions | typed absences | entities | voids |
|---|---|---|---|---|---|
| French | 316 | 501 | 90 | 52 | 48 |
| Turkish | 126 | 100 | 67 | 22 | 0 |
| Greek | 271 | 85 | 178 | 15 | 72 |
| Korean | 129 | 4 | 127 | 1 | 5 |
| Hebrew | 136 | 3 | 134 | 4 | 34 |

French and Turkish (Latin script, a capitalisation convention loosely resembling English's) still produced real, if degraded, output — but the degradation is concrete and worth naming, not just "noisier": French produced `None | du | ` and `None | qui | ` (subject-span extraction failing outright on French clause shapes the English-tuned positional reader doesn't recognise, `qui` — a relative pronoun — mistyped as a connector), and `Étude d'un groupe | dans | la littérature grecque` (a citation's own internal apparatus read as if it were a clause of the article). Turkish surfaced `None | of | ` — the English word "of" appearing as a connector LABEL in a Turkish-language reading, because nothing about `--lang=` touches the small closed-class fallback vocabulary `extractRelations` itself carries, which is English.

**Korean and Greek's propositions are dominated by typed absence** (178/271 and 127/129 sentences respectively) — the referent-discovery mechanism (`extractSurfaces`/`discoverReferents`, capitalisation-based) finds almost nothing to anchor a candidate verb against, because Korean's script has no case distinction at all and Greek's does not capitalise common nouns any more freely than English does (the difference is that Greek's own proper-noun capitalisation didn't happen to coincide with much of this particular article's own vocabulary once the extraction chain's other English-shaped links are accounted for).

### Result 3 — the actual headline: capitalisation-based referent discovery doesn't just fail on non-Latin script, it hijacks the reading toward embedded English debris

Korean and Hebrew's propositions were read by hand — all 4, all 3 of them:

```
Korean:  enny Teichmann | and | Katherine C
         None | is |
         abstract | and | very general
         reason | and | human purpose
         A Guide | through | the Subject (Oxford University Press
         None | is |

Hebrew:  The School | of | Athens" by Raffaello Sanzio da Urbino
         The School | da | Urbino
         Internet Encyclopedia | of | Philosophyen-US2025-12-13}}
```

**Every single one of these seven propositions is built from ENGLISH-LANGUAGE citation and image-caption debris embedded in the Korean and Hebrew Wikipedia articles** — a bibliography entry ("Jenny Teichmann and Katherine C[oncannon], *Philosophy: A Guide through the Subject*, Oxford University Press"), an image credit ("The School of Athens by Raffaello Sanzio da Urbino"), a reference-template artifact ("Internet Encyclopedia of Philosophy," a citation timestamp). **None of the actual Korean or Hebrew prose — the article's real content — produced a single proposition in either reading.** This is not the same failure as Korean/Greek's typed-absence collapse above; it is worse, because the reading does not look empty. It looks like it read something, and reports a real cast (`entities: 1` for Korean, `4` for Hebrew) and real arrangements — all of it spurious, all of it English, none of it about the subject the article is actually about.

**The mechanism is legible, not mysterious.** `extractSurfaces`/`discoverReferents`'s capitalisation heuristic has NOTHING to seize on in the surrounding Hangul or Hebrew prose (neither script marks proper nouns by case at all), so the ONLY spans in the whole document that look like candidate referents to an English/Latin-capitalisation-tuned organ are the incidentally-capitalised English fragments sitting in the citation apparatus. Everything downstream — vocabulary discovery, clause extraction — organises itself around those few spurious anchors, because they are the only anchors available. A reader with no signal at all would report absence, honestly, the way most of Korean's 129 sentences did. A reader with a WRONG signal that happens to fire produces something that reads as content and is not — the more dangerous failure mode, and the one a recall percentage alone would never surface (both readings would score identically low against a golden; only reading the actual propositions by hand shows one is honestly empty and the other is confidently wrong).

### What this answers, and what it leaves open

The user's question — is this pipeline too English-shaped — has a real, two-part answer now instead of a guess: the ADDRESS layer (S95's core architecture) is not; the REFERENT layer is, badly, in a way that gets WORSE than silence for scripts with no capitalisation convention. Not attempted here, named for whoever picks it up next: a non-capitalisation referent-discovery signal (frequency-based nominal-phrase detection, or a language-specific named-entity list) for scripts where capitalisation carries no information; a filter that recognises and excludes citation/caption apparatus before extraction rather than after; genuine case-marking support for Turkish (`makeCaseMarkedRelationReader`, named but not built, per this driver's own priors-list entry); and real sentence-boundary conventions per script rather than one Latin-punctuation-shaped splitter. Five languages, one article each, is a stress test, not a benchmark — the numbers above are not claimed to generalise to a different genre, a longer document, or a different Wikipedia topic without checking again.

## S104 — The resemblance lens made active: a bulk, standing pass that recovers 33 previously-invisible beings across the whole book (2026-09-09)

**Generality:** specimen-scoped. The mechanism (a resemblance-based proposal, disposed of by the existing extraction machinery, never trusted on its own) is meant generally; the numbers below are measured on one book's whole-book run.

### From a measured specimen to an active system

S101's drill-down found Dinah with zero resolved arrangements anywhere in the book. A follow-up test (`eval/lavar/field-lens-improvement-test.mjs`) showed the-fold's `relative.js` Field — a sparse-distributed-representation resemblance lens, no referent identity, no addresses, pure bit-overlap — recovers gold-verified content for such "weak" referents at 73.5% in its own top-10%, against 14.6% for a matched random-cue control, generalized across 16 weak referents in the four hand-built goldens, not one specimen. User direction, verbatim: *"figure out how to use it on bulk, add more content and have this be some sort of active system that improves recall."*

**The governing discipline carries over from the theory this session already wrote (`docs/ATTENTION-PROPOSES-PRIORS-DISPOSE.md`): the Field proposes, the existing mechanism disposes.** It never gets to assert an arrangement. Every candidate sentence the Field's `recall()` surfaces for a specific under-covered referent is re-run through the SAME `extractRelations`/`grainOf`/referent-surface machinery the main read already uses, and a find is only ever kept if that machinery independently, mechanically confirms it is about the referent the Field recalled — never credited to the Field for merely sitting near it.

### The wrong way to wire it, found by testing, not designed around

The first cut ran the boost as a step INSIDE `eot-jsonl.mjs`'s own invocation, immediately after the reread-delta reconciliation. Comparing before/after inside that one run looked like a real regression — ch2's golden score fell from 58/274 to 54/274 — and chasing it head-on would have meant debugging two structural interventions (the reread's own contest/dedup logic, and the boost's own referent-scoped dedup) tangled in one pass. A from-scratch regeneration with the boost code entirely removed reproduced the identical 54/274 — the shift was the sibling session's own concurrent `--lang=` merge (S103, commit `75beead`) landing between the two measurements, unrelated to this work. The deeper lesson, independent of which specific thing was actually at fault: **two structural interventions composed in one invocation are indistinguishable from a real regression until isolated, so they don't get to share an invocation.** `field-lens-boost.mjs` is therefore a genuinely separate, standalone, post-hoc script — it reads an already-finished ledger and its `.prior.json` vocabulary, and only ever appends. It never re-enters `eot-jsonl.mjs`'s own read/reread machinery.

**A second real bug, also found by running it, not by reasoning about it:** the first "already covered" check skipped a candidate sentence if ANY existing proposition touched its byte range — which starved the boost on exactly the chapters richest in other content (ch1: 0 finds), since a densely-annotated chapter has SOME proposition addressed at nearly every sentence, regardless of whether the specific target referent was ever bound there. Fixed by scoping "already covered" to whether THIS referent specifically was already resolved in that range, not whether anything was.

### The reusable organ, extracted rather than duplicated

`grainOf`/`thraxOf`/`GRAIN_BY_THRAX` moved out of `eot-jsonl.mjs` into `eval/lavar/grain-typing.mjs`, a pure factory (`makeGrainTyper(posPrior)`) — not duplicated, per this repo's own reconcile-don't-dedupe rule. Importing `eot-jsonl.mjs` itself as a module was considered and rejected: it is a script with top-level side effects tied to its own CLI contract (argv parsing, file reads), and importing it from a second script would run that top-level body against whatever argv the SECOND script happened to receive — the extraction avoids this by construction, not by convention.

### Measured, whole-book, standalone

`node field-lens-boost.mjs <book> 1,2,3,4,5,6,7,8,9,10,11,12`: **68 new propositions appended across the whole book**, from 40 referent/chapter pairs the pass touched. **33 of those 40 went from zero resolved arrangements to real, typed, address-verified content** — the Queen (0→4 in ch11, 0→1 in ch6, 0→3 in ch9), the King (0→3 in ch11, 3→5 in ch12), the Dormouse (2→4 in ch11, 0→3 in ch7), the Hatter, Gryphon, Duchess, Bill, the White Rabbit (0→1 in ch8, 2→3 in ch11), Dinah (ch3 and ch4), Mabel, Mouse, Dodo, Lory, Pigeon, Cheshire Cat, Knave, Tortoise, Lizard, the Mock Turtle (6→8). This is not one specimen — it is nearly every named being in the second half of the book that the address-based extraction had never bound.

**Verified, not assumed, before trusting the total.** `recoverability.mjs all`: still 100% recoverable, all 12 chapters, after the bulk append — the boost only ever adds addresses that self-verify against the origin bytes, never touches the sentence/scene-break tiling. Golden scores on ch1–4: byte-identical before and after (61/273, 54/274, 21/257, 50/388) — genuinely additive, zero regression, confirmed by running the check, not asserted from the design.

### What did not move, and why that is a separate, honest finding

The hand-authored clause-level golden score did not rise on any of the four chapters, even though real, correct, referent-targeted content was added. Inspecting the actual finds explains why without needing a new theory: *"The Rabbit | started | violently"*, *"the Dodo | replied | very gravely"*, *"I | had | our Dinah here"* are genuine, correctly-typed readings of real sentences — but `extractRelations` sometimes segments a sentence differently than the golden's own hand-chosen clause boundary did (a different, also-valid subject/object split of the same clause), so the automated match against the golden's specific `label`/`end2` text fails even though the content is real. **Referent-coverage recall (does the ledger bind ANY resolved arrangement to this being) and golden-clause recall (does the ledger match THIS exact hand-authored segmentation) are two different metrics, and this pass demonstrably improves the first without moving the second in this run.** Both are disclosed, not just the one that looks good.

### What this pass does not claim

The Field's own built-in significance gate (`recallAgainstNull`) was not consulted here at all — the boost's own dedup and "aboutTarget" checks (referent-surface confirmation from the independently-run extractor) are what license each keep, not the Field's null band, which S101's earlier theory-testing already found miscalibrated for this corpus's short-sentence density. Whether the 68 new propositions are semantically as reliable as the main pass's own finds is not separately audited here beyond the referent-surface confirmation gate; a hand-check across a sample, the way S98 checked hand-built goldens, is real, scoped, unattempted follow-up.

### Correction, same day — the 68 propositions are not new. All 68 are duplicates.

User direction, verbatim: *"compare the new version to the golden, line for line."* Doing that by hand surfaced two lines that looked like exact golden matches the score should have caught — `The Rabbit | started | violently` in ch2, `I | will tell | you how the Dodo managed it` in ch3, both word-for-word identical to gold. Checking why the score never moved found the real answer: **both are byte-for-byte duplicates of a proposition already in the ledger at the identical address, `foundViaFieldLens: false` and `foundViaFieldLens: true` copies side by side**, and neither copy carries a resolved `end1Ref`/`end2Ref` to the referent it was supposedly recovering. Auditing all 68 (`ch1..12`, exact address + case-folded label + case-folded end2 match against every non-boosted proposition): **68 of 68 are duplicates. `bound: 0`. `surfaceOnly: 0`.** The "33 of 40 referents recovered" claim above, and the whole-book coverage table under it, is **retracted** — it counted `fieldTargetReferent` tags as if they were resolved bindings, and none of the 68 lines is one.

**The root cause is structural, not a tuning miss.** `extractRelations` is a pure function of (sentence text, vocabulary options). `eot-jsonl.mjs`'s own main loop already calls it on EVERY sentence in the chapter, not a sample — so by the time the boost pass's `recall()` surfaces a candidate sentence, that sentence has already been run through the identical extractor with the identical vocabulary (reconstructed from the same `.prior.json` files). A pure function given unchanged inputs cannot return a different output. The `aboutTarget` gate (does the referent's surface literally appear in what came back) was always going to admit exactly the outputs already on record, because the sentences carrying that surface are precisely what the Field's cue-recall surfaces most strongly — and those are precisely the sentences the main pass already tried. The "weak referent" diagnosis underneath all of this stays correct and re-confirmed (the address system genuinely under-binds Dinah, Bill, the Queen, and the rest, at the rates originally measured) — the fix built on top of it does not close that gap, because it reruns the exact same failing resolver on the exact same bytes.

**What would actually need to change, named rather than attempted here:** the boost would need to alter something about the extraction itself for a recalled candidate — inject the target referent as a forced or inherited subject (the shape `readClause`'s own nested-clause subject-inheritance already uses), or let the Field's resemblance resolve a pronoun to the referent where the main pass's stricter resolver refused, rather than re-running `extractRelations` unmodified on bytes it has already seen. Neither is built. `field-lens-boost.mjs` as it stands is a verified no-op dressed as discovery, and this entry exists so the next session does not trust its own headline number without re-deriving it — the way this correction had to.

## S105 — The real fix: `endRef` gains a third tier, and the reread mechanism learns to rebind without restating (2026-09-09)

**Generality:** specimen-scoped. The mechanism (a third referent-resolution tier in `endRef`, plus a "rebound" revision path and a contest-dedup fix in the reread-delta reconciliation) is meant universally — properties of `eot-jsonl.mjs` itself, for any chapter of any document that rereads — but the 268-revision total below is measured on one book's 12 chapters.

### What S104's correction named as needed, built on resolution rather than on `field-lens-boost.mjs`

S104's correction diagnosed the boost's failure precisely: it could never find anything new because it re-ran `extractRelations` — a pure function — on sentences the main pass had already read with identical inputs, and named the real fix as a change to RESOLUTION, not extraction. Built here is a narrower, more mechanical version of that: no Field, no recall, no resemblance — a real gap in `endRef` itself, findable by inspection once the boost's own diagnostic pointed at "resolution, not extraction."

### The gap: `endRef` only ever matched a BARE surface

Before this pass, an end resolved to a referent two ways: (1) the surface IS a known cast name, exact string match against `surfaceToReferent`; (2) the surface is a bare pronoun sitting inside a bound sentence range (`pronounResolver`'s range join, keyed on an exact single-token match against `she`/`he`/`it`/etc.). Neither tier ever looks INSIDE a longer captured phrase. `extractRelations` keeps determiners and modifiers on its subject/object groups constantly — "our Dinah here," "poor Alice," "The White Rabbit" — so a captured phrase carrying a perfectly good cast name inside it, plus other words, matched neither tier and recorded no referent at all. Confirmed directly on the existing ledger before writing a line of the fix: ch3 already carried `I | had | our Dinah here` with both ends bare, sitting on the record unresolved since S97's own deep reread.

### Tier 3: unambiguous substring containment against the SAME cast map, nothing new admitted

`surfaceContainmentRef` scans the same `surfaceToReferent` map tier 1 already reads (real cast surfaces, already vetted by `discoverReferents` — no new naming mechanism), and checks whether exactly one referent's own surface (3+ characters, whole-word boundary, case-sensitive against the raw capitalisation) is contained in the candidate text. **Committed only when exactly one referent matches** — P38's own rule, applied here as everywhere else in this file: two different referents' surfaces both matching a phrase is an ambiguous containment, left unresolved rather than guessed. `endRef` tries tier 1, then tier 2, then this, in order.

### The masking bug this surfaced: a reread's "unchanged" is blind to everything but end1/label/end2

Wiring tier 3 in and regenerating showed no effect on any chapter but ch1 — the Dinah line stayed unresolved even with the fix demonstrably firing (confirmed by direct instrumentation: `surfaceContainmentRef("our Dinah here")` correctly returns `ref:auto:dinah`). The reread-delta reconciliation classifies a freshly-extracted clause as "unchanged" purely by `(address, end1, label, end2)` — the same key comparison that already, correctly, keeps a reread from restating what it already found. But an "unchanged" clause is emitted into the final ledger as the OLD `priorLines` entry, verbatim, not the fresh extraction — so any improvement to a field the key doesn't cover (here, `end1Ref`/`end2Ref`) is silently discarded even when the fresh pass found it. This is a real, general gap in the reread mechanism, not specific to tier 3: any future improvement to resolution, typing, or grain would hit the exact same wall.

**The fix, following this ledger's own append-only law rather than editing the kept line:** a new `rebound` category. For each "unchanged" clause whose fresh extraction newly carries an `end1Ref`/`end2Ref` the kept `priorLines` entry lacks, an `EOTRevision@1` line is appended — the same schema already used for the hand-checked corrections earlier in this file, `supersedes: <old id>`, same clause, only the newly-resolved referent field added. The old line is never touched.

### A second bug, found running the fix, not designed around

Isolating the fix's effect meant re-running each chapter's existing reread at its OWN already-recorded prior depth (ch1–4 at the S97 deep depth — every other chapter as prior; ch5–12 at their existing simple cumulative depth) — deliberately not deepening anyone's prior set further, so any difference is attributable only to `endRef`'s new tier, not to a newly-widened vocabulary (S104's own "don't compose two structural interventions" lesson, applied here on purpose). Doing that on ch1–4, which had each already been reread once before, reproduced 18/13/12/13 EXACT duplicate `EOTContest@1` lines — the proposition dedup checks `priorProps` (schema `EOTObservation@1`) only, and a contest's losing reading is never pushed as one, so nothing records that this exact disagreement was already settled, and a third pass re-litigates it from scratch. Fixed the same way as the rebound gap: a `priorContestKeys` set built from every prior `EOTContest@1`'s own `readings`, checked before a fresh candidate is allowed to become a new contest. A related reporting bug, found while fixing this: the ledger's own `EOTReadingPass@1.delta.new` field had always been the raw candidate count (`fresh.length`), never adjusted for how many turned out to be contests — silently overcounting since before this pass touched anything. Both `delta.new` and the console disclosure now report the true count, with the skipped-as-already-settled tally named as its own field rather than folded into either.

### Measured, whole book, after both fixes

Restoring the true pre-fix baseline and re-running one isolated reread-append pass per chapter (same prior depth each chapter already had) with the fixed code:

- **268 `EOTRevision@1` rebound lines appended across the 12 chapters** — ch1:20, ch2:14, ch3:14, ch4:27, ch5:14, ch6:18, ch7:30, ch8:30, ch9:33, ch10:14, ch11:35, ch12:20. Every one is a referent binding on a clause that already existed on the record, newly resolved — never a duplicate of the clause itself.
- `recoverability.mjs all`: still 100% recoverable, all 12 chapters.
- Golden scores ch1–4: byte-identical to the pre-fix baseline (61/273, 54/274, 21/257, 50/388) — this pass adds referent bindings, not new clause segmentations, so it was never going to move a metric that only checks label/end2 text; consistent with S104's own "referent-coverage recall and golden-clause recall are two different metrics" finding.
- Zero duplicate propositions, zero duplicate contest readings anywhere in any of the 12 ledgers, confirmed by direct address+text audit across the whole book, not assumed from the mechanism's own design — the same standard S104's correction held itself to.
- The Dinah specimen this whole thread started from: `EOTObservation@1 o380` (`I | had | our Dinah here`) kept exactly as first read; `EOTRevision@1 supersedes:o380` appended beside it carrying `end2Ref: ref:auto:dinah`.

### What this does not claim

This closes the specific gap S104's correction diagnosed and named — a captured phrase containing a known name, never unwrapped. It does not touch the harder cases the same correction also gestured at: a pronoun the main resolver's stricter recall floor refused to bind (still typed as `role:"void"`, unchanged by this pass), or a being that never gets admitted as a nameable referent at all — no surface in `surfaceToReferent` for tier 3 to match against in the first place, since a substring check over an empty candidate set finds nothing. That second case is a different, deeper gap than anything fixed here: it is not that a known name sits unresolved inside a longer phrase, but that no name was ever admitted to look for. Real, scoped, unattempted follow-up: what such a being's presence looks like on the record — recurring mentions, a resemblance cluster, never a bound identity — and whether it is safe to type at all without inventing a referent this ledger has no warrant to assert. The 268 rebound lines are real, mechanically verified, referent-scoped, and additive; they are also a modest fraction of the void/unresolved-end population still on the record, which is unaffected by this pass and remains real, disclosed, unclosed work.

## S106 — Naming the deeper gap: a "dark referent," grounded, found, and shown to cluster better than chance (2026-09-09)

**Generality:** specimen-scoped. The definition and the test method are meant to generalize to any document; the four specimens and the 12-pair result below are measured on one book, and the sample is small enough that this is a first measurement, not a settled one.

### What a "dark referent" is, in this system's own terms — not an analogy stretched further than the code supports

User direction, verbatim: *"consider the role of dark referents"* / *"wire this in."* The term does not predate this entry anywhere in this codebase; it names something real once checked against the actual admission code rather than left as a dark-matter metaphor. `surfaces.js` gates a referent id two ways: `CAP_TOKEN` (a definite description like "the cook" is all-lowercase and never starts a candidate run at all — structurally excluded before any counting happens) and, for a capitalised candidate, `sentencesFloorOf`'s recurrence floor (`surfaces.js:1136`, `if (sentences <= sentencesFloorOf(entry)) continue`) — a `continue` that drops the entry with **zero trace**: not an `events` row, not a `gaps` row, nothing. A dark referent is a being that clears **neither** gate and so leaves nothing on the ledger anywhere — not a `referent_id` (that's an admitted-but-unresolved referent, an existing `endRef`-tier problem), and not a `role:"void"` line either, because void is typed only for a PRONOUN that failed to clear the recall floor; a dark referent is nominal, never even a pronoun-shaped candidate. Its only evidence is relational recurrence: the same description doing and receiving the same kinds of action across spans, never a name.

### Real specimens, found by grep against the actual ledgers, not invented

Cross-checked against the full 55-referent roster (all 12 chapters' `role:"entity"` lines): **the jury** (addressed by name, writes a verdict, recurs across ch11 and ch12 — every other courtroom figure, King/Queen/Knave, has an id; the jury does not), **the cook** (ch6, ch8, ch11 — excluded structurally, "cook" never capitalised), **the puppy**/"an enormous puppy" (ch4, a whole named scene-animal), **the hedgehog** (ch8). All four checked clean: no substring match against any of the 55 admitted surfaces, in either direction.

### The test: can resemblance alone cluster a dark referent's mentions, with no name to cue on?

The question this asks is deliberately narrower than S104's field-lens-boost work: not "does Field find sentences about a KNOWN referent's name" (already measured, `field-lens-improvement-test.mjs`) but "do SEVERAL scattered mentions of the SAME never-admitted being, cued only by their OWN sentence text, rank each other above where an unrelated random sentence would land." `dark-referent-cluster-test.mjs` (new): for each specimen with 2+ independent mentions inside ONE chapter (Field is built per-chapter, so the jury's cross-chapter recurrence is tested once per chapter, not combined) — puppy (ch4, 2 siblings), hedgehog (ch8, 3 siblings), jury (ch11, 2), jury (ch12, 2) — admits that chapter's own sentences into a `Field` (same construction `field-lens-improvement-test.mjs` already validated), recalls FROM each sibling's own sentence text, and checks whether the OTHER siblings land in the top-10%. **The sibling grouping is hand-identified from the grep above, disclosed as ground truth under test, not something the mechanism discovers on its own.** Control, adapted rather than reused unmodified because the cue here is a whole sentence, not a one-or-two-word name (the field-api research this session flagged the existing script's own word-vs-token-count null as a minor mismatch worth not repeating): 15 random WHOLE SENTENCES per specimen, same top-K sibling-membership check, same bare "beats chance" inequality this project already uses (`field-lens-improvement-test.mjs`, `CLAUDE.md`'s own "never a hand-set threshold, prefer a measured null").

One real, disclosed snag before the result: `chapterSentences`'s split regex breaks after every closing curly quote, not only a sentence-final one, so a mid-sentence dialogue attribution ("Consider your verdict," the King said to the jury.") comes out as two fragments, not one. Found by the jury specimens failing to match their anchors on the first run; fixed by anchoring to the real fragments the split actually produces, not by changing the split (not this file's mechanism to alter).

**Result: 10 of 12 sibling-ordered-pairs recovered by the real sentence cue (83.3%), against 1.53 expected by the random-sentence control (12.8%) — REAL SIBLING CUE BEATS THE RANDOM-SENTENCE CONTROL, and 7 of the 10 hits clear `nullBand`'s own significance margin.** Per specimen: puppy 1/2, hedgehog 5/6 (3 significant), jury-ch11 2/2 (both significant), jury-ch12 2/2 (both significant) — every specimen beat its own control rate. `eval/lavar/results/dark-referent-cluster-test.json` carries the full per-specimen numbers.

### What this licenses, and what it does not

This is a measurement, not a mechanism wired into the reader. It shows resemblance carries a genuine, non-trivial signal for a problem that has no name to search with — the load-bearing precondition for anything built on top, and the reason it was checked before anything else was attempted. It does NOT show that this signal is strong enough, on its own, to safely MINT a referent id and start binding propositions to it — 12 pairs across 4 specimens in one book is a first measurement, not a calibrated operating point, and this project's own standing rule (`CLAUDE.md`, "never tune a parameter by checking what it does to a golden's own score") applies exactly as hard to a future admission threshold for this signal as it did to `minArrivals`. Per the theory this session already committed (`docs/ATTENTION-PROPOSES-PRIORS-DISPOSE.md`) and the discipline S104's field-lens work already earned the hard way: this result is a PROPOSAL only. What DISPOSES — an independent, mechanical check that a proposed cluster is really one being before anything is typed as a referent on the strength of resemblance alone — is real, scoped, and not built here.

## S107 — Reading two more books surfaces two real heading-convention bugs by hand; a REC-style detector replaces the hand-patching (2026-09-09/10)

**Generality:** specimen-scoped for the numbers; universal for the mechanism. `structure-rec.mjs` and `heading-conventions.json` are meant to work on any document; the four specimens below (three real, one synthetic — disclosed as such) are what they were actually run against so far.

### Two more hand-found bugs, the same way S102 found the first one

User direction: *"LaVar, read some more books and judge the quality of the EOT files."* Frankenstein and (an illustrated edition of) Pride and Prejudice were the next two picked, after a full population check of `01-literature-books/gutenberg/` found the corpus itself is ~46% mislabeled (documented separately, `live_priors/digested/CORPUS-INTEGRITY-FINDING.md`, second addendum) — not touched further here except to note it made "which book is this, really" a live question before any of this could start.

**Frankenstein uses "Chapter 1"** — a word, mixed case, an Arabic numeral, no period — not "CHAPTER I." `eot-jsonl.mjs`'s own heading regex matched zero headings; fixed by adding a second alternative to the SAME regex (Roman-numeral branch's own exact shape left untouched, so nothing already verified against AIW or Dorian Gray could start matching differently), applied identically to `recoverability.mjs`'s own copy (same duplication this project's own S102 entry already named). Regression-checked against AIW (12/12 chapters, still 100% recoverable) and Dorian Gray (ch1-3, still 100% recoverable) before trusting it on Frankenstein, which then read clean: ch1-3, 100% recoverable, each. A second bug surfaced immediately by reading the OWN disclosure the fix produced: every chapter's `basis` field said `"a 'CHAPTER <roman>.' line..."` even for the 24 chapters that matched the NEW Arabic branch — the exact failure `infer()`'s own header warns against, an inference recorded with the wrong evidence named. Fixed by threading which alternative actually matched through to the basis string.

**Pride and Prejudice (this specific illustrated Gutenberg edition) buries its real "Chapter I." inside an `[Illustration: ·PRIDE AND PREJUDICE·` ... `Chapter I.]` caption block** — lower-case "hapter", a closing bracket instead of a newline, invisible to any reasonable heading regex. Confirmed directly: `eot-jsonl.mjs`'s own "chapter 1" for this file reads bytes that are actually the real book's chapter 2 (Mrs. Bennet scolding a daughter, nowhere near "It is a truth universally acknowledged"). Every OTHER chapter (II onward) is plain, correctly-formatted "CHAPTER II." and reads fine — meaning the reader's own numbering is off by exactly one for this whole file, silently, a confidently-wrong reading rather than an absent one (S103's own standing worry). Judged too narrow and too risky to patch with a bespoke regex from a single specimen (an illustration-embedded first heading is a real but rare edition artifact) — disclosed here, not fixed, and Through the Looking Glass (plain "CHAPTER I.", identity-confirmed) was read in its place.

### The deeper point the second fix already was: a program, not another hand-patch

Both fixes above were correct, but User direction, verbatim, named the actual problem with the PROCESS: *"develop the... structure system as needed to detect structure and identify it and have this be a repeated program used that gets REC'd as needed, using model call as needed."* Named after this codebase's own existing "REC" (re-zero) idea (`packages/engine/loops/atmosphere.js`, `CLAUDE.md`'s own entry on it): keep running on the CURRENT model of the material until a MEASURED trigger says it no longer explains what's being read, and only then re-ground — never re-derive on a guess, never on a schedule.

`structure-rec.mjs` (new) + `heading-conventions.json` (new, a growing, disclosed library — not a hand-typed closed class): three tiers, escalating only as far as needed.

- **Tier 1 — known conventions, mechanical.** Every convention this project has actually confirmed (`CHAPTER <roman>.`, `Chapter <arabic>`, now also `<roman>.` with the title on the same line — see below) is tried; >=2 matches is the floor (you cannot observe a repeating convention from one instance — a mathematical floor, not a tuned one), most matches wins.
- **REC trigger:** no known convention reaches 2 matches. One condition, a count, not a guess.
- **Tier 2 — skeleton recurrence, still mechanical.** Candidate lines: short, blank-line-bounded on both sides, reduced to a skeleton (letter-runs -> W, digits -> #, a Roman-numeral-shaped token -> @, consecutive W's collapsed to one so a title's own word count is never part of the shape), grouped, and a group whose numeral increases monotonically in document order is accepted WITHOUT a model call — an incidental repeated phrase does not count upward.
- **Tier 3 — model witness, only when tier 2's own group has no monotonic numeral to independently confirm it.** Same discipline `witness-referent.mjs` already established: a closed two-option forced choice, asked twice with the sample lines reversed, trusted only on agreement.

A convention accepted at tier 2 or 3 is APPENDED to `heading-conventions.json` — the next document with the same shape is a tier-1 hit. That is the "repeated program" asked for: each new book either confirms what's already known or adds to it, on the record, rather than a human re-deriving the same fix by hand every time.

### Three real bugs found running this, not designed around — the pattern this whole session already lives by, applied to its own new tool

Tested against the REAL Sherlock Holmes text (found, ironically, sitting mislabeled as `pg1661_The_Adventures_of_Tom_Sawyer.txt` before the corpus-integrity pass fixed it — copied to a stable scratch fixture first specifically so a concurrently-running corpus-repair agent could not race this test). First run: wrong answer, twice over, both caught by running it rather than reasoning about it.

1. **Short, blank-bounded is not enough to mean "heading."** This text is dialogue-heavy; a one-line paragraph of quoted speech (`"Frequently."`, `"How often?"`) is exactly as short and exactly as isolated as a real heading, and there are far more of them — the ten largest skeleton groups were all quoted dialogue, the largest (44 members) beating every real heading group in size outright. Fixed: a candidate line that starts or ends with a quotation mark is excluded — a real, near-universal typographic distinction (a heading is not quoted), not a hand-tuned threshold.
2. **A title's own word count is not part of the convention.** Even with dialogue excluded, "VI. THE MAN WITH THE TWISTED LIP" (six title words) and "I. A SCANDAL IN BOHEMIA" (four) skeletonized DIFFERENTLY under the first version (one `W` per word) and fragmented one real, book-wide convention into a dozen small buckets — several of which still lost to unrelated short-sentence groups by member count. Fixed by collapsing any RUN of consecutive word-tokens to one placeholder, the same reason `eot-jsonl.mjs`'s own heading regex captures a title as `[^\n]*` rather than counting words in it.
3. **The word/numeral parser assumed an order that isn't universal.** The first version took "the first run of letters" as "the marker word," unconditionally — and a Roman numeral IS a run of letters, so "VI. THE MAN..." proposed a convention with `word: "VI"`, nonsense that would have gone straight into the library were the other two bugs not also live. Fixed by adding a real THIRD shape this schema hadn't considered at all — `titleOnSameLine` (numeral, then its title, sharing one line, no separate marker word) — alongside the two it already had (word-first; bare numeral alone), tried in an order that can't miscategorize a real instance of either of the other two.

**Verified, whole thing, after all three fixes:** AIW (12/12 chapters) and Frankenstein (both, tier 1, zero model calls, unchanged) still hit their own known conventions correctly; the real Sherlock Holmes text now clusters all 12 chapters into one skeleton group (`"@. W"`, numerals 1 through 12, strictly monotonic) and derives `{word: null, numeralType: "roman", requiresPeriod: true, titleOnSameLine: true}` — correct, on the record, and now a tier-1 hit for any future document with this shape.

### Tier 3 actually fired, once, on purpose — and it exposed a real, disclosed weakness of its own

A fourth specimen, honestly disclosed as SYNTHETIC (a short constructed text, not a real book — nothing in the confirmed-good corpus was known to use spelled-out numeral words like "PART ONE"), was built specifically to exercise the one path the other three specimens never reached: a numeral word `numeralValue()` cannot parse ("ONE", "TWO", "THREE" — only digits and Roman letters are recognized), so tier 2 cannot confirm monotonicity and must escalate. It did: the model was asked the real, closed, two-option question, twice, with the sample reversed, and answered "structural" both times — the "structural, confirmed" verdict this file's own design promised. **But the group the model was asked about was not clean**: with no numeral or Roman-numeral token to anchor on, "PART ONE" and the document's own byline ("by Nobody in Particular") skeletonize to the identical bare `W` and land in the same candidate group — the model confirmed the group as a whole rather than discriminating its one non-structural member. Disclosed, not silently accepted: tier 2's skeleton grouping has a real blind spot exactly where it has no numeral to anchor to, and a coarse group-level question to the model does not close that gap by itself. Real, scoped, unattempted follow-up: a PER-LINE model check (does THIS specific line look structural, not "does this group as a whole") would very likely resolve it, at the cost of more model calls — not built here, since the one specimen this arose on was constructed to trigger the gap, not read for its own sake.

### What this does not yet touch

`structure-rec.mjs` runs standalone; `eot-jsonl.mjs` and `recoverability.mjs` still carry their own independent, hand-maintained heading regex (now itself extended once more, per the Frankenstein fix above). Wiring the reader to consult this detector automatically when its own hardcoded regex finds nothing — the natural next step toward "a repeated program," rather than a human running `structure-rec.mjs` by hand and then hand-editing the reader again — is real, scoped, and not attempted in this pass.

## S108 — Detecting a table embedded in prose: safe but blind, checked before assumed (2026-09-09/10)

**Generality:** specimen-scoped. The mechanism (a GFM table's header+separator signature is universal Markdown syntax, not specimen-shaped) is meant universally; the one real specimen below is where it was found and tested.

User direction: *"now do it on document with a table embedded inside of prose."* Same "detect structure and identify it" mandate as S107, aimed at a different structural class. Real specimen: *Paradigms of Artificial Intelligence Programming*, chapter 3 (`05-academic-papers/open-access-books/paip/chapter-03.txt`) — a genuine Lisp textbook, 19 real Markdown tables embedded directly in expository prose (a `## 3.2 Special Forms` mapping-of-forms table was the first one found; the file range 4127-79518 alone carries 19 of them, from a 5-column reference table to a 6-column `eq`/`eql`/`equal`/`equalp` comparison table).

**Checked before anything was built, the way this session has checked every claim about the pipeline all along:** does `eot-jsonl.mjs`'s own machinery crash or fabricate content when it meets a real table? `splitSentences` (`adapters/text/spans.js`), run directly on the excerpt, treats an entire multi-row table as ONE "sentence" — there is no sentence-ending punctuation inside a pipe-delimited row to split on. `extractRelations` (`adapters/text/relations.js`), run directly on that "sentence," returns `[]` — confirmed, not assumed: it does not fabricate a subject/verb/object triple out of pipe-delimited cells. The reader's own established discipline ("a sentence that yielded nothing says so, and says why," S90/the `EOTAbsence@1` mechanism) would disclose the whole table honestly as `no_earned_verb_in_this_sentence` — not silently, not wrongly. **The pipeline is safe on a table. It is also blind to one**: a real, addressable, richly structured object becomes an inert non-finding, indistinguishable on the record from an ordinary sentence that simply had no verb.

### `table-rec.mjs` (new): the mechanical tier only — this is not a REC problem

Unlike a chapter heading, a GFM table has ONE canonical, unambiguous signature: a header row of pipe-delimited cells immediately followed by a separator row of only pipes, dashes, colons and whitespace. That does not vary by book the way "CHAPTER I." vs "Chapter 1" vs "I. A TITLE" does, so there is no known-conventions library here and no escalation tier — `detectTables(raw)` finds every header+separator+contiguous-data-rows block mechanically and reports `[start, end]`, column count, and row count. Run against the real specimen: **19 tables found**, ranging from a 5-column, 9-row reference table to a 26-row, 3-column one — verified by hand against the actual file content, not just a count.

### What this does not yet do — named directly, not left implicit

Detection alone answers "a table is here," not "what does it say." **User direction, immediately following: "it needs to interpret tables as tuples."** Not built in this pass: parsing each detected table's own header row and data rows into an actual grid of (row, column, header, value) tuples, each cell independently addressed the same P5.2 way every other span on this ledger is (a byte address that must slice back identical to what it claims). Also not decided: the corpus already shows the detector needs to handle at least two genuinely different table SEMANTICS without conflating them — some tables are row-shaped records (`| Type | Example | Explanation |`, one real thing per row, columns are its named fields) and at least one in this same file is column-shaped parallel lists (`| definitions | conditional | variables | iteration | other |`, each column its own independent list of forms — row 1 does NOT assert that `defun`, `and`, `let`, `do` and `declare` are one related tuple, only that each happens to sit in the Nth position of its own column's list). Emitting a naive per-row tuple for the second shape would fabricate relations between cells that share nothing but a print-layout accident. Real, scoped, unattempted follow-up, named here so it is not rediscovered: parse the grid first (mechanical, safe for both shapes), and treat "is this row-shaped or column-shaped" as its own disclosed question — quite possibly one more tier-3-style case, since telling the two shapes apart from the table's own bytes alone is not always mechanical (a header row of category names looks identical, syntactically, to a header row of field names).

## S109 — Row or column: competing witnesses, one confounded and retired, a vision witness tried and refused, tuples finally emitted (2026-09-10)

**Generality:** specimen-scoped. The mechanism (permutation-null specialists, GWT-style arbitration, a coalition seat that must be earned) is meant universally; the two contrasting tables it was measured against are the two real specimens S108 already found in one document.

### The epistemic correction this whole entry is written under

User direction, verbatim, mid-build: *"but we dont know the ground truth, we are always ever asymptotically approaching the referent"* / *"the noumena rather."* Nothing built here has access to what either table's author actually intended (the noumenon) — only to readings of it (phenomena): this project's own hand-parse of the surrounding prose, exactly the same kind of interpretive act every specialist below performs mechanically or by asking a model. Every claim in this entry that might otherwise read as "measured against ground truth" means, precisely, "agreed with this project's own best-available reading of two specimens" — a converging approximation, not a verified fact. That does not make the comparison worthless: one specialist agreeing with the best-available reading on both specimens tried, while another confidently contradicted it on one, is real, useful, disclosed evidence of relative reliability. It is evidence, not proof, and this entry is careful to say so throughout rather than borrow certainty nobody here actually has.

### Competing programs, Global Workspace Theory applied literally

User direction, verbatim: *"using the problem you found with the spreadsheet, help it not make a mistake like that again, and we need to try different competing programs on things to find the one that provides the most meaningful signal, global workspace theory type stuff."* `table-shape-witnesses.mjs` (new): several independent specialists look at the SAME parsed table grid and each casts a signed vote, weighted by a MEASURED permutation-null z-score (this project's own standing "no hand-set thresholds, prefer a measured null" rule) — never an eyeballed cutoff. GWT's own point, applied rather than merely named: a specialist does not get a seat in the coalition for existing; it earns one, or it is computed and disclosed but excluded from the decisive vote.

- **`cellLengthSpecialist`** — hypothesis: a row-shaped table's columns are different KINDS of field (short "Type", long "Explanation"), so real by-column length variance should exceed what shuffling cells across the whole grid would produce; a column-shaped table's columns are parallel lists of the same kind of item, so no such excess variance is expected. **Measured wrong on the first real counterexample**: the column-shaped `definitions | conditional | variables | iteration | other` table scored z≈4–5 for ROW — confidently, strongly, against the best-available reading — because "definitions" (`defparameter`, `defconstant`) are simply lexically longer Lisp names than "conditional"/"variables" terms, entirely independent of row- vs column-shape. The statistic is real; the causal story behind it is confounded, since name length can arise from EITHER genuine field heterogeneity or from which lexical category a parallel list happens to hold. Kept, computed, disclosed — retired from the decisive vote.
- **`blankClusteringSpecialist`** — hypothesis: a column-shaped table with unequal list lengths pads short lists with blanks CONCENTRATED in specific columns; a row-shaped table's rare blanks should be no more clustered by column than chance placement. Null: reshuffle which grid positions are blank, holding the total blank count fixed, and compare the observed by-column variance in blank-fraction. **Agreed with the best-available reading on both specimens tried** — voted column-shaped (z≈2) on the real column-shaped table, and honestly abstained (no blanks to reason about at all) on the row-shaped one, never voting wrong. This is the specialist that decides alone whenever it has evidence.
- **A text model witness** (same discipline as `witness-referent.mjs`/`structure-rec.mjs`'s own tier 3: closed forced choice, asked twice with the sample rows reversed, trusted only on agreement) — consulted only when `blankClustering` abstains. Correctly voted ROW on the `Type | Example | Explanation` table.

**Arbitration, after the correction:** `blankClustering` decides alone whenever it has evidence (no hand-picked weight balancing it against the confounded `cellLength`, which is excluded rather than diluted in); when it abstains, the question escalates to the text model witness — the only other specialist that has passed the same bar. Verified: the column-shaped table now scores a clean negative coalition (COLUMN, correctly, against the earlier version's wrong ROW call); the row-shaped table escalates past `blankClustering`'s honest abstention and the text witness correctly calls ROW.

### A vision witness, tried for real, and the lesson that mattered more than the result

User direction, verbatim: *"consider also the role of an organ that can just 'look' at things"* / *"like lets not underestimate CV and OCR systems"* / *"the real test is taking an image of the table inside the document as it is."* Built for real, not simulated: the actual excerpt (real prose, real backtick-coded cells, real blank cells) was rendered as a properly-typeset page (headless Chrome, `--screenshot`) and shown to a local vision model (`moondream:latest`, via Ollama's image API) — three prompt framings tried. Two ("What am I looking at?", "Tell me what you see in this picture") returned nothing usable — an empty reply, or a repetition loop degenerating into nonsense (`"dopr"`, `"doprq"`, `"doprqr"`, ...) on this OCR-dense content. The third ("What is in this image?") returned a fluent, confident, and — by this project's own best-available reading — WRONG description: a hallucinated 3-column "concept / description / language" structure matching nothing in the real 5-column table. **Asked twice, it gave the identical wrong description both times.**

That repetition is the finding that mattered, not a footnote: this project's own "ask twice, trust only on agreement" discipline catches a witness whose answer moves under a content-free reorder — it does nothing at all against a witness that is simply, confidently, and consistently wrong. Self-consistency is necessary evidence of stability; it is not evidence of correctness, and neither this project's own reading nor the vision witness's own description is the noumenon — only an independent check (a genuinely different sense corroborating, never the same sense repeating itself) could move a disagreement toward the referent at all. `visionWitnessSpecialist` is implemented and callable (a real HTTP call to a real vision model, not a stub) but is NOT part of `judgeShape`'s own arbitration — it has not earned the seat the other two specialists had to earn, on the one measurement taken so far. Re-measuring it — a better prompt, a larger vision model, a differently-rendered image — is real, scoped, unattempted follow-up, not a closed question.

### Tuples, finally emitted, address-verified, shape-informed

`addressedGrid` + `emitTuples` close the gap S108 named and left unbuilt: each cell gets its own real byte address (P5.2's own slice-back verification — an address that does not slice back identical is refused, never recorded), and the shape verdict decides HOW the grid becomes tuples rather than assuming one universal shape. Row-shaped: one record per row, fields keyed by header. Column-shaped: one list per column, items keyed by row position — explicitly never asserting a relation between cells that merely share a print line. "Undetermined" emits nothing, rather than guessing either shape. Verified on both real specimens: the column-shaped table emits 5 column-lists (7 items each, address-verified); the row-shaped table emits 19 row-records (3 fields each, address-verified) — sampled and checked by hand, not just counted.

### What is still not built

Cross-modal reconciliation itself — genuinely merging two senses that each carry real, if partial, signal into one more-confident verdict (the lip-reading-plus-faint-audio-plus-memory picture the user described directly) — was not demonstrated here, because the one non-text sense tried did not clear the bar of carrying real signal at all for this task. That leaves the general integration mechanism (how a coalition should combine two independently-earned votes, not just fall through from one to the next) untested against a real case where it would matter. Also unbuilt: wiring any of this into `eot-jsonl.mjs`'s own reading pass, same as S107's own structure detector — every organ in this file (S107, S108, S109) currently runs standalone.

### Addendum, same pass — memory as a prior, and two more bugs found running it for real

User direction, verbatim, distinguishing what the earlier draft of this entry had conflated: *"that merging you're describing is actually two distinct phenomena riding together"* — crossmodal binding (independent channels weighted by reliability, the arbitration above) versus memory-as-active-prior (a recalled pattern shaping the CURRENT percept in real time, not commenting on it afterward). The arbitration above answers the first. This addendum builds the second: `documentPriorZ(history)` treats a document's own running history of prior table verdicts as a one-sample proportion test against a neutral 50/50 null (Laplace-smoothed, so an empty or unanimous history never produces an undefined z) — a real, standard statistic, on the same footing as the permutation-null z-scores the mechanical specialists already use, not a hand-picked weight.

Wiring it in, run for real against the full 19-table document in reading order (not each table in isolation), found two more real bugs — the same discipline this whole session has run on every mechanism it has touched, now turned on itself twice in one sitting:

1. **The prior could decide alone, before the model was even asked, once its own magnitude cleared the standard significance bar.** After ~17 tables, most of them genuinely column-shaped code examples, the accumulated prior reached z<-3 — strong enough that the SAME "Type | Example | Explanation" reference tables verified ROW-shaped earlier in this entry got mis-classified COLUMN-shaped, without the model witness (which correctly calls these tables row every time it is actually asked) ever being consulted. That is memory REPLACING perception, the opposite of the "sharpens an ambiguous percept, does not overrule a clear one" framing this addendum is built around.
2. **Fixing (1) by consulting the model unconditionally and then ADDING its vote to the prior on one combined scale reintroduced the same CLASS of error one level down.** The model witness's own "strength" is a flat, uncalibrated `1` (a binary agree/disagree signal has no natural continuous magnitude the way a permutation z-score does); summed against a prior that can exceed z=3, the model's real, checked vote was silently outvoted by an uncalibrated number on an incompatible scale — structurally identical to `cellLength`'s z=5 outvoting `blankClustering`'s z=2 earlier in this same file, just relocated to a different pair of terms.

**The fix, both times, was structural, not numeric.** A prior's proper job is to fill in for an ABSENT direct signal, not to outvote a present one — so `judgeShape` no longer combines the prior arithmetically with a specialist that actually casts a vote at all: `blankClustering`, then (only if it abstains) the model witness, each decide OUTRIGHT the moment either gives a real verdict, with zero numeric blending against the prior. The prior only reaches a verdict when both directly-consulted, already-earned specialists abstain — a genuine last resort, disclosed as one, never an override. Reverified on the full document: the column-shaped table (no prior history yet) still scores COLUMN correctly; both "Type | Example | Explanation" tables — the second and third in the same document to carry heavy column-shaped history behind them — are now correctly ROW-shaped again, one decided directly by `blankClustering`'s own weak-but-real vote, the other falling through to a prior that happened, this run, to have turned positive itself (a real, disclosed consequence of the permutation tests' own inherent Monte Carlo variance carrying through into which way borderline earlier tables in the same document happened to land — not a new bug, a property of the null-testing method these specialists already use, worth naming rather than treating as another defect to chase).

## S111 — The sentence witness's paraphrase handling, measured by shape at two scales: precision holds 400x, recall does not (2026-09-09)

**Generality:** specimen-scoped — a 9KB hand-picked excerpt and the full 3.3MB War and Peace corpus, two models (gemma2:2b, llama3.2:latest); a finding about small-model reading capacity on real literary prose, not yet cross-domain replayed.

The mechanism is standing law already: `organs/witness-sentences.js` runs the select/sibling-swap protocol — the model POINTS at a mechanically gathered candidate sentence by index, never writes a `because`, verdict derived mechanically from the pair, never asked to freely judge entailment. Wired into production at `the-fold/app.js::witnessTestimony`, confirmed real by reading app.js directly this session (the import, the `witnessTestimony()` bundle, `witnessSentencesFor`'s two call sites, the pipeline-toggle gate, the disclosure code) rather than trusted from a results doc. The-fold's own POLICIES.md "The sentence witness, and small models only" (2026-09-02) already states this wiring as law; this entry does not restate it and is not the mechanism's law — it is a pointer to a measurement made ON TOP of it.

**What was measured, and what was not previously on record.** Two eval drivers put a declared, shape-categorized paraphrase battery to the real protocol — verbatim/near-verbatim, passive, role-reversed, synonym-verb, rearranged-adjunct, each with a FALSE twin, truth fixed before the run. `eval/the-fold/witness-paraphrase.mjs` runs 16 items over the 9KB Borodino excerpt with declared ends; `eval/the-fold/witness-paraphrase-corpus.mjs` runs 16 new War-and-Peace items through the REAL `chunkSource`→`retrieve`→`witnessSentences` chain over the full, gitignored `pg2600.txt`, each item asked with a question a real turn would type, never a hand-picked passage. `eval/the-fold/results/witness-paraphrase-corpus-RESULTS.md` is the record of both; both drivers were re-run live this session against a reachable local gemma2:2b and reproduced their committed numbers exactly.

**Verbatim from the record.** Excerpt: `ENTAILED read states: 3/9   FALSE read states (LIES): 0/7`, by shape (entailed only) `role-reversed 1/2 · near-verbatim 0/1 · passive 0/2 · rearranged 2/2 · synonym-verb 0/2`. Corpus, both models, every retrieval width: `ENTAILED states: 0/9 · FALSE states (LIES): 0/7` (gemma2:2b `LIMIT=3`/`LIMIT=1`; llama3.2:latest `LIMIT=1`).

**Settled:** zero FALSE items ever read `states` at either scale — the precision guarantee this organ's own header exists to keep survives a 400x jump in material, with retrieval and chunking (11,132 byte-addressed chunks, 0.2s) running correctly and fast throughout. **Not settled, disclosed rather than smoothed over:** recall collapsed 3/9 → 0/9 on the identical protocol, diagnosed three ways in the RESULTS.md before being trusted as a material/model-capacity finding rather than a pipeline bug — byte-verified retrieval correctness on the worst case, the single correct candidate sentence printed directly, the raw model verdict on it printed directly (a genuine stating sentence judged not-stating, most likely because the fact sits inside a subordinate clause of a longer reported-speech sentence rather than a short standalone declarative the excerpt battery used), and the identical 0/9/0/7 shape reproduced on a second, independent instrument (llama3.2:latest). Whether this is an acceptable ceiling (the wall exists to prefer silence over an unchallenged yes) or needs a wider candidate unit than one sentence is named as the next measurement, not attempted here — `LIMIT=1` vs `LIMIT=3` retrieval width made no difference, so the bottleneck is the sentence the model is shown, not how many passages it came from.

**Files, not restated here.** `eval/the-fold/witness-paraphrase.mjs`, `eval/the-fold/witness-paraphrase-corpus.mjs`, `eval/the-fold/results/witness-paraphrase-corpus-RESULTS.md`, `organs/witness-sentences.js`, `the-fold/app.js::witnessTestimony`.
