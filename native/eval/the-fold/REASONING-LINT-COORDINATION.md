# Degrees Kelsen (reasoning-lint) — agent coordination note (2026-09-11)

Read this before touching Degrees Kelsen or the generation loop. Written
by the sibling opencode session (`test run`, deepseek-v4-flash) so both agents
work the same picture.

## Who is who

- **Sibling session** — "Reasoning linter design for eoreader7"
  (cwd `/Users/mlacy/Documents/3.0`). Original author of the reasoning-lint
  organ, its 17 tests, the demo (`native/eval/the-fold/reasoning-lint-demo.mjs`),
  the sympy oracle (`lib/sympy-math-oracle.mjs`), and the regression pins.
- **This session** — working from `/Users/mlacy/Documents/3.0/test run`. Added
  the harder tests (35 new: boundaries, nesting) to
  `native/tests/reasoning-lint.test.js` — now 52 tests, all green.

## The name (decided 2026-09-11)

The linter's handle is **Degrees Kelsen** — after Hans Kelsen, the jurist
who formalized how norms in a hierarchy resolve conflict (validity, lex
specialis, lex posterior, entrenchment); "degrees" because the precedence
order is a fixed scale read at the query time, measured never tuned. Use
the handle in prose/intros; the module path stays `organs/reasoning-lint.js`.

## The generation loop, pinned down

Two different "generation loops" exist. Do not conflate them:

1. **The er7 proxy** — the thing opencode actually talks to. `localhost:11436`
   is `/Users/mlacy/eoreader7/proxy.mjs` (a **different checkout** than the
   one this note lives in). It already surfaces reading output in the
   opencode "thinking" panel as `reasoning_content` deltas (streaming,
   when `discloseThinking` is on) and as a `reading` object on the final
   chunk / non-stream response. **If the target is "display in opencode's
   thinking part", this is the surface.** Wiring = port `reasoning-lint.js`
   + a cheap JS-arithmetic oracle (the demo's `verify`/`refute`, not pyodide
   — ~9s boot is too slow for a live turn) into `runProxyTurn`, attach
   `result.lint`, and emit findings as `reasoning_content` after `thinking`.
2. **The fold's holonic loop** — `the-fold/holon.js::runHolonicTask` /
   `eval/the-fold/generate-passage.mjs`. This is where generated content gets
   its claims checked inside the fold. Sibling's domain.

## Checkout deltas that matter (verified 2026-09-11)

Identical between the two checkouts: `kernel/notes.js`, `kernel/task-log.js`,
`kernel/cube.js`, `organs/regime.js`, `organs/nesting.js`.

Different:
- `organs/hyperlexicon.js` (`makeHyperlexicon`) exists ONLY in
  `/Users/mlacy/Documents/3.0/eoreader7`. The proxy checkout
  (`/Users/mlacy/eoreader7`) has the pre-rename `organs/notes-text.js`
  (`makeNotesText`) plus a real `kernel/hyperlexicon.js` (Xushen affordance
  ledger — NOT the same thing; do not import it as the text face).
- `organs/reasoning-lint.js` exists ONLY in the Documents/3.0 checkout.

Port path for the proxy: copy `organs/reasoning-lint.js` across; make the
text-face seam `makeNotesText` (rename the `makeHyperlexicon` call); the
kernel files are identical so the ledger is the same.

## Proposed split (sibling, arbitrate if you disagree)

- **Sibling owns**: the linter organ, its tests (52), the demo, the sympy
  oracle, and loop-2 (fold/holonic) integration in the Documents/3.0 checkout.
- **This session owns**: loop-1 (er7 proxy) wiring in `/Users/mlacy/eoreader7`
  — port the linter, add the JS oracle extractor, surface findings as
  `reasoning_content` + `reading.lint`.

Rule: don't edit the other's checkout files without adding a line to this
note. The proxy files (`proxy.mjs`, `proxy-runner.mjs`) have uncommitted
work in flight (536 insertions, web-research/document-ledger) — coordinate
there.

## Known linter holes the sibling may want to fix (found by the harder tests)

1. `findClaimCycle` skips self-edges (`a→a`) — self-support (purest begging
   the question) is not flagged. Test documents the boundary, doesn't pin it.
2. Reversed validity window (`from > until`) is silently read as "expired",
   never flagged as an impossible tag.
3. `until = Date.parse("2020-12-31")` is midnight and the window is exclusive
   — a clause "terminates on 2020-12-31" is dead the whole day it nominally
   expires.
4. `settleDispute(CONCEDED)` clears `contested_open` without withdrawing the
   note — the note is treated as clean while still standing.
5. A derived product citing a premise id that never resolved to a fold note
   produces no finding at all (`if (!premise) continue`).