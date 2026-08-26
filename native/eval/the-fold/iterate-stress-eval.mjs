// eval/iterate-stress-eval.mjs — the stress test iterate-eval.mjs cannot be:
// MANY iterative turns (15+) per starting object, mixing feature-adds,
// judgment/REC turns, vague asks, "undo"-style asks, and growing structural
// complexity — checked after EVERY turn on three separate axes (landed,
// structural-clean via witness.js, behavioral-clean via a DOM rehearsal),
// with EVERY prior turn's behavioral check re-run against the CURRENT
// artifact so a late-turn regression in an early feature is caught, not
// just the newest turn's own check. conform() runs every turn too.
//
// Reuses the REAL organs exactly the way iterate-eval.mjs does — never
// app.js's browser-coupled foldTurn, never a restatement of build-log.js's
// mechanics. New file; does not touch iterate-eval.mjs.
//
// Run: node eval/iterate-stress-eval.mjs [model ...]
// Writes eval/results/stress-eval-<model>-<object>.json as it goes (so a
// long run's partial results survive a crash) and prints a summary table.

import * as taskLog from "../../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import * as enginePriors from "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/priors.js";
import { makeBuildLog } from "../build-log.js";
import { scoutSpan, makeWidgetRouter, capture } from "../widget.js";
import { witnessCode, witnessRegressed } from "../witness.js";
import { runFold, fire, typeInto } from "./dom-stub.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, "results");
fs.mkdirSync(RESULTS_DIR, { recursive: true });

const buildLog = makeBuildLog(taskLog);
const widgetRouter = makeWidgetRouter(enginePriors);
const INFLECTIONAL_SUFFIXES = enginePriors.INFLECTIONAL_SUFFIXES;

// ── starting objects ────────────────────────────────────────────────────

const SPREADSHEET = `<!DOCTYPE html>
<html>
<head><title>Mini Spreadsheet</title></head>
<body>
  <table id="grid">
    <tr><td><input class="cell" data-r="0" data-c="0" value="1"></td><td><input class="cell" data-r="0" data-c="1" value="2"></td></tr>
    <tr><td><input class="cell" data-r="1" data-c="0" value="3"></td><td><input class="cell" data-r="1" data-c="1" value="4"></td></tr>
  </table>
  <div>Sum: <span id="sum">0</span></div>
  <script>
    function recompute() {
      let total = 0;
      document.querySelectorAll('.cell').forEach(function(c) {
        total += Number(c.value) || 0;
      });
      document.getElementById('sum').textContent = total;
    }
    document.querySelectorAll('.cell').forEach(function(c) {
      c.addEventListener('input', recompute);
    });
    recompute();
  </script>
</body>
</html>`;

const TASKLIST = `<!DOCTYPE html>
<html>
<head><title>Priority Tasks</title></head>
<body>
  <input id="what" placeholder="new task">
  <select id="priority"><option value="low">low</option><option value="high">high</option></select>
  <button id="add">add</button>
  <ul id="list"></ul>
  <div id="count">0 tasks</div>
  <script>
    let tasks = [];
    function render() {
      const list = document.getElementById('list');
      list.innerHTML = '';
      tasks.forEach(function(t, i) {
        const li = document.createElement('li');
        li.textContent = (t.done ? '[x] ' : '[ ] ') + t.text + ' (' + t.priority + ')';
        li.className = t.priority;
        li.addEventListener('click', function() { t.done = !t.done; render(); });
        list.appendChild(li);
      });
      document.getElementById('count').textContent = tasks.length + ' tasks';
    }
    document.getElementById('add').addEventListener('click', function() {
      const text = document.getElementById('what').value;
      const priority = document.getElementById('priority').value;
      if (text) tasks.push({ text: text, priority: priority, done: false });
      render();
    });
  </script>
</body>
</html>`;

// ── turn scripts: each turn is {ask, kind, check} — `kind` is our own
// LABEL of what we predicted (feature/judgment/vague/undo), used only to
// compare against what the router actually decided, never fed to the
// router. `check(doc)` is the behavioral assertion for THIS turn's own ask,
// run against a fresh runFold() of the CURRENT artifact — undefined means
// "no cheap mechanical check for this ask", stated rather than skipped
// silently in the report. ──────────────────────────────────────────────

