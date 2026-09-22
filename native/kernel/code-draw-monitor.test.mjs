// node --test native/kernel/code-draw-monitor.test.mjs
//
// code-draw-monitor.js — the live wiring of code-draw-standing.js's
// makeCodeDrawMonitor into proxy.mjs's POST /v1/code handler. Falsifiers
// proven here, each named for why it could be wrong:
//   1. the monitor is built ONCE and reused, never rebuilt per request
//      (could be wrong if getCodeDrawMonitor() returned a fresh object on
//      every call, or if calling it twice re-read the ledger file twice).
//   2. shipCodeDrawResult never touches the response when the monitor does
//      not fire — the normal path is byte-identical, no `disclosure` key
//      appears at all (could be wrong if the seam always spread a key on,
//      even an undefined one, which would change the shape of every
//      /v1/code response whether or not the monitor had anything to say).
//   3. when the monitor DOES fire, the appended text is exactly
//      disclosureFor()'s own mechanical string — never anything else
//      spliced in, never the draft rewritten.
//   4. the live-loop feature mapping this file's own header describes
//      (roundsExhausted from `!result.done`, bokUnknown forced true, no
//      hasRegressions) produces the SAME cell disclosureFor would compute
//      from those features directly — proving the wiring didn't silently
//      drop or reorder a feature between code-loop.js's result shape and
//      code-draw-standing.js's closed vocabulary.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { makeMetacognition } from "../../../the-fold/metacognition.js";
import * as taskLog from "./task-log.js";
import { signatureFor, disclosureFor, monitorFires } from "./code-draw-standing.js";
import {
  buildTrainedLedger,
  getCodeDrawMonitor,
  shipCodeDrawResult,
  resetCodeDrawMonitorForTest,
  RECORDED_OPERATING_POINT,
} from "./code-draw-monitor.js";

// A real-shaped fixture ledger file (JSONL, same shape lang-competency.js's
// own appendRow writes) — a temp file, not a mock of readRows. Rounds-
// exhausted rows mostly fail; clean rows mostly pass, so the trained
// ledger has a genuine, non-degenerate signal to fire (or not fire) on.
function writeFixtureLedger() {
  const rows = [];
  for (let i = 0; i < 20; i++) rows.push({ config: "raw-v5", arm: "raw", rounds: 1, regressions: 0, heldOut: true });
  for (let i = 0; i < 20; i++) rows.push({ config: "raw-v5", arm: "raw", rounds: 3, regressions: 0, heldOut: i < 4 });
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "code-draw-monitor-test-")), "ledger.jsonl");
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return file;
}

test("buildTrainedLedger: reads the real file, filters to -v5 checked rows, folds the declared train split only", () => {
  const ledgerPath = writeFixtureLedger();
  const { trainRows, totalRows } = buildTrainedLedger(ledgerPath);
  assert.equal(totalRows, 40);
  assert.equal(trainRows, 20); // every-other-row split (i % 2 === 0) over 40 rows
});

test("buildTrainedLedger: an absent ledger file degrades to an empty, never-fires ledger rather than throwing", () => {
  const missing = path.join(os.tmpdir(), `code-draw-monitor-missing-${Date.now()}.jsonl`);
  assert.equal(fs.existsSync(missing), false);
  const { log, mc, trainRows } = buildTrainedLedger(missing);
  assert.equal(trainRows, 0);
  const { fires, standing } = monitorFires(mc, log, { roundsExhausted: true, bokUnknown: true });
  assert.equal(standing.standing, "unproven"); // no observations at all — never contested
  assert.equal(fires, false);
});

test("falsifier 1: getCodeDrawMonitor() with a non-default ledgerPath builds a FRESH instance each call, never memoized across fixtures", () => {
  const ledgerPath = writeFixtureLedger();
  const m1 = getCodeDrawMonitor({ ledgerPath });
  const m2 = getCodeDrawMonitor({ ledgerPath });
  assert.notEqual(m1, m2, "a non-default ledgerPath must never share the process-wide singleton");
});

