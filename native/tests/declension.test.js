// native/tests/declension.test.js — createDeclensionFolder against the REAL
// UniMorph-derived Russian prior (native/priors/declension-rus.json), plus
// its wiring into namesCorefer/discoverReferents (surfaces.js).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createDeclensionFolder } from "../adapters/text/declension.js";
import { namesCorefer, extractSurfaces, discoverReferents } from "../adapters/text/surfaces.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const prior = JSON.parse(readFileSync(path.resolve(here, "../priors/declension-rus.json"), "utf8"));
const { sameStem } = createDeclensionFolder(prior);

const corpus = (lines) => lines.map((text, i) => ({ text, order: i }));
const refIdOf = (events, surface) => events.find((e) => e.type === "DEF.admit" && e.surface === surface)?.referent_id;

test("the prior loaded is what its own provenance claims: real UniMorph rows, a named giver, a declared floor", () => {
  assert.equal(prior.schema, "DeclensionPrior@1");
  assert.equal(prior.language, "rus");
  assert.match(prior.provenance.giver, /unimorph\/rus/);
  assert.equal(prior.provenance.min_count, 100);
  assert.ok(prior.rules.length > 0);
  assert.ok(prior.provenance.noun_pairs_read > 100000, "mined from the real, full paradigm table, not a fixture");
});

test("Kutuzov's own genitive/dative/instrumental fold to his nominative — the flagship case this organ exists for", () => {
  // \"кутузов\" itself never appears anywhere in UniMorph's Russian data
  // (checked directly while building the prior) — every one of these
  // passes only because the RULE generalises, never because the name was
  // looked up.
  assert.ok(sameStem("кутузова", "кутузов"), "genitive/accusative -> nominative");
  assert.ok(sameStem("кутузову", "кутузов"), "dative -> nominative");
});

test("Anna's own case forms fold to her nominative — a feminine -а noun, a different declension class than Kutuzov's", () => {
  assert.ok(sameStem("анне", "анна"), "dative/prepositional -> nominative");
  assert.ok(sameStem("анны", "анна"), "genitive -> nominative");
  assert.ok(sameStem("анну", "анна") || sameStem("анна", "анну"), "accusative relates to nominative in some direction the rule table licenses");
});

test("two genuinely unrelated names never fold, with or without a shared trailing letter", () => {
  assert.ok(!sameStem("наполеон", "борис"));
  assert.ok(!sameStem("борис", "наполеон"));
  // \"наполеона\" (Napoleon's genitive) must not spuriously reach an
  // unrelated short name that happens to share its own trailing letters.
  assert.ok(!sameStem("наполеона", "бог"));
});

test("a rule never fires across too short a residual stem", () => {
  // \"кутузов\" (the residual stem \"кутузова\" leaves after the \"а\"->\"\"
  // rule strips its ending) is 7 letters — raising the floor above that
  // length must refuse exactly the pair the default floor (2) accepts.
  assert.ok(sameStem("кутузова", "кутузов"), "sanity: the default floor accepts this pair");
  const strict = createDeclensionFolder(prior, { minStem: 8 });
  assert.ok(!strict.sameStem("кутузова", "кутузов"), "an 8-letter floor refuses a 7-letter residual stem");
});

test("no prior degrades LOUDLY to exact-match-only — the gap is typed, nothing silently changes behaviour", () => {
  const none = createDeclensionFolder(null);
  assert.equal(none.gap?.reason, "no_declension_prior");
  assert.ok(!none.sameStem("кутузова", "кутузов"));
});

test("namesCorefer: omitting sameStem is byte-identical to the pre-existing behaviour — Kutuzov's own case forms do NOT corefer without it", () => {
  assert.ok(!namesCorefer("Кутузов", "Кутузова"), "no organ injected, no fold: exact-token comparison only, exactly as before this file existed");
});

test("namesCorefer: injecting sameStem folds Kutuzov's and Anna's own case forms into one identity, and leaves unrelated names apart", () => {
  assert.ok(namesCorefer("Кутузов", "Кутузова", { sameStem }));
  assert.ok(namesCorefer("Кутузову", "Кутузов", { sameStem }), "the fold works in either argument order");
  assert.ok(namesCorefer("Анна", "Анне", { sameStem }));
  assert.ok(!namesCorefer("Кутузов", "Наполеон", { sameStem }), "an unrelated real name is never folded just because the organ is present");
});

test("discoverReferents: real Cyrillic prose — Kutuzov's bare surname and its two declined forms merge into one referent only when sameStem is injected", () => {
  const lines = [
    "Позади всех стоял Кутузов и молча слушал доклад.",
    "Адъютант передал письмо Кутузову рано утром.",
    "Все распоряжения исходили от имени Кутузова в этот день.",
  ];
  const found = extractSurfaces(corpus(lines), {});
  const names = new Set(found.map((s) => s.surface));
  assert.ok(names.has("Кутузов") && names.has("Кутузову") && names.has("Кутузова"), "all three case forms extract as candidate surfaces");

  const withoutFold = discoverReferents(found, { minPartners: 0, minSentences: 0 });
  const bareNom = refIdOf(withoutFold.events, "Кутузов");
  const bareDat = refIdOf(withoutFold.events, "Кутузову");
  const bareGen = refIdOf(withoutFold.events, "Кутузова");
  assert.ok(bareNom && bareDat && bareGen, "all three admit as referents on their own");
  assert.ok(
    bareNom !== bareDat || bareNom !== bareGen,
    "without the fold, at least one declined form stays a stranded, separate referent from the nominative — the fragmentation this organ closes",
  );

  const withFold = discoverReferents(found, { minPartners: 0, minSentences: 0, sameStem });
  const foldedNom = refIdOf(withFold.events, "Кутузов");
  const foldedDat = refIdOf(withFold.events, "Кутузову");
  const foldedGen = refIdOf(withFold.events, "Кутузова");
  assert.ok(foldedNom && foldedDat && foldedGen);
  assert.equal(foldedNom, foldedDat, "dative case form now merges with the nominative");
  assert.equal(foldedNom, foldedGen, "genitive case form now merges with the nominative");
});
