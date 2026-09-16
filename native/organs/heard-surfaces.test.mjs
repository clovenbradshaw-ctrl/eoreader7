// heard-surfaces.test.mjs — the heard rule, enforced rather than asserted.
//
// The flagship is the one that matters: `extractSurfaces` finds ZERO beings
// in a lowercased novel (S86), and this module finds real ones in the same
// bytes. If that ever stops being true, this suite fails.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { heardSurfaces, isPositionallySigned, POSITIONAL_SIGNATURE, NAMING_CLASSES, peelProclitics } from "./heard-surfaces.js";

const N = "../adapters/text/";
const BOOK = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gitenberg/pg2554_Crime-and-Punishment.txt";
const POS_ENG = fileURLToPath(new URL("../priors/pos-eng.json", import.meta.url));
const POS_HEB = fileURLToPath(new URL("../priors/pos-heb.json", import.meta.url));
const POS_ARB = fileURLToPath(new URL("../priors/pos-arb.json", import.meta.url));
const PROCLITICS_HEB = fileURLToPath(new URL("../priors/proclitics-heb.json", import.meta.url));
const HEB_WIKI_ARTICLE = "/Users/mlacy/Documents/3.0/live_priors/11-multi-language/wikipedia-lang/he/_________.txt";

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

// ── PROCLITIC PEELING ───────────────────────────────────────────────────────
// Hebrew and Arabic glue a determiner/conjunction/preposition directly onto
// the following word with no space — this hides both ends of the company
// signal (a common noun's own determiner is invisible; a name's occurrences
// fragment across every proclitic it happens to appear with). Measured live
// on real Wikipedia material before this was built: real false positives (a
// common noun fused to its own article, reading as a "being") and real
// missed beings (a real name that never once reaches minMentions under its
// bare spelling, because every mention was glued to a different proclitic).

test("peelProclitics: only commits when the remainder is independently attested", () => {
  const posPrior = { forms: { "ילד": { NOUN: 5 }, "בית": { NOUN: 9 } } };
  const proclitics = new Set(["ה", "ו", "ב", "ל"]);
  // ה + ילד ("the" + "child") — the bare stem IS attested, so the peel commits.
  assert.deepEqual(peelProclitics("הילד", proclitics, posPrior), { proclitics: ["ה"], stem: "ילד" });
  // ו + ה + בית ("and" + "the" + "house") — stacked proclitics, two peels deep.
  assert.deepEqual(peelProclitics("והבית", proclitics, posPrior), { proclitics: ["ו", "ה"], stem: "בית" });
  // a word that happens to start with a proclitic LETTER but never bottoms
  // out at anything the prior has seen — left completely untouched, never a
  // guessed split (the structural safety this mechanism depends on).
  assert.equal(peelProclitics("הוא", proclitics, posPrior), null, "'he' must not be mangled into ה + וא");
  // no proclitics declared, or no prior to validate against: never peels —
  // matches every other injected-capability's degrade-to-absent behaviour.
  assert.equal(peelProclitics("הילד", null, posPrior), null);
  assert.equal(peelProclitics("הילד", proclitics, null), null);
});

test("heardSurfaces + proclitics: a fused determiner no longer hides a common noun's own company", () => {
  // "the house" (ha-bayit) recurs mostly SENTENCE-INITIAL, with every other
  // preceding word appearing only once — so, fused and unpeeled, it reads
  // exactly like a name (dominant before=^). Fabricated, minimal,
  // deterministic — not copied from any source; ordinary dictionary words.
  const posPrior = { forms: { "בית": { NOUN: 20 } } };
  const proclitics = new Set(["ה", "ו", "ב", "ל"]);
  const corpus = [
    "הבית היה גדול.", "הבית היה שקט.",
    "ראיתי את הבית.", "ליד הבית עמד עץ.",
  ].map((text, order) => ({ text, order }));

  const before = heardSurfaces(corpus, { minMentions: 2, minShare: 0.3, minMembers: 1 });
  const foundBefore = new Set(before.map((s) => s.surface));
  assert.ok(foundBefore.has("הבית"), `without the peel, the fused common noun reads as a positionally-signed candidate: ${[...foundBefore]}`);

  const after = heardSurfaces(corpus, { minMentions: 2, minShare: 0.3, minMembers: 1, proclitics, posPrior });
  const foundAfter = new Set(after.map((s) => s.surface));
  assert.ok(!foundAfter.has("הבית"), `the peel must resolve the fused noun into ה + בית, not keep it as one candidate: ${[...foundAfter]}`);
});

test("heardSurfaces + proclitics: byte-identical to omitting it when nothing in the material is fused", () => {
  const posPrior = JSON.parse(readFileSync(POS_ENG, "utf8"));
  const { classifyWord, dominantClass } = { classifyWord: null, dominantClass: null };
  const corpus = heardCorpus(30);
  const a = heardSurfaces(corpus, { minMentions: 10, minShare: 0.25, minMembers: 2 });
  const b = heardSurfaces(corpus, { minMentions: 10, minShare: 0.25, minMembers: 2, proclitics: ["x", "y"], posPrior });
  assert.deepEqual(a, b, "English has nothing for a Hebrew/Arabic-shaped proclitic set to match, so nothing peels");
});

test("real Hebrew Wikipedia article: the peel removes real false positives, disclosed as partial",
  { skip: existsSync(HEB_WIKI_ARTICLE) && existsSync(POS_HEB) && existsSync(PROCLITICS_HEB) ? false : "needs live_priors' Hebrew article and the Hebrew priors" }, async () => {
  const sp = await import(N + "spans.js");
  const { classifyWord, dominantClass } = await import(N + "wordclass.js");
  const posPrior = JSON.parse(readFileSync(POS_HEB, "utf8"));
  const procliticPrior = JSON.parse(readFileSync(PROCLITICS_HEB, "utf8"));
  const text = readFileSync(HEB_WIKI_ARTICLE, "utf8");
  const sentences = sp.splitSentences(text);

  const before = heardSurfaces(sentences, { minMentions: 2, minShare: 0.3, minMembers: 2, posPrior, classifyWord, dominantClass });
  const after = heardSurfaces(sentences, { minMentions: 2, minShare: 0.3, minMembers: 2, posPrior, classifyWord, dominantClass, proclitics: procliticPrior.proclitics });

  // The real, measured effect (2026-09-15): 18 candidates before, 10 after —
  // the peel removes real fused-article noise. DISCLOSED, NOT HIDDEN: it does
  // NOT remove every false positive ("הפילוסופיות" survives, because its bare
  // stem is not independently attested in this treebank's own vocabulary —
  // a coverage limit of the received prior, not a bug in the peel's logic),
  // and this assertion must not be read as claiming the referent-discovery
  // problem for Hebrew is solved.
  assert.ok(after.length < before.length, `the peel must remove at least one false positive: before=${before.length} after=${after.length}`);
  const foundBefore = new Set(before.map((s) => s.surface));
  const foundAfter = new Set(after.map((s) => s.surface));
  assert.ok(foundBefore.has("סוקרטס") && foundAfter.has("סוקרטס"), "a real recovered name must survive the peel unharmed");
  for (const s of foundAfter) assert.ok(foundBefore.has(s), "the peel only ever removes or merges; it never invents a new candidate");
});
