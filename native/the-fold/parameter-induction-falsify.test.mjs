// parameter-induction-falsify.test.mjs — induceParameter carries no
// knowledge of any single parameter; words-per-page is one caller's use of
// it, tested alongside a second, unrelated parameter to prove genericity.
//
// wordsPerPageClaim's own real-world behavior was confirmed live against
// the actual web in the same session this organ was built (4 distinct real
// hosts — textwordcount.com, bookwritersguild.com, izicalc.com,
// wordcountchecker.org — median 300 words/page). These fixtures exercise
// the same logic deterministically, without a live network dependency.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { induceParameter, wordsPerPageClaim, PARAMETER_MEMORY_SCHEMA } from "./parameter-induction.js";

const memPath = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "param-mem-")), "parameter-memory.json");

test("induceParameter: a pre-seeded, >=corroborationFloor-source memory is recalled with no search/fetch call at all", async () => {
  const p = memPath();
  fs.writeFileSync(p, JSON.stringify({ schema: PARAMETER_MEMORY_SCHEMA, parameters: { "words-per-page": { value: 300, sources: [{ host: "a.example", url: "https://a.example", value: 300 }, { host: "b.example", url: "https://b.example", value: 300 }], learnedAt: 1 } } }));
  let called = false;
  const search = async () => { called = true; return { results: [] }; };
  const fetch = async () => { called = true; return { text: "" }; };
  const r = await induceParameter("words-per-page", { query: "irrelevant, memory should short-circuit", extractClaim: wordsPerPageClaim, search, fetch, memoryPath: p });
  assert.equal(r.induced, true);
  assert.equal(r.value, 300);
  assert.equal(r.fromMemory, true);
  assert.equal(called, false, "memory already had >=2 sources -- no network call was needed");
});

test("induceParameter: corroborates across >=2 DISTINCT hosts and takes their median, then remembers it to disk", async () => {
  const p = memPath();
  const search = async () => ({ results: [{ url: "https://one.example/a" }, { url: "https://two.example/b" }, { url: "https://three.example/c" }] });
  const pages = {
    "https://one.example/a": { title: "", text: "A typical page holds about 300 words." },
    "https://two.example/b": { title: "", text: "Publishers often estimate 250 words per page." },
    "https://three.example/c": { title: "", text: "No such claim on this page at all." },
  };
  const fetch = async (url) => pages[url];
  const r = await induceParameter("words-per-page", { query: "how many words are on a typical page", extractClaim: wordsPerPageClaim, search, fetch, memoryPath: p });
  assert.equal(r.induced, true);
  assert.equal(r.value, 300, "median of the two sorted real per-host claims [250, 300] at index floor(2/2)=1");
  assert.equal(r.fromMemory, false);
  assert.equal(r.sources.length, 2, "the third host stated no claim and does not count as a source");
  const onDisk = JSON.parse(fs.readFileSync(p, "utf8"));
  assert.equal(onDisk.parameters["words-per-page"].value, 300, "remembered to disk for a future run's lookup");
});

test("induceParameter: fewer than corroborationFloor corroborating hosts refuses to guess", async () => {
  const p = memPath();
  const search = async () => ({ results: [{ url: "https://one.example/a" }, { url: "https://two.example/b" }] });
  const fetch = async (url) => (url.includes("one") ? { title: "", text: "A page is about 300 words." } : { title: "", text: "Nothing relevant here." });
  const r = await induceParameter("words-per-page", { query: "how many words are on a typical page", extractClaim: wordsPerPageClaim, search, fetch, memoryPath: p });
  assert.equal(r.induced, false);
  assert.equal(r.value, null);
  assert.match(r.basis, /fewer than the required 2/);
  const onDisk = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
  assert.ok(!onDisk?.parameters?.["words-per-page"], "nothing uncorroborated is written to memory");
});

test("induceParameter: no search/fetch supplied and nothing remembered refuses to guess -- never a fallback default", async () => {
  const p = memPath();
  const r = await induceParameter("words-per-page", { query: "how many words are on a typical page", extractClaim: wordsPerPageClaim, memoryPath: p });
  assert.equal(r.induced, false);
  assert.equal(r.value, null);
  assert.match(r.basis, /no web access supplied/);
});

test("induceParameter is genuinely generic: a SECOND, unrelated parameter with its own extractClaim works identically, proving no parameter-specific knowledge is built in", async () => {
  const p = memPath();
  // A made-up parameter this organ has never seen the name of: "moons of jupiter".
  const search = async () => ({ results: [{ url: "https://x.example/a" }, { url: "https://y.example/b" }] });
  const pages = {
    "https://x.example/a": { title: "", text: "Jupiter has 95 known moons as of the latest count." },
    "https://y.example/b": { title: "", text: "Astronomers count 95 moons orbiting Jupiter." },
  };
  const fetch = async (url) => pages[url];
  const extractMoonsClaim = (text) => { const m = String(text).match(/(\d{1,3})\s*(?:known\s+)?moons?/i); return m ? Number(m[1]) : null; };
  const r = await induceParameter("moons-of-jupiter", { query: "how many moons does jupiter have", extractClaim: extractMoonsClaim, search, fetch, memoryPath: p });
  assert.equal(r.induced, true);
  assert.equal(r.value, 95);
  assert.equal(r.sources.length, 2);
});

test("wordsPerPageClaim: extracts a plausible claim, refuses an out-of-range or absent one", () => {
  assert.equal(wordsPerPageClaim("A typical page holds about 300 words."), 300);
  assert.equal(wordsPerPageClaim("Page 42 has 12 words on it."), null, "12 is below the plausible range -- a page NUMBER, not a words-per-page claim");
  assert.equal(wordsPerPageClaim("Nothing relevant here."), null);
});
