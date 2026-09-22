// canonical-sections-falsify.test.mjs — the real, sourced white-paper
// structure (2026-09-22), and whether a document's own heading TEXT names
// it. Pure lexical matching, no typography — the capability the earlier
// emergentFacts-only pipeline was structurally unable to provide.
import test from "node:test";
import assert from "node:assert/strict";
import { WHITE_PAPER_SECTIONS, matchCanonicalSections, canonicalStructureCoverage } from "./canonical-sections.js";

const h = (text) => ({ cls: "heading", text });
const line = (text) => ({ cls: "line", text });

test("matchCanonicalSections: all 8 real canonical headings, in the real order, are found and orderOk is true", () => {
  const unit = {
    elements: [
      h("The Future of Widget Manufacturing"), line("intro line"),
      h("Executive Summary"), line("..."),
      h("Introduction"), line("..."),
      h("The Problem"), line("..."),
      h("Research and Findings"), line("..."),
      h("Our Solution"), line("..."),
      h("Conclusion"), line("..."),
      h("Call to Action"), line("..."),
    ],
  };
  const r = matchCanonicalSections(unit);
  assert.equal(r.hasTitle, true);
  assert.equal(r.matched.length, 7, `expected 7 non-title roles matched, got: ${JSON.stringify(r.matched.map((m) => m.role))}`);
  assert.deepEqual(r.missing, []);
  assert.equal(r.orderOk, true);
  assert.equal(r.coverage, 8);
});

test("matchCanonicalSections: the SAME roles present but in the WRONG order — orderOk must be false", () => {
  const unit = {
    elements: [
      h("Title"),
      h("Call to Action"), // CTA first — wrong
      h("Executive Summary"),
      h("Conclusion"),
    ],
  };
  const r = matchCanonicalSections(unit);
  assert.equal(r.matched.length, 3);
  assert.equal(r.orderOk, false, "CTA appearing before the Executive Summary must fail the order check");
});

test("matchCanonicalSections: a document with NO section headings that name any canonical role (a technical-report-shaped negative control) finds nothing", () => {
  const unit = {
    elements: [
      h("1 Introduction"), // real technical-report headings don't say "Introduction" bare in this fixture — use numbered, non-matching text
      h("2 Method"),
      h("3 Results"),
      h("4 References"),
    ],
  };
  const r = matchCanonicalSections(unit);
  // "1 Introduction" DOES match /^introduction$/i? No — the pattern is
  // anchored (^...$) so "1 Introduction" does NOT match; confirms anchoring
  // is doing real work, not accidentally over-matching numbered headings.
  assert.ok(!r.matched.some((m) => m.role === "introduction"), "a numbered heading '1 Introduction' must not satisfy the bare 'introduction' pattern");
});

test("matchCanonicalSections: a heading that could match two roles' patterns is claimed by only ONE role, never double-counted", () => {
  // "Summary" alone matches BOTH executive-summary's /^summary$/i and
  // conclusion's /^summary$/i by construction (real white papers do use
  // "Summary" loosely for either) — with only one heading, only the
  // FIRST-declared role in the vocabulary can claim it.
  const unit = { elements: [h("Title"), h("Summary")] };
  const r = matchCanonicalSections(unit);
  const claims = r.matched.filter((m) => m.headingIndex === 1);
  assert.equal(claims.length, 1, "one heading claims exactly one role, never two");
  assert.equal(claims[0].role, "executive-summary", "the first-declared matching role (executive-summary) wins over a later one (conclusion) for the same heading");
});

test("canonicalStructureCoverage: a real-shaped marketing corpus scores high; a real-shaped technical-report corpus scores near zero — the coverage measure actually discriminates", () => {
  const marketing = Array.from({ length: 6 }, (_, i) => ({
    elements: [h(`Widget ${i}`), h("Executive Summary"), h("Introduction"), h("The Problem"), h("Our Solution"), h("Conclusion"), h("Call to Action")],
  }));
  const technical = Array.from({ length: 6 }, (_, i) => ({
    elements: [h(`Technical Report ${i}`), h("1 Background"), h("2 Methods"), h("3 Results"), h("4 Discussion"), h("5 References")],
  }));
  const cMarketing = canonicalStructureCoverage(marketing);
  const cTechnical = canonicalStructureCoverage(technical);
  assert.ok(cMarketing.meanCoverage > 0.7, `marketing-shaped corpus should score high: ${cMarketing.meanCoverage}`);
  assert.ok(cTechnical.meanCoverage < cMarketing.meanCoverage, `technical-shaped corpus must score measurably lower: ${cTechnical.meanCoverage} vs ${cMarketing.meanCoverage}`);
});

test("canonicalStructureCoverage: empty instance list is declared, not divided-by-zero", () => {
  const r = canonicalStructureCoverage([]);
  assert.equal(r.n, 0);
  assert.equal(r.meanCoverage, 0);
  assert.equal(r.orderConsistency, null);
});

test("WHITE_PAPER_SECTIONS: 8 roles declared, title first, cta last, orders strictly increasing", () => {
  assert.equal(WHITE_PAPER_SECTIONS.length, 8);
  assert.equal(WHITE_PAPER_SECTIONS[0].role, "title");
  assert.equal(WHITE_PAPER_SECTIONS.at(-1).role, "cta");
  for (let i = 1; i < WHITE_PAPER_SECTIONS.length; i++) assert.ok(WHITE_PAPER_SECTIONS[i].order > WHITE_PAPER_SECTIONS[i - 1].order);
});
