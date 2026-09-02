# The MHC tests, order 4 and up — what each order's test actually is

Companion to POLICIES.md P44/P70 and `mhc.js`. Where P44 describes the
battery's shape and P70 records its null-arm history, this document states,
order by order from the symbolic floor upward, **what the test for that
order is** — the task and the three arms (READING-POLICY A10) that prove a
pass is real rather than vacuous.

## Numbering: the floor is order 4, Nominal

The repo's own `mhc.js:148-166` table (reproduced from the eo-wiki article)
carries a **16-row, holiday convention**:

| repo order | repo name | Commons's own order (2008) |
|---|---|---|
| 0 | Calculatory | 0 (Computory) |
| 1 | Automatic | 1 (Sensory and motor) |
| 2 | Sensory & Motor | 2 (Circular sensory-motor) |
| 3 | Circular Sensory-Motor | 3 (Sensory-motor) |
| **4** | **Sensory-Motor** | **4 (Nominal)** |
| 5 | Nominal | 5 (Sentential) |
| … | … | … |
| 14 | Paradigmatic | 13 (Paradigmatic) |
| 15 | Cross-Paradigmatic | 14 (Cross-paradigmatic) |
| 16 | Meta-Cross-Paradigmatic | 15 |

Commons's own canonical Table 2 (`Commons & Pekker 2008`,
"Hierarchical Complexity of Tasks Shows the Existence of Developmental
Stages") puts **Nominal at order 4**. The sensorimotor tier is orders 0–3:
Computory, Sensory and motor, Circular sensory-motor, Sensory-motor. Order 4
is the first *symbolic* order — "Saying 'clean'" in the paper's own Wash
Problem (Table 3).

**Consequence.** The battery's declared `SYMBOLIC_FLOOR = 5` (`mhc.js:188`)
rests on the eo-wiki's naming (which shifts Nominal to 5). Under Commons's
own numbering the floor is **order 4 = Nominal** — the same structural claim
(the instrument's smallest symbolic act), just one rung lower. The "orders
0–4 are out of scope by construction" wording (`mhc.js:174-193`) therefore
mislabels the boundary: order 4 is *already symbolic*, squarely in this
instrument's scope. What is genuinely out of scope is orders **0–3**
(sensorimotor) — and order 0, "Calculatory," is not even absent: the
machine's own bit arithmetic is protocol. This document numbers **from
order 4**, and maps each order to the battery's actual item (which the
battery itself still declares at 5–14 under the holiday convention).

## The arms, once — the proof shape every order uses

Each item's **task** names the coordination that order performs. A pass is
not taken on the task alone; it is taken only when all three arms are
**licensed and failing**, per READING-POLICY A10:

