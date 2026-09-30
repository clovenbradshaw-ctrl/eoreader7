import test from "node:test";
import assert from "node:assert/strict";
import { learnRoleCues, assignRoles } from "../adapters/text/role-cues.js";

// A toy case-marked language, as UD sentences: nouns end -a when they are the
// first end, -u when the second; a -ek/-ok noun has ONE form for both (the
// Nom/Acc syncretism); the verb ends -it (singular) or -at (plural) and agrees
// with its first end in number. Order is mostly SVO, sometimes OVS.
let id = 0;
const tok = (form, upos, feats, head, deprel) => ({ id: String(++id), form, upos, feats, head, deprel });
function clause(subj, verb, obj, { ovs = false } = {}) {
  id = 0;
  const v = { form: verb.form, upos: "VERB", feats: `Number=${verb.number}|VerbForm=Fin` };
  const s = { form: subj.form, upos: "NOUN", feats: `Case=Nom|Number=${subj.number}` }, o = { form: obj.form, upos: "NOUN", feats: `Case=Acc|Number=${obj.number}` };
  const order = ovs ? [o, v, s] : [s, v, o];
  const toks = order.map((x) => tok(x.form, x.upos, x.feats, "_", "_"));
  const vt = toks[1];
  toks.forEach((t, i) => { if (i === 1) { t.head = "0"; t.deprel = "root"; } else { t.head = vt.id; t.deprel = order[i] === s ? "nsubj" : "obj"; } });
  return { text: toks.map((t) => t.form).join(" "), tokens: toks };
}
const NOUNS = ["mam", "kot", "pes", "lis", "vol", "sov", "zub", "nos"];
function world() {
  const out = [];
  NOUNS.forEach((a, i) => {
    const b = NOUNS[(i + 3) % NOUNS.length];
    for (let k = 0; k < 4; k += 1) out.push(clause({ form: `${a}a`, number: "Sing" }, { form: "lovit", number: "Sing" }, { form: `${b}u`, number: "Sing" }, { ovs: k === 3 }));
    // syncretic nouns: -ek singular, -ki plural, EITHER role equally often, so
    // the ending says nothing about role; the verb's number agrees with its
    // first end, and only that tells the two apart
    for (let k = 0; k < 3; k += 1) {
      out.push(clause({ form: `${a}ki`, number: "Plur" }, { form: "lovat", number: "Plur" }, { form: `${b}ek`, number: "Sing" }, { ovs: k === 2 }));
      out.push(clause({ form: `${a}ek`, number: "Sing" }, { form: "lovit", number: "Sing" }, { form: `${b}ki`, number: "Plur" }, { ovs: k === 2 }));
    }
  });
  return out;
}
const organs = { isHead: () => true, adpositions: new Set(), excludeForms: new Set() };
const DECL = { endingLen: 2, verbEndingLen: 2, minVolume: 3, smoothing: 1, ...organs };
const read = (model, text, channels) => assignRoles(text, { model, classifyVerb: (w) => (/(it|at)$/.test(w) ? { word: w } : null), ...organs, margin: Math.log(2), ...(channels ? { channels } : {}) });

test("every number is declared", () => {
  assert.throws(() => learnRoleCues([], { isHead: () => true }), /declared/);
  const m = learnRoleCues(world(), DECL);
  assert.throws(() => assignRoles("x", { model: m }), /declared/);
});

test("the ending overrides word order when it is decisive: OVS read right", () => {
  const m = learnRoleCues(world(), DECL);
  const r = read(m, "zubu lovit mama");
  assert.equal(r.end1?.word, "mama", JSON.stringify(r));
  assert.equal(r.end2?.word, "zubu");
});

test("agreement settles a syncretic clause that the ending cannot", () => {
  const m = learnRoleCues(world(), DECL);
  // object-first, syncretic: the plural verb names the plural "-ki" word
  const r = read(m, "sovek lovat kotki");
  assert.equal(r.end1?.word, "kotki", JSON.stringify(r));
  assert.equal(r.end2?.word, "sovek");
  const noAgreement = read(m, "sovek lovat kotki", ["ending", "order", "adjacent", "valency"]);
  assert.notEqual(noAgreement.end1?.word, "kotki", "without agreement the order prior reads the syncretic clause as SVO");
});

test("a word never heard says nothing — the reader falls back on its ending", () => {
  const m = learnRoleCues(world(), DECL);
  const r = read(m, "zzzua lovit qqqu"); // unseen words, known endings
  assert.equal(r.end1?.word, "zzzua");
  assert.equal(r.end2?.word, "qqqu");
});

test("a teacher that settles nothing teaches nothing", () => {
  const m = learnRoleCues(world(), { ...DECL, teacher: () => null });
  assert.equal(m.roleTotals.end1 + m.roleTotals.end2 + m.roleTotals.other, 0);
});
