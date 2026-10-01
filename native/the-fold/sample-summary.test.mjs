// the summary arithmetic, pinned on synthetic rows: pass rates, failed fractions, the PAIRED reading-vs-raw difference, and an interval that is wide when tasks disagree
import test from "node:test";
import assert from "node:assert/strict";
import { summarise } from "./sample-summary.mjs";

const row = (task, over) => ({ task, role: "cards", offered: ["x"], samePrompt: false, baseOk: false, baseFail: 1, offeredRawOk: false, offeredRawFail: 1, readOk: false, readFail: 1, transformations: [], ...over });

test("rates and the paired reading difference are computed per task from the same draws", () => {
  const rows = [
    row("a", { baseOk: true, baseFail: 0, offeredRawOk: false, offeredRawFail: 0.5, readOk: true, readFail: 0, transformations: ["const_to_let"] }),
    row("a", { baseOk: false, baseFail: 1, offeredRawOk: false, offeredRawFail: 1, readOk: false, readFail: 0.5, transformations: ["call_resolved"] }),
  ];
  const { tasks } = summarise(rows, { boot: 50 }), a = tasks[0];
  assert.equal(a.basePass, 0.5); assert.equal(a.offeredRawPass, 0); assert.equal(a.readPass, 0.5);
  assert.equal(a.pairedReadVsRaw, 0.5, "(0.5-0 + 1-0.5) / 2: the reading took half a run off the same draws");
  assert.equal(a.changed, 2);
});

test("the interval resamples TASKS: three tasks that agree give a tight interval, tasks that disagree give a wide one that straddles zero", () => {
  const agree = ["a", "b", "c", "d"].flatMap((t) => [row(t, { offeredRawFail: 0.5, readFail: 0 }), row(t, { offeredRawFail: 0.5, readFail: 0 })]);
  const o1 = summarise(agree, { boot: 400 }).overall["canonical reading vs raw, SAME draws (failed fraction)"];
  assert.equal(o1.mean, 0.5); assert.ok(o1.lo > 0.4 && o1.hi <= 0.5 + 1e-9);
  const split = [row("a", { offeredRawFail: 1, readFail: 0 }), row("b", { offeredRawFail: 0, readFail: 1 }), row("c", { offeredRawFail: 1, readFail: 0 }), row("d", { offeredRawFail: 0, readFail: 1 })];
  const o2 = summarise(split, { boot: 400 }).overall["canonical reading vs raw, SAME draws (failed fraction)"];
  assert.equal(o2.mean, 0); assert.ok(o2.lo < 0 && o2.hi > 0, "tasks that disagree leave the interval across zero: no finding");
});
