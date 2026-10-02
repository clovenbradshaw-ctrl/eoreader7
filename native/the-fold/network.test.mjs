// network.test.mjs — CON at Pattern grain, against the REAL engine surface
// organ and the REAL saved page whose reading failure produced this module.
//
// The specimen is `web/pages/31a113281ca5cffa.txt` — "List of prime ministers
// of Queen Victoria", fetched live, saved by the web organ, and read by the
// Link-grain extractor for ZERO edges.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import { makeNetworkBinder, extentShape, surfaceShape, readDate, RECURRENCE_FLOOR } from "./network.js";

const { extractSurfaces } = await import("../adapters/text/surfaces.js");
const binder = makeNetworkBinder({ shapes: [extentShape, surfaceShape({ extractSurfaces })] });

const PAGE = new URL("./web/pages/31a113281ca5cffa.txt", import.meta.url);
const havePage = existsSync(PAGE);

test("an extent line is one that is ENTIRELY extents — prose holding a range is not", () => {
  assert.ok(extentShape.read("20 June 1837 – 30 August 1841"));
  assert.ok(extentShape.read("March 4, 1861 – March 4, 1865"), "month-first is read too, not only day-first");
  assert.ok(extentShape.read("1834-1835; 1841-1846"), "bare years, several ranges on a line");
  // The exhaustiveness is what stops ordinary sentences joining an arrangement.
  assert.equal(extentShape.read("he served from 1841 to 1846 with distinction"), null);
  assert.equal(extentShape.read("Sir Robert Peel"), null);
});

test("a bare year states a year — no month or day is invented for it", () => {
  assert.deepEqual(readDate("1846"), { year: 1846, month: null, day: null, text: "1846" });
  assert.deepEqual(readDate("30 August 1841"), { year: 1841, month: 8, day: 30, text: "30 August 1841" });
  assert.deepEqual(readDate("March 4, 1861"), { year: 1861, month: 3, day: 4, text: "March 4, 1861" });
  assert.equal(readDate("sometime in the 1840s"), null);
});

test("A CYCLE OF ONE SHAPE BINDS NOTHING — CON relates, and a run of like lines does not", () => {
  const twoNames = "Sir Robert Peel\nLord John Russell\nBenjamin Disraeli";
  assert.deepEqual(binder.bindRecurring(twoNames).systems, [], "three names in a row is three names");
});

test("an unrecognized line is a hole, never a wildcard a pattern may cross", () => {
  // The middle line is prose: it has a terminator, so no shape reads it. A
  // binder that treated an unknown line as "anything" would happily bind
  // across it and report one system where there are two records and a gap.
  const holed = "Sir Robert Peel\n30 August 1841 – 29 June 1846\nHe was a Conservative.\nLord John Russell\n30 June 1846 – 21 February 1852";
  const { systems } = binder.bindRecurring(holed);
  for (const s of systems) {
    for (const inst of s.instances) {
      assert.ok(!inst.rows.some((r) => /Conservative/.test(r.text)), "prose never lands inside a bound system");
    }
  }
});

test("the floor is two instances — one arrangement is a coincidence", () => {
  assert.equal(RECURRENCE_FLOOR, 2);
  const one = "Sir Robert Peel\n30 August 1841 – 29 June 1846";
  assert.deepEqual(binder.bindRecurring(one).systems, []);
  const two = `${one}\nLord John Russell\n30 June 1846 – 21 February 1852`;
  assert.equal(binder.bindRecurring(two).systems.length, 1);
});

test("the organ does not know it is reading offices — swap the shapes, read a changelog", () => {
  // The generality claim, exercised rather than asserted. A version-shape and
  // a bare-year extent, same binder, no change to it.
  const versionShape = { name: "version", read: (l) => (/^v\d+\.\d+\.\d+$/.test(l.trim()) ? { version: l.trim() } : null) };
  const b = makeNetworkBinder({ shapes: [extentShape, versionShape] });
  const changelog = "v1.0.0\n2019-2020\nv1.4.0\n2020-2021\nv2.0.0\n2021-2022";
  const { systems } = b.bindRecurring(changelog);
  assert.equal(systems.length, 1);
  assert.deepEqual(systems[0].shape, ["version", "extent"]);
  assert.equal(systems[0].count, 3);
});

