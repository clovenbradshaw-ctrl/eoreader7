// P161 — no view from nowhere, on the way out.
import test from "node:test";
import assert from "node:assert/strict";
import { declare, frameOf, carry, say, retrievalId } from "../kernel/retrieval-frame.js";

const FRAME = { asking: "what is Prince Andrew to Pierre?", conclusion: "which hyperedges he stands in, and beside whom", atSeq: 2691 };

test("a retrieval that cannot say what was asked is refused", () => {
  assert.throws(() => declare({ conclusion: "x" }), /what was asked/);
  assert.throws(() => declare({ asking: "   ", conclusion: "x" }), /what was asked/);
});

test("a retrieval that cannot say what conclusion it was scoped to is refused", () => {
  // dmdWindow's own error says it: "derive is the conclusion a difference
  // must make a difference TO - it is required". A reach without one is a
  // number about nothing.
  assert.throws(() => declare({ asking: "who is he?" }), /difference must make a difference/);
});

test("an ABSENT frame is reported by name, never invented", () => {
  // notes.js's rule, applied on the way out: a refusal that breaks every
  // existing caller is not a wall, so an undeclared retrieval is not refused
  // - it is named.
  const f = frameOf({ reach: 41 });
  assert.equal(f.gap, "undeclared_retrieval");
  assert.match(f.detail, /not about anything in particular/);
  assert.equal(f.declared, undefined, "no frame may be invented to fill the gap");
});

test("a declared frame carries what the retrieval stood on", () => {
  const f = declare(FRAME);
  assert.equal(f.schema, "RetrievalFrame@1");
  assert.equal(f.asking, FRAME.asking);
  assert.equal(f.conclusion, FRAME.conclusion);
  assert.equal(f.atSeq, 2691);
  assert.equal(frameOf({ frame: f }).scoped, true);
});

test("THE CURSOR IS PART OF THE STANDING - identity is retrieval-time", () => {
  // The same question at 25% and at 100% is two different retrievals. A frame
  // that omitted the cursor would call them one.
  const early = declare({ ...FRAME, atSeq: 672 });
  const late = declare({ ...FRAME, atSeq: 2691 });
  assert.notEqual(JSON.stringify(early), JSON.stringify(late));
});

test("a null cursor is a DECLARED whole reading, not a missing one", () => {
  const f = declare({ asking: "a", conclusion: "b" });
  assert.equal(f.atSeq, null);
  assert.match(say("41", { frame: f }), /the whole reading/);
});

test("what was deliberately ABSENT is recorded - silence is not absence", () => {
  const f = declare({ ...FRAME, absent: ["wikipedia.html"] });
  assert.deepEqual([...f.absent], ["wikipedia.html"]);
});

test("carry is additive, and a later hand cannot restate an earlier standing", () => {
  const f = declare(FRAME);
  const g = declare({ ...FRAME, asking: "something else entirely" });
  assert.equal(carry({ reach: 41 }, f).frame, f);
  assert.equal(carry({ reach: 41, frame: f }, g).frame, f, "a result that already declared keeps its own frame");
  assert.deepEqual(carry({ reach: 41 }, null), { reach: 41 }, "no frame handed, none invented");
});

test("A NUMBER WITHOUT ITS FRAME IS NOT A FINDING", () => {
  // The defect this file exists for: "the measured reach of Prince Andrew is
  // 41" reads as a property of Prince Andrew. It is a property of (him, that
  // conclusion, that cursor).
  const bare = say("41", { reach: 41 });
  assert.match(bare, /undeclared_retrieval/, "an unframed number must say so where it is read");
  const framed = say("41", { frame: declare(FRAME) });
  assert.match(framed, /what is Prince Andrew to Pierre\?/);
  assert.match(framed, /beside whom/);
  assert.match(framed, /cursor 2691/);
});

test("two identical scopings get one id; a different question gets another", async () => {
  const a = await retrievalId(declare(FRAME));
  const b = await retrievalId(declare({ ...FRAME }));
  const c = await retrievalId(declare({ ...FRAME, conclusion: "merely which surfaces name him" }));
  assert.equal(a, b, "the same standing is the same id - that is the point");
  assert.notEqual(a, c, "a different conclusion is a different retrieval");
  assert.match(a, /^[0-9a-f]{16}$/);
});
