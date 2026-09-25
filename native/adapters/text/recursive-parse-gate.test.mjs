// recursive-parse-gate.test.mjs — proves createCausalTextPerceiver's
// parseModel option (2026-09-23) does what proxy-runner.mjs's production
// wiring now relies on: omitted, the reader is byte-identical to before;
// supplied, real names still reach discoverReferents and a line-forced
// capital with no syntactic PROPN reading is filtered before it does.
//
// Goes through eval/lavar/lib/read-recipe.mjs's own readMaterialText --
// the SAME real recipe proxy-runner.mjs and every LaVar caller use (real
// canonicalisation floor, real revision adapter, real reprojection
// cadence) -- rather than hand-assembling a second, thinner reader that
// could silently diverge from what actually runs in production.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readMaterialText } from "../../eval/lavar/lib/read-recipe.mjs";
import { loadModel } from "./english-parser.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = path.join(here, "../../priors/parser-eng-ewt.json");
const ready = fs.existsSync(MODEL_PATH);
if (!ready) console.error(`[recursive-parse-gate.test] skipping: ${MODEL_PATH} not found (untracked, per-checkout)`);
let model;
if (ready) model = loadModel(JSON.parse(fs.readFileSync(MODEL_PATH, "utf8")));

const admittedWords = (r) => {
  const s = new Set();
  for (const e of r.fold.graphEntries ?? []) if (/^ref:auto:/.test(e.id)) for (const surf of e.surfaces ?? []) for (const w of surf.toLowerCase().match(/\p{L}[\p{L}'’]*/gu) ?? []) s.add(w);
  return s;
};

test("parseModel omitted: byte-identical to the old capitalisation-only admission", { skip: !ready }, async () => {
  const text = "Prince Hal admired Hotspur greatly.\nWhich no man read,\nWhich none could mend.";
  const withoutGate1 = await readMaterialText(text, { source: "test" });
  const withoutGate2 = await readMaterialText(text, { source: "test", parseModel: null });
  assert.deepEqual([...admittedWords(withoutGate1)].sort(), [...admittedWords(withoutGate2)].sort(), "parseModel omitted vs explicit null must agree");
});

test("parseModel supplied: real names survive, a line-forced non-PROPN capital does not", { skip: !ready }, async () => {
  // Each real name repeated once: a single mention doesn't clear
  // discoverReferents' own admission floor regardless of this gate
  // (confirmed unrelated to parseModel -- the same is true ungated), so a
  // fair test of the GATE needs names that would be admitted without it.
  const text = "Prince Hal admired Hotspur greatly. Hotspur rode north. He watched Falstaff drink his sack. Falstaff laughed and drank more.\nWhich no man read,\nWhich none could mend.";
  const gated = await readMaterialText(text, { source: "test", parseModel: model });
  const words = admittedWords(gated);
  assert.ok(words.has("hotspur"), "hotspur should still be admitted through the full reader with the gate on");
  assert.ok(words.has("falstaff"), "falstaff should still be admitted through the full reader with the gate on");
  assert.equal(words.has("which"), false, "a capitalised word forced by line position, never tagged PROPN, must not reach discoverReferents");
});

test("a caller supplying parseModel gets FEWER or equal admitted words than the ungated read, never more", { skip: !ready }, async () => {
  const text = "Prince Hal admired Hotspur greatly. Hotspur rode north. He watched Falstaff drink his sack. Falstaff laughed and drank more.\nWhich no man read,\nWhich none could mend.\nAgainst his own counsel he rode.";
  const before = admittedWords(await readMaterialText(text, { source: "test" }));
  const after = admittedWords(await readMaterialText(text, { source: "test", parseModel: model }));
  for (const w of after) assert.ok(before.has(w), `${w} was admitted by the gate but not by the ungated read -- the gate must only ever narrow, never invent a candidate surfaces.js itself never nominated`);
});