| arm | question it answers (axiom) | a pass requires |
|---|---|---|
| `lowerOrder` | can the next-lower order accomplish it? (axiom 1) | the constituents alone must NOT |
| `arbitrary` | does the specific coordination, not a random one, do it? (axiom 2) | re-coordinating the same parts arbitrarily must NOT |
| `discrimination` | is it reading structure, not just content? (battery's own) | the task must FAIL on unsupporting material |

A pass is "real, not vacuous" only when each arm actually perturbs what the
task reads (is *licensed*) and then genuinely fails.

---

## Order 4 — Nominal (battery item `o5-nominal`)

**The coordination.** *A name denotes a being the material establishes.* Raw
capitalised runs (the sensorimotor symbols, the floor's substrate) are folded
into **admitted referent identities**, so a name points at a being rather
than at a byte string.

**Task.** Resolve the material's principal name to exactly one admitted
referent; a name of nobody (`ABSENT_NAME`) resolves to nothing; and — the
part containment can never do — **two surface forms of one being reach the
same being while two different beings stay apart**. Scored by referent id,
never by `resolve()`'s covering candidate set. Completes iff the principal
resolves, the absent name does not, the fold gathers every pair its own
individuation rule calls one being, and it withholds on every pair it is
supposed to.

**Arms.**
- `lowerOrder` — byte containment only. It finds the principal token and
  equally "finds" a common ordinary word that names no being; it is
  accomplished only if containment can also refuse that word, which it
  structurally cannot (it has no notion of a being to refuse with).
- `arbitrary` — the same surfaces dealt randomly into the same *number* of
  groups of the same *sizes* (marginals preserved, membership destroyed).
  Held to exactly the task's standard: the deal must gather every pair the
  individuation rule calls one being and keep apart every pair it withholds
  on — nearly never true of a random deal.
- `discrimination` — the control material does not establish the principal, so
  resolving the principal there returns nothing.

---

## Order 5 — Sentential (battery item `o6-sentential`)

**The coordination.** *A directed relation inside one sentence: who did what
to whom, in order.* Admitted referents are ordered around a measured
connector, so the pair carries a direction the referent set alone does not.

**Task.** The material's specimen edge `subject —verb→ object` must be
stated, and its **reverse** `object —verb→ subject` must not be.

**Arms.**
- `lowerOrder` — the unordered referent bag. The only "ordering" available
  without a connector is document position; it ranks a pair either way, so it
  cannot refuse the reverse.
- `arbitrary` — each sentence's words shuffled **in place** (vocabulary and
  sentence boundaries held fixed); the salad must not still state the edge.
- `discrimination` — the empty/control material must not state the edge.

---

## Order 6 — Preoperational (battery item `o7-preoperational`)

**The coordination.** *A sequence coordinated across sentences: a pronoun
bound to what was read before it.* Sentence-local relations are carried
forward as an activation trace, so a later sentence's pronoun reaches an
antecedent no single sentence contains.

**Task.** Bind at least one pronoun to an **admitted** referent, and never
bind one to a referent the reading has not admitted. Fabrication fails;
principled silence is a reported gap, not success.

**Arms.**
- `lowerOrder` — within-sentence extraction only: bind each pronoun to a name
  in its own sentence. It is accomplished only if it reproduces the real
  cross-sentence bindings (which would mean the trace was doing no work).
- `arbitrary` — sentences re-ordered (each preserved intact, order destroyed);
  the scrambling must not reproduce the same (pronoun, referent) bindings.
- `discrimination` — text with every pronoun stripped must yield no binding.

---

## Order 7 — Primary (battery item `o8-primary`)

**The coordination.** *An empirical rule applied: a claim checked against the
material's own edges.* The material's whole edge set becomes a rule a claim
is measured against, so a sentence never read still gets a verdict.

**Task.** The stated claim `s v o.` reads `bound`; the **reversed** claim
`o v s.` reads not-`bound`.

**Arms.**
- `lowerOrder` — bag-of-words containment: every content word of the reversed
  claim is present too, so containment cannot refuse it (the repo's own P31
  finding, standing in honestly as the lower order).
- `arbitrary` — the edge set **re-dealt** (same edges, subjects reassigned —
  marginals preserved, pairing destroyed); whether one label lands in a fixed
  target set under a uniform permutation has an **exact hypergeometric
  answer**, so this is computed, not Monte Carlo estimated
  (`redealAgainstExactNull`).
- `discrimination` — the same claim checked against different content must
  not bind.

---

## Order 8 — Concrete (battery item `o9-concrete`)

**The coordination.** *Multiple concrete instances coordinated: corroboration
counted by perspective, not by mention.* Separate statements of one claim are
folded into a count that distinguishes **two passages of one source from two
sources** — a distinction no single verdict carries.

**Task.** The recurring edge's claim must be `bound` with `passages >=
WITNESS_FLOOR` (2) and a `sources` count recorded — counted apart.

**Arms.**
- `lowerOrder` — the bare verdict, one bit: it cannot report how many
  perspectives stand behind it (and `&& false` enforces that it cannot
  wholesale fake the count).
- `arbitrary` — the corpus's own real distribution of ref-counts-per-edge,
  reassigned to a different edge identity (marginals preserved), almost never
  hands *this* specimen a count clearing the floor by chance — exact
  proportion `redealCountAgainstExactNull`, not a bare shuffle (P70's
  second same-day amendment: the earlier arm shuffled an array then took a
  `Set()` of it, order-insensitive, and reported "0 of 20" for a reason it
  never tested).
- `discrimination` — a claim the material states once must not report
  corroboration at the floor.

*Disclosed limit*: this driver tags every passage with one source key, so
the two-sources-two-passages distinction is real in `organizes` and never
exercised here — it is order 13's own apparatus.

---

## Order 9 — Abstract (battery item `o10-abstract`)

**The coordination.** *A variable quantified over a category: the whole
filler set of an open slot.* Instance verdicts are generalised into a slot
with a range, so "who are ALL the X that Y" has an answer no single instance
carries.

**Task.** A subject+verb slot with **two or more distinct fillers** must range
over exactly those fillers; an absent subject ranges over none.

**Arms.**
- `lowerOrder` — checking one instance returns `bound` for that instance and
  can never return a set.
- `arbitrary` — the same objects, same group sizes, but which subject+verb key
  each object is filed under is re-dealt; the range must not survive.
- `discrimination` — the same slot queried against different content must not
  return the same range.

---

## Order 10 — Formal (battery item `o11-formal`)

**The coordination.** *One hypothesis tested against a constructed null: is
this edge's connector asserted, or an artefact.* A slot's contents stop being
recovered fact and become a hypothesis with a support count and a null it has
to clear.

**Task.** Every edge carries an assertion record typed `corroborated` or
`single-witness`, and the reading exhibits **both** standings (a population
where every edge landed on one label would discriminate nothing).

**Arms.**
- `lowerOrder` — the edge's own existence: exactly what the assertion tier
  refuses to accept as evidence for itself.
- `arbitrary` — the dead end (every redeal reproduces `standingOf`, a pure
  function of ref-count) is escaped by redealing the **label**, not the
  count: if the "corroborated" label were assigned arbitrarily, the exact
  probability a same-size draw lands entirely on the K edges that genuinely
  clear the floor is the **hypergeometric point mass at the maximum** —
  closed form, no simulation. Reads `assertion.statements` (the same field
  `hypergraph.js` keys `standingOf` off), never order 8's distinct-passage
  grain. A pass requires the real labelling to be unexplained by chance.
- `discrimination` — a word-salad copy of the material must not yield
  corroborated standings at the real material's rate.

---

## Order 11 — Systematic (battery item `o12-systematic`)

**The coordination.** *Many formal relations coordinated into one system,
ordered by presupposition.* Checks are ordered so **Existence gates Structure
gates Interpretation** — a referent that fails to exist makes downstream
cells typed GAPS rather than falses (Strawson/Russell).

**Task.** The verification grid yields 9 cells; with a non-existent subject,
the downstream cells are gaps, never fails.

**Arms.**
- `lowerOrder` — one bare verdict cannot distinguish "checked and false" from
  "couldn't be checked because a presupposition failed."
- `arbitrary` — shuffling cell *order* tests nothing (the gating happens
  inside `verificationTasksFor` before it returns). The licensed
  perturbation re-pairs **the report of one claim with a different claim's
  reading** (both real, marginals preserved); the mixed grid must not
  reproduce the same coordinated verdicts.
- `discrimination` — a claim with no material at all must produce gaps, not a
  full grid of holds.

---

## Order 12 — Metasystematic (battery item `o13-metasystematic`)

**The coordination.** *Several whole systems compared: a standing no single
system carries.* Each source's whole verdict-system is one witness; the
**standing** of a claim across witnesses — corroborated, or a lone voice —
becomes the finding: a property of the set no member carries.

**Task.** Merge testimony over per-source readings: one claim must land
`AGREE`/`corroborated`, another **exactly one** system binds → `SINGLE`/`single`,
and — the non-circular part — **below the merge the two are
indistinguishable**: each has a system saying exactly `holds`, the same word,
and no reading carries a standing of its own.

**Arms.**
- `lowerOrder` — shown, not asserted: one system says `holds` for *both*
  claims, so nothing at that level separates corroborated from lone. Licensed
  only if the two merges genuinely differ.
- `arbitrary` — shuffling *source identity* is unlicensed (the merge is
  invariant to who said what — A10's trap). The licensed perturbation
  destroys the **claim-grouping**, mixing the two claims' readings; the mix
  must not reproduce the clean claim's own standing.
- `discrimination` — the corroborated claim *reversed* (real readings from
  the same systems) must not come back corroborated; licensed only if the
  reversed claim genuinely draws fewer holds.

---

## Order 13 — Paradigmatic (battery item `o14-paradigmatic`)

**The coordination.** *Two metasystems coordinated into a new one that
reorganises both.*

**Task.** The honest test of an absent capacity: **search** for any organ in
the repo that consumes TWO metasystematic results (a cross-source testimony
merge and a nine-cell verification grid) and returns a third framework with
its own terms. It reports what was searched and fails, naming the absence.

**Arms.** All three report `perturbed: true, completed: false` — one
metasystem cannot reorganise two; there is no coordination to perturb because
the capacity is absent; nothing to discriminate because no candidate organ was
found. This is a true-negative by honest search-and-absence, not a completed
pass.

---

## Orders 0–3 — sensorimotor, the substrate (not tests, the machine)

The four sensorimotor orders are not measured because the instrument **is**
them at its base, not because it lacks them:
- **0 Computory/Calculatory** — "simple machine arithmetic on 0's and 1's"
  is the CPU itself, trillions of times a second. The machine does not sit
  above order 0; order 0 is its substrate.
- **1 Sensory and motor** — seeing/touching circles, squares (*pre-symbolic*).
- **2 Circular sensory-motor** — reaching and grasping (*pre-symbolic*).
- **3 Sensory-motor** — taking the clean cloth rather than the dirty,
  whatever it is made of (*pre-symbolic*).

The honest statement, under Commons's own numbering: orders 0–3 are the
machine's anatomy (order 0 literally the bit); **order 4 = Nominal is the
floor the battery actually starts at**, and the reported stages should be
read against that floor.
