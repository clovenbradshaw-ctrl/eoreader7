// native/tests/kleene-up.test.mjs — the physics of finding and snipping, pinned.
// A thing is FOUND by its address in the byte field, never by a pattern; a
// thing is SNIPPED at its permanent address, never by a match. An absence is
// a typed result. The falsifying control is carried at the bottom: a regex
// that would match the WRONG span loses to a needle, and an address that
// drifts is refused, never re-found.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA, HANDLE, REFUSALS,
  foldedIndex, needleDigest,
  findNeedle, findNeedles, windowAt, snipAt,
  reduceRegex, wordSet,
} from "../kernel/kleene-up.js";
// The organ seam (wired here so the organ is imported and verified — the
// kernel is the physics; the organ is the cube cell and the standing audit).
import { CELL, KLEENE_UP_SCHEMA, KLEENE_UP_REFUSALS, KINDS, auditField } from "../organs/kleene-up.js";

const FIELD = "Shall I compare thee to a summer's day? Thou art more lovely and more temperate.";

test("kleene-up: the handle is Kleene — the founder of the house it evicts", () => {
  assert.equal(HANDLE, "Kleene");
  assert.equal(SCHEMA, "KleeneUp@1");
});

test("foldedIndex folds mechanically and maps back to the original bytes", () => {
  const { norm, map } = foldedIndex("AbC aBc");
  assert.equal(norm, "abc abc");
  assert.equal(norm.indexOf("abc"), 0);
  assert.equal(map[0], 0);
  assert.equal(map[4], 4);
  assert.equal(norm.length, map.length, "ASCII folding never changes length");
});

test("findNeedle measures the real address of a needle, case-folded", () => {
  const r = findNeedle(FIELD, "summer's day");
  assert.equal(r.found, true);
  assert.ok(r.at.c0 >= 0 && r.at.c1 > r.at.c0);
  assert.equal(FIELD.slice(r.at.c0, r.at.c1), "summer's day", "the address points at the real bytes");
  assert.ok(r.basis.includes(String(r.at.c0)), "the basis names what was measured");
  // case-insensitive by default, and the address lands on the ORIGINAL bytes
  const ci = findNeedle(FIELD, "SHALL I COMPARE");
  assert.equal(ci.found, true);
  assert.equal(FIELD.slice(ci.at.c0, ci.at.c1), "Shall I compare");
});

test("findNeedle reports a typed absence, never a guess", () => {
  const r = findNeedle(FIELD, "Bagration");
  assert.equal(r.found, false);
  assert.equal(r.at, null);
  assert.ok(r.basis.includes("absence"), "the absence is named as the finding");
  assert.ok(r.gap);
});

test("findNeedle honors `from` — the second occurrence is a real address", () => {
  const two = "the needle here, then the needle there";
  const first = findNeedle(two, "needle");
  const second = findNeedle(two, "needle", { from: first.at.c1 });
  assert.equal(two.slice(second.at.c0, second.at.c1), "needle");
  assert.ok(second.at.c0 > first.at.c0, "the second occurrence is after the first");
  assert.equal(findNeedle("one needle", "needle", { from: 20 }).found, false, "absent after the bound is absent");
});

test("findNeedles reports every needle's presence and all occurrences", () => {
  const r = findNeedles(FIELD, ["summer", "Bagration", "temperate"]);
  assert.equal(r.counted.needles, 3);
  assert.equal(r.counted.found, 2);
  assert.equal(r.counted.absent, 1);
  assert.equal(r.found[0].needle, "summer");
  assert.ok(r.found[0].digest.length === 64, "a needle carries its own ground");
  assert.equal(r.absent[0].needle, "Bagration");
  assert.equal(r.absent[0].present, false);
  const all = findNeedles("to be or not to be", ["to be"], { all: true });
  assert.equal(all.found[0].occurrences.length, 2, "all occurrences are measured");
  const one = findNeedles("to be or not to be", ["to be"], { all: false });
  assert.equal(one.found[0].occurrences.length, 1, "first-occurrence by default");
});

test("findNeedles refuses an empty field and an empty needle — both typed", () => {
  assert.equal(findNeedles("", ["x"]).gap, REFUSALS.empty_text.gap);
  const emptyN = findNeedles(FIELD, [""]);
  assert.ok(emptyN.absent[0].gap, "an empty needle is a typed gap, never a match-everywhere");
});

