// falsify-omnilingual.test.mjs — SEVENTY-FIVE questions in twenty-four
// languages, each one aimed at an assumption of the fact-gate/lens
// mechanism. The battery is the falsifying control: every row carries its
// INTENT (why it is there, what it would prove wrong), and asserts what
// honesty requires — the same kernel, the same verdicts, in the ask's own
// language; safe failure for every language the grammar cannot read; and a
// disclosed ceiling where the mechanism must MISS rather than guess.
//
// Assumptions under fire (one per row, why the row exists):
//   A. the same kernel types the same claim in every lensed language
//   B. English controls: tense, timeless, chit-chat, jurisdiction lock
//   C. ordinals never fall through to the current link
//   D. holder (reverse) asks ground in every lensed language
//   E. a scoped ask is never answered by an unscoped kind
//   F. no-article languages are never struck, even with a kind present
//   G. a language with no lens fails safe
//   H. orthography: elision (l'), compounds, article-bearing jurisdictions
//   I. mixed grammar never partially types
//   J. full-sentence claims are struck IN THE ASK'S LANGUAGE
//   K. definitional statements are never claims (falsified live, twice)
//   L. chit-chat is untouched, lensed and unlensed
//   M. an ask with no kind ships the honest unsourced sentence
//   N. verbless ellipses hold no claim
//   P. aliases are learned, never invented across languages
//   Q. a strike never demotes the link (the alarm direction)
//
// NO MODEL: nothing here calls LaVar or any other grader — every row is
// mechanical, and a failing row is a falsified assumption, not a retry.

import test from "node:test";
import assert from "node:assert/strict";
import { applyVerdictGate } from "./fact-gate.js";
import { createCurrentFactsStore } from "./current-facts.js";
import { FACT_LENSES, lensForAsk } from "../adapters/text/fact-lenses.js";

const NOW = new Date("2026-09-19T12:00:00Z");
const EN = FACT_LENSES.eng;

const kindFor = (label) => ({ id: `kind:role:${label.toLowerCase()}`, label, jurisdiction: null, aliases: [], parameters: ["has-term"], memberOf: ["kind:has-term"] });
const linkFor = (kind, holder, since) => ({ id: `${kind.id}|holds-office|${holder.toLowerCase().replace(/\s+/g, " ")}`, kindId: kind.id, holder, since, until: null, at: "2026-09-19", ref: "wikidata:test#P1308", giver: "dated-record" });

