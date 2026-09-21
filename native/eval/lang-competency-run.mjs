// native/eval/lang-competency-run.mjs — draw each held-out task in each
// language from each model, score with the CALL tier, append to the ledger,
// print the cells beside their measured null.
//
//   node native/eval/lang-competency-run.mjs --models=gemma2:2b,qwen2.5-coder:1.5b \
//        --languages=javascript,python --draws=1
//
// THREE ARMS, so each lever is attributed and never mixed (state the reader's
// configuration): 
//   raw       one prose ask, one draw, mechanical snip of the code block.
//   examples  the same, plus the task's VISIBLE cases stated as examples.
//   rec       examples + a repair loop (up to --rounds): the draw is scored on
//             the visible cases, and a failure goes back as prose — a compile or
//             runtime error, or a visible case's got/want. Held-out cases never
//             appear in a prompt or a repair message.
// Levers added 2026-09-21 (lang-levers.js), each its own arm so none is mixed in:
//   examplesx examples + deterministic code extraction (which fenced block is THE code)
//   bok       best-of-k (--k, temperature --boktemp) picked on the VISIBLE cases
//   rec2      examples + extraction + repair with early stop and keep-the-best, and a
//             templated name diagnostic (never an alias) when the stated name is missing
// Every arm is SCORED ON THE HELD-OUT CASES ONLY. None of this is the
// proxy-runner build path (no decomposition, no sharpened atoms).
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TASKS, CALL_LANGUAGES, scoreDraw, nullControl, appendRow, readRows, competency, heldOutPass, feedbackFor, examplesFor } from "../organs/lang-competency.js";
import { canonLanguage, toolchainAvailable, toolchainVersion } from "../organs/lang-validators.js";
import { extractOrFallback, definesName, nameDiagnostic, pickBest, RepairLedger } from "../organs/lang-levers.js";
import { VISIBLE } from "../organs/lang-competency.js";

const here = dirname(fileURLToPath(import.meta.url));
const LEDGER = join(here, "..", "..", "state", "lang-competency.jsonl");
const OLLAMA = process.env.OLLAMA_HOST ? `http://${process.env.OLLAMA_HOST.replace(/^https?:\/\//, "")}` : "http://localhost:11434";

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const models = arg("models", "gemma2:2b").split(",").filter(Boolean);
const languages = arg("languages", CALL_LANGUAGES.join(",")).split(",").map(canonLanguage).filter(Boolean);
const draws = Number(arg("draws", "1"));
const arms = arg("arms", "raw,examples,rec").split(",").filter(Boolean);
const rounds = Number(arg("rounds", "3"));
const K = Number(arg("k", "3"));
const bokTemp = Number(arg("boktemp", "0.8"));
const timeoutMs = Number(arg("timeout", "240000"));

const NAME = { javascript: "JavaScript", typescript: "TypeScript", python: "Python", ruby: "Ruby" };

// Prose in, code out. The function name is stated in the spec; the language is
// declared once. No examples of expected output are shown (held out).
const askFor = (task, lang, withExamples) => `${task.spec}${withExamples ? `\n\nFor example: ${examplesFor(task)}` : ""}\n\nWrite it in ${NAME[lang] ?? lang}. Reply with the code only.`;

// A repair ask: the same task, the code so far, and what happened when it ran.
const repairFor = (task, lang, source, note) => `${task.spec}\n\nFor example: ${examplesFor(task)}\n\nHere is the ${NAME[lang] ?? lang} code written so far:\n\n${source}\n\n${note}\n\nRewrite the whole function so it is correct. Reply with the code only.`;

// Mechanical snip: the first fenced block if any, else the whole reply.
const snip = (text) => {
  const m = String(text ?? "").match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  return (m ? m[1] : String(text ?? "")).trim();
};

// Connection errors (server restart, socket hang up) are retried and do not
// count as a draw (CODING-LESSONS 8); a real HTTP or timeout failure throws.
async function draw(model, prompt, temperature = 0.2) {
  let last;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const r = await fetch(`${OLLAMA}/api/generate`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, prompt, stream: false, options: { temperature, num_predict: 400 } }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!r.ok) throw new Error(`ollama ${r.status}`);
      return (await r.json()).response ?? "";
    } catch (e) {
      last = e;
      if (!/fetch failed|ECONNREFUSED|ECONNRESET|socket hang up/i.test(String(e?.message ?? e) + String(e?.cause?.code ?? ""))) throw e;
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
    }
  }
  throw last;
}

