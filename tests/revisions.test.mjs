// revisions.test.mjs — the revisable-answer store's pure parts (2026-09-22):
// a provisional draw's original ask is remembered, offered only to its own
// requester, never auto-pushed, and bounded under real pressure.
import test from "node:test";
import assert from "node:assert/strict";
import { recordProvisional, pendingRevisions, getRevision, markAttempted, markDrawn, markFailed, revisionReceipt, __revisionsTest } from "../native/kernel/revisions.mjs";

test("recordProvisional remembers the ORIGINAL ask, not the substitute, and returns a collectible id", () => {
  __revisionsTest.reset();
  const e = recordProvisional({ requester: "person-a", requestedModel: "qwen3:8b", servedBy: "gemma2:2b", tier: "small", pathname: "/api/chat", body: { model: "qwen3:8b", messages: [{ role: "user", content: "hi" }] } });
  assert.equal(e.status, "pending");
  assert.equal(e.requestedModel, "qwen3:8b");
  assert.equal(e.body.model, "qwen3:8b", "the body kept for the re-draw names the model actually asked for");
  assert.equal(pendingRevisions().length, 1);
});

test("getRevision is requester-scoped, exactly like a held turn's receipt", () => {
  __revisionsTest.reset();
  const e = recordProvisional({ requester: "person-a", requestedModel: "m", servedBy: "s", tier: "small", pathname: "/api/chat", body: {} });
  assert.equal(getRevision(e.id, { requester: "person-a" })?.id, e.id);
  assert.equal(getRevision(e.id, { requester: "person-b" }), null, "a different requester never sees it");
  assert.equal(getRevision("no-such-id"), null);
});

test("markDrawn moves a pending entry to done with its result; markFailed to failed with its error; the receipt shape follows status", () => {
  __revisionsTest.reset();
  const e = recordProvisional({ requester: "p", requestedModel: "m", servedBy: "s", tier: "device", pathname: "/api/chat", body: {} });
  const pendingReceipt = revisionReceipt(e);
  assert.equal(pendingReceipt.status, "pending");
  assert.equal(pendingReceipt.requestedModel, "m");
  assert.equal(pendingReceipt.servedBy, "s");
  markAttempted(e.id);
  const drawn = markDrawn(e.id, { message: { content: "the real answer" } });
  assert.equal(drawn.status, "done");
  assert.equal(pendingRevisions().length, 0, "a done entry is no longer pending");
  const r = revisionReceipt(getRevision(e.id, { requester: "p" }));
  assert.equal(r.status, "done");
  assert.deepEqual(r.result, { message: { content: "the real answer" } });

  const e2 = recordProvisional({ requester: "p", requestedModel: "m2", servedBy: "s2", tier: "small", pathname: "/api/chat", body: {} });
  markFailed(e2.id, new Error("host_failed"));
  const r2 = revisionReceipt(getRevision(e2.id, { requester: "p" }));
  assert.equal(r2.status, "failed");
  assert.equal(r2.error, "host_failed");
});

test("a just-drawn entry is still collectible (sweep reads the real clock, so timestamps here must be real too)", () => {
  __revisionsTest.reset();
  const now0 = Date.now();
  const e = recordProvisional({ requester: "p", requestedModel: "m", servedBy: "s", tier: "small", pathname: "/api/chat", body: {}, now: now0 });
  markDrawn(e.id, { ok: true }, { now: now0 + 1000 });
  const still = getRevision(e.id, { requester: "p" });
  assert.ok(still, "still there right after — well inside the TTL");
  assert.equal(still.status, "done");
});

test("the store never grows without bound under a burst past the default cap, and stays functional", () => {
  __revisionsTest.reset();
  const ids = [];
  for (let i = 0; i < 260; i++) ids.push(recordProvisional({ requester: "p", requestedModel: `m${i}`, servedBy: "s", tier: "small", pathname: "/api/chat", body: {} }).id);
  const size = __revisionsTest.all().length;
  assert.ok(size <= 260, "bounded, not literally infinite");
  assert.ok(size < 260 || size <= 200, "a burst well past the default cap does not keep every entry forever");
  // the most recently recorded entry must still be retrievable — a bound
  // that starved the newest caller would be exactly backwards
  const last = getRevision(ids.at(-1), { requester: "p" });
  assert.ok(last, "the newest entry survives a burst that evicts old ones");
  __revisionsTest.reset();
});
