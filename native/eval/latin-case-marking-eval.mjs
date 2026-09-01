// native/eval/latin-case-marking-eval.mjs — the real measurement:
// relations-case-marked.js's full pipeline (raw sentence in, {end1,label,
// end2} out) against 380 held-out UD_Latin-Perseus TEST sentences never
// used to build the case prior, scored against real human-annotated gold
// nsubj/obj dependency relations. Re-runnable, matching this codebase's
// own eval-driver posture (P19/P27/S31): not a committed regression test,
// a reproducible measurement whose numbers a RESULTS.md doc cites.
import { readFileSync, writeFileSync } from "node:fs";
import { extractCaseMarkedRelation, defaultLatinCasePrior } from "../adapters/text/relations-case-marked.js";
import { nativeRegistry } from "../assemblies.js";
import { stampResult } from "../kernel/assembly.js";

const TEST_FIXTURE = new URL("./fixtures/ud-latin-perseus/la_perseus-ud-test.conllu", import.meta.url);
const casePrior = defaultLatinCasePrior();

function parseSentences(conllu) {
  const sentences = [];
  let text = null, tokens = [];
  for (const line of conllu.split("\n")) {
    if (line.startsWith("# text = ")) { text = line.slice(9); continue; }
    if (!line.trim()) { if (text && tokens.length) sentences.push({ text, tokens }); text = null; tokens = []; continue; }
    if (line.startsWith("#")) continue;
    const cols = line.split("\t");
    if (cols.length < 8 || !/^\d+$/.test(cols[0])) continue; // skip multi-word-token ranges like "3-4"
    const [, form, , upos, , feats, , deprelFull] = cols;
    tokens.push({ form, upos, feats, deprel: deprelFull.split(":")[0] });
  }
  if (text && tokens.length) sentences.push({ text, tokens });
  return sentences;
}

const sentences = parseSentences(readFileSync(TEST_FIXTURE, "utf8"));

let single = 0, skippedMultiClause = 0;
let end1TP = 0, end1FP = 0, end1FN = 0;
let end2TP = 0, end2FP = 0, end2FN = 0;
const gapCounts = {};
const rightExamples = [];
const wrongExamples = [];

const matches = (extracted, goldForm) => extracted && extracted.word.toLowerCase().replace(/[.,;:!?]/g, "") === goldForm.toLowerCase();

for (const s of sentences) {
  const finiteVerbs = s.tokens.filter((t) => (t.upos === "VERB" || t.upos === "AUX") && /VerbForm=Fin/.test(t.feats));
  // Multi-clause sentences need clause segmentation this organ does not
  // attempt — named and counted, never silently included and scored wrong.
  if (finiteVerbs.length !== 1) { skippedMultiClause++; continue; }
  single++;

  const goldSubj = s.tokens.find((t) => t.deprel === "nsubj");
  const goldObj = s.tokens.find((t) => t.deprel === "obj");
  const result = extractCaseMarkedRelation(s.text, { casePrior });
  if (result.gap) for (const g of [].concat(result.gap)) {
    const reason = typeof g === "object" ? g.reason : g;
    gapCounts[reason] = (gapCounts[reason] ?? 0) + 1;
  }

  if (goldSubj) {
    if (matches(result.end1, goldSubj.form)) end1TP++;
    else { end1FN++; if (result.end1) end1FP++; }
  } else if (result.end1) end1FP++;

  if (goldObj) {
    if (matches(result.end2, goldObj.form)) end2TP++;
    else { end2FN++; if (result.end2) end2FP++; }
  } else if (result.end2) end2FP++;

  const relevant = goldSubj || goldObj;
  const bothRight = relevant && (!goldSubj || matches(result.end1, goldSubj.form)) && (!goldObj || matches(result.end2, goldObj.form));
  if (bothRight && rightExamples.length < 6) rightExamples.push({ text: s.text, end1: result.end1?.word, end2: result.end2?.word, goldSubj: goldSubj?.form, goldObj: goldObj?.form });
  else if (relevant && !bothRight && wrongExamples.length < 8) wrongExamples.push({ text: s.text, end1: result.end1?.word, end2: result.end2?.word, gap: result.gap, goldSubj: goldSubj?.form, goldObj: goldObj?.form });
}

const prf = (tp, fp, fn) => ({ tp, fp, fn, precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null });

// A2.1 — the measured unit is the link assembly (relation extraction, the
// same family causal-extraction.mjs/extraction-overview.mjs already stamp
// this way); the stamp resolves on the register rather than being
// asserted here.
const report = stampResult(nativeRegistry(), {
  schema: "EOLatinCaseMarkingEval@1",
  testSentencesTotal: sentences.length,
  singleFiniteClauseSentences: single,
  skippedMultiClause,
  end1VsGoldNsubj: prf(end1TP, end1FP, end1FN),
  end2VsGoldObj: prf(end2TP, end2FP, end2FN),
  gapCounts,
  rightExamples,
  wrongExamples,
}, "assembly:link");

console.log(JSON.stringify(report, null, 2));
writeFileSync(new URL("./results/latin-case-marking-eval.json", import.meta.url), JSON.stringify(report, null, 2));
