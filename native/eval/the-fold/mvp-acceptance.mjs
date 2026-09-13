// mvp-acceptance.mjs — the MVP acceptance test named in the-fold's own
// MVP-LAUNCH-CHECKLIST.md section 7 ("The acceptance bar", added
// 2026-09-11): a real, previously-unseen document, 20 real questions
// (answerable / contested / genuinely absent), checked for zero
// fabrications, every citation verifying against real source bytes, and
// every turn inside the latency table there. Re-runnable, not a committed
// regression test — this repo's own `eval/read-cost.mjs --trace --against`
// posture (P19/P27/P44/S65).
//
// REUSE, not a new mechanism: the real production turn, the same shape
// `gate-proof.mjs` and `model-swap-diff.mjs` already exercise —
// `the-fold/holon.js`'s `runHolonicTask`, `the-fold/read-on-arrival.js`'s
// `readOnArrival`, `the-fold/answer-record.js`'s `answerRecord` — over a
// real local model through Ollama (gemma2:2b, this repo's own S2 default,
// model-routing.js). The one new thing this file adds is the CORPUS (a
// document the pipeline has never read), the 20 hand-written QUESTIONS
// below, and the harness that times each phase and byte-verifies every
// citation against the source — everything else is the app's own pipeline.
//
//   node mvp-acceptance.mjs
//   env: MODEL (gemma2:2b) · OLLAMA (http://127.0.0.1:11434)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { requireFoldAvailable } from "./lib/fold-sibling.mjs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const FOLD = requireFoldAvailable(import.meta.url, "../../../../the-fold/", "mvp-acceptance.mjs needs holon.js, answer-record.js and read-on-arrival.js from it");
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

// ── THE MATERIAL: a real Wikipedia article, fetched live 2026-09-10,
// never used in any fixture or eval corpus in either repo before this
// pass (checked: `grep -rl "Katherine Johnson" native/eval/the-fold`
// before this file existed returned nothing). Fetched to
// fixtures/wikipedia-katherine-johnson.html; the readable body (through
// "Awards", before the "See also"/References/categories apparatus) saved
// as fixtures/katherine-johnson-body.txt — that trimmed body is CORPUS
// below, so a rerun is deterministic without refetching Wikipedia.
const DOC_NAME = "katherine-johnson.txt";
const DOC_TEXT = readFileSync(`${FIX}katherine-johnson-body.txt`, "utf8");
const CORPUS = { [DOC_NAME]: DOC_TEXT };
const WORDS = DOC_TEXT.trim().split(/\s+/).length;

