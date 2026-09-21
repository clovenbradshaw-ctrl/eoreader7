# Coding Lessons — writing code with small local models

Learned live while building a real MySpace clone with the eoreader7 `/v1/code`
loop and 1.7b–4b Ollama models. These are the transferable rules, each one
paid for with a failed run.

## 1. All-or-nothing gates destroy incremental wins
A patch that satisfies only part of the contract gets **reverted**: the loop
discards anything that does not make the whole `testCommand` exit 0. That is
how a model that wrote a *correct* single feature lost it four times.
Fix: **per-behavior gates** (`node test.js <key>` exits 0 when *that*
behavior works), so every good patch is kept the moment it lands.

## 2. Decompose to one behavior per ask
Small models cannot "write the whole feature" — being asked to do too much at
once is the classic failure. Give them one behavior, with the exact failing
test line quoted in the ask. A 1.7b model that cannot do five things at once
can do one thing well.

## 3. Holonic tasks: low = possibility, high = probability
When a section stalls, breed variant asks in the low holon (different shapes,
different anchors, worked examples, rephrased instructions) until one is
accepted — that is possibility. The real gate (the test) does the selecting —
that is probability. Never let the high holon guess; it measures.

## 4. Worked patch-format examples beat prose
Tiny models emit a valid `ACTION: patch / FIND / ADD` reply far more often
when shown the exact shape once, including "copy the find byte-for-byte from
the file." The example is scaffolding; the loop's physics (find must match
real bytes) does the rest.

## 5. Anchors must be real bytes
The `FIND` must exist in the file right now. After a function is implemented,
its stub anchor (`throw new Error("TODO: x")`) disappears, so later edits
anchor on the *current* file content — which is why the round-1 file listing
must show the whole file.

## 6. Model choice is measured, never assumed
Smallest ≠ usable. On a loaded box the **resident/warm model wins**:
gemma2:2b answered in 3.2s while smollm2:1.7b cold-loaded for 4+ minutes with
zero bytes on a trivial prompt. Warm the chosen model once (`keep_alive`),
declare `num_ctx` consistently (every window change is a full reload), and
pick by measurement, not by parameter count.

## 7. Know your model's quirks — they are bugs, not luck
smollm2:1.7b hangs on a `system`-role message; the proxy prepends one on
every turn, so that model is dead on this path no matter how good it looks.
Heimdall's quirk table exists exactly for this: read it before choosing.

## 8. Connection resilience is part of the driver
Proxies restart; requests die with `socket hang up` and `ECONNREFUSED`. A
driver must REC (retry) on connection errors *without* burning the attempt's
energy — a refused section is a real result, a dropped socket is not.

## 9. The build is itself executable code
A patch ledger (`EOTBase@1` + `EOTCodeOp@1` with find/add bytes + test
command) replays byte-for-byte onto a fresh workspace. The EOT file is not a
log of the build; it is the build.

## 10. Swarm energy and dormancy
A section that keeps refusing goes dormant (logged, never abandoned), so the
swarm does not spin forever on one stubborn gate; a breakthrough earns +energy.
Retries of a *kept* behavior are the point — never abandon a section the gate
has not passed.

