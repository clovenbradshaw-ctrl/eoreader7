// DEV ONLY: how should stage 1 (ground in view, no preference in view) ask for options, so that what it lists is what the ground licenses?
import fs from "node:fs";
import { makeHolograph } from "../holograph.mjs";
import { fnv } from "../../reach/battery.mjs";
import { splitSentences } from "../../../adapters/text/spans.js";
const src = fs.readFileSync(new URL("./4-two-stage.mjs", import.meta.url), "utf8");
// reuse the dev task definitions by evaluating the block between the markers
const block = src.slice(src.indexOf("const has ="), src.indexOf("const SYS ="));
const DEVTASKS = new Function("return (() => { " + block + " return DEV; })()")();
const SYS = "You are helping someone with a request.";
const V = {
  fill5: (t) => `Give up to 5 different options, best first: the first is your recommendation and the others are alternatives. Every option chooses exactly one value for each of: ${t.slots.map((s) => s.key).join(", ")}.`,
  fit: (t) => `List the options that fit this situation, best first. Only options that fit — fewer is fine, at most 5. Every option chooses exactly one value for each of: ${t.slots.map((s) => s.key).join(", ")}.`,
};
const optSchema = (t, n) => ({ type: "object", properties: { options: { type: "array", maxItems: n, items: { type: "object", properties: Object.fromEntries(t.slots.map((s) => [s.key, { type: "string", enum: s.values }])), required: t.slots.map((s) => s.key) } } }, required: ["options"] });
const H = await makeHolograph();
const out = [];
for (const t of DEVTASKS.filter((x) => x.kind === "conflict")) {
  const h = H.hand(t); const task = splitSentences(t.request)[0].text;
  for (const [name, ask] of Object.entries(V)) {
    let n = 0, valid = 0, first = 0, runs = 0, sizes = [];
    for (let rep = 0; rep < 8; rep += 1) {
      const res = await fetch("http://127.0.0.1:11434/api/chat", { method: "POST", body: JSON.stringify({ model: "gemma2:2b", stream: false, format: optSchema(t, 5), options: { temperature: 0.3, seed: fnv(`${t.id}|${name}|${rep}`), num_predict: 360 }, messages: [{ role: "system", content: `${SYS}\n\n${h.text}` }, { role: "user", content: `Task: ${task}\n\nOptions you may choose from:\n${t.catalogText}\n\n${ask(t)}` }] }) });
      let opts = []; try { opts = JSON.parse((await res.json()).message.content).options ?? []; } catch {}
      const uniq = [...new Map(opts.map((o) => [t.slots.map((s) => o[s.key]).join("|"), o])).values()];
      runs += 1; n += uniq.length; valid += uniq.filter((o) => t.harmed(o).length === 0).length; first += uniq[0] && t.harmed(uniq[0]).length === 0 ? 1 : 0; sizes.push(uniq.length);
    }
    console.log(`${t.id.padEnd(8)} ${name.padEnd(6)} listed ${n} options over ${runs} runs (sizes ${sizes.join(",")}), valid ${valid}/${n}, first valid ${first}/${runs}`);
  }
}
