// task-log.test.js — GRAIN_RANK, the one addition this file makes to
// kernel/task-log.js: a grain's ordinal depth, read off this module's own
// imported GRAINS. Everything else in task-log.js (createTaskLog, append,
// projectTasks, ENTRY_KINDS, OPERATOR_BASIS, OPERATOR_ORDER) is exercised
// transitively by every other suite that already builds a log and is not
// re-tested here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GRAIN_RANK } from "../kernel/task-log.js";
import { GRAINS } from "../kernel/cube.js";

test("GRAIN_RANK: exactly the cube's own GRAINS, in the cube's own order", () => {
  assert.deepEqual(Object.keys(GRAIN_RANK), [...GRAINS]);
  GRAINS.forEach((g, i) => assert.equal(GRAIN_RANK[g], i));
});

test("GRAIN_RANK: rank 1 is Figure — the fact hyperlexicon.js's own cellFields depends on", () => {
  const figure = Object.keys(GRAIN_RANK).find((g) => GRAIN_RANK[g] === 1);
  assert.equal(figure, "Figure");
});

test("GRAIN_RANK: frozen, so a caller cannot silently redefine a grain's depth", () => {
  assert.ok(Object.isFrozen(GRAIN_RANK));
  assert.throws(() => { GRAIN_RANK.Ground = 99; }, /read only|not extensible|frozen/i);
});
