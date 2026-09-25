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

## Session 2026-09-21 — the watch (running and measuring the box itself)
Learned while building Heimdall's watch surface and the speed experiments.
Same rule: each is a failed run turned into a control.

## 12. The model server can WEDGE, and nothing restarts it
A 0%-CPU `ollama serve` (models shown resident in `/api/ps`, CPU idle for 30+
minutes) hangs every generate to the turn deadline. Every "the model is slow /
the box is thrashing" reading was this. **Fix:** run `ollama serve` **directly**
(the `.app` ignores `launchctl` env and manages its own), with the tuned env
(`NUM_PARALLEL`, `CONTEXT_LENGTH`, `MAX_LOADED_MODELS=1`, `NUM_GPU=0`), and a
watchdog that probes `/api/tags` cheaply and restarts the server after N
consecutive misses — **never while a turn is in flight**. **Falsifying
control:** the watchdog must never restart a healthy-but-busy server (a probe
that fails under load but the server answers a generate would prove it false).

## 13. Swap LEVEL is history; swap CHURN is now
macOS never moves pages back, so a box sits at 92% swap with idle app pages and
plenty of AVAILABLE RAM and still serves fine. Gating on swap level refused
work the box could do. **Fix:** gate on churn (`Swapins`/`Swapouts` deltas from
`vm_stat`, pages/s) or true starvation (available < 2×floor), not the level.
**Falsifying control:** a turn admitted at idle-high swap that then runs much
slower than one at low swap proves the level guard was right.

## 14. Best-of-k fan-out is wasted when one draw already passes
Measured on a verifiable coding task (fib, test-executed): the single
deterministic draw passed, **and** all 4 concurrent candidates passed —
28.5s (4×) vs 10s (1×) for zero quality gain. **Fix:** fan out only where the
single draw actually fails and the fan-out recovers it. **Falsifying control:**
best-of-k passing *no more* than k=1 does — the day the fan-out wins is the day
a lone draw failed and a candidate saved it.

## 15. Dependent, streamed draws cannot be parallelized
The section loops draw each part with `soFar` (the prior text) and STREAM each
part to the caller (`proxy-runner.mjs:5783`, `:1402`, `:5835`). Running them
concurrently breaks the sequential build each part depends on and interleaves
tokens into garbage. **Fix:** concurrency applies only to genuinely INDEPENDENT
work (external callers, or candidate draws from the *same* state) — never to a
chain. **Falsifying control:** a section whose prompt does not reference prior
content could be parallelized; every current section does.

## 16. Concurrency is a throughput lever, not a speed-per-call lever
On a CPU-bound box, N concurrent calls cut total wall time ~1.2–1.7× while each
call gets 1.6–3× slower. `NUM_PARALLEL > 1` also allocates extra KV slots — a
memory cost paid by a sequential pipeline for nothing. **Falsifying control:**
if raising `NUM_PARALLEL` doesn't lower a batch's total wall time, the slots are
wasted.

## 17. Compute, don't generate — the code the model never needed
A verifiable coding task (a function + a test) needs the model only until the
shape is known; after that the work is mechanical (templates, AST/structured
edits, the hard validator). The `/v1/code` loop's own physics — apply the edit,
run the test — is the gate, not the prose. **Falsifying control:** a task where
the computed answer is wrong and the model's is right.

## 18. Instrument the phases, or argue forever
Record per turn `draws · load_ms · prompt_ms · gen_ms · wall_ms` (`finding:
"turn_phases"`). A small chat turn measured **gen 57 %, prompt 40 %** — so both
matter, and the "generation is 17× prompt" intuition holds only for long
outputs. **Falsifying control:** if `gen_ms` is <30 % of the wall on real turns,
the token levers are the wrong ones.

## 19. Fail closed on sibling edits: never a static named import
Another session removed `listSessions` from `proxy-runner.mjs`; a static
`import { listSessions }` made the **whole proxy** fail to boot. **Fix:**
namespace-import the sibling (`import * as X`) and destructure with a default
(`const listSessions = X.listSessions || (() => [])`), so a concurrent refactor
can drop one export without taking the process down. **Falsifying control:** a
missing export must produce a typed gap, never a boot failure.

## 20. The metric itself lies; measure what it names
The RAM gauge read 99 % because it used `free/total` — but macOS "free" is
always near zero (it is cache). Available (free + reclaimable inactive) is the
honest figure. **Falsifying control:** a metric that disagrees with the thing
it is named for (a "RAM used" that is 99 % on an idle box) is a bug in the
metric, not the box.

## 21. A discrete coding task is a BUILD, not a turn — recognize it from plain language
An NL ask to *write a file/module naming more than one function* is not a
question for the mouth; it is a build. The system must recognize the shape
itself (`native/organs/code-build.js`, `detectBuildTask`), then: **compute the
structure** (decompose into the named units, assemble, validate), **generate
only the unit bodies** — and since the units are INDEPENDENT (unlike the essay
chain), draw them **concurrently** (bounded by `parallelism`). Measured from a
plain prompt: 5 units, ~750–960 tokens, 9–27 s, assembled and syntax-checked,
zero hand-built harness. **The pitfall that cost a run:** the model, shown the
whole task, emits *every* function in each reply — keeping the whole reply
produces the file five times over. Extract **exactly the named unit** (split on
definition boundaries and take the chunk whose own name matches). **Falsifying
control:** a build whose units *depend* on each other's text is a chain, not a
fan — concurrent assembly would be incoherent and this path is wrong; and a
build whose assembled file fails its own test while a single draw passed
concedes that decomposition lost something.

**The gate must be the strongest the language allows, never weaker than
compile+run.** A `py_compile` (syntax-only) pass lets a duplicate-defs file and
an undefined-name call through as "verified". The repo already has the hard
validator — `validatePython` (pyodide: compile + AST undefined-name scan +
exec) and `validateHtml` (tag/structure balance) — and the build delegates to
it, reporting `verified: "validated (compile+exec)"`, not `syntax_only`. Only a
language with no validator falls to a syntax parse, and that is disclosed as
UNVERIFIED.

**But compile+exec is the FLOOR, not meaning — only a test that CALLS the code
decides.** Measured: a module where `normalize` returns a list and `parse_line`
calls `.split(',')` on it passes `validatePython` cleanly — `ok: true`,
"compile + ast + exec", zero findings — because the module *defines* the
functions without *calling* them. A one-line test that calls `parse_line`
raises `AttributeError: 'list' object has no attribute 'split'`. So the
validator catches structure (syntax, undefined names, import/exec errors); it
does not judge behavior. The `testCommand` is the top gate for a reason: a
build can compile, exec, and still be wrong. **Falsifying control:** a build
whose assembled file passes `validatePython` yet fails the caller's test is
this limit — the floor is not the decision.

## 22. A liveness probe must probe the FAILURE surface, not the friendly one
The model server wedged (0% CPU, every generate hanging past 120 s) while
`/api/tags` answered in 0.01 s. Heimdall's `probeModelServer()` checks only
`/api/tags`, so the remedy gate refused — "the server answers, it is busy, not
stuck" — for the exact wedge it exists to end. The probe checked the surface
that never wedges. **Fix:** the liveness probe for a model server is a real
generate (tiny `num_predict`, strict timeout), not the tags endpoint — or the
gate is blind to the failure it gates. **Falsifying control:** a server where
`/api/tags` answers but a generate hangs is the wedge; a probe that returns
"healthy" for it is probing the wrong surface.

## 23. A gate that cannot see its failure mode will be refused by its own gatekeeper
The remedy (`restartModelServer`) is gated twice: once per window (cap) and
once on "is the server healthy?" — and the health check used the wrong probe.
When the operator asked heimdall to unwedge it, heimdall refused with the
health-gate's false "busy not stuck" verdict, because `probeModelServer` could
not distinguish a thrashing-but-alive server from a wedged one. The violent
act was still justified (2-minute hang + `/api/tags` fast = wedge), but only
because the human forced past a gate that had measured the wrong thing. **Fix:**
a gate's refusal is only trustworthy when its probe measures the failure
surface. **Falsifying control:** ask heimdall to unwedge a genuinely wedged
server again after the probe fix — it should act, not refuse.
**Result, 2026-09-21:** the server wedged again later the same day; the fixed
probe caught it and heimdall self-remedied (restarted it itself, no force).
The falsifying control passed.

## 24. A held-out test must test only what the spec STATES — else the "failure" is a task bug
Comp/04 (`repeat_prefix`): the task prompt said only "If k <= 0 return ''" but
the test required `repeat_prefix("", 4) == ""` — the empty-string case was
never stated. The model was scored as failing a guard it was never told about.
A held-out block is only fair when every case it asserts follows from the spec;
an unstated requirement is not a capability gap, it is a **task bug**. The
first read of this lesson blamed the model ("it dropped a spec-stated guard")
— that was wrong, and the falsifying control caught it: when the prompt was
rewritten to state the guard ("if k <= 0 or s is empty, return ''"), the same
model produced the correct `not s` guard immediately. **Fix:** before scoring a
heldout failure as a competency gap, diff the spec against the test — every
asserted behavior must be stated. **Falsifying control:** if adding the missing
clause to the prompt makes the model pass, the failure was the task's, not the
model's.

**Corollary — the memorized-groove trap:** asked to *fix* its own buggy body
(the buggy code in context), the 1.5b model recites the same wrong version at
every stage, 40 tokens, no change. Asked to write it *fresh* from a correct
spec (no buggy body in context), it produces the right guard. Showing a small
model its own wrong code anchors it to the wrong code; a clean re-ask beats a
fix-ask below ~2b.

## 25. The small-model law: prompt-completion + mechanical snip, never steering
Small models cannot be steered. "Output ONLY the code", "no comments",
"decompose first", "fix ONLY that one case" — these are instructions they
either ignore (produce prose around the code) or stall on (empty response,
early-EOS). The design principle that works (measured: composition set
7/8 → 8/8 with heldout enforced):
  1. **Prompt with nothing more than the exact text you want the model to
     complete.** For a function: the spec + "Write the function" + the
     completion anchor `def <entry_point>(`. No behavioral admonitions.
  2. **Snip mechanically.** Whatever the model wraps the code in (prose,
     fences, "sure! here's..."), extract the definition for the entry point
     byte-mechanically (find `def <name>(`, cut through the indented body).
     The snip, not the prompt, is what isolates the answer.
  3. **Define and detect "what satisfies" mechanically.** The test (+ heldout)
     is the satisfier. The prompt never has to be right; the test and the snip
     are the only things that decide.
  4. **On failure, re-ask fresh from the spec** — never hand the model its own
     buggy output. The failing case is quoted (lesson 2) but the ask is a
     clean "write it correctly", not "fix this".
  5. **A spec gap is a task bug, not a model failure** (lesson 24): if the
     test requires behavior the prompt never states, fix the task, then re-run.
**Falsifying control:** a run whose score DROPS when the meta-instructions are
removed and only the completion anchor + snip remain proves the steering was
doing real work — so far it only rose (7/8 → 8/8, and Comp/04 recovered).


## 26. Recursive goal evolution survives falsification — the paper is the mechanism
The "design on paper first" loop (write EOT goals → pass → ground → a failure
becomes a NEW atom on the sheet → re-pass) was falsified three ways and
survived:

- **Control 1 (NULL)**: the SAME buggy 3-atom sheet, re-asked 5× WITHOUT
  evolution → **0/5 converged**. The model consistently produced the same
  wrong output. The added atoms are the CAUSE of convergence, not decoration.
