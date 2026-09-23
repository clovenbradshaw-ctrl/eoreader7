// english-parser-perceiver.test.mjs — proves the standalone adapter matches
// the real perceiver contract (organ.perceive(encounter, orientation) ->
// candidates shaped like relations.js/relations-gfp.js already emit) in
// isolation, with mock encounters, before anyone is authorized to wire it
// into session.reader.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel } from "./english-parser.js";
import { createEnglishParserPerceiver } from "./english-parser-perceiver.mjs";
import { perceive as kernelPerceive } from "../../kernel/perception.js";
import { encounter } from "../../kernel/reading.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = path.join(here, "../../priors/parser-eng-ewt.json");
const ready = fs.existsSync(MODEL_PATH);
if (!ready) console.error(`[english-parser-perceiver.test] skipping: ${MODEL_PATH} not found (untracked, per-checkout)`);

let model;
if (ready) model = loadModel(JSON.parse(fs.readFileSync(MODEL_PATH, "utf8")));

test("guards on encounter.modality !== 'text'", { skip: !ready }, async () => {
  const p = createEnglishParserPerceiver({ model });
  assert.deepEqual(await p.perceive({ modality: "code", material: "x" }), []);
  assert.deepEqual(await p.perceive({ modality: "text", material: 42 }), []);
  assert.deepEqual(await p.perceive({}), []);
});

test("emits {end1,label,end2,offset,grain,cell,polarity} for a simple sentence", { skip: !ready }, async () => {
  const p = createEnglishParserPerceiver({ model });
  const out = await p.perceive({ modality: "text", material: "The dog chased the cat." });
  assert.ok(out.length >= 1, "expected at least one relation");
  for (const r of out) {
    assert.equal(typeof r.end1, "string");
    assert.equal(typeof r.label, "string");
    assert.equal(typeof r.end2, "string");
    assert.equal(typeof r.offset, "number");
    assert.ok("grain" in r);
    assert.ok("cell" in r);
    assert.equal(r.polarity, "+");
  }
  const chase = out.find((r) => r.label.toLowerCase().startsWith("chas"));
  assert.ok(chase, "expected the chased relation");
  assert.equal(chase.end1.toLowerCase(), "dog");
  assert.equal(chase.end2.toLowerCase(), "cat");
});

test("finds a relation in EVERY clause, not only the sentence root", { skip: !ready }, async () => {
  // Both verbs here take a direct nominal object (praised/wrote), unlike a
  // ccomp-taking verb ("said that...") which has no UD obj at all -- that's
  // a real, disclosed limit of the nsubj/obj rule, not exercised by this test.
  const p = createEnglishParserPerceiver({ model });
  const out = await p.perceive({ modality: "text", material: "The teacher praised the student who wrote the essay." });
  const praised = out.some((r) => r.label.toLowerCase().startsWith("prais"));
  const wrote = out.some((r) => r.label.toLowerCase().startsWith("wrote"));
  assert.ok(praised, "expected the matrix clause's relation (praised)");
  assert.ok(wrote, "expected the relative clause's relation (wrote) -- not just the root");
});

test("offsets are real character positions into the ORIGINAL material", { skip: !ready }, async () => {
  const p = createEnglishParserPerceiver({ model });
  const material = "Ignore this prefix.  The dog chased the cat.";
  const out = await p.perceive({ modality: "text", material });
  const chase = out.find((r) => r.label.toLowerCase().startsWith("chas"));
  assert.ok(chase);
  assert.equal(material.slice(chase.offset, chase.offset + chase.label.length), chase.label);
});

test("multi-sentence material: relations from both sentences, correctly offset", { skip: !ready }, async () => {
  const p = createEnglishParserPerceiver({ model });
  const material = "The dog chased the cat. The bird ate the worm.";
  const out = await p.perceive({ modality: "text", material });
  const chase = out.find((r) => r.label.toLowerCase().startsWith("chas"));
  const ate = out.find((r) => r.label.toLowerCase().startsWith("ate"));
  assert.ok(chase && ate, "expected relations from both sentences");
  assert.ok(chase.offset < ate.offset, "first sentence's relation should offset before the second's");
});

test("is a structural drop-in for kernel/perception.js's own perceive() -- the real caller, not a reimplementation", { skip: !ready }, async () => {
  const organ = createEnglishParserPerceiver({ model });
  const enc = encounter({ modality: "text", material: "The dog chased the cat.", source: "test" });
  const candidates = await kernelPerceive(enc, {}, { perceivers: [organ], priors: [] });
  assert.ok(candidates.length >= 1);
  for (const c of candidates) {
    assert.equal(c.schema, "PerceptCandidate@1");
    assert.ok(c.candidate.end1 && c.candidate.label && c.candidate.end2, "the wrapped candidate keeps the relation shape");
  }
});
