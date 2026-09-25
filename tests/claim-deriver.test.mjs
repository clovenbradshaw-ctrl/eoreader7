// tests/claim-deriver.test.mjs — native/organs/claim-deriver.js, pure
// decision functions driven directly with synthetic input (the same
// pattern tests/claude-code-shape-gate.test.mjs already uses). Includes
// the adversarial cases the mechanical-shortcuts design workflow flagged
// as REQUIRED before this may gate a live session: fail-safe direction
// (ambiguous, never a wrong derive), a bundled change never misread as
// clean, and the hard force:"default" invariant.
import test from "node:test";
import assert from "node:assert/strict";
import { tokenize, diffTokens, classify, deriveClaimSpec, fingerprintOf } from "../native/organs/claim-deriver.js";

test("tokenize: identifiers, numbers, strings, whitespace runs, punctuation", () => {
  assert.deepEqual(tokenize("foo(1, 'a')"), ["foo", "(", "1", ",", " ", "'a'", ")"]);
  assert.deepEqual(tokenize("a  b"), ["a", "  ", "b"], "a whitespace RUN is one token, not one per character");
  assert.deepEqual(tokenize(`"esc\\"aped"`), [`"esc\\"aped"`]);
  assert.deepEqual(tokenize(""), []);
});

test("classify: a clean identifier rename — exactly one changed region, one token each side, both identifiers", () => {
  const c = classify("const oldName = 1;", "const newName = 1;");
  assert.equal(c.status, "derived");
  assert.equal(c.kind, "identifier-rename");
  assert.equal(c.oldToken, "oldName");
  assert.equal(c.newToken, "newName");
});

test("classify: a clean literal string change", () => {
  const c = classify(`const msg = "hello";`, `const msg = "goodbye";`);
  assert.equal(c.status, "derived");
  assert.equal(c.kind, "literal-change");
  assert.equal(c.oldToken, `"hello"`);
  assert.equal(c.newToken, `"goodbye"`);
});

test("classify: a clean numeric literal change", () => {
  const c = classify("const CAP = 20;", "const CAP = 25;");
  assert.equal(c.status, "derived");
  assert.equal(c.kind, "literal-change");
  assert.equal(c.oldToken, "20");
  assert.equal(c.newToken, "25");
});

test("classify: renaming the SAME identifier at two separate occurrences is TWO regions, not derived", () => {
  const c = classify("foo(x); bar(x);", "foo(y); bar(y);");
  assert.equal(c.status, "ambiguous", "two separately-diffed occurrences must not be collapsed into one clean rename");
});

test("ADVERSARIAL — a rename bundled with a real logic change is ambiguous, never misread as a clean rename", () => {
  const c = classify("if (x > 0) { return oldName; }", "if (x >= 0) { return newName; }");
  assert.equal(c.status, "ambiguous");
  assert.ok(c.reason.includes("regions") || c.reason.includes("region"), `reason should name the multi-region cause, got: ${c.reason}`);
});

test("ADVERSARIAL — a multi-token replacement is ambiguous, not derived", () => {
  const c = classify("return oldFunc(x);", "return newFunc(x, y);");
  assert.equal(c.status, "ambiguous");
});

test("ADVERSARIAL — swapping a string literal for an identifier (kind-crossing) is ambiguous", () => {
  const c = classify(`const v = "literal";`, "const v = someVar;");
  assert.equal(c.status, "ambiguous");
});

test("ADVERSARIAL — no actual difference is ambiguous, never a false derive", () => {
  const c = classify("const x = 1;", "const x = 1;");
  assert.equal(c.status, "ambiguous");
  assert.equal(c.reason, "no token-level difference found");
});

test("diffTokens: an oversized token comparison refuses to diff (size guard) rather than doing unbounded work", () => {
  const oldToks = Array.from({ length: 2100 }, (_, i) => `id${i}`);
  const newToks = [...oldToks];
  newToks[0] = "changed";
  assert.equal(diffTokens(oldToks, newToks), null, "2100x2100 exceeds the 4,000,000 product guard");
});

test("ADVERSARIAL — a large edit with many genuinely different tokens is ambiguous (multi-region), not derived", () => {
  const oldSrc = Array.from({ length: 50 }, (_, i) => `const v${i} = ${i};`).join(" ");
  const newSrc = Array.from({ length: 50 }, (_, i) => `const v${i} = ${i + 1};`).join(" "); // every number differs
  const c = classify(oldSrc, newSrc);
  assert.equal(c.status, "ambiguous");
});

test("ADVERSARIAL — found by falsification testing: true/false/null/undefined lex as identifiers but must classify as literal-change, never 'identifier-rename' (nothing was renamed)", () => {
  const boolFlip = classify("if (x) return true;", "if (x) return false;");
  assert.equal(boolFlip.status, "derived");
  assert.equal(boolFlip.kind, "literal-change", "a boolean flip must never be labeled a rename");
  const nullish = classify("let y = null;", "let y = undefined;");
  assert.equal(nullish.status, "derived");
  assert.equal(nullish.kind, "literal-change");
});

