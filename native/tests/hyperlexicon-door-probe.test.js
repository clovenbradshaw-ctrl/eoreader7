// hyperlexicon-door-probe.test.js — P73's door measurement, read on every
// suite run (the-fold P95 / S65).
//
// `results/hyperlexicon-door-probe-RESULTS.md` (2026-09-01) is a hand
// transcription of the driver's stdout; the 2026-09-05 audit (P94) found it
// drifted (arm A 29 → 30 notes; arms B/C bound 15 → 16, notes 10 → 12) with
// the finding intact. What is pinned is the RULE the doc stands on, not the
// counts of a specimen:
//   · arm A (no prior) admits closed-class labels — the defect arm must be
//     exercised, or the pin is vacuous;
//   · arms B and C (prior on the reader) admit NONE from the probe's
//     disclosed hand list — the prior removes them at extraction;
//   · the door gate (C) turns away nothing B did not already refuse — the
//     "wall behind a wall" claim;
//   · B and C read identical verdicts.
// Disclosed, never asserted: the per-arm counts, the ≥2-witness notes
// (0 on real prose until the identity organ lands — a known gap, not a
// target), and the labels the POS prior has no entry for (the 09-05 re-run's
// finding: Cyrillic "и" in the article's Russian title reaches the ledger
// as a label the English hand list cannot see).
//
// Mirrors the LIVE turn through the-fold's own modules, as the driver does;
// without a the-fold checkout beside this repo the test skips with a typed
// reason rather than measuring a different reader.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { assembleDoorProbe, runDoorProbe } from "../eval/the-fold/lib/door-probe.mjs";

const FOLD = new URL("../../../the-fold/", import.meta.url).pathname;
const NATIVE = new URL("../", import.meta.url).pathname;
const FIX = new URL("../eval/the-fold/fixtures", import.meta.url).pathname;

const foldPresent = existsSync(`${FOLD}hypergraph.js`) && existsSync(`${FOLD}priors-data/pos-prior-eng.json`);

test("the door probe: the prior removes every hand-listed closed-class label; the gate is a wall behind a wall", { skip: foldPresent ? false : "fixture_absent: the-fold checkout (or its pos-prior-eng.json) is not beside this repo — the probe mirrors the live turn and will not measure a substitute reader" }, async () => {
  const m = await assembleDoorProbe({ fold: FOLD, native: NATIVE, fixtures: FIX, readFileSync, existsSync });
  assert.ok(m.posPrior, "the shipped POS prior is present");
  const arms = runDoorProbe(m);
  assert.ok(arms.A.closedLabels > 0, "arm A must admit closed-class labels — otherwise the defect is not exercised and the pin is vacuous");
  assert.equal(arms.B.closedLabels, 0, `arm B admitted closed-class labels: ${arms.B.notes.filter((n) => m.closed.has(String(n.verb).toLowerCase())).map((n) => n.verb).join(", ")}`);
  assert.equal(arms.C.closedLabels, 0, `arm C admitted closed-class labels: ${arms.C.notes.filter((n) => m.closed.has(String(n.verb).toLowerCase())).map((n) => n.verb).join(", ")}`);
  assert.equal(Object.keys(arms.C.away).length, 0, `the door turned away edges the prior had not already refused: ${JSON.stringify(arms.C.away)}`);
  assert.deepEqual(arms.C.verdicts, arms.B.verdicts, "arms B and C read the same verdicts — the gate changes nothing the reader has already cleaned");
  for (const k of ["A", "B", "C"]) {
    const a = arms[k];
    console.log(
      `  arm ${k}: bound ${a.verdicts.bound ?? 0}, notes ${a.notes.length}, closed-class ${a.closedLabels}, ≥2 witnesses ${a.corroborated}, ` +
        `prior has no entry for ${a.unattestedLabels.length}${a.unattestedLabels.length ? ` (${[...new Set(a.unattestedLabels)].join(", ")})` : ""}`,
    );
  }
});
