// capacity-map-results.test.js — a number in a results document is a report of one run; it is
// enforced only when a test reads it (the stale-stage lesson, READING-SPEC S64/S65). This file
// binds everything the capacity map RECORDS about its own falsification — the kernel's
// UNSUPPORTED_CROSSINGS, the placement organ's LIMITS, the generated RESULTS.md — to the raw
// results the drivers wrote, so none of it can drift from the runs it summarises.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { UNSUPPORTED_CROSSINGS } from "../kernel/capacity-map.js";
import { LIMITS } from "../organs/capacity-place.js";
import { render, forDoc, DOC_BEGIN, DOC_END } from "../eval/capacity-map/summarize.mjs";

const dir = new URL("../eval/capacity-map/", import.meta.url);
const read = (rel) => JSON.parse(fs.readFileSync(new URL(rel, dir), "utf8"));
const primary = (r) => r.variants[Object.keys(r.variants).find((k) => k.startsWith("primary"))];
const entry = (higher, lower) => UNSUPPORTED_CROSSINGS.find((c) => c.higher === higher && c.lower === lower);

test("results/RESULTS.md is exactly what the committed raw results render to (no hand-typed number in it, and none stale)", () => {
  assert.equal(fs.readFileSync(new URL("results/RESULTS.md", dir), "utf8"), render(new URL("results/", dir)));
});

test("THE-CAPACITY-MAP.md's results block is exactly the generated tables — no number in it was typed by hand", () => {
  const doc = fs.readFileSync(new URL("../docs/THE-CAPACITY-MAP.md", import.meta.url), "utf8");
  const a = doc.indexOf(DOC_BEGIN);
  const b = doc.indexOf(DOC_END);
  assert.ok(a >= 0 && b > a, "the document carries its results block between the markers");
  assert.equal(doc.slice(a + DOC_BEGIN.length, b).trim(), forDoc(render(new URL("results/", dir))).trim());
});

