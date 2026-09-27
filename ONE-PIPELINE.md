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

## Open, in order

(Revised after each archon checkpoint. Each item names its falsifying control.)

1. **Correctness batch (Ostrom + Wilson findings, verified).** Each fix with
   a control that fails without it:
   - part-source: offsets and sha256 over the raw fetched BYTES (new.css has
     a multi-byte "→"; string indices drift after it); a quoted "}" inside a
     rule must not end the block; the notice in `/*!`; refuse a snip whose
     license asks for its notice when no license text is found; license
     strings normalised ("MIT OR Apache-2.0", `{type}`, case).
   - witnesses: `talk:<model>#ask<n>` so one model repeating itself is ONE
     source (today each ask reads as its own source — false corroboration).
   - the mouth's answer to "what does each part show" heard into the ledger.
   - derived `because` carries premise note ids; a correction is withdrawn
     when its premises change (today `derived:correct` is exempt).
   - kind-read: negation ("never voted on") derives nothing.
   - talk-reason: near-duplicates ("Orca Watch." / "orca  watch") retract.
2. **The element map and the uncovered check (Ostrom's rule, Wilson's
   alarm signal).** The renderer returns `{ artifact, map }`: every leaf
   (text node, attribute value, CSS rule; for other media a token, a note
   event) maps to a note id in the fold or an `engine:<catalog-key>` entry;
   `uncovered(artifact, map, fold) = []`. Wire a real `verify` so a failure
   can demote a route. Control: a mutated renderer that emits "Send" with no
   key must fail the check; a silent mouth leaves zero `talk:` witnesses.
3. **One "find a part" layer on the environment (Wilson).** Queries,
   sources and packages become routes on `kernel/stigmergy.js`
   `routeOrderFor`: deposits on verified use, evaporating caches (a miss
   re-probed after the half-life), scouts off the critical path, a license
   veto that never decays. Control: seeded trails where the default query
   is worse — the learned order must reach the same coverage with fewer
   fetches; explore 0 never scouts.
4. **The doors (pending the door map):** one pipeline behind every door;
   code-specific capability (auto-fill, repair against a validator) behind
   the code API; a chat turn able to call it.
5. Record the falsification runs now in flight (wired vs old vs bare on the
   27 unseen requests; the same-code framing A/B) — whatever they say.

## Falsification ledger

| date | claim | control | result |
|---|---|---|---|
| 2026-09-27 | talk path holds as the ladder grows (1.5b) | bare model, same checker, rungs 1–5 | talk 37/37; bare 22/37 (1.5b), 30/37 (3b); posts shown at rung 5: talk 38, bare 4 / 3 |
| 2026-09-27 | task-only asks beat whole-picture asks | same ladder, 1.5b | first run (without the topic sentence): rung 5 160/213 vs 207/213 — **task-only lost**; topic fix added; same-code rerun queued |
| 2026-09-27 | correction (Ostrom): "15 of 17 elements" in commit 0f1290a is wrong — the renderer emits 19; new.css reaches 15/19 (misses main, span, i, label) | recount against RENDERED_ELEMENTS | 15/19 |
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
