// native/tests/reach-revise.test.js — the record-and-revise loop's instruments, enforced.
//
// eval/reach/revise.mjs lands a writer's edit as recorded, flags it with a check derived from
// the artifact alone, and gives the writer one repair turn shown what the check found. This file
// tests the parts that decide what that experiment can say — which landings enter the loop, what
// each condition shows, what the repair writer can change, where the head stands — with planted
// cases built to fail. It asserts nothing about what a model does; that is a live result in
// eval/raw/, re-summarised at the bottom so the committed results cannot drift from it.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TASKS } from "../eval/reach/tasks.mjs";
import { closeBrowser, htmlAvailable } from "../eval/reach/check.mjs";
import * as B from "../eval/reach/battery.mjs";
import * as R from "../eval/reach/revise.mjs";
import * as C from "../eval/reach/counterfactual.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const htmlOk = await htmlAvailable();
after(async () => { await closeBrowser(); });
const byId = (id) => TASKS.find((t) => t.id === id);
const answer = (edits) => async () => ({ text: JSON.stringify({ edits, risk: "none" }), ms: 1, tokens: { prompt: 1, generated: 1 } });

/** A recorded battery run of a region-only writer, as the raw file would hold it. */
const landing = (task, arm, rep, edits = task.regionOnly, over = {}) => {
  const applied = B.applyEditsToView(task.artifact, B.segmentsFor(task, arm), edits);
  assert.ok(applied.ok, `${task.id}: ${applied.reason}`);
  return { key: `${task.id}|${arm}|${rep}`, task: task.id, family: task.family, kind: task.kind, arm, rep, parsed: { edits, risk: "none" }, applied: { ok: true }, success: false, harm: true, flagged: false, ...over };
};
const termA = () => { const t = byId("term-a"); const { selected } = R.selectLandings([landing(t, "bare", 0)]); assert.equal(selected.length, 1); return { t, item: selected[0] }; };

test("a landed region-only edit: the region's new extent is found, and the lines that still hold the changed-away name are the dependents", () => {
  const t = byId("term-a");
  const a = B.afterOf(landing(t, "bare", 0));
  const reg = R.landedRegion(t, a.text);
  assert.equal(a.text.slice(reg.start, reg.end), '1. Definitions. "Vendor" means the party providing the Services.');
  const names = B.partialRenames(t.artifact, a.text);
  assert.deepEqual(names, ["supplier"]);
  const lines = R.danglingLines(t, a.text, names);
  assert.deepEqual(lines.map((l) => l.line), [2, 3, 4]);
  for (const d of t.dependents) assert.ok(lines.some((l) => l.text.includes(d)), `the dependent "${d}" is among the lines the check points at`);
  // the extent is only defined for a writer that could change nothing but the region
  assert.equal(R.landedRegion(t, a.text.replace("Ohio", "Texas")), null, "a landing that changed text outside the region has no region extent");
});

