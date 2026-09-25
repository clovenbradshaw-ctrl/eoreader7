import { test } from "node:test";
import assert from "node:assert/strict";

import { SEARCH_TERMS, TERM_SCHEMA, findSearchTerm, listSearchTerms, searchTermsByFamily } from "../organs/search-terms.js";

test("the registry names exactly the 12 search terms designed this session, each with a real module and fn", () => {
  assert.equal(SEARCH_TERMS.length, 12);
  for (const t of SEARCH_TERMS) {
    assert.ok(t.id && t.family && t.cell && t.module && t.fn && t.question, `every field present on ${t.id}`);
  }
});

test("findSearchTerm is exact-id only — no fuzzy fallback, no nearest-match guess", () => {
  assert.equal(findSearchTerm("clusters")?.module, "native/organs/kind-standing.js");
  assert.equal(findSearchTerm("CLUSTERS")?.module, "native/organs/kind-standing.js", "case-folded, not fuzzy");
  assert.equal(findSearchTerm("clusterz"), null, "a near-miss id is not resolved here — that is target-resolve.js's job, not this registry's");
});

test("clusters: is routed to kind-standing.js, not kind-induction.js — the postmortem-driven fix", () => {
  const clusters = findSearchTerm("clusters");
  assert.equal(clusters.fn, "discoverCompanyKinds");
  assert.notEqual(clusters.module, "native/kernel/kind-induction.js");
});

test("searchTermsByFamily partitions correctly and covers every declared family", () => {
  const perturbation = searchTermsByFamily("PERTURBATION");
  const deduction = searchTermsByFamily("deduction"); // lower-case input still resolves
  const structural = searchTermsByFamily("STRUCTURAL");
  assert.equal(perturbation.length + deduction.length + structural.length, SEARCH_TERMS.length);
  assert.ok(perturbation.every((t) => t.family === "PERTURBATION"));
  assert.ok(deduction.every((t) => t.family === "DEDUCTION"));
});

test("listSearchTerms returns the same frozen array the module exports", () => {
  assert.equal(listSearchTerms(), SEARCH_TERMS);
  assert.ok(Object.isFrozen(SEARCH_TERMS));
});

test("TERM_SCHEMA is a stable, versioned schema id", () => {
  assert.equal(TERM_SCHEMA, "EOSearchTerm@1");
});