- **Control 2 (repro, fresh task)**: on `snake_string` (not primed this
  session), evolution converged in **2 rounds** — round 1 got the identity
  (`'abcdef'`, no split), the evolved "same length" atom fixed it. Converged
  by information added, not luck.
- **Control 3 (honest gate)**: a hardcode that passes TRAIN fails HELDOUT
  (the satisfier is the honest gate, never the sheet); a fully-evolved sheet
  with heldout enforced produces a general solution live.

**The one caveat found:** the evolution must PARSE failures into precise
operational atoms ("the result has EXACTLY k characters", "if s is empty,
return empty string") — echoing the raw failing assertion onto the sheet does
NOT converge (measured: the echo-atom sheet stayed stuck round after round).
A crash on `('', 4)` must become the empty-s guard, never the crash text.
**Falsifying control:** if a sheet whose evolved atoms are raw test-line echoes
ever converges where the parsed-atom sheet does not, this caveat is wrong.

## 27. The goal sheet is a claim ledger; the test is the record; the lint is the judge
The "design on paper first" loop (lesson 26) first parsed failures with
hand-written regex — a re-derivation of machinery this codebase already owns
model-free. The unconscious coding intelligence (no model, no regex):
- **Referents name.** A goal atom is {end1, label, end2}; its identity is
  surfaces.js::referentIdentity posture (`class:` or `bytes:` over a
  normalized form). `repeat_prefix('',4)`, `repeat_prefix("", 4)`,
  `repeat_prefix('', 4)` are ONE referent — quote style and spacing are
  SURFACE, never identity (code-goal-lint.js::referentForm). This collapses
  the parser's many regex branches to one lookup.
- **The test is the record.** A pass is a claim the satisfier must hold;
  pass = equated, fail = un-equatable FOR this whom (the run-dmca posture).
- **The reasoning lint is the judge** (organs/reasoning-lint.js, Kelsen's
  precedence, applied to code goals). A failure is a TYPED finding —
  contested_claim (the pass contradicts a guard), expired_obligation (the
  pass fails a return goal), standing_contradiction (two goals at one
  address disagree), support_cycle (the pass returns its input unchanged —
  begging the question). **The finding's KIND is the new atom**, never a
  regex match. This is what lets the goal sheet recursively evolve: each
  lint finding is a new atom on the ledger, and the ledger re-lints itself
  until coherent.
- Falsified (6/6 in code-goal-lint.test.mjs): quote-style referent identity,
  the empty-guard contested_claim, the case-transform expired_obligation,
  the wrong-length contradiction, the identity-output support cycle.
**Falsifying control:** if a failure the lint types as X would be better
atomized as Y by a model's judgment, the typed vocabulary is too coarse.

## 28. A goal atom is a fact, never a prohibition — Gary owns the sheet
The "design on paper" goal sheet (lessons 26-27) emitted atoms like "never
more than k characters" and "do not change the case of any character."
Running the actual prompting archon (the-fold/gary.js, P32) against the
sheet flagged exactly those clauses as information-not-prohibition: telling
a small model what to avoid is how it learns to say it. The reframe is the
user's own decomposition insight ("don't let it even THINK about doing the
wrong thing"): state the OPERATION as a fact and let the structure carry the
constraint. "repeat s, then take the first k characters of the result" makes
the wrong length structurally unreachable, so no prohibition is needed. The
parser now emits facts; Gary's check on the reframed atoms: clean. A goal
sheet is Gary's bag — anything he'd refuse never reaches the mouth.
**Falsifying control:** an atom that regresses to a prohibition ("never",
"do not", "avoid") fails Gary's scan and the sheet is refused until reframed.

## 29. A truncated multi-part function is an attention collapse, not a token budget — decompose, don't re-ask
A 1.5b model asked to write `snake_string` (even-index chars then odd-index
chars) sometimes produced the FULL correct function and sometimes only the
even half (`'ace'`) — same model, same prompt. Measured: `eval_count=350`,
`done_reason=stop` at both `num_predict=512` and `2000` — the model stops BY
CHOICE, never a budget cut. It's an attention/sampling collapse on
multi-part functions: the second loop of a two-part function gets dropped
mid-generation, inconsistently. **The fix is not a bigger budget and not a
better prompt (Gary-clean atoms stalled identically) — it is the smaller
task.** Split the function into sub-units the model CAN each complete:
`even_chars` → `'ace'` and `odd_chars` → `'bdf'`, 6/6 trials complete and
correct; compose `even + odd` = the wanted result. This is exactly
code-build.js's shape (structure computed, bodies generated, assembled) —
the harness's goal-evolve should fall to it when a pass truncates, instead
of re-asking the whole. **Falsifying control:** a sub-unit that itself
requires two parts will truncate again — the decomposition must go until
each leaf is single-part, and a still-truncating leaf is the honest ceiling.

## 30. The arrangement, and its honest limit: "callable" is not "spec-conformant"
The mouth-field-fold arrangement (the-mouth-the-field-and-the-fold.md,
applied to code) is now a working driver: one prompt in, eoreader7 reads
the units AND each unit's own spec (the field), each unit is drawn with
ONLY its fragment (the void — single-part, language declared, so the wrong
path does not exist), assembled, and the folded code is tested. It worked
end-to-end: 6 units, 805 bytes, composed correctly (tick preserves fields,
toggle flips running, fmtTime/pad correct).

**The honest limit, found live:** the behavior probe checked CALLABILITY
("is each unit typeof function?") — and a unit that IGNORED its own spec
slipped through. The reading said logLine "returns a Completed MM:SS -
label log entry"; the drawn logLine returned only "MM:SS" (a fmtTime
clone). The swarm corroborated instead of verifying — the essay's exact
warning, in code. **A spec-conformance test per unit is the next
increment**: the probe must exercise each unit against its reading's own
spec (does logLine contain "Completed"? does it name the label?), and a
defection re-draws the unit (the spiral tightening), with the dissent
disclosed on the EOT.
**Falsifying control:** an arrangement whose probe passes while a unit
ignores its spec is not an arrangement — it is a museum.

## 31. The arrangement refused what the mouth could not carry — and that is the honest product
The mouth-field-fold arrangement (lessons 30) ran with the real swarm: the
field read named each unit's settle, the probe deep-compared (not reference
`===`), and a defection re-drew with a sharpened atom. Measured results:
fmtTime, pad, tick, toggle CONVERGED to spec; newSession and logLine were
REFUSED — the 1.5b could not reliably produce `label: \`Session ${n}\``
(argument interpolation, ambiguous against the literal "Session n") or the
"Completed MM:SS - label" composition. The spiral re-drew 4× each, failed,
and DROPPED the units rather than landing a non-conformant fake.

