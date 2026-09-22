// tests/ground-cite.test.js — a declared claim's `ground`, checked against
// real files on disk. Against real material only (feedback_verify_gates_
// against_real_organs: a hand-written stand-in masks the real gap a
// mechanical check exists to catch) — this repo's own files, a fabricated
// path that does not exist, and text-mode's own "/p3" convention.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { gfpClaim } from "../kernel/gfp-claim.js";
import { resolveGroundFile, looksLikeFilePath, citeGround, fileUrl } from "../organs/ground-cite.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF = path.join(HERE, "..", "organs", "ground-cite.js"); // the module under test, cited against itself

test("resolveGroundFile: a real file resolves to itself, and a fabricated code SCOPE beneath it resolves to the same file", () => {
  assert.equal(resolveGroundFile(SELF), SELF);
  assert.equal(resolveGroundFile(`${SELF}/citeGround`), SELF, "a scope suffix is never itself a filesystem entry — the walk must land on the file it is a scope inside of");
  assert.equal(resolveGroundFile(`${SELF}/citeGround/deeper/still`), SELF, "any depth of fabricated scope still resolves to the one real file underneath it");
});

test("resolveGroundFile: nothing resolves for a path that does not exist, and the filesystem root is never returned", () => {
  assert.equal(resolveGroundFile(path.join(HERE, "..", "organs", "NOPE-DOES-NOT-EXIST.js")), null);
  assert.equal(resolveGroundFile("/p3"), null);
  assert.equal(resolveGroundFile("/"), null);
});

test("looksLikeFilePath: distinguishes a real absolute path from text-mode's own paragraph addressing", () => {
  assert.equal(looksLikeFilePath("/p3"), false, "reason.mjs's own JSDoc names /p3 as its paragraph-ground convention, never a file");
  assert.equal(looksLikeFilePath("/order"), false);
  assert.equal(looksLikeFilePath(SELF), true);
});

test("citeGround: \"unaddressed\" for a non-filesystem ground — never confused with a missing file", () => {
  const claim = gfpClaim({ ground: "/p3", rel: "has-type", roles: { ARG0: "x", ARG1: "int" } });
  const r = citeGround(claim, "whatever this claim says");
  assert.equal(r.verdict, "unaddressed");
  assert.equal(r.file, null);
});

test("citeGround: \"missing\" for a ground that looks like a real path but resolves to nothing", () => {
  const claim = gfpClaim({ ground: path.join(HERE, "..", "organs", "TOTALLY-MADE-UP-FILE-XYZ.js"), rel: "has-type", roles: { ARG0: "x", ARG1: "int" } });
  const r = citeGround(claim, "whatever this claim says");
  assert.equal(r.verdict, "missing");
});

test("citeGround: \"unattributed\" when the file is real but the claim's own words share nothing with it", () => {
  const claim = gfpClaim({ ground: SELF, rel: "bakes", roles: { ARG0: "sourdough", ARG1: "on tuesdays" } });
  const r = citeGround(claim, "sourdough bread baking rituals observed by penguins in the antarctic circle");
  assert.equal(r.verdict, "unattributed");
  assert.equal(r.file, SELF);
});

test("citeGround: \"cited\" — earns a real, byte-addressed, line-numbered, clickable citation against this module's own words", () => {
  const claim = gfpClaim({
    ground: SELF,
    rel: "walks",
    roles: { ARG0: "resolveGroundFile", ARG1: "a grounds holon ancestry deepest first" },
    force: "strict",
  });
  const r = citeGround(claim, "resolveGroundFile walks a ground's holon ancestry deepest-first and returns the first segment that is a real file on disk");
  assert.equal(r.verdict, "cited");
  assert.equal(r.file, SELF);
  assert.ok(Number.isInteger(r.line) && r.line >= 1, "a real 1-based line number, not a byte offset");
  assert.equal(r.url, fileUrl(SELF, r.line));
  assert.match(r.ref, /#\d+-\d+$/, "cite.js's own byte-range ref format");
  assert.ok(r.score > r.floor, "attribute()'s own two-part test: overlap AND beats the null-corpus floor");
  // The excerpt exists (for this test's own verification only — reason.mjs
  // itself never prints or persists it; see reasoning-record.js's header).
  assert.ok(r.excerpt.length > 0);
});

test("citeGround: never returns an excerpt key the caller did not ask to check — the shape stays the same across verdicts", () => {
  const claim = gfpClaim({ ground: "/p3", rel: "x", roles: { ARG0: "a", ARG1: "b" } });
  const r = citeGround(claim, "x");
  assert.equal(r.verdict, "unaddressed");
  assert.equal("excerpt" in r, false, "no file was ever read, so there is nothing to excerpt");
});
