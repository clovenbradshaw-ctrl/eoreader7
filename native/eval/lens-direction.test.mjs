// lens-direction.test.mjs — walls on the direction finding (2026-09-23).
// Generation ends in the language's own lens; reading passes through it;
// and the "language-blind" adjacency reader is an SVO lens in disguise.
// Floors sit below the measured values recorded in results/lens-direction.json.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel } from "../adapters/text/english-parser.js";
import { findTreebanks } from "./eot-roundtrip.mjs";
import { generation, reading, adjacencyAsLens, MODEL } from "./lens-direction.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const banks = findTreebanks();
const hasEnglish = banks.some((b) => b.name === "ud-english-ewt");
const POS_ENG = path.resolve(HERE, "..", "..", "..", "the-fold", "priors-data", "pos-prior-eng.json");
const ROLE_CONFIG = path.resolve(HERE, "..", "priors", "role-config-eng.json");
const readingReady = hasEnglish && [MODEL, POS_ENG, ROLE_CONFIG].every((p) => fs.existsSync(p));

test("generation must end in the language's own lens: English order beats a pooled universal order and every foreign one", { skip: hasEnglish ? false : "UD_English-EWT not present" }, () => {
  const g = generation(banks, { sample: 1000 }).orderFrom;
  // Measured on 3,000 sentences: english 0.793, pooledOthers 0.480.
  assert.ok(g.english.tau - g.pooledOthers.tau >= 0.2, `own lens ${g.english.tau} vs pooled ${g.pooledOthers.tau}`);
  for (const [name, r] of Object.entries(g)) if (name !== "english") assert.ok(g.english.tau > r.tau, `English order should beat ${name} (${r.tau})`);
});

test("reading must pass through the lens: the English grammar recovers who-did-what-to-whom; both production routes do not", { skip: readingReady ? false : "parser model (untracked), POS prior or RoleConfig not present" }, () => {
  const r = reading(banks, {
    model: loadModel(JSON.parse(fs.readFileSync(MODEL, "utf8"))),
    posPrior: JSON.parse(fs.readFileSync(POS_ENG, "utf8")),
    roleConfig: JSON.parse(fs.readFileSync(ROLE_CONFIG, "utf8")),
  });
  // Measured: parser recall 0.740 / precision 0.737; positional 0.009; GFP 0.013.
  assert.ok(r.parserLensFirst.recall >= 0.7, `parser recall ${r.parserLensFirst.recall}`);
  assert.ok(r.parserLensFirst.recall > 10 * r.positionalRoleConfig.recall, "the lens-first parser should far exceed the proxy's positional route");
  assert.ok(r.parserLensFirst.recall > 10 * r.gfpUniversalFirst.recall, "the lens-first parser should far exceed universal-first adjacency");
});

test("the 'universal' adjacency reader is an SVO lens: given the gold participants, the verb sits between them in SVO languages, not elsewhere", { skip: hasEnglish ? false : "UD_English-EWT not present" }, () => {
  const a = adjacencyAsLens(banks, { sample: 1500 });
  // Measured (3,000-sentence sample): en 0.838, pcm 0.991, grc 0.426, he 0.260, la 0.236, ar 0.227, sa 0.0-0.158.
  assert.ok(a["ud-english-ewt"].verbBetween >= 0.8);
  for (const name of ["ud-latin-perseus", "ud-arabic-padt", "ud-sanskrit-vedic"]) if (a[name]) assert.ok(a[name].verbBetween <= 0.45, `${name}: ${a[name].verbBetween}`);
});
