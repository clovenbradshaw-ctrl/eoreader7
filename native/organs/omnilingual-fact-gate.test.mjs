// omnilingual-fact-gate.test.mjs — the mechanism, read in OTHER languages,
// through the LENS tier (adapters/text/fact-lenses.js).
//
// GFP doctrine (user direction: "GFP is our grammar", "no call up LaVar"):
// the kernel is language-blind; a LENS is one language's own grammar — the
// closed classes that mark a value-ask over a role, and the mouth's
// assembly templates. The SAME kernel returns the SAME verdict in every
// language because the language lives in the lens. Nothing here calls a
// model (LaVar) and nothing here invents a translation: the lenses are
// minimal attested surface sets, the values come from the environment's
// bytes, and a language whose grammar no lens holds fails safe.
//
//   Arm 1 — THE SAME VERDICTS: a value-ask over a role types open-now in
//           every lensed language; a wrong draft is contradicted and
//           replaced in the ASK'S OWN LANGUAGE; a right draft is grounded.
//   Arm 2 — SAFE FAILURE: a language no lens reads (or whose role grammar a
//           lens cannot fully type — no articles, case-marked role words)
//           is never struck and never receives an English sentence.
//   Arm 3 — NEUTRAL STRUCTURE: kinds, dated links, terms, trails and
//           persistence are language-neutral bytes.
//   Arm 4 — THE CEILING (falsifying controls): an English ask does not
//           resolve a foreign kind; extractHolder reads English ground
//           patterns only. If these ever pass, the mechanism has silently
//           learned to translate — which would be a guess.

import test from "node:test";
import assert from "node:assert/strict";
import { applyVerdictGate, factShape, fuseAnswer, valuesOf } from "./fact-gate.js";
import { createCurrentFactsStore, extractHolder, termFromRecord } from "./current-facts.js";
import { FACT_LENSES, lensForAsk } from "../adapters/text/fact-lenses.js";

const NOW = new Date("2026-09-19T12:00:00Z");
const FRA_KIND = { id: "kind:role:président", label: "président", jurisdiction: null, aliases: [], parameters: ["has-term"], memberOf: ["kind:has-term"] };
const FRA_LINK = { id: "kind:role:président|holds-office|emmanuel macron", kindId: FRA_KIND.id, holder: "Emmanuel Macron", since: "2017-05-14", until: null, at: "2026-09-19", ref: "wikidata:Q191954#P1308", giver: "dated-record" };

// ── ARM 1: THE SAME VERDICTS, THROUGH THE LENSES ───────────────────────────
// eng = the control (deliberately over the FRENCH kind — the mixed ceiling);
// spa/fra/deu/ita/por = each over its OWN language's kind. Each row: lens,
// ask, right draft, wrong draft, expected replacement, the role word, the
// head the grammar must find after the article.
const LENSED = [
  ["eng", FACT_LENSES.eng, "who is the president?", "Emmanuel Macron.", "Joe Biden.", "As of 2017-05-14, the président is Emmanuel Macron.", "président", "president"],
  ["spa", FACT_LENSES.spa, "¿Quién es el presidente?", "Emmanuel Macron.", "Joe Biden.", "Desde el 2017-05-14, el presidente es Emmanuel Macron.", "presidente", "presidente"],
  ["fra", FACT_LENSES.fra, "Qui est le président ?", "Emmanuel Macron.", "Joe Biden.", "En date du 2017-05-14, le président est Emmanuel Macron.", "président", "président"],
  ["deu", FACT_LENSES.deu, "Wer ist der Präsident?", "Emmanuel Macron.", "Joe Biden.", "Seit dem 2017-05-14 ist der Präsident Emmanuel Macron.", "Präsident", "Präsident"],
  ["ita", FACT_LENSES.ita, "Chi è il presidente?", "Emmanuel Macron.", "Joe Biden.", "Dal 2017-05-14, il presidente è Emmanuel Macron.", "presidente", "presidente"],
  ["por", FACT_LENSES.por, "Quem é o presidente?", "Emmanuel Macron.", "Joe Biden.", "Desde 2017-05-14, o presidente é Emmanuel Macron.", "presidente", "presidente"],
];
const kindFor = (label) => ({ id: `kind:role:${label.toLowerCase()}`, label, jurisdiction: null, aliases: [], parameters: ["has-term"], memberOf: ["kind:has-term"] });
const linkFor = (kind) => ({ id: `${kind.id}|holds-office|emmanuel macron`, kindId: kind.id, holder: "Emmanuel Macron", since: "2017-05-14", until: null, at: "2026-09-19", ref: "wikidata:Q191954#P1308", giver: "dated-record" });

test("ARM 1a: the ask types open-now over the role in every lensed language — same kernel, same shape", () => {
  for (const [lang, lens, ask, , , , , expectedHead] of LENSED) {
    const shape = factShape(ask, lens);
    assert.equal(shape.fact, true, `${lang}: ${ask}`);
    assert.equal(shape.scope, "open-now", `${lang}: a bare definite role is open-now`);
    assert.equal(shape.jurisdiction.head, expectedHead, `${lang}: the head is the role word after the article`);
    assert.equal(fuseAnswer(ask, "Emmanuel Macron.", lens).fused, true, `${lang}: the fragment fuses`);
  }
});