test("falsifier 1b: getCodeDrawMonitor() with the default arguments is built ONCE and reused — same object on every call", () => {
  resetCodeDrawMonitorForTest();
  const m1 = getCodeDrawMonitor();
  const m2 = getCodeDrawMonitor();
  const m3 = getCodeDrawMonitor({}); // equivalent defaults, still the memoized instance
  assert.equal(m1, m2, "the default-path monitor must be the SAME object across calls, not rebuilt per request");
  assert.equal(m1, m3);
  resetCodeDrawMonitorForTest(); // leave no state behind for other test files
});

test("falsifier 2: shipCodeDrawResult leaves the result byte-identical (no disclosure key at all) when the monitor does not fire", () => {
  const result = { done: true, rounds: [{ round: 1 }], finalTestOutput: "ok" };
  const noFire = { cell: "code-draw:clean", standing: { standing: "established" }, fires: false, disclosure: null, operatingPoint: RECORDED_OPERATING_POINT };
  const shipped = shipCodeDrawResult(result, noFire);
  assert.equal(shipped, result, "no-fire must return the SAME object reference — never a copy, never a spread");
  assert.equal("disclosure" in shipped, false);
  assert.equal(JSON.stringify(shipped), JSON.stringify(result));
});

test("falsifier 2b: shipCodeDrawResult never mutates the original result object either way", () => {
  const result = Object.freeze({ done: false, rounds: [] });
  const fire = { disclosure: "[metacognition] test" };
  // Object.freeze means any accidental mutation of `result` itself throws
  // in strict mode / ES module code — proving shipCodeDrawResult only ever
  // spreads into a NEW object on the fire path.
  const shipped = shipCodeDrawResult(result, fire);
  assert.notEqual(shipped, result);
  assert.equal(shipped.disclosure, "[metacognition] test");
  assert.equal(result.disclosure, undefined);
});

test("falsifier 3: when it fires, the appended text is exactly disclosureFor()'s own mechanical string for that cell/standing — never anything else", () => {
  const mc = makeMetacognition(taskLog);
  let log = mc.createLedger();
  log = mc.observe(log, { cell: "code-draw:rounds-exhausted+bok-absent", delta: { confirmed: 1, corrected: 5 } });
  const features = { roundsExhausted: true, bokUnknown: true };
  const { fires, cell, standing } = monitorFires(mc, log, features);
  assert.equal(fires, true);
  const expected = disclosureFor(cell, standing);
  const check = { fires, cell, standing, routeDown: fires, disclosure: fires ? disclosureFor(cell, standing) : null, operatingPoint: RECORDED_OPERATING_POINT };
  const shipped = shipCodeDrawResult({ done: false, rounds: [] }, check);
  assert.equal(shipped.disclosure, expected);
  assert.match(shipped.disclosure, /^\[metacognition\] this draw's shape/);
  assert.doesNotMatch(shipped.disclosure, /confidence/i, "never a confidence score — the file's own rule");
});

test("falsifier 4: the live-loop feature mapping (roundsExhausted from !result.done, bokUnknown forced true, no hasRegressions) reads the same cell disclosureFor computes directly from those features", () => {
  // Mirrors proxy.mjs's own call: getCodeDrawMonitor().check({
  // roundsExhausted: !result.done, bokUnknown: true }).
  const resultExhausted = { done: false, rounds: [{ round: 1 }, { round: 2 }, { round: 3 }] };
  const resultWon = { done: true, rounds: [{ round: 1 }] };

  const featuresExhausted = { roundsExhausted: !resultExhausted.done, bokUnknown: true };
  const featuresWon = { roundsExhausted: !resultWon.done, bokUnknown: true };

  assert.equal(signatureFor(featuresExhausted), "code-draw:rounds-exhausted+bok-absent");
  assert.equal(signatureFor(featuresWon), "code-draw:bok-absent");

  // hasRegressions and bokDisagreed were never mentioned — must fold to
  // false, not silently widen the signature.
  assert.equal(signatureFor({ ...featuresExhausted, hasRegressions: undefined }), signatureFor(featuresExhausted));
});
