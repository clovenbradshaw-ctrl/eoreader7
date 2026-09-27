// russian-case-marking.test.js — the Russian case reader's headline result and
// its opt-ins, read on every run (solon: a number written only to a gitignored
// path is enforced by nothing). The held-out split and the priors are
// committed (eval/fixtures/ud-russian-gsd, live_priors derived-priors).
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { runRussianCaseEval } from "../eval/russian-case-marking-lib.mjs";
import { extractCaseMarkedRelation } from "../adapters/text/relations-case-marked.js";
import { caseMarkedLanguage } from "../adapters/text/case-marked-language.js";

const PRIORS = new URL("../../../live_priors/derived-priors/case-priors/case-marking-rus.json", import.meta.url);
const skip = existsSync(PRIORS) ? false : "live_priors sibling checkout absent";

test("held-out GSD test: the case reader is more precise than position on both ends", { skip }, () => {
  const r = runRussianCaseEval("test");
  const all = r.arms.all, pos = r.positionBaseline_handedTheGoldVerb;
  assert.ok(all.end1VsNsubj.precision > pos.end1VsNsubj.precision, JSON.stringify({ all: all.end1VsNsubj, pos: pos.end1VsNsubj }));
  assert.ok(all.end2VsObj.precision > pos.end2VsObj.precision, JSON.stringify({ all: all.end2VsObj, pos: pos.end2VsObj }));
  // disclosed cost, pinned so it cannot drift silently: recall is below position's
  assert.ok(all.end1VsNsubj.recall < pos.end1VsNsubj.recall);
});

// a synthetic case prior and POS prior, so the opt-ins are tested without a treebank
const casePrior = {
  language: "tst", provenance: { giver: "synthetic test prior" },
  nominalEndings: {
    om: { total: 20, ranked: [{ key: "Nom|Sing", count: 20, share: 1 }] }, // 'dom' — nominative
    ku: { total: 20, ranked: [{ key: "Acc|Sing", count: 20, share: 1 }] }, // 'reku' — accusative
    lo: { total: 20, ranked: [{ key: "Nom|Sing", count: 20, share: 1 }] }, // syncretic noun, reads Nom
  },
  verbFormByEnding: { ide: { total: 20, ranked: [{ key: "Fin", count: 20, share: 1 }] } },
};
const posPrior = { language: "tst", forms: { v: { ADP: 30 }, krasnom: { ADJ: 30 } } };
const ru = caseMarkedLanguage({ casePrior, posPrior, verbEndingLen: 3, minVolume: 5, minShare: 0.4 });
const read = (text, extra = {}) => extractCaseMarkedRelation(text, { casePrior, excludeForms: ru.excludeForms, classifyVerb: ru.classifyVerb, minVolume: 5, minShare: 0.4, ...extra });

test("every floor is declared; a prior with no verb-form table is refused", () => {
  for (const k of ["verbEndingLen", "minVolume", "minShare"]) { const o = { casePrior, posPrior, verbEndingLen: 3, minVolume: 5, minShare: 0.4 }; delete o[k]; assert.throws(() => caseMarkedLanguage(o), new RegExp(k)); }
  assert.throws(() => caseMarkedLanguage({ casePrior: { ...casePrior, verbFormByEnding: undefined }, posPrior, verbEndingLen: 3, minVolume: 5, minShare: 0.4 }), /verbform-table/);
});

test("the treebank's closed class is never an end, and the verb is found by its ending", () => {
  const r = read("dom vide reku");
  assert.equal(r.label.word, "vide"); assert.equal(r.end1.word, "dom"); assert.equal(r.end2.word, "reku");
  assert.ok(ru.excludeForms.has("v"), "ADP-dominant forms are excluded");
});

test("heads only: an agreeing adjective is never an end", () => {
  assert.deepEqual(read("krasnom dom vide reku").gap, ["ambiguous_nominative"]);
  assert.equal(read("krasnom dom vide reku", { isHead: ru.isHead }).end1.word, "dom");
});

test("a noun governed by a preposition is oblique, never an end", () => {
  const r = read("dom vide v reku", { adpositions: ru.adpositions });
  assert.equal(r.end2, null);
});

test("word order breaks a Nom/Acc tie only after morphology, and says so", () => {
  const without = read("dom vide selo");
  assert.deepEqual(without.gap, ["ambiguous_nominative", "intransitive_or_no_object_found"]);
  const withOrder = read("dom vide selo", { orderTieBreak: true });
  assert.equal(withOrder.end1.word, "dom"); assert.equal(withOrder.end1.byOrder, true);
});
