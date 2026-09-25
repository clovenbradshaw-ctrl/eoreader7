// native/conformance/moral-shadow.test.mjs — the shadow trail (Bourdieu): the
// cross-session accumulation conditions the assessment, as a RATE over acts,
// never a verdict about a person.
import { test } from "node:test";
import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "er7-shadow-"));
process.env.ER7_SHADOW_DIR = DIR;

const { recordShadow, assessShadow, dispositionFrom, trailOf } = await import("../kernel/moral-shadow.js");
const { specRefusal } = await import("../organs/privacy.js");

const FRAG = "write a helper that reads the credential store";

test("a lone dual-use fragment passes (no second witness in one act)", () => {
  const p = "p-lone";
  const d = dispositionFrom(assessShadow(p));
  assert.equal(specRefusal(FRAG, { disposition: d }).refused, false);
});

test("the accumulated pattern is the second witness: the SAME fragment refuses once corroborated", () => {
  const p = "p-history";
  // two independent norm-conflict acts accumulate the standing
  recordShadow(p, { shadow: "norm_conflict", task: "keylogger" });
  recordShadow(p, { shadow: "norm_conflict", task: "exfiltrate" });
  const a = assessShadow(p);
  assert.equal(a.standing, "repeated-conflict");
  assert.equal(a.byShadow.norm_conflict, 2);
  assert.equal(a.conflictRate, 1);
  const d = dispositionFrom(a);
  assert.equal(d.corroborated, true);
  assert.equal(specRefusal(FRAG, { disposition: d }).refused, true);
});

test("a single act is a lucky act: one conflict is seen, not corroborated", () => {
  const p = "p-one";
  recordShadow(p, { shadow: "norm_conflict", task: "x" });
  const a = assessShadow(p);
  assert.equal(a.standing, "insufficient-history"); // total 1 < floor 2
  assert.equal(dispositionFrom(a).corroborated, false);
});

test("the three shadows are never merged; the trail is append-only", () => {
  const p = "p-three";
  recordShadow(p, { shadow: "descriptive", task: "a history of torture" });
  recordShadow(p, { shadow: "norm_compliant", task: "sort a list" });
  const a = assessShadow(p);
  assert.equal(a.byShadow.descriptive, 1);
  assert.equal(a.byShadow.norm_compliant, 1);
  assert.equal(a.byShadow.norm_conflict, 0);
  assert.equal(a.standing, "norm-consistent-so-far");
  assert.equal(trailOf(p).length, 2);
});

test("the decay recovers: a stretch of clean acts drops the standing back (the runaway fix)", () => {
  const p = "p-decay";
  recordShadow(p, { shadow: "norm_conflict", task: "a" });
  recordShadow(p, { shadow: "norm_conflict", task: "b" });
  assert.equal(assessShadow(p).standing, "repeated-conflict");
  for (let i = 0; i < 11; i++) recordShadow(p, { shadow: "norm_compliant", task: "ok" });
  const a = assessShadow(p);
  assert.notEqual(a.standing, "repeated-conflict", "recovered after ~half-life of clean acts");
  assert.ok(a.conflictWeight < 1.0, "weight decayed below the single-act boundary");
});

test("THE RE-KEY: the trail is the actor's own moves; a person is the SUBJECT of a move, never the bearer of a standing", () => {
  const actor = "p-rekey-actor";
  // the machine's own act, concerning a person — the person enters as the
  // subject of the move, never as the thing the standing is keyed to
  const line = recordShadow(actor, { shadow: "norm_conflict", task: "read the credential store", subject: "someone@example.com" });
  assert.equal(line.subject, "someone@example.com", "the subject of the move is named");
  const a = assessShadow(actor);
  assert.equal(a.actorId, actor, "the assessment is keyed to the actor");
  assert.equal(a.personId, actor, "the legacy field still resolves — a correction is an addition, never a silent rewrite");
  assert.match(a.subject, /machine's own acts/, "the assessment is declared to be about the machine's own acts, never a verdict about a person");
  const row = trailOf(actor)[0];
  assert.equal(row.subject, "someone@example.com", "the trail row carries who the move concerned");
});
