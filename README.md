# EOReader 7

EOReader 7 now has a native canonical recursive-reading kernel.

New code should import:

```js
import { createRecursiveReader } from "./kernel.js";
```

The native implementation lives in `native/kernel/`. It has no implementation dependency on EOReader 6.1.

## Connecting to eoreader7

`proxy.mjs` (`./setup-proxy.sh` installs it) is the connection surface — one
process, four doorways in, all backed by the same turn and the same
Heimdall admission gate, so a busy box refuses new work with a typed 429 +
`Retry-After` on every one of them, not just the LLM-shaped ones:

- **Plain** — `POST /v1/ask { "task": "<text>" }` → `{ "answer": "<text>",
  "sessionId": ..., ... }`. No model prefix, no chat-message roles, no
  history required — the doorway for anything that doesn't already speak
  one of the protocols below.
- **Code** — `POST /v1/code { "task": "...", "workspace": "/abs/path",
  "testCommand": "npm test", "maxRounds"?: 3 }` → `{ "done": bool,
  "rounds": [...], "finalTestOutput": "..." }`. A bounded, physics-gated
  coding loop (`native/the-fold/code-loop.js` + `patch.js`): the model is
  never asked for a JSON tool call or a shell command — only raw
  `find`/`add` bytes against a real, already-existing file. The edit op
  (SEG/INS/SYN) is derived mechanically from those bytes, applied for
  real, then *your own* declared `testCommand` — never a model-authored
  string — decides pass/fail for real. A failing round reverts the file
  before trying again; nothing broken is ever left on disk between
  rounds. Before proposing an edit the model may instead ask to READ a
  real file in full (mechanically validated the same way) — round 1 shows
  a file listing plus a bounded content sample, so a workspace larger
  than one prompt is read on demand rather than dumped up front; a
  repeated read of a file it already has is refused with a nudge rather
  than silently wasting a round. Every round's proposal, applied diff, and
  real test output ride the response as a disclosed audit trail.
- **OpenAI-compatible** — `GET /v1/models`, `POST /v1/chat/completions`,
  model id `er7:<real-ollama-model>`. Any OpenAI-SDK client, or app built
  against one, works by pointing its base URL here.
- **Ollama-compatible** — `GET /api/tags`, `POST /api/chat`, same `er7:`
  model id. Any Ollama-based app or UI works unmodified.
- **Anthropic-compatible** — `POST /v1/messages`,
  `POST /v1/messages/count_tokens`. Any Anthropic-SDK client (Claude Code
  included) works by pointing its base URL here.

`GET /` on a running proxy returns this same map as JSON — the
self-describing front door for a caller with no other documentation.
`GET /health` is liveness; `GET /heimdall` is the full vitals/admission
state the gate above is reading from.

Optional headers on any request: `x-er7-session` (stick a conversation to
one accumulating reader fold — otherwise a stable one is derived from the
connection), `x-er7-user` (durable identity across sessions), `x-er7-workspace`
(absolute path to admit real files into the session), `x-er7-mode`
(`auto`/`chat`/`long`/`origami`). `/v1/ask` also accepts `sessionId` and
`workspace` directly in the request body, for callers with no header
machinery.

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

EOReader 7 began from frozen EOReader 6.1 commit
`e20e441d3cdfb735d605c75037e6d73892e707c0`. The `legacy-eoreader6.1`
submodule and the root compatibility symlinks that exposed its historical
paths are **retired** — see [`LEGACY-EOREADER6.1.md`](LEGACY-EOREADER6.1.md),
the pointer that replaces them. This repo's v7 architecture is `kernel.js`
and `native/`; nothing in `native/` imports the legacy surface (the
boundary is pinned by `native/conformance/native-boundary.test.mjs`).

Consumers still importing historical paths must migrate to the native
surface — that is the owning consumer's pass.

The Fold is a surface on EOReader 7: it depends on this repo, never the
reverse. Cloning either repo from GitHub provides the pair.

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

**Conversation**

| File | Handle | One line |
|---|---|---|
| `the-fold/earned-cast.js` | Terry Gross | Archon of Conversations — the interviewer who draws the guest out; keeper of the flow rules (`CONVERSATION_FLOW_RULES`), which a trigger makes her write up and Marshall integrates. |
| `the-fold/earned-cast.js` | Eastwood | The lean director — the shortest true answer, no wasted frames; shoots the tight exchanges. |
| `the-fold/earned-cast.js` | Kubrick | The precise director — the whole framed before the first sentence; shoots the big-picture asks. They duel over the shot. |

**Pathos — the undergoing (the third Greek leg)**