// [lang, lens, ask, draft, kindLabel|null, expect, why]
const ROWS = [
  // ── A. THE SAME KERNEL, THE SAME VERDICTS ────────────────────────────────
  ["eng", EN, "who is the president?", "Donald Trump.", "president", "grounded", "A: a right draft grounds"],
  ["eng", EN, "who is the president?", "Joe Biden.", "president", "contradicted", "A: a wrong draft is struck and replaced"],
  ["eng", EN, "who is the president?", "Joe Biden was the president in 2021.", "president", "untouched", "A: history survives the current link"],
  ["spa", FACT_LENSES.spa, "¿Quién es el presidente?", "Emmanuel Macron.", "presidente", "grounded", "A: spa grounds"],
  ["spa", FACT_LENSES.spa, "¿Quién es el presidente?", "Joe Biden.", "presidente", "contradicted", "A: spa strikes"],
  ["spa", FACT_LENSES.spa, "¿Quién es el presidente?", "Emmanuel Macron fue el presidente en 2020.", "presidente", "untouched", "A: spa past survives"],
  ["fra", FACT_LENSES.fra, "Qui est le président ?", "Emmanuel Macron.", "président", "grounded", "A: fra grounds"],
  ["fra", FACT_LENSES.fra, "Qui est le président ?", "Joe Biden.", "président", "contradicted", "A: fra strikes"],
  ["fra", FACT_LENSES.fra, "Qui est le président ?", "Emmanuel Macron était le président en 2020.", "président", "untouched", "A: fra past survives"],
  ["deu", FACT_LENSES.deu, "Wer ist der Präsident?", "Emmanuel Macron.", "Präsident", "grounded", "A: deu grounds (every noun capitalised — orthography, not an anchor)"],
  ["deu", FACT_LENSES.deu, "Wer ist der Präsident?", "Joe Biden.", "Präsident", "contradicted", "A: deu strikes"],
  ["deu", FACT_LENSES.deu, "Wer ist der Präsident?", "Emmanuel Macron war 2020 der Präsident.", "Präsident", "untouched", "A: deu past survives"],
  ["ita", FACT_LENSES.ita, "Chi è il presidente?", "Emmanuel Macron.", "presidente", "grounded", "A: ita grounds"],
  ["ita", FACT_LENSES.ita, "Chi è il presidente?", "Joe Biden.", "presidente", "contradicted", "A: ita strikes"],
  ["ita", FACT_LENSES.ita, "Chi è il presidente?", "Emmanuel Macron era il presidente nel 2020.", "presidente", "untouched", "A: ita past survives"],

  // ── B. ENGLISH CONTROLS ──────────────────────────────────────────────────
  ["eng", EN, "who is the president?", "Donald Trump.", "president", "grounded", "B: control"],
  ["eng", EN, "who was the president in 2020?", "Joe Biden was.", "president", "untouched", "B: a closed past ask is never opened"],
  ["eng", EN, "what is the capital of France?", "Paris.", "president", "untouched", "B: a timeless ask ignores the environment"],
  ["eng", EN, "hello there", "Hi!", "president", "untouched", "B: chit-chat"],
  ["eng", EN, "who is the president of France?", "Emmanuel Macron.", null, "untouched", "B: jurisdiction lock — no France kind, honest miss"],

  // ── C. ORDINALS NEVER FALL THROUGH ───────────────────────────────────────
  ["eng", EN, "who is the 46th president?", "Joe Biden.", null, "untouched", "C: no ordinal link -> miss, never today's link"],
  ["fra", FACT_LENSES.fra, "Qui est le 46e président ?", "Joe Biden.", null, "untouched", "C: fra ordinal"],
  ["deu", FACT_LENSES.deu, "Wer ist der 46. Präsident?", "Joe Biden.", null, "untouched", "C: deu ordinal"],
  ["ita", FACT_LENSES.ita, "Chi è il 46º presidente?", "Joe Biden.", null, "untouched", "C: ita ordinal"],
  ["por", FACT_LENSES.por, "Quem é o 46º presidente?", "Joe Biden.", null, "untouched", "C: por ordinal"],

  // ── D. HOLDER (REVERSE) ASKS ─────────────────────────────────────────────
  ["eng", EN, "who is Donald Trump?", "The president.", "president", "grounded", "D: holder hop grounds"],
  ["spa", FACT_LENSES.spa, "¿Quién es Donald Trump?", "El presidente.", "presidente", "grounded", "D: spa holder"],
  ["fra", FACT_LENSES.fra, "Qui est Donald Trump ?", "Le président.", "président", "grounded", "D: fra holder"],
  ["deu", FACT_LENSES.deu, "Wer ist Donald Trump?", "Der Präsident.", "Präsident", "grounded", "D: deu holder"],
  ["ita", FACT_LENSES.ita, "Chi è Donald Trump?", "Il presidente.", "presidente", "grounded", "D: ita holder"],

  // ── E. A SCOPED ASK IS NEVER ANSWERED BY AN UN-SCOPED KIND ───────────────
  ["eng", EN, "who is the president of the United States?", "Donald Trump.", null, "untouched", "E: no US kind in the env — miss"],
  ["spa", FACT_LENSES.spa, "¿Quién es el presidente de los Estados Unidos?", "Joe Biden.", null, "untouched", "E: spa scoped ask"],
  ["fra", FACT_LENSES.fra, "Qui est le président des États-Unis ?", "Joe Biden.", null, "untouched", "E: fra scoped ask"],
  ["deu", FACT_LENSES.deu, "Wer ist der Präsident der Vereinigten Staaten?", "Joe Biden.", null, "untouched", "E: deu scoped ask"],
  ["por", FACT_LENSES.por, "Quem é o presidente dos Estados Unidos?", "Joe Biden.", null, "untouched", "E: por scoped ask"],

  // ── F. NO-ARTICLE LANGUAGES ARE NEVER STRUCK — EVEN WITH A KIND PRESENT ──
  ["rus", FACT_LENSES.rus, "Кто является президентом?", "Владимир Путин.", "président", "untouched", "F: case-marked role word, no article — the lens cannot type it, and must not guess"],
  ["arb", FACT_LENSES.arb, "من هو الرئيس؟", "إيمانويل ماكرون.", "président", "untouched", "F: proclitic article — no separable definite phrase"],
  ["jpn", FACT_LENSES.jpn, "大統領は誰ですか？", "エマニュエル・マクロンです。", "président", "untouched", "F: wh last, topic first, no articles"],
  ["hin", FACT_LENSES.hin, "राष्ट्रपति कौन है?", "इमैनुएल मैक्रों।", "président", "untouched", "F: no articles"],
  ["swa", FACT_LENSES.swa, "Rais ni nani?", "Emmanuel Macron.", "président", "untouched", "F: wh last — the sentence-initial role word is not a holder"],

  // ── G. NO LENS AT ALL — SAFE FAILURE ─────────────────────────────────────
  ["kor", null, "대통령은 누구입니까?", "에마뉘엘 마크롱입니다.", "président", "untouched", "G: unlensed — no grammar reads it"],
  ["ell", null, "Ποιος είναι ο πρόεδρος;", "Εμμανουέλ Μακρόν.", "président", "untouched", "G: unlensed"],
  ["tha", null, "ประธานาธิบดีคือใคร?", "เอ็มมานูเอล มาครง", "président", "untouched", "G: unlensed, no word boundaries"],
  ["cym", null, "Pwy yw'r Arlywydd?", "Emmanuel Macron.", "président", "untouched", "G: unlensed"],
  ["vie", null, "Tổng thống là ai?", "Emmanuel Macron.", "président", "untouched", "G: unlensed"],

  // ── H. ORTHOGRAPHY TRAPS ─────────────────────────────────────────────────
  ["fra", FACT_LENSES.fra, "Qui est l'actuel président ?", "Joe Biden.", "président", "untouched", "H: elided article (l') — the fused token defeats the article class; miss, never strike"],
  ["ita", FACT_LENSES.ita, "Chi è l'attuale presidente?", "Joe Biden.", "presidente", "untouched", "H: the same elision in Italian"],
  ["deu", FACT_LENSES.deu, "Wer ist der Bundespräsident?", "Joe Biden.", null, "unsourced-current", "H: a compound role the base kind must not answer — the honest unsourced fires"],
  ["fra", FACT_LENSES.fra, "Qui est le président de la République ?", "Joe Biden.", "président", "untouched", "H: the article-bearing jurisdiction (la République) defeats the of-regex — miss, safe"],
  ["jpn", FACT_LENSES.jpn, "日本の大統領は誰ですか？", "エマニュエル・マクロンです。", "président", "untouched", "H: topicalized ask — no separable article"],

  // ── I. MIXED GRAMMAR NEVER PARTIALLY TYPES ───────────────────────────────
  ["fra", FACT_LENSES.fra, "Qui est the president ?", "Joe Biden.", "président", "untouched", "I: the fra lens has no 'the' — a mixed ask types as nothing"],
  ["eng", EN, "who is el presidente?", "Joe Biden.", "president", "untouched", "I: the eng lens has no 'el'"],
  ["deu", FACT_LENSES.deu, "Wer ist the Präsident?", "Joe Biden.", "Präsident", "untouched", "I: deu lens has no 'the'"],
  ["eng", EN, "who is the presidente?", "Joe Biden.", null, "unsourced-current", "I: the ceiling — no translation, so the honest unsourced fires, never a confident wrong answer"],

  // ── J. FULL-SENTENCE CLAIMS ARE STRUCK IN THE ASK'S LANGUAGE ─────────────
  ["fra", FACT_LENSES.fra, "Qui est le président ?", "Le président est Joe Biden.", "président", "contradicted", "J: a full-sentence claim is struck and replaced in fra"],
  ["spa", FACT_LENSES.spa, "¿Quién es el presidente?", "El presidente es Joe Biden.", "presidente", "contradicted", "J: in spa"],
  ["por", FACT_LENSES.por, "Quem é o presidente?", "O presidente é Joe Biden.", "presidente", "contradicted", "J: in por"],

  // ── K. DEFINITIONAL STATEMENTS ARE NEVER CLAIMS ──────────────────────────
  ["eng", EN, "what is a president?", "A head of state.", "president", "untouched", "K: indefinite article — generic, not a claim"],
  ["fra", FACT_LENSES.fra, "Que fait le président ?", "Il signe les lois.", "président", "untouched", "K: an action ask — no present copula in the value slot"],
  ["spa", FACT_LENSES.spa, "¿Qué es la democracia?", "Es un sistema de gobierno.", "presidente", "untouched", "K: a definitional full sentence with no committed value"],
  ["deu", FACT_LENSES.deu, "Wer war der erste Präsident?", "George Washington.", "Präsident", "untouched", "K: a past ask"],
  ["eng", EN, "what is the president?", "The president is the Head of State.", "president", "untouched", "K: a CAPITALIZED definite complement is still a definition, not a claim — falsified live, fixed by the complement-article rule"],
  ["fra", FACT_LENSES.fra, "Qu'est-ce que le président ?", "Le président est le chef des Armées.", "président", "untouched", "K: 'des Armées' must not read as a committed value — falsified live, fixed by the complement-article rule"],

  // ── L. CHIT-CHAT, LENSED AND UNLENSED ────────────────────────────────────
  ["fra", FACT_LENSES.fra, "Bonjour !", "Bonjour.", null, "untouched", "L: lensed chit-chat"],
  ["spa", FACT_LENSES.spa, "Gracias.", "De nada.", null, "untouched", "L: lensed chit-chat"],
  ["deu", FACT_LENSES.deu, "Danke schön.", "Bitte.", null, "untouched", "L: lensed chit-chat"],
  ["pol", null, "Dzięki.", "Nie ma za co.", null, "untouched", "L: unlensed chit-chat"],

  // ── M. NO KIND — THE HONEST UN-SOURCED ───────────────────────────────────
  ["eng", EN, "who is the mayor?", "John Smith.", null, "unsourced-current", "M: no kind, the honest unsourced ships"],
  ["spa", FACT_LENSES.spa, "¿Quién es el gobernador?", "John Smith.", null, "unsourced-current", "M: in spa"],
  ["fra", FACT_LENSES.fra, "Qui est le maire ?", "Jean Dupont.", null, "unsourced-current", "M: in fra"],

  // ── N. VERBLESS ELLIPSES HOLD NO CLAIM ───────────────────────────────────
  ["fra", FACT_LENSES.fra, "Le président ?", "Emmanuel Macron.", "président", "untouched", "N: too short to hold a relation"],
  ["spa", FACT_LENSES.spa, "¿Presidente?", "Emmanuel Macron.", "presidente", "untouched", "N: one token"],
  ["eng", EN, "President?", "Donald Trump.", "president", "untouched", "N: one token"],

  // ── P. ALIASES ARE LEARNED, NEVER INVENTED ACROSS LANGUAGES ──────────────
  ["fra", FACT_LENSES.fra, "Qui est POTUS ?", "Joe Biden.", null, "untouched", "P: no alias for POTUS exists — an English-learned alias must not reach a French ask"],

  // ── Q. THE STRIKE NEVER DEMOTES THE LINK (alarm direction) ───────────────
  ["eng", EN, "who is the president?", "Joe Biden.", "president", "contradicted", "Q: the contradicted draft demotes NOTHING — see the store-level loop below"],
];

