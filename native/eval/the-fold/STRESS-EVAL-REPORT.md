# Stress-eval report — the Fold's iterative build mechanism under many turns

Measurement pass only. Nothing in this report was fixed. Harness:
`eval/iterate-stress-eval.mjs` + `eval/dom-stub.mjs` (new files; `eval/iterate-eval.mjs`
untouched). Raw per-turn data: `eval/results/stress-eval-all.json` and the four
per-run files beside it. Reproduce with:

```
node eval/iterate-stress-eval.mjs gemma2:2b qwen2.5-coder:7b
```

## What was run

Two starting objects, genuinely different internal state shape, each a real
~20-30 line HTML+JS widget (not the counter/todo the existing `iterate-eval.mjs`
uses):

- **spreadsheet** — a 2×2 grid of `<input class="cell" data-r data-c>` with a
  live-recomputed sum.
- **tasklist** — an array-backed task list with priority select, add button,
  click-to-toggle-done rows, and a count line.

17 scripted turns per object (turn 0 is the starting object's own baseline
behavioral check), mixing feature-adds, judgment/complaint turns ("I don't
like the colors", "it's broken", "fix it"), deliberately vague asks ("make it
better"), an explicit "undo the last change" ask (twice per object, at
different points), and turns that ask the artifact to keep an earlier feature
working while adding a new one. Run against **gemma2:2b** (the project's
standing small-model target) and **qwen2.5-coder:7b** (mid-size contrast) — 4
runs × 17 turns = 68 model turns total.

