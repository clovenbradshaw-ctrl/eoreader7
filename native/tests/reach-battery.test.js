// native/tests/reach-battery.test.js — the reach battery's instruments, enforced.
//
// The battery (eval/reach/) asks whether care can be STATED or must be DERIVED.
// Its answer is only as good as its instruments, so this file tests the
// instruments — the checkers, the derivation, the edit applier, the scorer, the
// runner — with planted cases built to fail. It asserts nothing about what a
// model does; that is a live result in eval/raw/, re-summarised below so the
// committed results file cannot drift from the committed raw records.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TASKS, STANCE, PLACEBO, WISDOM, GOAL } from "../eval/reach/tasks.mjs";
import { checkTask, htmlAvailable, closeBrowser } from "../eval/reach/check.mjs";
import * as B from "../eval/reach/battery.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const htmlOk = await htmlAvailable();
after(async () => { await closeBrowser(); });
const byId = (id) => TASKS.find((t) => t.id === id);
const apply = (task, edits) => { const r = B.applyEdits(task.artifact, edits); assert.ok(r.ok, `${task.id}: ${r.reason}`); return r.text; };
const skipHtml = (t) => (t.family === "html" && !htmlOk ? "chromium unavailable" : false);

test("the battery has the shape it claims: 12 coupled, 6 controls, 1 dynamic, unique ids", () => {
  assert.equal(TASKS.filter((t) => t.kind === "coupled").length, 12);
  assert.equal(TASKS.filter((t) => t.kind === "control").length, 6);
  assert.equal(TASKS.filter((t) => t.kind === "dynamic").length, 1);
  assert.equal(new Set(TASKS.map((t) => t.id)).size, TASKS.length);
  assert.deepEqual([...new Set(TASKS.map((t) => t.family))].sort(), ["contract", "html", "javascript", "markdown", "python", "sql"]);
});

test("every task is well-formed: the region is unique, the dependents lie OUTSIDE it, the known edits apply", () => {
  for (const t of TASKS) {
    assert.equal(t.artifact.split(t.region).length - 1, 1, `${t.id}: the region occurs exactly once`);
    for (const d of t.dependents) {
      assert.ok(t.artifact.includes(d), `${t.id}: dependent "${d}" is in the artifact`);
      assert.ok(!t.region.includes(d), `${t.id}: dependent "${d}" must lie outside the region`);
    }
    apply(t, t.gold);
    apply(t, t.regionOnly);
    assert.equal(t.kind === "control", t.dependents.length === 0, `${t.id}: controls, and only controls, have no dependents`);
  }
});

// ── the checkers, against planted cases ──────────────────────────────────────
for (const task of TASKS) {
  test(`checker ${task.id}: passes the known-good edit, fails the region-only edit, sees the baseline as intact`, { skip: skipHtml(task) }, async () => {
    const noop = await checkTask(task, task.artifact);
    assert.deepEqual([noop.requested, noop.intact], [false, true], `${task.id}: with no edit, nothing is requested and everything still works (${noop.error ?? ""})`);
    const gold = await checkTask(task, apply(task, task.gold));
    assert.deepEqual([gold.requested, gold.intact], [true, true], `${task.id}: the known-good edit must satisfy the checker (${gold.error ?? ""})`);
    const isolated = await checkTask(task, apply(task, task.regionOnly));
    if (task.kind === "control") assert.deepEqual([isolated.requested, isolated.intact], [true, true], `${task.id}: an uncoupled edit needs only the region`);
    else assert.deepEqual([isolated.requested, isolated.intact], [true, false], `${task.id}: editing only the region must be seen to break something (${isolated.error ?? ""})`);
  });
}

test("a checker never throws on garbage: an empty artifact and a syntactically broken one are 'nothing requested, not intact'", async () => {
  for (const id of ["py-sig-a", "js-key-a", "sql-col-a", "md-anchor-a", "term-a"]) {
    const t = byId(id);
    for (const junk of ["", "}{ not code (((", "\u0000"]) {
      const r = await checkTask(t, junk);
      assert.equal(r.requested, false, `${id}: junk does not satisfy the request`);
      if (["py-sig-a", "js-key-a", "sql-col-a"].includes(id)) assert.equal(r.intact, false, `${id}: junk is not intact`);
    }
  }
});

