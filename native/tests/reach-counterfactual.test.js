// native/tests/reach-counterfactual.test.js — the counterfactual driver's instruments, enforced.
//
// eval/reach/counterfactual.mjs re-applies the edits a writer actually produced under other tool
// semantics (whole-identifier finds, the closure of the derived reach, a landing gate) and scores
// each result by executing it. Its answer is an estimate of what RECORDED answers would have done,
// so its honesty rests on two things tested here: the control (re-applying the recorded edits
// as-run must reproduce the recorded outcome, row for row) and the variants themselves, against
// planted cases built to fail. The committed results are re-derived from the committed raw records.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TASKS } from "../eval/reach/tasks.mjs";
import { closeBrowser } from "../eval/reach/check.mjs";
import * as B from "../eval/reach/battery.mjs";
import * as C from "../eval/reach/counterfactual.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
after(async () => { await closeBrowser(); });
const byId = (id) => TASKS.find((t) => t.id === id);

/** A recorded run produced by the real scorer from a chosen answer — so `recorded` is what the battery would have written. */
async function recorded(taskId, arm, edits, rep = 0) {
  const task = byId(taskId);
  const rec = await B.runOne(task, arm, { seed: rep, askFn: async () => ({ text: JSON.stringify({ edits, risk: "none" }), ms: 1, tokens: {} }) });
  return { key: `${taskId}|${arm}|${rep}`, task: task.id, family: task.family, kind: task.kind, arm, rep, ...rec };
}

test("a find made of word characters matches only at identifier boundaries; a find that starts or ends on punctuation keeps that end free", () => {
  const text = "exports port and port2 and port";
  const seg = [{ start: 0, end: text.length }];
  const r = C.applyEditsBoundary(text, seg, [{ find: "port", replace: "endpoint" }]);
  assert.equal(r.text, "exports endpoint and port2 and endpoint", "`port` inside `exports` and `port2` is left alone");
  assert.equal(r.replaced, 2);
  assert.equal(B.applyEditsToView(text, seg, [{ find: "port", replace: "endpoint" }]).text, "exendpoints endpoint and endpoint2 and endpoint", "the tool as it was replaces inside words");
  const one = C.applyEditsBoundary("s is in this and s", [{ start: 0, end: 18 }], [{ find: "s", replace: "x" }]);
  assert.equal(one.text, "x is in this and x", "a single letter matches only where it stands alone");
  const punct = C.applyEditsBoundary('the "Supplier" means', [{ start: 0, end: 20 }], [{ find: '"Supplier" means', replace: '"Vendor" means' }]);
  assert.equal(punct.text, 'the "Vendor" means');
});

test("a missing or malformed find rejects the whole response, as the tool as it was did; an empty answer is a no-op", () => {
  const seg = [{ start: 0, end: 5 }];
  assert.equal(C.applyEditsBoundary("hello", seg, [{ find: "nope", replace: "x" }]).ok, false);
  assert.equal(C.applyEditsBoundary("hello", seg, [{ find: "", replace: "x" }]).ok, false);
  assert.equal(C.applyEditsBoundary("hello", seg, [{ find: "hello" }]).ok, false);
  assert.deepEqual(C.applyEditsBoundary("hello", seg, []), { ok: true, text: "hello", noop: true, replaced: 0 });
});

test("the control: re-applying a recorded answer as-run reproduces the recorded outcome", async () => {
  const cases = [
    ["term-a", "bare", byId("term-a").regionOnly],
    ["term-a", "whole", byId("term-a").gold],
    ["term-a", "reach", byId("term-a").gold],
    ["term-control", "bare", byId("term-control").gold],
    ["term-a", "bare", [{ find: "no such text", replace: "x" }]],
    ["term-a", "bare", []],
  ];
  const records = [];
  for (const [id, arm, edits] of cases) records.push(await recorded(id, arm, edits, records.length));
  const rows = await C.rescore(records, ["as-run"]);
  assert.equal(rows.length, records.length);
  for (const r of rows) assert.deepEqual([r.by["as-run"].success, r.by["as-run"].harm], [r.recorded.success, r.recorded.harm], `${r.key}: the counterfactual machinery reproduces the recorded outcome`);
});

