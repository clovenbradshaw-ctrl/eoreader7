// build-log.test.mjs — the walls themselves, against the real engine.
//
// Every test here runs build-log.js over eoreader6's actual
// engine/holon/task-log.js (imported by relative path, the same way the
// page imports it from /engine) — no stub carries these walls. What is
// pinned: the EO typing of constitutive entries, that the past is kept,
// that churn is refused, that any cursor position folds back byte-identical,
// that a log rebuilds from its entries alone (P3's resumption property), and
// that a build thread never runs the engine's algebra backward — verified by
// the engine's own checker, not a local re-statement of it.

import test from "node:test";
import assert from "node:assert/strict";

import * as taskLog from "../kernel/task-log.js";
import { cellOf } from "../kernel/cube.js";
import { checkCubeProgression } from "../kernel/task-log.js";
import { toDocument } from "./artifact.js";
import { makeBuildLog } from "./build-log.js";

const buildLog = makeBuildLog(taskLog);

const codeSeg = { type: "code", lang: "python", code: "print(1)" };
const tableSeg = { type: "table", head: ["a", "b"], rows: [["1", "x,y"], ["2", 'say "hi"']] };

function sampleLog() {
  let log = buildLog.proposeBuild({ n: 1, turn: 3, seg: codeSeg, caption: "python" });
  log = buildLog.attachRun(log, {
    params: { lang: "python", timeoutMs: 10_000, maxOutput: 65_536 },
    outcome: { ok: true, data: { code: 0, stdout: "1\n", stderr: "", timedOut: false } },
  });
  log = buildLog.reviseBuild(log, { code: "print(2)", reason: "edit" });
  log = buildLog.attachRun(log, {
    params: { lang: "python", timeoutMs: 10_000, maxOutput: 65_536 },
    outcome: { ok: true, data: { code: 0, stdout: "2\n", stderr: "", timedOut: false } },
  });
  return log;
}

test("a build is born as PROPOSE · INS · Figure · produced — birth is Generate · Existence, the handbook's own cell", () => {
  const log = buildLog.proposeBuild({ n: 1, turn: 2, seg: codeSeg, caption: "python" });
  assert.equal(log.entries.length, 1);
  const e = log.entries[0];
  assert.equal(e.kind, taskLog.ENTRY_KINDS.PROPOSE);
  assert.equal(e.operator, "INS");
  assert.equal(e.grain, "Figure");
  assert.equal(e.operator_basis, taskLog.OPERATOR_BASIS.PRODUCED);
  const b = buildLog.foldBuild(log);
  assert.equal(b.code, "print(1)");
  assert.equal(b.version, 1);
  // The fold carries the algebra's own cell for the pair, derived by the
  // engine, never hand-listed here.
  assert.equal(b.cell.op, "INS");
  assert.equal(b.cell.terrain, cellOf("INS", "Figure").terrain);
});

test("an edit is SUPERSEDE · SYN · Figure and the past stays on the log", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: codeSeg, caption: "python" });
  log = buildLog.reviseBuild(log, { code: "print(2)" });
  assert.equal(log.entries.length, 2);
  const e = log.entries[1];
  assert.equal(e.kind, taskLog.ENTRY_KINDS.SUPERSEDE);
  assert.equal(e.operator, "SYN");
  assert.equal(e.grain, "Figure");
  assert.equal(e.supersedes, "b1.v1");
  // The past is not gone: the v1 entry is still there, and the fold at the
  // earlier cursor still answers with it.
  assert.equal(log.entries[0].code, "print(1)");
  assert.equal(buildLog.foldBuild(log).version, 2);
  assert.equal(buildLog.foldBuild(log, 0).version, 1);
});

test("identical code is churn and appends nothing", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: codeSeg, caption: "python" });
  const same = buildLog.reviseBuild(log, { code: "print(1)" });
  assert.equal(same, log);
  assert.equal(same.entries.length, 1);
});

test("a run is a RESULT with no operator — results attach, they never re-type", () => {
  const log = sampleLog();
  const results = log.entries.filter((e) => e.kind === taskLog.ENTRY_KINDS.RESULT);
  assert.equal(results.length, 2);
  for (const r of results) {
    assert.equal(r.operator, undefined);
    assert.ok(r.params.lang === "python");
  }
  // Each result attached to the version that actually ran.
  assert.equal(results[0].task_id, "b1.v1");
  assert.equal(results[1].task_id, "b1.v2");
});

test("the cursor folds back every historical state byte-identically", () => {
  const log = sampleLog();
  // seq 0: v1, no run yet. seq 1: v1 with its run. seq 2: v2, no run yet
  // (a new version starts with no result — the old run belonged to v1).
  // seq 3: v2 with its run.
  const at0 = buildLog.foldBuild(log, 0);
  assert.equal(at0.code, "print(1)");
  assert.equal(at0.lastRun, null);
  const at1 = buildLog.foldBuild(log, 1);
  assert.equal(at1.code, "print(1)");
  assert.equal(at1.lastRun.data.stdout, "1\n");
  const at2 = buildLog.foldBuild(log, 2);
  assert.equal(at2.code, "print(2)");
  assert.equal(at2.lastRun, null);
  const at3 = buildLog.foldBuild(log, 3);
  assert.equal(at3.code, "print(2)");
  assert.equal(at3.lastRun.data.stdout, "2\n");
  assert.equal(at3.seqMax, 3);
});

test("a build thread never runs the algebra backward — the engine's own checker stays silent", () => {
  let log = sampleLog();
  log = buildLog.reviseBuild(log, { code: "print(3)", reason: "reset" });
  log = buildLog.reviseBuild(log, { code: "print(4)", reason: "restore" });
  assert.deepEqual(checkCubeProgression(log), []);
});

