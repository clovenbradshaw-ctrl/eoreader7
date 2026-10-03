#!/usr/bin/env node
// eval/eot-realize.mjs — THE REVERSE LEG: EOT -> ENGLISH GRAMMAR -> NL, NO MODEL.
//
// The forward leg is the fold's own reading path (raw English -> English
// grammar/parser -> EOT meaning layer). This eval runs the reverse leg: from an
// EOTRich@1 record, the ENGLISH GRAMMAR (measured order parameters + a measured
// morphology table + the closed set + regular rules) projects the meaning layer
// back into English surface text — pure mechanics, no model.
//
//   node native/eval/eot-realize.mjs [--json OUT] [--n N]
//   node native/eval/eot-realize.mjs --read <document> [--start-byte N] [--n N]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseConllu, toEot, measureOrder, linearize, kendallTau, annotationFromMeaning } from "../kernel/eot-rich.js";
import { learnForms, realizeRecord, realizeToken } from "../kernel/eot-realize.js";
import { splitSentences, normaliseNewlines } from "../adapters/text/spans.js";
import { enrichRecords } from "../kernel/eot-enrich.js";
import { notationOf } from "../the-fold/eot-notation.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const EWT = path.join(ROOT, "native", "scripts", "corpus", "en_ewt-ud-train.conllu");

const goldWords = (rec) => (rec?.surface?.text ?? "").trim().split(/\s+/).filter(Boolean);
const stripPunct = (ws) => { const out = [...ws]; while (out.length && /^[.!?…;,:"'()\[\]{}\-]+$/.test(out[out.length - 1])) out.pop(); return out; };

export function realizedTokens(rec, { forms = null, params = null } = {}) {
  const rows = annotationFromMeaning(rec);
  const order = params ? linearize(rows, params) : rows.map((r) => r.key);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const tokens = [];
  for (const key of order) { const row = byKey.get(key); if (row) tokens.push(realizeToken(row, forms)); }
  return { tokens, keys: order };
}

export function scoreRecord(rec, tokens, keys, goldKeys) {
  const goldNo = stripPunct(goldWords(rec));
  const bag = new Set(goldNo.map((w) => w.toLowerCase()));
  const form = tokens.filter((w) => bag.has(w.toLowerCase())).length;
  const orderTau = kendallTau(tokens.map((w) => w.toLowerCase()), goldNo.map((w) => w.toLowerCase()));
  const orderTauId = goldKeys ? kendallTau(keys, goldKeys) : null;
  const n = Math.min(tokens.length, goldNo.length);
  let word = 0;
  for (let i = 0; i < n; i++) if (tokens[i].toLowerCase() === goldNo[i].toLowerCase()) word++;
  return { form, formN: tokens.length, orderTau, orderTauId, word, wordN: Math.max(n, 1) };
}

export function runEnglish({ n = null } = {}) {
  const sents = parseConllu(fs.readFileSync(EWT, "utf8"));
  const sample = n ? sents.slice(0, n) : sents;
  const fold = [sample.filter((_, i) => i % 2 === 0), sample.filter((_, i) => i % 2 === 1)];
  const r = { treebank: "ud-english-ewt", language: "en", sentences: sample.length, form: 0, formN: 0, orderSum: 0, orderIdSum: 0, orderIdN: 0, word: 0, wordN: 0, sent: 0, samples: { exact: [], near: [], far: [] } };
  fold.forEach((half, h) => {
    const other = fold[1 - h];
    const params = measureOrder(other);
    const forms = learnForms(other);
    for (const s of half) {
      const rec = toEot(s, { language: "eng", source: `${r.treebank}/${s.file ?? ""}` });
      const { tokens, keys } = realizedTokens(rec, { forms, params });
      const text = realizeRecord(rec, { forms, params });
      const goldKeys = s.tokens.filter((t) => !String(t.deprel).startsWith("punct")).map((t) => rec.surface.keyOfId[t.id]);
      const sc = scoreRecord(rec, tokens, keys, goldKeys);
      r.form += sc.form; r.formN += sc.formN; r.orderSum += sc.orderTau;
      if (sc.orderTauId != null) { r.orderIdSum += sc.orderTauId; r.orderIdN++; }
      r.word += sc.word; r.wordN += sc.wordN;
      if (text.replace(/[.!?…]+$/, "").trim().toLowerCase() === (rec.surface?.text ?? "").trim().toLowerCase()) r.sent++;
    }
  });
  r.formPct = r.formN ? 100 * r.form / r.formN : 0;
  r.orderTau = r.sentences ? r.orderSum / r.sentences : 0;
  r.orderTauId = r.orderIdN ? r.orderIdSum / r.orderIdN : null;
  r.wordPct = r.wordN ? 100 * r.word / r.wordN : 0;
  r.sentPct = r.sentences ? 100 * r.sent / r.sentences : 0;
  const all = measureOrder(sample);
  const at = (rel) => { const p = all[`${rel}|NOUN`] ?? all[rel]; return p ? { pos: p.before >= 0.5 ? p.meanLeft : p.meanRight } : null; };
  const subj = at("nsubj"), obj = at("obj");
  r.order = (subj && obj) ? [["S", subj.pos], ["V", 0], ["O", obj.pos]].sort((a, b) => a[1] - b[1]).map((x) => x[0]).join("") : "undetermined";
  return r;
}

const pct = (x) => `${x.toFixed(1)}%`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const nIdx = process.argv.indexOf("--n");
  const n = nIdx > 0 ? Number(process.argv[nIdx + 1]) : null;
  const r = runEnglish({ n });
  console.log(`EOT -> English grammar -> NL, no model — ${r.treebank}`);
  console.log(`sentences ${r.sentences} | FORMS ${pct(r.formPct)} | ORDER tau(id) ${r.orderTauId?.toFixed(3) ?? "n/a"} | ORDER tau(word) ${r.orderTau.toFixed(3)} | WORD+POS ${pct(r.wordPct)} | SENTENCE EXACT ${pct(r.sentPct)} | basic order ${r.order}`);
  const outIdx = process.argv.indexOf("--json");
  const out = outIdx > 0 ? process.argv[outIdx + 1] : path.join(ROOT, "native", "eval", "results", "eot-realize.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const { samples, ...head } = r;
  fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), ...head }, null, 2));
  console.log(`\n${out}`);
}
