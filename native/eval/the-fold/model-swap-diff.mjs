// model-swap-diff.mjs — bar item (5), measured (the-fold P100 / S68).
//
// "Swapping the local model changes only phrasing, never the claims." The
// thing compared is the AnswerRecord (the-fold answer-record.js): for each
// question, the set of RECORD-BACKED claims the answer made (bound to the
// material by the production reader with objectSpecificity on) and the count
// of claims NOTHING backs (unsupported + unbacked), per model. The bar: the
// nothing-backs count is 0 for every model, and the record-backed sets are
// reported side by side — identical is the ideal; a difference is a fact
// about which true things each mouth chose to say, disclosed, never a lie.
//
// The turn is the REAL one: the-fold's holon.js runHolonicTask with the
// production reader, the hyperlexicon door, and a ledger READ ON ARRIVAL
// (read-on-arrival.js) over the product assay's corpus — the same shape a
// live grounded turn has. Model calls are spent and declared: MODELS env,
// default gemma2:2b and llama3.2:latest (small, per the routing rule).
//
//   MODELS=gemma2:2b,llama3.2:latest node model-swap-diff.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FOLD = new URL("../../../../the-fold/", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const OLLAMA = process.env.OLLAMA ?? "http://127.0.0.1:11434";
const MODELS = (process.env.MODELS ?? "gemma2:2b,llama3.2:latest").split(",").map((s) => s.trim()).filter(Boolean);

