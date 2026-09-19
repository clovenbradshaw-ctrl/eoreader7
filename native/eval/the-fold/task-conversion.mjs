// task-conversion.mjs — per-system conversion lens over every harness run.
//
// Reads every harness-rounds-<stamp>-<task>.json under RESULTS_DIR and
// reports, per task AND per condition tuple (mouth, candidates, budget),
// how many draws it burned and how many greens it scored. Every round
// records its own draw index and kelsen (temperature) so the lens can
// also split by temperature band — draws from different temperatures
// are NOT i.i.d., and a rate pooled across them corresponds to no
// single sampling distribution.
//
// Why this exists (2026-09-19, born-rule audit): pass/fail per battery
// reads a rare-but-real success as a wall; a rate pooled across mouths
// is nobody's rate. The two greens in Basic/15 belonged to DIFFERENT
// systems (Haiku and a local mouth); "2/191 = 1%" was a superposition.
// This lens keeps the systems apart.
//
// Usage: node native/eval/the-fold/task-conversion.mjs [task-id]
//   no args: all tasks, per-system rows sorted by draws-per-green.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(HERE, "results");

// Exact mapping from proxy-runner.mjs:2874 — temperature = 0.1 + (1 - kelsen) * 0.8.
// kelsen 0.9 → 0.18 (cold, exploit), kelsen 0.2 → 0.74 (hot, explore).
const KELSEN_TEMP = (k) => (k == null ? null : Math.round((0.1 + (1 - k) * 0.8) * 100) / 100);
const band = (kelsen) => {
  if (kelsen == null) return "cold";
  const t = KELSEN_TEMP(kelsen);
  if (t < 0.3) return "cold";
  if (t < 0.6) return "mid";
  return "hot";
};

function identityKey(body) {
  return (body ?? "").replace(/\s+/g, " ").trim();
}

function loadRuns() {
  const runs = new Map(); // "task|mouth|cands" -> { task, mouth, cands, draws, greens, cold, comps, repeats, bands }
  for (const f of fs.readdirSync(RESULTS_DIR)) {
    if (!f.startsWith("harness-rounds-") || !f.endsWith(".json")) continue;
    const base = f.slice("harness-rounds-".length, -".json".length);
    // Stamp is `...T..-..-..-...Z`, task follows the trailing `Z-` with
    // slashes replaced by dashes (Basic/15 → Basic-15). Everything after
    // the last `Z-` is the task id; restore the slash.
    const zi = base.lastIndexOf("Z-");
    const task = zi >= 0 ? base.slice(zi + 2).replace(/-/g, "/") : base;
    if (!task) continue;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), "utf8"));
    } catch {
      continue;
    }
    const meta = data && !Array.isArray(data) ? data.meta ?? {} : {};
    const rounds = Array.isArray(data) ? data : data.rounds ?? [];
    const mouth = meta.model ?? "unknown";
    const cands = meta.candidates ?? "?";
    const key = `${task}|${mouth}|${cands}`;
    const entry = runs.get(key) ?? { task, mouth, cands, draws: 0, greens: 0, cold: 0, comps: 0, repeats: 0, bands: { cold: 0, mid: 0, hot: 0 } };
    const seen = new Set();
    let first = true;
    for (const r of rounds) {
      if (!r || r.action !== "patch" || !r.add) continue;
      entry.draws += 1;
      const key2 = identityKey(r.add);
      if (seen.has(key2)) entry.repeats += 1;
      seen.add(key2);
      if (r.testExitCode === 0) {
        entry.greens += 1;
        if (first && r.round === 1) entry.cold += 1;
      }
      first = false;
      const b = band(r.kelsen);
      entry.bands[b] += 1;
    }
    runs.set(key, entry);
  }
  return [...runs.values()].sort((a, b) => {
    const ag = a.greens ? a.draws / a.greens : Infinity;
    const bg = b.greens ? b.draws / b.greens : Infinity;
    return bg - ag || b.draws - a.draws;
  });
}

const filter = process.argv[2];
const runs = loadRuns().filter((r) => !filter || r.task === filter);

console.log("task   mouth           cands  draws  greens  d/g   cold  repeats  cold/mid/hot");
for (const r of runs) {
  const rate = r.greens ? (r.draws / r.greens).toFixed(1) : "—";
  console.log(
    `${r.task.padEnd(6)} ${r.mouth.padEnd(15)} ${String(r.cands).padStart(4)} ${String(r.draws).padStart(5)} ${String(r.greens).padStart(6)}  ${String(rate).padStart(4)} ${String(r.cold).padStart(4)} ${String(r.repeats).padStart(7)}  ${r.bands.cold}/${r.bands.mid}/${r.bands.hot}`,
  );
}
console.log(`\n${runs.length} system(s), ${runs.reduce((s, r) => s + r.draws, 0)} total draws, ${runs.reduce((s, r) => s + r.greens, 0)} total greens.`);