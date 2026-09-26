// loop-check-falsify.test.mjs — every loop must leave something useful.
import test from "node:test";
import assert from "node:assert/strict";
import { judgeLoop } from "./loop-check.js";

const m = (o) => ({ carried: 10, of: 10, answered: 2, questions: 2, licensed: 3, sentences: 12, words: 200, ...o });

test("truth first: a loop that loses a fact is undone, whatever else it gained", () => {
  const j = judgeLoop(m(), m({ carried: 9, licensed: 0 }));
  assert.equal(j.keep, false);
});
test("a loop that drops a question the ask asked is undone", () => {
  assert.equal(judgeLoop(m(), m({ answered: 1 })).keep, false);
});
test("a revising loop may not leave more findings; the prose loop may", () => {
  assert.equal(judgeLoop(m(), m({ licensed: 5 })).keep, false);
  assert.equal(judgeLoop(m({ licensed: 0 }), m({ licensed: 5 }), { addsFindings: true }).keep, true);
  assert.equal(judgeLoop(m({ licensed: 0 }), m({ licensed: 5, carried: 9 }), { addsFindings: true }).keep, false, "but never at the cost of a fact");
});
test("fewer findings or more facts is better; nothing lost is the same", () => {
  assert.equal(judgeLoop(m(), m({ licensed: 1 })).verdict, "better");
  assert.equal(judgeLoop(m(), m()).verdict, "same");
});

// STEP 7 (plans/generation-terrain-stance.md, 2026-09-26): pipeline-run.mjs's
// tighten and turns stages used to judge a whole pass's candidates as ONE
// combined measurement against the pass before it. judgeLoop itself takes
// only two measurements and no piece-identity state, so composing it once
// PER CANDIDATE (each judged against the state left by the one before it) is
// a genuinely different computation from calling it once on the combined
// effect -- and it is strictly more forgiving of a good candidate that
// happens to share a pass with a bad one.
test("per-candidate judging keeps a good candidate that whole-batch judging would have discarded alongside a bad one", () => {
  const before = m({ licensed: 3 });
  const afterA = m({ licensed: 3 }); // candidate A alone: harmless, changes nothing measured
  const afterAB = m({ licensed: 4 }); // candidate B, applied on top of A: trips one new finding elsewhere

  // WHOLE-BATCH (the prior pipeline-run.mjs behavior): the combined effect of
  // A and B together is judged once against the piece before the pass.
  assert.equal(judgeLoop(before, afterAB).keep, false, "the batch nets one more finding than before, so it is discarded entirely -- losing A too");

  // PER-CANDIDATE (this cycle's fix): A is judged against `before` first, then
  // B is judged against the state left by A -- exactly what pipeline-run.mjs's
  // tighten/turns loops now do (checkLoop called once per kept candidate,
  // threading the running piece/measurement forward).
  assert.equal(judgeLoop(before, afterA).keep, true, "A alone loses nothing and adds no finding, so it survives on its own");
  assert.equal(judgeLoop(afterA, afterAB).keep, false, "B, judged against the state AFTER A was accepted, is the one that actually adds the finding -- only B is discarded");
});

test("a question the ask asked and no part answers is counted as unanswered", async () => {
  const { measurePiece } = await import("./loop-check.js");
  const { buildDraft } = await import("./eot-draft.js");
  const { arrangedDraft, arrangeEssay } = await import("./arrange.js");
  const task = "Write an essay on what the audit found and how the council responded.";
  const ground = "The audit mattered.\n\nIn 2024 the council voted to fund a review.\n\nThe council adopted a schedule in 2025.";
  const d0 = buildDraft({ task, ground });
  const o = arrangeEssay({ draft: d0 });
  o.slots.forEach((s) => { if (s.slot !== "thesis" && s.slot !== "return") s.answers = "how the council responded"; });
  const d = arrangedDraft(d0, o);
  const piece = d.root.children.map((p) => ({ id: p.id, pieces: p.children.map((pt) => ({ text: pt.text, carries: [pt.id] })) }));
  const m = measurePiece(piece, { draft: d, ground, task });
  assert.equal(m.questions, 2);
  assert.equal(m.answered, 1);
});
