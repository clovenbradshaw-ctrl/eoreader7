// reproduction.test.js — the medium-blind reproduction organ, against the
// REAL text fold (quotes.js's own normalizedIndex) and against a non-text
// medium, so "medium-blind" is a thing this suite RUNS rather than asserts.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeReproduction, EXACT, FOLDED, ABSENT } from "../kernel/reproduction.js";
import { normalizedIndex } from "../organs/quotes.js";

// The text medium's own two injections: the real fold this instrument
// already uses for every containment, and its own notion of "the same raw
// units" (layout shed — a source's line wrap is typesetting, not content).
const shedLayout = (s) => String(s).replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
const text = makeReproduction({ fold: normalizedIndex, sameRaw: (a, b) => shedLayout(a) === shedLayout(b) });

test("the kernel names no medium — this file reads the source and fails if one appears", () => {
  const src = readFileSync(new URL("../kernel/reproduction.js", import.meta.url), "utf8");
  const body = src.split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*")).join("\n");
  for (const word of ["sentence", "word", "quotation", "quote", "paragraph", "pixel", "note", "bar", "frame"]) {
    assert.ok(!new RegExp(`\\b${word}\\b`, "i").test(body), `the kernel's body names a medium: "${word}"`);
  }
});

test("locate: a stretch reproduced byte-for-byte reads EXACT, with an address that reads back", () => {
  const body = { id: "page-b", material: "The council met on Tuesday. Dredging of the channel runs through March. Nobody objected." };
  const r = text.locate("Dredging of the channel runs through March", [body]);
  assert.equal(r.status, EXACT);
  assert.equal(r.body, "page-b");
  assert.equal(body.material.slice(r.from, r.to), "Dredging of the channel runs through March");
  assert.equal(r.address, `page-b#${r.from}-${r.to}`);
  assert.equal(r.contextChecked, false, "shared units are never a claim about faithful use");
});

test("locate: the same words with different marks read FOLDED, not EXACT and not absent", () => {
  const body = { id: "page-b", material: "She wrote that Hélène — the elder — had already left." };
  const r = text.locate("Helene - the elder - had already left", [body]);
  assert.equal(r.status, FOLDED, "found under the shared fold; the raw units differ");
  assert.equal(body.material.slice(r.from, r.to), "Hélène — the elder — had already left");
});

test("CONTROL BUILT TO FAIL: material that is NOT there is typed absent, never located", () => {
  const body = { id: "page-b", material: "The council met on Tuesday and adjourned early." };
  const r = text.locate("the harbour was dredged through March", [body]);
  assert.equal(r.status, ABSENT);
  assert.equal(r.reason, "not_in_these_bodies", "a search that ran and found nothing is not the same fact as a search that never ran");
});

test("sharedRuns: the UNCLAIMED reproduction — the same run on two pages, with nothing marking it", () => {
  // Neither page quotes, cites, or marks the other in any way.
  const a = { id: "page-a", material: "Local news. Baltimore riot of 1861. Battlefield preservation. Confederate war finance. Something only page A says." };
  const b = { id: "page-b", material: "Other coverage entirely. Baltimore riot of 1861. Battlefield preservation. Confederate war finance. And page B's own line." };
  const runs = text.sharedRuns(a, [b], { minRun: 20 });
  assert.ok(runs.length >= 1, "the shared stretch is found with no mark, citation or claim anywhere");
  const longest = runs.sort((x, y) => y.units - x.units)[0];
  assert.match(longest.inSource.raw, /Baltimore riot of 1861/);
  assert.equal(a.material.slice(longest.inSource.from, longest.inSource.to), longest.inSource.raw, "the address reads back (P5.2)");
  assert.equal(longest.alsoIn.body, "page-b");
  assert.match(b.material.slice(longest.alsoIn.from, longest.alsoIn.to), /Baltimore riot of 1861/);
});

test("CONTROL BUILT TO FAIL: two bodies sharing nothing above the floor report nothing", () => {
  const a = { id: "a", material: "The council met on Tuesday and adjourned early after a short debate." };
  const b = { id: "b", material: "Rainfall totals for the western basin exceeded every prior October." };
  assert.deepEqual(text.sharedRuns(a, [b], { minRun: 20 }), [], "ordinary unrelated prose shares no run of this length");
});

test("CONTROL: a shared stretch BELOW the declared floor is not a reproduction", () => {
  const a = { id: "a", material: "the channel was dredged" };
  const b = { id: "b", material: "the channel was widened" };
  assert.deepEqual(text.sharedRuns(a, [b], { minRun: 60 }), [], "'the channel was ' is shared and is under the floor — coincidence, not reproduction");
  assert.ok(text.sharedRuns(a, [b], { minRun: 5 }).length >= 1, "and the same material clears a floor the caller declares lower");
});

test("minRun is declared — never a constant this file picks", () => {
  const a = { id: "a", material: "aaaa" };
  assert.throws(() => text.sharedRuns(a, [{ id: "b", material: "aaaa" }], {}), /minRun is declared/);
});

test("MEDIUM-BLIND, RUN NOT ASSERTED: the same organ over a non-text event stream", () => {
  // An event stream: arrays of symbols, its own fold (case-fold the symbol
  // names, drop a padding symbol the medium treats as layout), its own
  // notion of raw sameness.
  const foldEvents = (material) => {
    const norm = [];
    const map = [];
    material.forEach((sym, i) => {
      if (sym === "-") return; // this medium's own layout unit
      norm.push(String(sym).toLowerCase());
      map.push(i);
    });
    return { norm, map };
  };
  const events = makeReproduction({ fold: foldEvents, sameRaw: (a, b) => JSON.stringify(a) === JSON.stringify(b) });

  const runA = { id: "run-a", material: ["idle", "Q2", "-", "Q4", "Q1", "idle", "burst"] };
  const runB = { id: "run-b", material: ["calm", "q2", "q4", "-", "q1", "settle"] };
  const runs = events.sharedRuns(runA, [runB], { minRun: 3 });
  assert.equal(runs.length, 1, "the ejection-sweep cycle recurs across two runs of a wholly different medium");
  assert.deepEqual(runA.material.slice(runs[0].inSource.from, runs[0].inSource.to), ["Q2", "-", "Q4", "Q1"]);
  assert.deepEqual(runB.material.slice(runs[0].alsoIn.from, runs[0].alsoIn.to), ["q2", "q4", "-", "q1"]);

  const hit = events.locate(["Q4", "Q1"], [runB]);
  assert.equal(hit.status, FOLDED, "found under this medium's own fold, its raw symbols differing in case");
});

test("no sameRaw is a declared regime, not a silent default: everything found reads FOLDED", () => {
  const noRaw = makeReproduction({ fold: normalizedIndex });
  const r = noRaw.locate("runs through March", [{ id: "b", material: "Dredging runs through March." }]);
  assert.equal(r.status, FOLDED, "without a declared notion of raw sameness, nothing may be typed exact");
});

test("a fold is required — there is no default normalization for an unnamed medium", () => {
  assert.throws(() => makeReproduction({}), /fold is the caller's own/);
});
