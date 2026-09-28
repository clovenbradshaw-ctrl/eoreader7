# The capacity map — three mathematics × three positions, and what a reader has earned

*Written 2026-09-28, at the user's direction: "an EO map that is a better
version of spiral dynamics — find the 3 dimensions, with 3 positions; one
dimension arithmetic, one geometric, one transcendental." Then: "wire it up,
falsify, make improvements, commit." STANDING: **nomination with
pre-registered predictions** — in THE-27-CELLS.md's sense, checkable against
the machinery, which wins any disagreement; and in the sense of
`eo-constitution` II.23, every claim below that can be tested names the
control built to fail and the decision rule, and both were committed BEFORE
any experiment was run (this file's first commit precedes every driver
result; `git log` is the proof). Results are appended in a later section and
in `native/eval/capacity-map/results/`. Where a result and a prediction
disagree, the result stands and this document is amended by appending.*

---

## 0. What it is for

Spiral Dynamics (Beck/Cowan, after Graves) is a single linear ladder of value
systems, asserted from observation, classifying persons and cultures, with no
null, no falsifier, and a direction ("up") that is a preference. THE-MORAL-
HELIX.md already refuses the first two moves (it classifies MOVES, never
persons, and reads a ring's residue as the next ring's ground). This document
is its sibling for **capacity**: not "which moral move is being made" but
"what has this reader — a system, or a person reading — actually *earned* the
right to say, on each of three kinds of mathematics, and what is the next
thing it may earn".

A capacity map is not a ranking of persons and not a classifier of content
(the cube is not a content classifier: 95.7% of cell assignments survived
shuffling the words). It places **claims** — what a reading reports and what
that report rests on — and it places a **reader** only as the summary of the
claims it can support.

## 1. What is derived, what is received, what is nominated, what is mine

Four stances, kept apart because a map that blurs them is the map it replaces.

**Derived (read off `kernel/cube.js`, never restated).** Nine places: the
cube's nine terrains, `TERRAIN_BY_DOMAIN[domain][grain]`. Three *positions*
are the cube's three grains — Ground, Figure, Pattern (Bateson's ladder, the
wheel's hub/spoke/rim, `nul`'s header: "figure — difference from its own
ground; pattern — the difference that figure made to the NEXT ground").

**Received (READING-SPEC S10, giver: earned-here 47394b1).** Three classes of
math, one per tier: *arithmetic* (monotone counting — the LOG tier: identity
and witness), *geometric* (ratios, exponential decay — the PRESENCE tier), and
*transcendental* (log, entropy, KL — the INFORMATION tier). What each grants:
"count sets what is POSSIBLE; a null's frequency ratio grants STANDING;
transfer entropy grants DIRECTION." The rule: "use the weakest class that
answers; name the class at every crossing," and the three failure modes —
(1) an arithmetic quantity in a geometric slot, (2) a count dressed as
standing, (3) a transcendental magnitude reported where its probability
semantics are not earned.

**Nominated (THE-THREE-MATHEMATICS §I, nomination standing).** The
identification of the three classes with the cube's three domains:
Existence ↔ arithmetic, Structure ↔ geometry, Interpretation ↔ calculus.
Two disagreements are kept visible rather than smoothed: (i) THE-THREE-
MATHEMATICS names the third class *calculus* (bound / compare / re-zero) and
the middle one *geometry* (address, incidence, containment); S10 names them
*transcendental* (information) and *geometric* (ratio, presence). The user's
wording is S10's. The two documents **agree on the order and on which domain
hosts which class**, and disagree about what the middle and third classes
*are made of*; the map takes the S10 names and the shared order and does not
adjudicate the content. (ii) S10's worked example, the Network ladder, climbs
all three classes *within one terrain*; the map reads that as the ladder's
dependency shape (count → null ratio → transfer entropy), not as evidence that
a terrain belongs to more than one class.

