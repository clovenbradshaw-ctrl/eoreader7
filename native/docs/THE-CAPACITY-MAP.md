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

*Amended 2026-09-28 (after §7): the strict rule did not survive its tests. The counts above are
true of the rule as declared — `crossings: DECLARED_CROSSINGS` reproduces 10, 5 and 1 — and are
no longer the default: nothing is enforced by default, the free box is 27 profiles and 90 routes
(36 balanced), and the strict lattice is kept as a hypothesis with its falsification attached.*

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

*(Amended 2026-09-28: §7 — this paragraph is the reading that was tested and not supported.)*

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

*Run 2026-09-28 on the `live_priors` corpus and the plays of `pg100`. The tables between the
markers are generated from the raw runs in `native/eval/capacity-map/results/` by
`summarize.mjs` and held to them by `tests/capacity-map-results.test.js`; nothing in them was
typed by hand. The prose after them is mine, and it is checked against them, not the reverse.*

<!-- RESULTS:BEGIN (generated by eval/capacity-map/summarize.mjs — do not edit by hand) -->

### F3 — is the strict order a fact about how the system is built?

Population: **61** modules (arithmetic 15, geometric 23, transcendental 20). Listed, not dropped: 3 ambiguous basenames, 15 CAPACITIES entries whose module is not under native/ (they live in the-fold), 0 class conflicts, 3 multi-domain and 1 multi-grain modules.

| axis | modules | edges among them | cross edges | upward | null mean | null 5th pct | p_low | verdict |
|---|---|---|---|---|---|---|---|---|
| class | 58 | 20 | 9 | 3 | 6.71 | 3 | 0.100 | **UNDERPOWERED** |
| grain | 60 | 28 | 12 | 6 | 9.02 | 4 | 0.224 | **NOT-A-LAYERING-FACT** |

Upward edges — class:
- adapters/text/surfaces.js [arithmetic] -> adapters/text/spans.js [geometric]
- legacy-ported/packages/host/surfer.js [geometric] -> legacy-ported/packages/engine/loops/reading-regime.js [transcendental]
- adapters/text/parse-gated-names.js [arithmetic] -> adapters/text/spans.js [geometric]

Upward edges — grain:
- legacy-ported/packages/host/corpus.js [Ground] -> legacy-ported/packages/engine/perceiver/text/pronouns.js [Figure]
- legacy-ported/packages/host/corpus.js [Ground] -> legacy-ported/packages/engine/perceiver/text/relations.js [Figure]
- legacy-ported/packages/host/corpus.js [Ground] -> legacy-ported/packages/engine/referents/index.js [Figure]
- legacy-ported/packages/host/surfer.js [Ground] -> legacy-ported/packages/engine/emergence/activation.js [Figure]
- legacy-ported/packages/host/surfer.js [Ground] -> legacy-ported/packages/engine/loops/reading-regime.js [Figure]
- adapters/text/clause-tense.js [Figure] -> adapters/text/morph-cues.js [Pattern]

Run 1 (kept): the driver looked up each CAPACITIES entry by its full `module` string instead of by basename as the document declares; 49 modules, class 8 cross / 2 upward (UNDERPOWERED), grain 9 cross / 5 upward (UNDERPOWERED). The lookup was corrected to the declared rule and the run repeated; both are reported.

### F4 — does direction need standing?

Harness power check (200 syntheses; planted pair: B follows A at lag 1 with probability 0.5 over a 0.05 base): planted pair agreement **1.000** vs order-destroyed **0.465** (z 12.1); independent pairs **0.489** vs **0.491** (z -0.15). PASSED.

#### Primary setting

| material | pairs | S n | A_S | E_S | p(E_S) | N n | A_N | E_N | p(E_N) | Δ | p(Δ) | strata used | decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dracula | 1217 | 262 | 0.538 | 0.039 | 0.125 | 860 | 0.545 | -0.027 | 0.750 | 0.065 | 0.035 | 2 | **SUPPORTED** |
| Pride and Prejudice | 1614 | 310 | 0.568 | 0.061 | 0.075 | 1121 | 0.546 | -0.011 | 0.650 | 0.095 | 0.003 | 2 | **SUPPORTED** |
| Frankenstein | 569 | 65 | 0.477 | -0.059 | 0.900 | 180 | 0.633 | 0.058 | 0.200 | -0.117 | 0.960 | 1 | **FALSIFIED-INVERSE** |
| Shakespeare plays (38, pooled) | 4704 | 792 | 0.558 | 0.046 | 0.025 | 2477 | 0.559 | 0.042 | 0.025 | 0.052 | 0.010 | 3 | **MIXED** |

