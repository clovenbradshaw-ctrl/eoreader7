// self-health.test.mjs — the event-loop heartbeat and self-CPU sampler.
// The 2026-09-20 lesson: a wedged proxy spun for ten hours and nothing could
// see it. self-health is the out-of-sandbox eye on ITS OWN process: an
// event-loop heartbeat that measures how late the loop fires, and a self-CPU
// read. A process that fires late WEDGE_SAMPLES times reads "wedged".
import { test } from "node:test";
import assert from "node:assert/strict";
import * as sh from "./self-health.mjs";

test.beforeEach(() => { sh.__selfTest.setCpus(null); sh.stopHeartbeat(); });
test.after(() => sh.stopHeartbeat());

test("a fresh process reads healthy before any late fires", () => {
  const s = sh.selfStanding();
  assert.equal(s.standing, "healthy");
  assert.equal(s.lateCount, 0);
});

test("readSelfCpu returns a number from ps (the real process)", async () => {
  const cpu = await sh.readSelfCpu();
  assert.equal(typeof cpu, "number");
});

test("readSelfCpu honors a test override", async () => {
  sh.__selfTest.setCpus({ cpu: 98.5 });
  assert.equal(await sh.readSelfCpu(), 98.5);
});

test("a heartbeat that fires on time stays healthy", () => {
  const timer = sh.startHeartbeat();
  assert.ok(timer);
  const s = sh.selfStanding();
  assert.equal(s.standing, "healthy");
  assert.ok(s.lastLagMs <= sh.LAG_WORST_MS, `healthy loop lag was ${s.lastLagMs}`);
});

test("WEDGE: a loop that fires late WEDGE_SAMPLES times reads wedged", () => {
  sh.__selfTest.setLag({ samples: [1000, 1000, 1000, 1000, 1000], worst: 1000, count: sh.WEDGE_SAMPLES });
  const s = sh.selfStanding();
  assert.equal(s.standing, "wedged");
  assert.equal(s.worstLagMs, 1000);
});

test("falsifying control: lag alone never reads wedged below the threshold", () => {
  sh.__selfTest.setLag({ samples: [50, 60, 40], worst: 60, count: 0 });
  assert.equal(sh.selfStanding().standing, "healthy");
});