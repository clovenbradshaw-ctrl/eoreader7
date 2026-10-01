import test from "node:test";
import assert from "node:assert/strict";
import { summariseDose } from "./dose-summary.mjs";
const cell = (all, state = all ? "bound" : "contradicted", held = all ? 1 : 0) => ({ all, held, state, chars: 100 });
test("a rung's counts and false-bound are read off its cells; a paired change counts tasks that gained and tasks that lost", () => {
  const rows = [{ D4: cell(false), D5: cell(true) }, { D4: cell(false), D5: cell(true) }, { D4: cell(true), D5: cell(true) }, { D4: cell(false, "bound", 0), D5: cell(false) }];
  const { per, diffs } = summariseDose(rows);
  assert.equal(per.D4.full, 1); assert.equal(per.D5.full, 3); assert.equal(per.D4.falseBound, 1, "bound on what it showed, wrong beyond it");
  const d = diffs.find((x) => x.from === "D4" && x.to === "D5");
  assert.equal(d.gain, 2); assert.equal(d.loss, 0); assert.equal(d.mean, 0.5);
});
test("a rung nobody ran is not summarised, and its comparisons are skipped rather than read as zero", () => {
  const { per, diffs } = summariseDose([{ D4: cell(true), D5: cell(true) }]);
  assert.ok(!per.D6 && diffs.every((x) => per[x.from] && per[x.to]));
});
