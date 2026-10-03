# The void/code loop — every function, and what is actually PROVEN

**Framing (the standing rule, 2026-10-03): we do not care whether the local
model or the mechanical system does the work.** What matters is the ARTIFACT:
does the code go green, at what cost (model draws), with what disclosed gaps.
A function "helps" only if a real test shows the whole artifact improves with it.

**The distinction this map enforces:**
- **PROVEN** = a committed test (scripted mouth, no model) or a recorded
  end-to-end run shows the claimed effect, AND a falsifying control exists.
- **PINNED** = a committed test exercises it, but no counterfactual (it is
  shown to *work as designed*, not to *beat the alternative*).
- **UNPROVEN** = declared, plausibly useful, no test isolates its benefit.

Sources: `native/the-fold/code-loop.js`, `hunt.js`, `arrow-gate.js`,
`forecast.js`, `void-loop.js`, and the suites `void-chase.test.mjs` (23 pass),
`void-loop.test.mjs` (50 pass), `code-loop.test.mjs` (1 pre-existing fail:
the `reason.mjs` reasoning gate, an env-path issue, not a loop defect).

---

## The loop (code-loop.js)

| function | what it does | mechanical / model | status |
|---|---|---|---|
| `runCodeLoop` (:1209) | entry: reads the workspace, decides the path. A stub-bearing code base → the void chase; else the FIND/ADD generic path. | mechanical routing | **PINNED** — `code-loop.test.mjs` (routing), `void-chase.test.mjs` "HOOK: runCodeLoop routes a stubbed located file to the void chase" |
| `detectVoidUnits` (:568) | finds stubs (`raise NotImplementedError` / `pass`) and their decl spans in a file. | mechanical | **PROVEN** — every void test depends on it; the detector is the entry to the whole chase |
| `runVoidLoop` (:709) | the DEF→EVA→REC chase across a WHOLE code base: locate the void, fill it, run the real test, advance file by file. | both (machine targets, mouth draws only residue) | **PROVEN** — `void-chase.test.mjs` "MULTI-FILE CHASE … green only when every file is filled" (real test decides) |
| `extractBody` (:615) | pulls one function body from a raw draw; subscripted/augmented assignments survive. | mechanical | **PROVEN** — `void-chase.test.mjs` "extractBody: subscripted and augmented assignments survive the prose cleaner" |
| `buildVoidPatch` (:680) | turns a body into a real find/add op against the stub. | mechanical | **PROVEN** (implied by every green chase) |
| `renderVoidNeighbourhood` (:229) | **the shadow/echo experiment (mine)**: kin declarations found by descriptor resonance, no regex. | mechanical | **FALSIFIED (HARMFUL)** — `falsify-context-fold.mjs`: bare 5/5 green, fold 0/5. Kept default-off. |
| `parseProposal`/`checkFenced`/`figureOpFor`/:427/359/382 | the FIND/ADD generic path: parse a proposal, refuse authored (fenced) bytes, derive the edit op mechanically. | mechanical | **PROVEN** — `code-loop.test.mjs` (generic-path cases), `gary-doors` conformance |
| `runTestCommand` (:496) | runs the caller's REAL test command; exit code decides. | mechanical | **PROVEN** — the ground truth of every chase |
| `precheckSyntax`/:529 `syntaxGateFor` (:514) | syntax-gate a patch before spending a test round. | mechanical | **PINNED** — `native/tests/py-engine.test.js` |

## The gates (arrow-gate.js) — the anti-loop machinery

| function | what it does | status |
|---|---|---|
| `bodyHashOf` (:41) | content-address a drawn body. | **PROVEN** — basis of the cycle gate |
| `arrowCycle` (:173) | names an exact body that already failed this session (the arrow running in place). | **PROVEN** — `void-chase.test.mjs` "ERROR CORRECTION … reverted … corrected body lands WITHIN THE SAME ROUND" |
| `consecutiveReverts` (:74) | counts consecutive real failures of a unit. | **PROVEN** — `void-chase.test.mjs` "HUNT-FIRST EXHAUSTED … becomes a TERMINAL wall" |
| `arrowGate` (:93) | chooses the next void: the unit the failure names, in field order. | **PINNED** — `arrow-gate.test.mjs` |
| `namedInTraceback`/`namedInOutput`/:35/28 | does the real failure name this unit? (targeting) | **PROVEN** — the multi-file chase + reopen depend on it |
| `inForceVerdicts` (:51) | which verdicts are still in force (the record, not a restart). | **PINNED** — `arrow-gate.test.mjs` |

