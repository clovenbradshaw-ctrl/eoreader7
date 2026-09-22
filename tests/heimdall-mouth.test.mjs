// heimdall-mouth.test.mjs — the engine's mouth (2026-09-22): every local
// draw asks Heimdall which ON-DEVICE mouth answers fastest right now. The
// asked model when it is resident inside the promise; a warm substitute
// only when it is inside the promise AND sooner than the asked model's own
// measured time; never for a pinned caller, a spoken switch, a logit bias,
// or a model that leaves the device; sticky per turn; always disclosed.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const _scratch = fs.mkdtempSync(path.join(os.tmpdir(), "er7-mouth-test-"));
process.env.ER7_DERIVED_RULES_FILE = path.join(_scratch, "derived-rules.json");
process.env.ER7_TRIALS_FILE = path.join(_scratch, "trials.json");
process.env.ER7_SETTINGS_FILE = path.join(_scratch, "settings.json");
process.env.ER7_HEIMDALL_LOG_FILE = path.join(_scratch, "heimdall-log.jsonl"); // never the live record
delete process.env.ER7_SMALL_MOUTH; // the small mouth is picked from the roster below
const h = await import("../heimdall.mjs");

const ROSTER = [
  { name: "tiny-mouth:1b", size: 0.8e9, families: ["llama"] },
  { name: "gemma2:2b", size: 1.6e9, families: ["gemma2"] },
  { name: "qwen3:8b", size: 5e9, families: ["qwen3"] },
];
const CALM = { swapPct: 10, swapOutPerS: 0, memAvailableMb: 8000, memFreeMb: 4000, cpuIdle: 60 };

function setup({ resident = [], vitals = CALM, loadMs = null } = {}) {
  h.__tiersTest.setInstalled(ROSTER);
  h.__queueTest.setVitals(vitals);
  const local = h.inferenceHosts().find((x) => x.name === "local");
  const saved = { downAt: local.downAt, loadMs: local.loadMs, queueMs: local.queueMs };
  local.downAt = null; local.loadMs = loadMs; local.queueMs = 0;
  local.resident.clear(); local.inflightBy?.clear(); local.meanMs.clear();
  const soon = new Date(Date.now() + 60_000).toISOString();
  for (const m of resident) local.resident.set(m, soon);
  return {
    local,
    done() {
      local.resident.clear(); local.inflightBy?.clear(); local.meanMs.clear();
      Object.assign(local, saved);
      h.__tiersTest.setInstalled(null);
      h.__queueTest.setVitals(null);
    },
  };
}

test("mouth: the asked model, resident and idle, answers — not provisional", () => {
  const s = setup({ resident: ["gemma2:2b", "tiny-mouth:1b"] });
  try {
    const d = h.mouthFor("er7:gemma2:2b", { scope: {} });
    assert.equal(d.model, "gemma2:2b");
    assert.equal(d.tier, "full");
    assert.equal(d.provisional, false);
    assert.equal(d.reason, "resident_inside_promise");
  } finally { s.done(); }
});