test("a log rebuilds from its serialized entries alone (P3's resumption property)", () => {
  const log = sampleLog();
  const stored = JSON.parse(JSON.stringify(log.entries));
  const replayed = buildLog.replayEntries(stored);
  assert.deepEqual(buildLog.foldBuild(replayed), buildLog.foldBuild(log));
  for (let s = 0; s < log.nextSeq; s++) {
    assert.deepEqual(buildLog.foldBuild(replayed, s), buildLog.foldBuild(log, s));
  }
});

test("a stored row that violates the vocabulary throws on replay instead of silently loading", () => {
  const bad = [{ kind: "propose", task_id: "b1.v1", operator: "SEG", grain: "Figure" }]; // no operator_basis
  assert.throws(() => buildLog.replayEntries(bad), /operator_basis/);
});

test("retract keeps the entries and empties the live fold", () => {
  let log = sampleLog();
  const before = log.entries.length;
  log = buildLog.retractBuild(log);
  assert.equal(log.entries.length, before + 1);
  assert.equal(buildLog.foldBuild(log), null);
  // The past is still addressable: the fold before the retraction answers.
  assert.equal(buildLog.foldBuild(log, before - 1).code, "print(2)");
});

test("a single retract on a re-zeroed build falls back to the earlier ground instead of emptying it — measured live, not assumed", () => {
  // Grounds are independent threads (no `supersedes` back to the ground
  // before them — rezeroBuild's own header). retractBuild only ever kills
  // the CURRENT one, so on a build that has been judged at least once,
  // one retraction reveals the ground underneath rather than clearing the
  // list — the defect a browser session found live, driving the real page,
  // that this pins.
  let log = sampleLog();
  log = buildLog.rezeroBuild(log, { code: "print(3)", trigger: "it's broken" });
  assert.equal(buildLog.groundCount(log), 2);
  log = buildLog.retractBuild(log);
  const fallback = buildLog.foldBuild(log);
  assert.notEqual(fallback, null);
  assert.equal(fallback.ground, 1);
  assert.equal(fallback.code, "print(2)");
});

test("retractAllGrounds empties a re-zeroed build completely, and the past stays addressable", () => {
  let log = sampleLog();
  log = buildLog.rezeroBuild(log, { code: "print(3)", trigger: "it's broken" });
  const beforeSeq = log.nextSeq - 1;
  log = buildLog.retractAllGrounds(log);
  assert.equal(buildLog.foldBuild(log), null);
  // Both grounds' history is still on the log, not erased.
  assert.equal(buildLog.foldBuild(log, beforeSeq).code, "print(3)");
});

test("retractAllGrounds on a build that never re-zeroed matches plain retractBuild", () => {
  let log = sampleLog();
  const bound = buildLog.groundCount(log);
  assert.equal(bound, 1);
  log = buildLog.retractAllGrounds(log);
  assert.equal(buildLog.foldBuild(log), null);
});

test("exportAt: code downloads as the version at the cursor, named by its address", () => {
  const log = sampleLog();
  const at0 = buildLog.exportAt(log, 0);
  assert.equal(at0.name, "build-1@0.py");
  assert.equal(at0.text, "print(1)");
  const live = buildLog.exportAt(log, null);
  assert.equal(live.name, "build-1@3.py");
  assert.equal(live.text, "print(2)");
});

test("exportAt: a table downloads as CSV with quoting, an html build as the rendered document", () => {
  const tlog = buildLog.proposeBuild({ n: 2, turn: 1, seg: tableSeg, caption: "table · 2 rows" });
  const csv = buildLog.exportAt(tlog, null);
  assert.equal(csv.name, "build-2@0.csv");
  assert.equal(csv.text, 'a,b\n1,"x,y"\n2,"say ""hi"""\n');

  const hlog = buildLog.proposeBuild({ n: 3, turn: 1, seg: { type: "code", lang: "html", code: "<p>hi</p>" }, caption: "html" });
  const doc = buildLog.exportAt(hlog, null, { toDocument });
  assert.equal(doc.mime, "text/html");
  // Whatever framing the preview renders is what downloads — the two cannot
  // drift because the same injected toDocument produces both.
  assert.equal(doc.text, toDocument({ type: "code", lang: "html", code: "<p>hi</p>" }));

  const slog = buildLog.proposeBuild({ n: 4, turn: 1, seg: { type: "code", lang: "svg", code: "<svg/>" }, caption: "svg" });
  assert.equal(buildLog.exportAt(slog, null).mime, "image/svg+xml");
});

test("timeline labels are mechanical, one row per entry", () => {
  const log = sampleLog();
  const t = buildLog.timeline(log);
  assert.deepEqual(
    t.map((r) => r.label),
    ["v1 · built", "ran", "v2 · edit", "ran"],
  );
  assert.deepEqual(
    t.map((r) => r.operator),
    ["INS", null, "SYN", null],
  );
});

test("run output is kept to a declared budget, the drop stated on the entry, never silent", () => {
  let log = buildLog.proposeBuild({ n: 7, turn: 1, seg: codeSeg, caption: "python" });
  const big = "x".repeat(20_000);
  log = buildLog.attachRun(log, {
    params: { lang: "python" },
    outcome: { ok: true, data: { code: 0, stdout: big, stderr: "small" } },
    keepChars: 16_384,
  });
  const run = buildLog.foldBuild(log).lastRun;
  assert.equal(run.data.stdout.length, 16_384);
  assert.deepEqual(run.data.kept, { stdout: { kept: 16_384, of: 20_000 } });
  // Under the budget nothing is touched and nothing claims to have been.
  assert.equal(run.data.stderr, "small");
  let small = buildLog.proposeBuild({ n: 8, turn: 1, seg: codeSeg, caption: "python" });
  small = buildLog.attachRun(small, { outcome: { ok: true, data: { code: 0, stdout: "1\n", stderr: "" } } });
  assert.equal(buildLog.foldBuild(small).lastRun.data.kept, undefined);
});

