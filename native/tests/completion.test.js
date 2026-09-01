// native/tests/completion.test.js — a declared-absent slot resolves by the
// same CON·Figure cell and the same contest.js adjudicator ordinary
// reference resolution already uses. No mock: `resolveAbsence` calls the
// real `adjudicate`, so a change to that organ's own contract would break
// this file too, not silently drift from it.

import test from "node:test";
import assert from "node:assert/strict";
import { cellOf } from "../kernel/cube.js";
import { declareAct, candidatesFor, resolveAbsence, ABSENCE_CELL, RESOLUTION_CELL, ABSENCE_SCHEMA } from "../kernel/completion.js";

test("cells are read off the real cube, not restated by hand", () => {
  assert.deepEqual(ABSENCE_CELL, cellOf("NUL", "Figure"));
  assert.equal(ABSENCE_CELL.domain, "Existence");
  assert.equal(ABSENCE_CELL.terrain, "Entity");
  assert.equal(ABSENCE_CELL.stance, "Dissecting");

  assert.deepEqual(RESOLUTION_CELL, cellOf("CON", "Figure"));
  assert.equal(RESOLUTION_CELL.domain, "Structure");
  assert.equal(RESOLUTION_CELL.terrain, "Link");
  assert.equal(RESOLUTION_CELL.stance, "Binding");
});

test("declareAct types every expected-but-unfilled role as a NUL, and nothing else", () => {
  const { act, absences } = declareAct({
    id: "a2", at: 1, schema: "s",
    expectedRoles: ["x", "y", "z"],
    filled: { x: "given" },
  });
  assert.equal(act.filled.x, "given");
  assert.equal(absences.length, 2);
  assert.deepEqual(absences.map((a) => a.role).sort(), ["y", "z"]);
  for (const a of absences) {
    assert.equal(a.schema, ABSENCE_SCHEMA);
    assert.equal(a.op, "NUL");
    assert.equal(a.forSchema, "s");
    assert.equal(a.actId, "a2");
  }
});

test("a fully-filled act produces zero absences — nothing manufactures a gap that was never expected", () => {
  const { absences } = declareAct({ id: "a1", at: 0, schema: "s", expectedRoles: ["x"], filled: { x: "v" } });
  assert.equal(absences.length, 0);
});

test("required fields are declared, never defaulted", () => {
  assert.throws(() => declareAct({ id: "a", schema: "s", expectedRoles: ["x"] }), /at is declared/);
  assert.throws(() => declareAct({ id: "a", at: 0, expectedRoles: ["x"] }), /schema is required/);
  assert.throws(() => declareAct({ id: "a", at: 0, schema: "s" }), /expectedRoles/);
});

test("candidatesFor: same schema, strictly earlier, and the role actually filled — nothing else qualifies", () => {
  const absence = declareAct({ id: "a3", at: 10, schema: "s", expectedRoles: ["x"], filled: {} }).absences[0];
  const priorActs = [
    { id: "a1", at: 1, schema: "s", filled: { x: "early" } },     // qualifies
    { id: "a2", at: 5, schema: "s", filled: {} },                  // wrong: x not filled
    { id: "a0", at: 2, schema: "other", filled: { x: "wrong-schema" } }, // wrong: different schema
    { id: "a4", at: 20, schema: "s", filled: { x: "later" } },     // wrong: not earlier
  ];
  const candidates = candidatesFor(absence, priorActs);
  assert.deepEqual(candidates.map((c) => c.id), ["a1"]);
  assert.equal(candidates[0].value, "early");
});

test("resolveAbsence: one clean candidate binds via the real adjudicator", () => {
  const absence = declareAct({ id: "a2", at: 1, schema: "s", expectedRoles: ["x"], filled: {} }).absences[0];
  const candidates = [{ id: "a1", at: 0, value: "the-value" }];
  const out = resolveAbsence(absence, candidates, {
    scores: new Map([["a1", 1]]),
    minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
  });
  assert.equal(out.verdict, "bound");
  assert.equal(out.value, "the-value");
  assert.deepEqual(out.cell, RESOLUTION_CELL);
});

