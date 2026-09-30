# THE-STIGMERGIC-PIPELINE — the integrated machine eoreader7 serves

*Written 2026-09-29, as the implementation architecture of
THE-ENZYME-PIPELINE.md. Standing: **spec** — every stage names the module
that is it TODAY; the integration changes the stops and the gates, never
the enzymes. The user's directive, whole: "the overall goal is the
stigmergy, n-ary enzyme system, but we shouldn't ignore our past work —
an integrated pipeline that eoreader7 serves via its various APIs; it may
create far more content than what gets folded out for a given prompt or
project, gated by DMD." This document is that pipeline.*

## 0. The thesis

**Stigmergy is the coordination law: the environment is the message. The
n-ary enzyme system is many enzymes over one artifact tensor, coordinated
only by the shared material — never by enzyme-to-enzyme calls. Generation
is deliberately wide: every enzyme produces far more cells than the
answer needs, and the fold holds all of it. Folding is narrow and gated:
DMD reads the trajectory of the material and its eigenvalues decide what
folds out into the answer and what releases into the fiber. The doorways
(/v1/ask, /v1/chat/completions, /api/chat, /v1/documents, /v1/swarm,
/v1/code) are entry shapes of ONE machine; the envelope is its bill of
lading.**

Nothing in this pipeline is invented for the spec: the void, the draws,
the fact gate, the race, the swarm, the reading surface, the correction
ledger, DMD — all exist. The integration changes two things: the
stopping mechanisms become DMD-measured, and the fold-out is
DMD-gated at every grain.

---

## 1. The one machine and its doorways

| Doorway | Grain served | The pipeline's shape | Fold-out |
|---|---|---|---|
| `/v1/ask` | whole | void DEF → wide generate → DMD fold → envelope | one answer + fiber |
| `/v1/chat/completions` | whole + race | same, plus the mechanical race beside the draw | one answer + `race.superseded` |
| `/api/chat` (channel 11434) | whole, thin | admission → ladder → host forward | the daemon's answer + channel disclosure |
| `/v1/documents` | tensor | the projection: many cells × revisions | the artifact slice + its fiber |
| `/v1/swarm` | L0 framings | the wide-generation stage itself | surviving reading + anti-matter |
| `/v1/code` | tensor | void = the tests (the active site); cells = functions | code + validation record |

All doorways run the same two laws: **admission is the commitment
point** (ration, memory, saturation, family cap — `heimdall.mjs`), and
**the envelope carries the fiber** (charter, void, reading, race,
mechanical, satisfaction — `proxy.mjs:1155–1200`).

## 2. The stigmergy law

Enzymes do not call each other. They write to and read from the shared
environment:

- **The artifact tensor** — cells at `(grain, position, revision)`,
  each `{point, fiber}` (THE-ENZYME-PIPELINE §1).
- **The kinds and links** — the environment's own facts, which the fact
  gate consults first ("THE STIGMERGIC ROUTE FIRST: the environment's own
  kinds and links — a question already resolved by a previous turn (any
  session) is grounded by the route without spending a web door,"
  `proxy-runner.mjs:8313`).
- **The ledger** (`heimdall-log.jsonl`) — append-only, folded
  hourly/daily, never destroyed.
- **The reading surface** — `[S#]` tags, relation edges, referent
  bindings, the provenance layer.

The only non-stigmergic touchpoints are the admission gate (commitment)
and the envelope assembly (aggregation). Everything between is
environment-mediated: a draft is a cell; a verdict is a cell; a tag is a
cell; the next enzyme reads the cells its feature binds, never the
enzyme that made them.

## 3. The enzymes — what they are TODAY

| Enzyme | Is this, today | Level |
|---|---|---|
| DEF | `voidCellsFor` (`document-ledger.js`) — the 27 cells | L0 |
| Swarm | `eo-swarm.mjs` + `swarm-server.mjs` — framings, elenchus bar, anti-matter | L0 |
| Compose (Wolfe) | the draw at `proxy-runner.mjs:5866` | L1 |
| Verify (Ranke) | the grounding loop at `proxy-runner.mjs:7253–7353` | L2 |
| Edit (Murch) | the style loop at `proxy-runner.mjs:7418` | L1 |
| Cite | the verbatim SOURCES draw | L2/L3 |
| Fact gate | `proxy-runner.mjs:8288` — post-process, mechanical, stigmergic | L3 |
| Race | `precision-race.js` — beside the draw, loser rides the envelope | any |
| Meno | `satisfactionOf` / `chatVoidCheck` | L0 |

