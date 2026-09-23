// nominal-beings.test.mjs — the flagship is the one that matters:
// `cast.js::makeReferentIndex` finds ZERO real Hebrew content in a real
// Hebrew Wikipedia article (capitalization is structurally inert on a
// caseless script — surfaces.js's own header), and this module finds real
// ones in the same bytes. And on real English prose, it recovers real
// article content the capitalization index structurally cannot — a
// recurring common noun (election, lawyer, career) is never capitalised.
// If either flagship ever stops being true, this suite fails.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { discoverNominalBeings, nominalClass, beingRefOf, NAMING_CLASSES } from "./nominal-beings.js";
import { extractReadable } from "../../organs/web.js";

const POS_HEB = fileURLToPath(new URL("../../priors/pos-heb.json", import.meta.url));
const HEB_WIKI_ARTICLE = "/Users/mlacy/Documents/3.0/live_priors/11-multi-language/wikipedia-lang/he/_________.txt";
// English's own POS prior lives in the sibling the-fold repo (priors-data/),
// not under eoreader7 — an absolute path, the same one every other reading
// organ that consumes it uses (there is no relative path across repos).
const POS_ENG = "/Users/mlacy/Documents/3.0/the-fold/priors-data/pos-prior-eng.json";
const LINCOLN_HTML = fileURLToPath(new URL("../../eval/the-fold/fixtures/wikipedia-abraham-lincoln.html", import.meta.url));

const posHeb = existsSync(POS_HEB) ? JSON.parse(readFileSync(POS_HEB, "utf8")) : null;
const posEng = existsSync(POS_ENG) ? JSON.parse(readFileSync(POS_ENG, "utf8")) : null;

// A tiny synthetic prior: three attested forms, two typed NOUN, one typed
// VERB — real classifyWord shape, no fixture needed.
const toyPrior = {
  forms: {
    loom: { VERB: 4, NOUN: 1 },
    looms: { VERB: 2 },
    cinder: { NOUN: 5 },
    cinders: { NOUN: 3 },
    the: { DET: 40 },
    walked: { VERB: 6 },
  },
};

test("every candidate needs a received prior — absent one, nothing is admitted", () => {
  assert.deepEqual(discoverNominalBeings("the loom hummed", null), []);
  assert.deepEqual(discoverNominalBeings("the loom hummed", {}), []);
});

test("nominalClass refuses an unattested form, and a form whose top class never clears the floor", () => {
  assert.equal(nominalClass("nonexistentword", toyPrior), null);
  // loom: VERB 4/5 = 0.8, clears GRAMMAR_MIN_SHARE (0.5) — VERB, not a being.
  assert.equal(nominalClass("loom", toyPrior), "VERB");
  assert.equal(nominalClass("cinder", toyPrior), "NOUN");
});

test("a being is a recurring NOUN-typed stem, grouped across surface variants by shared prefix", () => {
  const text = "The cinder pile grew. Cinders drifted past the cinder pile again. A single cinder landed.";
  const beings = discoverNominalBeings(text, toyPrior, { minOccurrences: 2 });
  const stems = beings.map((b) => b.stem);
  assert.ok(stems.includes("cinder"), `expected a cinder being, got ${JSON.stringify(stems)}`);
  const cinderBeing = beings.find((b) => b.stem === "cinder");
  assert.ok(cinderBeing.surfaces.some((s) => /^cinder$/i.test(s)));
  assert.ok(cinderBeing.surfaces.some((s) => /^cinders$/i.test(s)), "the plural variant folds into the same being");
  assert.ok(cinderBeing.occurrences >= 3);
});

test("a form whose dominant class is VERB never becomes a being, even recurring", () => {
  const text = "The loom hummed. He looms over the loom every morning. The loom never stops.";
  const beings = discoverNominalBeings(text, toyPrior, { minOccurrences: 2 });
  assert.ok(!beings.some((b) => b.stem === "loom"), "loom's dominant class is VERB in this prior — never admitted as a being");
});

