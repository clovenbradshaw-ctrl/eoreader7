// product-assay.mjs — the finish line, executable (the-fold P97 / S67).
//
// The zero-call arm lives in lib/product-assay.mjs and is READ by
// native/tests/product-assay.test.js on every suite run; this file prints
// it. With MODEL set it also spends declared model calls: each question's
// ANSWER RECORD is handed to the real holon.js pipeline (the same
// runHolonicTask app.js calls) as the turn's material, and the claims the
// mouth's answer makes are read back with the same reader — the shape the
// model-swap diff (Pass 19) compares across two models.
//
//   node product-assay.mjs                      (0 model calls)
//   MODEL=gemma2:2b node product-assay.mjs      (3 questions, budget printed)
//   MODELS=gemma2:2b,qwen2.5:14b-instruct-q4_K_M node product-assay.mjs  (the claim diff)
//
// results/product-assay-RESULTS.md is the dated transcription; the test is
// the enforcement for the 0-call arm; the model arms are a dated record of
// one run and say so.
import { writeFileSync } from "node:fs";
import { runProductAssay, QUESTIONS } from "./lib/product-assay.mjs";

const FOLD = new URL("../../../../the-fold/", import.meta.url).pathname;
const NATIVE = new URL("../..", import.meta.url).pathname;
const OLLAMA = process.env.OLLAMA ?? "http://127.0.0.1:11434";
const MODELS = (process.env.MODELS ?? process.env.MODEL ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const run = await runProductAssay();
for (const l of run.lines) console.log(l);
const breached = run.walls.filter((w) => !w.ok);
console.log(`\n${run.walls.length - breached.length}/${run.walls.length} walls held${breached.length ? `; BREACHED: ${breached.map((w) => `${w.n} ${w.name}`).join(", ")}` : ""}`);

if (MODELS.length) {
  const { runHolonicTask } = await import(`${FOLD}holon.js`);
  const { chunkSource } = await import(`${NATIVE}/organs/source.js`);
  const { CORPUS } = await import("./lib/product-assay.mjs");
  const passages = Object.entries(CORPUS).flatMap(([name, text]) => chunkSource(name, text));
  const byModel = {};
  for (const model of MODELS) {
    let calls = 0;
    const call = async (messages, opts = {}) => {
      calls += 1;
      const body = { model, stream: false, options: { temperature: 0, num_predict: opts.maxTokens ?? 300 }, messages };
      if (opts.json) body.format = opts.json;
      const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      return (await res.json())?.message?.content ?? "";
    };
    const answers = [];
    for (const q of QUESTIONS) {
      const t0 = Date.now();
      const r = await runHolonicTask({ task: q.question, chunks: passages, call, foldedRefs: [], makeNameResolver: null, makeRelationReader: null, checkLink: null, planMode: false, chatHistory: [], discourse: "" });
      answers.push({ question: q.question, answer: String(r.output ?? ""), refs: r.refs ?? [], unsupported: r.unsupported ?? [], ms: Date.now() - t0 });
      console.log(`\n[${model}] ${q.question}\n  → ${String(r.output ?? "").replace(/\s+/g, " ").slice(0, 300)}`);
    }
    byModel[model] = { calls, answers };
    console.log(`[${model}] ${calls} model call(s) — a declared budget, spent`);
  }
  writeFileSync(new URL("./results/product-assay-model-arm.json", import.meta.url), JSON.stringify({ ran: new Date().toISOString().slice(0, 10), models: byModel, note: "one run, dated; the claim diff across models is Pass 19's measurement" }, null, 2));
  console.log("\nmodel arm written: results/product-assay-model-arm.json");
}
if (breached.length) process.exitCode = 1;
