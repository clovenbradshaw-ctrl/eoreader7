// fact-gate.test.mjs — the gate on a checkable fact with no ground. Real organ, no stand-ins.
import test from "node:test";
import assert from "node:assert/strict";
import { factShape, isUngroundedFact, fuseAnswer, intentPair, decideGate } from "./fact-gate.js";

const NOW = "2026-09-19";
const OPEN = ["who is the president?", "who is the mayor?", "what is the latest version?", "who is the CEO?".replace("CEO", "founder"), "which is the tallest building?"];
const TIMELESS = ["What is the capital of France?", "Who wrote Hamlet?", "What is photosynthesis?", "How many sides does a hexagon have?", "What is the boiling point of water at sea level?"];
const CHAT = ["hello!", "thanks", "hi there", "ok cool", "nice to meet you"];

test("a bare present-tense role ask is an open-now fact with no ground", () => {
  for (const q of OPEN) assert.equal(isUngroundedFact({ text: q }), true, q);
});
test("CONTROL: the same ask WITH a ground entry is not ungrounded", () => {
  assert.equal(isUngroundedFact({ text: "who is the president?", ground: [{ text: "x" }] }), false);
});
test("null: timeless / anchored / past / definitional asks are not flagged (0 of 5)", () => {
  const flagged = TIMELESS.filter((q) => isUngroundedFact({ text: q }));
  assert.deepEqual(flagged, []);
});
test("null: chit-chat is not a fact and needs no ground (0 of 5)", () => {
  for (const c of CHAT) { assert.equal(isUngroundedFact({ text: c }), false, c); assert.equal(intentPair(c).needsGround, false, c); }
  assert.equal(intentPair("hello!").S, "acknowledge");
});
test("the pair (U,S): a value ask over an open-now slot is DEF and needs ground", () => {
  const p = intentPair("who is the president?");
  assert.deepEqual([p.U, p.S, p.cell, p.needsGround], ["ask-value", "assert-fact", "DEF", true]);
  assert.equal(p.notes.length, 2);
  assert.ok(p.notes.every((n) => n.end1 && n.label && n.end2 && n.witnesses.length && n.spans.length));
});
test("elliptical fill-ins fuse with the question's frame", () => {
  assert.equal(fuseAnswer("who is the president?", "Joe Biden.").text, "the president is Joe Biden");
  assert.equal(isUngroundedFact({ text: fuseAnswer("who is the president?", "Joe Biden.").text }), true);
  // closed frames stay closed after fusion; unfusable fragments are left alone
  assert.equal(isUngroundedFact({ text: fuseAnswer("what is the capital of France?", "Paris.").text }), false);
  assert.equal(fuseAnswer("is the sky blue?", "Yes.").fused, false);
  // slots the stub does not frame (when/how many) stay unfused and unflagged: closed scope by structure
  for (const [q, a] of [["when was Rome founded?", "In 1802."], ["how many people live there?", "Twelve thousand."]]) {
    assert.equal(fuseAnswer(q, a).fused, false, q);
    assert.equal(decideGate({ ask: q, answer: a, now: NOW }).append, null, q);
  }
});
test("gate appends, never rewrites: the model's words are a prefix of what ships", () => {
  const answer = "Joe Biden.";
  const g = decideGate({ ask: "who is the president?", answer, ground: [], now: NOW });
  assert.equal(g.open, true);
  assert.match(g.append, /^Nothing I found backed this up, so treat it as unchecked \(as of 2026-09-19\)\./);
  assert.ok((answer + "\n\n" + g.append).startsWith(answer));
});
test("Ranke: a ground that holds the answer's value grounds it; one that does not does not", () => {
  const ok = decideGate({ ask: "who is the president?", answer: "Donald Trump.", ground: [{ text: "Donald J. Trump ... Donald Trump - Wikipedia" }], now: NOW });
  assert.equal(ok.grounded, true);
  assert.match(ok.append, /^Checked against a web search, as of 2026-09-19\./);
  const bad = decideGate({ ask: "who is the president?", answer: "Joe Biden.", ground: [{ text: 'From a search for "president":\n1. Donald Trump is the 47th President of the United States' }], now: NOW });
  assert.equal(bad.grounded, false);
  assert.match(bad.append, /What the search returned: “Donald Trump/);
});
test("jurisdiction: declared when the answer chose one the conversation did not fix; silent when it did", () => {
  const a = "The president of the United States is Joe Biden.";
  assert.match(decideGate({ ask: "who is the president?", answer: a, context: "hi", now: NOW }).append, /I took this to mean the United States, as of 2026-09-19\./);
  assert.doesNotMatch(decideGate({ ask: "who is the president?", answer: a, context: "we were discussing the United States senate", now: NOW }).append, /I took this to mean/);
});
test("the gate does nothing for timeless asks and chit-chat", () => {
  for (const q of [...TIMELESS, ...CHAT]) assert.equal(decideGate({ ask: q, answer: "Paris is the capital of France.", now: NOW }).append, null, q);
});
test("regression (measured live): a passive process sentence in a definitional answer is not flagged", () => {
  const answer = "Photosynthesis is how plants make food.\n* **Chemical Reaction:** The light energy is used to convert water and carbon dioxide into glucose.";
  assert.equal(decideGate({ ask: "What is photosynthesis?", answer, now: NOW }).append, null);
});

