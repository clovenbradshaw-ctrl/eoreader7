// flesh2-falsify.test.mjs — F2: flesh level by level (Hora). Every level is
// measured against the one below and undone if it lost ground; the last
// stable level always stands, so a mouth that never carries anything past
// the abstract still returns a usable piece.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { flesh2 } from "./flesh2.js";

const GROUND = [
  "The audit gave the office six ratings.",
  "",
  "Observation A: the plan was not updated. Assessed risk rating: High.",
  "",
  "Observation B: the manual lacked required policies. Assessed risk rating: Medium.",
].join("\n");
const draft = () => attachReferents(buildDraft({ task: "Write a piece from this material.", ground: GROUND }), buildReferents(GROUND));

test("every level is undone in favor of the last stable one, never throws (the L3-reassignment bug)", async () => {
  // L1 and L2 succeed; L3's draw refuses everything for the missing spans, so
  // L3 must be judged worse and UNDONE without throwing (flesh2.js reassigns
  // a level's measure when it is undone — it must be declared `let`).
  let n = 0;
  const draw = async () => { n++; return n <= 6 ? "The office was rated." : ""; };
  const r = await flesh2({ draft: draft(), draw, ground: GROUND, task: "Write a piece from this material." });
  assert.ok(r.levels.L1 && r.levels.L2 && r.levels.L3, "every level reports a measure, even one that was undone");
  assert.ok(r.parts.length, "a usable piece stands");
});

test("a section that never carries anything falls to its own first span, never empty", async () => {
  const draw = async () => "";
  const r = await flesh2({ draft: draft(), draw, ground: GROUND, task: "Write a piece from this material." });
  assert.ok(r.parts.every((p) => p.prose.trim().length > 0), "no part is empty");
});

test("a level that loses a fact the level below carried is undone", async () => {
  const good = "Observation A: the plan was not updated. Assessed risk rating: High. Observation B: the manual lacked required policies. Assessed risk rating: Medium.";
  let n = 0;
  const draw = async () => { n++; return n === 2 ? "The office was rated." : good; };
  const r = await flesh2({ draft: draft(), draw, ground: GROUND, task: "Write a piece from this material." });
  const L1carried = r.levels.L1.carried, L2carried = r.levels.L2.carried;
  assert.ok(L2carried >= L1carried, "L2 never carries fewer facts than L1 once undone loops are accounted for");
});
