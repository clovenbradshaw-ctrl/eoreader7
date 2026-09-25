// node --test greenberg.test.mjs
//
// Conformance for the word-order/script-universality lens: synthetic cases
// pinning each of the four rules' positive and negative shapes, then the
// same scan run against real, current eoreader7 source — because a lint
// organ whose only fixtures are its own synthetic examples has never been
// checked against the material it exists to read (this suite's own standing
// discipline: II.13, "checked against real material, not only synthetic").

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  scanCapitalizationUnguarded,
  scanSilentEnglishDefault,
  scanSvoFieldLeak,
  scanLatinPunctuationOnly,
  scanSource,
  summarize,
} from "./greenberg.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");

function real(relPath) {
  return readFileSync(path.join(REPO, relPath), "utf8");
}

// --- capitalization_unguarded ------------------------------------------------

test("capitalization_unguarded: flags a bare [A-Z] class and attaches its surrounding lines as context", () => {
  const src = [
    "function isName(w) {",
    "  return /^[A-Z]/.test(w);",
    "}",
  ].join("\n");
  const hits = scanCapitalizationUnguarded(src, "synthetic.js");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 2);
  assert.ok(hits[0].context.includes("isName"));
  // Deliberately no confidence/nearbyTerms score — see the organ's own
  // header for why keyword-proximity scoring was tried and dropped.
  assert.equal(hits[0].confidence, undefined);
});

test("capitalization_unguarded: does not fire on ordinary code with no capital-class or upper-case identity test", () => {
  const src = "function add(a, b) { return a + b; }";
  assert.deepEqual(scanCapitalizationUnguarded(src, "synthetic.js"), []);
});

test("capitalization_unguarded: real morphology-style toUpperCase identity test is caught", () => {
  const src = 'const cap = w[0].toUpperCase() + w.slice(1);\nconst isCap = word === cap;';
  const hits = scanCapitalizationUnguarded(src, "synthetic.js");
  assert.ok(hits.length >= 1);
});

// --- silent_english_default --------------------------------------------------

test("silent_english_default: flags an unconditional English fallback on unset language", () => {
  const src = 'const englishRule = language == null || language === "eng";';
  const hits = scanSilentEnglishDefault(src, "synthetic.js");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].rule, "silent_english_default");
});

test("silent_english_default: does not fire when language is checked without an English fallback", () => {
  const src = 'const rule = language == null ? null : rulesFor(language);';
  assert.deepEqual(scanSilentEnglishDefault(src, "synthetic.js"), []);
});

// --- svo_field_leak -----------------------------------------------------------

test("svo_field_leak: flags subject/verb/object fields as needs_migration when the file has no end1/end2/label", () => {
  const src = 'return { id, subject: d.subject, verb: d.verb, object: d.object };';
  const hits = scanSvoFieldLeak(src, "synthetic.js");
  assert.ok(hits.length >= 2);
  assert.ok(hits.every((h) => h.confidence === "needs_migration"));
});

test("svo_field_leak: flags the same shape as bridging when end1/end2 appear in the file (a migration shim)", () => {
  const src = [
    "const endsOf = (t) => ({ subject: t.subject ?? t.end1, verb: t.verb ?? t.label, object: t.object ?? t.end2 });",
  ].join("\n");
  const hits = scanSvoFieldLeak(src, "synthetic.js");
  assert.ok(hits.length >= 1);
  assert.ok(hits.every((h) => h.confidence === "bridging"));
});

test("svo_field_leak: does not fire on ordinary 'object'/'typeof' usage unrelated to SVO fields", () => {
  const src = [
    "if (typeof value === \"object\") return Object.keys(value);",
    "const o = new Object();",
  ].join("\n");
  assert.deepEqual(scanSvoFieldLeak(src, "synthetic.js"), []);
});

// --- latin_punctuation_only ---------------------------------------------------

test("latin_punctuation_only: flags a bare [.!?] sentence-boundary class and attaches context", () => {
  const src = "const re = /[.!?]+(?=\\s|$)/g;";
  const hits = scanLatinPunctuationOnly(src, "synthetic.js");
  assert.equal(hits.length, 1);
  assert.ok(hits[0].context.length > 0);
});

test("latin_punctuation_only: does not fire on unrelated regex literals", () => {
  const src = "const re = /\\d{3}-\\d{4}/;";
  assert.deepEqual(scanLatinPunctuationOnly(src, "synthetic.js"), []);
});

