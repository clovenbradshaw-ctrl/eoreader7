// arrange-falsify.test.mjs — the first-pass outline is COMPOSED from the
// sources, not copied from them. The Cumberland fixture is already shaped like
// an essay, so it cannot falsify arrangement (on it the outline is the
// material's order, and should be). These tests use grounds whose order is
// wrong for an essay, whose sources overlap, and whose figures disagree.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, drawnParts } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { loadEotParser, attachEot } from "./eot-notation.js";
import { arrangeEssay, arrangedDraft, extentOf } from "./arrange.js";

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
  // 2026-09-25: the fallback path, asserted rather than assumed — this fixture
  // carries no parse trees, so no basin can form: the thesis is the one
  // winner and the additive fields sit at their fallback values.
  assert.equal(o.thesis.claim, null);
  assert.deepEqual(o.thesis.ids, [o.thesis.id]);
});

// SEVERAL CANDIDATES, ONE CLAIM (thesis-claim.js, 2026-09-25). Built and
// verified against the real parser and the real kernel null, never
// hand-predicted: four sentences share the root "shape"; eight boundary
// sentences have distinct roots; every sentence holds "river", so the ask
// chooses nothing and every part is drawn. The boundary is not decoration —
// a basin of the WHOLE population can never clear its own null (every random
// same-size subset is the population itself). Measured on this fixture: the
// basin cleared at p=0.020 against a threshold of 0.042.
const SHAPED = [
  "The river shaped the town.", "", "The river shaped the port.", "", "The river shaped the valley.", "", "The river shaped the harbor.", "",
  "The ferry carried grain across the river.", "", "The mill ground wheat beside the river.", "", "The road followed the river.", "",
  "The market sold fish from the river.", "", "The bridge crossed the river.", "", "The barge hauled coal down the river.", "",
  "The fog hid the river.", "", "The flood covered the river.",
].join("\n");

async function parsedOutline(ground, task = "Write an essay on the river.") {
  const parser = await loadEotParser();
  if (!parser.ok) return null;
  const d = attachReferents(buildDraft({ task, ground }), buildReferents(ground));
  attachEot(drawnParts(d).flatMap((p) => p.children), parser.parse(ground, "ground"));
  return { o: arrangeEssay({ draft: d }), d };
}
const pointWith = (d, re) => drawnParts(d).flatMap((p) => p.children).find((pt) => re.test(pt.text)).id;

test("SYNTHESIS: four candidates that are the same claim yield one generalized claim beside the winner's sentence; no source that fed it reappears as a body paragraph", async (t) => {
  const r = await parsedOutline(SHAPED);
  if (!r) return t.skip("no parser model");
  const { o, d } = r;
  assert.equal(o.thesis.id, "p1.1", "`id` is still the single winner, whether or not synthesis fires");
  assert.equal(o.thesis.text, "The river shaped the town.", "the thesis's TEXT is always the winner's own sentence — a lemma-join reaches no mouth (the reading archons)");
  assert.equal(o.thesis.rendered, "river shape town, port, valley, and harbor", "the claim's mechanical surface travels beside it");
  assert.deepEqual(o.thesis.ids, ["p1.1", "p2.1", "p3.1", "p4.1"], "the winner first, then the members");
  assert.equal(o.thesis.claim.rel, "shape");
  assert.equal(o.thesis.claim.polarity, "+");
  assert.equal(o.thesis.claim.agreed.ARG0, "river", "the role every claim agrees on is kept");
  assert.deepEqual(o.thesis.claim.varying.ARG1, ["town", "port", "valley", "harbor"], "the role they differ on keeps every value, disclosed");
  assert.equal(o.slots[0].claim, o.thesis.claim);
  assert.match(o.slots[0].basis, /cleared a null-validated basin \(p=0\.\d+, floor 1\/\d+ at \d+ permutations; binding energy/);
  assert.match(o.slots[0].basis, /held out of the body groups/);
  const bodyIds = o.slots.slice(1, -1).flatMap((s) => s.statements);
  assert.deepEqual(o.thesis.ids.filter((id) => bodyIds.includes(id)), [], "no statement that fed the thesis is also its own body paragraph");
  const a0 = arrangedDraft(d, o).root.children[0];
  assert.equal(a0.claim, o.thesis.claim);
  assert.equal(a0.rendered, o.thesis.rendered);
  assert.equal(a0.spans.length, 4, "every contributing statement's real span is kept");
  assert.ok(a0.text.startsWith("The river shaped the town."), "the part's text is its statements' own sentences, byte-true to its spans");
  assert.equal(a0.synthesized, undefined, "no part's text is ever a rendering");
});

// FALSIFIERS pinned from the reading archons' own probes (2026-09-25), each
// reproduced on the real parser and the real kernel null before it was fixed.
test("FALSIFIER (Kelsen, Kidder & Todd, Gornick, Williams, Caro, Gebser): a member that DENIES the relation is never a witness of the affirmed thesis", async (t) => {
  const r = await parsedOutline(SHAPED.replace("The river shaped the harbor.", "The river never shaped the harbor."));
  if (!r) return t.skip("no parser model");
  const { o, d } = r;
  const denial = pointWith(d, /never/);
  assert.ok(o.thesis.claim, "the three affirmations still generalize");
  assert.equal(o.thesis.claim.polarity, "+");
  assert.deepEqual(o.thesis.claim.varying.ARG1, ["town", "port", "valley"], "the denied object is not among the affirmed ones");
  assert.ok(!o.thesis.ids.includes(denial), "the denial is not among the thesis's witnesses");
  assert.ok(o.slots.slice(1, -1).some((s) => s.statements.includes(denial)), "it stays in the body, where it can be the tension");
});

test("FALSIFIER (Williams; Caro, McPhee, Kidder & Todd, Kelsen concur): claims that agree on no role are a relation's frequency, not a thesis — refused, disclosed, the winner stands", async (t) => {
  const r = await parsedOutline(SHAPED.replace("The river shaped the port.", "The sea shaped the port.").replace("The river shaped the valley.", "The wind shaped the valley.").replace("The river shaped the harbor.", "The tide shaped the harbor."));
  if (!r) return t.skip("no parser model");
  const { o } = r;
  assert.equal(o.thesis.claim, null);
  assert.equal(o.thesis.rendered, null);
  assert.deepEqual(o.thesis.ids, [o.thesis.id]);
  assert.equal(o.thesis.text, "The river shaped the town.");
  assert.match(o.slots[0].basis, /a basin cleared its null .* but nothing was generalized: 4 claims share the relation "shape" but agree on no role/);
});

test("TWO TIERS (Clark): a body group bearing only on a VARYING value is reported, never licensed to leave", async (t) => {
  const r = await parsedOutline(SHAPED + "\n\nThe town held a fair each autumn by the river.\n\nThe harbor froze every winter. Ships waited in the harbor until spring.");
  if (!r) return t.skip("no parser model");
  const { o, d } = r;
  assert.equal(o.thesis.id, "p1.1");
  assert.ok(o.thesis.claim, "the basin still fires with two more paragraphs");
  const frozen = pointWith(d, /froze/);
  const f = o.findings.find((x) => x.kind === "off_thesis" && x.statements.includes(frozen));
  assert.ok(f, "the harbor group shares nothing with the winner's sentence or the agreed roles");
  assert.equal(f.licenses, null, "'harbor' is a varying value — the low bar reports, the high bar does not license");
  assert.match(f.detail, /varying/);
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