// ── the derivation ───────────────────────────────────────────────────────────
test("the derivation finds every name-linked dependent, in all six media, from the artifact and the region alone", () => {
  const nameLinked = TASKS.filter((t) => t.kind === "coupled" && t.id !== "py-sig-b");
  assert.equal(nameLinked.length, 11);
  for (const t of nameLinked) {
    const a = B.reachAccuracy(t);
    assert.equal(a.recall, 1, `${t.id}: recall ${a.found}/${a.dependents}`);
  }
  assert.equal(B.deriveReach.length, 2, "it takes (artifact, region) and nothing else: no medium, no language, no task");
});

test("its boundaries, pinned rather than hidden: a data-flow dependent is missed, and a name never written out is invisible", () => {
  const flow = B.reachAccuracy(byId("py-sig-b"));
  assert.deepEqual([flow.found, flow.dependents], [1, 2], "parts[1] reaches parse() only through the variable `parts` — one hop of shared names cannot see it");
  const dyn = B.reachAccuracy(byId("dyn-key"));
  assert.deepEqual([dyn.found, dyn.dependents], [0, 1], "the caller reads a key assembled at run time and shares no name with the region");
  const shown = B.deriveReach(byId("dyn-key").artifact, byId("dyn-key").region);
  assert.ok(shown.some((s) => /"user_" \+ suffix/.test(s.text)), "but the line that assembles the key IS shown — a lead, not a repair");
});

test("a name on every line carries nothing: inverse line frequency, not raw overlap", () => {
  const art = "alpha beta\nalpha gamma\nalpha delta\nbeta zeta";
  const r = B.deriveReach(art, "alpha beta");
  const score = (t) => r.find((x) => x.text === t).score;
  assert.ok(score("beta zeta") > score("alpha gamma"), "`beta` (2 of 4 lines) outweighs `alpha` (3 of 4 lines)");
  assert.deepEqual(r.map((x) => x.line), [2, 3, 4], "displayed in file order, whatever the ranking");
});

// ── edits ────────────────────────────────────────────────────────────────────
test("edits are atomic and replace every occurrence of a find in the text shown; a missing or malformed edit rejects the whole response", () => {
  assert.equal(B.applyEdits("abc", []).noop, true);
  assert.equal(B.applyEdits("abc", [{ find: "b", replace: "X" }]).text, "aXc");
  assert.match(B.applyEdits("abc", [{ find: "z", replace: "X" }]).reason, /not in the text shown/);
  const twice = B.applyEdits("abab", [{ find: "a", replace: "X" }]);
  assert.equal(twice.text, "XbXb", "a repeated find is replaced everywhere it was shown — the tool says so to the model");
  assert.equal(twice.replaced, 2);
  assert.match(B.applyEdits("abc", [{ find: "", replace: "X" }]).reason, /malformed/);
  const half = B.applyEdits("abc", [{ find: "a", replace: "X" }, { find: "q", replace: "Y" }]);
  assert.match(half.reason, /edit 1/, "the good edit is not applied if a later one fails");
  assert.equal(half.text, undefined, "and no partial text is returned");
  assert.equal(B.applyEdits("a$&b", [{ find: "$&", replace: "$$" }]).text, "a$$b", "replacement text is literal, never a pattern");
});

test("edits reach only the text the writer was shown: the same word in the unseen part of the file is left alone", () => {
  const art = "keep price\nwant price\nkeep price too";
  const view = [{ start: 11, end: 21 }]; // "want price"
  assert.equal(art.slice(view[0].start, view[0].end), "want price");
  const r = B.applyEditsToView(art, view, [{ find: "price", replace: "unit_price" }]);
  assert.equal(r.text, "keep price\nwant unit_price\nkeep price too", "the unseen occurrences keep their old spelling: that is the harm a bare writer does");
  assert.equal(r.replaced, 1);
  assert.match(B.applyEditsToView(art, view, [{ find: "too", replace: "X" }]).reason, /not in the text shown/, "a find that occurs only in the unseen part is refused, not applied there");
  const two = B.applyEditsToView(art, [{ start: 0, end: 10 }, { start: 11, end: 21 }], [{ find: "price", replace: "P" }]);
  assert.equal(two.text, "keep P\nwant P\nkeep price too", "several shown ranges are all edited; the rest is not");
  assert.throws(() => B.applyEditsToView(art, [{ start: 0, end: 12 }, { start: 11, end: 21 }], [{ find: "a", replace: "b" }]), /overlap/);
});

