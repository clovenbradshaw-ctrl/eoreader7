// proteasome-half-life.test.mjs — falsification of the rule proteasome
// (I-half-life + I-retire, THE-ENZYME-PIPELINE Phase 4, 2026-09-29).
// A rule past its own half-life concedes unless the pattern re-earned it;
// a conceded rule is re-derivable (the next recurrence adopts it again);
// the retire route's unit is concedeDerivedRule with a stated reason.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "er7-proteasome-test-"));
process.env.ER7_DERIVED_RULES_FILE = path.join(scratch, "derived.json");
process.env.ER7_TRIALS_FILE = path.join(scratch, "trials.json");
process.env.ER7_SETTINGS_FILE = path.join(scratch, "settings.json");
process.env.ER7_HEIMDALL_LOG_FILE = path.join(scratch, "log.jsonl");
const h = await import("../heimdall.mjs");

const rule = (cls, probe) => ({ class: cls, probe, count: 3, spanMin: 5, model: probe, rule: "test rule", giver: "heimdall", standing: "disclosed", control: "test control" });

test("proteasome: adoption stamps the clock — adoptedAt, lastEarnedAt, halfLifeMs", () => {
  h.adoptDerivedRule(rule("window_changed", "gemma2:2b"));
  const r = h.derivedRuleStore().find((x) => x.key === "window_changed:gemma2:2b");
  assert.ok(r, "adopted");
  assert.ok(Number.isFinite(r.adoptedAt) && Number.isFinite(r.lastEarnedAt), "the rule carries its earn");
  assert.ok(Number.isFinite(r.halfLifeMs) && r.halfLifeMs > 0, "the rule carries its clock");
  h.concedeDerivedRule("window_changed:gemma2:2b", { reason: "test cleanup" });
});

test("proteasome: a rule past its half-life with no recurrences concedes itself", () => {
  h.adoptDerivedRule({ ...rule("saturated", "gemma2:2b"), lastEarnedAt: 0, halfLifeMs: 1 });
  const out = h.reexamineDerivedRules({ counts: new Map(), now: 10 ** 13 });
  assert.deepEqual(out.map((v) => [v.key, v.outcome]), [["saturated:gemma2:2b", "conceded"]]);
  const r = h.derivedRuleStore().find((x) => x.key === "saturated:gemma2:2b");
  assert.equal(r.standing, "conceded");
  assert.match(r.concededReason, /outlived its evidence/);
});

test("proteasome: a fresh rule is untouched; an unexpired rule survives the pass", () => {
  h.adoptDerivedRule(rule("forward_failed", "gemma2:2b"));
  const out = h.reexamineDerivedRules({ counts: new Map() });
  assert.ok(out.every((v) => v.key !== "forward_failed:gemma2:2b"), "a rule whose clock still runs is never examined");
  const r = h.derivedRuleStore().find((x) => x.key === "forward_failed:gemma2:2b");
  assert.equal(r.standing, "disclosed");
  h.concedeDerivedRule("forward_failed:gemma2:2b", { reason: "test cleanup" });
});

test("proteasome: an expired rule whose pattern recurs past the floor is re-earned", () => {
  h.adoptDerivedRule({ ...rule("saturated", "gemma2:2b"), lastEarnedAt: 0, halfLifeMs: 1 });
  const counts = new Map([["saturated:gemma2:2b", { count: 5 }]]);
  const out = h.reexamineDerivedRules({ counts, now: 10 ** 13 });
  assert.deepEqual(out.map((v) => [v.key, v.outcome]), [["saturated:gemma2:2b", "re-earned"]]);
  const r = h.derivedRuleStore().find((x) => x.key === "saturated:gemma2:2b");
  assert.equal(r.standing, "disclosed");
  assert.equal(r.lastEarnedAt, 10 ** 13, "the earn is refreshed to the pass's now");
  h.concedeDerivedRule("saturated:gemma2:2b", { reason: "test cleanup" });
});

test("proteasome: an expired rule with recurrences BELOW the floor still concedes", () => {
  h.adoptDerivedRule({ ...rule("saturated", "gemma2:2b"), lastEarnedAt: 0, halfLifeMs: 1 });
  const out = h.reexamineDerivedRules({ counts: new Map([["saturated:gemma2:2b", { count: 2 }]]), now: 10 ** 13 });
  assert.deepEqual(out.map((v) => [v.key, v.outcome]), [["saturated:gemma2:2b", "conceded"]]);
});

test("proteasome: a conceded rule is never re-examined, whatever recurs", () => {
  const out = h.reexamineDerivedRules({ counts: new Map([["saturated:gemma2:2b", { count: 9 }]]) });
  assert.ok(out.every((v) => v.key !== "saturated:gemma2:2b"), "conceded rules are not re-examined");
});

test("proteasome: the sense loop runs the pass — expired and recurring is re-earned, still stands", async () => {
  h._resetTrialsForTest();
  const at = new Date().toISOString();
  h.adoptDerivedRule({ ...rule("memory_pressured", "gemma2:2b"), lastEarnedAt: 0, halfLifeMs: 1 });
  const lines = [];
  for (let i = 0; i < 5; i++) lines.push(JSON.stringify({ at, act: "eva", finding: "memory_pressured", model: "gemma2:2b" }));
  const seen = [];
  const holon = h.makeRuleAuthorHolon({ logLines: () => lines, log: (m) => seen.push(m) });
  await holon.sense();
  const r = h.derivedRuleStore().find((x) => x.key === "memory_pressured:gemma2:2b");
  assert.equal(r.standing, "disclosed", "expired but recurring → re-earned, still stands");
  assert.ok(r.lastEarnedAt > 0, "the earn is refreshed");
  assert.ok(seen.some((m) => /proteasome: memory_pressured:gemma2:2b re-earned/.test(m)), "the pass discloses itself on the log");
  h.concedeDerivedRule("memory_pressured:gemma2:2b", { reason: "test cleanup" });
  h._resetTrialsForTest();
});
