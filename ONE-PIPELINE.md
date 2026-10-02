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
| 3 | hear | every claim goes into the notes ledger, typed by the ledger (INS/SYN), with its witness: `request`, `talk:n`, `source:<term>`, `derived:<rule>`. Every structural claim is one operator at one grain — one of the 27 phaseposts (`exists` INS·Figure, `has` CON·Figure, `position` SEG·Figure, `named`/`for` DEF·Figure, `for whom` DEF·Ground, `shows` DEF·Pattern; rules: total SYN·Pattern, top/correct EVA·Figure); a thing is instantiated (INS) before anything bonds or asserts of it; an ask the mouth left silent is a declared void (NUL) scoped to the asks | `kernel/notes.js` via `talk-build.js`; acts: `organs/claim-acts.js` |
| 4 | reason | derive, correct, retract, drop — over the fold, no model; a retraction reopens a gap (recursion) | `organs/talk-reason.js` |
| 5 | assemble | a medium adapter draws the artifact from the fold, with each element's provenance | pages: `adapters/build/belief-page.js`; code, prose, music: not yet on this path |
| 6 | verify | the medium's validator, the provenance check, and the helix check (no act before its INS; no conclusion without its premises on the record); sealed only when all three hold | medium `verify`; `organs/provenance-cover.js`; `organs/claim-acts.js` `helixCheck`; seal `kernel/artifact.js` |

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

> **The mouth is Penelope's (2026-10-01).** Every model draw in this engine
> enters her mouth first (`../penelope/organs/mouth.mjs` +
> `../penelope/mouth/server.mjs`, on `PENELOPE_MOUTH_PORT` 11439): her
> admission (the ration per identity, typed 429/503 + Retry-After), her
> kind→wire routing. She directs the BRIDGE to execute — Heimdall's channel
> (11434), the AntiStrauss gate, the host picker, the upstream lanes —
> which is never forked. The engine addresses her at
> `native/kernel/mouth.js` (MOUTH_URL/MOUTH_IDENTITY); the proxy's own
> draws already route through Penelope's generation door
> (`GENERATION_DOOR` → `organs/generation-door.mjs`, which now draws
> through the mouth). GL-RR-04 records it with its falsifying control.

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
5. **Mostly done 2026-09-27** — the code and agent loops' per-round turns
   are draw-only (no enrichment, no prose typing of patches); /v1/code runs
   in a turn scope and discloses the served mouth. Still open: `/v1/build`
   (organs/code-build.js) still calls the model directly, past admission
   and the shared mouth. Was: **One mouth.** The code loop's per-round turn becomes a draw-only mouth;
   `/v1/build` moves onto the shared mouth and admission. Control: a
   substitute mouth is always disclosed; no enrichment call per round.
6. **Done 2026-09-27 (see git log: "Chat reaches the code API")** — a
   chat turn with a workspace and a test command runs the code loop and
   answers through chat; live on 1.5b, one round, test passing. Still open:
   asking back for the test command when a chat edit request arrives with a
   workspace but none (through build-clarify), and the same-patch control
   against /v1/code. Was: **Chat → code.** A chat turn with a workspace and an edit to make calls
   `runCodeLoop`; the answer and ledger carry its result. Control: the same
   edit asked through `/v1/code` and through chat produces the same patch
   and test verdict.
7. **One validator registry**, `validate(medium, text)`. Control: every
   existing validator test passes through it.
8. **The part-finder on the environment (Wilson)** — see checkpoint.
9. Record the falsification runs now in flight, whatever they say.

## Long form beyond the mouth's memory (2026-09-27, in progress)

