import test from "node:test";
import assert from "node:assert/strict";
import { consensus, zonesOf, describeConsensus, FLOOR } from "./comp-consensus.js";

const zone = (kind, y, extra = {}) => ({ id: `z${y}`, kind, at: { x: 0, y: y * 1000, w: 400, h: 100 }, fields: extra.fields ?? [], n: extra.n, entry: extra.entry });
const spec = (zones, fields = [], dark = false) => ({ canvas: { width: 400, height: 1000 }, zones, fields, palette: [{ rgb: dark ? [10, 10, 12] : [250, 250, 250], frac: 0.7 }] });
const field = (id, role) => ({ id, role });
const pattern = (n, extraKind = null, dark = false) => spec([
  zone("chrome", 0.01), zone("title", 0.05, { fields: ["a"] }), zone("summary", 0.2, { fields: ["b", "c"] }), zone("strip", 0.45, { n }), zone("list", 0.7, { n: 5, entry: "entry" }),
  ...(extraKind ? [zone(extraKind, 0.9)] : []),
], [field("a", "title"), field("b", "headline"), field("c", "caption")], dark);

test("chrome is the device's: it is dropped before anything is counted", () => {
  assert.deepEqual(zonesOf(pattern(4)).map((z) => z.kind), ["title", "summary", "strip", "list"]);
});

test("what recurs across comps is the pattern: kinds in >= 2 comps, in median top-to-bottom order, with the median count and its spread", () => {
  const c = consensus([pattern(3), pattern(4), pattern(4, "tabs"), pattern(5), pattern(4)], { seed: 3 });
  assert.equal(c.comps, 5);
  assert.deepEqual(c.kinds.map((k) => k.kind), ["title", "summary", "strip", "list"]);
  const strip = c.kinds.find((k) => k.kind === "strip");
  assert.equal(strip.n.median, 4); assert.equal(strip.n.min, 3); assert.equal(strip.n.max, 5);
  assert.ok(!c.kinds.some((k) => k.kind === "tabs"), "a kind seen in one comp is that comp's own, not the pattern");
  assert.deepEqual(c.kinds.find((k) => k.kind === "summary").roles.map((r) => r.role).sort(), ["caption", "headline"]);
});

test("one comp is an instance, not a pattern: fewer than the floor is refused by name, never echoed", () => {
  const c = consensus([pattern(4)]);
  assert.equal(c.refused.type, "too_few_comps"); assert.equal(c.kinds.length, 0); assert.ok(FLOOR >= 2);
});

test("CONTROL built to fail: comps whose zone kinds are unrelated do not produce a pattern the null cannot explain", () => {
  const kinds = ["title", "summary", "strip", "list", "tabs", "rows", "facts", "entry"];
  let s = 7; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const specs = Array.from({ length: 6 }, () => spec(Array.from({ length: 3 }, (_, i) => zone(kinds[Math.floor(rnd() * kinds.length)], 0.2 + i * 0.25))));
  const c = consensus(specs, { seed: 5 });
  assert.ok(c.order.length <= 1, `random zone kinds must not yield a layout (got ${c.order.join(",")})`);
});

test("the structured harvest beats the same control that the random one fails", () => {
  const c = consensus([pattern(4), pattern(4), pattern(3), pattern(5), pattern(4), pattern(4), pattern(4), pattern(3)], { seed: 5 });
  assert.deepEqual(c.order, ["title", "summary", "strip", "list"]);
  assert.equal(consensus([pattern(4), pattern(4), pattern(3)], { seed: 5 }).order.length, 0, "three comps cannot beat the null, however alike they are: the harvest is too small and says so");
  assert.match(describeConsensus(c), /a title, then a summary, then a strip of about 4 cards, then a list of about 5 entries/);
});

test("a palette is not reasoned over as structure; only light or dark, with its split", () => {
  const c = consensus([pattern(4, null, true), pattern(4, null, true), pattern(4, null, false)]);
  assert.deepEqual(c.scheme, { light: 1, dark: 2 });
});