**Mine — the weakest part, stated as such (the strict crossing rule).** S10
says, of the Network ladder, "each rung of meaning requires at least the next
class of math, with its assumptions earned". THE-THREE-MATHEMATICS §VII says,
of the canonical operator chain, "arithmetic before geometry before calculus…
per-claim, a claim's unit before its edge before its integral". Both are
statements about **claims** and about **one chain**. The map extends them to
a **lattice over positions**: transcendental order ≤ geometric order ≤
arithmetic order, for *earned* profiles. That extension is this document's, it
is stronger than either source, and §5 tests it instead of assuming it.

## 2. The map

Rows are the three classes (dimensions); columns are the three positions.

| | **Ground** — the frame the figure is read against | **Figure** — one difference from its ground | **Pattern** — the difference the figure made to the next ground |
|---|---|---|---|
| **arithmetic** · Existence · *what is* — identity and witness; count sets what is possible | **Void** — the extent, the counted nothing: what could be here | **Entity** — the unit, counted once, with its witnesses | **Kind** — units counted as a class |
| **geometric** · Structure · *how things stand* — a null's ratio grants standing | **Field** — the ambient space the present is measured in | **Link** — a pair's standing against its own null | **Network** — the standing structure of many links |
| **transcendental** · Interpretation · *what difference it makes* — information grants direction | **Atmosphere** — the reader's surprise baseline | **Lens** — surprise and direction *for a named whom* | **Paradigm** — what the figure did to the next ground |

Each class has a **wall** — the way it is faked. They are the sources' own
words: arithmetic *presupposes the unit* (THE-THREE-MATHEMATICS §II: "every
arithmetic failure measured this week was an Existence failure upstream");
geometry *locates and never names* — position is not identity (L2);
calculus/transcendental has the **dark room** (optimising your own surprise
toward zero confirms the already-confirmed), uncalibrated rates, and
integration that is not idempotent over identity.

**A profile** is a reader's *order* in each class. An order is an integer:
`position = GRAINS[order mod 3]`, `ring = floor(order / 3)`. Order 0 is the
first Ground, 1 the first Figure, 2 the first Pattern, 3 the *next ring's*
Ground — "each ring's residue is the next ring's ground" (THE-MORAL-HELIX),
so the spiral is the same lattice continued, not a second structure. **No
view from nowhere**: there is no profile below the first Ground in each class
— a reader has, at minimum, declared a ground (a for-whom with a question) in
each of the three, and a class with no ground is a typed gap, never zero.

**The lattice.** Free box over the first ring: 3 × 3 × 3 = **27** profiles.
Under the strict rule, order(transcendental) ≤ order(geometric) ≤
order(arithmetic), the admissible ones are the weakly decreasing triples over
{0,1,2}: C(5,3) = **10**. Routes from (Ground, Ground, Ground) to (Pattern,
Pattern, Pattern) that stay admissible at every step are the lattice words on
content (2,2,2) — standard Young tableaux of shape 2×3: **5**. Exactly one of
them never lets the classes spread by more than one order: arithmetic,
geometric, transcendental advancing in turn — **AGT AGT** — the *balanced
route*. Continuing past (2,2,2), the same rule carries the spiral: routes to
the next ring's (3,3,3) number f^(3,3,3) = 42.

*The coincidence 27 = 27 (profiles, cube cells) is arithmetic, not a
correspondence: profiles are places a reader can be; cells are types of act.
No isomorphism is claimed or sought — the same wall THE-WAYS-OF-KNOWING puts
around its nine.*

## 3. Earned versus claimed — the S10 accounting

A **built** organ is a claim (an organ exists at the place — `CAPACITIES`,
`assemblies.js`). An **earned** place is one where the organ has been run on
real material against a null with a control built to fail. The distance
between them is S10's "dressed": *claimed order − earned order* per class.
Named failure modes are S10's only where S10 names them: an over-claim in the
geometric class is "a count dressed as standing"; in the transcendental class,
"a transcendental magnitude where probability semantics are not earned"; in
the arithmetic class S10 names none and the map says so rather than inventing
one (the wall is *presupposes the unit*).

The strict rule applies to **earned** profiles, where it is a consequence of
the per-claim chain: if every claim at a place rests on a claim one class
below at that position, the earned profile is automatically ordered. A
**claimed** profile need not be ordered, and a claimed profile that violates
the order is a *diagnostic* — it says which class is over-claimed relative to
what would have to hold beneath it.

## 4. What the map does not say

- Not that higher is better. "Up" is only "further along a chain each of
  whose links was earned"; the map has no preference between a reader at
  (Pattern, Pattern, Pattern) and one at (Figure, Figure, Figure) beyond what
  each can support.
- Not that a reader's profile is a fact about the reader in general. It is
  the summary of what *this reader, on this material, for this whom* earned.
  A standing is re-granted per material (assembly A1.2), never transferred.
- Not that coherence is correspondence. A map that orders capacities
  coherently establishes nothing about whether what they report is true; the
  standing wall (P44) holds here as everywhere.
- Not that the classes are the only axes. The map is one projection of the
  cube; THE-27-CELLS.md's operator and stance projections drop different axes.

## 5. Pre-registered predictions (nothing below had been run when this section
was committed)

