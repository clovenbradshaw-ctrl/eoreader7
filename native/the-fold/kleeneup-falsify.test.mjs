// kleeneup-falsify.test.mjs — THE FALSIFICATION TIER for KleeneUp, the
// regex-removal archon (2026-09-21):
//
//   "a pattern is a TABLE wearing regex clothes when it enumerates a closed
//   list; state the list, drop the pattern. A regex is the right tool when it
//   describes a SHAPE — any number, any letter, any structure."
//
// The falsification is on the FINGERPRINTS: KleeneUp must catch the exact
// table-regexes the fold's first pass carried (the number alternation, the
// abbreviation lookbehind, the char-class split that kept spaces) and must NOT
// flag a genuine shape-regex (a simple boundary split). Each finding carries
// its replacement, stated never applied.
import test from "node:test";
import assert from "node:assert/strict";
import { patrol, dissolutionOf } from "./kleeneup.js";

// ── K1  THE NUMBER-WORD ALTERNATION IS A TABLE, FOUND. The fold's first-pass
// core carried `(?:one|two|three|four|...|million)` — a closed list wearing a
// pattern. KleeneUp names it and the Set that dissolves it.
test("K1 — a number-word alternation regex is found as a table, with its dissolution", () => {
  const code = `const core = s.toLowerCase().replace(/\`\\b(?:one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)\\b\`/g, "NUM");`;
  const findings = patrol(code);
  const numberTable = findings.find((f) => f.kind === "number-alternation");
  assert.ok(numberTable, "the number alternation is found");
  assert.ok(dissolutionOf("number-alternation").includes("Set"), "the dissolution names a Set");
});

// ── K2  THE ABBREVIATION LOOKBEHIND IS FOUND. "Dr. Thomas Walker" split after
// "Dr." because of a (?<=[.!?]) split — KleeneUp names the guard and the
// table + token walk that replaces it.
test("K2 — an abbreviation-guard lookbehind is found; the ABBREV table is named", () => {
  const code = `const sentences = part.split(/(?<=[.!?])\\s+(?=[A-Z])/);`;
  const findings = patrol(code);
  const guard = findings.find((f) => f.kind === "abbreviation-guard");
  assert.ok(guard, "the abbreviation lookbehind is found");
  assert.ok(dissolutionOf("abbreviation-guard").includes("Set"), "the dissolution names an abbreviation Set");
});

// ── K3  THE CHAR-CLASS SPLIT THAT KEEPS SPACES IS FOUND. split(/[^a-z' ]+/)
// keeps the space in the class, so tokens become whole phrases — a tokenizer
// bug KleeneUp spots as a table-shaped error.
test("K3 — a char-class split that keeps spaces is found as a tokenizer error", () => {
  const code = `const words = String(s).toLowerCase().split(/[^a-z' ]+/);`;
  const findings = patrol(code);
  const cc = findings.find((f) => f.kind === "char-class-token");
  assert.ok(cc, "the space-keeping char-class is found");
  assert.ok(cc.replacement.includes("drop the space"), "the replacement drops the space");
});

// ── K4  AN ALTERNATION OF SHORT WORDS IS FOUND AS A LIST. /dr|mr|mrs|ms|st/
// is a closed vocabulary — a Set, not a pattern.
test("K4 — an alternation of short words (a closed vocabulary) is found as a list", () => {
  const code = `if (/dr|mr|mrs|ms|st|mt|etc|vs|gen|gov|sen/.test(word)) skip();`;
  const findings = patrol(code);
  const list = findings.find((f) => f.kind === "alternation-list");
  assert.ok(list, "the word alternation is found as a list");
  assert.ok(list.replacement.includes("Set"), "the replacement names a Set");
});

// ── K5  A GENUINE SHAPE-REGEX IS NOT FLAGGED. split(/[^a-z']+/) — the honest
// tokenizer (no space in the class) — describes a SHAPE (anything that is not
// a letter), and KleeneUp must NOT flag it as a table.
test("K5 — a genuine shape-regex (word boundary) is not flagged", () => {
  const code = `const words = String(s).toLowerCase().split(/[^a-z']+/);`;
  const findings = patrol(code);
  const falsePositive = findings.find((f) => f.kind === "char-class-token");
  assert.ok(!falsePositive, "the honest split is not a table error");
});

// ── K6  THE PATROL IS PURE AND DISCLOSES — every finding names its line and
// carries a stated (never applied) replacement; the same code yields the same
// findings every time.
test("K6 — the patrol is pure and every finding names its replacement", () => {
  const code = `const s = text.replace(/(?:one|two|three|four)\\b/g, "NUM");\nconst parts = x.split(/(?<=[.!?])\\s+(?=[A-Z])/);`;
  const a = patrol(code);
  const b = patrol(code);
  assert.deepEqual(a.map((f) => f.kind), b.map((f) => f.kind), "pure: identical code, identical findings");
  assert.ok(a.length >= 2, "both table-regexes are found");
  for (const f of a) {
    assert.ok(f.replacement && f.replacement.length > 0, `finding ${f.kind} carries a stated replacement`);
    assert.ok(f.line != null, `finding ${f.kind} names its line`);
    assert.ok(!f.replacement.includes("DELETE") && !f.replacement.includes("REMOVE"), "the replacement is stated, never a destructive command");
  }
});