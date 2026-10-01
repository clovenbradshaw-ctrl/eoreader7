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

The voyage, not the loom: doors, admission, the shared mouth, the
witness grammar, the ground. Penelope calls eoreader7 doors; nothing in
`native/` imports penelope (boundary stands).

## Done since (2026-10-01)

- Mouth consolidation, with one honest split (measured 2026-10-01):
  chat draws route through Heimdall admission (shared mouth
  `er7:gemma2:2b`, `x-er7-session: penelope-gym`, `x-er7-priority:
  batch`; 429/503 honored with bounded backoff) — first admitted draw
  verified live. **Code draws stay DIRECT to ollama**: the chat doors'
  hard-meaning auto-route swallows code prompts whole and answers with a
  swarm verdict, not a draw (logged). Same precedent as code-build.js;
  disclosed in penelope `gym/server.mjs`, not hidden.
- E2E (2026-10-01): 18/18 organ selftests, facing/fold/chat/fish2 pages
  200, USGS + LL2 feeds live, notebook 4/4, rung loop draws→probes→scores.

## Outstanding (not yet done)

- Mouth consolidation (ONE-PIPELINE item 5): penelope's gym still draws
  on ollama direct; route it through the shared mouth.
- A create-capable build door: `/v1/code` is patch-only and cannot birth
  files (measured 2026-10-01: two prompts, `done:false`, right bytes
  under the wrong path). Single-prompt app-birth needs skeleton-first
  or `/v1/build`/`/v1/agent` routing.

## Surfaces

- **TUI** (`cli/`): surfaces Penelope output through the same proxy
  doors; build requests route per above, never pasted as turns.
- **The Fold**: generation policy pointer in its GENERATION-POLICIES.md.
- **Holodeck**: README pointer; ingest unaffected.
