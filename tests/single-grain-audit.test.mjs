// single-grain-audit.test.mjs — falsification of the I-single-grain
// choke-point audit (2026-09-29). No model call receives material from more
// than one grain. The audit reads declarations only — the caller's declared
// grain plus [grain:X] tags — never guesses content grains from prose.
// MEASURE mode notes, never throws; enforce mode throws the typed gap.
import { test } from "node:test";
import assert from "node:assert/strict";
import { auditSingleGrain, grainGate } from "../proxy-runner.mjs";

const msgs = (user) => [{ role: "system", content: "s" }, { role: "user", content: user }];

test("audit: a declared single grain is reported, never multi", () => {
  const a = auditSingleGrain(msgs("rewrite the section"), { declared: "section" });
  assert.deepEqual(a.grains, ["section"]);
  assert.equal(a.multi, false);
});

test("audit: a declared grain plus a different tag in the bytes is multi", () => {
  const a = auditSingleGrain(msgs("rewrite the section [grain:whole]"), { declared: "section" });
  assert.deepEqual(a.grains, ["section", "whole"]);
  assert.equal(a.multi, true, "two grains on one call is the violation");
});

test("audit: duplicate declarations collapse to one grain", () => {
  const a = auditSingleGrain(msgs("[grain:section] rewrite [grain:section]"), { declared: "section" });
  assert.deepEqual(a.grains, ["section"]);
  assert.equal(a.multi, false);
});

test("audit: tags are case-insensitive; unknown names are not grains", () => {
  const a = auditSingleGrain(msgs("[GRAIN:Paragraph] the [grain:chapter] draft"));
  assert.deepEqual(a.grains, ["paragraph"]);
  assert.equal(a.multi, false);
});

test("audit: undeclared and untagged is silent — no grains, never multi", () => {
  const a = auditSingleGrain(msgs("write something"));
  assert.deepEqual(a.grains, []);
  assert.equal(a.multi, false);
});

test("audit: the gate notes in measure mode and throws only in enforce mode", () => {
  assert.equal(grainGate({ grains: ["section", "whole"], mode: "measure" }).ok, true, "measure never throws — the sequential pipeline is the total-collapse form");
  const blocked = grainGate({ grains: ["section", "whole"], mode: "enforce" });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error.code, "ERR_MULTI_GRAIN");
  assert.match(blocked.error.message, /section \+ whole/);
  assert.equal(grainGate({ grains: ["section"], mode: "enforce" }).ok, true, "one grain passes under enforce");
  assert.equal(grainGate({ grains: [], mode: "enforce" }).ok, true, "undeclared passes — the gate rejects, never guesses");
});