## The hunt (hunt.js) + box — model-last

| function | what it does | status |
|---|---|---|
| `huntCandidates` (in code-loop import) | the void's implementation may exist in the FIELD — SNIP it instead of drawing. | **PROVEN** — `void-chase.test.mjs` "HUNT micro-loop … resolved by SNIP — the model NEVER draws" |
| `swarmProbe`/`reconcileParams`/`computeBody` | the box computes a mechanical shape (no model) or reconciles a hunted one. | **PROVEN** — `void-chase.test.mjs` "THE BOX: a mechanical shape is COMPUTED … no model" |
| `huntGround`/`huntLines`/`sourceAt` | ground-hunting helpers. | **PINNED** — `hunt-falsify.test.mjs` |

## The forecast (forecast.js) — the learning prior

| function | status |
|---|---|
| `forecast`/`observe`/`forecastError`/`emptyForecast`/`forecastKey` | **PINNED** — `forecast.test.mjs`; used live (every round records `forecast{p,trials,error}`), but no falsifier shows it improves rounds-to-green |

---

## What is PROVEN, in one sentence each

1. **The whole-code-base scan** (`detectVoidUnits` over every file) finds the
   void wherever it lives — multi-file chase goes green only when every stub is
   filled, judged by the real test. *(void-chase: MULTI-FILE CHASE)*
2. **The box/hunt answer before the mouth** — a void whose implementation exists
   in the field is SNIPPED; the model never draws. *(void-chase: HUNT micro-loop,
   THE BOX)*
3. **The real test is the only judge** — exit 0 or the change is reverted. Every
   green in every test is a real `python3 check.py`. *(all chase tests)*
4. **Error correction within a round** — a wrong body reverts, the arrow gate
   re-chases the same unit, the corrected body lands. *(void-chase: ERROR
   CORRECTION)*
5. **A non-productive mouth is a wall, not a budget burn** — a scripted mouth
   returning nothing writes zero bytes and is walled. *(void-chase: FALSIFY the
   old failure mode)*
6. **The append-only log** — every action lands on `LOG.jsonl`, model disclosed
   per line; the codebase is the fold of its own record. *(void-chase:
   APPEND-ONLY LOG)*

## What is NOT proven (the honest gaps)

- **No corpus measurement of the void loop.** The 594 recorded harness runs are
  the OLD generic path (`patch`/`read` only). The void loop's wins are pinned by
  tests (scripted mouths), not measured on real runs. **The next real step: run
  the void loop over the harness corpus and measure rounds-to-green vs the
  generic path.**
- **A real live run (2026-10-03, qwen2.5-coder:1.5b) was PARTIAL.** Two stubs
  (`add`, `reverse`), 6-round cap: `add` was filled correctly (`return a + b`),
  `reverse` was never filled (7 DEF rounds on it, then EVA), so the run did NOT
  go green — 153s, 9 rounds. The loop solved the easy unit and walled on the
  harder one within budget. This is the void loop working as designed (a wall is
  honest, not a budget burn) but NOT a clean end-to-end win on a live mouth.
- **The forecast prior** is recorded but never falsified for benefit.
- **`renderVoidNeighbourhood` (my shadow/echo work)** — FALSIFIED HARMFUL.
  Default-off. Do not enable for a small model.
- **The reasoning gate** (`reason.mjs`) has one failing test — a real,
  disclosed defect in the generic path, not the void loop.

## The through-line for the whole system

The loop's design is already "we don't care if the model or the machine does
it": the machine locates, hunts, computes, gates, and tests; the mouth draws
**only irreducible residue**, and its draw is trusted **only** after a real test.
Every proof above is a proof that a MECHANICAL act (scan, snip, revert, wall,
log) changed the artifact — not that the model was good. That is why the loop
survives a 1.5B mouth: the math carries it.