test("a legacy mutable build migrates to the honest floor: what was known becomes entries", () => {
  const log = buildLog.fromLegacy({
    n: 5,
    turn: 4,
    seg: codeSeg,
    caption: "python",
    code: "print(9)",
    lastRun: { ok: true, data: { code: 0, stdout: "9\n" } },
  });
  assert.equal(log.entries.length, 3); // propose + one supersede + one result
  const b = buildLog.foldBuild(log);
  assert.equal(b.code, "print(9)");
  assert.equal(b.lastRun.data.stdout, "9\n");
  // A legacy build whose code never diverged migrates without a phantom edit.
  const plain = buildLog.fromLegacy({ n: 6, turn: 1, seg: codeSeg, caption: "python", code: "print(1)", lastRun: null });
  assert.equal(plain.entries.length, 1);
});

test("instruction travels through proposeBuild, foldBuild, and survives replay", () => {
  const instr = "build a countdown from 10";
  let log = buildLog.proposeBuild({ n: 9, turn: 1, seg: codeSeg, caption: "python", instruction: instr });
  const b = buildLog.foldBuild(log);
  assert.equal(b.instruction, instr);
  // The ask precedes the artifact: NUL · Ground first, then the PROPOSE
  // carrying the instruction field.
  assert.equal(log.entries[0].operator, "NUL");
  assert.equal(log.entries[0].ask, instr);
  assert.equal(log.entries[1].instruction, instr);
  // Revise does not disturb the instruction — the fold keeps it.
  log = buildLog.reviseBuild(log, { code: "print(3)", reason: "edit" });
  assert.equal(buildLog.foldBuild(log).instruction, instr);
  // Replay from serialized entries preserves it.
  const replayed = buildLog.replayEntries(JSON.parse(JSON.stringify(log.entries)));
  assert.equal(buildLog.foldBuild(replayed).instruction, instr);
});

test("instruction defaults to null when omitted — legacy and mechanical turns", () => {
  const log = buildLog.proposeBuild({ n: 10, turn: 1, seg: codeSeg, caption: "python" });
  assert.equal(buildLog.foldBuild(log).instruction, null);
});

// ——— The patch carriage: operator-typed deltas (user direction, 2026-08-17:
// "use the 9 operators as the primitives"). The delta's ops are INS·admit /
// SEG·snip / SYN·compile; the entry stays SUPERSEDE · SYN because the
// production order is one-way and per-op entries would run it backward —
// verified below against the engine's own checker, never restated locally.

import { applyOps, PATCH_OPS } from "./build-log.js";

const widgetSeg = {
  type: "code",
  lang: "html",
  code: '<button style="background:#4CAF50;font-size:12px">go</button>',
};

test("applyOps: the operators are the primitives — SYN recompiles, INS admits after its anchor, SEG snips", () => {
  assert.deepEqual(PATCH_OPS, ["INS", "SEG", "SYN"]);
  const r = applyOps("aa CC bb", [
    { op: "SYN", find: "CC", add: "dd" },
    { op: "INS", find: "dd", add: " ee" },
    { op: "SEG", find: "aa " },
  ]);
  assert.equal(r.ok, true);
  assert.equal(r.code, "dd ee bb");
});

test("applyOps: an op naming bytes the projection does not hold is a typed gap, atomic — nothing applies", () => {
  const r = applyOps("aa bb", [
    { op: "SYN", find: "aa", add: "xx" },
    { op: "SYN", find: "zz", add: "yy" },
  ]);
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "unlocated");
  assert.equal(r.gap.at, 1);
  assert.equal(r.gap.find, "zz");
});

test("applyOps: bytes appearing more than once are ambiguous — a typed gap with the count, never a guess", () => {
  const r = applyOps("x = 1; y = 1", [{ op: "SYN", find: "1", add: "2" }]);
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "ambiguous");
  assert.equal(r.gap.count, 2);
});

test("applyOps: malformed ops are refused by name — unknown op, empty find, missing add", () => {
  assert.equal(applyOps("aa", [{ op: "EVA", find: "aa", add: "b" }]).gap.kind, "malformed");
  assert.equal(applyOps("aa", [{ op: "SYN", find: "", add: "b" }]).gap.kind, "malformed");
  assert.equal(applyOps("aa", [{ op: "SYN", find: "aa" }]).gap.kind, "malformed");
  assert.equal(applyOps("aa", []).gap.kind, "malformed");
});

test("patchBuild lands SUPERSEDE · SYN · Figure carrying the delta and no code; the fold compiles the whole", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "widget" });
  const r = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: "#4CAF50", add: "#2196F3" }] });
  assert.equal(r.landed, true);
  const e = r.log.entries[1];
  assert.equal(e.kind, taskLog.ENTRY_KINDS.SUPERSEDE);
  assert.equal(e.operator, "SYN");
  assert.equal(e.grain, "Figure");
  assert.equal(e.code, undefined);
  assert.deepEqual(e.patch.ops, [{ op: "SYN", find: "#4CAF50", add: "#2196F3" }]);
  const b = buildLog.foldBuild(r.log);
  assert.equal(b.version, 2);
  assert.equal(b.code, '<button style="background:#2196F3;font-size:12px">go</button>');
  // The seg the panel renders carries the compiled code too.
  assert.equal(b.seg.code, b.code);
  assert.equal(b.patchGap, null);
});

test("a patch that does not apply never lands — the refusal is a typed gap, not a silent no-op", () => {
  const log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "widget" });
  const r = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: "#FF0000", add: "#2196F3" }] });
  assert.equal(r.landed, false);
  assert.equal(r.gap.kind, "unlocated");
  assert.equal(r.log, log);
  // A patch compiling to the identical projection is churn, refused as ever.
  const churn = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: "#4CAF50", add: "#4CAF50" }] });
  assert.equal(churn.landed, false);
  assert.equal(churn.churn, true);
});

