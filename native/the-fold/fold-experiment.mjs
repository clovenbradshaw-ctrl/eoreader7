// ═══ LOVELACE · TEACH IT TO FISH ═══ THE SIMPLE SHAPE, MEASURED AGAINST THE PIPELINE.
//
// The operator's design: (1) stigmergic coding, (2) the small model is allowed to be wrong and what it writes is an IDEA, (3) the coherent version is FOLDED mechanically from an
// append-only log of those ideas and the evidence about them. What this repo built instead was a pile of per-mistake rewrites applied to ONE draw. This measures the design the operator
// described against that pile, on the same tasks and the same model, with no rewrite rule in the simple arm:
//
//   A    today's pipeline: one draw at temperature 0 from the instruction prompt, then the canonical reading (every rule in code-canonical.js and output-shape.js)
//   B0   the SIMPLE PROMPT, one draw at temperature 0, nothing else — the prompt effect alone
//   B8   the SIMPLE PROMPT, k draws at temperature T; each draw is an IDEA with evidence (how many of the SHOWN examples it reproduces); the fold keeps the idea with the best evidence
//
// The simple prompt: examples first (three shown), the helpers IN SCOPE as code the model continues from, and no instruction about what not to do. Completion-style: the model is handed
// the top of a file and writes the rest of the one function. Scored on the runs NEITHER arm was shown (index >= 3), so nothing is judged on what a prompt gave away.
//
//   node native/the-fold/fold-experiment.mjs --corpus rows.jsonl [--model m] [--k 8] [--temp 0.7] [--set both] [--tasks a,b] [--out results.jsonl]
import fs from "node:fs";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { cardsFor, CARDS } from "../organs/cards.js";
import { loadUnit } from "./unit-wall.mjs";
import { readSuggestion } from "./app-units.mjs";
import { ARM_FLAGS } from "./sample-falsify.mjs";
import { drawState } from "./void-state.mjs";

const SHOWN = 3, OLLAMA = process.env.ER7_CHANNEL_URL ?? "http://127.0.0.1:11434";
const json = (v) => JSON.stringify(v);

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
/** the JSON type of a value across the shown examples, one level into objects and into arrays of objects: `{ words: number, longest: string }` — read off the examples, never written */
export function typeShape(values, depth = 0) {
  const vs = values.filter((v) => v !== undefined);
  if (depth < 2 && vs.length && vs.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
    const keys = [...new Set(vs.flatMap(Object.keys))];
    return `{ ${keys.map((k) => `${k}: ${typeShape(vs.map((v) => v[k]), depth + 1)}`).join(", ")} }`;
  }
  if (depth < 2 && vs.length && vs.every(Array.isArray) && vs.flat().length && vs.flat().every((v) => v && typeof v === "object" && !Array.isArray(v))) return `array of ${typeShape(vs.flat(), depth + 1)}`;
  if (vs.length && vs.every(Array.isArray)) return `array${vs.flat().length ? ` of ${[...new Set(vs.flat().map(typeOf))].join(" | ")}` : ""}`;
  return [...new Set(vs.map(typeOf))].join(" | ") || "unknown";
}

/** the simple prompt: a file that already holds the helpers and three worked examples, ending where the function begins. `typed` adds what the examples already show, said once as types. */
export function simplePrompt(contract, shown = SHOWN, { typed = false } = {}) {
  const runs = contract.runs.slice(0, shown);
  const types = typed ? [`// takes: (${contract.params.map((p, i) => `${p}: ${typeShape(runs.map((r) => r.args()[i]))}`).join(", ")})`, `// returns: ${typeShape(runs.map((r) => r.want()))}`] : [];
  const lines = [`// ${contract.doc}`, ...String(contract.returns).split("\n").map((l) => `// ${l.trim()}`), ...(contract.notes ? [`// ${contract.notes}`] : []), ...types, "//", "// Examples:"];
  for (const run of contract.runs.slice(0, shown)) lines.push(`//   ${contract.name}(${run.args().map(json).join(", ")}) -> ${json(run.want())}`);
  const helpers = cardsFor(contract).map((c) => CARDS[c.name].fn.toString());
  return `${lines.join("\n")}\n\n${helpers.length ? `${helpers.join("\n")}\n\n` : ""}function ${contract.name}(${contract.params.join(", ")}) {\n`;
}

async function complete(model, prompt, { temperature, num_predict = 400 }) {
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(240000),
    body: JSON.stringify({ model, prompt, raw: true, stream: false, options: { temperature, num_predict, stop: ["\n}"] } }) });
  if (!r.ok) throw new Error(`generate ${r.status}`);
  return (await r.json()).response ?? "";
}