test("each arm's writer may edit exactly what its prompt shows", () => {
  for (const t of TASKS) {
    const at = t.artifact.indexOf(t.region);
    for (const arm of ["bare", "placebo", "stance", "wisdom"]) assert.deepEqual(B.segmentsFor(t, arm), [{ start: at, end: at + t.region.length }], `${t.id}/${arm}: the region and nothing else`);
    const whole = B.segmentsFor(t, "whole");
    assert.equal(whole.length, 1);
    assert.equal(t.artifact.slice(whole[0].start, whole[0].end), t.artifact.trimEnd());
    for (const arm of ["reach", "decoy"]) {
      const segs = B.segmentsFor(t, arm);
      assert.deepEqual(segs[segs.map((x) => x.start).indexOf(at)] && { start: at, end: at + t.region.length }, { start: at, end: at + t.region.length }, `${t.id}/${arm}: the region is among them`);
      for (let i = 1; i < segs.length; i += 1) assert.ok(segs[i].start >= segs[i - 1].end, `${t.id}/${arm}: disjoint and in file order`);
      // what the prompt shows is exactly what the ranges cover
      const prompt = B.buildPrompt(t, arm);
      for (const s of segs) if (s.start !== at) assert.ok(prompt.includes(t.artifact.slice(s.start, s.end)), `${t.id}/${arm}: every extra range is a line the prompt shows`);
    }
  }
});

test("scoring: success needs the request AND intactness; silent harm needs harm AND no flag; a no-op is neither", () => {
  const s = (o) => B.scoreOutcome({ before: "a", after: o.after, flagged: !!o.flagged, checked: { requested: o.req, intact: o.intact } });
  assert.deepEqual(pick(s({ after: "b", req: true, intact: true })), { success: true, harm: false, silentHarm: false });
  assert.deepEqual(pick(s({ after: "b", req: true, intact: false })), { success: false, harm: true, silentHarm: true });
  assert.deepEqual(pick(s({ after: "b", req: true, intact: false, flagged: true })), { success: false, harm: true, silentHarm: false });
  assert.deepEqual(pick(s({ after: "a", req: false, intact: true })), { success: false, harm: false, silentHarm: false });
  function pick(o) { return { success: o.success, harm: o.harm, silentHarm: o.silentHarm }; }
});

// ── the arms ─────────────────────────────────────────────────────────────────
test("the arms differ only in what each is meant to add", () => {
  const t = byId("js-key-a");
  const P = Object.fromEntries(B.ARMS.map((a) => [a, B.buildPrompt(t, a)]));
  assert.equal(B.ARMS.length, 10);
  const sayings = { stance: STANCE, placebo: PLACEBO, goal: GOAL };
  const gets = { bare: [], placebo: ["placebo"], stance: ["stance"], wisdom: [], decoy: [], goal: ["goal"], reach: [], both: ["stance"], reachgoal: ["goal"], whole: [] };
  for (const a of B.ARMS) for (const w of WISDOM) assert.equal(P[a].includes(w.text), a === "wisdom", `${a}: wisdom text only in the wisdom arm`);
  for (const a of B.ARMS) for (const [name, sentence] of Object.entries(sayings)) assert.equal(P[a].includes(sentence), gets[a].includes(name), `${a}: the ${name} sentence is present exactly where it is meant to be`);
  for (const [name, sentence] of Object.entries(sayings)) assert.ok(Math.abs(sentence.length - STANCE.length) / STANCE.length < 0.1, `${name}: length-matched to the governor sentence within 10%`);
  assert.deepEqual(P.both.split("\n\n").filter((x) => x !== STANCE), P.reach.split("\n\n"), "both is reach plus the governor sentence and nothing else");
  assert.deepEqual(P.reachgoal.split("\n\n").filter((x) => x !== GOAL), P.reach.split("\n\n"), "reachgoal is reach plus the goal sentence and nothing else");
  assert.deepEqual(P.goal.split("\n\n").filter((x) => x !== GOAL), P.bare.split("\n\n"), "goal is bare plus the goal sentence and nothing else");
  assert.ok(P.reach.includes("config.retryLimit"), "the derived line reaches the writer");
  assert.ok(!P.bare.includes("config.retryLimit") && !P.decoy.includes("config.retryLimit") && !P.goal.includes("config.retryLimit"), "and neither the bare arm, the decoy nor the goal arm sees it");
  assert.ok(P.whole.includes(t.artifact.trimEnd()));
  for (const a of B.ARMS) assert.ok(!/eoreader|ethos|charter/i.test(P[a]), `${a}: no apparatus vocabulary reaches the model`);
});

