// native/tests/reach-real-code.test.js — the real-code check of the derivation, enforced.
//
// eval/reach/real-code.mjs asks whether the derived lines contain the lines that
// depend on a declaration, in unconstructed modules of this repository, judged by
// the TypeScript reference finder. This file tests the instrument (planted cases
// built to fail), pins the frozen material, and re-derives the committed table so
// the numbers in it cannot drift from what the code computes.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import * as R from "../eval/reach/real-code.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = R.loadTypescript();
const noTs = ts ? false : "typescript unavailable (set ER7_TS); the analyzer is the ground truth, so nothing can be checked without it";

test("the metrics discriminate: known dependents rank first for the derivation and not for locality; a region that shares nothing with them scores zero", () => {
  const text = ["const alpha = () => 1;", "const gap = 0;", "const other = 2;", "const one = alpha();", "let skip = 3;", "const two = alpha();", ""].join("\n");
  const decl = { name: "alpha", region: "const alpha = () => 1;", regionLine: 1, truth: [4, 6] };
  const r = R.evaluate(text, decl);
  assert.equal(r.rPrecision, 1, "the two lines that share `alpha` outrank the lines that share only the keyword");
  assert.equal(r.recallAll, 1);
  assert.equal(r.identifier, 1);
  assert.equal(r.proximity, 0, "the nearest lines (2 and 3) are not the dependents: locality is a real competitor and here it loses");
  assert.ok(r.random >= 0 && r.random < 1);
  // the control built to fail: the same truth, a region that shares no name with any line
  const wrong = R.evaluate(text, { ...decl, region: "let skip = 3;", regionLine: 5 });
  assert.equal(wrong.rPrecision, 0);
  assert.equal(wrong.recallAll, 0);
  assert.equal(wrong.worstRank, Infinity);
  // and the leak this derivation really has, pinned: the body of a function shares its parameter names with its first line
  const fn = ["function alpha(value) {", "  return value;", "}", "", "const one = alpha(1);", "const two = alpha(3);", ""].join("\n");
  const leak = R.evaluate(fn, { name: "alpha", region: "function alpha(value) {", regionLine: 1, truth: [5, 6] });
  assert.equal(leak.recallAll, 1);
  assert.ok(leak.rPrecision < 1, "the parameter `value` pulls the function's own body line into the top ranks — why R-precision on real code is about half");
});

test("the frozen material is the material: every fixture matches its manifest hash, and the commit is named", () => {
  const fx = R.fixtureFiles();
  assert.ok(fx, "eval/fixtures/real-code/MANIFEST.json exists (node native/eval/reach/real-code.mjs --freeze)");
  assert.match(fx.manifest.commit, /^[0-9a-f]{40}$/);
  assert.ok(fx.files.length >= 20, `enough files to measure on (${fx.files.length})`);
  for (const f of fx.files) {
    const text = fs.readFileSync(f.file, "utf8");
    assert.equal(crypto.createHash("sha256").update(text).digest("hex"), f.sha256, `${f.rel}: the fixture is unmodified`);
    assert.equal(text.split("\n").length, f.lines);
  }
});

test("the ground truth is semantic, not a text match: a shadowing local of the same name is not a dependent", { skip: noTs }, () => {
  const text = ["function count(items) {", "  return items.length;", "}", "function other() {", "  const count = 5;", "  return count;", "}", "const n = count([1]);", ""].join("\n");
  const decls = R.declarationsOf(ts, "/virtual/shadow.js", text, { ...R.CONFIG, minRefs: 1, minRegion: 12 });
  const count = decls.find((d) => d.name === "count");
  assert.ok(count, "the top-level declaration is found");
  assert.deepEqual(count.truth, [8], "only the real call is a dependent; the local `count` in other() is a different symbol");
  const r = R.evaluate(text, count);
  assert.ok(r.identifier < 1, "a whole-word text match cannot tell them apart, which is why the analyzer, not a match, is the ground truth");
});

test("the committed real-code table is what the analyzer and the derivation produce now", { skip: noTs }, (t) => {
  const f = path.join(HERE, "..", "eval", "results", "reach-real-code-RESULTS.md");
  assert.ok(fs.existsSync(f), "run: node native/eval/reach/real-code.mjs > native/eval/results/reach-real-code-RESULTS.md");
  const committed = fs.readFileSync(f, "utf8");
  const named = /TypeScript (\S+) language service/.exec(committed)?.[1];
  if (named && named !== ts.version) return t.skip(`the table records TypeScript ${named}; this is ${ts.version} — a different analyzer is a different measurement`);
  assert.equal(committed, R.markdown(R.run(ts)));
});

test("the headline holds on the frozen material: every true dependent is found somewhere in the ranking, the derivation beats locality file by file, and it is not precise", { skip: noTs }, () => {
  const res = R.run(ts);
  const all = res.files.flatMap((x) => x.rows);
  assert.ok(all.length >= 60, `enough declarations (${all.length})`);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.equal(mean(all.map((r) => r.recallAll)), 1, "a reference shares the identifier, so the derivation never loses one entirely");
  assert.ok(mean(all.map((r) => r.rPrecision)) > 5 * mean(all.map((r) => r.proximity)), "name overlap beats locality by a wide margin");
  assert.ok(mean(all.map((r) => r.rPrecision)) < 0.6, "and it is NOT precise: about half of what it ranks first is not a dependent — the limit the register reports");
  assert.ok(mean(all.map((r) => r.identifier)) > mean(all.map((r) => r.rPrecision)), "knowing which token the edit is about would buy precision");
});