Every number names its giver (II.11). "Declared" means declared here, now, by
the author, before running — `set by hand`, and said so. Every test that can
fail names what a failure changes; those consequences are §6.

### F1 — Derivation (mechanical; checks the code, not the theory)

`kernel/capacity-map.js` must read its nine places, its positions and its
stance/terrain names from `cube.js` and restate none of them. Pass iff: the
place set equals the cube's nine terrains exactly; no terrain, stance or
operator name appears as a string literal in the module's non-comment source;
the medium-blind scan finds none of *sentence | pronoun | surface | token |
word | text* (the scan `contest.js` already uses); and the one nominated table
(`CLASS_DOMAIN`) carries a `giver` for each row. *Falsifier: any of the four.*

### F2 — Combinatorics (mechanical; checks the code, not the theory)

By brute force and by closed form: 27 profiles in the first ring; 10
admissible under the strict rule (= C(5,3)); 5 admissible routes (= SYT of
2×3 by the hook-length formula 6!/(4·3·3·2·2·1)); one balanced route
(AGTAGT); 42 routes to the next ring's Ground (hook formula for 3×3); 90
unconstrained routes (6!/(2!2!2!)). With the crossing rule weakened to
a ≥ g only, the count is the brute-force value and is reported, not
predicted. *Falsifier: any disagreement between enumeration and closed form.*

### F3 — Is the strict order a fact about how the system is BUILT?

**Population.** Every module under `native/` (excluding `tests/`, `eval/`,
`node_modules`) that self-declares its cell(s) with `export const CELL` or
`export const CELLS`, unioned with every module named by an entry of
`organs/capacities.js::CAPACITIES` (terrain given there), resolved to a file
by basename; deduplicated by path. A module's class is the class of the
domain of its declared cell(s); a module whose cells span more than one domain
is **excluded and listed**, never silently dropped. Its grain rank is the
grain of its declared cell(s) under the same rule.

**Statistic.** Over direct static imports (`import … from`, `export … from`
with a relative specifier) between two population modules of *different*
class, the number of **upward** edges — importer's class rank strictly below
the imported module's class rank (arithmetic 0 < geometric 1 <
transcendental 2). The same for grain (Ground 0 < Figure 1 < Pattern 2),
reported separately.

**Control built to fail.** Permute the class (resp. grain) labels among the
population modules 1000 times (declared; seed 7; the repo's null-arm
convention), holding the import graph fixed; the upward count under permuted
labels is the null. A layering that respected the order would sit in the low
tail; one that did not would sit inside the null.

**Decision.** SUPPORTED-AS-LAYERING iff the observed upward count is at or
below the null's 5th percentile (alpha 0.05, `network-standing.js`'s
convention) — reported with the null's mean. If the population has fewer than
10 cross-class edges the result is typed UNDERPOWERED (declared floor; the
smallest number at which a 0-of-n observation can reach the 5th percentile of
a fair-coin null: 0.5^n < 0.05 needs n ≥ 5, doubled for the labelled null's
extra variance), and is not read as support or falsification.

