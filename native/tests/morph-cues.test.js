// tests/morph-cues.test.js — Sullivan's second sense, falsified on a toy
// language whose marks are KNOWN: case on the ending, tense on the
// auxiliary to the left (and its ABSENCE for the present), participles
// that carry Case in a class whose finite forms carry none, and one
// feature that is pure noise. The learner is told none of this; it must
// find the marks, read the unmarked as unmarked, and refuse the noise.
// The loader is falsified too: a convention without its period, region or
// giver is refused.

import { test } from "node:test";
import assert from "node:assert/strict";
import { learnFeature, predict, audit, reachOf, cuesOf, featsOf, featuresIn, cueKey, morphCuesFromPrior, witnessOf, CUE_KINDS, UNMARKED, PRIOR_SCHEMA } from "../adapters/text/morph-cues.js";
import { lcg } from "../kernel/continuation.js";

// A toy language. Nouns: stem + a (Nom) / am (Acc) / ae (Gen). Verbs: a
// bare stem is Pres; "hab" before it makes Past; "wil" before it makes
// Fut. A participle (stem + "ans", class VERB) carries Case=Nom; finite
// verbs carry no Case. Color is assigned at random — no mark says it.
const STEMS = ["puell", "terr", "aqu", "silv", "port", "vi", "ros", "mens"];
const VERBS = ["amat", "videt", "capit", "dat", "legit", "currit"];
function toy(n, seed) {
  const rng = lcg(seed);
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const sentences = [];
  for (let i = 0; i < n; i += 1) {
    const toks = [];
    let id = 1;
    const tok = (form, upos, feats, head = 0) => { toks.push({ id: id++, form, upos, feats, head, lemma: form }); return id - 1; };
    const objCase = pick(["Acc", "Gen"]);
    tok(pick(STEMS) + "a", "NOUN", `Case=Nom|Color=${pick(["Red", "Blue", "Green"])}`);
    const tense = pick(["Pres", "Past", "Fut"]);
    let auxId = null;
    if (tense === "Past") auxId = tok("hab", "AUX", "_");
    if (tense === "Fut") auxId = tok("wil", "AUX", "_");
    const v = tok(pick(VERBS), "VERB", `Tense=${tense}|Color=${pick(["Red", "Blue", "Green"])}`);
    if (auxId) toks[auxId - 1].head = v;
    tok(pick(STEMS) + (objCase === "Acc" ? "am" : "ae"), "NOUN", `Case=${objCase}|Color=${pick(["Red", "Blue", "Green"])}`);
    if (rng() < 0.3) tok(pick(STEMS) + "ans", "VERB", "Case=Nom|VerbForm=Part");
    sentences.push({ tokens: toks });
  }
  return sentences;
}
const LEARN = toy(400, 1), AUDIT = toy(200, 2);

test("the senses: endings, prefixes, class, neighbours by form and by class, attached auxiliaries — and feats parse", () => {
  const s = LEARN[0];
  const kinds = new Set(cuesOf(s.tokens[0], s).map(([k]) => k));
  for (const k of ["end:1", "end:2", "beg:1", "class", "left", "right", "lclass", "rclass"]) assert.ok(kinds.has(k), k);
  assert.deepEqual(cuesOf(s.tokens[0], s).find(([k]) => k === "class"), ["class", "", "NOUN"]);
  assert.deepEqual([...featsOf("Case=Acc|Number=Sing")], [["Case", "Acc"], ["Number", "Sing"]]);
  assert.deepEqual(featuresIn(LEARN), ["Case", "Color", "Tense", "VerbForm"]);
  assert.equal(CUE_KINDS.length, 13);
});

test("Case is found on the ending and read perfectly on held-out nouns; finite verbs are read as UNMARKED, never given a case", () => {
  const m = learnFeature(LEARN, "Case");
  assert.ok(m.admitted > 0);
  assert.deepEqual(m.classes, ["NOUN", "VERB"], "VERB is a carrier class because participles carry Case");
  assert.ok(m.unmarked > 0, "finite verbs entered the learning as unmarked");
  const a = audit(m, AUDIT);
  assert.equal(a.covered, a.carriers, `every carrier is covered (${a.covered}/${a.carriers}, unmarked-missed ${a.missedUnmarked}, void ${a.missedVoid})`);
  assert.equal(a.correct, a.carriers, `every carrier is right (${a.correct}/${a.carriers})`);
  assert.equal(a.falseFires, 0, `a finite verb is never given a case (${a.falseFires}/${a.nonCarriers})`);
  assert.equal(a.silenced, a.nonCarriers, "every finite verb was read as unmarked or void");
  const reach = reachOf(m);
  for (const v of ["Nom", "Acc", "Gen"]) assert.ok(reach[v].form > 0, `${v} reached by form`);
  assert.ok(!reach[UNMARKED], "unmarked is not a reachable value");
});

test("Tense is found on the auxiliary to the left, and the present on its ABSENCE — a neighbour-class construction, not an ending", () => {
  const m = learnFeature(LEARN, "Tense");
  const a = audit(m, AUDIT);
  assert.equal(a.correct, a.carriers, `${a.correct}/${a.carriers} (covered ${a.covered}, contested ${a.contested})`);
  const reach = reachOf(m);
  assert.ok(reach.Past.construction > 0 && reach.Fut.construction > 0, "Past and Fut reached by construction");
  assert.ok(["left", "aux", "lclass"].includes(reach.Past.best.kind), reach.Past.best.kind);
  assert.ok(reach.Pres.construction > 0, "Pres reached by a construction cue (the noun to its left)");
  assert.equal(reach.Past.form, 0, "no verb ending says Past");
});

