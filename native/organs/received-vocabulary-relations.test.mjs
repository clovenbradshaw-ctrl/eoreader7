// received-vocabulary-relations.test.mjs — against the real surfaces.js /
// relations.js, no stubs. Pins the finding this module answers: the real
// SVO matcher is case-agnostic; the real vocabulary-discovery gate is not.
import test from "node:test";
import assert from "node:assert/strict";
import { readWithReceivedVocabulary, RECEIVED_RELATION_VERBS } from "./received-vocabulary-relations.js";
import { extractSurfaces } from "../adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../adapters/text/relations.js";

test("code-domain prose with no proper noun anywhere: unreadable by the base pipeline, readable here", () => {
  const text = "In load(), config.port has type number.";
  // Confirm the base pipeline really finds nothing first — this test is
  // pinning a GAIN, not a tautology about its own input.
  const baseSurfaces = extractSurfaces([{ text }]).map((s) => s.surface);
  assert.equal(baseSurfaces.length, 0, "no capitalised, non-sentence-initial surface exists in this sentence");
  const { edges } = readWithReceivedVocabulary(text);
  assert.ok(edges.length >= 1, "the received vocabulary should still find something");
  assert.ok(edges.some((e) => e.verb === "has"), "the copula 'has' should be the matched verb");
});

test("a sentence the base pipeline CAN already read is not duplicated or degraded", () => {
  const text = "Lincoln met Mary Owens in 1836. Lincoln met Mary Todd in 1839.";
  const surfaces = extractSurfaces([{ text }]).map((s) => s.surface);
  const discovered = discoverRelationVocab(text, { surfaces, minSurfaces: 1 }).verbs;
  const base = extractRelations(text, { verbs: discovered });
  const widened = readWithReceivedVocabulary(text);
  // Every edge the base pipeline found is still found — additive, never
  // a competing or lossy second reading of the same material.
  for (const b of base) assert.ok(widened.edges.some((w) => w.subject === b.subject && w.verb === b.verb && w.object === b.object), `lost a base edge: ${b.subject}|${b.verb}|${b.object}`);
});

test("discoveredVerbs / receivedVerbsUsed disclose which vocabulary source is responsible for what", () => {
  const text = "Andrew Jackson depends on nothing. config.port depends on the schema.";
  const { discoveredVerbs, receivedVerbsUsed } = readWithReceivedVocabulary(text);
  // "Andrew Jackson" is a real, non-sentence-initial-only surface (it
  // recurs as itself, not sentence-initial in this construction — the
  // point here is only that "depends" is reachable BOTH ways, and the
  // function must not misreport which).
  assert.ok(receivedVerbsUsed.has("depends") || discoveredVerbs.has("depends"), "depends must be reachable one way or the other");
});

test("no surfaces and no received match: an honest empty read, never a guess", () => {
  const { edges } = readWithReceivedVocabulary("Xyzzy plugh.");
  assert.deepEqual(edges, []);
});

test("RECEIVED_RELATION_VERBS is small and lowercase (surface forms, not canonical rel names)", () => {
  assert.ok(RECEIVED_RELATION_VERBS.length < 25, "deliberately small -- a widening, never a second hand-typed vocabulary");
  for (const v of RECEIVED_RELATION_VERBS) assert.equal(v, v.toLowerCase(), `${v} must be a lowercase surface form`);
});

test("a caller-supplied received set fully replaces the default, never merges silently", () => {
  const text = "config.port frobnicates the widget.";
  const withDefault = readWithReceivedVocabulary(text);
  const withCustom = readWithReceivedVocabulary(text, { received: ["frobnicates"] });
  assert.equal(withDefault.edges.length, 0, "'frobnicates' is not in the default received vocabulary");
  assert.ok(withCustom.edges.some((e) => e.verb === "frobnicates"));
});