test("resolveAbsence: no candidate resolves to an honest gap, never a guess", () => {
  const absence = declareAct({ id: "a1", at: 0, schema: "s", expectedRoles: ["x"], filled: {} }).absences[0];
  const out = resolveAbsence(absence, [], { scores: new Map(), minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5 });
  assert.equal(out.verdict, "no_candidate");
  assert.equal(out.value, null);
});

test("resolveAbsence: two equally-recent candidates fail the margin — an ambiguous ellipsis is refused, not guessed", () => {
  const absence = declareAct({ id: "a3", at: 2, schema: "s", expectedRoles: ["x"], filled: {} }).absences[0];
  const candidates = [{ id: "a1", at: 0, value: "one" }, { id: "a2", at: 1, value: "two" }];
  const out = resolveAbsence(absence, candidates, {
    scores: new Map([["a1", 1], ["a2", 1]]),
    minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
  });
  // adjudicate() still names the leading candidate for diagnostic
  // transparency even when it refuses to commit — the same posture its own
  // BELOW_FLOOR/NO_MARGIN branches take (a caller who wants a resolved
  // ellipsis must gate on `verdict === "bound"`, not on `value` being null).
  assert.notEqual(out.verdict, "bound", "an ambiguous ellipsis must not verdict as bound");
  assert.equal(out.value, "one", "the leading candidate is still surfaced for disclosure, not hidden");
});

// ── omnimodal proof: the identical kernel functions, a non-linguistic domain ──

test("OMNIMODAL: an elided cadence resolves to the phrase's own prior resolution — no NL anywhere", () => {
  // A "phrase" schema: tonic / dominant / resolution. A repeated phrase
  // that omits its own resolution is a real notational device (an elided
  // final cadence implying "as before") — the composer's ellipsis, not
  // English's. Roman-numeral chord symbols only; no word tokens.
  const phrase1 = declareAct({
    id: "phrase-1", at: 0, schema: "phrase",
    expectedRoles: ["tonic", "dominant", "resolution"],
    filled: { tonic: "I", dominant: "V", resolution: "I" },
  });
  const phrase2 = declareAct({
    id: "phrase-2", at: 16, schema: "phrase",
    expectedRoles: ["tonic", "dominant", "resolution"],
    filled: { tonic: "I", dominant: "V" }, // resolution elided
  });
  assert.equal(phrase2.absences.length, 1);
  const absence = phrase2.absences[0];
  assert.equal(absence.role, "resolution");

  const candidates = candidatesFor(absence, [phrase1.act]);
  const out = resolveAbsence(absence, candidates, {
    scores: new Map([["phrase-1", 1]]),
    minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
  });
  assert.equal(out.verdict, "bound");
  assert.equal(out.value, "I", "the elided cadence resolves to the earlier phrase's own resolution chord");
});

test("ADAPTER-SHAPED: VP-ellipsis over a departure-event schema — same kernel code, English values", () => {
  // "John left the party early." / "Mary did too." — a text adapter would
  // extract these acts from relations.js's own SVO output (not built here);
  // this proves the kernel side of that pipeline with real English values
  // standing in for what such an adapter would supply.
  const act1 = declareAct({
    id: "s1", at: 0, schema: "departure",
    expectedRoles: ["agent", "location", "manner"],
    filled: { agent: "John", location: "the party", manner: "early" },
  });
  const act2 = declareAct({
    id: "s2", at: 1, schema: "departure",
    expectedRoles: ["agent", "location", "manner"],
    filled: { agent: "Mary" },
  });
  assert.deepEqual(act2.absences.map((a) => a.role).sort(), ["location", "manner"]);

  const resolved = act2.absences.map((absence) => {
    const candidates = candidatesFor(absence, [act1.act]);
    return resolveAbsence(absence, candidates, {
      scores: new Map([["s1", 1]]),
      minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
    });
  });
  const byRole = Object.fromEntries(resolved.map((r) => [r.role, r.value]));
  assert.equal(byRole.location, "the party");
  assert.equal(byRole.manner, "early");
});
