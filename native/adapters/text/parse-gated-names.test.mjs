// parse-gated-names.test.mjs — proves the SVO gate does what its header
// claims: a real name with a real syntactic PROPN reading is admitted; a
// capitalised-but-never-PROPN word is not, purely from capitalisation; and
// the measured numbers on the real Henry IV gold (2026-09-23, 365 items,
// 9 blind annotators) reproduce exactly, as a checked assertion.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel } from "./english-parser.js";
import { parseGatedNames } from "./parse-gated-names.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = path.join(here, "../../priors/parser-eng-ewt.json");
const HENRY_PATH = "/Users/mlacy/Documents/3.0/live_priors/15-western-canon/first-folio/henry-iv-part-1-modern.txt";
const GOLD_PATH = path.join(here, "../../eval/lavar/results/henry-iv-modern-name-gold.json");
const CANDIDATES_PATH = path.join(here, "../../eval/lavar/results/henry-iv-modern-name-candidates.json");

const ready = fs.existsSync(MODEL_PATH);
if (!ready) console.error(`[parse-gated-names.test] skipping: ${MODEL_PATH} not found (untracked, per-checkout)`);
let model;
if (ready) model = loadModel(JSON.parse(fs.readFileSync(MODEL_PATH, "utf8")));

test("requires a model", () => {
  assert.throws(() => parseGatedNames("Falstaff spoke.", {}), TypeError);
});

test("a real name with a real syntactic PROPN reading is admitted", { skip: !ready }, () => {
  // Names sit mid-sentence here on purpose: surfaces.js's own capitalised-run
  // scan (unchanged by this file, and correct on its own terms) skips the
  // FIRST token of every sentence as capitalised-by-position, so a name that
  // only ever opens its own sentence is invisible to this gate too --
  // exactly the gap surfaces.js's own header names and extractLeadingSurfaces
  // was built (but never wired) to answer. Not this file's fix to make.
  const { admitted } = parseGatedNames("Prince Hal admired Hotspur greatly. He watched Falstaff drink his sack and laugh.", { model });
  assert.ok(admitted.has("hotspur"), "hotspur should be admitted (parsed PROPN, capitalised)");
  assert.ok(admitted.has("falstaff"), "falstaff should be admitted (parsed PROPN, capitalised)");
});

test("a capitalised word the parser never reads as PROPN is refused, even repeated", { skip: !ready }, () => {
  // "Which" opens two verse lines here (line-initial capital, forced by the
  // line break, not by namehood) and never appears lowercase in this
  // fragment -- exactly the shape that fooled the orthography-only
  // detectors on the real play (surfaces.js admitted it as a candidate).
  const text = "The letter came,\nWhich no man read.\nThe seal was broke,\nWhich none could mend.";
  const { admitted, evidence } = parseGatedNames(text, { model });
  assert.equal(admitted.has("which"), false, "capitalisation alone (line-initial) must not admit a non-PROPN word");
  assert.equal(evidence.get("which")?.synPropn, false);
});

test("real Henry IV Part 1 (modern spelling): reproduces the measured 2026-09-23 numbers exactly", {
  skip: ready && fs.existsSync(HENRY_PATH) && fs.existsSync(GOLD_PATH) && fs.existsSync(CANDIDATES_PATH) ? false : "model, play text or committed gold not present",
}, () => {
  const raw = fs.readFileSync(HENRY_PATH, "utf8");
  const text = raw.slice(raw.indexOf("\n\n") + 2);
  const { admitted } = parseGatedNames(text, { model });

  const { forms } = JSON.parse(fs.readFileSync(CANDIDATES_PATH, "utf8"));
  const { decided } = JSON.parse(fs.readFileSync(GOLD_PATH, "utf8"));
  const rows = forms.map((f, i) => ({ f, g: decided[i] })).filter((x) => x.g === "name" || x.g === "not-name" || x.g === "mixed");
  const positives = rows.filter((x) => x.g !== "not-name").length;
  const tp = rows.filter((x) => x.g !== "not-name" && admitted.has(x.f.form)).length;
  const fp = rows.filter((x) => x.g === "not-name" && admitted.has(x.f.form)).length;

  // Measured 2026-09-23 against the completed 9-annotator gold (365 items,
  // 97.6% pairwise agreement): precision 69.4%, recall 87.7%, F1 77.5 --
  // the best of nine admission formulas tried, including the best
  // combination of the PRE-EXISTING orthography-only detectors (F1 76.3).
  assert.equal(tp, 136, `true positives drifted: ${tp} (was 136) -- the parser model or the play text changed`);
  assert.equal(fp, 60, `false positives drifted: ${fp} (was 60) -- the parser model or the play text changed`);
  assert.equal(positives, 155);
  const P = tp / (tp + fp), R = tp / positives, F1 = (2 * P * R) / (P + R);
  assert.ok(Math.abs(F1 - 0.775) < 0.005, `F1 drifted to ${F1.toFixed(3)} (was 0.775)`);
});
