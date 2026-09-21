// fleet.test.mjs — the hive-mind supervisor loop: watch self, probe peers,
// raise candidates to the operator, terminate only on explicit consent.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createFleet, configuredPeers } from "./fleet.mjs";
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

test("MULTI-HEIMDALL: env-configured peers let one fleet watch another fleet", async () => {
  // A second fleet answers /heimdall at :11439; the first fleet must learn to
  // probe it as a peer (coordination), not only the proxy's own addresses.
  process.env.ER7_HEIMDALL_PEERS = "fleet2=http://127.0.0.1:11439";
  try {
    const probed = [];
    const fleet = createFleet({
      tickMs: 1000, probeTimeoutMs: 500, operatorChannel: "log",
      self: () => ({ pid: 1, standing: "healthy" }),
      probe: async (peer) => { probed.push(peer.name); return { ok: true, status: 200, body: { self: { standing: "healthy" } } }; },
    });
    await fleet.tick();
    assert.ok(probed.includes("fleet2"), "the second fleet is probed as a peer");
    const f2 = fleet.status().peers.find((p) => p.name === "fleet2");
    assert.ok(f2, "fleet2 is in the mesh");
    assert.equal(f2.up, true);
  } finally {
    delete process.env.ER7_HEIMDALL_PEERS;
  }
});

test("MULTI-HEIMDALL: a peer fleet that goes silent is raised to the operator like any peer", async () => {
  process.env.ER7_HEIMDALL_PEERS = "fleet3=http://127.0.0.1:11440";
  try {
    const raised = [];
    const fleet = createFleet({
      tickMs: 1000, probeTimeoutMs: 500, operatorChannel: "log",
      self: () => ({ pid: 1, standing: "healthy" }),
      probe: async (peer) => (peer.name === "fleet3" ? { ok: false, reason: "probe_ECONNREFUSED" } : { ok: true, status: 200, body: {} }),
      raise: async (_m, esc) => { raised.push(esc); return { sent: true }; },
    });
    await fleet.tick();
    const esc = raised.find((e) => e.peer === "fleet3");
    assert.ok(esc, "the silent peer fleet is raised");
    assert.match(esc.ask, /should we terminate fleet3/);
  } finally {
    delete process.env.ER7_HEIMDALL_PEERS;
  }
});

test("MULTI-HEIMDALL: a persisted peers file survives when the env is absent (restart-safe mesh)", () => {
  // A managed restart (`er7-proxy restart`) spawns the fleet without the ad-hoc
  // env; the mesh must survive via the peers file beside the pid.
  const file = path.join(os.tmpdir(), `er7-peers-${Date.now()}`);
  process.env.ER7_HEIMDALL_PEERS_FILE = file;
  try {
    fs.writeFileSync(file, "fleet-restart=http://127.0.0.1:11441\n");
    delete process.env.ER7_HEIMDALL_PEERS;
    const names = configuredPeers().map((p) => p.name);
    assert.ok(names.includes("fleet-restart"), "the persisted peer is in the mesh after a 'restart'");
  } finally {
    delete process.env.ER7_HEIMDALL_PEERS_FILE;
    fs.rmSync(file, { force: true });
  }
});