test("ADVERSARIAL — a real identifier swapped for a keyword literal (kind-crossing) is ambiguous, not a rename or a literal-change", () => {
  const c = classify("const v = x;", "const v = true;");
  assert.equal(c.status, "ambiguous");
});

test("ADVERSARIAL — a homoglyph rename (Latin a -> Cyrillic а, different codepoint, visually identical) is ambiguous — non-ASCII does not match the identifier token shape", () => {
  const c = classify("const a = 1;", "const а = 1;");
  assert.equal(c.status, "ambiguous");
});

test("ADVERSARIAL — non-string / weird input never throws, always resolves to ambiguous", () => {
  assert.doesNotThrow(() => classify(null, undefined));
  assert.equal(classify(null, undefined).status, "ambiguous");
  assert.doesNotThrow(() => classify("", ""));
});

test("HARD INVARIANT — deriveClaimSpec's force is ALWAYS \"default\", never \"strict\", across every derivable case", () => {
  const cases = [
    ["const a = 1;", "const b = 1;"],
    [`x = "old";`, `x = "new";`],
    ["const N = 1;", "const N = 2;"],
  ];
  for (const [oldS, newS] of cases) {
    const d = deriveClaimSpec("/abs/path/file.js", oldS, newS);
    assert.equal(d.status, "derived", `expected a derived case for test fixture ${JSON.stringify([oldS, newS])}`);
    assert.equal(d.spec.claims.length, 1);
    assert.equal(d.spec.claims[0].force, "default", "claim-deriver must never emit force:strict — it has no basis to assert a semantic guarantee");
    assert.equal(d.spec.claims[0].derivedBy, "claim-deriver");
    assert.equal(d.spec.claims[0].ground, "/abs/path/file.js");
  }
});

test("deriveClaimSpec: an ambiguous classify() passes its ambiguous shape straight through, no spec built", () => {
  const d = deriveClaimSpec("/abs/path/file.js", "if (x) { a(); }", "if (x) { b(); c(); }");
  assert.equal(d.status, "ambiguous");
  assert.equal(d.spec, undefined);
});

test("fingerprintOf: same shape (different ground, different role values) -> identical fingerprint", () => {
  const claimA = { ground: "/a/b.js", rel: "identifier-rename", roles: { ARG0: "foo", ARG1: "bar" }, polarity: "+", force: "default" };
  const claimB = { ground: "/c/d.js", rel: "identifier-rename", roles: { ARG0: "baz", ARG1: "qux" }, polarity: "+", force: "default" };
  assert.equal(fingerprintOf(claimA, {}), fingerprintOf(claimB, {}));
});

test("fingerprintOf: a different rel changes the fingerprint", () => {
  const base = { ground: "/a/b.js", rel: "identifier-rename", roles: { ARG0: "foo", ARG1: "bar" }, polarity: "+", force: "default" };
  const other = { ...base, rel: "literal-change" };
  assert.notEqual(fingerprintOf(base, {}), fingerprintOf(other, {}));
});

test("fingerprintOf: a different force changes the fingerprint", () => {
  const base = { ground: "/a/b.js", rel: "holds", roles: { ARG0: "a", ARG1: "b" }, polarity: "+", force: "default" };
  const strict = { ...base, force: "strict" };
  assert.notEqual(fingerprintOf(base, {}), fingerprintOf(strict, {}));
});

test("fingerprintOf: a different declared functional flag for the same rel changes the fingerprint", () => {
  const claim = { ground: "/a/b.js", rel: "stampsCell", roles: { ARG0: "a", ARG1: "b" }, polarity: "+", force: "strict" };
  const undeclared = fingerprintOf(claim, {});
  const declaredFunctional = fingerprintOf(claim, { functional: ["stampsCell"] });
  const declaredFunctionalObj = fingerprintOf(claim, { functional: [{ rel: "stampsCell", role: "ARG0", giver: "x" }] });
  assert.notEqual(undeclared, declaredFunctional);
  assert.equal(declaredFunctional, declaredFunctionalObj, "a bare rel string and an equivalent {rel,...} object must fingerprint the same way");
});

test("fingerprintOf: ground DEPTH is part of the shape even though the literal path is not", () => {
  const shallow = { ground: "/a/b.js", rel: "holds", roles: { ARG0: "a", ARG1: "b" }, polarity: "+", force: "default" };
  const deep = { ground: "/a/b.js/someFunction", rel: "holds", roles: { ARG0: "a", ARG1: "b" }, polarity: "+", force: "default" };
  assert.notEqual(fingerprintOf(shallow, {}), fingerprintOf(deep, {}));
});