test("patches stack: every cursor position folds back byte-identically, exportAt included", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "widget" });
  log = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: "#4CAF50", add: "#2196F3" }] }).log;
  log = buildLog.reviseBuild(log, { code: buildLog.foldBuild(log).code + "<!-- edited -->", reason: "edit" });
  log = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: "12px", add: "18px" }] }).log;
  const states = log.entries.map((e) => buildLog.foldBuild(log, e.seq).code);
  assert.equal(states[0], widgetSeg.code);
  assert.equal(states[1], widgetSeg.code.replace("#4CAF50", "#2196F3"));
  assert.equal(states[2], states[1] + "<!-- edited -->");
  assert.equal(states[3], states[2].replace("12px", "18px"));
  // The full-edit base between two patches is what the second patch applied to.
  assert.equal(buildLog.exportAt(log, 3).text, states[3]);
  assert.equal(buildLog.foldBuild(log).version, 4);
});

test("a patched thread never runs the algebra backward — the engine's own checker stays silent", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "widget" });
  log = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: "go", add: "run" }] }).log;
  log = buildLog.reviseBuild(log, { code: buildLog.foldBuild(log).code + " ", reason: "edit" });
  log = buildLog.patchBuild(log, { ops: [{ op: "SEG", find: "font-size:12px" }] }).log;
  log = buildLog.rezeroBuild(log, {
    code: "<p>fresh</p>",
    seg: { ...widgetSeg, code: "<p>fresh</p>" },
    trigger: "I don't like it",
    patch: { ops: [{ op: "SYN", find: "x", add: "y" }] },
  });
  log = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: "fresh", add: "fresher" }] }).log;
  assert.deepEqual(checkCubeProgression(log), []);
  assert.equal(buildLog.foldBuild(log).code, "<p>fresher</p>");
  assert.equal(buildLog.foldBuild(log).ground, 2);
});

test("a patch log rebuilds from its serialized entries alone, byte-identical at every cursor", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "widget" });
  log = buildLog.patchBuild(log, { ops: [{ op: "INS", find: ">go<", add: "!" }] }).log;
  log = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: "background", add: "color" }] }).log;
  const replayed = buildLog.replayEntries(JSON.parse(JSON.stringify(log.entries)));
  for (const e of log.entries) {
    assert.equal(buildLog.foldBuild(replayed, e.seq).code, buildLog.foldBuild(log, e.seq).code);
  }
});

test("the rezero seed stands alone: full code on the new ground's PROPOSE, the delta kept as provenance", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "widget" });
  const patched = widgetSeg.code.replace("#4CAF50", "#2196F3");
  log = buildLog.rezeroBuild(log, {
    code: patched,
    seg: { ...widgetSeg, code: patched },
    trigger: "I don't like the colors",
    patch: { ops: [{ op: "SYN", find: "#4CAF50", add: "#2196F3" }] },
  });
  const birth = log.entries[log.entries.length - 1];
  assert.equal(birth.kind, taskLog.ENTRY_KINDS.PROPOSE);
  assert.equal(birth.code, patched);
  assert.equal(birth.patch, undefined);
  assert.deepEqual(birth.patchProvenance.ops[0], { op: "SYN", find: "#4CAF50", add: "#2196F3" });
});

test("a corrupted store degrades honestly: a stored non-applying patch is a typed gap on the fold, never silent", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "widget" });
  log = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: "go", add: "run" }] }).log;
  // Corrupt the serialized rows the way a store would: the patch now names
  // bytes the base never held.
  const rows = JSON.parse(JSON.stringify(log.entries));
  rows[1].patch.ops[0].find = "never-there";
  const replayed = buildLog.replayEntries(rows);
  const b = buildLog.foldBuild(replayed);
  assert.equal(b.code, widgetSeg.code);
  assert.equal(b.patchGap.kind, "unlocated");
  assert.equal(b.patchGap.seq, rows[1].seq);
});

test("timeline names a patch row mechanically: version, op count, and the ops themselves", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "widget" });
  log = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: "go", add: "run" }, { op: "SEG", find: " style=\"background:#4CAF50;font-size:12px\"" }] }).log;
  const row = buildLog.timeline(log)[1];
  assert.equal(row.label, "v2 · patch · 2 ops (SYN SEG)");
});

// ——— The act is derived from the bytes, never taken from the model's label
// (L5, measured 2026-08-17: both small models said "INS" while supplying a
// replacement — applied at their word, the widget grew a second button).

import { deriveOp, readOps } from "./build-log.js";

test("deriveOp reads the act off the delta's own shape: empty add is SEG, containing add is INS, otherwise SYN", () => {
  assert.equal(deriveOp({ find: "aa", add: "" }), "SEG");
  assert.equal(deriveOp({ find: "aa", add: "aa bb" }), "INS");
  assert.equal(deriveOp({ find: "aa", add: "bb" }), "SYN");
  // A self-identical add is not an admission of anything new.
  assert.equal(deriveOp({ find: "aa", add: "aa" }), "SYN");
});

test("readOps normalizes an INS to only the bytes it admits — the anchor is never carried twice", () => {
  const ops = readOps([{ find: "<b>x</b>", add: "<b>x</b><i>y</i>" }]);
  assert.deepEqual(ops, [{ op: "INS", find: "<b>x</b>", add: "<i>y</i>" }]);
  // Bytes on BOTH sides of the anchor are a recompilation, typed SYN.
  const both = readOps([{ find: "x", add: "axb" }]);
  assert.equal(both[0].op, "SYN");
  assert.equal(both[0].add, "axb");
  // The two forms compile the same whole.
  assert.equal(applyOps("<b>x</b>", ops).code, "<b>x</b><i>y</i>");
});