test("FALSIFICATION: a feature no mark carries admits no cue for any VALUE — every carrier is Void, never the majority; only the participles' absence of it is learned, as unmarked", () => {
  // the floor is the best fluke of R null reruns; the real search's own
  // best fluke beats it about 1 time in R+1 — so the property is that
  // raising R kills whatever squeaked through, not that R=5 is perfect
  const m5 = learnFeature(LEARN, "Color", { reruns: 5 });
  const m = learnFeature(LEARN, "Color", { reruns: 40 });
  assert.ok(m.floor >= m5.floor, `the floor rises with reruns (${m5.floor} → ${m.floor})`);
  const valued = Object.values(m.cues).filter((c) => c.value !== UNMARKED);
  assert.equal(valued.length, 0, `value cues admitted at 40 reruns: ${JSON.stringify(valued.slice(0, 3))} floor ${m.floor}`);
  assert.ok(Object.values(m.cues).every((c) => c.value === UNMARKED && c.class === "VERB"), "anything admitted says only that a participle carries no Color");
  const a = audit(m, AUDIT);
  assert.equal(a.covered, 0);
  assert.equal(a.falseFires, 0);
});

test("refusals are typed and the search floor is measured, not set; a majority-tracking cue never beats an ending", () => {
  const m = learnFeature(LEARN, "Case");
  assert.ok(m.floor > 0, `floor ${m.floor}`);
  assert.ok(m.refused.length > 0);
  assert.ok(m.refused.every((c) => c.why === "own null" || c.why === "search floor"));
  const classNoun = m.cues[cueKey("class", "", "NOUN")];
  if (classNoun) {
    // admitted only as "a NOUN carries a case, most often Nom" — every ending cue outranks it
    const endings = Object.values(m.cues).filter((c) => c.kind.startsWith("end") && c.class === "NOUN");
    assert.ok(endings.every((e) => e.accuracy >= classNoun.accuracy), "no ending is less accurate than the bare class");
    assert.ok(classNoun.accuracy < 1);
  }
});

test("disagreement lands as a contest with the rival beside it, never resolved silently; unmarked is its own verdict", () => {
  const model = { feature: "X", cues: { [cueKey("end:1", "a", "VERB")]: { kind: "end:1", key: "a", class: "VERB", value: "P", accuracy: 0.9, support: 10 }, [cueKey("left", "hab", "VERB")]: { kind: "left", key: "hab", class: "VERB", value: "Q", accuracy: 0.6, support: 10 }, [cueKey("end:1", "t", "VERB")]: { kind: "end:1", key: "t", class: "VERB", value: UNMARKED, accuracy: 0.95, support: 40 } } };
  const sent = { tokens: [{ id: 1, form: "hab", upos: "AUX" }, { id: 2, form: "vida", upos: "VERB" }, { id: 3, form: "amat", upos: "VERB" }] };
  const p = predict(model, sent.tokens[1], sent);
  assert.equal(p.verdict, "contested");
  assert.equal(p.value, "P");
  assert.equal(p.rivals[0].value, "Q");
  assert.equal(predict(model, sent.tokens[2], sent).verdict, "unmarked");
  assert.equal(predict(model, { id: 4, form: "zzz", upos: "X" }, { tokens: [] }).verdict, "void");
});

test("same seed, same model — reproducible", () => {
  assert.deepEqual(learnFeature(LEARN, "Tense", { draws: 6, reruns: 2, seed: 3 }), learnFeature(LEARN, "Tense", { draws: 6, reruns: 2, seed: 3 }));
});

test("a stored convention is refused without its giver, period, region, register, script, license, source — or a basis for each", () => {
  const prov = (over = {}) => ({
    giver: { value: "someone", basis: "declared from the treebank's documentation" },
    period: { value: "1st c. BCE", basis: "declared from the treebank's documentation" },
    region: { value: "Rome", basis: "declared from the treebank's documentation" },
    register: { value: "literary verse", basis: "declared from the treebank's documentation" },
    script: { value: "Latin", basis: "measured from the file" },
    license: { value: "CC BY-SA 4.0", basis: "measured from the file" },
    source: { value: "x.conllu sha256:abc", basis: "measured from the file" },
    ...over,
  });
  const ok = { schema: PRIOR_SCHEMA, language: { iso: "lat", name: "Latin", stage: "Classical" }, provenance: prov(), features: {} };
  assert.equal(morphCuesFromPrior(ok).language.iso, "lat");
  assert.throws(() => morphCuesFromPrior({ ...ok, provenance: prov({ period: null }) }), /period/);
  assert.throws(() => morphCuesFromPrior({ ...ok, provenance: prov({ region: { value: "", basis: "measured from the file" } }) }), /region/);
  assert.throws(() => morphCuesFromPrior({ ...ok, provenance: prov({ giver: { value: "someone", basis: "I think" } }) }), /basis/);
  assert.throws(() => morphCuesFromPrior({ ...ok, language: { iso: "san", name: "Sanskrit" } }), /stage/);
  assert.throws(() => morphCuesFromPrior({ schema: "Other@1" }), /schema/);
});

test("witnessOf: null for a feature the prior lacks; otherwise predicts through the stored cues and carries the giver", () => {
  const m = learnFeature(LEARN, "Case");
  const loaded = { language: { iso: "toy", stage: "toy" }, provenance: { giver: { value: "the toy", basis: "measured from the file" } }, features: { Case: m } };
  assert.equal(witnessOf(loaded, "Tense"), null);
  const w = witnessOf(loaded, "Case");
  assert.equal(w.giver, "the toy");
  const s = AUDIT[0];
  const p = w.predict(s.tokens[0], s);
  assert.equal(p.verdict, "bound");
  assert.equal(p.value, "Nom");
});