#### Robustness (read for sign and size, never for the decision)

| material | variant | S n | E_S | N n | E_N | Δ | p(Δ) | label |
|---|---|---|---|---|---|---|---|---|
| Dracula | primary W=8 B=256 | 262 | 0.039 | 860 | -0.027 | 0.065 | 0.035 | SUPPORTED |
| Dracula | robust W=2 B=256 | 249 | 0.057 | 473 | -0.040 | 0.097 | 0.012 | SUPPORTED |
| Dracula | robust W=32 B=256 | 324 | 0.029 | 1212 | -0.044 | 0.074 | 0.012 | SUPPORTED |
| Dracula | robust contiguous halves | 189 | -0.009 | 659 | -0.015 | 0.018 | 0.340 | NO-SIGNAL |
| Dracula | robust B=128 | 265 | 0.054 | 853 | -0.060 | 0.115 | 0.002 | SUPPORTED |
| Pride and Prejudice | primary W=8 B=256 | 310 | 0.061 | 1121 | -0.011 | 0.095 | 0.003 | SUPPORTED |
| Pride and Prejudice | robust W=2 B=256 | 284 | 0.079 | 713 | -0.016 | 0.116 | 0.000 | SUPPORTED |
| Pride and Prejudice | robust W=32 B=256 | 334 | 0.035 | 1549 | -0.011 | 0.045 | 0.061 | NO-SIGNAL |
| Pride and Prejudice | robust contiguous halves | 295 | 0.020 | 1029 | 0.026 | 0.007 | 0.424 | NO-SIGNAL |
| Pride and Prejudice | robust B=128 | 320 | 0.026 | 1129 | 0.011 | 0.047 | 0.085 | NO-SIGNAL |
| Frankenstein | primary W=8 B=256 | 65 | -0.059 | 180 | 0.058 | -0.117 | 0.960 | FALSIFIED-INVERSE |
| Frankenstein | robust W=2 B=256 | 59 | -0.072 | 89 | -0.044 | -0.041 | 0.681 | NO-SIGNAL |
| Frankenstein | robust W=32 B=256 | 81 | 0.027 | 303 | 0.021 | 0.006 | 0.448 | NO-SIGNAL |
| Frankenstein | robust contiguous halves | 60 | -0.050 | 154 | 0.066 | -0.116 | 0.952 | FALSIFIED-INVERSE |
| Frankenstein | robust B=128 | 91 | -0.084 | 228 | 0.043 | -0.127 | 0.991 | FALSIFIED-INVERSE |
| Shakespeare plays (38, pooled) | primary W=2 B=64 | 792 | 0.046 | 2477 | 0.042 | 0.052 | 0.010 | MIXED |
| Shakespeare plays (38, pooled) | robust exact-L strata W=2 B=64 | 792 | 0.046 | 2477 | 0.042 | 0.040 | 0.048 | MIXED |
| Shakespeare plays (38, pooled) | robust W=1 B=64 | 650 | 0.061 | 1874 | -0.019 | 0.062 | 0.008 | SUPPORTED |
| Shakespeare plays (38, pooled) | robust W=4 B=64 | 853 | 0.034 | 2933 | 0.067 | 0.021 | 0.175 | FALSIFIED-INDEPENDENT |
| Shakespeare plays (38, pooled) | robust contiguous halves | 468 | 0.038 | 1475 | 0.023 | 0.062 | 0.018 | SUPPORTED |
| Shakespeare plays (38, pooled) | robust B=32 | 879 | 0.052 | 2741 | 0.035 | 0.071 | 0.002 | SUPPORTED |

#### Exploratory diagnosis (post-hoc; changes no verdict above)

