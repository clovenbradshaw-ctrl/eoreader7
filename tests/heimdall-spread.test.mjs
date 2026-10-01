// heimdall-spread.test.mjs — the MEASURED round-robin across inference hosts
// (2026-10-01): pickHost rotates among hosts whose expected wait exceeds the
// best by no more than the cheapest MEASURED cold load — spreading the fleet
// without ever paying a reload (the 2026-09-21 lesson: a naive round robin
// pays a cold load per server and discards every prefix cache). The rotation
// prefers the least-picked host, so no host is pinned and none is starved.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as h from "../heimdall.mjs";

// The module's host array is the test's fixture: its contents are REPLACED
// for the scenario and restored after — never mutated in place (a standing
// host is never stood down in a test; the runner's file process shares it).
const hosts = h.inferenceHosts();
const real = hosts[0];
const MODEL = "gemma2:2b"; // waits are measured in this model's mean-turn ms
const MEAN = 3000;
function mkHost(name, { inflight = 0, picks = 0, loadMs = null } = {}) {
  const host = {
    name, url: `http://127.0.0.1:9${name.length}9`, inflight, calls: 0, picks, fails: 0,
    lastAt: null, downAt: null, downReason: null, kind: "daemon",
    inflightBy: new Map([[MODEL, inflight]]), meanMs: new Map([[MODEL, MEAN]]), loadMs, resident: new Map(),
  };
  return host;
}
function withHosts(list, work) {
  hosts.length = 0;
  hosts.push(...list);
  try { return work(); }
  finally { hosts.length = 0; hosts.push(real); }
}

test("SPREAD: hosts within one measured load cost rotate, least-picked first", () => {
  const a = mkHost("spread-a", { inflight: 0, picks: 10, loadMs: 5000 });
  const b = mkHost("spread-b", { inflight: 1, picks: 0, loadMs: 5000 }); // 3s ahead
  const c = mkHost("spread-c", { inflight: 2, picks: 0, loadMs: 5000 }); // 6s ahead
  withHosts([a, b, c], () => {
    // waits: a=0, b=3s, c=6s. The cheapest measured load is 5s: b is within
    // one load cost (waiting 3s < loading 5s), c is not (6s > 5s) — so the
    // rotation spreads a/b, never the pinned favorite, and never pays a load.
    const first = h.pickHost({ model: MODEL, session: null });
    assert.equal(first.host.name, "spread-b", `rotates off the pinned favorite onto the equal-enough host: ${first.host.name}`);
    assert.equal(first.reason, "spread_within_load_cost");
    const second = h.pickHost({ model: MODEL, session: null });
    // after one serve, b has 1 pick; a still has 10 — the rotation stays on b
    // (the equal-enough set), never returning to the pinned favorite.
    assert.equal(second.host.name, "spread-b", "the least-picked host of the equal-enough set keeps serving");
    assert.notEqual(second.host.name, "spread-a");
  });
});

test("SPREAD-BOUND: a host clearly busier than one load cost is never rotated to", () => {
  const a = mkHost("tight-a", { inflight: 0, picks: 99, loadMs: 5000 });
  const b = mkHost("tight-b", { inflight: 10, picks: 0, loadMs: 5000 }); // 30s ahead
  withHosts([a, b], () => {
    const p = h.pickHost({ model: MODEL, session: null });
    assert.equal(p.host.name, "tight-a", "waiting 30s costs more than a load — no spread to the busy host");
    assert.equal(p.reason, "shortest_expected_wait");
  });
});

test("SPREAD-OFF: no measured load cost anywhere → exact ties only (the old behavior)", () => {
  const a = mkHost("exact-a", { inflight: 0, picks: 5 });
  const b = mkHost("exact-b", { inflight: 1, picks: 0 }); // 3s ahead, but nothing measured
  withHosts([a, b], () => {
    const p = h.pickHost({ model: MODEL, session: null });
    assert.equal(p.host.name, "exact-a", "unmeasured hosts are never treated as equal enough — b is 1 turn ahead and stays behind");
    assert.equal(p.reason, "shortest_expected_wait");
  });
});

test("SPREAD-TIE: exact ties still rotate when picks are equal", () => {
  const a = mkHost("tie-a", { inflight: 0, picks: 0, loadMs: 4000 });
  const b = mkHost("tie-b", { inflight: 0, picks: 0, loadMs: 4000 });
  withHosts([a, b], () => {
    const names = new Set([h.pickHost({ model: MODEL, session: null }).host.name, h.pickHost({ model: MODEL, session: null }).host.name]);
    assert.equal(names.size, 2, "equal waits and equal picks rotate across both hosts");
  });
});