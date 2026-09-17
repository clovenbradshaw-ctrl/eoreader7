// document-ledger-citations.test.js — the stale-citation glitch, pinned.
// Measured 2026-09-17: "write a haiku about debugging code" ended with a
// "## Sources (verbatim)" appendix of six near-identical Wikisource
// gun-legislation lines admitted turns earlier in the same session —
// raw `&#160;` intact, one page filling all maxSnips, zero shared
// vocabulary with the task. Three independent guards pin the fix:
//   1. cleanSpan decodes HTML entities (numeric + named) to whitespace/text
//   2. snipsFromSources suppresses near-duplicate variants of one source
//   3. relevantSources drops sources sharing <2 content words with the task
import test from "node:test";
import assert from "node:assert/strict";
import { cleanSpan, snipsFromSources, relevantSources } from "../the-fold/document-ledger.js";

const GUN_TEXT = [
  "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns ( 2013 ) by&#160; Steven J.",
  "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns .",
  "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns 2013 Steven J.",
  "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns (January 16, 2013) Rep.",
  "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns HON.",
  "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines.",
].join(" ");

test("cleanSpan decodes numeric and named HTML entities", () => {
  assert.equal(cleanSpan("by&#160; Steven J."), "by Steven J.");
  assert.equal(cleanSpan("fish &amp; chips"), "fish & chips");
  assert.equal(cleanSpan("a&#x41;b"), "aAb");
  assert.ok(!cleanSpan(GUN_TEXT).includes("&#"), "no raw entities survive");
});

test("snipsFromSources collapses one page's near-duplicate variants", () => {
  const snips = snipsFromSources(new Map([["wikisource:beta:prohibit", GUN_TEXT]]));
  assert.ok(snips.length < 6, `expected suppression, got ${snips.length} snips`);
  assert.ok(snips.length >= 1, "the first variant still stands for the family");
  for (const s of snips) assert.ok(!s.snip.includes("&#"), "decoded, not raw");
});

test("snipsFromSources keeps genuinely different sentences", () => {
  const text = [
    "The quick brown fox jumps over the lazy dog near the riverbank.",
    "Quantum entanglement links particles across vast interstellar distances.",
    "Sourdough fermentation depends on wild yeast and patient timing.",
  ].join(" ");
  const snips = snipsFromSources(new Map([["doc:1", text]]));
  assert.equal(snips.length, 3);
});

test("relevantSources drops a stale page from an unrelated task", () => {
  const sources = new Map([["wikisource:beta:prohibit", GUN_TEXT]]);
  const { kept, dropped } = relevantSources(sources, "write a haiku about debugging code");
  assert.equal(dropped, 1);
  assert.equal(kept.size, 0);
});

test("relevantSources keeps a page the task actually shares vocabulary with", () => {
  const sources = new Map([["wikisource:beta:prohibit", GUN_TEXT]]);
  const { kept, dropped } = relevantSources(sources, "summarize the Israeli legislation to prohibit 3-D printed guns");
  assert.equal(dropped, 0);
  assert.equal(kept.size, 1);
});

test("relevantSources keeps everything on a contentless follow-up", () => {
  const sources = new Map([["wikisource:beta:prohibit", GUN_TEXT]]);
  const { kept, dropped } = relevantSources(sources, "tell me more");
  assert.equal(dropped, 0, "cannot judge relevance — keep, never nuke");
  assert.equal(kept.size, 1);
});

test("relevantSources judges each source independently", () => {
  const sources = new Map([
    ["wikisource:beta:prohibit", GUN_TEXT],
    ["web:debugging", "Debugging code demands patience: reproduce the bug, bisect the change, read the stack. A haiku about debugging honors the struggle."],
  ]);
  const { kept, dropped } = relevantSources(sources, "write a haiku about debugging code");
  assert.equal(dropped, 1);
  assert.equal(kept.size, 1);
  assert.ok(kept.has("web:debugging"));
});
