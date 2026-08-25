# The reading spec — what constrains eoreader7 development and usage

Binding, in V7-CUT.md's own sense: the compatibility law says 6.1 behavior is
the contract and native paths replace legacy only under conformance. This file
restates the parts of `legacy-eoreader6.1/READING-POLICY.md` (P0–P7, attempt
log A1–A25) that this repo's own work violated in one session, each with the
violation that earned its place here, and the standing rules that came out of
re-learning them. Enforced where mechanical by
`native/conformance/reading-spec.test.mjs`. Amend by appending.

## S1 — The constitutional reader is runnable, and it is the baseline

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

`discoverRelationVocab` recurrence is a whole-book statistic and COLLAPSES
under truncation (Dracula whole: 135 recurring; at 7%: 3). No mechanism may be
justified by a sliced measurement; a truncated run says `truncated: true` at
the point of the claim. (P5.5 — the driver, not the theory. Earned: three
claims retracted in `native/eval/results/vocabulary-scale-FINDING.md`.)

## S3 — Lookahead is not reading

A driver that derives state over the whole text and then scores every unit
with it has read sentence 12 using evidence from sentence 9,000. Such numbers
are LOOKAHEAD BOUNDS and are labeled so. The causal arm is the real reader,
and its difference from the bound is a finding, not an error (measured:
causal finds MORE link forms and FEWER arrangements). (P2 stage 2: "built
only from material already read — `groundUpTo` never slices forward.")

## S4 — Accumulation is the direction; re-grounding is the documented posture; parity gates the swap

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

Every reported run names which priors were injected. A run without the coref
prior is a result about an unprimed reader and says so. (P3, verbatim policy.)

## S8 — Read the attempt log before attempting

READING-POLICY's append-only attempt log exists so dead ends are not
re-entered. This session re-entered several (window-derivation shape ≈ A4's
territory, slice measurement ≈ P5.5, SVO-as-reader ≈ A17/P6). The standing
rule: before building any reading mechanism in this repo, check P0–P7 and
A1–A25 for the prior attempt; cite the entry when building on or departing
from it. New refuted attempts are appended there (or here, when v7-specific),
never merely fixed in silence.

## S9 — Low sets possible for high; high sets probability for low

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
