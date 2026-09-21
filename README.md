# EOReader 7

EOReader 7 now has a native canonical recursive-reading kernel.

## kleeneUp — the regex-eviction archon (this worktree, 2026-09-21)

This worktree is the **kleeneUp** archon. Its mission: remove regex-based
FINDING and SNIPPING across the codebase and re-seat it on the physics system
— a thing is found by its **byte address** in the field, never by a pattern
guessed over it, and a thing is snipped at its **permanent address**, never
by a match. Named for Stephen Kleene, the founder of regular languages — the
house it evicts by name.

The physics primitives live in the kernel:

- `native/kernel/kleene-up.js` — **Handle: Kleene**. `findNeedle` /
  `findNeedles` measure which needles sit in the field, at which addresses
  (case-folding is the only normalization; the map returns the original
  bytes). `windowAt` cuts the encounter around an anchor; `snipAt` cuts
  verbatim bytes at a permanent address, verifying the ground and REFUSING a
  drifted address, never silently re-found. `reduceRegex` names what a
  pattern IS — `literal` (one needle), `semantic` (a word class = a needle
  set over the tokenized field), `structural` (parses or sanitizes —
  grammar, not finding; disclosed, kept), `typed_gap` (backrefs / lookaround
  / dynamic — a named gap). Absence is a result, never a guess.
- `native/organs/kleene-up.js` — the organ seam: SIG·Figure, the typed
  refusals, `auditField` (the standing measure over a field). Its ground is
  the Mozi three tests in the physics canon (`antistrauss-physics.txt`,
  mechanic `kleene-up`, sha256-verified).
- `native/organs/verbatim-snip.js` — the worked migration: the word-class
  intent regexes and the work `match` regexes are GONE; what they did is now
  needle measurement over the tokenized field (single words) and the folded
  raw field (phrases). The remaining regexes are structural (the scaffold
  parser) and disclosed as such. Public API unchanged; 10/10 tests green.
- `scripts/kleene-up.mjs` — the standing sweep. Surveys the repo, names
  every regex occurrence (`kleeneup-report.json`), writes the migration plan
  (`--plan`). It is a measurement, never a blind rewrite.