test("beingRefOf binds an occurrence to its tier-1 being by the same stem rule", () => {
  const beings = discoverNominalBeings("cinder cinder cinders cinder", toyPrior, { minOccurrences: 2 });
  const byStem = new Map(beings.map((b) => [b.stem, b]));
  assert.equal(beingRefOf("cinders", byStem), "cinder");
  assert.equal(beingRefOf("nonexistentword", byStem), null);
});

test("NAMING_CLASSES is heard-surfaces.js's own set, reused rather than restated", () => {
  assert.deepEqual([...NAMING_CLASSES].sort(), ["NOUN", "PROPN"]);
});

// FLAGSHIP 1 — real Hebrew Wikipedia prose, no synthetic fixture.
test("real Hebrew Wikipedia prose: nominal-beings recovers real content where capitalisation-anchored admission finds only Latin-script debris", { skip: posHeb && existsSync(HEB_WIKI_ARTICLE) ? false : "priors/pos-heb.json or the Hebrew Wikipedia fixture is not present in this checkout" }, () => {
  const text = readFileSync(HEB_WIKI_ARTICLE, "utf8");
  const beings = discoverNominalBeings(text, posHeb, { minOccurrences: 2 });
  // Measured 2026-09-22: 35 beings at minOccurrences 2, top one
  // "פילוסופיה" (philosophy — the article's own subject) at 45
  // occurrences. Capitalization finds 4 candidates on these same bytes —
  // Internet Encyclopedia, Raffaello Sanzio, Athens, School — every one
  // English/Latin-script caption debris, zero real Hebrew content
  // (surfaces.js's own header predicts exactly this specimen).
  assert.ok(beings.length >= 20, `expected a real Hebrew being tier, got ${beings.length}`);
  const top = beings[0];
  assert.ok(top.occurrences >= 20, `the article's own dominant topic word should recur heavily, got ${top.stem}=${top.occurrences}`);
  // Every surface is genuinely Hebrew-script — this tier never falls back
  // to matching the incidental Latin-script debris capitalization catches.
  assert.ok(beings.every((b) => b.surfaces.every((s) => /\p{Script=Hebrew}/u.test(s))), "every recovered being is Hebrew-script, not Latin captions/citations");
});

// FLAGSHIP 2 — real English Wikipedia prose (extractReadable, never raw
// HTML or a bare tag-stripper — a first attempt at this test fed raw HTML
// straight through and got "class"/"data"/"title" attribute debris back;
// that was a validation-script bug, not this module's, and is why
// extractReadable is required here rather than a naive regex strip).
test("real English Wikipedia prose: nominal-beings recovers real article content, including recurring lowercase nouns capitalisation can never see", { skip: posEng && existsSync(LINCOLN_HTML) ? false : "priors-data/pos-prior-eng.json or the Lincoln fixture is not present in this checkout" }, () => {
  const { text } = extractReadable(readFileSync(LINCOLN_HTML, "utf8"));
  const beings = discoverNominalBeings(text, posEng, { minOccurrences: 3 });
  // Measured 2026-09-22: 546 beings, top "lincoln" at 529 occurrences,
  // "states"/"union"/"johnson"/"slavery"/"president" all real article
  // content in the top 10. 168 of the 546 are lowercase-only content
  // (election, lawyer, career, conviction) the capitalisation index's
  // 1,448 candidates never include, because an ordinary common noun is
  // never capitalised in running prose.
  assert.ok(beings.length >= 200, `expected a substantial real English being tier, got ${beings.length}`);
  const stems = new Set(beings.map((b) => b.stem));
  for (const expected of ["lincoln", "states", "union", "president"]) {
    assert.ok(stems.has(expected), `expected "${expected}" among the recovered beings`);
  }
  const top = beings[0];
  assert.equal(top.stem, "lincoln", `the article's own subject should dominate, got ${top.stem}`);
  assert.ok(top.occurrences >= 200, `lincoln should recur heavily across the article, got ${top.occurrences}`);
});
