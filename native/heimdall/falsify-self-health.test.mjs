// falsify-self-health.test.mjs — the standing rule says the falsifying
// control gets RUN, not just written. The claim under attack: "self-health
// detects its own wedge." A truly wedged event loop starves the very
// heartbeat that measures it — the setInterval callback never fires, so
// lateCount stays 0 and standing reads "healthy" on a process pegged at
// 98.5% CPU. That is a FALSE NEGATIVE on the self-watch claim.
//
// Expected outcome: the claim is FALSIFIED. self-health cannot detect a
// hard wedge from inside, because the measurement runs on the wedged loop.
// The design survives ONLY because an EXTERNAL peer/operator watches the
// fleet — that is the "out of the sandbox" premise, and this test pins it.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as sh from "./self-health.mjs";

test.beforeEach(() => sh.__selfTest.setLag({ samples: null, worst: null, count: null }));

test("FALSIFY: a loop whose heartbeat cannot fire reads healthy (false negative)", () => {
  // Simulate a hard wedge: the setInterval callback never runs (the loop is
  // spinning in a microtask). No late fires are OBSERVED — not because the
  // loop is healthy, but because the measurement itself is starved.
  // state: zero samples, zero late fires — exactly what a wedged loop leaves.
  sh.__selfTest.setLag({ samples: [], worst: 0, count: 0 });
  const s = sh.selfStanding();
  // The wedge is invisible to self-health.
  assert.equal(s.standing, "healthy", "a wedged loop with no observable fires reads healthy");
});

test("CONCEDE: self-health alone cannot watch itself — an external peer must", () => {
  // The falsifying control on the whole design: a fleet whose own loop wedges
  // and nobody outside notices concedes the self-watch claim. self-health's
  // own heartbeat cannot fire; only a peer's /heimdall probe (external) sees
  // the process stop answering. This test pins the premise: selfStanding()
  // is a READ of state, never a watchdog over the thread it runs on.
  sh.__selfTest.setLag({ samples: [], worst: 0, count: 0 });
  const s = sh.selfStanding();
  // The claim being conceded: an external probe (peer-mesh), not self-health,
  // is what catches a hard wedge. selfStanding healthy here is CORRECT output
  // given no observable signals — the gap is that a wedged loop produces no
  // signals.
  assert.equal(s.falsifyingControl, "a late heartbeat followed by an answered probe concedes wedged");
});

test("CONTROL: an OBSERVABLE late heartbeat still reads wedged (the signal works when it can fire)", () => {
  // The counter-check: when the loop CAN fire late (it is lagging, not hard-
  // wedged), self-health DOES catch it. The instrument works; it is starved
  // only by a total spin.
  sh.__selfTest.setLag({ samples: [5000, 5000, 5000, 5000, 5000], worst: 5000, count: 5 });
  assert.equal(sh.selfStanding().standing, "wedged");
});