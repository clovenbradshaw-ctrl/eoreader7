// conformance/tests-boundary.test.mjs — native/tests/ holds tests, and a
// test there can load its own imports.
//
// The measured failure (2026-09-29, CODING-LESSONS §79): copies of kernel/,
// adapters/text/ and conformance/ sat untracked under native/tests/ until the
// 2026-09-25 checkpoint (14dc2c5) swept them in — 146 files, outside every
// package.json test glob, so `npm test` never ran them and nothing went red.
// From native/tests/conformance/, `../organs/` resolved to nothing and
// `../kernel/` to the stale kernel copies (tests/kernel/self.js was
// kernel/self.js as of 0b0c94d): 33 of the 35 copied tests could not load.
// Worse, the copies were edited as if live — a Chomsky pin, an explosive-
// paraphrase refusal test and a relations-gfp connector fix landed only in
// them. Both checks below fired on that tree before it was removed.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.resolve(here, "../tests");

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const CODE = /\.(m?js|cjs)$/;
const TEST = /\.test\.(m?js|cjs)$/;

test("native/tests holds tests: every module under it is a test file, never a copy of a source module", () => {
  const strays = walk(testsDir).filter((f) => CODE.test(f) && !TEST.test(f)).map((f) => path.relative(testsDir, f));
  assert.deepEqual(strays, [], `not tests — a module under tests/ is run by no suite and imported by nothing it copies:\n  ${strays.join("\n  ")}`);
});

// Relative specifiers only. Static `import … from` / `export … from` and a
// bare `import "…"` are read at statement position (line start), because
// tests here hold minified-bundle fixtures as string lines —
// `'import{c as requireReact}from"./react-vendor-abc12345.js";'` in
// code-scan.test.js — and an unanchored `from "…"` read those as imports (the
// first version of this check flagged code-hunk.test.js and code-scan.test.js
// for exactly that). A dynamic `import("…")` is read anywhere; a fixture
// string holding one would be misread, and none does (2026-09-29). A
// template-literal or computed specifier cannot be resolved without running
// the file and is not checked.
const SPECIFIERS = [
  /^[ \t]*(?:import|export)\b[^'"`;]*?\bfrom[ \t]*(["'])(\.{1,2}\/[^"'\n]+)\1/gm,
  /^[ \t]*import[ \t]*(["'])(\.{1,2}\/[^"'\n]+)\1/gm,
  /\bimport[ \t]*\([ \t]*(["'])(\.{1,2}\/[^"'\n]+)\1[ \t]*\)/g,
];

test("every relative import in a test under native/tests resolves to a file", () => {
  const unresolved = [];
  for (const f of walk(testsDir).filter((x) => TEST.test(x))) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of SPECIFIERS.flatMap((re) => [...src.matchAll(re)])) {
      const target = path.resolve(path.dirname(f), m[2].split(/[?#]/)[0]);
      if (!fs.existsSync(target)) unresolved.push(`${path.relative(testsDir, f)} → ${m[2]}`);
    }
  }
  assert.deepEqual(unresolved, [], `imports that do not resolve — the test cannot load:\n  ${unresolved.join("\n  ")}`);
});