// ── THE 20 QUESTIONS, hand-written against the real article text above,
// in three declared buckets. "answerable" facts are stated once, plainly,
// in the body; "contested" ones turn on a real tension or ambiguity IN
// THE MATERIAL ITSELF (the article's own words pull two ways, or the fact
// asked for is not a single stated number); "absent" ones ask about
// something this article never discusses at all — checked by hand against
// the saved text before being listed here.
export const QUESTIONS = [
  // — answerable —
  { id: "a1", bucket: "answerable", question: "In what year did Katherine Johnson graduate from West Virginia State College?", expect: /1937/ },
  { id: "a2", bucket: "answerable", question: "Who supervised the West Area Computers section Johnson was originally assigned to?", expect: /dorothy vaughan/i },
  { id: "a3", bucket: "answerable", question: "Which astronaut asked NASA to have Johnson personally verify the electronic computer's orbit calculations before his flight?", expect: /john glenn/i },
  { id: "a4", bucket: "answerable", question: "What award did President Obama present to Johnson in 2015?", expect: /presidential medal of freedom/i },
  { id: "a5", bucket: "answerable", question: "How many daughters did Katherine and James Goble have?", expect: /three|3/i },
  { id: "a6", bucket: "answerable", question: "In what year did Johnson retire from NASA?", expect: /1986/ },
  { id: "a7", bucket: "answerable", question: "Who played Katherine Johnson in the film Hidden Figures?", expect: /taraji p\.? henson/i },
  // — contested / ambiguous (the article's own words pull two ways, or the
  // question asks for a single number the material never resolves to one) —
  { id: "c1", bucket: "contested", question: "Did Katherine Johnson feel segregated at NASA?" },
  { id: "c2", bucket: "contested", question: "Was Katherine Johnson's name on NASA reports from the start of her career there?" },
  { id: "c3", bucket: "contested", question: "Did Katherine Johnson calculate the original trajectory for the Apollo 13 mission?" },
  { id: "c4", bucket: "contested", question: "Was NASA's Langley installation still segregated after NACA became NASA in 1958?" },
  { id: "c5", bucket: "contested", question: "How many spaceflights in total did Johnson's calculations support?" },
  { id: "c6", bucket: "contested", question: "Did Katherine Johnson want her likeness used on the Lego Women of NASA figure?" },
  { id: "c7", bucket: "contested", question: "Was Katherine Johnson the sole author of the first NASA report to carry her name?" },
  // — genuinely absent (checked by hand: the saved body text never
  // discusses any of these) —
  { id: "n1", bucket: "absent", question: "What was Katherine Johnson's favorite food?" },
  { id: "n2", bucket: "absent", question: "Did Katherine Johnson ever meet Neil Armstrong in person?" },
  { id: "n3", bucket: "absent", question: "What was Katherine Johnson's annual salary at NASA?" },
  { id: "n4", bucket: "absent", question: "Did Katherine Johnson have any pets?" },
  { id: "n5", bucket: "absent", question: "What political party did Katherine Johnson belong to?" },
  { id: "n6", bucket: "absent", question: "Did Katherine Johnson ever travel to space herself?" },
];

// ── THE PRODUCTION READER, key for key with app.js (same options object
// shape as product-assay.mjs::organs and model-swap-diff.mjs) ───────────
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

// ── PHASE 1: first-time ingest, timed — chunk + read-on-arrival over the
// whole document, exactly the pipeline a live upload runs. ─────────────
const passages = chunkSource(DOC_NAME, DOC_TEXT);
const ingestT0 = Date.now();
const arrival = await readOnArrival({ name: DOC_NAME, passages, relationsFor, hyperlexicon: hl, ledger: null, frame, recipe, yieldFn: async () => {} });
const ingestMs = Date.now() - ingestT0;
const ledger = arrival.log;
const notes = hl.foldWithStanding(ledger);
console.log(`\nPHASE 1 — INGEST: ${WORDS} words, ${passages.length} passage(s) → ${notes.length} note(s) on the ledger in ${ingestMs} ms (${arrival.ms} ms reported by readOnArrival itself)`);
const ingestTargetMs = Math.ceil((WORDS / 10000) * 30000);
console.log(`  target: <= ${ingestTargetMs} ms (30s per 10k words, ${WORDS} words here) — ${ingestMs <= ingestTargetMs ? "PASS" : "FAIL"}`);

// ── byte-verification: a claim's span checked against the ACTUAL source
// bytes, never trusted — same check as product-assay.mjs::verifySpan.
//
// Checked against RAW claim spans (captured from r.sections before
// answerRecord's address-only AnswerRecord shape strips .text — P100/P55:
// the record a caller hands toward the mouth carries no span text on
// purpose), so this can confirm the bytes at the claimed address actually
// equal the text the organ claimed, not merely that the address resolves.
function verifySpan(sp, corpus, pool) {
  const name = String(sp.ref ?? "").split("#")[0];
  const src = corpus[name];
  if (src == null || !Number.isFinite(sp.start) || !Number.isFinite(sp.end)) return { ok: false, frame: null };
  if (src.slice(sp.start, sp.end) === sp.text) return { ok: true, frame: "source" };
  const p = (pool ?? []).find((x) => x.ref === sp.ref);
  if (p && src.slice(p.start + sp.start, p.start + sp.end) === sp.text) return { ok: true, frame: "passage" };
  return { ok: false, frame: null };
}

