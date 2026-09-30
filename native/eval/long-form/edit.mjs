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
  // a server error is an error, never an empty reply read as silence (F1 lost 63 asks that way)
  if (j.error) throw new Error(`ollama: ${String(j.error).slice(0, 200)}`);
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
// the grid's own order, macro to micro: the pathos pass (Gornick, the whole
// book's curve) on the book as written, then the meso and micro editors —
// a candidate is judged against the part as it was written, never against
// one the editors already cut
let start = { notes: state.notes, store: makeTextStore(state.store) }, pathosAsks = 0;
if (arg("pathos", "1") === "1") {
  const pp = await ed.pathosPass({ notes: start.notes, store: start.store, task: outline.request, budget: Number(arg("pathos-budget", "60")), topic: outline.topic, chooser: arg("chooser", "archons") });
  console.log(`pathos: ${pp.targets} flat parts, ${pp.tried} tried, ${pp.kept} rewritten, ${pp.asks} asks`);
  for (const r of pp.rows) console.log(`  ${r.part} ${r.kept ? "KEPT" : "kept old"} · ${r.why.join(", ")} · now ${r.now.licensed} licensed ${r.now.bits.toFixed(2)} bits${r.now.flatCadence ? " flat" : ""} → best ${r.best ? `${r.best.licensed} licensed ${r.best.bits} bits${r.best.flatCadence ? " flat" : ""}` : "none"} of ${r.candidates}`);
  start = { notes: pp.notes, store: pp.store }; pathosAsks = pp.asks;
}
let e = await ed.editBook({ notes: start.notes, store: start.store, task: outline.request, budget: Number(arg("edit-budget", String(budget))) });
e = { ...e, asks: e.asks + pathosAsks };
const s = lf.seal({ notes: e.notes, store: e.store, request: outline.request, regime: { arm: to, budget } });
fs.writeFileSync(path.join(dir, `${to}.book.md`), s.artifact);
fs.writeFileSync(path.join(dir, `${to}.state.json`), JSON.stringify({ notes: e.notes, store: e.store }));
console.log(`${to}: asks ${e.asks} · ${e.passes.map((p) => `pass ${p.pass}: ${p.licensed} licensed, kept ${JSON.stringify(p.kept)}, undone ${JSON.stringify(p.undone)}`).join(" | ")} · final ${e.final.licensed} licensed, ${e.final.lines} lines · sealed ${!!s.sealed} · helix ${s.helix.ok} · ${Math.round((Date.now() - t0) / 1000)}s`);
