// Self-time-by-call-frame breakdown for a V8 CPU profile (produced via
// `node --cpu-prof --cpu-prof-dir=<dir> --cpu-prof-name=<name>.cpuprofile`).
// This is the "check the driver before the theory" tool (P5.5): rather than
// guessing which function is the bottleneck from reading code, sample where
// wall-clock time is actually being spent. Every real bottleneck found and
// fixed in this reading engine this session (task-log.js's projectTasks,
// fold.js's upsertById/upsertManyById, entity-kind-induction.js's
// affinityField) was found this way, not by inspection alone.
//
// Usage: node native/eval/analyze-cpu-profile.mjs <profile.cpuprofile>

import fs from "fs";
const profile = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const selfTimeById = new Map();
let total = 0;
for (let i = 0; i < profile.samples.length; i += 1) {
  const id = profile.samples[i];
  const dt = profile.timeDeltas[i] ?? 0;
  selfTimeById.set(id, (selfTimeById.get(id) ?? 0) + dt);
  total += dt;
}
const rows = [...selfTimeById.entries()].map(([id, us]) => {
  const n = nodes.get(id);
  const cf = n?.callFrame ?? {};
  return { name: cf.functionName || "(anonymous)", url: (cf.url || "").replace(/^.*\/native\//, "native/"), line: cf.lineNumber, us, pct: (us / total) * 100 };
});
rows.sort((a, b) => b.us - a.us);
console.log(`total sampled: ${(total / 1e6).toFixed(2)}s\n`);
for (const r of rows.slice(0, 30)) {
  console.log(`${r.pct.toFixed(2).padStart(6)}%  ${(r.us / 1000).toFixed(1).padStart(9)}ms  ${r.name || "(anon)"}  ${r.url}:${r.line}`);
}