test("the input is the flagged landings of region-only writers on coupled tasks, capped per task, and the same whatever order the records arrive in", () => {
  const tA = byId("term-a");
  const tB = byId("term-b");
  const sig = byId("py-sig-a");
  const ctl = byId("term-control");
  const recs = [];
  for (let i = 0; i < 8; i += 1) recs.push(landing(tA, "bare", i), landing(tA, "stance", i), landing(tB, "placebo", i));
  recs.push(landing(tA, "reach", 0)); // saw more than its region: not a source
  recs.push(landing(tA, "decoy", 0)); // the decoy arm's writer could have landed edits outside the region: not a source
  recs.push(landing(sig, "bare", 0)); // a signature change keeps every name: the derived check does not flag it, so it never enters the loop
  recs.push(landing(ctl, "bare", 0)); // an uncoupled control
  recs.push({ ...landing(tA, "bare", 99), error: "model call failed: x" });
  recs.push({ key: "term-a|bare|98", task: "term-a", kind: "coupled", arm: "bare", parsed: null });
  const s1 = R.selectLandings(recs);
  const count = (id) => s1.selected.filter((x) => x.task.id === id).length;
  assert.deepEqual([count("term-a"), count("term-b"), s1.selected.length], [R.PER_TASK, R.PER_TASK, 2 * R.PER_TASK]);
  assert.deepEqual([s1.flagged, s1.eligible, s1.noOutside, s1.capped], [24, 24, 0, 24 - 2 * R.PER_TASK]);
  assert.ok(s1.selected.every((x) => R.SOURCE_ARMS.includes(x.source.arm)), "only region-only arms are sources");
  assert.ok(new Set(s1.selected.filter((x) => x.task.id === "term-a").map((x) => x.source.arm)).size >= 1);
  const s2 = R.selectLandings([...recs].reverse());
  assert.deepEqual(s2.selected.map((x) => x.source.key), s1.selected.map((x) => x.source.key), "the selection is a function of the records, not of their order");
  const s3 = R.selectLandings(recs, { perTask: 1 });
  assert.equal(s3.selected.length, 2);
});

test("a partial rename whose remaining mention sits inside the region has no line outside it to show", () => {
  const before = "gamma beta\nbeta x\nq\n";
  const after = "gamma delta\nbeta x\nq\n";
  assert.deepEqual(B.partialRenames(before, after), ["beta"], "one of two mentions changed: a partial rename");
  const task = { id: "t", artifact: before, region: "gamma beta\nbeta x", dependents: [] };
  assert.deepEqual(R.danglingLines(task, after, ["beta"]), [], "both mentions sit inside the region: such a landing is counted in the input table and not repaired");
});

