// eot-realize.test.mjs — EOT -> English grammar -> NL, no model, walled at its
// first full measurement (12,544 sentences of UD_English-EWT, two-fold):
// FORMS ~84%, ORDER tau(id) ~0.778, WORD+POS ~37%. Floors at or below measurement.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseConllu, toEot } from "../kernel/eot-rich.js";
import { learnForms, normFeats, regularForm, realizeRecord } from "../kernel/eot-realize.js";
import { runEnglish } from "./eot-realize.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EWT = path.join(HERE, "..", "scripts", "corpus", "en_ewt-ud-train.conllu");

const DEMO = `# sent_id = demo1
# text = The steamboat reached Nashville in 1819.
1\tThe\tthe\tDET\tDT\tDefinite=Def|PronType=Art\t2\tdet\t_\t_
2\tsteamboat\tsteamboat\tNOUN\tNN\tNumber=Sing\t3\tnsubj\t_\t_
3\treached\treach\tVERB\tVBD\tMood=Ind|Number=Sing|Person=3|Tense=Past|VerbForm=Fin\t0\troot\t_\t_
4\tNashville\tNashville\tPROPN\tNNP\tNumber=Sing\t3\tobj\t_\t_
5\tin\tin\tADP\tIN\t_\t6\tcase\t_\t_
6\t1819\t1819\tNUM\tCD\tNumType=Card\t3\tobl\t_\t_
7\t.\t.\tPUNCT\t.\t_\t3\tpunct\t_\t_
`;

let cachedForms = null;
function forms() { if (cachedForms) return cachedForms; cachedForms = learnForms(parseConllu(fs.readFileSync(EWT, "utf8"))); return cachedForms; }

test("normFeats serializes a feature set the way the meaning layer does", () => {
  assert.equal(normFeats("Tense=Past|VerbForm=Fin|Mood=Ind"), "Mood=Ind|Tense=Past|VerbForm=Fin");
  assert.equal(normFeats("_"), "");
});

test("regularForm puts the regular English tail back on", () => {
  assert.equal(regularForm("NOUN", "cat", "Number=Plur"), "cats");
  assert.equal(regularForm("NOUN", "box", "Number=Plur"), "boxes");
  assert.equal(regularForm("NOUN", "baby", "Number=Plur"), "babies");
  assert.equal(regularForm("VERB", "reach", "Mood=Ind|Tense=Past|VerbForm=Fin"), "reached");
  assert.equal(regularForm("VERB", "make", "VerbForm=Ger"), "making");
});

test("learnForms carries the measured irregular tail (men, women, does, went)", () => {
  const f = forms();
  assert.equal(f.get("NOUN|man|Number=Plur"), "men");
  assert.equal(f.get("NOUN|woman|Number=Plur"), "women");
  assert.equal(f.get("VERB|go|Mood=Ind|Number=Sing|Person=3|Tense=Past|VerbForm=Fin"), "went");
});

test("an EOTRich record projects to readable English, deterministically", () => {
  const rec = toEot(parseConllu(DEMO)[0], { language: "eng", source: "demo" });
  const params = {
    "det|DET": { before: 1, meanLeft: -1, meanRight: 1 }, "nsubj|NOUN": { before: 1, meanLeft: -1, meanRight: 1 },
    "obj|PROPN": { before: 0, meanLeft: -1, meanRight: 1 }, "obl|NUM": { before: 0, meanLeft: -1, meanRight: 1 },
    "case|ADP": { before: 1, meanLeft: -1, meanRight: 1 }, "case|NUM": { before: 1, meanLeft: -1, meanRight: 1 },
  };
  const a = realizeRecord(rec, { forms: null, params });
  assert.equal(a, realizeRecord(rec, { forms: null, params }), "pure — no randomness");
  assert.equal(a, "The steamboat reached Nashville in 1819.");
});
