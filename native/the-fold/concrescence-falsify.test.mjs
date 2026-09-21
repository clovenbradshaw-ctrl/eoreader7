// concrescence-falsify.test.mjs — THE FALSIFICATION TIER for the concrescence
// detector (2026-09-21):
//
//   "satisfaction is the FINAL PHASE OF THE CONCRESCENCE, not strain hitting
//   zero. The detector reads the rotation stream and tells us when we have
//   arrived: strain constant + influx-stable + every unit required. Held
//   tension is the piece's SUBJECTIVE FORM — its character — not a debt. The
//   detector's answer is always usable: it names which signal is missing."
//
// Each falsification attacks a consequence of that law.
import test from "node:test";
import assert from "node:assert/strict";
import { removalTest, influxStability, tensionHold, phaseOf, isConcrescent, PHASES } from "./concrescence.js";

// ── C1  A CONVERGENT ROTATION LOG CLASSIFIES AS SATISFACTION. The triad —
// strain constant, influx-stable, every unit required — reads "satisfaction".
test("C1 — a convergent log classifies as satisfaction (phase + isConcrescent)", () => {
  const units = [
    "The Cumberland drains a vast basin and joins the Ohio at Smithland.",
    "The river was named for the Duke of Cumberland in 1750.",
    "Steamboats made Nashville a commercial hub after 1819.",
    "Floods in 1927 and 1937 shaped the city's relationship with the river.",
  ];
  const whole = units.join("\n\n");
  // SAT IS A DEFICIT (2026-09-21, C1's first failure): strain = missing facts.
  // Removing a REQUIRED unit raises the deficit, so the removal test reads
  // "removing degrades the whole" as `without.strain > whole.strain`. A
  // boolean 0/1 at a word-count threshold could not distinguish "removed one
  // of four facts" from "still has enough facts" — a required unit looked
  // independent. The deficit is the honest measure.
  const KEYWORDS = ["drains", "named", "steamboats", "floods"];
  const sat = (t) => {
    const present = KEYWORDS.filter((k) => String(t).toLowerCase().includes(k)).length;
    return { strain: KEYWORDS.length - present };
  };
  const log = [
    { textAfter: "The river.", gathered: 3, strain: 2 },
    { textAfter: "The river drains a basin.", gathered: 2, strain: 1 },
    { textAfter: "The river drains a basin and joins the Ohio.", gathered: 1, strain: 1 },
    { textAfter: "The river drains a basin and joins the Ohio.", gathered: 1, strain: 1 },
    { textAfter: "The river drains a basin and joins the Ohio.", gathered: 1, strain: 1 },
  ];
  const v = isConcrescent({ whole, units, sat, log, strain: 1 });
  assert.ok(v.concrescent, "the triad holds — concrescence reached");
  assert.equal(v.signals.removal, true, "every unit is required");
  assert.equal(v.signals.influxStable, true, "influx-stable");
  assert.equal(v.signals.strainConstant, true, "strain constant (not zero — CONSTANT)");
});

// ── C2  A STILL-FIGHTING LOG CLASSIFIES AS COMPARATIVE. broke→cut continuing,
// strain moving, influx still altering the text — the integration is in
// progress, and the detector says so instead of claiming arrival.
test("C2 — a still-fighting log classifies as comparative, not satisfaction", () => {
  const log = [
    { textAfter: "The vital bustling city.", gathered: 4, strain: 3 },
    { textAfter: "The vital city.", gathered: 2, strain: 2 },
    { textAfter: "The city grew.", gathered: 2, strain: 1 },
    { textAfter: "The city grew as a port.", gathered: 1, strain: 0 },
  ];
  const ph = phaseOf(log);
  assert.equal(ph.phase, PHASES.COMPARATIVE, "strain still moving, nothing held — comparative");
  const v = isConcrescent({ whole: "x", units: ["x", "y"], sat: () => ({ strain: 0 }), log, strain: 0 });
  assert.equal(v.concrescent, false, "strain is not constant (moving 3→0) — not satisfied");
});

// ── C3  THE REMOVAL TEST FAILS ON A NON-INTEGRATED LIST. A list whose
// sections are independent passes vacuously — removing a section leaves the
// whole "fine" — so it is NOT a determinate unity. The test must catch this.
test("C3 — the removal test fails on a non-integrated list", () => {
  const units = [
    "The river flows 688 miles.",
    "Nashville was founded in 1779.",
    "Steamboats arrived in 1819.",
  ];
  const whole = units.join("\n\n");
  const sat = (t) => ({ strain: t.split(/\s+/).length > 3 ? 1 : 0 }); // any single unit is "fine"
  const v = removalTest(whole, units, sat);
  assert.equal(v.passed, false, "removing any section leaves the whole fine — a list, not a unity");
  assert.ok(v.independent.length >= 1, "the independent sections are named");
});

// ── C4  STRAIN AT SATISFACTION IS CONSTANT, NOT ZERO (the law that kills the
// naive strain=0 stop). A piece carrying its tension as character has non-zero
// strain and is satisfied; a strain-0 piece would be dead — no counterweight.
test("C4 — satisfaction is strain CONSTANT, not strain zero", () => {
  const log = [
    { textAfter: "The flood returns.", gathered: 2, strain: 2 },
    { textAfter: "The flood returns every generation.", gathered: 1, strain: 2 },
    { textAfter: "The flood returns every generation.", gathered: 1, strain: 2 },
  ];
  const held = tensionHold(log, { sat: () => ({ strain: 2 }), whole: "x" });
  const v = isConcrescent({ whole: "x", units: ["a", "b"], sat: () => ({ strain: 2 }), log, strain: 2 });
  assert.ok(v.signals.strainConstant, "strain constant at 2 — not zero");
  assert.equal(v.details.strains[0], 2, "the constant strain is recorded");
  // The detector does not demand strain 0 — it demands strain UNCHANGED.
  assert.equal(v.signals.influxStable, true, "influx-stable despite non-zero strain");
});

// ── C5  THE DETECTOR'S ANSWER IS ALWAYS USABLE — it names WHICH signal is
// missing, never a bare "no". A failed verdict discloses the failing signal.
test("C5 — a negative verdict names the missing signal", () => {
  const units = ["The river flows.", "Nashville grew."];
  const whole = units.join("\n\n");
  const sat = (t) => ({ strain: 1 });
  const log = [{ textAfter: "The river.", gathered: 1, strain: 1 }];
  const v = isConcrescent({ whole, units, sat, log, strain: 1 });
  assert.equal(v.concrescent, false);
  assert.ok(String(v.basis).length > 10, "the basis explains the gap");
  assert.ok(typeof v.details.removal === "object" && typeof v.details.influx === "object", "the failing signals are carried as data, not hidden");
});