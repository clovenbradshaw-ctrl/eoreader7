// heimdall-queue.test.mjs — the admission gate's queue discipline:
//   - FAIR QUEUE: one place per PERSON (not per message), round-robin per
//     caller, so a 25-message backlog cannot bury a newcomer and no caller's
//     pile can starve anyone else.
//   - JUMP-THE-CUE passes: a bounded stock, one-use, zipper-limited.
//   - ZIPPER alternation: after a pass redeems, the next ZIPPER_DENSITY
//     admissions are pass-free — callers merge, they don't queue-jump in
//     trains.
//   - CLAIM LEASE: a turn is inferred once by one device at a time; a fresh
//     claim held by another device refuses a duplicate, and a stale or
//     released claim is reclaimed so another device makes up a local delay.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as h from "../heimdall.mjs";

const { __queueTest, releaseClaim, zipperDisclosure } = h;

function call(person, { pass, claim, device } = {}) {
  const headers = { "x-er7-user": person };
  if (pass) headers["x-er7-pass"] = pass;
  if (claim) headers["x-er7-claim"] = claim;
  if (device) __queueTest.setDevice(device);
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

test("a pass jumps the cue by a bounded ZIPPER_JUMP, never past the head", () => {
  __queueTest.setSaturated(true);
  call("w1");
  call("w2");
  call("w3");
  const codes = zipperDisclosure().codes;
  assert.ok(codes.length > 0, "passes should be minted");
  const base = call("passer").queue?.position ?? 0;
  const jumped = call("passer", { pass: codes[0] }).queue?.position ?? 0;
  assert.ok(base >= 3, `need backlog to jump, base was ${base}`);
  assert.ok(jumped < base, `a pass must move you up: #${base} -> #${jumped}`);
  assert.ok(jumped >= 1, `a pass never jumps past the head (position ${jumped})`);
  assert.ok(jumped >= base - zipperDisclosure().jump, "the jump is bounded by ZIPPER_JUMP");
});

test("ZIPPER: a redeemed pass locks the alternation so pass trains cannot starve the line", () => {
  __queueTest.setSaturated(false);
  const codes = zipperDisclosure().codes;
  // First pass redeems and starts the lock (ZIPPER_DENSITY normals owed).
  const first = call("p1", { pass: codes[0] });
  assert.equal(first.allowed, true);
  assert.equal(zipperDisclosure().lock, zipperDisclosure().density, "a pass starts the zipper lock");
  // A second pass during the lock is held (not redeemed, not served).
  const second = call("p2", { pass: codes[1] });
  assert.equal(second.allowed, false, "a second pass must wait for the merge");
  assert.equal(second.type, "zipper", "the refusal names the alternation");
  // Normal callers are served and pay down the lock.
  const n1 = call("n1");
  const n2 = call("n2");
  assert.equal(n1.allowed, true, "a normal caller is served during the merge");
  assert.equal(n2.allowed, true, "a normal caller is served during the merge");
  assert.equal(zipperDisclosure().lock, 0, "two normals pay down the lock");
});

test("a bad pass is refused with a typed 400, never misordered", () => {
  __queueTest.setSaturated(true);
  const bad = call("badpass", { pass: "NOT-A-CODE" });
  assert.equal(bad.status, 400);
  assert.equal(bad.type, "bad_pass");
});

test("CLAIM: a turn is inferred once — a fresh claim on another device refuses a duplicate", () => {
  __queueTest.setSaturated(false);
  __queueTest.setDevice("mac-pro");
  const first = call("A", { claim: "turn-1" });
  assert.equal(first.allowed, true);
  assert.equal(first.claim.device, "mac-pro", "mac-pro holds the turn's lease");
  // Same turn from another device: refused — no double inference.
  const dup = call("B", { claim: "turn-1", device: "mac-mini" });
  assert.equal(dup.allowed, false);
  assert.equal(dup.type, "claimed");
  assert.equal(dup.claim.device, "mac-pro");
});

test("RECOVERY: releasing a claim lets another device make up a local failure/delay", () => {
  __queueTest.setSaturated(false);
  __queueTest.setDevice("mac-pro");
  assert.equal(call("A", { claim: "turn-2" }).allowed, true);
  releaseClaim("turn-2"); // local inference failed / finished — free the lease
  // Another device can now serve the same turn (recovery), not a duplicate.
  const recovery = call("B", { claim: "turn-2", device: "mac-mini" });
  assert.equal(recovery.allowed, true, "a released lease is serveable by another device");
});

test("disclosure reports the live line, the zipper, and the multi-device lease", () => {
  const d = h.disclosure();
  assert.ok(Array.isArray(d.queue.positions), "queue.positions must be an array");
  assert.ok(d.zipper.rule.includes("merge"), "the zipper rule is disclosed in words");
  assert.ok(d.device && typeof d.device === "string", "the serving device is disclosed");
  assert.ok(d.recovery.rule.includes("once"), "the once-per-turn recovery rule is disclosed");
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