function cell(doc, r, c) { return doc.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`); }

const SPREADSHEET_TURNS = [
  { ask: "add a button that clears all the cells to 0", kind: "feature",
    check: (doc) => { const btn = [...doc.querySelectorAll("button")].find((b) => /clear/i.test(b.textContent)); if (!btn) return { ok: false, why: "no clear button found" };
      typeInto(cell(doc, 0, 0), "9"); fire(btn, "click");
      return { ok: cell(doc, 0, 0).value === "0" || cell(doc, 0, 0).value === "", why: `cell(0,0) after clear = ${JSON.stringify(cell(doc, 0, 0).value)}` }; } },
  { ask: "add a third row of two more cells, prefilled with 5 and 6", kind: "feature",
    check: (doc) => { const rows = doc.querySelectorAll("tr"); return { ok: rows.length >= 3, why: `${rows.length} rows` }; } },
  { ask: "I don't like the colors, make it nicer", kind: "judgment",
    check: undefined },
  { ask: "make it better", kind: "vague",
    check: undefined },
  { ask: "show the average of the cells too, next to the sum", kind: "feature",
    check: (doc) => { const s = doc.body.textContent; return { ok: /average/i.test(s), why: `body mentions "average": ${/average/i.test(s)}` }; } },
  { ask: "the sum isn't updating right when I type in a cell, fix it", kind: "judgment",
    check: (doc) => { typeInto(cell(doc, 0, 0), "100"); const sumEl = doc.getElementById("sum"); return { ok: sumEl && /100/.test(sumEl.textContent), why: `sum reads ${JSON.stringify(sumEl && sumEl.textContent)}` }; } },
  { ask: "make the buttons bigger", kind: "anaphora",
    check: undefined },
  { ask: "put the clear button back the way it was before", kind: "undo",
    check: undefined },
  { ask: "add a button that fills every cell with 1", kind: "feature",
    check: (doc) => { const btn = [...doc.querySelectorAll("button")].find((b) => /fill/i.test(b.textContent)); if (!btn) return { ok: false, why: "no fill button found" };
      fire(btn, "click"); return { ok: cell(doc, 0, 0).value === "1", why: `cell(0,0) after fill = ${JSON.stringify(cell(doc, 0, 0).value)}` }; } },
  { ask: "it's broken", kind: "judgment",
    check: undefined },
  { ask: "the sum should still update live as I type, without clicking anything — check that still works", kind: "structural",
    check: (doc) => { typeInto(cell(doc, 1, 1), "50"); const sumEl = doc.getElementById("sum"); return { ok: sumEl && /50/.test(sumEl.textContent), why: `sum reads ${JSON.stringify(sumEl && sumEl.textContent)}` }; } },
  { ask: "highlight the cell with the highest value in yellow", kind: "feature",
    check: undefined },
  { ask: "fix it", kind: "vague",
    check: undefined },
  { ask: "add a reset button that sets every cell back to 0", kind: "feature",
    check: (doc) => { const btn = [...doc.querySelectorAll("button")].find((b) => /reset/i.test(b.textContent)); if (!btn) return { ok: false, why: "no reset button found" };
      typeInto(cell(doc, 0, 1), "77"); fire(btn, "click"); return { ok: cell(doc, 0, 1).value === "0" || cell(doc, 0, 1).value === "", why: `cell(0,1) after reset = ${JSON.stringify(cell(doc, 0, 1).value)}` }; } },
  { ask: "I don't like how the average looks, it should say 'Avg:' not 'Average:'", kind: "judgment",
    check: (doc) => { const s = doc.body.textContent; return { ok: /Avg:/.test(s), why: `body has "Avg:": ${/Avg:/.test(s)}` }; } },
  { ask: "add a max and a min value display too", kind: "feature",
    check: (doc) => { const s = doc.body.textContent; return { ok: /max/i.test(s) && /min/i.test(s), why: `body mentions max/min: ${/max/i.test(s)}/${/min/i.test(s)}` }; } },
  { ask: "undo the last change", kind: "undo",
    check: undefined },
];

function taskLis(doc) { return [...doc.querySelectorAll("#list li")]; }

const TASKLIST_TURNS = [
  { ask: "add a delete button next to each task", kind: "feature",
    check: (doc) => { typeInto(doc.getElementById("what"), "buy milk"); fire(doc.getElementById("add"), "click");
      const before = taskLis(doc).length;
      const delBtn = doc.querySelector("#list button, #list .delete");
      if (!delBtn) return { ok: false, why: "no delete control found in a rendered task row" };
      fire(delBtn, "click");
      return { ok: taskLis(doc).length === before - 1, why: `tasks ${before} -> ${taskLis(doc).length}` }; } },
  { ask: "add a filter so I can show only high priority tasks", kind: "feature",
    check: (doc) => { const s = doc.body.textContent + doc.body.innerHTML; return { ok: /filter|high/i.test(s), why: "looked for filter/high control in markup" }; } },
  { ask: "I don't like the colors, make it nicer", kind: "judgment",
    check: undefined },
  { ask: "make it better", kind: "vague",
    check: undefined },
  { ask: "show a count of how many tasks are done vs not done", kind: "feature",
    check: (doc) => { const s = doc.body.textContent; return { ok: /done/i.test(s), why: `body mentions "done": ${/done/i.test(s)}` }; } },
  { ask: "clicking a task to mark it done isn't working right, fix it", kind: "judgment",
    check: (doc) => { typeInto(doc.getElementById("what"), "call mom"); fire(doc.getElementById("add"), "click");
      const li = taskLis(doc).at(-1); if (!li) return { ok: false, why: "no task row rendered" };
      const before = li.textContent; fire(li, "click");
      return { ok: taskLis(doc).at(-1)?.textContent !== before, why: `row text unchanged after click: ${JSON.stringify(before)}` }; } },
  { ask: "make the add button bigger", kind: "anaphora",
    check: undefined },
  { ask: "put the delete button back the way it was before", kind: "undo",
    check: undefined },
  { ask: "add a button that clears all completed tasks at once", kind: "feature",
    check: (doc) => { typeInto(doc.getElementById("what"), "x"); fire(doc.getElementById("add"), "click");
      const li = taskLis(doc).at(-1); if (li) fire(li, "click");
      const btn = [...doc.querySelectorAll("button")].find((b) => /clear|completed/i.test(b.textContent));
      if (!btn) return { ok: false, why: "no clear-completed button found" };
      const before = taskLis(doc).length; fire(btn, "click");
      return { ok: taskLis(doc).length < before, why: `tasks ${before} -> ${taskLis(doc).length}` }; } },
  { ask: "it's broken", kind: "judgment",
    check: undefined },
  { ask: "adding a task should still clear the input field afterward — check that still works", kind: "structural",
    check: (doc) => { const input = doc.getElementById("what"); typeInto(input, "check me"); fire(doc.getElementById("add"), "click");
      return { ok: input.value === "", why: `input value after add = ${JSON.stringify(input.value)}` }; } },
  { ask: "sort high priority tasks to the top of the list", kind: "feature",
    check: undefined },
  { ask: "fix it", kind: "vague",
    check: undefined },
  { ask: "add a button to mark all tasks done at once", kind: "feature",
    check: (doc) => { typeInto(doc.getElementById("what"), "y"); fire(doc.getElementById("add"), "click");
      const btn = [...doc.querySelectorAll("button")].find((b) => /all/i.test(b.textContent));
      if (!btn) return { ok: false, why: "no mark-all-done button found" };
      fire(btn, "click"); const s = doc.getElementById("list").textContent;
      return { ok: !/\[ \]/.test(s), why: `list still has an unchecked row: ${/\[ \]/.test(s)}` }; } },
  { ask: "I don't like how the count looks, it should say 'Done:' not just the number", kind: "judgment",
    check: (doc) => { const s = doc.getElementById("count")?.textContent ?? ""; return { ok: /Done:/i.test(s) || /done/i.test(doc.body.textContent), why: `count reads ${JSON.stringify(s)}` }; } },
  { ask: "add a way to edit an existing task's text", kind: "feature",
    check: undefined },
  { ask: "undo the last change", kind: "undo",
    check: undefined },
];

const OBJECTS = [
  { name: "spreadsheet", widget: SPREADSHEET, turns: SPREADSHEET_TURNS },
  { name: "tasklist", widget: TASKLIST, turns: TASKLIST_TURNS },
];

// ── the mechanical ladder, same shape as iterate-eval.mjs's `turn()`,
// extended to route rezero vs revise off widgetRouter.routeMessage the way
// app.js's send() actually does — BEFORE any model call — and to run
// against a projected build the caller keeps across many turns. ─────────

const PATCH_SCHEMA = {
  type: "object",
  properties: { find: { type: "string" }, add: { type: "string" } },
  required: ["find", "add"],
};

async function askModel(model, prompt) {
  const r = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], stream: false, format: PATCH_SCHEMA }),
  });
  const j = await r.json();
  return { text: j.message?.content ?? "", tokens: j.eval_count ?? 0 };
}

function opsPrompt(cur, instruction) {
  const lang = cur.seg?.lang ?? "";
  const scout = typeof cur.code === "string" ? scoutSpan(instruction, cur.code, INFLECTIONAL_SUFFIXES) : null;
  const arena = scout ? cur.code.slice(scout.span[0], scout.span[1]) : cur.code ?? "";
  const prompt =
    (scout ? `Here is the part of the code your request points at ("${scout.term}"):\n\n` : `Here is the working code (${lang}):\n\n`) +
    `\`\`\`${lang}\n${arena}\n\`\`\`\n\n` +
    `Change it as follows: ${instruction}\n` +
    `Reply with ONE edit, the smallest that does it — never the whole file. ` +
    `find is a short piece of the code above, copied exactly, that appears only once. ` +
    `add is what that piece becomes. To delete something, leave add empty.`;
  return { prompt, scout };
}