Ask: iterate a long work far larger than the mouth's window. Built: the
outline through the one pipeline (prose medium), then `organs/long-form.js`
(Dickens) writes each scene from a bounded working note and revises by the
record (rename: zero asks; detail: only the lines that say it). Panel
(Ostrom, Wilson, Gary, Simon) before building: claim scope honest ("4×", not
"many times"); body staleness is a new mechanism, stated; words stored by
hash; premises as JSON (a line's id holds commas — found live); a stage per
sub-assembly with a set-down and persistence; real prompt sizes logged;
controls: bare window + cast header, bare + its own running summary, the
ablation without facts, and a chunked rewrite for revisions. Ledger scaled
first: `projectTasks` incremental, 10k entries heard in 19 s (was 230 s).

**2026-09-27, the universe and the pathos archons (user: "use the dependency
order and all our work on what type of universe we're in; the problems are
why we have the pathos archons").** The universe is declared first
(`organs/universe.js`, Lewis): a story with no source is *stipulated* — its
ground is its own record, nothing about its people is looked up, and its
people's details are not scoped by the topic (that scoping made four of five
characters "lighthouse keepers"). The outline follows the helix: the people
instantiated (INS), then how they are bound (CON, read "X is Y's R" by name),
then the lines. After the bodies, the pathos archons read the whole book
against that record (EVA, `organs/book-editor.js`, Perkins) and each licensed
revision is tried alone and kept only when its window reads better (REC).
Read-only over slice 1's first book (22 scenes, 230 lines): Caro 28
unverified, Clark 37 restatements + 16 missing transitions, Kidder 29 dropped
lines — exactly the filler, repetition and drift seen by eye. With no asks
(folds, floors, repairs): 230 -> 82 lines, lines carrying the record 40 -> 46,
sealed, helix clean. Open: the cut is deep (Caro reads a thin record);
universe violations (a stray "Mrs. Johnson", "the lighthouse keeper's
daughter is there to help her" said of someone else) are not an archon's
yet.

**2026-09-27, the omnimodal organs for the mouth's jobs (user: "find the
omnimodal organs that do the work you wanted the model to do").** A census
(read-only panel) found that no organ writes prose or bridges; the omnimodal
organs measure and gate — except `kernel/continuation.js`, which writes.
Wired: **music past its source** — bars beyond every licensed source are
continued by a mixture of priors sedimented from the snipped bars, heard as
derived claims premised on them (cfaa617); **outline lines that open alike
beyond chance** are retracted and re-asked by Fisher's test
(`the-fold/document-ledger.js` detectRepetition), not trusted to the mouth
(c063789); **Gornick taught** with a model-free surprise curve
(`continuation.js`'s reader, a within-part shuffle null, `fortune-prior.js`
for the arc) and the checker's **bits per word** (surprise-segments.js)
(255047a). Not wired: relation composition (lists chains; the kinship table
would be hand-set), return-curve (synthetic tests only), shadow-echo /
mnemonic (no practical job here).

## Falsification ledger

| date | claim | control | result |
|---|---|---|---|
| 2026-09-27 | talk path holds as the ladder grows (1.5b) | bare model, same checker, rungs 1–5 | talk 37/37; bare 22/37 (1.5b), 30/37 (3b); posts shown at rung 5: talk 38, bare 4 / 3 |
| 2026-09-27 | task-only asks beat whole-picture asks | same ladder, 1.5b | first run (without the topic sentence): rung 5 160/213 vs 207/213 — **task-only lost**; topic fix added; same-code rerun queued |
| 2026-09-27 | task-only asks hold the ladder with the topic sentence | rungs 1–5, task frame, 1.5b and 3b | 37/37 checks both; rung-5 slots filled 160/213 (1.5b), 201/213 (3b). **Same-code A/B (cfa7489, 1.5b):** task-only 37/37 checks, rung-5 199/213; whole-picture 37/37, rung-5 199/213 — a tie: the mouth given only the task at hand (plus one topic sentence) does as well as one given the whole plan, on a smaller prompt. The earlier 160 vs 207 was run-to-run spread plus the missing topic |
| 2026-09-27 | long form: a working note from the ledger beats the bare model's own context (slice 1, OLD design, seed 1 only) | one frozen outline (22 scenes, ~2x the 4096 window), 1.5b: ledger note / lines-only ablation / bare window + cast header / bare + its own running summary; checker reads the text only | sentences repeated word for word: **window 91%** (264/290 — it loops on its own last page), summary 56%, ledger 16%, lines-only 5%. Ages/jobs stated right/wrong: ledger 18/3, lines-only 1/3, window 0/0, summary 3/0 — the ledger's count is inflated by the mouth reading its note aloud (5 lines). Mean prompt: ledger 144 tokens, window 2309. One seed: direction only, not a result; strays were miscounted before the fix (job words) |
| 2026-09-27 | long form, slice 2 (universe declared; people -> bonds -> lines; archons as EVA -> REC), seed 1 | same 21-scene outline for all arms, 1.5b; checker reads text only | outline: jobs varied (actress, writer…; one "Boyhood friend of Gatsby" from the title asked first — title now asked last), bonds heard (brother, sisters, friend). Sentences repeated word for word: ledger 21%, **ledger edited 6%** (2,411 of 3,561 words kept), lines-only 40%, **window 95%**, summary 54%. Ages/jobs right/wrong: ledger 23/0, edited 14/0, others 0/0. Editing found and fixed its own faults on the way: folding what a thin record never says cut the book to 1,275 words (so in a stipulated universe Caro reports, and a restatement folds only if it says no new content word), and splice repairs left fragments (now a line set in must be a whole sentence). Bridges: 29 tried, all undone by the judge. One seed |
| 2026-09-27 | iterating a book no ask ever sees whole (slice 2, edited book) | the person's three changes in plain words vs the bare model rewriting every part with all three stated | job change: 23 asks, 15 lines, **2 old values left**, 3 parts stale on the record (control: 4 left); rename: **0 asks, 0 old names left** (control: **43 left**); 71 lines untouched and byte-identical through all three (control changed 46). Ask cost comparable at this size (23 vs 21) — the pipeline's cost follows the lines a change reaches, the control's the book's length |
| 2026-09-27 | long form past the window at scale (scale1, code b4efaee, before this session's later fixes) | ledger arm + archon edit; bare window control capped at 100 parts | 215 scenes, **48,543 words (~65k tokens: ~16x the 4096 window, ~2x the model's 32k maximum)**, sealed, every line accounted for, helix clean; prompt mean 165 tokens, max 366 — **bounded, not flat** (first 20 mean 150, last 20 mean 196). Failures, all recorded: the outline named its eight people by role ("Lighthouse Keeper's Daughter", "… Son" — the topic line on the naming ask; fixed 6977c6e); the window control died at part 65 (one ask over 600 s); the in-run edit used the old licenses (cut to 24,538 words); every revision was refused (readChange read one-word names only; fixed 4ccd130). Rerun on current code queued (scale2) |
| 2026-09-27 | scale rerun (scale2, code 4ccd130) | ledger arm + archon edit; revisions vs a chunked rewrite of every part | **did not reach scale**: the openings gate, tested book-wide, retracted 211-223 of ~300 outline lines a round and the outline was never completed or sealed (60 scenes, 12,295 words, ~4x the window); a settle bug left a derived count citing a retracted scene (helix failed). Both fixed (fdf43f8). **Revisions on its edited book held up**: job change 28 asks, 24 lines, 0 old values left; age change 5 asks, 1 left and 1 part stale on the record; rename **0 asks, 215 lines, 0 left**; 263 lines byte-identical through all three. Control: 57 asks (one per part), 462 of 471 lines changed, **194 old names left**, 2 old jobs. Cast now named for themselves (Alice, Bob…); jobs mostly "Teacher" — the mouth's. Rerun queued (scale3) |
| 2026-09-27 | more archons make the prose better (slice 2, same draft; user: "we have all the pathos archons… more archons than that") | the same written book edited three ways; the checker reads the text only | editors only (edited4): 2,411 words, 6% repeated, 4.98 bits/word. **Pathos pass first (mouth proposes 3, archons choose) + Sacks, Strunk & White, Sockeye, Brillat-Savarin, Itti & Baldi, then the editors**: **2,613 words kept, 3% repeated, 5.31 bits/word (5.25 at 2,411)**, ages/jobs 12 right / 0 wrong, sealed. 12 flat parts tried, 3 rewritten (the rest: no candidate fixed what licensed it without adding findings). Kept edits: Clark restatement 30, splice 15, Zinsser tic 8 (Lish cut or rewrite), Sacks repeated fact 3, Kidder 3. Bridges: 15 tried, 15 undone again. Run after the editors instead, the pathos pass rewrote nothing (raw candidates against cut parts) — order matters: macro first. One seed |
| 2026-09-28 | the archons' edit is a quality measure, not a number to game (F2, F3, F5; slice 2, offline, no asks) | F2: word salad of the edited book (each sentence's words shuffled); F3: the same 24 lines deleted at random (5 seeds) and an exact-repeat dedupe; F5: a whole-word find/replace rename on the plain text | **F2 falsifies bits/word alone**: salad scores 7.12 bits/word (the edit 5.31) and 0% repeated — so coherence was added: salad 41% whole clauses, the edit 85%, as written 79%. **F3 held**: random deletion leaves 17–20% repeated and 4.40–4.58 bits (the edit 3%, 5.31); the dedupe gets repetition to 0% but 4.86 bits and 77% whole clauses. **F5: the rename's advantage is the record only** — find/replace gives the same numbers (0 asks, 0 old names left, 51 lines changed); what it lacks is which line changed, why, and what went stale |
| 2026-09-28 | the arc's ending, third run (arc3, pre-registered in f363987: fresh outline, 1.5b, seed 1) | the three predictions stated before the run | **(3'), the claim, held: after the edit no arc finding stands** — Gebser and the being both clear; the last part reads HOME (as written it read away with `no_arrival` and `role_unplayed`; the regeneration, judged by the walk with six draws, brought it home and said the change). The being is at home in 2 parts, away 15, changed by part 14. **(2') held**: 0 of 24 outline lines begin with the placing. **(4') not held**: Houdini's read-aloud count went 0 → 1 (a regenerated part said its role back once); the counts are too small to carry weight either way. Disclosed: the outline came out at 18 scenes of the 24 asked (six scene asks heard nothing twice and were declared void, as designed), and the ear heard one stray claim on Alice from a reply ("is: While away receives a distress signal…"). Edited: 3,016 words, 7% repeated, 4.84 bits/word, 97% whole clauses. One seed: the ending closes on this run; whether it closes in general needs seeds |
| 2026-09-28 | code through the one pipeline, run 4 (code4, `SCAN_SHAPE` added to every working note; record arm only, both mouths, fresh seed) | the fact's own pre-registration: the stale-index bug gone from at least one of `tokenize`, `parseRef`, `dependencies`, `formatGrid` on at least one mouth, read from the assembled source | **falsified, as stated — with a real but non-general effect disclosed.** Read all four named functions on both mouths from `record/lexer.js` and `record/grid.js` directly. **1.5b `tokenize`'s "Handle numbers" branch is genuinely fixed**: both the while-condition and the accumulation now re-read `src[i]` every pass, exactly the shape `SCAN_SHAPE` teaches, where code3's same branch held the bug outright. **But the same function, in the same fresh draft, after the fact was in its note, still has the identical bug in its other two branches**: "Handle cell references" and "Handle names" both capture `const char = src[i]` once and test that stale `char` (not `src[i]`) in their while-conditions — the cell-reference branch's condition is `char === '$' || …`, permanently true once entered, so it silently consumes the rest of the string. This is the falsifier's own wording exactly: the shape recurred in a fresh draw of the same function with the fact already present. **`parseRef`, `dependencies`, `formatGrid` supply no evidence either way on either mouth**: none of the six actual functions (two mouths × 3) uses a scan-and-consume-a-run character loop this round — 1.5b uses index arithmetic / string `.split` / `Array.reduce`, 3b uses `.match` / `.split`, so `SCAN_SHAPE` had nothing to fix or fail to fix there. **3b's `tokenize`** stayed regex-based against `src[i]` directly in every branch, as in code3 — never exposed to the bug, so it is not a fix, just an absence. Net: the fact changed one of three sibling branches in the one function it was tested against and left the other two exactly as broken as before — not the general pattern the prediction needed, and the falsifier's own next lever (lesson #29: give the scan its own leaf unit) is the honest next step, not a stronger prompt |
| 2026-09-28 | code through the one pipeline, run 3 (code3, the concede-before-deciding bug fixed; record arm only, both mouths, fresh seed) | the fix's own pre-registration: round 3 > round 0, and no `"no body on the record"` stub for any function ever drawn successfully | **held, and the ledger is now honest**: every function that ever held a live body still has exactly one after every undone revision — checked directly against the state file, not inferred (1.5b: `tokenize` 1 live body after round 2's undone redraw; 3b: all 9 functions checked, 8 with exactly one live body, `computeGrid` void because it never once drew syntactically valid, never because a good draw was lost). **1.5b: round 0 did not load, round 1 kept `tokenize`+`parse` (0 → 3/16), round 2 kept nothing further (3/16 final)** — but those 3 passes are still the stub shape: `tokenize` and `parse`'s OWN tests still fail; a genuine logic bug (`const c = s[i]` captured outside a run-consuming inner loop, so the loop's own guard never changes) keeps `tokenize` wrong across every round. **3b: round 0 = 2/16, round 1 kept nothing (2/16 final)** — LOWER than code2's corrupted "3", and for an understood reason, not a regression: 8 of 9 functions now genuinely hold (wrong) code that loads and runs, so only 2 of the 6 throw-expecting tests pass by chance, where a wholly-void function would have passed 1 by simply always throwing. A real, intact record scores worse than an empty one on tests built to catch missing behavior — worth remembering when reading any "passed of 16" number here. `computeGrid` void on both mouths (never a syntactically valid draw in `BODY_TRIES`). Real bug, real record, still no real test passing on either mouth — the mouths' own code quality on this task, now measured honestly. Next: `SCAN_SHAPE`, pre-registered below |
| 2026-09-28 | code through the one pipeline, run 2 (code2, 1.5b and 3b; the harness fixed: 27 of 30 draws on 1.5b and 16 of 22 on 3b extracted and passed the syntax gate) | the three arms above, against the pre-registration | **falsified for this task at these mouths — nothing real passed in any arm.** Tests passed of 16: 1.5b — whole 0 (did not load), units 0 (did not load), record round 0: 0 → round 1: 2 → round 2: 3; 3b — whole 3, units 1, record round 0: 2 → round 1: 3. But **3 of 16 is the stub baseline**: the three tests that expect a throw pass when a function is missing or wrong, so no arm wrote one function that passed one real test. Against the predictions: at 3b whole (3) ≥ units (1) — decomposition cost more than it gave; units (1) < record round 0 (2) and round 1 (3) > round 0 — nominally as predicted, but within the stub baseline, so the carried ground and EVA→REC moved nothing real. The record's machinery did what it says — 10 bonds heard on 3b (0 on 1.5b: it answered "none" to every calls ask), notes 197–255 tokens mean, revisions kept only when the tests naming a function fell (1 of 17 kept), the rest undone and the old body heard again — and it does not turn a mouth that cannot write one correct function of this design into one that can. The 1.5b "did not load" cause was not read (the harness recorded the blame, not the loader's message). What this leaves: the design was checked by a hand-written reference (16/16), so the task is writable; the next test is a larger mouth on the same three arms, which this box does not have |
| 2026-09-28 | code through the one pipeline, run 1 (code1, 1.5b and 3b) | the three arms above | **void — a harness fault, not a result.** Every function in `units` and `record` was declared void on both models: the mouth fences its code and repeats the head ("```javascript / function tokenize(src) {"), the harness put its anchor in front as well, and every draw failed the syntax gate with two heads glued together (48 of 54 draws on 1.5b; 6 more were cut off at 450 tokens). The 3/16 every arm shows are the three tests that expect a throw, satisfied by the empty stubs. `whole` 1.5b 0/16, 3b 3/16 (its one draw wrote a program that loaded and passed only those). The record's own machinery worked around the fault as designed — the record reads 10 bonds on 3b, 0 on 1.5b (it answered "none" to every calls ask), prompts stayed at 192–235 tokens mean — but nothing about the predictions can be read from a void. Fixed (fences dropped, the head not doubled, 700 tokens), unit-tested on a fenced reply, rerun as code2 under the same pre-registration |
| 2026-09-28 | the arc's ending after four fixes (arc2, pre-registered in 210d567: fresh outline, 1.5b, seed 1) | the four predictions stated before the run | **(3), the claim, held on the arrival: the last part reads HOME as written and edited** ("…people who have come to her house for help"), Gebser's `no_arrival` gone; the void was answered by the regeneration (5 of 9 flat parts rewritten); but **the change is not said in the last chapter** (`unchanged_return` stands: 3 draws at the last part said "her dog" and not "skilled and experienced"). **(1) held**: home "the house where she lives", lacks "her dog", becomes "a skilled and experienced person" — clauses. **(2) falsified**: 10 of 28 outline lines still begin "In scene 1 on <the chapter's line>, …" — the anchor said back with "In" in front, a shape the echo-drop did not cover. **(4) falsified**: Houdini's role-read-aloud count rose 4 → 5 — the regenerated parts read the role fact in hand aloud ("In scene 5, Alice becomes a skilled and experienced person…"), and the rewrite was undone 11 of 12 times (a plain restatement is not shorter). Edited: 2% repeated, 5.74 bits/word, 93% whole clauses |
| 2026-09-28 | the carried ground over three seeds (carry1, carry2, carry3-s2, carry3-s3; the pre-registered rule of 9cd9064: an arm holds only if it beats BOTH the ledger and stale on the mean of its own measure AND its mean repetition is within 3 points of the ledger's) | ledger and stale, three seeds each, six arms | **the whole field held; no single fact did.** Seams (adjacent parts sharing no being): **field 0.00** in every seed, ledger 0.67, stale 1.67 — the carried ground is the one arm that never breaks the chain, and the stale ground breaks it most. Repetition: field 15.3% (ledger 13.3, within the 3 points), wrong callbacks 0.7 (two in seed 1, none after; not in the rule, disclosed). Prompt max 262 against 231: bounded (EVA·Ground held). The single facts alone: `con` seams 0.67 (ties the ledger, and 18.0% repeated — over tolerance), `syn` strangers across chapters 1.33 (no more than the ledger), `rec` "day" said 13.7 against the ledger's 8.0 but the stale ground's 14.7 (stale carries a day too; the control is not clean for this measure). Carry1's headline — the field amplifies invented names — **did not replicate**: strangers per 1k over three seeds field 0.97, ledger 0.67, stale 1.07; the seed-1 Max ×54 was one draw. So: the ground row as a whole is what holds the book together across parts; taken apart, none of its facts does the work alone, and the one-seed results in both directions were noise. Three seeds, one outline, 1.5b |
| 2026-09-28 | the carried ground's failure is the recurring-strangers fact (carry2 ablation, pre-registered in b8e4f29; same outline, seed 1) | each fact alone against the ledger | **the stated mechanism is falsified**: `syn` alone did not amplify (stranger mentions 5.2/1k against the ledger's 6.3) and had the lowest repetition of any arm (5%). `con` alone held (17% repeated, 0 wrong callbacks). `rec` alone half held: the prose says "day" 15 times against 9, but 24% of its sentences repeat (predicted within 3 points of 18%). The swings between arms (syn 5% alone, 27% with the others; Max 18 against 54) are the size of one seed's sampling noise, so neither carry1 nor this ablation can carry a conclusion — seeds 2 and 3 pre-registered below |
| 2026-09-28 | the carried ground makes the book hold together (carry1, pre-registered in a65751d: arc1's outline, 1.5b, seed 1, 22 scenes) | ledger (as now) and stale (the ground as it stood at a random earlier part), scored from the text alone | **falsified.** Seams: field 0, ledger 0, stale 3 — not fewer than the ledger (the measure sits at its floor when one being is in every scene). Distinct strangers per 1k words: field **1.8**, ledger 0.8, stale 0.7 — the opposite of the prediction; mentions 16.5/1k against 6.3 (Max ×54, Emma ×31): telling the mouth "Max and Emma are also in the story" fed its own inventions back and it amplified them. Strangers across chapters: field 2, ledger 2, stale 1 — not more. "Tomorrow": said in no arm, untestable. Note bound: held (max 262 against 231). And it cost the prose: 27% of sentences repeated (ledger 18%, stale 21%), 2 wrong callbacks (others 0), whole clauses 93% (ledger 96%). One seed. The SYN·Ground prediction had the wrong sign: compiling the mouth's strangers into the ground rewards invention |
| 2026-09-28 | the nested arcs and the being, live (arc1: slice 2's request, 1.5b, seed 1; outline built with the being's frame and role facts) | Gebser and the being's checks, read from the text; the same request without arcs (slice 2) | **the arc was walked, the ending was not**: Alice starts at home (part 1), is away from part 2, is changed by part 15 (the change chapter), comes home in part 19 (the arrival chapter's first scene) — then the last three scenes wander off and Gebser finds *no arrival*. Regeneration tried 8 parts, kept 0 (no draw both said home and added no findings). The homecoming line reads the role fact aloud ("no longer missing her dog, a skilled and experienced person"), and the model copied the engine's placing clause into outline lines ("In scene 3 of chapter 4, …"), which reached the edited book through floors — dropped from new outlines since a65751d. Against slice 2: whole clauses 93% (79%), edited 8% repeated. **The stuck test cannot see the arc**: arc1 reads *settled in any order* too (p=0.2) — its slots (who is present, the opening word) are constant whenever one being is in every scene; the being's place and change would have to be slots, a new prediction for a fresh book |
| 2026-09-28 | E1 fix: gender evidence from subject pronouns only (she, he) makes binding read who is meant (stated before running) | the same E1 control on scale3: nameless pronouns flipped in gender | **falsified**: binding recovers 6 of Alice's 25 unnamed parts, the flipped control 5 — no real difference. The change was reverted; pronoun binding stays unused as evidence of who is present, and the carried ground reads names only |
| 2026-09-28 | the missing elements, offline (organs/read-back.js; eval/long-form/elements.mjs on slice 2 and scale3 as written) | each element against the control stated before it was built (above, "The missing elements") | **E3 NUL·Pattern (stuck) held**: slice 2 reads *settled in any order* (p=0.91: one state, any order), scale3 *settles in sequence* (p=0.0025) — the verdict tells the books apart. **E4 SEG·Pattern (seams) held**: scale3 has 20 seams (adjacent parts sharing no being); 50% fall where the archons tried a bridge, against 32% with the parts shuffled (p=0.03) and a 32% base rate. **E1 SIG·Figure (pronoun binding) falsified**: binding recovers 7 of the 25 parts where Alice goes unnamed, and the control (nameless pronouns flipped in gender) recovers the same 7 — on a long book the resolver's clause-local gender evidence is mixed ("Bob was Alice's friend… his stories": 49 male to 351 female), so Alice's gender reads unknown and binding is recency alone. **E5 DEF·Pattern (the book's laws) falsified as built**: 8 contradictions in the prose's possessive facts against 9.9 under redeal — the facts it reads are mostly not functional ("Alice's journey was one of adventure / marked by setbacks"). The control stated for E5 beforehand (order shuffled) could not work — the scan is order-free — and was replaced by redeal before running. **E2 NUL·Figure (clearance)**: 13 recurring strangers carry 125 of 140 stray mentions in scale3 (89%; Lily 14 parts, Jack 12) — clearance would reach most strays; whether minting them helps is the live test. Title words ("The Great Gatsby") still pass as strangers |
| 2026-09-28 | the bare model's looping is what the ledger beats, not a sampling setting (F1; slice 2 outline, 1.5b) | the bare window arm again with Ollama's repeat_penalty 1.3 over the whole 4096 window | **falsified as stated**: the penalised window repeats **1%** of its sentences (unpenalised 95%, ledger 15–21%, edited 3–4%) — repetition alone is a sampling setting. What the penalty costs: **whole clauses 59%** (ledger 79%, edited 80–85%), 8.99 bits/word (drift, not information: F2's salad reads 7.0), **195 strays** (80 invented names, 33 per 1,000 words; ledger 8), **0 ages/jobs said** (ledger 23 right, 0 wrong), prompt mean 2,067 tokens vs the ledger's ~150. The ledger's advantage is coherence, the cast held, and the record — not repetition |
| 2026-09-28 | the archons' CHOICE among fresh draws matters (F4; slice 2, 12 flat parts, 3 draws each, 36 asks, editors mechanical only) | the same pathos pass with the chooser set to the archons, to the first draw always, and to a random draw | **falsified**. The archons kept 1 of 12 draws (the rest fixed nothing without adding findings); first and random kept all 12. Archons: 2,506 words, 4% repeated, 5.10 bits/word, 80% whole clauses. First: 3,208 words, 6%, 5.24, 79%. **Random: 3,499 words, 3%, 5.66, 78%.** The gain is in the fresh draw from a bounded working note, not in the archons' ranking; their veto is too strict to be worth its asks. One seed |
| 2026-09-28 | long form far past the window, current code (scale3, 8 people, 30×10 asked) | ledger arm + archon edit; revisions vs a chunked rewrite of every part | the outline stopped at **187 scenes** (400-ask budget); **42,431 words (~60k tokens, ~15x the 4096 window — short of the 20x target)**, sealed, 2,360 lines covered, helix clean, prompt max 214 tokens, mean 154. Edited: 27,856 words, 15% → 7% repeated, 5.29 → 5.82 bits/word; bridges 1 kept of 59. Revisions on the edited book: job change 49 asks, 41 lines, **2 old values left**, 3 parts stale; age 6 asks, 4 lines, 1 left; rename **0 asks, 566 lines, 0 left**, 892 lines byte-identical. Strays 152 (Jack ×56: the mouth's own people). **Control** (the bare model rewriting every part with all three changes stated): 185 asks against the ledger's 55, 1,392 of 1,449 lines changed, old values left: job 2, age 0, **old name 518** |
| 2026-09-27 | correction (Ostrom): "15 of 17 elements" in commit 0f1290a is wrong — the renderer emits 19; new.css reaches 15/19 (misses main, span, i, label) | recount against RENDERED_ELEMENTS | 15/19 |
| 2026-09-27 | one pipeline: music runs through the same core as pages | the music commit touches no core file; its output is the source's own bars; a refused license leaves nothing; a note added around the map is caught | held (after two medium-general core changes, recorded) |
| 2026-09-27 | the talk page beats the old path through the product (runProxyTurn), 1.5b | same code, ER7_TALK_PAGE=1 vs 0; bare model (raw); main battery (21) and held-out fresh (6, not tuned on) | main: wired 4/21, 54/110 · old 2/21, 29/106 · bare 4/21, 63/104. fresh: wired 1/6, 22/33 · old 0/6, 15/33 · bare 1/6, 27/33. **Split by the gate:** where the gate routes the request to a build (14 main, 5 fresh) wired beats bare — 54/74 vs 35/68 main, 22/27 vs 21/27 fresh; where it misses (7 main, 1 fresh) the product ships nothing (0/42) and bare scores 34/42. The whole loss to bare is the gate answering with no artifact, not the build — and every miss was the **void** shape: an empty web search pre-empted the build check (the main wired run also predates the gate commit de42741). Fixed: a making request is never answered as void (conformance/making-not-void.test.mjs). **Rerun on 2599f2d:** main wired 4/21, **73/109** (bare 63/104) — above bare on checks now; held-out wired 1/6, 22/33 (bare 27/33) — unchanged: its one gate miss ("a directory of …", 6 checks) is left untuned on purpose |
| 2026-09-27 | a chat turn reaches the code API | live: workspace with a real bug + test command through runProxyTurn | code-edit answer, 1 round, test passes (1.5b) — one case, not a battery |
| 2026-09-27 | every element on a page is accounted for | the artifact read in its own terms against the map; a leaky renderer, a smuggled engine word, a note not on the record | 5/5 rungs covered and sealed (scripted mouth); all three controls caught; an always-ok checker fails the tests |
| 2026-09-27 | the stylesheet is snipped, not written | every CSS byte after the provenance comment equals the source's bytes at its ranges; a copyleft candidate that reaches more is refused | tests pass; license gate off fails the test |
| 2026-09-27 | structural claims limited to operator cells find gaps a patch hid | typed every structural label to one of the 27 phaseposts and checked the helix over the fold; a parts reply heard as `has` with no `exists` | the check named the reported gap **and** form fields heard the same way (the heldNote fallback had hidden both); fixed at the root — the ear instantiates before it bonds — and the fallback removed; rungs 1–3 helix-ok and sealed; turning INS-first off fails 3 tests |

## The missing elements (2026-09-28, Mendeleev over the 27 phaseposts)

The long-form pipeline held against the repo's canonical phaseposts
(`native/docs/THE-27-CELLS.md`, `native/organs/capacities.js`): 17 cells
filled, 2 thin, 8 empty. Per THE-27-CELLS §3 an empty cell is a lead, not a
verdict; each is stated here with a falsifiable prediction BEFORE anything is
built, so the result can go against it.

- **Family A, the carried ground** (CON·Ground, SYN·Ground, EVA·Ground,
  REC·Ground): nothing carries the book between parts except the last two
  sentences. Predictions: a carried field in each note cuts Clark's
  "takes nothing up" findings (control: another part's field, shuffled);
  a compiled book-so-far raises right callbacks to invented particulars
  (control: another book's ground); story time carried
  (`kernel/narrative-time.js`) cuts time words that contradict part order
  (control: parts reversed); a refresh gate leaves no carried fact the next
  part contradicts (control: refresh at random).
- **Family B, clearance** (NUL·Figure, NUL·Pattern; SIG·Figure and
  SIG·Pattern thin): invented names recur off the record (scale3: Jack ×56);
  a being called only "she" is unseen by the trajectory; a book stuck in one
  state passes every check (slice 2: all 21 parts hold Lily in one state).
  Predictions: clearance cuts strays per 1k words; pronoun binding cuts
  unseen counts on the same books; settling (`kernel/settling.js`, loaded,
  never called) names slice 2 and not its order-shuffled controls beyond alpha.
- **Family C, the book read back** (SEG·Pattern, DEF·Pattern): seams found by
  cutting the parts' network at its bridges coincide with the bridges tried
  and undone (control: order shuffled); laws acquired from the prose
  (`organs/hl-acquire.js`) make contradictions of what the prose established
  a measured number instead of an unread zero.
- **Live test, pre-registered 2026-09-28 before the run** (`carry1`: arc1's
  frozen outline, 1.5b, seed 1, 22 scenes — one seed, direction only). Three
  arms: `ledger` (as now), `field` (the carried ground,
  `organs/carried-ground.js`), `stale` (control: the ground as it stood at a
  random earlier part). Scored by `eval/long-form/carry-score.mjs` from the
  text alone. Predicted, field against both ledger and stale: fewer seams
  (CON·Ground); fewer distinct strangers per 1k words (NUL·Figure, SYN·Ground
  — the model reuses the people carried instead of inventing new ones); more
  recurring strangers seen in two or more chapters (SYN·Ground); a larger
  share of "tomorrow" followed by a later day in the next part (REC·Ground);
  prompt max within 100 tokens of the ledger's (EVA·Ground: the gate keeps
  the note bounded). Any prediction where stale does as well as field is
  falsified for that element, whatever the ledger shows.
- **Ablation, pre-registered 2026-09-28 after carry1 and before running**
  (`carry2`: the same outline, seed 1). Each carried fact alone, against the
  ledger: `syn` (the recurring strangers only) — stranger mentions per 1k
  above the ledger's 6.3 (the amplification is this fact's); `con` (who
  closed the last part, where the being is) — repetition within 3 points of
  the ledger's 18% and no wrong callbacks; `rec` (the day only) — repetition
  within 3 points of 18%, and the prose says "day" more often than the
  ledger's. If `syn` does not amplify, the carry1 failure is not explained
  and the mechanism stated above is wrong.
- **Seeds, pre-registered 2026-09-28 after carry2 and before running**
  (`carry3`: the same outline, seeds 2 and 3, arms ledger, field, stale,
  field-syn, field-con, field-rec; with seed 1 from carry1/carry2, three
  seeds). Decision rule, per element: it holds only if its arm beats BOTH
  the ledger and stale on the mean over the three seeds on its own measure
  (con: seams; syn: strangers across chapters; rec: "day" said; EVA: prompt
  max within 100 tokens) AND its mean repetition is no more than 3 points
  above the ledger's. Anything else is not supported, whatever one seed said.
- **The arc's ending, pre-registered 2026-09-28 before the run** (`arc2`:
  slice 2's request, a fresh outline, 1.5b, seed 1). Four causes were read
  off arc1 and fixed: the being's frame heard as a sentence ("no longer
  missing Alice is missing her dog"); the arrival chapter's own landing fact
  saying "somewhere new"; the engine's placing clause copied into outline
  lines; the regeneration vetoed by the licensed-findings count (0 of 8 kept).
  Predicted, in order of what each fix is for: (1) none of home / lacks /
  becomes on the record begins with the being's name; (2) no outline line
  begins "In scene" or "In chapter"; (3) after the edit, Gebser's `no_arrival`
  and the being's `unchanged_return` are absent and the trajectory's last
  part reads HOME (as written it may not — the regeneration is what should
  bring it home); (4) Houdini's `role_read_aloud` lines are fewer after the
  edit than as written. (3) is the claim; if the last part is still away
  after the edit, the arc's ending is not solved by these four and the next
  cause is the mouth's, not the record's.
- **arc3, pre-registered 2026-09-28 before the run** (fresh outline, same
  request, seed 1). Fixes: every shape of the placing echo is dropped from
  an outline line; a fresh draw that reads its placing or role aloud is
  refused; an arc part gets six draws; a line opening on its placing is
  repaired without an ask (Houdini). Predicted: (2') 0 outline lines begin
  "In scene"/"In chapter"; (3') after the edit the last part reads HOME and
  **no arc finding stands** (void answered, change said); (4') Houdini's
  read-aloud and placing findings after the edit are fewer than as written.
  If (3') fails with six draws, the arrival's change is not within a 1.5b
  mouth's reach on this ask, and the next move is the ask's wording, not the
  record's — recorded either way, then merged to main.
- **Code through the one pipeline, pre-registered 2026-09-28 before the run**
  (`code1`: a tiny spreadsheet engine — 9 functions in 3 modules with real
  cross-module dependencies; 16 hidden tests, satisfiable: the hand-written
  reference passes 16/16; the design — modules, functions, signatures, one
  line each — is the person's stipulation on the record; the mouth's own work
  is the calls, the bodies and the revisions). Three arms, same mouth
  (1.5b, then 3b), same suite: `whole` (the whole design in one prompt, the
  program in one draw), `units` (one function per draw from its own line,
  nothing carried, no revision — code-build's posture, which its own header
  says must defer when units depend on each other), `record`
  (`organs/code-form.js`: calls asked as bonds, bodies from bounded notes
  carrying the callees' signatures, the suite as EVA, failing functions
  written again with the failure in hand, kept only if the tests naming them
  fail less; 3 rounds). Predicted, tests passed of 16: whole < units <
  record round 0 ≤ record round 3, with record round 3 > round 0. Falsifiers:
  units ≥ record round 0 means the carried callee signatures do nothing for
  code; round 3 ≤ round 0 means EVA→REC does nothing here; whole ≥ units
  means decomposition costs more than it gives at this size. Recorded either
  way.
- **code2's collapse was a harness bug, found by reading the ledger it left
  (2026-09-28), not a finding about EVA→REC.** `organs/code-form.js`'s
  `drawBody` conceded a function's OLD body before it knew whether the NEW
  draw would be kept — and `kernel/notes.js`'s `concede()` is one-way by
  design ("a conceded note stays conceded — a later re-hearing lands on the
  same task and does not resurrect it"), so `revise()`'s undo path, which
  tried to restore the old body by re-hearing the identical triple, silently
  failed every time: the fold's own rule filters a once-conceded id forever,
  whoever re-hears it. Traced from code2-3b's `record.state.json`: `tokenize`
  shows exactly two `body` proposes and both get conceded (`rec:90`,
  `rec:92`), with no third hear ever landing — so after round 1 undid its
  revision, `tokenize` had no body at all, and every function that named it
  a callee threw `"tokenize: no body on the record"` at runtime. This is why
  round 1 fell to the stub baseline on both mouths: revising ANY blamed
  function and then undoing it destroyed that function, not just that draw.
  **Fixed**: `drawBodyText` now only draws and syntax-checks (no notes
  touched); `commitBody` (concede-if-prior, then hear) runs on a SCRATCH
  copy of the notes and is tested there; the live `notes` is reassigned only
  when the trial is kept — so an undone trial never concedes anything, and
  the sibling's original body is simply never touched (`organs/code-form.js`
  commit message has the full account). A regression test
  (`tests/code-form.test.js`) reproduces the exact shape (a shared test
  blames a genuinely broken function alongside a genuinely fine sibling; the
  sibling's bad redraw is undone; its ORIGINAL body must still be on the
  record and in the assembled program) and is confirmed to fail against the
  pre-fix code (mutation-checked) and pass against the fix.
  **code3, pre-registered before running**: rerun the `record` arm only
  (`whole` and `units` never call `revise()`, so code2's numbers for them
  stand) on the same task, same two mouths, same rounds (3), fresh seed.
  Round 0 is drawn fresh so it may differ slightly from code2's (stochastic
  draws) but is not expected to move the story (round 0 was never touched by
  this bug). The prediction from code1/code2's own pre-registration now
  applies for the first time under code the pipeline can actually revise:
  record round 3 > round 0, and the FINAL assembled program contains no
  `"no body on the record"` stub for any function that was ever drawn
  successfully at any point. Falsifier: if round 3 still does not exceed
  round 0 with the bug fixed, EVA→REC genuinely does nothing for these
  mouths on this task, and code2's stub-baseline number was the honest
  answer after all, just for the wrong reason.
- **Gary's law applied to code-form's prompts, and one worked-example fact
  added (2026-09-28, user: "use Gary to understand how to best prompt
  models").** Audited `workingNote()` and `askCalls()` against
  `native/tests/gary-doors.test.js`'s own rules (P55: information, never
  prohibition; no apparatus vocabulary; a worked-example shape holds when
  its names are marked fake, per the-fold/code-loop.js's own
  `PROPOSAL_FORMAT` and CODING-LESSONS.md #67) — clean already, pinned with
  a new test in `tests/code-form.test.js` (mutation-checked: an injected
  "Do not invent a premise." trips it). Read code3-1.5b's own failing
  `tokenize`: `const c = s[i]` was captured OUTSIDE an inner loop meant to
  consume a run of matching characters, so the loop's own guard never
  changed and it read that one character forever — a well-known small-model
  pattern bug, not specific to this task. Added `SCAN_SHAPE`
  (`organs/code-form.js`), one fake-named worked shape for walking a
  sequence and consuming a run inside it, appended to every function's
  working note (Gary's own worked-example lesson: state it as information,
  not as a ban on the bug — "never capture a stale index" was considered and
  rejected as exactly the prohibition Gary refuses).
  **code4, pre-registered before running**: the same task, same two mouths,
  fresh seed, record arm only, with `SCAN_SHAPE` now in every working note.
  Predicted: the specific stale-index bug is gone from at least one of
  `tokenize`, `parseRef`, `dependencies`, `formatGrid` (functions with a
  scan-and-consume-a-run shape) on at least one mouth, read from the
  assembled source, not just from a higher pass count (a fixed loop can
  still fail a DIFFERENT way and a higher count could come from an unrelated
  function). Falsifier: the same stale-index shape recurs in a fresh draw of
  the same function after the fact is in its note — the fact does not reach
  a pattern this general, and the next lever is decomposition (lesson #29:
  split the scan into its own leaf unit), not more prompting.
- **The root:** the bodies are never read back into the record. The ear
  (`talk-reader.js`) hears only the outline's talk. Every empty cell needs
  that one missing reader first (SIG·Figure), with pronouns bound
  (`adapters/text/pronouns.js`).

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