| book | analysis | S n | E_S | N n | E_N | Δ | p(Δ>0) | p(Δ<0) | strata |
|---|---|---|---|---|---|---|---|---|---|
| dracula | all pairs (the pre-registered set) | 262 | 0.039 | 860 | -0.027 | 0.065 | 0.035 | 0.965 | 2 |
| dracula | excluding rare-token-sharing pairs | 262 | 0.039 | 860 | -0.027 | 0.065 | 0.040 | 0.961 | 2 |
| dracula | quintiles | 262 | 0.039 | 860 | -0.027 | 0.065 | 0.035 | 0.965 | 2 |
| dracula | exact L strata (capped at 12) | 262 | 0.039 | 860 | -0.027 | 0.051 | 0.100 | 0.901 | 12 |
| pride | all pairs (the pre-registered set) | 310 | 0.061 | 1121 | -0.011 | 0.095 | 0.003 | 0.998 | 2 |
| pride | excluding rare-token-sharing pairs | 310 | 0.061 | 1119 | -0.011 | 0.094 | 0.003 | 0.998 | 2 |
| pride | quintiles | 310 | 0.061 | 1121 | -0.011 | 0.084 | 0.011 | 0.990 | 3 |
| pride | exact L strata (capped at 12) | 310 | 0.061 | 1121 | -0.011 | 0.080 | 0.010 | 0.991 | 13 |
| frankenstein | all pairs (the pre-registered set) | 65 | -0.059 | 180 | 0.058 | -0.117 | 0.960 | 0.040 | 1 |
| frankenstein | excluding rare-token-sharing pairs | 65 | -0.059 | 180 | 0.058 | -0.117 | 0.960 | 0.040 | 1 |
| frankenstein | quintiles | 65 | -0.059 | 180 | 0.058 | -0.083 | 0.884 | 0.117 | 2 |
| frankenstein | exact L strata (capped at 12) | 65 | -0.059 | 180 | 0.058 | -0.099 | 0.924 | 0.077 | 4 |

### F5 — does standing need identity?

| book | surface arm: standing / not | referent arm: standing / not | self-edges in top 20 | same-cluster pairs (standing / not) | different-cluster pairs (standing / not) | Fisher p | permuted-label share, 95th pct | consequential |
|---|---|---|---|---|---|---|---|---|
| Dracula | 302 / 1097 | 301 / 916 | 0/20 = 0.00 | 5 / 9 | 297 / 1088 | 0.1652 | 0.05 | false |
| Pride_and_Prejudice | 377 / 1312 | 358 / 1256 | 0/20 = 0.00 | 5 / 7 | 372 / 1305 | 0.1067 | 0.05 | false |
| Frankenstein | 188 / 413 | 193 / 376 | 1/20 = 0.05 | 5 / 2 | 183 / 411 | 0.0337 | 0.00 | false |

Overall (declared rule): **MIXED**.

### F5b (exploratory, post-hoc) — are the top edges pieces of one mention?

Token-adjacency of the two beings' matches among the sentences that hold both; bar 0.5 declared in the driver. **Refuted:** Dracula — surface 0/20, referent 0/20; Pride_and_Prejudice — surface 0/20, referent 0/20; Frankenstein — surface 0/20, referent 0/20 of the top standing edges are adjacent-mention pairs.

### F5c (exploratory, post-hoc) — bare honorific beings among the top standing edges

Engine's received `HONORIFIC_TITLES` (giver lang/en); a bare-title being has every surface a single such token. Role titles (Queen, Count, Professor) are counted too — which is why F5′ uses an interventional statistic instead.

| book | arm | top-20 edges with a bare-title endpoint | all standing edges | bare-title beings in the top 80 |
|---|---|---|---|---|
| Dracula | surface | 7/20 (35%) | 61/302 | Count:184, Professor:165, Mrs:89, Miss:21, Lord:12, Mr:11, Madam:9, Herr:7, King:6 |
| Dracula | referent | 3/20 (15%) | 24/301 | mrs:89, miss:21, mr:11, herr:7, king:6 |
| Pride_and_Prejudice | surface | 13/20 (65%) | 64/377 | Mr:806, Mrs:354, Lady:56, Lord:12, Miss:9 |
| Pride_and_Prejudice | referent | 12/20 (60%) | 64/358 | mr:806, mrs:354, lady:56, lord:12, miss:9 |
| Frankenstein | surface | 0/20 (0%) | 7/188 | Madame:4, Mrs:4 |
| Frankenstein | referent | 0/20 (0%) | 6/193 | madame:4, mrs:4 |

### F5′ — repairing the extent (HELD-OUT books: these decide)

