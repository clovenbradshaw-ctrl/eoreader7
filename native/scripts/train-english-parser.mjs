#!/usr/bin/env node
// scripts/train-english-parser.mjs — train the English reader and say what taught it.
//
// THE PROVENANCE LAW, for parsers (user direction 2026-09-21, the same law the
// Greek priors keep): every parser carries the provenance of what it was
// trained on — the treebank, the exact file (content hash), its GENRE, its
// PERIOD and its REGION — so readings can be kept apart by period and region,
// and a reading made with a parser from one period on material from another
// says so. Ancient Greek taught this first: Koine and Classical endings
// disagree on seven endings, so one prior cannot stand for both.
//
// The period, region and genre of a treebank are RECEIVED from its own
// documentation and passed as named arguments — never inferred. What the
// builder can measure (sentences, tokens, the file hash, the held-out scores)
// it measures. What it cannot, it states as declared, with its giver.
//
// EVALUATION: the treebank's official held-out splits are not on disk, so the
// builder holds out every tenth sentence (index mod 10 = 9) and never trains
// on them. Disclosed, never passed off as the official test split.
//
//   node native/scripts/train-english-parser.mjs [--in=FILE] [--out=FILE]
//       [--treebank=NAME] [--period=…] [--region=…] [--genre=…] [--iterations=N]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseConllu } from "../kernel/eot-rich.js";
import { train, loadModel, analyse, tokenize, tagSentence, parseSentence, labelSentence, lemmaAndFeats } from "../adapters/text/english-parser.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;

const IN = arg("in", path.join(ROOT, "legacy-eoreader6.1", "scripts", "corpus", "en_ewt-ud-train.conllu"));
const OUT = arg("out", path.join(ROOT, "native", "priors", "parser-eng-ewt.json"));
const ITER = Number(arg("iterations", "5"));
// RECEIVED from the treebank's own documentation (UD_English-EWT README and
// the Linguistic Data Consortium's English Web Treebank, LDC2012T13). Stated
// as declared, with that giver; the builder does not measure these.
const DECLARED = {
  treebank: arg("treebank", "UD_English-EWT"),
  genre: arg("genre", "web text: weblogs, newsgroups, emails, reviews, question-answer forums"),
  period: arg("period", "2000s (English Web Treebank, LDC2012T13)"),
  region: arg("region", "predominantly American English"),
  giver: "the treebank's own documentation (UD_English-EWT README; LDC2012T13), declared by the builder, not measured",
};

const bytes = fs.readFileSync(IN);
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
const all = parseConllu(bytes.toString("utf8"));
const trainSet = all.filter((_, i) => i % 10 !== 9);
const heldOut = all.filter((_, i) => i % 10 === 9);
console.log(`treebank ${DECLARED.treebank}: ${all.length} sentences (${trainSet.length} train, ${heldOut.length} held out), sha256 ${sha256.slice(0, 16)}…`);

const t0 = Date.now();
const json = train(trainSet, { iterations: ITER, seed: `${DECLARED.treebank}#${sha256.slice(0, 12)}`, log: (m) => console.log(`   ${m}`) });
console.log(`trained in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

// ── held-out measurement ───────────────────────────────────────────────────
const model = loadModel(json);
let n = 0, upos = 0, uas = 0, las = 0, lemma = 0, feats = 0, nNoPunct = 0, uasNP = 0, lasNP = 0;
let adjL = 0, adjR = 0;
const t1 = Date.now();
for (const s of heldOut) {
  const forms = s.tokens.map((t) => t.form);
  const rows = analyse(model, forms); // predicted tags feed the parser, as at use
  s.tokens.forEach((g, k) => {
    const r = rows[k];
    n++;
    if (r.upos === g.upos) upos++;
    if (r.head === g.head) { uas++; if (r.deprel === g.deprel) las++; }
    if (r.lemma === g.lemma) lemma++;
    if (r.feats === g.feats) feats++;
    if (g.upos !== "PUNCT") { nNoPunct++; if (r.head === g.head) { uasNP++; if (r.deprel === g.deprel) lasNP++; } }
    // THE NULL ARMS: attach every word to its left or right neighbour.
    if (g.head === k) adjL++;
    if (g.head === k + 2) adjR++;
  });
}
const secs = (Date.now() - t1) / 1000;
// Tokenizer against the treebank's own raw sentence text.
let tp = 0, pred = 0, gold = 0;
for (const s of heldOut) {
  if (!s.text) continue;
  const p = tokenize(s.text).map((t) => t.form);
  const g = s.tokens.map((t) => t.form);
  pred += p.length; gold += g.length;
  const bag = new Map(); for (const x of g) bag.set(x, (bag.get(x) ?? 0) + 1);
  for (const x of p) { const c = bag.get(x); if (c) { tp++; bag.set(x, c - 1); } }
}
const pct = (a, b) => Number((100 * a / b).toFixed(2));
const scores = {
  heldOutSentences: heldOut.length, heldOutWords: n,
  upos: pct(upos, n), uas: pct(uas, n), las: pct(las, n), lemma: pct(lemma, n), feats: pct(feats, n),
  uasNoPunct: pct(uasNP, nNoPunct), lasNoPunct: pct(lasNP, nNoPunct),
  nullAttachLeft: pct(adjL, n), nullAttachRight: pct(adjR, n),
  tokenizerF1: Number((200 * tp / (pred + gold)).toFixed(2)),
  wordsPerSecond: Math.round(n / secs),
};
console.log("held-out:", JSON.stringify(scores));

json.provenance = {
  schema: "ParserProvenance@1",
  trainedOn: { ...DECLARED, file: path.relative(ROOT, IN), sha256, sentences: all.length, tokens: all.reduce((a, s) => a + s.tokens.length, 0) },
  split: { train: trainSet.length, heldOut: heldOut.length, rule: "held out: every tenth sentence (index mod 10 = 9); the official held-out splits were not on disk" },
  scores,
  builtAt: new Date().toISOString(),
  builder: "native/scripts/train-english-parser.mjs",
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(json));
console.log(`${OUT}  ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB`);
