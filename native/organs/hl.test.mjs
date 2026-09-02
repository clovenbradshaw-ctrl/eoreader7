// node --test hl.test.mjs
//
// The core logic's own conformance now lives at
// eoreader6.1/packages/engine/interpretation/hl.test.mjs (22 cases,
// including the omnimodal non-linguistic check) — not duplicated here.
// This file tests exactly what's the-fold's to own: the adapter, against
// both a synthetic edge shape and the REAL public edge face of a real
// makeRelationReader run over the real engine organs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { BOUND, CONTRADICTED, UNBOUND, declareFunctional, read, stageFromEdges } from "./hl.js";
import { makeRelationReader } from "./hypergraph.js";

test("re-export surface: the engine's full API is reachable from ./hl.js unchanged", () => {
  assert.equal(typeof read, "function");
  assert.equal(typeof declareFunctional, "function");
});

test("adapter: hypergraph's public edge face becomes a stage, honestly labeled", () => {
  const edges = [
    { subject: "Lincoln", verb: "defeated", object: "Douglas", polarity: "+", refs: ["src#0-10"] },
    { subject: "Lincoln", verb: "married", object: "Mary Todd", polarity: "+", refs: ["src#11-30"] },
  ];
  const H = stageFromEdges(edges);
  assert.equal(H.anchorKind, "folded-string", "no resolver injected — the stage says so");
  assert.equal(read(H, ["atom", "defeated", "lincoln", "douglas"]), BOUND);
  assert.equal(read(H, ["atom", "married", "lincoln", "douglas"]), UNBOUND);
  declareFunctional(H, "married", { giver: "test fixture: monogamous marriage" });
  assert.equal(read(H, ["atom", "married", "lincoln", "douglas"]), CONTRADICTED);
});

test("adapter: injected anchorOf wins over folded strings", () => {
  const edges = [{ subject: "President Lincoln", verb: "signed", object: "the Proclamation", polarity: "+", refs: ["r"] }];
  const resolve = (text) => (/lincoln/i.test(text) ? "ref:lincoln" : /proclamation/i.test(text) ? "ref:procl" : null);
  const H = stageFromEdges(edges, { anchorOf: resolve });
  assert.equal(H.anchorKind, "resolved-referent");
  assert.equal(read(H, ["atom", "signed", "ref:lincoln", "ref:procl"]), BOUND);
});

test("end to end against the REAL engine organs: reader edges → stage → R2", async () => {
  const { splitSentences } = await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(
    "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/material.js"
  );
  const organs = {
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations, tokenize, buildFrequencyTable, functionWordSet,
  };
  const passages = [
    { ref: "fixture#a", text: "Abraham Lincoln defeated Stephen Douglas. Abraham Lincoln married Mary Todd. Stephen Douglas debated Abraham Lincoln." },
    { ref: "fixture#b", text: "Abraham Lincoln defeated Stephen Douglas in the election. Mary Todd married Abraham Lincoln in Springfield." },
  ];
  const reader = makeRelationReader(organs)(passages);
  assert.ok(reader.examined);
  assert.ok(reader.edges.length > 0);
  const H = stageFromEdges(reader.edges);
  const defeated = reader.edges.find((e) => e.label === "defeated");
  assert.ok(defeated);
  const foldStr = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  assert.equal(read(H, ["atom", "defeated", foldStr(defeated.end1), foldStr(defeated.end2)]), BOUND);
  const married = reader.edges.find((e) => e.label === "married");
  assert.ok(married);
  const ms = foldStr(married.end1);
  H.anchors.add("someone else");
  assert.equal(read(H, ["atom", "married", ms, "someone else"]), UNBOUND, "before the declaration: silently unbound");
  declareFunctional(H, "married", { giver: "test fixture: monogamous marriage" });
  assert.equal(read(H, ["atom", "married", ms, "someone else"]), CONTRADICTED, "after: R2 convicts what judge() could only under-claim");
});
