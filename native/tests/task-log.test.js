import test from "node:test";
import assert from "node:assert/strict";
import { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS } from "../kernel/task-log.js";

// A from-scratch reimplementation of the pre-optimization algorithm (a full
// replay of every entry, every call) -- kept ONLY as an independent oracle
// for this test file, never imported by production code.
function projectTasksFresh(log) {
  const byId = new Map(); const superseded = new Set(); const retracted = new Set();
  const RESERVED = new Set(["kind", "task_id", "seq", "supersedes", "operator", "operator_basis", "grain", "description", "depends_on", "evidence", "result"]);
  for (const e of log.entries) {
    if (e.kind === ENTRY_KINDS.RETRACT) { retracted.add(e.task_id); continue; }
    if (e.supersedes) superseded.add(e.supersedes);
    const prior = byId.get(e.task_id) ?? { task_id: e.task_id, operator: null, operator_basis: OPERATOR_BASIS.ABSENT, operator_gap: "no structural act has been earned for this task yet", grain: null, grain_gap: "no grain has been earned for this task's operator yet", cell: null, description: null, depends_on: [], evidence: [], result: null, first_seq: e.seq };
    const payload = {}; for (const [key, value] of Object.entries(e)) if (!RESERVED.has(key)) payload[key] = value;
    byId.set(e.task_id, { ...prior, ...payload, evidence: e.evidence?.length ? [...new Set([...prior.evidence, ...e.evidence])] : prior.evidence, result: e.kind === ENTRY_KINDS.RESULT ? e.result : prior.result, description: e.description ?? prior.description, last_seq: e.seq });
  }
  return [...byId.values()].filter((t) => !retracted.has(t.task_id) && !superseded.has(t.task_id)).map((t) => t.task_id).sort();
}

test("projectTasks' incremental cache reproduces the same live task set as a full replay, at every step of a sequential log", () => {
  let log = createTaskLog();
  const steps = [
    { kind: "propose", task_id: "t1", description: "first" },
    { kind: "propose", task_id: "t2", description: "second" },
    { kind: "evidence", task_id: "t1", evidence: ["e1"] },
    { kind: "propose", task_id: "t3", description: "third" },
    { kind: "supersede", task_id: "t3", supersedes: "t2", description: "third supersedes second" },
    { kind: "result", task_id: "t1", result: { ok: true } },
    { kind: "retract", task_id: "t3", description: "no longer needed" },
    { kind: "propose", task_id: "t4", description: "fourth", operator: "INS", operator_basis: "produced", grain: "Figure" },
  ];
  for (const entry of steps) {
    log = append(log, entry);
    const incremental = projectTasks(log).map((t) => t.task_id).sort();
    assert.deepEqual(incremental, projectTasksFresh(log), `after appending ${JSON.stringify(entry)}`);
  }
  // t2 superseded by t3, t3 itself retracted -- neither survives; t1 and t4 do.
  const finalIds = projectTasks(log).map((t) => t.task_id).sort();
  assert.deepEqual(finalIds, ["t1", "t4"]);
  const t1 = projectTasks(log).find((t) => t.task_id === "t1");
  assert.deepEqual(t1.evidence, ["e1"]);
  assert.deepEqual(t1.result, { ok: true });
});

test("projectTasks called out of order (an earlier log in a lineage, after a later one) still self-heals to a correct result", () => {
  let log = createTaskLog();
  log = append(log, { kind: "propose", task_id: "a", description: "a" });
  const earlier = log;
  log = append(log, { kind: "propose", task_id: "b", description: "b" });
  const later = log;

  // Project the LATER log first (advances the shared cache past `earlier`'s
  // own length), then go back and project `earlier` -- this must not return
  // task "b", which earlier's own entries never contained.
  assert.deepEqual(projectTasks(later).map((t) => t.task_id).sort(), ["a", "b"]);
  assert.deepEqual(projectTasks(earlier).map((t) => t.task_id).sort(), ["a"]);
});

test("two logs that branch from a shared ancestor each project correctly, even sharing one underlying cache reference", () => {
  let base = createTaskLog();
  base = append(base, { kind: "propose", task_id: "shared", description: "shared" });

  const branchA = append(base, { kind: "propose", task_id: "onlyA", description: "onlyA" });
  const branchB = append(base, { kind: "propose", task_id: "onlyB", description: "onlyB" });

  assert.deepEqual(projectTasks(branchA).map((t) => t.task_id).sort(), ["onlyA", "shared"]);
  assert.deepEqual(projectTasks(branchB).map((t) => t.task_id).sort(), ["onlyB", "shared"]);
  // Re-check A again after B was projected, to prove the shared cache did
  // not leak B's entry into A's own result.
  assert.deepEqual(projectTasks(branchA).map((t) => t.task_id).sort(), ["onlyA", "shared"]);
});

test("a hand-built log with no _cache field still projects correctly", () => {
  const log = { entries: [{ kind: "propose", task_id: "x", seq: 0, depends_on: [], evidence: [] }], nextSeq: 1, admits: ["INS"] };
  assert.deepEqual(projectTasks(log).map((t) => t.task_id), ["x"]);
});