**Mechanism reused, not restated.** Every turn goes through the real
`widgetRouter.routeMessage` (decides rezero vs. revise off the operator's own
words, before any model call — exactly as `app.js`'s `send()` does), the real
scout → one `{find, add}` edit → `applyOps` strict-then-`every` → `patchBuild`/
`rezeroBuild` ladder `iterate-eval.mjs` already proved, `witnessCode` for the
structural witness, and `buildLog.conform()` every turn. The only new code is
the turn script, the many-turn driver, and a **behavioral** witness — a
hand-rolled DOM (`dom-stub.mjs`, same mechanism as the sibling checkout's
`ledger-dom.mjs`: `runFold` executes the artifact's real `<script>` bodies
against a stub `document`, `fire`/`typeInto` simulate real clicks/typing) with
one mechanically-derived check per turn (e.g. "add a clear button" → click it,
assert a cell actually reads 0). 12 of 34 scripted turns (judgment/vague/
anaphora asks with no checkable claim) have no derivable check — marked
`no-check` in the tables below, not silently skipped.

**Regression sweep, every turn.** After every turn, *every prior turn's own
check* (plus the turn-0 baseline) is re-run against the *current* artifact,
not just the newest turn's check. A `REGRESSIONS:` list on a row names which
earlier turns' checks now fail against today's code.

## The single most important finding: the router, not the model, is what breaks first

Before any model-quality question: **the router misroutes nearly every
feature-add turn as a re-zero (REC) instead of a revision (SUPERSEDE)**, for
both models, on both objects, independent of anything the model does.

| run | turns that landed as REC (re-zero) |
|---|---|
| gemma2:2b × spreadsheet | 14/17 |
| gemma2:2b × tasklist | 16/17 |
| qwen2.5-coder:7b × spreadsheet | 15/17 |
| qwen2.5-coder:7b × tasklist | 16/17 |

Ground count climbs almost every turn (e.g. qwen×tasklist: `2,3,4,5,6,7,8,9,
10,11,12,13,13,14,15,15,15` — ground 15 by turn 17). This is not the
"judgment concedes a ground" case `widget.js`'s header describes and measures
elsewhere — it is turn 1 of a fresh conversation, an unambiguous instruction
("**add** a button that clears all the cells to 0", "**add** a delete button
next to each task"), landing as a REC anyway.

**Why, read off `widget.js` itself:** `iterationTell`'s `resolvesInto` check
(widget.js:207-214) asks only "does a content word of the message appear in
the build's own bytes?" — with no signal for whether the message is
*introducing* something (an addition) or *judging* something that's already
there. "Add a button that clears all the **cells**" shares the content word
"cells" with the spreadsheet's own markup (`class="cell"` folds to the same
form via `INFLECTIONAL_SUFFIXES`); "add a delete button next to each **task**"
shares "task" with the tasklist's own vocabulary. Any feature-add phrased as
"add X to/for/that affects `<noun already in the widget>`" — which is how
people naturally ask for a feature on something that already exists — trips
the same tell as an actual judgment. **This is the router's disclosed limit
from the opposite direction.** CLAUDE.md's "Iterating a build" section
documents the case where a definite phrase naming something *absent* from the
artifact fails to resolve and falls through to a new build; it does not
document — and this eval is the first measurement of — the case where a
phrase naming something *present* resolves into a re-zero even when the
message's own grammar is plainly additive, not evaluative.

**Consequence for the log's own design intent.** The build-log section of
CLAUDE.md is explicit that REC exists for "I don't like the colors" / "it's
broken" — a genuine concession of ground — while an ordinary feature request
should accumulate as SUPERSEDE patches on one ground. In this eval's
realistic multi-turn conversation, that distinction barely fires: almost
every turn re-zeros. The `[SEG SYN…] [REC] [SEG SYN…]` thread shape
`conform()` checks for stayed valid throughout (see below — zero violations),
but the *intended* shape — long runs of SUPERSEDE on one ground, REC only at
genuine complaints — did not materialize on either object, for either model.
Whether this matters in practice depends on what a re-zero *costs* relative
to a patch; this eval did not measure that cost, only that the routing
diverges sharply from the documented intent.

## Second finding: both models corrupt the artifact on turn 1, and never recover

Zero `conform()` violations across all 68 turns — the production-order wall
holds throughout, on every run, at every ground. That wall is not what
breaks.

What breaks is the *content* of the single-edit patch itself, starting at
turn 1 for the larger model and by turn 4 at the latest for the smaller one —
and once the artifact goes structurally dirty, **nothing in the mechanism
repairs it**; every later turn's patch is applied on top of already-broken
code, and the dirty/regressed state persists to the end of the run.

| run | first refusal (turn) | first structural-dirty (turn) | first own-check fail (turn) | first regression introduced (turn) | landed / dirty / turns-that-add-a-regression, of 17 |
|---|---|---|---|---|---|
| gemma2:2b × spreadsheet | 1 (`unlocated`) | 4 | 2 | 2 (breaks 0, 1) | 9 landed / 3 dirty / 9 |
| gemma2:2b × tasklist | 4 (`unlocated`) | **1** | **1** | **1** (breaks 0) | 12 landed / 11 dirty / 12 |
| qwen2.5-coder:7b × spreadsheet | 3 (`unlocated`) | **1** | **1** | **1** (breaks 0) | 16 landed / **16 dirty** / 16 |
| qwen2.5-coder:7b × tasklist | 13 (`unlocated`) | 4 | **1** | **1** (breaks 0) | 15 landed / 12 dirty / 15 |

**qwen2.5-coder:7b × spreadsheet is the extreme case: 16 of 17 landed turns
are structurally dirty**, from turn 1 onward, and every single one of those
16 also carries a regression against at least the turn-0 baseline. The
larger model did not fail *less* than gemma2:2b here — it failed *more
often and starting sooner*, and its failures were swallowed silently by the
applicability wall (`applyOps` only checks that `find` is unique and
present, never that the resulting file still parses as a whole).

**Turn 1, qwen2.5-coder:7b × spreadsheet — the actual defect** (ask: "add a
button that clears all the cells to 0"):

```html
<script>
    function recompute() {
      let total = 0;
      document.querySelectorAll('.cell').forEach(function(c) { c.value = '0'; });
        total += Number(c.value) || 0;
      });
      document.getElementById('sum').textContent = total;
    }
    document.querySelectorAll('.cell').forEach(function(c) { c.value = '0'; });
      c.addEventListener('input', recompute);
    });
    recompute();
</script>
```

The model's `{find, add}` edit inserted `c.value = '0'` (its attempt at a
"clear" action) directly into the *middle* of two unrelated `forEach`
callback bodies — `find` matched a short, non-unique-in-intent fragment that
happened to satisfy `applyOps`'s uniqueness check, but splicing `add` in at
that point left two dangling, unmatched `});` and no closing brace for the
now-headless first `forEach`. `witnessCode`'s `script-syntax` finding caught
it immediately (`Unexpected token ')'`) — the wall worked — but nothing in
`foldTurn`'s ladder (nor this eval's driver, which mirrors it) *stops* on a
dirty witness; the loop keeps patching on top of unparseable JS for the
remaining 16 turns. **The witness detects; nothing consumes the detection to
halt or revert.** `EVA` findings ride the log as evidence for the *next
model prompt* (per CLAUDE.md's design), but nothing here confirmed the next
prompt actually used them to repair rather than compound the damage — turn 2
onward stayed dirty every time, so if the findings were being fed forward,
they were not sufficient to recover.

**Turn 1, gemma2:2b × tasklist — a different failure shape, same severity**
(ask: "add a delete button next to each task"):

```html
<body>

  <select id="priority">...</select>
  <button id="add">add</button>
  <ul id="list"></ul>
  <div id="count">0 tasks</div>
```

The `<input id="what" placeholder="new task">` element is simply **gone** —
deleted outright by the edit, with no delete button anywhere added in its
place. `witnessCode`'s `dangling-id` finding caught it (`script addresses id
"what" but no element declares it`) because `render()`'s add-handler still
calls `document.getElementById('what').value`, and the behavioral check
confirms the practical consequence: `typeInto(doc.getElementById('what'), …)`
throws (`Cannot set properties of null`) because the element no longer
exists. **Adding a task is now impossible from turn 1 onward** for the rest
of the run — the eval's own baseline check (turn 0: "add a task, does the
list grow by one") fails on every subsequent turn's re-check, the first and
most persistent regression in the whole gemma2:2b run.

## Third finding: no explicit undo, and "undo the last change" behaves exactly as CLAUDE.md would predict — an ordinary edit, not a reversal

The router (`routeMessage`) checked "undo the last change" against the
build's own bytes on both "undo" asks in each run (turn 17, and — for the
spreadsheet — implicitly earlier) and found **no** content-word match:
"undo", "last", "change" do not appear in either widget's own vocabulary, so
`routedAs: null` on every occurrence. That falls through to the *ordinary*
instruction path (`routeSegment`'s ladder, same-kind-in-turn / named-build /
iterationTell against the newest build — none of which fire either), which
in this eval's driver becomes a plain revise-or-new patch attempt exactly the
way any other unrouted instruction would.

**Concretely: "undo" is not reversal, it is the model's own free
interpretation of what "the last change" might have meant**, landed as a
brand-new SUPERSEDE (or REC, depending on what content words the model's own
reply happens to share with the live build). In three of the four runs this
produced a `landed` turn with **no relationship to any actual prior
version** — the log's append-only history means the *real* prior version is
still on the log and addressable by cursor, but nothing in the turn or the
router *offers* that reversal; the operator gets whatever the model guessed
"undo" should mean, applied as a fresh forward edit. qwen2.5-coder:7b's
"undo" turn on tasklist (turn 17) landed `structuralClean: false` and
introduced 9 new regressions in the same turn it was supposed to be
*restoring* something.

This matches CLAUDE.md's own account of `builds.js`'s vocabulary (`reset`
returns to the deposit, a version-scoped `restore` is a forward SUPERSEDE
carrying old bytes) — but that machinery is **not reachable from the chat
turn this eval drives**; it is editor/pane-triggered UI, not something
`routeMessage`/`foldTurn` exposes to a plain "undo" utterance. The stated
limit is real and matches the header's own honesty about definite phrases
that don't resolve — but "undo the last change" is exactly the phrasing a
real user reaches for, and it silently becomes an ordinary (and here, at
least once, damaging) edit rather than a typed refusal or an actual
reversal.

## gemma2:2b vs. qwen2.5-coder:7b — same failure class, different rates, neither caught by the mechanism

Both models hit the identical defect **class** — a `find`/`add` edit that is
mechanically unique-and-applicable but semantically wrong for the
surrounding structure (witness.js's own header names this exact failure
mode) — starting at turn 1 on at least one object each. The claimed project
bet ("the small model should be viable if the surrounding mechanism is doing
its job") does not hold cleanly here in either direction:

- **gemma2:2b failed *more safely* but not *less often*.** Its dominant
  failure mode was `unlocated` **refusal** (9/17 and 13/17 refused turns on
  the two objects) — `applyOps` correctly declined to apply an ambiguous or
  absent `find`, which is the wall working as designed. When it did land, it
  was dirty about as often as not (3/9 landed-dirty on spreadsheet, 11/12 on
  tasklist).
- **qwen2.5-coder:7b failed *more often and more severely*, but rarely
  refused.** It refused only 1-4 times per run (vs. gemma's 5-13), and
  landed far more turns (16/17 and 15/17) — but 16/16 and 12/15 of those
  landings were structurally dirty. The larger model is more fluent at
  producing something `applyOps` accepts, which is exactly what makes its
  failures more dangerous: it rarely refuses, so the operator sees "it
  worked" far more often, while the artifact quietly accumulates damage.

Neither model's failures were caught anywhere *except* the two witnesses
this eval added on purpose (structural + behavioral) — `conform()` never
fired, and the router's own re-zero/revise decision is blind to code
quality entirely (it only reads the operator's words, never the model's
output). The mechanism's "measured 12/12 landings, 11/12 clean turn-one"
number in CLAUDE.md is real for the six single-turn cases it tested, but
does not extrapolate to a growing multi-turn build: by turn 4-6 on every
run in this eval, at least one model was already leaving persistent damage
behind on every subsequent turn.

## What a cheap check could not derive (stated, not skipped)

12 of the 34 scripted turns — every judgment ("I don't like the colors",
"it's broken", "fix it") and vague ask ("make it better") plus the two
anaphora-only style asks ("make the buttons/add button bigger") — have no
mechanically-derivable behavioral claim; they were marked `no-check` and
excluded from the regression sweep's `ok: false` counts (they can still
*appear* in a `REGRESSIONS:` list at a later turn as the check for an
*earlier*, checkable turn). This is a real coverage gap in this eval, not a
defect in the app: a complaint with no falsifiable content has nothing a
DOM rehearsal can assert.

## Reproducing any single finding

Every row above is `eval/results/stress-eval-all.json[model][object][turnIndex-1]`.
`codeSnapshot` is populated on any row where structural, behavioral, or
regression findings fired, holding the artifact's actual code at that point.

---

## Verification pass (2026-08-18) — two fixes, three runs, one corrected mid-course

Not written by this eval's original session. A separate diagnosis pass (11
subagents, adversarially cross-checked) traced the two root causes behind the
findings above to exact lines in `widget.js` and `build-log.js`/`app.js`. Two
independent fixes ended up landing, in this order:

1. **The witness gate** (another concurrent session, in `app.js`): a
   `witnessRegressed` check on the previously-ungated `routeAndPublish` path
   plus a birth-time witness in `publishBuild`, closing the turn-1/
   first-post-rezero blind spot the original `foldTurn` gate already had
   elsewhere.
2. **The router fix** (this session, in `widget.js`, scoped there
   specifically to avoid colliding with the concurrent `app.js` edit):
   `routeSegment`'s `kind` now reads the `judged`/`resolved` distinction
   `iterationTell` already computed internally but previously discarded —
   `kind: tell === "resolved" && introducesAnything(message) ? "revise" :
   "rezero"` — instead of hard-coding `kind: "rezero"` for every match, so a
   plain feature-add that merely points at existing content no longer
   concedes a ground it never judged. `introducesAnything` was exported so
   this eval's harness (which calls the pre-turn `routeMessage` face, not
   `routeSegment`) could apply the identical rule — `app.js`'s `send()`
   still hard-codes `rezero: true` unconditionally and was not touched;
   that half of the fix remains a handoff, not applied here.

Three full 68-turn runs exist, in order: **original** (pre-fix, both root
causes live), **gate-only** (witness gate landed, router fix not yet
written), **both-fixes** (this eval's harness updated to mirror both). Raw
logs, since the JSON result files on disk only ever hold the latest run:
`/tmp/stress-eval-run.log` (original), `/tmp/stress-eval-postfix-run.log` +
`/tmp/stress-eval-postfix-qwen-run.log` (gate-only — the qwen leg of the
first attempt died silently between runs, no error, process just absent,
restarted clean as a second file), `/tmp/stress-eval-final-run2.log`
(both-fixes — the first both-fixes attempt, `-final-run.log`, was killed
mid-run after turn 2 exposed a real boolean-logic bug in this harness's own
port of the fix, `!(resolved && !introduces)` instead of `!(resolved &&
introduces)` — caught by watching `[rezero:resolved]` fire on an ask that
plainly should have revised, fixed, and the run restarted clean).

### The headline number: structural corruption stays at zero, and now for a real reason

| run | landed | **landed/dirty** | refused(regressed) |
|---|---|---|---|
| gemma2:2b × spreadsheet — original | 9/17 | **3** | 0 |
| gemma2:2b × spreadsheet — gate-only | 6/17 | **0** | 3 |
| gemma2:2b × spreadsheet — both-fixes | 8/17 | **0** | 2 |
| gemma2:2b × tasklist — original | 12/17 | **11** | 0 |
| gemma2:2b × tasklist — gate-only | 14/17 | **0** | 2 |
| gemma2:2b × tasklist — both-fixes | 8/17 | **0** | 5 |
| qwen2.5-coder:7b × spreadsheet — original | 16/17 | **16** | 0 |
| qwen2.5-coder:7b × spreadsheet — gate-only | 15/17 | **0** | 0 |
| qwen2.5-coder:7b × spreadsheet — both-fixes | 12/17 | **0** | 4 |
| qwen2.5-coder:7b × tasklist — original | 15/17 | **12** | 0 |
| qwen2.5-coder:7b × tasklist — gate-only | 16/17 | **0** | 1 |
| qwen2.5-coder:7b × tasklist — both-fixes | 15/17 | **0** | 2 |

`landed/dirty` is zero in every gate-having run — confirmed again with both
fixes present, not just the gate alone. But `refused(regressed)` rises in
three of four runs from gate-only to both-fixes (3→2 is the one exception;
2→5, 0→4, 1→2 are increases), and `landed` correspondingly drops in three of
four. This is not the gate getting stricter — the gate's own logic did not
change between these two runs. It is the router fix changing what actually
gets attempted: with rezero no longer firing on every hit, feature-add turns
now correctly stack as SUPERSEDE patches on ONE thread instead of forking
into fresh re-zeroed grounds (see the rezero/revise counts below), so the
code each new patch lands against is genuinely longer-lived and more
structurally interconnected than it was under gate-only — exactly the
long-SUPERSEDE-runs behavior CLAUDE.md's build-log section describes as the
intent, and exactly the condition under which a later edit has more real
surface area to break. The gate catching more regressions here is a sign the
mechanism is now exercising the code path it was designed for, not a
regression in the gate itself.

### The router fix, confirmed live: rezero rate drops sharply in all four runs

| run | original: rezero/revise | gate-only: rezero/revise | both-fixes: rezero/revise |
|---|---|---|---|
| gemma2:2b × spreadsheet | 14 / 3 | 13 / 4 | **4 / 5** |
| gemma2:2b × tasklist | 16 / 1 | 14 / 3 | **4 / 5** |
| qwen2.5-coder:7b × spreadsheet | 15 / 2 | 13 / 4 | **7 / 5** |
| qwen2.5-coder:7b × tasklist | 16 / 1 | 16 / 1 | **6 / 9** |

Gate-only barely moved the rezero/revise split at all (14→13, 16→14, 15→13,
16→16) — direct, live confirmation of the diagnosis's own finding that the
witness gate and the router misroute are independent defects, and fixing
one does nothing for the other. Both-fixes shows a sharp, consistent drop in
every run — the router fix is doing exactly what it was built for, live, not
just in the isolated `widget.test.mjs` conformance suite.

Live label evidence, turn 1 of gemma2:2b × tasklist across all three runs —
the report's own original repro case, `"add a delete button next to each
task"`: **original** — `[rezero:resolved]`, landed dirty (`<input
id="what">` deleted). **gate-only** — `[rezero:resolved]`, refused
(regressed) — routing unchanged, only the outcome fixed. **both-fixes** —
`[revise:resolved]`, refused (regressed) — routing itself now correct too;
this particular sampling still produced a regressing edit, so the gate still
earns its keep, but the entry that would have landed is now correctly typed
as an ordinary revision attempt, not a conceded ground.

### The router fix's own disclosed limit, confirmed live twice

**Case A — genuinely definite phrasing never gets picked up**, exactly as
the diagnosis predicted: "show the average of the cells too, next to the
sum" and "highlight the cell with the highest value in yellow" and "sort
high priority tasks to the top of the list" all still land `[rezero:...]`
in the both-fixes run — no indefinite article anywhere in any of them
("the average", "the cell", "the list"), so `introducesAnything` correctly
reads them as carrying no positive evidence of an addition, even though
they plainly are feature requests. Nothing regressed here — these asks
landed `[rezero:...]` in EVERY run, including the original — but the fix
does not close them either, and was never claimed to.

**Case B — found live, not anticipated going in**: the reverse error. "it
is broken, the button does nothing" was the exact case caught during this
fix's own development (a genuine bug report wrongly reclassified as
`revise` on the first attempt, because it points at "button" with no
negation+first-person — fixed by requiring `introducesAnything` in addition
to `tell === "resolved"`, not the absence of a judgment signal alone). The
SAME shape recurred live in this run at a different phrasing: "clicking a
task to mark it done isn't working right, fix it" (gemma×tasklist,
gate-only turn 6 / both-fixes turn 6) lands `[revise:resolved]` — a genuine
bug report that happens to contain the incidental indefinite phrase "a
task" (referring to the general concept, not introducing a new one), which
is enough to satisfy `introducesAnything`'s coarse, message-wide check. Not
a new bug relative to what shipped — the fix's own header names this
residue explicitly ("`judged`... does not catch this phrasing either") —
but worth confirming it recurs under realistic phrasing, not only the one
case that was hand-caught during development.

### What neither fix touches: behavioral drift is uncapped

| run | original: BEH-FAIL | gate-only: BEH-FAIL | both-fixes: BEH-FAIL |
|---|---|---|---|
| gemma2:2b × spreadsheet | 3 | 5 | 3 |
| gemma2:2b × tasklist | 4 | 5 | 2 |
| qwen2.5-coder:7b × spreadsheet | 9 | 6 | 2 |
| qwen2.5-coder:7b × tasklist | 7 | 4 | 5 |

Both-fixes shows the lowest BEH-FAIL count in three of four runs and a
middle value in the fourth — a plausible but not statistically forceful
signal, at n=17 per cell, that keeping features on one accumulating thread
(rather than re-zeroing into fresh grounds that discard the model's own
continuity) produces somewhat more semantically correct edits. Not claimed
as proven at this sample size — flagged as the one metric worth a larger
run if anyone wants to chase it. What both fixes leave completely untouched
either way: `witnessCode` checks script-syntax/dangling-id/unclosed-root
only, never "does the average actually compute right," and nothing in
either fix adds a behavioral check to the gate.

### Summary

| root cause | status | evidence |
|---|---|---|
| 1. Router misroutes feature-adds as REC | **Fixed for the diagnosed class** (indefinite-article-introduced feature-adds) — confirmed live, rezero rate drops sharply in all 4 runs; **disclosed residual gap** for definite-only phrasing (never claimed) and a coarse false-positive on bug reports containing an incidental indefinite phrase (named in the fix's own header, reproduced live once more) | rezero/revise counts table above; turn-1 label trace across all 3 runs |
| 2. Unchecked patch corruption | **Closed for structural regressions**, confirmed stable across 2 independent runs with the gate present | `landed/dirty: 0` in both gate-only and both-fixes, all 4 runs each |
| 3. Re-zero launders corrupted code into a "fresh" ground | **Closed** — gate applies uniformly to REC and SYN landings | `refused(regressed)` firing under both REC-heavy (gate-only) and SUPERSEDE-heavy (both-fixes) routing |
| (found during this verification, not the original diagnosis) Fixing the router changes downstream dynamics, not just the routing label | **Confirmed real, not a regression** — longer-lived SUPERSEDE threads give the gate more real surface area to catch, which is why `refused(regressed)` rises and `landed` falls from gate-only to both-fixes in 3 of 4 runs | rezero/revise shift table + regressed-count shift, same runs |
| (new, not in original diagnosis) Behavioral/semantic drift | **Untouched by either fix** — BEH-FAIL trends lower with both fixes present but not to zero, and nothing added checks for it | BEH-FAIL table above |
