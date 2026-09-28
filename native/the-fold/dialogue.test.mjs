// dialogue.test.mjs — MECHANICALLY PORTED (2026-09-28), the one
// self-contained regression carried over from the-fold's own
// dialogue.test.mjs (imports only `fold` from dialogue.js, so it needs
// none of the-fold's other files — correction.js, answerable.js,
// transcript.js, cast.js — that are not vendored into this directory).
// The rest of the-fold's dialogue.test.mjs suite is NOT ported here: it
// pulls in those four extra files, which is out of scope for the
// dialogue.js consolidation fix this test pins (see
// native/docs/ORGAN-CONSOLIDATION-2026-09.md). If the-fold's own
// "fold() does not corrupt Cyrillic й" case changes, re-port it the same
// mechanical way.
import test from "node:test";
import assert from "node:assert/strict";
import { fold } from "./dialogue.js";

test("fold() does not corrupt Cyrillic й — NFD decomposes it into и + COMBINING BREVE (U+0306), a different letter of the alphabet, never a decorated и, unlike a genuine Latin accent (found live, 2026-09-15, cross-lingual testing of identitySwapped/P221: fold('мой') === fold('мои') before this fix)", () => {
  assert.notEqual(fold("мой"), fold("мои"), "two distinct real Russian words ('my' vs 'mine[pl]') must not fold to the same string");
  assert.notEqual(fold("чай"), fold("чаи"), "'tea' vs 'teas' must stay distinct too");
  // Every other diacritic keeps folding exactly as before — this fix
  // excludes ONLY U+0306 (combining breve), not the whole combining-marks
  // block.
  assert.equal(fold("Natásha"), "natasha");
  assert.equal(fold("Bezúkhov"), "bezukhov");
  assert.equal(fold("Peñasco"), "penasco");
  assert.equal(fold("über"), "uber");
});