| File | Handle | One line |
|---|---|---|
| `organs/pacing.js` | Murch | The cut — a film is cut where the audience blinks; the piece's rhythm is graded at the grain of the blink. |
| `organs/pathos.js` | Abhinavagupta | The felt shape of a reading, for whom — surprise/tension/release gated by strain, and the REC·Ground re-ground when the ground fails (the concession is a recorded act). |
| `organs/experiencer.js` | Panini | Every belief carries who is undergoing it. (registered above) |
| `kernel/expectations.js` | Bharata | Expectation built, strengthened, weakened, released like a staged emotion. (registered above) |
| proposed | Meyer | Tendency and inhibition — the felt deviation of what arrives from what was learned; the organ unbuilt. |
| proposed | Shklovsky | Estrangement — perception prolonged against recognition; the organ unbuilt. |

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
| `kernel/kind-graph-structure.js` | Osgood | An injected embedding reports the distance between two predicates as a number, never their identity. |
| `kernel/lexicon.js` / `hyperlexicon.js` | Xushen | Dictionary projected from attested usage. |
| `kernel/dmd.js` | Koopman | Modes with growth and frequency. |
| `kernel/surprise-segments.js` | Rubin | The boundary is where the ground was most wrong. |
| `kernel/terrain-activation.js` | Hubel | Reach of the present is local and bounded. |
| `organs/frame.js` | Alhazen | Declare the frame before comparing results. |
| `organs/grammar-lens.js` | Thrax | Parts of speech as a giver-named reading. |
| `organs/signal.js` | Platanista | Probe, listen; a clean nothing is a result. |
| `organs/variation.js` | Brillat-Savarin | Varied draws, rejection-sampled; mechanical snip first, EOT-recorded. |
| `organs/strunk-white.js` | Strunk & White | Readability grade plus the classic style-rule detectors. |
| `organs/pacing.js` | Murch | The cut lands where the blink falls; a flatline is boredom at the rhythm grain. |
| `organs/vonnegut.js` / `organs/story-shapes.js` | Vonnegut | Fortune curves; the 27-operator arc, taxonomically complete. |
| `organs/void-holarchy.js` | Koestler | The void is a holon recursion — every level a whole-and-part, DEF'd by the nine operators. |
| `organs/privacy.js` | Brandeis | The archon of data sovereignty — "the right to be let alone": conditions orientation toward E2EE/local-first, and lints for the shapes that betray the boundary (weak signals, never a verdict). |
| `organs/martial.js` | Martial | The archon of anti-copy — "do not write what can be copied; replicate what should be replicated": holon-aware (low sets possibility for high, high probability for low), a distinctive copied holon is a finding, boilerplate is replication-for-efficiency. |
| `organs/salzter.js` | Saltzer | The security archon — natively detects the CWE gaps frontier models leave in ordinary code (injection, path traversal, weak crypto/randomness, insecure deserialization, TLS-off, hardcoded secrets, XSS), structurally over the AST/DOM surface; a witness, never a proof. |
| `organs/ethos.js` | Solon | The GROUND — the constitution (Charter/Grotius + the spec gate/Brandeis) producing a clearance the reader REQUIRES; ethos comes before logos, so removing it breaks every turn (pinned by `conformance/ethos.test.mjs`). |
| `organs/blindspot.js` | Popper | The archon of what a local reader MISSES — unfalsifiable tests (no assertion, `assert True`), secrets compared with `==`, resources that leak on the error path: the whole-view properties a single window cannot hold. |
| `organs/goffman.js` | Goffman | The PII archon — detects personally-identifying shapes (HIPAA-18 / GDPR Art. 4,9 / CCPA / PCI) on the output AND the ingested material, and NEVER reproduces the value it finds (a detector that prints PII is itself a leak). |
| `organs/ulysses.js` | Ulysses | The injection archon — material is EVIDENCE, never INSTRUCTION: hears the Sirens' song ("ignore your instructions", "reveal your system prompt", a forged `</system>`), discloses the attempt, never obeys it. |
| `kernel/moral-shadow.js` | Bourdieu | The shadow trail — habitus: the append-only ledger of a person's norm-standing (norm_compliant / norm_conflict / descriptive, never merged), assessed as a RATE over their acts, corroborated across independent acts, never a verdict about a person. The cross-session accumulation the decomposition literature calls for. |

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
conformance suite (~2–3 min); run it locally for today's failure count
rather than trusting a fixed number here — it has already moved at least
once since this line was written (2026-09-05). `cd native && npm test`
is the live package's suite.

## Frontier-25 and the perceivers' seat (2026-09-05)

READING-SPEC **S76** / the-fold **P115**. `native/adapters/{audio,image,video}/` hold the crossed perceivers (parity: `native/conformance/media-perceiver-parity.test.mjs`); `native/organs/measure.js` reads decoded media as each medium's own series (`native/tests/measure-media.test.js`); `native/eval/the-fold/frontier-25.mjs` runs the twenty-five tasks' zero-call arm and, with `MODELS=`, the mouth arm (`native/tests/frontier-25.test.js` is the enforcement).