test("every: an edit well-defined on all occurrences applies everywhere, counted — strict stays the default wall", () => {
  const code = 'a style="s:12px" b style="s:12px" c';
  const ops = [{ op: "SYN", find: 's:12px', add: "s:20px" }];
  assert.equal(applyOps(code, ops).gap.kind, "ambiguous");
  const r = applyOps(code, ops, { every: true });
  assert.equal(r.ok, true);
  assert.equal(r.code, 'a style="s:20px" b style="s:20px" c');
  assert.deepEqual(r.touched, [2]);
});

test("an every-patch rides the entry with its counts and the cursor recompiles exactly that act", () => {
  let log = buildLog.proposeBuild({
    n: 1, turn: 1, caption: "w",
    seg: { type: "code", lang: "html", code: '<i style="x:1">a</i><i style="x:1">b</i>' },
  });
  const r = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: 'style="x:1"', add: 'style="x:2"' }], every: true });
  assert.equal(r.landed, true);
  const e = r.log.entries[1];
  assert.equal(e.patch.every, true);
  assert.deepEqual(e.patch.touched, [2]);
  assert.equal(buildLog.foldBuild(r.log).code, '<i style="x:2">a</i><i style="x:2">b</i>');
  const replayed = buildLog.replayEntries(JSON.parse(JSON.stringify(r.log.entries)));
  assert.equal(buildLog.foldBuild(replayed).code, buildLog.foldBuild(r.log).code);
});

// ——— The remaining operators join the log: NUL asks, SIG scouts, DEF
// refusals, EVA witnesses — each its own micro-thread (the REC precedent),
// none touching the projection, all pinned against the engine's checker.

import { witnessCode, witnessHtml, witnessRegressed, scriptBodies } from "./witness.js";
import { scoutSpan, literalSwap } from "./widget.js";
import { INFLECTIONAL_SUFFIXES } from "../adapters/text/priors.js";

test("the ask is NUL · Ground, its own thread, and a re-zero lands the amended ask beside its rebirth", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "w", instruction: "make me a counter" });
  assert.equal(log.entries[0].operator, "NUL");
  assert.equal(log.entries[0].grain, "Ground");
  assert.equal(log.entries[0].task_id, "b1.ask.1");
  log = buildLog.rezeroBuild(log, { code: "<p>x</p>", seg: { ...widgetSeg, code: "<p>x</p>" }, trigger: "I don't like the colors" });
  const asks = log.entries.filter((e) => e.operator === "NUL");
  assert.equal(asks.length, 2);
  assert.equal(asks[1].ask, "I don't like the colors");
  assert.equal(asks[1].ground, 2);
  assert.deepEqual(checkCubeProgression(log), []);
  // The projection never sees an ask.
  assert.equal(buildLog.foldBuild(log).code, "<p>x</p>");
});

test("a re-zero's matchedOn rides the REC entry as disclosed evidence, never silently", () => {
  // The router's routing decision (widget.js) is measured, not asked for —
  // but a decision with nothing on the record showing what it matched on
  // is exactly as opaque as a model's unchecked self-report. matchedOn is
  // payload (P3: unrecognized keys ride the fold), named so a reader can
  // see WHY a build was re-zeroed instead of re-deriving it from bytes.
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "w" });
  log = buildLog.rezeroBuild(log, {
    code: "<p>x</p>",
    seg: { ...widgetSeg, code: "<p>x</p>" },
    trigger: "the row is broken",
    tell: "resolved",
    matchedOn: ["row"],
  });
  const rec = log.entries.find((e) => e.operator === "REC");
  assert.deepEqual(rec.matchedOn, ["row"]);

  // A tell with nothing to disclose (or matchedOn simply not supplied)
  // never fabricates an empty array pretending to be evidence.
  let log2 = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "w" });
  log2 = buildLog.rezeroBuild(log2, { code: "<p>y</p>", seg: { ...widgetSeg, code: "<p>y</p>" }, trigger: "build 1 is broken", tell: "named" });
  assert.equal(log2.entries.find((e) => e.operator === "REC").matchedOn, undefined);
});

test("a refused patch lands DEF · Figure with the gap and the ops — evidence, not a vanished return value", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "w" });
  const ops = [{ op: "SYN", find: "#FF0000", add: "#2196F3" }];
  const r = buildLog.patchBuild(log, { ops });
  assert.equal(r.landed, false);
  log = buildLog.refuseBuild(log, { ops, gap: r.gap });
  const def = log.entries[log.entries.length - 1];
  assert.equal(def.operator, "DEF");
  assert.equal(def.kind, taskLog.ENTRY_KINDS.EVIDENCE);
  assert.equal(def.refusal.gap.kind, "unlocated");
  assert.deepEqual(def.refusal.ops, ops);
  assert.equal(def.task_id, "b1.refuse.1");
  assert.equal(buildLog.foldBuild(log).version, 1);
  assert.deepEqual(checkCubeProgression(log), []);
  assert.match(buildLog.timeline(log)[1].label, /^refused · unlocated/);
});

test("a witness lands EVA · Figure naming the version it speaks of, and the checker stays silent", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "w" });
  log = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: "go", add: "run" }] }).log;
  const w = witnessCode("html", buildLog.foldBuild(log).code);
  log = buildLog.attachWitness(log, { witness: w });
  const eva = log.entries[log.entries.length - 1];
  assert.equal(eva.operator, "EVA");
  assert.equal(eva.of, "b1.v2");
  assert.equal(eva.witness.ok, true);
  assert.deepEqual(checkCubeProgression(log), []);
  assert.equal(buildLog.timeline(log)[2].label, "witness · clean");
});

