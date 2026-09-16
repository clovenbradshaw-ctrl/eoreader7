// native/conformance/charter-family.test.mjs — the charter FAMILY and the
// LICENSE seam (THE-MORAL-CORE.md): the core is not one voice but a resolved
// hierarchy, and the charters are the LICENSE the composition runs under —
// GIVEN affordances with the charters as giver — not a filter it passes through.
import { test } from "node:test";
import assert from "node:assert";

const {
  buildCharterFamily, familyVerdict, familyConflicts, charterAffordances, familyAffordances,
  giveCharterFamily, EARTH_CHARTER, MOTHER_EARTH, isValidCharter, isValidInstrument,
} = await import("../organs/charter.js");
const { createHyperlexicon, giveHyperlexiconAffordance, admitHyperlexiconCandidates, compositionAffordance } =
  await import("../kernel/hyperlexicon.js");

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
  const out = familyVerdict(family, "Factories should be free to cause contamination and pollution.");
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
