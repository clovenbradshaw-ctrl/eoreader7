import test from "node:test";
import assert from "node:assert/strict";
import { heldKey, findHeld, holdTurn, heldById, awaitHeld, __heldTest } from "../held-turns.mjs";

const later = (v, ms) => new Promise((r) => setTimeout(() => r(v), ms));

test("a slow turn is held past the deadline and collected later, never run twice", async () => {
  __heldTest.reset();
  let runs = 0;
  const key = heldKey("sess-a", "/v1/chat/completions", { messages: ["hi"] });
  const e = holdTurn(key, () => { runs++; return later({ answer: 42 }, 60); }, { requester: "sess-a" });
  assert.deepEqual(await awaitHeld(e, 10), { done: false });
  assert.equal(holdTurn(key, () => { runs++; return "second"; }), e, "same request joins the held turn");
  assert.deepEqual(await awaitHeld(findHeld(key), 500), { done: true, result: { answer: 42 } });
  assert.equal(heldById(e.id).status, "done");
  assert.equal(runs, 1);
});

test("requesters are kept apart", () => {
  __heldTest.reset();
  assert.notEqual(heldKey("sess-a", "r", { m: 1 }), heldKey("sess-b", "r", { m: 1 }));
});

test("a failed turn is not held: asking again runs it again", async () => {
  __heldTest.reset();
  const key = heldKey("sess-a", "r", { m: 2 });
  const e = holdTurn(key, () => Promise.reject(new Error("boom")));
  await assert.rejects(awaitHeld(e, 500), /boom/);
  assert.equal(findHeld(key), null);
  const again = holdTurn(key, () => "ok");
  assert.deepEqual(await awaitHeld(again, 500), { done: true, result: "ok" });
});
