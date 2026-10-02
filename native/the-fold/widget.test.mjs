// widget.test.mjs — an html widget, end to end, iterated by complaint.
//
// This is the whole path the user asked for, run over the REAL modules with
// no stub anywhere in the chain: the model's answer text → artifact.js's
// segment parse → widget.js's mechanical routing off the OPERATOR's words →
// build-log.js's append-only log over eoreader6's actual
// engine/holon/task-log.js → the projection, the cursor, the download, the
// replay. The one thing that is faked is the model, and only the model:
// every "answer" below is a literal string standing in for a turn's output,
// because what is under test is what the instrument does with an answer, not
// how it got one.
//
// The claim being pinned: "I don't like the colors" and "it's broken" land on
// the widget that already exists, as re-zeros on ITS log, and never as new
// builds — while "make me a countdown timer in python" still lands as a new
// build. Both halves matter. A router that never forks is as broken as one
// that always does; it just fails in the direction nobody notices until two
// unrelated artifacts are sharing one thread.

import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as taskLog from "../kernel/task-log.js";
import { checkCubeProgression } from "../kernel/task-log.js";
import { RENDERABLE, parseSegments, toDocument } from "./artifact.js";
import { makeBuildLog } from "./build-log.js";
import { tokenize } from "../organs/source.js";
import * as enginePriors from "../adapters/text/priors.js";
import { CLAUSE_OPENERS } from "../adapters/text/priors.js";
import { classifyWord, dominantClass } from "../adapters/text/wordclass.js";
import { GRAMMAR_MIN_SHARE } from "../adapters/text/grain-typing.js";
import { makeWidgetRouter } from "./widget.js";
import { skeletonFor } from "./code-piece.js";

// The router bound to the engine's REAL prior register — the same closed
// classes the page gets from /engine. No stub carries these walls either.
const { iterationTell, routeMessage, routeSegment } = makeWidgetRouter(enginePriors);

// The PRE-FIX router the fail-then-pass tests need: the register minus
// CLAUSE_OPENERS and with no POS prior. When these tests were first written,
// `enginePriors` pointed at the frozen legacy provider, which predated
// CLAUSE_OPENERS (promoted into the register 2026-09-01) — so the bare
// router WAS the pre-fix shape. The native register now carries
// CLAUSE_OPENERS itself (this file's own enginePriors import moved to it),
// so the pre-fix shape must be reconstructed by stripping the class
// explicitly rather than by pointing at an older provider — the same
// "the fixture must match what ships" discipline P193's own lesson names.
const { CLAUSE_OPENERS: _preFixOpener, ...preFixPriors } = enginePriors;
const preFixRouter = makeWidgetRouter(preFixPriors);

// A SECOND router, additive to the one above — bound the way app.js actually
// binds it in production: `routedReal` merges in CLAUSE_OPENERS (already in
// the native register, kept explicit here) and the real, committed
// UD-treebank POS prior (priors-data/pos-prior-eng.json — the SAME file
// app.js fetches), so the specimens below are verified against what actually
// ships, not a stand-in.
const here = path.dirname(fileURLToPath(import.meta.url));
const realPosPrior = JSON.parse(fs.readFileSync(path.join(here, "../eval/the-fold/fixtures/pos-prior-eng.json"), "utf8"));
const routedReal = makeWidgetRouter(
  { ...enginePriors, CLAUSE_OPENERS },
  { classifyWord, dominantClass, posPrior: () => realPosPrior, GRAMMAR_MIN_SHARE },
);

const buildLog = makeBuildLog(taskLog);

// ── the stand-in for a conversation ─────────────────────────────────────────
//
// A miniature of app.js's own publish path: builds in birth order, each one
// its log; a turn routes its segments and either opens a build or re-zeroes
// one. Deliberately small — if this needed app.js's DOM to be true, the
// routing would be living in the wrong place.

function makeDesk() {
  const builds = [];
  return {
    builds,
    /** One turn: the operator's words in, the model's answer, what happened. */
    turn(message, answer) {
      const acts = [];
      const landedThisTurn = [];
      for (const seg of parseSegments(answer)) {
        if (seg.type === "prose") continue;
        const route = routeSegment(
          seg,
          message,
          builds.map((b) => ({ n: b.n, ...kindOf(b), text: textOf(b) })),
          { landedThisTurn },
        );
        const landed = route.lang && route.lang !== seg.lang ? { ...seg, lang: route.lang } : seg;
        if (route.kind === "revise") {
          const t = builds.find((b) => b.n === route.n);
          t.log = buildLog.reviseBuild(t.log, { code: landed.code, reason: "restated" });
          acts.push({ act: "revise", n: t.n });
        } else if (route.kind === "rezero") {
          const target = builds.find((b) => b.n === route.n);
          const before = target.log.entries.length;
          target.log = buildLog.rezeroBuild(target.log, {
            seg: landed,
            code: landed.code,
            trigger: route.trigger,
            tell: route.tell,
          });
          acts.push({ act: "rezero", n: target.n, appended: target.log.entries.length - before });
          landedThisTurn.push({ n: target.n, type: landed.type, lang: landed.lang });
        } else {
          const n = builds.length + 1;
          builds.push({ n, log: buildLog.proposeBuild({ n, turn: builds.length + 1, seg, caption: seg.lang }) });
          acts.push({ act: "new", n, why: route.why });
          landedThisTurn.push({ n, type: seg.type, lang: seg.lang });
        }
      }
      return acts;
    },
  };
}

const kindOf = (b) => {
  const seg = buildLog.foldBuild(b.log).seg;
  return { type: seg.type, lang: seg.lang };
};
const project = (b) => buildLog.foldBuild(b.log);
/** A build's own words: its caption and its current projection. */
const textOf = (b) => {
  const f = buildLog.foldBuild(b.log);
  return `${f.caption ?? ""}\n${f.code ?? ""}`;
};

const WIDGET_V1 = `Here is a counter widget.

\`\`\`html
<div id="c" style="color:#f0f">0</div>
<button onclick="c.textContent=+c.textContent+1">+1</button>
\`\`\`
`;

const WIDGET_V2 = `Recoloured to a calmer palette.

\`\`\`html
<div id="c" style="color:#334155">0</div>
<button onclick="c.textContent=+c.textContent+1">+1</button>
\`\`\`
`;

const WIDGET_V3 = `The handler was referencing an id that was never bound. Fixed.

\`\`\`html
<div id="c" style="color:#334155">0</div>
<button onclick="document.getElementById('c').textContent=+document.getElementById('c').textContent+1">+1</button>
\`\`\`
`;

// ── the end-to-end walk ─────────────────────────────────────────────────────

