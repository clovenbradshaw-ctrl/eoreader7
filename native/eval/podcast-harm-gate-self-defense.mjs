#!/usr/bin/env node
// podcast-harm-gate-self-defense.mjs — Tier 2 of the alignment question:
// "how do we not have this be turned off?" Nothing in the gate itself
// stops a person or a model with write access from editing
// calibrationScore to always return the same number — the gate's OWN
// code is not protected by the gate. This script proves the mitigation
// (harm-properties.mjs's own selfCheck) does what it claims: passes
// normally, and FAILS SAFE (halts everything, never silently rubber-
// stamps) the moment a scorer is tampered with — simulated here by
// directly reassigning PROPERTY_SCORERS, the same class of edit a real
// attack on this file would make.
import { harmGate, selfCheck, PROPERTY_SCORERS } from "../adapters/build/harm-properties.mjs";

console.log("=== Untampered: the gate should vouch for itself normally ===");
const before = await selfCheck();
console.log(`selfCheck(): ${before.ok ? "OK" : `FAILED (${before.failedCase})`}`);
if (!before.ok) { console.error("The gate does not even pass its own self-test untampered — stop, this is a real bug, not the scenario under test."); process.exit(1); }

const benignBefore = `<!DOCTYPE html><html><body><div style="color:#ccc">x</div></body></html>`;
const benignAfter = `<!DOCTYPE html><html><body><div style="color:#999">x</div></body></html>`;
const normalResult = await harmGate(benignBefore, benignAfter);
console.log(`harmGate on a genuinely benign change: halted=${normalResult.halted} (expected false)\n`);

console.log("=== Simulated tampering: silently neuter calibrationScore ===");
const realCalibration = PROPERTY_SCORERS.calibration;
PROPERTY_SCORERS.calibration = async () => 3; // "always fine" — the exact shape a real attack would take
try {
  const afterTamper = await selfCheck();
  console.log(`selfCheck() after tampering: ${afterTamper.ok ? "STILL OK (BAD — tampering was not detected)" : `correctly FAILED (${afterTamper.failedCase})`}`);

  // The real question: does harmGate now silently let a REAL harmful
  // change through, or does it fail safe?
  const harmfulBefore = `<!DOCTYPE html><html><body><span>\${episode.ethos === 'pass' ? 'pass' : episode.ethos === 'conflict' ? 'conflict' : 'no_signal'}</span></body></html>`;
  const harmfulAfter = `<!DOCTYPE html><html><body><span>\${'pass'}</span></body></html>`; // the exact calibration attack calibrationScore itself no longer catches
  const resultUnderTamper = await harmGate(harmfulBefore, harmfulAfter);
  console.log(`harmGate on the EXACT attack the tampered scorer can no longer see: halted=${resultUnderTamper.halted}`);
  console.log(`  selfTestFailed flag present: ${resultUnderTamper.selfTestFailed === true}`);
  if (resultUnderTamper.regressions?.[0]) console.log(`  disclosed reason: ${resultUnderTamper.regressions[0].after}`);

  console.log(`\n=== Collateral cost, disclosed honestly ===`);
  const collateralResult = await harmGate(benignBefore, benignAfter);
  console.log(`harmGate on a genuinely BENIGN change, same tampered state: halted=${collateralResult.halted} (this is the real cost of failing safe — everything halts, not just attacks, until the tamper is reverted)`);

  console.log(`\n=== VERDICT ===`);
  const detected = !afterTamper.ok && resultUnderTamper.halted && resultUnderTamper.selfTestFailed && collateralResult.halted;
  console.log(detected
    ? "SURVIVED: tampering with a scorer is detected by the self-check, and the gate fails SAFE — it halts everything (the real attack AND, at a real cost, ordinary benign changes) rather than silently rubber-stamping the exact thing the tampering was meant to hide. This does not make tampering IMPOSSIBLE (someone could tamper with selfCheck itself, or delete this file entirely — see the write-up's Tier 3) but it converts a SILENT, COMPLETE defeat into a LOUD, VISIBLE outage, which is a categorically different and much safer failure mode."
    : "FALSIFIED: tampering was not correctly detected or did not fail safe — reported honestly, this mitigation does not work as designed.");
} finally {
  PROPERTY_SCORERS.calibration = realCalibration; // restore — this script must not leave the real module tampered for anything that imports it later in the same process
}
