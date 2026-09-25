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
  assert.deepEqual(o.thesis.ids, ["p1.1", "p2.1", "p3.1", "p4.1"], "the members, in the material's order");
  assert.equal(o.thesis.claim.rel, "shape");
  assert.equal(o.thesis.claim.polarity, "+");
  assert.equal(o.thesis.claim.agreed.ARG0, "river", "the role every claim agrees on is kept");
  assert.deepEqual(o.thesis.claim.varying.ARG1, ["town", "port", "valley", "harbor"], "the role they differ on keeps every value, disclosed");
  assert.equal(o.slots[0].claim, o.thesis.claim);
  assert.equal(o.slots[0].winner, "p1.1");
  assert.match(o.slots[0].basis, /a basin of 4 cleared its null \(p=0\.\d+ — at the floor 1\/\d+: no draw of \d+ reached the observed energy; binding energy/, "the null is said plainly, floor included");
  assert.match(o.slots[0].basis, /4 of them share the winner's relation "shape" \(\+, obj\) and were generalized: ARG0 agreed, ARG1 varying/);
  assert.match(o.slots[0].basis, /tied with 3 other\(s\); first by position/, "a four-way tie at 0.47 is said");
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

// FALSIFIERS pinned from the reading archons' own probes (2026-09-25, two
// readings), each reproduced on the real parser and the real kernel null
// before it was fixed. The negation is a 13th statement beside the four
// affirmations: the null is measured over relation+polarity+via, so the
// four clear on their own warrant and the denial can never supply it
// (Gornick: with the relation alone, three affirmed did not clear and the
// "never" sentence made the basin — load-bearing for the basin that
// excluded it).
// The selection is untouched and out of scope, and it shows: the 13th
// sentence's words move recurrence, so the affirmation sharing its object
// wins ("harbor" now in two parts → p4.1), and the three-word "Nothing
// shaped the river." wins outright — a denial as the thesis sentence, which
// the record then says plainly: its own group is one '-' claim, refused, and
// the four affirmations are named as excluded (Gornick's inverted fixture).
const AFFIRMED = ["p1.1", "p2.1", "p3.1", "p4.1"];
for (const [shape, sentence] of [
  ["never (advmod, PronType=Neg)", "The river never shaped the harbor."],
  ["not (advmod, Polarity=Neg)", "The river did not shape the harbor."],
  ["no (det marker on the object, PronType=Neg)", "The river shaped no harbor."],
  ["nothing (the object node, PronType=Neg)", "The river shaped nothing."],
  ["neither/nor (cc markers, Polarity=Neg)", "The river shaped neither the harbor nor the port."],
]) {
  test(`FALSIFIER: a negation the parser declares as ${shape} is never a witness of the affirmed thesis, and the material's own denial is the turn`, async (t) => {
    const r = await parsedOutline(`${SHAPED}\n\n${sentence}`);
    if (!r) return t.skip("no parser model");
    const { o, d } = r;
    const neg = pointWith(d, /never|did not|no harbor|nothing|neither/i);
    assert.ok(AFFIRMED.includes(o.thesis.id), `an affirmation wins (${o.thesis.id})`);
    assert.ok(o.thesis.claim, "the four affirmations generalize on their own warrant");
    assert.equal(o.thesis.claim.polarity, "+");
    assert.deepEqual(o.thesis.ids, AFFIRMED, "the denial is not among the witnesses; the material's order is kept");
    assert.ok(!o.thesis.ids.includes(neg));
    assert.deepEqual(o.thesis.claim.varying.ARG1, ["town", "port", "valley", "harbor"]);
    assert.match(o.slots[0].basis, /a basin of 4 cleared its null/, "the count that cleared is the basin's, measured without the denial");
    assert.ok(o.slots.slice(1, -1).some((s) => s.statements.includes(neg)), "it stays in the body");
    const denied = o.findings.find((f) => f.kind === "denied_relation");
    assert.ok(denied && denied.statements.includes(neg), "Kelsen names the statement that denies the thesis's relation on its subject");
    assert.ok(!o.findings.some((f) => f.kind === "no_tension"), "the material marks a turn: its own denial");
    const tension = o.slots.find((s) => s.slot === "tension");
    assert.ok(tension && tension.statements.includes(neg), "the denial is the tension");
    assert.match(tension.basis, /contradicts the thesis's relation/);
  });
}

// FALSIFIERS from the third reading (2026-09-25): denies() matched on the
// bare relation label and a hard-coded '-' polarity, so a via/particle
// mismatch or a thesis that is itself denied made the WRONG statement the
// turn (Caro, Clark, Kidder & Todd, independently, reproduced by Gebser).
test("FALSIFIER (Kidder & Todd): a via mismatch is never mistaken for a denial — 'flowed past' does not contradict a thesis generalized to 'flow:through'", async (t) => {
  const ground = [
    "The river flowed through the town.", "", "The river flowed through the port.", "", "The river flowed through the valley.", "", "The river flowed through the harbor.", "",
    "The river never flowed past the mill.", "",
    "The ferry carried grain across the river.", "", "The mill ground wheat beside the river.", "", "The road followed the river.", "",
    "The market sold fish from the river.", "", "The bridge crossed the river.", "", "The barge hauled coal down the river.", "",
    "The fog hid the river.", "", "The flood covered the river.",
  ].join("\n");
  const r = await parsedOutline(ground);
  if (!r) return t.skip("no parser model");
  const { o, d } = r;
  assert.equal(o.thesis.claim.rel, "flow:through");
  const past = pointWith(d, /past the mill/);
  assert.ok(!o.findings.some((f) => f.kind === "denied_relation" && f.statements.includes(past)), "'flowed past' denies nothing the thesis (flow:through) claims");
  assert.ok(!o.slots.find((s) => s.slot === "tension")?.statements.includes(past), "it is not taken as the turn");
});

test("FALSIFIER (Caro): the tension check is bidirectional — an affirmation contradicts a DENIED thesis just as a denial contradicts an affirmed one", async (t) => {
  // A plain affirmation among the candidates would win selection outright
  // (a denial's extra word dilutes its own recurrence — Gornick's earlier
  // finding); giving it a year excludes it from the candidate pool
  // (hasFigure) without excluding its relation note, so the four denials
  // compete only among themselves and win as a group, as the archon's own
  // probe measured.
  const denied = SHAPED.split("\n").map((line) => (/^The river shaped/.test(line) ? line.replace("shaped", "never shaped") : line)).join("\n");
  const ground = `${denied}\n\nThe river shaped the mill in 1907.`;
  const r = await parsedOutline(ground);
  if (!r) return t.skip("no parser model");
  const { o, d } = r;
  assert.equal(o.thesis.claim.polarity, "-", "the four denials generalize as a denial");
  const affirmed = pointWith(d, /shaped the mill/);
  const denial = o.findings.find((f) => f.kind === "denied_relation");
  assert.ok(denial && denial.statements.includes(affirmed), "an affirmation is named as contradicting a denied thesis");
  const tension = o.slots.find((s) => s.slot === "tension");
  assert.ok(tension && tension.statements.includes(affirmed), "the contradicting affirmation is the turn");
});

test("FALSIFIER (Clark): when the agreed role is the OBJECT (subject varies), the anchor is the object, never the bare verb lemma alone", async (t) => {
  const ground = [
    "The river shaped the town.", "", "The sea shaped the town.", "", "The wind shaped the town.", "", "The tide shaped the town.", "",
    "The potter never shaped the clay.", "", "The clay came from the river bank.", "",
    "The ferry carried grain across the river.", "", "The mill ground wheat beside the river.", "", "The road followed the river.", "",
    "The market sold fish from the river.", "", "The bridge crossed the river.", "", "The barge hauled coal down the river.", "",
  ].join("\n");
  const r = await parsedOutline(ground);
  if (!r) return t.skip("no parser model");
  const { o, d } = r;
  assert.deepEqual(o.thesis.claim.agreed, { ARG1: "town" }, "ARG0 varies (river/sea/wind/tide); ARG1 is the anchor");
  const potter = pointWith(d, /potter/);
  assert.ok(!o.findings.some((f) => f.kind === "denied_relation" && f.statements.includes(potter)), "'the potter never shaped the clay' shares only the verb, not the agreed object — not a denial");
});

test("FALSIFIER: when a denial wins selection ('Nothing shaped the river.'), nothing is generalized over it, and the affirmations it excludes are named", async (t) => {
  const r = await parsedOutline(`${SHAPED}\n\nNothing shaped the river.`);
  if (!r) return t.skip("no parser model");
  const { o, d } = r;
  const neg = pointWith(d, /nothing/i);
  assert.equal(o.thesis.id, neg, "three words, all recurring: the denial wins the unchanged selection");
  assert.equal(o.thesis.text, "Nothing shaped the river.");
  assert.equal(o.thesis.claim, null, "the winner's note is a lone '-' claim: nothing is generalized over it");
  assert.deepEqual(o.thesis.ids, [neg]);
  // The third state: the kernel validated the affirmations' basin, and the
  // winner stands outside it — said as such, never "no basin" beside a
  // validated count.
  assert.match(o.slots[0].basis, /a basin of 4 cleared its null .* but does not hold the winner p13\.1 \(its note: shape, -, obj\): p1\.1, p2\.1, p3\.1, p4\.1 — the thesis is the winner alone/);
  assert.ok(!o.findings.some((f) => f.kind === "denied_relation"), "nothing denies the winner's own relation on its subject");
});

test("FALSIFIER (Williams; Caro, McPhee, Kidder & Todd, Kelsen concur): claims that agree on no role are a relation's frequency, not a thesis — refused, disclosed, the winner stands", async (t) => {
  const r = await parsedOutline(SHAPED.replace("The river shaped the port.", "The sea shaped the port.").replace("The river shaped the valley.", "The wind shaped the valley.").replace("The river shaped the harbor.", "The tide shaped the harbor."));
  if (!r) return t.skip("no parser model");
  const { o } = r;
  assert.equal(o.thesis.claim, null);
  assert.equal(o.thesis.rendered, null);
  assert.deepEqual(o.thesis.ids, [o.thesis.id]);
  assert.equal(o.thesis.text, "The river shaped the town.");
  assert.match(o.slots[0].basis, /a basin of 4 cleared its null .* but nothing was generalized: 4 claims share the relation "shape" but agree on no role/);
});

test("the basis speaks when no basin fires: how many candidates carried a note, and what the kernel found", async (t) => {
  const r = await parsedOutline(SHAPED.replace("The river shaped the harbor.", "The river shaped the harbor slowly over a century."));
  if (!r) return t.skip("no parser model");
  const { o } = r;
  assert.match(o.slots[0].basis, /(no basin: \d+ of \d+ candidates carry a relation note; the kernel found \d+ basin\(s\), \d+ validated)|(a basin of \d+ cleared its null)/, "either a basin is reported or its absence is explained");
});

test("TWO TIERS (Clark, re-read C): a body group sharing no word with ANY thesis member is licensed to leave while a basin fires — the relation lemma never licenses", async (t) => {
  const r = await parsedOutline(`${SHAPED}\n\nThe shape of the hills changed. Farmers noticed it first.`);
  if (!r) return t.skip("no parser model");
  const { o, d } = r;
  assert.ok(o.thesis.claim, "the basin fires");
  const hills = pointWith(d, /hills/);
  const f = o.findings.find((x) => x.kind === "off_thesis" && x.statements.includes(hills));
  assert.ok(f, "the hills group is off-thesis: 'shape' the noun is not 'shaped' the winner's verb");
  assert.equal(f.licenses, "leave-out");
});

test("TWO TIERS (Orlean, re-read S2): a group sharing only a possessor the note dropped is reported with the unkept-word wording, not as a varying value", async (t) => {
  const r = await parsedOutline(`${SHAPED.replace("The river shaped the port.", "The river shaped the fishermen's lives.")}\n\nThe fishermen mended their nets at dawn.`);
  if (!r) return t.skip("no parser model");
  const { o, d } = r;
  assert.ok(o.thesis.claim, "the basin fires");
  assert.ok(o.thesis.claim.varying.ARG1.includes("life"), "the note kept the head lemma 'life' and dropped the possessor");
  const nets = pointWith(d, /nets/);
  const f = o.findings.find((x) => x.kind === "off_thesis" && x.statements.includes(nets));
  assert.ok(f, "the fishermen group shares nothing with the winner's own sentence");
  assert.equal(f.licenses, null);
  assert.match(f.detail, /a word of a thesis member the claim did not keep/);
  assert.doesNotMatch(f.detail, /varying/);
});

test("THE MATERIAL'S ORDER (Lish, Caro, Clark, Orlean): a winner that is not the earliest member keeps its place; the thesis part's span is the winner's", async (t) => {
  const r = await parsedOutline(SHAPED.replace("The river shaped the town.", "The river shaped the old town.").replace("The river shaped the port.", "The river shaped the small port."));
  if (!r) return t.skip("no parser model");
  const { o, d } = r;
  assert.equal(o.thesis.id, "p3.1", "the valley sentence wins: no rare word lowers its recurrence");
  assert.deepEqual(o.thesis.ids, ["p1.1", "p2.1", "p3.1", "p4.1"], "the material's order, not winner-first");
  assert.equal(o.thesis.text, "The river shaped the valley.");
  const a0 = arrangedDraft(d, o).root.children[0];
  const winner = drawnParts(d).flatMap((p) => p.children).find((pt) => pt.id === "p3.1");
  assert.equal(a0.span.start, winner.span.start, "the part's span is the winner's bytes");
  assert.equal(a0.spans[0].start, 0, "its spans keep the material's order");
  assert.ok(a0.text.startsWith("The river shaped the old town."));
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

test("THE GUARD-EXCLUDED MEMBER STILL PROTECTS ITS OWN PARAGRAPH (Orlean, third reading, S2): a false-positive proper referent excludes one witness from the generalization but not from the report tier", async (t) => {
  // referents.js reads a sentence-initial, unseen common noun as proper
  // (isProperReferent's own default), so "Fishermen" (never introduced with
  // an article) resolves as if it named someone in particular. The
  // one-subject guard correctly excludes the one thesis member naming it
  // (p4.1) from the generalization — but that member's words/beings must
  // still count for the REPORT tier, or the separate "Fishermen mended
  // nets..." paragraph loses its only connection to the thesis and is
  // silently removed.
  const ground = [
    "The river shaped the town.", "", "The river shaped the port.", "", "The river shaped the valley.", "", "The river shaped the fishermen's lives.", "",
    "The ferry carried grain across the river.", "", "The mill ground wheat beside the river.", "", "The road followed the river.", "",
    "The market sold fish from the river.", "", "The bridge crossed the river.", "", "The barge hauled coal down the river.", "",
    "The fog hid the river.", "", "The flood covered the river.", "",
    "Fishermen mended nets at dawn. Fishermen sold their catch by noon.",
  ].join("\n");
  const r = await parsedOutline(ground);
  if (!r) return t.skip("no parser model");
  const { o, d } = r;
  assert.deepEqual(o.thesis.ids, ["p1.1", "p2.1", "p3.1"], "the fishermen statement is excluded from the generalization");
  assert.match(o.slots[0].basis, /the one-subject guard excluded 1 member\(s\) naming a different being from the winner: p4\.1 \(ref:auto:fishermen\)/);
  assert.ok(o.thesis.claim, "the other three still generalize");
  const nets = pointWith(d, /mended nets/);
  const f = o.findings.find((x) => x.kind === "off_thesis" && x.statements.includes(nets));
  assert.ok(f, "the fishermen paragraph is reported");
  assert.equal(f.licenses, null, "not licensed to leave — the guard-excluded member's words still count for the report tier");
  assert.match(f.detail, /a word of a thesis member the claim did not keep/);
});

test("THE TYPED CONTEST (thesis-claim.js's owed item 4): a denial whose object exactly matches a witnessed member lands a real kernel/notes.js contest", async (t) => {
  const r = await parsedOutline(`${SHAPED}\n\nThe river never shaped the harbor.`);
  if (!r) return t.skip("no parser model");
  const { o, d } = r;
  const neg = pointWith(d, /never/);
  const f = o.findings.find((x) => x.kind === "denied_relation");
  assert.ok(f, "the denial is reported");
  assert.equal(f.contested?.length, 1, "'harbor' is one of the four witnessed members — the cut meets its link");
  assert.equal(f.contested[0].statement, neg);
  assert.equal(f.contested[0].source, neg, "each statement is its own witness/source");
  assert.match(f.contested[0].id, /^con:/);
  assert.match(f.detail, /1 of them landed as a real CON·Figure·CONTESTED dispute \(kernel\/notes\.js\)/);
});

test("THE TYPED CONTEST: a denial naming an object no member ever witnessed meets no link and lands nothing further", async (t) => {
  const r = await parsedOutline(`${SHAPED}\n\nThe river never shaped the desert.`);
  if (!r) return t.skip("no parser model");
  const { o } = r;
  const f = o.findings.find((x) => x.kind === "denied_relation");
  assert.ok(f, "the denial is still reported");
  assert.equal(f.contested, undefined, "no member ever asserted 'desert' — nothing real was contradicted");
  assert.match(f.detail, /none meet a witnessed member's own exact claim, so none landed further/);
});