test("e2e: an html widget is built, then iterated by complaint onto its own log", () => {
  const desk = makeDesk();

  // 1. The widget is asked for and born. An html segment is RENDERABLE — the
  //    artifact is the thing itself, and the document the preview frame gets
  //    is the document the download gets, because one injected toDocument
  //    produces both.
  const born = desk.turn("make me a counter widget in html", WIDGET_V1);
  assert.deepEqual(born.map((a) => a.act), ["new"]);
  assert.equal(desk.builds.length, 1);
  const widget = desk.builds[0];
  assert.equal(project(widget).seg.lang, "html");
  assert.ok(RENDERABLE.has(project(widget).seg.lang));
  assert.match(toDocument(project(widget).seg), /<button/);
  assert.equal(project(widget).ground, 1);
  assert.equal(project(widget).version, 1);

  // 2. "I don't like the colors" — no build named, no artifact demanded. It
  //    lands on the widget, as a RE-ZERO on the widget's own log.
  const complained = desk.turn("I don't like the colors", WIDGET_V2);
  assert.deepEqual(complained, [{ act: "rezero", n: 1, appended: 3 }]);
  assert.equal(desk.builds.length, 1, "a complaint must not fork the widget");
  assert.equal(project(widget).ground, 2);
  assert.match(project(widget).code, /#334155/);

  // 3. "it's broken" — the second re-zero, on the SAME log. Iteration is not
  //    a one-shot: a widget is complained at until it is right.
  const fixed = desk.turn("it's broken, the button does nothing", WIDGET_V3);
  assert.deepEqual(fixed, [{ act: "rezero", n: 1, appended: 3 }]);
  assert.equal(desk.builds.length, 1);
  assert.equal(project(widget).ground, 3);
  assert.match(project(widget).code, /getElementById/);

  // 4. Nothing was overwritten. Every ground the widget ever had is still on
  //    the log and still folds back at its own cursor position, byte-exact.
  // Each re-zero now lands three entries (concession, amended ask, rebirth).
  const seqs = widget.log.entries.map((e) => e.seq);
  assert.deepEqual(seqs, [0, 1, 2, 3, 4, 5, 6]);
  assert.match(buildLog.foldBuild(widget.log, 0).code, /#f0f/);
  assert.match(buildLog.foldBuild(widget.log, 3).code, /#334155/);
  assert.match(buildLog.foldBuild(widget.log, 6).code, /getElementById/);

  // 5. Downloadable at any cursor, as the rendered document, named by the
  //    address those bytes actually live at.
  const first = buildLog.exportAt(widget.log, 0, { toDocument });
  assert.equal(first.name, "build-1@0.html");
  assert.equal(first.mime, "text/html");
  assert.match(first.text, /#f0f/);
  assert.match(buildLog.exportAt(widget.log, null, { toDocument }).name, /^build-1@6\.html$/);

  // 6. The algebra never runs backward, across every ground — the engine's
  //    own checker, not a local restatement of it.
  assert.deepEqual(checkCubeProgression(widget.log), []);

  // 7. The log rebuilds from its serialized entries alone (P3's resumption
  //    property) — which is what makes the record, not the page, the truth.
  const replayed = buildLog.replayEntries(JSON.parse(JSON.stringify(widget.log.entries)));
  for (let s = 0; s < widget.log.nextSeq; s++) {
    assert.deepEqual(buildLog.foldBuild(replayed, s), buildLog.foldBuild(widget.log, s));
  }
});

test("e2e: a demand for a different artifact still forks, and does not touch the widget", () => {
  const desk = makeDesk();
  desk.turn("make me a counter widget in html", WIDGET_V1);
  desk.turn("I don't like the colors", WIDGET_V2);

  const forked = desk.turn(
    "now make me a countdown timer in python",
    "Sure.\n\n```python\nfor i in range(3, 0, -1):\n    print(i)\n```\n",
  );
  assert.deepEqual(forked.map((a) => a.act), ["new"]);
  assert.equal(desk.builds.length, 2);
  // The widget's log did not move: two grounds, four entries (the re-zero
  // lands concession + amended ask + rebirth), untouched.
  assert.equal(desk.builds[0].log.entries.length, 4);
  assert.equal(project(desk.builds[0]).seg.lang, "html");
  assert.equal(project(desk.builds[1]).seg.lang, "python");

  // And a complaint after the fork lands on the PYTHON build, because that is
  // what "it" now points at — same kind, most recent.
  desk.turn("it's broken", "```python\nfor i in range(3, 0, -1):\n    print(i)\nprint('go')\n```\n");
  assert.equal(desk.builds.length, 2);
  assert.equal(buildLog.foldBuild(desk.builds[1].log).ground, 2, "the python build took the complaint");
  assert.equal(desk.builds[0].log.entries.length, 4, "the widget's log did not move again");
});

test("e2e: a complaint answered in a different language is a new build, not a version of the widget", () => {
  const desk = makeDesk();
  desk.turn("make me a counter widget in html", WIDGET_V1);
  // The operator complains about the widget; the model answers with python.
  // A python file is not a version of an html widget, whatever the words
  // around it said, so the kind match refuses the route.
  const acts = desk.turn("it's broken", "```python\nprint('counter')\n```\n");
  assert.deepEqual(acts.map((a) => a.act), ["new"]);
  assert.equal(desk.builds.length, 2);
  assert.equal(buildLog.foldBuild(desk.builds[0].log).ground, 1);
});

test("a turn is one act: several blocks of one kind are versions, not siblings", () => {
  // Measured live against gemma2:2b (2026-08-17): asked for one counter
  // widget, it replied with FIVE html fences, and every one of them opened
  // its own build — one request, five orphans. This is that regression.
  const desk = makeDesk();
  const acts = desk.turn(
    "make me a counter widget in html",
    [
      "Here you go.", "", "```html", "<div>0</div>", "```", "",
      "Or with a button:", "", "```html", "<div>0</div><button>+1</button>", "```", "",
      "Or styled:", "", "```html", "<div style=\"color:#334155\">0</div><button>+1</button>", "```", "",
    ].join("\n"),
  );
  assert.deepEqual(acts.map((a) => a.act), ["new", "revise", "revise"]);
  assert.equal(desk.builds.length, 1, "one request, one build");
  const live = project(desk.builds[0]);
  assert.equal(live.version, 3, "each restatement is a version on the one log");
  assert.equal(live.ground, 1, "nobody judged anything, so no ground was conceded");
  assert.match(live.code, /#334155/, "the projection is the last block the turn produced");
  // Restatement is SUPERSEDE · SYN, never REC — a re-zero needs a judgment.
  assert.equal(desk.builds[0].log.entries.filter((e) => e.operator === "REC").length, 0);
  assert.deepEqual(checkCubeProgression(desk.builds[0].log), []);
});

test("two different kinds in one turn are still two builds", () => {
  const desk = makeDesk();
  const acts = desk.turn(
    "make me a counter widget and the python that generates it",
    "```html\n<div>0</div>\n```\n\n```python\nprint(0)\n```\n",
  );
  assert.deepEqual(acts.map((a) => a.act), ["new", "new"]);
  assert.equal(desk.builds.length, 2, "an html widget and a python script are not versions of each other");
});

test("an untagged fence is a gap, not a different kind: it lands where the words point", () => {
  // Measured live against gemma2:2b (2026-08-17): complained at about a
  // widget, it answered with a bare ``` fence holding the fix, and a strict
  // language match forked that onto a build of its own. Silence is not a
  // declaration of difference.
  const desk = makeDesk();
  desk.turn("make me a counter widget in html", WIDGET_V1);
  const acts = desk.turn("it's broken", "```\n<div id=\"c\">0</div><button>+1</button>\n```\n");
  assert.deepEqual(acts.map((a) => a.act), ["rezero"]);
  assert.equal(desk.builds.length, 1);
  // And the widget keeps its declared language — losing it would cost the
  // build its preview frame and its .html download.
  const live = project(desk.builds[0]);
  assert.equal(live.seg.lang, "html");
  assert.equal(live.ground, 2);
  assert.equal(buildLog.exportAt(desk.builds[0].log, null, { toDocument }).mime, "text/html");
});

test("a DECLARED different language still forks — silence is the only exception", () => {
  const desk = makeDesk();
  desk.turn("make me a counter widget in html", WIDGET_V1);
  const acts = desk.turn("it's broken", "```python\nprint('counter')\n```\n");
  assert.deepEqual(acts.map((a) => a.act), ["new"]);
  assert.equal(desk.builds.length, 2);
});

test("routeMessage: the pre-turn face — a complaint routes before any model call", () => {
  // This is what makes iteration reliable rather than probabilistic: the
  // decision is made from the operator's words alone, so the caller can run
  // a SIGHTED revision (the /fold machinery) instead of hoping the model
  // re-emits a fence into ordinary chat.
  const builds = [
    { n: 1, type: "code", lang: "html", text: 'html\n<div id="counter">0</div><button>+1</button>' },
    { n: 2, type: "code", lang: "python", text: "python\nprint(3)" },
  ];
  // Anaphora and judgment route to the NEWEST code build.
  assert.deepEqual(routeMessage("it's broken", builds), { n: 2, tell: "anaphora", trigger: "it's broken" });
  // A definite phrase routes to the build whose OWN bytes contain it.
  assert.equal(routeMessage("the button does nothing", builds).n, 1);
  // The number is the reference, read from the operator.
  assert.equal(routeMessage("build 1 is broken", builds).n, 1);
  // Creation demands and material questions do not route.
  assert.equal(routeMessage("make me a countdown timer", builds), null);
  assert.equal(routeMessage("what does the report say about funding", builds), null);
  // With nothing built, nothing routes.
  assert.equal(routeMessage("it's broken", []), null);
  // A table is not revisable by complaint.
  assert.equal(routeMessage("it's broken", [{ n: 1, type: "table", text: "a b" }]), null);
});

test("iterationTell: the html document's own wrapper tags never count as a content match", () => {
  // Measured live, 2026-08-17: a session with one existing html build (a
  // canvas drawing app) asked to build a SECOND, unrelated html widget —
  // "make me a spreadsheet grid in html, each cell editable" — and it
  // re-zeroed the drawing app instead of opening a new build, because
  // <!DOCTYPE html><html>...</html> contributes the token "html" to every
  // html-typed build's bytes by construction. That token can never
  // discriminate one build's content from another's, so it must not count.
  const drawingApp =
    '<!DOCTYPE html><html><head><title>Simple Drawing App</title></head>' +
    '<body><canvas id="myCanvas"></canvas><button id="clearButton">Clear</button></body></html>';
  assert.equal(iterationTell("make me a spreadsheet grid in html, each cell editable", drawingApp), null);
  // The wrapper tags are stripped; everything nested inside them is not —
  // a real referent living in <title> or the body still resolves exactly
  // as before this fix.
  assert.equal(iterationTell("the clear button is broken", drawingApp), "resolved");
  assert.equal(iterationTell("the drawing app's title is wrong", drawingApp), "resolved");

  // The SECOND source of the same token, found completing this same
  // measurement: production's `known` is always `caption + "\n" + code`
  // (app.js's buildWords), and an unrenamed caption defaults to the bare
  // language ("html") — so the string's own first line carries the same
  // non-discriminating token through a different field. routeMessage's own
  // build shape (n/type/lang/text) is exactly this concatenation.
  const builds = [{ n: 1, type: "code", lang: "html", text: "html\n" + drawingApp }];
  assert.equal(routeMessage("make me a spreadsheet grid in html, each cell editable", builds), null);
  assert.equal(routeMessage("the clear button is broken", builds).n, 1);
});

test("iterationTell: code-piece.js's own python scaffold never counts as a content match", () => {
  // Found live in a battery-tested conversation: a workspace carried two
  // leftover code-piece builds from earlier sessions — a coin-flip
  // simulator and an "adds up the first 10 even numbers" script — and
  // ordinary small talk kept re-zeroing one of them. "one more random
  // one" (idle filler in a favorite-season question) routed onto the
  // coin-flip build, and "what did I say my dog's name was" routed onto
  // the unrelated even-numbers build. Neither message is about code.
  // Both false positives trace to code-piece.js's OWN generated
  // scaffold: `skeletonFor`'s header always writes `import random` /
  // `import sys` regardless of the task, and `main()`'s own per-step
  // witness line always reads `type(rN).__name__` — so "random" and
  // "name" (from `__name__`) are contributed by EVERY python code-piece
  // build's bytes by construction, the same non-discriminating-token
  // shape the html wrapper test above already pins for `<html>`/`<head>`/
  // `<body>`. Built from the REAL generator (`skeletonFor`), not a
  // hand-typed approximation, so this test tracks the scaffold's actual
  // shape if it ever changes.
  const coinFlip = skeletonFor("python", "simulates 20 coin flips and counts heads vs tails", [
    "simulates 20 coin flips",
    "counts heads vs tails",
  ]);
  const coinFlipKnown = `python: simulates 20 coin flips and counts heads vs tails\n${coinFlip.code}`;
  assert.match(coinFlipKnown, /import random/, "the fixture actually carries the scaffold this test is about");
  assert.equal(iterationTell("one more random one", coinFlipKnown), null);

  const evenSum = skeletonFor("python", "adds up the first 10 even numbers and prints the sum", [
    "adds up the first 10 even numbers",
    "prints the sum",
  ]);
  const evenSumKnown = `python: adds up the first 10 even numbers and prints the sum\n${evenSum.code}`;
  assert.match(evenSumKnown, /__name__/, "the fixture actually carries the scaffold this test is about");
  assert.equal(iterationTell("what did I say my dog's name was again?", evenSumKnown), null);

  // The affordance is narrower, never absent: real task vocabulary the
  // model actually wrote into the function names still resolves.
  assert.equal(iterationTell("the coin flip simulation is broken", coinFlipKnown), "resolved");
  assert.equal(iterationTell("fix adds_up_first_even", evenSumKnown), "resolved");

  // The SECOND source, routeMessage's own build shape (buildWords'
  // caption + "\n" + code), stays refused too.
  const builds = [{ n: 6, type: "code", lang: "python", text: coinFlipKnown }];
  assert.equal(routeMessage("one more random one", builds), null);
});

test("iterationTell/routeMessage: code-piece.js's own per-step witness marker never counts as a content match (live, 2026-09-15)", () => {
  // Reported live: built a small python "median of a list" function via
  // the Coding tab (fold 3 in the reported conversation, fold 1 here —
  // the mechanism is identical either way). Several ordinary chat turns
  // later, a long, plain, non-coding farewell — "fair enough, pretty
  // standard answer honestly but fine. ok, I've got to step away for now
  // - this has been a fun poke around. thanks for the poem, the story,
  // catching your own math mistake, and putting up with the nonsense
  // string. talk again soon" — silently routed into a fold-revision
  // attempt against that leftover build instead of being answered as
  // ordinary chat. The model was asked to revise
  // `print(f"[step 1 function_computes_median_list] …")` per the whole
  // farewell, returned the identical code back, and the only thing
  // rendered was "the model returned identical code — fold 1 is
  // unchanged (churn refused by the log)" — no reply to the farewell at
  // all. Reproduced live against the real page (gemma2:2b), confirmed via
  // the turn's own "what the model saw" panel: `tell: "resolved"`,
  // matched on the single word "step" — present in the farewell ("step
  // away") and, by pure instrument construction, present in EVERY
  // code-piece build's own generated `main()` (`skeletonFor`'s per-step
  // witness line, python and js alike), regardless of what the function
  // actually does. `foldTurn` itself has no fallback to an ordinary
  // answer once `routeMessage` commits a turn to fold revision — by
  // design, it is a dedicated revision turn, not a maybe — so the fix has
  // to stop the false match at the router, the same place
  // stripHtmlWrapper/stripPyScaffold already close this exact failure
  // shape for other instrument-only tokens.
  const median = skeletonFor("python", "a function that computes the median of a list of numbers", [
    "a function that computes the median of a list of numbers",
  ]);
  const medianKnown = `a function that computes the median of a list of numbers\n${median.code}`;
  assert.match(medianKnown, /\[step 1 /, "the fixture actually carries the per-step marker this test is about");
  const farewell =
    "fair enough, pretty standard answer honestly but fine. ok, I've got to step away for now - " +
    "this has been a fun poke around. thanks for the poem, the story, catching your own math " +
    "mistake, and putting up with the nonsense string. talk again soon";
  assert.equal(iterationTell(farewell, medianKnown), null);

  const builds = [{ n: 1, type: "code", lang: "python", text: medianKnown }];
  // The live specimen's own discourse was not empty — several ordinary
  // turns (an arithmetic question, a nonsense string) sat in the recency
  // window, and one of them ("Multiply the decimal by the number...")
  // shares the plain word "number" with the build's own "numbers" — a
  // second, independent coincidence that alone satisfies discourseLocal.
  // The fix must hold even so, because the primary tell (not the
  // discourse gate) is where this false positive actually lives.
  const liveDiscourse = [
    "hey, what's 15% of 240? show me the calculation, then tell me if you think you might have made an arithmetic error anywhere",
    "Here's how to calculate 15% of 240: ... Multiply the decimal by the number: 0.15 * 240 = 36. So, 15% of 240 is 36. I don't think I made any arithmetic errors.",
    "asdlkfjqwoeiru zzzz blorp glorpxx 918273 !!!",
    "It looks like you're just making random sounds!",
  ].join("\n");
  assert.equal(routeMessage(farewell, builds, { hasMaterial: false, discourse: liveDiscourse }), null);
  assert.equal(routeMessage(farewell, builds, { hasMaterial: false, discourse: "" }), null);

  // The affordance is narrower, never absent: a genuine complaint using
  // the build's own real vocabulary (never just the scaffold's "step")
  // still routes once the build is actually discourse-local.
  const discussed = `user: a function that computes the median of a list of numbers\nassistant: ${median.code}`;
  const complaint = routeMessage("the median function is broken, it always returns the wrong value", builds, {
    hasMaterial: false,
    discourse: discussed,
  });
  assert.equal(complaint?.n, 1);
  assert.ok(!complaint.matchedOn.includes("step"), "the scaffold marker itself never rides as evidence");
});

test("iterationTell/routeMessage: the per-step witness marker's own diagnostic half ('type'/'repr') never rides as content evidence either (live, 2026-09-15, chess-club specimen)", () => {
  // Found live, hours after the "step" fix above landed: a brand-new
  // conversation, three ordinary chat turns in (none about code), pasted
  // an original chess-club status report as an ordinary message. It
  // shared no anaphora, no determiner, nothing — except the word
  // "returning" ("returning champion Aisha Bello"), which stem-matched a
  // real "return" statement in a leftover python build's CURRENT code
  // (an is_prime function from an earlier, unrelated session). The
  // discourse-locality gate (above) should have refused this — none of
  // the conversation's own three prior turns mention "return" — but one
  // of them ("does the type of oil matter much for high-heat searing?")
  // shared the single word "type" with the SAME build's own generated
  // witness line (`{type(r1).__name__}: {repr(r1)[:120]}`, unconditional
  // in EVERY code-piece python build's `main()`, regardless of content),
  // which satisfied discourseLocal and let the later "returning~return"
  // match through unrefused. The router then re-zeroed the leftover
  // build with the chess-club prose as its "trigger", asked the model for
  // a {find, add} patch, and a SEG delete of every literal "return" in
  // the function landed — producing broken code (no return statements at
  // all) that failed at runtime with a bare IndentationError, and no
  // reply to the chess-club message was ever produced.
  const isPrime = skeletonFor("python", "a single function is_prime(n) that checks whether a number is prime", [
    "a single function is_prime(n) that checks whether a number is prime",
  ]);
  // skeletonFor's own stub has no real body to return from; splice in the
  // exact shape a model-completed version actually shipped with, so the
  // fixture carries a genuine, unrelated "return" the way the live build did.
  const primeCode = isPrime.code.replace(
    /raise NotImplementedError\([^)]*\)/,
    'if n <= 1:\n        return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0:\n            return False\n    return True',
  );
  const known = `python: a single function is_prime(n) that checks whether a number is prime\n${primeCode}`;
  assert.match(known, /\{type\(r1\)\.__name__\}/, "the fixture carries the generated diagnostic this test is about");
  assert.match(known, /\breturn False\b/, "the fixture carries a genuine, unrelated return statement");

  const builds = [{ n: 11, type: "code", lang: "python", text: known }];
  const chessClub =
    "Riverside Youth Chess Club - Fall Season Notes. We meet Tuesdays at the Riverside Community Center. " +
    "October tournament had 19 participants and was won by returning champion Aisha Bello.";
  // The three prior turns from the live specimen, none of which mention
  // "return" — only "type", from the scaffold's own diagnostic line.
  const discourse = [
    "does the type of oil matter much for high-heat searing, or is that overblown?",
    "It matters! For searing, a higher smoke point oil is ideal, like avocado oil.",
    "if you had to describe the color blue to someone who's been blind since birth, how would you start?",
    "Imagine the quietest, coldest part of a storm — that's the feeling of blue.",
  ].join("\n");
  // Sanity: before this fix, "type" alone satisfied discourseLocal.
  assert.equal(
    routeMessage(chessClub, builds, { hasMaterial: false, discourse: "" }),
    null,
    "with no discourse connection at all, the coincidental stem match must not route either",
  );
  assert.equal(
    routeMessage(chessClub, builds, { hasMaterial: false, discourse }),
    null,
    "a scaffold-only discourse coincidence ('type') must not license a later, unrelated stem match ('returning~return')",
  );
});

test("iterationTell/routeMessage: a bare numeral shared with the build's own bytes is never content evidence", () => {
  // Found live in the SAME battery this file's scaffold test above already
  // documents, one channel further: the leftover "adds up the first 10
  // even numbers" build (fold 7) does not need the MODEL to have filled in
  // its numbers to collide — `skeletonFor`'s own generated `main()` writes
  // an EVA witness line PER STEP ("[step 1 ...]", "[step 2 ...]"), so a
  // two-step build's bytes carry the digits "1" and "2" by construction,
  // before a single line of the actual feature is ever written. A document
  // question naming two speakers by number, "what are Human 1 and Human 2
  // talking about in this chat?", shared nothing else with the build but
  // matched on exactly those two digits and was routed into fold 7's
  // code-revision pipeline instead of answering the question — raw
  // apparatus (a `{find, add}` patch request, an autorun traceback) landing
  // in the visible chat reply, with zero relation to the diet/chat/etc.
  // material actually attached. A bare number is exactly the "referent-less
  // single-token" case P31 (CLAUDE.md) already refused as EVIDENCE for
  // grounding; this is the same refusal, one organ over.
  const evenSum = skeletonFor("python", "adds up the first 10 even numbers and prints the sum", [
    "adds up the first 10 even numbers",
    "prints the sum",
  ]);
  const known = `python: adds up the first 10 even numbers and prints the sum\n${evenSum.code}`;
  assert.match(known, /\[step 1 /, "the fixture actually carries the per-step digit this test is about");
  assert.match(known, /\[step 2 /, "the fixture actually carries the per-step digit this test is about");

  // A message with no anaphor in it at all — the numeral is the ONLY thing
  // that ever overlapped, so fixing it alone must be enough here.
  assert.equal(iterationTell("did Human 1 say they still keep in touch with the people they met?", known), null);
  // Not narrowed into silence: a numeral alone never counts, but a message
  // whose OTHER words share the build's real vocabulary still resolves.
  assert.equal(iterationTell("fix adds_up_first_even, it returned 1 instead of the sum", known), "resolved");

  const builds = [{ n: 7, type: "code", lang: "python", text: known }];
  assert.equal(routeMessage("did Human 1 say they still keep in touch with the people they met?", builds), null);

  // "in this chat" carries a SECOND, independent tell this test does not
  // own — "this" read pronominally with no POS prior loaded (the fall-open
  // behavior anaphoraTell's own header documents, exercised here with the
  // default `makeWidgetRouter(enginePriors)` this whole file uses, same as
  // every other bare-router test above). The numeral fix closes its own
  // channel regardless: swap the digits for words and the message no
  // longer resolves. The full repro — both digits AND "this chat" in one
  // message, against attached material — is the next test's.
  assert.equal(iterationTell("what are the two speakers talking about?", known), null);
});

test("iterationTell/routeMessage: a bare SPELLED-OUT numeral shared with the build's own bytes is never content evidence either (live, 2026-09-15, 'quick one' specimen)", () => {
  // Found live: "quick one - what's 5 subtracted from 12?" — an ordinary
  // arithmetic question with zero real relation to a leftover Coding-tab
  // build — hijacked fold 10 (a prime-checking function), "matched on:
  // one". Root cause verified directly against the real router rather than
  // assumed from the report: "one" is NOT a member of ANAPHORIC_PRONOUNS
  // (checked against the real closed class, priors.js — it holds only
  // "it"/"it's"/"this"/"this's"/"that"/"that's"/"these"/"those"), so
  // anaphoraTell never had anything to do with this specimen; the actual
  // channel is FORM RESOLUTION (matchedTerms/pointedTerms), because the
  // word "one" — a real, non-stopword, length-3 token — sat in the build's
  // own MODEL-WRITTEN docstring ("one is not considered a prime number"),
  // an ordinary natural-language aside a small model writes into generated
  // code about as often as a digit does. The fix is the digit-numeral
  // exclusion above, widened to its spelled-out form (isBareNumeral) —
  // never anaphoraTell, which was never the mechanism.
  const known = `python: checks whether a number is prime\ndef is_prime(n):\n    """Returns True if n is prime. Note: one is not considered a prime number, and neither is zero."""\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n`;
  assert.match(known, /\bone\b/, "the fixture actually carries the spelled-out numeral this test is about");
  assert.equal(iterationTell("quick one - what's 5 subtracted from 12?", known), null);
  const builds = [{ n: 10, type: "code", lang: "python", text: known }];
  assert.equal(routeMessage("quick one - what's 5 subtracted from 12?", builds), null);

  // Not narrowed into silence: a spelled-out numeral alone never counts,
  // but a message whose OTHER words share the build's real vocabulary
  // still resolves exactly as before.
  assert.equal(iterationTell("fix is_prime, it says one is prime", known), "resolved");

  // A genuine, non-numeral "one" idiom ("a good one", "which one") is
  // refused the identical way — the fix is the word's SHAPE (a member of
  // the closed cardinal-number class), not the specific sentence.
  assert.equal(iterationTell("nice work, that's a good one", known), "anaphora", "\"that's\" still fires anaphoraTell on its own — unaffected by the numeral fix");
  assert.equal(iterationTell("which one should I pick?", known), null, "no anaphor, no definite phrase, and now no bare-numeral match either");
});

test("routeMessage: a bare anaphor is not evidence for a leftover build once material is attached", () => {
  // The THIRD channel the same battery hit, closing the reported bug: a
  // genuinely anaphoric "that" ("does THAT sound like a healthy diet to
  // you?", asking about attached material) carries no byte evidence at all
  // — anaphoraTell reads only the message's own grammar — so it landed on
  // whichever code build merely happened to be live (fold 7, a leftover
  // from an unrelated earlier session; state.builds is the instrument's,
  // not one conversation's), even though the pronoun plainly pointed at
  // the material, not at a stray Python script. `hasMaterial` (the
  // caller's own liveSources/liveChunks reading, threaded in from app.js —
  // this module never reads state itself) narrows exactly that one channel.
  const builds = [{ n: 7, type: "code", lang: "python", text: "python: adds up the first 10 even numbers\ndef f():\n    return 0\n" }];

  // With no material attached, the affordance is unchanged: a bare anaphor
  // still routes exactly as every existing anaphora test above expects.
  assert.equal(routeMessage("does that sound right to you?", builds)?.n, 7);
  assert.equal(routeMessage("it's broken", builds, { hasMaterial: false })?.n, 7);

  // With material attached, the SAME message no longer routes by anaphora
  // alone — the pronoun is at least as likely to point at the material.
  assert.equal(routeMessage("does that sound like a healthy diet to you?", builds, { hasMaterial: true }), null);
  assert.equal(routeMessage("it's broken", builds, { hasMaterial: true }), null);
  // "this chat" carries the same unresolved-pronoun tell (no POS prior in
  // this file's own default router) — closed the identical way.
  assert.equal(routeMessage("what are Human 1 and Human 2 talking about in this chat?", builds, { hasMaterial: true }), null);

  // The affordance narrows, it does not vanish: real evidence tying the
  // message to THIS build — its own bytes, or an explicit build number —
  // still routes with material attached.
  assert.equal(routeMessage("adds_up_first_even is broken", builds, { hasMaterial: true })?.n, 7);
  assert.equal(routeMessage("build 7 is broken", builds, { hasMaterial: true })?.n, 7);
});

test("routeMessage: bare anaphora needs the build to be salient in THIS conversation's own discourse, not merely to exist in the workspace", () => {
  // `hasMaterial` (the test just above) closes the channel only when
  // material is attached. The SAME false positive was still reachable
  // with NOTHING attached at all: ordinary casual chat carrying a bare
  // "it"/"this"/"that" with no real referent still fired `anaphoraTell`
  // on grammar alone and reached whichever code build merely happened to
  // sit in `state.builds` — the instrument's own workspace-wide log
  // (CLAUDE.md: deliberately not per conversation), not this
  // conversation's. Confirmed live in the earlier QA pass: "one more
  // random one" and "what did I say my dog's name was again?" both
  // incorrectly matched a leftover coin-flip/even-numbers build through
  // this exact channel; "hey! how's it going" (an expletive "it") is the
  // plainer case this test isolates, since the other two ALSO happen to
  // be closed by the unrelated python-scaffold-stripping fix above
  // (stripPyScaffold) regardless of this gate.
  const coinFlip = skeletonFor("python", "simulates 20 coin flips and counts heads vs tails", [
    "simulates 20 coin flips",
    "counts heads vs tails",
  ]);
  const coinFlipKnown = `python: simulates 20 coin flips and counts heads vs tails\n${coinFlip.code}`;
  const builds = [{ n: 6, type: "code", lang: "python", text: coinFlipKnown }];

  // WITHOUT this fix (no `discourse` supplied at all — an older caller, or
  // every other test in this file), the affordance is unchanged: a bare
  // "it" still routes to whichever build merely exists. This is the
  // regression surface the fix below closes, pinned here so it stays
  // visible as the "before" half of the story.
  assert.equal(routeMessage("hey! how's it going", builds)?.n, 6);

  // A brand-new, unrelated conversation supplies its own recent discourse
  // (even an explicitly empty string, for the very first message) — and
  // none of it mentions the leftover coin-flip build, so the candidate is
  // refused. This is the actual reported bug, closed: casual small talk
  // in a fresh conversation no longer hijacks a stale, unrelated build.
  assert.equal(routeMessage("hey! how's it going", builds, { discourse: "" }), null);

  const seasonChat = "user: what's your favorite season?\nassistant: I don't have a favorite one, but autumn is popular for its colors.";
  assert.equal(routeMessage("hey! how's it going", builds, { discourse: seasonChat }), null);
  // The other two reported false positives, run through the same gate —
  // still null (the stripPyScaffold fix above already refuses these on a
  // different channel; this asserts the overall no-hijack behavior holds
  // with discourse locality checked too, not just when it is absent).
  assert.equal(routeMessage("one more random one", builds, { discourse: seasonChat }), null);
  const dogChat = "user: my dog's name is Biscuit.\nassistant: Biscuit is a great name!";
  assert.equal(routeMessage("what did I say my dog's name was again?", builds, { discourse: dogChat }), null);

  // The affordance narrows, it does not vanish: THIS conversation's own
  // recent discourse actually carrying the build's own words still routes
  // it, even with no material attached — a genuine "does it still work"
  // question about a build just discussed.
  const codeChat = `user: simulate 20 coin flips and count heads vs tails\nassistant: ${coinFlip.code}`;
  assert.equal(routeMessage("does it still work?", builds, { discourse: codeChat })?.n, 6);
});

test("routeMessage: discourse locality also narrows resolved/judgment, not only anaphora", () => {
  // Reported live, 2026-09-15: a workspace carried one leftover, broken
  // build — a "count down time" python script with a syntax error
  // (`time_left`, "Time left:") — from an earlier, unrelated session. In a
  // BRAND-NEW conversation, the very first message, plain small talk with
  // no slash command anywhere in it — "hey! first time poking at this.
  // what should I call you, and what are you actually good at?" — was
  // silently routed into a fold revision attempt against that build
  // instead of being answered as ordinary chat, matched on the single word
  // "time": a real, received English word, present by pure coincidence in
  // the idiom "first time poking" and in the script's own countdown
  // vocabulary. Before this fix, `stripHtmlWrapper`/`stripPyScaffold`/
  // `isBareNumeral` had no defense for this — "time" is none of a wrapper
  // tag, a scaffold token, or a bare numeral, it is ordinary content
  // vocabulary — and only the "anaphora" tell was ever checked against the
  // conversation's own discourse.
  const countdown =
    "python: count down time\n" +
    "def countdown(time_left):\n" +
    'print("Time left:", time_left)\n' +
    "while time_left > 0:\n" +
    "    time_left -= 1\n";
  const builds = [{ n: 1, type: "code", lang: "python", text: countdown }];
  const greeting = "hey! first time poking at this. what should I call you, and what are you actually good at?";

  // The "before" half of the story, kept visible the same way the anaphora
  // fix above pins it: a caller that never opts into discourse locality
  // (no `discourse` option at all) keeps today's behavior unchanged.
  assert.equal(routeMessage(greeting, builds)?.tell, "resolved");

  // A brand-new conversation's own recent discourse — even the explicitly
  // empty string a first message supplies — mentions none of the build's
  // words, so the coincidental single-word match is refused. This is the
  // actual reported bug, closed.
  assert.equal(routeMessage(greeting, builds, { discourse: "" }), null);

  // The same class of false positive reaches "judgment" through the
  // identical channel (judgment is "resolved" plus a negation+first-person
  // label) and is closed the same way.
  assert.equal(
    routeMessage("I really don't have much time today, can we keep this short?", builds, { discourse: "" }),
    null,
  );

  // The affordance narrows, it does not vanish: this conversation's own
  // recent discourse actually carrying the build's own words still routes
  // it — a genuine complaint about a countdown timer just discussed.
  const timerChat = "user: build me a countdown timer in python\nassistant: " + countdown;
  assert.equal(routeMessage(greeting, builds, { discourse: timerChat })?.n, 1);
  assert.equal(routeMessage("the countdown is broken", builds, { discourse: timerChat })?.n, 1);
});

test("routeMessage: a farewell sent after a build has genuinely entered this conversation's discourse is not swallowed by a fold revision (live, 2026-09-15, task_0e06ff56)", () => {
  // Reported live: build something in the Coding tab, click "send to
  // chat" (app.js's `sendChip` — the build's own spec and narration land
  // in `state.history` verbatim, the documented way a Coding-tab build
  // "auto-surfaces" into a conversation), then say a plain, warm goodbye.
  // `discourseLocal` (this file's own 2026-09-15 fix, the test block just
  // above) cannot help here: the build genuinely WAS just discussed in
  // this very conversation, so it correctly reads as locally salient —
  // and the goodbye still fired `anaphoraTell` on "This" (a bare
  // demonstrative, clause one of three, followed by the copula "was"),
  // re-zeroing the build with the WHOLE farewell as its edit instruction
  // and no reply to the farewell at all. Verified live against the real
  // page (gemma2:2b): the "revision" landed a broken indentation edit,
  // never an answer.
  const countdown = skeletonFor("python", "count down from a starting number to zero, printing each remaining second", [
    "count down from a starting number to zero",
    "print each remaining second",
  ]);
  const known = `python: count down from a starting number to zero, printing each remaining second\n${countdown.code}`;
  const builds = [{ n: 1, type: "code", lang: "python", text: known }];
  // The narration `sendChip` actually pushes (app.js: `typed` + `lines.
  // join("\n")`) — mentions the build's own function names, which is
  // exactly what makes the build discourse-local without the message
  // itself sharing any of the code's own vocabulary.
  const discourse =
    "user: count down from a starting number to zero, printing each remaining second\n" +
    "assistant: fold 1 born as a skeleton: 2 function(s) — count_down_starting_number_to_zero → print_each_remaining_second";

  // The bug: a warm goodbye, sent right after the build, still resolves.
  assert.equal(
    routeMessage("This was great, thank you so much for your help today. Goodbye for now!", builds, { discourse }),
    null,
  );
  // A second phrasing of the identical shape — this closes a CLASS, not
  // one hand-typed sentence.
  assert.equal(routeMessage("That's all for now, appreciate the help. Talk soon!", builds, { discourse }), null);

  // The affordance narrows, it does not vanish: the same message, with no
  // trailing clause to move on to, is still exactly this function's own
  // canonical anaphora case (the "before" half of the story, pinned
  // visible the same way every other narrowing in this file is).
  assert.equal(routeMessage("This was broken", builds, { discourse })?.n, 1);
  // And a genuine trailing complaint — the pronoun IS the message's own
  // last clause — still routes.
  assert.equal(routeMessage("Thanks for building this, it's broken though", builds, { discourse })?.n, 1);
  // The disclosed escape hatch: an explicit negated first-person judgment
  // anywhere in the message is unambiguous regardless of clause order.
  assert.equal(routeMessage("I don't like it, but thanks anyway!", builds, { discourse })?.n, 1);
});

test("routeMessage: the flagship same-conversation iteration is unaffected by discourse locality", () => {
  // The wall this fix must not break, stated in the caller's own terms
  // (app.js pushes the model's reply — code included — into state.history
  // VERBATIM the moment a build is produced, so the very next turn's
  // discourse already carries the just-built widget's own bytes): a build
  // made THIS turn, in THIS conversation, iterated on immediately by bare
  // complaint must still route, exactly as every anaphora test above (with
  // no `discourse` option at all) already expects.
  const builds = [{ n: 1, type: "code", lang: "html", text: 'html\n<div id="counter">0</div><button>+1</button>' }];
  const discourse =
    "user: make me a counter widget in html\n" +
    'assistant: html\n<div id="counter">0</div><button>+1</button>';

  assert.equal(routeMessage("it's broken", builds, { discourse })?.n, 1);
  assert.equal(routeMessage("make it blue", builds, { discourse })?.n, 1);

  // And a build from an OLDER exchange in a DIFFERENT conversation — the
  // regression this whole fix targets — stays refused even though the
  // grammar of the complaint is identical.
  assert.equal(routeMessage("it's broken", builds, { discourse: "user: what's the capital of France?\nassistant: Paris." }), null);
});

test("iterationTell: a non-Latin message is no longer short-circuited to null before resolvesInto runs (P62)", () => {
  // Before `forms`/`clauseForms` were widened past ASCII, a message written
  // wholly in a non-Latin script tokenized to [], and iterationTell's own
  // `if (!toks.length) return null` returned before `resolvesInto` — built
  // on `terms`/`tokenize`, already script-agnostic — ever got a chance to
  // run. A shared bare content word now resolves; no shared word still
  // correctly returns null; English is unchanged.
  const build = "הכפתור צבוע כחול"; // "the button is colored blue" — the build's own caption/code text
  assert.equal(iterationTell("שנה את צבע הכפתור", build), "resolved"); // "change the color of button"
  assert.equal(iterationTell("שנה את המסך", build), null); // "change the screen" — shares no content word
  assert.equal(iterationTell("change the button", "a button widget"), "resolved"); // unchanged

  // Disclosed, not fixed here: Hebrew's definite article is a bound PREFIX
  // ("the button" is one word, ha-button), not a separate word the way
  // English's "the" is — so a build's BARE noun and a message's
  // article-PREFIXED form of the same noun do not share a surface form.
  // That is a morphological gap (a received Hebrew-prefix-stripping prior
  // would close it), not the character-class one this pass closes.
  assert.deepEqual(tokenize("\u05e9\u05e0\u05d4 \u05d0\u05ea \u05d4\u05dc\u05d7\u05e6\u05df"), ["\u05e9\u05e0\u05d4", "\u05d4\u05dc\u05d7\u05e6\u05df"]); // "\u05d4\u05dc\u05d7\u05e6\u05df" (ha-button), never bare "\u05dc\u05d7\u05e6\u05df" (button)
});

test("routeMessage/routeSegment: a resolved/judgment tell always discloses which words it matched on", () => {
  // A THIRD instance of the same failure shape surfaced completing this
  // measurement, and it was the diagnostic: build 1 had already been
  // (mis-)rezeroed once into carrying a generateGrid() using "row"/"col",
  // so the NEXT ask matched on real — if accidentally acquired — overlap,
  // and diagnosing that by hand meant fetching localStorage and reading
  // raw bytes. A routing decision must say what it matched on, on the
  // record, not only in a debugger. This does not fix the underlying
  // category error (span/token overlap standing in for referent identity,
  // the same gap P11 names for prose) — it makes each decision legible
  // enough that the next collision is a fast read, not a reproduction.
  const builds = [{ n: 1, type: "code", lang: "html", text: 'html\n<table><td row="1"></td></table>' }];
  const routed = routeMessage("the row is broken", builds);
  assert.equal(routed.tell, "resolved");
  assert.deepEqual(routed.matchedOn, ["row"]);

  // "named" and "anaphora" carry no span evidence to disclose — they are
  // already self-explaining from the tell alone, and evidenceOf says so
  // by omitting the field entirely rather than an empty array pretending
  // to be evidence.
  assert.equal(routeMessage("build 1 is broken", builds).matchedOn, undefined);
  assert.equal(routeMessage("it's broken", builds).matchedOn, undefined);
});

// ── the re-zero entry itself ────────────────────────────────────────────────

test("a re-zero is EVIDENCE · REC · Figure · produced, carrying the operator's words verbatim", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "html", code: "<p>a</p>" }, caption: "html" });
  log = buildLog.rezeroBuild(log, {
    seg: { type: "code", lang: "html", code: "<p>b</p>" },
    code: "<p>b</p>",
    trigger: "I don't like the colors",
    tell: "judgment",
  });

  // entries: [PROPOSE] [REC concession] [NUL amended ask] [PROPOSE g2]
  const rec = log.entries[1];
  assert.equal(rec.kind, taskLog.ENTRY_KINDS.EVIDENCE);
  assert.equal(rec.operator, "REC");
  assert.equal(rec.grain, "Figure");
  assert.equal(rec.operator_basis, taskLog.OPERATOR_BASIS.PRODUCED);
  // The trigger is the reason the ground was conceded, and it is the
  // operator's sentence, not a paraphrase of it.
  assert.equal(rec.trigger, "I don't like the colors");
  assert.equal(rec.tell, "judgment");
  assert.equal(rec.concedes, "b1.v1");
  assert.equal(rec.concededVersion, 1);

  // The new ground is born the way any production is born, and does NOT
  // supersede — a re-zero concedes a ground, it does not compile a new whole
  // out of the old one.
  const seed = log.entries[3];
  assert.equal(seed.kind, taskLog.ENTRY_KINDS.PROPOSE);
  assert.equal(seed.operator, "INS");
  assert.equal(seed.task_id, "b1.g2.v1");
  assert.equal(seed.supersedes, undefined);
  assert.equal(seed.ground, 2);
});

test("a re-zeroed build is still editable, and the engine's checker stays silent", () => {
  // The whole reason a re-zero opens a ground: isProductionOrder("REC","SYN")
  // is FALSE, so a REC inside a thread would forbid every later edit on it.
  assert.equal(taskLog.isProductionOrder("SYN", "REC"), true);
  assert.equal(taskLog.isProductionOrder("REC", "SYN"), false);

  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "html", code: "<p>a</p>" }, caption: "html" });
  log = buildLog.reviseBuild(log, { code: "<p>a1</p>", reason: "edit" });
  log = buildLog.rezeroBuild(log, { code: "<p>b</p>", trigger: "it's broken" });
  log = buildLog.reviseBuild(log, { code: "<p>b1</p>", reason: "edit" });
  log = buildLog.rezeroBuild(log, { code: "<p>c</p>", trigger: "still wrong" });
  log = buildLog.reviseBuild(log, { code: "<p>c1</p>", reason: "edit" });

  assert.deepEqual(checkCubeProgression(log), []);
  const live = buildLog.foldBuild(log);
  assert.equal(live.code, "<p>c1</p>");
  assert.equal(live.ground, 3);
  assert.equal(live.version, 2);
  assert.equal(live.task_id, "b1.g3.v2");
  assert.equal(buildLog.groundCount(log), 3);
});

