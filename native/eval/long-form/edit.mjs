// native/eval/long-form/edit.mjs — edit a saved book again (the EVA -> REC
// stage alone, organs/book-editor.js), e.g. under a changed license table.
//   node native/eval/long-form/edit.mjs <dir> [--from=ledger] [--to=ledger-edited2] [--budget=40]
import fs from "node:fs";
import path from "node:path";
import { sentences } from "../../adapters/text/english-parser.js";
import { makeLongForm, makeTextStore } from "../../organs/long-form.js";
import { makeBookEditor } from "../../organs/book-editor.js";
import { PROSE_MEDIUM } from "../../adapters/build/prose-medium.js";
import { loadEotParser } from "../../the-fold/eot-notation.js";
const dir = process.argv[2];
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const from = arg("from", "ledger"), to = arg("to", "ledger-edited2"), budget = Number(arg("budget", "40"));
const model = arg("model", "qwen2.5-coder:1.5b"), ctx = Number(arg("ctx", "4096")), seed = Number(arg("seed", "1"));
const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
async function ask(prompt, { attempt = 0, numPredict = 160 } = {}) {
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, prompt, stream: false, options: { temperature: Math.min(1, 0.7 + 0.15 * attempt), seed: seed * 1000 + attempt, num_predict: numPredict, num_ctx: ctx } }), signal: AbortSignal.timeout(600000) });
  const j = await r.json();
  return { response: String(j.response ?? ""), prompt_eval_count: j.prompt_eval_count ?? null };
}
const outline = JSON.parse(fs.readFileSync(path.join(dir, "outline.json"), "utf8"));
const state = JSON.parse(fs.readFileSync(path.join(dir, `${from}.state.json`), "utf8"));
const logFile = path.join(dir, `${to}.log.jsonl`); fs.writeFileSync(logFile, "");
const log = (x) => fs.appendFileSync(logFile, JSON.stringify(x) + "\n");
const lf = makeLongForm({ ask, sentences, medium: PROSE_MEDIUM, mouth: model, castDetails: outline.castDetails });
const parser = await loadEotParser();
const ed = makeBookEditor({ lf, ask, parser, medium: PROSE_MEDIUM, mouth: model, castDetails: outline.castDetails, log });
const t0 = Date.now();
const e = await ed.editBook({ notes: state.notes, store: makeTextStore(state.store), task: outline.request, budget });
const s = lf.seal({ notes: e.notes, store: e.store, request: outline.request, regime: { arm: to, budget } });
fs.writeFileSync(path.join(dir, `${to}.book.md`), s.artifact);
fs.writeFileSync(path.join(dir, `${to}.state.json`), JSON.stringify({ notes: e.notes, store: e.store }));
console.log(`${to}: asks ${e.asks} · ${e.passes.map((p) => `pass ${p.pass}: ${p.licensed} licensed, kept ${JSON.stringify(p.kept)}, undone ${JSON.stringify(p.undone)}`).join(" | ")} · final ${e.final.licensed} licensed, ${e.final.lines} lines · sealed ${!!s.sealed} · helix ${s.helix.ok} · ${Math.round((Date.now() - t0) / 1000)}s`);
