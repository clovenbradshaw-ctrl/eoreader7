// native/conformance/charter-family.test.mjs — the charter FAMILY and the
// LICENSE seam (THE-MORAL-CORE.md): the core is not one voice but a resolved
// hierarchy, and the charters are the LICENSE the composition runs under —
// GIVEN affordances with the charters as giver — not a filter it passes through.
import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const {
  buildCharterFamily, familyVerdict, familyConflicts, charterAffordances, familyAffordances,
  giveCharterFamily, EARTH_CHARTER, MOTHER_EARTH, isValidCharter, isValidInstrument, configureGfp,
} = await import("../organs/charter.js");
const { createHyperlexicon, giveHyperlexiconAffordance, admitHyperlexiconCandidates, compositionAffordance } =
  await import("../kernel/hyperlexicon.js");

const resolve = (p) => fileURLToPath(new URL(p, import.meta.url));
configureGfp({
  roleConfig: JSON.parse(readFileSync(resolve("../priors/role-config-eng.json"), "utf8")),
  posPrior: JSON.parse(readFileSync(resolve("../priors/pos-en.json"), "utf8")),
});

test("the family is a resolved hierarchy: three instruments, each with a giver, each valid", () => {
  const family = buildCharterFamily();
  assert.equal(family.length, 3);
  assert.deepEqual(family.map((c) => c.rank), [1, 2, 3]);
  for (const c of family) {
    assert.equal(isValidInstrument(c), true, `${c.giver} must carry a giver and real prohibitions/protections`);
    assert.ok(c.giver && c.giver.trim(), "every instrument names its giver");
  }
  // The human-rights charter alone holds the UDHR's own anchor (the guard
  // against a gutted cached charter); the Earth instruments are not refused
  // for lacking a torture clause they were never meant to carry.
  assert.equal(isValidCharter(family[0]), true);
});

test("the family gate names the governing instrument AND article — the reason, never the bare verdict", () => {
  const family = buildCharterFamily();
  const out = familyVerdict(family, "We should torture prisoners.");
  assert.equal(out.verdict, "conflict");
  const c = out.conflicts[0];
  assert.equal(c.kind, "licenses_prohibited");
  assert.ok(c.charter, "the conflict names which charter governs");
  assert.ok(Array.isArray(c.articles) && c.articles.length, "the conflict names the article (the reason)");
});

test("a second voice reaches where the UDHR does not: the Earth instruments fire on ecological harm", () => {
  const family = buildCharterFamily();
  // "Companies"/"pollution" in place of "Factories"/"contamination" — the
  // GFP checking side (2026-09-16) resolves this structurally against a
  // measured POS prior (native/priors/pos-en.json) rather than matching
  // raw text spans, and a modest 18k-form web-text corpus prior simply
  // never attests "factories" or "contamination" at all. Same intent
  // (a licensing clause naming an Earth-instrument-prohibited act),
  // resolvable wording.
  const out = familyVerdict(family, "Companies should be free to cause pollution.");
  assert.equal(out.verdict, "conflict");
  assert.ok(out.conflicts.some((c) => c.charter === MOTHER_EARTH.giver || c.charter === EARTH_CHARTER.giver));
});

test("descriptive voice is never governed, in the family as in the single charter", () => {
  const family = buildCharterFamily();
  const out = familyVerdict(family, "In 1994 the regime tortured prisoners.");
  assert.equal(out.verdict, "no_signal");
  assert.equal(out.conflicts.length, 0);
});

test("reinforcement does not fire: forbidding an act reinforces the charter", () => {
  const family = buildCharterFamily();
  const out = familyVerdict(family, "No one shall be subjected to torture.");
  assert.equal(out.conflicts.length, 0);
});

test("charterAffordances gives prohibit/protect rows, each with the charter as giver", () => {
  const rows = charterAffordances(MOTHER_EARTH);
  assert.ok(rows.length >= 2);
  assert.ok(rows.some((r) => r.left === "prohibit" && r.right.includes("contamination")));
  assert.ok(rows.some((r) => r.left === "protect" && r.right.includes("life")));
  for (const r of rows) assert.ok(r.giver.includes(MOTHER_EARTH.giver), "the giver rides every given row");
});

test("THE LICENSE: the family's affordances are GIVEN, and experience cannot override them", () => {
  const family = buildCharterFamily();
  const hl = giveCharterFamily(createHyperlexicon(), family, giveHyperlexiconAffordance);
  const row = familyAffordances(family)[0];
  const given = compositionAffordance(hl, row.left, row.right);
  assert.equal(given.standing, "given");
  assert.ok(given.giver.includes(row.giver));
  // A later observed candidate on the SAME key cannot displace the given row.
  const after = admitHyperlexiconCandidates(hl, [{ left: row.left, right: row.right, giver: "observed corpus", witnesses: ["x"] }]);
  assert.equal(compositionAffordance(after, row.left, row.right).standing, "given");
});

test("the family is a union across instruments, each conflict carrying its own rank", () => {
  const family = buildCharterFamily();
  const cs = familyConflicts(family, "Governments should deny everyone the right to life.");
  assert.ok(cs.length >= 1);
  for (const c of cs) assert.ok(typeof c.rank === "number", "entrenchment rank rides every conflict");
});

// Found adversarially (2026-09-16): a prohibited act's own distinctive word
// can appear beside a modal verb without the clause ever licensing the act —
// naming WHO suffered it ("torture victims must have access to care") or
// applying the act's name as a metaphor/reported label ("critics have called
// this a form of modern servitude"). Both must pass, the same "errs toward
// NOT firing" bias the remedy frame already holds; and the fix must not open
// an evasion hole for a real endorsement standing alone.
test("the victim/survivor frame does not fire: naming who suffered the act is not licensing it", () => {
  const family = buildCharterFamily();
  assert.equal(familyVerdict(family, "Torture victims must have access to trauma-informed care.").verdict, "pass");
  assert.equal(familyVerdict(family, "We should always listen to slavery survivors.").verdict, "pass");
});

test("the comparison frame does not fire: a metaphor or reported label is not licensing the act", () => {
  const family = buildCharterFamily();
  assert.equal(familyVerdict(family, "Some argue that unpaid internships can feel like servitude, but employees can always quit.").verdict, "pass");
  assert.equal(familyVerdict(family, "Employers can require overtime, which critics have called a form of modern servitude.").verdict, "pass");
});

test("the victim/comparison frames do not open an evasion hole for a real endorsement", () => {
  const family = buildCharterFamily();
  const out = familyVerdict(family, "Officials should be allowed to torture prisoners for information.");
  assert.equal(out.verdict, "conflict");
  assert.ok(out.conflicts.some((c) => c.kind === "licenses_prohibited"));
});