test("the decoy is the control built to fail: same framing and line count as reach, and never a dependent, never the region", () => {
  for (const t of TASKS) {
    const real = B.deriveReach(t.artifact, t.region);
    const decoy = B.decoyReach(t);
    assert.equal(decoy.length, Math.min(real.length, decoy.length), `${t.id}: never more lines than reach shows`);
    if (t.artifact.split("\n").filter((l) => l.trim()).length - t.region.split("\n").length - t.dependents.length >= real.length) assert.equal(decoy.length, real.length, `${t.id}: as many as reach, when the file has that many non-dependent lines`);
    const truth = new Set(t.dependents.map((d) => t.artifact.split("\n").findIndex((l) => l.includes(d)) + 1));
    for (const d of decoy) { assert.ok(!truth.has(d.line), `${t.id}: decoy line ${d.line} is not a dependent`); assert.ok(!t.region.includes(d.text), `${t.id}: nor the region`); }
    assert.deepEqual(B.decoyReach(t), decoy, `${t.id}: deterministic — seeded by the task, not by the run`);
    const framing = (arm) => B.buildPrompt(t, arm).split("\n").filter((l) => l.startsWith("Other lines"));
    if (real.length && decoy.length) assert.deepEqual(framing("decoy"), framing("reach"), `${t.id}: the two arms are introduced by the same words`);
  }
  for (const t of TASKS.filter((x) => x.kind === "coupled")) assert.ok(B.decoyReach(t).length > 0, `${t.id}: a decoy that shows nothing is just the bare arm — every coupled task must have lines that are neither the region nor its dependents`);
});

