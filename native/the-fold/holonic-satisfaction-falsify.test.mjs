// holonic-satisfaction-falsify.test.mjs — THE FALSIFICATION TIER for the
// holonic satisfaction general (the user's law, 2026-09-21):
//
//   "Meaning is the THREE-PART SHAPE at every holon level: a holon opens
//   (sets a strain), turns (develops it), and resolves (satisfies the strain,
//   landing somewhere the opener did not predict). A holon without all three
//   is structured dissonance — no meaning. satisfaction is a GENERAL applied
//   at ANY level, omnimodal: satisfaction(whole), satisfaction(whole.partOne),
//   satisfaction(whole.partOne.partTwo)."
//
// Each falsification below tries to BREAK a consequence of that assertion
// with adversarial material. RULED OUT = the law survived its own
// counterexample; FALSIFIED = it broke, named with the numbers.
import test from "node:test";
import assert from "node:assert/strict";
import {
  holonicSatisfaction,
  holonTreeFromText,
  holonTreeFromLines,
  holonicTreeSatisfaction,
  holonAt,
  holonLeaves,
  formatHolonTree,
  splitHolonIntoThree,
} from "./document-ledger.js";

// ── H1  MEANING IS THE 3-PART SHAPE. A holon that opens on a strain, turns
// it, and resolves it (landing somewhere new) satisfies; a holon that only
// STACKS content — no strain, no turn, no landing — is dissonance, and the
// general says so even though every sentence in it is individually fine.
test("H1 — a flat content-stack is dissonance; a 3-part holon satisfies", () => {
  // The DISSONANT control: three sentences, each a separate fact, no strain
  // set by the opening, no turn, no resolution — the Cumberland essay's
  // measured failure (sections re-stating "played a significant role").
  const flat = "The Cumberland River is in Tennessee. Nashville is on the Cumberland River. The river is 688 miles long.";
  const dissonant = holonicSatisfaction(flat, { level: "whole", theme: "the Cumberland River" });
  assert.ok(!dissonant.ok, "a content-stack must not satisfy");
  const kinds = dissonant.failures.map((f) => f.kind);
  assert.ok(kinds.includes("no_turn") || kinds.includes("no_strain"), `the dissonance must be named (got: ${kinds.join(", ")})`);

  // The SATISFYING control: opens with a claim (the strain), turns it with
  // development, resolves it by returning to the opening's terms and landing
  // somewhere the opener did not predict.
  const arc = "The Cumberland River built Nashville, and the city still owes it a debt. The river carried the city's first trade, fed its wharves, and bound its fortunes to the water. That debt is now paid in silence — the wharves are gone, and the city has turned its back on the very current that made it.";
  const satisfying = holonicSatisfaction(arc, { level: "whole", theme: "the Cumberland River" });
  assert.ok(satisfying.ok, `a real 3-part holon must satisfy (got: ${JSON.stringify(satisfying.failures.slice(0, 2))})`);
});

// ── H2  THE SHAPE HOLDS AT EVERY LEVEL, OMNIMODAL. The general does not know
// or care whether it is handed a whole, a section, a paragraph, or a
// sentence — the SAME checks run. A single sentence is an atom: it must still
// carry a complete thought (set up + land) about its theme.
test("H2 — the general is omnimodal: same shape at sentence, paragraph, whole", () => {
  const atomGood = holonicSatisfaction("The river that built Nashville now runs beneath the city's silent waterfront.", { level: "sentence", theme: "the Cumberland River" });
  assert.ok(atomGood.ok, "a complete sentence must satisfy as an atom");
  const atomThin = holonicSatisfaction("The river.", { level: "sentence", theme: "the Cumberland River" });
  assert.ok(!atomThin.ok, "a fragment must not satisfy as an atom");
  assert.ok(atomThin.failures.some((f) => f.kind === "thin"), "the fragment must be named thin");

  // The SAME text at different declared levels is measured the same way — the
  // level is disclosure, never a different rule book.
  const para = "The river built the city's first trade. It carried keelboats to New Orleans and brought back sugar and news. The wharves are gone now, but the current that made Nashville still runs.";
  const asWhole = holonicSatisfaction(para, { level: "whole" });
  const asSection = holonicSatisfaction(para, { level: "section" });
  const asParagraph = holonicSatisfaction(para, { level: "paragraph" });
  assert.equal(asWhole.strain === 0, asSection.strain === 0, "whole and section agree on the shape");
  assert.equal(asSection.strain === 0, asParagraph.strain === 0, "section and paragraph agree on the shape");
});