test("THE SPECIMEN: the whole real page, and the ten holders the Link-grain organ could not reach", { skip: !havePage }, () => {
  const page = readFileSync(PAGE, "utf8");
  // The WHOLE page is handed over — no hand-cut block, so the organ has to
  // find its own systems among 709 lines of navigation, headings and prose.
  const { systems } = binder.bindRecurring(page, { ref: "web:list" });

  assert.equal(systems.length, 2, "two record blocks on this page, and no noise");
  for (const s of systems) assert.deepEqual(s.shape, ["surface", "extent"]);

  const uk = systems.find((s) => s.instances.some((i) => /Melbourne/.test(i.rows[0].text)));
  assert.ok(uk, "the United Kingdom block is found");
  assert.equal(uk.count, 10, "ten prime ministers served Victoria");

  const named = uk.instances.map((i) => i.rows[0].text);
  for (const pm of ["Melbourne", "Peel", "Russell", "Derby", "Aberdeen", "Palmerston", "Disraeli", "Gladstone", "Salisbury", "Rosebery"]) {
    assert.ok(named.some((n) => n.includes(pm)), `${pm} is one of the ten and must be bound`);
  }

  // Discontinuous service is kept as several extents, never flattened to one
  // span from first to last — Gladstone was prime minister four separate
  // times and a single 1868–1894 range would be a fact nobody stated.
  const gladstone = uk.instances.find((i) => /Gladstone/.test(i.rows[0].text));
  assert.equal(gladstone.rows[1].read.length, 4);

  // P5.2 at Pattern grain: every span reproduces its own bytes.
  for (const s of systems) {
    for (const inst of s.instances) {
      const sliced = page.slice(inst.span.start, inst.span.end).split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
      assert.equal(sliced, inst.span.text);
    }
  }
});

// Three fixes below, found live 2026-09-10 driving the real chat page on
// "Who was Franklin D. Roosevelt's vice president?" — the real saved
// Wikipedia infobox (web/pages/bc8ea4d9eb20adb1.txt, gitignored, not
// committed) reads:
//
//   Vice President
//   -
//   John Nance Garner
//   (1933–1941)
//   -
//   Henry A. Wallace
//   (1941–1945)
//   -
//   Harry S. Truman
//   (Jan–Apr 1945)
//
// A synthetic fixture reproduces the exact shape rather than depending on
// that gitignored file — source-short-run-merge.test.mjs's own precedent,
// for the same reason: a test that only passes on one machine's web cache
// is not a test.
const FDR_INFOBOX = [
  "Vice President",
  "-",
  "John Nance Garner",
  "(1933–1941)",
  "-",
  "Henry A. Wallace",
  "(1941–1945)",
  "-",
  "Harry S. Truman",
  "(Jan–Apr 1945)",
].join("\n");

test("a lone bullet marker is rendering, not the arrangement — bindRecurring steps over it", () => {
  // Without the fix, each bare "-" types null (no date, no name) and breaks
  // the cycle between rows that would otherwise bind cleanly.
  const withBullets = "John Nance Garner\n(1933–1941)\n-\nLord John Russell\n(1846–1852)";
  const { systems } = binder.bindRecurring(withBullets);
  assert.equal(systems.length, 1, "the bullet line does not fracture the arrangement");
  assert.equal(systems[0].count, 2);

  // A line that STARTS with a bullet and says more is untouched — only a
  // line that is nothing BUT the marker is skipped.
  assert.equal(extentShape.read("- John Nance Garner (1933–1941)"), null, "the dash is real content here, not typed as an extent alone");
});

test("surfaceShape admits a name broken by a middle-initial period only when given isAbbreviationBoundary — every existing caller is byte-identical", async () => {
  const { ABBREV } = await import("../organs/index.js");
  // Byte-identical for the existing, unwired shape: the veto still fires on
  // a real sentence terminator, and STILL fires on "Henry A." without the
  // guard — this is the regression the omission must not silently fix.
  const bareShape = surfaceShape({ extractSurfaces });
  assert.equal(bareShape.read("Henry A. Wallace"), null, "no isAbbreviationBoundary supplied: the period still reads as a sentence end");

  const guardedShape = surfaceShape({ extractSurfaces, isAbbreviationBoundary: (t) => ABBREV.test(t) });
  const wallace = guardedShape.read("Henry A. Wallace");
  assert.ok(wallace, "with the guard, a middle initial's period is not mistaken for a sentence end");
  // extractSurfaces drops the sentence-INITIAL capitalized word by its own
  // design (capitalization alone is never evidence, L2) — "Henry A. Wallace"
  // surfaces as "A Wallace", not the full three-word name. That is the real
  // engine's behavior, asserted here rather than assumed.
  assert.ok(wallace.longest.includes("Wallace"));

  const truman = guardedShape.read("Harry S. Truman");
  assert.ok(truman, "the founding P186 specimen's own name reads clean here too");
  assert.ok(truman.longest.includes("Truman"));

  // A genuine sentence still vetoes — the guard is scoped to abbreviations,
  // never a blanket "ignore periods."
  assert.equal(guardedShape.read("He was a Conservative."), null);
});

