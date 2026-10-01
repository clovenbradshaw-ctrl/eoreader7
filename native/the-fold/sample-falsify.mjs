// ═══ LOVELACE · TEACH IT TO FISH ═══ The sampled falsification. diverse-falsify.mjs draws ONE program per (task, arm) and reads the row as the cell — but a prompt at
// temperature 0 is a DISTRIBUTION on this server (measured 2026-10-01: the same prompt, six draws, two different programs, two passes). A flip between two single draws is
// not a finding. So: n draws per task, and the SAME draw is judged three ways —
//   base     the draw from the bare prompt, judged with nothing but the wall's empty context
//   offered  the draw from the prompt with the cards the clause names, judged raw with the cards declared and the key resolver on (the WALL, no rewriting)
//   read     that same draw after the canonical reading (code-canonical.js) — so the reading's effect is a PAIRED difference on one draw, free of draw noise
// First draw only: no repair rounds, no second mouth — what a prompt and a reading buy before any retry.
//
//   node native/the-fold/sample-falsify.mjs [--n 6] [--model qwen2.5-coder:1.5b] [--set diverse|heldout|both] [--tasks a,b] [--out rows.jsonl]
import fs from "node:fs";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { unitPrompt, makeMouth, testUnit, extractCode, readSuggestion, failedRuns, cardsShown } from "./app-units.mjs";

export const ARM_FLAGS = { base: { resolve: false, cards: false, hints: false }, offered: { resolve: true, cards: true, hints: true } };

export async function sampleTask(d, { mouth, model, n, out = null, log = () => {} }) {
  const rows = [], c = d.contract, runs = c.runs.length;
  const frac = (contract, failures) => failedRuns(contract, failures) / runs;
  const baseC = { ...c, ...ARM_FLAGS.base }, offC = { ...c, ...ARM_FLAGS.offered };
  const baseP = unitPrompt(baseC), offP = unitPrompt(offC), samePrompt = baseP === offP;
  for (let i = 0; i < n; i++) {
    const row = { task: c.name, role: d.role, model, i, offered: cardsShown(offC), samePrompt };
    const b = await mouth(model, baseP), code = extractCode(b.text, c.name);
    if (code) { const t = testUnit(code, baseC); Object.assign(row, { baseOk: t.ok, baseFail: t.ok ? 0 : frac(baseC, t.failures) }); } else Object.assign(row, { baseOk: false, baseFail: 1, baseNoCode: true });
    // when the two prompts are byte-identical the draw is the SAME sample space: draw again rather than reuse, so base and offered stay independent draws
    const o = await mouth(model, offP), oc = extractCode(o.text, c.name);
    if (oc) {
      const raw = testUnit(oc, offC), read = readSuggestion(oc, offC);
      Object.assign(row, { offeredRawOk: raw.ok, offeredRawFail: raw.ok ? 0 : frac(offC, raw.failures), readOk: read.res.ok, readFail: read.res.ok ? 0 : frac(offC, read.res.failures), transformations: (read.canonical.transformations ?? []).map((t) => t.kind), refused: Boolean(read.canonical.refused) });
    } else Object.assign(row, { offeredRawOk: false, offeredRawFail: 1, readOk: false, readFail: 1, offeredNoCode: true, transformations: [] });
    rows.push(row); if (out) fs.appendFileSync(out, JSON.stringify(row) + "\n"); log(row);
  }
  return rows;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (k, def) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : def; };
  const n = Number(arg("n", 6)), model = arg("model", "qwen2.5-coder:1.5b"), which = arg("set", "both"), only = arg("tasks", null)?.split(","), out = arg("out", null);
  const set = which === "diverse" ? DIVERSE : which === "heldout" ? HELDOUT : [...DIVERSE, ...HELDOUT];
  const mouth = makeMouth();
  for (const d of set) {
    if (only && !only.includes(d.contract.name)) continue;
    await sampleTask(d, { mouth, model, n, out, log: (r) => console.log(JSON.stringify(r)) });
  }
}