// ── a DATED ground for an office (current-holder.js): the gate says plainly when the answer names someone else ──
import { decideGate as _decide, holderQueryFor } from "./fact-gate.js";
test("holderQueryFor: the ROLE from the ask and the JURISDICTION from the answer's own 'of X' — nothing for chit-chat or timeless asks", () => {
  assert.deepEqual(holderQueryFor({ ask: "who is the president?", answer: "Joe Biden is the current president of the United States." }), { role: "president", jurisdiction: "the United States" });
  assert.equal(holderQueryFor({ ask: "hi there", answer: "Hi." }), null);
  assert.equal(holderQueryFor({ ask: "what is photosynthesis?", answer: "It is how plants make sugar." }), null);
  assert.equal(holderQueryFor({ ask: "who is the president?", answer: "Joe Biden." }), null, "a bare fragment names no jurisdiction: no query, the model's answer ships marked unchecked");
});
test("a dated ground naming a DIFFERENT holder is said plainly beside the model's answer; naming the SAME holder grounds it", () => {
  const ground = [{ kind: "current-holder", text: "Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20, term ending 2029-01-20.", ref: "wikidata:Q11696#P1308" }];
  const now = new Date("2026-09-19");
  const wrong = _decide({ ask: "who is the president?", answer: "Joe Biden is the current president of the United States.", ground, now, searched: true });
  assert.equal(wrong.grounded, false);
  assert.match(wrong.append, /That does not match what I found \(as of 2026-09-19\): Wikidata lists Donald Trump as the current President/);
  assert.doesNotMatch(wrong.append, /Nothing I found backed this up/, "the record answered; 'nothing backed this' would be false");
  const right = _decide({ ask: "who is the president?", answer: "Donald Trump is the current president of the United States.", ground, now, searched: true });
  assert.equal(right.grounded, true);
  assert.match(right.append, /Checked against Wikidata, as of 2026-09-19/);
});

// ── THE SURGICAL GATE (applyVerdictGate): a KIND and its dated LINK strike the wrong value ──
import { applyVerdictGate } from "./fact-gate.js";
const KIND = { id: "kind:role:president", label: "president", jurisdiction: "United States", aliases: [], parameters: ["has-term"], memberOf: ["kind:has-term"] };
const LINK = { id: "kind:role:president|holds-office|donald trump", kindId: KIND.id, holder: "Donald Trump", since: "2025-01-20", until: "2029-01-20", at: "2026-09-19", ref: "wikidata:Q11696#P1308", giver: "dated-record" };
const NOW2 = new Date("2026-09-19T12:00:00Z");

