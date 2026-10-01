// ═══ LOVELACE · TEACH IT TO FISH ═══ HOW MUCH CONTEXT? A DOSE-RESPONSE, NOT AN OPINION.
//
// The operator, 2026-10-01: "are we also starving it of actually useful context? Let's not be more minimalistic than needed. We should see what the sweet spot is of giving it
// more context so we can be more precise but not get distracted."  The first minimal prompt (doc, shape, three examples, relevant helpers) beat a pile of rewrite rules — but
// "simpler than the pile" is not "enough". This climbs a ladder of context, one rung at a time, with ONE draw per cell at temperature 0, and reads where the curve flattens or turns down.
//
// The ladder is cumulative up to D5 (the current well-defined void); D6/D7 are distractor rungs added on top of D5; R1 is the one rung that is a second draw.
//   D0  the signature and the one-line doc                       (starved)
//   D1  + what it returns, and the notes (conventions)           (the person's own words about the hole)
//   D2  + ONE worked example
//   D3  + three worked examples
//   D4  + the types those examples show (takes / returns)
//   D5  + the helper operations the unit's own words name        (== the well-defined void)
//   D6  D5 + the file around it: every OTHER unit's signature and doc (related, plausible, irrelevant to this body)
//   D7  D5 + all twelve helper operations                        (a distractor: most are for other tasks)
//   R1  D5, then — only if the draw missed an example it was shown — ONE more draw that is shown its own first attempt and what that gave for the example it missed
//
// Scored on every run of the contract; the first three are the examples any rung can show, the rest are held out from every rung. `state` is Nagarjuna's reading of the draw
// against the examples ITS rung showed (void-state.mjs). Pairs of rungs are compared by bootstrap over tasks.
//   node native/the-fold/context-dose.mjs [--model m] [--out rows.jsonl] [--tasks a,b]
import fs from "node:fs";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { cardsFor, CARDS } from "../organs/cards.js";
import { typeShape, runResults, runDetail } from "./fold-experiment.mjs";
import { drawState } from "./void-state.mjs";

const OLLAMA = process.env.ER7_CHANNEL_URL ?? "http://127.0.0.1:11434", json = (v) => JSON.stringify(v);
export const RUNGS = Object.freeze({
  D0: { returns: false, examples: 0, types: false, helpers: "none", siblings: false },
  D1: { returns: true, examples: 0, types: false, helpers: "none", siblings: false },
  D2: { returns: true, examples: 1, types: false, helpers: "none", siblings: false },
  D3: { returns: true, examples: 3, types: false, helpers: "none", siblings: false },
  D4: { returns: true, examples: 3, types: true, helpers: "none", siblings: false },
  D5: { returns: true, examples: 3, types: true, helpers: "relevant", siblings: false },
  D6: { returns: true, examples: 3, types: true, helpers: "relevant", siblings: true },
  D7: { returns: true, examples: 3, types: true, helpers: "all", siblings: false },
});

/** the prompt for one rung: a file that holds whatever context the rung carries, ending where the function begins */
export function rungPrompt(contract, o, { siblings = [], previous = null } = {}) {
  const runs = contract.runs.slice(0, o.examples), lines = [];
  if (o.siblings && siblings.length) lines.push("// The rest of this file:", ...siblings.map((s) => `//   ${s.name}(${s.params.join(", ")}): ${s.doc}`), "//");
  lines.push(`// ${contract.doc}`);
  if (o.returns) lines.push(...String(contract.returns).split("\n").map((l) => `// ${l.trim()}`), ...(contract.notes ? [`// ${contract.notes}`] : []));
  if (o.types && runs.length) lines.push(`// takes: (${contract.params.map((p, i) => `${p}: ${typeShape(runs.map((r) => r.args()[i]))}`).join(", ")})`, `// returns: ${typeShape(runs.map((r) => r.want()))}`);
  if (runs.length) { lines.push("//", "// Examples:"); for (const r of runs) lines.push(`//   ${contract.name}(${r.args().map(json).join(", ")}) -> ${json(r.want())}`); }
  const names = o.helpers === "all" ? Object.keys(CARDS) : o.helpers === "relevant" ? cardsFor(contract).map((c) => c.name) : [];
  const helpers = names.map((n) => CARDS[n].fn.toString());
  const tail = previous ? `${previous.code}\n// ${previous.note}\n` : "";
  return `${lines.join("\n")}\n\n${helpers.length ? `${helpers.join("\n")}\n\n` : ""}${tail}function ${contract.name}(${contract.params.join(", ")}) {\n`;
}

async function complete(model, prompt) {
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(240000),
    body: JSON.stringify({ model, prompt, raw: true, stream: false, options: { temperature: 0, num_predict: 450, stop: ["\n}"] } }) });
  if (!r.ok) throw new Error(`generate ${r.status}`);
  return (await r.json()).response ?? "";
}
const SHOWN_MAX = 3;
const score = (res) => ({ all: res.every(Boolean), held: res.slice(SHOWN_MAX).filter(Boolean).length / Math.max(1, res.length - SHOWN_MAX) });

export async function doseTask(d, all, { model, log = () => {} }) {
  const c = d.contract, head = `function ${c.name}(${c.params.join(", ")}) {`, siblings = all.map((x) => x.contract).filter((x) => x.name !== c.name);
  const row = { task: c.name, role: d.role, model, offered: cardsFor(c).map((x) => x.name) };
  const draw = async (prompt) => `${head}${await complete(model, prompt)}\n}`;
  let d5 = null;
  for (const [rung, o] of Object.entries(RUNGS)) {
    const prompt = rungPrompt(c, o, { siblings }), code = await draw(prompt), res = runResults(code, c, o.helpers === "none" ? false : "exact"), s = score(res);
    row[rung] = { ...s, state: drawState(runDetail(code, c, o.helpers === "none" ? false : "exact"), o.examples), chars: prompt.length };
    if (rung === "D5") d5 = { code, res, prompt };
  }
  // R1: one repair, only when D5 missed an example it was shown — shown its own attempt and what that returned for the first example it missed
  const missed = d5.res.slice(0, SHOWN_MAX).findIndex((x) => x !== true);
  if (missed < 0) row.R1 = { ...row.D5, draws: 1 };
  else {
    const run = c.runs[missed]; let got; try { got = json(loadGot(d5.code, c, run)); } catch (e) { got = `an error: ${String(e.message).slice(0, 80)}`; }
    const note = `for ${c.name}(${run.args().map(json).join(", ")}) this gave ${String(got).slice(0, 220)}; the example says ${json(run.want()).slice(0, 220)}. Corrected:`;
    const code = await draw(rungPrompt(c, RUNGS.D5, { siblings, previous: { code: d5.code, note } })), res = runResults(code, c, "exact"), s = score(res);
    row.R1 = { ...s, state: drawState(runDetail(code, c, "exact"), SHOWN_MAX), chars: 0, draws: 2 };
  }
  log(row); return row;
}
import { loadUnit } from "./unit-wall.mjs";
const loadGot = (code, c, run) => loadUnit(code, c.name, { cards: "exact" })(...run.args());

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const model = arg("model", "qwen2.5-coder:1.5b"), out = arg("out", null), only = arg("tasks", null)?.split(","), all = [...DIVERSE, ...HELDOUT], rows = [];
  for (const d of all) { if (only && !only.includes(d.contract.name)) continue; rows.push(await doseTask(d, all, { model, log: (r) => { console.log(JSON.stringify(r)); if (out) fs.appendFileSync(out, JSON.stringify(r) + "\n"); } })); }
}
