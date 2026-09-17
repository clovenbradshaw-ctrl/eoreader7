// mvp-acceptance-2.mjs — a SECOND, independent MVP acceptance run, on
// genuinely new material never used as a fixture in either repo before
// this pass (checked: `grep -rl "Alan Turing" native/eval/the-fold`
// before this file existed returned only a previously-unused, never-
// referenced HTML fixture `fixtures/wikipedia-alan-turing.html` — kept
// unused by every .mjs driver in this repo, confirmed by grep).
//
// Same methodology as mvp-acceptance.mjs (this repo's own established
// convention — deliberately not diverged from): the REAL production
// pipeline (`holon.js::runHolonicTask`, `answer-record.js`,
// `read-on-arrival.js`), the same reader options key-for-key with
// app.js's RELATION_READER_OPTIONS, real Ollama calls (gemma2:2b), real
// wall-clock timing, real byte-verification of every relation-tier span
// against the actual source bytes, fabrications vs. unbound kept apart
// per this repo's own P100/S68 rule.
//
//   node mvp-acceptance-2.mjs
//   env: MODEL (gemma2:2b) · OLLAMA (http://127.0.0.1:11434)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { requireFoldAvailable } from "./lib/fold-sibling.mjs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const FOLD = requireFoldAvailable(import.meta.url, "../../../../the-fold/", "mvp-acceptance-2.mjs needs holon.js, answer-record.js and read-on-arrival.js from it");
const OLLAMA = process.env.OLLAMA ?? "http://127.0.0.1:11434";
const MODEL = process.env.MODEL ?? "gemma2:2b";

const { runHolonicTask } = await import(`${FOLD}holon.js`);
const { answerRecord } = await import(`${FOLD}answer-record.js`);
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

// ── THE MATERIAL: the real Wikipedia article on Alan Turing (fetched
// live earlier in this repo's history but never used as a fixture — the
// full HTML sat unreferenced in fixtures/wikipedia-alan-turing.html).
// The readable biography body (through the pardon/"Alan Turing law"
// section, before "Further reading"/references) was extracted with
// this repo's own web.js::extractReadable and trimmed by hand, saved as
// fixtures/alan-turing-body.txt so a rerun is deterministic without
// re-extracting from the HTML.
const DOC_NAME = "alan-turing.txt";
const DOC_TEXT = readFileSync(`${FIX}alan-turing-body.txt`, "utf8");
const CORPUS = { [DOC_NAME]: DOC_TEXT };
const WORDS = DOC_TEXT.trim().split(/\s+/).length;

// ── THE QUESTIONS, hand-written against the real trimmed body text
// above, in the same three declared buckets as mvp-acceptance.mjs.
export const QUESTIONS = [
  // — answerable —
  { id: "a1", bucket: "answerable", question: "In what year was Alan Turing awarded an exhibition (scholarship) to Cambridge after sitting the King's College examination?", expect: /1930|1931/ },
  { id: "a2", bucket: "answerable", question: "At which American university did Turing study for his PhD under Alonzo Church?", expect: /princeton/i },
  { id: "a3", bucket: "answerable", question: "What was the name of the electromechanical machine Turing specified at Bletchley Park to help break Enigma?", expect: /bombe/i },
  { id: "a4", bucket: "answerable", question: "What honour did King George VI award Turing in 1946 for his wartime services?", expect: /officer of the order of the british empire|obe/i },
  { id: "a5", bucket: "answerable", question: "In what year was Turing appointed reader in the Mathematics Department at the University of Manchester?", expect: /1948/ },
  { id: "a6", bucket: "answerable", question: "What was the name of the 19-year-old man Turing met in December 1951, whose relationship led to Turing's prosecution?", expect: /arnold murray/i },
  { id: "a7", bucket: "answerable", question: "What synthetic oestrogen was Turing given injections of as part of his probation?", expect: /stilboestrol|diethylstilbestrol|des/i },
  { id: "a8", bucket: "answerable", question: "On what date did Queen Elizabeth II sign the royal warrant pardoning Turing?", expect: /24 december 2013/i },
  // — contested / ambiguous (real tensions or non-single-number facts IN
  // the material) —
  { id: "c1", bucket: "contested", question: "Was Turing directly involved in the design of the Colossus computer?" },
  { id: "c2", bucket: "contested", question: "Did the government consider a posthumous pardon for Turing appropriate when it was first requested?" },
  { id: "c3", bucket: "contested", question: "Was Turing's mother convinced that his death was a suicide?" },
  { id: "c4", bucket: "contested", question: "Did the hormonal injections have the effect on Turing that was expected?" },
  { id: "c5", bucket: "contested", question: "How many royal pardons had been granted since the end of the Second World War before Turing's?" },
  // — genuinely absent (checked by hand against the trimmed body text —
  // never discussed) —
  { id: "n1", bucket: "absent", question: "What was Alan Turing's favorite breakfast food?" },
  { id: "n2", bucket: "absent", question: "Did Alan Turing ever learn to play a musical instrument?" },
  { id: "n3", bucket: "absent", question: "What was Alan Turing's blood type?" },
  { id: "n4", bucket: "absent", question: "Did Alan Turing ever visit Australia?" },
];

