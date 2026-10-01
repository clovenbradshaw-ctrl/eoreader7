// Summarise sample-falsify rows: per task the pass rate and the mean fraction of runs failed under each judgement, and across tasks the PAIRED differences with a bootstrap interval.
// The unit of replication is the TASK (draws within a task are not independent evidence about a mechanism), so the interval resamples tasks, then draws within them.
import fs from "node:fs";
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
export function summarise(rows, { boot = 2000, seed = 7 } = {}) {
  const by = new Map(); for (const r of rows) (by.get(r.task) ?? by.set(r.task, []).get(r.task)).push(r);
  const tasks = [...by].map(([task, rs]) => ({ task, role: rs[0].role, n: rs.length, offered: rs[0].offered, samePrompt: rs[0].samePrompt,
    basePass: mean(rs.map((r) => +r.baseOk)), offeredRawPass: mean(rs.map((r) => +r.offeredRawOk)), readPass: mean(rs.map((r) => +r.readOk)),
    baseFail: mean(rs.map((r) => r.baseFail)), offeredRawFail: mean(rs.map((r) => r.offeredRawFail)), readFail: mean(rs.map((r) => r.readFail)),
    pairedReadVsRaw: mean(rs.map((r) => r.offeredRawFail - r.readFail)), changed: rs.filter((r) => r.transformations?.length).length }));
  let s = seed; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const diffs = { "offered prompt+wall vs base (pass rate)": (t) => t.offeredRawPass - t.basePass, "offered prompt+wall vs base (failed fraction, lower is better)": (t) => t.baseFail - t.offeredRawFail,
    "canonical reading vs raw, SAME draws (failed fraction)": (t) => t.pairedReadVsRaw, "everything (read) vs base (pass rate)": (t) => t.readPass - t.basePass };
  const overall = {};
  for (const [name, f] of Object.entries(diffs)) {
    const vals = tasks.map(f), point = mean(vals), bs = [];
    for (let b = 0; b < boot; b++) bs.push(mean(vals.map(() => vals[Math.floor(rnd() * vals.length)])));
    bs.sort((a, b) => a - b); overall[name] = { mean: point, lo: bs[Math.floor(boot * 0.025)], hi: bs[Math.floor(boot * 0.975)], tasks: vals.length };
  }
  return { tasks, overall };
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const rows = process.argv.slice(2).filter((a) => !a.startsWith("--")).flatMap((f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
  const { tasks, overall } = summarise(rows), p = (x) => (Number.isFinite(x) ? x.toFixed(2) : " -  ");
  console.log("task".padEnd(15) + "role".padEnd(9) + "n  offered".padEnd(40) + "pass(base/raw/read)   failed-fraction(base/raw/read)   paired read-raw");
  for (const t of tasks) console.log(t.task.padEnd(15) + String(t.role).padEnd(9) + `${t.n}  ${(t.offered ?? []).join(",") || "-"}${t.samePrompt ? " (same prompt)" : ""}`.padEnd(40) + `${p(t.basePass)} ${p(t.offeredRawPass)} ${p(t.readPass)}            ${p(t.baseFail)} ${p(t.offeredRawFail)} ${p(t.readFail)}            ${p(t.pairedReadVsRaw)} (${t.changed} rewritten)`);
  console.log("");
  for (const [k, v] of Object.entries(overall)) console.log(`${k.padEnd(66)} ${p(v.mean)}  [95% ${p(v.lo)}, ${p(v.hi)}] over ${v.tasks} tasks`);
}
