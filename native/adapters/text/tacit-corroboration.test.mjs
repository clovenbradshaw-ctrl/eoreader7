// tacit-corroboration.test.mjs — the flagships are the two names both
// nominal-beings.js and greek.mjs::greekBeings were measured this session
// to MISS entirely (Faustus: unattested in pos-prior-eng.json despite 407
// raw occurrences; Kreon/Antigone: unattested in pos-grc.json AND never
// once article-adjacent in the running dialogue). If either flagship stops
// recovering its name, this suite fails.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { withinTextSightings, discoverCorroboratedBeings, discoverCrossSourceBeings } from "./tacit-corroboration.js";

const FAUSTUS = "/Users/mlacy/Documents/3.0/live_priors/15-western-canon/marlowe/doctor-faustus-1604-quarto.txt";
const ANTIGONE = "/Users/mlacy/Documents/3.0/live_priors/11-multi-language/greek-originals/sophocles-antigone.txt";
const POS_ENG = "/Users/mlacy/Documents/3.0/the-fold/priors-data/pos-prior-eng.json";
const POS_GRC = fileURLToPath(new URL("../../priors/pos-grc.json", import.meta.url));
const HENRY_DIR = "/Users/mlacy/Documents/3.0/live_priors/15-western-canon/first-folio/";

test("withinTextSightings collapses an adjacent burst to one sighting, but counts genuinely separated recurrences", () => {
  const s = withinTextSightings("alpha alpha alpha " + "x ".repeat(60) + "alpha", { minSeparation: 50 });
  const alpha = s.get("alpha");
  assert.equal(alpha.length, 2, `a burst of 3 adjacent + 1 far repeat should be 2 sightings, got ${alpha.length}`);
});

test("discoverCorroboratedBeings needs no prior at all — pure recurrence admits a repeated unattested form", () => {
  const beings = discoverCorroboratedBeings("zathrax walked. zathrax spoke. " + "the cat sat. ".repeat(3) + "zathrax left.", { minSeparation: 5 });
  const z = beings.find((b) => b.form === "zathrax");
  assert.ok(z, "an invented, wholly unattested but recurring form must still be admitted with no prior given");
  assert.equal(z.status, "confirmed");
});

test("a prior, when given, excludes a confidently-classified closed-class word even though it recurs heavily", () => {
  const toyPrior = { forms: { the: { DET: 500 }, zathrax: {} } };
  const beings = discoverCorroboratedBeings("the zathrax. the thing. the end. zathrax again. zathrax once more.", { prior: toyPrior, minSeparation: 5 });
  assert.ok(!beings.some((b) => b.form === "the"), "'the' is confidently DET in the prior and must be excluded");
  assert.ok(beings.some((b) => b.form === "zathrax"), "the unattested recurring form must still be admitted");
});

// FLAGSHIP 1 — real Doctor Faustus text, no golden consulted during discovery.
test("real Doctor Faustus: discoverCorroboratedBeings recovers the title character that nominal-beings.js's prior-attestation gate measurably misses", { skip: existsSync(FAUSTUS) && existsSync(POS_ENG) ? false : "Faustus text or pos-prior-eng.json not present in this checkout" }, () => {
  const prior = JSON.parse(readFileSync(POS_ENG, "utf8"));
  const text = readFileSync(FAUSTUS, "utf8");
  const beings = discoverCorroboratedBeings(text, { prior });
  // Measured 2026-09-23: 1532 confirmed beings; "faustus" ranks #1 with
  // corroboration 226 (226 genuinely separated sightings), attestedClass
  // null (confirming it survived on recurrence alone, not classification —
  // nominal-beings.js's own gate refuses this exact form outright).
  const faustus = beings.find((b) => b.form === "faustus");
  assert.ok(faustus, "faustus must be recovered");
  assert.equal(faustus.attestedClass, null, "faustus is genuinely unattested in the prior — recovered on recurrence, not classification");
  assert.ok(beings.indexOf(faustus) < 3, `faustus should rank at or near the very top by corroboration, got rank ${beings.indexOf(faustus) + 1}`);
  const mephistophilis = beings.find((b) => b.form === "mephistophilis");
  assert.ok(mephistophilis, "mephistophilis (also unattested in the prior) must be recovered too");
});