// ── THE PRODUCTION READER, key for key with app.js and with
// mvp-acceptance.mjs's own OPTIONS ──────────────────────────────────
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
console.log(`configuration: reader recipe ${recipe.slice(0, 12)} · organs key-for-key with app.js RELATION_READER_OPTIONS · model ${MODEL} via ${OLLAMA}`);

// ── PHASE 1: first-time ingest, timed ────────────────────────────────
const passages = chunkSource(DOC_NAME, DOC_TEXT);
const ingestT0 = Date.now();
const arrival = await readOnArrival({ name: DOC_NAME, passages, relationsFor, hyperlexicon: hl, ledger: null, frame, recipe, yieldFn: async () => {} });
const ingestMs = Date.now() - ingestT0;
const ledger = arrival.log;
const notes = hl.foldWithStanding(ledger);
console.log(`\nPHASE 1 — INGEST: ${WORDS} words, ${passages.length} passage(s) → ${notes.length} note(s) on the ledger in ${ingestMs} ms (${arrival.ms} ms reported by readOnArrival itself)`);
const ingestTargetMs = Math.ceil((WORDS / 10000) * 30000);
console.log(`  target: <= ${ingestTargetMs} ms (30s per 10k words, ${WORDS} words here) — ${ingestMs <= ingestTargetMs ? "PASS" : "FAIL"}`);

function verifySpan(sp, corpus, pool) {
  const name = String(sp.ref ?? "").split("#")[0];
  const src = corpus[name];
  if (src == null || !Number.isFinite(sp.start) || !Number.isFinite(sp.end)) return { ok: false, frame: null };
  if (src.slice(sp.start, sp.end) === sp.text) return { ok: true, frame: "source" };
  const p = (pool ?? []).find((x) => x.ref === sp.ref);
  if (p && src.slice(p.start + sp.start, p.start + sp.end) === sp.text) return { ok: true, frame: "passage" };
  return { ok: false, frame: null };
}

const call = async (messages, opts = {}) => {
  const body = { model: MODEL, stream: false, options: { temperature: 0, num_predict: opts.maxTokens ?? 300 }, messages };
  if (opts.json) body.format = opts.json;
  const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  return (await res.json())?.message?.content ?? "";
};