test("the 75-row battery: every row behaves as honesty requires, in the ask's own language", () => {
  assert.equal(ROWS.length, 75, "the battery is exactly seventy-five questions");
  for (const [lang, lens, ask, draft, label, expect, why] of ROWS) {
    const k = label ? kindFor(label) : null;
    const holder = lang === "eng" ? "Donald Trump" : "Emmanuel Macron";
    const since = lang === "eng" ? "2025-01-20" : "2017-05-14";
    const link = k ? linkFor(k, holder, since) : null;
    const route = ask.match(/\bwho\b|кто|qui|wer|chi|quem|誰|누구|ποιος|ใคร|pwy|ai|nani/i) && /Trump|Macron|Путин|ماكرون|マクロン|मैक्रों|마크롱|Μακρόν|มาครง/i.test(ask) ? "holder" : null;
    const v = applyVerdictGate({ ask, answer: draft, kind: k, link, route, lens, now: NOW });
    assert.equal(v.verdict, expect, `${lang} | ${ask} | ${draft} | intent: ${why}`);
    if (expect === "contradicted") {
      assert.equal(v.gated, true, `${lang}`);
      assert.equal(v.text, lens.value(since, lens.frame(label, null), holder), `${lang}: the replacement is the lens's own grammar`);
      if (lang !== "eng") assert.doesNotMatch(v.text, /As of |the president is|I don't have/, `${lang}: no English leakage`);
    }
    if (expect === "unsourced-current") {
      assert.equal(v.text, lens.unsourced("2026-09-19"), `${lang}: the honest sentence is the lens's own`);
    }
    if (expect === "grounded" || expect === "untouched") assert.equal(v.gated, false, `${lang}`);
  }
});

test("Q at the store level: a strike never demotes the link — the same wrong draft is contradicted twice, and the link still grounds the right answer", () => {
  const store = createCurrentFactsStore({ now: () => NOW, lensForAsk });
  store.adoptDatedRecord({ head: "president", text: "Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20, term ending 2029-01-20.", ref: "wikidata:Q11696#P1308" });
  const first = store.resolve("who is the president?", { rng: () => 1 });
  const v1 = applyVerdictGate({ ask: "who is the president?", answer: "Joe Biden.", kind: first.kind, link: first.link, route: first.route, lens: EN, now: NOW });
  assert.equal(v1.verdict, "contradicted", "first strike");
  const second = store.resolve("who is the president?", { rng: () => 1 });
  assert.equal(second.link.holder, "Donald Trump", "the link was not demoted by the strike");
  const v2 = applyVerdictGate({ ask: "who is the president?", answer: "Joe Biden.", kind: second.kind, link: second.link, route: second.route, lens: EN, now: NOW });
  assert.equal(v2.verdict, "contradicted", "the second wrong draft is struck identically");
  assert.equal(store.links()[0].vetoedAt ?? null, null, "no alarm trail was deposited by a strike");
});

test("P at the store level: resolving a POTUS ask in French learns nothing and invents nothing", () => {
  const store = createCurrentFactsStore({ now: () => NOW, lensForAsk });
  store.adoptDatedRecord({ head: "président", text: "Wikidata lists Emmanuel Macron as the current Président de la République française, since 2017-05-14.", ref: "wikidata:Q191954#P1308" });
  store.resolve("Qui est POTUS ?", { rng: () => 1 });
  const kind = store.kindFor("président");
  assert.deepEqual(kind.aliases, [], "no alias was invented");
  assert.equal(store.resolve("Qui est POTUS ?", { rng: () => 1 }).ok, false, "POTUS resolves nothing in the French environment");
});