test("witnessHtml catches the measured clobber: a script addressing an id no element declares", () => {
  // The live qwen2.5-coder case: SYN "inc" → "style='background:blue'"
  // replaced the id in markup AND the getElementById in script.
  const broken = `<button style='background:blue'>+</button><script>document.getElementById('inc').onclick = () => {};</script>`;
  const w = witnessHtml(broken);
  assert.equal(w.ok, false);
  assert.deepEqual(w.findings.map((f) => f.kind), ["dangling-id"]);
  assert.equal(w.findings[0].id, "inc");
  // The healthy original is clean.
  const fine = `<button id="inc">+</button><script>document.getElementById('inc').onclick = () => {};</script>`;
  assert.equal(witnessHtml(fine).ok, true);
});

test("witnessRegressed: a repair that introduces a defect the ground did not have is a regression — the metacognitive seat", () => {
  // The measured degradation this gates (2026-08-17, gemma2:2b, live e2e on
  // a canvas drawing app): three complaints in a row each landed a
  // witnessed-dirty patch — the clear button lost its listener, then its
  // id, then its identifying tag entirely ("<>Clear</>") — because the
  // witness ran only after commit and nothing ever compared attempt N
  // against attempt N-1. Every row here is a case from that session.
  const clean = { ok: true, lang: "html", findings: [] };
  const syntaxBreak = { ok: false, lang: "html", findings: [{ kind: "script-syntax", detail: "Unexpected token '}'" }] };
  const danglingClear = { ok: false, lang: "html", findings: [{ kind: "dangling-id", detail: `script addresses id "clearButton" but no element declares it`, id: "clearButton" }] };

  // A first landing has nothing to regress against.
  assert.equal(witnessRegressed(null, syntaxBreak), false);
  // Clean ground, dirty candidate: the canonical regression.
  assert.equal(witnessRegressed(clean, syntaxBreak), true);
  // The same defect persisting is NOT a regression — the ground already
  // had that answer, and refusing here would wall off every repair that
  // fixes one thing while the pre-existing defect stays.
  assert.equal(witnessRegressed(syntaxBreak, syntaxBreak), false);
  // A DIFFERENT defect appearing is a regression even at the same count —
  // identity, never arithmetic (the second live patch: the syntax break
  // "went away" because the button it addressed went away with it).
  assert.equal(witnessRegressed(syntaxBreak, danglingClear), true);
  // Improvement is never a regression.
  assert.equal(witnessRegressed(danglingClear, clean), false);
  // A gap is not a ground: unexamined on either side compares nothing.
  assert.equal(witnessRegressed({ ok: null, unexamined: true, findings: [] }, danglingClear), false);
  assert.equal(witnessRegressed(clean, { ok: null, unexamined: true, findings: [] }), false);
});

test("witnessRegressed: clearing one defect while keeping another is progress, not regression", () => {
  const two = { ok: false, lang: "html", findings: [
    { kind: "script-syntax", detail: "Unexpected token '}'" },
    { kind: "dangling-id", detail: `script addresses id "inc" but no element declares it`, id: "inc" },
  ] };
  const one = { ok: false, lang: "html", findings: [
    { kind: "dangling-id", detail: `script addresses id "inc" but no element declares it`, id: "inc" },
  ] };
  assert.equal(witnessRegressed(two, one), false);
  // And the reverse direction — regaining the cleared defect — regresses.
  assert.equal(witnessRegressed(one, two), true);
});

test("witnessCode: a script that does not parse is a finding; material it cannot judge is unexamined, never clean", () => {
  const w = witnessCode("html", `<p>x</p><script>let a = ;</script>`);
  assert.equal(w.ok, false);
  assert.equal(w.findings[0].kind, "script-syntax");
  const py = witnessCode("python", "print(1)");
  assert.equal(py.ok, null);
  assert.equal(py.unexamined, true);
  // The quote-aware tag walk: an attribute value legally contains ">".
  assert.equal(scriptBodies(`<script data-x="a>b">let q = 1;</script>`)[0], "let q = 1;");
});

test("scoutSpan resolves the operator's own term to a byte-span through the fold, or null — never a guess", () => {
  const code = `<div id="top">hi</div>\n<button id="inc">+</button>\n<p>done</p>`;
  const s = scoutSpan("I don't like the button", code, INFLECTIONAL_SUFFIXES);
  assert.equal(s.term, "button");
  const [a, b] = s.span;
  assert.equal(code.slice(a, b), `<button id="inc">+</button>`);
  // No exact-fold match → null (morphology stays unfolded — the stated limit).
  assert.equal(scoutSpan("make the header taller", code, INFLECTIONAL_SUFFIXES), null);
  // Diacritics fold with offsets that survive decomposed input (P5.2).
  const deco = `x\n<p class="hélene">y</p>\nz`;
  const d = scoutSpan("fix helene please", deco, INFLECTIONAL_SUFFIXES);
  assert.equal(deco.slice(d.span[0], d.span[1]), `<p class="hélene">y</p>`);
});

