// ═══ LOVELACE · LAVAR ═══ The canonical stage measured on suggestions ALREADY DRAWN — no model is called.
//
//   node native/the-fold/canonical-offline.mjs <suggestions.jsonl>...      (rows: { task|name, model, code, ... } as makeUnit's `see` wrote them)
//
// Every distinct suggestion is scored against its task's oracle three ways:
//   raw        as the model wrote it (no key resolution, cards callable by their own names only)
//   wall       through the run-time wall that resolved keys and called-names while it ran (what app-units did before this stage existed)
//   canonical  the suggestion READ by code-canonical.js — transformations written into the code — then run with NO run-time magic
// "canonical" must match "wall" where the wall's resolutions are what was needed, and beat it where the wall could not reach (a const slip
// is a thrown error at run time; only a rewrite fixes it). A transformation that makes a suggestion WORSE is reported, not hidden.
import fs from "node:fs";
import { LEAF_CONTRACTS } from "./app-leaves.mjs";
import { DIVERSE } from "./diverse-tasks.mjs";
import { testFunction, declaredAliases, loadUnit } from "./app-units.mjs";
import { canonicalize, adoptIf } from "../organs/code-canonical.js";

const contracts = new Map([...LEAF_CONTRACTS, ...DIVERSE.map((d) => d.contract)].map((c) => [c.name, c]));

function score(code, c, opts) {
  let fn;
  try { fn = loadUnit(code, c.name, opts); } catch (e) { return { ok: false, passed: 0, of: c.runs.length, compiled: false, resolutions: [] }; }
  const r = testFunction(fn, c);
  const failed = c.runs.filter((run) => r.failures.some((f) => f.startsWith(`${run.label}:`))).length;
  return { ok: r.ok, passed: c.runs.length - failed, of: c.runs.length, compiled: true, resolutions: fn.resolutions?.() ?? [] };
}

const files = process.argv.slice(2);
const seen = new Set(), rows = [];
for (const f of files) for (const line of fs.readFileSync(f, "utf8").split("\n").filter(Boolean)) {
  let r; try { r = JSON.parse(line); } catch { continue; }
  const name = r.name ?? r.task;
  if (!r.code || !contracts.has(name) || (r.event && r.event !== "unit-draw") || r.code.length >= 1500) continue; // 1500 = the ledger's own cut: a longer code is truncated, not measurable
  const key = `${name}\u0000${r.code}`; if (seen.has(key)) continue; seen.add(key);
  rows.push({ name, model: r.model, code: r.code });
}

const tally = { n: 0, raw: 0, wall: 0, canonical: 0, adopted: 0, rawRuns: 0, wallRuns: 0, canonRuns: 0, of: 0, changed: 0, worse: 0, better: 0 };
const fired = {}, detail = [];
for (const s of rows) {
  const c = { ...contracts.get(s.name) };
  const declared = declaredAliases(c);
  const raw = score(s.code, c, { resolve: null, cards: "exact" });
  const wall = score(s.code, c, { resolve: { declared }, cards: true });
  const canon = canonicalize(s.code, { resolutions: wall.resolutions });
  const can = canon.changed ? score(canon.code, c, { resolve: null, cards: "exact" }) : raw;
  const adopted = adoptIf(raw.passed, can.passed) ? can : raw;
  tally.n++; tally.raw += raw.ok; tally.wall += wall.ok; tally.canonical += can.ok; tally.adopted += adopted.ok;
  tally.rawRuns += raw.passed; tally.wallRuns += wall.passed; tally.canonRuns += adopted.passed; tally.of += raw.of;
  if (canon.changed) tally.changed++;
  if (can.passed < raw.passed) tally.worse++; if (can.passed > raw.passed) tally.better++;
  for (const t of canon.transformations) fired[t.kind] = (fired[t.kind] ?? 0) + 1;
  if (canon.changed) detail.push({ name: s.name, model: s.model, raw: `${raw.passed}/${raw.of}${raw.ok ? " ✓" : ""}`, wall: `${wall.passed}/${wall.of}${wall.ok ? " ✓" : ""}`, canonical: `${can.passed}/${can.of}${can.ok ? " ✓" : ""}`, transformations: canon.transformations.map((t) => `${t.kind}:${t.name ?? `${t.from}→${t.to}`}`).join(" ") });
}
console.log(`suggestions scored: ${tally.n} (distinct, complete)   suggestions the stage changed: ${tally.changed}`);
console.log(`all runs pass   raw ${tally.raw}   wall(run-time magic) ${tally.wall}   canonical ${tally.canonical}   canonical+adopt ${tally.adopted}`);
console.log(`runs passed     raw ${tally.rawRuns}/${tally.of}   wall ${tally.wallRuns}/${tally.of}   canonical+adopt ${tally.canonRuns}/${tally.of}`);
console.log(`stage effect    better ${tally.better}   worse ${tally.worse}   transformations fired ${JSON.stringify(fired)}`);
for (const d of detail) console.log(`  ${d.name.padEnd(16)} ${String(d.model).padEnd(20)} raw ${d.raw.padEnd(8)} wall ${d.wall.padEnd(8)} canonical ${d.canonical.padEnd(8)} ${d.transformations}`);
