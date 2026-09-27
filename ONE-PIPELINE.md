# One pipeline — any content, full provenance for each element

**The vision, in the user's words (2026-09-27):** "A pipeline, with minor
differences for code vs prose vs anything else (should work for music) that
can generate any arbitrary content with full provenance for each element."

It is VISION.md's "generate by rendering the fold" made concrete. The model
is the mouth: it only talks, a small question at a time, and never writes
markup, types an operator or holds the big picture. The engine does the rest:
it reads the talk into the notes ledger, reasons over the ledger with no
model, and assembles the artifact from parts it can account for, snipped from
licensed sources it found on the fly, reasoned from a source, or said by the
mouth and marked as such.

This file is the working state. A scheduled resume (and any later session)
starts here: read "Open, in order", take the top item, build it with its
falsifying control, record the result in the ledger below, commit, push.

## The skeleton (every medium runs these; a medium is an adapter)

| # | stage | what it does | where it lives today |
|---|---|---|---|
| 1 | read the request | the request and the person's answers become a spec: counted parts per parent, details, named parts, topic | `native/organs/talk-build.js` `specOf` |
| 2 | source each part | for each part, in order of trust: **snip** it from a licensed source found on the fly, **reason** it from a source, or **ask** the mouth one small question | snip: `organs/part-source.js` (stylesheets only); reason: `organs/kind-read.js` (details only); ask: `talk-build.js` `nextGap` |
| 3 | hear | every claim goes into the notes ledger, typed by the ledger (INS/SYN), with its witness: `request`, `talk:n`, `source:<term>`, `derived:<rule>` | `kernel/notes.js` via `talk-build.js` |
| 4 | reason | derive, correct, retract, drop — over the fold, no model; a retraction reopens a gap (recursion) | `organs/talk-reason.js` |
| 5 | assemble | a medium adapter draws the artifact from the fold, with each element's provenance | pages: `adapters/build/belief-page.js`; code, prose, music: not yet on this path |
| 6 | verify | the medium's validator, plus the provenance check | pages: `inspect.mjs` + checker; provenance check: not yet |

## Where each element's provenance stands (pages, today)

| element | provenance |
|---|---|
| a part named in the request | ledger, witness `request` |
| a part or value the mouth said | ledger, witness `talk:n`, the prompt and reply in the log |
| a detail reasoned from a source | ledger, witness `source:<term>`, the sentence it rests on |
| a derived value (total, top, corrected count) | ledger, witness `derived:<rule>`, its premises; marked on the page |
| the stylesheet | snipped: package@version/path, URL, license, sha256, byte ranges, license notice |
| the page's markup (tags, layout) | **hand-written in the renderer — not yet sourced** |
| the sort button's behaviour | **none — drawn, does nothing** |
| vocabulary sets (platform nouns, UNMARKED, CONTROL_KINDS, …) | **hand-set, each says so** |

## The doors today (door map, 2026-09-27, verified at file:line by a read-only panel)

| door | what it runs |
|---|---|
| `/v1/ask`, `/v1/chat/completions`, `/api/chat`, `/v1/messages` | `runProxyTurn` — the full pipeline |
| `/v1/documents` | `runProxyTurn` in projection mode |
| `/v1/code` | `runCodeLoop` (the-fold/code-loop.js), which calls `runProxyTurn` in **chat mode every round**: Wikipedia enrichment every round, holograph typing on the patch text, an undisclosed substitute mouth, PII/archon results dropped |
| `/v1/agent` | `runOpenCodingLoop`, same pattern as `/v1/code` |
| `/v1/build` (and a `/v1/ask` shortcut) | `buildCodeTask` (organs/code-build.js): **calls the model directly**, past the pipeline, admission and the shared mouth |
| `/v1/swarm`, hooks, `/v1/reason` | no generation |

