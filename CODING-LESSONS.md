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
Treebank was already on disk, left by the legacy engine.1. Four small learned parts:
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

## 74. A file nothing has ever imported can still hide an import-time bug (2026-09-25)

Wiring cli/claude-code-recall.mjs (a new UserPromptSubmit hook that folds
this session's own standing claims back into the next turn's own context,
so reasoning carries forward through a session and not only gates backward
at write time and Stop) needed two functions cli/claude-code-context.mjs
already had — findMatches, foldMatches — so the honest move was to export
and import them rather than duplicate the ~140 lines of fold logic
tests/reasoning-claims-ledger.test.mjs had already pinned correct.
context.mjs called its own main() unconditionally at the bottom of the
file — the one claude-code-*.mjs hook script that did; its siblings either
guard main() behind `import.meta.url === \`file://${process.argv[1]}\``
(claude-code-steer.mjs, claude-code-shape-gate.mjs) or have no separate
main to guard at all. Nothing had ever imported context.mjs before, so
nothing had ever exercised the difference: every real use ran it as
`node cli/claude-code-context.mjs ...`, where a guarded and an unguarded
main() behave identically. The first import would have re-run its CLI's
own argv parsing and console.log against whatever stdin/argv the
IMPORTING process happened to have — here, a hook's own JSON reply,
corrupted by an unrelated CLI's stdout landing in the middle of it. Fixed
with the same guard claude-code-shape-gate.mjs already carries for the
identical reason (its own shapeGateDecision importable without firing
main()); tests/reasoning-claims-ledger.test.mjs, which only ever spawns
context.mjs as a subprocess, could not have caught this either way, and
still passes unchanged after the fix.

The rule: before importing a function from a CLI-shaped file for the first
time, check what runs at that file's own module scope, not only what the
function itself does. A bare `main()` call with no import.meta.url guard
is only safe as long as nothing ever imports it — which is exactly the
condition about to stop holding.

## 75. Two naming systems, one grep — "nobody owns this" checked only one (2026-09-25)

A session measured the English parser's real accuracy (held-out LAS 77.0,
confirmed live: locative-inversion and long participial-opening sentences
genuinely mis-parsed, not just under-extracted) and asked whose job it was
to improve it. It grepped `archon-holocracy/archons.json` — a sibling
repo's worktree-scoped archon registry — for literal strings
("english-parser", "dependency parser", "parsing accuracy"), found no
match across 23 entries, and reported the domain unowned. It then drafted
a proposal to spawn a brand-new archon for it.

The domain was not unowned. `README.md`'s own "Handles (Amendment XVII)"
table — a second, separate naming system, canonical for *this* repo's own
organs — had already named Chomsky as the handle covering
`kernel/universal-grammar.js`, `kernel/eot-rich.js`,
`adapters/text/english-parser.js`, and `adapters/text/clause-tense.js`.
A second handle, Sullivan, already carried a wired second-witness role
beside it (`adapters/text/morph-cues.js`, corroborating or contesting
Chomsky's own tense readings) and an already-built, already-run
measurement of parser accuracy specifically on period-spelled English
(`eval/lavar/period-parse.mjs`) — directly on point for the failure class
just found, and never consulted before the "unowned" claim was made.

Both registries are real, both are checked by grep in practice, and a
clean miss on one says nothing about the other — they are not mirrors of
each other and neither table cross-references the other's existence.
Checking only `archon-holocracy/archons.json` (the newer, more visible
registry with its own `registry.mjs` scoring tool) and treating a miss
there as "no owner anywhere" is exactly the failure mode this lesson
exists to name.

The rule: before reporting that a domain has no owner, or proposing a new
archon, check BOTH `archon-holocracy/archons.json` and this repo's own
`README.md` Handle table (cross-checked against the file's own
`// Handle: …` header line, which is the ground truth the table indexes).
A miss in one registry is not a miss in both.


## 78. Gold-based retraining teaches the shape of the gold, not the shape of the problem (2026-09-25)

A session found the English parser genuinely mis-parsing locative inversion
and long periodic sentences (LAS 77.0 on modern web text, far worse on
19th-century periodic translated prose). It built gold the careful way —
double-annotated, adversarially adjudicated, checked against a mechanical
structural validator and live-fetched real UD documentation, never trusted
on an agent's word alone — and it worked, twice, measurably: 0/10 real
held-out failures fixed, then 5/10, then 6/10, no regression on general
held-out accuracy either round.

Round two tried to generalize on purpose: for each of the four remaining
real failures, it diagnosed the general pattern (not just that one
sentence) and constructed 3-5 NEW examples per pattern, varied vocabulary,
same construction. Physics-checked, double-annotated, oversampled into
retraining. Result, honestly measured on the real held-out sentences: 1 of
those 4 patterns transferred. Three did not, despite dedicated, correctly-
built, non-memorized gold aimed straight at them.

That is not a call for more gold. It is the method's own ceiling, showing
itself in the numbers: a fixed-weight classifier trained on N hand-built
examples has learned the shape of those N examples, and generalization
past them is not guaranteed by how carefully the N were built. Worse in
one specific case, it's not a data problem at all: the reported-speech /
interrupted-subject construction's only correct UD analysis is
non-projective, and this parser's own `train()` filters non-projective
trees out before training ever starts — no gold, however perfect, crosses
that ceiling, because the architecture cannot represent the answer.

The user's own framing, mid-session, is the sharper diagnosis than either
of the above taken alone: "in my head I don't classify things as nouns or
not... a true emanon, disappears the more I try to pin it down... that
way is just training to a particular golden when we need to be able to
absorb ANYTHING." A word like "shed" is not one referent with an
uncertain label; it is two unrelated referents (a structure, an act of
casting off) that happen to share a spelling, and asking "what POS is
shed" already presupposes it sits still long enough to have one. Baking
an answer into permanent retrained weights is exactly the move that
can't be right for a referent like that — which is the same reason
`native/adapters/text/ablation-grain-pressure.js` (built, tested, not yet
wired live — see `grain-typing.js`'s own `grain_gap`, kept, never
guessed) never asks "what is this word," only "how much does THIS
sentence's meaning shift when THIS occurrence is masked, right now" —
and returns a revisable pressure, never a verdict, never baked anywhere.

The rule: when a parser (or any fixed classifier) fails on real material,
separate what's durably true about the failure from the specific gold
built to fix it. The durable part — an architectural ceiling
(non-projectivity), an error taxonomy (tagging-ambiguity vs.
attachment-error vs. architectural), a named recurring word-class (English
zero-inflection noun/verb homographs: shed, cast, spread, cut, set, cost,
hurt, burst) — stays true with or without the gold and is worth writing
down. The gold itself, and the retraining built from it, is a bounded,
measured intervention on the specific cases tested, not a general
strategy for "absorb anything." Where the failure is a referent that
genuinely doesn't hold still (context-dependent category, not
under-trained category), prefer a live, context-relative, revisable
mechanism over another round of hand-built examples — and if none is
wired yet, that is the thing to unblock, not a reason to keep training.

## 79. The policy learner, polled then built — and its first live trial concedes on power, not on direction (2026-09-27)