test("scoutSpan shares the router's inflectional fold (P11) and no longer scopes to the artifact's own <title> by accident", () => {
  // Measured live (gemma2:2b, e2e scenario 2, 2026-08-17): this exact widget,
  // this exact complaint. Before this fix, "buttons" had no exact match in
  // the code (only the singular "button" appears, in the tag names), so the
  // scout fell back to "widget" -- a single accidental hit inside the title
  // tag, which NAMES THE WHOLE ARTIFACT and nothing a visual complaint could
  // ever be about -- and the edit landed there instead of anywhere useful.
  //
  // DISCLOSED RESIDUE, not fixed here (see the referent-model note on
  // scoutSpan's own docstring): "counter" (2 non-title places: the CSS
  // selector and the div id) still out-selects "button" (4 places, the
  // complaint's actual referent) on raw rarity, so the arena still does not
  // reach the buttons. This test pins what IS fixed -- the scout no longer
  // confidently commits to the artifact's own inert name -- without
  // pretending the deeper fix (an entity model where "buttons" resolves to
  // the two button elements as referents, not to a rarity contest) is done.
  const code = [
    "<!DOCTYPE html>", "<html>", "<head>",
    "  <title>Counter Widget</title>",
    "  <style>", "    #counter { font-size: 24px; }", "  </style>",
    "</head>", "<body>",
    '  <div id="counter">0</div>',
    '  <button id="add">+</button>',
    '  <button id="sub">-</button>',
    "</body>", "</html>",
  ].join("\n");
  const complaint = "I don't like the colors on the counter widget, make the buttons bigger with some color.";
  const s = scoutSpan(complaint, code, INFLECTIONAL_SUFFIXES);
  assert.notEqual(s.term, "widget");
  assert.ok(!code.slice(s.span[0], s.span[1]).includes("<title>"));
});

test("scoutSpan: a complaint sharing ONLY an inflected form with the code now resolves at all, instead of falling through to null", () => {
  // The clean, unambiguous win from the P11 fix, isolated from the "widget"
  // residue above: when the resolved term is the ONLY candidate, it decides
  // the arena outright, exactly as an exact match already did.
  const code = `<div id="top">hi</div>\n<button id="inc">+</button>\n<p>done</p>`;
  const s = scoutSpan("please fix these buttons", code, INFLECTIONAL_SUFFIXES);
  assert.equal(s.term, "button");
  assert.equal(code.slice(s.span[0], s.span[1]), `<button id="inc">+</button>`);
});

test("scoutSpan: an inflectional match still loses to a more selective EXACT match -- resolution is a fallback, not a preference", () => {
  // "reset" appears once (exact); "button" appears on every row. Even though
  // "buttons" in the message could resolve to "button", "reset" is both an
  // exact hit and more selective, so it still wins.
  const code2 = `<button id="inc" style="s:1">+</button>\n<button id="reset" style="s:1">reset</button>`;
  const s2 = scoutSpan("make the reset buttons bigger", code2, INFLECTIONAL_SUFFIXES);
  assert.equal(s2.term, "reset");
});

test("scoutSpan: suffixes must come from the engine's prior register", () => {
  assert.throws(() => scoutSpan("x", "y", null), TypeError);
  assert.throws(() => scoutSpan("x", "y", new Set()), TypeError);
});

test("literalSwap: an ask naming both values is an edit computed from the operator's own words — no model call", () => {
  // The measured case, verbatim (2026-08-17, live e2e): asked exactly this,
  // gemma2:2b rewrote an unrelated event listener and broke the script.
  // The instruction names 30 and 60; the code holds 30 and lacks 60; the
  // direction is decided by occurrence, never by the words "from"/"to".
  const code = `<input type="color" id="colorPicker" value="#000000">\n<input type="range" id="brushSize" min="1" max="30" value="10">\n<button id="clearButton">Clear</button>`;
  const r = literalSwap("change the brush size slider's max from 30 to 60", code);
  assert.ok(r);
  assert.equal(r.from, "30");
  assert.equal(r.to, "60");
  assert.equal(r.ops.length, 1);
  assert.equal(r.ops[0].op, "SYN");
  assert.equal(r.ops[0].find, `<input type="range" id="brushSize" min="1" max="30" value="10">`);
  assert.equal(r.ops[0].add, `<input type="range" id="brushSize" min="1" max="30" value="10">`.replace('max="30"', 'max="60"'));
});

test("literalSwap: direction is occurrence, not word order — '60 instead of 30' swaps the same way", () => {
  const code = `speed = 30;`;
  const r = literalSwap("make it 60 instead of 30", code);
  assert.ok(r);
  assert.equal(r.from, "30");
  assert.equal(r.to, "60");
  assert.equal(r.ops[0].add, "speed = 60;");
});

test("literalSwap: hex colors are literals — the counter-widget recolour is mechanical", () => {
  const code = `button { background: #4CAF50; }`;
  const r = literalSwap("change #4CAF50 to #2196F3", code);
  assert.ok(r);
  assert.equal(r.ops[0].add, "button { background: #2196F3; }");
});

test("literalSwap: every ambiguous shape descends to the model, never to a guess", () => {
  // Both values present in the code — which is old and which is new is not
  // decidable by occurrence.
  assert.equal(literalSwap("change 30 to 60", "a = 30; b = 60;"), null);
  // Neither present.
  assert.equal(literalSwap("change 30 to 60", "a = 10;"), null);
  // One literal only — the other end of the change was never named.
  assert.equal(literalSwap("set width to 600", "width = 300;"), null);
  // Three literals — not the two-ended shape.
  assert.equal(literalSwap("change 30 to 60 or maybe 90", "a = 30;"), null);
  // The present value occurs twice — ambiguous placement.
  assert.equal(literalSwap("change 30 to 60", "a = 30; b = 30;"), null);
  // No literals at all — the ordinary complaint stays the model's.
  assert.equal(literalSwap("make the buttons bigger with some color", "a = 30;"), null);
});

test("literalSwap: word boundaries hold — 30 never matches inside 300", () => {
  const code = `a = 300;\nb = 30;`;
  const r = literalSwap("change 30 to 60", code);
  assert.ok(r);
  assert.equal(r.ops[0].find, "b = 30;");
  assert.equal(r.ops[0].add, "b = 60;");
});