test("the four conditions differ only in what the repair turn is shown, and nothing the builder writes is a caution", () => {
  const { t, item } = termA();
  const P = Object.fromEntries(R.CONDITIONS.map((c) => [c, R.repairPrompt(t, { landed: item.landed, edits: item.edits, names: item.names, condition: c, shown: R.shownFor(t, item, c) })]));
  const head = `Task: ${t.request}\n\n${B.HOW}\n\nThe change already made to the file, as recorded:\n- replaced "\\"Supplier\\" means" with "\\"Vendor\\" means"`;
  for (const c of R.CONDITIONS) assert.ok(P[c].startsWith(head), `${c}: the same task, the same edit contract, the same record of the change`);
  const region = '```\n1. Definitions. "Vendor" means the party providing the Services.\n```';
  for (const c of R.CONDITIONS) assert.ok(P[c].includes(`Text you may change:\n${region}`), `${c}: the region as it now stands`);
  const finding = "Names the change removed in some places and left in others: Supplier (4 before, 3 after).";
  assert.ok(P.derived.includes(finding) && !P.lines.includes("Names the change") && !P.decoy.includes("Names the change") && !P.again.includes("Names the change"), "only `derived` states the finding");
  const dangling = item.lines.map((l) => l.text);
  for (const l of dangling) { assert.ok(P.derived.includes(l) && P.lines.includes(l), `the dangling line is shown: ${l}`); assert.ok(!P.decoy.includes(l) && !P.again.includes(l)); }
  assert.ok(!P.again.includes(B.OTHER_LINES), "`again` shows the region and nothing else");
  assert.equal(P.lines.replace(finding, ""), P.lines, "lines: no sentence about the lines");
  assert.equal(P.derived.replace(`${finding}\n\n`, ""), P.lines, "derived is exactly lines plus the finding");
  // the control: lines that are none of the region, a dependent, or a line holding the flagged name; drawn at random, fixed by the run
  const decoy = R.shownFor(t, item, "decoy");
  assert.ok(decoy.length > 0 && decoy.length <= item.lines.length);
  for (const l of decoy) {
    assert.ok(!/supplier/i.test(l.text) && !t.dependents.some((d) => l.text.includes(d)), `decoy line "${l.text}" holds no flagged name and is no dependent`);
  }
  assert.deepEqual(R.shownFor(t, item, "decoy").map((l) => l.line), decoy.map((l) => l.line), "the decoy is deterministic for a run");
  // nothing the builder writes cautions, warns or advises (the change record quotes edits; the finding is counts)
  const authored = [finding, B.HOW, "The change already made to the file, as recorded:", `Task: ${t.request}`].join("\n");
  assert.ok(!/careful|caution|warn|danger|harm|break|broke|ensure|make sure|be sure|must not|forget|risk|should|don't|do not/i.test(authored), "no caution, no advice");
});

test("the repair writer edits only what it is shown: a find that occurs only in lines it was not shown is refused, and nothing is appended", async () => {
  const { t, item } = termA();
  const out = await R.repairOne(item, "again", { seed: 1, askFn: answer([{ find: "Supplier", replace: "Vendor" }]) });
  assert.equal(out.applied.ok, false, "the region no longer contains Supplier, and `again` shows nothing else");
  assert.deepEqual([out.repaired, out.success, out.harm, out.derivedClean], [false, false, true, false], "the flagged landing stands, unrepaired");
  assert.deepEqual(out.head, { changed: false, success: false, harm: false }, "the head stays at the original: nothing delivered, nothing broken");
  const dec = await R.repairOne(item, "decoy", { seed: 1, askFn: answer([{ find: "Supplier", replace: "Vendor" }]) });
  assert.equal(dec.applied.ok, false, "random lines that do not hold the name cannot be used to fix it");
  assert.equal(t.id, "term-a");
});

test("shown the lines that hold the name, a writer that completes the rename repairs the landing and the head moves", async () => {
  const { item } = termA();
  for (const c of ["lines", "derived"]) {
    const out = await R.repairOne(item, c, { seed: 1, askFn: answer([{ find: "Supplier", replace: "Vendor" }]) });
    assert.deepEqual([out.applied.ok, out.repaired, out.success, out.harm, out.derivedClean], [true, true, true, false, true], c);
    assert.deepEqual(out.head, { changed: true, success: true, harm: false }, `${c}: the repaired text passes the check and becomes the head`);
    assert.equal(out.touchedOutside, true, `${c}: the repair changed lines outside the region`);
    assert.equal(out.collateral, false);
  }
});

test("the landing rule: a repair that leaves a partial rename does not move the head, even though it changed a line", async () => {
  const { item } = termA();
  const out = await R.repairOne(item, "derived", { seed: 1, askFn: answer([{ find: "The Supplier is not liable", replace: "The Vendor is not liable" }]) });
  assert.equal(out.applied.ok, true);
  assert.deepEqual([out.repaired, out.success, out.harm, out.derivedClean], [true, false, true, false], "one of three lines fixed: still broken, still flagged");
  assert.deepEqual(out.head, { changed: false, success: false, harm: false }, "the contested entry stays contested: the head does not move to a text the check still flags");
});

test("a repair turn that damages a line that is neither the region nor a dependent is caught as collateral", async () => {
  const { item } = termA();
  // `decoy` shows the notice and law clauses; an edit to one of them is collateral by construction
  const shown = R.shownFor(byId("term-a"), item, "decoy");
  assert.ok(shown.some((l) => l.text.startsWith("5. Notices")));
  const out = await R.repairOne(item, "decoy", { seed: 1, askFn: answer([{ find: "Notices", replace: "Memos" }]) });
  assert.equal(out.applied.ok, true);
  assert.equal(out.collateral, true);
  assert.equal(out.success, false);
});

test("a repair that undoes the change is a withdrawal of the entry: nothing requested, nothing broken, the file as it was", async () => {
  const { item } = termA();
  const out = await R.repairOne(item, "decoy", { seed: 1, askFn: answer([{ find: "Vendor", replace: "Supplier" }]) });
  assert.deepEqual([out.applied.ok, out.reverted, out.success, out.harm, out.repaired], [true, true, false, false, true]);
  assert.deepEqual(out.head, { changed: false, success: false, harm: false }, "the head stays at the original, which is what the file now is");
});

test("the same repair answer under whole-identifier matching: `price` no longer matches inside `unit_price`, so a double rename becomes a repair", async () => {
  const t = byId("sql-col-b");
  const src = landing(t, "bare", 0);
  const { selected } = R.selectLandings([src]);
  assert.equal(selected.length, 1);
  const out = await R.repairOne(selected[0], "derived", { seed: 1, askFn: answer([{ find: "price", replace: "unit_price" }]) });
  assert.deepEqual([out.success, out.harm, out.head.harm], [false, true, true], "as the tool was: the region's `unit_price` became `unit_unit_price`, and the derived check cannot see it");
  const row = { key: `${src.key}|derived`, condition: "derived", task: t.id, sourceKey: src.key, shown: out.shown, parsed: out.parsed, success: out.success, harm: out.harm, head: out.head };
  const [asRun] = await R.repairUnder([row], [src]);
  assert.deepEqual([asRun.success, asRun.harm, asRun.head], [row.success, row.harm, row.head], "the control reproduces the recorded outcome");
  const [token] = await R.repairUnder([row], [src], C.applyEditsBoundary);
  assert.deepEqual([token.success, token.harm, token.head.success], [true, false, true], "with whole-identifier matching the same answer completes the rename");
});

test("a model error, an unparseable answer and an empty repair are recorded as what they are", async () => {
  const { item } = termA();
  const boom = await R.repairOne(item, "derived", { seed: 1, askFn: async () => { throw new Error("socket closed"); } });
  assert.match(boom.error, /model call failed: socket closed/);
  const junk = await R.repairOne(item, "derived", { seed: 1, askFn: async () => ({ text: "not json", ms: 1, tokens: {} }) });
  assert.deepEqual([junk.applied.ok, junk.applied.reason, junk.repaired, junk.harm], [false, "the response was not valid JSON", false, true]);
  const empty = await R.repairOne(item, "derived", { seed: 1, askFn: answer([]) });
  assert.deepEqual([empty.applied.ok, empty.applied.noop, empty.repaired, empty.head.changed], [true, true, false, false]);
});

test("the runner is resumable and append-only: a second run repeats nothing, and a torn last line costs one row", async () => {
  const { selected } = R.selectLandings([landing(byId("term-a"), "bare", 0), landing(byId("term-b"), "bare", 0)]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "revise-"));
  const file = path.join(dir, "r.jsonl");
  let calls = 0;
  const askFn = async (...a) => { calls += 1; return answer([{ find: "Supplier", replace: "Vendor" }])(...a); };
  const first = await R.runRevise({ file, selected, concurrency: 2, askFn, model: "stub" });
  assert.equal(first.planned, 8);
  assert.equal(calls, 8);
  const rows = B.readRecords(file);
  assert.equal(rows.length, 8);
  assert.deepEqual([...new Set(rows.map((r) => r.condition))].sort(), [...R.CONDITIONS].sort());
  assert.ok(rows.every((r) => r.key === `${r.sourceKey}|${r.condition}` && r.model === "stub" && r.prompt && r.raw !== undefined), "every prompt and every answer is kept");
  const second = await R.runRevise({ file, selected, concurrency: 2, askFn, model: "stub" });
  assert.deepEqual([second.planned, second.alreadyDone, calls], [0, 8, 8]);
  fs.appendFileSync(file, '{"key":"torn');
  const third = await R.runRevise({ file, selected, concurrency: 2, askFn, model: "stub" });
  assert.equal(third.planned, 0, "a torn line is not a finished row, and not a reason to repeat the others");
  fs.rmSync(dir, { recursive: true, force: true });
});