## 11. The discovery-dialogue write race — a reader must not trust a field
another writer doesn't know it owns
Two concurrent sessions both depended on `plans/nashville/nashville.surfacedef.json`:
one rendered a surface from it (reading `vocab` + `metrics.placeDistricts`),
the other (`discover-nashville.mjs --autonomous`) rewrote the *whole file*
every cycle to iterate its discovered vocabulary. `writeFileSync` is not
atomic and there is no lock, lease, or merge anywhere in this repo for JSON
config files (checked: no `flock`, no lockfile, no claim mechanism — the
`claimTurn`/`releaseClaim` lease in `heimdall.mjs` is scoped only to model-
inference turns, never to file I/O). Each rebuild during the conflict
produced a *different* link count (1902 → 5040 → 1902 → 2382 ...) and
`metrics.placeDistricts` kept landing back at `{}`, because the discovery
script has no concept of council districts and overwrites the field with
nothing every time it writes. Falsifying this against "it's just flaky"
required tracing the actual pipeline stage (`extractPlanRows` vocab-override
line, `deriveProjections`'s `Object.entries(placeDistricts)` loop) rather
than re-running and hoping.
**Fix**: don't fight over the contested field — stop trusting it from the
live file at all. `placeDistricts` now lives in its own pinned file
(`plans/nashville/placeDistricts.json`) that the render pipeline merges in
unconditionally on every build, regardless of what the discovery process's
last write left in the shared surfacedef. The vocab field is left alone
(that field genuinely IS the other process's evolving work — only merge/pin
the field that's a pure, un-owned bug, not the field that's someone else's
live progress).
**Falsifying control**: if `metrics.placeDistricts` is ever legitimately
meant to be discovered/evolved rather than pinned, this fix will show up as
`lit places` staying frozen across builds even as real new places enter the
vocabulary — that's the signal to move district-mapping into the discovery
dialogue's own output instead of a static file.
**Second-order lesson, learned the same night**: pinning the input wasn't
enough, because both sessions also wrote to the SAME OUTPUT FILE
(`native/the-fold/plans-surface.html`) — each rebuild, whichever session
finished last, silently replaced the other's artifact, including mid-test
(the falsification suite measured a 10MB mid-swap file and blamed the
wrong code). Resolution: separate outputs — this pipeline now writes
`plans-surface-holograph.html` and never touches `plans-surface.html`.
Two writers, one shared path, no lock: always lose. Two writers, two
paths: no race possible by construction.
**Third-order lesson, same night, same file**: after separating outputs,
the build *still* produced the wrong artifact — a concurrent session had
added `bare: true` to the shared driver's `renderSurface()` call, silently
switching the whole template to a minimal variant (no rail, no inspector,
no timeline, no map). The falsification suite caught it only because it
asserts on *present elements*, not just on passing gates — gates were green
the entire time while the artifact was missing every feature. The rule:
**flags that change output shape are pipeline behavior, not decoration —
they need the same ownership discipline as output paths.** A boolean that
selects between two different artifacts must live in the artifact-specific
invocation (or its own driver), never as an edit to the shared call site.
**Fourth-order lesson, same night, same repo**: a bare `git commit` swept
another session's *pre-staged* files (8 files, 1300+ lines: antimatter
kernel, swarm-server, cli) into my commit under my message — fixed by
`reset --soft`, unstaging only the foreign paths (working tree untouched),
and recommitting. The rule: **on a machine with concurrent sessions, never
bare-commit — `git diff --cached --stat` first, and commit only paths you
can name.** The index is shared mutable state too.

## Tooling notes
- Use `node:http` with an explicit long timeout for code-loop calls; undici's
  default headers timeout (300s) kills multi-minute turns mid-stream.
- `--models=a,b` and `--models "a,b"` are different parses — verify CLI
  argument shape before blaming the model.
- A live-reload (SSE on file change) turns a headless build into something you
  can watch land in the browser, behavior by behavior.
## kleeneUp lessons (2026-09-21) — regex eviction, paid in failed runs
- **A classifier written as a regex will eat itself.** The first
  `reduceRegex` used a regex to classify regexes; it failed to compile
  ("Nothing to repeat") before it ever ran. The fix was a hand scanner — and
  the archon's own rule: an archon that evicts regex with a fragile regex is
  hoist by its own petard. Classify by walking the pattern, not by patterning
  the pattern.
- **A needle is a boundary you get for free; a tokenizer is grammar you
  disclose.** Replacing `\bword\b` with a plain substring needle finds
  "word" inside "sword". The honest fix is to measure single words against
  the TOKENIZED field (word boundaries become real) and phrases against the
  folded raw field — and say out loud that the tokenizer is structural
  grammar, not finding.
- **"Absence is a result" only works if the shape of the result is
  consistent.** `findNeedle`'s `from` path sliced the field to an empty
  string, and the empty-field refusal omitted the `found`/`absent` arrays a
  caller needs — a `Cannot read properties of undefined (reading 'length')`
  that only showed up under test. Every refusal must carry the same shape as
  every finding, so an absence is never a crash.
- **A word boundary is not the letter b.** `\b` unescaped to "b" turned
  `llama-server\b` into the needle `llama-serverb` — a wrong span found
  silently. A boundary marks the edge of a needle, never a character, and the
  un-escapers must treat it as such.
- **A survey scanner must skip the shebang.** The first sweep reported
  `#!/usr/bin/env node` as the regex `/usr/` with flags `bin`, on every
  entry file. The guard: a `/` begins a regex only after an expression-
  starting character, and a `#!` line is never a regex.
