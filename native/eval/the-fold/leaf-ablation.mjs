// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 10 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// leaf-ablation.mjs — does a skeleton of the return literal (keys computed from the worked example, values left
// blank) raise the pass rate of a SMALL model drawing a leaf? One mouth at a time, no cache, no learned order:
// every leaf is drawn cold, and each arm is judged by the same oracles (app-leaves.mjs).
//
//   node native/eval/the-fold/leaf-ablation.mjs --model qwen2.5-coder:1.5b [--leaves a,b] [--out results/leaf-ablation-<model>.json]
//
// Reported per leaf and arm: did the FIRST draw pass (round 0), did it pass within the repair budget, calls, ms.
// Arms: plain (contract + real row + worked answer), skeleton (the same + the return literal's keys).
import fs from "node:fs";
import path from "node:path";
import { LEAF_CONTRACTS } from "../../the-fold/app-leaves.mjs";
import { makeUnit, makeMouth } from "../../the-fold/app-units.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const model = arg("model", "qwen2.5-coder:1.5b");
const only = arg("leaves", null)?.split(",") ?? null;
const out = arg("out", path.join(path.dirname(new URL(import.meta.url).pathname), "results", `leaf-ablation-${model.replace(/[^a-z0-9.]+/gi, "_")}.json`));
const mouth = makeMouth();
const rows = [];
for (const c of LEAF_CONTRACTS) {
  if (only && !only.includes(c.name)) continue;
  for (const arm of ["plain", "skeleton"]) {
    const draws = [];
    const see = (e, f) => { if (e === "unit-draw") draws.push({ round: f.round, ok: !!f.ok, ms: f.ms, tokens: f.tokens, skipped: f.skipped ?? null }); };
    const t0 = Date.now();
    const r = await makeUnit(c, { mouths: [model], mouth, see, rng: () => 0.99, skeleton: arm === "skeleton" });
    const row = { leaf: c.name, arm, model, round0: draws.find((d) => d.round === 0)?.ok ?? false, passed: r.ok, calls: r.calls, rounds: r.rounds, ms: Date.now() - t0 };
    rows.push(row);
    console.log(JSON.stringify(row));
  }
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ model, at: new Date().toISOString(), rows }, null, 1));
const tally = (arm, k) => rows.filter((r) => r.arm === arm && r[k]).length + "/" + rows.filter((r) => r.arm === arm).length;
console.log(`\n${model}  plain: first-draw ${tally("plain", "round0")}, within repair ${tally("plain", "passed")}   skeleton: first-draw ${tally("skeleton", "round0")}, within repair ${tally("skeleton", "passed")}`);
