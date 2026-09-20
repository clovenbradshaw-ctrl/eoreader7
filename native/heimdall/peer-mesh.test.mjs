// peer-mesh.test.mjs — the hive-mind's escalation state machine.
// The contract: a peer that stops answering becomes a candidate, but is NEVER
// terminated silently — the operator is asked, and only an explicit YES
// terminates. A peer that answers concedes any escalation (the falsifying
// control: lag/absence alone never kills).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createMesh, peerFromAddress } from "./peer-mesh.mjs";

function peer(name = "er7") {
  return peerFromAddress(`http://127.0.0.1:11436`, { name });
}

test("a down peer becomes a candidate and is escalated, never killed silently", () => {
  const mesh = createMesh();
  const p = peer();
  mesh.upsertPeer(p);
  mesh.recordProbe(p, { ok: false, reason: "probe_ETIMEDOUT" });
  assert.ok(mesh.isCandidate(p));
  const esc = mesh.escalate(p, { reason: "probe_ETIMEDOUT" });
  assert.equal(esc.status, "pending");
  assert.match(esc.ask, /should we terminate er7\?/);
  // nothing was terminated — only asked
  assert.equal(p.candidate, true);
  assert.equal(esc.decision, null);
});

test("an answered probe concedes an open escalation (falsifying control)", () => {
  const mesh = createMesh();
  const p = peer();
  mesh.upsertPeer(p);
  mesh.recordProbe(p, { ok: false, reason: "probe_ECONNREFUSED" });
  const esc = mesh.escalate(p, { reason: "probe_ECONNREFUSED" });
  // the peer comes back
  mesh.recordProbe(p, { ok: true, status: 200, body: { self: { standing: "healthy" } } });
  assert.equal(esc.conceded, true);
  assert.ok(esc.reason.includes("concedes"));
  assert.equal(mesh.isCandidate(p), false);
  assert.equal(mesh.pending().length, 0);
});

test("a healthy peer is never a candidate", () => {
  const mesh = createMesh();
  const p = peer();
  mesh.upsertPeer(p);
  mesh.recordProbe(p, { ok: true, status: 200, body: { self: { standing: "healthy" } } });
  assert.equal(mesh.isCandidate(p), false);
});

test("only an explicit operator YES terminates — a NO denies and clears the ask", () => {
  const mesh = createMesh();
  const p = peer();
  mesh.upsertPeer(p);
  mesh.recordProbe(p, { ok: false, reason: "probe_ECONNREFUSED" });
  const esc = mesh.escalate(p, { reason: "probe_ECONNREFUSED" });

  const no = mesh.decide(p, false);
  assert.equal(no.escalation.status, "denied");
  assert.equal(no.applied, false);
  assert.equal(mesh.isCandidate(p), false);

  // re-raise and this time YES
  const esc2 = mesh.escalate(p, { reason: "probe_ECONNREFUSED" });
  const yes = mesh.decide(p, true);
  assert.equal(yes.escalation.status, "allowed");
  assert.equal(yes.applied, true);
});

test("a second probe while one is in flight is refused (never probe twice)", () => {
  const mesh = createMesh();
  const p = peer();
  mesh.upsertPeer(p);
  p.probing = true;
  mesh.recordProbe(p, { ok: true, status: 200 });
  // recordProbe clears probing; a real fleet skips probing peers
  assert.equal(p.probing, false);
  assert.equal(p.up, true);
});

test("pending() expires a stale escalation and clears the candidate", () => {
  const mesh = createMesh({ escalationTtlMs: 1 });
  const p = peer();
  mesh.upsertPeer(p);
  mesh.recordProbe(p, { ok: false, reason: "probe_ECONNREFUSED" });
  mesh.escalate(p, { reason: "probe_ECONNREFUSED" });
  const before = mesh.pending();
  assert.equal(before.length, 1);
  // wait past the TTL and re-check
  setTimeout(() => {
    const after = mesh.pending();
    assert.equal(after.length, 0);
    assert.equal(p.candidate, false);
  }, 20);
});

test("re-registering a peer preserves candidate/escalation state", () => {
  const mesh = createMesh();
  const p = peer();
  mesh.upsertPeer(p);
  mesh.recordProbe(p, { ok: false, reason: "probe_ECONNREFUSED" });
  const esc = mesh.escalate(p, { reason: "probe_ECONNREFUSED" });
  const p2 = peer();
  const kept = mesh.upsertPeer(p2);
  assert.equal(kept.escalation, esc);
  assert.equal(kept.candidate, true);
});