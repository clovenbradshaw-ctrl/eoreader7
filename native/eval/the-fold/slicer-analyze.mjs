// slicer-analyze.mjs — reads one or more ranke-slicers JSONs and prints the license table plus
// the cross-arm overlap (does one slicer land what another misses?)
import { readFileSync } from "node:fs";
const files = process.argv.slice(2);
const merged = { real: {}, control: {}, license: {}, meta: null };
for (const f of files) { const j = JSON.parse(readFileSync(f, "utf8")); merged.meta ??= j; Object.assign(merged.real, j.real); Object.assign(merged.control, j.control); Object.assign(merged.license, j.license); }
const arms = Object.keys(merged.real);
const ORDER = ["stating", "random", "containment", "activation", "embedding"];
arms.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
console.log(`| arm | offered | no candidate | real states | control states | separation |`);
console.log(`|---|---|---|---|---|---|`);
for (const a of arms) {
  const r = merged.real[a], c = merged.control[a];
  if (r?.gap) { console.log(`| \`${a}\` | — | — | — | — | unavailable (${r.gap.type}) |`); continue; }
  console.log(`| \`${a}\` | ${r.offered} | ${r.noCandidates} | **${r.states}** | ${c?.states ?? 0} | ${r.states - (c?.states ?? 0)} |`);
}
console.log(`\nrefusal shapes (real):`);
for (const a of arms) if (!merged.real[a]?.gap) console.log(`  ${a.padEnd(12)} ${JSON.stringify(merged.real[a].verdicts)}`);
console.log(`\ncontradicts (real / control):`);
for (const a of arms) if (!merged.real[a]?.gap) console.log(`  ${a.padEnd(12)} ${merged.real[a].contradicts} / ${merged.control[a]?.contradicts ?? 0}`);
const setOf = (a) => new Set((merged.real[a]?.landings ?? []).map((l) => l.note));
console.log(`\noverlap of landed notes:`);
for (const a of arms) for (const b of arms) {
  if (ORDER.indexOf(a) >= ORDER.indexOf(b)) continue;
  const A = setOf(a), B = setOf(b); const both = [...A].filter((x) => B.has(x)).length;
  if (A.size || B.size) console.log(`  ${a} ∩ ${b}: ${both} (only ${a}: ${A.size - both}, only ${b}: ${B.size - both})`);
}
const union = new Set(arms.flatMap((a) => [...setOf(a)]));
console.log(`\nunion of all arms: ${union.size} notes landed by at least one slicer`);
const ctlUnion = new Set(arms.flatMap((a) => (merged.control[a]?.landings ?? []).map((l) => l.note)));
console.log(`control union: ${ctlUnion.size}`);
console.log(`\nmodel calls: ${merged.meta?.modelCalls ?? "?"}`);