test("a fragment answering against the link is STRUCK and replaced from the kind + link, not the draft", () => {
  const v = applyVerdictGate({ ask: "who is the president?", answer: "Joe Biden.", kind: KIND, link: LINK, now: NOW2 });
  assert.equal(v.verdict, "contradicted");
  assert.equal(v.gated, true);
  assert.equal(v.text, "As of 2025-01-20, the president of the United States is Donald Trump.");
  assert.doesNotMatch(v.text, /Joe Biden/, "the wrong value does not ship");
});

test("a fragment answering WITH the link grounds — no strike", () => {
  const v = applyVerdictGate({ ask: "who is the president?", answer: "Donald Trump.", kind: KIND, link: LINK, now: NOW2 });
  assert.equal(v.verdict, "grounded");
  assert.equal(v.gated, false);
  assert.equal(v.text, "Donald Trump.");
});

test("a full-sentence claim against the link is struck and replaced from the kind + link", () => {
  const v = applyVerdictGate({ ask: "who is the president?", answer: "Joe Biden is the president of the United States.", kind: KIND, link: LINK, now: NOW2 });
  assert.equal(v.verdict, "contradicted");
  assert.equal(v.text, "As of 2025-01-20, the president of the United States is Donald Trump.");
  const ok = applyVerdictGate({ ask: "who is the president?", answer: "Donald Trump is the president of the United States.", kind: KIND, link: LINK, now: NOW2 });
  assert.equal(ok.verdict, "grounded");
  assert.equal(ok.text, "Donald Trump is the president of the United States.");
});

test("multi-sentence answers: the role sentence is struck, the rest of the draft is kept", () => {
  const v = applyVerdictGate({ ask: "who is the president?", answer: "The president is Joe Biden. He took office in 2021.", kind: KIND, link: LINK, now: NOW2 });
  assert.equal(v.verdict, "contradicted");
  assert.equal(v.text, "As of 2025-01-20, the president of the United States is Donald Trump.\n\nHe took office in 2021.");
});

test("the holder hop is reverse: a wrong role is struck, replaced with the holder's own kind", () => {
  const v = applyVerdictGate({ ask: "who is Donald Trump?", answer: "The vice president.", kind: KIND, link: LINK, route: "holder", now: NOW2 });
  assert.equal(v.verdict, "contradicted");
  assert.equal(v.text, "As of 2025-01-20, Donald Trump is the president of the United States.");
  const ok = applyVerdictGate({ ask: "who is Donald Trump?", answer: "The president.", kind: KIND, link: LINK, route: "holder", now: NOW2 });
  assert.equal(ok.verdict, "grounded");
});

test("no kind, no link: an open-now claim ships the honest unsourced sentence instead of a guess", () => {
  const v = applyVerdictGate({ ask: "who is the mayor?", answer: "John Smith.", kind: null, link: null, now: NOW2 });
  assert.equal(v.verdict, "unsourced-current");
  assert.equal(v.text, "I don't have a grounded source for this as of 2026-09-19; my training data may be stale on this point.");
});

test("a current-holder RECORD ground (no kind/link row) is read like a link: holder + since", () => {
  const ground = [{ kind: "current-holder", text: "Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20, term ending 2029-01-20.", ref: "wikidata:Q11696#P1308" }];
  const v = applyVerdictGate({ ask: "who is the president?", answer: "Joe Biden.", ground, kind: null, link: null, now: NOW2 });
  assert.equal(v.verdict, "contradicted");
  assert.equal(v.text, "As of 2025-01-20, the president is Donald Trump.");
});

test("no flaggable claim: chit-chat and timeless asks are untouched", () => {
  assert.equal(applyVerdictGate({ ask: "hello", answer: "Hi there!", kind: KIND, link: LINK, now: NOW2 }).verdict, "untouched");
  assert.equal(applyVerdictGate({ ask: "what is the capital of France?", answer: "Paris.", kind: KIND, link: LINK, now: NOW2 }).verdict, "untouched");
});
