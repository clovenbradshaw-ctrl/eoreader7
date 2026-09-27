// native/eval/russian-role-cues-lib.mjs — adapters/text/role-cues.js on
// RUSSIAN, learned on UD_Russian-GSD TRAIN, scored on a held-out split's gold
// nsubj/obj, beside the case reader (russian-case-marking-lib.mjs's "all" arm)
// and the position baseline handed the gold verb. Arms remove one channel at
// a time, so each channel's contribution is a measurement, not a claim.
// Declared: endingLen 2, verbEndingLen 3, minVolume 5, smoothing 1,
// margin ln 2 (the chosen assignment at least twice as likely as the next),
// clearEnding 0.9 (the infant teacher's bar).
//
// PRE-REGISTERED 2026-09-27, before the TEST split was read. Everything above
// was developed on DEV only. The test split is run once, and reported as run:
//   P1  "all" beats the case reader on end1 precision AND end1 recall, scored
//       against the same gold (nsubj / obj attached to THE finite verb)
//   P2  "all" beats the position baseline (handed the gold verb) on end1
//       precision; it is NOT predicted to beat it on recall
//   P3  "all" beats the case reader on end2 precision
//   P4  the infant arm (no role labels) is predicted to FAIL — on dev it read
//       0.13 / 0.08 because Russian's clear endings are almost all oblique;
//       it is reported, not rescued
// Ablations are reported beside "all"; no channel is removed on their account.
import { readFileSync } from "node:fs";
import { learnRoleCues, assignRoles, CUE_CHANNELS } from "../adapters/text/role-cues.js";
import { caseMarkedLanguage } from "../adapters/text/case-marked-language.js";
import { extractCaseMarkedRelation } from "../adapters/text/relations-case-marked.js";

export const DECLARED = Object.freeze({ endingLen: 2, verbEndingLen: 3, minVolume: 5, smoothing: 1, margin: Math.log(2), clearEnding: 0.9 });

// THE INFANT'S TEACHER (user: "when in doubt, think how an infant learns").
// No role labels: each WORD whose ending is unambiguous (the case prior's top
// reading at >= clearEnding share) teaches by its case — nominative a first
// end, accusative a second, any other case "other" — and an unclear word
// teaches nothing. (A first cut required every word of a clause to be clear:
// 0 of 1,893 training clauses qualified; only 12% of nominal tokens clear the
// bar. An infant does not wait for a fully clear sentence.) What those
// clauses show about order, agreement, valency and animacy then decides the
// clauses whose endings are silent. Disclosed: the case prior and the feature
// tables are still counted from the treebank's MORPHOLOGY tags; only the
// syntactic role labels (nsubj/obj) are withheld.
export function endingTeacher({ casePrior, isHead, adpositions, excludeForms, clearEnding, endingLen }) {
  const clear = (w) => { const e = casePrior.nominalEndings[w.toLowerCase().slice(-endingLen)]; const top = e?.ranked?.[0]; return top && e.total >= DECLARED.minVolume && top.share >= clearEnding ? top.key.split("|")[0] : null; };
  return (words, vi) => {
    const labels = new Map(); let nom = 0, acc = 0, unclear = 0;
    for (let i = 0; i < words.length; i += 1) {
      const w = words[i].toLowerCase();
      if (i === vi || excludeForms.has(w) || !isHead(words[i])) continue;
      const governed = i > 0 && adpositions.has(words[i - 1].toLowerCase());
      const c = governed ? "Obl" : clear(words[i]);
      if (!c) { unclear += 1; continue; } // an unclear word teaches nothing
      if (c === "Nom") { nom += 1; labels.set(i, "end1"); } else if (c === "Acc") { acc += 1; labels.set(i, "end2"); } else labels.set(i, "other");
    }
    // two clear nominatives (or accusatives) in one clause: agreeing words or
    // a coordination — which one is the end is not settled, so neither teaches
    for (const [i, r] of labels) if ((r === "end1" && nom > 1) || (r === "end2" && acc > 1)) labels.delete(i);
    if (!labels.size) return null;
    // a slot is known present when a clear word fills it; known absent only if
    // no candidate was unclear (an unclear word might have filled it)
    const valency = { end1: nom >= 1 ? true : unclear ? null : false, end2: acc >= 1 ? true : unclear ? null : false };
    return { labels, valency };
  };
}

export function parseConllu(text) {
  const out = []; let sent = null, tokens = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("# text = ")) { sent = line.slice(9); continue; }
    if (!line.trim()) { if (sent && tokens.length) out.push({ text: sent, tokens }); sent = null; tokens = []; continue; }
    if (line.startsWith("#")) continue;
    const c = line.split("\t");
    if (c.length < 8 || !/^\d+$/.test(c[0])) continue;
    tokens.push({ id: c[0], form: c[1], upos: c[3], feats: c[5], head: c[6], deprel: c[7].split(":")[0] });
  }
  if (sent && tokens.length) out.push({ text: sent, tokens });
  return out;
}

