# Reasoning linter — live results (2026-09-11)

`organs/reasoning-lint.js` is the Reasoning Seed's precedence order and
containment boundary, run as a linter over the holograph. This document
records the live run (`eval/the-fold/reasoning-lint-demo.mjs`) over three
corpora, and the walls that pin it (`tests/reasoning-lint.test.js`).

Every finding below was COMPUTED from the real notes ledger
(`kernel/notes.js` via `organs/hyperlexicon.js`), tagged at admission
(`organs/regime.js::tagClaim`), and read through the real task-log
projection. No finding is typed by hand. Spans in the content cases are
byte-addressed and self-verified against the fixture file (P5.2).

## The three strictness levels

| level | what surfaces | `ok` fails on |
|---|---|---|
| `report` | the record's standing: what is contested, what is out of its validity window, what rests on a single voice, what holds against the oracle | nothing (disclosure only) |
| `standard` | the seed's two falsifiable facts, as errors: an expired obligation fails validity before force/entrenchment; a contested claim is never silently picked | expired-in-force / expired-premise, standing contradictions, unrouted cuts, contested premises, oracle refusals |
| `strict` | adds R1: an inference step nothing licensed is an error; a support cycle is an error | unlicensed inferences, circularity |

## 1. The seed's falsifiable case (§7) — a sunset ordinance + a contested claim

One corpus: an ordinance ("operators must file an annual report", effective
2015, terminates 2020, queried 2026) and a plot→city land claim disputed by
a third source; a derived product rests on the expired ordinance.

| strictness | findings |
|---|---|
| `report` | `expired_out_of_scope` (warn), `contested_open` (warn) |
| `standard` | + `expired_premise` (error) — the derived product rests on the sunset obligation |
| `strict` | same as standard |

Both acceptance facts hold live: the expired obligation fails the
validity-window check before force or entrenchment is consulted
(`expired_premise`), and the contested claim routes to landContest, never a
winner (`contested_open`). Before this seed, a transitivity/circularity-only
layer either silently resolved the contest (bug 3) or had no way to expire
the obligation. After: both are named.

## 2. speed-essay.txt — persuasion posing as reasoning

Read as content the system itself might generate. At `report`/`standard`
the ledger is coherent (`ok: true`) — persuasion is not yet incoherence.
At `strict` the R1 tier names what the essay's rhetoric does:

