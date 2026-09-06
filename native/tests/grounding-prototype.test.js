// grounding-prototype.test.js — a table keyed by words read out of MATERIAL
// may never answer with something it inherited (S77, 2026-09-06).
import test from "node:test";
import assert from "node:assert/strict";
import { abbreviationExpansion, buildUnionIndex } from "../organs/grounding.js";

test("a word the material happens to contain cannot pull a function off Object.prototype", () => {
  // The live failure: react-dom.js says "constructor" constantly, and three
  // turns of a long stream died on `for (const e of exp)` — exp was
  // Object.prototype.constructor.
  for (const w of ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__", "isPrototypeOf"]) {
    assert.equal(abbreviationExpansion(w), null, `${w} must not resolve`);
  }
  // The real entries still work.
  assert.deepEqual(abbreviationExpansion("ceo"), ["chief", "executive"]);
  assert.deepEqual(abbreviationExpansion("VP"), ["vice", "president"]);
  assert.equal(abbreviationExpansion("nonsense"), null);
});

test("buildUnionIndex survives material full of prototype names (the control: it used to throw)", () => {
  const passages = [{ text: "The constructor calls toString and valueOf; the CEO signed it in 1861." }];
  const idx = buildUnionIndex(passages);
  assert.ok(idx.words.has("constructor"));
  assert.ok(idx.numbers.has("1861"));
  // The CEO expansion still lands, so the guard did not disable the feature.
  assert.ok(idx.words.has("chief") && idx.words.has("executive"));
});
