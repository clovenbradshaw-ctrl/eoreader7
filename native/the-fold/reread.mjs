// ═══ LOVELACE ═══ Re-read a saved CORPUS of draws with the CURRENT reading — no model call, no draw noise. A sample run keeps each draw's code (sample-falsify.mjs); the reading is then
// iterated against those fixed suggestions, so a change to it is judged on exactly the same draws it was written for... and on none it was not, which is why the held-out draws matter.
//
//   node native/the-fold/reread.mjs rows.jsonl [more.jsonl ...]     (rows must carry offeredCode)
import fs from "node:fs";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { testUnit, readSuggestion, failedRuns } from "./app-units.mjs";
import { ARM_FLAGS } from "./sample-falsify.mjs";

const byName = Object.fromEntries([...DIVERSE, ...HELDOUT].map((d) => [d.contract.name, d]));
export function rereadRows(rows) {
  const out = [];
  for (const r of rows) {
    if (!r.offeredCode || !byName[r.task]) continue;
    const c = { ...byName[r.task].contract, ...ARM_FLAGS.offered }, runs = c.runs.length;
    const raw = testUnit(r.offeredCode, c), read = readSuggestion(r.offeredCode, c);
    out.push({ task: r.task, role: byName[r.task].role, i: r.i, rawOk: raw.ok, readOk: read.res.ok, rawFail: raw.ok ? 0 : failedRuns(c, raw.failures) / runs, readFail: read.res.ok ? 0 : failedRuns(c, read.res.failures) / runs, kinds: (read.canonical.transformations ?? []).map((t) => t.kind), refused: read.canonical.refused ?? null });
  }
  return out;
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const rows = process.argv.slice(2).filter((a) => !a.startsWith("--")).flatMap((f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
  const res = rereadRows(rows), by = new Map(); for (const r of res) (by.get(r.task) ?? by.set(r.task, []).get(r.task)).push(r);
  const m = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  console.log("task".padEnd(15) + "n   pass raw -> read   failed raw -> read   rewrites");
  for (const [t, rs] of by) { const kinds = {}; for (const r of rs) for (const k of r.kinds) kinds[k] = (kinds[k] ?? 0) + 1; console.log(t.padEnd(15) + `${String(rs.length).padEnd(3)} ${m(rs.map((r) => +r.rawOk)).toFixed(2)} -> ${m(rs.map((r) => +r.readOk)).toFixed(2)}        ${m(rs.map((r) => r.rawFail)).toFixed(2)} -> ${m(rs.map((r) => r.readFail)).toFixed(2)}          ${Object.entries(kinds).map(([k, n]) => `${k}×${n}`).join(" ") || "-"}`); }
  const worse = res.filter((r) => r.readFail > r.rawFail + 1e-9);
  console.log(`\\ndraws made WORSE by the reading: ${worse.length} of ${res.length}`);
  console.log(`pass raw ${m(res.map((r) => +r.rawOk)).toFixed(3)} -> read ${m(res.map((r) => +r.readOk)).toFixed(3)}; failed fraction raw ${m(res.map((r) => r.rawFail)).toFixed(3)} -> read ${m(res.map((r) => r.readFail)).toFixed(3)}`);
}
