// ground-carries.test.mjs — handed-over material is the ground for an ask only if it carries the ask's subject.
//
// Measured live 2026-09-30, after the charter left the composition vocabulary: two document jobs over ONE handed-over
// file (katherine-johnson-body.txt), web off. The task about the file was written from it; the task about a bicycle
// freewheel was written from it too — four of its five shipped sentences were about Katherine Johnson. Handing
// material over made it the ground with no test that it bears on the ask ("ground by being handed over", hunt.js
// tier 0). The pipeline took what it was given and did not build a ground.
//
// The rule (a definition, no tuned number): the ask's subject is its content words (function words dropped by the
// engine's own isFunctionWord); the handed-over material carries the subject when it carries MORE THAN HALF of them.
// A single carried word is not enough — "still" appears twice in the Johnson file and is a word of the bicycle ask.
// When the ask names no subject ("summarize this"), everything handed over is ground, as before. When the material
// carries the subject, the ground is the documents that carry any word the material carries. When it does not, none
// is admitted and the job is ungrounded — the same honest path as an empty workspace — with the refusal written.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { admitHandedOver, subjectWordsOf } from "../native/the-fold/ground-carries.js";
import { selectGroundDocs, topicPhrase, noGroundReport, webUrlOfSourceId } from "../proxy-runner.mjs";

const FIX = new URL("../native/eval/the-fold/fixtures/", import.meta.url);
const read = (n) => fs.readFileSync(new URL(n, FIX), "utf8");
const JOHNSON = { id: "katherine-johnson-body.txt", text: read("katherine-johnson-body.txt") };
const CH = { id: "continuum-hypothesis.txt", text: read("continuum-hypothesis.txt") };
const TASK_ON = "Katherine Johnson's orbital trajectory calculations at NASA";
const TASK_OFF = "How a bicycle freewheel lets the wheel spin while the pedals stay still";
const ids = (r) => r.admitted.map((d) => d.id);

test("CONTROL — the old rule (everything handed over is ground) admits the Johnson file for the bicycle ask", () => {
  // the measured failure, stated as the count the old code implied: a document handed over was always admitted
  const words = subjectWordsOf(topicPhrase(TASK_OFF));
  assert.ok(words.includes("bicycle") && words.includes("freewheel"));
  const johnsonWords = new Set(JOHNSON.text.toLowerCase().match(/[a-z]+/g));
  assert.ok(johnsonWords.has("still"), "one word of the ask IS in the file, which is why a single-word test fails");
  assert.ok(!johnsonWords.has("bicycle") && !johnsonWords.has("freewheel"), "the subject itself is not");
});

test("an ask the material carries: the ground is the material", () => {
  const r = admitHandedOver({ docs: [JOHNSON], topic: topicPhrase(TASK_ON) });
  assert.equal(r.mode, "carried");
  assert.deepEqual(ids(r), ["katherine-johnson-body.txt"]);
});

test("REFUTED before, admitted nothing now: the bicycle ask is not carried by the Johnson file", () => {
  const r = admitHandedOver({ docs: [JOHNSON], topic: topicPhrase(TASK_OFF) });
  assert.equal(r.mode, "not-carried");
  assert.deepEqual(ids(r), []);
  assert.equal(r.refused.length, 1);
  assert.match(r.refused[0].why, /carries \d+ of \d+/);
  assert.ok(r.coverage.carried * 2 <= r.coverage.total, "at most half the subject: " + JSON.stringify(r.coverage));
});

test("a workspace of two documents: each ask gets the document that carries it and not the other", () => {
  const docs = [JOHNSON, CH];
  assert.deepEqual(ids(admitHandedOver({ docs, topic: "the continuum hypothesis and infinite sets" })), ["continuum-hypothesis.txt"]);
  assert.deepEqual(ids(admitHandedOver({ docs, topic: topicPhrase(TASK_ON) })), ["katherine-johnson-body.txt"]);
  assert.deepEqual(ids(admitHandedOver({ docs, topic: topicPhrase(TASK_OFF) })), []);
});