test("every evidence file the recorded history names exists", () => {
  const files = [...UNSUPPORTED_CROSSINGS.flatMap((c) => c.evidence), ...LIMITS.flatMap((l) => l.evidence)];
  assert.ok(files.length >= 8);
  for (const f of files) assert.ok(fs.existsSync(new URL(f.replace(/^eval\/capacity-map\//, ""), dir)), `${f} is named as evidence and is not on disk`);
});

test("F4: the outcomes recorded against (transcendental <= geometric) are the raw results' primary decisions, and the reading's claims hold in the data", () => {
  const c = entry("transcendental", "geometric");
  assert.ok(c, "the crossing is recorded as unsupported");
  const files = { dracula: "f4-dracula.json", "pride-and-prejudice": "f4-pride.json", frankenstein: "f4-frankenstein.json", "shakespeare-plays": "f4-plays.json" };
  const raw = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, primary(read(`results/${f}`))]));
  for (const [k, label] of Object.entries(c.result.outcomes)) assert.equal(raw[k].decision.label, label, `${k}: recorded ${label}, the run says ${raw[k].decision.label}`);
  // "standing raised the reliability of direction within volume strata in three of four materials"
  const raised = Object.values(raw).filter((v) => v.contrast.delta > 0 && v.contrast.pGreater < 0.05);
  assert.equal(raised.length, 3);
  // "but direction was also reproducible without standing in one of them"
  const reproducibleWithout = Object.entries(raw).filter(([, v]) => v.N.E > 0 && v.N.p_E < 0.05).map(([k]) => k);
  assert.deepEqual(reproducibleWithout, ["shakespeare-plays"]);
  // "the one inversion rests on a single effective stratum ... and does not survive exact volume matching"
  assert.equal(raw.frankenstein.contrast.strataUsed, 1);
  const exact = read("results/f4-diagnose-frankenstein.json").rows.find((r) => r.tag.startsWith("exact L"));
  assert.ok(exact.c.pLess >= 0.05, `under exact volume matching the inversion is p ${exact.c.pLess}`);
  // and the aggregate rule that produced "not supported"
  const supported = (k) => raw[k].decision.label === "SUPPORTED";
  const rule = supported("shakespeare-plays") && ["dracula", "pride-and-prejudice", "frankenstein"].filter(supported).length >= 2 && !Object.values(raw).some((v) => v.decision.label.startsWith("FALSIFIED"));
  assert.equal(rule, false);
});

test("F5 and F5': the outcomes recorded against (geometric <= arithmetic) are what the runs say", () => {
  const c = entry("geometric", "arithmetic");
  assert.ok(c);
  const f5 = read("results/f5-units.json");
  assert.equal(f5.overall, c.result.outcomes.overall);
  assert.equal(`${f5.books.filter((b) => b.consequential).length} of ${f5.books.length}`, c.result.outcomes.consequentialOn);
  const held = read("results/f5p-heldout.json");
  const dev = read("results/f5p-development.json");
  assert.equal(`${held.books.filter((b) => b.consequential).length} of 3`, c.result.followUp.outcomes.heldOut);
  assert.equal(held.overall.consequentialOverall, false);
  assert.equal(dev.books.filter((b) => b.consequential).length, 1);
  assert.equal(dev.books.find((b) => b.consequential).delta.toFixed(2), "0.40", "the one development book, and its effect");
  // the range the reading quotes for the held-out books
  for (const b of held.books) assert.ok(b.delta >= 0 && b.delta <= 0.05 + 1e-9, `${b.book}: held-out effect ${b.delta}`);
});

test("LIMITS: every number in the ledger is recomputed from the raw runs", () => {
  const byId = Object.fromEntries(LIMITS.map((l) => [l.id, l]));
  const f5p = { ...Object.fromEntries(read("results/f5p-development.json").books.map((b) => [b.book, { ...b, role: "development" }])), ...Object.fromEntries(read("results/f5p-heldout.json").books.map((b) => [b.book, { ...b, role: "heldout" }])) };

  for (const m of byId["extent-ends-a-sentence-inside-a-name"].measured) {
    const b = f5p[m.book];
    assert.ok(b, `${m.book} is not in the F5' runs`);
    assert.equal(b.role, m.role);
    assert.deepEqual([b.asSplit.audit.endingInIt, b.asSplit.audit.sentencesWithHonorificDot], [m.endingInIt, m.of], m.book);
  }
  for (const m of byId["a-cut-off-honorific-is-admitted-as-a-being"].measured) {
    const b = f5p[m.book];
    assert.ok(b, m.book);
    assert.equal(b.role, m.role);
    assert.deepEqual([b.asSplit.share, b.repaired.share, b.placebo.share], [m.asSplit, m.repaired, m.placebo], m.book);
  }
  for (const m of byId["pair-direction-is-a-weak-rung"].measured) {
    const v = primary(read(`results/${m.file}`));
    assert.equal(+v.S.E.toFixed(3), m.E_S, m.file);
    assert.equal(+v.S.p_E.toFixed(3), m.p_E_S, m.file);
  }
  // the finding's sentence quotes three contrasts and the held-out range; check the contrasts against the runs
  const contrasts = ["f4-dracula.json", "f4-pride.json", "f4-plays.json"].map((f) => +primary(read(`results/${f}`)).contrast.delta.toFixed(3));
  assert.deepEqual(contrasts, [0.065, 0.095, 0.052]);
});

test("every LIMIT sits on a terrain the map places, and names the organ it is a limit of", () => {
  for (const l of LIMITS) {
    assert.ok(l.terrain && l.organ && l.finding, l.id);
    assert.ok(["Field", "Entity", "Link"].includes(l.terrain));
  }
  assert.equal(LIMITS.find((l) => l.id === "pair-direction-is-a-weak-rung").quantityClass, "transcendental", "the quantity's class differs from the act's: the seam F3 and F4 both landed on");
});
