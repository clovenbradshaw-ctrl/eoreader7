// proxy-api-reading.test.mjs — the response-assembly reconciliation
// (groundingGate / gatedReading, proxy-api.mjs) exercised directly: pure
// functions, no HTTP, no held-turn machinery, no Ollama model. This is the
// REAL code every response-assembly site in proxy.mjs calls (/v1/ask,
// /v1/chat/completions streaming + non-streaming, /api/chat streaming +
// non-streaming) — not a same-shaped stand-in of it. cli/tests/proxy-client*
// only cover proxy-client.mjs (the CLIENT) against a hand-built fake server;
// they never touch this reconciliation, which is exactly why the bug this
// file guards against (found investigating commit 256db92's follow-up) had
// no automated test at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { groundingGate, gatedReading } from "../../proxy-api.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROXY_SRC = fs.readFileSync(path.join(HERE, "..", "..", "proxy.mjs"), "utf8");

// The real shapes runProxyTurn (proxy-runner.mjs) hands back — read off its
// actual return object, not invented. `void`/`satisfaction` are separate
// top-level siblings of `reading`; `reading` itself, when present, is the
// narrow {schema, sentences, tally, claims, notes, answerRecord, forms}
// surface (proxy-runner.mjs ~line 8499) — it never carries void/satisfaction
// inside it.
function realVoid(overrides = {}) {
  return { shape: "single", modality: "assert", mode: "chat", questions: ["q1"], cells: [], satisfied: true, gap: null, reason: null, whatWouldSettle: null, ...overrides };
}
function realSatisfaction(overrides = {}) {
  return { ok: true, filled: 1, of: 1, failures: [], totalStrain: 0, basis: "chat void-fill check", ...overrides };
}
function narrowReading(overrides = {}) {
  return { schema: "s1", sentences: [], tally: {}, claims: [], notes: [], answerRecord: {}, forms: [], ...overrides };
}
const mechanicalRace = { winner: "mechanical", text: "computed answer", superseded: "model draft", basis: "arithmetic reached CONCLUDED" };
const modelRace = { winner: "model", text: "model prose", superseded: null, basis: "no mechanism settled this question" };

// ── groundingGate: the pure reconciliation, in isolation ────────────────────

test("groundingGate is a no-op when readingObj or race is missing", () => {
  assert.equal(groundingGate(null, modelRace), null);
  assert.equal(groundingGate(undefined, modelRace), undefined);
  const obj = { void: realVoid(), satisfaction: realSatisfaction() };
  assert.equal(groundingGate(obj, null), obj);
  assert.equal(groundingGate(obj, undefined), obj);
});

test("groundingGate downgrades void.satisfied and satisfaction.ok when the model won with zero bound claims", () => {
  const readingObj = { void: realVoid({ satisfied: true }), satisfaction: realSatisfaction({ ok: true }), reading: narrowReading({ claims: [] }) };
  const gated = groundingGate(readingObj, modelRace);
  assert.equal(gated.void.satisfied, false);
  assert.equal(gated.satisfaction.ok, false);
  assert.equal(gated.disclosed.unchecked, true);
  assert.match(gated.disclosed.basis, /no mechanism settled this question and no claim bound to a source/);
  // every OTHER field on void/satisfaction survives the downgrade untouched
  assert.equal(gated.void.shape, "single");
  assert.equal(gated.satisfaction.filled, 1);
});

test("groundingGate also reads claims off a top-level readingObj.claims (no nested .reading)", () => {
  const readingObj = { void: realVoid(), satisfaction: realSatisfaction(), claims: [] };
  const gated = groundingGate(readingObj, modelRace);
  assert.equal(gated.void.satisfied, false);
  assert.equal(gated.satisfaction.ok, false);
});

test("groundingGate leaves void/satisfaction untouched when a mechanism won the race", () => {
  const readingObj = { void: realVoid({ satisfied: true }), satisfaction: realSatisfaction({ ok: true }), reading: narrowReading({ claims: [] }) };
  const gated = groundingGate(readingObj, mechanicalRace);
  assert.equal(gated.void.satisfied, true);
  assert.equal(gated.satisfaction.ok, true);
  assert.equal(gated.disclosed, undefined);
});

test("groundingGate leaves void/satisfaction untouched when a claim actually bound to a source", () => {
  const readingObj = { void: realVoid({ satisfied: true }), satisfaction: realSatisfaction({ ok: true }), reading: narrowReading({ claims: [{ id: "c1", verdict: "bound" }] }) };
  const gated = groundingGate(readingObj, modelRace);
  assert.equal(gated.void.satisfied, true);
  assert.equal(gated.satisfaction.ok, true);
  assert.equal(gated.disclosed, undefined);
});

test("groundingGate merges into an existing disclosed object instead of clobbering it", () => {
  const readingObj = { void: realVoid(), satisfaction: realSatisfaction(), reading: narrowReading(), disclosed: { priorFlag: "kept" } };
  const gated = groundingGate(readingObj, modelRace);
  assert.equal(gated.disclosed.priorFlag, "kept");
  assert.equal(gated.disclosed.unchecked, true);
});