/** how a candidate does on each run of the contract: -> [true|false per run] (a throw is a fail) */
export function runResults(code, contract, cards = true) {
  let fn; try { fn = loadUnit(code, contract.name, { cards }); } catch { return contract.runs.map(() => false); }
  return contract.runs.map((run) => { try { return run.check(fn(...run.args())).length === 0; } catch { return false; } });
}
/** per run: true | false | "threw"; null when the code cannot be loaded at all — the input to the four-corner reading (void-state.mjs) */
export function runDetail(code, contract, cards = "exact") {
  let fn; try { fn = loadUnit(code, contract.name, { cards }); } catch { return null; }
  return contract.runs.map((run) => { try { return run.check(fn(...run.args())).length === 0; } catch { return "threw"; } });
}
const score = (results, shown = SHOWN) => ({ shown: results.slice(0, shown).filter(Boolean).length, heldout: results.slice(shown).filter(Boolean).length / Math.max(1, results.length - shown), all: results.every(Boolean) });

/** the fold: ideas ordered by the evidence about them (shown examples reproduced), then by how many draws made the same idea, then by when it was had */
export function foldIdeas(ideas) {
  const byCode = new Map();
  for (const idea of ideas) { const key = idea.code.replace(/\s+/g, ""); const e = byCode.get(key) ?? { ...idea, count: 0 }; e.count++; byCode.set(key, e); }
  return [...byCode.values()].sort((a, b) => b.evidence.shown - a.evidence.shown || b.count - a.count)[0];
}

export async function runTask(d, { model, k, temp, corpusRows, log = () => {} }) {
  const c = d.contract, prompt = simplePrompt(c), typedPrompt = simplePrompt(c, SHOWN, { typed: true }), head = `function ${c.name}(${c.params.join(", ")}) {`;
  const make = async (temperature, p = prompt) => { const body = await complete(model, p, { temperature }); const code = `${head}${body}\n}`; const detail = runDetail(code, c), ev = score(runResults(code, c, "exact")); return { code, evidence: ev, state: drawState(detail, SHOWN), rightBeyondShown: ev.heldout === 1 }; };
  // A: today's pipeline on the saved first draws, with the CURRENT reading
  const aRows = corpusRows.filter((r) => r.task === c.name && r.offeredCode);
  const offC = { ...c, ...ARM_FLAGS.offered };
  const A = aRows.map((r) => score(runResults(readSuggestion(r.offeredCode, offC).code, c)));
  const b0 = await make(0), b0b = await make(0), b1 = await make(0, typedPrompt);
  const ideas = []; for (let i = 0; i < k; i++) ideas.push(await make(temp));
  const chosen = ideas.length ? foldIdeas(ideas) : null, mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const row = { task: c.name, role: d.role, model, k, temp, offered: cardsFor(c).map((x) => x.name),
    A_all: mean(A.map((s) => +s.all)), A_held: mean(A.map((s) => s.heldout)), nA: A.length,
    B0_all: +b0.evidence.all, B0_held: b0.evidence.heldout,
    B0_shown: b0.evidence.shown, B0_code: b0.code.slice(0, 1500),
    B0_state: b0.state, B0_rbs: b0.rightBeyondShown, B0b_all: +b0b.evidence.all, B0b_held: b0b.evidence.heldout, B0b_state: b0b.state, B0b_rbs: b0b.rightBeyondShown, B1_state: b1.state, B1_rbs: b1.rightBeyondShown, B1_all: +b1.evidence.all, B1_held: b1.evidence.heldout, B1_shown: b1.evidence.shown, B1_code: b1.code.slice(0, 1500),
    ...(chosen ? { B8_all: +chosen.evidence.all, B8_held: chosen.evidence.heldout, B8_shown: chosen.evidence.shown,
      pass_at_k: ideas.some((x) => x.evidence.all) ? 1 : 0, distinct: new Set(ideas.map((x) => x.code.replace(/\s+/g, ""))).size, anyShownAll: ideas.some((x) => x.evidence.shown === SHOWN) ? 1 : 0,
      chosenCode: chosen.code.slice(0, 1500) } : {}) };
  log(row); return row;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (key, d) => { const i = process.argv.indexOf(`--${key}`); return i >= 0 ? process.argv[i + 1] : d; };
  const model = arg("model", "qwen2.5-coder:1.5b"), k = Number(arg("k", 8)), temp = Number(arg("temp", 0.7)), out = arg("out", null), only = arg("tasks", null)?.split(",");
  const corpus = arg("corpus", null) ? fs.readFileSync(arg("corpus"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const which = arg("set", "both"), set = which === "diverse" ? DIVERSE : which === "heldout" ? HELDOUT : [...DIVERSE, ...HELDOUT];
  for (const d of set) { if (only && !only.includes(d.contract.name)) continue; await runTask(d, { model, k, temp, corpusRows: corpus, log: (r) => { console.log(JSON.stringify(r)); if (out) fs.appendFileSync(out, JSON.stringify(r) + "\n"); } }); }
}