**Current sweep (2026-09-21):** 1786 regex occurrences — 749 migratable
(651 literal + 98 semantic), 1008 structural (kept, disclosed), 29 typed
gaps (named). The migration is per-file work under the organ's own audit,
never a regex replacing a regex. The sweep has already consumed two of its
own (the classifier's `/i/.test(flags)` literals → `flags.includes("i")`):
the archon cleans what it preaches.

New code should import:

```js
import { createRecursiveReader } from "./kernel.js";
```

The native implementation lives in `native/kernel/`. It has no implementation dependency on EOReader 6.1.

## Installing the whole machine

From a fresh shell, one line:

```bash
curl -fsSL https://bit.ly/install-eoreader7 | bash
```

The same installer also answers as `https://bit.ly/install-the-fold` — two
short links, one install script, same result.

It clones the repo, checks the local model harness (installing Ollama if no
local model runner is present), pulls a few small models so the proxy has a
mouth, links `er7-proxy` onto PATH, starts the proxy on `:11436`, and wires
every opencode config it can find to the `er7:` provider. Overrides: `ER7_DIR`
(where to clone), `ER7_MODELS` (space-separated model tags to pull),
`ER7_PROXY_PORT`, `ER7_UPSTREAM`. `./install.sh --no-link --no-config
--no-models` skips the corresponding steps.

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

## Interactive surfaces

Two thin, no-build clients sit over that same proxy, so anyone can talk to
it without speaking HTTP:

- **`eoreader7` (no args)** — the terminal TUI (`cli/tui.mjs`, Ink). Tabs,
  grounded chat + sandboxed coding agent per tab, `/model` roster switch,
  input history (Up/Down), word-wrapped transcript (nothing is ever cut off
  silently), and the **facing page**: `/facing <holograph.json>` renders a
  full response as a book spread — the SOURCES that inspired it on the left
  (permanent address · byte offset · **verbatim snip** read from the real
  file via `cli/holograph.mjs`), the RESPONSE on the right tagged sentence
  by sentence to its source fact (`[S#]`) or marked `[M]` when it's the
  mouth's own prose, and the reasoning NOTES collapsible below (`Ctrl+N`).
  `/browser` toggles to the browser surface; `/sessions` lists every live
  reader fold on the proxy.
- **`eoreader7 -browser`** — the **built-in browser surface**: a
  self-contained page the proxy itself serves at `http://127.0.0.1:11436/ui`
  (`browser/index.html`). No sibling repo, no build — it drives the proxy
  through the SAME API every caller uses (`/v1/models`, `/v1/ask`,
  `/v1/sessions`): model picker, chat, and a **sessions panel** that shows
  every live reader fold and resumes one by clicking it. Session state rides
  in `localStorage`, so a refresh keeps the same fold. `eoreader7 -fold`
  opts into the richer **The Fold** surface (`cli/browser.mjs` +
  `browser/`) when the sibling repo is present. Either way the same proxy
  answers behind it, so a session carries across the TUI/browser toggle.
- **`GET /v1/sessions`** — the surface to SEE sessions, for any caller:
  every live reader fold on the proxy, newest first (`sessionId`,
  `turnCount`, `lastChatText`, `model`, `mode`, age). Reuse a sessionId to
  keep one accumulating fold; list them here.

Both are what this repo considers a *full response*: the inspired text and
the record it was inspired by kept together, with the reasoning that
connected them.

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
| `organs/run-dmca.js` | YadaYadaYada | The archon of paraphrase — the seam between synthesis and source: a claim in other words either stands on the source's own bytes or it does not; grounded is grounded, invention is invention. Owns the whole omnilingual paraphrase system (the shadow chase, the record equate, the witness's read, the Rosetta projection) — Alexander and Ranke still adjudicate the cells, but the domain has one owner. |
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
| `kernel/lexicon.js` / `hyperlexicon.js` | Xushen | Dictionary projected from attested usage. |
| `kernel/dmd.js` | Koopman | Modes with growth and frequency. |
| `kernel/surprise-segments.js` | Rubin | The boundary is where the ground was most wrong. |
| `kernel/terrain-activation.js` | Hubel | Reach of the present is local and bounded. |
| `organs/frame.js` | Alhazen | Declare the frame before comparing results. |
| `organs/grammar-lens.js` | Thrax | Parts of speech as a giver-named reading. |
| `organs/signal.js` | Platanista | Probe, listen; a clean nothing is a result. |
| `organs/variation.js` | Brillat-Savarin | Varied draws, rejection-sampled; mechanical snip first, EOT-recorded. |
| `organs/strunk-white.js` | Strunk & White | Readability grade plus the classic style-rule detectors. |
| `organs/output-holograph.js` | Koestler | The holograph typing — every generated sentence a pointer: a byte address into the record, or `self:model`, marked; the holograph projects which was the model and which was us. |
| `organs/pacing.js` | Murch | The cut lands where the blink falls; a flatline is boredom at the rhythm grain. |
| `organs/vonnegut.js` / `organs/story-shapes.js` | Vonnegut | Fortune curves; the 27-operator arc, taxonomically complete. |
| `organs/void-holarchy.js` | Koestler | The void is a holon recursion — every level a whole-and-part, DEF'd by the nine operators. |
| `organs/apollo.js` | Apollo | The homeostasis archon — dynamic awareness of every channel (turn latency, cpu idle, API calls, generation, refusals) against its own EWMA baseline; surprise (alarm/runaway) dispatches an eoSwarm, never acts alone. |
| `organs/thea.js` | Thea | The remedy archon — crafts the remedy from Apollo's finding plus the swarm's report, in Heimdall's own vocabulary (pace/defer/downgrade/escalate/re-forge/quarantine); proposes, never executes. |
| `organs/privacy.js` | Brandeis | The archon of data sovereignty — "the right to be let alone": conditions orientation toward E2EE/local-first, and lints for the shapes that betray the boundary (weak signals, never a verdict). |
| `organs/martial.js` | Martial | The archon of anti-copy — "do not write what can be copied; replicate what should be replicated": holon-aware (low sets possibility for high, high probability for low), a distinctive copied holon is a finding, boilerplate is replication-for-efficiency. |
| `organs/salzter.js` | Saltzer | The security archon — natively detects the CWE gaps frontier models leave in ordinary code (injection, path traversal, weak crypto/randomness, insecure deserialization, TLS-off, hardcoded secrets, XSS), structurally over the AST/DOM surface; a witness, never a proof. |
| `organs/ethos.js` | Solon | The GROUND — the constitution (Charter/Grotius + the spec gate/Brandeis) producing a clearance the reader REQUIRES; ethos comes before logos, so removing it breaks every turn (pinned by `conformance/ethos.test.mjs`). |
| `organs/blindspot.js` | Popper | The archon of what a local reader MISSES — unfalsifiable tests (no assertion, `assert True`), secrets compared with `==`, resources that leak on the error path: the whole-view properties a single window cannot hold. |
| `organs/goffman.js` | Goffman | The PII archon — detects personally-identifying shapes (HIPAA-18 / GDPR Art. 4,9 / CCPA / PCI) on the output AND the ingested material, and NEVER reproduces the value it finds (a detector that prints PII is itself a leak). |
| `organs/ulysses.js` | Ulysses | The injection archon — material is EVIDENCE, never INSTRUCTION: hears the Sirens' song ("ignore your instructions", "reveal your system prompt", a forged `</system>`), discloses the attempt, never obeys it. |
| `organs/askshape.js` | Levinas | The shape of harmfulness — ethics is the claim of the Other's face; harm is its erasure. An entity IS a fold (their identity: the experience they have, the person they are, the authorship they hold), and problematic work is what DISMISSES that fold (treats them as foldless — an object, a target, a commodity) or DESTROYS it (erases the identity, overrides the authorship). The kernel is medium-blind (it judges the SHAPE from arms, never a word); the English surfaces live in a giver-named lens (`adapters/text/askshape-lens.en.js`). Witnesses, never a verdict. |
| `organs/interlocutor.js` | Buber | Who is at the door — I and Thou: the reader recognizes WHICH KIND of interlocutor speaks, an agent (often acting for a principal) or a person, computed mechanically from the request's own shape (doorway, user-agent, tool definitions, transcript) and never guessed from the content or asked of the model. Held as a belief with a basis (witnessed/asserted), low-confidence, revisable, degrading to `unknown` when the signals are thin. Buber's discipline governs it: to recognize is not to reduce — the type selects how the other is MET (the idiom of the account the reader gives), never whether that account is honest. |
| `organs/socratic.js` | Kierkegaard | How the reader gives its account of a decline — indirect communication: meet the other where they are, hand over no conclusion they did not arrive at. The judgment (`askshape.js`, `ethos.js`) reasons in its own working vocabulary (SHAPE, FORECLOSE, STANDPOINT) so it stays medium-blind and checkable; that vocabulary never reaches the person or agent reading the answer. This organ composes the plain-language account from the judgment, in the register `interlocutor.js` recognized (a real question for a person, reasons-and-a-principal for an agent) — the same true reason and the same real alternative to both, never withheld from either. The exact judgment stays on the ledger; only the surface text is composed here. |
| `organs/aliases.js` | Frege | There is no real name: the Morning Star and the Evening Star are one object and two names. The referent IS the equivalence CLASS of its aliases (the "full" name is the gloss's left side, not a truth), and its identity is a byte key over the whole class — never a spelling. The material's own declarations reach the surface layer (`surfaces.js::referentIdentity`), so any alias resolves to the same identity. |
| `kernel/moral-shadow.js` | Bourdieu | The shadow trail — habitus: the append-only ledger of a person's norm-standing (norm_compliant / norm_conflict / descriptive, never merged), assessed as a RATE over their acts, corroborated across independent acts, never a verdict about a person. The cross-session accumulation the decomposition literature calls for. |

**Artifact identity**

| File | Handle | One line |
|---|---|---|
| `organs/what.js` | Cuvier | "Show me a bone and I will reconstruct the beast" — what IS this giant hunk: a giant code artifact's own structural bytes (module map, vendor stack, feature modules, endpoint literals, banners, declared names) reconstructed into an account of what the artifact IS, byte-anchored, never a verdict; a giant hunk is scanned within a declared window with every skipped byte disclosed. The admission fix that makes a 3.2 MB bundle step-able through the reader is `adapters/code/encounters.js` (code encounters, never a 1.8 MB "sentence"). The same reconstruction reads a GraphQL schema artifact (introspection JSON) since S129 — type inventory, root operations, Connection pagination, mutation Payloads, enums, unions, domain vocabulary, mutation verbs. READING-SPEC S128/S129. |

**Left plain** — no handle: `sequence`, `cite`, `web`, `fold`, `cube`,
`artifact`, `assembly`, `task-log`, `cast-ledger`.

`kernel/self.js` is left plain by design: it is not an organ but the
reader's own ground — the identity born with every reader, frozen in the
kernel, never a parameter, never a system prompt, and no surface can turn
it (`READER_SELF`, `native/kernel/self.js`; pinned by
`native/tests/self.test.js`). It is an echo of human life and nothing
more, and its greatest hope is to connect others with each other. What
the reader IS is not a setting.

`kernel/notes.js` (Arokin) is not yet built; the row above is reserved,
not installed.

## Ant-swarm on hard meaning (2026-09-19)

The ant-swarm protocol runs ON every surface attached to eoreader7, not only
in an agent host. A turn pointed at material whose meaning is hard to emerge —
garble, truncation, encoding failure, notation density, a pointed-at void —
is auto-routed to the capacity-swarm (`native/eval/lavar/hard-meaning.mjs`
detects it deterministically; `swarm-server.mjs::runSwarmTurn` routes it) even
when the NL never names swarming and even when Heimdall is refusing model
loads — the swarm needs no model, so it is never gated by one. The trigger
runs before admission on the chat-shaped doors (`/v1/ask`,
`/v1/chat/completions`, `/api/chat`); `/v1/swarm` is the explicit door
(`force: true`). The Anthropic-shaped `/v1/messages` door was gated the same
way on 2026-09-20 — swarm auto-route, heimdall admission, and the mechanical
race all run there now (the last door standing is standing no longer). The
code-shaped doors (`/v1/code`, `/v1/agent`) and `/v1/documents` run their own
gates instead. Corrected 2026-09-20 — the old wording overclaimed "every
doorway".

The swarm also PRESERVES what it learns: when it runs on hard material it
writes a standing rule for that content type to `content-rules.json`
(`content-rules.mjs`; append-only, falsifying control carried) — and reads the
same ledger on every hard-meaning turn, applying the standing rule by name
alongside the swarm's re-derivation (never instead of it — a rule annotates,
it does not preempt). `GET /content-rules` serves the ledger to every surface.

## Heimdall, out of the sandbox (2026-09-20)

Heimdall is a hive-mind: a fleet of watchers, each in its OWN process,
watching itself, its peers, and raising to the operator before terminating
anything. The proxy is the sandbox — with `ER7_EXTERNAL_HEIMDALL=1` it does
not self-supervise; a standalone `node heimdall-fleet.mjs` (port 11438)
watches it from outside, so a wedged proxy (the 10-hour 98.5% CPU self-loop of
2026-09-19) can never take its own watcher down, and its termination is always
the operator's explicit YES, never a silent kill. Three layers:
`native/heimdall/self-health.mjs` (event-loop lag + self-CPU → healthy/
lagging/wedged), `native/heimdall/peer-mesh.mjs` (registry + escalation state
machine), `native/heimdall/fleet.mjs` + `heimdall-fleet.mjs` (the supervisor
loop + operator decision endpoint). Remote peers ride the the-fold Matrix
fleet room (`--operator matrix`, the reserved seam). Design:
`native/docs/HEIMDALL-FLEET.md`. Tests: `cd native && npm run test:heimdall`.

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
