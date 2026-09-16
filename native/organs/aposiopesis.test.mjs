// aposiopesis.test.mjs — the archon of what trails off, tested on its own
// (fact-block.test.mjs pins the same specimens through dedupeSourceText/
// buildFactBlock — the real consumers — so this file is the pure-organ
// half: exactly what `find()` reports, never how a caller uses it).

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeAposiopesis } from "./aposiopesis.js";

// The same sentence splitter and normalizer fact-block.js injects, kept
// here as small, honest stand-ins rather than importing fact-block.js's
// own (this file must not depend on the thing it verifies).
const splitSentences = (text) => String(text).match(/[^.!?…]+(?:[.!?]+|\.\.\.|…|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function aposiopesis() {
  return makeAposiopesis({ splitSentences, normalize });
}

test("makeAposiopesis: throws without an injected sentence model — no sentence model of its own", () => {
  assert.throws(() => makeAposiopesis({}), TypeError);
  assert.throws(() => makeAposiopesis({ splitSentences }), TypeError);
  assert.throws(() => makeAposiopesis({ normalize }), TypeError);
});

test("find: a truncated sentence with a fuller byte-for-byte restatement elsewhere is DOMINATED", () => {
  const TRUNCATED = "The document discusses mismanagement and opposition from the United…";
  const FULL = "The document discusses mismanagement and opposition from the United States that led to its failure.";
  const { dominated, lone } = aposiopesis().find([
    { ref: "web:search-results#0-200", text: TRUNCATED },
    { ref: "web:scribd.com-1#800-1400", text: FULL },
  ]);
  assert.equal(dominated.size, 1);
  assert.ok(dominated.has(normalize(TRUNCATED)));
  assert.deepEqual(lone, [], "the truncated copy is accounted for by domination, not also reported as lone");
});

test("find: order-independent — the fuller sentence may arrive before or after the truncated one", () => {
  const TRUNCATED = "A obscure fact about the region's early governance…";
  const FULL = "A obscure fact about the region's early governance was recorded in 1902.";
  const forward = aposiopesis().find([{ ref: "a", text: TRUNCATED }, { ref: "b", text: FULL }]);
  const backward = aposiopesis().find([{ ref: "b", text: FULL }, { ref: "a", text: TRUNCATED }]);
  assert.equal(forward.dominated.size, 1);
  assert.equal(backward.dominated.size, 1);
  assert.deepEqual([...forward.dominated], [...backward.dominated]);
});

test("find: a trailing ellipsis with nothing anywhere to complete it is LONE, not dominated — real, unique text is never dropped", () => {
  const passages = [{ ref: "web:search-results#0-300", text: "Long before the canal became a marvel, a French-led attempt set the stage. Yet, it laid the…" }];
  const { dominated, lone } = aposiopesis().find(passages);
  assert.equal(dominated.size, 0);
  assert.equal(lone.length, 1);
  assert.equal(lone[0].text, "Yet, it laid the…");
  assert.equal(lone[0].source, "web:search-results#0-300");
});

test("find: several independent lone truncations in one search-results digest are each reported once", () => {
  // The live shape (2026-09-15, a real fetched Panama Canal search-results
  // digest): several unrelated DuckDuckGo snippets in ONE chunk, each
  // trailing off on its own with no duplicate anywhere in the material —
  // the case P181's own dedupe never had to handle, because none of these
  // has a fuller restatement to catch it.
  const text = [
    "Panama Canal Construction is the product of two projects separated by twenty years. A French sea-level attempt in the 1880s collapsed after killing more than 22,000 workers; an American lock-canal project built…",
    "The Panama Canal is the result of one of the most consequential engineering projects in human history. The American project from 1904 to 1914, benefiting from Walter Reed's discovery of mosquito-borne…",
    "The canal closely followed the existing route of the railroad. Once…",
  ].join(" ");
  const { dominated, lone } = aposiopesis().find([{ ref: "web:search-results#0-900", text }]);
  assert.equal(dominated.size, 0);
  assert.equal(lone.length, 3);
  assert.ok(lone.every((l) => l.source === "web:search-results#0-900"));
});

test("find: an ordinary longer sentence sharing an opening clause with an earlier one, ending normally, is neither dominated nor lone", () => {
  const passages = [
    { ref: "a", text: "Hamlin served as vice president to Abraham Lincoln from 1861 to 1865." },
    { ref: "b", text: "Hamlin served as vice president to Abraham Lincoln from 1861 to 1865, but he was never close with the cabinet." },
  ];
  const { dominated, lone } = aposiopesis().find(passages);
  assert.equal(dominated.size, 0, "no trailing ellipsis on either sentence — a shared opening clause is not a truncated preview");
  assert.equal(lone.length, 0);
});

test("find: empty/whitespace passages and an empty passage list are refused nothing and report nothing", () => {
  assert.deepEqual(aposiopesis().find([]), { dominated: new Set(), lone: [] });
  assert.deepEqual(aposiopesis().find([{ ref: "a", text: "" }, { ref: "b", text: "   " }]), { dominated: new Set(), lone: [] });
  assert.deepEqual(aposiopesis().find(undefined), { dominated: new Set(), lone: [] });
});

test("find: a lone truncation's own source address rides on the report, so a caller can name where the gap is", () => {
  const { lone } = aposiopesis().find([{ ref: "web:example.com-0#40-90", text: "The committee could not reach…" }]);
  assert.equal(lone.length, 1);
  assert.equal(lone[0].source, "web:example.com-0#40-90");
});

test("find: a passage with no ref still reports the lone truncation, with a null source rather than a guessed one", () => {
  const { lone } = aposiopesis().find([{ text: "The committee could not reach…" }]);
  assert.equal(lone.length, 1);
  assert.equal(lone[0].source, null);
});