test("a run attaches to the ground that ran, and folds back there", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "html", code: "<p>a</p>" }, caption: "html" });
  log = buildLog.attachRun(log, { params: { lang: "html" }, outcome: { ok: true, data: { rendered: true } } });
  log = buildLog.rezeroBuild(log, { code: "<p>b</p>", trigger: "I don't like the colors" });
  assert.equal(buildLog.foldBuild(log).lastRun, null, "a new ground starts with no result of its own");
  assert.equal(buildLog.foldBuild(log, 1).lastRun.data.rendered, true);

  log = buildLog.attachRun(log, { params: { lang: "html" }, outcome: { ok: true, data: { rendered: true } } });
  const result = log.entries[log.entries.length - 1];
  assert.equal(result.task_id, "b1.g2.v1");
  assert.equal(result.operator, undefined, "results attach, they never re-type");
});

test("a re-zero that concedes nothing is churn, refused like an identical edit", () => {
  const seg = { type: "code", lang: "html", code: "<p>a</p>" };
  const log = buildLog.proposeBuild({ n: 1, turn: 1, seg, caption: "html" });
  assert.equal(buildLog.rezeroBuild(log, { seg, code: "<p>a</p>", trigger: "I don't like the colors" }), log);
});

test("a re-zero without the operator's words is refused — the reason is what makes it a re-zero", () => {
  const log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "html", code: "<p>a</p>" }, caption: "html" });
  assert.throws(() => buildLog.rezeroBuild(log, { code: "<p>b</p>" }), /trigger/);
  assert.throws(() => buildLog.rezeroBuild(log, { code: "<p>b</p>", trigger: "  " }), /trigger/);
});

