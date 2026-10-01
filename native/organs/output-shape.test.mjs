// ═══ LOVELACE ═══ the output-shape reading: a field returned in a type the worked example does not show has, in each case here, exactly ONE reading in which it is the example's value.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { shapeRewrites, applyShapeRewrites } from "./output-shape.js";

const run = (code, fn, ...a) => JSON.parse(JSON.stringify(vm.runInContext(`${code}\n${fn}(...${JSON.stringify(a)})`, vm.createContext(Object.create(null)))));

test("shapeRewrites: an array where a number is shown is its length; a numeric string where a number is shown is the number; an object holding the shown value under ONE property is that property", () => {
  assert.deepEqual(shapeRewrites({ words: ["a", "b"], t: "5540.0", who: { name: "Desk lamp", price: "$9" }, ok: 1 }, { words: 2, t: 5540, who: "Desk lamp", ok: 1 }),
    [{ key: "words", kind: "length" }, { key: "t", kind: "number" }, { key: "who", kind: "project", prop: "name" }]);
});

test("shapeRewrites does not guess: two properties hold the shown value (ambiguous), a non-numeric string, a type that already matches, a missing key, a non-object answer", () => {
  assert.deepEqual(shapeRewrites({ a: { x: "k", y: "k" } }, { a: "k" }), [], "two readings: none");
  assert.deepEqual(shapeRewrites({ n: "many" }, { n: 3 }), []); assert.deepEqual(shapeRewrites({ n: 3 }, { n: 3 }), []);
  assert.deepEqual(shapeRewrites({}, { n: 3 }), []); assert.deepEqual(shapeRewrites([1], { n: 3 }), []); assert.deepEqual(shapeRewrites({ n: [1] }, [1]), []);
  assert.deepEqual(shapeRewrites({ s: { a: 1 } }, { s: "text" }), [], "the value is nowhere in the object");
});

test("applyShapeRewrites rewrites the entry in `return { ... }` — shorthand, keyed, and an expression with its own commas — and nothing else", () => {
  const code = `function f(t) {\n  const words = t.split(" "), mean = 2.5;\n  return { words, unique: new Set(words).size, longest: words.reduce((a, b) => (b.length > a.length ? b : a), ""), avg: mean.toFixed(1), who: pick(words, 0) };\n}`;
  const out = applyShapeRewrites(code, [{ key: "words", kind: "length" }, { key: "avg", kind: "number" }, { key: "who", kind: "project", prop: "name" }]);
  assert.match(out, /words: words\.length/); assert.match(out, /avg: Number\(mean\.toFixed\(1\)\)/); assert.match(out, /who: \(pick\(words, 0\)\)\.name/);
  assert.match(out, /unique: new Set\(words\)\.size/, "an entry that was not named is untouched"); assert.match(out, /const words = t\.split\(" "\), mean = 2\.5;/, "and so is the rest of the code");
});

test("end to end on the draw that failed: `words` was the array, the example says a count — rewritten, and the function now answers", () => {
  const draw = `function wordStats(text) {\n  const words = text.split(" ");\n  const unique = new Set(words).size;\n  return { words, unique };\n}`;
  assert.deepEqual(run(draw, "wordStats", "a b a"), { words: ["a", "b", "a"], unique: 2 });
  const got = run(draw, "wordStats", "a b a"), rw = shapeRewrites(got, { words: 3, unique: 2 });
  assert.deepEqual(run(applyShapeRewrites(draw, rw), "wordStats", "a b a"), { words: 3, unique: 2 });
});

test("code that does not return an object literal, or returns a nested one, is left exactly as written", () => {
  const a = `function f() { const r = { n: [1] }; return r; }`, b = `function f() { return { n: { deep: [1] } }; }`;
  assert.equal(applyShapeRewrites(a, [{ key: "n", kind: "length" }]), a); assert.equal(applyShapeRewrites(b, [{ key: "n", kind: "length" }]), b);
});
