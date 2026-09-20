// fleet.test.mjs — the hive-mind supervisor loop: watch self, probe peers,
// raise candidates to the operator, terminate only on explicit consent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFleet } from "./fleet.mjs";
import { peerFromAddress } from "./peer-mesh.mjs";

function makeFleet({ self, probe, raise, peers = [] } = {}) {
  return createFleet({
    tickMs: 1000,
    probeTimeoutMs: 500,
    operatorChannel: "log",
    self: self ?? (() => ({ pid: 1, standing: "healthy", at: new Date().toISOString() })),
    probe: probe ?? (() => ({ ok: true, status: 200, body: { self: { standing: "healthy" } } })),
    raise,
    peers,
  });
}

test("a tick probes every peer and records their standing", async () => {
  const probed = [];
  const fleet = makeFleet({
    probe: async (peer) => { probed.push(peer.name); return { ok: true, status: 200, body: { self: { standing: "healthy" } } }; },
  });
  // add an extra known peer
  fleet.mesh.upsertPeer(peerFromAddress("http://127.0.0.1:9999", { name: "remote" }));
  await fleet.tick();
  assert.ok(probed.includes("er7"));
  assert.ok(probed.includes("remote"));
  assert.ok(fleet.status().peers.every((p) => p.up === true));
});

test("a wedged/down peer is raised to the operator, never terminated", async () => {
  const raised = [];
  const fleet = makeFleet({
    probe: async () => ({ ok: false, status: null, reason: "probe_ETIMEDOUT" }),
    raise: async (_mesh, esc) => { raised.push(esc); return { sent: true }; },
  });
  await fleet.tick();
  // both well-known local peers probe down (er7 + heimdall-alias) — each is
  // raised exactly once, nothing is terminated
  assert.ok(raised.length >= 1);
  assert.equal(raised[0].status, "pending");
  assert.match(raised[0].ask, /should we terminate/);
  assert.equal(fleet.status().pendingEscalations.length, raised.length);
  for (const esc of fleet.status().pendingEscalations) {
    assert.equal(esc.decision, null);
  }
});

test("the operator's explicit YES applies the termination decision", async () => {
  const fleet = makeFleet({ probe: async () => ({ ok: false, status: null, reason: "probe_ECONNREFUSED" }) });
  await fleet.tick();
  const peer = fleet.mesh.registry.get("er7");
  const { applied } = fleet.decide(peer, true);
  assert.equal(applied, true);
  assert.equal(peer.escalation.status, "allowed");
  assert.equal(fleet.mesh.registry.get("er7").candidate, false);
});

test("an answered peer concedes the raise before the operator decides", async () => {
  const raised = [];
  const fleet = makeFleet({
    probe: async () => ({ ok: false, status: null, reason: "probe_ECONNREFUSED" }),
    raise: async (_mesh, esc) => { raised.push(esc); return { sent: true }; },
  });
  await fleet.tick();
  assert.ok(raised.length >= 1);
  // the er7 peer answers a probe now
  fleet.mesh.recordProbe(fleet.mesh.registry.get("er7"), { ok: true, status: 200, body: { self: { standing: "healthy" } } });
  const er7Esc = fleet.mesh.registry.get("er7").escalation;
  assert.equal(er7Esc.conceded, true);
  assert.equal(fleet.pending().filter((p) => p.name === "er7").length, 0);
});

test("a healthy fleet stays quiet — nothing is raised", async () => {
  let raises = 0;
  const fleet = makeFleet({ raise: async () => { raises += 1; return { sent: true }; } });
  await fleet.tick();
  assert.equal(raises, 0);
  assert.equal(fleet.status().pendingEscalations.length, 0);
});

test("self-health is disclosed on every tick", async () => {
  const fleet = makeFleet({ self: () => ({ pid: 7, standing: "wedged", at: new Date().toISOString() }) });
  await fleet.tick();
  assert.equal(fleet.status().self.standing, "wedged");
});