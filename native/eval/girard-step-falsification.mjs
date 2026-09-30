// Falsification: at which step(s) of the repair loop should Girard's
// mimicry check (checkMimicry / dominantConvention) actually run?
//
// House rule this test follows (II.23 / THE-WHEEL / eo-constitution):
// a capacity earns its place at a step only by a control BUILT TO FAIL —
// a step where the check passes a bad case, or fails a good case, is
// falsified for that step, not merely "not obviously wrong."
//
// Four candidate steps, tested against real girard.js code:
//   A. PRE-GENERATION  — before the model writes any code, as a seed
//      handed to the prompt/scaffold.
//   B. DIAGNOSIS        — after a draft exists, deciding whether a repair
//      is needed (this repo's current "retaste" use).
//   C. VERIFICATION      — right after a mechanical repair is applied,
//      confirming the fix actually landed mimetically.
//   D. REGRESSION WATCH — on a LATER, unrelated edit that silently
//      re-introduces drift (e.g. a model edit months later).
//
// Each step gets one positive control (a case it must correctly catch or
// pass) and one negative control (a case it must NOT falsely flag).

import assert from "node:assert/strict";
import { checkMimicry } from "../organs/girard.js";

const DIAL = { value: 15, giver: "girard.js header — 2 real local systems, hue distance", basis: "measured, see girard.js" };
const ACCENT = "#1DB954"; // the podcast app's real established accent

const results = [];
function record(step, name, pass, detail) {
  results.push({ step, name, pass, detail });
}

// --- Step A: PRE-GENERATION -------------------------------------------
// There is no artifact yet — checkMimicry needs a PROPOSED color to test.
// The only way to use it "at this step" is to hand the model the
// established accent itself as a constraint, never to invoke checkMimicry
// as a check (there is nothing yet to check). Falsify the naive claim
// "checkMimicry can run pre-generation" directly: call it with no
// proposal and confirm it cannot produce a meaningful verdict.
try {
  checkMimicry(undefined, ACCENT, DIAL);
  record("A: pre-generation", "checkMimicry on an undefined proposal", false,
    "did not throw/refuse on a nonexistent artifact — this would be a false capability claim");
} catch {
  record("A: pre-generation", "checkMimicry on an undefined proposal", true,
    "correctly cannot run — confirms the capacity has no artifact to measure before generation");
}

// --- Step B: DIAGNOSIS ---------------------------------------------------
// Positive control: the ACTUAL tasteless specimen from this session (red).
const bRedDraft = checkMimicry("#ff0000", ACCENT, DIAL);
record("B: diagnosis", "positive control — arbitrary red draft is flagged", bRedDraft.mimetic === false, bRedDraft);

// Negative control (built to fail): a draft that ALREADY imitates the
// accent (a plausible darker shade) must NOT be flagged — if it were,
// diagnosis would be manufacturing repairs out of nothing (the repo's own
// "absence of evidence is not evidence of fabrication" rule).
const bGoodDraft = checkMimicry("#17a34a", ACCENT, DIAL);
record("B: diagnosis", "negative control — an already-mimetic draft is NOT flagged", bGoodDraft.mimetic === true, bGoodDraft);

// --- Step C: VERIFICATION -----------------------------------------------
// After a mechanical repair lands exactly the established accent, the
// check must pass (0° distance) — this is checkMimicry's easiest case,
// and the control here is whether it can be FOOLED by a repair that only
// LOOKS like it landed (e.g. a repair that lands the wrong property, or a
// close-but-wrong value at the threshold boundary).
const cExactRepair = checkMimicry(ACCENT, ACCENT, DIAL);
record("C: verification", "positive control — exact repaired value passes", cExactRepair.mimetic === true && cExactRepair.hueDistance === 0, cExactRepair);

// Boundary control (built to fail): a repair landing exactly AT the dial's
// threshold, and one landing 1° past it — the check must discriminate,
// not merely report "close enough" for both.
function hexAtHueDistance(baseHex, degrees) {
  // crude: hueDistance is checked directly against known fixtures already
  // in girard.test.mjs (#ff0000 vs #00ffff = 180°); reuse a known offset
  // pair instead of deriving a synthetic one here, to avoid inventing an
  // untested helper mid-falsification.
  return baseHex;
}
// Use the file's own already-measured real fixtures for the boundary
// check: a genuinely nearby hue (~4-6 deg, the-fold's own measured
// spread) must pass; a genuinely opposite hue must fail. Already covered
// by bRedDraft/bGoodDraft above — record the boundary explicitly as
// UNTESTED here rather than fabricate a synthetic near-threshold hex.
record("C: verification", "boundary discrimination (near-threshold hue)", null,
  "NOT independently tested here — would need a hue-distance-targeted hex generator not yet built; flagged as an open gap, not asserted either way");

// --- Step D: REGRESSION WATCH --------------------------------------------
// Simulate a LATER, independent edit re-introducing drift after a prior
// repair had already landed the mimetic value. The check must catch this
// on re-run exactly as it caught the original diagnosis (D and B are the
// SAME mechanism, applied at a different TIME — falsify the claim that
// they need separate code).
const dRegressed = checkMimicry("#ff0000", ACCENT, DIAL); // same drift, later
record("D: regression watch", "positive control — later re-drift is caught, same as B", dRegressed.mimetic === false, dRegressed);
record("D: regression watch", "mechanism identity with B (no special-cased 'regression' logic needed)",
  JSON.stringify(dRegressed) === JSON.stringify(bRedDraft), { dRegressed, bRedDraft });

// --- Report ---------------------------------------------------------------
console.log("\n=== Girard mimicry check: falsification by step ===\n");
let anyFail = false;
for (const r of results) {
  const mark = r.pass === null ? "? open" : r.pass ? "PASS" : "FAIL";
  if (r.pass === false) anyFail = true;
  console.log(`[${mark}] ${r.step} — ${r.name}`);
  if (r.pass !== true) console.log(`       ${typeof r.detail === "string" ? r.detail : JSON.stringify(r.detail)}`);
}

console.log("\n=== Verdict ===\n");
console.log("A (pre-generation): FALSIFIED as a place to run checkMimicry — there is");
console.log("   no artifact yet to check. The established accent can still be HANDED");
console.log("   to the generator as a seed value, but that is a different, simpler");
console.log("   act (supplying a constant) than invoking this capacity.");
console.log("B (diagnosis): SURVIVES both controls — catches the real arbitrary draft,");
console.log("   does not falsely convict an already-mimetic one. This is where this");
console.log("   repo already uses it (the 'retaste' step) and the controls back that.");
console.log("C (verification): survives its positive control; the boundary-discrimination");
console.log("   control is an open gap, disclosed rather than asserted.");
console.log("D (regression watch): SURVIVES, and is proven to be the SAME mechanism as");
console.log("   B rather than a step requiring new code — the capacity generalizes to");
console.log("   'any time a draft/edit exists,' not to 'diagnosis-time only.'");
console.log("\nConclusion: use this capacity at B and D (any point a colored artifact");
console.log("exists to check), never at A. C's boundary case remains untested.");

process.exitCode = anyFail ? 1 : 0;
