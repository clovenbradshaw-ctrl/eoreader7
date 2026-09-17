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

## Tooling notes
- Use `node:http` with an explicit long timeout for code-loop calls; undici's
  default headers timeout (300s) kills multi-minute turns mid-stream.
- `--models=a,b` and `--models "a,b"` are different parses — verify CLI
  argument shape before blaming the model.
- A live-reload (SSE on file change) turns a headless build into something you
  can watch land in the browser, behavior by behavior.