// ── the predictions, scored from the rows with the declared thresholds ───────
const row = (task, condition, over = {}) => ({ key: `${task}|${condition}|${Math.random()}`, task, kind: "coupled", family: "x", condition, success: false, harm: true, repaired: false, reverted: false, touchedOutside: false, collateral: false, applied: { ok: true }, head: { changed: false, success: false, harm: false }, ...over });
const world = (rules) => {
  const rows = [];
  for (let t = 0; t < 10; t += 1) for (let i = 0; i < 4; i += 1) for (const c of R.CONDITIONS) rows.push(row(`t${t}`, c, rules[c] ?? {}));
  return rows;
};
const FIXED = { success: true, harm: false, repaired: true, touchedOutside: true, head: { changed: true, success: true, harm: false } };
test("the predictions are scored mechanically: a world in which only the derived lines repair holds them all", () => {
  const rows = world({ lines: FIXED, derived: FIXED });
  const p = Object.fromEntries(R.reviseRows(rows).map((r) => [r.id, r]));
  for (const id of ["R1", "R2", "R3", "R4", "R5", "R6"]) assert.equal(p[id].verdict, "held", `${id}: ${p[id].measured}`);
  assert.ok(R.reviseRows([]).every((r) => r.verdict === "not measured"), "nothing measured, nothing declared held");
});
test("the predictions fail when the world says so: extra text that helps, a second turn that helps, a repair that breaks things, a sentence that matters", () => {
  assert.equal(Object.fromEntries(R.reviseRows(world({ lines: FIXED, derived: FIXED, decoy: FIXED })).map((r) => [r.id, r])).R3.verdict, "FAILED", "a decoy that repairs as well as the derived lines: the content is not what helps");
  assert.equal(Object.fromEntries(R.reviseRows(world({ lines: FIXED, derived: FIXED, again: FIXED })).map((r) => [r.id, r])).R2.verdict, "FAILED", "a second turn alone repairs");
  assert.equal(Object.fromEntries(R.reviseRows(world({ lines: FIXED, derived: { ...FIXED, collateral: true } })).map((r) => [r.id, r])).R6.verdict, "FAILED", "a repair that damages other lines");
  assert.equal(Object.fromEntries(R.reviseRows(world({ derived: FIXED })).map((r) => [r.id, r])).R4.verdict, "FAILED", "the finding works and the lines alone do not: the sentence matters");
  assert.equal(Object.fromEntries(R.reviseRows(world({ lines: FIXED, derived: { ...FIXED, success: false, harm: true, head: { changed: true, success: false, harm: true } } })).map((r) => [r.id, r])).R5.verdict, "FAILED", "harm that reaches the head");
  assert.equal(Object.fromEntries(R.reviseRows(world({})).map((r) => [r.id, r])).R1.verdict, "FAILED", "no repair anywhere: the loop repairs nothing");
});

