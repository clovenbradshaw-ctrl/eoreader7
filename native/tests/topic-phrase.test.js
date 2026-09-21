// topic-phrase.test.mjs — the essay-subject extractor, pinned against the
// 2026-09-20 defect: "Write a five-page paper (about 2500 words) on X" yielded
// "2500 words) on the role of the Cumberland River..." as the topic — the
// count clause ("about 2500 words") hijacked the "about" subject extraction,
// and the void plan built every section from that garbage. The fix: a count
// clause is a LENGTH specifier, never the subject.
import { test } from "node:test";
import assert from "node:assert/strict";
import { topicPhrase } from "../../proxy-runner.mjs";

test("a count clause after 'about' is a length specifier, not the subject", () => {
  const t = topicPhrase("Write a five-page paper (about 2500 words) on the role of the Cumberland River in Nashville's growth as a port city.");
  assert.equal(t, "the role of the Cumberland River in Nashville's growth as a port city");
});

test("a hyphenated page count before 'paper' is not a subject", () => {
  assert.equal(topicPhrase("Write a five-page paper on how flood control reshaped the Tennessee river system."), "how flood control reshaped the Tennessee river system");
});

test("a bare 'about' clause IS the subject frame (no count)", () => {
  assert.equal(topicPhrase("Write a five-page paper about the Cumberland River."), "the Cumberland River");
  assert.equal(topicPhrase("What she wrote about the Analytical Engine"), "the Analytical Engine");
});

test("a subject-internal count (2500 years OF history) is kept — it is the subject, not a length specifier", () => {
  // "2500 words" / "five pages" describe the PAPER (a meta-length) and must
  // be stripped; "2500 years of river history" is what the paper is ABOUT.
  assert.equal(topicPhrase("Write a paper about 2500 years of river history."), "2500 years of river history");
});

test("topicPhrase never returns the count clause itself (the 2026-09-20 defect)", () => {
  // The original defect: the topic was "2500 words) on the role of the
  // Cumberland River..." — the count clause hijacked the subject, and the
  // whole void plan was built from it. Whatever else the fallback does, the
  // count clause must never leak into the topic.
  const t = topicPhrase("Write a five-page paper (about 2500 words) on the role of the Cumberland River in Nashville's growth as a port city.");
  assert.ok(!/2500|words\)|five-page/.test(t), `count clause leaked: ${t}`);
});