// heimdall-queue.test.mjs — the admission gate's queue discipline:
//   - FAIR QUEUE: one place per PERSON (not per message), round-robin per
//     caller, so a 25-message backlog cannot bury a newcomer and no caller's
//     pile can starve anyone else.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as h from "../heimdall.mjs";

const { __queueTest } = h;

function call(person, { pass, claim, device, kind } = {}) {
  const headers = { "x-er7-user": person };
  if (pass) headers["x-er7-pass"] = pass;
  if (claim) headers["x-er7-claim"] = claim;
  if (device) __queueTest.setDevice(device);
  if (kind) headers["x-er7-kind"] = kind;
  return h.admitChat(JSON.stringify({ model: "gemma2:2b" }), headers);
}

test.beforeEach(() => __queueTest.reset());

test("a saturated box queues a person with a real position", () => {
  __queueTest.setSaturated(true);
  const a = call("A");
  assert.equal(a.allowed, false);
  assert.ok(["saturated", "lane_full", "not_your_turn"].includes(a.type));
  assert.ok(a.queue?.position >= 1, `A should hold a position, got ${a.queue?.position}`);
});

test("a person keeps their position across retries (retrying does not shuffle)", () => {
  __queueTest.setSaturated(true);
  const p1 = call("stable").queue?.position;
  const p2 = call("stable").queue?.position;
  assert.equal(p1, p2, `position must be stable across retries: ${p1} != ${p2}`);
});

test("FAIR QUEUE: one place per person — a 25-message backlog cannot bury a newcomer", () => {
  __queueTest.setSaturated(true);
  for (let i = 0; i < 25; i++) call("backlog");
  const newcomer = call("fresh").queue?.position ?? 0;
  assert.ok(
    newcomer <= 2,
    `a fresh person must be #1 or #2 (behind the backlog's single place), got #${newcomer}`,
  );
});

test("ROUND-ROBIN: a served caller goes to the back — a newcomer cuts in front of a backlog", () => {
  // A is served first (empty line, slot free).
  __queueTest.setSaturated(false);
  assert.equal(call("A").allowed, true, "A with an empty line is admitted");
  // Now the box saturates: A's next message re-queues with a RECENT servedAt,
  // B is fresh (never served). The round-robin line must put B ahead of A —
  // a single new message cuts in front of the backlog.
  __queueTest.setSaturated(true);
  call("A");
  call("B");
  const pa = call("A").queue?.position ?? 0;
  const pb = call("B").queue?.position ?? 0;
  assert.equal(pb, 1, `the fresh caller must be at the head, got #${pb}`);
  assert.ok(pb < pa, `B (fresh, #${pb}) ranks ahead of A (just served, #${pa})`);
  // When the box frees, B is served first.
  __queueTest.setSaturated(false);
  assert.equal(call("B").allowed, true, "B is served before A's backlog");
});

test("disclosure reports the live line and the serving device", () => {
  const d = h.disclosure();
  assert.ok(Array.isArray(d.queue.positions), "queue.positions must be an array");
  assert.ok(d.device && typeof d.device === "string", "the serving device is disclosed");
});

test("RATION: a requestor is profiled and capped per window", () => {
  __queueTest.setSaturated(false);
  const cap = h.rationDisclosure().turns.interactive;
  // Serve up to the cap.
  for (let i = 0; i < cap; i++) {
    const r = call("heavy");
    assert.equal(r.allowed, true, `turn ${i + 1} should be allowed`);
  }
  // The cap + 1 is refused, typed, never a stall.
  const over = call("heavy");
  assert.equal(over.allowed, false);
  assert.equal(over.type, "rationed");
  assert.equal(over.ration.profiles[0].turns, cap);
});

test("PRIORITY: a swarm (batch) is queued behind interactive work, always", () => {
  __queueTest.setSaturated(true); // everyone queues
  // A swarm and a human both wait.
  call("swarm-1", {});
  call("human-1");
  const human = call("human-1").queue?.position ?? 0;
  const swarm = call("swarm-1").queue?.position ?? 0;
  // The human must sort ahead of the swarm even though the swarm arrived first.
  assert.ok(human < swarm, `human #${human} must be ahead of swarm #${swarm}`);
  assert.equal(human, 1, "the interactive caller is at the head");
});

test("KIND FAIR-SHARE: a kind the box served more yields to a kind served less", () => {
  // A and B are both served once — A as chat, B as chat (pressure: chat 2).
  __queueTest.setSaturated(false);
  assert.equal(call("A", { kind: "chat" }).allowed, true);
  assert.equal(call("B", { kind: "chat" }).allowed, true);
  // The box saturates. A re-queues as chat (pressure 2). B re-queues as a
  // probe — a kind the box has NOT served this window. Even though B was
  // served MORE RECENTLY than A (B's servedAt is newer), the probe's lower
  // kind pressure must rank B ahead: kind rotation overrides last-served.
  __queueTest.setSaturated(true);
  call("A", { kind: "chat" });
  call("B", { kind: "probe" });
  const pa = call("A", { kind: "chat" }).queue?.position ?? 0;
  const pb = call("B", { kind: "probe" }).queue?.position ?? 0;
  assert.equal(pb, 1, `the under-served kind (probe) is at the head, got #${pb}`);
  assert.ok(pb < pa, `probe #${pb} ranks ahead of the chat backlog #${pa}`);
  // CONTROL: the same two people, both re-queuing the SAME kind — the
  // last-served round robin still holds (A, served earlier, is ahead).
  call("A", { kind: "chat" });
  call("B", { kind: "chat" });
  const pa2 = call("A", { kind: "chat" }).queue?.position ?? 0;
  const pb2 = call("B", { kind: "chat" }).queue?.position ?? 0;
  assert.ok(pa2 < pb2, `same kind → last-served decides: A #${pa2} ahead of B #${pb2}`);
  // The disclosure names the kind mix: chat was SERVED (twice), the probe
  // is queued but never served — the count of serves is the pressure.
  const kinds = h.disclosure().queue.kinds;
  assert.ok(kinds?.served?.chat >= 2, "chat serves are counted in the disclosure");
  assert.ok((kinds?.served?.probe ?? 0) === 0, "the queued probe has not been served — its 0 pressure is why it leads");
});

test("KIND FALLBACK: an unlabeled stream body reads as stream; a task body reads as build", () => {
  // The body's own shape is read when the header is absent.
  const streamR = h.admitChat(JSON.stringify({ model: "gemma2:2b", stream: true }), { "x-er7-user": "streamer" });
  const buildR = h.admitChat(JSON.stringify({ model: "gemma2:2b", task: "make a site" }), { "x-er7-user": "builder" });
  assert.equal(streamR.kind, "stream");
  assert.equal(buildR.kind, "build");
});