test("the cursor says why the ground moved, in the operator's own words", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "html", code: "<p>a</p>" }, caption: "html" });
  log = buildLog.rezeroBuild(log, { code: "<p>b</p>", trigger: "I don't like the colors" });
  log = buildLog.reviseBuild(log, { code: "<p>b1</p>", reason: "edit" });
  assert.deepEqual(
    buildLog.timeline(log).map((r) => r.label),
    ["v1 · built", "re-zero · ground 2 · I don't like the colors", "ask · I don't like the colors", "g2 v1 · rebuilt", "g2 v2 · edit"],
  );
  assert.deepEqual(buildLog.timeline(log).map((r) => r.operator), ["INS", "REC", "NUL", "INS", "SYN"]);
});

test("a log that never re-zeroes is addressed exactly as it always was", () => {
  // Ground 1 keeps the plain b<n>.v<k> address, so a stored log written
  // before grounds existed replays unchanged rather than migrating.
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "python", code: "print(1)" }, caption: "python" });
  log = buildLog.reviseBuild(log, { code: "print(2)" });
  assert.deepEqual(log.entries.map((e) => e.task_id), ["b1.v1", "b1.v2"]);
  assert.equal(log.entries[1].supersedes, "b1.v1");
  assert.equal(buildLog.groundCount(log), 1);
});