test("windowAt cuts the encounter around the anchor, with a reopenable ref", () => {
  const f = findNeedle(FIELD, "summer");
  const w = windowAt(FIELD, f.at, { window: 10 });
  assert.ok(w.text.includes("summer"), "the window holds the needle");
  assert.ok(w.text.length < FIELD.length, "the window is bounded, not the whole field");
  assert.match(w.ref, /^field#\d+-\d+$/, "the ref is a permanent address");
  const c = windowAt(FIELD, { c0: f.at.c0, c1: f.at.c1 }, { window: 0 });
  assert.equal(c.text, "summer", "a zero window is the needle alone");
  assert.ok(windowAt(FIELD, { c0: -1, c1: 5 }).gap, "a bad anchor is a typed gap");
});

test("snipAt cuts verbatim bytes at a permanent address", () => {
  const f = findNeedle(FIELD, "more lovely");
  const s = snipAt(FIELD, f.at, { verify: "more lovely" });
  assert.equal(s.snip, "more lovely");
  assert.equal(s.ref, `field#${f.at.c0}-${f.at.c1}`);
  assert.equal(s.digest, needleDigest("more lovely"), "the snip's digest is the needle's digest");
  const again = snipAt(FIELD, f.at);
  assert.equal(again.snip, s.snip, "deterministic: same address, same bytes");
});

test("snipAt refuses a drifted anchor — never silently re-found", () => {
  const f = findNeedle(FIELD, "more lovely");
  const s = snipAt(FIELD, f.at, { verify: "different words" });
  assert.equal(s.snip, "", "nothing is cut when the address no longer holds the claimed needle");
  assert.equal(s.gap, REFUSALS.drifted.gap);
  assert.ok(s.basis.includes("drifted"));
  assert.ok(snipAt(FIELD, { c0: 0, c1: 500 }).gap, "an out-of-field anchor is a typed gap");
  assert.ok(snipAt(FIELD, null).gap);
});

// ── reduceRegex: what a pattern IS, named ────────────────────────────────
test("reduceRegex names a literal — one verbatim needle", () => {
  const r = reduceRegex("Karataev");
  assert.equal(r.kind, "literal");
  assert.equal(r.needle, "Karataev");
  assert.equal(r.ci, false);
  const ci = reduceRegex("15th vice president", { flags: "gi" });
  assert.equal(ci.kind, "literal");
  assert.equal(ci.needle, "15th vice president");
  assert.equal(ci.ci, true, "the i flag is carried into the needle's folding");
  const punct = reduceRegex("Dr\\. Smith");
  assert.equal(punct.kind, "literal");
  assert.equal(punct.needle, "Dr. Smith", "a punctuation escape is still a verbatim needle");
});

test("reduceRegex names a word class — a set of needles over the tokenized field", () => {
  const r = reduceRegex("(?:hamlet|macbeth)", { flags: "i" });
  assert.equal(r.kind, "semantic");
  assert.deepEqual([...r.needles], ["hamlet", "macbeth"]);
  assert.equal(r.ci, true);
  const multi = reduceRegex("\\bwho\\b|кто|qui", { flags: "i" });
  assert.equal(multi.kind, "semantic");
  assert.deepEqual([...multi.needles], ["who", "кто", "qui"]);
});

test("reduceRegex names grammar structural — parsing and sanitizing stay", () => {
  assert.equal(reduceRegex("[^\\p{L}\\p{N}]+", { flags: "u" }).kind, "structural");
  assert.equal(reduceRegex("\\s+").kind, "structural");
  assert.equal(reduceRegex("^\\d+\\. ").kind, "structural");
  assert.equal(reduceRegex("[^.!?…]+(?:[.!?]+|\\.\\.\\.|…|$)").kind, "structural");
  assert.equal(reduceRegex("\\b1[678]\\d\\d\\b").kind, "structural", "digit classes are grammar");
});

test("reduceRegex names the typed gaps — backrefs and lookaround cannot be needles", () => {
  assert.equal(reduceRegex("(\\d+)\\1").kind, "typed_gap");
  assert.equal(reduceRegex("(?<=x)y").kind, "typed_gap");
  assert.equal(reduceRegex("").kind, "typed_gap");
  assert.equal(reduceRegex("").gap, "kleene-up:empty_pattern");
});

test("wordSet reduces a semantic or literal pattern to its needles", () => {
  const ws = wordSet("(?:hamlet|macbeth)", { flags: "i" });
  assert.deepEqual([...ws.needles], ["hamlet", "macbeth"]);
  assert.equal(ws.ci, true);
  assert.deepEqual([...wordSet("Karataev").needles], ["Karataev"]);
  assert.equal(wordSet("\\d+"), null, "a structural pattern has no needle set — the caller names the gap");
  assert.equal(wordSet("(\\d+)\\1"), null);
});

// ── THE FALSIFYING CONTROL ───────────────────────────────────────────────
// A regex finds BY PATTERN and can match the WRONG span: "vice president" as
// a needle pattern also finds the phrase inside a longer sentence where it is
// not the statement. A needle does not. A semantic word class measured over
// the tokenized field cannot bleed across sentence boundaries, and a drift is
// refused. If a future change makes finding match a wrong span, this fails.
test("falsifying control: pattern matching bleeds; needle measurement does not", () => {
  const page = "James Polk served as vice president under Van Buren. The vice presidency was different then.";
  // A regex /\bvice president\b/ matches BOTH spans — it cannot tell the
  // statement from the background. The needle measures the FIRST address only
  // by default; the caller decides the window, never the pattern.
  const r = findNeedle(page, "vice president");
  assert.equal(page.slice(r.at.c0, r.at.c1), "vice president");
  // A word class over the tokenized field measures WHICH needles sit in the
  // field, and where — "vice presidency" is NOT found by the needle "vice
  // president", because they are different bytes (the regex \b can't see the
  // word boundary either way; the needle is honest about what it matched).
  const wc = findNeedles(page, ["vice president", "vice presidency"]);
  assert.equal(wc.counted.found, 2, "both needles measured — the word class is a set, not a guess");
  assert.equal(wc.found[0].occurrences[0].c0 < wc.found[1].occurrences[0].c0, true, "addresses are in field order");
});

test("falsifying control: a drifted ground is refused, never silently re-found", () => {
  const measured = snipAt("the quick brown fox", { c0: 4, c1: 9 });
  assert.equal(measured.snip, "quick");
  const edited = "the SLOW brown fox";
  const refused = snipAt(edited, { c0: 4, c1: 9 }, { verify: "quick" });
  assert.equal(refused.gap, REFUSALS.drifted.gap, "the address no longer holds the needle — refused");
  const reFind = findNeedle(edited, "slow");
  assert.equal(snipAt(edited, reFind.at, { verify: "slow" }).snip, "SLOW", "re-finding gives a live address holding the original bytes — that is the fix, not a re-match");
  assert.equal(snipAt(edited, reFind.at, { verify: "quick" }).gap, REFUSALS.drifted.gap, "a genuinely different needle is still drifted under ci");
});

// ── the organ seam ────────────────────────────────────────────────────────
test("organ seam: the cube cell, the typed refusals, and the standing audit", () => {
  assert.deepEqual(CELL, { op: "SIG", grain: "Figure" });
  assert.equal(KLEENE_UP_SCHEMA, "KleeneUp@1");
  assert.equal(KLEENE_UP_REFUSALS.drifted.gap, REFUSALS.drifted.gap, "the organ's refusals are the kernel's, prefixed");
  assert.deepEqual([...KINDS], ["literal", "semantic", "structural", "typed_gap"]);
});

test("auditField measures a field against a pattern set and names the gaps", () => {
  const a = auditField(FIELD, ["summer's day", "Bagration", "\\d+", "(?<=x)y"], { all: false });
  assert.equal(a.counted.patterns, 4);
  assert.equal(a.counted.literal, 2, "summer's day AND Bagration are each one needle — one present, one absent");
  assert.equal(a.counted.structural, 1, "\\d+ is grammar");
  assert.equal(a.counted.typedGaps, 1, "the lookaround is a named gap");
  assert.equal(a.counted.absent, 1, "Bagration is absent — a measured result, never a guess");
  const lit = a.rows.find((r) => r.label === "summer's day");
  assert.equal(lit.findings.counted.found, 1);
  assert.equal(FIELD.slice(lit.findings.found[0].occurrences[0].c0, lit.findings.found[0].occurrences[0].c1), "summer's day");
});