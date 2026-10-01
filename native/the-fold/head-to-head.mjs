// ═══ LOVELACE · TEACH IT TO FISH ═══ THE CHEAP SPECIES AGAINST THE MODEL, UNIT FOR UNIT. Same tasks, the same oracles. The swarm is the cheap species (fielded-swarm.mjs cheapFill, no model); the model is ONE whole-unit draw at
// temperature 0 with the best prompt found (context-dose.mjs rung D5). A cascade is the swarm first and the model's whole-unit draw only for a unit the swarm could not finish.
//   node native/the-fold/head-to-head.mjs [--model m]
import { FRESH } from "./diverse-fresh.mjs";
import { FRESH_C } from "./diverse-fresh-c.mjs";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { cheapFill } from "./fielded-swarm.mjs";
import { rungPrompt, RUNGS } from "./context-dose.mjs";
import { runResults } from "./fold-experiment.mjs";
import { composeFieldCode } from "./app-units.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const base = process.env.ER7_CHANNEL_URL ?? "http://127.0.0.1:11434", model = arg("model", "qwen2.5-coder:1.5b"), out = {};
for (const [set, ds] of Object.entries({ A: [...DIVERSE, ...HELDOUT], B: FRESH, C: FRESH_C })) for (const d of ds) {
  const c = d.contract, w = c.runs[0].want(); if (!w || typeof w !== "object" || Array.isArray(w)) continue;
  const keys = Object.keys(w), cheap = cheapFill(c), whole = keys.every((k) => cheap[k]);
  let swarm = false; if (whole) { const codes = Object.fromEntries(keys.map((k) => [k, `function ${k}Of(${c.params.join(", ")}) { return ${cheap[k].js}; }`])); swarm = runResults(composeFieldCode(c, keys, codes), c, "exact").every(Boolean); }
  const r = await fetch(`${base}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, prompt: rungPrompt(c, RUNGS.D5), raw: true, stream: false, options: { temperature: 0, num_predict: 450, stop: ["\n}"] } }) });
  const code = `function ${c.name}(${c.params.join(", ")}) {${(await r.json()).response ?? ""}\n}`, mouth = runResults(code, c, "exact").every(Boolean);
  (out[set] ??= []).push({ task: c.name, swarm, mouth });
  console.log(set, c.name.padEnd(12), "swarm", swarm ? "PASS" : (whole ? "fail" : "partial"), " model", mouth ? "PASS" : "fail");
}
let s = 0, m = 0, k = 0, n = 0;
for (const [set, rs] of Object.entries(out)) { const sw = rs.filter((x) => x.swarm).length, mo = rs.filter((x) => x.mouth).length, cas = rs.filter((x) => x.swarm || x.mouth).length; s += sw; m += mo; k += cas; n += rs.length;
  console.log(set, `swarm ${sw}/${rs.length}  model ${mo}/${rs.length}  swarm-only ${rs.filter((x) => x.swarm && !x.mouth).length}  model-only ${rs.filter((x) => !x.swarm && x.mouth).length}  cascade ${cas}/${rs.length}`); }
console.log(`all: swarm ${s}/${n}  model ${m}/${n}  cascade ${k}/${n}`);