const nulls = {};
for (const lang of languages) nulls[lang] = await nullControl(lang);

async function drawArm(model, lang, task, arm) {
  const ask = askFor(task, lang, arm !== "raw");
  if (arm === "examplesx") {
    const source = await extractOrFallback(await draw(model, ask), lang, task.snake);
    return { sc: await scoreDraw(task, lang, source), rounds: 1 };
  }
  if (arm === "bok") {
    const cands = [];
    for (let i = 0; i < K; i++) {
      const source = await extractOrFallback(await draw(model, ask, bokTemp), lang, task.snake);
      const sc = await scoreDraw(task, lang, source);
      if (sc.unchecked) return { sc, rounds: 1 };
      cands.push({ source, sc });
    }
    return { sc: pickBest(cands, VISIBLE).best.sc, rounds: K };
  }
  if (arm === "rec2") {
    const L = new RepairLedger(VISIBLE);
    let source = await extractOrFallback(await draw(model, ask), lang, task.snake);
    let sc = await scoreDraw(task, lang, source);
    if (sc.unchecked) return { sc, rounds: 1 };
    L.offer({ source, sc });
    for (let r = 0; r < rounds && !L.done; r++) {
      const held = L.best;
      const d = await definesName(lang, held.source, task.snake);
      const note = d.known && !d.defined ? nameDiagnostic(task.snake) : feedbackFor(task, held.sc);
      if (!note) break; // visible cases all pass — nothing to say, stop
      source = await extractOrFallback(await draw(model, repairFor(task, lang, held.source, note)), lang, task.snake);
      sc = await scoreDraw(task, lang, source);
      L.offer({ source, sc });
    }
    return { sc: L.best.sc, rounds: L.offers, regressions: L.regressions };
  }
  let source = await draw(model, ask).then(snip);
  let sc = await scoreDraw(task, lang, source), used = 1;
  if (arm === "rec") {
    while (used <= rounds && !sc.unchecked) {
      const note = feedbackFor(task, sc);
      if (!note) break; // visible cases all pass — nothing to say, stop
      source = snip(await draw(model, repairFor(task, lang, source, note)));
      sc = await scoreDraw(task, lang, source); used++;
    }
  }
  return { sc, rounds: used };
}

for (const model of models) {
  for (const lang of languages) {
    if (!(await toolchainAvailable(lang))) { console.log(`${model} ${lang}: toolchain absent — unchecked, no rows`); continue; }
    for (const arm of arms) for (const task of TASKS) for (let i = 0; i < draws; i++) {
      let r, err = null;
      try { r = await drawArm(model, lang, task, arm); } catch (e) { err = String(e.message ?? e); }
      // A dropped connection or timeout is not a result about the model.
      if (err) { console.log(`${model} ${lang} ${arm} ${task.id}: draw failed (${err}) — not recorded`); continue; }
      if (r.sc.unchecked) continue;
      const heldOut = heldOutPass(task, r.sc);
      appendRow(LEDGER, { config: `${arm}-v3`, arm, toolchain: await toolchainVersion(lang), taskSet: TASKS.length, language: lang, model, task: task.id, floorOk: r.sc.floorOk, callOk: r.sc.callOk, heldOut, rounds: r.rounds, regressions: r.regressions });
      console.log(`${model} ${lang} ${arm} ${task.id}: heldOut=${heldOut} rounds=${r.rounds}`);
    }
  }
}

const rows = readRows(LEDGER).filter((r) => String(r.config).endsWith("-v3"));
console.log("\nlanguage   model                     arm       n  heldOut  null  p(>null)");
for (const model of models) for (const lang of languages) for (const arm of arms) {
  const c = competency(rows, lang, model, nulls[lang], arm);
  if (!c.n) continue;
  console.log(`${lang.padEnd(10)} ${model.padEnd(25)} ${arm.padEnd(9)} ${String(c.n).padStart(2)}  ${c.passes}/${c.n}      ${c.nullRate}     ${c.pAboveNull == null ? "—" : c.pAboveNull.toExponential(1)}`);
}
