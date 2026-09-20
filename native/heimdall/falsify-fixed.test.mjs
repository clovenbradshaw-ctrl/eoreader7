// falsify-fixed.test.mjs — the two 2026-09-20 falsifications, and the fix.
//
// FALSIFICATION 1 (self-watch): self-health cannot detect its OWN hard wedge —
// a wedged loop starves the heartbeat, so standing reads "healthy". Honest
// boundary: a fleet cannot watch its own thread. The fix is that the fleet
// EXPOSES lastTickAt, so an EXTERNAL peer/operator can see a fleet that
// stopped ticking. That is the out-of-sandbox premise, pinned, not fixed away.
//
// FALSIFICATION 2 (answering-but-spinning): the incident proxy answered its
// own /heimdall 200 while spinning at 98.5% CPU — reachability alone was
// blind. THE FIX: the fleet reads the BOX's external load each tick and a
// peer that answers while the box stays saturated becomes a suspect.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFleet } from "./fleet.mjs";
import { createMesh, peerFromAddress } from "./peer-mesh.mjs";

test("FIX: an answering peer under sustained box saturation becomes a candidate", () => {
  const mesh = createMesh();
  const p = peerFromAddress("http://127.0.0.1:11436", { name: "er7" });
  mesh.upsertPeer(p);
  // the peer answers (200) but the box is saturated
  mesh.recordProbe(p, { ok: true, status: 200, body: { self: { standing: "ok" } } });
  mesh.recordLoad({ saturated: true });
  mesh.recordLoad({ saturated: true });
  mesh.recordLoad({ saturated: true });
  assert.equal(p.up, true, "the peer IS answering");
  assert.equal(mesh.isCandidate(p), true, "but sustained saturation makes it a suspect");
});

test("FIX: a saturated suspect under the tick threshold is NOT yet a candidate", () => {
  const mesh = createMesh();
  const p = peerFromAddress("http://127.0.0.1:11436", { name: "er7" });
  mesh.upsertPeer(p);
  mesh.recordProbe(p, { ok: true, status: 200 });
  mesh.recordLoad({ saturated: true });
  mesh.recordLoad({ saturated: true });
  assert.equal(mesh.isCandidate(p), false, "only SUSTAINED saturation convicts (never one spike)");
});

test("FIX: saturation that clears resets the suspect counter (falsifying control)", () => {
  const mesh = createMesh();
  const p = peerFromAddress("http://127.0.0.1:11436", { name: "er7" });
  mesh.upsertPeer(p);
  mesh.recordProbe(p, { ok: true, status: 200 });
  mesh.recordLoad({ saturated: true });
  mesh.recordLoad({ saturated: true });
  mesh.recordLoad({ saturated: false }); // the box breathed
  assert.equal(p.saturatedTicks, 0, "a cleared load resets the suspect count");
  assert.equal(mesh.isCandidate(p), false);
});

test("FIX: a down peer still escalates as before (the original path is intact)", () => {
  const mesh = createMesh();
  const p = peerFromAddress("http://127.0.0.1:11436", { name: "er7" });
  mesh.upsertPeer(p);
  mesh.recordProbe(p, { ok: false, reason: "probe_ECONNREFUSED" });
  const esc = mesh.escalate(p, { reason: "probe_ECONNREFUSED" });
  assert.equal(esc.status, "pending");
  assert.match(esc.ask, /should we terminate er7/);
});

test("FIX: the fleet reads external box load every tick and exposes it", async () => {
  const fleet = createFleet({
    probe: async () => ({ ok: true, status: 200, body: {} }),
    boxLoad: async () => ({ load1: 42, saturated: true }),
  });
  await fleet.tick();
  assert.equal(fleet.status().boxLoad.load1, 42);
  assert.equal(fleet.status().boxLoad.saturated, true);
});

test("FIX: the fleet exposes lastTickAt so an external observer can see a stopped fleet", async () => {
  const fleet = createFleet({});
  await fleet.tick();
  assert.ok(fleet.status().lastTickAt, "lastTickAt is disclosed after a tick");
  assert.ok(Date.parse(fleet.status().lastTickAt) <= Date.now());
});

test("FIX: the fleet escalates an answering-but-spinning peer end to end", async () => {
  const raised = [];
  const fleet = createFleet({
    probe: async () => ({ ok: true, status: 200, body: {} }),
    boxLoad: async () => ({ load1: 55, saturated: true }),
    raise: async (_m, esc) => { raised.push(esc); return { sent: true }; },
  });
  // three saturated ticks -> the answering peers become suspects
  await fleet.tick(); await fleet.tick(); await fleet.tick();
  const er7 = fleet.mesh.registry.get("er7");
  assert.equal(er7.up, true);
  assert.ok(raised.length >= 1, "an answering-but-spinning peer IS raised");
  const er7Raise = raised.find((e) => e.peer === "er7");
  assert.ok(er7Raise, "er7 specifically is raised");
  assert.match(er7Raise.ask, /saturated/);
});