test("mouth: a cold asked model with an unmeasured load is answered by the warm small mouth, disclosed", () => {
  const s = setup({ resident: ["tiny-mouth:1b"] });
  try {
    const scope = { sessionId: "t1" };
    const d = h.mouthFor("qwen3:8b", { scope });
    assert.equal(d.model, "tiny-mouth:1b");
    assert.equal(d.tier, "small");
    assert.equal(d.provisional, true);
    assert.equal(d.revisableBy, "qwen3:8b");
    assert.equal(d.reason, "asked_model_cold");
    assert.equal(d.fresh, true, "the first draw that chose it is marked fresh, for a one-time note");
    const out = h.servedDisclosure(scope, "qwen3:8b");
    assert.equal(out.provisional, true);
    assert.deepEqual(out.by, ["tiny-mouth:1b"]);
    assert.match(out.line, /tiny-mouth:1b on this device, because qwen3:8b wasn't loaded/);
  } finally { s.done(); }
});

test("mouth: a busy small mouth loses to a cold asked model whose measured load is sooner", () => {
  const s = setup({ resident: ["tiny-mouth:1b"], loadMs: 1000 });
  try {
    s.local.meanMs.set("tiny-mouth:1b", 5000);
    s.local.inflightBy.set("tiny-mouth:1b", 1); // 5s wait: inside the promise, but a 1s load is sooner
    const d = h.mouthFor("qwen3:8b", { scope: {} });
    assert.equal(d.model, "qwen3:8b");
    assert.equal(d.provisional, false);
    assert.equal(d.reason, "asked_model_sooner");
  } finally { s.done(); }
});

test("mouth: a cold load into a memory-pressured box is never counted as sooner", () => {
  const s = setup({ resident: ["tiny-mouth:1b"], loadMs: 1000, vitals: { ...CALM, swapPct: 97, memFreeMb: 50, memAvailableMb: 200 } });
  try {
    s.local.meanMs.set("tiny-mouth:1b", 5000);
    s.local.inflightBy.set("tiny-mouth:1b", 1);
    const d = h.mouthFor("qwen3:8b", { scope: {} });
    assert.equal(d.model, "tiny-mouth:1b", `pressure makes the load unaffordable: ${JSON.stringify(d)}`);
    assert.equal(d.reason, "asked_model_cold");
  } finally { s.done(); }
});

test("mouth: a resident asked model busy past the promise hands the draw to the idle small mouth", () => {
  const s = setup({ resident: ["gemma2:2b", "tiny-mouth:1b"] });
  try {
    s.local.meanMs.set("gemma2:2b", 10_000);
    s.local.inflightBy.set("gemma2:2b", 2); // 20s ahead — past the 12s promise
    const scope = {};
    const d = h.mouthFor("gemma2:2b", { scope });
    assert.equal(d.model, "tiny-mouth:1b");
    assert.equal(d.reason, "asked_model_past_promise");
    assert.match(h.servedDisclosure(scope, "gemma2:2b").line, /busy past the promised wait/);
  } finally { s.done(); }
});

test("mouth: never substituted when pinned — x-er7-tier exact, a spoken switch, or a logit bias", () => {
  const s = setup({ resident: ["tiny-mouth:1b"] });
  try {
    assert.equal(h.mouthFor("qwen3:8b", { scope: { tier: "exact" } }).model, "qwen3:8b");
    const spoken = {};
    h.pinTurnModel("er7:qwen3:8b", { scope: spoken });
    const d = h.mouthFor("qwen3:8b", { scope: spoken });
    assert.equal(d.model, "qwen3:8b");
    assert.equal(d.reason, "caller_pinned");
    assert.equal(h.mouthFor("qwen3:8b", { scope: {}, pinned: true }).model, "qwen3:8b", "a logit bias is computed for one tokenizer");
  } finally { s.done(); }
});

test("mouth: a model that leaves the device is never substituted and never counted as a local draw", () => {
  const s = setup({ resident: ["tiny-mouth:1b"] });
  try {
    const scope = {};
    const d = h.mouthFor("anthropic/claude-sonnet-4-6", { scope });
    assert.equal(d.model, "anthropic/claude-sonnet-4-6");
    assert.equal(d.reason, "leaves_device");
    assert.deepEqual(h.servedDisclosure(scope, "anthropic/claude-sonnet-4-6").by, []);
  } finally { s.done(); }
});

test("mouth: sticky per turn — one voice finishes it; a failed substitute is forgotten and decided again", () => {
  const s = setup({ resident: ["tiny-mouth:1b"] });
  try {
    const scope = {};
    const first = h.mouthFor("qwen3:8b", { scope });
    const second = h.mouthFor("qwen3:8b", { scope });
    assert.equal(second.model, first.model);
    assert.equal(second.reason, "sticky_turn");
    assert.equal(second.fresh, undefined, "only the first choice is fresh");
    const m = h.servedDisclosure(scope, "qwen3:8b").mouths.find((x) => x.servedBy === "tiny-mouth:1b");
    assert.equal(m.draws, 2);
    h.forgetMouth("qwen3:8b", { scope });
    assert.equal(scope.mouthByAsked.has("qwen3:8b"), false);
    // the substitute went cold: the turn decides again rather than returning to it
    s.local.resident.delete("tiny-mouth:1b");
    const third = h.mouthFor("qwen3:8b", { scope });
    assert.equal(third.model, "qwen3:8b");
    assert.equal(third.reason, "cold_no_warm_mouth");
  } finally { s.done(); }
});

test("disclosure: no substitution means no line, and the asked model is who answered", () => {
  const s = setup({ resident: ["gemma2:2b"] });
  try {
    const scope = {};
    h.mouthFor("gemma2:2b", { scope });
    const out = h.servedDisclosure(scope, "er7:gemma2:2b");
    assert.equal(out.provisional, false);
    assert.equal(out.line, null);
    assert.deepEqual(out.by, ["gemma2:2b"]);
    assert.deepEqual(h.servedDisclosure(null, "gemma2:2b").by, [], "a turn with no local draw names no local mouth");
  } finally { s.done(); }
});

test("mouth: a peek honors the turn's pins and records nothing", () => {
  const s = setup({ resident: ["tiny-mouth:1b"] });
  try {
    const scope = {};
    h.pinTurnModel("qwen3:8b", { scope });
    const p = h.mouthFor("qwen3:8b", { scope, peek: true });
    assert.equal(p.model, "qwen3:8b", "a pinned turn's retry would load its own model — the peek must say so");
    const open = {};
    const q = h.mouthFor("qwen3:8b", { scope: open, peek: true });
    assert.equal(q.provisional, true);
    assert.equal(open.mouthByAsked, undefined, "a peek memoizes nothing on the real turn");
    assert.equal(open.mouths, undefined, "and counts no draw");
  } finally { s.done(); }
});

test("small-mouth warm: never onto a daemon holding another generative model (measured: the warm evicted it)", async () => {
  const s = setup({ resident: ["gemma2:2b"] });
  try {
    const w = await h.warmSmallMouth();
    assert.equal(w.warmed, false);
    assert.equal(w.model, "tiny-mouth:1b");
    assert.match(w.reason, /would evict gemma2:2b/);
    // an embedder beside it is not a model someone is chatting with — it does not block the warm's decision
    s.local.resident.delete("gemma2:2b");
    s.local.resident.set("nomic-embed-text:latest", new Date(Date.now() + 60_000).toISOString());
    h.__queueTest.setVitals({ ...CALM, swapPct: 97, memFreeMb: 50, memAvailableMb: 200 }); // stops before any fetch
    const w2 = await h.warmSmallMouth();
    assert.doesNotMatch(String(w2.reason ?? ""), /would evict/);
  } finally { s.done(); }
});

test("warm tier: a cold asked model is answered by whatever general-purpose model IS warm — never a vision or coder model", () => {
  const s = setup({ resident: ["gemma2:2b", "qwen2.5vl:7b", "qwen2.5-coder:1.5b"] }); // the small mouth (tiny-mouth) is NOT warm
  try {
    const t = h.serveTiersFor("qwen3:8b");
    assert.deepEqual(t.map((c) => [c.tier, c.model]), [["warm", "gemma2:2b"]], "vision and coder models are never offered");
    const scope = {};
    const d = h.mouthFor("qwen3:8b", { scope });
    assert.equal(d.model, "gemma2:2b");
    assert.equal(d.tier, "warm");
    assert.match(h.servedDisclosure(scope, "qwen3:8b").line, /gemma2:2b on this device, because qwen3:8b wasn't loaded/);
  } finally { s.done(); }
});

test("warm tier ranks after the small mouth: both warm, the declared small mouth answers", () => {
  const s = setup({ resident: ["gemma2:2b", "tiny-mouth:1b"] });
  try {
    const d = h.mouthFor("qwen3:8b", { scope: {} });
    assert.equal(d.model, "tiny-mouth:1b");
    assert.equal(d.tier, "small");
  } finally { s.done(); }
});
