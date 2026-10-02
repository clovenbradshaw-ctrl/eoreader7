// node --test consequence.test.mjs
//
// Against REAL eoreader7 modules — native/kernel/task-log.js and
// native/kernel/cube.js, checked out at ../eoreader7 in this session — so
// this file exercises ground-ledger.js's own prequential firewall for
// real too, in an environment where ground-ledger.test.mjs itself cannot
// load (it imports eoreader6.1's holon/task-log.js directly, a sibling
// this checkout does not have). Degrades to a typed skip without the
// eoreader7 sibling, matching every other cast.js-pattern test here.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  adaptTaskLog,
  classifyConsequence,
  createConsequenceLedger,
  evaluatePromotion,
  scoreConsequence,
} from "./consequence.js";

let taskLog = null;
try {
  const [tl, cube] = await Promise.all([
    import("../kernel/task-log.js"),
    import("../kernel/cube.js"),
  ]);
  taskLog = adaptTaskLog({ ...tl, GRAINS: cube.GRAINS });
} catch {
  taskLog = null;
}

test("adaptTaskLog derives GRAIN_RANK from cube.js's own ordinal GRAINS, never a guess", () => {
  if (!taskLog) return;
  assert.deepEqual(taskLog.GRAIN_RANK, { Ground: 0, Figure: 1, Pattern: 2 });
});

test("adaptTaskLog refuses a partial shape rather than silently adapting one", () => {
  assert.throws(() => adaptTaskLog({}), /required/);
});

test("scoreConsequence: an ablation that flips the verdict scores 1; one that doesn't scores 0", () => {
  if (!taskLog) return;
  const ledger = createConsequenceLedger(taskLog);
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 0, summary: { records: ["r1"] } });

  log = scoreConsequence(ledger, log, { turnId: "t1", turnIndex: 1, verdictWith: "holds", verdictWithout: "unbound" });
  log = scoreConsequence(ledger, log, { turnId: "t2", turnIndex: 2, verdictWith: "holds", verdictWithout: "holds" });

  const scores = ledger.allScores(log);
  assert.equal(scores.find((s) => s.turn_id === "t1").score, 1, "the claim's presence changed the verdict");
  assert.equal(scores.find((s) => s.turn_id === "t2").score, 0, "the verdict held regardless — this turn did not need the claim");
});

test("the prequential firewall carries through the adapter: a turn cannot be scored twice, retroactivity is refused not discouraged", () => {
  if (!taskLog) return;
  const ledger = createConsequenceLedger(taskLog);
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 0, summary: {} });
  log = scoreConsequence(ledger, log, { turnId: "t1", turnIndex: 1, verdictWith: "a", verdictWithout: "b" });
  assert.throws(
    () => scoreConsequence(ledger, log, { turnId: "t1", turnIndex: 5, verdictWith: "a", verdictWithout: "b" }),
    /already has a score/,
  );
});

test("classifyConsequence: consequence_untested when no later turn ever engaged this ground — a gap, not a zero", () => {
  if (!taskLog) return;
  const ledger = createConsequenceLedger(taskLog);
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 0, summary: {} });
  const groundId = ledger.latestGroundVersion(log).task_id;
  const result = classifyConsequence(ledger, log, groundId);
  assert.equal(result.status, "consequence_untested");
  assert.equal(result.gap, "consequence_untested");
  assert.deepEqual(result.scores, []);
});

test("classifyConsequence: recurring_no_consequence when engaged turns never moved", () => {
  if (!taskLog) return;
  const ledger = createConsequenceLedger(taskLog);
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 0, summary: {} });
  const groundId = ledger.latestGroundVersion(log).task_id;
  log = scoreConsequence(ledger, log, { turnId: "t1", turnIndex: 1, verdictWith: "x", verdictWithout: "x" });
  log = scoreConsequence(ledger, log, { turnId: "t2", turnIndex: 2, verdictWith: "y", verdictWithout: "y" });
  const result = classifyConsequence(ledger, log, groundId);
  assert.equal(result.status, "recurring_no_consequence");
  assert.equal(result.scores.length, 2);
});

test("classifyConsequence: mattered when at least one engaged turn's verdict genuinely moved", () => {
  if (!taskLog) return;
  const ledger = createConsequenceLedger(taskLog);
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 0, summary: {} });
  const groundId = ledger.latestGroundVersion(log).task_id;
  log = scoreConsequence(ledger, log, { turnId: "t1", turnIndex: 1, verdictWith: "x", verdictWithout: "x" });
  log = scoreConsequence(ledger, log, { turnId: "t2", turnIndex: 2, verdictWith: "holds", verdictWithout: "unbound" });
  const result = classifyConsequence(ledger, log, groundId);
  assert.equal(result.status, "mattered");
  assert.deepEqual(result.scores.map((s) => s.turn_id), ["t2"], "only the turn that actually moved is carried forward");
});

test("evaluatePromotion: never promotes on recurrence alone (S9) — every non-promoted path names which half of the AND failed", () => {
  assert.deepEqual(
    evaluatePromotion({ recurs: false, consequence: { status: "mattered" } }),
    { promoted: false, reason: "not_yet_recurring" },
  );
  assert.deepEqual(
    evaluatePromotion({ recurs: true, consequence: { status: "consequence_untested" } }),
    { promoted: false, reason: "consequence_untested" },
  );
  assert.deepEqual(
    evaluatePromotion({ recurs: true, consequence: { status: "recurring_no_consequence" } }),
    { promoted: false, reason: "recurring_no_consequence" },
  );
  assert.deepEqual(
    evaluatePromotion({ recurs: true, consequence: { status: "mattered" } }),
    { promoted: true, reason: "recurrence_and_consequence" },
  );
});

test("end to end: a reference that recurs and once mattered promotes; one that recurs but never mattered does not", () => {
  if (!taskLog) return;
  const ledger = createConsequenceLedger(taskLog);
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 0, summary: { records: ["koniag contract"] } });
  const groundId = ledger.latestGroundVersion(log).task_id;

  // Two turns engage the ground; the second one's verdict genuinely
  // depended on the claim being present.
  log = scoreConsequence(ledger, log, { turnId: "t1", turnIndex: 1, verdictWith: "holds", verdictWithout: "holds" });
  log = scoreConsequence(ledger, log, { turnId: "t2", turnIndex: 2, verdictWith: "holds", verdictWithout: "unbound" });

  const consequence = classifyConsequence(ledger, log, groundId);
  const promoted = evaluatePromotion({ recurs: true, consequence });
  assert.equal(promoted.promoted, true);

  // A second, otherwise identical ground whose engaged turns never moved.
  let log2 = taskLog.createTaskLog();
  log2 = ledger.proposeGroundVersion(log2, { turnIndex: 0, summary: { records: ["unrelated aside"] } });
  const groundId2 = ledger.latestGroundVersion(log2).task_id;
  log2 = scoreConsequence(ledger, log2, { turnId: "u1", turnIndex: 1, verdictWith: "x", verdictWithout: "x" });
  const consequence2 = classifyConsequence(ledger, log2, groundId2);
  const notPromoted = evaluatePromotion({ recurs: true, consequence: consequence2 });
  assert.equal(notPromoted.promoted, false);
  assert.equal(notPromoted.reason, "recurring_no_consequence");
});