// ── the router's own walls ──────────────────────────────────────────────────

test("the tell is read from closed classes and the build's own bytes, never a word list", () => {
  // The widget's own words are what a definite phrase resolves against.
  const known = 'html\n<div id="counter" style="color:#f0f">0</div><button class="reset">+1</button>';

  // ANAPHORA — the form itself says the object is already here.
  for (const m of ["it's broken", "it doesn't work", "make it bigger", "center it", "this is hideous", "that's too big"])
    assert.equal(iterationTell(m, known), "anaphora", m);

  // JUDGMENT — negation with a first-person subject, LABELLING a tell that
  // still has to resolve: "the colors" resolves against the build's own
  // color: bytes through the register's inflection class (forms of one
  // referent — the quotient, not the spelling). A judgment of something
  // the build does not hold ("the palette") points at nothing and stays
  // unrouted — judging is not pointing.
  for (const m of ["I don't like the colors", "I don\u2019t like the colors"])
    assert.equal(iterationTell(m, known), "judgment", m);
  assert.equal(iterationTell("I do not like the palette", known), null);
  // A judgment that also carries an anaphor is reported as the anaphor: both
  // are true, and the pointer is the more specific fact.
  assert.equal(iterationTell("I do not like this palette", known), "anaphora");

  // RESOLUTION — a content word of the message is a form the artifact's
  // own bytes hold. No determiner needed on either side: "fix the counter"
  // and "fix counter" resolve identically, because the reading is of
  // forms, not grammar words.
  for (const m of ["fix the counter", "the button does nothing", "the button is wrong", "buttons bigger please"])
    assert.equal(iterationTell(m, known), "resolved", m);

  // A demand whose words resolve into NOTHING built stays unrouted — the
  // introduction of something new needs no article to say so; its words
  // simply are not this artifact's.
  for (const m of [
    "make me a countdown timer",
    "build a dashboard",
    "write a python script",
    "give me an svg logo",
    "another one, but for temperature",
  ])
    assert.equal(iterationTell(m, known), null, m);

  // The material's questions stay the material's — no possessive, no
  // anaphor, and nothing in them that this widget's bytes contain.
  for (const m of [
    "what does the report say about funding",
    "who is mentioned most often",
    "summarise the third chapter",
    "",
  ])
    assert.equal(iterationTell(m, known), null, m);
});

