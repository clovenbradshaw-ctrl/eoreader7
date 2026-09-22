// surf-falsify.test.mjs — STAGE 3 (SURF) PROVEN ON A FIXTURE WEB
// (2026-09-22): the queries come from the void and carry context; the
// product is candidates across distinct hosts with provenance; every way
// the web can fail is typed on the product, never folded into "nothing".
import test from "node:test";
import assert from "node:assert/strict";
import { declareVoidSpec } from "./void-spec.js";
import { surfQueries, surf, surfLines, liveWeb, SURF_MAX_TOTAL_MS } from "./surf.js";

const spec = (task) => declareVoidSpec({ task });

test("queries come from the void and always carry context — never the bare form-word alone", () => {
  const qs = surfQueries(spec("rite @ whiteppr"));
  assert.ok(qs.length >= 1);
  for (const q of qs) assert.notEqual(q.q, "whiteppr", "measured live: the bare token alone returns noise");
  assert.ok(qs.some((q) => q.hunt === "exemplars" && /whiteppr/.test(q.q)), "the garbled form-word is still what is sought");
  assert.ok(!qs.some((q) => q.hunt === "material"), "no subject stated → no material hunt");
  const both = surfQueries(spec("write an essay on the Cumberland River"));
  // Measured live: the subject in the exemplar query pulled river pages into
  // the form's exemplars and the sonnet's 14 lines fell below a majority.
  assert.ok(both.filter((q) => q.hunt === "exemplars").every((q) => /essay/.test(q.q) && !/Cumberland/.test(q.q)), "the exemplar queries carry the form-word's own context, never the subject");
  assert.ok(both.some((q) => q.hunt === "material" && q.q === "the Cumberland River"), "the subject is the material hunt's");
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

test("a URL both hunts find carries both labels, and each hunt gets its own fetches — the exemplar pages cannot spend the material hunt's (measured live: the Cumberland pages never reached the hunt)", async () => {
  const exemplarUrls = Array.from({ length: 8 }, (_, i) => `https://ex${i}.example/p`);
  const materialUrls = ["https://ex0.example/p", "https://river.example/a", "https://river.example/b", "https://wiki.example/c"];
  const web = {
    search: async (q) => ({ results: (/what is|examples full text/.test(q) ? exemplarUrls : materialUrls).map((url) => ({ url, title: q })) }),
    fetch: async (url) => ({ text: `page ${url}`, chars: 20 }),
  };
  const s = await surf({ spec: spec("write an essay on the river"), search: web.search, fetch: web.fetch, maxSources: 3 });
  const shared = s.sources.find((x) => x.url === "https://ex0.example/p");
  assert.deepEqual(shared.hunts, ["exemplars", "material"], "found by both hunts, labeled by both");
  const material = s.sources.filter((x) => x.hunts.includes("material"));
  assert.ok(material.length >= 3, `the material hunt got its own allocation (got ${material.length})`);
  assert.ok(material.some((x) => x.host === "river.example") && material.some((x) => x.host === "wiki.example"), "hosts first within the material hunt");
  assert.ok(s.sources.filter((x) => x.hunts.includes("exemplars")).length >= 3, "and the exemplar hunt kept its own");
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

test("maxTotalMs bounds the WHOLE pass, not just one call: a search that never resolves does not hang surf() forever", async () => {
  const neverResolves = () => new Promise(() => {}); // no fixture time-out here — surf()'s own deadline must fire first
  const t0 = Date.now();
  const s = await surf({ spec: spec("write a sonnet"), search: neverResolves, fetch: async () => { throw new Error("must not fetch"); }, maxTotalMs: 30 });
  const ms = Date.now() - t0;
  // The FIRST query is already past deadline-check only before it starts, so
  // one in-flight call can still outlast the nominal budget — the discipline
  // this proves is "does not hang forever", not "never a millisecond over".
  assert.ok(ms < 5000, `surf() must not hang indefinitely on a call that never resolves (took ${ms}ms)`);
});

test("maxTotalMs, once past, skips the remaining queries and fetches and discloses it on the product — never presented as 'nothing was there'", async () => {
  let clock = 0;
  const now = () => clock;
  const web = {
    search: async (q) => { clock += 30; return { results: [{ url: `https://x.example/${q}`, title: q }, { url: `https://y.example/${q}`, title: q }] }; },
    fetch: async (url) => { clock += 30; return { text: `page ${url} `.repeat(5), chars: 100 }; },
  };
  const s = await surf({ spec: spec("write an essay on rivers"), search: web.search, fetch: web.fetch, maxTotalMs: 45, now });
  assert.equal(s.timeBounded, true);
  assert.match(s.basis, /TIME-BOUNDED at 45ms/);
  assert.ok(s.queries.some((q) => q.status === "not run: time-bounded"), "at least one query never ran once the deadline passed");
});

test("with no maxTotalMs override, the default SURF_MAX_TOTAL_MS still applies (a caller cannot forget to bound the pass)", async () => {
  let calls = 0;
  const now = () => calls * (SURF_MAX_TOTAL_MS + 1); // each call jumps the fake clock past the whole budget
  const s = await surf({ spec: spec("write an essay on rivers"), search: async () => { calls += 1; return { results: [] }; }, fetch: async () => ({ text: "x", chars: 1 }), now });
  assert.equal(s.timeBounded, true, "the second query must never run: the first call already spent the default budget");
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