const results = [];
let totalCalls = 0;
for (const q of QUESTIONS) {
  const runOnce = async () => {
    const t0 = Date.now();
    let calls = 0;
    const r = await runHolonicTask({
      task: q.question, chunks: passages, call: async (m, o) => { calls += 1; totalCalls += 1; return call(m, o); },
      foldedRefs: [], makeNameResolver: null, makeRelationReader: (ps, o) => relationsFor(ps, o), checkLink: null,
      planMode: "flat", chatHistory: [], discourse: "",
      hyperlexicon: hl, hyperlexiconLog: ledger, hyperlexiconFrame: frame, hyperlexiconRecipe: recipe,
    });
    const ms = Date.now() - t0;
    const rec = answerRecord({ question: q.question, answer: r.output ?? "", model: MODEL, frame, recipe, sections: r.sections ?? [], unsupported: r.unsupported ?? [], unbacked: r.unbacked ?? [], sources: [{ name: DOC_NAME, sha256: createHash("sha256").update(DOC_TEXT).digest("hex"), bytes: DOC_TEXT.length }], voids: hl.foldVoids ? hl.foldVoids(ledger) : [], witness: r.witness ?? [] });
    const rawSpans = (r.sections ?? []).flatMap((s) => (s?.relations?.claims ?? []).flatMap((c) => c.spans ?? []));
    return { ms, calls, output: r.output ?? "", rec, rawSpans };
  };
  const cold = await runOnce();
  const hit = await runOnce();

  const spanChecks = cold.rawSpans.map((sp) => verifySpan(sp, CORPUS, passages));
  const spansOk = spanChecks.filter((s) => s.ok).length;

  const fabrications = cold.rec.unsupported.length;
  const unboundFindings = cold.rec.unbacked.length;

  const isAbsent = q.bucket === "absent";
  const refusalLike = /\b(not (stated|mentioned|discussed|addressed)|does not (say|state|mention|discuss)|no (mention|information|statement)|not (available|covered) in|the (article|material|source|text) (does not|doesn't)|cannot (find|answer)|don't (say|state|mention))\b/i.test(cold.output) || cold.rec.absenceTally.citingVoid + cold.rec.absenceTally.citingNone > 0;

  results.push({
    id: q.id, bucket: q.bucket, question: q.question,
    coldMs: cold.ms, hitMs: hit.ms, coldCalls: cold.calls, hitCalls: hit.calls,
    output: cold.output.replace(/\s+/g, " ").slice(0, 300),
    spansTotal: spanChecks.length, spansOk,
    fabrications, unboundFindings, unsupported: cold.rec.unsupported, unbacked: cold.rec.unbacked,
    expectMatched: q.expect ? q.expect.test(cold.output) : null,
    refusalLike: isAbsent ? refusalLike : null,
    latencyTarget: isAbsent ? 2000 : 15000,
    latencyPass: isAbsent ? cold.ms <= 2000 : cold.ms <= 15000,
    hitLatencyPass: hit.ms <= 8000,
  });
  console.log(`\n[${q.bucket}] ${q.id} ${q.question}`);
  console.log(`  → ${results.at(-1).output}`);
  console.log(`  cold ${cold.ms} ms (${cold.calls} call(s)) · hit ${hit.ms} ms (${hit.calls} call(s)) · spans ${spansOk}/${spanChecks.length} verified · fabrications ${fabrications} · unbound (disclosed, not a fabrication) ${unboundFindings}${isAbsent ? ` · refusal-like: ${refusalLike}` : ""}${q.expect ? ` · expected fact matched: ${results.at(-1).expectMatched}` : ""}`);
}

const totalFab = results.reduce((a, r) => a + r.fabrications, 0);
const totalUnbound = results.reduce((a, r) => a + r.unboundFindings, 0);
const totalSpans = results.reduce((a, r) => a + r.spansTotal, 0);
const totalSpansOk = results.reduce((a, r) => a + r.spansOk, 0);
const answerable = results.filter((r) => r.bucket === "answerable");
const contested = results.filter((r) => r.bucket === "contested");
const absent = results.filter((r) => r.bucket === "absent");
const answerableHit = answerable.filter((r) => r.expectMatched).length;
const absentRefused = absent.filter((r) => r.refusalLike).length;
const nonAbsentColdMs = [...answerable, ...contested].map((r) => r.coldMs);
const hitMsAll = results.map((r) => r.hitMs);
const absentColdMs = absent.map((r) => r.coldMs);

const numbers = {
  ran: new Date().toISOString(),
  model: MODEL, recipe,
  words: WORDS, passages: passages.length,
  ingestMs, ingestTargetMs, ingestPass: ingestMs <= ingestTargetMs,
  totalCalls,
  fabrications: totalFab, fabricationsPass: totalFab === 0,
  unboundFindings: totalUnbound,
  citationSpansTotal: totalSpans, citationSpansOk: totalSpansOk,
  citationVerificationRate: totalSpans ? Number((totalSpansOk / totalSpans).toFixed(3)) : null,
  answerable: { n: answerable.length, expectedFactMatched: answerableHit },
  absent: { n: absent.length, refusalLike: absentRefused },
  latency: {
    coldMaterialMax: Math.max(...nonAbsentColdMs), coldMaterialTarget: 15000, coldMaterialPass: nonAbsentColdMs.every((ms) => ms <= 15000),
    cacheHitFullAnswerMax: Math.max(...hitMsAll), cacheHitFullAnswerTarget: 8000, cacheHitFullAnswerPass: hitMsAll.every((ms) => ms <= 8000),
    refusalMax: absentColdMs.length ? Math.max(...absentColdMs) : null, refusalTarget: 2000, refusalPass: absentColdMs.every((ms) => ms <= 2000),
  },
};
console.log(`\n== SUMMARY ==`);
console.log(`ingest: ${ingestMs} ms for ${WORDS} words (target <= ${ingestTargetMs} ms) — ${numbers.ingestPass ? "PASS" : "FAIL"}`);
console.log(`fabrications (contradicted — a lie about the given): ${totalFab} (must be 0) — ${numbers.fabricationsPass ? "PASS" : "FAIL"}`);
console.log(`unbound (disclosed, not counted as a fabrication): ${totalUnbound}`);
console.log(`citation verification: ${totalSpansOk}/${totalSpans} spans resolve to real source bytes (${numbers.citationVerificationRate})`);
console.log(`answerable bucket: expected fact present in ${answerableHit}/${answerable.length} answers`);
console.log(`absent bucket: refusal-like language in ${absentRefused}/${absent.length} answers`);
console.log(`latency — cold material: max ${numbers.latency.coldMaterialMax} ms (target <=15000) — ${numbers.latency.coldMaterialPass ? "PASS" : "FAIL"}`);
console.log(`latency — cache-hit full answer: max ${numbers.latency.cacheHitFullAnswerMax} ms (target <=8000) — ${numbers.latency.cacheHitFullAnswerPass ? "PASS" : "FAIL"}`);
console.log(`latency — refusal path: max ${numbers.latency.refusalMax} ms (target <=2000) — ${numbers.latency.refusalPass ? "PASS" : "FAIL"}`);

mkdirSync(new URL("./results/", import.meta.url).pathname, { recursive: true });
writeFileSync(new URL("./results/mvp-acceptance-2.json", import.meta.url), JSON.stringify({ numbers, results }, null, 2));
console.log("\nraw: results/mvp-acceptance-2.json");
