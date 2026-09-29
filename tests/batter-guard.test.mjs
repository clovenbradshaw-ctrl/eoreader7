// batter-guard.test.mjs — falsification of the rule-author's knownModelProbe
// guard (2026-09-29). A probe that is not a real model must never be adopted;
// the live roster and the known namespaces are the only sources of a name.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "er7-guard-test-"));
process.env.ER7_DERIVED_RULES_FILE = path.join(scratch, "derived.json");
process.env.ER7_TRIALS_FILE = path.join(scratch, "trials.json");
process.env.ER7_SETTINGS_FILE = path.join(scratch, "settings.json");
process.env.ER7_HEIMDALL_LOG_FILE = path.join(scratch, "log.jsonl");
const h = await import("../heimdall.mjs");

test("guard: the roster decides a bare model name; a synthetic probe is never known", () => {
  h.__queueTest.setOllamaModels([{ name: "gemma2:2b", contextLength: 8192 }, { name: "nomic-embed-text:latest" }]);
  assert.equal(h.knownModelProbe("gemma2:2b"), true, "on the roster");
  assert.equal(h.knownModelProbe("batter-nonexistent"), false, "a battering probe is not a model");
  assert.equal(h.knownModelProbe("llama3-nope-typo"), false);
  assert.equal(h.knownModelProbe("er7:gemma2:2b"), true, "er7: namespace");
  assert.equal(h.knownModelProbe("anthropic/claude-haiku-4-5"), true, "anthropic/ namespace");
  assert.equal(h.knownModelProbe("opencode/deepseek-v4-pro"), true, "opencode/ namespace");
  assert.equal(h.knownModelProbe("hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest"), true, "hf.co/ namespace");
  assert.equal(h.knownModelProbe("groq:llama-3.1-8b-instant"), true, "provider namespace");
  assert.equal(h.knownModelProbe(null), true, "a surface probe (not a model) is allowed");
  h.__queueTest.reset();
});

test("guard: an unread roster never admits a bare synthetic name", () => {
  h.__queueTest.setOllamaModels(null); // roster unknown — only namespaces pass
  assert.equal(h.knownModelProbe("batter-nonexistent"), false);
  assert.equal(h.knownModelProbe("er7:gemma2:2b"), true);
  h.__queueTest.reset();
});

test("guard: a holon whose candidates are synthetic adopts NOTHING", async () => {
  h._resetTrialsForTest();
  const at = new Date().toISOString();
  const lines = [];
  for (let i = 0; i < 5; i++) lines.push(JSON.stringify({ at, act: "eva", finding: "memory_pressured", model: `batter-guard-${process.pid}` }));
  const holon = h.makeRuleAuthorHolon({ logLines: () => lines, log: () => {} });
  const f = await holon.sense();
  assert.ok(f, "the floor is met — findings exist");
  const r = await holon.act(f);
  assert.equal(r.adopted, 0, "a synthetic probe must never be adopted");
  assert.ok(h.derivedRuleStore().every((x) => !x.key.includes(`batter-guard-${process.pid}`)), "no rule for the synthetic probe");
  // the SAME findings under a real name WOULD be adopted — the guard is the
  // only difference, not the floor (with the roster read; an unread roster
  // holds bare names too, and the candidate simply waits for the next tick)
  h.__queueTest.setOllamaModels([{ name: "gemma2:2b", contextLength: 8192 }]);
  const real = lines.map((l) => l.replaceAll(`batter-guard-${process.pid}`, "gemma2:2b"));
  const holon2 = h.makeRuleAuthorHolon({ logLines: () => real, log: () => {} });
  const f2 = await holon2.sense();
  const r2 = await holon2.act(f2);
  assert.ok(r2.adopted >= 1, "a real model name is adopted");
  for (const k of h.derivedRuleStore().filter((x) => x.key.includes("memory_pressured:gemma2:2b"))) h.concedeDerivedRule(k.key, { reason: "test cleanup" });
  h._resetTrialsForTest();
});