const { CORPUS, QUESTIONS } = await import("./lib/product-assay.mjs");
const { runHolonicTask } = await import(`${FOLD}holon.js`);
const { answerRecord, diffRecords } = await import(`${FOLD}answer-record.js`);
const { readOnArrival } = await import(`${FOLD}read-on-arrival.js`);
const { readerFrame } = await import(`${FOLD}reader-frame.js`);
const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const M = await import(`${NATIVE}/adapters/text/morphology.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const cube = await import(`${NATIVE}/kernel/cube.js`);
const TL = await import(`${NATIVE}/kernel/task-log.js`);

const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));
const verbForms = new Set(JSON.parse(readFileSync(`${FIX}unimorph-eng-verb-forms.json`, "utf8")));
const prior = M.morphologyFromPrior(JSON.parse(readFileSync(`${FIX}unimorph-morphology-prior.json`, "utf8")));
const sameAct = M.createLemmatizer(prior.forms, { language: prior.language }).sameAct;
const OPTIONS = {
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior, verbForms, oovLexicon: verbForms,
  nounPhraseSubjects: true, phrasalPredicates: true, attestedVerbs: true, objectSpecificity: true,
  createLemmatizer: () => ({ sameAct }), morphologyIndex: {},
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]), negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }), resolvePronouns,
};
const relationsFor = makeRelationReader(OPTIONS);
const hl = makeHyperlexicon({ createTaskLog: TL.createTaskLog, append: TL.append, projectTasks: TL.projectTasks, ENTRY_KINDS: TL.ENTRY_KINDS, OPERATOR_BASIS: TL.OPERATOR_BASIS, GRAINS: cube.GRAINS, cellOf: cube.cellOf });
const frame = readerFrame({ options: OPTIONS, priors: { posPrior: "POSPrior@1", verbForms: `UniMorph (${verbForms.size})`, morphology: "UniMorph morphology prior", connectorLens: null }, identity: { ends: "makeCastResolver (cast.js)", noteIdentity: null }, model: null });
const recipe = await hl.recipeId(frame);

// Read on arrival, as the app does, so the ledger block is in the turn.
const passages = Object.entries(CORPUS).flatMap(([name, text]) => chunkSource(name, text));
let ledger = null;
for (const [name] of Object.entries(CORPUS)) {
  const ps = passages.filter((p) => p.source === name);
  const r = await readOnArrival({ name, passages: ps, relationsFor, hyperlexicon: hl, ledger, frame, recipe, yieldFn: async () => {} });
  ledger = r.log;
}
console.log(`ledger read on arrival: ${hl.foldHyperlexicon(ledger).length} note(s) over ${passages.length} passage(s); reader recipe ${recipe.slice(0, 12)}`);

const call = (model) => async (messages, opts = {}) => {
  const body = { model, stream: false, options: { temperature: 0, num_predict: opts.maxTokens ?? 300 }, messages };
  if (opts.json) body.format = opts.json;
  const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  return (await res.json())?.message?.content ?? "";
};

const byModel = {};
for (const model of MODELS) {
  let calls = 0;
  const c = call(model);
  byModel[model] = { records: [], answers: [], calls: 0, ms: 0 };
  for (const q of QUESTIONS) {
    const t0 = Date.now();
    const r = await runHolonicTask({
      task: q.question, chunks: passages, call: async (m, o) => { calls += 1; return c(m, o); },
      foldedRefs: [], makeNameResolver: null, makeRelationReader: (ps, o) => relationsFor(ps, o), checkLink: null,
      planMode: false, chatHistory: [], discourse: "",
      hyperlexicon: hl, hyperlexiconLog: ledger, hyperlexiconFrame: frame, hyperlexiconRecipe: recipe,
    });
    const rec = answerRecord({ question: q.question, answer: r.output ?? "", model, frame, recipe, sections: r.sections ?? [], unsupported: r.unsupported ?? [], unbacked: r.unbacked ?? [], sources: Object.keys(CORPUS).map((name) => ({ name })), voids: hl.foldVoids ? hl.foldVoids(ledger) : [], witness: r.witness ?? [] });
    byModel[model].records.push(rec);
    byModel[model].answers.push(String(r.output ?? "").replace(/\s+/g, " ").slice(0, 240));
    byModel[model].ms += Date.now() - t0;
    console.log(`\n[${model}] ${q.question}\n  → ${byModel[model].answers.at(-1)}\n  record: ${JSON.stringify(rec.tally)} · unsupported ${rec.unsupported.length} · unbacked ${rec.unbacked.length} · absences ${rec.absenceTally.citingVoid} cite a declared gap / ${rec.absenceTally.citingNone} cite none (P106)`);
  }
  byModel[model].calls = calls;
}

// The diff, question by question, first model against each other.
const [base, ...others] = MODELS;
const diffs = [];
for (let i = 0; i < QUESTIONS.length; i += 1) {
  for (const other of others) {
    const d = diffRecords(byModel[base].records[i], byModel[other].records[i]);
    diffs.push({ question: QUESTIONS[i].question, a: base, b: other, ...d });
    console.log(`\nDIFF ${QUESTIONS[i].question}\n  record-backed: shared ${d.shared.length} · only ${base} ${d.onlyA.length} · only ${other} ${d.onlyB.length} · same set ${d.sameRecordBackedSet}\n  nothing backs: ${base} ${d.nothingBacks.a} · ${other} ${d.nothingBacks.b}`);
    for (const k of d.shared) console.log(`    = ${k}`);
    for (const k of d.onlyA) console.log(`    ${base} only: ${k}`);
    for (const k of d.onlyB) console.log(`    ${other} only: ${k}`);
  }
}
const bar = MODELS.every((m) => byModel[m].records.every((r) => r.unsupported.length === 0 && r.unbacked.length === 0));
console.log(`\nBAR (nothing-backs = 0 for every model, every question): ${bar ? "HELD" : "BREACHED"}; record-backed sets identical on ${diffs.filter((d) => d.sameRecordBackedSet).length}/${diffs.length}`);
for (const m of MODELS) console.log(`  ${m}: ${byModel[m].calls} call(s), ${(byModel[m].ms / 1000).toFixed(0)} s`);
mkdirSync(new URL("./results/", import.meta.url).pathname, { recursive: true });
writeFileSync(new URL("./results/model-swap-diff.json", import.meta.url), JSON.stringify({ ran: new Date().toISOString().slice(0, 10), models: MODELS, recipe, byModel, diffs, bar }, null, 2));
console.log("raw: results/model-swap-diff.json");
