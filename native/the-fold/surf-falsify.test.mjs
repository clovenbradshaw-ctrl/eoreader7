// surf-falsify.test.mjs — STAGE 3 (SURF) PROVEN ON A FIXTURE WEB
// (2026-09-22): the queries come from the void and carry context; the
// product is candidates across distinct hosts with provenance; every way
// the web can fail is typed on the product, never folded into "nothing".
import test from "node:test";
import assert from "node:assert/strict";
import { declareVoidSpec } from "./void-spec.js";
import { surfQueries, surf, surfLines, liveWeb } from "./surf.js";

const spec = (task) => declareVoidSpec({ task });

test("queries come from the void and always carry context — never the bare form-word alone", () => {
  const qs = surfQueries(spec("rite @ whiteppr"));
  assert.ok(qs.length >= 1);
  for (const q of qs) assert.notEqual(q.q, "whiteppr", "measured live: the bare token alone returns noise");
  assert.ok(qs.some((q) => q.hunt === "exemplars" && /whiteppr/.test(q.q)), "the garbled form-word is still what is sought");
  assert.ok(!qs.some((q) => q.hunt === "material"), "no subject stated → no material hunt");
  const both = surfQueries(spec("write an essay on the Cumberland River"));
  assert.ok(both.some((q) => q.hunt === "exemplars" && /essay/.test(q.q) && /Cumberland/.test(q.q)), "the exemplar query carries the subject as context");
  assert.ok(both.some((q) => q.hunt === "material" && q.q === "the Cumberland River"));
});

test("an anaphor with nothing to point at seeks nothing outside the conversation, and says so", () => {
  // "write it again" with no ledger: the form is the LAST piece's, which is
  // not on the web. No exemplar hunt (the token would have been "again"),
  // no material hunt.
  const qs = surfQueries(spec("write it again"));
  assert.equal(qs.length, 1);
  assert.equal(qs[0].hunt, "none");
  assert.equal(qs[0].q, null);
  assert.match(qs[0].basis, /"again"/);
});

const fixtureWeb = () => {
  const pages = {
    "https://a.example/one": "AAAA ".repeat(50),
    "https://a.example/two": "AAA2 ".repeat(50),
    "https://b.example/one": "BBBB ".repeat(50),
    "https://c.example/one": "",
  };
  const results = Object.keys(pages).map((url, i) => ({ title: `t${i}`, url, snippet: "" }));
  const calls = { search: [], fetch: [] };
  return {
    calls,
    search: async (q) => { calls.search.push(q); return { blocked: false, results }; },
    fetch: async (url) => { calls.fetch.push(url); if (url === "https://c.example/one") throw new Error("HTTP 404"); return { title: url, text: pages[url], chars: pages[url].length }; },
  };
};

test("the product: distinct candidates, hosts first — the first sources are the most distinct ones, and 'multiple' is measured, not hoped", async () => {
  const web = fixtureWeb();
  const s = await surf({ spec: spec("write a sonnet"), search: web.search, fetch: web.fetch, maxSources: 3 });
  assert.equal(s.candidates, 4, "four URLs across two queries, deduplicated by URL");
  assert.deepEqual(s.sources.slice(0, 3).map((x) => x.host), ["a.example", "b.example", "c.example"], "round-robin by host before a second page from any host");
  assert.equal(s.sources.find((x) => x.host === "c.example").status, "fetch failed", "a failed fetch is typed on that source, not dropped");
  assert.equal(s.fetched, 2);
  assert.equal(s.multiple, true);
  assert.ok(surfLines(s).length >= s.queries.length + s.sources.length);
});

test("a blocked search is 'the web was not reached', typed — never an empty result", async () => {
  const s = await surf({ spec: spec("write a sonnet"), search: async () => ({ blocked: true, results: [] }), fetch: async () => { throw new Error("must not fetch"); } });
  assert.ok(s.queries.every((q) => q.status === "blocked"));
  assert.equal(s.candidates, 0);
  assert.match(s.basis, /not reached/);
  assert.doesNotMatch(s.basis, /had nothing/);
});

test("an off-endpoint page and a thrown search are typed per query, and the other queries still run", async () => {
  let n = 0;
  const s = await surf({ spec: spec("write an essay on rivers"), search: async () => { n++; if (n === 1) return { offEndpoint: true, results: [] }; if (n === 2) throw new Error("ECONNRESET"); return { results: [{ url: "https://x.example/p", title: "x" }] }; }, fetch: async () => ({ text: "x ".repeat(10), chars: 20 }) });
  assert.deepEqual(s.queries.map((q) => q.status), ["off endpoint", "search failed", "ok"]);
  assert.equal(s.fetched, 1);
  assert.equal(s.multiple, false, "one host is not multiple sources");
  assert.match(s.basis, /NOT multiple sources/);
});

test("liveWeb wraps organs/web.js: a DDG HTML page parses to results, an HTTP 403 is blocked, a page body extracts to text", async () => {
  const ddg = `<html>duckduckgo<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fpoets.example%2Fsonnet">Sonnet</a><a class="result__snippet">fourteen lines</a></html>`;
  const fetchImpl = async (url) => {
    if (/duckduckgo\.com\/html/.test(url)) return { status: 200, text: async () => ddg };
    if (/forbidden/.test(url)) return { status: 403, text: async () => "" };
    return { status: 200, text: async () => "<html><head><title>Sonnet 18</title></head><body><p>Shall I compare thee to a summer's day?</p></body></html>" };
  };
  const web = liveWeb({ fetchImpl });
  const r = await web.search("sonnet");
  assert.equal(r.results[0].url, "https://poets.example/sonnet");
  const page = await web.fetch("https://poets.example/sonnet");
  assert.match(page.text, /compare thee/);
  await assert.rejects(web.fetch("https://forbidden.example/"), /HTTP 403/);
});