export function runRussianRoleCuesEval(SPLIT = "dev", { margin = DECLARED.margin } = {}) {
  const LP = new URL("../../../live_priors/derived-priors/", import.meta.url);
  const casePrior = JSON.parse(readFileSync(new URL("case-priors/case-marking-rus.json", LP), "utf8"));
  const posPrior = JSON.parse(readFileSync(new URL("pos-priors/pos-prior-ru.json", LP), "utf8"));
  const ru = caseMarkedLanguage({ casePrior, posPrior, verbEndingLen: DECLARED.verbEndingLen, minVolume: DECLARED.minVolume, minShare: 0.4 });
  const read = (s) => parseConllu(readFileSync(new URL(`./fixtures/ud-russian-gsd/ru_gsd-ud-${s}.conllu`, import.meta.url), "utf8"));
  const organs = { isHead: ru.isHead, adpositions: ru.adpositions, excludeForms: ru.excludeForms };
  const train = read("train");
  const model = learnRoleCues(train, { ...DECLARED, ...organs });
  const infant = learnRoleCues(train, { ...DECLARED, ...organs, teacher: endingTeacher({ casePrior, ...organs, clearEnding: DECLARED.clearEnding, endingLen: DECLARED.endingLen }) });
  const clean = (w) => String(w ?? "").toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  const prf = ([tp, fp, fn]) => ({ tp, fp, fn, precision: tp + fp ? +(tp / (tp + fp)).toFixed(3) : null, recall: tp + fn ? +(tp / (tp + fn)).toFixed(3) : null });
  const tally = (t, got, gold) => { if (gold) { if (got && clean(got) === clean(gold)) t[0]++; else { t[2]++; if (got) t[1]++; } } else if (got) t[1]++; };
  const ARMS = { all: CUE_CHANNELS, ...Object.fromEntries(CUE_CHANNELS.map((c) => [`without_${c}`, CUE_CHANNELS.filter((x) => x !== c)])), endingOnly: ["ending", "governed"] };
  const score = Object.fromEntries([...Object.keys(ARMS), "infant", "caseReader", "positionHandedGoldVerb"].map((k) => [k, { e1: [0, 0, 0], e2: [0, 0, 0] }]));
  const hinted = { e1: [0, 0, 0], e2: [0, 0, 0] };
  const gaps = {}; let single = 0, skipped = 0; const ovs = { tried: 0, end1Right: 0 };
  for (const s of read(SPLIT)) {
    const fin = s.tokens.filter((t) => (t.upos === "VERB" || t.upos === "AUX") && /VerbForm=Fin/.test(t.feats));
    if (fin.length !== 1) { skipped++; continue; }
    single++;
    const verb = fin[0];
    const gsT = s.tokens.find((t) => t.deprel === "nsubj" && t.head === verb.id), goT = s.tokens.find((t) => t.deprel === "obj" && t.head === verb.id);
    const gs = gsT?.form, go = goT?.form;
    for (const [k, channels] of Object.entries(ARMS)) {
      const r = assignRoles(s.text, { model, classifyVerb: ru.classifyVerb, isHead: ru.isHead, adpositions: ru.adpositions, excludeForms: ru.excludeForms, margin, channels });
      tally(score[k].e1, r.end1?.word, gs); tally(score[k].e2, r.end2?.word, go);
      if (k === "all") {
        const g = r.gap?.reason; if (g) gaps[g] = (gaps[g] ?? 0) + 1;
        // the channel order alone gets wrong: a gold subject AFTER the verb
        if (gsT && goT && +gsT.id > +verb.id && +goT.id < +verb.id) { ovs.tried++; if (clean(r.end1?.word) === clean(gs)) ovs.end1Right++; }
      }
    }
    const inf = assignRoles(s.text, { model: infant, classifyVerb: ru.classifyVerb, ...organs, margin });
    tally(score.infant.e1, inf.end1?.word, gs); tally(score.infant.e2, inf.end2?.word, go);
    const cr = extractCaseMarkedRelation(s.text, { casePrior: ru.casePrior, excludeForms: ru.excludeForms, classifyVerb: ru.classifyVerb, minVolume: DECLARED.minVolume, minShare: 0.4, isHead: ru.isHead, adpositions: ru.adpositions, orderTieBreak: true });
    tally(score.caseReader.e1, cr.end1?.word, gs); tally(score.caseReader.e2, cr.end2?.word, go);
    { const vi = s.tokens.indexOf(verb), isContent = (t) => ["NOUN", "PROPN", "PRON", "ADJ", "NUM"].includes(t.upos);
      tally(score.positionHandedGoldVerb.e1, [...s.tokens.slice(0, vi)].reverse().find(isContent)?.form, gs); tally(score.positionHandedGoldVerb.e2, s.tokens.slice(vi + 1).find(isContent)?.form, go); }
    const h = assignRoles(s.text, { model, classifyVerb: ru.classifyVerb, isHead: ru.isHead, adpositions: ru.adpositions, excludeForms: ru.excludeForms, margin, verbHint: verb.form });
    tally(hinted.e1, h.end1?.word, gs); tally(hinted.e2, h.end2?.word, go);
  }
  return {
    schema: "EORussianRoleCuesEval@1", split: SPLIT, learnedFrom: "train", declared: { ...DECLARED, margin: +margin.toFixed(4) },
    singleFiniteClause: single, skippedMultiClause: skipped,
    arms: Object.fromEntries(Object.entries(score).map(([k, v]) => [k, { end1VsNsubj: prf(v.e1), end2VsObj: prf(v.e2) }])),
    allHandedTheGoldVerb: { end1VsNsubj: prf(hinted.e1), end2VsObj: prf(hinted.e2) },
    objectFirstClauses: ovs, gaps, infantTaughtBy: { clauses: infant.valencyAll.clauses, of: model.valencyAll.clauses, words: infant.roleTotals, labelledWords: model.roleTotals },
  };
}