test("a question spread over two documents gets both; a word that turns up in an unrelated file does not admit it", () => {
  const a = { id: "a", text: "The auditors reported. The auditors and the police disagreed about the review of records." };
  const b = { id: "b", text: "The budget rose again this year. The budget office published the figures." };
  const c = { id: "c", text: "A recipe for soup: onions, stock, and salt. Simmer slowly." };
  assert.deepEqual(ids(admitHandedOver({ docs: [a, b, c], topic: "the auditors, the police and the budget" })).sort(), ["a", "b"]);
  // "set" is a word of the continuum ask and is in the Johnson file; the file is not admitted for it
  assert.deepEqual(ids(admitHandedOver({ docs: [JOHNSON, CH], topic: "the continuum hypothesis and infinite sets" })), ["continuum-hypothesis.txt"]);
});

test("an ask that names no subject takes everything handed over — the operator's material is the ground", () => {
  const r = admitHandedOver({ docs: [JOHNSON, CH], topic: topicPhrase("Summarize this") });
  assert.equal(r.mode, "no-subject");
  assert.deepEqual(ids(r), ["katherine-johnson-body.txt", "continuum-hypothesis.txt"]);
});

test("the refusal is written: every refused document says why, with the words it did carry", () => {
  const r = admitHandedOver({ docs: [JOHNSON, CH], topic: topicPhrase(TASK_OFF) });
  assert.equal(r.refused.length, 2);
  for (const x of r.refused) assert.ok(x.why && x.id, "refusal carries an id and a reason");
  assert.match(r.basis, /carries \d+ of \d+/);
});

test("a subject the material carries more than half of is carried even when a word is missing", () => {
  // "aerodynamics" (stemmed to aerodynamic) appears in no document; the other five of six are carried.
  const r = admitHandedOver({ docs: [JOHNSON], topic: "Katherine Johnson orbital trajectory NASA aerodynamics" });
  assert.equal(r.mode, "carried");
  assert.deepEqual(r.carried.filter((c) => c.docs === 0).map((c) => c.word), ["aerodynamic"]);
});

// ── the seam the runner actually uses ────────────────────────────────────────────────────────────────────────
test("selectGroundDocs: the runner's document set for a composition follows the same rule", () => {
  const documents = new Map([[JOHNSON.id, { text: JOHNSON.text }], [CH.id, { text: CH.text }], ["chat:turn-1", { text: "hello there this is a long enough chat line to pass the length gate okay" }]]);
  const given = new Map([[JOHNSON.id, {}], [CH.id, {}]]);
  const on = selectGroundDocs({ documents, given, topic: topicPhrase(TASK_ON) });
  assert.deepEqual(on.docs.map((d) => d.id), ["katherine-johnson-body.txt"]);
  const off = selectGroundDocs({ documents, given, topic: topicPhrase(TASK_OFF) });
  assert.deepEqual(off.docs, []);
  assert.equal(off.admission.mode, "not-carried");
  // a chat line is never ground, and a fetched document (not in `given`) never outranks the operator's
  const fetched = new Map([...documents, ["https://example.org/x", { text: "Katherine Johnson NASA orbital trajectory ".repeat(20) }]]);
  assert.deepEqual(selectGroundDocs({ documents: fetched, given, topic: topicPhrase(TASK_ON) }).docs.map((d) => d.id), ["katherine-johnson-body.txt"]);
});

// ── the ladder: handed-over, then what the hunt fetched, then nothing ───────────────────────────────────────
test("given outranks fetched only when the given material CARRIES the ask; an unrelated workspace does not block the hunt", () => {
  const FETCHED = "https://en.wikipedia.org/wiki/Freewheel";
  const fetchedText = "A freewheel is a device on a bicycle. The bicycle freewheel lets the wheel spin while the pedals stay still. The pedal drives the wheel only when pedalling forward, and the wheel may still spin.";
  const documents = new Map([[JOHNSON.id, { text: JOHNSON.text }], [FETCHED, { text: fetchedText }]]);
  const given = new Map([[JOHNSON.id, {}]]);
  // bicycle ask: the given file carries nothing, so the fetched page is the ground
  const off = selectGroundDocs({ documents, given, topic: topicPhrase(TASK_OFF) });
  assert.deepEqual(off.docs.map((d) => d.id), [FETCHED]);
  assert.equal(off.tier, "fetched");
  assert.equal(off.admission.mode, "carried");
  // Johnson ask: the given file carries it, so it outranks the fetched page, which is excluded as before
  const on = selectGroundDocs({ documents, given, topic: topicPhrase(TASK_ON) });
  assert.deepEqual(on.docs.map((d) => d.id), [JOHNSON.id]);
  assert.equal(on.tier, "given");
  assert.deepEqual(on.excludedFetched.map((x) => x.id), [FETCHED]);
});

