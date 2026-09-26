// claims-from-feat-real.test.mjs -- claimsFromFeat measured against REAL
// prose through the real pipeline (buildDraft/attachReferents/attachEot/
// arrangeEssay), not synthetic feat shapes. The excerpt below is the opening
// of O. Henry's "The Gift of the Magi" (1905, public domain), chosen because
// this session already measured claimsFromFeat against it via the full text
// (58 claims from 140 points, 3 unresolved) -- this test uses a short,
// self-contained excerpt so it stays reproducible without depending on this
// session's own scratchpad files, the way native/eval/the-fold/drive-
// summary-experiment.mjs's default file paths currently do (a pre-existing
// fragility this test does not attempt to fix).
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, drawnParts } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { loadEotParser, attachEot } from "./eot-notation.js";
import { arrangeEssay } from "./arrange.js";

const GROUND = `One dollar and eighty-seven cents. That was all, and sixty cents of it was in pennies.
Pennies saved one and two at a time by bulldozing the grocer and the vegetable man and the
butcher until one's cheeks burned with the silent imputation of parsimony that such close
dealing implied. Three times Della counted it. One dollar and eighty-seven cents. And the
next day would be Christmas.

There was clearly nothing to do but flop down on the shabby little couch and howl. So Della
did it. Which instigates the moral reflection that life is made up of sobs, sniffles, and
smiles, with sniffles predominating.

While the mistress of the home is gradually subsiding from the first stage to the second,
take a look at the home. A furnished flat at eight dollars per week. It did not exactly beggar
description, but it certainly had that word on the lookout for the mendicancy squad.`;

test("claimsFromFeat produces real, holon-grounded claims from a real arrangeEssay run on real prose", async () => {
  const parser = await loadEotParser();
  const task = "Write an essay on this material.";
  const d = attachReferents(buildDraft({ task, ground: GROUND }), buildReferents(GROUND));
  attachEot(drawnParts(d).flatMap((p) => p.children), parser.parse(GROUND, "ground"));
  const outline = arrangeEssay({ draft: d });

  assert.ok(outline.claims, "arrangeEssay's return must expose claims");
  assert.ok(outline.claims.claims.length > 0, "a real passage of prose should produce at least one real claim");
  for (const c of outline.claims.claims) {
    assert.match(c.ground, /^\//, "every claim's ground is a real holon address");
    assert.ok(c.rel, "every claim has a real relation, never blank");
    assert.ok(c.roles.ARG0 && c.roles.ARG1, "every claim has both role fillers, never a half-built triple");
    assert.ok(c.polarity === "+" || c.polarity === "-", "polarity is always resolved in what's returned, never '?'");
  }
});