**Expectation, honestly.** I expect the class order to be **violated**: the
referent-identity organs (arithmetic) use activation and binding
(geometric) to decide pronoun reference, and that is an upward class edge.
If so, the strict order is *not* a build-layering fact, which does not touch
the per-claim chain (a build layer is not a claim's provenance) and is
exactly what §3 already says. The value of the test is *which* edges violate.
Registry demonstration (n = 1, not a test): `LINK` is the only assembly that
declares a dependency (consumes `CastLedger@1` as a witness from `ENTITY`),
and it runs geometric ← arithmetic, which the rule permits.

### F4 — Does direction need standing? (the g → t crossing, at Figure)

The claim under test: *a direction reading (transcendental, Figure) is
reproducible only where the standing it rests on (geometric, Figure) was
earned.* If direction were equally reproducible without standing, the
crossing would be decorative for direction.

**Materials.** (a) Three novels from the `live_priors` corpus, unit = the
sentence (`textEncounters`' unit): Dracula (pg345, primary), Pride and
Prejudice (pg1342), Frankenstein (pg84). Beings = the clusters of
`discoverReferents(extractSurfaces(sentences))`, mentions extracted by
longest-match over the admitted surfaces, arrivals = sorted sentence indices;
the *K = 80* beings with the most arrivals (≥ 2 each) are tested — a cost cap
(the displacement null is O(pairs × draws × extent)), declared, applied
identically to every book, and disclosed here rather than left silent.
(b) The Shakespeare plays of `pg100`, unit = the **turn**, beings = speakers
(the ALL-CAPS speech headers — identity given by the markup, so the
arithmetic rung is exact by construction), the collective label `ALL` removed
(it is not a being; declared), one play = one reading. Pooled over the plays.

**Standing (geometric).** The engine's own `bindLinks` displacement null on
the whole reading: window W declared — novels **W = 8** sentences (the
smallest candidate depth of `eval/network-standing.mjs`'s
`WINDOW_CANDIDATES`), plays **W = 2** turns (adjacent reply; the smallest
window at which an alternation is visible); robustness at W ∈ {2, 32} and
W ∈ {1, 4}. draws = 199, alpha = 0.05, seed = 20260812 — `LINK_SPEC`'s
convention, cited from `network-standing.mjs`, not chosen. A pair has
standing iff p < alpha.

**Direction (transcendental).** The engine's own `transferEntropy` on the
binary arrival indicator series: asymmetry d = TE(A→B) − TE(B→A) per **half**
of the reading; sign(d) ∈ {+, −}; pairs with d = 0 in either half are
excluded and counted. Halves are **interleaved blocks** of B = 32·W units
(novels 256, plays 64; declared — two orders above the window so the block
boundary contributes ≤ 1/B of the lag transitions), alternate blocks to
alternate halves; robustness on contiguous halves and on B/2.

**Reliability.** agreement(pair) = 1 if sign(d) is the same in both halves.
Group agreement A_S over standing pairs and A_N over non-standing pairs
(the pairs the engine returns — overlap > 0 — that failed their null).

**Controls built to fail.**
(i) *Order-destroying:* the same statistic after permuting sentence/turn order
**within each block** (both series permuted identically, so per-half rates and
within-unit co-occurrence are preserved and only temporal adjacency is
destroyed), R = 39 replicates (declared; p resolution 1/40 = 0.025). The
excess E = A − mean(A_shuffled), with p_E = (1 + #{r : A_r ≥ A}) / (1 + R).
(ii) *Volume:* strata are terciles of L = #{t : x_t ∧ y_{t+1}} + #{t : y_t ∧
x_{t+1}} pooled over S ∪ N; the contrast is taken **within** strata, so more
lag events cannot masquerade as standing.
(iii) *Label permutation:* Δ = E_S − E_N; null from 2000 permutations of the
S/N label within strata (declared); p_Δ one-sided, Δ > 0.
(iv) *Harness power (must pass before any real result is read):* a synthetic
reading of the same length as the novel (9,456 units), 6 independent beings
plus one planted pair where B follows A at lag 1 with probability 0.5 above a
0.05 base rate (declared). The harness must find that pair's agreement above
its shuffled control and must find the independent pairs at their shuffled
control. If it cannot, a NO-SIGNAL on real data is uninformative and is
reported as such.

**Decision (per material, at the primary setting).** With groups of at least
30 pairs after ties (declared, the classical normal-approximation minimum;
below that the comparison is typed UNDERPOWERED):
- **SUPPORTED** — p_Δ < 0.05 with Δ > 0, and E_N is not significantly above 0
  (p_{E_N} ≥ 0.05): direction is reproducible only where standing is.
- **FALSIFIED-INDEPENDENT** — p_{E_N} < 0.05 and p_Δ ≥ 0.05: direction is as
  reproducible without standing.
- **FALSIFIED-INVERSE** — Δ < 0 with the reverse label permutation p < 0.05.
- **NO-SIGNAL** — p_{E_S} ≥ 0.05 and p_{E_N} ≥ 0.05: the rung is not
  reproducible at this resolution on this material; the ordering is
  *untestable here*, which is a finding about the organ, not about the order.
- **MIXED** — anything else, reported in full.
The crossing is **supported by the data** iff SUPPORTED on the plays and on
≥ 2 of the 3 novels, with no FALSIFIED-* anywhere at the primary setting.

**Expectation, honestly.** Dialogue is close to symmetric (A answers B, B
answers A), and TE direction on sparse binary arrivals is the rung S10 warns
about (sound as a rank, not a magnitude; `binding.js` records that it
reports directed structure on confounded common-cause data 100 times in
100). I put roughly 25% on SUPPORTED, 45% on NO-SIGNAL, 20% on MIXED, 10% on
FALSIFIED-*. A NO-SIGNAL everywhere is a real and useful result: it says the
transcendental Figure rung, as built, is *claimed and not earned* on text
arrivals, and the map's earned-vs-claimed ledger says so.

### F5 — Does standing need identity? (the a → g crossing, at Figure)

The claim under test: *geometric standing computed over units whose identity
was not earned is dressed.*

**Materials and procedure.** The three novels of F4(a). Two arms over the same
sentences, the same longest-match mention extraction, the same K = 80, W = 8,
`networkStanding` with the F4 declarations: the **surface arm** (each admitted
surface a separate being — identity unearned) and the **referent arm** (the
engine's clusters — identity as `discoverReferents` earns it). A standing edge
in the surface arm is a **self-edge** if its two surfaces belong to the same
cluster. The referent arm has no self-edges by construction; that is stated,
not counted as a result.

**Statistics.** (1) share_self among the 20 standing surface-arm edges with the
most co-arrivals (20 = declared, a page's worth of top edges). (2) Enrichment:
among co-arriving surface pairs, P(standing | same cluster) versus P(standing |
different cluster), Fisher exact, one-sided. Control built to fail: the same
enrichment computed after permuting the surface→cluster assignment among the
K surfaces 1000 times (declared) — a labelling unrelated to identity must not
be enriched.

**Decision.** The a → g crossing is **consequential on this material** iff
share_self ≥ 0.20 (declared: one edge in five of what a reader sees first
being a being paired with itself is a defect any reader would call wrong) AND
the Fisher p < 0.01 AND the permutation control is not enriched, on ≥ 2 of the
3 novels. If share_self < 0.05 on all three, unearned identity does no
measured damage to the top edges here and the crossing is a **hazard**, not a
prerequisite, on this evidence.

**Expectation, honestly.** `network-standing.mjs`'s header already records the
specimen (Clerval–Henry ranked among the top "bonds": self-company read as a
bond). I expect the crossing to be consequential (≈ 75%).

### F6 — Placement (a demonstration, not a test)

`organs/capacity-place.js` places the system on its own map from its own
registries: **built** = `CAPACITIES` counts per terrain; **declared** =
`assemblies.js` declared terrains; **registry-measured** = declared terrains of
assemblies whose `stagesNotRun` names no measurement gap. I have already read
those registries (§ probe, this session), so its output is not a prediction I
could fail: built is (Pattern, Pattern, Pattern), and the registry-measured
profile is ordered but carries one orphan — the Paradigm terrain is declared by
an assembly with no unmeasured stage, while the Lens beneath it is unmeasured.
That orphan is a *finding the map produces from the registry*, not a claim
about the world.

## 6. Decision table — what each outcome changes (committed before running)

| outcome | change |
|---|---|
| F1/F2 fail | fix the code; the theory is untouched |
| F3 SUPPORTED-AS-LAYERING | keep `admissible` as stated; note the layering evidence |
| F3 not a layering fact | `admissible` is documented as a property of **earned** profiles only; the module never asserts it of build order; the violating edges are listed in the results |
| F4 SUPPORTED (≥ 2/3 + plays) | `CROSSINGS` keeps (transcendental ≤ geometric) |
| F4 NO-SIGNAL | (transcendental ≤ geometric) stays in `CROSSINGS` as *declared but untested*, and the transcendental Figure rung is recorded **claimed, not earned** on text arrivals |
| F4 FALSIFIED-INDEPENDENT | remove (transcendental ≤ geometric) from the default `CROSSINGS`; keep it in `UNSUPPORTED_CROSSINGS` with this result attached |
| F4 FALSIFIED-INVERSE | same, and investigate the confound before anything else |
| F5 consequential | `CROSSINGS` keeps (geometric ≤ arithmetic) |
| F5 inconsequential | demote to a hazard in `UNSUPPORTED_CROSSINGS` |
| F4 power check fails | no real F4 result is read; the harness is fixed first |

`planFold`'s crossing-aware planning is **opt-in** (`crossing: true`) until the
results above justify making a crossing default; the module's default
`CROSSINGS` is whatever the surviving rows say, and each removed crossing is
kept, with its evidence, in `UNSUPPORTED_CROSSINGS` — the map carries its own
falsification history.

## 7. Results

*(none yet — appended in a later commit, with the drivers' outputs in
`native/eval/capacity-map/results/`.)*

## 8. Amendment 1 — a follow-up hypothesis, registered after F3–F5 ran and before it is tested

*Committed 2026-09-28, after the F3, F4 and F5 drivers had run on the development
materials (Dracula, Pride and Prejudice, Frankenstein, the Shakespeare plays) and
before anything below was run on a single held-out book. What was seen, honestly:*

- **F5 as pre-registered found the a → g crossing inconsequential** (self-edge share
  0, 0 and 0.05 of the top 20; consequential on 0 of 3 books). But F5 defined "the same
  being" as the engine's own cluster, and its printed top-edge lists contain pairs the
  clustering cannot flag: `Mr — Bennet`, `Mrs — Gardiner`, `Harker — Mrs`. A bare honorific
  is standing as a *being*.
- **Exploratory, post-hoc, labelled so in the drivers.** `f5b-mention-splits.mjs` tested the
  obvious mechanism (the title and its name being neighbours in one mention) and it was
  **refuted**: 0 of the top 20 edges are token-adjacent in every arm of every book.
  `f5c-bare-titles.mjs` then counted bare-title beings directly, using the engine's own
  received closed class `HONORIFIC_TITLES` (`adapters/text/priors.js`, giver `lang/en`): in the
  referent arm 3/20 (Dracula), **12/20 (Pride and Prejudice)** and 0/20 (Frankenstein) of the
  top standing edges have a bare-title endpoint (24/301, 64/358, 6/193 over all standing edges).
- **A cause was then found by looking, not by a test:** `splitSentences` (`spans.js`, the
  extent — the geometric Ground) ends the sentence at `Mr.`: 806 of the 807 sentences of Pride
  and Prejudice that contain `Mr` end with it, and `deriveAbbreviations` lists
  `CO IV V VI X XV XX XL St F W` and no honorific. So the surface extractor meets `Mr` at the
  end of a sentence and `Darcy` at the start of the next, and admits a bare title as a being
  with 806 arrivals. That is the *extent → identity → standing* chain, and it is also the
  upward edge F3 named (`surfaces.js → spans.js`: an arithmetic mark reading a geometric extent —
  "extents before cast", the reading pipeline's schedule, which THE-THREE-MATHEMATICS §VII
  already keeps apart from the operator chain).

None of that overturns F5's pre-registered verdict, because the measure that found it was
chosen after seeing the lists. It generates a hypothesis, which is registered here and is
to be tested on books the analysis has not touched.

### F5′ — does repairing the extent remove edges that rest on a title that is not a being?

*A design change made before registration, disclosed:* a plumbing smoke test of the first
draft of this section, run on a fourth book (Alice) whose output was discarded, showed that
the received `HONORIFIC_TITLES` class holds two different things — courtesy prefixes that
never refer alone (`Mr`, `Mrs`, `Dr`) and titles that name a character by role (`Queen`,
`King`, `Duchess`, `Count`, `Professor`). A share of "bare-title endpoints" therefore cannot by
itself mean "not a being". The statistic below is the *interventional* effect of repairing the
extent, which a role-title character survives and a cut-off courtesy prefix does not.

**Materials (held out — none was used to develop F5b or F5c):** *The Adventures of Sherlock
Holmes* (pg768), *Moby-Dick* (pg2701), *The Adventures of Tom Sawyer* (pg1661), all in the
`live_priors` corpus. The three development books are re-run as an exploratory replication
and do not count toward the decision.

**Procedure.** As F5, referent arm only: the same `discoverReferents` clusters, longest-match
mentions, K = 80, W = 8, `networkStanding` with draws 199, alpha 0.05, seed 20260812. Three
extents per book:
- **as-split** — `splitSentences`, as F4 and F5 used it;
- **repaired** — consecutive sentences merged wherever the first ends in a token of
  `HONORIFIC_TITLES` followed by a period (the received class; no list is typed here);
- **placebo** — the same NUMBER of consecutive-sentence merges as the repair made, at random
  positions (declared; seed 7), so a merge that is not aimed at the cut is the control.

**Statistic.** A *bare-title being* is a cluster all of whose admitted surfaces are a single
`HONORIFIC_TITLES` token. share(extent) = the fraction of the 20 standing edges with the most
co-arrivals that have a bare-title endpoint. **Effect Δ = share(as-split) − share(repaired)**,
and Δ_placebo = share(as-split) − share(placebo).

**Decision (declared).**
- *Consequential on a book* iff Δ ≥ 0.20 (declared: one edge in five of what a reader sees
  first rested on a token the extent had cut off a name from) AND Δ_placebo ≤ Δ / 2 (the
  control built to fail: an untargeted merge of equal size must not do the same). *Consequential
  overall* iff on ≥ 2 of the 3 held-out books.
- Mechanism audit, reported and not decided on: per book, the sentences containing an honorific
  followed by a period and how many of them end in it, as-split and repaired.

**What it changes.** Consequential overall: (geometric ≤ arithmetic) is reinstated — not as the
strict order over profiles but in the specific, measured form *standing over a unit the extent
cut off a name from is dressed*, with the extent → identity edge recorded as a measured upward
class edge with a mechanism. Not consequential: the a → g crossing stays unsupported and the Pride
finding is recorded as a specimen-scoped defect (one book's honorific use).
**Expectation, honestly:** ≈ 70% consequential overall (Sherlock Holmes almost surely; Moby-Dick
and Tom Sawyer use `Mr.` less).

**Generality:** specimen-scoped until the held-out books say otherwise (P71). The honorific
class is English (`lang/en`); no claim is made for other languages.