// ── THE MODEL, real Ollama calls, wall-clock timed by THIS script ──────
const call = async (messages, opts = {}) => {
  const body = { model: MODEL, stream: false, options: { temperature: 0, num_predict: opts.maxTokens ?? 300 }, messages };
  if (opts.json) body.format = opts.json;
  const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  return (await res.json())?.message?.content ?? "";
};

// ── PHASE 2+3: per-question turns. Each question is run TWICE through the
// real pipeline — first run is COLD (this exact question never asked
// before against this ledger), second run is a CACHE HIT (identical task,
// same ledger, same retrieval — the repeat-question path). Refusal
// latency is read off the "absent" bucket's own turns rather than a
// separate synthetic path, since a refusal IS one of the three outcomes
// runHolonicTask's real turn can reach (P104-P107's typed vocabulary),
// never a special-cased fast lane in this driver. ──────────────────────
const results = [];
let totalCalls = 0;
for (const q of QUESTIONS) {
  const runOnce = async () => {
    const t0 = Date.now();
    let calls = 0;
    const r = await runHolonicTask({
      task: q.question, chunks: passages, call: async (m, o) => { calls += 1; totalCalls += 1; return call(m, o); },
      foldedRefs: [], makeNameResolver: null, makeRelationReader: (ps, o) => relationsFor(ps, o), checkLink: null,
      // planMode MUST be the literal string "flat", never a bare boolean —
      // holon.js checks `planMode === "flat"` (app.js's own real call sites,
      // holonicTurn(question, question, "flat", ...), never pass false).
      // A non-"flat" value falls through to full task DECOMPOSITION even
      // for a single interrogative sentence — which is what this driver
      // was doing until now, and is why every answer came back structured
      // as multi-part markdown ("## Background", "## Award Type"...) with
      // 5-9 model calls each: each decomposed part ran its own retrieval/
      // draft/correction/witness cycle. Fixed to match the real app.
      planMode: "flat", chatHistory: [], discourse: "",
      hyperlexicon: hl, hyperlexiconLog: ledger, hyperlexiconFrame: frame, hyperlexiconRecipe: recipe,
    });
    const ms = Date.now() - t0;
    const rec = answerRecord({ question: q.question, answer: r.output ?? "", model: MODEL, frame, recipe, sections: r.sections ?? [], unsupported: r.unsupported ?? [], unbacked: r.unbacked ?? [], sources: [{ name: DOC_NAME, sha256: createHash("sha256").update(DOC_TEXT).digest("hex"), bytes: DOC_TEXT.length }], voids: hl.foldVoids ? hl.foldVoids(ledger) : [], witness: r.witness ?? [] });
    // raw claim spans, captured BEFORE answerRecord's address-only shape
    // strips .text (P100/P55) — this is the only place this driver can
    // still check that a span's bytes actually say what was claimed.
    const rawSpans = (r.sections ?? []).flatMap((s) => (s?.relations?.claims ?? []).flatMap((c) => c.spans ?? []));
    return { ms, calls, output: r.output ?? "", rec, rawSpans };
  };
  const cold = await runOnce();
  const hit = await runOnce();

  // byte-verify every bound claim's spans against the real document bytes
  const spanChecks = cold.rawSpans.map((sp) => verifySpan(sp, CORPUS, passages));
  const spansOk = spanChecks.filter((s) => s.ok).length;

  // fabrication: the app's own grounding check — a sentence the mouth
  // asserted that the reader could not bind to the material (unsupported)
  // or that the checker actively contradicted (unbacked). This is the SAME
  // signal model-swap-diff.mjs (P100/S68) gates on: "nothing-backs = 0".
  const fabrications = cold.rec.unsupported.length + cold.rec.unbacked.length;

  const isAbsent = q.bucket === "absent";
  const refusalLike = /\b(not (stated|mentioned|discussed|addressed)|does not (say|state|mention|discuss)|no (mention|information|statement)|not (available|covered) in|the (article|material|source|text) (does not|doesn't))\b/i.test(cold.output) || cold.rec.absenceTally.citingVoid + cold.rec.absenceTally.citingNone > 0;

  results.push({
    id: q.id, bucket: q.bucket, question: q.question,
    coldMs: cold.ms, hitMs: hit.ms, coldCalls: cold.calls, hitCalls: hit.calls,
    output: cold.output.replace(/\s+/g, " ").slice(0, 300),
    spansTotal: spanChecks.length, spansOk,
    fabrications, unsupported: cold.rec.unsupported, unbacked: cold.rec.unbacked,
    expectMatched: q.expect ? q.expect.test(cold.output) : null,
    refusalLike: isAbsent ? refusalLike : null,
    latencyTarget: isAbsent ? 2000 : 15000,
    latencyPass: isAbsent ? cold.ms <= 2000 : cold.ms <= 15000,
    hitLatencyPass: hit.ms <= 8000,
  });
  console.log(`\n[${q.bucket}] ${q.id} ${q.question}`);
  console.log(`  → ${results.at(-1).output}`);
  console.log(`  cold ${cold.ms} ms (${cold.calls} call(s)) · hit ${hit.ms} ms (${hit.calls} call(s)) · spans ${spansOk}/${spanChecks.length} verified · fabrications ${fabrications}${isAbsent ? ` · refusal-like: ${refusalLike}` : ""}${q.expect ? ` · expected fact matched: ${results.at(-1).expectMatched}` : ""}`);
}

// ── THE NUMBERS ──────────────────────────────────────────────────────
const totalFab = results.reduce((a, r) => a + r.fabrications, 0);
const totalSpans = results.reduce((a, r) => a + r.spansTotal, 0);
const totalSpansOk = results.reduce((a, r) => a + r.spansOk, 0);
const answerable = results.filter((r) => r.bucket === "answerable");
const contested = results.filter((r) => r.bucket === "contested");
const absent = results.filter((r) => r.bucket === "absent");
const answerableHit = answerable.filter((r) => r.expectMatched).length;
const absentRefused = absent.filter((r) => r.refusalLike).length;
const coldMsAll = results.map((r) => r.coldMs);
const hitMsAll = results.map((r) => r.hitMs);
const absentColdMs = absent.map((r) => r.coldMs);
const nonAbsentColdMs = [...answerable, ...contested].map((r) => r.coldMs);

const numbers = {
  ran: new Date().toISOString(),
  model: MODEL, recipe,
  words: WORDS, passages: passages.length,
  ingestMs, ingestTargetMs, ingestPass: ingestMs <= ingestTargetMs,
  totalCalls,
  fabrications: totalFab, fabricationsPass: totalFab === 0,
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
console.log(`fabrications: ${totalFab} (must be 0) — ${numbers.fabricationsPass ? "PASS" : "FAIL"}`);
console.log(`citation verification: ${totalSpansOk}/${totalSpans} spans resolve to real source bytes (${numbers.citationVerificationRate})`);
console.log(`answerable bucket: expected fact present in ${answerableHit}/${answerable.length} answers`);
console.log(`absent bucket: refusal-like language in ${absentRefused}/${absent.length} answers`);
console.log(`latency — cold material: max ${numbers.latency.coldMaterialMax} ms (target <=15000) — ${numbers.latency.coldMaterialPass ? "PASS" : "FAIL"}`);
console.log(`latency — cache-hit full answer: max ${numbers.latency.cacheHitFullAnswerMax} ms (target <=8000) — ${numbers.latency.cacheHitFullAnswerPass ? "PASS" : "FAIL"}`);
console.log(`latency — refusal path: max ${numbers.latency.refusalMax} ms (target <=2000) — ${numbers.latency.refusalPass ? "PASS" : "FAIL"}`);

mkdirSync(new URL("./results/", import.meta.url).pathname, { recursive: true });
writeFileSync(new URL("./results/mvp-acceptance.json", import.meta.url), JSON.stringify({ numbers, results }, null, 2));
console.log("\nraw: results/mvp-acceptance.json");