| book | merges made | share as-split | share repaired | share placebo | Δ | Δ_placebo | honorific-dot sentences ending in it: as-split → repaired | consequential |
|---|---|---|---|---|---|---|---|---|
| The_Adventures_of_Sherlock_Holmes | 67 | 0.15 | 0.10 | 0.15 | 0.05 | 0.00 | 67/367 → 0/364 | false |
| Moby_Dick | 42 | 0.10 | 0.10 | 0.10 | 0.00 | 0.00 | 42/122 → 0/120 | false |
| The_Adventures_of_Tom_Sawyer | 30 | 0.05 | 0.00 | 0.00 | 0.05 | 0.05 | 30/59 → 0/57 | false |

Overall: {"consequentialOverall":false,"on":"0 of 3"}

### F5′ — repairing the extent (development books: exploratory replication, not counted)

| book | merges made | share as-split | share repaired | share placebo | Δ | Δ_placebo | honorific-dot sentences ending in it: as-split → repaired | consequential |
|---|---|---|---|---|---|---|---|---|
| Dracula | 127 | 0.15 | 0.00 | 0.15 | 0.15 | 0.00 | 127/403 → 0/401 | false |
| Pride_and_Prejudice | 1166 | 0.60 | 0.20 | 0.55 | 0.40 | 0.05 | 1166/1170 → 0/1001 | true |
| Frankenstein | 5 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 5/18 → 0/18 | false |

Overall: {"note":"exploratory replication — not counted in the decision","consequentialOn":"1 of 3"}

<!-- RESULTS:END -->

### 7.1 Against the pre-registered rules

- **F1, F2** pass (`tests/capacity-map.test.js`; five mutations of the module each fail at least
  one test). They check the code, not the theory.
- **F3** — the class axis is **UNDERPOWERED** (9 cross-class edges, the floor was 10) and is not
  read; the grain axis (12 cross-grain edges) is **NOT-A-LAYERING-FACT**: 6 of 12 edges run
  upward against a null mean of about 9. I expected the class order to be violated; the data can
  neither confirm nor refute that, but the three upward class edges named above are
  informative: two are `surfaces.js` and `parse-gated-names.js` reading `spans.js` — an
  arithmetic mark reading a geometric extent, the "extents before cast" schedule of the reading
  pipeline that THE-THREE-MATHEMATICS §VII already keeps apart from the operator chain. Five of
  the six upward grain edges are two host modules (declared Ground) importing the Figure organs
  they orchestrate. The first run of the driver looked CAPACITIES entries up by their full path
  string instead of by basename as declared; the correction grew the population (49 → 61 modules), left the
  class axis UNDERPOWERED (8 → 9 cross-class edges) and moved the grain axis from UNDERPOWERED (9
  cross-grain edges) to NOT-A-LAYERING-FACT (12); both runs are kept.
  *A limit of the population:* 15 CAPACITIES entries name modules that live in the-fold, outside
  this tree, and are listed rather than measured.
- **F4** — the harness passed its power check, so a NO-SIGNAL would have been readable at that
  effect size (the planted pair carries hundreds of lag events; the novels' pairs carry a median
  of one or two, so this is *not* a power statement at their volume). At the primary setting
  Dracula and Pride and Prejudice are SUPPORTED, Frankenstein is FALSIFIED-INVERSE and the plays
  are MIXED, so **the crossing is not supported by the pre-registered aggregate rule** (it needed
  the plays and two of three novels SUPPORTED with no FALSIFIED anywhere). I had put 25% on
  SUPPORTED and 10% on FALSIFIED; the real mixture had more signal than I expected in both
  directions. What the data do say: standing raised the split-half reliability of direction —
  the contrast Δ is positive in three of four materials, significant within tercile strata in
  those three, and still significant under exact volume matching in Pride and Prejudice and
  (barely) in the plays, not in Dracula (p 0.100). It is a **graded** dependence, small, and not a
  precondition: in the plays the non-standing pairs are themselves reproducible above the
  order-destroyed control, and in the novels the standing group's own excess is not significant
  (the SUPPORTED labels come from the contrast). The Frankenstein inversion is one effective
  stratum with a median of one lag event, and is not significant under quintile or exact-volume
  strata (p 0.117, 0.077). The plays' verdict also moves with the window (W = 1 SUPPORTED, W = 2
  MIXED, W = 4 FALSIFIED-INDEPENDENT).
- **F5** — self-edges are 0, 0 and 1 of the top 20; consequential on 0 of 3; overall MIXED
  because Frankenstein sits exactly on the 0.05 hazard line. I had put 75% on consequential.
  What was measured is the *marginal* effect of the engine's clustering on the top edges, and the
  answer is that it is small: same-cluster pairs are a handful (14, 12, 7) of the co-arriving
  surface pairs.
