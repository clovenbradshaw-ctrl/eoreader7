// tests/code-hunk.test.js — adapters/code/encounters.js: the code-grain
// admission channel. The measured defect this channel exists to fix: the prose
// sentence machinery, handed a minified bundle, produced one 1.8 MB "sentence"
// and choked the recursive reader (S128). Every test here pins the code grain's
// guarantees: a hard cap that can never be exceeded, byte-anchored material
// that round-trips to the source, and a cheap structural selector that never
// mistakes prose for code.

import { test } from "node:test";
import assert from "node:assert/strict";
import { isCodeHunk, codeEncounters, codeEncountersCompliance, CODE_MAX_ENCOUNTER_CHARS } from "../adapters/code/encounters.js";

const MONSTER_LINE = Array.from({ length: 60_000 }, () => "x").join("");
const MINI_BUNDLE = [
  'const __vite__mapDeps=(i,m,d)=(m.f||(m.f=["assets/AppMain-ABC12345.js","assets/react-vendor-abc12345.js"])))=>i.map(i=>d[i]);',
  'import{c as requireReact}from"./react-vendor-abc12345.js";',
  'export function LicenseStatus(){return "/api/license/status";}',
].join("\n");

const PROSE = [
  "It was the best of times, it was the worst of times,",
  "it was the age of wisdom, it was the age of foolishness,",
  "it was the epoch of belief, it was the epoch of incredulity.",
].join("\n");

test("isCodeHunk: a long-line minified bundle is code; prose is not", () => {
  assert.equal(isCodeHunk(MINI_BUNDLE), true, "bundle markers make it code");
  assert.equal(isCodeHunk(MONSTER_LINE), true, "a single long line is code-shaped");
  assert.equal(isCodeHunk(PROSE), false, "ordinary prose never scans as code");
  assert.equal(isCodeHunk(""), false);
  assert.equal(isCodeHunk(null), false);
});

test("codeEncounters: the cap is a hard guarantee, never a budget", () => {
  const monster = `${MONSTER_LINE}\nshort line\n`;
  const enc = codeEncounters(monster, { source: "t" });
  assert.ok(enc.length >= 2);
  for (const e of enc) {
    assert.ok(e.extent <= CODE_MAX_ENCOUNTER_CHARS, `encounter ${e.sequencePosition} is ${e.extent} chars — over the cap`);
  }
});

test("codeEncounters: a custom cap is respected", () => {
  const enc = codeEncounters(MONSTER_LINE, { source: "t", maxEncounterChars: 1024 });
  for (const e of enc) assert.ok(e.extent <= 1024);
});

test("codeEncounters: schema matches textEncounters exactly, modality code", () => {
  const enc = codeEncounters(MINI_BUNDLE, { source: "file:mini.js" });
  const first = enc[0];
  assert.equal(first.schema, "Encounter@1");
  assert.equal(first.modality, "code");
  assert.equal(first.source, "file:mini.js");
  assert.equal(typeof first.anchor.start, "number");
  assert.equal(typeof first.anchor.end, "number");
  assert.equal(first.extent, first.material.length);
  assert.equal(typeof first.sequencePosition, "number");
});

test("codeEncounters: material round-trips to the source at its anchor", () => {
  const enc = codeEncounters(MINI_BUNDLE, { source: "t" });
  for (const e of enc) {
    assert.equal(MINI_BUNDLE.slice(e.anchor.start, e.anchor.end), e.material, `seq ${e.sequencePosition} does not round-trip`);
  }
});

test("codeEncounters: a monster line is cut at statement boundaries, not mid-statement", () => {
  const stmt = `${"function f(a,b,c){return a+b+c;}".repeat(20)}`;
  const enc = codeEncounters(stmt, { source: "t", maxEncounterChars: 200 });
  assert.ok(enc.length >= 2);
  // every boundary cut lands on `}` (statement close) when the cap allows
  for (const e of enc.slice(0, enc.length - 1)) {
    assert.equal(e.material.endsWith("}"), true, `chunk ends ${JSON.stringify(e.material.slice(-8))} — not at a statement boundary`);
  }
});

test("codeEncounters: offsets are monotonic and in-bounds", () => {
  const text = `line one\n${MONSTER_LINE}\nline three\n`;
  const enc = codeEncounters(text, { source: "t" });
  let prevEnd = -1;
  for (const e of enc) {
    assert.ok(e.anchor.start >= prevEnd, "encounters overlap");
    assert.ok(e.anchor.end <= text.length, "anchor exceeds source bounds");
    prevEnd = e.anchor.end;
  }
});

test("codeEncounters: offset base shifts every anchor (re-anchoring, same as textEncounters)", () => {
  const text = `prefix\n${MONSTER_LINE}`;
  const enc = codeEncounters(text, { source: "t", offset: 100 });
  for (const e of enc) {
    assert.ok(e.anchor.start >= 100);
    assert.equal(text.slice(e.anchor.start - 100, e.anchor.end - 100), e.material);
  }
});

test("codeEncountersCompliance: zero violations on the monster-line shape that broke the pipeline", () => {
  const text = `const __vite__mapDeps=(i,m,d)=(m.f||(m.f=["assets/A-abc12345.js"])))=>i.map(i=>d[i]);\n${MONSTER_LINE}\n`;
  const { encounters, violations } = codeEncountersCompliance(text);
  assert.ok(encounters >= 2);
  assert.deepEqual(violations, []);
});