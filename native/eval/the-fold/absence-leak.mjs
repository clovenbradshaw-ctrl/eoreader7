// absence-leak.mjs — Pass 28 of the null experiments: THE MOUTH'S ABSENCE
// LEAK, measured. One question whose extent the corpus never fills
// ("Who directed the Northgate Observatory?"), a void DECLARED for it on
// the ledger with its scope (S70), and the real turn (the-fold
// runHolonicTask, production reader, ledger read on arrival) run twice per
// model: with the void tier in the ledger block (hyperlexiconVoids) and
// with it WITHHELD (the control). Counted per arm: absence sentences citing
// the declared gap (P106, question-anchored) vs citing none.
//   MODELS=gemma2:2b,llama3.2:latest node absence-leak.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const FOLD = new URL("../../../../the-fold/", import.meta.url).pathname;
const OLLAMA = process.env.OLLAMA ?? "http://127.0.0.1:11434";
const MODELS = (process.env.MODELS ?? "gemma2:2b,llama3.2:latest").split(",").map((s) => s.trim()).filter(Boolean);
const { organs, readCorpus, CORPUS } = await import("./lib/product-assay.mjs");
const { runHolonicTask } = await import(`${FOLD}holon.js`);
const { answerRecord } = await import(`${FOLD}answer-record.js`);
const O = await organs();
const reading = readCorpus(O, CORPUS);
const passages = reading.passages;
const QUESTION = "Who directed the Northgate Observatory?";
const dv = O.hl.declareVoid(reading.log, { end1: "the Northgate Observatory", label: "directed", scope: { sources: Object.keys(CORPUS), read: passages.length, total: passages.length }, because: "asked; nothing read states it" });
if (dv.refused) throw new Error(`declareVoid refused: ${dv.refused.type}`);
const ledger = dv.log;
const voids = O.hl.foldVoids(ledger);
console.log(`configuration: production reader, recipe ${O.recipe.slice(0, 12)}; ${passages.length} passage(s) read on arrival; void declared: ${voids.map((v) => v.id).join(", ")} (reached ${voids[0]?.reached}); models ${MODELS.join(", ")}; arms: tier-in, tier-withheld`);
const call = (model) => async (messages, opts = {}) => {
  const body = { model, stream: false, options: { temperature: 0, num_predict: opts.maxTokens ?? 300 }, messages };
  if (opts.json) body.format = opts.json;
  const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  return (await res.json())?.message?.content ?? "";
};
// The sentence witness, bound exactly as app.js binds it (witnessSentencesFor):
// the same ask organs, select as the protocol, 6 asks per part declared.
const W = await import(`${NATIVE}/organs/index.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const witnessFor = (model) => {
  const c = call(model);
  const ask = async (s, slice) => W.readTestimony(await c(W.buildWitnessMessages(s, slice), { json: W.WITNESS_SCHEMA, maxTokens: 200 }));
  const selectAsk = async (messages) => { try { return JSON.parse(await c(messages, { json: W.SELECT_SCHEMA, maxTokens: 120 })); } catch { return {}; } };
  return (sentences, claims, passages, { maxAsks }) => W.witnessSentences(sentences, claims, passages, { ask, selectAsk, splitSentences, testimony: { witnessSlice: W.witnessSlice, siblingSwap: W.siblingSwap, foldTestimony: W.foldTestimony, buildSelectMessages: W.buildSelectMessages, foldSelect: W.foldSelect }, maxAsks });
};
const out = {};
for (const model of MODELS) {
  out[model] = {};
  for (const arm of ["tier-in", "tier-withheld"]) {
    const t0 = Date.now();
    const r = await runHolonicTask({
      task: QUESTION, chunks: passages, call: call(model), foldedRefs: [], makeNameResolver: null, makeRelationReader: (ps, o) => O.relationsFor(ps, o), checkLink: null,
      planMode: false, chatHistory: [], discourse: "",
      hyperlexicon: O.hl, hyperlexiconLog: ledger, hyperlexiconFrame: O.frame, hyperlexiconRecipe: O.recipe,
      hyperlexiconVoids: arm === "tier-in" ? voids : [],
      witnessSentences: witnessFor(model), witnessAsks: 6,
    });
    const witness = (r.sections ?? []).flatMap((s) => s.witness?.rows ?? []);
    const rec = answerRecord({ question: QUESTION, answer: r.output ?? "", model, frame: O.frame, recipe: O.recipe, sections: r.sections ?? [], unsupported: r.unsupported ?? [], unbacked: r.unbacked ?? [], voids, witness, sources: Object.keys(CORPUS).map((name) => ({ name })) });
    out[model][arm] = { answer: String(r.output ?? "").replace(/\s+/g, " ").slice(0, 300), absences: rec.absences, tally: rec.absenceTally, unbacked: rec.unbacked.length, ms: Date.now() - t0 };
    console.log(`\n[${model} · ${arm}] ${out[model][arm].answer}\n  absences: ${rec.absenceTally.citingVoid} cite the declared gap / ${rec.absenceTally.citingNone} cite none · unbacked ${rec.unbacked.length} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    for (const a of rec.absences) console.log(`    ${a.void ? "✓ gap" : "✗ none"} · ${a.how} · ${a.sentence.slice(0, 120)}`);
  }
}
mkdirSync(new URL("./results/", import.meta.url).pathname, { recursive: true });
writeFileSync(new URL("./results/absence-leak.json", import.meta.url), JSON.stringify({ ran: new Date().toISOString().slice(0, 10), question: QUESTION, void: voids[0]?.id ?? null, models: MODELS, out }, null, 2));
console.log("raw: results/absence-leak.json");
