// staging-machinery.test.mjs — the omnilingual read gate on stored discovered
// framings (fortune-prior.js). The sidecar once REC'd an exposition framing
// whose staging was the machine's own self-account ("The web is hunted and
// appended.", "The genre material is hunted and appended, never assumed.") —
// recorded before the live omnilingual gate existed, then read back to plan
// essays around machinery prose, run after run. The read gate purges it; a
// clean discovered framing must never be caught by it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stagingIsMachinery, framingFor } from "./fortune-prior.js";

test("the machine's recorded self-account is refused at read (historical purge)", () => {
  assert.equal(stagingIsMachinery(["The web is hunted and appended.", "The genre material is hunted and appended, never assumed."]), true);
});

test("a clean discovered framing passes the read gate", () => {
  assert.equal(stagingIsMachinery(["the moment of no return", "the quiet after"]), false);
  assert.equal(stagingIsMachinery(["introduction", "rising action", "climax", "falling action", "resolution"]), false);
  assert.equal(stagingIsMachinery(["The ship rocks violently, a sudden lurch"]), false);
});

test("OMNILINGUAL FALSIFYING CONTROL: a genuine beat about a hunt passes — the gate keys on the machine's self-account, never the word 'hunt'", () => {
  assert.equal(stagingIsMachinery(["the chase across the open field", "the hunted becomes the hunter"]), false);
});

test("framingFor skips a refused framing and returns the prior clean one (append-only, never forgets — the read gate decides)", () => {
  const prior = {
    entries: [
      { genre: "exposition", medium: "text", framing: { staging: ["the moment of no return"] }, basis: "clean", readAt: "2026-01-01" },
      { genre: "exposition", medium: "text", framing: { staging: ["The web is hunted and appended."] }, basis: "polluted", readAt: "2026-01-02" },
    ],
  };
  const f = framingFor(prior, { genre: "exposition", medium: "text" });
  assert.ok(f, "a framing is still returned");
  assert.deepEqual(f.framing.staging, ["the moment of no return"], "the polluted latest is skipped; the clean prior stands");
});

test("an entirely polluted genre reads as no discovered framing (the register's own staging stands)", () => {
  const prior = {
    entries: [
      { genre: "report", medium: "text", framing: { staging: ["The genre material is hunted and appended, never assumed."] }, basis: "polluted", readAt: "2026-01-02" },
    ],
  };
  assert.equal(framingFor(prior, { genre: "report", medium: "text" }), null);
});