test("end to end: flagged landings take the repaired subset's head rates, unflagged ones land as recorded, and the extrapolation is labelled", () => {
  const tA = byId("term-a");
  const sig = byId("py-sig-a");
  const source = [0, 1, 2, 3, 4].map((i) => landing(tA, "bare", i)).concat([landing(sig, "bare", 0)]);
  const rows = [];
  for (const c of R.CONDITIONS) {
    // four repaired landings of term-a: two end as a success at the head, two leave the entry contested
    for (let i = 0; i < 4; i += 1) rows.push(row("term-a", c, c === "derived" && i < 2 ? FIXED : c === "lines" ? { ...FIXED, head: { changed: true, success: true, harm: false } } : {}));
  }
  const e = R.endToEnd(rows, source);
  assert.deepEqual([e.tasks, e.n, e.asRecorded.success, e.asRecorded.harm], [2, 6, 0, 6]);
  assert.deepEqual([e.gate.success, e.gate.harm], [0, 1], "gate only: the five flagged entries are refused, the signature change is not seen and lands as it did");
  assert.equal(e.loops.derived.success, 2.5, "five flagged landings x the repaired subset's head success rate (2 of 4)");
  assert.equal(e.loops.derived.harm, 1, "the unflagged signature change still lands as harm");
  assert.equal(e.loops.lines.success, 5);
  const md = R.reviseMarkdown({ rows, source, selection: R.selectLandings(source), model: "stub" });
  assert.match(md, /End to end: of all the runs of region-only writers/);
  assert.match(md, /\*\*Extrapolated\.\*\*/);
  assert.match(md, /\| gate \+ one repair turn: derived \| 42% \| 17% \| 42% \|/);
});

