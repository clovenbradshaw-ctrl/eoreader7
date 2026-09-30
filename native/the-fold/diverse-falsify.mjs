// ═══ LOVELACE · TEACH IT TO FISH ═══ The falsification run: the same small mouths, the same tasks, each mechanism switched on in turn.
//
//   node native/the-fold/diverse-falsify.mjs [--arms base,keys,cards,all] [--tasks busTimes,...] [--out results.jsonl] [--mouths a,b]
//
// Arms (cumulative): base = a plain draw and the oracle's failures (what the pipeline did before today); keys = + the key-referent layer;
// cards = + the verified operations in the prompt and the wall; all = + the repair hints. One row per (task, arm). Temperature is 0 and
// nothing is cached, so a row IS its cell. The claim "a mechanism helps" is falsified by a row pair that does not bear it out — and the
// controls (tasks with no relevant card) say whether a mechanism carries a COST.
import fs from "node:fs";
import { DIVERSE } from "./diverse-tasks.mjs";
import { makeUnit, makeMouth } from "./app-units.mjs";
import { DEFAULT_MOUTHS } from "./app-generate.mjs";

export const ARMS = {
  base: { resolve: false, cards: false, hints: false },
  keys: { resolve: true, cards: false, hints: false },
  cards: { resolve: true, cards: true, hints: false },
  all: { resolve: true, cards: true, hints: true },
};

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const arms = arg("arms", "base,all").split(","), only = arg("tasks", null)?.split(",") ?? null, mouths = arg("mouths", DEFAULT_MOUTHS.join(",")).split(",");
  const out = arg("out", null), mouth = makeMouth();
  for (const d of DIVERSE) {
    if (only && !only.includes(d.contract.name)) continue;
    for (const arm of arms) {
      const t0 = Date.now();
      // every draw (its code, its failures) is kept beside the rows: a row says THAT an arm failed, the draws say WHY
      const see = (event, f) => { if (out && event === "unit-draw") fs.appendFileSync(out.replace(/\.jsonl$/, "") + ".draws.jsonl", JSON.stringify({ task: d.contract.name, arm, ...f }) + "\n"); };
      const r = await makeUnit({ ...d.contract, ...ARMS[arm] }, { mouths, mouth, cache: null, rng: () => 0.99, explore: 0, see });
      const row = { task: d.contract.name, role: d.role, arm, ok: r.ok, model: r.model, calls: r.calls, rounds: r.rounds, secs: Math.round((Date.now() - t0) / 1000), cards: r.ok ? (r.resolutions ?? []).filter((x) => x.kind === "card").map((x) => `${x.asked}${x.real ? `→${x.real}` : x.ambiguous ? "?" : "✗"}`) : undefined, keys: r.ok ? (r.resolutions ?? []).filter((x) => !x.kind).map((x) => `${x.asked}→${x.real ?? "?"}`) : undefined, fail: r.ok ? undefined : (r.failures?.[0] ?? "").slice(0, 140) };
      console.log(JSON.stringify(row));
      if (out) fs.appendFileSync(out, JSON.stringify({ at: new Date().toISOString(), ...row }) + "\n");
    }
  }
}