**The fact gate is a post-process, strike-and-replace mechanical enzyme**
("a sentence that commits to a value the kind+link contradicts is STRUCK
and replaced mechanically — assembled from the kind and the link — never
model-phrased," `proxy-runner.mjs:8296–8300`). It is not a pre-draft
gate; it is the L3 member of the draft→check→bounded-revise shape, with
a mechanical checker instead of a model. The integration classifies it
there, not beside the race.

## 4. Wide generation — overproduction is the design

Every enzyme emits a **cell set**, not one cell:

- Swarm: N framings (already: "the swarm is one round of Wilson's swarm
  over the capacity registry… each ant capped at 8000 chars").
- Compose: M draft candidates per section cell (revisions).
- Verify: verdicts for every paragraph, including the ones below the
  gate ("rewrites only at Kelsen ≥ 0.9" — the sub-bar verdicts are
  released, not deleted).
- Fact gate: a candidate tag per sentence plus the struck/replaced
  pairs.
- Race: the computed answer AND the model's draft, both.

The fold holds all of it. **Unitarity (I-unitarity): every cell is
folded out or released with a recorded reason — nothing is erased.** The
fold's storage law is the ledger's: recent raw, then folded snapshots,
then release — higher resolution for the more recent past.

## 5. DMD as the folding gate

**The instrument.** `native/kernel/dmd.js` (batch core) and
`native/kernel/dmd-stream.js` (`createStreamingDmd` — the causal
formulation: "modes() at snapshot t equals batch DMD over the prefix
..t," pinned by test). The state pushed in is the trajectory of the
material's observables — surprise, Kelsen grade, affinity, novelty —
whatever the grain measures. The eigenvalues that come out ARE the
measured dynamics: `|λ|` is growth or decay, `arg λ` is frequency.

**The causality law is the house law**: "a causal consumer must feed
them only a prefix, or use the streaming formulation… a caller that
hands it a whole book has read the future" (`dmd.js` header). The gate
never consumes the future. This is why the gate is `dmd-stream`, never
batch.

**The decision per mode:**

| Eigenvalue | Reading | The gate's act |
|---|---|---|
| `\|λ\| > 1` | the mode is carrying the trajectory | **folds out** — these cells are the answer |
| `\|λ\| < 1` | the mode is dying | **releases** — recorded to the fiber, never erased |
| `arg λ ≠ 0` | the material is oscillating | **flags a loop** — periodicity is repetition measured by dynamics, not counts |

**The measured bar.** The elenchus bar generalizes: the fold-out
threshold is a rerun floor, never hand-set ("measured bar — rerun
floor, never hand-set," `swarm-server.mjs:66–75`). The gate's claim is
falsifiable by its control: a mode that stops carrying the trajectory
within the fold-out window concedes the gate.

**The folding map — where the gate sits at each grain:**

| Grain | Trajectory | Today's stop | The gate replaces it with |
|---|---|---|---|
| L0 whole | the turn/answer sequence | `detectTrajectoryBoredom` (shuffle null, `document-ledger.js:991`) | DMD decay of the turn trajectory — stop generating when the dominant mode decays |
| L1 section | the rewrite revisions | `MAX_REWRITE_ROUNDS` (cap 2, `proxy-runner.mjs:6026`) + `NON_MOVING_EDIT_RATIO` (0.9, `:300,7296`) | DMD over the revision trajectory — the stop is the measured decay of the rewrite's own modes; the cap stays as a floor, never the stop |
| L2 paragraph | the Kelsen verdicts | the 0.9 gate | DMD over the verdict trajectory — sub-bar verdicts release by measured decay, not by one fixed threshold |
| L3 sentence | the sentence observables | the fact gate's kind+link strike | DMD over the sentence trajectory — the measured specimen exists: "rank 8, dominant decay mode (growth −1.10) and a measured periodicity pair at ~12.4 sentences" (Kafka, 2026-09-20) |

**The unification this achieves** (the "unify the loops" finding,
corrected): three divergent stopping mechanisms
(`MAX_REWRITE_ROUNDS`, `NON_MOVING_EDIT_RATIO`, and the boredom
detectors) become one measured stop — DMD decay — with each old
mechanism kept as its falsifying control's detector. The other agent's
`measured-loop.js` does not exist; the real module is
`dmd-stream.js`, and the real consumers of DMD today are the reading
layer (`mnemonic.js`, `for-whom.js`, `shadow-echo.js`,
`color-name-space.js`) — the integration extends DMD from the reading
layer to the rewrite and folding layers.

## 6. The fold-out contract

For a given prompt or project, the pipeline creates far more cells than
it delivers. The contract:

1. The pipeline generates wide; the fold holds every cell (I-unitarity).
2. The DMD gate reads the trajectory per grain (causal, prefix-only).
3. The fold-out = the cells on the dominant modes above the measured
   bar — this is the answer.
4. Everything else releases: recorded to the fiber with its reason (a
   typed release, never an erasure — "a declared absence is a NUL, not
   a gap").
5. The envelope ships the fold-out AND the fiber: charter, void,
   reading, `race.superseded`, anti-matter, releases. The answer is the
   point; the envelope is the fiber.

## 7. Past work, integrated (nothing discarded)

- **The 27-cell void** — stays the L0 scaffold; the pipeline's
  wide-generation is the filling of its cells beyond the demand.
- **The draws (Wolfe/Ranke/Murch/Cite)** — stay the L1/L2 enzymes; only
  their stops change (DMD) and their emission widens (cell sets).
- **The fact gate** — stays the L3 mechanical enzyme; its stigmergic
  route is the model for every enzyme's environment-read.
- **The mechanical race** — stays the any-level competitor; the loser's
  product is the fiber's oldest member.
- **The swarm + content-rules** — the L0 wide-generation and its
  standing-rule ledger; the elenchus bar is the DMD gate's ancestor.
- **The reading surface** — the provenance dimension; the fiber's spine.
- **The correction-rule ledger** (`native/organs/correction-rule.js` —
  as it exists: `falsifiableRule`, `authorCorrectionRule`,
  `falsifiesFormRule`; the concede path the inventory claimed
  (`concedeCorrectionRule`/`observeAndConcede`) is not in this tree and
  is itself a gap this pipeline's regulation section closes, under
  I-half-life).
- **The channel + admission** — the ATP layer; the commitment point.
- **DMD** — the gate, extended from reading to folding.

## 8. The code changes — phases with controls built to fail

**Phase A — the Ranke stop.** BUILT AND LIVE 2026-09-29.
`native/kernel/rewrite-gate.js` (`createRewriteGate`) wraps
`createStreamingDmd` with the decide law, wired into the grounding loop
(`proxy-runner.mjs`): the gate decides BETWEEN rounds over the rounds
completed — decay fires only when the material is still settling (last
two transitions non-increasing), oscillation fires with a measured period
(derived from the frequency, never the imaginary part alone — a period-2
cycle sits at λ = -1, im = 0 exactly), the per-section budget stays the
floor. Two findings the build's own falsification produced, both pinned
by test:

1. **The horizon, made live:** the gate needs pairs ≥ 2 (three pushed
   rounds; first possible fire at the top of round 3). The ROUND loop
   now runs to its own horizon — `RANKE_ROUND_HORIZON` (default
   `MAX_REWRITE_ROUNDS + 2` = 4, env `ER7_RANKE_ROUND_HORIZON`) — while
   the per-section budget stays 2. Rounds past the budget spend no draws
   (the gap path skips the model; a declared gap is declared once); they
   exist to give the trajectory the gate can read. The gate decides and
   discloses (`ranke_dmd_stop` with the measured magnitude/period); its
   draw savings are realized when the operator raises the per-section
   budget — which the gate makes safe to do, because churn is now caught
   by trajectory, not hoped away by a cap.
2. **The phase dimension:** a pure findings-alternation (second observable
   flat) is invisible to DMD — no scalar operator maps 3→1 and 1→3 — so
   the gate stays silent rather than misreporting a cycle as decay. The
   oscillation branch needs the second observable (non-moves) to actually
   vary. The gate never lies about a cycle it has no phase dimension for.

*Control: the 15 falsification tests in `native/tests/rewrite-gate.test.mjs`
— decay fires only on a settling trajectory with residual, a clean
convergence breaks on zero findings before the gate, flat/growing
trajectories never fire, oscillation fires with its period, the default
budget is byte-identical, and the false-decay windows ([3,1,3], pure
alternation) stay silent. Verified live after the wiring: the proxy boots
with the gate loaded, `ollama run` and the channel serve end-to-end.*

**Phase B — the Murch and code-validation stops.** BUILT 2026-09-29,
same wiring as Phase A. Murch (`proxy-runner.mjs`, `murchGate`,
`MURCH_ROUND_HORIZON` default `MAX_REWRITE_ROUNDS + 2`, env
`ER7_MURCH_ROUND_HORIZON`): the observables are [fixable findings,
edits landed]; rounds past the budget run the mechanical checks only
(no draws — the fix loop and the thinking line are budget-gated);
disclosure rides `murch_dmd_stop` with magnitude/period. The code loop
(`codeGate`, `CODE_VALIDATE_HORIZON`, env `ER7_CODE_VALIDATE_HORIZON`):
the observables are [validation findings, non-moving rewrites] — the
Ranke non-move cut applied to the whole file (a byte-identical rewrite
is counted, never landed twice, budget consumed); gap rounds re-run the
validator on the unchanged text so the trajectory is measured, never
assumed; disclosure rides `code_dmd_stop`. Budget stays the floor in
both; the Ranke truncated-round push is now guarded (a truncated round
is not a round — the comment finally tells the truth).
*Control (STILL TO RUN): the three loops, run on their own specimens,
must stop on decay eigenvalues, never on the cap — a loop that still
hits the cap is a mode that never decayed, and that is a finding about
the material, not a broken gate. The gate is unit-falsified; the wiring
awaits its live specimens.*

**Phase C — wide emission.** The draws emit cell sets; the fold holds
them; the envelope's fiber gains the release records. *Control: a fuzzed
task must produce a fiber whose every slot is recorded or explicitly
void (I-unitarity as a test, not a hope).*

**Phase D — the whole-grain gate.** The turn trajectory gates
generation (stop when the dominant mode decays) and the fold-out
(dominant modes ship; the rest release). *Control: the Kafka specimen's
measured periodicity (~12.4 sentences) must be recovered by the gate on
the same material — a gate that cannot see the periodicity the batch
DMD measured is a gate that read a different trajectory.*

## 9. Falsification appendix — the other agent's inventory, checked against the tree

The inventory that prompted this document was checked claim by claim:

| Claim | Verdict |
|---|---|
| `kernel/measured-loop.js` exists with "real streaming DMD, growth-eigenvalue stop" | **Falsified** — no such file in the workspace; the real modules are `native/kernel/dmd.js`, `native/kernel/dmd-stream.js`, `native/adapters/text/contextual-dmd.js` |
| `podcast.js` (built tonight) uses it | **Falsified** — `podcast-app/src/podcast.js` is a 105-byte stub (`episodes() → []`); it imports nothing |
| `concedeCorrectionRule`/`observeAndConcede` exist in `correction-rule.js` | **Falsified** — the exports are `falsifiableRule`, `readCorrectionRules`, `correctionApplies`, `naturalSizeRuleForTask`, `falsifiesFormRule`, `authorCorrectionRule`; the concede path does not exist in this tree |
| The fact gate "checks a task's own claim against ground BEFORE drafting — a gate, not a repair loop" | **Falsified** — it is post-process (`proxy-runner.mjs:8288`, "7.4" after postprocess "7"), strikes and replaces sentences mechanically; it is the L3 member of the draft→check→revise shape |
| `MAX_REWRITE_ROUNDS` at line 6055 | **Corrected** — it is a local const at `proxy-runner.mjs:6026` |
| Three divergent stopping mechanisms in Group A | **Holds** — the cap at 6026/7177/7345/8160 and the ratio at 300/7296 are separate implementations of one stop; the unification target is real, but the mechanism is `dmd-stream.js`, not a missing module |
| `void-loop.js` has zero production call sites; `void-brief.js` is live | **Unverified** — both live in `3.0/the-fold/` (a separate repo); the call-site grep over that tree did not complete in budget. Neither is referenced from `proxy-runner.mjs` or `proxy.mjs`, so the eoreader7 half of the claim holds |

The inventory's shape analysis survives; its citations do not. The
integration above cites only what exists.

---

*Standing: spec. The code wins disagreements; the controls win arguments
about the code; the fold keeps both.*