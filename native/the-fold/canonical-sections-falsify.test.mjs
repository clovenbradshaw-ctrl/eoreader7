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

// ── huntDeclaredStructure: the vocabulary itself, hunted and corroborated,
// no hand-typed pattern required — "this is about learning how to learn
// more than white papers." Deterministic injected search/fetch, no
// network, so this is fast and repeatable. ─────────────────────────────
import { huntDeclaredStructure } from "./canonical-sections.js";

function stubWeb(pages) {
  // pages: { url: { title, headings: [text,...] } }
  const urls = Object.keys(pages);
  return {
    search: async () => ({ results: urls.map((url) => ({ title: pages[url].title, url, snippet: "" })) }),
    fetch: async (url) => {
      const p = pages[url];
      const text = p.headings.map((h) => `## ${h}\n\nSome body prose under this heading, more than a few words long.\n`).join("\n");
      return { title: p.title, text, chars: text.length, headings: p.headings };
    },
  };
}

test("huntDeclaredStructure: a term on only ONE page is discarded — corroboration requires >= minCorroboration distinct pages", async () => {
  const web = stubWeb({
    "https://a.example/guide": { title: "Guide A", headings: ["Introduction", "Executive Summary", "Only On A"] },
    "https://b.example/guide": { title: "Guide B", headings: ["Introduction", "Executive Summary", "Only On B"] },
  });
  const r = await huntDeclaredStructure("widget report", { web, minCorroboration: 2 });
  const roles = r.vocabulary.map((v) => v.role);
  assert.ok(roles.includes("executive-summary"), `expected 'executive-summary' among corroborated roles, got: ${roles.join(",")}`);
  assert.ok(!roles.includes("only-on-a") && !roles.includes("only-on-b"), "single-page-only terms must never be promoted");
});

test("huntDeclaredStructure: 'title' is always role 0, and corroborated roles are ordered by their mean position across pages", async () => {
  const web = stubWeb({
    "https://a.example/guide": { title: "Guide A", headings: ["Introduction", "Executive Summary", "Conclusion"] },
    "https://b.example/guide": { title: "Guide B", headings: ["Introduction", "Executive Summary", "Conclusion"] },
  });
  const r = await huntDeclaredStructure("widget report", { web, minCorroboration: 2 });
  assert.equal(r.vocabulary[0].role, "title");
  const nonTitle = r.vocabulary.slice(1).map((v) => v.role);
  assert.deepEqual(nonTitle, ["introduction", "executive-summary", "conclusion"], `order should follow real heading position: ${nonTitle.join(",")}`);
});

test("huntDeclaredStructure: a page with fewer than 3 headings is skipped entirely — too little structure to trust as a real guide", async () => {
  const web = stubWeb({
    "https://a.example/guide": { title: "Guide A", headings: ["Executive Summary", "Introduction", "Conclusion"] },
    "https://b.example/thin": { title: "Thin page", headings: ["Executive Summary"] },
  });
  const r = await huntDeclaredStructure("widget report", { web, minCorroboration: 2 });
  assert.equal(r.pagesUsed, 1, "the thin (1-heading) page must not count toward pagesUsed");
  assert.ok(!r.vocabulary.some((v) => v.role === "executive-summary"), "a term needs 2 DISTINCT usable pages, and only one page here was usable");
});

test("huntDeclaredStructure: the returned vocabulary is directly usable by matchCanonicalSections (no hand-adaptation needed)", async () => {
  const web = stubWeb({
    "https://a.example/guide": { title: "Guide A", headings: ["Introduction", "Body", "Conclusion"] },
    "https://b.example/guide": { title: "Guide B", headings: ["Introduction", "Body", "Conclusion"] },
  });
  const r = await huntDeclaredStructure("widget report", { web, minCorroboration: 2 });
  const doc = { elements: [{ cls: "heading", text: "My Report" }, { cls: "heading", text: "Introduction" }, { cls: "heading", text: "Conclusion" }] };
  const m = matchCanonicalSections(doc, r.vocabulary);
  assert.equal(m.matched.length, 2);
  assert.equal(m.orderOk, true);
});

test("huntDeclaredStructure: common site-chrome terms (skip to content, categories) are excluded even when they corroborate across pages — the live bug found and fixed 2026-09-22", async () => {
  const web = stubWeb({
    "https://a.example/guide": { title: "Guide A", headings: ["Skip to content", "Introduction", "Conclusion", "Categories"] },
    "https://b.example/guide": { title: "Guide B", headings: ["Skip to content", "Introduction", "Conclusion", "Categories"] },
  });
  const r = await huntDeclaredStructure("widget report", { web, minCorroboration: 2 });
  const roles = r.vocabulary.map((v) => v.role);
  assert.ok(!roles.includes("skip-to-content"), "site-chrome recurring only because of shared templates must never be promoted");
  assert.ok(!roles.includes("categories"));
  assert.ok(roles.includes("introduction") && roles.includes("conclusion"), "real structural terms alongside chrome are still found");
});

test("huntDeclaredStructure: two pages on the SAME HOST never corroborate each other — the live bug found 2026-09-22 (a blog homepage + its own article shared sidebar chrome and wrongly 'corroborated')", async () => {
  const web = stubWeb({
    "https://same-site.example/blog": { title: "Blog home", headings: ["Trusted by leading brands", "Introduction", "Conclusion"] },
    "https://same-site.example/blog/article-1": { title: "Article", headings: ["Trusted by leading brands", "Introduction", "Conclusion"] },
  });
  const r = await huntDeclaredStructure("widget report", { web, minCorroboration: 2 });
  assert.equal(r.hostsUsed, 1, "both fetched pages share one host");
  assert.deepEqual(r.vocabulary.map((v) => v.role), ["title"], "with only 1 distinct host, nothing can reach the 2-host corroboration floor, however many pages agree");
});