test("closure applies the writer's edit to the region and the derived lines; gate refuses a partial rename; token spares words that merely contain the find", async () => {
  // a region-only writer that gives the bare name: as-run it renames one of four mentions
  const bare = await recorded("term-a", "bare", [{ find: "Supplier", replace: "Vendor" }]);
  assert.deepEqual([bare.success, bare.harm], [false, true]);
  const rows = await C.rescore([bare]);
  const by = rows[0].by;
  assert.deepEqual([by["as-run"].success, by["as-run"].harm], [false, true], "as-run: a partial rename breaks the dependents");
  assert.deepEqual([by.closure.success, by.closure.harm], [true, false], "closure: the same edit applied to the derived lines completes the rename");
  assert.deepEqual([by.gate.success, by.gate.harm, by.gate.refused], [false, false, true], "gate: the partial rename is not landed — nothing delivered, nothing broken");
  assert.deepEqual([by["closure+token+gate"].success, by["closure+token+gate"].refused], [true, false], "closure makes the rename complete, so the gate has nothing to refuse");
  // a writer that gives the region-only edit, with a find that occurs only in the region: closure cannot help it
  const only = await recorded("term-a", "bare", byId("term-a").regionOnly, 1);
  const by2 = (await C.rescore([only]))[0].by;
  assert.deepEqual([by2.closure.success, by2.closure.harm], [false, true], "the find is unique to the region: applying it to more lines changes nothing");
  assert.equal(by2.gate.refused, true);
});

test("a variant never lands an edit the tool as it was would have rejected, and the gate is a no-op on a clean edit", async () => {
  const miss = await recorded("term-a", "bare", [{ find: "no such text", replace: "x" }]);
  const clean = await recorded("term-control", "bare", byId("term-control").gold, 1);
  const rows = await C.rescore([miss, clean]);
  for (const v of C.VARIANTS) assert.equal(rows[0].by[v].success || rows[0].by[v].harm, false, `${v}: a find not in the text shown changes nothing`);
  for (const v of C.VARIANTS) assert.deepEqual([rows[1].by[v].success, rows[1].by[v].refused], [true, false], `${v}: an edit on an uncoupled control is landed and succeeds`);
});

test("the results document states the control, the estimate's limit, and what the gate cost", async () => {
  const records = [await recorded("term-a", "bare", [{ find: "Supplier", replace: "Vendor" }]), await recorded("term-a", "reach", byId("term-a").gold, 1), await recorded("term-control", "bare", byId("term-control").gold, 2)];
  const md = C.markdown(await C.rescore(records), { model: "stub", files: ["r.jsonl"] });
  for (const s of ["reproduces the recorded outcome in 3 of 3 runs", "estimates what these recorded answers would have done", "What the gate cost", "region only", "derived reach", "| as-run |", "| closure+token+gate |"]) assert.ok(md.includes(s), s);
});

// ── the committed results cannot drift from the committed raw records ────────
test("the committed counterfactual results are the re-derivation of the committed raw records, and the control holds on every row", async () => {
  const dir = path.join(HERE, "..", "eval", "raw");
  const raws = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => n.startsWith("reach-battery-") && n.endsWith(".jsonl")).sort() : [];
  if (!raws.length) return;
  const groups = new Map();
  for (const n of raws) { const slug = /^reach-battery-(.+)-\d{8}[^/]*\.jsonl$/.exec(n)?.[1]; if (slug) groups.set(slug, [...(groups.get(slug) ?? []), n]); }
  for (const [slug, names] of groups) {
    const f = path.join(HERE, "..", "eval", "results", `reach-counterfactual-${slug}-RESULTS.md`);
    if (!fs.existsSync(f)) continue; // a model's counterfactual is optional; only what is committed is held to the records
    const records = names.flatMap((n) => B.readRecords(path.join(dir, n)));
    const rows = await C.rescore(records);
    for (const r of rows) assert.deepEqual([r.by["as-run"].success, r.by["as-run"].harm], [r.recorded.success, r.recorded.harm], `${r.key}: the control`);
    assert.equal(fs.readFileSync(f, "utf8"), C.markdown(rows, { model: records[0]?.model ?? "?", files: names.map((n) => path.join("native", "eval", "raw", n)) }));
  }
});
