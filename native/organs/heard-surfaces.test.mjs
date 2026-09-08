// heard-surfaces.test.mjs — the heard rule, enforced rather than asserted.
//
// The flagship is the one that matters: `extractSurfaces` finds ZERO beings
// in a lowercased novel (S86), and this module finds real ones in the same
// bytes. If that ever stops being true, this suite fails.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { heardSurfaces, isPositionallySigned, POSITIONAL_SIGNATURE, NAMING_CLASSES } from "./heard-surfaces.js";

const N = "../adapters/text/";
const BOOK = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gitenberg/pg2554_Crime-and-Punishment.txt";
const POS_ENG = fileURLToPath(new URL("../priors/pos-eng.json", import.meta.url));

// A listener's material: names recur, keep no determiner, and appear both
// opening a sentence and inside one. The common nouns keep "the" in front.
const heardCorpus = (n) => {
  const lines = [];
  for (let i = 0; i < n; i++) {
    lines.push("aldric walked to the mill at dawn.");
    lines.push("the miller greeted aldric warmly.");
    lines.push("brenna sailed the barge downriver.");
    lines.push("the barge carried brenna past the mill.");
    lines.push("cassian counted the coin at the market.");
    lines.push("the market closed and cassian went home.");
  }
  return lines.map((text, order) => ({ text, order }));
};

test("every number is the caller's — an undeclared floor throws (P4)", () => {
  assert.throws(() => heardSurfaces(heardCorpus(2), { minShare: 0.3, minMembers: 2 }), /minMentions must be declared/);
  assert.throws(() => heardSurfaces(heardCorpus(2), { minMentions: 4, minMembers: 2 }), /minShare must be declared/);
  assert.throws(() => heardSurfaces(heardCorpus(2), { minMentions: 4, minShare: 0.3 }), /minMembers must be declared/);
});

test("a kind signed by POSITION is a being's kind; one signed by a WORD is not", () => {
  assert.equal(isPositionallySigned({ signature: POSITIONAL_SIGNATURE }), true);
  assert.equal(isPositionallySigned({ signature: "before=the" }), false, "a frame-kind is not a being-kind");
  assert.equal(isPositionallySigned(null), false);
  assert.ok(!POSITIONAL_SIGNATURE.includes("the"), "the signature names no word of any language");
});

test("THE HEARD RULE: beings are found in text that carries no capital letters at all", () => {
  const out = heardSurfaces(heardCorpus(30), { minMentions: 10, minShare: 0.25, minMembers: 2 });
  const found = new Set(out.map((s) => s.surface));
  assert.ok(found.has("aldric"), `the names must survive the ear: ${[...found].join(", ")}`);
  assert.ok(found.has("brenna") || found.has("cassian"), `more than one being: ${[...found].join(", ")}`);
  // the determiner-fronted common nouns keep a WORD signature, so they are
  // not beings — and nothing here names "the", it is discovered
  assert.ok(!found.has("mill") && !found.has("market"), `frame-kind members must not be admitted: ${[...found].join(", ")}`);
});

test("the returned shape is extractSurfaces' own, so discoverReferents consumes it unchanged", () => {
  const out = heardSurfaces(heardCorpus(30), { minMentions: 10, minShare: 0.25, minMembers: 2 });
  assert.ok(out.length > 0);
  for (const row of out) {
    assert.deepEqual(Object.keys(row).sort(), ["mentions", "sentences", "surface"]);
    assert.ok(Number.isFinite(row.mentions) && row.mentions > 0);
    assert.ok(Number.isFinite(row.sentences) && row.sentences > 0);
  }
});

test("the POS gate is ASYMMETRIC: a settled non-naming class refuses, an unseen form admits",
  { skip: existsSync(POS_ENG) ? false : `prior absent: ${POS_ENG}` }, async () => {
  const { classifyWord, dominantClass } = await import(N + "wordclass.js");
  const posPrior = JSON.parse(readFileSync(POS_ENG, "utf8"));
  // "aldric" is in no treebank; "the"/"but" are settled function words.
  const corpus = heardCorpus(30);
  const ungated = new Set(heardSurfaces(corpus, { minMentions: 10, minShare: 0.25, minMembers: 2 }).map((s) => s.surface));
  const gated = new Set(heardSurfaces(corpus, { minMentions: 10, minShare: 0.25, minMembers: 2, posPrior, classifyWord, dominantClass }).map((s) => s.surface));
  assert.ok(ungated.has("aldric") && gated.has("aldric"), "a form the prior never saw is ADMITTED — that is how names survive");
  for (const s of gated) assert.ok(ungated.has(s), "the gate only ever removes; it never invents a being");
  assert.ok(NAMING_CLASSES.has("PROPN") && NAMING_CLASSES.has("NOUN") && !NAMING_CLASSES.has("CCONJ"));
});

test("a gate that cannot run must not block: no prior means nothing is refused", () => {
  const corpus = heardCorpus(30);
  const a = heardSurfaces(corpus, { minMentions: 10, minShare: 0.25, minMembers: 2 });
  const b = heardSurfaces(corpus, { minMentions: 10, minShare: 0.25, minMembers: 2, posPrior: null, classifyWord: null, dominantClass: null });
  assert.deepEqual(a, b);
});

test("THE FLAGSHIP, on real bytes: a LOWERCASED novel, where extractSurfaces finds nothing at all",
  { skip: existsSync(BOOK) && existsSync(POS_ENG) ? false : "needs live_priors' Crime and Punishment and pos-eng.json" }, async () => {
  const sp = await import(N + "spans.js");
  const sf = await import(N + "surfaces.js");
  const { classifyWord, dominantClass } = await import(N + "wordclass.js");
  const posPrior = JSON.parse(readFileSync(POS_ENG, "utf8"));
  const raw = readFileSync(BOOK, "utf8").slice(0, 900000);
  const lowered = sp.splitSentences(raw.toLowerCase()).map((s, i) => ({ text: s.text ?? s, order: i }));

  // the control: the READ path, on the same lowercased bytes
  assert.equal(sf.extractSurfaces(lowered).length, 0,
    "S86's measurement, pinned: extractSurfaces finds beings by capitalisation and by nothing else");

  const out = heardSurfaces(lowered, { minMentions: 12, minShare: 0.30, minMembers: 3, posPrior, classifyWord, dominantClass });
  const found = new Set(out.map((s) => s.surface));
  const CAST = ["raskolnikov", "sonia", "razumihin", "marmeladov", "nastasya"];
  const recovered = CAST.filter((c) => found.has(c));
  assert.ok(recovered.length >= 4,
    `real beings must be recovered from bytes with no capitals: got ${recovered.join(", ")} of ${CAST.join(", ")} (all: ${[...found].join(", ")})`);
  // DISCLOSED, NOT HIDDEN: recall is 5 of a 20-name cast and precision is
  // roughly 7 of 12. This raises the floor from zero; it does not replace
  // extractSurfaces, and no assertion here should be read as claiming it does.
  assert.ok(out.length < 40, `the candidate set stays small, not "every frequent word": ${out.length}`);
});