test("groundingGate tolerates a readingObj with no void or no satisfaction (never fabricates them)", () => {
  const readingObj = { reading: narrowReading() };
  const gated = groundingGate(readingObj, modelRace);
  assert.equal(gated.void, undefined);
  assert.equal(gated.satisfaction, undefined);
  assert.equal(gated.disclosed.unchecked, true); // the gate itself still fires and discloses
});

// ── gatedReading: the shared pick every response-assembly site now calls ────

test("gatedReading picks void/satisfaction/reading off a runProxyTurn result and gates them", () => {
  const result = { void: realVoid({ satisfied: true }), satisfaction: realSatisfaction({ ok: true }), reading: narrowReading({ claims: [] }), text: "model prose", model: "gemma2:2b" };
  const gated = gatedReading(result, modelRace);
  assert.equal(gated.void.satisfied, false);
  assert.equal(gated.satisfaction.ok, false);
  assert.equal(gated.disclosed.unchecked, true);
});

test("gatedReading — REGRESSION (256db92 follow-up): a present-but-narrow result.reading never drops the sibling void/satisfaction", () => {
  // The exact real shape: result.reading is present and narrow (no void/
  // satisfaction inside it — those are separate top-level keys on `result`).
  // The bug this guards against was `{ ...(result.reading ?? result), ... }`
  // — spreading the narrow reading alone, which has no `void`/`satisfaction`
  // keys, so both silently came out `undefined` on the wire whenever
  // result.reading was truthy.
  const result = {
    reading: narrowReading({ claims: [{ id: "c1", verdict: "bound" }] }), // present AND narrow
    void: realVoid({ satisfied: true, gap: "none" }),
    satisfaction: realSatisfaction({ ok: true, filled: 3, of: 3 }),
  };
  const gated = gatedReading(result, modelRace);
  assert.notEqual(gated.void, undefined, "void must survive a present-but-narrow result.reading");
  assert.notEqual(gated.satisfaction, undefined, "satisfaction must survive a present-but-narrow result.reading");
  assert.equal(gated.void.satisfied, true); // untouched: a claim bound to a source
  assert.equal(gated.satisfaction.ok, true);
  assert.equal(gated.satisfaction.filled, 3);
});

test("gatedReading — result.reading absent (null) still picks the sibling void/satisfaction", () => {
  const result = { reading: null, void: realVoid({ satisfied: true }), satisfaction: realSatisfaction({ ok: true }) };
  const gated = gatedReading(result, mechanicalRace);
  assert.equal(gated.reading, null);
  assert.equal(gated.void.satisfied, true);
  assert.equal(gated.satisfaction.ok, true);
});

test("gatedReading tolerates a nullish result without throwing", () => {
  const gated = gatedReading(null, modelRace);
  assert.equal(gated.void, null);
  assert.equal(gated.satisfaction, null);
  assert.equal(gated.reading, null);
});

test("gatedReading called twice with the same result/race is the same reconciliation both times (deterministic, no hidden state)", () => {
  const result = { void: realVoid({ satisfied: true }), satisfaction: realSatisfaction({ ok: true }), reading: narrowReading({ claims: [] }) };
  const a = gatedReading(result, modelRace);
  const b = gatedReading(structuredClone(result), modelRace);
  assert.deepEqual(a.void, b.void);
  assert.deepEqual(a.satisfaction, b.satisfaction);
  assert.deepEqual(a.disclosed, b.disclosed);
});

// ── cross-surface consistency: every response-assembly site shares ONE
// reconciliation, enforced at the source level (proxy.mjs) ──────────────────
//
// This is the structural half of the regression: the bug wasn't that the
// reconciliation math was wrong somewhere, it's that FOUR sites each
// re-typed `{ void: result.void ?? null, satisfaction: ..., reading: ... }`
// by hand and one of them (twice) got the surrounding spread wrong. Testing
// gatedReading's behavior in isolation (above) proves the shared function is
// correct; this proves every site actually calls the shared function instead
// of re-implementing it.

test("proxy.mjs never re-implements the void/satisfaction/reading pick inline", () => {
  assert.doesNotMatch(
    PROXY_SRC,
    /\{\s*void:\s*result\.void\s*\?\?\s*null/,
    "a response-assembly site is hand-rolling { void: result.void ?? null, ... } again instead of calling gatedReading(result, race)"
  );
});

test("proxy.mjs never calls groundingGate directly — always through the shared gatedReading", () => {
  assert.doesNotMatch(
    PROXY_SRC,
    /\bgroundingGate\s*\(/,
    "proxy.mjs should import and call gatedReading, not groundingGate — a direct call means this site's reconciliation drifted from the others again"
  );
});

test("gatedReading is wired into proxy.mjs's response-assembly sites", () => {
  const calls = PROXY_SRC.match(/\bgatedReading\s*\(/g) ?? [];
  assert.ok(calls.length >= 4, `expected gatedReading to be called at each response-assembly site (/v1/ask, /v1/chat/completions x2, /api/chat x2); found ${calls.length} call(s)`);
});