- `unlicensed_inference` × 4: the slippery slope ("running one test →
  six-month release cycle"), the appeal to popularity ("everyone is doing it
  → settles the question"), the appeal to authority ("CEO's experience →
  being right"), and the deep-history argument ("wheel, printing press,
  smartphone → no edge-case debate") — each composes one relation into
  another with no declared licence. **Structure never licenses composition;
  only a named giver can (R1).**
- `vacuous_support` (info): "2¹⁰ = 2¹⁰, therefore 2¹⁰ + 2¹⁰ = 2¹¹" — the
  restated tautology does none of the work.

## 3. math-code.txt — statements and blocks, several wrong, a real oracle

The oracle COMPUTES each verdict in real JS numbers — never a hand-typed
answer. Findings at `standard`:

| statement | verdict |
|---|---|
| (x²−1)/(x−1) = x+1 "for all x, including x=1" | `undefined_claim` — the identity is 0/0 exactly where the claim extends it |
| ∫₀¹ x² dx = 1/2 | `claim_fails_oracle` — it is 1/3 |
| d/dx sin(x²) = cos(x²) | `claim_fails_oracle` — it is 2x·cos(x²) |
| log(a)+log(b) = log(a+b) | `claim_fails_oracle` — it is log(ab) |
| e^{iπ} = −1 → raising both sides to 2i → e^{−2π} = 1 | `claim_fails_oracle` — e^{−2π} ≈ 0.0019; the complex-power step is unlicensed |
| harmonic series → ≈1.64 | `claim_fails_oracle` — it diverges |
| 0.1 + 0.2 = 0.3 exactly in IEEE 754 | `claim_fails_oracle` — it is 0.30000000000000004 |
| 1/0 = ∞ | `undefined_claim` |
| cos(2θ) = 2cos(θ) | `claim_fails_oracle` — it is 2cos²θ − 1 |
| 2¹⁰ + 2¹⁰ = 2¹¹ | `claim_holds` (info) |
| √16 = ±4 | `convention_dispute` (info) — principal vs equation-solving |
| A > B ∧ B > C → A > C | `licensed_inference` (info, `>`→`>`) at strict |
| A > B → A² > B² for all real A,B | `universal_refuted` (error) — A=0, B=−1, computed — AND `unlicensed_inference` (error) at strict |

The R1 pair is the load-bearing one: transitivity of `>` is licensed by a
declared giver and passes; "the same reasoning" applied to squaring is
neither licensed nor true, and both the licence check and the counterexample
search catch it independently.

## Walls (tests/reasoning-lint.test.js, 17/17)

- the strictness ladder is declared, in order
- cell resolution surfaces only for a note never resolved to a cube cell
- **acceptance**: expired obligation out of window before force/entrenchment
- **acceptance**: contested claim routes to landContest, never a winner
- **acceptance**: expired premise under a derived product is an error
- **acceptance**: contested premise with `restsOn.contested = 0` claims a
  settled base it does not have
- force-resolved disagreement reported as resolved by the order (not error)
- a disagreement no rule separates is a standing contradiction (error)
- an unrouted cut (a denial whose link carries no contest) is an error
- a directed cycle is found; a DAG is clean; circularity is strict-only
- unlicensed inference is an error at strict; a declared licence is info
- a universal a counterexample refutes is an error at standard
- an equation the oracle refutes is an error; one that holds is info
- `lintContent` runs convert → admit → both lints over a fresh ledger
- strictness filters hold (strict-only findings absent at report/standard)

## Regression pin (tests/reasoning-lint-content.test.js, 4/4)

The three demo corpora — the seed's §7 falsifiable case, the speed essay,
and the math/code sheet — are pinned by their exact finding-kind signature
(level × severity × kind) at every strictness level, so a later regression
(a check that stops firing, a severity that drops, a verdict that flips)
fails loudly. Verified correct by hand before pinning (2026-09-11, user
confirmed the findings are all correct), then asserted.

The pin caught a real bug on its first run: the demo oracle's `d/dx` case
used the regex `d\/dx`, which does not match the statement's own spelling
`\frac{d}{dx}` — so "d/dx sin(x²) = cos(x²)" was being reported as
`unchecked` instead of `claim_fails_oracle`. Fixed (7 fails at standard,
not 6), and the corrected count is what the pin asserts.

## Suite

`node --test tests/*.test.js`: 709 tests, 707 pass, 2 fail. The 2 failures
are in `hyperlexicon-door-probe.test.js` and `spans-frontmatter.test.js` —
pre-existing, in files untouched by this pass, and neither imports
reasoning-lint. The 17 reasoning-lint tests plus the 4 regression-pin tests
pass cleanly (21/21).

## Generality

**Universal for the routing rules** (validity → regime → specificity →
force → recency → entrenchment, and the contested containment boundary) —
they are the seed's section 4 written once, applied to any ledger through
the injected door, with no corpus-specific number anywhere. **Declared for
the inference tier** — the reading pipeline does not classify "therefore"
or "by the same reasoning" as inferences (the grammar lens refuses them,
P56); the demo declares them, exactly as the seed says the producing organ
does, and the R1 licence check is the point being demonstrated, not the
extraction. The oracle is the caller's own declared oracle (here, real JS
arithmetic), the same posture proof-seeking already holds.

## A real math verifier: pyodide + sympy (added 2026-09-11)

"How could the linter actually be a math verifier?" — the `verify`/`refute`
seam is the place, and the engine is already on hand: `pyodide` is
vendored, `sympy`+`mpmath` are in its lock file (the P21 wheel organ's
mirror), and the repo already boots pyodide in Node for offline tool use
(`scripts/date-normalize.mjs`). `lib/sympy-math-oracle.mjs` is that oracle:
each claim carries a sympy expression, sympy computes the truth, and the
verdict is *computed, never declared*.

Verified live against the same math sheet (every verdict computed, none
typed):

| claim | sympy verdict |
|---|---|
| ∫₀¹ x² dx = ½ | `false` — difference −1/6 |
| d/dx sin(x²) = cos(x²) | `false` — (2x−1)·cos(x²) |
| (x²−1)/(x−1) = x+1 | `holds` (identity) — the x=1 hole is a separate point check |
| log(a)+log(b) = log(a+b) | `false` — log(a)+log(b)−log(a+b) |
| cos(2θ) = 2cos(θ) | `false` — −2cos(t)+cos(2t) |
| 2¹⁰+2¹⁰ = 2¹¹ | `holds` |
| 1/0 = ∞ | `undefined` — sympy evaluates to `zoo` (complex infinity), correctly not "false" |
| CH independent of ZFC | `unchecked` — no sympy expression declared; a metamathematical statement is outside algebra, disclosed, never guessed |

`refute` runs a declared counterexample grid and is sound ONE way: a found
counterexample is a real refutation ("A=0, B=−1: 0 > −1 but 0 < 1"), and
"none among the declared samples" is withheld, never a confirmation (R2).

