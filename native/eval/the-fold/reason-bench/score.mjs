// reason-bench/score.mjs — score each arm against the generator's gold ONLY.
//   node score.mjs GOLD.json ARM=answers.txt [ARM=answers.txt …]
// An answers file holds "<ID>: YES|NO|UNSURE" lines; a missing or UNSURE
// answer is scored wrong, never skipped.
import fs from "node:fs";
const [goldFile, ...arms] = process.argv.slice(2);
const gold = JSON.parse(fs.readFileSync(goldFile, "utf8"));
const parse = (f) => { const m = new Map(); for (const l of fs.readFileSync(f, "utf8").split("\n")) { const x = /^\s*([a-z]+-(?:XL|[SML])\d|[qr]\d{2})\s*:\s*(YES|NO|UNSURE)\b/i.exec(l); if (x) m.set(x[1], x[2].toUpperCase()); } return m; };
const pct = (a, b) => `${a}/${b} (${Math.round((100 * a) / b)}%)`;
const alwaysYes = gold.filter((g) => g.gold === "YES").length;
console.log(`items: ${gold.length} · always-YES floor: ${pct(alwaysYes, gold.length)} · always-NO: ${pct(gold.length - alwaysYes, gold.length)}\n`);
const fams = [...new Set(gold.map((g) => g.family))], sizes = ["S", "M", "L", "XL"];
const rows = [];
for (const spec of arms) {
  const [name, file] = spec.split("=");
  const ans = parse(file);
  const right = (g) => ans.get(g.id) === g.gold;
  const total = gold.filter(right).length;
  const unanswered = gold.filter((g) => !ans.has(g.id) || ans.get(g.id) === "UNSURE").length;
  rows.push({ name, total, unanswered, fam: Object.fromEntries(fams.map((f) => { const gs = gold.filter((g) => g.family === f); return [f, `${gs.filter(right).length}/${gs.length}`]; })), size: Object.fromEntries(sizes.map((s) => [s, `${gold.filter((g) => g.size === s).filter(right).length}/${gold.filter((g) => g.size === s).length}`])), misses: gold.filter((g) => !right(g)).map((g) => `${g.id}(gold ${g.gold}, said ${ans.get(g.id) ?? "—"})`) });
}
console.log(`| arm | total | ${fams.join(" | ")} | ${sizes.join(" | ")} | unanswered |`);
console.log(`|---|---|${fams.map(() => "---").join("|")}|${sizes.map(() => "---").join("|")}|---|`);
for (const r of rows) console.log(`| ${r.name} | ${pct(r.total, gold.length)} | ${fams.map((f) => r.fam[f]).join(" | ")} | ${sizes.map((z) => r.size[z]).join(" | ")} | ${r.unanswered} |`);
console.log("");
for (const r of rows) console.log(`${r.name} misses: ${r.misses.join(", ") || "none"}`);
