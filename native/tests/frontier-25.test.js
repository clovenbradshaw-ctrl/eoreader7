// frontier-25.test.js — the zero-call arm of the twenty-five "frontier" tasks,
// read on every suite run (the-fold P115 / S76).
//
// What is pinned: every task an organ CLAIMS outright is answered by that
// organ with no model (arithmetic.js's pure door, shaped questions and
// calendar; the product assay's reader; the void on the ledger), and every
// task an organ WITNESSES has a control that can fail — the reference
// answer passes the witness, the deliberately wrong one fails it (II.23).
// The python controls run through serve.mjs's recorded /api/run, booted as
// a child the way serve-run.test.mjs boots it; when it cannot boot on this
// checkout the two python controls skip TYPED and the test says so — a
// skip is a gap, never a pass. The media door is pinned by
// measure-media.test.js. Zero model calls; the mouth arm is the driver's
// dated record.
import test from "node:test";
import assert from "node:assert/strict";
import { TASKS, runFrontier25 } from "../eval/the-fold/lib/frontier-25.mjs";

let server = null;
try {
  const { bootServer } = await import("../eval/the-fold/frontier-25.mjs");
  server = await bootServer();
} catch (e) {
  console.log(`  serve.mjs not booted here (${String(e.message).split("\n")[0]}) — python controls skip typed`);
}
const run = await runFrontier25({ runPython: server?.runPython ?? null });
if (server) server.stop();

test("the fixture is twenty-five tasks across five categories, each naming the organ that claims or witnesses it", () => {
  assert.equal(TASKS.length, 25);
  const cats = new Set(TASKS.map((t) => t.category));
  assert.deepEqual([...cats].sort(), ["coding", "creative", "data", "math", "reading"]);
  for (const t of TASKS) assert.ok(["arithmetic", "numeric", "skill", "run", "sql", "assay", "void", "form"].includes(t.claim), `${t.id} names an organ`);
  assert.equal(new Set(TASKS.map((t) => t.id)).size, 25);
});

test("every task an organ claims outright is answered with no model — computed, read, or declared absent", () => {
  const claimed = run.rows.filter((r) => r.mechanical);
  assert.equal(claimed.length, 13, "9 arithmetic/calendar + 3 assay + 1 void");
  const missed = claimed.filter((r) => !r.mechanical.ok).map((r) => `${r.id}: ${r.mechanical.detail}`);
  assert.deepEqual(missed, []);
  for (const r of claimed) console.log(`  ${r.id} ${r.mechanical.organ.split("::")[0].split(" ")[0]} — ${r.mechanical.detail.slice(0, 100)}`);
});

test("every witness can fail: the reference passes, the wrong answer fails (skills, python via /api/run, sql, form)", () => {
  const witnessed = run.rows.filter((r) => r.control);
  assert.equal(witnessed.length, 11, "4 skills + 2 python + 1 sql + 4 form");
  const skipped = witnessed.filter((r) => r.control.skipped);
  const broken = witnessed.filter((r) => !r.control.skipped && !r.control.ok).map((r) => `${r.id}: ref ${r.control.ref.verdict} (${r.control.ref.detail.slice(0, 80)}) · wrong ${r.control.wrong.verdict}`);
  assert.deepEqual(broken, []);
  for (const r of skipped) console.log(`  ${r.id} SKIPPED — ${r.control.skipped}`);
  assert.ok(skipped.length <= 2 && skipped.every((r) => r.claim === "run"), "only the python controls may skip, and only for want of the runner");
  for (const r of witnessed.filter((x) => !x.control.skipped)) console.log(`  ${r.id} ${r.claim} — wrong answer refused: ${r.control.wrong.detail.slice(0, 90)}`);
});

test("the numeric task's witness reads the mouth's LAST number, and the engine's own computation is the expected value", async () => {
  const { witness } = await import("../eval/the-fold/lib/frontier-25.mjs");
  const task = TASKS.find((t) => t.id === "n1");
  assert.equal((await witness(task, "1000 at 5% for 3 years grows to 1157.63 dollars.")).ok, true);
  assert.equal((await witness(task, "1000 at 5% for 3 years grows to 1150 dollars.")).ok, false);
  assert.equal((await witness(task, "It grows to about $1,157.63")).ok, true);
});
