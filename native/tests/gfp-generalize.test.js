// tests/gfp-generalize.test.js — least-general-generalization over GFP claims
// (kernel/gfp-claim.js generalizeClaims / renderGeneralization), against the
// real kernel. Each case is pinned from a reading archon's objection of
// 2026-09-25, reproduced before it was fixed.
import test from "node:test";
import assert from "node:assert/strict";
import { claimFromTriple, generalizeClaims, renderGeneralization, caselessIdentity } from "../kernel/gfp-claim.js";

const C = (a0, rel, a1, o = {}) => claimFromTriple(a0, rel, a1, { ground: "/p1", ...o });

test("a role survives only where every claim agrees; a disagreeing role keeps every distinct value, disclosed", () => {
  const g = generalizeClaims([C("river", "shape", "town", { ground: "/p1" }), C("river", "shape", "port", { ground: "/p2" })]);
  assert.deepEqual(g.agreed, { ARG0: "river" });
  assert.deepEqual(g.varying, { ARG1: ["town", "port"] });
  assert.deepEqual(g.absent, {});
  assert.equal(g.ground, "/", "the lca of /p1 and /p2");
  assert.equal(g.polarity, "+");
  assert.equal(renderGeneralization(g), "river shape town and port");
});

test("KELSEN / KIDDER & TODD: a denial never generalizes with the assertions it denies", () => {
  assert.throws(() => generalizeClaims([C("river", "shape", "town"), C("river", "shape", "harbor", { polarity: "-" })]), /one polarity/);
  assert.throws(() => generalizeClaims([C("river", "shape", "town"), C("river", "cross", "town")]), /one relation/);
  assert.throws(() => generalizeClaims([C("river", "shape", "town")]), /at least 2/);
  const denied = generalizeClaims([C("river", "shape", "town", { polarity: "-" }), C("river", "shape", "port", { polarity: "-" })]);
  assert.equal(denied.polarity, "-", "two denials generalize as a denial");
});

test("WILLIAMS / McPHEE: every varying role is rendered, none dropped after the first", () => {
  const g = generalizeClaims([C("river", "shape", "town"), C("sea", "shape", "harbor")]);
  assert.deepEqual(g.agreed, {});
  assert.deepEqual(g.varying, { ARG0: ["river", "sea"], ARG1: ["town", "harbor"] });
  assert.equal(renderGeneralization(g), "river and sea shape town and harbor");
  const three = generalizeClaims([C("river", "shape", "town"), C("river", "shape", "port"), C("river", "shape", "valley")]);
  assert.equal(renderGeneralization(three), "river shape town, port, and valley");
});

test("LISH / KELSEN: varying values dedup under the same identity that tests agreement", () => {
  const g = generalizeClaims([C("river", "shape", "town"), C("River", "shape", "port"), C("flood", "shape", "valley")], { identity: caselessIdentity });
  assert.deepEqual(g.varying.ARG0, ["river", "flood"], "'River' is 'river' under caseless identity — kept once, the first spelling");
  const exact = generalizeClaims([C("river", "shape", "town"), C("River", "shape", "port")]);
  assert.deepEqual(exact.varying.ARG0, ["river", "River"], "under exact identity (code's default) they differ");
});

test("a role some claims lack is recorded as absent, never silently ignored", () => {
  const g = generalizeClaims([C("river", "shape", "town"), claimFromTriple("river", "shape", null, { ground: "/p2" })]);
  assert.deepEqual(g.absent, { ARG1: 1 });
  assert.deepEqual(g.varying, { ARG1: ["town"] }, "a role missing on one claim cannot be agreed");
  assert.deepEqual(g.agreed, { ARG0: "river" });
});