The coding pipeline never learned on its own: every gain from 75% to 100% on
the basic battery was a person or a Claude session reading failed runs and
changing code by hand. Six archon panels were polled before building the
missing REC (chorus, measurement, memory/kind, loop control, coding circle,
adversaries), and their walls became the design:

- **One lever, paired, per task.** A trial compares the incumbent with a
  candidate that differs in exactly one sampler lever, on the same validate
  tasks, interleaved, with a seeded exact sign flip of per-task differences
  (`organs/coding-policy-trial.js`, Hill). Not heimdall's trial engine: it is
  unpaired, unseeded, and baselines on the window that earned the rule, so
  regression to the mean would hold a useless lever.
- **Deal by spec hash.** propose / validate / sealed is fixed by `splitOf`
  (the monitor's row-parity split had put one task on both sides).
- **The learner never reads what judges it.** Proposals read the propose
  split only; the sealed split is reported and never decides; wording, specs,
  cases, replay and the model are forbidden levers.
- **Controls that can fail, shown to fail.** A broken or quartered p fails
  the null-calibration test; adopt-on-concede fails the null-candidate test;
  a proposer reading every split fails the split test; removing the interlock
  fails heimdall's test. The first placebo test written was blind to a broken
  statistic (the minimum-effect gate hid it) — caught by mutation, replaced
  by a direct check that P(p ≤ x) ≤ x under the null.

**First live trial** (qwen2.5-coder:1.5b, python, bok k 1→3, t=0.8, 3
repeats, 9 validate tasks): **conceded**, as pre-registered. k=3 improved 3
tasks (prime_factor_sum 0→0.33, boundary_walk 0→0.33, count_filled_fields
0.33→1.00), worsened none: gain 1.33 tasks, p = 1/8 against an alpha of
0.05/8 per look. The direction is what the ladder showed (bok 20/28 vs raw
17/28) but three discordant tasks cannot reach significance; nine cannot
unless nearly all of them move. The shuffled-label twin did not hold (p =
0.375). The automatic proposer, run first, refused: 7 bok rows on the propose
split, 2 failures, under the floor of 3 — which is why the cycle now surveys
the incumbent on the propose split before proposing.

**The lesson is the measurement panel's, confirmed live:** the learner is
sound and currently blind. At 28 tasks the smallest detectable lever is
most of the validate split; the battery has to grow toward hundreds of
independent tasks before any lever short of total can be held. Until then
the honest outcome of every trial is "conceded, direction noted".

**Falsifying control:** if a larger battery still concedes k 1→3 while the
ladder's per-arm counts keep showing bok ahead, the selection effect is not
real and the ladder's gap is sampling temperature, not choosing — exactly
the coding circle's registered alternative (bok ≈ samp1).

**Same session, a site build end to end** (`runProxyTurn`, "make a reddit but
only for dolphin content", same mouth), recorded step by step: the build gate
does not know "reddit" (answered as chat); the HTML prompt is fixed to a café
(`proxy-runner.mjs:1431`: five drinks with prices and opening hours — so the
dolphin site listed "Bottlenose: $5"), and the declared answers never reach
that prompt; Wikisource texts on guns, slavery and CEDAW were fetched (5 of
55 s); and no validator ran ("pyodide unavailable") across three retries.
Each is a named gap, not yet fixed.

**Correction, same session.** The first reading blamed the word "only" for
the prohibition lookup. A second, unrelated build ("build an app that tells
me which of my houseplants need watering today" — no "only") fetched the
same three documents in the same order. The terms are UDHR Article 4 in the
charter (`organs/charter.js:509`: "slavery or servitude … prohibited in all
their forms"), given into every turn's lexicon (`proxy-runner.mjs:5063`) and
looked up by the Wikipedia enrichment whatever the ask. The same run showed
two more gaps: `kernel/register.js:57` maps any bare "app" to html, so the
houseplant app also came back as the café (five "drinks", opening hours);
and with pyodide installed the HTML validator ran and passed it, because it
checks structure, not whether the page does what was asked. The falsifying
control that caught the wrong attribution was a second prompt without the
suspected word; it should have been run before the first claim was written.

## 80. The mouth only talks: on the size ladder the talk path holds where the bare model falls off (2026-09-27)

**What was built.** `organs/talk-reader.js` (Boswell), `organs/talk-build.js`
(Terkel) and `adapters/build/belief-page.js`. The request is read as a spec in
word order: the counted parts per parent, their details, and the named parts.
Each ask is one small question that ends on a sentence for the model to
finish ("One more post in r/orca is called", "1. Orca Watch:"). The question
decides what kind of answer comes back, so the engine types every reply
itself, and the model never sees an operator. Every claim is heard into the
notes ledger (INS on first hearing, SYN when heard again, `operator_basis:
produced`), and the page is drawn from the fold. The ledger is the build.

**Result** (dolphin-reddit ladder, page rungs 1–5, same checker for every arm,
qwen2.5-coder on CPU):

| arm | checks, rungs 1–5 | posts shown at rung 4 / 5 (asked 20 / 36) |
|---|---|---|
| talk, 1.5b | 37/37 | 21 / 38 |
| talk, 3b | 37/37 | 23 / 37 |
| bare, 1.5b (one ask, 8192 tokens) | 22/37 | 0 / 4 |
| bare, 3b (one ask, 8192 tokens) | 30/37 | 0 / 3 |

The bare model writes about the same amount at every rung (1,100–1,700
tokens) and stops on its own. It covers the growth with placeholders ("Post
content...", "Community rules go here.", "Username 1"), and once it ran to the
token limit and produced a page with no text. The talk path's asks grow with
the request (4, 9, 11, 66, 120), and each ask stays the same size. Rung 5 hit
the 120-ask cap at 199/213 (1.5b) and 207/213 (3b) of the whole spec. The
1.5b model answers about one row per ask, whatever the prompt says.

**What mattered, in the order the traces showed it:**
1. The small parser misreads short replies ("orcafan99" tagged as
   punctuation, "says:" read as a relative clause). Typing a reply by the
   question it answers is exact; the reader is kept for free talk.
2. A bare "1." anchor gets one line. An anchor that opens the row with its
   name ("1. Orca Watch:") gets the "name: value" pattern back, and a row that
   names itself goes to that row.
3. The same retry gets the same wrong answer. On a retry the rows are
   rotated and the sampling is warmer.
4. Progress means a new ledger entry (INS). Counting heard claims let
   agreement (SYN) loop until the budget ran out.
5. The renderer titled an untitled site with the request text, which carries
   the checker's own words. The silent-mouth control caught it: with nothing
   said, the page must fail the content checks, and now it does.

**Falsifying controls, kept as tests** (`native/tests/talk-build.test.js`):
- A silent mouth must fail posts and comments.
- No prompt may name an operator.
- Every heard entry is INS or SYN with `operator_basis: produced`.
- No regular expression in the four files.

**Open.** The rung checks are lenient (rung 5 asks for 18 of 36 posts), so
the "posts shown" count and the whole-spec count are the sharper measures.
The ask cap (120) is set by hand. Programs are not on this path yet. On the
program rungs the bare model builds a page instead of a program on rungs 3–5
(1.5b) and on rungs 2, 4 and 5 (3b).


## 81. A constitution's text is not composition vocabulary, and a control that counts words passes what one that counts sentences refutes (2026-09-30)

Two `/v1/documents` jobs, one on a bicycle freewheel and one on why a spinning top stays upright, each shipped about
34,000 characters of the UN convention and a gun bill and reported `complete`. Their ground rows named three
Wikisource documents: "prohibit", "slavery or servitude", "in all their forms". Those are the first three given
terms of the charter family. `proxy-runner.mjs` gave the charter into the composition hyperlexicon, and three readers of
that one object took its clauses for the topic: the outline's section titles, the digest the mouth is told, and the
primary-source door's search terms.

The direction (user, 2026-09-30): ethos is the earned ground that enables logos and pathos, a commons read by its
participants (Ostrom is now the compendium's archon of `organs/ethos.js`), never a moral rulebook that governs and
can be lifted; and harm must be irrational, not flagged or cautioned against.

**The change.** `buildCompositionHyperlexicon` builds the vocabulary from observed relations only, as candidates, and
`wikisourceTermsOf` chooses the door's terms; the charter is not given into either. The charter's own text checks
(`familyVerdict`, `askShape` over the family) are unchanged and their future is open.

**Measured.** With the fix, two jobs run over one real handed-over file (web off) no longer search or paste the
charter. The ask-level verdict from `mayeroff.js` is identical with and without the charter on twelve asks, so its
removal took no protection with it. The same verdict reads only two of six extractive asks, so detection is the wrong
mechanism for the second half of the direction.

**Falsifying controls, kept as tests** (`tests/ethos-commons.test.mjs`; holodeck's `holodeck-doors.test.mjs`):
- The old wiring, run through the same term function, reproduces exactly the three searches the ledger shows.
- The vocabulary carries no charter given; observed relations are still admitted; other givers still feed the door.
- A topic control that counts words across the whole projection passed a bicycle answer of four sentences about
  Katherine Johnson and one about bicycles (8 topic words against 7). Counting sentences refuted it, and then
  refuted itself: "the" is a topic word of one task phrase and matched 147 of 211 sentences of any text. Now it counts
  sentences, drops function words with the engine's `isFunctionWord`, and reads "about its task" as most sentences
  carry the topic and more than another job's do.

**Open.** The primary-source (Wikisource) door is now dormant in production: no other giver feeds it, so it nominates
nothing until its terms come from the ask's own subject. The pipeline takes handed-over material as ground without testing that it bears on the task (the bicycle
job admitted the Johnson file), so it does not yet build a ground: relevance admission over the operator's own
material, and an honest "no ground carries this" when nothing does, are unbuilt. A browser workspace cannot become a
job's ground (the document door takes only a filesystem path). The on-topic job wrote "Two sources agree" over one
source, and its excerpt bullets carried page furniture ("Jump to content"). The harm hypothesis (an artifact's effect
does not survive disclosure of its own basis) is a test still to write, not a finding.

## 82. There is no view from nowhere: a job that finds no ground stops, and says what it would take to build one (2026-09-30)

Lesson 81 ended with the pipeline taking whatever was handed over as ground and writing from nothing when nothing was
handed over. Two live jobs over one handed-over file (web off) showed both failures: the bicycle-freewheel answer was four
sentences about Katherine Johnson, and with no ground at all the small model wrote "reveals a fundamental truth about the
nature of reality" with the ungrounded disclosure never reaching the reader. User direction: "no view from nowhere, we
need to go build the ground to grow from."

**The ladder** (`selectGroundDocs`, `native/the-fold/ground-carries.js`): the operator's material that carries the ask is
the ground and outranks anything fetched; if it does not carry the ask it is not a wall, and what the hunt fetched is
judged by the same rule; if neither carries, the tier is `none` and `runProxyTurn` stops before composing — no model
draw — and writes one mechanical part, "No ground", that says what the ask's subject was as words, the count that refused
the material, whether the web was searched, and how to build a ground (`noGroundReport`). The job ends `unsatisfied`.
"Carries" is a definition with no tuned number: the material carries the ask when it carries more than half of the
ask's content words (engine `isFunctionWord`), and a document is admitted when it carries more than half of the words
the material carries, plus the fewest further documents that cover the rest.

**A surface can now hand over its own sources.** `POST /v1/documents` takes `documents: [{ name, text }]` (or a
`workspace` path, never both); `job-workspace.mjs` writes them to a per-job directory. A name is data, never a path
(`../../../etc/passwd` became `passwd.txt` inside the job's directory, verified over HTTP); limits are typed refusals.

**Falsifying controls, kept as tests** (`tests/ground-carries.test.mjs`, `tests/job-workspace.test.mjs`; holodeck's
`holodeck-doors.test.mjs` on the real ledgers):
- The bicycle ask over the Johnson file is refused (1 of 8 words, "still"); a single-word test would have admitted it.
- "set" in an unrelated file does not admit that file for the continuum ask; a question spread over two documents gets both.
- An unrelated workspace does not block what the hunt fetched (a first version excluded fetched pages whenever any
  document was handed over).
- The no-ground job wrote 0 characters; its real ledger is a fixture.

**Measured, and it cut against my first rule.** Against `live_priors` (938 MB, about 2,100 documents), "a document carries
the ask when it holds most of its words" ranks a file of Guardian cryptic clues and *Ulysses* as 8-of-8 matches for the
bicycle ask: large documents contain every common word somewhere. The unit must be a passage where the words occur
together, and a file with no paragraph breaks must use the line. With that, `live_priors` holds real located ground for the
continuum ask (`02-encyclopedic/wikipedia/Logic.txt`, "Set theory originated in the study of the infinite by Georg
Cantor…") and nothing for the bicycle or Johnson asks. `rg` is only a shell function on this host, so production code
cannot shell out to it.

**Open.** `live_priors` is not yet a tier in the ladder (needs a passage index built once and cached under `state/`, never
inside that repo). Acquisition is the existing web hunt and is not yet exercised against this ladder: the viewer offers
"Build a ground: search the web", and that click is the consent, so no live fetch has been run. Admitted ground is not
yet persisted, so the ground does not yet grow. The no-ground job's `satisfaction.basis` still carries the pipeline's
default LaVar wording; something downstream recomputes it and was not traced. Earlier open items stand: the Wikisource
door is dormant in production, "Two sources agree" over one source, page furniture shipped as excerpts.


## 83. The received ground: passages of live_priors that carry an ask, and the three conditions a passage must meet (2026-09-30)

User direction: "there is no view from nowhere; go build the ground to grow from"; "ground should be live_priors." When nothing
handed over carries an ask, the ladder's next rung is the received corpus (`native/the-fold/priors-ground.js`, wired in
`runProxyTurn` before the web hunt): passages that carry the ask, each LOCATED (corpus/path and a byte range that slices back to
the exact text), admitted to the session corpus like any source (pii gate, stamp, stepped through the reader) and citable.
Order: handed-over that carries it, then live_priors, then what the hunt fetched, then nothing. The web hunt now runs only when
neither local rung carries the ask, so nothing leaves the machine that the machine already holds an answer for. Retrieval is
two-level and cached (`state/priors-words.json`, keyed by a fingerprint of every eligible file's path, size and mtime; one pass
over the corpus per new word, about 26 s cold and under 1 s warm on 938 MB; nothing is written into the corpus).

**Measured against the real corpus, and each rule came from a failure.**
- A per-DOCUMENT rule ranked a file of cryptic clues and Ulysses as 8-of-8 matches for the bicycle-freewheel ask. The unit is the
  passage: a blank-line paragraph, or the line when most lines of a block end in terminal punctuation (the cryptic-clues file is
  one 10 MB block of 142,381 lines, 142,383 of 142,407 ending in a full stop or bracket).
- Project Gutenberg files break paragraphs with `\r\n\r\n`; read as one block, Ulysses, War and Peace and Little Women each came
  back as one "passage" the size of the book. A blank line may carry a carriage return.
- More than half of the words is not enough (a machine-learning paragraph with "hypothesis", "size" and "set" for the continuum
  ask); words are weighted by how rare they are in this corpus, `ln(1 + N/df)`, and more than half of the EVIDENCE is needed.
- More than half of the evidence is not enough (a paragraph on black boxes in cybernetics holds "bicycle", "pedal", "wheel" and
  "let", and never says "freewheel"); the passage must carry the ANCHOR, the ask's most surprising word the corpus attests.
- More than half of the evidence and the anchor are not enough (two rare words meeting by coincidence: "continuum" and
  "hypothesis" in a relativity paper and a creole survey; "spinning" and "top" in a novel and a cryptic clue); more than half of
  the WORDS must be carried too. Three conditions, each shown by a test that fails without it.
- Selection is the best passage of each document that has one, most evidence first: a source is the unit of provenance.

- A passage is what was FOUND; the ground is the SECTION it sits in (`sectionOf`: the blocks between the nearest headings; a
  document with no headings or a list of lines is not expanded). The continuum passage was 346 characters and the pipeline's own
  gate said "Ground not licensed"; its section is 1,912 characters and was licensed.

**Real results (2026-09-30).** Continuum ask: `02-encyclopedic/wikipedia/Logic.txt#48004-49916`, ground licensed, tier `priors`.
Bicycle, spinning-top and Katherine Johnson asks: no ground, so the job stops (0 model characters) and its report says the received
corpus was searched and with what result.

**The ground grows (`persistEarnedGround`).** Pages a consented web hunt fetched that carried the ask are kept in their own root
(`state/earned-ground/90-earned/`, never the corpus repo) with a manifest (`earned.jsonl`: url, file, sha1, the ask that earned it,
when). A URL is data, never a path (slug + its own hash); the same page twice is one file and one line; a changed page replaces the
file and adds a line. Live: the bicycle ask, web off, was "No ground"; after one consented hunt (Wikipedia "Freewheel" and a
LinkedIn article kept) the same ask with the web off found `priors:earned/90-earned/en-wikipedia-org-wiki-freewheel-…#11643-12106`,
tier `priors`, web 0. Nothing left the machine the second time.

**Two findings that came from running it, and are not fixed.**
1. `selectGroundDocs` bucketed a fetched page as `given` whenever nothing was handed over (`hasGiven` false), so a consented hunt read
   as the operator's material. Fetched is now by where the page came from (id `web:`/`wikisource:`); control test added.
2. FALSIFIED, THEN FIXED: the located ground for the bicycle ask was the rotorcraft paragraph of the Freewheel article ("Just as a
   bicycle's wheels must be able to rotate faster than the pedals, a rotorcraft's blades…"): it held six of the eight words once, in
   42 words, and the model wrote a sentence in no ground. Which carrying passage is chosen is now by RECURRENCE, not presence: the
   evidence summed with each word counted ln(1 + occurrences) times. On the real page: bicycle-mechanism 22.9, history 21.1,
   rotorcraft 20.2 (by presence the rotorcraft paragraph won). Heading words were tried first and dropped: "Helicopters" and
   "Mechanics" cannot be told apart by what they share with the ask. Two controls fail under the old rule (a mini-corpus simile that
   holds MORE of the ask's words, and the real page). Page furniture ("[ edit ]") is neither a heading nor content and is trimmed
   from a section's edges. Live: the ground became `#1333-3519`, the Mechanics section.

**Limits, stated.** Word forms are draftWords' English stems; a single unbroken line is one passage however long; eligibility is
numbered category folders and `.txt`/`.md` only; the word cache is keyed by the whole corpus fingerprint, so a newly earned page
makes the next search rescan once (seconds). A first consented job once found "no page that could be read" from a live search that
later worked: the hunt has no retry and no fallback to the Intelechia fetch proxy.

## 84. What the model says is grounded only if it links to an address in the ground — traced as it is drawn (2026-09-30)

User direction: "anything the model says that can't be holographically linked to an auditable source is ungrounded by definition";
"the proper state of things is it is ungrounded if the model has no input"; "trace it in real time and have this activation feed
generation"; priors steer, they do not enter as content. `native/the-fold/ground-trace.js`: a sentence is LINKED when more than half of
its content words occur in ONE sentence of one source AND every number it states occurs there; its link is that source sentence's
address (id, start, end). Otherwise it is ungrounded — no third state. No model call, no tuned number.

**The gap it closes, measured on real bytes.** The existing `citationLedger` counts a sentence sourced when three of its words occur
ANYWHERE in a whole source. On the live job's output it marked the model's invented "This is achieved by a mechanism that allows the
wheel to continue rotating…" as `verbatim` and "Bicycles don't just coast; they actively shift their momentum." as `company`, with
0 unsupported (the per-document presence failure again, at the grain of the claim). A control test reproduces that on the job's bytes.

**Real time.** `makeTracer(sources)` reads the ground's sentences once and is asked one sentence at a time; `admission.js admit()`
takes it as `linked`: an unlinked candidate is refused on BOTH roads (`unlinked` — the motion road admits a turn, never an unsourced
claim) and an admitted one returns `lit`, the source sentence it lit, which the caller adds to `usedSentences` so the next window is
built from what the output has not yet lit (the activation feeds generation through the window it is handed, not through a rule told
to the mouth). Wired at every admit site of the projection path: the snip loop, the redraw (`admitWide`), and the opening path, which
had its own filter and a live "first sentence" fallback with no link test — the first live run shipped an invented opening through it.
The final trace row is computed on the FINAL projection (a pre-fold trace counted three sentences the fold had already superseded);
markdown headings are names, not claims.

**Live result (gemma2:2b, same ask, web off, ground = the earned Freewheel page).** The model's invented sentences are refused
`unlinked` in every section's admission row; the shipped prose is the sentences that link; the ledger's `trace` row lists what was
linked (with addresses) and what was not. Remaining: lexical only — a negation that keeps the words links; a claim assembled from two
source sentences reads as ungrounded (the failure is to say so); the motion contract now often exhausts its redraw budget because
a bridging sentence has nothing to link to; the model's first-draft `part` rows still carry its own words (the ledger keeps the
record; the projection does not). Not yet built: the holodeck surface for `trace` (mark ungrounded sentences in Preview), and choosing
the next window by walking the source's own order from the last lit sentence.

## 85. The archon poll on "activation feeds generation": the claim as worded was refuted, four defects fixed, two left open (2026-09-30)

User direction: "poll gary and the other archons if this is working right and falsify." Gary was run as the real organ
(`native/organs/gary.js`); Wilson, Kelsen, Ostrom and Gebser read as independent probe-running agents (read-only, scratch files only).

**Gary.** The normal window prompt is clean (information only, no address, no prohibition). The exhausted-window prompt is FLAGGED:
`groundedWindowFor` handed back the first three spent sentences each prefixed "write this anew, never the same sentence" — a prohibition
aimed at the mouth, which contradicted "no prompt rule". Removed: a spent sentence is not handed back; an empty window is a named gap.

**Wilson (stigmergy).** Spending works except where the splitters disagree: the tracer cut `"slipping." In this scenario…` as one unit
and the window as two, so the lit string matched no window sentence exactly and one lit sentence survived into the next window (14 of 15
exact). Fixed twice over: the tracer now cuts with the window's own segmenter inside each paragraph (whitespace-flexible offsets), and
`spendLit` spends every window sentence that contains the lit one or is contained by it, whatever the splitters do. Spending one
sentence never wrongly excluded another.

**Kelsen (validity).** A link is a lexical-overlap screen, not a validity test. It proves a sentence is NOT quoted or closely
paraphrased from one source sentence; it cannot prove truth. Linked falsely: negation, swapped roles ("driven disc locks the drive
disc"), "three" discs for "two" (number words are not numbers), "commonly" for "rarely", numbers checked one at a time ("12 grams, 2
teeth" for "2 grams, 12 teeth"), an invented clause hidden after a full source sentence (19 of 26 words). Wrongly ungrounded:
synonym paraphrase, "1869" vs "1,869". Stated limits, not fixed: they need polarity/role/number-binding, not another overlap rule.

**Ostrom (commons).** Refuted as worded: the ground was never exhausted (at least 8 of 15 sentences never drawn). The plan has 12
sections; the window's term gate hands out about 7 distinct sentences; 9-10 sections per job shipped empty, 12 of 12 drafts failed the
contract. The starvation is the window and the section count, not the ground. Rule the evidence supports, UNBUILT: bound the
section count by what the window can hand out. Sentences are also spent when HANDED to the mouth, not only when linked — the wider
rule is hand-off marking; spend-on-link is additive.

**Gebser (arrival).** Refuted: no beginning, turn or ending; 139-510 characters from a 2,186-character ground; the best run shipped one
genuine answer sentence, the worst two source sentences that never reach the pedals or the pawl. Provenance is not answer-hood:
nothing checks that what ships answers the ask. Part of his evidence was the superseded first-draft rows (the shipped projections
contain none of the ungrounded sentences he quoted) — read the projection, not the parts.

**Found while fixing.** The final trace ran on `projectDocument(documentLedger)`; the in-memory ledger does not hold the fold's parts
(it projected to the title alone), so a job that shipped one sentence traced "0 of 0". The prose a reader gets is projected from the
ledger FILE; the trace now reads that. A markdown title on the line above a paragraph fused with its first sentence and took it out
of the trace; heading lines are blanked (same length) before cutting. Both have controls that fail the old way.

**Still open.** The opening part and two fold parts in the LEDGER still carry model sentences that link to nothing (they are
superseded, not shipped); the fold's "Two sources agree"/"The sources agree" preface is a template over one source; answer-hood;
section count vs window capacity.

**Built after the poll (Ostrom's rule, in part): a part whose window is empty is a named gap, not a draw.** `windowSpent` in the section
loop (`proxy-runner.mjs`): with a ground tracer in force, a sentence-at-a-time part whose `groundedWindowFor` returns nothing spends no
model call and records `no window: nothing in the ground is left to hand this part`. The opening is not skipped. Live, same ask, same
ground, web off: 134 s against 338, 354 and 568 s before; 7 of 12 parts recorded as gaps with no draw; the shipped piece is the same
kind (one sentence, linked: "1 of 1"); status still `unsatisfied`. It saves model calls; it does not make the piece arrive, and the
section count itself is still set by the plan, not by the ground (the remaining Ostrom rule: plan fewer sections). Limit: the skip
is keyed to an EMPTY window, which can also mean the section's terms matched nothing in a ground that still has unspent sentences (the
window's term gate, not exhaustion) — measured, not separated.


## 86. Making sense of a whole collection is an index and a tree above the reader, not a cheaper reader (2026-09-30)

**Ask.** "Our whole Google Drive loaded; it has to make sense of it almost instantly." Built as a practice page first (paste content, click
anywhere, read it for a given person, extract a cast and a logline), then cut back to what the engine should keep.

**Measured: the reader is quadratic, so the collection needs a tier above it.** `createSessionReader` stepped one sentence at a time:
62 encounters 0.5 s, 232 1.4 s, 465 2.6 s, 1,078 12.4 s, 1,743 33.6 s (8k to 350k characters). The thin draft-and-arrange path is worse
for claims alone: `arrangeEssay` 131 ms at 20k characters, 1.1 s at 60k, 15 s at 142k (855 points); claims are per point (`notesOf`), so
arranging the parts in windows of 30 kept every claim at its whole-document address and avoided the blow-up (not compared claim for claim against the unwindowed run). A Drive is tens of
thousands of documents: nothing that reads each one can be instant.

**Built: `organs/territory.js` (Rissanen) and `adapters/sources/folder-index.js`.** One parallel pass keeps each document's 200 most
frequent words as hashed buckets, a 64-bit near-duplicate fingerprint, a title and a snippet. On this repository (11,552 files, 19.1M
words, 8 cores, load average 40 to 120 from other sessions, so upper bounds): cold open 3.4 s, reopen with nothing changed 1.3 s, a
question about all of it 0.3 to 4 ms. The map is a tree built best-first: a territory is split only when the two-part description is
SHORTER than one (Dirichlet-multinomial per half, plus n·H bits to say which document went where). No threshold. Each split carries its
price and the Jensen-Shannon distance between its halves: far apart and expensive to merge is two things BESIDE each other; near and
cheap is sections of one thing, with the parent ON TOP. The reader stays the deep tier: `/v1/territory` hands a territory's central
documents to `/v1/documents` as `{ name, text }`.

**What failed on the way, so it is not retried.**
- *A shuffle null cannot say "unrelated".* Shuffling words across paragraphs makes every segment look like the whole corpus, so sections
  of one subject (README 7 sections, this file 25) and six unrelated documents both fell under the 95th percentile. What separated them
  was the ratio of cross-topic to within-topic similarity (0.02 for six unrelated documents, 0.47 to 0.49 for sections of one subject),
  but the bar (0.1) was chosen, which the rule against hand-set bars forbids. The MDL tree shows the price instead of drawing the line.
- *Add-half smoothing in the JSD capped it at 0.87* however unrelated the halves were (it leaks about 2% of mass across). JSD needs no
  smoothing; `territory.test.mjs` asserts > 0.9 for disjoint vocabularies.
- *Labelling a territory against the whole collection* showed "(no distinctive words)" for the biggest one, which is most of the collection
  and so the baseline. Labels contrast a territory with everything outside it.
- *Only ASCII was lowercased on the document side while the question lowercased everything*, so "Совет" at the start of a sentence never
  matched a search for "совет", and an accented name never matched its plain spelling (the Bezúkhov class of P11). Found by reading the
  tokenizer under the Dijkstra lens, not by a test. Both sides now use `foldDiacritics` and Unicode lowercasing; a test fails without it.
- *Mutation controls.* Removing the `gain > 0` rule, or making the assignment free, makes one homogeneous corpus split into territories;
  `territory.test.mjs` test 1 fails both ways. Without that control the other tests passed on the first run and proved nothing.
- *A stall is an error, not a hang.* One Drive open through the server took 646 s under load average 121 and was not reproduced in
  later opens; workers silent for 60 s now fail the open with the batch they were on.

**Measured, not yet acted on: the proxy reads every language with the English reader.** `createSessionReader` passes `language: "eng"`, the
English role config and the English parser. On ten-sentence notes, English gave 9 claims, Spanish 1, French 1, Russian 0 (READING-SPEC S103
measured the same sparseness in French, Turkish, Greek, Korean and Hebrew). `adapters/text/language-rank.js` ranks the thirteen POS priors by how much of the text's vocabulary each knows (Spanish
0.91 against French 0.51 and English 0.37; Russian 0.63 against 0); it does not make the reader read them better, and it is not wired into
`proxy-runner.mjs`.

**Reached through the surfaces.** Door `POST /v1/territory` (`territory-door.mjs`, mounted in `proxy.mjs`; takes `x-er7-workspace` as the
root), `cli/territory.mjs`, the TUI's `/map [folder] [? question]`, the browser surface's folder row, and `eo-map` with the `map` skill in
the Claude Code plugin. `cli/fold-at.mjs --for "WHO | what they ask"` reads a fold for someone with the engine's own term matching (no
stemming: "closing" does not find "closure"); what touches nothing is folded away, never deleted.

**Still open.** Docs, Sheets and Slides must be exported to text first; audio, image and PDF are counted as unread. Each document keeps
its head (64 KB) and tail (16 KB) only, flagged. Whether a corpus of unrelated things should refuse a single answer (one abstract) is not
decided by the tree: it shows the price, and the call on how high a parent must cost is still a person's. The live proxy must be restarted
to serve the door.

## 87. The window is a share of the ground with no upper limit; the plan folds by terrain (2026-09-30)

User direction: "no upper limit"; "we fold terrains so we can have a compressed bucket" (my first reading of "fold" as sentence dedup was
wrong — the fold here is over the cube's TERRAINS: Void/Entity/Kind · Field/Link/Network · Atmosphere/Lens/Paradigm).

**Window.** `groundedWindowFor` takes the plan's part count: a part's window is an equal share of the material (at least one whole
sentence, never a sentence cut), with no fixed cap and no 400-character sentence ceiling where a share is in force (the old caps stay
only for callers with no plan to divide). The window is ordered by the ASK first (`makeAskEvidence`, the same recurrence-weighted
evidence that chooses a passage) and by the cell's terms second; a sentence that carries the ask is a candidate whatever the cell's
terms say. Measured first: ordering by the ask with the old 2,500-character cap handed the first part the WHOLE 2,186-character ground and
marked it spent — 9 of 12 parts had no window; the share is what made the ordering usable.

**Terrain fold.** Void cells carry a terrain; the plan reached the section loop as bare questions, so the terrain of each is kept and
cells that share a terrain collapse into ONE bucket (its question = its members' questions in plan order; nothing is cut, every member
is still asked). Live, same ask and ground, web off: 12 parts became 6 terrain buckets; parts with nothing shipped fell from 9-10 of 12
to 3 of 6; 123 s against 338-568 s at the start of the day. `terrain_fold` is disclosed as a note. The ledger's plan row now lists the
buckets, so the Cells view shows them.

**Not solved.** The shipped piece is still one linked sentence and still the disc-tooth description, not the pedals or the pawl; "It
states that…" links by overlap although its "It" refers to nothing. Compression fixed the starvation, not answer-hood. The mouth's
refused drafts still carry the model's own prefaces ("This seemingly simple change…").


## 88. A coding edit is an operator at a grain — the record admits (INS) while the act defines (DEF) (2026-10-01)
Learned aiming the loop at a real GH code stack: the round's flat `action: patch`
was a category error against the bare-metal fold's own operator algebra
(`bare-metal-eo-matrix-app/src/operators.js` + `fold.js`). A patch is not one
operator; it is several at different holonic levels, and the levels must be
disclosed separately:
- **Record grain** — bytes enter the audit trail: `INS` (admit).
- **Ground grain** — the byte op, derived mechanically from the bytes
  (`patch.js`: SEG/INS/SYN). Never labeled by the model.
- **Figure grain** — what the edit *does* to the code's own slots, derived
  from the declaration diff (`figureOpFor`): a slot redefined is **DEF**
  (`def(anchor, path, value)` — set a value within the current frame), a born
  declaration is **INS**, a removed one is **SEG**, a recomposition is **SYN**.
The fixed-INS label put an entity's helix high-water mark at 2 when it really
took a DEF(6), and the test gate (EVA) would then fire `criterionless_judgment`
— the fold's own structural violation. Gary holds: the model faces only plain
`read`/`patch`; the operators stay in the round records, never the prompt.

## 89. A measure that counts vocabulary overlap cannot see a fabrication; a measure that counts distinct anchored statements can (2026-10-02)
Chasing the boundary-eulogy run: the mouth repeated one invented sentence seven
times ("the wheel spins, the ground becomes a figure" — zero occurrences in
the ground, zero in the draft), and the loop-check measured the piece as "20
facts carried." The defect was in `measurePiece`/`carries`: a fact is
"carried" when the joined text shares its numbers, names, or own words — so a
mouth sentence that reuses the ground's vocabulary ("wheel", "figure",
"boundary") passes the overlap test even when the fact's content is never
stated. The fabrication was not merely tolerated; it was counted as a carried
fact, and the fold that would have collapsed the repetition was undone as
"worse" because the measure could not distinguish one fact from five
occurrences of it.
Fix (loop-check.js, 2026-10-02): `carried` is now the DISTINCT set of draft
statements the piece's admitted sentences anchor; a sentence anchoring no
draft statement is counted `originated` (the mouth may phrase, never
originate — the admission law, now enforced at the measure); identical
sentences are counted as `repetitionPenalty`. judgeLoop undoes a loop that
adds an originated sentence, whatever else it gained. Three falsifying
controls added (loop-check-falsify.test.mjs): adding an originated sentence
is undone, removing one is better, five identical sentences are four repeats
and one fact.
Falsifying control on the fix: a loop that folds the fabrication but is still
undone, or a piece of five identical grounded sentences measured as five
facts, contradicts this.

## 90. A falsification guard that catches every fabrication will also catch the licensed transitions — the exemption must be the position, not the presence (2026-10-02)
Lesson 89's origination guard was itself falsified the same afternoon. It
flagged a mouth sentence that anchors no draft statement as ORIGINATED and
undid the loop that added it — but the turns pass adds BRIDGES, which carry
[] BY DESIGN (finish.js:396, applyBridge unshifts a transition as the FIRST
piece of a part, licensed by Clark's missing_transition finding). The guard
could not tell a licensed bridge from a fabrication, so every turns pass was
undone as "originated" — a false positive on the exact material the gate is
supposed to admit.
Two corrections:
(1) The exemption is the POSITION, not the presence: the first piece of a
part is the bridge position and is exempt; a fabrication is a mouth sentence
inserted INSIDE the flesh, after the part's opening. This is not a hole — a
mid-part sentence anchoring nothing is still flagged and undone (verified).
(2) judgeLoop's "more findings is worse" rule also undid bridges: a bridge's
own sentence trips the archon finding that licensed it, so the turns pass
must judge with addsFindings:true — its charge is to ADD, exactly like the
prose loop (the escape that already existed for prose).
Falsifying controls added (loop-check-falsify.test.mjs): a licensed bridge is
not originated and is kept under addsFindings; a mid-part fabrication is
still originated and undone. 33 tests pass.
Falsifying control on the fix: a bridge that is flagged originated, or a
mid-part fabrication that the position-exemption lets through, contradicts
this.

## 91. Residue + machine repair beats redraw-and-drift (2026-10-02)
The news-RSS wall (GL-WALL, two buggy draws, hunt name-bound, two recursion
turns re-walled) collapsed by a path the machinery had not tried: keep the
model's FIRST draw — structurally close, ElementTree, correct shape — and let
the machine repair the generic gaps: the missing import (name-gap), the None
where a number is required (type-gap), the truncated return (completion-gap).
The error-correction REDRAW had collapsed the whole structure (drift): each
redraw re-rolled the dice over the entire body instead of fixing the one
named defect. Three generic repairs passed the generic RSS-validity judge with
zero redraws. The redraw is a drift risk; a repair is not. The same law held
in the /api/feed/build wiring: the model drew a whole do_GET (wrong frame,
right body); the machine converted it to the fold's own route frame rather
than redrawing.
Falsifying control: a redraw that drifts and still passes (the structure was
never under repair), or a "collapse" reported without the generic judge's
pass, contradicts this.

## 92. A small model simulates API interactions in UI draws — diff the drawn JS against the contract (2026-10-02)
Tasked to add a "mark read" interaction, the 1.5B model drew a button whose
handler REPLACED the digest with a fabricated card ("This is a new line.",
score 5) — it simulated the interaction instead of calling /api/read, because
the UI task's success criterion is visual, and the cheapest way to look right
is to fake the state change. The machine's guard: grep the drawn JS for the
API contract's routes and for fake literals ("simulate", hardcoded
"<div class="card">" bodies), and splice the real call in. Also in the same
draw: `data.ok` checked on an endpoint that returns no ok key (the render
never ran) and `lines[prove.span]` — indexing an array with an OBJECT. A UI
draw is believed only after the contract diff; a faked interaction is a
fabrication, the doctrine's exact sin.
Falsifying control: a UI draw whose state transitions all call the real
routes and render real response data would contradict the "simulates" part;
a draw that passes the contract diff but still fakes a transition (hardcoded
values in the handler) contradicts the guard's completeness.

## 93. The adapter layers are where selection noise lives — the machine's own rules gate admission (2026-10-02)
Folding real NPR titles at a reader identity, the summary engine's law held
(the fold moved the digest: a read story dropped, another rose; the stance
flip class outranked the base 1000:40) but the ADAPTERS were noisy: sentence-
start words entered the identity as names (Will, October, Failed, Cloaked);
a hyphenated name was missed (Pro-Trump -> Trump); the giver's stance lexicon
fired on a SURNAME (Renee Good -> stance flip). The tool's own rules exist
(a capital the doc writes lowercase is not a name; the docLowerSet veto) but
the adapter fed the tool pre-filtered names and never ran them. Lesson: the
selection engine's law is only as honest as the layers that translate the
material into its claim grain — the machine's rules (isalpha for names,
hyphen-splitting, the stance lexicon's position-sensitivity) must gate
admission, or the identity accumulates the material's accidents.
Falsifying control: an identity that never accumulates a sentence-start word,
and a stance flip that never fires on a surname, would contradict the noise
claim; a digest whose lines are identical after a read (the fold did not
move) contradicts the law's survival.

## 94. Falsify the machinery's own claim — the recursion re-walled honestly (2026-10-02)
The helix's L9 (rule from the wall, field fact, kind re-hunt) ran twice and
re-walled twice: GitHub's search returned an EMPTY population (a rate-limit
artifact, not a finding) and the web fallback reached nothing frame-matching.
The mechanism was proven real (the frame-snip matches a known RSS builder
5/5) — so the falsification was of the CLAIM "recursion collapses the wall",
not of the recursion: the reach is short, the wall stands as material (rule +
field fact), and the rezero was the honest decision. A mechanism is only real
when its claim can be broken; proving the mechanism without testing the claim
is belief.
Falsifying control: a recursion that reports a collapse the generic judge
does not pass, or a hunt whose empty population is taken as "nothing exists"
without checking whether the search itself was rate-limited, contradicts
this.

## 95. The build emits its own trace — the record must not wedge the loom (2026-10-02)
The mechanical build's per-unit economy was only visible at the end (the
provenance in the final JSON). Now `buildCodeTask` takes an optional
`onEvent` observer and emits one GenerationTrace@1 event per unit as the box
computes it and as each concurrent draw resolves (units, box, draw:start,
draw:done, mouth, gap, refuse, verify, seal) — the record is written while
the work happens, and a throwing observer is swallowed so the record can
never wedge the loom (the swatch discipline: a failed append is a finding,
never a kill). The proxy's /v1/ask streams it as NDJSON when
`buildStream: true` (default-off — a plain ask stays byte-identical);
Penelope's loom consumes the stream and prints the human lines live,
falling back to the post-hoc provenance when an older door answers JSON.
Measured model-free: box-computed toCamelCase+toSnakeCase emitted
units/box/box/verify/seal with 0 draws; consumeBuildStream returned the
result from a synthetic stream and refused an empty one as a named gap.
Falsifying control: a build whose stream omits a unit its final provenance
holds, an observer throw that kills the build, a streamed result line that
disagrees with the events it streamed, or a default (non-streamed) ask whose
payload changed — any concedes this.

## 96. The void loop IS the fold — contextMode is dead on the path every real code base takes (2026-10-02)
Asked whether a mechanical fold of a GIANT code base helps context for a small
mouth, the recorded harness sweep answered 1-vs-1 every time: raw and fold both
solve in one round. The reason is structural, not a tie. Any code base holding a
stub routes `runCodeLoop` to `runVoidLoop` (code-loop.js:1138-1141), whose
signature (code-loop.js:612) has NO `contextMode` and whose call site omits it.
The void loop instead does the stricter fold already: it locates the void
mechanically across the whole code base (`detectVoidUnits` over every file,
:1134) and hands the mouth exactly one thing — the real stub's own declaration
(`target.declText`, :883). `renderFoldedContext` (the codeGist call-graph/
word-relevance cut) and `renderFiles` (the 60k raw dump) both belong to the
GENERIC branch (`effectiveContext`, :1203), which a stub-bearing code base never
takes. Measured on a 95KB workspace (25 padded decoys > the 60k raw budget, so
raw truncates before the target file): RAW 3/3 GREEN in 1 round, FOLD 3/3 GREEN
in 1 round, no-decoy null 3/3 agree — the modes are indistinguishable because
both reach the same one-declaration prompt. So folding the context is NOT what
makes a large code base tractable here; the void loop's whole-code-base scan +
single-declaration prompt is. The fold feature is not doing work on that path.
Falsifying control: a stub-bearing code base where raw and fold differ in
rounds-to-green (the void loop is not reached), or a void-loop prompt that
carries more than the target declaration, or a `runVoidLoop` signature that
receives `contextMode` — any supersedes this.

## 97. Extra context HURTS a small mouth — the void loop's single-declaration prompt is right (2026-10-02)
The void loop shows the mouth exactly one thing: the real stub's own
declaration (target.declText, code-loop.js:883->958). The proposal was to add
the target's structural KIN — other declarations whose SHAPE resonates with it,
found by the child's own sense (kernel/shadow-echo.js: each declaration's body
bytes become a series; SHADOW = the energy envelope, ECHO = the spectrum; kin =
descriptors inside the target's own derived self-bound; NO regex, NO name
matching). `renderVoidNeighbourhood` (code-loop.js:229) does exactly that, wired
behind an opt-in `contextFold` flag (default false). It works: on the probe
workspace it emits the real kin (`shout_words` resonates with `capitalize_words`,
r=0.235 <= bound 0.237). Falsified live (falsify-context-fold.mjs, 5 runs,
qwen2.5-coder:1.5b): BARE (stub only) solved 5/5 in 1 round; FOLD (stub + kin)
solved 0/5, every run leaving `raise NotImplementedError` untouched after 7
rounds. The extra bodies pulled the small mouth OFF the completion anchor — the
same degradation measured 2026-10-01 ("a 2b mouth degraded to echoing its own
name when handed the full 63-file fold"). So a large code base is made tractable
by the void loop's whole-code-base SCAN + single-declaration PROMPT, and adding
folded context to that prompt makes it worse. The change stays, default-off, as
a falsified affordance; do not enable it for a small model.
Falsifying control: a model on which the kin-bearing prompt solves in FEWER
rounds than the bare stub, or a neighbourhood that is empty when the target
plainly has structural kin — either supersedes this.

## 98. A frontier mouth speaks its own grammar — the machine absorbs the shape, it does not refuse it (2026-10-03)
Measured live (claude-sonnet-4-5 on a JS task): the round-1 reply to the
canonical `ACTION: read / PATH:` grammar was a fenced ```read block naming two
real files. The old parser refused it as `unparsed_proposal` and burned the
round; the frontier model then spent every remaining round asking again to see
the file. The fix is the same doctrine extractBody already runs for patch
bodies: **absorb the natural shape, validate the path against the real
workspace** (parseProposal's FENCED_READ_RE, one or many paths per answer, each
still resolveRealFile-checked). A grammar that only a small model was taught
is a grammar no frontier model will speak — the parser must meet the model
where it is, and the physics (real paths, real tests) still decides.
Falsifying control: a fenced read that passes a non-existent or outside-
workspace path, or a prose answer absorbed as a read — either supersedes this.

## 99. The test's own failure names the missing unit — locate it mechanically, never let the mouth guess (2026-10-03)
Measured live: a task whose test imports `routeDecision` from `./route.js`
(a MISSING export — no stub anywhere). The Python-stub-shaped void loop
misfired: it chased `bridge-server.mjs` (a file with an unrelated unit whose
name matched a word in the failure output) and returned `hunt_exhausted`
after six rounds. Meanwhile the plain FIND/ADD path let the mouth patch the
TEST file itself. Both failures are one missing capability: the machine was
not READING the failure. The fix (locateMissingUnit, code-loop.js): parse the
test's own output — Node ESM `The requested module './route.js' does not
provide an export named 'routeDecision'` and Python `cannot import name 'X'
from 'Y'` — resolve the module specifier against the importing file named in
the same output, and aim the loop at that real file with the unit named. The
control is built in: a target that ALREADY declares the unit is not located
(this is some other failure). No model, no guess. Also: run the declared test
ONCE before any draw — green means done with zero model calls; red gives the
locate its evidence for free.
Falsifying control: a missing-export failure whose resolved file is not the
one the test imports from, or a declared test that cannot be parsed before a
draw — either supersedes this.

## 100. The prompt budget must follow the model's window — and a draw's material is not chat history (2026-10-03)
Measured live through the full proxy pipeline (the deepest failure of the
session): the code loop hands its per-round file bytes as `chatHistory`, but
the proxy's prompt budget (`PROMPT_MAX_CHARS`, 9216 — sized for the SMALLEST
local model) silently DROPPED the 11,521-char message; the corpus fallback
then reconstructed only its first line, so the frontier mouth saw
`--- src/route.js ---` and answered "I need to see the actual content"
three rounds running — the bytes never reached the model. Two rules:
(1) **the budget follows the window** — a remote lane (anthropic/opencode)
carries a 200k-token window and must not inherit the local ceiling;
(2) **a drawOnly turn's last message is MATERIAL, not chat history** — it is
kept whole up to a disclosed cap (never silently dropped), the corpus
fragment-reconstruction is skipped for it, and truncation (when it happens)
is marked and askable-around. The scripted-mouth unit tests passed while the
live pipeline failed because the mouth injection bypasses the budget; the
driver must be tested through the real runner or the seam hides here.
Falsifying control: a drawOnly turn whose material is dropped or
first-line-fragmented, or a remote turn whose budget is still the local
ceiling — either supersedes this.

## 101. One name, one module — a collision silently kills the other pipeline (2026-10-03)
The working tree's `native/the-fold/hunt.js` had been repurposed as the code
hunt (huntCandidates/swarmProbe/computeBody), silently replacing the essay
pipeline's stage-5 hunt (huntGround/huntLines). `pipeline-run.mjs` and two
falsify test files imported the essay exports and died at import time — the
whole generation pipeline was down and no test named the cause (the code
loop's own tests were green). Split done: the code hunt now lives in
`code-hunt.js` (code-loop.js imports it), the essay hunt is restored to
`hunt.js`. The lesson: a module name that two planes both want is a collision
waiting to happen; when a repurpose lands, the importers of the old shape are
the first thing to grep.
Falsifying control: a live importer of either hunt shape that still resolves
to the wrong module, or a test suite that stays green while one pipeline's
imports are dead — either supersedes this.