**Chat → code: there is no path today.** The only edge runs the other way
(code-loop imports `runProxyTurn`). Duplicated jobs: validators (three for
Python, three for JavaScript, two for TypeScript), repair loops (whole-file
redraw, patch rounds, agent turns), model-call paths (the shared mouth vs
code-build's own), build detection (two), provenance (three mechanisms),
file resolution (two).

## The layering this is heading to

- **One core** — every door enters it: clear → intake → ask-back → ground →
  source each part (snip / reason / ask) → hear → reason → assemble → verify
  (+ repair) → type and archons → seal and ledger. One mouth
  (`streamOllamaChat` with its turn scope always set), one witness grammar,
  one license table.
- **Medium adapters** (the minor differences): page, prose, code artifact,
  music — each is its vocabulary (the whole's noun, engine words, control
  kinds), its renderer returning `{ artifact, map }`, its validator (one
  registry), its source registries (npm for page parts, a score archive for
  music, licensed code for code).
- **Specialist APIs** — only what is truly specific: `/v1/code` keeps the
  patch physics, the test command, the forecast, the sandbox and the draw
  monitor. It takes the core's clear, intake and archons once per loop, and
  a draw-only mouth per round (no enrichment, no holograph on patches, the
  substitute disclosed).
- **Edges** — a chat turn with a workspace and an edit to make calls the
  code API (the test command asked back through the existing
  build-clarify), and its result comes back through the same answer and
  ledger; `/v1/build` and `/v1/agent` become callers of the code API or are
  retired into it.

## Open, in order

(Revised after each archon checkpoint. Each item names its falsifying control.)

1. **Done 2026-09-27** (2ba5ecd, 55deb8d): byte-exact snips, quoted braces,
   SPDX licenses, notice-or-refuse; one source per model; heard "shows";
   corrections as conclusions with premises; negation; near-duplicates.
   **Still open from that batch:** Wikipedia provenance at runtime — URL,
   revision and CC BY-SA carried on each `source:` witness.
2. **Done 2026-09-27 (be71015)** — the element map, the uncovered check
   (organs/provenance-cover.js, Ostrom), verify and seal: all five ladder
   rungs fully accounted for (23–795 elements) and sealed on a scripted
   mouth; leaked text, smuggled engine words and withdrawn notes caught.
   Still open here: the proxy returning the notes and the map to the caller
   (today it reports the seal and the counts); CSS elements are covered by
   the snip's own byte check, not by this map. Was:
   **The element map, the uncovered check, verify and seal.** The renderer
   returns `{ artifact, map }`: every leaf maps to a note id in the fold or
   an `engine:<catalog-key>`; `uncovered(artifact, map, fold) = []`; a real
   `verify` (so a failure can demote a route); `sealArtifact` as the last
   stage; the proxy returns the notes. Control: a mutated renderer emitting
   "Send" with no key fails; a silent mouth leaves zero `talk:` witnesses on
   the page; `ER7_TALK_PARTS=0` is never reported as sourced.
3. **Done 2026-09-27 (47c9ce8)** — the page out of the core: the build
   takes a medium (adapters/build/page-medium.js); a scanner over every
   string literal in the core finds no page word. Was:
   **Pull the page out of the core.** `makeBuild({ medium })`; the page's
   words (site, reddit, karma, form, "What is … called?", `verify("page")`)
   move to `adapters/build/page-medium.js`. Control: the core file contains
   none of them, and the ladder still scores what it scored.
4. **Done 2026-09-27 (e59d558)** — music as the second medium: the commit
   touches no core file (3 files: the adapter, its test, the README row).
   To be exact about what that proves: two medium-general core changes came
   first — the hooks (ee351ed: source a part before asking, a medium's own
   leaves, the one license table) and part order (c13e653: the fold sorts by
   id, so bars and posts came back out of order — a latent page bug the
   second medium exposed). The lullaby is the Prelude's bars 1–8 exactly;
   every note accounted for; the CC BY-SA Aria refused. Next for music: the
   reasoner (kernel/continuation.js) deriving new bars from the snipped ones,
   witness derived:continuation with seed-note premises, and the
   shuffled-prior control. Was:
   **Music as the second medium, with no core edits.** Spec ("a lullaby in
   two phrases of four bars each"), parts (phrases, bars), snip bars by tick
   range from licensed MIDI (each fixture's own license checked),
   `continuation.js` as the reasoner, `writeMidi` + a note-to-note sidecar
   as the renderer, `parseMidi` read-back as the validator. Control: the
   core diff is empty; the real prior beats the shuffled prior; a copyleft
   fixture is refused; a note missing from the sidecar fails.
5. **One mouth.** The code loop's per-round turn becomes a draw-only mouth;
   `/v1/build` moves onto the shared mouth and admission. Control: a
   substitute mouth is always disclosed; no enrichment call per round.
6. **Chat → code.** A chat turn with a workspace and an edit to make calls
   `runCodeLoop`; the answer and ledger carry its result. Control: the same
   edit asked through `/v1/code` and through chat produces the same patch
   and test verdict.
7. **One validator registry**, `validate(medium, text)`. Control: every
   existing validator test passes through it.
8. **The part-finder on the environment (Wilson)** — see checkpoint.
9. Record the falsification runs now in flight, whatever they say.

## Falsification ledger

| date | claim | control | result |
|---|---|---|---|
| 2026-09-27 | talk path holds as the ladder grows (1.5b) | bare model, same checker, rungs 1–5 | talk 37/37; bare 22/37 (1.5b), 30/37 (3b); posts shown at rung 5: talk 38, bare 4 / 3 |
| 2026-09-27 | task-only asks beat whole-picture asks | same ladder, 1.5b | first run (without the topic sentence): rung 5 160/213 vs 207/213 — **task-only lost**; topic fix added; same-code rerun queued |
| 2026-09-27 | correction (Ostrom): "15 of 17 elements" in commit 0f1290a is wrong — the renderer emits 19; new.css reaches 15/19 (misses main, span, i, label) | recount against RENDERED_ELEMENTS | 15/19 |
| 2026-09-27 | one pipeline: music runs through the same core as pages | the music commit touches no core file; its output is the source's own bars; a refused license leaves nothing; a note added around the map is caught | held (after two medium-general core changes, recorded) |
| 2026-09-27 | the talk page beats the old path through the product (runProxyTurn), 1.5b, 21-request battery | same code, ER7_TALK_PAGE=0 vs 1; bare model | wired 4/21, 54/110 checks; old (same code) running; bare 1.5b earlier today 4/21, 63/104 — **wired below bare on checks so far**; gate misses (bike-forum, route-12) hit every arm |
| 2026-09-27 | every element on a page is accounted for | the artifact read in its own terms against the map; a leaky renderer, a smuggled engine word, a note not on the record | 5/5 rungs covered and sealed (scripted mouth); all three controls caught; an always-ok checker fails the tests |
| 2026-09-27 | the stylesheet is snipped, not written | every CSS byte after the provenance comment equals the source's bytes at its ranges; a copyleft candidate that reaches more is refused | tests pass; license gate off fails the test |

## Archon checkpoints

Before a change of direction, poll read-only panels, with Ostrom (claim
scope; credit and license obligation carried to the element — provenance is
a commons) and Wilson (the environment as medium: trails from what worked
reorder what is tried next; scouts; alarm trails; mutation tests) always on
the panel. Record each checkpoint's findings here, with what was acted on.

### 2026-09-27 — Ostrom, Wilson (read-only panels)

- **Ostrom:** over-claims found and verified — "15 of 17" (it is 15/19);
  "byte ranges" are string indices; "a conclusion is withdrawn when its
  premises change" does not hold for corrections; model-supplied "shows"
  details bypass the ledger; `talk:n` witnesses make one model's repeats
  look corroborated; engine words ("Untitled site", "Send", "Tools") carry
  no mark; Wikipedia text (CC BY-SA) keeps no URL, revision or license at
  runtime. The rule to declare once: renderer -> `{ artifact, map }`, every
  leaf to a note, one witness grammar, one license table; a medium differs
  only in its address type and its catalog of engine words.
- **Wilson:** the source path is an archive, not an environment — the
  search is cached forever, the style memoised per process, a miss stored
  as null forever; nothing scouts; nothing can raise an alarm because
  `verify` defaults to ok. Probes found: a quoted "}" breaks the CSS
  parser; negation is not read; near-duplicates survive; license strings
  and a missing LICENSE are untested. Order: verify + provenance first
  (the alarm needs a signal), then the stigmergic part-finder, then
  per-model anchor trails and a mutation battery.
- **Acted on:** the open list above (items 1–3).
