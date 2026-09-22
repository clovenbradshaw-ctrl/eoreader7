// arrange-falsify.test.mjs — the first-pass outline is COMPOSED from the
// sources, not copied from them. The Cumberland fixture is already shaped like
// an essay, so it cannot falsify arrangement (on it the outline is the
// material's order, and should be). These tests use grounds whose order is
// wrong for an essay, whose sources overlap, and whose figures disagree.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { arrangeEssay, extentOf } from "./arrange.js";

const TASK = "Write an essay on the role of the Harlow River in Brenton's growth.";
function outline(ground, task = TASK) {
  const d = attachReferents(buildDraft({ task, ground }), buildReferents(ground));
  return { o: arrangeEssay({ draft: d }), d };
}
const bodyOf = (o, id) => o.slots.findIndex((s) => s.statements.includes(id));

// Source A opens on the dams (1950s) and only then goes back to the founding
// (1790s); source B, a second document, is about one dam A also treats.
const MESSY = [
  "The Harlow River shaped where Brenton grew and how it grew.",
  "",
  "Marlow Dam was finished on the Harlow River in 1952. Marlow Dam ended the spring floods at Brenton. Marlow Dam still regulates the river today.",
  "",
  "Brenton was founded in 1791 by Edith Crane at a ford on the Harlow River. Edith Crane chose the ford because the Harlow River was the only road. Brenton grew around the ford.",
  "",
  "Marlow Dam cost four million dollars and took six years to build. Engineers designed Marlow Dam after the flood of 1946 drowned the low town of Brenton.",
].join("\n");

test("extent: years, decades and the present are the Ground of a statement", () => {
  assert.deepEqual(extentOf("By the 1850s it was a port."), [1855]);
  assert.deepEqual(extentOf("In 1791 and 1792."), [1791, 1792]);
  assert.equal(extentOf("Today the port is busy.").length, 1);
});

test("a later paragraph that goes back before an earlier one is moved ahead of it", () => {
  const { o, d } = outline(MESSY);
  const ids = d.root.children.flatMap((p) => p.children.map((c) => [c.id, c.text]));
  const founding = ids.find(([, t]) => t.includes("1791"))[0];
  const dam = ids.find(([, t]) => t.includes("1952"))[0];
  assert.ok(bodyOf(o, founding) < bodyOf(o, dam), "the 1791 founding must come before the 1952 dam");
  assert.ok(!o.findings.some((f) => f.kind === "inversion"), "the repaired order leaves no inversion");
});

test("two paragraphs ABOUT the same being are one body group, across the material", () => {
  const { o, d } = outline(MESSY);
  const ids = d.root.children.flatMap((p) => p.children.map((c) => [c.id, c.text]));
  const a = ids.find(([, t]) => t.includes("1952"))[0];
  const b = ids.find(([, t]) => t.includes("four million"))[0];
  assert.equal(bodyOf(o, a), bodyOf(o, b), "both paragraphs are about Marlow Dam");
});

test("a being named once in passing does not join two paragraphs", () => {
  const ground = [
    "The Harlow River shaped where Brenton grew and how it grew.",
    "",
    "Brenton was founded in 1791 by Edith Crane at a ford on the Harlow River. Edith Crane chose the ford because the Harlow River was the only road. The ford later took the name Crane Ford.",
    "",
    "Steamboats reached Brenton up the Harlow River in 1830. Steamboats carried grain to Port Ellis. Steamboats also stopped at Crane Ford for wood.",
  ].join("\n");
  const { o, d } = outline(ground);
  const ids = d.root.children.flatMap((p) => p.children.map((c) => [c.id, c.text]));
  const a = ids.find(([, t]) => t.includes("1791"))[0];
  const b = ids.find(([, t]) => t.includes("1830"))[0];
  assert.notEqual(bodyOf(o, a), bodyOf(o, b), "Crane Ford is what neither paragraph is about");
});

test("the thesis is the general statement the whole material recurs to, not a dated fact", () => {
  const { o } = outline(MESSY);
  assert.match(o.thesis.text, /shaped where Brenton grew/);
  assert.equal(o.slots[0].slot, "thesis");
  assert.equal(o.slots.at(-1).slot, "return");
});

test("a turn is taken from the material, never invented", () => {
  const { o } = outline(MESSY);
  assert.ok(o.findings.some((f) => f.kind === "no_tension"), "no contrastive turn in the material: the gap is declared");
  const turned = MESSY + "\n\nBut the dam also drowned the old mill villages above Brenton in 1952.";
  const { o: o2 } = outline(turned);
  assert.ok(o2.slots.some((s) => s.slot === "tension"), "a paragraph opening on 'But' is the tension");
  assert.ok(!o2.findings.some((f) => f.kind === "no_tension"));
});

test("without a resolver or parse the outline still stands and says what it lost", () => {
  const d = buildDraft({ task: TASK, ground: MESSY });
  const o = arrangeEssay({ draft: d });
  assert.ok(o.slots.length >= 3);
  assert.ok(o.weakened.some((w) => /referent/.test(w)));
  assert.ok(o.weakened.some((w) => /parse/.test(w)));
});

test("one fact stated by two sources is said once, from the richer (OHS agenda and minutes)", () => {
  const ground = [
    "The committee reviews the city's audits.",
    "",
    "The Audit Committee met on September 23, 2025, at 4:00 p.m. in Committee Room 1 at the Metropolitan Courthouse. The agenda listed the follow-up audit.",
    "",
    "On Tuesday, September 23, 2025, at 4:00 p.m., the Audit Committee met in the Metropolitan Courthouse, 2nd Floor, Committee Room 1. The committee voted to add an audit.",
    "",
    "The flood of 1927 covered the low town. The flood of 2010 crested at 51.86 feet.",
  ].join("\n");
  const d = attachReferents(buildDraft({ task: "Write an essay on the committee.", ground }), buildReferents(ground));
  const o = arrangeEssay({ draft: d });
  const dup = o.findings.filter((f) => f.kind === "duplicate_across_sources");
  assert.equal(dup.length, 1);
  const said = o.slots.flatMap((s) => s.statements);
  assert.ok(said.includes("p3.1") && !said.includes("p2.1"), "the richer minutes sentence stands");
  assert.ok(said.includes("p4.1") && said.includes("p4.2"), "two floods are two facts");
});
