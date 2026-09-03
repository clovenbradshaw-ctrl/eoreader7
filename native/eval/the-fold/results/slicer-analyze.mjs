// slicer-analyze.mjs — read one or more ranke-slicers result files and print
// the license table plus the cross-arm overlap. Separate from the driver on
// purpose: a pass can be resumed, split across arms, or re-run at a
// different budget, and the reading of it should not require re-spending it.
//   node slicer-analyze.mjs ranke-slicers.json [more.json ...]
import { readFileSync } from "node:fs";
const files = process.argv.slice(2);
if (!files.length) { console.error("usage: node slicer-analyze.mjs <result.json> [...]"); process.exit(1); }
const merged = { real: {}, control: {}, meta: null };
for (const f of files) { const j = JSON.parse(readFileSync(f, "utf8")); merged.meta ??= j; Object.assign(merged.real, j.real ?? {}); Object.assign(merged.control, j.control ?? {}); }
const ORDER = ["stating", "random", "containment", "activation", "embedding"];
const arms = Object.keys(merged.real).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
console.log(`| arm | offered | no candidate | real states | control states | separation |`);
console.log(`|---|---|---|---|---|---|`);
for (const a of arms) {
  const r = merged.real[a], c = merged.control[a];
  if (r?.gap) { console.log(`| \`${a}\` | — | — | — | — | unavailable: ${r.gap.type} |`); continue; }
  console.log(`| \`${a}\` | ${r.offered} | ${r.noCandidates} | **${r.states}** | ${c?.states ?? 0} | ${r.states - (c?.states ?? 0)} |`);
}
console.log(`\nrefusal shapes (real):`);
for (const a of arms) if (!merged.real[a]?.gap) console.log(`  ${a.padEnd(12)} ${JSON.stringify(merged.real[a].verdicts)}`);
console.log(`\ncontradicts, real / control:`);
for (const a of arms) if (!merged.real[a]?.gap) console.log(`  ${a.padEnd(12)} ${merged.real[a].contradicts} / ${merged.control[a]?.contradicts ?? 0}`);
const setOf = (a) => new Set((merged.real[a]?.landings ?? []).map((l) => l.note));
console.log(`\noverlap of landed notes — does one slicer land what another misses?`);
for (const a of arms) for (const b of arms) {
  if (ORDER.indexOf(a) >= ORDER.indexOf(b)) continue;
  const A = setOf(a), B = setOf(b), both = [...A].filter((x) => B.has(x)).length;
  if (A.size || B.size) console.log(`  ${a} & ${b}: ${both} shared, ${A.size - both} only ${a}, ${B.size - both} only ${b}`);
}
console.log(`\nunion of all arms: ${new Set(arms.flatMap((a) => [...setOf(a)])).size} notes landed by at least one slicer`);
console.log(`control union:     ${new Set(arms.flatMap((a) => (merged.control[a]?.landings ?? []).map((l) => l.note))).size} — every one is evidence AGAINST the arm that produced it`);
console.log(`\nmodel calls: ${merged.meta?.modelCalls ?? "not recorded"}`);
