// grain-typing.test.mjs — grain-typing.js had no dedicated test file before
// this. Covers ablationPressureFor's pass-through contract specifically,
// since a real bug (embed silently dropped when forwarding to the injected
// function) was already caught once by re-reading the code this session --
// a test locks the fix in rather than relying on re-reading again later.

import test from "node:test";
import assert from "node:assert/strict";
import { ablationPressureFor, cellLabelOf } from "./grain-typing.js";

test("a settled grain passes through completely unchanged, never touching the injected mechanism", async () => {
  const settled = Object.freeze({ operator: "CON", grain: "Figure", terrain: "Link", stance: "Binding", settledAs: "verb" });
  let called = false;
  const out = await ablationPressureFor(settled, "chased", ["The", "dog", "chased", "the", "cat"], 2, {
    ablationPressure: async () => { called = true; return null; },
    embed: async () => { called = true; return []; },
    centroidSets: [{ provenance: { language: "eng", corpus: "x", giver: "x" }, centroids: {} }],
  });
  assert.equal(out, settled);
  assert.equal(called, false, "the injected mechanism must never be called on a settled grain");
});

test("a refused grain (settledAs but no spec) also passes through unchanged", async () => {
  const refused = Object.freeze({ refused: true, settledAs: "determiner" });
  const out = await ablationPressureFor(refused, "the", ["The", "dog"], 0, {
    ablationPressure: async () => ({ should: "never see this" }),
    embed: async () => [],
    centroidSets: [{ provenance: { language: "eng", corpus: "x", giver: "x" }, centroids: {} }],
  });
  assert.equal(out, refused);
});

test("a real grain_gap with no injected mechanism stays a gap, unchanged", async () => {
  const gap = Object.freeze({ grain_gap: "no category", settledAs: null });
  const out1 = await ablationPressureFor(gap, "frobnicate", ["frobnicate", "it"], 0, {});
  assert.equal(out1, gap);
  const out2 = await ablationPressureFor(gap, "frobnicate", ["frobnicate", "it"], 0, { ablationPressure: async () => ({}) /* no embed, no centroidSets */ });
  assert.equal(out2, gap);
});

test("a real grain_gap WITH an injected mechanism forwards embed and centroidSets -- the exact bug already caught once this session", async () => {
  const gap = Object.freeze({ grain_gap: "no category", settledAs: null });
  const centroidSets = [{ provenance: { language: "eng", corpus: "x", giver: "x" }, centroids: { VERB: [1, 0] } }];
  let receivedOpts = null;
  const fakeAblationPressure = async (connector, tokens, idx, opts) => {
    receivedOpts = opts;
    return { grain_gap: true, basis: "ablation-delta", revisable: true, connector, votes: [], combined: null };
  };
  const fakeEmbed = async (texts) => texts.map(() => [1, 0]);
  const out = await ablationPressureFor(gap, "frob", ["it", "will", "frob", "hard"], 2, {
    ablationPressure: fakeAblationPressure, embed: fakeEmbed, centroidSets,
  });
  assert.equal(out.basis, "ablation-delta");
  assert.equal(out.revisable, true);
  assert.equal(typeof receivedOpts.embed, "function", "embed must be forwarded to the injected function -- dropping it is the bug this test exists to catch");
  assert.equal(receivedOpts.centroidSets, centroidSets);
});

test("cellLabelOf still returns grain_gap for an ablation-pressure result -- the pressure is never merged into the settled cell shape", () => {
  const pressureResult = { grain_gap: true, basis: "ablation-delta", revisable: true, votes: [], combined: { pos: "VERB", cosine: 0.4, margin: 0.02 } };
  assert.equal(cellLabelOf(pressureResult), "grain_gap");
});
