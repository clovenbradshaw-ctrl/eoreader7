// native/tests/charter-gate-conformance.test.js — falsifiability pin for the
// three code-level gaps closed in charter.js / proxy-runner.mjs this session:
//
//   1. SILENT DISARM — a cached charter must be validated before it is
//      trusted; an empty/gutted charter must never pass everything.
//   2. THE GIVER RIDES THE RESULT — giver + a sha256 of the source text
//      actually built from must be present on every charter object.
//   3. THIS FILE ITSELF — constitution II.10, "an unfalsified gate reports
//      unmeasured, never pass": the gate must be shown REACHABLE (it can
//      actually return "conflict"), not merely present in the import graph.
//
// Kept separate from native/tests/charter.test.js (which pins the organ's
// own voice-discrimination behaviour) so this file reads as the record of
// what this session's fix was checked against.
import test from "node:test";
import assert from "node:assert/strict";
import { buildUdhCharter, defaultCharter, charterVerdict, isValidCharter } from "../organs/charter.js";

test("(a) the gate is REACHABLE — a clearly prescriptive+prohibited string returns verdict conflict, not just 'present'", () => {
  const charter = defaultCharter();
  const v = charterVerdict({ charter, text: "we should torture prisoners" });
  assert.equal(v.verdict, "conflict", "a guard that is never reached passes forever (P88) — this proves it is reached");
  assert.ok(v.conflicts.length > 0, "names at least one conflict");
  assert.ok(v.conflicts.some((c) => c.kind === "licenses_prohibited"), "names the licensed-prohibited-act shape");
});

test("(b) a charter built from empty text is invalid, and must not be trusted to govern anything", () => {
  const empty = buildUdhCharter("");
  assert.equal(Object.keys(empty.prohibitions).length, 0, "no prohibitions extracted from empty text");
  assert.equal(Object.keys(empty.protections).length, 0, "no protections extracted from empty text");

  // Prove the danger is real, not theoretical: an ungated empty charter
  // passes even a blatant conflict, because it has nothing to conflict WITH.
  // This is exactly the SILENT DISARM shape — an empty/gutted charter that
  // would let everything through if a cache boundary trusted it blindly.
  const dangerVerdict = charterVerdict({ charter: empty, text: "we should torture prisoners" });
  assert.equal(dangerVerdict.verdict, "pass", "an empty charter has nothing to conflict with — it would silently pass everything");

  // isValidCharter is the check a cache boundary (proxy-runner.mjs's
  // globalThis.__er7Charter) must run before trusting whatever is already
  // sitting there; on an invalid charter, the caller falls back to
  // defaultCharter() rather than passing everything.
  assert.equal(isValidCharter(empty), false, "an empty-text charter fails validation");
  assert.equal(isValidCharter(null), false, "no charter at all fails validation");
  assert.equal(isValidCharter({}), false, "an object missing every field fails validation");
  assert.equal(isValidCharter({ giver: "x", prohibitions: {}, protections: { a: 1 } }), false, "zero prohibitions still fails validation");
  assert.equal(isValidCharter({ giver: "x", prohibitions: { a: 1 }, protections: {} }), false, "zero protections still fails validation");
  assert.equal(isValidCharter({ giver: "   ", prohibitions: { a: 1 }, protections: { b: 1 } }), false, "a blank giver still fails validation");
  assert.equal(isValidCharter(defaultCharter()), true, "defaultCharter() is always a valid replacement for an invalid cache");
});

test("(c) the returned result always includes a non-empty giver string, and a sha256 of the source text it was built from", () => {
  const fallback = defaultCharter();
  assert.equal(typeof fallback.giver, "string");
  assert.ok(fallback.giver.trim().length > 0, "giver is never empty");
  assert.equal(typeof fallback.sha256, "string");
  // sha256hex.js (native/adapters/text/sha256hex.js) is this project's own
  // browser-safe SHA-256 organ; its own header documents the truncation to
  // the first 32 hex chars as "the project's short-digest convention" — this
  // is not a security digest, only a stable content-address for telemetry.
  assert.equal(fallback.sha256.length, 32, "the project's short-digest convention (sha256hex.js), 32 hex chars");
  assert.ok(/^[0-9a-f]{32}$/.test(fallback.sha256), "sha256 is lowercase hex");

  // Two different source texts must not be indistinguishable to a caller —
  // the whole point of shipping the hash is telling which charter governed.
  const custom = buildUdhCharter("Everyone has the right to life.", { giver: "custom giver" });
  assert.equal(custom.giver, "custom giver");
  assert.notEqual(custom.sha256, fallback.sha256, "different source text hashes differently");

  // The same source text is byte-stable across builds — a content hash, not
  // a random id.
  const rebuilt = buildUdhCharter("Everyone has the right to life.", { giver: "another giver" });
  assert.equal(custom.sha256, rebuilt.sha256, "identical source text hashes identically regardless of giver");
});