test("extentShape reads a shared-year month range — 'Jan–Apr 1945', a tenure inside one calendar year", () => {
  const read = extentShape.read("(Jan–Apr 1945)");
  assert.ok(read, "the shared-year form is recognized as a range, not rejected as an incomplete date");
  assert.equal(read.length, 1);
  assert.deepEqual(read[0].from, { year: 1945, month: 1, day: null, text: "Jan 1945" });
  assert.deepEqual(read[0].to, { year: 1945, month: 4, day: null, text: "Apr 1945" });

  // Full month names work too, not only the three-letter abbreviation.
  const full = extentShape.read("January–April 1945");
  assert.ok(full);
  assert.equal(full[0].from.month, 1);
  assert.equal(full[0].to.month, 4);

  // "to" as a written-out range word, and surrounding punctuation the main
  // loop's own residue check already tolerates.
  assert.ok(extentShape.read("(Jan to Apr 1945)"));

  // A genuinely unparseable single year is still refused by this pattern —
  // it is a NEW alternative reading, not a wider net that admits anything.
  assert.equal(extentShape.read("(1945)"), null, "extentShape alone does not parse a bare single year as a range");
});

test("THE SPECIMEN: all three fixes together bind the real infobox shape — Garner, Wallace, AND Truman, not just the first two", async () => {
  const { ABBREV } = await import("../organs/index.js");
  const guardedBinder = makeNetworkBinder({
    shapes: [extentShape, surfaceShape({ extractSurfaces, isAbbreviationBoundary: (t) => ABBREV.test(t) })],
  });
  const { systems } = guardedBinder.bindRecurring(FDR_INFOBOX);
  assert.equal(systems.length, 1, "one arrangement: the whole VP list");
  assert.equal(systems[0].count, 3, "all three vice presidents bound, not two");

  const names = systems[0].instances.map((i) => i.rows[0].text);
  assert.ok(names.some((n) => n.includes("Garner")));
  assert.ok(names.some((n) => n.includes("Wallace")));
  assert.ok(names.some((n) => n.includes("Truman")), "Truman is bound, not dropped for his shared-year month range and middle initial");

  // Without EITHER fix, the same text regresses to what P186's own live
  // specimen actually showed: Truman lost, either to the bullet break or
  // to the un-guarded abbreviation veto (or both).
  const unguardedBinder = makeNetworkBinder({ shapes: [extentShape, surfaceShape({ extractSurfaces })] });
  const bare = unguardedBinder.bindRecurring(FDR_INFOBOX);
  const bareNames = (bare.systems[0]?.instances ?? []).map((i) => i.rows[0].text);
  assert.ok(!bareNames.some((n) => n.includes("Truman")), "the regression this fix closes: Truman was the one dropped");
});

test("THE CONTROL: the Link-grain organ really does get zero here, so this is a grain gap", { skip: !havePage }, async () => {
  // Without this the whole diagnosis is an assertion. A vocabulary gap
  // degrades; a grain mismatch floors — and it floors.
  const E = "../adapters/text/";
  const { makeRelationReader } = await import("../organs/hypergraph.js");
  const { splitSentences } = await import(`${E}spans.js`);
  const { discoverReferents, namesCorefer, diaNorm } = await import(`${E}surfaces.js`);
  const { discoverRelationVocab, extractRelations } = await import(`${E}relations.js`);
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(`${E}material.js`);

  // THE EXACT BYTES the Pattern-grain organ bound, taken from its own spans —
  // never a hand-cut region, which is how the first version of this control
  // accidentally included surrounding prose and measured 23 edges from
  // sentences that were never part of the record block.
  const page = readFileSync(PAGE, "utf8");
  const uk = binder
    .bindRecurring(page, { ref: "web:list" })
    .systems.find((sys) => sys.instances.some((i) => /Melbourne/.test(i.rows[0].text)));
  const block = uk.instances.map((i) => i.span.text).join("\n\n");
  assert.match(block, /Gladstone/, "the control has to be reading the real block");
  const P = [{ ref: "web:list", text: block }];
  const reader = makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations, tokenize, buildFrequencyTable, functionWordSet,
  })(P, { pool: P });

  assert.equal((reader.edges ?? []).length, 0, "zero, not few — there is no connector in a record block");
});
