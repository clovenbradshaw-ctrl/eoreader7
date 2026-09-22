// generate-structured-falsify.test.mjs — a document written SECTION BY
// SECTION off a real, hunted structure, then self-checked against the
// same structure it was built from (2026-09-22). Deterministic stub draw,
// no network, no real model.
import test from "node:test";
import assert from "node:assert/strict";
import { generateStructured } from "./generate-structured.js";

const FIXED_VOCAB = [
  { role: "title", order: 0 },
  { role: "headline", order: 1, patterns: [/^headline$/i] },
  { role: "dateline", order: 2, patterns: [/^dateline$/i] },
  { role: "boilerplate", order: 3, patterns: [/^boilerplate$/i] },
];

test("generateStructured: draw is called exactly once per NON-TITLE role, in the vocabulary's own order — never asked for the whole document in one call", async () => {
  const calls = [];
  const draw = async (messages) => { calls.push(messages[0].content); return "stub section text, more than a few words long here."; };
  await generateStructured("Widget Co launch", "press release", { draw, vocabulary: FIXED_VOCAB });
  // 1 title call + 3 section calls
  assert.equal(calls.length, 4);
  assert.match(calls[0], /title/i);
  assert.match(calls[1], /"Headline"/);
  assert.match(calls[2], /"Dateline"/);
  assert.match(calls[3], /"Boilerplate"/);
});

test("generateStructured: each section's ask names ONLY that section's own role — never the other roles, never the whole document's structure", async () => {
  const asks = [];
  const draw = async (messages) => { asks.push(messages[0].content); return "text"; };
  await generateStructured("topic", "press release", { draw, vocabulary: FIXED_VOCAB });
  const headlineAsk = asks[1];
  assert.doesNotMatch(headlineAsk, /dateline/i, "the Headline ask must not leak the Dateline role's name");
  assert.doesNotMatch(headlineAsk, /boilerplate/i, "the Headline ask must not leak the Boilerplate role's name");
});

test("generateStructured: the assembled document is REASSEMBLED with real headings and self-checked via matchCanonicalSections against the SAME vocabulary it was generated from", async () => {
  const draw = async (messages) => (/title/i.test(messages[0].content) ? "Widget Co Ships v2" : "Body prose for this section, written plainly and at reasonable length.");
  const r = await generateStructured("Widget Co v2 launch", "press release", { draw, vocabulary: FIXED_VOCAB });
  assert.match(r.assembled, /## Headline/);
  assert.match(r.assembled, /## Dateline/);
  assert.match(r.assembled, /## Boilerplate/);
  assert.equal(r.structureCheck.matched.length, 3, `all 3 generated sections should be found on re-read: ${JSON.stringify(r.structureCheck)}`);
  assert.equal(r.structureCheck.orderOk, true);
});

test("generateStructured: scoreAgainstExpertise is invoked ONLY when `cur` is supplied — omitted, expertiseScore stays null, never fabricated", async () => {
  const draw = async () => "some section text of reasonable length for this test fixture.";
  const withoutCur = await generateStructured("t", "press release", { draw, vocabulary: FIXED_VOCAB });
  assert.equal(withoutCur.expertiseScore, null);
  const fakeCur = { features: [{ key: "count:heading", slot: "count:heading", value: 3 }] };
  const withCur = await generateStructured("t", "press release", { draw, vocabulary: FIXED_VOCAB, cur: fakeCur });
  assert.ok(withCur.expertiseScore, "a real scoreAgainstExpertise result must be attached when cur is given");
  assert.ok(typeof withCur.expertiseScore.score === "number");
});

test("generateStructured: without a vocabulary AND no live hunt possible (network stub always empty), it still tries to hunt — proving the live-hunt fallback path exists, not silently skipped", async () => {
  const draw = async () => "text";
  const emptyWeb = { search: async () => ({ results: [] }), fetch: async () => { throw new Error("should not be called on empty search"); } };
  await assert.rejects(
    generateStructured("t", "an invented form with no real guides", { draw, huntOptions: { web: emptyWeb, minCorroboration: 2 } }),
    /no non-title role/,
    "an empty hunt correctly yields no roles, and generateStructured refuses rather than inventing sections",
  );
});

test("generateStructured: humanize turns a slug role back into plain words mechanically (never a model's paraphrase) — verified via the ask text", async () => {
  const vocab = [{ role: "title", order: 0 }, { role: "for-immediate-release", order: 1, patterns: [/x/i] }];
  const asks = [];
  const draw = async (messages) => { asks.push(messages[0].content); return "text"; };
  await generateStructured("t", "press release", { draw, vocabulary: vocab });
  assert.match(asks[1], /"For Immediate Release"/, "the slug 'for-immediate-release' becomes the plain, title-cased phrase in the ask");
});
