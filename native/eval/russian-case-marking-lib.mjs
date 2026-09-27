// native/eval/russian-case-marking-lib.mjs — the Russian case-reader
// measurement as a function, so a test reads it on every run (solon: a result
// written only to a gitignored path is enforced by nothing).
// relations-case-marked.js's full pipeline on RUSSIAN, its organs derived from
// UD_Russian-GSD TRAIN (case-marking-rus.json, pos-prior-ru.json —
// adapters/text/case-marked-language.js), scored against a held-out GSD split's
// gold nsubj/obj, beside the dumb baseline it must beat: POSITION (the word
// before the finite verb is end1, the word after is end2), handed the gold verb.
// Floors are Latin's shipped values (minVolume 5, minShare 0.4), declared.
import { readFileSync } from "node:fs";
import { extractCaseMarkedRelation } from "../adapters/text/relations-case-marked.js";
import { caseMarkedLanguage } from "../adapters/text/case-marked-language.js";

export function runRussianCaseEval(SPLIT = "test") {
  const LP = new URL("../../../live_priors/derived-priors/", import.meta.url);
  const casePrior = JSON.parse(readFileSync(new URL("case-priors/case-marking-rus.json", LP), "utf8"));
  const posPrior = JSON.parse(readFileSync(new URL("pos-priors/pos-prior-ru.json", LP), "utf8"));
  const MIN_VOLUME = 5, MIN_SHARE = 0.4;
  const ru = caseMarkedLanguage({ casePrior, posPrior, verbEndingLen: 3, minVolume: MIN_VOLUME, minShare: MIN_SHARE });
  const TEST = new URL(`./fixtures/ud-russian-gsd/ru_gsd-ud-${SPLIT}.conllu`, import.meta.url);
  const ARMS = { bare: {}, heads: { isHead: ru.isHead }, governed: { adpositions: ru.adpositions }, order: { orderTieBreak: true }, all: { isHead: ru.isHead, adpositions: ru.adpositions, orderTieBreak: true } };

  function parse(conllu) {
    const out = []; let text = null, tokens = [];
    for (const line of conllu.split("\n")) {
      if (line.startsWith("# text = ")) { text = line.slice(9); continue; }
      if (!line.trim()) { if (text && tokens.length) out.push({ text, tokens }); text = null; tokens = []; continue; }
      if (line.startsWith("#")) continue;
      const c = line.split("\t");
      if (c.length < 8 || !/^\d+$/.test(c[0])) continue;
      tokens.push({ form: c[1], upos: c[3], feats: c[5], deprel: c[7].split(":")[0] });
    }
    if (text && tokens.length) out.push({ text, tokens });
    return out;
  }
  const clean = (w) => String(w ?? "").toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  const prf = (tp, fp, fn) => ({ tp, fp, fn, precision: tp + fp ? +(tp / (tp + fp)).toFixed(3) : null, recall: tp + fn ? +(tp / (tp + fn)).toFixed(3) : null });
  const score = () => ({ e1: [0, 0, 0], e2: [0, 0, 0] });
  const tally = (s, which, got, gold) => {
    const t = s[which];
    if (gold) { if (got && clean(got) === clean(gold)) t[0]++; else { t[2]++; if (got) t[1]++; } } else if (got) t[1]++;
  };
  const arms = Object.fromEntries(Object.keys(ARMS).map((k) => [k, score()])), position = score(); const gaps = {}; const examples = [];
  let single = 0, skipped = 0;
  for (const s of parse(readFileSync(TEST, "utf8"))) {
    const fin = s.tokens.filter((t) => (t.upos === "VERB" || t.upos === "AUX") && /VerbForm=Fin/.test(t.feats));
    if (fin.length !== 1) { skipped++; continue; }
    single++;
    const gs = s.tokens.find((t) => t.deprel === "nsubj")?.form, go = s.tokens.find((t) => t.deprel === "obj")?.form;
    let r;
    for (const [k, extra] of Object.entries(ARMS)) {
      const x = extractCaseMarkedRelation(s.text, { casePrior: ru.casePrior, excludeForms: ru.excludeForms, classifyVerb: ru.classifyVerb, minVolume: MIN_VOLUME, minShare: MIN_SHARE, ...extra });
      tally(arms[k], "e1", x.end1?.word, gs); tally(arms[k], "e2", x.end2?.word, go);
      if (k === "all") r = x;
    }
    for (const g of [].concat(r.gap ?? [])) { const k = typeof g === "object" ? g.reason : g; gaps[k] = (gaps[k] ?? 0) + 1; }
    // positional baseline: the finite verb's gold position (generous — it is handed the verb), nearest content word each side
    const words = s.tokens.map((t) => t.form); const vi = s.tokens.indexOf(fin[0]);
    const isContent = (t) => ["NOUN", "PROPN", "PRON", "ADJ", "NUM"].includes(t.upos);
    const before = [...s.tokens.slice(0, vi)].reverse().find(isContent)?.form, after = s.tokens.slice(vi + 1).find(isContent)?.form;
    tally(position, "e1", before, gs); tally(position, "e2", after, go);
    if (examples.length < 8 && (gs || go)) examples.push({ text: s.text, end1: r.end1?.word ?? null, label: r.label?.word ?? null, end2: r.end2?.word ?? null, gold: { nsubj: gs ?? null, obj: go ?? null }, gap: r.gap });
  }

  return {
  schema: "EORussianCaseMarkingEval@1", giver: casePrior.provenance?.giver, floors: { minVolume: MIN_VOLUME, minShare: MIN_SHARE, verbEndingLen: 3 },
  singleFiniteClause: single, skippedMultiClause: skipped,
  split: SPLIT,
  arms: Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, { end1VsNsubj: prf(...v.e1), end2VsObj: prf(...v.e2) }])),
  positionBaseline_handedTheGoldVerb: { end1VsNsubj: prf(...position.e1), end2VsObj: prf(...position.e2) },
  gaps, examples,
};
}