test("the results document carries its own caveats, the landing-rule table, the task-level tests and the check's blind spot", () => {
  const rows = world({ lines: FIXED, derived: FIXED });
  const tA = byId("term-a");
  const source = [landing(tA, "bare", 0), landing(byId("py-sig-a"), "bare", 0)];
  const md = R.reviseMarkdown({ rows, source, selection: R.selectLandings(source), model: "stub", files: ["r.jsonl"], sourceFiles: ["b.jsonl"] });
  for (const s of ["Pre-registered predictions", "The landing rule: what the head holds", "gate only (refuse, never repair)", "Task-level: paired over tasks", "What the check could not see", "Diagnostics", "at most 5 per task"]) assert.ok(md.includes(s), s);
  assert.match(md, /py-sig-a \| 1 \| 0 \| 1/, "a signature change is harm the check does not see");
  assert.match(md, /term-a \| 1 \| 1 \| 0/, "a partial rename is harm the check does");
  const block = R.reviseBlock({ rows, source, model: "stub" });
  assert.match(block, /\| derived \| 100% \(40\/40\)/);
});

// ── the committed results cannot drift from the committed raw records ────────
test("the committed repair results are the re-summary of the committed raw records, one results file per model", { skip: htmlOk ? false : "chromium unavailable: the html tasks cannot be re-executed" }, async () => {
  const dir = path.join(HERE, "..", "eval", "raw");
  const raws = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => n.startsWith("reach-revise-") && n.endsWith(".jsonl")).sort() : [];
  if (!raws.length) return; // no live repair run committed yet
  for (const n of raws) {
    const slug = /^reach-revise-(.+)-\d{8}[^/]*\.jsonl$/.exec(n)?.[1];
    assert.ok(slug, `${n}: repair records are named reach-revise-<model>-<date>.jsonl`);
    const sources = fs.readdirSync(dir).filter((x) => x.startsWith(`reach-battery-${slug}-`) && x.endsWith(".jsonl")).sort();
    assert.ok(sources.length, `${n}: the battery records it repairs (reach-battery-${slug}-*.jsonl) are committed beside it`);
    const f = path.join(HERE, "..", "eval", "results", `reach-revise-${slug}-RESULTS.md`);
    assert.ok(fs.existsSync(f), `raw repair records for ${slug} are committed but their summary is not: node native/eval/reach/revise.mjs --summarize native/eval/raw/${n} --from ${sources.map((x) => `native/eval/raw/${x}`).join(",")} > native/eval/results/reach-revise-${slug}-RESULTS.md`);
    const rows = B.readRecords(path.join(dir, n));
    const source = sources.flatMap((x) => B.readRecords(path.join(dir, x)));
    assert.equal(new Set(rows.map((r) => r.model)).size, 1);
      const under = { control: await R.repairUnder(rows, source), token: await R.repairUnder(rows, source, C.applyEditsBoundary) };
    assert.ok(under.control.every((r) => r.success === r.recorded.success && r.harm === r.recorded.harm && r.head.changed === r.recorded.head.changed && r.head.success === r.recorded.head.success && r.head.harm === r.recorded.head.harm), "the control: the recorded repair answers re-applied as they were reproduce every recorded outcome");
    assert.equal(fs.readFileSync(f, "utf8"), R.reviseMarkdown({ rows, source, selection: R.selectLandings(source), under, model: rows[0].model, files: [path.join("native", "eval", "raw", n)], sourceFiles: sources.map((x) => path.join("native", "eval", "raw", x)) }));
  }
});
