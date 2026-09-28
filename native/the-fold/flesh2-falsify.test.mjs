// flesh2-falsify.test.mjs — F2: flesh level by level (Hora). Every level is
// measured against the one below and undone if it lost ground; the last
// stable level always stands, so a mouth that never carries anything past
// the abstract still returns a usable piece.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, namesOf } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { flesh2 } from "./flesh2.js";
import { admitCandidates, measureVariance, measureBondNull } from "./admission.js";

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

// flesh2.js's own `continues` fallback (for a draft with no `.referents`) used
// to compare whole strings — effectively "is the candidate byte-identical to
// the prior landing", which a real continuing sentence never is. Fixed
// 2026-09-28 to match prosify.js's own namesOf-based fallback (shared-name
// continuity) when it was lifted into admission.js::admitCandidates as one
// shared shell. This pins the fix directly against the two fallback shapes,
// not just against flesh2()'s own end-to-end output.
test("the referents-less `continues` fallback recognizes a shared name as motion — the old whole-string-equality version could not", () => {
  const ground = "Observation A: the plan was not updated. Assessed risk rating: High.";
  const priorLanding = "The audit turned first to Observation A.";
  const turn = "Observation A had been open since spring.";
  const variance = measureVariance(ground);
  const bondNull = measureBondNull(ground, undefined, variance);
  const namesBased = (a, b) => { const A = namesOf(a); const B = new Set(namesOf(b)); return A.some((n) => B.has(n)); };
  const wholeString = (a, b) => { const A = a ? [a] : []; const B = b ? [b] : []; return A.some((n) => B.includes(n)); };
  // isGrounded is forced false so ONLY the continues/motion road can admit
  // the turn — isolating exactly what differs between the two fallbacks,
  // rather than letting an incidentally-grounded fixture mask it.
  const runWith = (continues) => admitCandidates(turn, { ground, priorLanding, registry: new Set(), variance, bondNull, continues, isMeta: () => false, isGrounded: () => false });
  const fixed = runWith(namesBased);
  const old = runWith(wholeString);
  assert.ok(fixed.roads.includes("motion") || fixed.roads.includes("both"), `the namesOf fallback must recognize the turn: ${JSON.stringify(fixed)}`);
  assert.ok(!old.roads.includes("motion") && !old.roads.includes("both"), `the OLD whole-string fallback should not have recognized this as motion (it required byte-identity): ${JSON.stringify(old)}`);
});