// ── H3  RECURSION: satisfaction(whole.partOne.partTwo). The parts nest; each
// part is itself measured, and its strain rides into the whole's total. A
// good whole with a dissonant child must fail AT the child.
test("H3 — the recursion descends: a dissonant part fails its own path", () => {
  // The whole is well-formed, but its TURN is a flat restatement (no turn).
  const whole = "The river built Nashville, and the city owes it a debt. The river built Nashville, and the city owes it a debt. The river built Nashville, and the city owes it a debt. The river built Nashville, and the city owes it a debt. The debt is paid in silence; the wharves are gone; the current still runs.";
  const tree = holonTreeFromText(whole);
  const sat = holonicTreeSatisfaction(tree);
  // The whole must carry strain from its parts — the recursion descended.
  assert.ok(!sat.ok || sat.strain > 0, "a restating whole must fail through its own recursion");
  // The tree is addressable: the whole's parts are reachable by path.
  assert.ok(holonAt(tree, "whole.opening"), "whole.opening is addressable");
  assert.ok(holonAt(tree, "whole.resolution"), "whole.resolution is addressable");
  // Leaves round-trip: the flat documentLines serialization is the tree's leaves.
  const leaves = holonLeaves(tree);
  assert.ok(leaves.length >= 3, "the tree has leaves");
  const leafJoin = leaves.join(" ");
  for (const w of ["built", "debt", "silence"]) assert.ok(leafJoin.includes(w), `a leaf carries "${w}"`);
});

// ── H4  THE TREE IS THE FORMAT, THE FLAT ARRAY IS A SERIALIZATION. The
// 27-cell essay built from a flat documentLines list must reconstruct into a
// tree whose paths are the satisfaction paths.
test("H4 — documentLines round-trips through the holon tree", () => {
  const lines = [
    "The river built Nashville's first trade. Keelboats carried flour to New Orleans and returned with sugar and coffee. This was the city's opening bargain.",
    "That bargain was kept for a century. Steamboats cut the trip from weeks to days. The wharves crowded with the commerce of the interior.",
    "The wharves are gone now. A concrete amphitheater stands where the steamboats docked. But the current that made Nashville still runs beneath it.",
  ];
  const tree = holonTreeFromLines(lines);
  const roundTripped = holonLeaves(tree);
  assert.equal(roundTripped.length >= 3, true, "the leaves carry the prose");
  const assembled = roundTripped.join("\n\n");
  for (const l of lines) assert.ok(assembled.includes(l.slice(0, 24)), "each section survives the round-trip");
  const outline = formatHolonTree(tree);
  assert.ok(outline.includes("whole.opening"), "the outline shows the whole's opening path");
  assert.ok(outline.includes("[resolution]"), "the outline shows the resolution role");
});

// ── H5  THE SPLIT IS BY THIRDS, THE ATOM IS A SENTENCE. Fewer than three
// sentences is an atom (checked whole); three+ sentences divide into
// opening / turn / resolution. TWO sentences is a mini-arc — a claim and its
// landing, opening + resolution with no body — the atom's degenerate shape.
test("H5 — the tri-partite split: atoms below three, thirds above", () => {
  const one = splitHolonIntoThree("One sentence only.", { sentences: true });
  assert.equal(one.atom, true, "one sentence is an atom");
  const three = splitHolonIntoThree("The first sentence opens. The middle sentence turns. The last sentence resolves.", { sentences: true });
  assert.equal(three.atom, false, "three sentences is not an atom");
  assert.ok(three.opening.includes("first"), "opening is the first third");
  assert.ok(three.resolution.includes("last"), "resolution is the last third");
  assert.ok(three.turn.includes("middle"), "turn is the middle third");
});