- **F5b** (exploratory) refuted the obvious mechanism for the visible `Mr — Bennet`: 0 of 20
  top edges are token-adjacent pieces of one mention in any arm of any book.
- **F5c** (exploratory) counted bare honorific beings directly: 3 of the top 20 referent-arm edges
  in Dracula, 12 of 20 in Pride and Prejudice, none in Frankenstein.
- **F5′** (registered after F5c, before it was run on held-out books) — repairing the extent
  removes the bare-honorific edges by 0.40 in Pride and Prejudice and by 0.00 to 0.05 in each
  of the three held-out books, where an equal-sized placebo merge removes 0.00 to 0.05. Consequential
  on **0 of 3** held-out books: **not supported as general**. I had put 70% on it. The cause found
  by looking is real — `splitSentences` ends a sentence at an honorific abbreviation in every book
  (from 18% of the sentences that contain one in Sherlock Holmes to 99.7% in Pride and Prejudice)
  — but what it costs the strongest edges depends on how a book writes its honorifics.

### 7.2 What this did to the map

1. **Both crossings left the default** (the decision table of §6, applied as written). The kernel
   keeps them as `DECLARED_CROSSINGS`, each moved to `UNSUPPORTED_CROSSINGS` with the rule that
   judged it, the outcomes and the files; `CROSSINGS`, what is in force, is now empty, so the
   default lattice is the free box (27 profiles, 90 routes) and the strict one — 10 profiles,
   5 routes, one balanced route — is still there to be asked for with
   `crossings: DECLARED_CROSSINGS`. `tests/capacity-map-results.test.js` recomputes each recorded
   outcome from the raw results, so the history cannot drift from the runs.
2. **The within-class chain — Ground before Figure before Pattern — was never tested.** F1–F5
   touch only the crossings between classes. `prerequisites()` still returns the lower positions
   of the same class, and `planFold` reports them; that is the cube's own ladder, not a result of
   this pass.
3. **The class ↔ domain identification is the seam every result landed on.** THE-THREE-
   MATHEMATICS identifies the domains with the mathematics *of the acts*; S10's classes are
   classes of the *quantity a claim rests on*, and its worked example climbs all three inside one
   terrain. F4 measured a transcendental quantity (transfer entropy) computed inside a Structure-
   domain act (`binding.js`, declared `CON·Figure`); F3's upward class edges are the extent read by
   the mark. The nomination stands as a nomination of *acts*; a map of *quantities* is a different
   object, not built here, and the `LIMITS` ledger records the difference where it bit
   (`quantityClass`).
4. **The registry is not an earned ledger.** `assemblies.js` still says the native Network run on
   real material was never done while `eval/network-standing.mjs` and its results are on disk, and
   the pattern `fold-plan.js` used to call a stage a measurement gap missed "native run on real
   material" — so an unmeasured Network fold was planned as measured. One `MEASUREMENT_GAP`
   pattern now serves both, `placeFromRegistries` reports the registry's account *as* the
   registry's account, and it carries the measured `LIMITS` beside the places they attach to.
5. **Three measured limits, attached to the places they belong to** (`LIMITS`, organs/capacity-
   place.js): the extent is cut inside a name (Field); a cut-off honorific is admitted as a being
   (Entity) — book-specific; the pair-direction rung is weak (Link, quantity class
   transcendental).
6. **Handed off, not fixed here:** `splitSentences`' handling of honorific abbreviations. It changes
   every sentence address in every book that uses `Mr.`, so it is an engine change to be measured
   on its own terms (the repair used here, `mergeAtHonorifics`, is an evaluation device, not a
   proposal).

### 7.3 What survived, and what did not

The map as a **placement instrument** survived: the nine derived places, the profile with its
orphans and typed gaps, the dressed accounting, `prerequisites`, `nextSteps`, and a planner that
says what a fold rests on. The strict order **as a law** did not: neither of its two crossings
met the rule registered for it. The falsification bought four findings about the built system,
one correction to a tool I wrote earlier (a stage pattern with a blind spot), and one
correction to the map's own vocabulary (act versus quantity). None of it says the classes are
not ordered in a reader's development; it says the two tests that were run did not show it, and
that what they did show is smaller and stranger than the order.

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
