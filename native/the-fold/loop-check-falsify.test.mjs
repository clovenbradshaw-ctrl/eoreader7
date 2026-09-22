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
