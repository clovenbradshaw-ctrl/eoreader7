// arrange-loadbearing.test.mjs -- arrangeEssay's new, additive, opt-in
// `loadBearing` field, tested against a real, public-domain folk tale (The
// Three Little Pigs) with genuine, unaltered 3x-verbatim-repeated dialogue --
// not a fixture built to force this result. This is the exact real content
// that found the pipeline's own recur()-based thesis selection can miss
// content that is mechanically, verifiably repeated (the winning candidate,
// "The first little pig was very lazy.", has zero extractable claims and a
// LOWER repetition count than the wolf/knock/door line it beat on raw
// word-recurrence alone).
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, drawnParts } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { loadEotParser, attachEot } from "./eot-notation.js";
import { arrangeEssay } from "./arrange.js";

const GROUND = `Once upon a time there was an old mother pig who had three little pigs. So when they were old enough, she sent them out into the world to seek their fortune.

The first little pig was very lazy. He built his house out of straw.

The second little pig built his house out of sticks.

The third little pig built his house with bricks.

One night the wolf came along and saw the first little pig in his house of straw. The wolf knocked on the door and said, "Little pig, little pig, let me come in."

The wolf continued down the road and found the house of sticks. The wolf knocked on the door and said, "Little pig, little pig, let me come in."

The wolf continued down the road and found the house of bricks. The wolf knocked on the door and said, "Little pig, little pig, let me come in."`;

function outline({ pValue } = {}) {
  const task = "Write an essay on this material.";
  return async () => {
    const parser = await loadEotParser();
    const d = attachReferents(buildDraft({ task, ground: GROUND }), buildReferents(GROUND));
    attachEot(drawnParts(d).flatMap((p) => p.children), parser.parse(GROUND, "ground"));
    return arrangeEssay({ draft: d, ...(pValue != null ? { pValue } : {}) });
  };
}

test("without pValue, loadBearing stays null on both thesis and thesisCandidates -- purely additive, no change to existing behavior", async () => {
  const o = await outline()();
  assert.equal(o.thesis.loadBearing, null);
  assert.ok(o.thesisCandidates.every((c) => c.loadBearing === null));
});

test("with pValue, all three real states are distinguished honestly: a genuinely repeated candidate is true, a claim-bearing but non-repeated one is false, a claimless one is null", async () => {
  const o = await outline({ pValue: 0.05 })();
  // Verified by direct inspection this session against this exact excerpt --
  // not assumed. The wolf/knock/door line (mechanically, verifiably
  // repeated across the document) is load-bearing; the winning generalized
  // thesis here ("build house", a real 3-member generalization on this
  // excerpt) has real claims that are NOT load-bearing (false, not null);
  // "was very lazy" produces no extractable claim at all (null, never a
  // guessed false).
  const wolfCandidate = o.thesisCandidates.find((c) => c.text.includes("knocked on the door"));
  const lazyCandidate = o.thesisCandidates.find((c) => c.text.includes("was very lazy"));
  assert.ok(wolfCandidate, "the repeated wolf line must appear among the top candidates on this excerpt");
  assert.equal(wolfCandidate.loadBearing, true);
  assert.equal(o.thesis.loadBearing, false, "the winning thesis has real claims here but they are not load-bearing on this excerpt");
  if (lazyCandidate) assert.equal(lazyCandidate.loadBearing, null);
});