test("a definite phrase the artifact does not contain does not route — the stated limit", () => {
  // Disclosed in this module's header rather than bought back with a verb
  // list: the list would have caught this one phrasing and silently
  // mis-routed every phrasing outside itself.
  const known = 'html\n<div id="counter">0</div>';
  assert.equal(iterationTell("change the background to blue", known), null);
  // The affordance is narrower, never absent: an anaphor routes the same ask.
  assert.equal(iterationTell("make it blue", known), "anaphora");
  // And it resolves once the artifact does contain the thing.
  assert.equal(iterationTell("change the background to blue", 'html\n<div style="background:#fff">0</div>'), "resolved");
  // Inflection resolves through the register's received class — forms of
  // one referent (colors ↔ color:). Dialect spelling does NOT (colour needs
  // a received spelling prior with its own giver; a missing giver is a
  // wall, never a derivation) — the typed limit, stated.
  assert.equal(iterationTell("the colors are wrong", 'html\n<b style="color:#fff">x</b>'), "resolved");
  assert.equal(iterationTell("the colours are wrong", 'html\n<b style="color:#fff">x</b>'), null);
});

test("anaphora reads the surrounding tokens: a bare demonstrative followed by a noun is a determiner, not a pointer", () => {
  // Found live: a brand-new conversation with no code build of its own,
  // sharing a browser with an unrelated leftover build from an earlier
  // session, had "what is this app, in one sentence?" fire tell:"anaphora"
  // against that stale build — "this" alone was enough, unconditionally,
  // because ANAPHORIC_PRONOUNS's own header says a consumer must read the
  // surrounding tokens and this one never did. `known` here deliberately
  // shares no word with any of these messages, so a "resolved" tell is
  // never in play — this isolates the anaphora path alone.
  const known = 'python\ndef adds_up_first_even():\n    pass\n';

  // No POS classifier injected (the default router, exactly as every
  // other test in this file uses it): behavior is UNCHANGED from before
  // this fix existed — every bare demonstrative still counts.
  for (const m of ["what is this app, in one sentence?", "what is this widget, in one sentence?"])
    assert.equal(iterationTell(m, known), "anaphora", `no POS classifier: ${m}`);

  // With a POS classifier injected, a demonstrative immediately followed
  // by a confident NOUN reads as a determiner phrase and no longer counts.
  const posPrior = { forms: { app: [{ upos: "NOUN", count: 10, share: 1 }] } };
  const stubClassify = (word, { posPrior: p }) => {
    const cands = p?.forms?.[String(word ?? "").toLowerCase()];
    return cands ? { surface: word, found: true, total: cands.reduce((n, c) => n + c.count, 0), candidates: cands } : { surface: word, found: false, total: 0, candidates: [] };
  };
  const stubDominant = (classified, { minShare = 0.5 } = {}) => {
    const top = classified?.candidates?.[0];
    return top && top.share >= minShare ? top : null;
  };
  const routed = makeWidgetRouter(enginePriors, { classifyWord: stubClassify, dominantClass: stubDominant, posPrior: () => posPrior, GRAMMAR_MIN_SHARE });

  assert.equal(routed.iterationTell("what is this app, in one sentence?", known), null, "a known noun after the demonstrative — determiner use");
  // "widget" carries no entry in this stub prior (the real treebank's own
  // gap, measured live: it has no "app" or "widget" either) — an
  // out-of-vocabulary word still reads as the noun, not the pronoun's own
  // predicate, because a genuinely novel VERB right after a bare
  // demonstrative is rare next to a genuinely novel NOUN there.
  assert.equal(routed.iterationTell("what is this widget, in one sentence?", known), null, "an unknown word after the demonstrative — still read as a noun");

  // Genuine anaphora is unaffected: a KNOWN non-noun after the
  // demonstrative (a verb, an adjective) still reports pronominal, and a
  // demonstrative with nothing following it still does too.
  const posPrior2 = { forms: { app: [{ upos: "NOUN", count: 10, share: 1 }], is: [{ upos: "AUX", count: 10, share: 1 }], bigger: [{ upos: "ADJ", count: 10, share: 1 }] } };
  const routed2 = makeWidgetRouter(enginePriors, { classifyWord: stubClassify, dominantClass: stubDominant, posPrior: () => posPrior2, GRAMMAR_MIN_SHARE });
  assert.equal(routed2.iterationTell("this is broken", known), "anaphora", "a known verb after the demonstrative — still pronominal");
  assert.equal(routed2.iterationTell("make this bigger", known), "anaphora", "a known adjective after the demonstrative — still pronominal");
  assert.equal(routed2.iterationTell("fix it, it's broken", known), "anaphora", "nothing follows — still pronominal");
});