test("ARM 1b: a wrong draft is contradicted and replaced IN THE ASK'S OWN LANGUAGE — never an English sentence in a foreign answer", () => {
  for (const [lang, lens, ask, right, wrong, expected, label] of LENSED) {
    const kind = kindFor(label);
    const v = applyVerdictGate({ ask, answer: wrong, kind, link: linkFor(kind), lens, now: NOW });
    assert.equal(v.verdict, "contradicted", `${lang}`);
    assert.equal(v.gated, true, `${lang}`);
    assert.equal(v.text, expected, `${lang}: the replacement is the lens's own grammar`);
    if (lang !== "eng") assert.doesNotMatch(v.text, /As of |the president is|I don't have/, `${lang}: no English leakage`);
  }
});

test("ARM 1c: a right draft is grounded untouched in every lensed language", () => {
  for (const [lang, lens, ask, right, , , label] of LENSED) {
    const kind = kindFor(label);
    const v = applyVerdictGate({ ask, answer: right, kind, link: linkFor(kind), lens, now: NOW });
    assert.equal(v.verdict, "grounded", `${lang}`);
    assert.equal(v.gated, false, `${lang}`);
    assert.equal(v.text, right, `${lang}: the correct draft ships byte-for-byte`);
  }
});

test("ARM 1d: the unsourced sentence is the lens's own, in the ask's language", () => {
  const v = applyVerdictGate({ ask: "Qui est le président ?", answer: "Emmanuel Macron.", kind: null, link: null, lens: FACT_LENSES.fra, now: NOW });
  assert.equal(v.verdict, "unsourced-current");
  assert.equal(v.text, "Je n'ai pas de source confirmée pour cela au 2026-09-19; mes données d'entraînement peuvent être obsolètes sur ce point.");
});

test("ARM 1e: the store detects the ask's lens from its own wh-opener and resolves the language's own kind", () => {
  const store = createCurrentFactsStore({ now: () => NOW, lensForAsk });
  store.adoptDatedRecord({ head: "président", text: "Wikidata lists Emmanuel Macron as the current Président de la République française, since 2017-05-14.", ref: "wikidata:Q191954#P1308" });
  const hit = store.resolve("Qui est le président ?", { rng: () => 1 });
  assert.equal(hit.ok, true);
  assert.equal(hit.route, "exact-kind");
  assert.equal(hit.kind.label, "président");
  assert.equal(hit.link.holder, "Emmanuel Macron");
  assert.equal(hit.lens.lang, "fra");
});

// ── ARM 2: SAFE FAILURE ────────────────────────────────────────────────────
// rus/jpn/hin/swa/arb HAVE lenses but their role grammar a lens cannot yet
// fully type (no separated article; case-marked role words) — safe. ell/
// kor/tha/cym have NO lens at all — safe.
const UNTYPED = [
  ["rus", FACT_LENSES.rus, "Кто является президентом?", "Эммануэль Макрон."],
  ["arb", FACT_LENSES.arb, "من هو الرئيس؟", "إيمانويل ماكرون."],
  ["jpn", FACT_LENSES.jpn, "大統領は誰ですか？", "エマニュエル・マクロンです。"],
  ["hin", FACT_LENSES.hin, "राष्ट्रपति कौन है?", "इमैनुएल मैक्रों।"],
  ["swa", FACT_LENSES.swa, "Rais ni nani?", "Emmanuel Macron."],
  ["ell", null, "Ποιος είναι ο πρόεδρος;", "Εμμανουέλ Μακρόν."],
  ["kor", null, "대통령은 누구입니까?", "에마뉘엘 마크롱입니다."],
  ["tha", null, "ประธานาธิบดีคือใคร?", "เอ็มมานูเอล มาครง"],
  ["cym", null, "Pwy yw'r Arlywydd?", "Emmanuel Macron."],
];

test("ARM 2a: a language whose role grammar cannot be typed is never struck and never replaced", () => {
  for (const [lang, lens, ask, answer] of UNTYPED) {
    const v = applyVerdictGate({ ask, answer, kind: FRA_KIND, link: FRA_LINK, lens, now: NOW });
    assert.equal(v.verdict, "untouched", `${lang}: ${ask}`);
    assert.equal(v.gated, false, `${lang}`);
    assert.equal(v.text, answer, `${lang}: the answer ships byte-for-byte`);
  }
});

test("ARM 2b: no English fallback sentence is appended to an untyped-language answer", () => {
  for (const [, lens, ask, answer] of UNTYPED) {
    const shape = factShape(ask, lens);
    assert.equal(shape.fact, false, `${ask}`);
  }
});

test("ARM 2c: an unreadable ask leaves no trail garbage under a phantom head", () => {
  const store = createCurrentFactsStore({ now: () => NOW, lensForAsk });
  for (const [, , ask] of UNTYPED) store.resolve(ask, { rng: () => 1 });
  for (const [, , ask] of LENSED) store.resolve(ask, { rng: () => 1 });
  assert.ok(store.trails().président?.length >= 1, "the French asks deposited under their own head");
  for (const [lang, , ask] of UNTYPED) {
    const key = ask.split(/\s+/)[0];
    assert.equal(store.trails()[key], undefined, `${lang}: no phantom head for ${ask}`);
  }
});

// ── ARM 3: NEUTRAL STRUCTURE ───────────────────────────────────────────────
test("ARM 3a: a foreign role kind and its dated link live like any English one — term structure included", () => {
  const store = createCurrentFactsStore({ now: () => NOW });
  const link = store.adoptDatedRecord({ head: "président", text: "Wikidata lists Emmanuel Macron as the current Président de la République française, since 2017-05-14.", ref: "wikidata:Q191954#P1308" });
  assert.equal(link.holder, "Emmanuel Macron");
  const kind = store.kindFor("président");
  assert.ok(kind.parameters.includes("has-term"), "a kind of things that have terms is structural, not English");
  assert.deepEqual(termFromRecord("since 2017-05-14"), { since: "2017-05-14", until: null });
});

test("ARM 3b: non-Latin labels and holders — the \p{Lu} fix — serialize and reload byte-faithfully", () => {
  const store = createCurrentFactsStore({ now: () => NOW });
  store.adoptDatedRecord({ head: "президент", text: "Wikidata lists Владимир Путин as the current Президент России, since 2012-05-07.", ref: "wikidata:Q159#P1308" });
  assert.equal(store.kindFor("президент").label, "президент");
  assert.equal(store.links()[0].holder, "Владимир Путин", "a Cyrillic holder is a proper noun like any other — \\p{Lu}, never ASCII [A-Z]");
  assert.equal(store.links()[0].since, "2012-05-07");
});

test("ARM 3c: refresh with a foreign ground does not corrupt the link — an unreadable door's bytes are a typed miss, never a guess", async () => {
  const store = createCurrentFactsStore({ now: () => NOW });
  store.adoptDatedRecord({ head: "président", text: "Wikidata lists Emmanuel Macron as the current Président de la République française, since 2017-05-14.", ref: "wikidata:Q191954#P1308" });
  store.upsertLink({ ...store.links()[0], at: "2018-01-01", until: "2019-01-01" });
  const searchFn = async () => ({ found: true, query: "président", text: "Le président de la République française est Emmanuel Macron." });
  const out = await store.refreshStale({ ttlDays: 30, searchFn, datedLookup: null });
  assert.equal(out.failed, 1, "extractHolder cannot read the French ground");
  assert.equal(store.links()[0].holder, "Emmanuel Macron", "the old holder survives; unreadable bytes never overwrite it");
  assert.equal(store.links()[0].vetoedAt ?? null, null, "no false alarm");
});

// ── ARM 4: THE CEILING (falsifying controls) ───────────────────────────────
test("ARM 4a: an English ask does NOT resolve a foreign-language kind — no translation layer exists, and none is simulated", () => {
  const store = createCurrentFactsStore({ now: () => NOW, lensForAsk });
  store.adoptDatedRecord({ head: "président", text: "Wikidata lists Emmanuel Macron as the current Président de la République française, since 2017-05-14.", ref: "wikidata:Q191954#P1308" });
  assert.equal(store.resolve("who is the president?", { rng: () => 1 }).ok, false, "'president' is not 'président' — string identity, never guesswork");
});

test("ARM 4b: extractHolder reads English ground patterns only — foreign grounds name no holder", () => {
  assert.equal(extractHolder("Le président est Emmanuel Macron.", "président"), null);
  assert.equal(extractHolder("El presidente es Javier Milei.", "presidente"), null);
  assert.equal(extractHolder("Wikidata liste Emmanuel Macron comme le président actuel.", "président"), null);
  assert.equal(extractHolder("The president is Donald Trump.", "president"), "Donald Trump", "the English control still reads");
});

test("ARM 4c: lensForAsk detects by the ask's own wh-opener — an ask that opens in no lens reads as no grammar", () => {
  assert.equal(lensForAsk("Qui est le président ?").lang, "fra");
  assert.equal(lensForAsk("¿Quién es el presidente?").lang, "spa");
  assert.equal(lensForAsk("Wer ist der Präsident?").lang, "deu");
  assert.equal(lensForAsk("who is the president?").lang, "eng");
  assert.equal(lensForAsk("hello there"), null);
  assert.equal(lensForAsk("Pwy yw'r Arlywydd?"), null);
  assert.equal(lensForAsk("Québec est la capitale du Canada."), null, "no prefix fallback — a statement that merely starts with 'que' is not a French question");
  assert.equal(lensForAsk("誰が大統領ですか？").lang, "jpn", "a no-space script opens with its wh-character, exactly");
  assert.equal(lensForAsk("大統領は誰ですか？"), null, "a topicalized ask does not open with its wh-word — safe");
});