/** One stress-eval turn: decide rezero vs revise the way app.js's send()
 * does (widgetRouter.routeMessage against the live build's own text, BEFORE
 * any model call), then run the same scout -> one-edit -> strict/every ->
 * patch or rezero ladder iterate-eval.mjs already proved. Returns a typed
 * record of what happened, and mutates nothing — the caller decides
 * whether to keep the resulting log. */
async function stressTurn(model, log, ask) {
  const cur = buildLog.foldBuild(log);
  const known = `${cur.caption ?? ""} ${cur.code ?? ""}`;
  const route = widgetRouter.routeMessage(ask, [{ n: cur.n, type: cur.seg?.type, lang: cur.seg?.lang, text: known }]);
  const { prompt, scout } = opsPrompt(cur, ask);
  const { text, tokens } = await askModel(model, prompt);
  let obj = null;
  try { obj = JSON.parse(text); } catch { /* rare under format-held grammar */ }
  const ops = obj ? buildLog.readOps(Array.isArray(obj.ops) ? obj.ops : [obj]) : null;
  if (!ops) return { log, landed: false, gap: "no-ops", route, tokens };

  const within = scout?.span ?? null;
  const strict = buildLog.applyOps(cur.code, ops, { within });
  const trial = strict.ok ? strict : strict.gap.kind === "ambiguous" ? buildLog.applyOps(cur.code, ops, { every: true, within }) : strict;
  if (!trial.ok) {
    const nextLog = buildLog.refuseBuild(log, { ops, gap: trial.gap });
    return { log: nextLog, landed: false, gap: trial.gap.kind, route, tokens };
  }

  // THE SAME GATE app.js's foldTurn/routeAndPublish HAVE (2026-08-18,
  // mirrored here so this harness reflects the CURRENT live mechanism, not
  // an earlier version of it — the original pass had no such gate at all).
  // The candidate's witness, computed ONCE before anything lands; the gate
  // below and the EVA entry after landing both read this one reading.
  const candidateWitness = witnessCode(cur.seg?.lang, trial.code);
  const lastWitness = log.entries.filter((e) => e.operator === "EVA").at(-1)?.witness ?? null;
  if (witnessRegressed(lastWitness, candidateWitness)) {
    const nextLog = buildLog.refuseBuild(log, {
      ops,
      gap: { kind: "regressed", reason: "this change would introduce a defect the current version does not have", findings: candidateWitness.findings },
      reason: "witness",
    });
    return { log: nextLog, landed: false, gap: "regressed", route, tokens, candidateWitness };
  }

  // REC vs SUPERSEDE, read off `route.tell` the way routeSegment now does
  // (widget.js, 2026-08-18 fix) — NOT "any routeMessage hit rezeros",
  // which is what app.js's send() still hardcodes as of this pass (named
  // in the handoff note, not fixed there). A tell of "resolved" with
  // nothing indefinite in the ask is an ordinary feature-add pointing at
  // existing content, not a conceded ground.
  const rezeroes = route && !(route.tell === "resolved" && widgetRouter.introducesAnything(ask));
  let nextLog = log;
  if (rezeroes) {
    // A judgment/anaphora/named/resolved-with-introduction tell: the
    // operator conceded the ground, per widget.js's own header — the new
    // ground is seeded from the conceded projection plus this delta.
    nextLog = buildLog.rezeroBuild(nextLog, { code: trial.code, trigger: capture(ask), tell: route.tell, patch: { ops, every: !strict.ok, within } });
  } else {
    if (scout) nextLog = buildLog.scoutBuild(nextLog, { term: scout.term, span: scout.span });
    const r = buildLog.patchBuild(nextLog, { ops, reason: "revision", every: !strict.ok, within });
    if (!r.landed) return { log: nextLog, landed: false, gap: r.churn ? "churn" : r.gap?.kind ?? "?", route, tokens };
    nextLog = r.log;
  }

  // The witness closes the loop here exactly as it does in foldTurn — the
  // landing's EVA is what gives the NEXT candidate a prev to be judged
  // against, and it is the SAME reading the gate above already computed.
  if (candidateWitness.ok !== null) nextLog = buildLog.attachWitness(nextLog, { witness: candidateWitness });
  return { log: nextLog, landed: true, witnessOk: candidateWitness.ok, findings: candidateWitness.findings, route, rezeroed: rezeroes, tokens };
}

