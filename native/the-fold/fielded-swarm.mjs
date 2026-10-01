// ═══ LOVELACE · TEACH IT TO FISH ═══ A SWARM OF FILLERS FOR EVERY SLOT — THE CHEAP SPECIES FIRST, THE MODEL FOR WHAT NONE OF THEM CAN FILL.
//
// The operator, 2026-10-01: "what if instead of using the LLM, or in addition to it, we send swarms at trying to fill the slot?" A slot here is one field of a unit's answer. The fillers are species that each
// try the slot a different way, are checked by the SAME test (the examples it was shown, then the runs it was not), and are tried in order of cost — the order the stigmergy would learn:
//   copy      the value sits at one input path in every example                          (prefill.mjs — milliseconds, no model)
//   compose   a small expression over the input, the cards the words name, the person's numbers   (synth-fields.mjs — about two seconds, no model)
//   mouth     the model, shown ONLY this field, with the well-defined void (context-dose.mjs rung D5)
// A slot is filled by the first species whose answer reproduces every run it was not shown; the mouth is asked only for the slots no cheaper species filled. The composed unit is then tested whole.
//   node native/the-fold/fielded-swarm.mjs [--model m] [--out rows.jsonl] [--tasks a,b]
import fs from "node:fs";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { readPrefill, heldOutAgreement } from "./prefill.mjs";
import { solveContract } from "./synth-fields.mjs";
import { fieldContract, composeFieldCode } from "./app-units.mjs";
import { rungPrompt, RUNGS } from "./context-dose.mjs";
import { runResults } from "./fold-experiment.mjs";

const OLLAMA = process.env.ER7_CHANNEL_URL ?? "http://127.0.0.1:11434";
async function complete(model, prompt, stop = ["\n}"]) {
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(240000),
    body: JSON.stringify({ model, prompt, raw: true, stream: false, options: { temperature: 0, num_predict: 450, stop } }) });
  if (!r.ok) throw new Error(`generate ${r.status}`); return (await r.json()).response ?? "";
}
/** `[0].stop_name` -> `stop.stop_name`: a copy path names the parameter by position */
const copyJs = (contract, from) => from.replace(/^\[(\d+)\]/, (_, i) => contract.params[Number(i)]).replace(/^(?=[A-Za-z_])/, "");

/** the cheap species: slots filled with no model -> { key: { species, js } } for a flat-object contract */
export function cheapFill(contract) {
  const out = {}, pre = readPrefill(contract, 3, { strict: false });
  if (pre.shape !== "object") return out;
  const agree = heldOutAgreement(contract, pre.fields);
  for (const f of pre.fields.filter((x) => x.kind === "copy")) {
    const one = heldOutAgreement(contract, [f]); if (one.total && one.right === one.total) out[f.key] = { species: "copy", js: copyJs(contract, f.from) };
  }
  for (const f of solveContract(contract).fields) if (f.kind === "solved" && !out[f.key]) out[f.key] = { species: "compose", js: f.js };
  void agree; return out;
}

/** SLOT mode: the model is shown the whole unit with every field the cheap species filled WRITTEN IN, and the file ends at the one blank — it completes an expression, in the register of the lines above it. */
export async function slotTask(d, { model, log = () => {} }) {
  const c = d.contract, wants = c.runs.slice(0, 3).map((r) => r.want());
  if (!wants.every((w) => w && typeof w === "object" && !Array.isArray(w))) return null;
  const keys = [...new Set(wants.flatMap(Object.keys))], cheap = cheapFill(c), codes = {}, row = { task: c.name, mode: "slot", keys, cheap: Object.fromEntries(Object.entries(cheap).map(([k, v]) => [k, v.species])), mouth: {}, mouthCalls: 0 };
  const args = c.params.join(", "), base = rungPrompt(c, RUNGS.D5);
  const known = () => Object.entries(codes).map(([k, js]) => `    ${k}: ${js},`);
  for (const k of keys) if (cheap[k]) codes[k] = cheap[k].js;
  for (const k of keys) {
    if (cheap[k]) continue;
    const prompt = `${base}  return {\n${[...known(), `    ${k}: `].join("\n")}`;
    const body = (await complete(model, prompt, ["\n    ", "\n  }", ",\n"])).replace(/,\s*$/, "").trim();
    row.mouthCalls++; const fc = fieldContract(c, k); fc.runs = fc.runs.map((r, i) => ({ ...r, want: () => c.runs[i].want()[k] }));
    const code = `function ${fc.name}(${args}) { return ${body}; }`; row.mouth[k] = runResults(code, fc, "exact").every(Boolean) ? "pass" : "fail"; codes[k] = body;
  }
  const unit = `function ${c.name}(${args}) {\n  return {\n${keys.map((k) => `    ${k}: ${codes[k]},`).join("\n")}\n  };\n}`, res = runResults(unit, c, "exact");
  row.all = res.every(Boolean); row.held = res.slice(3).filter(Boolean).length / Math.max(1, res.length - 3);
  log(row); return row;
}

export async function swarmTask(d, { model, log = () => {} }) {
  const c = d.contract, wants = c.runs.slice(0, 3).map((r) => r.want());
  if (!wants.every((w) => w && typeof w === "object" && !Array.isArray(w))) return null;
  const keys = [...new Set(wants.flatMap(Object.keys))], cheap = cheapFill(c), codes = {}, row = { task: c.name, keys, cheap: Object.fromEntries(Object.entries(cheap).map(([k, v]) => [k, v.species])), mouth: {}, mouthCalls: 0 };
  const args = c.params.join(", ");
  for (const k of keys) {
    if (cheap[k]) { codes[k] = `function ${k}Of(${args}) { return ${cheap[k].js}; }`; continue; }
    const fc = fieldContract(c, k); fc.runs = fc.runs.map((r, i) => ({ ...r, want: () => c.runs[i].want()[k] }));
    const head = `function ${fc.name}(${fc.params.join(", ")}) {`, code = `${head}${await complete(model, rungPrompt(fc, RUNGS.D5))}\n}`;
    row.mouthCalls++; const res = runResults(code, fc, "exact"); row.mouth[k] = res.every(Boolean) ? "pass" : "fail"; codes[k] = code;
  }
  const unit = composeFieldCode(c, keys, codes), res = runResults(unit, c, "exact");
  row.all = res.every(Boolean); row.held = res.slice(3).filter(Boolean).length / Math.max(1, res.length - 3);
  log(row); return row;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (k, def) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : def; };
  const model = arg("model", "qwen2.5-coder:1.5b"), out = arg("out", null), only = arg("tasks", null)?.split(","), rows = [];
  const run = process.argv.includes("--slots") ? slotTask : swarmTask;
  for (const d of [...DIVERSE, ...HELDOUT]) { if (only && !only.includes(d.contract.name)) continue; const r = await run(d, { model, log: (x) => { console.log(JSON.stringify(x)); if (out) fs.appendFileSync(out, JSON.stringify(x) + "\n"); } }); if (r) rows.push(r); }
  const slots = rows.reduce((a, r) => a + r.keys.length, 0), cheap = rows.reduce((a, r) => a + Object.keys(r.cheap).length, 0), mouth = rows.reduce((a, r) => a + r.mouthCalls, 0);
  console.log(`\n${rows.length} tasks with a flat-object result, ${slots} slots: ${cheap} filled by the cheap species, ${mouth} asked of the model; composed units passing: ${rows.filter((r) => r.all).length}/${rows.length}`);
}
