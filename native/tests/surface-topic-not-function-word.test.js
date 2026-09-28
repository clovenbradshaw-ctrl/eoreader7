import test from "node:test";
import assert from "node:assert/strict";
import { extractSurfaces } from "../adapters/text/surfaces.js";
import { extractSurfaces as legacyExtract } from "../legacy-ported/packages/engine/perceiver/text/surfaces.js";
import { tokenize, buildFrequencyTable, functionWordSet } from "../adapters/text/material.js";

// A biography's subject is its most frequent token. The share-derived closed
// class therefore holds it; the extractor must not read that as evidence
// against a word the text never once writes lowercase (2026-09-28, found on
// the Merkel and Murat pages: 122 and 22 bare-surname mentions dropped).
const text = Array.from({ length: 40 }, (_, i) => `In ${1990 + i}, Merkel took the seat and Merkel kept it as the chamber watched Merkel.`).join(" ");
const sents = text.split(/(?<=\.)\s+/).map((t, order) => ({ text: t, order }));
const fw = functionWordSet(buildFrequencyTable(tokenize(text)));

test("the closed class holds the topic, and the extractor keeps the topic anyway", () => {
  assert.ok(fw.has("merkel"), "the share-derived class holds the subject (the premise of the bug)");
  assert.ok(fw.has("the"));
  for (const extract of [extractSurfaces, legacyExtract]) {
    const surfaces = extract(sents, { functionWords: fw }).map((s) => s.surface);
    assert.ok(surfaces.includes("Merkel"), `bare "Merkel" survives: ${surfaces.join("|")}`);
  }
});

test("a genuine function word with a lowercase form is still refused", () => {
  const withThe = sents.concat([{ text: "The chamber rose; then The Hague was named, and The Hague again.", order: sents.length }]);
  const surfaces = extractSurfaces(withThe, { functionWords: fw }).map((s) => s.surface);
  assert.ok(!surfaces.includes("The"), `"The" refused: ${surfaces.join("|")}`);
});
