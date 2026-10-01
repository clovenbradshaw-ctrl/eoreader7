// ═══ LOVELACE · TEACH IT TO FISH ═══ ARE THE HELPER OPERATIONS NEEDED, OR DO THEY COVER FOR POOR PROMPTING?
//
// The cards (organs/cards.js: padTime, roundTo, parseMoney, daysBetween, splitWords, haversineKm, ...) were added when draws from the INSTRUCTION prompt re-implemented
// operations wrongly. If a well-defined void (examples, the types they show, completion form — no prohibitions) lets the bare model write them itself, the cards were
// a patch for the prompt. This holds the prompt fixed at the well-defined one and varies ONLY the helpers:
//
//   TH  helpers in scope, shown as code the model continues from, and callable on the wall
//   TN  no helpers shown and none on the wall — a call to one is a ReferenceError
//
// A task no card applies to has byte-identical TH and TN prompts: the two draws there are the NOISE FLOOR. T=0 draws repeat n times per cell.
//   node native/the-fold/helper-necessity.mjs [--model m] [--n 2] [--out rows.jsonl]
import fs from "node:fs";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { cardsFor } from "../organs/cards.js";
import { simplePrompt, runResults } from "./fold-experiment.mjs";

const OLLAMA = process.env.ER7_CHANNEL_URL ?? "http://127.0.0.1:11434";
async function complete(model, prompt) {
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(240000),
    body: JSON.stringify({ model, prompt, raw: true, stream: false, options: { temperature: 0, num_predict: 400, stop: ["\n}"] } }) });
  if (!r.ok) throw new Error(`generate ${r.status}`);
  return (await r.json()).response ?? "";
}
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const model = arg("model", "qwen2.5-coder:1.5b"), n = Number(arg("n", 2)), out = arg("out", null);
const rows = [];
for (const d of [...DIVERSE, ...HELDOUT]) {
  const c = d.contract, head = `function ${c.name}(${c.params.join(", ")}) {`, offered = cardsFor(c).map((x) => x.name);
  const arms = { TH: { helpers: true, cards: "exact" }, TN: { helpers: false, cards: false } };
  const row = { task: c.name, role: d.role, offered, identicalPrompts: simplePrompt(c, 3, { typed: true, helpers: true }) === simplePrompt(c, 3, { typed: true, helpers: false }) };
  for (const [arm, o] of Object.entries(arms)) {
    const prompt = simplePrompt(c, 3, { typed: true, helpers: o.helpers }); row[`${arm}_chars`] = prompt.length; row[`${arm}_pass`] = 0; row[`${arm}_calls`] = 0;
    for (let i = 0; i < n; i++) {
      const code = `${head}${await complete(model, prompt)}\n}`, res = runResults(code, c, o.cards);
      row[`${arm}_pass`] += +res.every(Boolean); row[`${arm}_calls`] += +offered.some((k) => new RegExp(`\\b${k}\\(`).test(code));
      if (i === 0) row[`${arm}_code`] = code.slice(0, 900);
    }
  }
  rows.push(row); console.log(JSON.stringify({ ...row, TH_code: undefined, TN_code: undefined })); if (out) fs.appendFileSync(out, JSON.stringify(row) + "\n");
}
const sum = (rs, k) => rs.reduce((a, r) => a + r[k], 0), w = rows.filter((r) => !r.identicalPrompts), c = rows.filter((r) => r.identicalPrompts);
console.log(`\nwhere helpers differ the prompt (${w.length} tasks x ${n} draws): TH ${sum(w, "TH_pass")}/${w.length * n}  TN ${sum(w, "TN_pass")}/${w.length * n}`);
console.log(`noise floor, identical prompts (${c.length} tasks x ${n} draws): TH ${sum(c, "TH_pass")}/${c.length * n}  TN ${sum(c, "TN_pass")}/${c.length * n}`);
console.log(`prompt chars where they differ: TH ${Math.round(sum(w, "TH_chars") / w.length)}  TN ${Math.round(sum(w, "TN_chars") / w.length)}`);