test("literalSwap: an arena that starves the swap yields null there — the caller's global retry is what rescues it", () => {
  // Measured live (2026-08-17): "change the brush size slider's max from 30
  // to 60" — the scout resolved the instruction's VERB "change" against the
  // code's addEventListener('change') line, so the arena held neither 30
  // nor 60 and the swap starved inside it, while the whole projection held
  // exactly one 30. (The same mis-scope is why a model handed that arena
  // rewrote the wrong listener.) The swap stays arena-honest — null inside
  // a starving arena — and the caller retries globally, where the walls
  // still hold.
  const code = `colorPicker.addEventListener('change', () => {\n  color = colorPicker.value;\n});\n<input type="range" max="30">`;
  const changeLine = [0, code.indexOf("\n")];
  assert.equal(literalSwap("change the max from 30 to 60", code, { within: changeLine }), null);
  const global = literalSwap("change the max from 30 to 60", code);
  assert.ok(global);
  assert.equal(global.ops[0].add, `<input type="range" max="60">`);
});

test("literalSwap: the scout's arena scopes the swap the way it scopes a patch", () => {
  // "30" appears twice in the file but once inside the arena — the swap is
  // unambiguous within what attention already scoped.
  const code = `retries = 30;\n<input max="30">`;
  const within = [code.indexOf("<input"), code.length];
  const r = literalSwap("change 30 to 60", code, { within });
  assert.ok(r);
  assert.equal(r.ops[0].find, `<input max="30">`);
  assert.equal(r.ops[0].add, `<input max="60">`);
});

test("a patch applies within the scouted span: unique inside it even when the file holds two, and replay recompiles the same arena", () => {
  const code = `<button id="inc" style="s:1">+</button>\n<button id="reset" style="s:1">reset</button>`;
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "html", code }, caption: "w" });
  // "reset" (one place) decides the arena, never "button" (every row).
  const s = scoutSpan("make the reset button bigger", code, INFLECTIONAL_SUFFIXES);
  assert.equal(s.term, "reset");
  const r = buildLog.patchBuild(log, { ops: [{ op: "SYN", find: 'style="s:1"', add: 'style="s:2"' }], within: s.span });
  assert.equal(r.landed, true, JSON.stringify(r.gap ?? null));
  const b = buildLog.foldBuild(r.log);
  assert.equal(b.code, `<button id="inc" style="s:1">+</button>\n<button id="reset" style="s:2">reset</button>`);
  const replayed = buildLog.replayEntries(JSON.parse(JSON.stringify(r.log.entries)));
  assert.equal(buildLog.foldBuild(replayed).code, b.code);
  // Without the span the same op is ambiguous — the scout is what made it land.
  assert.equal(buildLog.applyOps(code, [{ op: "SYN", find: 'style="s:1"', add: 'style="s:2"' }]).gap.kind, "ambiguous");
});

test("a scout lands SIG · Figure with the term and the span it resolved", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: widgetSeg, caption: "w" });
  log = buildLog.scoutBuild(log, { term: "button", span: [0, 12] });
  const sig = log.entries[log.entries.length - 1];
  assert.equal(sig.operator, "SIG");
  assert.deepEqual(sig.scout, { term: "button", span: [0, 12] });
  assert.equal(sig.task_id, "b1.scout.1");
  assert.deepEqual(checkCubeProgression(log), []);
});

test("the birth is witnessed, so turn-1 corruption is a regression, not a blind spot — the two reconstructed cases", () => {
  // witnessRegressed's structural blind spot (2026-08-18 diagnosis): with
  // no EVA until the first revision, `prev` was null on turn 1 and the gate
  // waved everything through. The discipline that closes it — an EVA on the
  // PROPOSE, the way app.js's publishBuild now lands one — is reconstructed
  // here over the two live turn-1 corruptions, so the module-level claim
  // ("a birth EVA gives the very first landing a real prev") is pinned
  // where the organs live.

  // CASE 1 — gemma2:2b × tasklist: the edit deleted <input id="what">
  // outright; locally well-formed, remotely broken (getElementById('what')
  // now points at nothing). Turn 1, so the old gate never looked.
  const tasklist = `<input id="what"><button id="add">add</button><script>document.getElementById('what').value; document.getElementById('add').onclick = () => {};</script>`;
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: { type: "code", lang: "html", code: tasklist }, caption: "tasklist" });
  const birth = witnessCode("html", buildLog.foldBuild(log).code);
  assert.equal(birth.ok, true);
  log = buildLog.attachWitness(log, { witness: birth });

  const deleted = tasklist.replace(`<input id="what">`, "");
  const candidate1 = witnessCode("html", deleted);
  assert.equal(witnessRegressed(birth, candidate1), true, "the deletion is refused on turn 1, against the birth's own EVA");
  assert.equal(witnessRegressed(null, candidate1), false, "without the birth EVA the same corruption walks straight through — the blind spot this closes");

  // CASE 2 — qwen2.5-coder:7b × spreadsheet: the every:true rescue spliced
  // a replacement at both occurrences of a non-unique find, leaving each
  // original loop body dangling outside any function — the unbalanced-brace
  // break, caught as script-syntax against a clean birth.
  const brokenScript = `<div class="cell"></div><script>document.querySelectorAll('.cell').forEach(function(c) { c.textContent = 1; });\n});</script>`;
  const candidate2 = witnessCode("html", brokenScript);
  assert.equal(candidate2.ok, false);
  assert.equal(candidate2.findings[0].kind, "script-syntax");
  assert.equal(witnessRegressed(birth, candidate2), true);

  // And the kept reading, stated as a test rather than implied: a defect
  // the birth itself carries is VISIBLE (named on the birth EVA) but never
  // blocks a later landing that merely fails to fix it — persistence is
  // not entry, and repair stays the next iteration's job.
  const bornBroken = witnessCode("html", deleted);
  assert.equal(bornBroken.ok, false);
  assert.equal(witnessRegressed(bornBroken, bornBroken), false);
});
