// node --test experiencer.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import { requireExperiencer, withExperiencer } from "./experiencer.js";

test("requireExperiencer throws when omitted entirely — never a silent default", () => {
  assert.throws(() => requireExperiencer(), /experiencer is declared/);
  assert.throws(() => requireExperiencer(null), /experiencer is declared/);
  assert.throws(() => requireExperiencer("hypergraph.js"), /experiencer is declared/);
});

test("requireExperiencer throws when who is missing — WHAT is doing the believing is never left unnamed", () => {
  assert.throws(() => requireExperiencer({ read: "andrew-johnson.txt" }), /experiencer\.who is required/);
  assert.throws(() => requireExperiencer({ who: "", read: "x" }), /experiencer\.who is required/);
});

test("requireExperiencer throws when read is missing — never an unaddressed belief", () => {
  assert.throws(() => requireExperiencer({ who: "hypergraph.js:judge()" }), /experiencer\.read is required/);
  assert.throws(() => requireExperiencer({ who: "hypergraph.js:judge()", read: "  " }), /experiencer\.read is required/);
});

test("revision defaults to null, disclosed, never invented", () => {
  const e = requireExperiencer({ who: "hypergraph.js:judge()", read: "andrew-johnson.txt" });
  assert.equal(e.revision, null);
});

test("revision, when given, must be a real string, not a guess", () => {
  assert.throws(
    () => requireExperiencer({ who: "wikidata:curators", read: "Q8612", revision: 12345 }),
    /experiencer\.revision must be a string or null/,
  );
  const e = requireExperiencer({ who: "wikidata:curators", read: "Q8612", revision: "rev-2026-08-20T00:00Z" });
  assert.equal(e.revision, "rev-2026-08-20T00:00Z");
});

test("a valid experiencer is frozen — never mutable after the fact", () => {
  const e = requireExperiencer({ who: "dbpedia:sparql-endpoint", read: "http://dbpedia.org/resource/Andrew_Johnson" });
  assert.throws(() => { e.who = "someone else"; }, TypeError);
});

test("withExperiencer stamps a belief additively — the belief's own fields are untouched", () => {
  const belief = { verdict: "holds", refs: ["andrew-johnson.txt#12183-12689"] };
  const stamped = withExperiencer(belief, { who: "the-fold:hypergraph.js:judge()", read: "andrew-johnson.txt" });
  assert.equal(stamped.verdict, "holds");
  assert.deepEqual(stamped.refs, ["andrew-johnson.txt#12183-12689"]);
  assert.equal(stamped.experiencer.who, "the-fold:hypergraph.js:judge()");
  // original belief object is never mutated
  assert.equal(belief.experiencer, undefined);
});

test("withExperiencer propagates the SAME throw as requireExperiencer — one discipline, not two", () => {
  assert.throws(() => withExperiencer({ verdict: "holds" }, { read: "x" }), /experiencer\.who is required/);
});
