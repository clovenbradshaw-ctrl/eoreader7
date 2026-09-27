// The task projection is incremental (kernel/task-log.js): remembered
// against the last entry projected, so a longer log folds only what came
// after it. This checks it gives exactly what projecting from scratch gives,
// on logs that branch (two logs grown from one prefix), supersede, retract
// and re-type — and that the remembered tasks cannot be edited by a caller.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS } from "../kernel/task-log.js";
import { cellOf } from "../kernel/cube.js";

// the fold as it was written before it was made incremental, kept here as the reference
function projectFromScratch(log) {
  const RESERVED = new Set(["kind", "task_id", "seq", "supersedes", "operator", "operator_basis", "grain", "description", "depends_on", "evidence", "result"]);
  const byId = new Map(); const superseded = new Set(); const retracted = new Set();
  for (const e of log.entries) {
    if (e.kind === ENTRY_KINDS.RETRACT) { retracted.add(e.task_id); continue; }
    if (e.supersedes) superseded.add(e.supersedes);
    const prior = byId.get(e.task_id) ?? { task_id: e.task_id, operator: null, operator_basis: OPERATOR_BASIS.ABSENT, operator_gap: "no structural act has been earned for this task yet", grain: null, grain_gap: "no grain has been earned for this task's operator yet", cell: null, description: null, depends_on: [], evidence: [], result: null, first_seq: e.seq };
    const payload = {}; for (const [key, value] of Object.entries(e)) if (!RESERVED.has(key)) payload[key] = value;
    const nextOperator = e.operator ?? prior.operator;
    const nextGrain = e.grain ?? (e.operator != null ? null : prior.grain);
    byId.set(e.task_id, { ...prior, ...payload, evidence: e.evidence?.length ? [...new Set([...prior.evidence, ...e.evidence])] : prior.evidence, result: e.kind === ENTRY_KINDS.RESULT ? e.result : prior.result, description: e.description ?? prior.description, depends_on: e.depends_on.length ? [...e.depends_on] : prior.depends_on, operator: nextOperator, operator_basis: e.operator != null ? e.operator_basis : prior.operator_basis, operator_gap: e.operator != null ? null : prior.operator_gap, grain: nextGrain, grain_gap: e.grain != null ? null : e.operator != null ? "no grain has been earned for this task's operator yet" : prior.grain_gap, cell: nextOperator != null && nextGrain != null ? cellOf(nextOperator, nextGrain) : null, last_seq: e.seq });
  }
  return [...byId.values()].filter((t) => !retracted.has(t.task_id) && !superseded.has(t.task_id)).sort((a, b) => a.first_seq - b.first_seq);
}

// a fixed pseudo-random walk (no Math.random: the same logs every run)
function walk(seed, steps, from = createTaskLog()) {
  let x = seed, log = from;
  const next = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
  const ids = [];
  for (let i = 0; i < steps; i++) {
    const r = next();
    const id = ids.length && r < 0.4 ? ids[Math.floor(next() * ids.length)] : `t${seed}-${i}`;
    if (!ids.includes(id)) ids.push(id);
    const kinds = [ENTRY_KINDS.PROPOSE, ENTRY_KINDS.EVIDENCE, ENTRY_KINDS.RESULT, ENTRY_KINDS.SUPERSEDE, ENTRY_KINDS.RETRACT];
    const kind = kinds[Math.floor(next() * (r < 0.9 ? 3 : 5))];
    const typed = next() < 0.5;
    log = append(log, { kind, task_id: id, description: `step ${i}`, ...(typed ? { operator: "INS", operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Figure" } : {}), ...(kind === ENTRY_KINDS.SUPERSEDE && ids.length > 1 ? { supersedes: ids[0] } : {}), ...(kind === ENTRY_KINDS.RESULT ? { result: i } : {}), evidence: next() < 0.3 ? [`e${i}`] : [], end1: `a${i % 7}` });
    if (i % 5 === 0) assert.deepEqual(projectTasks(log), projectFromScratch(log), `seed ${seed} step ${i}`);
  }
  return log;
}

test("the incremental projection equals the projection from scratch, step by step", () => {
  for (const seed of [1, 2, 3, 7, 11]) {
    const log = walk(seed, 120);
    assert.deepEqual(projectTasks(log), projectFromScratch(log));
  }
});

test("two logs grown from one prefix each project as their own", () => {
  const prefix = walk(5, 40);
  projectTasks(prefix);
  const a = walk(8, 30, prefix), b = walk(9, 30, prefix);
  assert.deepEqual(projectTasks(a), projectFromScratch(a));
  assert.deepEqual(projectTasks(b), projectFromScratch(b));
  assert.deepEqual(projectTasks(prefix), projectFromScratch(prefix));
});

test("a projected task cannot be edited by its reader", () => {
  const log = walk(4, 10);
  const [t] = projectTasks(log);
  assert.throws(() => { t.description = "changed"; });
  assert.deepEqual(projectTasks(log), projectFromScratch(log));
});