test("nothing carries: no document, tier 'none' — the job has no ground and must not write from nowhere", () => {
  const documents = new Map([[JOHNSON.id, { text: JOHNSON.text }], ["https://example.org/x", { text: "Nothing here about the subject at all, only a long enough sentence of unrelated words to pass the gate." }]]);
  const r = selectGroundDocs({ documents, given: new Map([[JOHNSON.id, {}]]), topic: topicPhrase(TASK_OFF) });
  assert.deepEqual(r.docs, []);
  assert.equal(r.tier, "none");
});

test("the no-ground report says what it looked at, what it found, and how to build a ground — from the measurement alone", () => {
  const documents = new Map([[JOHNSON.id, { text: JOHNSON.text }]]);
  const r = selectGroundDocs({ documents, given: new Map([[JOHNSON.id, {}]]), topic: topicPhrase(TASK_OFF) });
  const text = noGroundReport({ words: r.admission.words, admission: r.admission, webConsent: false });
  assert.match(text, /^No ground\./);
  assert.match(text, /nothing has been written/);
  assert.match(text, /bicycle, freewheel/, "the subject is shown as the words that were looked for");
  assert.match(text, /carries 1 of 8 of the ask's words/, "the count that refused it");
  assert.match(text, /web was not searched/i);
  assert.match(text, /To build a ground/);
  // with consent and nothing readable, it says the search ran
  assert.match(noGroundReport({ words: ["x"], admission: r.admission, webConsent: true, fetchedPages: 0 }), /found no page/);
  assert.match(noGroundReport({ words: ["x"], admission: r.admission, webConsent: true, fetchedPages: 3 }), /found 3 page\(s\); none of them carried it/);
  // nothing handed over says so
  assert.match(noGroundReport({ words: ["x"], admission: { refused: [], basis: "" }, webConsent: false }), /Nothing was handed over/);
});

// ── live_priors as a tier: handed-over, then the received corpus, then what the hunt fetched, then nothing ──────
const PRIORS_ID = "priors:live_priors/02-encyclopedic/wikipedia/Logic.txt#0-346";
const PRIORS_TEXT = "Set theory originated in the study of the infinite by Georg Cantor. They include Cantor's theorem, the status of the Axiom of Choice, and the continuum hypothesis.";
const CH_ASK = "The continuum hypothesis and the sizes of infinite sets";
const priorsResult = { mode: "carried", basis: "1 passage(s), the best of each of 1 document(s) of the received corpus, carry more than half of the ask's evidence together (continuum, hypothesi, infinite, set)", scanned: { files: 2084, ms: 30 } };

test("priors tier: with nothing handed over, the passages live_priors found are the ground, and they are located", () => {
  const documents = new Map([[PRIORS_ID, { text: PRIORS_TEXT }]]);
  const r = selectGroundDocs({ documents, given: null, topic: CH_ASK, priors: priorsResult });
  assert.equal(r.tier, "priors");
  assert.deepEqual(r.docs.map((d) => d.id), [PRIORS_ID]);
  assert.match(r.admission.basis, /received corpus/);
});

test("the ladder's order: handed-over that carries beats priors; priors beat fetched; a workspace that does not carry blocks neither", () => {
  const FETCHED = "https://en.wikipedia.org/wiki/Continuum_hypothesis";
  const fetched = "The continuum hypothesis is a hypothesis about the possible sizes of infinite sets. It states there is no set of size between the integers and the reals.";
  const documents = new Map([[CH.id, { text: CH.text }], [JOHNSON.id, { text: JOHNSON.text }], [PRIORS_ID, { text: PRIORS_TEXT }], [FETCHED, { text: fetched }]]);
  const both = selectGroundDocs({ documents, given: new Map([[CH.id, {}], [JOHNSON.id, {}]]), topic: CH_ASK, priors: priorsResult });
  assert.equal(both.tier, "given", "the operator's own material that carries the ask outranks everything");
  assert.deepEqual(both.docs.map((d) => d.id), ["continuum-hypothesis.txt"]);
  const unrelated = selectGroundDocs({ documents, given: new Map([[JOHNSON.id, {}]]), topic: CH_ASK, priors: priorsResult });
  assert.equal(unrelated.tier, "priors", "the Johnson file carries nothing of this ask: it is not a wall, and the received corpus outranks the fetched page");
  assert.deepEqual(unrelated.docs.map((d) => d.id), [PRIORS_ID]);
  const noPriors = selectGroundDocs({ documents: new Map([[JOHNSON.id, { text: JOHNSON.text }], [FETCHED, { text: fetched }]]), given: new Map([[JOHNSON.id, {}]]), topic: CH_ASK });
  assert.equal(noPriors.tier, "fetched");
});

test("a priors passage is never mistaken for a fetched page or a given document, and is never ground for an ask it was not found for", () => {
  // the same passage is in the corpus, but the ask is the bicycle ask and no priors result was passed for it: not ground
  const documents = new Map([[PRIORS_ID, { text: PRIORS_TEXT }]]);
  const r = selectGroundDocs({ documents, given: null, topic: TASK_OFF });
  assert.equal(r.tier, "none");
  assert.deepEqual(r.docs, []);
});

test("nothing carries and the received corpus was searched: the report says so, with what it searched", () => {
  const text = noGroundReport({ words: ["bicycle", "freewheel"], admission: { refused: [], basis: "" }, webConsent: false, priors: { mode: "not-carried", anchor: "freewheel", scanned: { files: 2084, ms: 4700 }, basis: "no passage of the received corpus (2084 documents searched, 2 mention the ask's anchor word \u201cfreewheel\u201d with more than half of its evidence) carries more than half of it together with that word" } });
  assert.match(text, /received corpus/);
  assert.match(text, /2084 documents searched/);
  assert.match(text, /freewheel/);
});

test("a fetched page's url is read back from its corpus id, whatever colons the session id holds; anything else has no url", () => {
  assert.equal(webUrlOfSourceId("web:hd-1:3:https://en.wikipedia.org/wiki/Freewheel"), "https://en.wikipedia.org/wiki/Freewheel");
  assert.equal(webUrlOfSourceId("web:documents/x:1:2:https://a.example/p?q=1:2"), "https://a.example/p?q=1:2");
  assert.equal(webUrlOfSourceId("priors:live_priors/02/x.txt#1-2"), null);
  assert.equal(webUrlOfSourceId("wikisource:hd-1:term"), null);
  assert.equal(webUrlOfSourceId(undefined), null);
});

test("CONTROL — a page the hunt fetched is tier fetched even when nothing was handed over (it read as given)", () => {
  const PAGE = "A bicycle freewheel lets the wheel spin while the pedals stay still. The pawl engages the ratchet only when pedalling forward. The freewheel is a device.";
  const docs = new Map([["web:s1:1:https://en.wikipedia.org/wiki/Freewheel", { text: PAGE }]]);
  const g = selectGroundDocs({ documents: docs, given: null, topic: "How a bicycle freewheel lets the wheel spin while the pedals stay still" });
  assert.equal(g.tier, "fetched");
  assert.equal(g.docs.length, 1);
  // and a page the operator handed over under any other id is still given
  const h = selectGroundDocs({ documents: new Map([["notes.txt", { text: PAGE }]]), given: new Map([["notes.txt", true]]), topic: "How a bicycle freewheel lets the wheel spin while the pedals stay still" });
  assert.equal(h.tier, "given");
});