// FLAGSHIP 2 — real Antigone text, no golden consulted during discovery.
test("real Antigone: discoverCorroboratedBeings recovers the cast that greekBeings' article-adjacency gate measurably misses entirely (0 of 10)", { skip: existsSync(ANTIGONE) && existsSync(POS_GRC) ? false : "Antigone text or pos-grc.json not present in this checkout" }, () => {
  const prior = JSON.parse(readFileSync(POS_GRC, "utf8"));
  const text = readFileSync(ANTIGONE, "utf8");
  const beings = discoverCorroboratedBeings(text, { prior, minSeparation: 50 });
  // Measured 2026-09-23: kreon rank 3 (corroboration 94 — matches the
  // independently-extracted golden turn-count of 94 almost exactly, since
  // the speaker cue recurs once per turn); choros rank 7 (46, exact golden
  // match); antigone rank 8 (45, golden 44); ismene rank 16 (27, exact
  // golden match). greekBeings on this same text found 5 beings, 0 cast.
  const golden = { κρεων: 94, χορος: 46, αντιγονη: 44, ισμηνη: 27 };
  for (const name of Object.keys(golden)) {
    const hit = beings.find((b) => b.form === name);
    assert.ok(hit, `${name} must be recovered (golden turn count ${golden[name]})`);
    assert.equal(hit.attestedClass, null, `${name} is genuinely unattested in pos-grc.json — recovered on recurrence, not classification`);
  }
  assert.ok(beings.indexOf(beings.find((b) => b.form === "κρεων")) <= 5, "kreon, the play's most-spoken role, should rank near the top");
});

// FLAGSHIP 3 — real cross-lingual corroboration across four genuine
// editions of the same play (1623 Folio, modern English, French Guizot
// 1863, German Wieland), no golden, no per-language prior at all.
test("real cross-source Henry IV: discoverCrossSourceBeings recovers cast names that corroborate across four independent editions/languages with zero prior of any kind", {
  skip: ["henry-iv-part-1.txt", "henry-iv-part-1-modern.txt", "henry-iv-part-1-french-guizot.txt", "henry-iv-part-1-german-wieland.txt"].every((f) => existsSync(HENRY_DIR + f)) ? false : "the four-witness Henry IV bundle is not present in this checkout",
}, () => {
  const body = (p) => { const raw = readFileSync(p, "utf8"); const i = raw.indexOf("\n\n"); return raw.slice(i + 2); };
  const sources = [
    { id: "folio-1623-en", text: body(HENRY_DIR + "henry-iv-part-1.txt") },
    { id: "modern-en", text: body(HENRY_DIR + "henry-iv-part-1-modern.txt") },
    { id: "french-guizot", text: body(HENRY_DIR + "henry-iv-part-1-french-guizot.txt") },
    { id: "german-wieland", text: body(HENRY_DIR + "henry-iv-part-1-german-wieland.txt") },
  ];
  const beings = discoverCrossSourceBeings(sources, { minSeparation: 50, floor: 3 });
  // Measured 2026-09-23, NO prior passed at all: worcester/hal/vernon
  // corroborate in all 4 sources; mortimer/glendower/percy/archibald
  // corroborate in all 4; falstaff/hotspur/douglas corroborate in exactly
  // 3 of 4 (missing the 1623 Folio specifically for hotspur — its own
  // period spelling hyphenates "Hot-Spur", which this tokenizer's TOKEN
  // regex splits into two separate tokens, a real disclosed tokenizer
  // boundary, not a corroboration-engine failure).
  for (const name of ["worcester", "hal", "vernon", "mortimer", "glendower", "percy", "archibald"]) {
    const hit = beings.find((b) => b.form === name);
    assert.ok(hit, `${name} must corroborate across all four real editions`);
    assert.equal(hit.corroboration, 4, `${name} should corroborate in all 4 sources, got ${hit?.corroboration}`);
  }
  for (const name of ["falstaff", "hotspur", "douglas"]) {
    const hit = beings.find((b) => b.form === name);
    assert.ok(hit, `${name} must at least clear the floor of 3`);
    assert.ok(hit.corroboration >= 3, `${name} should corroborate in at least 3 sources`);
  }
});
