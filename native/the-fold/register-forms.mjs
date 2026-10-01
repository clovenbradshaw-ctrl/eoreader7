// ═══ LOVELACE · TEACH IT TO FISH ═══ GARY: CONTENT IN LOOKS LIKE CONTENT OUT. WHAT IS THAT, WHEN WHAT WE WANT OUT IS CODE?
//
// Gary's law (the-fold/gary.js; CODING-LESSONS 28; native/tests/gary-doors.test.js): the mouth continues the register it is cued in. Cue it with prose and it answers in prose; ask for "ONLY raw
// code" in an instruction and it answers in chat-code (fences, a sentence before, a sentence after) — "instruction qualifiers don't override chat-code defaults, only shown shapes do". For a
// function the shape to show is a FILE: the prompt is the top of the module, in the module's own idiom, ending where the function body would begin. This holds the INFORMATION fixed (the
// person's words, the three examples, the types they show, the helpers the unit's own words name — rung D5 of context-dose.mjs) and varies only the REGISTER it is said in:
//
//   INSTR   the instruction prompt this repo ships (app-units.mjs unitPrompt): "Write ONLY raw JavaScript ... It must return this shape ..." — a request, in prose
//   F0      a file whose documentation is plain line comments:  // takes: ...   // Examples:   //   f(args) -> json
//   F1      the same information as the file's own documentation idiom: a JSDoc block — @param, @returns, @example f(args) // => json
//   F2      F1, with two neutral working functions above it in the same idiom (the code around a function is itself a cue: the output looks like its neighbours)
//
// Scored on every run of the contract (the first three are the shown examples). `clean` is the form property Gary cares about: the reply is bare code — no fence, no sentence of prose.
//   node native/the-fold/register-forms.mjs [--model m] [--out rows.jsonl] [--tasks a,b]
import fs from "node:fs";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { cardsFor, CARDS } from "../organs/cards.js";
import { runResults } from "./fold-experiment.mjs";
import { unitPrompt, extractCode, cardsShown } from "./app-units.mjs";

const OLLAMA = process.env.ER7_CHANNEL_URL ?? "http://127.0.0.1:11434", json = (v) => JSON.stringify(v), SHOWN = 3;
const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/** the JavaScript documentation type of a value across the shown examples: `{ stop_name: string, times: Array<number|string> }` — read off the examples */
export function jsdocType(values, depth = 0) {
  const vs = values.filter((v) => v !== undefined);
  if (depth < 2 && vs.length && vs.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
    const keys = [...new Set(vs.flatMap(Object.keys))];
    return `{ ${keys.map((k) => `${k}: ${jsdocType(vs.map((v) => v[k]), depth + 1)}`).join(", ")} }`;
  }
  if (vs.length && vs.every(Array.isArray)) { const inner = vs.flat(); return `Array<${inner.length ? jsdocType(inner, depth + 1) : "any"}>`; }
  return [...new Set(vs.map(typeOf))].join("|") || "any";
}

const ANCHORS = `/**
 * Join the non-empty parts with a separator.
 * @param {Array<string|null>} parts
 * @param {string} sep
 * @returns {string}
 * @example
 * joinParts(["a", "", "b"], "-") // => "a-b"
 */
function joinParts(parts, sep) {
  return parts.filter((p) => p !== null && p !== "").join(sep);
}

/**
 * Sum a numeric property over a list of objects.
 * @param {Array<object>} items
 * @param {string} key
 * @returns {number}
 * @example
 * sumBy([{ n: 2 }, { n: 5 }], "n") // => 7
 */
function sumBy(items, key) {
  return items.reduce((total, item) => total + item[key], 0);
}

`;

export function formPrompt(contract, form) {
  const runs = contract.runs.slice(0, SHOWN), words = [`${contract.doc}`, ...String(contract.returns).split("\n").map((l) => l.trim()), ...(contract.notes ? [contract.notes] : [])];
  const helpers = cardsFor(contract).map((c) => CARDS[c.name].fn.toString()), head = `function ${contract.name}(${contract.params.join(", ")}) {\n`, hs = helpers.length ? `${helpers.join("\n")}\n\n` : "";
  if (form === "F0") {
    const ts = [`// takes: (${contract.params.map((p, i) => `${p}: ${jsdocType(runs.map((r) => r.args()[i]))}`).join(", ")})`, `// returns: ${jsdocType(runs.map((r) => r.want()))}`];
    return `${words.map((l) => `// ${l}`).join("\n")}\n${ts.join("\n")}\n//\n// Examples:\n${runs.map((r) => `//   ${contract.name}(${r.args().map(json).join(", ")}) -> ${json(r.want())}`).join("\n")}\n\n${hs}${head}`;
  }
  const doc = `/**\n${words.map((l) => ` * ${l}`).join("\n")}\n${contract.params.map((p, i) => ` * @param {${jsdocType(runs.map((r) => r.args()[i]))}} ${p}`).join("\n")}\n * @returns {${jsdocType(runs.map((r) => r.want()))}}\n * @example\n${runs.map((r) => ` * ${contract.name}(${r.args().map(json).join(", ")}) // => ${json(r.want())}`).join("\n")}\n */\n`;
  return `${form === "F2" ? ANCHORS : ""}${hs}${doc}${head}`;
}

async function generate(model, body) {
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(240000), body: JSON.stringify({ model, stream: false, ...body }) });
  if (!r.ok) throw new Error(`generate ${r.status}`); return (await r.json()).response ?? "";
}
/** Gary's form property, crudely: bare code — no fence anywhere, and no line that is a sentence (starts a capital word, ends in a full stop or colon, holds no code punctuation) */
export const isClean = (raw) => !/```/.test(raw) && !String(raw).split("\n").some((l) => /^[A-Z][a-z]+(?: [A-Za-z']+){2,}[.:]$/.test(l.trim()) && !/[;{}()=<>]/.test(l));

export async function formTask(d, { model, log = () => {} }) {
  const c = d.contract, head = `function ${c.name}(${c.params.join(", ")}) {`, row = { task: c.name, role: d.role, model };
  const cell = (code, raw, chars) => { const res = runResults(code, c, "exact"); return { all: res.every(Boolean), held: res.slice(SHOWN).filter(Boolean).length / Math.max(1, res.length - SHOWN), shown: res.slice(0, SHOWN).filter(Boolean).length, clean: isClean(raw), chars }; };
  const ip = unitPrompt({ ...c }), raw = await generate(model, { prompt: ip, options: { temperature: 0, num_predict: 900 } }), code = extractCode(raw, c.name) ?? "";
  row.INSTR = cell(code, raw, ip.length);
  for (const form of ["F0", "F1", "F2"]) {
    const p = formPrompt(c, form), body = await generate(model, { prompt: p, raw: true, options: { temperature: 0, num_predict: 450, stop: ["\n}"] } });
    row[form] = cell(`${head}${body}\n}`, body, p.length);
  }
  log(row); return row;
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (k, def) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : def; };
  const model = arg("model", "qwen2.5-coder:1.5b"), out = arg("out", null), only = arg("tasks", null)?.split(",");
  for (const d of [...DIVERSE, ...HELDOUT]) { if (only && !only.includes(d.contract.name)) continue; await formTask(d, { model, log: (r) => { console.log(JSON.stringify(r)); if (out) fs.appendFileSync(out, JSON.stringify(r) + "\n"); } }); }
}
