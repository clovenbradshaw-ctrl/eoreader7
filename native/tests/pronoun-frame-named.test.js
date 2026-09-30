import test from "node:test";
import assert from "node:assert/strict";
import { createSession, admitChunked, sessionCast } from "../legacy-ported/packages/host/corpus.js";

// A frame carrying both a name and a pronoun used to be skipped in silence;
// it is now a typed gap carrying the frame's own contested set (2026-09-28).
test("a named frame's pronoun lands as pronoun_frame_named with the frame's contested referents, never as silence", () => {
  const text = "Pierre Bezukhov came to Moscow. Pierre Bezukhov met Andrew Bolkonsky at the club. After a long evening Pierre Bezukhov and Andrew Bolkonsky parted, and he went home. He slept.";
  const s = createSession(); admitChunked(s, { text, sourceId: "t", language: "en" });
  const c = sessionCast(s, { sourceId: "t" });
  const named = c.pronounGaps.filter((g) => g.reason === "pronoun_frame_named");
  assert.equal(named.length, 1);
  assert.equal(named[0].pronoun, "he");
  assert.equal(text.slice(named[0].offset, named[0].offset + 2), "he", "the gap's offset reads back as the pronoun");
  assert.deepEqual([...named[0].contested].sort(), ["ref:auto:andrew", "ref:auto:bezukhov"]);
  assert.ok(c.pronounGaps.some((g) => g.reason === "pronoun_no_candidate" && /^he$/i.test(g.pronoun)), "the frame with no name still takes the binder's own road");
});
