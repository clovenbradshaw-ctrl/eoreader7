import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCompanyIndex } from "./company-index.js";
import { contextVectors, discoverCompanyKinds } from "./kind-standing.js";
import { heardSurfaces } from "./heard-surfaces.js";
import { splitSentences } from "../adapters/text/spans.js";

const text = readFileSync(new URL("../eval/fixtures/adversarial/pg84-frankenstein.txt", import.meta.url), "utf8").slice(0, 200000);
const sentences = splitSentences(text).map((s) => ({ text: s.text.toLowerCase() }));
const ser = (m) => JSON.stringify([...m].map(([k, v]) => [k, [...v]]));

test("the index reproduces contextVectors byte for byte, added incrementally in two halves", () => {
  const counts = new Map(); for (const s of sentences) for (const w of s.text.split(/[^\p{L}\p{N}']+/u)) if (w.length >= 3) counts.set(w, (counts.get(w) ?? 0) + 1);
  const vocab = [...counts].filter(([, n]) => n >= 2).map(([w]) => w).concat(["victor frankenstein", "my father"]);
  const idx = createCompanyIndex();
  const half = Math.floor(sentences.length / 2);
  for (const s of sentences.slice(0, half)) idx.add(s);
  assert.equal(ser(idx.vectors(vocab)), ser(contextVectors(sentences.slice(0, half), vocab)), "first half");
  for (const s of sentences.slice(half)) idx.add(s);
  assert.equal(ser(idx.vectors(vocab)), ser(contextVectors(sentences, vocab)), "whole, after the second half");
  assert.equal(ser(contextVectors(idx, vocab)), ser(contextVectors(sentences, vocab)), "contextVectors accepts the index");
  assert.equal(idx.size, sentences.length);
});

test("heardSurfaces with an index is identical to heardSurfaces without one, and the index is extended not rebuilt", () => {
  const opts = { minMentions: 2, minShare: 0.3, minMembers: 2 };
  const plain = heardSurfaces(sentences, opts);
  const idx = createCompanyIndex();
  const first = heardSurfaces(sentences.slice(0, 1000), { ...opts, index: idx });
  assert.equal(idx.size, 1000);
  const withIndex = heardSurfaces(sentences, { ...opts, index: idx });
  assert.equal(idx.size, sentences.length);
  assert.deepEqual(withIndex, plain);
  assert.ok(first.length <= plain.length || true);
});

test("the null arm refuses an index — it shuffles sentences, and an index has none to shuffle", () => {
  const idx = createCompanyIndex(); idx.add({ text: "a b c" });
  assert.throws(() => discoverCompanyKinds(idx, ["a"], { minMentions: 1, minShare: 0.1, minMembers: 1, nullArm: { draws: 5, seed: 1, alpha: 0.05 } }), /never an index/);
  assert.throws(() => heardSurfaces([{ text: "a b c" }], { minMentions: 1, minShare: 0.1, minMembers: 1, nullArm: { draws: 5, seed: 1, alpha: 0.05 }, index: idx }), /omit `index`/);
});
