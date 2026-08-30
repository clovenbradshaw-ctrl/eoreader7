// native/tests/scoped-kind.test.js — a quantifier-bound reference resolves
// at Pattern grain (Kind), never Figure grain, via the real contest.js
// adjudicator. Checked against a non-linguistic domain before English.

import test from "node:test";
import assert from "node:assert/strict";
import { cellOf } from "../kernel/cube.js";
import { mintScopedKind, candidatesInScope, resolveInScope, MINT_CELL, RESOLUTION_CELL, SCOPED_KIND_SCHEMA } from "../kernel/scoped-kind.js";

test("cells are read off the real cube, not restated by hand", () => {
  assert.deepEqual(MINT_CELL, cellOf("SYN", "Pattern"));
  assert.equal(MINT_CELL.domain, "Structure");
  assert.equal(MINT_CELL.terrain, "Network");
  assert.equal(MINT_CELL.stance, "Composing");

  assert.deepEqual(RESOLUTION_CELL, cellOf("CON", "Pattern"));
  assert.equal(RESOLUTION_CELL.domain, "Structure");
  assert.equal(RESOLUTION_CELL.terrain, "Network");
  assert.equal(RESOLUTION_CELL.stance, "Tracing");
});

test("mintScopedKind requires every field declared, never defaulted", () => {
  assert.throws(() => mintScopedKind({ at: 0, scope: "s", key: "k" }), /id is required/);
  assert.throws(() => mintScopedKind({ id: "x", scope: "s", key: "k" }), /at is declared/);
  assert.throws(() => mintScopedKind({ id: "x", at: 0, key: "k" }), /scope is required/);
  assert.throws(() => mintScopedKind({ id: "x", at: 0, scope: "s" }), /key is required/);
});

test("mintScopedKind lands at SYN.Pattern, not SYN.Figure", () => {
  const k = mintScopedKind({ id: "k1", at: 0, scope: "scope-1", key: "donkey" });
  assert.equal(k.schema, SCOPED_KIND_SCHEMA);
  assert.deepEqual(k.cell, MINT_CELL);
});

test("candidatesInScope only ever returns candidates sharing the SAME scope", () => {
  const a = mintScopedKind({ id: "a", at: 0, scope: "farmer-1", key: "donkey" });
  const b = mintScopedKind({ id: "b", at: 1, scope: "farmer-2", key: "donkey" });
  assert.deepEqual(candidatesInScope("farmer-1", [a, b]).map((c) => c.id), ["a"]);
});

test("resolveInScope: a single candidate in scope binds via the real adjudicator", () => {
  const a = mintScopedKind({ id: "a", at: 0, scope: "farmer-1", key: "donkey" });
  const candidates = candidatesInScope("farmer-1", [a]);
  const out = resolveInScope("farmer-1", candidates, {
    scores: new Map([["a", 1]]), minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
  });
  assert.equal(out.verdict, "bound");
  assert.equal(out.key, "donkey");
  assert.deepEqual(out.cell, RESOLUTION_CELL);
});

test("two different scopes never fuse — the same key minted twice stays two referents", () => {
  const a = mintScopedKind({ id: "a", at: 0, scope: "farmer-1", key: "donkey" });
  const b = mintScopedKind({ id: "b", at: 1, scope: "farmer-2", key: "donkey" });
  assert.notEqual(a.id, b.id);
  const scoped = resolveInScope("farmer-2", candidatesInScope("farmer-2", [a, b]), {
    scores: new Map([["b", 1]]), minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
  });
  assert.equal(scoped.id, "b", "resolution within farmer-2's scope never reaches farmer-1's candidate");
});

// ── omnimodal proof: identical kernel functions, a non-linguistic domain ──

test("OMNIMODAL: 'every batch that fails a sensor logs an anomaly; it gets flagged' — per-batch anomaly, no NL anywhere", () => {
  // Manufacturing QC: each failing batch mints its OWN anomaly-kind
  // (never one specific anomaly instance shared across batches); a later
  // per-batch reference must resolve within that SAME batch's own scope.
  const batch7 = mintScopedKind({ id: "anom-b7", at: 10, scope: "batch:7", key: "ANOMALY_CODE:SENSOR_FAIL" });
  const batch9 = mintScopedKind({ id: "anom-b9", at: 12, scope: "batch:9", key: "ANOMALY_CODE:SENSOR_FAIL" });

  const resolvedForBatch7 = resolveInScope("batch:7", candidatesInScope("batch:7", [batch7, batch9]), {
    scores: new Map([["anom-b7", 1]]), minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
  });
  assert.equal(resolvedForBatch7.id, "anom-b7");
  assert.equal(resolvedForBatch7.key, "ANOMALY_CODE:SENSOR_FAIL");
});

test("ADAPTER-SHAPED: 'Every farmer who owns a donkey beats it.' — same kernel code, English keys", () => {
  // A text adapter would recognize "every farmer" as opening a quantifier
  // scope and "a donkey" as an indefinite bound within it (not built here);
  // English values stand in for what such an adapter would supply.
  const donkey = mintScopedKind({ id: "donkey-of-this-farmer", at: 0, scope: "quantifier:every-farmer#1", key: "donkey" });
  const resolved = resolveInScope("quantifier:every-farmer#1", candidatesInScope("quantifier:every-farmer#1", [donkey]), {
    scores: new Map([["donkey-of-this-farmer", 1]]), minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
  });
  assert.equal(resolved.verdict, "bound");
  assert.equal(resolved.key, "donkey");
});
