// apollo.test.mjs — Apollo/Thea/apollo-swarm: falsified homeostasis loop.
import test from "node:test";
import assert from "node:assert/strict";
import { createBaseline, observe, surpriseOf, snapshot } from "./apollo.js";
import { craftRemedy } from "./thea.js";
import { dispatch } from "./apollo-swarm.js";

test("apollo: learns a baseline, stays ok on ordinary samples", () => {
  const b = createBaseline();
  let f = null;
  for (let i = 0; i < 12; i++) f = observe(b, "turnMs", 1000 + (i % 3)).finding;
  assert.equal(f.kind, "ok");
});

test("apollo: sustained deviation alarms only after hysteresis, never on first blip", () => {
  const b = createBaseline();
  for (let i = 0; i < 12; i++) observe(b, "apiCalls", 10);
  const w = observe(b, "apiCalls", 30).finding;
  assert.equal(w.kind, "watch");
  assert.equal(surpriseOf(w), null);
  const a = observe(b, "apiCalls", 45).finding;
  assert.equal(a.kind, "alarm");
  assert.ok(surpriseOf(a));
});

test("apollo: explosive growth is runaway, dispatch-grade immediately", () => {
  const b = createBaseline();
  for (let i = 0; i < 12; i++) observe(b, "genTokens", 200);
  const { finding } = observe(b, "genTokens", 5000);
  assert.equal(finding.kind, "runaway");
  assert.ok(surpriseOf(finding));
});

test("thea + dispatch: runaway generation with failing-path evidence → defer + escalate", () => {
  const b = createBaseline();
  for (let i = 0; i < 12; i++) observe(b, "genTokens", 200);
  const { finding } = observe(b, "genTokens", 5000);
  const out = dispatch(finding, { fitness: (ids) => ids.includes("failover-model") ? 10 : 1, bar: 0.5 });
  assert.ok(out && out.remedy.actions.length >= 2);
  const acts = out.remedy.actions.map((a) => a.act);
  assert.ok(acts.includes("defer"));
  assert.ok(out.remedy.disclose.includes("Thea"));
});

test("dispatch: non-surprise never sends a swarm", () => {
  assert.equal(dispatch({ kind: "ok", channel: "turnMs" }, { fitness: () => 1, bar: 0.5 }), null);
  assert.equal(dispatch(null, { fitness: () => 1, bar: 0.5 }), null);
});

test("snapshot: dynamic awareness of every channel", () => {
  const b = createBaseline();
  observe(b, "turnMs", 100);
  const s = snapshot(b);
  assert.ok(s.turnMs && s.apiCalls.standing === "unwatched");
});

test("thea refuses remedy without investigation", () => {
  assert.equal(craftRemedy({ finding: { kind: "alarm", channel: "turnMs" } }).refused, "no_report");
});
