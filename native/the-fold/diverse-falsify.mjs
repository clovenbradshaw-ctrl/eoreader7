// ═══ LOVELACE · TEACH IT TO FISH ═══ The falsification run: the same small mouths, the same tasks, each mechanism switched on in turn.
//
//   node native/the-fold/diverse-falsify.mjs [--arms base,keys,cards,all,fold,carry] [--set diverse|all|heldout] [--tasks busTimes,...] [--out results.jsonl] [--mouths a,b]
//
// Arms (cumulative): base = a plain draw and the oracle's failures (what the pipeline did before today); keys = + the key-referent layer;
// cards = + the verified operations in the prompt and the wall; all = + the repair hints. One row per (task, arm). Temperature is 0 and
// nothing is cached, so a row IS its cell. The claim "a mechanism helps" is falsified by a row pair that does not bear it out — and the
// controls (tasks with no relevant card) say whether a mechanism carries a COST.
import fs from "node:fs";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { LEAF_CONTRACTS } from "./app-leaves.mjs";
import { makeUnit, makeMouth, failedRuns } from "./app-units.mjs";
import { DEFAULT_MOUTHS } from "./app-generate.mjs";

export const ARMS = {
  base: { resolve: false, cards: false, hints: false },
  keys: { resolve: true, cards: false, hints: false },
  cards: { resolve: true, cards: true, hints: false },
  all: { resolve: true, cards: true, hints: true },
  // the prompt is built from the FOLD (the canonical current version + what the reading established, in plain words) instead of the model's own words back at it
  fold: { resolve: true, cards: true, hints: true, repair: "fold" },
  // ... and a second mouth starts from the fold the first one left
  carry: { resolve: true, cards: true, hints: true, repair: "fold", carry: true },
};
/** run options that are not contract switches */
const RUN_OPTS = ["repair", "carry"];

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const arms = arg("arms", "base,all").split(","), only = arg("tasks", null)?.split(",") ?? null, mouths = arg("mouths", DEFAULT_MOUTHS.join(",")).split(",");
  const out = arg("out", null), mouth = makeMouth();
  // --set all: the weather/fuel leaves too (their `units` selector is where the meaning failures are)
  const which = arg("set", "diverse");
  const set = which === "all" ? [...DIVERSE, ...LEAF_CONTRACTS.map((contract) => ({ contract, role: "weather" }))] : which === "heldout" ? HELDOUT : DIVERSE;
  for (const d of set) {
    if (only && !only.includes(d.contract.name)) continue;
    for (const arm of arms) {
      const t0 = Date.now();
      // every draw (its code, its failures) is kept beside the rows: a row says THAT an arm failed, the draws say WHY
      const see = (event, f) => { if (out && event === "unit-draw") fs.appendFileSync(out.replace(/\.jsonl$/, "") + ".draws.jsonl", JSON.stringify({ task: d.contract.name, arm, ...f }) + "\n"); };
      const flags = Object.fromEntries(Object.entries(ARMS[arm]).filter(([k]) => !RUN_OPTS.includes(k))), opts = Object.fromEntries(Object.entries(ARMS[arm]).filter(([k]) => RUN_OPTS.includes(k)));
      const r = await makeUnit({ ...d.contract, ...flags }, { mouths, mouth, cache: null, rng: () => 0.99, explore: 0, see, ...opts });
      const row = { task: d.contract.name, role: d.role, arm, ok: r.ok, model: r.model, calls: r.calls, rounds: r.rounds, failedRuns: r.ok ? 0 : failedRuns(d.contract, r.failures ?? []), of: d.contract.runs.length, secs: Math.round((Date.now() - t0) / 1000), cards: r.ok ? (r.resolutions ?? []).filter((x) => x.kind === "card").map((x) => `${x.asked}${x.real ? `→${x.real}` : x.ambiguous ? "?" : "✗"}`) : undefined, keys: r.ok ? (r.resolutions ?? []).filter((x) => !x.kind).map((x) => `${x.asked}→${x.real ?? "?"}`) : undefined, fail: r.ok ? undefined : (r.failures?.[0] ?? "").slice(0, 140) };
      console.log(JSON.stringify(row));
      if (out) fs.appendFileSync(out, JSON.stringify({ at: new Date().toISOString(), ...row }) + "\n");
    }
  }
}
