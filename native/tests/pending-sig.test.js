// native/tests/pending-sig.test.js — a bounded forward reference, checked
// against a genuinely non-linguistic domain before an English one.

import test from "node:test";
import assert from "node:assert/strict";
import { cellOf } from "../kernel/cube.js";
import { openSig, checkArrival, PENDING_CELL, RESOLUTION_CELL, PENDING_SCHEMA } from "../kernel/pending-sig.js";

test("cells are read off the real cube, not restated by hand", () => {
  assert.deepEqual(PENDING_CELL, cellOf("SIG", "Figure"));
  assert.equal(PENDING_CELL.terrain, "Entity");
  assert.deepEqual(RESOLUTION_CELL, cellOf("CON", "Figure"));
  assert.equal(RESOLUTION_CELL.terrain, "Link");
});

test("openSig requires every field declared, never defaulted", () => {
  assert.throws(() => openSig({ at: 0, expiresAt: 1, matches: () => true }), /id is required/);
  assert.throws(() => openSig({ id: "s", expiresAt: 1, matches: () => true }), /at is declared/);
  assert.throws(() => openSig({ id: "s", at: 0, matches: () => true }), /expiresAt is declared/);
  assert.throws(() => openSig({ id: "s", at: 5, expiresAt: 2, matches: () => true }), /cannot precede at/);
  assert.throws(() => openSig({ id: "s", at: 0, expiresAt: 1 }), /matches is the caller's own predicate/);
});

test("a matching act within bound resolves; the schema and cell are right", () => {
  const pending = openSig({ id: "sig-1", at: 0, expiresAt: 3, matches: (act) => act.name === "target" });
  assert.equal(pending.schema, PENDING_SCHEMA);
  const out = checkArrival(pending, { id: "a1", at: 2, name: "target" });
  assert.equal(out.status, "resolved");
  assert.equal(out.resolvedBy, "a1");
  assert.deepEqual(out.cell, RESOLUTION_CELL);
});

test("a non-matching act within bound leaves the SIG open, unchanged", () => {
  const pending = openSig({ id: "sig-1", at: 0, expiresAt: 3, matches: (act) => act.name === "target" });
  const out = checkArrival(pending, { id: "a1", at: 1, name: "other" });
  assert.equal(out.status, "open");
  assert.equal(out, pending, "an unmatched act returns the identical pending object, not a new one");
});

test("the bound passing with no match expires as an honest, typed gap — never silently dropped", () => {
  const pending = openSig({ id: "sig-1", at: 0, expiresAt: 2, matches: () => false });
  const stillOpen = checkArrival(pending, { id: "a1", at: 1, name: "x" });
  assert.equal(stillOpen.status, "open");
  const expired = checkArrival(stillOpen, { id: "a2", at: 3, name: "y" });
  assert.equal(expired.status, "expired");
  assert.match(expired.detail, /expiresAt \(2\)/);
});

test("once resolved or expired, further arrivals are no-ops — a decided SIG stays decided", () => {
  const pending = openSig({ id: "sig-1", at: 0, expiresAt: 5, matches: (act) => act.name === "target" });
  const resolved = checkArrival(pending, { id: "a1", at: 1, name: "target" });
  const again = checkArrival(resolved, { id: "a2", at: 2, name: "target" });
  assert.equal(again, resolved);
});

test("an act replayed out of order (before the SIG even opened) is not this SIG's business", () => {
  const pending = openSig({ id: "sig-1", at: 5, expiresAt: 8, matches: () => true });
  const out = checkArrival(pending, { id: "a0", at: 2, name: "anything" });
  assert.equal(out.status, "open");
});

// ── omnimodal proof: identical kernel functions, a non-linguistic domain ──

test("OMNIMODAL: a PENDING-ACK in a protocol trace, matched by a later specific ACK — no NL anywhere", () => {
  let pending = openSig({ id: "pending-ack:42", at: 0, expiresAt: 5, matches: (msg) => msg.type === "ACK" && msg.seq === 42 });
  const trace = [
    { id: "m1", at: 1, type: "DATA", seq: 43 },
    { id: "m2", at: 2, type: "ACK", seq: 41 },   // wrong seq, no match
    { id: "m3", at: 4, type: "ACK", seq: 42 },   // the real ack
    { id: "m4", at: 6, type: "ACK", seq: 42 },   // arrives after resolution — must not matter
  ];
  for (const msg of trace) pending = checkArrival(pending, msg);
  assert.equal(pending.status, "resolved");
  assert.equal(pending.resolvedBy, "m3");
  assert.equal(pending.resolvedAt, 4);
});

test("ADAPTER-SHAPED: 'When she got home, Mary made dinner.' — same kernel code, English values", () => {
  // A text adapter would recognize "she" as a cataphoric pronoun (fronted
  // subordinate clause, per-sentence bound) and declare a short expiry —
  // not built here; English values stand in for what such an adapter would
  // supply.
  let pending = openSig({
    id: "sig:she", at: 0, expiresAt: 2,
    matches: (act) => act.gender === "female" && act.role === "subject",
  });
  const clauseTokens = [
    { id: "t1", at: 1, word: "got", gender: null, role: null },
    { id: "t2", at: 2, word: "Mary", gender: "female", role: "subject" },
  ];
  for (const tok of clauseTokens) pending = checkArrival(pending, tok);
  assert.equal(pending.status, "resolved");
  assert.equal(pending.resolvedBy, "t2");
});
