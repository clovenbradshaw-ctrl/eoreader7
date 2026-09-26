// claim-dependencies.test.mjs -- claimDependencyIndex's own contract: two
// claims sharing a role filler are connected in the dependents index;
// claims sharing nothing are not; seedsOfClaimFiller only seeds from role
// slots, never rel/polarity. Also confirms it produces a real, non-trivial
// index on real claims from a real document (gpgp.md), not just synthetic
// fixtures.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { claimDependencyIndex, seedsOfClaimFiller } from "./claim-dependencies.js";
import { gfpClaim } from "../kernel/gfp-claim.js";
import { buildDraft, drawnParts } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { loadEotParser, attachEot } from "./eot-notation.js";
import { arrangeEssay } from "./arrange.js";

test("two claims sharing a role filler are connected in the index", () => {
  const claims = [
    gfpClaim({ ground: "/p1", rel: "estimate", roles: { ARG0: "author", ARG1: "ocean" }, id: "c1" }),
    gfpClaim({ ground: "/p2", rel: "conclude", roles: { ARG0: "study", ARG1: "ocean" }, id: "c2" }),
  ];
  const idx = claimDependencyIndex(claims);
  assert.deepEqual([...idx.get("ocean")].sort(), ["c1", "c2"]);
});

test("claims sharing no filler are never connected", () => {
  const claims = [
    gfpClaim({ ground: "/p1", rel: "estimate", roles: { ARG0: "author", ARG1: "ocean" }, id: "c1" }),
    gfpClaim({ ground: "/p2", rel: "name", roles: { ARG0: "captain", ARG1: "ship" }, id: "c2" }),
  ];
  const idx = claimDependencyIndex(claims);
  assert.ok(!idx.get("ocean")?.has("c2"));
  assert.ok(!idx.get("captain")?.has("c1"));
});

test("seedsOfClaimFiller seeds only from role slots, never rel or polarity", () => {
  assert.deepEqual(seedsOfClaimFiller("0:role:ARG0", "ocean"), ["ocean"]);
  assert.deepEqual(seedsOfClaimFiller("0:rel", "estimate"), []);
  assert.deepEqual(seedsOfClaimFiller("0:polarity", "+"), []);
});

test("produces a real, non-trivial dependency index on real claims from a real document", async () => {
  const ground = fs.readFileSync("/private/tmp/claude-501/-Users-mlacy-Documents-3-0/7e7469f2-bd6c-418b-b078-3809220b5e8b/scratchpad/summary-experiment/gpgp.md", "utf8");
  const parser = await loadEotParser();
  const d = attachReferents(buildDraft({ task: "Write an essay on this material.", ground }), buildReferents(ground));
  attachEot(drawnParts(d).flatMap((p) => p.children), parser.parse(ground, "ground"));
  const outline = arrangeEssay({ draft: d });
  const idx = claimDependencyIndex(outline.claims.claims, (c) => c.id ?? c.ground);
  const multiClaimFillers = [...idx.entries()].filter(([, ids]) => ids.size > 1);
  assert.ok(multiClaimFillers.length > 0, "a real 31-claim document should have at least one role filler shared by more than one claim");
});