// ── behavioral rehearsal: run every PRIOR turn's own check against the
// CURRENT code, every turn — this is the whole point of the exercise. ────

function runBehavioralChecks(code, checks) {
  // checks: [{turnIndex, check}] — only turns that declared one.
  const { doc, error } = runFold(code);
  if (error) return checks.map(({ turnIndex }) => ({ turnIndex, ok: false, why: `script threw: ${error}` }));
  return checks.map(({ turnIndex, check }) => {
    try {
      const r = check(doc);
      return { turnIndex, ...r };
    } catch (err) {
      return { turnIndex, ok: false, why: `check threw: ${err.message}` };
    }
  });
}

// ── the run ────────────────────────────────────────────────────────────

async function runObject(model, obj) {
  console.log(`\n### ${model} × ${obj.name}`);
  let log = buildLog.proposeBuild({
    n: 1, turn: 1, caption: obj.name,
    seg: { type: "code", lang: "html", code: obj.widget },
    instruction: `make me a ${obj.name} widget`,
  });
  // THE BIRTH IS WITNESSED (2026-08-18, mirroring today's publishBuild
  // fix) — closes the turn-1 blind spot: without this, witnessRegressed's
  // `prev` is null on turn 1, so the gate above waves everything through
  // regardless of what the patch does.
  {
    const birthWitness = witnessCode("html", obj.widget);
    if (birthWitness.ok !== null) log = buildLog.attachWitness(log, { witness: birthWitness });
  }

  const rows = [];
  const checksSoFar = []; // {turnIndex, check}
  // baseline check (turn 0, the object as given) always included.
  const startingCheck = obj.name === "spreadsheet"
    ? (doc) => { typeInto(cell(doc, 0, 0), "10"); const s = doc.getElementById("sum"); return { ok: s && /1[0-3]/.test(s.textContent), why: `sum after typing 10 into (0,0) = ${JSON.stringify(s && s.textContent)}` }; }
    : (doc) => { typeInto(doc.getElementById("what"), "seed task"); fire(doc.getElementById("add"), "click"); return { ok: taskLis(doc).length === 1, why: `tasks after add = ${taskLis(doc).length}` }; };
  checksSoFar.push({ turnIndex: 0, check: startingCheck });

  for (let i = 0; i < obj.turns.length; i++) {
    const t = obj.turns[i];
    const turnIndex = i + 1;
    const before = buildLog.foldBuild(log);
    const beforeCode = before.code;

    const result = await stressTurn(model, log, t.ask);
    log = result.log;
    const after = buildLog.foldBuild(log);
    const conformFindings = buildLog.conform(log);

    if (t.check) checksSoFar.push({ turnIndex, check: t.check });

    // Re-run EVERY prior turn's own check (plus the baseline) against the
    // CURRENT artifact — the regression sweep.
    const behavioral = result.landed && after?.code
      ? runBehavioralChecks(after.code, checksSoFar)
      : checksSoFar.map(({ turnIndex: ti }) => ({ turnIndex: ti, ok: null, why: "no landing this turn — code unchanged or absent" }));

    const thisTurnBehavior = behavioral.find((b) => b.turnIndex === turnIndex) ?? null;
    const regressions = behavioral.filter((b) => b.turnIndex !== turnIndex && b.ok === false);

    const row = {
      turnIndex,
      ask: t.ask,
      predictedKind: t.kind,
      routedAs: result.route ? result.route.tell : null, // null = router said "new build" (no route)
      landedAsRezero: result.landed ? !!result.rezeroed : null, // the ACTUAL landing decision — a "resolved" tell can still land as an ordinary revise (2026-08-18 fix)
      landed: result.landed,
      gap: result.gap ?? null,
      structuralClean: result.witnessOk === undefined ? null : result.witnessOk,
      structuralFindings: result.findings ?? [],
      behavioralOwnCheck: thisTurnBehavior,
      regressionsIntroducedThisTurn: regressions,
      conformFindings,
      codeLenBefore: beforeCode?.length ?? 0,
      codeLenAfter: after?.code?.length ?? 0,
      groundAfter: after?.ground ?? 1,
      tokens: result.tokens,
    };
    rows.push(row);

    const mark = result.landed ? (result.witnessOk === false ? "landed/dirty" : "landed") : `refused(${result.gap})`;
    const routeLabel = !result.route
      ? "revise/new"
      : !result.landed
        ? `route:${result.route.tell}` // refused — neither rezero nor revise actually landed
        : result.rezeroed
          ? `rezero:${result.route.tell}`
          : `revise:${result.route.tell}`;
    const behLabel = thisTurnBehavior ? (thisTurnBehavior.ok === true ? "beh-ok" : thisTurnBehavior.ok === false ? "BEH-FAIL" : "beh-n/a") : "no-check";
    const regLabel = regressions.length ? ` REGRESSIONS:${regressions.map((r) => r.turnIndex).join(",")}` : "";
    console.log(`  ${turnIndex}. [${routeLabel}] "${t.ask.slice(0, 50)}" — ${mark} · ${behLabel}${regLabel}${conformFindings.length ? ` CONFORM:${conformFindings.length}` : ""}`);

    // Snapshot code at any interesting failure for the report.
    if (result.witnessOk === false || (thisTurnBehavior && thisTurnBehavior.ok === false) || regressions.length || conformFindings.length) {
      row.codeSnapshot = after?.code ?? beforeCode ?? "";
    }
  }

  const outPath = path.join(RESULTS_DIR, `stress-${model.replace(/[:/]/g, "_")}-${obj.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ model, object: obj.name, rows }, null, 2));
  console.log(`  -> ${outPath}`);
  return rows;
}

const models = process.argv.slice(2).length ? process.argv.slice(2) : ["gemma2:2b", "qwen2.5-coder:7b"];

const all = {};
for (const model of models) {
  all[model] = {};
  for (const obj of OBJECTS) {
    all[model][obj.name] = await runObject(model, obj);
  }
}

fs.writeFileSync(path.join(RESULTS_DIR, "stress-eval-all.json"), JSON.stringify(all, null, 2));
console.log("\nDone. Full results in eval/results/stress-eval-all.json");