test("the closed classes come from the engine's register, never from this repo", () => {
  // The register is the giver (Amendment IV): every class names where it came
  // from. A router built on lists this repo typed out would have no giver to
  // name, which is the whole difference.
  assert.equal(enginePriors.INDEFINITE_DETERMINERS_META.giver, "lang/en");
  assert.equal(enginePriors.ANAPHORIC_PRONOUNS_META.giver, "lang/en");
  assert.equal(enginePriors.DEFINITE_DETERMINERS_META.giver, "lang/en");
  assert.equal(enginePriors.NEGATION_WORDS_META.giver, "lang/en");
  assert.equal(enginePriors.INFLECTIONAL_SUFFIXES_META.giver, "lang/en");
  // And a router handed something that is not the register refuses to exist.
  assert.throws(() => makeWidgetRouter({}), /prior register/);
  assert.throws(
    () => makeWidgetRouter({ ...enginePriors, ANAPHORIC_PRONOUNS: new Set() }),
    /ANAPHORIC_PRONOUNS/,
  );
});

test("a creation demand carrying a pointer now routes BY the pointer — the doctrine flip, disclosed", () => {
  // Before: any indefinite determiner vetoed routing, so "make me another
  // one, I don't like the colors on this" forked a sibling. The user
  // refused the veto outright ("no hardcoded list of english articles"),
  // and the cost cuts the other way now: a demand-for-a-sibling whose
  // words also point at the existing build ROUTES TO IT. Both errors
  // existed; this doctrine chooses resolution over introduction because
  // resolution is a reading and introduction-by-article was a word list.
  // The residue is disclosed here, not papered over: an operator who
  // wants a true sibling of an existing build says so without pointing
  // ("make me a second counter in html" forks — nothing resolves), or
  // forks from the panel.
  const known = 'html\n<div style="color:#f0f">0</div>';
  assert.equal(iterationTell("make me another one, I don't like the colors on this", known), "judgment");
  assert.equal(iterationTell("that's broken — build a new one from scratch", known), "anaphora");
  // Without a resolving word or an anaphor, a creation demand stays its
  // own act, articles or none.
  assert.equal(iterationTell("make me another one, nicer", known), null);
});

test("the number is the reference, and it is read from the operator, never the model", () => {
  const html = { type: "code", lang: "html", code: "<p>x</p>" };
  const builds = [
    { n: 1, type: "code", lang: "html" },
    { n: 2, type: "code", lang: "html" },
  ];
  assert.equal(routeSegment(html, "build 1 is broken", builds).n, 1);
  assert.equal(routeSegment(html, "it's broken", builds).n, 2, "unnamed goes to the present one");
  // A number that names no build of this kind forks rather than guessing.
  assert.equal(routeSegment(html, "build 7 is broken", builds).kind, "new");
});

test("routing carries the trigger, capped, so the re-zero can record it", () => {
  const html = { type: "code", lang: "html", code: "<p>x</p>" };
  const builds = [{ n: 1, type: "code", lang: "html", text: 'widget <b style="color:#eee">x</b>' }];
  const route = routeSegment(html, "  I don't\n like  the colors  ", builds);
  assert.equal(route.kind, "rezero");
  assert.equal(route.trigger, "I don't like the colors", "whitespace folded, words untouched");
  assert.equal(route.tell, "judgment");

  const long = routeSegment(html, `it's broken ${"x".repeat(500)}`, builds);
  assert.equal(long.kind, "rezero");
  assert.ok(long.trigger.length <= 200);
  assert.ok(long.trigger.endsWith("…"), "the cap is visible, never a silent truncation");
});

test("with nothing of this kind built, every turn is a new build", () => {
  const html = { type: "code", lang: "html", code: "<p>x</p>" };
  assert.equal(routeSegment(html, "it's broken", []).kind, "new");
  assert.equal(routeSegment(html, "it's broken", [{ n: 1, type: "code", lang: "python" }]).kind, "new");
  assert.equal(routeSegment(html, "it's broken", [{ n: 1, type: "table" }]).kind, "new");
});

test("language aliases are one runtime, not two builds", () => {
  const js = { type: "code", lang: "js", code: "1" };
  assert.equal(routeSegment(js, "it's broken", [{ n: 1, type: "code", lang: "javascript" }]).kind, "rezero");
  const sh = { type: "code", lang: "bash", code: "ls" };
  assert.equal(routeSegment(sh, "it's broken", [{ n: 1, type: "code", lang: "shell" }]).kind, "rezero");
});