// --- run against real, current eoreader7 source ------------------------------
// Pinned to the shapes this organ's own header cites (S86/S89/S92/S95/S96),
// each verified present at time of writing. If one of these stops firing, the
// underlying code changed (very possibly for the better — this pin exists so
// that change is a disclosed decision, not a silent one) and this test's own
// expectation should move with it, not be loosened blind.

test("real material: morphology.js's englishRule is caught by silent_english_default", () => {
  const src = real("native/adapters/text/morphology.js");
  const hits = scanSilentEnglishDefault(src, "native/adapters/text/morphology.js");
  assert.ok(hits.length >= 1, "expected morphology.js's language==null||===\"eng\" default to be caught");
});

test("real material: corroboration.js's capitalisation-as-name-evidence test is caught", () => {
  const src = real("native/organs/corroboration.js");
  const hits = scanCapitalizationUnguarded(src, "native/organs/corroboration.js");
  assert.ok(hits.length >= 1, "expected corroboration.js's w[0].toUpperCase()+w.slice(1) name test to be caught");
});

test("real material: hypergraph.js's surfaceNotAct capitalisation test is caught", () => {
  const src = real("native/organs/hypergraph.js");
  const hits = scanCapitalizationUnguarded(src, "native/organs/hypergraph.js");
  assert.ok(hits.length >= 1, "expected hypergraph.js's surfaceNotAct cap test to be caught");
});

test("real material: puzzle-templates.js's AGENT_LIST_RE capital-letter name matcher is caught", () => {
  const src = real("native/organs/puzzle-templates.js");
  const hits = scanCapitalizationUnguarded(src, "native/organs/puzzle-templates.js");
  assert.ok(hits.length >= 1, "expected AGENT_LIST_RE's [A-Z] class to be caught");
});

test("real material: grounding.js's splitSentences sentence-boundary class is caught", () => {
  const src = real("native/organs/grounding.js");
  const hits = scanLatinPunctuationOnly(src, "native/organs/grounding.js");
  assert.ok(hits.length >= 1, "expected splitSentences's [.!?]+ class to be caught");
});

test("real material: recurring-form-anchors.js's caseless-script detector still surfaces (a witness reports even the well-disclosed cases)", () => {
  const src = real("native/adapters/text/recurring-form-anchors.js");
  const hits = scanCapitalizationUnguarded(src, "native/adapters/text/recurring-form-anchors.js");
  assert.ok(hits.length >= 1, "the detector's own c===c.toUpperCase() identity test should still surface");
  // This one IS well-disclosed (its own header explains the case-bearing
  // measurement at length) — the organ does not try to score that, on
  // purpose (see the header note on why keyword-proximity scoring was
  // dropped); it reports the shape and lets the reader judge the context.
});

test("real material: derivation.js's subject/verb/object ledger is flagged needs_migration (no end1/end2 in the file)", () => {
  const src = real("native/organs/derivation.js");
  const hits = scanSvoFieldLeak(src, "native/organs/derivation.js");
  assert.ok(hits.length >= 5, "derivation.js reads/writes subject/verb/object pervasively");
});

test("real material: hyperlexicon.js's subject/verb/object references are bridging (end1/end2 present)", () => {
  const src = real("native/organs/hyperlexicon.js");
  const hits = scanSvoFieldLeak(src, "native/organs/hyperlexicon.js");
  assert.ok(hits.length >= 1);
  assert.ok(
    hits.every((h) => h.confidence === "bridging"),
    "hyperlexicon.js carries end1/end2/label alongside the legacy names — a migration shim, not new debt",
  );
});

test("real material: scanning the whole adapters/text + organs surface does not throw and summarizes", () => {
  // A coarse sanity check that the scan is stable over real, varied source —
  // not a claim that every hit here is a genuine gap (svo_field_leak in
  // particular is expected to fire across the known, disclosed P76 migration
  // — see this organ's own header).
  const files = [
    "native/adapters/text/morphology.js",
    "native/organs/grounding.js",
    "native/organs/corroboration.js",
    "native/organs/hypergraph.js",
    "native/organs/puzzle-templates.js",
    "native/adapters/text/recurring-form-anchors.js",
    "native/organs/derivation.js",
    "native/organs/hyperlexicon.js",
  ];
  const findings = files.flatMap((f) => scanSource(real(f), f));
  assert.ok(findings.length > 0);
  const summary = summarize(findings);
  for (const f of findings) {
    assert.ok(typeof f.line === "number" && f.line > 0);
    assert.ok(typeof f.rule === "string");
  }
  assert.ok(Object.keys(summary).length > 0);
});
