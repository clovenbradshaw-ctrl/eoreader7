// tests/reasoning-falsify.test.js — falsifyGfp: does a "strict" claim's own
// declared property actually catch a violation, or was it never tried. The
// GFP-core coherence tests live in reasoning-gfp.test.js; this file is the
// falsification layer beside it (organs/reasoning-lint.js's own header
// explains the distinction and cites THE-NULL-STATES.md's meta-null). No
// stubs — the real kernel/gfp-claim.js and organs/reasoning-lint.js.
import test from "node:test";
import assert from "node:assert/strict";
import { claimFromTriple } from "../kernel/gfp-claim.js";
import { falsifyGfp, lintGfp } from "../organs/reasoning-lint.js";

const C = (rel, a0, a1, o = {}) => claimFromTriple(a0, rel, a1, o);

test("declared one-valued + strict + populated: the guard is reachable", () => {
  const r = falsifyGfp([C("has-type", "x", "int", { force: "strict" })], { functional: ["has-type"] });
  assert.equal(r.counts.strict_guard_reachable, 1);
  assert.equal(r.ok, true, "a disclosure, never a conviction");
});

test("declared acyclic + strict: the reverse edge is caught, the guard is reachable", () => {
  const r = falsifyGfp([C("imports", "app", "router", { force: "strict" })], { acyclic: ["imports"] });
  assert.equal(r.counts.strict_guard_reachable, 1);
});

test("strict claim, nothing declared at all: disclosed as untested, never a silent pass", () => {
  const r = falsifyGfp([C("supports", "addr", "reopen", { force: "strict" })], {});
  assert.equal(r.counts.strict_guard_untested, 1);
  assert.equal(r.findings[0].severity, "warn");
});

test("declared under a name that doesn't match this claim's relation (a plausible typo): also untested, not a false reachable", () => {
  const r = falsifyGfp([C("has-type", "x", "int", { force: "strict" })], { functional: ["Has-Type"] });
  assert.equal(r.counts.strict_guard_untested, 1);
  assert.equal(r.counts.strict_guard_reachable, undefined);
});

test("declared one-valued but this claim never populates that role: untested, not silently skipped", () => {
  const c = { ...C("has-type", "x", "int", { force: "strict" }), roles: { ARG0: "x" } };
  const r = falsifyGfp([c], { functional: ["has-type"] });
  assert.equal(r.counts.strict_guard_untested, 1);
});

test("the meta-null, on this own check: an over-permissive identity makes the guard genuinely unreachable, and this catches that rather than reporting a false 'reachable'", () => {
  const fuzzy = (s) => String(s ?? "").slice(0, 1).toLowerCase(); // deliberately broken: collapses the probe onto the original
  const r = falsifyGfp([C("has-type", "x", "int", { force: "strict" })], { functional: ["has-type"], identity: fuzzy });
  assert.equal(r.counts.strict_guard_unreachable, 1);
  assert.equal(r.counts.strict_guard_reachable, undefined, "must not ALSO claim reachable — the two are mutually exclusive per probe");
});

test("force:\"default\" claims are never probed — nothing was asserted to hold against a counterexample", () => {
  const r = falsifyGfp([C("has-type", "x", "int")], { functional: ["has-type"] });
  assert.equal(r.findings.length, 0);
});

test("a strict DENIAL is never probed — its own affirmation would always be caught by the unconditional P/not-P rule, so probing it is uninformative by construction", () => {
  const r = falsifyGfp([C("returns", "f", "null", { polarity: "-", force: "strict" })], {});
  assert.equal(r.findings.length, 0);
});

test("falsifyGfp never mutates the real claim set lintGfp sees: running it beside lintGfp changes nothing lintGfp reports", () => {
  const claims = [C("has-type", "x", "int", { ground: "/f", force: "strict" }), C("has-type", "x", "string", { ground: "/f/block" })];
  const before = lintGfp(claims, { functional: ["has-type"] });
  falsifyGfp(claims, { functional: ["has-type"] });
  const after = lintGfp(claims, { functional: ["has-type"] });
  assert.deepEqual(after.counts, before.counts);
});

test("a claim with a pre-existing, unrelated error in the same set still gets an accurate verdict (count-delta, not a bare error check)", () => {
  // /parse's strict claim is already refuted by the deeper /parse/catch
  // claim (a real lintGfp finding) BEFORE falsifyGfp adds anything — the
  // count-delta design must still correctly attribute its OWN probe's
  // contribution on top of that pre-existing error, not get confused by it.
  const claims = [C("has-type", "result", "string", { ground: "/parse", force: "strict" }), C("has-type", "result", "null", { ground: "/parse/catch" })];
  const lint = lintGfp(claims, { functional: ["has-type"] });
  assert.equal(lint.counts.refuted_in_scope, 1, "the pre-existing error this test needs present");
  const r = falsifyGfp(claims, { functional: ["has-type"] });
  assert.equal(r.counts.strict_guard_reachable, 1);
});
