# Penelope — the generation pipeline lives there now

`../penelope/` (sibling repo, private, no public remote) is where app
generation happens: the weaving/unweaving pipeline (build by day from
library spec + traced fields, unweave by night what does not verify).

## What moved (2026-10-01)

- Resident copies: the arrangement engine + code/prose adapters
  (from `ai-code-harness`, commit 229b686), plus four newborn organs:
  consensus-gate (DMD-bounded comp consensus, no fixed N), detail-fetch
  (two-hop fan-out, per-item gaps), behavior-check (dead controls fail),
  freshness (stale/expired semantics). All pure, self-tested
  (`npm test` in penelope, 18/18).
- Referenced, not copied: `native/organs/code-build.js`,
  `talk-build.js` + kin, `adapters/build/*`, `native/organs/look.js`
  (see penelope `organs/GENERATION-INVENTORY.md` for commits + couplings).
- Layout library seed:
  `live_priors/derived-priors/layout-priors/` (LayoutPrior@1).

## What this repo still owns

The voyage, not the loom — and the bridge, not the mouth (2026-10-01):
doors, admission at the doorway, the witness grammar, the ground, and the
BRIDGE (Heimdall's channel + the upstream lanes) that executes every draw.
The MOUTH is Penelope's: her admission and routing decide every model call;
she directs the bridge to draw, and nothing draws past her. Penelope calls
eoreader7 doors; nothing in `native/` imports penelope as a library — the
engine talks to the mouth at its address (`native/kernel/mouth.js`), the
same way it talks to any server, and the bridge machinery is never forked.

## Done since (2026-10-01)

- **The mouth is Penelope's (2026-10-01).** `../penelope/organs/mouth.mjs`
  + `../penelope/mouth/server.mjs` (Mouth@1, on `PENELOPE_MOUTH_PORT`
  11439) now decide every model call: her admission (the ration per
  identity, typed 429/503 + Retry-After), her kind→wire routing, her
  priority. The bridge (Heimdall's channel 11434, the AntiStrauss gate,
  the host picker, the upstream lanes) executes; it is never forked.
  Rerouted onto the mouth: penelope's own gym draws, the generation door
  (`runDrawDoor`), and eoreader7's native draws that used to call ollama
  or the daemon directly — `code-build.js`, `look.js` (vision),
  `corpus-resonance.js` + `prior-query.js` (embeddings), now all entering
  at `native/kernel/mouth.js`. The proxy's in-process draws consult her
  verdict (`streamOllamaChat` → `POST /v1/mouth/admit`, hop-marked) before
  the bridge draws.
- Mouth consolidation, with one honest split (measured 2026-10-01):
  chat draws route through the mouth (shared mouth `gemma2:2b`, identity
  `penelope-gym`; 429/503 honored with bounded backoff). **Code draws stay
  on the generate wire** — the chat doors' hard-meaning auto-route swallows
  code prompts whole and answers with a swarm verdict, not a draw (logged).
  Same precedent as code-build.js; disclosed in penelope `gym/server.mjs`,
  not hidden.
- E2E (2026-10-01): mouth selftests 14/14, organs 18/18 selftest modules,
  facing/fold/chat/fish2 pages 200, USGS + LL2 feeds live, notebook 4/4,
  rung loop draws→probes→scores.

## Outstanding (not yet done)

- **Eval-harness migration:** `native/eval/*`, `build-battery`, and
  `connector-witness.test.mjs` address the channel (11434) directly as BATCH
  tools. They are not served draws, so they are outside GL-RR-04's control,
  but the boundary should reach them eventually — a named, separate migration
  (point their draw URL at the mouth; the wire routes are drop-in).
- A create-capable build door: `/v1/code` is patch-only and cannot birth
  files (measured 2026-10-01: two prompts, `done:false`, right bytes
  under the wrong path). Single-prompt app-birth needs skeleton-first
  or `/v1/build`/`/v1/agent` routing. **Partial advance (2026-10-01):**
  the loop now derives the slot-level operator from the declaration diff
  (`figureOpFor` in `native/the-fold/code-loop.js`) in the bare-metal
  fold's own semantics — a born declaration is **INS** (instantiate a
  new entity), a slot redefinition is **DEF**, a removal **SEG**, a
  recomposition **SYN**. The record admits at INS; the act is disclosed
  at the Figure grain. Birth (INS) is now *recognized*, mechanically,
  which is the predicate for a birth-capable door: skeleton-first should
  route the born file's INS + the slot DEFs through the same loop.

## Surfaces

- **TUI** (`cli/`): surfaces Penelope output through the same proxy
  doors; build requests route per above, never pasted as turns.
- **the fold** (the holodeck repo, renamed — the reading/research surface):
  generation routes through Penelope's doors.
- The former `the-fold` repo (being absorbed): generation policy pointer
  still in its GENERATION-POLICIES.md until the absorption lands.