**This is the essay's bet working, not failing:** "the final product must be
able to show its scars... refuse what it cannot carry." The product is an
honest 4-of-6 widget with the dissent disclosed on the EOT — not a false
6-of-6. Three things worth carrying:
1. The atom must name the FRAME: "label Session n" is ambiguous (literal vs
   `Session ${n}`); a sharpened atom ("using the function's OWN argument,
   never a timestamp") makes the wrong reading structurally impossible.
2. A unit that fails its settle 4× is a capability wall at the mouth, not a
   prompt bug — the spiral refuses it rather than re-asking forever.
3. The settled product should be 4-of-6 + a typed `refused` list, never a
   silent 6-of-6 with broken units.
**Falsifying control:** if a bigger mouth (or a per-argument atom) lands
newSession/logLine to spec, the 1.5b wall is real; if it still fails, the
spiral's refusal is the honest ceiling and the widget ships without them.

## 32. The falsifying control on lesson 31: the wall was the atom, not the mouth (mostly)
Lesson 31 claimed newSession AND logLine were 1.5b capability walls. The
falsifying control (lesson 31's own) resolved it: with atoms that NAME THE
ARGUMENT ("label the string Session followed by the argument n"), newSession
and tick both converged to spec — `newSession(1)` → `{seconds:0,
running:false, label:"Session1"}` ✓, `tick` keeps all fields ✓. The earlier
failures were the VAGUE atom ("label Session n" — ambiguous between the
literal string and argument interpolation), not the mouth.

**The one true wall, proven:** logLine — "returns Completed MM:SS - label
from two args" — failed 4 settles, the 1.5b repeatedly drew a fmtTime clone
(returns only MM:SS, never "Completed"/label). The swarm REFUSED it. The
final widget is 5-of-6 units landing to spec, logLine missing with the
dissent on the EOT — never a fake 6-of-6.

**The rule the control earned:** when a unit fails its settle, FIRST sharpen
the atom to name the argument and the exact output shape; re-draw. Only when
a sharpened atom still fails across attempts is it a genuine mouth wall —
and then the refusal (unit dropped, disclosed) is the honest product.
**Falsifying control:** a bigger mouth drawing logLine to spec proves the
1.5b wall; the atom was already sharp.

## 33. The surf-and-hunt: when prompted, the system goes and gets what it needs
The arrangement (lesson 30-32) started as a passive local lookup. The key
reframe (user direction): the system must HUNT on the fly. When a framed unit
isn't in the local corpus, it searches, fetches the canonical source, extracts
the function, verifies the frame, and lands it with provenance — the mouth
writes only the irreducible residue. Proven live: the arrangement needed the
Game of Life units; a real hunt (DuckDuckGo via explore-server's /api/web/
search, then raw.githubusercontent fetch) landed a complete, canonical
GameOfLife.js holding numNeighbors (8-cell frame), updateBoard (the 2/3
willLive rules verbatim), printBoard (the O/space renderer) — a 1:1 map to
the units the arrangement had failed to draw. **The hunt is the third leg of
the essay: the field remembers (local corpus), the watchman hunts (Ranke's
injected search/fetchFace chase when the field lacks the frame), the mouth
writes the residue.**
Three rules the hunt earned:
1. Match by FRAME, never name: the local corpus's `neighbors` was a
   knowledge-graph affinity (same name, different world); the hunted
   `numNeighbors` sweeps 8 grid cells — the frame decided which was real.
2. The hunt needs a gate (P182/Ranke): search only when the local field
   genuinely lacks the framed unit; a page that cites nothing licenses no
   hunt (the Dracula gate).
3. Provenance rides every hunted unit: the byte address of the fetched
   source, disclosed on the EOT — a hunted unit is a cited thing, never a
   free-floating implementation.
**Falsifying control:** an arrangement that hunts a unit, fetches it, and the
fetched code fails the frame check (a "game of life" page that isn't) must
refuse it and disclose — never splice a wrong-world function in.

## 34. The hunt is wired; its two limits are named (not hidden)
The surf-and-hunt (lesson 33) is now built into the arrangement's build loop:
corpus-autofill by frame → WEB HUNT (search the unit's frame, fetch the top
raw source, extract the framed function, verify, land with provenance) →
mouth for the irreducible residue. The hunted GameOfLife.js yields
numNeighbors / updateBoard / printBoard, each frame-matched. Two limits,
named from live runs:
1. The hunt prefers RAW SOURCE (githubusercontent, .js, gist), not tutorial
   pages — a GeeksforGeeks inline-HTML result extracts nothing, so the query
   must name the frame AND prefer raw paths; extraction must handle inline
   scripts too (snipAny: bare decl OR const arrow OR object method).
2. A hunted function is only as good as its frame check — a "game of life"
   result that isn't (wrong world, same name) must be refused and disclosed,
   never spliced. The mouth remains the honest fallback for units the hunt
   cannot frame-match.
**Falsifying control:** an arrangement that lands a hunted unit whose frame
fails (e.g. an affinity-neighbors into a grid) is a museum, not an
arrangement — the EOT must disclose the refusal.

## 35. Heimdall's probe model can't see a per-model wedge
A model server can wedge PER MODEL: qwen2.5-coder:1.5b hung >10s on every
generate while gemma2:2b answered in 0.7s, and ollama /api/ps showed only
gemma resident. Heimdall's remedy gate refused the restart — its probe
(gemma) answered, so it read "busy, not stuck" — and the probe model was
NOT the wedged model. Unloading the coder (keep_alive:0) did not clear it;
only a full server restart did. **The probe must test the WORK model, not a
fixed probe model** — a per-model wedge is invisible to a probe that uses a
different model, exactly lesson 23 one level deeper. The forced restart was
justified by direct evidence (coder hangs, gemma answers), disclosed on the
record. **Falsifying control:** if the probe's model is swapped to the
wedged one, the gate should refuse-to-restart only when THAT model answers —
a probe that can't see its own work model is a probe with a blind spot.

## 36. The ant loop's own wall: the mouth cannot write a brace-walk at 1.5b
Sent ants to improve the extraction function (the snip/hunt extractor). The
recursion worked as designed — each ant tested against 5 extraction cases,
failed, atom sharpened, re-drew — but four ants drew the SAME defect class:
a structural brace-walk that is coherent in intent and wrong in detail
(parens counted instead of body braces; `depth` starts at 0 so the walk never
runs; absolute vs relative indexing). The 1.5b cannot reliably WRITE a
correct multi-step char-walk, however sharp the atom. **The lesson the whole
session already earned, reapplied:** do not keep re-drawing the mouth —
decompose further. The extraction walk is canonical, structured code; it
should be HUNTED (the web holds a correct one) or SNIPPED from the corpus,
exactly like the Game of Life units. The mouth writes only what the field
and the hunt cannot supply.
**Falsifying control:** if a 1.5b ant ever passes all 5 extraction cases
with a hand-written brace-walk, the wall is not real; if the hunted/snipped
extractor passes them instead, the wall is confirmed and the hunt is the
right third leg.

## 37. Proof of modification: the corpus walker spliced in, 5/5 extraction cases
The ant loop (lesson 36) failed to draw a correct brace-walk at 1.5b. The
fix was not more ants — it was the corpus: `the-fold/code-scout.js` already
holds `walkBraceBlockEnd`, a tested, string/comment-aware structural walker
used by `declaredReferents`. SNIPPED it from the corpus (byte provenance,
kleenUp's law: no regex, the corpus's own tested mechanism) and spliced it
into `arrangement.mjs`'s `snip`, replacing the fragile line-walk. Verified
against the ants' own gate: **5/5 extraction cases pass** — fenced, prose-
wrapped, truncated-brace (appends the missing `}`), arrow, bare. This is the
proof of modification: a real change to real code, sourced from the corpus,
tested against the failing cases, disclosed with provenance. The mouth could
not write it; the field already had it.
**Falsifying control:** if the corpus walker had failed any extraction case,
the splice would be reverted — a corpus snipe is only as good as the test it
passes, never trusted by origin.

## 38. Many small servers, one picker: sticky, resident first, measured wait, rotate ties (2026-09-21)

The ask was "the fastest response for every prompt, per-server round robin".
Our incentives are not a GPU farm's: the models are small, the box is
shared, and a turn's cost is the COLD LOAD and the PROMPT EVAL, not
generation throughput. Measured on this box before anything changed: one
turn 7.8s wall — load 10ms (resident), prompt eval 1.7s for 287 tokens,
generation 4.4s for 32 tokens. A naive round robin across N servers would
pay a cold load on every server for every model and throw away every
prefix cache.

So `heimdall.mjs` "INFERENCE HOSTS" picks, in order: (1) STICKY — a session
stays on the host that last served it while it is up and the model is
resident there; (2) RESIDENT FIRST — a host with the model in `/api/ps`
outranks one that must load it, unless its expected wait exceeds the
other's wait plus that other host's OWN measured load cost (its
`load_duration` EWMA, never a constant); (3) SHORTEST EXPECTED WAIT —
in-flight × measured mean turn ms per host per model, unmeasured hosts at
the mean of the measured so they are tried, never starved; (4) ROTATE
TIES. `proxy-runner.mjs::streamOllamaChat` asks the picker for the host
and reports back on the done chunk and on failure. Configure with
`ER7_OLLAMA_HOSTS="name=url,name=url"`; the default is the one local
daemon, so a one-box setup is unchanged.

Measured live with a second daemon on :11435 sharing the model store: 14
turns spread 8/6; a session's first turn on a cold host 7.0s, its sticky
repeat 0.8s (prompt eval 13.1s → 0.35s — the prefix cache is the whole
win). Falsified: both daemons killed → `host_down` ECONNREFUSED on each,
turns refused with words, `host_back` within one cadence of the `/api/ps`
probe answering. A timeout never stands a host down (last state holds).

What is NOT the picker's: the mechanical race that skips generation, the
one-window rule (lesson 22), and residency itself. The picker only chooses
WHERE; those decide WHETHER and HOW MUCH.

Also landed the same day: every turn is attributed to the SERVER whose page
sent it (`proxy.mjs::surfaceFromRequest`, Origin/Referer port → registered
surface), so the watch shows fold traffic on the fold's span instead of
everything on er7; the watch (`browser/heimdall.html`) shows the prompt in
and the words out per server, filterable, with the actual text riding the
bridge and each server's name lit by its activation.

## 39. The selector was written in English, about essays, about one river (2026-09-21)

The division this engine runs on is sound: the mouth is drawn wide with a
minimal positive prompt, and the machinery decides what survives. The mouth
was already general — it will continue a piece in any language about
anything. The SELECTOR was not, and nobody had looked at it in another
script.

Three things sat in the composition loop. A stopword set, in English. A
"claim variants" set with `played`, `significant`, `role` — and `cumberland`
and `nashville`, the topic of one run, compiled into the engine. And a
tokenizer, `replace(/[^a-z' ]+/g, " ")`, which strips every character outside
the ASCII lowercase range.

Measured before the repair, over the same five sentences in six languages:
in Chinese, Arabic, Russian, Hindi and Japanese, EVERY sentence's claim core
was the empty string. The first sentence of a document deposited `""` in the
global claim registry and every later sentence in that document collided with
it. Not a degradation — a wall: a non-Latin piece could never exceed one
sentence. The paragraph splitter, `/(?<=[.!?])\s+(?=[A-Z])/`, required an
ASCII capital after the break, so those paragraphs never split at all: one
candidate, one refusal, an empty section. Both failures are silent. Nothing
logs "this language does not work here."

The comment above the window builder's claim core read "omnilingual, since it
keys on the referent-relation structure, never a lexicon." A hand-written
English lexicon sat on the line below it. A comment is not a measurement.

`native/the-fold/admission.js` is the repair, and it holds one rule: no
vocabulary is declared, all of it is MEASURED off the material at hand.

Which of the material's words carry no claim identity is answered by an exact
null rather than a list. A word said k times, dropped into N sentences
independently, would be expected to occupy `N · (1 − (1 − 1/N)^k)` of them. A
word occupying at least that many is spread as widely as chance allows — it
belongs to the whole material, not to any claim in it. A word occupying fewer
has clustered, and clustering is what a claim looks like from outside. A word
said once has no distribution to measure and is never called variance, which
is a statement about what one observation supports, not a tuned cut. So
`cumberland` and `nashville` are variance words of the Cumberland material
because that material says them throughout — and the engine holds no word of
any language. Sentences and words come from `Intl.Segmenter`, which knows
that `。` ends a Chinese sentence and where a Japanese word stops.

The capitalization name gate is a SILENT NO-OP in every caseless script, and
worse in Cyrillic, where `replace(/[^A-Za-z]/g,"")` empties every token before
the gate sees it. `nameGate(ground)` now says out loud which guard is
carrying: `capitalization` where the script has case, `referent-index` where
it does not. Naming the ceiling beats faking a floor.

Falsified in `native/the-fold/admission-falsify.test.mjs`, 15 tests over six
scripts, including the exact collision that was the wall. The first pass
failed: a shuffle-sampled null could not discriminate in a script where most
tokens occur once, and it called every Chinese word variance, which is how
the analytic null above replaced it.

## 40. Thirteen topics, none of them a turn: a selector that admits only matter emits a list (2026-09-21)

The projected Cumberland essay was grammatical, grounded, free of
hallucinated names, and not an essay. Read against the archons it fails
everywhere at once: no holon has three parts, no cut lands anywhere, the
fortunes never rise or fall, nothing is estranged, no paragraph licenses off
what the one before it grounded. Thirteen paragraphs, each a fresh assertion
about the river, none of them answering the end of the last.

The prompt was not the cause. The continuation prompt was already there —
`paraTask` opens on the prior landing and asks the mouth to continue the
piece. The mouth did continue it. The SELECTOR then threw the continuation
away.

A sentence was admitted only when it was GROUNDED and its claim was NEW. Both
tests reward a fresh assertion about the subject and punish a sentence that
TURNS: a bridging sentence carries pronouns and connectives, resolves to few
referents, and has a thin claim core. So the survivors were, structurally,
exactly the thirteen topic-restatements. The fold collapsed duplicates but
could not create motion, because motion had no road in.

There are now two roads. MATTER: grounded, claim-new — what the old selector
did, and what builds a piece's substance. MOTION: the sentence bonds to where
the piece just landed HARDER than two arbitrary passages of this material
bond to each other, carries no invented referent, and is not meta. The line
it must clear is measured off the material, not chosen — a dense, repetitive
ground demands a tighter bond than a loose one, and a sentence that bonds no
better than chance is not continuing anything, it is merely speaking the same
subject. Matter alone is a list. Motion alone is drift.

A candidate that repeats a deposited claim is refused on BOTH roads: motion
is not a licence to say the same thing again. The verbatim-relanding guard
that used to be "70% word overlap with the prior landing" is gone — a
hand-set fraction refuses exactly the bridging sentences the motion road
exists to admit. It is now a mechanical identity: the candidate's claim core
IS the prior landing's.

Every admission records the road it came in on, and every refusal names its
kind and its given, so a piece can state what it cut and who said it.

The meta filter was a regex listing `the user`, `this essay`, `asked to
write` — which catches nothing in any other language. The mechanical form is
language-free: a sentence of the piece speaks the MATERIAL'S vocabulary, a
sentence about the task speaks the INSTRUCTION'S. Measure both bonds and
compare. No list of forbidden phrases, in any language, ever again.

Nothing in the selector is essay-shaped any more. The same machinery runs
over a story, a report, a spec or a letter: the caller hands it the ground,
the prior landing and the registry, and the register decides nothing.

## 41. One engine, two adapters: code keeps its API, the pipeline is shared (2026-09-21)

The essay work and the coding work were two pipelines for one movement. The
arrangement's law — mouth-last, hunt-first, multiple-framings, falsify-or-die —
turned out to be the SAME law the essay's fold runs: the fold re-admits every
sentence (invented referents, meta, hollow-actors refused), dedupes by
claim-core, names gaps and residual. The coding arrangement does the same with
settles, spec-words, and frame checks.

The merge: `pipeline/engine.mjs` owns the ORDER, the RETRIES, the SCARS, the
EOT, the mouth. `pipeline/adapters/code.mjs` pulls out what is truly different
about code (JSON reading, box-computed settles, the corpus's structural
brace-walk snip, node --check + spec-conformance, the widget). 
`pipeline/adapters/prose.mjs` pulls out what is truly different about prose —
and DELEGATES to eoreader7's falsified organs (topicPhrase, voidCellsFor,
wideToAtoms, foldWideToShape at commit 2a033d7), never reimplementing them.
Code keeps its own API (arrangement.mjs CLI, --example settles); prose gets its
own entry (essay-arrangement.mjs); the pipeline between them is one file.

Two falsifications surfaced by the merge, both disclosed on the record:
F4 — a settle computed by the box must call the UNIT'S name (`liveCount(...)`),
never the example grid's variable name (`alive(...)`), else the settle can
never resolve; F5 — a callability probe is corroboration, not verification: a
drawn `willLive` with an EMPTY body passed the spec-word probe and failed the
box's test, exactly the essay's "the swarm corroborated instead of verifying"
made code. Both are the kind of defect the shared engine now surfaces by making
the settle a box computation rather than a mouth guess.

## 41. A spiral with no re-entry is a line: the layers, hyper-defined, with a revisable product at each (2026-09-21)

The fold → spiral → concrescence pipeline ran once, in a line. The detector
wrote "not every unit is required (still a list); strain still moving" to
the ledger, and the run ended. A failing signal never became a revision.
That is how "The tension [gap]: (empty)" shipped inside a finished essay —
the fold had named the gap, correctly, and nothing was listening.

Two of the detector's inputs were dead on arrival. The unit satisfaction was
"strain 1 if the text is over 25 words", so removing any beat from any piece
longer than a sentence never moved strain, and the removal test reported
"still a list" on every piece, forever — a verdict the code could not NOT
give. And the Zinsser pass cut from a hand-written English list of thirteen
intensifiers, which found nothing in any other language and nothing this
material's own inflation happened to use.

`native/the-fold/spiral-contract.js` is the user's law made mechanical:
"hyper-defined layers, explicit revisable work product at each loop; low sets
possibility for high, high probability for low." Every layer — ground, plan,
draft, fold, tighten, arrive — produces ONE typed product, and every product
faces TWO gates. The LOW gate asks only whether there is anything for the
next layer to work on; fail it and the layer has nothing, and says so. The
HIGH gate asks whether the product is good enough for the next layer to ACT
on; fail it and the gate names the missing signal, and that signal IS a
revision the same layer runs, bounded by a budget. The revised product
supersedes the old one on the ledger; the old one is kept. Revision is the
loop; the budget is what makes it a spiral and not a circle.

The revisions, concretely. A draft section with matter but no motion is a
fresh topic, not a turn: its redraw opens on the prior landing ALONE, no
window — the window is where the mouth finds fresh topics to re-assert. A
gap beat is the fold's own statement of the next section to draw: it opens
on the last sentence of the beat before it. A cut that broke a beat's link to
its neighbour reverts. The satisfaction behind the removal test is now
`chainStrain`: the count of adjacent beats whose bond does not clear the
material's null — remove a beat the chain needs and its neighbours face each
other and fail. Inflation is a word the ground never said in a sentence
whose grounded claim stands without it — no list, any script.

Nothing in a gate is a hand-set threshold. Gates read measured quantities
(the material's variance, its bond null) or structural facts (a beat is
empty; no sentence turned). The only numbers are BUDGETS
(`ER7_SPIRAL_BUDGET`, default 1), and a budget is a cost, not a judgment.

The ledger now carries a `ground` line (licensed or not — an unlicensed
ground spends no redraw, because there is nothing to redraw from) and a
`contract` line naming every layer's verdict, attempts, and whether the
budget ran out. A piece that is not an essay says, on its own record, which
layer did not pass and what it tried.

Falsified in `native/the-fold/spiral-contract-falsify.test.mjs`: the dead
detector is reproduced (removal never degrades), the measured one moves; a
failing high gate becomes a revision and a budget ends it with exhaustion on
the record; inflation is found in Chinese where the list found nothing. The
first pass failed twice: `claimCore` reads six words, so a later word's
removal could never change it; and a three-character length guard was a
Latin threshold in disguise — a Chinese word is one or two characters.

The first live run on the new code had NO ground: the web organ retrieved a
UN convention for the phrase "in all their forms" and the planner read the
ask as a story. That run is the ground gate's own case — everything below
it was unlicensed, and the record now says so instead of shipping it.

## 42. Falsified live, twice, before the first grounded run had even folded (2026-09-21)

Read straight off the ledger of the first grounded run on the new selector:
the last sentence of section 4 was the whole of section 5, verbatim. The
registry cannot have missed it, so it came through the FLOOR — the branch
that kept "the first grounded sentence" when nothing survived the snip, and
never asked the registry. A repeated floor is worse than a named gap: an
empty section is now a product that fails the draft gate's LOW, and the
fold's gap redraw is what handles it, admitted by the same rule as every
other sentence. The floor is gone.

Second: "carved its path through the landscape, shaping the city's growth"
and "...shaping the city's development" both survived — they differ at the
sixth word of a six-word core. The surface core is brittle at its tail. The
principled question is whether a sentence brings NEW MATTER: grounded,
non-variance words it asserts that no deposited sentence asserted. The
first pass of that rule failed on "it": in a small ground a pronoun occurs
once, so it is not variance, so one pronoun licensed a restated claim. The
second pass measures the fraction against the null: two arbitrary passages
of the material share at most the bond ceiling, so an arbitrary new
sentence brings at least (1 − ceiling) new matter; a candidate whose fresh
fraction is at or below the ceiling is a restatement. On real material the
ceiling measured 0.333 and the restatement's fraction 0.100 — refused. On a
five-sentence toy ground the ceiling is exactly zero by construction (every
shared word is variance, and bond strips variance), and the rule degrades
to "no new matter at all". Test on real material, or the null is a toy.

The registry now deposits matter words beside claim cores (`w:<word>`),
and every refusal carries a basis — a refusal with an empty basis was the
last test's only failure.

### 38a. The reload storm's actual cause, and what "test, falsify, implement" found (2026-09-21, later the same day)

Five levers were proposed; here is what survived contact.

**The reloads had a name.** `~/.ollama/logs/server.log` said it plainly:
"llama-server model predicted to exceed available memory, evicting —
predicted 6.2 GiB, predicted_num_ctx 4096, system_limited=true". The blob
was **olmo2:7b**, and the caller was `proxy-runner.mjs::keepResidentDuringSetup`,
which pinged a HARD-CODED "olmo2:7b" during every long-form setup, roughly
every fifteen minutes. Each ping loaded 6.2 GiB, the daemon evicted the 2B
chat model and the coder model to make room, and the next chat turn paid
the reload. The post-mortem's one-window rule was right and was not the
cause this time: the model that reloaded was being EVICTED, not
re-windowed. Fix: olmo2:7b deleted from the machine (user direction), the
giver registry and every default now name gemma2:2b, the keep-resident ping
takes the job's own model, and `code-build.js` no longer declares
`num_ctx: 4096` (the last caller that did). Falsified: six spaced turns
after the fix, zero `evicting`, zero `loaded runners` in the daemon log.

**Two Ollama daemons on one box is not two servers.** They share the same
unified memory and cannot see each other's residency. The second daemon
answered `/api/ps` but returned 500 on every chat after 60s ("system
limited"), and every pick sent to it failed. The host picker is for hosts
on OTHER boxes (or a LAN); on one box the hive is one daemon and
`OLLAMA_NUM_PARALLEL`. Also fixed from this: a host that answers a 5xx is
stood down like a refusal (it was counted "up" while failing).

**The gate could not see a burst.** Host in-flight rises only when a turn
reaches the daemon, seconds after admission (the mechanical pipeline runs
first), so twelve prompts arriving together looked idle at the door.
`noteAdmitted` now stamps each admission and `hostBegin` consumes the
oldest; the expected wait counts admitted-not-started turns spread over the
up hosts. Falsified under a 2s SLA: one typed `expected_wait` 429 with
"~14s on local (7 ahead at ~2.0s each)". Stale stamps expire at 60s, so a
turn answered mechanically never leaks upward.

**The session handle was one global.** `_turn.sessionId` is a single
variable, so under a burst every concurrent turn read the LAST session and
the picker stuck all of them to one host while the other sat idle
(measured: three of eight waited 9.5s). `turnScope` (AsyncLocalStorage)
now carries each turn's session to the call site.

**Falsified against myself.** I claimed the residency holon convicts on the
swap LEVEL; it already judges on churn — only its label printed the level.
The label now names the test that fired. I also claimed ~1.8s per turn was
lost outside the model; measured, it is 80–250ms, and post-processing
already skips turns without code. The first two turns after a proxy
restart do pay ~25–30s of lazy loading, which is a startup cost, not a
per-turn one.

**Not done.** The window-shape guard (`host_shape_mismatch`) is written and
unit-consistent but could not be exercised on one box. Pre-warm never
triggered because the picker routed the cold host directly. The hive
across boxes (delegated controllers, headless controller, room mouths
routed) remains the plan in MULTI-SERVER.md and INFERENCE-HOSTS.md.

## 43. The run that measured the harness, and the meta rule falsified twice (2026-09-21)

The second grounded run came back with eleven of twelve sections empty, and
the first reading was that the new selector had refused everything. It had
not. The job's own error said "box is pressured — heimdall holds the turn":
under a load average above forty, the first draw of each section timed out
on its first byte and the retry was refused by the traffic-jam discipline,
so eleven sections had nothing to admit. The ledger said "composition
section, strain 0" for each — the harness was measured and the record
blamed the selector. Lesson 88's law again: state the reader's
configuration before claiming anything about the material. A part line now
carries the draw's failure ("draw refused: ...") and the snip summary (kept
N of M, matter/motion counts, refusal kinds), so an empty part says which.
And the prior landing is the last NON-empty part, so one empty section no
longer closes the motion road and the redraw for every section after it.

The meta rule was falsified twice, offline, before it went live again. First
form: a sentence is meta when it bonds to the instruction harder than to the
ground. Feeding the void cell's question into the instruction (to catch the
cell's wording leaking into prose) made "The Cumberland River shaped
Nashville's growth as a port" meta, because the task names the river and the
growth, and on a six-sentence ground those words are not yet variance. The
subject's own words cannot discriminate: a word the instruction shares with
the ground IS the subject; only a word the instruction alone has is
scaffolding ("write", "essay", "kind", "hold", "material"). Second form:
count scaffold hits against ground hits, variance stripped — and it then
refused a TURN ("But they are not the whole of it, as...") because its
connectives were scaffold words. A turn is exempt: a sentence bonded to the
prior landing above the ceiling is the piece continuing, and a chain cannot
start from a leak because the first leak has no prior to bond to.

Two of the test failures on the way were the tests' own: a turn written to
share one word with its prior is not a turn by the measure (0.182 against a
ceiling of 0.333 on real material), and a meta assertion that omitted the
variance the real call always passes. Write the test's turn so it clears
the ceiling it is testing.

### 38b. The daemon had one slot (2026-09-21, evening)

`OLLAMA_NUM_PARALLEL` was 1 on the live daemon — `launchctl setenv` had
been written by setup-proxy.sh but Ollama.app was never relaunched after,
so every request from every caller queued single-file. Measured while
another session's eval drew on the same model: model work 0.5s, waited
inside the daemon 8.7–11.5s. After a REAL relaunch with four slots
(`osascript quit` alone did not restart it; the process had to be stopped):
waited 0.0s, turns 0.5–3.6s under the same eval. Heimdall's own restart
now defaults `OLLAMA_MAX_LOADED_MODELS` to 3 like the script, so the two
config sources agree (post-mortem follow-up 2 closed).

## 56. A per-language competency number is only as good as the harness's own failure modes — seven of them, found live (2026-09-21)
Built a competency ledger per (language × model): a floor gate (compile/parse) and a call test on
held-out cases, with a measured null (`native/organs/lang-competency.js`, `lang-validators.js`,
`lang-levers.js`; 27 spec-stated tasks × javascript, typescript, python, ruby). Every row of the first
tables was wrong for a reason the harness owned, and each was found by looking inside a "wall" before
believing it:
1. **Draws at temperature 0.2 are one sample.** Five seeds gave five byte-identical outputs from
   gemma2:2b; "12 draws per cell" was 4 samples. The unit of evidence is the TASK; one draw per task.
   Independent draws exist only at a higher temperature (the best-of-k arm).
2. **One crash zeroed every case.** All cases were called in one expression, so an exception on the
   empty-grid case scored every held-out case as failed and inflated the walls. Each case is now
   isolated (`{"__error": …}` for that case only).
3. **A spec's arity was ambiguous.** "takes a grid, a list of rows of integers…" read as two
   parameters, so every call raised a TypeError. State parameters ("takes exactly one argument, a
   grid, which is…"). Three ambiguities in agent-authored specs surfaced this way (repeat_prefix with
   k > len(s); kv_lookup with "=" in a key; the grid arity).
4. **A held-out case must be licensed by a spec sentence** (lesson 24) — and a case whose expected
   value equals the "none" sentinel (`second_largest([0,-1]) → -1`) cannot discriminate: a constant
   -1 passes it.
5. **The toolchain is part of the reading.** Ruby here is 2.6 (no `Array#tally`); a model that writes
   modern Ruby fails for a toolchain reason. Every row records the toolchain version.
6. **TypeScript's gap was naming drift, measured, not assumed:** 10 of 27 raw drafts do not define the
   stated function name, 1 of 27 with two examples in the ask. The fix is the examples (and a
   diagnostic naming the missing identifier), never an alias — an alias makes the test pass while the
   code ignores its spec and hides the class from the ledger.
7. **A spec is a stimulus.** Editing one in response to the model's behaviour is tuning the test to the
   model. The rule that held: change a spec only to state parameters or license a case, uniformly across
   the tasks it applies to, and key every row by a hash of what it asked and checked (`specHash`) so
   two wordings never pool.

What the levers earned, on 27 tasks at one draw each: examples fixed TypeScript naming; a repair loop
fed runtime errors and visible got/want did not beat examples alone (49 of 108 runs used all four
rounds and still failed); deterministic code extraction added nothing measurable. Four tasks
(`repeat_prefix`, `shortest_palindrome`, `top_counts`, `max_depth`) fail in every arm for reasons visible
in the drafts. The ledger does not rank languages: 27 tasks and one draw cannot separate 12/27 from 13/27.
**Falsifying control:** a per-language claim is real only if it survives (a) per-case isolation,
(b) a spec whose parameters and edges are stated, and (c) a task-clustered interval — and a wall is real
only after one draft has been read.

## 57. The second loop undid the first: rewrites are drafts, and the ground is the whole corpus (2026-09-21)

The part lines, now carrying their snip summaries, showed the selector
refusing three or four candidates per section as "repeat" — and then the
Ranke and Murch rewrite rounds ran over the sections and put back "Thomas
named Duke", "the 1812 flood", "the Convention" and "Thomas Jefferson":
the very invented referents the section snip had refused an hour earlier.
The rewrite rounds replaced a section with the mouth's text unexamined
(`documentLines[i] = fixText`). Any layer that writes prose is a draft
layer and faces the same admission; the alternative is a selector that
guards the front door while the back door stands open. Ranke's rewrite, the
Murch body, and the Murch per-finding model rewrite are now admitted
sentence by sentence by `admitWide`; a mechanical Murch edit (a computed
`mech.to`) passes as it is. A rewrite that survives nothing leaves the
section as it was and lands a refusal line with its given.

Two registry faults on the way. The registry was deriving matter words
from `usedSentences`, which also carries the WINDOW'S sentences (so the
mouth cannot copy them) — the material pre-emptied the matter vocabulary
before the piece said a word, and every grounded sentence read as a repeat.
Only admitted sentences deposit matter now (`matterRegistry`). And the
ground itself was six sentences of a twenty-five-sentence workspace file:
the chat surf's relevance cut, which is right for a turn and wrong for a
piece. A composition is written from everything the session admitted;
`groundingText()` includes the non-chat corpus documents in projection
mode. Twelve sections asked against six facts can only restate them, and a
selector that refuses the restatements is not the defect.

`ER7_PRESSURE_HOLD=0` is a harness knob for measured runs on a box whose
swap sits at 94%: without it every first-byte timeout ended a run before
its fold, and the run measured the harness. Production leaves it on. A
re-forged proxy does not carry the knob — check the process's env, not the
command that started its predecessor.

## 58. The prompt handed the mouth a narrative example, and the essay obeyed it for weeks (2026-09-21)

Every essay opened like a film — "Nashville's skyline… like a defiant fist
against the sky" — and no amount of work on the selector could touch it,
because the selector was faithfully guarding a piece that had been
mis-declared before a word was drawn.

`discovery.js` states its own law in a long comment: the machine's basis
prose is never offered to the model, so "a sentence that was never handed
over cannot be restated in any language." Eighty lines above that comment,
its own prompt handed the mouth this, as an `e.g.` for EVERY genre:

    "Begin in the middle of a concrete moment, in a real place, showing the
     senses; never a thesis, never a summary, never name the genre or the
     structure."

A 2b mouth copies an example. BOTH stored exposition framings in the live
sidecar carry that sentence verbatim. The declared exposition voice in
`register.js` says the opposite in capitals: OPEN THE PIECE WITH A THESIS.
The sidecar won, every run, because `framingFor` adopted the latest
footprint and nothing checked the voice — `stagingIsMachinery` had already
purged the identical defect one field over, in staging.

Three repairs, in order of how much they carry.

The example is no longer handed over: the slot is described by its structure
("an imperative addressed to the writer… it is never itself a line of the
piece") and carries no sentence to copy. A proposal that repeats one of the
ask's own instruction lines is refused and fed back down, the same way a
malformed one is. The possibility space is exempt from that check — the ask
deliberately hands over the phases the machine has seen, and ranking within
them is the mechanism working, not an echo. Getting that wrong broke the
omnilingual test, correctly.

PROVENANCE IS THE LOAD-BEARING RULE. Every framing recorded before today was
proposed under a prompt that handed over an example, so none of them is
evidence of what a mouth would say on its own. A framing is ADOPTED only
when it was recorded under `FRAMING_GATE`; the rest stay POSSIBILITY — still
counted in the impression, still telling discovery what this instrument has
seen, never becoming the voice a piece is written in. That is the low/high
law applied to the sidecar, it needs no vocabulary in any language, and it
heals itself after one run per genre. The two purges that catch the echo and
the prose-sample are its measured special cases, and the sample test says
out loud that it guards nothing in a caseless script.

THE RESIDUAL, AND THE DEEPER CAUSE. With the example gone, the fresh
discovery still proposed "Introduce the protagonist and their world" for an
exposition. The prompt asks every genre for "the arc its fortune takes", its
"felt releases", its "tension and how it is released". Those are story
questions; a small mouth answers them with story structure whatever genre
you name. So a discovered voice is now ADDITIVE ONLY: it fills a field the
register declares no voice for, and stands aside for one it does. A layer
above the base may buy precision; it may never contradict the base.

## 59. The ground was 94% a UN convention, and every gate measured it (2026-09-21)

The ground line disclosed it the moment it started naming its sources:

    corpusDocs 4, corpusChars 38569
    cumberland.md, wikisource:…:prohibit, wikisource:…:slavery or servitude,
    wikisource:…:in all their forms

The operator gave a 2,263-character file about a river. The Wikisource organ
fetched three pages of a human-rights convention on stray phrases, and they
entered the same corpus. Everything downstream then measured that text: the
variance vocabulary, the bond null, which names count as invented, what a
repeat is. I spent six iterations tuning a bond ceiling that this material
was pinning.

`session.corpusIndex` is exactly the set the operator supplied — workspace
files and attachments — and opportunistic fetches never enter it. So the
discriminator needs no string parsing and no source-name vocabulary: when
the operator gave material, that IS the ground. A fetch may still inform the
reading; it cannot become the field the piece is measured against. The
ground line now states both sides, and the excluded bytes are named.

Live, after: ground 2,263 chars, one document, 25 sentences, bond ceiling
0.333. Excluded: 36,306 chars in three documents, each named. That is what
P88 means by stating the reader's configuration — the disclosure found the
bug that six rounds of measurement could not.

## 60. The fold's shape was one river, spelled out (2026-09-21)

`DEFAULT_ESSAY_BEATS` charged its five slots with `waterway`, `headwaters`,
`basin`, `steamboats`, `cotton`, `tobacco`, `flood`, `levy`, `riverfront`.
The fold assigns each claim to the beat whose charge its words touch, so
that shape folded exactly one subject and turned every other one into gaps.
"The tension [gap]: (empty)" shipped inside a finished essay for that
reason, and I spent an afternoon reading it as a selector failure.

`beatsFromGround` derives the shape instead, and the law does the work.

THE GROUND SETS THE POSSIBILITY. A writer's paragraph break is a declaration
that a part ended, and it costs nothing to believe it — so the material's own
seams are the parts that can exist. A seam's CHARGE is the words that occur
in it and nowhere else in the material. Distinctiveness is exact here rather
than thresholded: a word in one seam distinguishes that seam, a word in every
seam distinguishes nothing. The TITLE is the charge's own first words, so a
beat is labelled in the material's language and not in ours.

THE ASK SETS THE PROBABILITY. When the material declares no seam, the ask's
count divides the sentences, and the record says which of the two happened
(`the material's own seams` or `the ask's count over an unseamed ground`).
A ground that declares its own seams is not overridden by the ask's count —
the possibility bounds the probability, never the reverse.

Measured on two subjects with the same code and no table:

    river  → 7 beats: kentucky/miles/waterway · shawnee/native/american ·
             donelson/founding · cotton/tobacco/steamboats · flood/danger ·
             completed/created/lake · today/handles
    bongo  → 4 beats: bongo/antelope/central · browse/night ·
             logging/cleared/lowland · captive/herds/zoos

Pinned by a test that asserts no word of the old table can reach a bongo's
shape, and by one that asserts every charge word belongs to exactly one beat
— a word charging two beats distinguishes neither.

## 61. Motion was never measured, it was counted — and counting cannot see a turn (2026-09-21)

Two finished runs reported `0 motion` in every single section and spent a
redraw on it each time. Two faults, one shallow and one at the root.

The shallow one: `admit` returned on the grounded branch BEFORE the turn was
ever tested, so a sentence that both asserted something grounded AND answered
the prior landing was recorded as matter alone. Motion could only be reported
for a sentence that grounded to nothing — the rarest and weakest kind of turn,
and the best sentence in a piece does both. A sentence is now judged by what
it does, not by which test fires first, and the `both` road counts on both
sides of the gate.

The root one. The motion test asked whether a candidate's words overlapped
the prior landing harder than two arbitrary passages of the material overlap.
I measured it against the source's OWN adjacent sentences, which are true
continuations by construction:

    the string rule fires on 0 of 24 true continuations

Because `bond` strips the material's variance words, and cohesion lives in
exactly those — the pronoun, the repeated topic noun, the connective. Strip
them and adjacent sentences share nothing, which is precisely what makes them
different sentences. Counting the variance back in barely separates anything:
true pairs mean 0.178, arbitrary pairs 0.161, and a per-candidate rule fires
on 67% of true pairs and 50% of false ones. Lexical overlap does not know
what a turn is, in either direction.

A turn is a sentence that takes up something the piece just put down — a
REFERENT, not a string. The repo has had a referent model the whole time, and
the standing rule says so: spans point INTO an entity model, and
occurrence-counting over strings is not one. I had built motion as occurrence
counting. `continues` is now supplied by the caller from the reading's own
proposition index: the candidate is a turn when it resolves a referent the
prior landing also resolves. The string test survives only as the stated
fallback for a caller with no index, which is honest about being weak rather
than silently deciding.

The measurement that retired it is now a test, with the guard turned around:
if the two populations ever separate, the test fails and says the referent
rule may no longer be needed.

## 62. The piece as assertions before prose: the EOT draft, and three ways it lost bytes (2026-09-21)

The generation pipeline now runs in the order its own laws imply: prompt,
register, void, ground, EOT DRAFT, floor, PROSIFIED PASS. Structure first,
computed mechanically; the mouth is handed the computed answer and only has to
say it. (`native/the-fold/eot-draft.js`, `prosify.js`, `pipeline-run.mjs`.)

The draft's unit is the WITNESSED SPAN, not an extracted triple. Measured on
the 25-sentence Cumberland ground, the relation readers yield 9 usable triples
and 2 respectively, so a draft of triples silently drops most of the material.
The round trip from a language into assertions and back is lossy by the
user's own account, which is why provenance is kept: every point carries the
exact bytes it came from, and a test asserts that `ground.slice(start, end)`
reproduces each one.

It still lost bytes three ways before the tests pinned it. A splitter that
matched sentence BODIES (`/[^.!?]+[.!?]+/`) cannot cross a period, so "Dr.
Thomas Walker" broke in two, "The U.S. Army Corps" lost "The U.S.", and
"crested at 51.86 feet" failed to match at all — the whole 2010 flood sentence
vanished. Splitting on BOUNDARIES instead puts every byte in exactly one
sentence. And a 40-character floor on paragraphs silently dropped short ones.
A draft that loses bytes defeats the reason for drafting from spans.

The law runs at the draft level too: the material's seams set which parts are
POSSIBLE, and the ask chooses among them only with words held by at most half
the parts — "the floods and the dams" draws exactly the flood and dam parts;
a word most parts hold is the subject and chooses nothing.

## 63. "Carried" has to mean the anchors survived, and the recursion alters in place (2026-09-21)

The prosified pass draws each part whole, finds what it failed to carry, and
draws only that again, at the finer grain, with the source sentence as the
floor. The first live run: 14 calls, 39 seconds, every part non-empty, 1 fact
of 23 at the floor — against 15 minutes and mostly empty sections on the old
path. It also passed three real errors, because "carried" meant "a surviving
sentence shares a word only this fact has": the 1927 flood was given the 2010
crest, "these groups" stood in for the Cherokee, Chickasaw and Shawnee, and a
finer draw judged against its one fact alone counted "river" as carrying the
French traders.

A fact is carried only when its ANCHORS survive: every number it states — its
extent, which makes it true of one span and false of another — and every
distinctive name, where any non-subject word of the name keeps it
("Robertson" keeps "James Robertson"). Three measured refinements: a capital
the material also writes in lowercase is a sentence start, not a name
("Cotton"); a capital right before a number is a date, which the number
anchors ("May 2010"); and subject-ness is measured on name WORDS, since
"Cumberland River" and "Cumberland" are one subject.

The stricter check exposed the next failure on the second run: floors
appended beside sentences that already carried most of their fact said "688
miles" twice and the 2010 crest twice, and landed at the end of their part.
The recursion now ALTERS: the finer draw rewrites the dropped fact's PARTIAL
CARRIER, and the rewrite takes its place; a failed rewrite's floor takes it
instead. On the ledger nothing is edited — the replacement supersedes — so the
fold changes in place while every version is kept (user: "we don't edit, only
append, but the fold seems to modify before our eyes").

A test of that found a latent admission bug: below three distinct sentences
no bond null can be measured and `measureBondNull` reports max 1, which the
repeat rule read as a ceiling and so refused every sentence. Any short
material would have come back as nothing but floors. An unmeasured null now
falls back to the exact rule: a repeat brings no new matter at all.

## 64. The archons were charges without mechanics; now seven of nine are taught (2026-09-21)

The revision grid names nine editors across ethos/logos/pathos and
macro/meso/micro. Six of the nine had `probe: null` — every one of the three
pathos archons among them — so the grid could NAME what Clark or Kidder cares
about but never catch it. Meanwhile I was growing checks beside the grid for
the new pipeline: a tic counter, a restatement fold, a turn test. The user:
"the mechanics itself, our pathos archons, are meant to catch this… if you
have new rules for the archons, teach them."

Teaching an archon here means giving its cell a probe, `(text, ctx)`, where
the optional context lets it read a whole piece against the EOT draft; the old
composition path, which passes text only, runs unchanged
(`native/the-fold/archon-rules.js`, wired into `revision-spiral.js` GRID). What
each was taught, all measured on the live Cumberland runs:

- ZINSSER keeps his list and learns the TIC — a word neither the material nor
  the ask uses, repeated by the prose ("bustling" three times in one part).
  Over a whole piece his list now reports per sentence, so each hit licenses
  the rewrite of the sentence it is in.
- CLARK learns RESTATEMENT (no statement carried, nothing new said: fold) and
  the UNEARNED TRANSITION (a part that takes nothing up from where the last
  closed: one bridging sentence, kept only if it takes up the last and hands
  on to the next).
- CARO learns the UNVERIFIED sentence (no statement, no word of it in the
  material). KIDDER & TODD learn OMISSION (a declared statement no longer
  carried). McPHEE learns SHAPE (the parts are the material's seams, in order).
- LISH/KLINKENBORG learn Murch's FLATLINE per passage — reported, never
  revised, because asking the mouth to "vary its rhythm" is asking it to mimic
  a property in language.
- GORNICK and ORLEAN stay untaught and are named on every run: Gornick needs
  the measured surprise-tension-release curve only a reading's fold supplies,
  and Orlean has no measurement here that would not be a word list.

`readPiece` runs every cell over the piece and attributes each finding to its
editor with the revision it licenses. The pipeline carries out only what a
finding licenses, in a writer's order — fold, tighten, turns — then the
archons read again and each second reading supersedes the first, so the fold
shows what every editor still finds. Arrival is named by who still objects.

Found on the way: `namesOf` treated a sentence-initial "The" as a name, so any
two sentences opening on "The" "shared a name" — Clark could never find an
unearned transition, and the draft had listed "the" as a pervasive name all
along. And the shared sentence splitter broke "The U.S. Army Corps" into "The
U.S." plus a fragment, whose short half was then filtered away; and the
variance count, unlike the bond null, did not treat one-token chunk variants
as one passage, which a correct splitter exposed as a raised ceiling.

## 65. The outline is composed, not copied — and a cause may not follow its effect (2026-09-21)

THE CIRCULARITY. The generation pipeline's outline was the source's own
paragraphs in the source's own order. It looked like essay structure only
because the test ground (fixtures/cumberland-ground.md) was a tidy summary
already written as an essay. The user named the fix: "on its first pass,
mimic the best practice of structure of an essay using the holographic
information we have, but using reasoning linking to make sure that we are
not saying something illogical."

WHAT arrange.js DOES, NO MODEL: a THESIS (the general, undated statement
whose words recur across the most parts), BODY groups (an author's paragraph
kept whole; paragraphs joined across the material only through a proper
being BOTH are about), ordered by EXTENT (material order, repaired only
where one group ends strictly before another begins), a TENSION slot taken
from a contrastive opening or declared a gap, and a RETURN. Reasoning checks
land as typed findings with owners: off-thesis (Clark), inversion (the
extent), conflicting figures and circular claims (Kelsen). `arrangedDraft`
turns the outline into the draft every later stage reads; the source-ordered
draft stays on the ledger.

WHAT WAS MEASURED WRONG ON THE WAY. (1) "Cumberland" reached four beings at
once and chained unrelated paragraphs through Cumberland Park — fixed in
referents.js: the referent whose surface IS the name wins. (2) Months and
"Today" were beings. (3) Splitting a paragraph by the beings each sentence
names broke the geography paragraph in two — the author's seam is kept. (4)
One body spanned 1750–1954: "Lake Cumberland", said ONCE in the naming
paragraph, joined it to the dams paragraph. A shared name is not a shared
topic. A part is about a being when it opens on it or returns to it in a
second statement — positions and counts the material gives, no threshold.
On the tidy fixture the outline now equals the material's order, as it
should; arrange-falsify.test.mjs uses grounds whose order is wrong.

THE PROSE-SIDE LOGIC ERROR. Run 6 wrote "However, this flood [2010] spurred
a long-term effort …" before "The Corps built locks and dams … beginning in
the 1920s." Every anchor was carried; the claim was impossible. Williams
(micro·logos) was taught `williamsCausalOrder`: a causal connective (closed
class, both directions) whose effect's dates all precede its cause's. The
cause's date is searched back to the nearest dated sentence (anaphora reaches
back); the effect's only in its own sentence or the next (a first version
dated "the 2010 flood caused damage" by the next part's 1920s and flagged
it falsely). Bare text is split with the engine's segmenter — a naive split
broke "U.S. Army" and lost the date. A sentence whose only job was the false
link is folded; one carrying facts is rewritten and must drop the
connective.

STILL UNCAUGHT from run 6: "The May 2010 flood caused significant damage to
the Cumberland River" — the material says the damage was to the city. The
anchors survive; the RELATION is new. Catching it needs the relation of the
prose sentence compared with the material's relation between the same
beings, which the parse trees can supply and nothing yet compares.

## 66. Runs 7–12, the falsifier, and the first messy ground (2026-09-21)

LISH, TAUGHT: the mouth cannot "rewrite plainly" (run 7: 12 of 18 refused
rewrites longer, 13 kept their tics; some did both), so `lishCut` removes
comma-bounded decoration mechanically — no model call — and every guard it
carries was a measured breakage: a cut never leaves a fragment (the parser's
clause core must survive, and must exist; a remainder may not open on a verb
or a coordinator), never splits an adjective series ("quiet, unassuming"),
never cuts a clause ("but …", "while …") or half of a correlative pair ("not
just …, but also …"), and keeps every word the sentence shares with the source
statement it carries (run 10 cut a paraphrased fact as "invention"). Model
calls fell from 36 to 20–33 per run.

KIDDER & TODD, TAUGHT: `kidderToddRelations` flags a verb whose subject and
object are material words no source sentence holds together (run 6: "the 2010
flood caused damage to the Cumberland River"). Identity the material asserts
counts — a copula ("the river is a major waterway"; EOTRich absorbs the copula
as a MARKER, not an arc) and the SUBJECT's own head noun ("the river"); an
unrestricted head-noun alias made every dam "the dam". Null: 0 of 26 on the
source. Licenses RESTORE (the carried statements' source sentences) or fold.
Blind spot, stated: a wrong verb between two nouns that co-occur elsewhere.

TWO BUGS THAT LOST FACTS, BOTH MINE: prosify's in-place rewrite inherited its
partial's `carries` without re-checking them (run 11 lost the 1927 flood); and
Kidder & Todd's floor license was never acted on. Run 12 is the first piece
verified to carry all 23 facts.

THE MESSY GROUND (OHS audit records, four documents): arrangement failed in
both directions. First one section took 69 of 78 sentences — beings spread
through the whole material ("Office of Homeless Services") chained everything.
The exact occupancy null now separates a CONCENTRATED being (joins sections)
from a SPREAD one (the ground: joins nothing, may stand in the thesis), tested
at P(D ≤ seen) ≤ 1/N — the bare expectation sat on a knife edge
("Metropolitan": 8 parts seen, 8.2 expected). Then the outline had 17
sections, the paragraphs again. Mutual-nearest-neighbour merging above the
material's background similarity only reached 15. And assigning sections to
the ask's clauses by shared words fails: the minutes score HIGHER than the
audit on "what the audit found". What separates a finding from a committee's
response is the ACT a statement reports (finding, recommendation, status,
motion, vote), not its words. That is the unbuilt organ this arrangement needs.

## 67. The mouth steers some physics; Gary reads the prompts; a dossier needs selection (2026-09-21)

THE MOUTH'S VOTE (steer.js), at the user's direction: the mechanics cannot
tell a finding from a response, a mouth can read it. The mouth votes in plain
words — which of the ask's coordinated questions a section answers (its reply
must ECHO one question), whether neighbours are one section (yes/no) — and
the mechanics license: a question vote only when two readings with the
questions in OPPOSITE ORDER agree (a single reading put 2 of 9 committee
paragraphs under "what the audit found" — position bias), a merge only when
the sections share a content word and time is not inverted. Every vote is on
the ledger, licensed or refused. A hedge ("yes and no") is no answer; "not
really" is no.

GARY (the-fold's prompting archon, P233) was run over every generation
prompt: all of them named the apparatus ("passage", "material") and the
shared register voice carried prohibitions ("do not discuss the essay",
"never a description") — the very meta and restatement the archons then fold.
Fixed at the source, and the pipeline's voice is now INFORMATION ONLY: the
topic and the thesis the arrangement computed, handed over as a fact. Gary:
clean on all six prompts; prose prompts 172 → 83 tokens.

DETECTORS from a subagent, integrated (restatement.js): a SPLICE (a sentence
repeating a run of its own words longer than any source sentence does — the
ceiling is measured per corpus) is Clark's, licensing a repair by the more
verbatim half; a DUPLICATE across sources (figures AND names contained, bare
numbers null-filtered) is Kidder & Todd's, and the poorer statement leaves
the outline. The draft's splitter broke "4:00 p.m. in Committee Room" — a
dotted lowercase abbreviation before a lowercase word is not a boundary.

ARRANGEMENT, AGAIN ON OHS: relevance now goes through referents and hops
(the ask's beings, then shared beings until nothing new joins — "Franck" was
never "Dr. Louis Franck"). A once-per-paragraph being was always "spread"
under the occupancy null (k = seen ⇒ P = 1), so a runs test on POSITION was
added; each null licenses what it measured — clustered MENTIONS join
anywhere, consecutive POSITION joins neighbours only (letting it join at a
distance made a 105-statement section). No section may exceed the material's
largest paragraph; a larger one splits at its weakest seam. Result: no blob,
but 34 sections — because every drawn fact is carried. On a dossier an essay
must SELECT the facts that answer the ask within a length. That is the next
organ; carrying everything was right only for material already the size of
the piece.

## 68. Hora, not Tempus: every loop is a stable whole built on the floor below (2026-09-21)

The user: "the point about the loops is we want to prove we are building upon
the floors below recursively, and if we fail out at a level, we still have
something fairly useful … it's a Koestler move." Koestler's holon, and his
retelling (The Ghost in the Machine) of Simon's two watchmakers: Tempus builds
each watch whole and loses it to every interruption; Hora builds from stable
subassemblies and loses only the one in hand.

So the pipeline is Hora. Loop zero is the FLOOR: the selected source
sentences in outline order, true by construction and already a usable piece.
Each loop above it (prose, archons, tighten, turns) is measured against the
last (loop-check.js: facts carried, the ask's questions answered, findings
still licensing a revision) and judged on its own charge — prose may add
findings for the loops after it, never lose a fact; every later loop may not
add findings either. A loop that loses ground is UNDONE. And every loop above
the floor runs inside one guard: if a level throws, the piece is the last
stable loop's, the run completes, and a check line names where it stopped.
First version judged the prose loop against the floor's zero findings and
undid every prose pass — the charge has to be the loop's own.

SELECTION (same day): "don't write everything in the dossier." With no
length asked, the essay's received form is the declared budget (a thesis
paragraph, three body sections, a close — basis "declared", any stated
length overrides it); each of the ask's questions gets its closest section
first; the mouth may answer "neither", and a section both readings call
neither leaves the piece only when the mechanics agree it names nothing the
ask names.

## 49. The cube as a complete grammar, and the one test that looked like a result (2026-09-21)

`cube.js` already claimed the cube is a universal grammar — three domains as
the three grammatical departments, three grains as the three clause positions
— and measured eight dimensions of it on Greek endings. Its only consumer was
a test. `kernel/universal-grammar.js` makes the claim complete against the
Universal Dependencies v2 inventory: every part of speech, relation and
feature value has a cube address with its basis (`measured`, `declared` with a
reason, or `form` for surface features that belong in provenance). The gap
list is empty and 25 of 27 cells are reached; NUL·Figure and INS·Ground take
no grammatical category at all, which is a question, not a defect.

`kernel/eot-rich.js` gives each sentence two layers: the exact surface as
provenance, and a meaning layer of content words only, with function words
absorbed as cube-addressed markers and no word order anywhere. Over seven
treebanks, 7,744 sentences in Arabic, Greek, Hebrew, Latin, Sanskrit and
Naija: nothing unplaced on entry, the surface re-serializes byte for byte, the
full annotation rebuilds from the meaning layer alone, and order regenerated
from each language's measured parameters scores tau 0.39 to 0.78. The same
parameters read out the textbook basic orders — Arabic VSO, Latin and Sanskrit
SOV, Hebrew and Naija SVO — without any table of languages.

Two honest limits. The meaning-layer rebuild is near-certain by construction,
because absorbed markers keep their attachment; it proves nothing was dropped,
not that two languages mean the same thing. And the test I wrote to show one
relation in two projections — English "of" and the Latin genitive landing in
one cell — passed by coincidence. Every English adposition takes its cell from
its syntactic label `case`, so "in", "to" and "with" all land where "of" does
while the locative, dative and comitative do not. It is now a `todo` test,
named as a known gap. Typing a marker by what it MEANS needs the same sentence
in a language that spends a preposition and one that spends an ending: a
parallel treebank.

## 51. A universal grammar from the UDHR: one principle transfers, two parameters do not — without literacy (2026-09-21)

The test the user named: universal grammar as Chomsky frames it, principles
invariant and parameters set from little input. The principle is the cube; the
little input is the UDHR, ~11,000 characters in each of ~490 languages, the
same meaning held constant across every typology.

SEGMENTATION FROM WHITESPACE. 487 of 516 translations yield the preamble and
thirty articles from blank-line structure alone — no numerals (68 files write
them as words), no heading vocabulary, no script. Two measured corrections on
the way: numbered list items are separated by the same long blank runs as
articles, and sit deeper; and the article indent is the SHALLOWEST, not the
most common, because list items outnumber articles.

THE PRINCIPLE TRANSFERS. A word's cube cell is projected from pivot languages
by co-occurrence across the aligned articles and checked, leave-one-out,
against each language's OWN treebank prior. Every cut is the language's own
shuffled null, stratified by word frequency — an unstratified null came out at
exactly 1.0 in all thirteen languages and linked nothing, because a one-off
word reaches Dice 1 with any one-off beside it, shuffled or not. Nine of
eleven checkable languages clear their own 99th percentile (French 67.6%
against 38.0%, Finnish 77.8% against 48.1%); multi-pivot roughly doubled the
words checked. Korean fails and Hebrew sits at the null: both fuse particles
or prepositions onto words, which a tokenizer cannot see.

TWO PARAMETERS DO NOT, and both failures point the same way.
- Adpositions by projection: function words appear in nearly every article,
  so they never co-occur distinctively; the "adpositions" found are 0–3 a
  language and partly wrong (Latin *nullo*, *se*). No setting was made.
- Head direction by entropy asymmetry on raw text: validated FIRST against
  the seven treebanks, it ranks them backwards (Spearman −0.68) and reads
  every one head-initial, Latin and Sanskrit included; on the UDHR it would
  call Navajo, Quechua, Turkish and Basque head-initial. Refuted by its own
  validation, never read as evidence. The gold proxy was crude too — the share
  of all dependents following their head is dragged below one half even in
  SVO Naija by determiners and subjects.

Parameters are grammar, and string statistics over an unread text do not see
grammar. The route that made this project literate in Greek and Sanskrit — a
treebank, the one-master ending prior, a reader that leaves gaps, competence
out of sample against a shuffled null — is the route to setting parameters in
the languages the UDHR adds. The principle can be projected; the parameters
have to be read.

## 52. The swarm on the UDHR: what it actually learned, and what it only appeared to (2026-09-21)

The swarm (`native/eval/lavar/wilson.mjs`) was sent across the declaration in
the eight languages the reader declares — English, French, Turkish, Korean,
Modern Greek, Hebrew, Russian, Arabic — three generations each. Three things
had to be corrected before its output meant anything.

THE UNIT. The reader learned "Article <arabic>" as a chapter convention, so
chapter 1 was Article 1: three propositions, every variant 0.550, nothing to
select. A declared derived material (`eval/udhr/udhr-derive-whole.mjs`) gives
it the whole declaration as one read unit. The first version wrote its
provenance as a header, and the reader read "Removed: the title line and the
30 article heading lines" as the first English proposition — the machine
talking about itself, admitted as content. Provenance now lives in a sidecar
the reader never opens. Rerunning under the same name then appended to the
first run's ledgers (append-only by design) and three languages scored 0.000
over a mixture of two texts; the clean materials take a new name so their
ledgers start fresh, and the contaminated run stays on record as what it was.

THE NAMES ARE INVERTED. A variant named `received-verbs` passes
`--no-received-verbs`: it turns the received verb prior OFF. `earned-only` is
the full default reader. Read with that in mind, the clean propositions say:

    language   default   verb prior off
    Korean        97        0
    Hebrew        54        0
    Arabic        63        0
    Russian      108       25
    Greek        302      114
    Turkish       85       42
    French       217      122
    English      257      209

The received verb prior is load-bearing everywhere and is the reader's ONLY
way to find a verb in Korean, Hebrew and Arabic — the three languages whose
surfaces fuse particles, prefixes or endings onto words, the same three that
failed or sat at the null in the projection test (lesson 51). That is the
lesson the swarm's run carries.

THE HARDENED "THINGS" ARE TIES. The ladder hardened `nps` and `deep` across
Korean and Arabic (and, with earlier materials, across ten). On the UDHR both
score exactly what the default reader scores (97/97, 63/63). They were KEPT
at "+0.300" because selection is per terrain and the terrain champion they
beat was a variant with the verb prior switched off — a champion worse than
the seed. A specialist that ties the generalist is not outreading it. This is
a defect in the gate, not a lesson about reading: `kept` should require
beating the seed, not a terrain champion below it. Not fixed here —
`wilson.mjs` carries another session's uncommitted work. Not promoted to the
shared store either, and it should not be until the gate is fixed.

## 53. An English parser from the treebank we already held, and the gap it can measure but not close (2026-09-21)

The rich EOT could round-trip a treebank but could not read a page of English
it was handed. `adapters/text/english-parser.js` closes that: raw text in, a
full Universal Dependencies analysis per sentence out, in the shape the rich
record already takes. No language model and no download — the English Web
Treebank was already on disk, left by eoreader6.1. Four small learned parts:
a tokenizer on the treebank's own conventions, an averaged-perceptron tagger,
an arc-eager parser learning from a static oracle, a relation labeller, and
lemmas and features from the treebank's own tallies backing off to the word's
ending (the Greek and Sanskrit ending-prior discipline). Deterministic: the
same treebank gives the same model byte for byte. Trained in 76 seconds.

Scored on the held-out tenth it never trained on (1,254 sentences): word class
95.2, head 81.2, head and relation 77.0, lemma 97.4, features 91.3, tokenizer
F1 96.2; attaching every word to its neighbour scores 9.0 and 29.0. Floors sit
below those numbers in `english-parser.test.mjs`.

PROVENANCE, the user's rule for every parser: the model states the treebank,
the file's content hash, and its genre, period and region — the last three
received from the treebank's documentation and marked as declared, never
measured. Every reading carries the parser's provenance beside the book's,
and names the mismatch. The book's own period and genre are received too: a
Gutenberg header states a title, author and translators but not the period of
its English, so the period stays a declared gap until someone declares it; a
cleaned corpus file with no header takes its title and genre from the
manifest that admitted it. A first draft wrote "literary prose" into every
reading's mismatch line — a genre nobody declared — and was corrected.

WHAT IT MEASURED ON THE NOVELS. War and Peace (Maude translation) — 72,022
sentences, 673,229 words in 70 seconds; Tom Sawyer — 89,026 words in 9.5.
Every sentence entered the rich record with nothing unplaced, and every
sentence and token offset reproduces its bytes exactly. The period and
register gap, as a number: 9.3–9.5% of the novels' word forms never occur in
the parser's training, against 4.1% on its own held-out web English. That gap
is measured, not closed. Closing it is the same move Greek needed for Koine
against Classical: a model per period and register, taught on a treebank of
that English and carrying its own provenance.

## 54. Three fields no one language states, computed without a model (2026-09-21)

`kernel/eot-enrich.js` adds three fields to the rich EOT record, none of them
in the source sentence and none of them from a model call.

REFERENT: which being a node names, via `the-fold/referents.js`'s
`buildReferents` — the same organ the generation pipeline uses, called here
rather than duplicated. Proven on "Napoleon's army retreated" and "the army
of Napoleon was destroyed": the two "Napoleon" nodes resolve to one referent
id though the arcs are opposite. The first draft of this test used "king",
and every resolve came back empty — the referent organ finds beings by NAME,
a capitalised run, and a bare common noun is never admitted as a referent on
its own. Real material always has a proper name; the test does now.

EVIDENCE: `organs/asserted.js`'s own `standingOf` — the structural floor
already used for verb claims — read across ARCS and across DOCUMENTS. The
same claim in two independent sources is corroborated; two sentences of one
document restating it is one witness re-testifying, not two, proven by a
direct test. This is grammaticalised in an evidential language and invisible
in English, so a rich record can carry more than the English sentence itself
states.

GROUND: the extent a statement is true of, read off the arc's own cell, not
the marker's. The first version checked whether a preposition marker's cell
was CON·Ground and found nothing, ever — a preposition's cell is CON·Pattern
in every case, per the relation table; what is Ground-grain is the `obl`
relation between the clause and its oblique dependent, SEG·Ground. And
"struck Nashville" (a direct object) is not ground, however place-like the
word is, because it is a syntactic argument, not an oblique — the test
rewrote the sentence to keep the two apart and checks both directions.

## 69. One channel on the box: the daemon is Heimdall's, the port is the door (2026-09-21)

The evening's drag had no algorithm behind it. Two Ollama installs answered
one port — homebrew on `127.0.0.1:11434`, Ollama.app on `[::]:11434` — and
`localhost` resolves to `::1` on this box, so every module that said
`localhost` reached one daemon and the host picker (`127.0.0.1`) reached the
other; each reloaded what the other held. 105 files called the daemon
directly with no admission. Two proxies in one checkout drove one ledger.
The watchdog read a probe timeout at 93% swap as a wedge and restarted the
daemon, and the Ollama.app menu-bar process respawned its own one pid ahead
of ours. `OLLAMA_NUM_GPU` had been in the "CPU-only" config for days; the
server does not read it.

What holds now, each with the control that would break it:

- **One address, derived.** `native/kernel/model-server.js` is the only
  place the daemon's URL is written; heimdall.mjs, proxy.mjs,
  proxy-runner.mjs and look.js import it. A second literal anywhere is the
  drift that split the traffic.
- **The daemon is private; the channel is public.** `ollama serve` binds
  `127.0.0.1:11435` (OLLAMA_HOST derived from the URL). The proxy holds
  `11434` on BOTH loopback families. Control: `localhost` and `127.0.0.1`
  must answer with `x-heimdall-channel`; one without the other is the split
  again.
- **Admission per SERVER.** The connection names the process (lsof peer port
  → pid → argv); a script that sends no header is still one place in the
  round-robin, on the batch ration behind interactive work. A refused server
  that retries inside its Retry-After doubles its hold (bounded by the SLA)
  and past the floor is `retry_storm`. Measured within a minute of boot: an
  eval that ignored Retry-After was held to 22s.
- **One window.** A caller's `num_ctx` is dropped and disclosed. Control: the
  loaded window must not change when a caller asks for another.
- **Multiple daemons → quit and reconcile** (the operator's word). Never on
  an unverified lsof: the first boot reconciled while lsof timed out and was
  right by luck; now an unverified census quits nothing and the probe
  retries.
- **A timeout under memory pressure is memory, not a wedge.** The watchdog
  stands down; `restartModelServer` refuses under pressure.
- **One driver per checkout** (`state/heimdall-driver.lock`); a second proxy
  is a door only.
- **The learner eats observations only** — act `eva`, or a snapshot folded
  from them — never a holon's own acts. Before: its top pattern was its own
  `pattern_earned`, 59 an hour, adopting nothing.
- **Rules as levers, on trial.** `saturated`/`expected_wait` move
  `familyCap` one step; `memory_pressured` evicts the least-recent resident.
  The window after is judged against the window before by a permutation null
  (α 0.05, disclosed); held keeps the lever, conceded reverts it, a conceded
  key waits four windows. Nothing about the box is hand-set except α.
- **The bridge is a host by measurement**: `/bridge/hello` says `bridge`, its
  `/api/ps` says what the phones hold, and it is a standby until they hold
  something. Never a cold candidate, never bounced back to.

Measured after the first boot: free memory 49 MB → 3.8 GB, compressor
9.6 GB → 3.4 GB, swap-out 2,732 pages/s → 0. Owed: a phone-served call end
to end (the phone was mid-relink), and a room mouth registered without the
bridge.

## 70. A lint nobody has seen fire is not a lint; a regex nobody has seen match is not a parser (2026-09-22)

Proving the generation pipeline's stages one at a time — each with its
own falsifier before the next was wired — turned up two organs that had
been silently doing nothing:

- `organs/web.js` `extractReadable` captured headings with a pattern that
  closed on `</h\1>` where the group already held the "h": it wanted
  `</hh2>` and matched nothing, on every page, since it was written. The
  shape stage's "named parts" had no input until a live Wikipedia page with
  nine `<h2>`s returned zero headings and the question was asked.
- `arrange.js`'s Kelsen lint (conflicting figures, circular claim) reads
  notes the parser builds from subject, root and object. Nobody had ever
  constructed a violation and watched it fire. Measured: notes exist on 8
  of 33 OHS statements and 30 of 60 narrative ones, and "Marlow Dam cost
  four million dollars" parses as an imperative — so the first falsifier
  written for it could not fire at all. The lint is alive on the pairs the
  parser handles ("The audit found 12 / 14 recommendations") and dead on
  proper-noun-initial sentences, and now the tests say which.

The rule: a check that has never been observed firing on a constructed
violation is a comment, not a check. Write the violation first, watch it
fire, then trust it — and record where it cannot fire.

## 71. Closed grammar may be listed; open content must be induced — and the ruler is not the shape (2026-09-22)

The user: "we dont want a set of shapes pre-set." A table mapping genre
nouns to fields (`FIELD_BY_NOUN`) can never be complete, and a bigger table
is the same mistake. But three small lists survived the objection, and the
distinction is worth stating:

- the anaphoric cues ("again", "another one", "the same", "like before")
  are closed English grammar — a referent INTO the conversation, resolved
  off this engine's own ledger, never a genre;
- the units of measure (line, stanza, paragraph, word, page …) are the
  RULER; the shape is what the ruler reads across sources, and it counts
  only when more fetched hosts than not state it — the majority rule the
  subject anchor already lives by, not a new threshold;
- the form's NAME is what a majority of page titles call it: the garbled
  ask "rite @ whiteppr", searched with its own context, surfed to five pages
  titled "white paper" and named itself from them.

Grammar (closed, small, listable) versus content (open, must be induced or
looked up) is the same line kind-induction.js draws. Measured on the live
surf: sonnet 14 lines on 4/4 hosts; haiku 3 lines and 17 syllables (and 5,
a part); "5 paragraphs" for an essay on exactly 4 of 8 hosts — half is not
more than not, and the stage said "no agreed shape" instead of rounding up.

## 72. Context resolves what the token cannot, and fixtures cannot find what only the live web shows (2026-09-22)

Searched alone, "whiteppr" returns slang noise; searched as "what is a
whiteppr", DuckDuckGo's own tolerance resolves it to the white paper. So
every SURF query carries the ask's surrounding words — the token never goes
out by itself. And the first live end-to-end run found what six fixture
suites could not: the material hunt's six pages about the Cumberland never
reached the hunt, because a URL both hunts found kept only the first hunt's
label and one fetch budget was spent on exemplar pages before any material
page. A fixture web returns what you told it to; only the real one shares
URLs across queries. Fixed, pinned with the live case's shape, and the next
live run is owed before the fix is believed.

## 73. On a one-model box, every warmer is an evictor — and a probe that loads is a warmer (2026-09-22)

The daemon allowed three loaded models; the box had room for one. So the
small-mouth warm (every minute), the residency holon's re-warm (every 45 s),
and the watchdog's liveness probe (every 30 s) were three loaders fighting
over one slot: sampled every 3 s, gemma2:2b held for 24 s, the small mouth
for 18 s, then gemma2:2b again, 25 small-mouth loads in one hour, and a fold
turn paid 28 s of its 75 s reloading the model the warm had just evicted.
The probe was the worst, because its own comment promised the opposite: "a
small resident model … never spawns load of its own", while its code named
gemma2:2b unconditionally and sent no keep-alive. Found by sampling `/api/ps`
and reading the expiry (the daemon's 10-minute default), not by reading the
record, because none of the three loaders logged an eviction: the daemon did
the evicting. The rules now: a probe asks only what `/api/ps` says is
resident, a warm never pushes out a model in use, and what is kept warm is
what actually served.

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