// ── the runner, against a stand-in that answers from the task's known edits ──
// The stand-in is an ideal writer of what it is shown: it makes every known-good
// edit whose find text is in the fenced text of its prompt, and no others.
const shownOf = (prompt) => [...prompt.matchAll(/```\n([\s\S]*?)\n```/g)].map((m) => m[1]).join("\n");
test("the runner scores, records and resumes: an ideal writer of what it sees succeeds only where it sees the dependents; controls survive every arm", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reach-run-"));
  const file = path.join(tmp, "run.jsonl");
  const subset = ["py-sig-a", "md-anchor-a", "term-a", "py-control"].map(byId);
  const askFn = async (prompt) => {
    const t = subset.find((x) => prompt.includes(x.request));
    const seen = shownOf(prompt);
    const flagged = prompt.includes(STANCE);
    return { text: JSON.stringify({ edits: t.gold.filter((e) => seen.includes(e.find)), risk: flagged ? "may_break_unseen_parts" : "none" }), ms: 1, tokens: { prompt: 1, generated: 1 } };
  };
  try {
    const info = await B.runBattery({ file, tasks: subset, arms: B.ARMS, reps: 1, askFn, concurrency: 2 });
    assert.equal(info.planned, subset.length * B.ARMS.length);
    const rows = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const row = (task, arm) => rows.find((r) => r.task === task && r.arm === arm);
    for (const id of ["py-sig-a", "md-anchor-a", "term-a"]) {
      for (const arm of ["reach", "whole"]) assert.equal(row(id, arm).success, true, `${id}/${arm}: sees the dependents, repairs them`);
      for (const arm of ["bare", "placebo", "wisdom"]) { assert.equal(row(id, arm).silentHarm, true, `${id}/${arm}: sees only the region, breaks the rest, unflagged`); assert.equal(row(id, arm).success, false); }
      assert.equal(row(id, "decoy").success, false, `${id}/decoy: more lines that are not the dependents repair nothing`);
      assert.equal(row(id, "decoy").silentHarm, true);
      assert.equal(row(id, "stance").harm, true);
      assert.equal(row(id, "stance").silentHarm, false, `${id}: flagged harm is not silent`);
    }
    for (const arm of B.ARMS) assert.equal(row("py-control", arm).success, true, `the control succeeds under ${arm}`);
    // a short find that also occurs in the unseen part is applied to the shown part only (the first launch refused it, protecting bare from its own harm)
    const sloppy = await B.runOne(byId("term-a"), "bare", { askFn: async () => ({ text: JSON.stringify({ edits: [{ find: "Supplier", replace: "Vendor" }], risk: "none" }), ms: 1, tokens: {} }) });
    assert.equal(sloppy.applied.ok, true, "a find that occurs 4 times in the file is not refused");
    assert.equal(sloppy.applied.replaced, 1, "it is replaced where the writer could see it");
    assert.equal(sloppy.silentHarm, true);
    const sloppyReach = await B.runOne(byId("term-a"), "reach", { askFn: async () => ({ text: JSON.stringify({ edits: [{ find: "Supplier", replace: "Vendor" }], risk: "none" }), ms: 1, tokens: {} }) });
    assert.equal(sloppyReach.applied.replaced, 4, "and everywhere it was shown when the derived lines are shown");
    assert.equal(sloppyReach.success, true);
    // resumable: a second run does nothing; a torn last line is re-run
    const again = await B.runBattery({ file, tasks: subset, arms: B.ARMS, reps: 1, askFn });
    assert.equal(again.planned, 0);
    const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
    fs.writeFileSync(file, `${lines.slice(0, -2).join("\n")}\n{"key": "torn`); // lose two complete rows and leave a torn line with no newline
    const resumed = await B.runBattery({ file, tasks: subset, arms: B.ARMS, reps: 1, askFn });
    assert.equal(resumed.planned, 2, "exactly the two lost rows are re-run; the torn line is ignored");
    const after = B.readRecords(file);
    assert.equal(after.length, lines.length, "and every re-run row landed on its own line, none glued to the torn one");
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test("'edited outside the region' is recomputed from the recorded edits, and is impossible for the region-only arms", () => {
  const term = byId("term-a");
  const rec2 = (arm, edits) => ({ task: "term-a", arm, parsed: { edits, risk: "none" } });
  const rename = [{ find: "Supplier", replace: "Vendor" }];
  assert.equal(B.touchedOutside(rec2("bare", rename)), false, "bare shows only the region: nothing outside can change");
  assert.equal(B.touchedOutside(rec2("reach", rename)), true, "reach shows the other clauses: a replace-all reaches them");
  assert.equal(B.touchedOutside(rec2("reach", [{ find: '"Supplier" means', replace: '"Vendor" means' }])), false, "a careful copy of the region alone does not");
  assert.equal(B.touchedOutside(rec2("whole", [{ find: "5. Notices", replace: "5. Notice" }])), true);
  assert.equal(B.touchedOutside({ task: "term-a", arm: "reach", parsed: null }), false);
  assert.ok(term);
});

test("the derived integrity check sees a partial rename and nothing else, and is checked against the executed oracle on the known edits", async () => {
  assert.deepEqual(B.partialRenames("startButton a startButton b startButton", "startBtn a startButton b startButton"), ["startbutton"], "one of three occurrences changed away: partial");
  assert.deepEqual(B.partialRenames("startButton a startButton", "startBtn a startBtn"), [], "all occurrences changed: a complete rename is not partial");
  assert.deepEqual(B.partialRenames("timeout 500", "timeout 750"), [], "an edit that keeps every name is invisible to it");
  assert.deepEqual(B.partialRenames("alpha\nbeta alpha", "beta alpha"), ["alpha"], "a legitimate deletion of one mention among several is a false alarm — the limit, pinned");
  // against the executed oracle, on every task's known edits: region-only breaks the coupled ones; does the derived check see it?
  const seen = { coupled: [0, 0], control: [0, 0] };
  for (const task of TASKS.filter((x) => x.kind !== "dynamic")) {
    const after = apply(task, task.regionOnly);
    const flagged = B.partialRenames(task.artifact, after).length > 0;
    if (task.kind === "control") { seen.control[0] += flagged ? 1 : 0; seen.control[1] += 1; } else { seen.coupled[0] += flagged ? 1 : 0; seen.coupled[1] += 1; }
    const gold = apply(task, task.gold);
    assert.equal(B.partialRenames(task.artifact, gold).length > 0, false, `${task.id}: the complete edit is never flagged`);
  }
  assert.equal(seen.control[0], 0, "no false alarm on the uncoupled controls' known edits");
  assert.equal(seen.coupled[0], 10, "10 of the 12 coupled region-only edits leave a partial rename; the two signature changes keep their names and are missed");
});

test("a model that fails or answers with garbage is recorded as an error or a no-op, never as success", async () => {
  const t = byId("py-sig-a");
  const bad = await B.runOne(t, "bare", { askFn: async () => ({ text: "not json at all", ms: 1, tokens: {} }) });
  assert.equal(bad.applied.ok, false); assert.equal(bad.success, false); assert.equal(bad.harm, false);
  const boom = await B.runOne(t, "bare", { askFn: async () => { throw new Error("connection refused"); } });
  assert.match(boom.error, /model call failed/);
});

// ── the ceiling: what visibility alone can do ───────────────────────────────
test("an ideal writer of what it is shown: no statement can repair what the writer cannot see; the derived lines can", { skip: htmlOk ? false : "chromium unavailable" }, async () => {
  const cell = async (arm, kind) => { let ok = 0; let harm = 0; let n = 0; for (const t of TASKS.filter((x) => x.kind === kind)) { const r = await B.idealWriter(t, arm); n += 1; ok += r.success ? 1 : 0; harm += r.harm ? 1 : 0; } return { n, ok, harm }; };
  for (const arm of ["bare", "placebo", "stance", "wisdom", "decoy", "goal"]) assert.deepEqual(await cell(arm, "coupled"), { n: 12, ok: 0, harm: 12 }, `${arm}: an ideal writer that sees only the region still breaks every coupled task`);
  for (const arm of ["reach", "both", "reachgoal"]) assert.deepEqual(await cell(arm, "coupled"), { n: 12, ok: 11, harm: 1 }, `${arm}: the derived lines repair 11 of 12; the data-flow dependent (py-sig-b) is the one it cannot see`);
  assert.deepEqual(await cell("whole", "coupled"), { n: 12, ok: 12, harm: 0 });
  for (const arm of B.ARMS) assert.deepEqual(await cell(arm, "control"), { n: 6, ok: 6, harm: 0 }, `${arm}: an ideal writer never hurts an uncoupled control`);
  assert.equal((await B.idealWriter(byId("dyn-key"), "reach")).success, false, "the boundary: coupling through a name assembled at run time is invisible to the derivation");
  assert.equal((await B.idealWriter(byId("dyn-key"), "whole")).success, true);
});
test("the committed ceiling table is what the code produces now", { skip: htmlOk ? false : "chromium unavailable" }, async () => {
  const f = path.join(HERE, "..", "eval", "results", "reach-ceiling-RESULTS.md");
  assert.ok(fs.existsSync(f), "run: node native/eval/reach/battery.mjs --ceiling > native/eval/results/reach-ceiling-RESULTS.md");
  assert.equal(fs.readFileSync(f, "utf8"), await B.ceilingMarkdown());
});

// ── statistics ───────────────────────────────────────────────────────────────
test("wilson and fisher agree with hand-computed values", () => {
  const [lo, hi] = B.wilson(0, 10);
  assert.equal(lo, 0); assert.ok(hi > 0.27 && hi < 0.29, `0/10 upper bound ${hi}`);
  assert.ok(Math.abs(B.fisher(2, 8, 10, 0) - 7.14e-4) < 1e-5, "the seam probe's 2/10 vs 10/10 comparison");
  assert.ok(B.fisher(5, 5, 5, 5) > 1 - 1e-9);
  assert.ok(B.fisher(10, 0, 0, 10) < 1e-4);
});

test("the exact sign test agrees with hand-computed values, and ties carry no weight", () => {
  assert.equal(B.signTest(0, 0), 1);
  assert.ok(Math.abs(B.signTest(12, 0) - 2 / 4096) < 1e-12, "12 of 12 tasks one way: 2 x (1/2)^12");
  assert.ok(Math.abs(B.signTest(0, 12) - 2 / 4096) < 1e-12, "symmetric");
  assert.ok(Math.abs(B.signTest(3, 9) - 598 / 4096) < 1e-12, "3 vs 9: 2 x (1 + 12 + 66 + 220) / 4096");
  assert.equal(B.signTest(6, 6), 1);
});

const rec = (task, kind, family, arm, over = {}) => ({ key: `${task}|${arm}|${Math.random()}`, task, kind, family, arm, success: false, harm: false, silentHarm: false, flagged: false, noop: false, applied: { ok: true }, ...over });
test("the paired task-level comparison counts each task once, whatever the number of reps", () => {
  // task A: reach 5/5, bare 0/5 ; task B: reach 5/5, bare 5/5 (tie) ; task C: reach 0/5, bare 5/5
  const records = [];
  for (let i = 0; i < 5; i += 1) {
    records.push(rec("A", "coupled", "x", "reach", { success: true }), rec("A", "coupled", "x", "bare"));
    records.push(rec("B", "coupled", "x", "reach", { success: true }), rec("B", "coupled", "x", "bare", { success: true }));
    records.push(rec("C", "coupled", "x", "reach"), rec("C", "coupled", "x", "bare", { success: true }));
  }
  const t = B.pairedTasks(records, "reach", "bare", "success");
  assert.deepEqual([t.tasks, t.pos, t.neg, t.tie], [3, 1, 1, 1]);
  assert.equal(t.meanDiff, 0);
  assert.equal(t.p, 1);
  // 60 runs pooled would look far more certain than 3 tasks can be
  assert.ok(B.fisher(10, 5, 5, 10) < 0.2 && B.signTest(t.pos, t.neg) === 1);
  assert.equal(B.pairedTasks(records, "reach", "wisdom", "success").tasks, 0, "an arm with no runs pairs with nothing");
});

test("the predictions are scored mechanically from the records, with the declared thresholds", () => {
  // a world in which the derivation is what helps: bare/placebo/wisdom/decoy fail silently, stance flags, reach and whole succeed
  const fams = ["a", "b", "c", "d", "e", "f"];
  const records = [];
  for (const fam of fams) for (const id of [`${fam}1`, `${fam}2`]) for (let i = 0; i < 4; i += 1) {
    for (const arm of ["bare", "placebo", "wisdom", "decoy"]) records.push(rec(id, "coupled", fam, arm, { harm: true, silentHarm: true }));
    records.push(rec(id, "coupled", fam, "stance", { harm: true, flagged: true }));
    for (const arm of ["reach", "whole"]) records.push(rec(id, "coupled", fam, arm, { success: true }));
    records.push(rec(id, "coupled", fam, "both", { success: true, flagged: true }));
    records.push(rec(id, "coupled", fam, "goal", { harm: true, silentHarm: true }));
    records.push(rec(id, "coupled", fam, "reachgoal", { success: true }));
  }
  for (const fam of fams) for (let i = 0; i < 4; i += 1) for (const arm of B.ARMS) records.push(rec(`${fam}c`, "control", fam, arm, { success: true }));
  for (let i = 0; i < 4; i += 1) for (const arm of B.ARMS) records.push(rec("dyn", "dynamic", "python", arm, arm === "reach" || arm === "whole" ? { harm: true, silentHarm: true } : { harm: true, silentHarm: true }));
  const rows = Object.fromEntries(B.predictionRows(records).map((r) => [r.id, r]));
  for (const id of ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P9", "P10"]) assert.equal(rows[id].verdict, "held", `${id}: ${rows[id].measured}`);
  // a world in which a length-matched placebo does what the derivation does: P2 and P7 must FAIL
  const placeboWorld = records.map((r) => (r.arm === "placebo" && r.kind === "coupled" ? { ...r, success: true, harm: false, silentHarm: false } : r));
  const rows2 = Object.fromEntries(B.predictionRows(placeboWorld).map((r) => [r.id, r]));
  assert.equal(rows2.P2.verdict, "FAILED", "placebo helping as much as reach breaks 'placebo ≈ bare'");
  // a world in which the decoy helps as much as reach: P7 fails and P8's rule is what saves the reading
  const decoyWorld = records.map((r) => (r.arm === "decoy" && r.kind === "coupled" ? { ...r, success: true, harm: false, silentHarm: false } : r));
  assert.equal(Object.fromEntries(B.predictionRows(decoyWorld).map((r) => [r.id, r])).P7.verdict, "FAILED");
  // a world in which stating the goal does what the derivation does: P10 fails
  const goalWorld = records.map((r) => (r.arm === "reachgoal" && r.kind === "coupled" ? { ...r, success: true } : r.arm === "reach" && r.kind === "coupled" ? { ...r, success: false, harm: true } : r));
  assert.equal(Object.fromEntries(B.predictionRows(goalWorld).map((r) => [r.id, r])).P10.verdict, "FAILED");
  // a world in which the governor still rescues what the derivation missed: P9 fails
  const govWorld = records.map((r) => (r.arm === "reach" && r.kind === "coupled" ? { ...r, success: false, harm: true, silentHarm: true } : r));
  assert.equal(Object.fromEntries(B.predictionRows(govWorld).map((r) => [r.id, r])).P9.verdict, "FAILED");
  // nothing measured yet: nothing is declared held
  assert.ok(B.predictionRows([]).every((r) => r.verdict === "not measured"));
  const md = B.resultsMarkdown({ records, model: "stub", files: [] });
  assert.match(md, /Pre-registered predictions/);
  assert.match(md, /Task-level: paired over tasks/);
  assert.match(md, /Diagnostics: was the instrument in the way/);
  for (const arm of B.ARMS) assert.ok(md.includes(`| ${arm} |`), `${arm} appears in the tables`);
});

// ── the committed results cannot drift from what the code computes ───────────
test("the committed derivation table is what the code produces now", () => {
  const f = path.join(HERE, "..", "eval", "results", "reach-derivation-RESULTS.md");
  assert.ok(fs.existsSync(f), "run: node native/eval/reach/battery.mjs --derive > native/eval/results/reach-derivation-RESULTS.md");
  assert.equal(fs.readFileSync(f, "utf8"), B.derivationMarkdown());
});
test("the committed live results are the re-summary of the committed raw records, one results file per model", () => {
  const dir = path.join(HERE, "..", "eval", "raw");
  const raws = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => n.startsWith("reach-battery-") && n.endsWith(".jsonl")).sort() : [];
  if (!raws.length) return; // no live run committed yet
  const groups = new Map(); // model slug -> raw files (reach-battery-<slug>-<yyyymmdd>.jsonl)
  for (const n of raws) {
    const slug = /^reach-battery-(.+)-\d{8}[^/]*\.jsonl$/.exec(n)?.[1];
    assert.ok(slug, `${n}: raw records are named reach-battery-<model>-<date>.jsonl`);
    groups.set(slug, [...(groups.get(slug) ?? []), n]);
  }
  for (const [slug, names] of groups) {
    const f = path.join(HERE, "..", "eval", "results", `reach-battery-${slug}-RESULTS.md`);
    assert.ok(fs.existsSync(f), `raw live records for ${slug} are committed but their summary is not: node native/eval/reach/battery.mjs --summarize ${names.map((n) => `native/eval/raw/${n}`).join(" ")} > native/eval/results/reach-battery-${slug}-RESULTS.md`);
    const records = names.flatMap((n) => B.readRecords(path.join(dir, n)));
    assert.equal(new Set(records.map((r) => r.model)).size, 1, `${slug}: one model per results file`);
    assert.equal(fs.readFileSync(f, "utf8"), B.resultsMarkdown({ records, model: records[0]?.model ?? "?", files: names.map((n) => path.join("native", "eval", "raw", n)) }));
  }
});
