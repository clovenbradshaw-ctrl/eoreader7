// tests/code-time.test.js — Partee's organ, unchanged, reading code: forward
// source binds every reference to its declaration; reversed statement
// order lands typed no_candidate gaps (use before definition); a
// redeclaration supersedes the earlier binding and keeps it. The
// falsification that text could not give: reversal MUST move the counts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { statementsOf, codeTime, loadKeywords } from "../adapters/code/code-time.js";

const KW = loadKeywords();
const SRC = `import { readFileSync } from "node:fs";
const base = 10;
let total = base + 1;
function bump(n) { return n + base; }
total = bump(total);
const base = total; // a redeclaration, kept as a superseding ground
console.log(readFileSync, total);`;

test("the received keyword prior loads and is a real closed class", () => {
  assert.ok(KW.size > 20, `keywords ${KW.size}`);
  assert.ok(KW.has("const") && KW.has("return") && KW.has("function"));
});

test("statements: one per non-empty line, declarations from let/const/var/function/class and named imports, mentions minus keywords", () => {
  const S = statementsOf(SRC, KW);
  assert.equal(S.length, 7);
  assert.deepEqual(S[0].declares, ["readFileSync"]);
  assert.deepEqual(S[1].declares, ["base"]);
  assert.deepEqual(S[3].declares, ["bump"]);
  assert.ok(S[3].mentions.some((m) => m.name === "base"), "the function body mentions base");
  assert.ok(!S[3].mentions.some((m) => m.name === "return"), "keywords are not mentions");
  assert.equal(S[1].at[0], SRC.indexOf("const base"));
});

test("forward: every reference to a declared name binds to the live ground; the redeclaration supersedes and is kept", () => {
  const S = statementsOf(SRC, KW);
  const r = codeTime(S);
  assert.equal(r.counts.no_candidate, 0, JSON.stringify(r.resolutions.filter((x) => x.verdict !== "bound")));
  assert.ok(r.counts.bound > 0);
  assert.equal(r.counts.declarations, 5, "readFileSync, base, total, bump, base again — n is a parameter, not a declaration");
  assert.equal(r.counts.superseded, 1, "base is declared twice");
  const g2 = r.grounds.find((g) => g.supersedes);
  assert.ok(g2, "the second base ground names the first as superseded — kept, never erased");
  // the last statement's `total` binds to total's ground, `readFileSync` to the import's
  const last = r.resolutions.filter((x) => x.statement === "s7");
  assert.ok(last.every((x) => x.verdict === "bound"));
});

test("REVERSED: uses now precede their declarations and the organ lands typed gaps — the move text never showed", () => {
  const S = statementsOf(SRC, KW);
  const fwd = codeTime(S);
  const rev = codeTime([...S].reverse());
  assert.ok(rev.counts.no_candidate > fwd.counts.no_candidate, `reversed gaps ${rev.counts.no_candidate} vs forward ${fwd.counts.no_candidate}`);
  assert.equal(rev.counts.references, fwd.counts.references, "the same references, differently ordered");
  assert.equal(rev.counts.declarations, fwd.counts.declarations);
  const gap = rev.resolutions.find((x) => x.verdict === "no_candidate");
  assert.match(gap.detail, /no reference ground has been established/);
});

test("a mention of a name the file never declares is not a reference; an empty file reads to nothing", () => {
  const S = statementsOf("foo(bar);", KW);
  const r = codeTime(S);
  assert.equal(r.counts.references, 0);
  assert.equal(codeTime(statementsOf("", KW)).counts.declarations, 0);
});
