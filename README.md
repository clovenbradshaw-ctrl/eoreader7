# EOReader 7

EOReader 7 now has a native canonical recursive-reading kernel.

New code should import:

```js
import { createRecursiveReader } from "./kernel.js";
```

The native implementation lives in `native/kernel/`. It has no implementation dependency on EOReader 6.1.

## Canonical cycle

```text
Fold
  -> Orientation
  -> Encounter
  -> Perception
  -> Challenge
  -> Witness
  -> Interrogation
  -> DeltaFold
  -> revised Fold
```

`Challenge` is constitutive but non-evidentiary: candidate interpretations are always challengeable before witness. Without a challenger the stage is identity-preserving.

Derived only after transformation:

- surprise = consequential revision in `DeltaFold`, not observation novelty
- tension = persistent consequential unresolved structure in the revised Fold
- release = witnessed transformation that closes or reframes that structure

The EO cube is the complete 27-address question surface. The current operator set is exactly:

`NUL SIG INS / SEG CON SYN / DEF EVA REC`

`ALT` and `SUP` are not canonical operators. `NUL` records no transformation. `Void` is an Existence terrain and is not synonymous with NUL.

## Priors and witness

Priors may condition orientation, nominate perceptions, and focus interrogation. They cannot become witness merely by being prior. Modality adapters determine how structural possibilities manifest in an encounter; they do not replace the EO ontology.

## Compatibility

EOReader 7 began from frozen EOReader 6.1 commit `e20e441d3cdfb735d605c75037e6d73892e707c0`. That exact source remains pinned as the `legacy-eoreader6.1` submodule solely for:

1. compatibility with applications that still import historical `packages/engine` / `packages/host` paths;
2. parity tests while those consumers migrate.

Root compatibility symlinks still expose those historical paths. They are not the v7 architecture.

Clone compatibility surfaces with:

```sh
git clone --recurse-submodules https://github.com/clovenbradshaw-ctrl/eoreader7.git
```

The Fold is the reference compatibility application: it currently consumes EOReader 7 through the frozen legacy path contract while new v7 work targets `kernel.js`.

## Ratchet

A compatibility subsystem may be retired only when its native replacement passes behavioral/conformance tests. `native/conformance/native-boundary.test.mjs` additionally forbids the native kernel from importing legacy implementation paths, and locks the current nine-operator semantics.

## The boundary with the-fold (2026-09-02)

eoreader7 owns kernel, adapters, organs, and evals; the-fold owns the
surface. `native/organs/index.js` is the one seam the-fold imports through
(explicit names, `REFUSALS` aliased per organ); `native/organs/` holds the
organs with their the-fold history (git filter-repo); `native/eval/the-fold/`
the drivers, fixtures and results; `native/docs/` the theory. The reading
closure that had been deferred — `hypergraph.js` with cast, grounding, cite,
source, asserted, web, measure, testimony, primary, capacity-runner,
experiencer, quotes — crossed on 2026-09-02 (S42), moved together so no
organ imports the surface; the-fold keeps one-line shims at the old paths.
The assertion ledger is `native/kernel/notes.js`, medium-blind and born with
its frame; `native/organs/hyperlexicon.js` is its text face. This repo's `CLAUDE.md` is a symlink
into the frozen 6.1 submodule and is not where this repo's own rules go —
this file is.

## Handles (Amendment XVII)

One handle per organ or kernel module — the best-fitting historical or
biological namesake, regardless of tradition. The ancestor is disclosed in
a `// Handle: …` line at the top of the file itself; this table is the
canonical index. Physical location follows the boundary above: an entry
below not resolvable under `native/organs/` or `native/kernel/` lives in
the-fold's flat top level under the same basename.

**Evidentiary walk**

| File | Handle | One line |
|---|---|---|
| `organs/primary.js` | Sima | Walk past the received account to the archive. |
| `organs/corroboration.js` | Bukhari | Stands only on independent chains; shared chain = one witness. |
| `organs/testimony.js` | Wigmore | Ask the witness twice, swapped twin, verdict from the pair. |
| `organs/witness-sentences.js` | Khaldun | Check the report against the nature of things before admitting it. |
| `organs/grounding.js` | Mozi | It is in the bytes the eyes and ears can witness, or it isn't. |
| `organs/quotes.js` | Dai | A quotation is verified to its source or not printed as one. |
| `organs/source.js` | Nadim | Addressed catalogue; retrieval by where it sits, never by judgment. |
| `organs/asserted.js` | Dignaga | A word designates by exclusion; a verb is a hypothesis with counted support. |
| `organs/derivation.js` | Liu Hui | Rests on established premises or doesn't count. |
| `kernel/refutation.js` | Nagarjuna | Refutes by consequence, asserts nothing. |
| `kernel/contest.js` | Tungara | Competitors in the frame raise the margin required. |
| `kernel/witness.js` | Thymus | Nomination is not admission. |
| `organs/measure.js` | Fisher | A figure is a placement against a permutation null, or refused. |

