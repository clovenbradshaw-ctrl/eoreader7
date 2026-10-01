// Summarise context-dose rows: per rung the full-pass count, the mean held-out fraction, Nagarjuna's states and the false-bound count, and between adjacent rungs the PAIRED
// difference with a bootstrap interval over tasks (the task is the unit of replication; a draw within a task is not independent evidence about a rung).
import fs from "node:fs";
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
export const RUNG_ORDER = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "R1"];
export const COMPARES = [["D0", "D1"], ["D1", "D2"], ["D2", "D3"], ["D3", "D4"], ["D4", "D5"], ["D5", "D6"], ["D5", "D7"], ["D5", "R1"]];
export function summariseDose(rows, { boot = 4000, seed = 11 } = {}) {
  const rungs = RUNG_ORDER.filter((k) => rows.some((r) => r[k]));
  const per = Object.fromEntries(rungs.map((k) => {
    const rs = rows.map((r) => r[k]).filter(Boolean), st = (s) => rs.filter((x) => x.state === s).length;
    return [k, { n: rs.length, full: rs.filter((x) => x.all).length, held: mean(rs.map((x) => x.held)), bound: st("bound"), contradicted: st("contradicted"), unbound: st("unbound"), beyond: st("beyond-reach"),
      falseBound: rs.filter((x) => x.state === "bound" && !x.all).length, chars: Math.round(mean(rs.map((x) => x.chars).filter((c) => c > 0))), draws: rs.reduce((a, x) => a + (x.draws ?? 1), 0) }];
  }));
  let s = seed; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const diffs = COMPARES.filter(([a, b]) => per[a] && per[b]).map(([a, b]) => {
    const vals = rows.filter((r) => r[a] && r[b]).map((r) => (+r[b].all) - (+r[a].all)), bs = [];
    for (let i = 0; i < boot; i++) bs.push(mean(vals.map(() => vals[Math.floor(rnd() * vals.length)])));
    bs.sort((x, y) => x - y); const gain = vals.filter((v) => v > 0).length, loss = vals.filter((v) => v < 0).length;
    return { from: a, to: b, mean: mean(vals), lo: bs[Math.floor(boot * 0.025)], hi: bs[Math.floor(boot * 0.975)], gain, loss, tasks: vals.length };
  });
  return { per, diffs };
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const rows = process.argv.slice(2).filter((a) => !a.startsWith("--")).flatMap((f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
  const { per, diffs } = summariseDose(rows), p = (x) => (Number.isFinite(x) ? x.toFixed(2) : "  - ");
  console.log("rung  full  held  bound contra  beyond  falseBound  chars  draws");
  for (const [k, v] of Object.entries(per)) console.log(`${k.padEnd(5)} ${String(v.full).padStart(2)}/${v.n}  ${p(v.held)}  ${String(v.bound).padStart(4)} ${String(v.contradicted).padStart(6)} ${String(v.beyond).padStart(7)} ${String(v.falseBound).padStart(10)}  ${String(v.chars || "-").padStart(5)}  ${v.draws}`);
  console.log("\npaired change in full-pass indicator, per task (gain = tasks that went fail→pass, loss = pass→fail)");
  for (const d of diffs) console.log(`${d.from}→${d.to}  ${d.mean >= 0 ? "+" : ""}${p(d.mean)}  [95% ${p(d.lo)}, ${p(d.hi)}]  +${d.gain} −${d.loss} over ${d.tasks} tasks`);
}