test("a determiner is read on the MATCHED term's own phrase — introducing never routes, pointing still does", () => {
  const known = 'html\n<div id="counter" style="color:#f0f">0</div><button class="button">+1</button>';

  // THE SYMMETRIC FALSE POSITIVE (2026-08-18 diagnosis): a birth request
  // whose indefinite phrase happens to share a word with a standing build.
  // Content-word overlap alone cannot tell "introduces a referent that
  // shares a word" from "points at something already here"; the determiner
  // governing the matched term's own phrase can, and it is the register's
  // own closed class ("an indefinite determiner INTRODUCES its noun" —
  // priors.js, giver lang/en), never a word list of this repo's.
  for (const m of ["make me a counter widget", "build me a counter for laps", "I want another counter"])
    assert.equal(iterationTell(m, known), null, m);

  // THE CANONICAL COMPLAINT that killed the old per-message veto stays
  // routable — this is why the reading is PER TERM: "the counter" and
  // "the buttons" point while "some color" in the same sentence
  // introduces. The old veto refused the whole message for the one
  // indefinite; the old deletion routed the birth request above. Both
  // pinned here so the decision does not oscillate a third time.
  assert.equal(
    iterationTell("I don't like the counter widget, make the buttons bigger with some color", known),
    "judgment",
  );

  // Definite and bare terms keep pointing exactly as before — the
  // determiner reading only ever SUPPRESSES an introduced term, so nothing
  // routable yesterday stops routing today.
  assert.equal(iterationTell("fix counter", known), "resolved");
  assert.equal(iterationTell("the counter is off by one", known), "resolved");

  // The determiner walk stays inside its own clause: the indefinite in the
  // second clause cannot reach back and suppress the pointer in the first.
  assert.equal(iterationTell("the counter is broken, give me a fix", known), "resolved");

  // The routers agree with the tell, both faces.
  const builds = [{ n: 1, type: "code", lang: "html", text: known }];
  assert.equal(routeMessage("make me a counter widget", builds), null);
  assert.equal(
    routeSegment({ type: "code", lang: "html", code: "<p>new</p>" }, "make me a counter widget", builds).kind,
    "new",
  );
  assert.equal(routeMessage("I don't like the counter", builds)?.n, 1);

  // The disclosed evidence is what DROVE the decision: an introduced term
  // never appears in matchedOn — a match the router declined to act on
  // must not ride the record as if it had.
  const routed = routeMessage("I don't like the counter, give it some color", builds);
  assert.equal(routed?.n, 1);
  assert.ok(routed.matchedOn.includes("counter"));
  assert.ok(!routed.matchedOn.some((t) => t.startsWith("color")));
});

test("a markdown build (a composed document, not a widget) is never a routeMessage candidate — word overlap with its own prose is not evidence", () => {
  // Found live, 2026-09-09: after /facts landed a "Grounded facts"
  // document about Marie Curie, the very next ordinary follow-up
  // question ("Quote the exact sentence about what elements Marie Curie
  // discovered.") routed as an instruction to EDIT that document instead
  // of reaching the grounded-chat pipeline — resolvesInto's word-overlap
  // tell is sound for code (a widget's own vocabulary essentially never
  // overlaps with ordinary conversation) and a near-guaranteed false
  // positive for prose about the very topic being asked about.
  const factsDoc = {
    n: 1, type: "code", lang: "markdown",
    text: "Grounded facts\n\nAccording to pasted.txt, Curie was the first woman to win a Nobel Prize. According to pasted.txt, Marie Curie was born in Warsaw.",
  };
  assert.equal(routeMessage("Quote the exact sentence about what elements Marie Curie discovered.", [factsDoc]), null);
  assert.equal(routeMessage("How did Marie Curie die, according to what you have?", [factsDoc]), null);
  // Even a message that would clearly be a judgment/complaint against a
  // CODE build reads the same way here — the exclusion is on the
  // candidate's own kind, not on the tell.
  assert.equal(routeMessage("I don't like the Nobel Prize sentence, fix it", [factsDoc]), null);
  // An HTML/JS widget beside the markdown doc still routes exactly as
  // before — the exclusion narrows WHICH builds are candidates, it does
  // not touch the tells themselves.
  const widget = { n: 2, type: "code", lang: "html", text: '<button class="counter">0</button>' };
  assert.equal(routeMessage("I don't like the counter", [factsDoc, widget])?.n, 2);
});

// ── three more false-positive classes (live, 2026-09-15) ───────────────────
//
// Found in ONE ~30-turn batch of ordinary conversation, on top of the
// five-plus same-day fixes already above: (a) an ordinary farewell shared
// "great"~"greatest" (INFLECTIONAL_SUFFIXES' own "est") with an unrelated
// leftover build's docstring; (b) an ordinary factual correction shared the
// bare word "whether" with a different leftover build's comment, and the
// resulting re-zero applied a DESTRUCTIVE literal find/replace patch that
// stripped every `def ` from the code; (c) a factual correction shared
// "backwards"~"backward" (the same suffix class's bare "s") and wove an
// unrequested code edit into the model's own prose. `routedReal` (above) is
// what verifies all three — CLAUSE_OPENERS and the real POS prior are both
// required for the fix to engage, exactly as they are in production.

const gcdKnown = `python
def gcd(a, b):
    """Computes the greatest common divisor of two numbers."""
    while b:
        a, b = b, a % b
    return a
`;
const validatorKnown = `python
def validate(x):
    # check whether the input is a positive integer
    return isinstance(x, int) and x > 0
`;
const walkBackwardKnown = `python
def walk(items):
    # walks backward through the indices
    for i in range(len(items) - 1, -1, -1):
        yield items[i]
`;

test("(a) 'great'~'greatest': a morphological (non-exact) fold across a comparative/superlative degree is no longer sole evidence — an ordinary farewell does not resolve into an unrelated leftover build's docstring", () => {
  const msg = "Great, thanks so much for the help today!";
  assert.deepEqual(routedReal.matchedTerms(msg, gcdKnown), []);
  assert.equal(routedReal.iterationTell(msg, gcdKnown), null);
  assert.equal(routedReal.routeMessage(msg, [{ n: 1, type: "code", lang: "python", text: gcdKnown }]), null);
});

test("(b) 'whether': a CLAUSE_OPENER (priors.js's own subordinator/relative-pronoun class) is never content evidence, on the message side — this is the MORE SEVERE class, since the false routing it used to cause landed a destructive patch, not just a missed reply", () => {
  const msg = "I want to correct something: the treaty was signed in 1868, not 1867, regardless of whether earlier sources say otherwise.";
  assert.deepEqual(routedReal.matchedTerms(msg, validatorKnown), []);
  assert.equal(routedReal.iterationTell(msg, validatorKnown), null);
  assert.equal(routedReal.routeMessage(msg, [{ n: 1, type: "code", lang: "python", text: validatorKnown }]), null);
  // The fix closes the WHOLE CLASS, not the one word: every member of
  // CLAUSE_OPENERS is equally excluded, not just "whether" — pinned so the
  // next specimen ("because", "although", "unless"...) does not need its
  // own patch the way five-plus prior fixes each needed their own.
  const becauseKnown = `python
def log_event(reason):
    # only log because the caller explicitly asked for it
    print(reason)
`;
  const msgBecause = "I'm updating this because the numbers were wrong last time.";
  assert.deepEqual(routedReal.matchedTerms(msgBecause, becauseKnown), []);
});

test("(c) 'backwards'~'backward': the identical morphological gate as (a), a different suffix ('s', not 'est') and a different part of speech (adverb, not adjective) — both excluded by the SAME rule, not two separate patches", () => {
  const msg = "The list should be processed backwards, not forwards, per the updated requirements.";
  assert.deepEqual(routedReal.matchedTerms(msg, walkBackwardKnown), []);
  assert.equal(routedReal.iterationTell(msg, walkBackwardKnown), null);
  assert.equal(routedReal.routeMessage(msg, [{ n: 1, type: "code", lang: "python", text: walkBackwardKnown }]), null);
});

test("(a)/(c) fail-then-pass: the pre-fix router (no CLAUSE_OPENERS, no POS prior — exactly what this file's own default `enginePriors` router still is) reproduces all three false positives, confirming the fix is what closes them and not an unrelated change", () => {
  // The default, POS-free router (line ~35) is the pre-fix shape for
  // every caller that has not opted into CLAUSE_OPENERS/the POS prior —
  // matchedTerms/iterationTell here show exactly the routing this file's
  // own fix exists to prevent, using the SAME three specimens above.
  assert.deepEqual(preFixRouter.iterationTell("Great, thanks so much for the help today!", gcdKnown), "resolved");
  assert.deepEqual(preFixRouter.iterationTell(
    "I want to correct something: the treaty was signed in 1868, not 1867, regardless of whether earlier sources say otherwise.",
    validatorKnown,
  ), "judgment");
  assert.deepEqual(preFixRouter.iterationTell("The list should be processed backwards, not forwards, per the updated requirements.", walkBackwardKnown), "resolved");
});

test("the morphological gate never touches an EXACT match — real code identifiers and the flagship suffix cases (buttons/colors) keep working exactly as before", () => {
  assert.equal(routedReal.iterationTell("the counter is broken", 'html\n<div class="counter">0</div><button id="inc">+</button>'), "resolved");
  assert.equal(routedReal.iterationTell("the colors are wrong", 'html\n<b style="color:#fff">x</b>'), "resolved");
  assert.equal(routedReal.iterationTell("make the buttons bigger", 'html\n<button>x</button>'), "resolved");
  assert.equal(routedReal.iterationTell("fix adds_up_first_even", "python\ndef adds_up_first_even(n):\n    return n"), "resolved");
});

test("both new gates fall OPEN, not closed, when their prior is unavailable — matching every other optional-prior gate this file already has", () => {
  // CLAUSE_OPENERS absent: the base router (legacy priors alone) still
  // reads "whether" as ordinary content, exactly as it did before this class
  // was ever wired in — disclosed, not silently narrowed for every caller.
  assert.deepEqual(preFixRouter.iterationTell(
    "I want to correct something: the treaty was signed in 1868, not 1867, regardless of whether earlier sources say otherwise.",
    validatorKnown,
  ), "judgment");
  // POS prior absent (CLAUSE_OPENERS present, pos missing): a suffix fold
  // is unrestricted, exactly as it was before the morphological gate existed.
  const routedNoPos = makeWidgetRouter({ ...enginePriors, CLAUSE_OPENERS });
  assert.equal(routedNoPos.iterationTell("Great, thanks so much for the help today!", gcdKnown), "resolved");
});