**Belief, obligation, perspective**

| File | Handle | One line |
|---|---|---|
| `organs/experiencer.js` | Panini | Every belief carries who is undergoing it. |
| `kernel/perspective.js` | Mahavira | True from a standpoint; standpoints kept apart. |
| `kernel/obligations.js` | Jaimini | An injunction persists until discharged. |
| `kernel/expectations.js` | Bharata | Expectation built, strengthened, weakened, released. |
| `kernel/orientation.js` | Meerkat | A watch that conditions attention and is not evidence. |
| `kernel/notes.js` | Arokin | Append-only record of what was said. |

**Reference and scope**

| File | Handle | One line |
|---|---|---|
| `kernel/affordance-reference.js` | Clark | Bridging: "the engine" licensed by the car. |
| `kernel/holder-scope.js` | Roberts | Resolves inside the hypothesis that introduced it. |
| `kernel/scoped-kind.js` | Frege | Bound within its quantifier's scope. |
| `organs/cast.js` | Zhengming | A name answers to its referent, not its string. |
| `organs/speaker.js` | Scheherazade | Nested tellers, each "I" bound to its declared frame. |
| `kernel/temporal-reference.js` | Partee | Tense is anaphora. |
| `kernel/pending-sig.js` | Synapse | Docks, waits bounded, fires on match or clears. |

**Memory, time, identity**

| File | Handle | One line |
|---|---|---|
| `kernel/activation.js` | Atta | Trails evaporate unless reinforced. |
| `kernel/identity.js` | Ise | Same shrine through total rebuilding. |
| `kernel/return-curve.js` | Sockeye | How an identity comes home, as a curve. |
| `kernel/rhythm-priors.js` | Tala | The WHEN, held independent of content. |
| `kernel/experience-priors.js` | Vasana | Residual impressions that condition later perception. |
| `kernel/completion.js` | Brahmagupta | A declared absence is a value, not a gap. |

**Structure, kind, dynamics**

| File | Handle | One line |
|---|---|---|
| `kernel/hypergraph.js` | Berge | He coined it. |
| `kernel/relation-composition.js` | Tarski | Calculus of relations. |
| `kernel/kind-induction.js` | Kanada | A kind induced from what instances share. |
| `organs/kind-standing.js` | Shizhen | One individual placed into a ranked kind. |
| `kernel/kind-graph-structure.js` | Xunzi | Names graded by resemblance — a graph, not a tree. |
| `kernel/lexicon.js` / `hyperlexicon.js` | Xushen | Dictionary projected from attested usage. |
| `kernel/dmd.js` | Koopman | Modes with growth and frequency. |
| `kernel/surprise-segments.js` | Rubin | The boundary is where the ground was most wrong. |
| `kernel/terrain-activation.js` | Hubel | Reach of the present is local and bounded. |
| `organs/frame.js` | Alhazen | Declare the frame before comparing results. |
| `organs/grammar-lens.js` | Thrax | Parts of speech as a giver-named reading. |
| `organs/signal.js` | Platanista | Probe, listen; a clean nothing is a result. |

**Left plain** — no handle: `sequence`, `cite`, `web`, `fold`, `cube`,
`artifact`, `assembly`, `task-log`, `cast-ledger`.

`kernel/notes.js` (Arokin) is not yet built; the row above is reserved,
not installed.

## Before committing: the two-tier chorus (2026-09-05)

Run `~/.claude/skills/chorus-lint/chorus-fast.sh` from the repo root. In
seconds it checks the law files (duplicate S/P headers, citations that
resolve, Generality on new P entries), runs only the `native/` and
`conformance/` tests that import a changed file, and names which persona
lenses the diff touches with a `file:line` pointer each. Read only those
lenses, against the context file it writes (cited entries only). The
eleven-persona form is `chorus full`, for audits and PR reviews, not per
commit. The skill's `SKILL.md` carries the lens questions and the log
format; the-fold's POLICIES.md P35 is the authority that a chorus is a
label, not eleven agent calls. The root `npm test` is the legacy 6.1
conformance suite (2.6 min, nine pre-existing failures as of this date);
`cd native && npm test` is the live package's suite.