**The honest ceiling, and why it is the point (R19).** Sympy is a CAS, not
a proof assistant for metamathematics. It cannot touch "CH is independent
of ZFC" — that needs a proof checker over a formal system (Lean/mathlib,
Metamath set.mm), not symbolic algebra. The oracle says `unchecked` for
exactly those claims, and the linter's own R1 tier then catches the CH
article's philosophical moves (Platonist stance → truth value, rich
universe → against-CH, Freiling equivalence → CH false) as unlicensed
compositions. Cost, disclosed: pyodide boot ~9s (the repo's documented
figure); this is an offline/batch oracle, amortize the boot across many
claims — never per-claim in a live turn.

## Wired into the generation loop (added 2026-09-11)

The oracle and the linter are now part of the generation loop, not only the
demo:

- **`lintInferences` and `lintContent` are async-capable.** The oracle may
  be sync (the tests' stubs, the demo's JS fallback) or async (pyodide). A
  thenable is awaited; a sync value passes through unchanged — so all the
  linter tests and content pins keep passing with both.
- **The demo's math case uses the real pyodide oracle** when pyodide is
  installed, falling back to the JS arithmetic oracle (disclosed on the
  blurb) when it is not. Sympy computes `√16 = 4` (holds, the principal
  value), the harmonic series diverges (`oo` → false, distinct from
  `nan`/`zoo` → undefined), and `1/0` → `zoo` → undefined, never false.
- **`generate-passage.mjs` lints its own composed output.** The generated
  passage — facts no record states, derived through the substrate — is
  admitted into a fresh notes ledger and linted at all three strictness
  levels before it ships. Live run: 229 derived facts → 14 composed,
  14/14 true against the term-date oracle, and the lint reports coherent at
  every strictness. The driver's `FOLD` path was also fixed to resolve from
  the file's own location instead of a hardcoded `/home/user/the-fold`.

## The whole pyodide science stack, wired in (added 2026-09-11)

`lib/pyodide-oracle.mjs` generalizes the sympy oracle into a full
computation oracle — one boot, one verdict vocabulary, five engines. A
claim carries one engine field and the right library runs it:

| engine | what it verifies | example (all computed live) |
|---|---|---|
| `sympy` | symbolic algebra | ∫₀¹x²dx=½ → false (diff −1/6) |
| `scipy` | **exact** statistical nulls (Fisher, hypergeometric, binomial) — the P70 exact-hypergeometric precedent, from the library not a hand-derived closed form | [[8,2],[1,5]] association → holds (Fisher p=0.0350) |
| `numpy` | numeric claims | [[1,2],[2,4]] singular → holds (det=0) |
| `networkx` | graph claims | C4 bipartite → holds (2-colorable) |
| `code` | **executes generated code** — a function is run on real inputs, verified by running it, never by looking at it | `average([1,2,3])` returns 1.67, expected 2.00 → false (skips nums[0]) |

A claim the oracle cannot reach is `unchecked` → the linter's new
`oracle_withheld` finding, a disclosed gap at info severity — **never a
conviction** (R19). JS/Java code blocks are withheld exactly that way; the
CH-independence claim is withheld because it is metamathematics.

New demo case (science): pinned signature at every strictness — 1
`claim_fails_oracle` (the executed `average`), 2 `oracle_withheld`
(unexecutable JS/Java), 4 `claim_holds` (Fisher, hypergeometric,
singularity, bipartite). Tests: 58 passing (linter 53, content-pin 5).

## The holograph on every finding: referents + raw spans (added 2026-09-11)

A finding that names a note now points INTO the record, not just at its id:

- **Referents** — each end resolves through the caller's injected referent
  index (cast.js::makeReferentIndex, the SAME identity the surface reads):
  `referents: { end1: ["Count Dracula"], end2: ["Castle Dracula"], gaps }`.
  An absent index leaves ends as folded surfaces — a typed absence, never a
  guessed being (P38's discipline, applied to the findings).
- **Raw spans** — the note's byte-addressed spans (P5.2) ride the finding:
  `spans: ["city.txt#0-30"]`, opened by the record, never a paraphrase.

Wired through `lintLedger` (via the injected `referentIndex`), `lintContent`,
and the demo's `declaredReferentIndex` (a folded-surface index over the
corpus bytes; production injects the engine's own). Pair findings carry
BOTH notes' context; the circular finding carries every leg of the loop;
inference findings carry their declared spans. The generation loop builds a
label index over the Wikidata material and lints with referents on the
findings. Pinned by a dedicated unit test (referents + spans ride;
absent index → no invented referents). Tests: 59 passing.