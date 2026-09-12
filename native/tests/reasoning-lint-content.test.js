// tests/reasoning-lint-content.test.js — Degrees Kelsen's demo corpora
// pinned as regression tests. The demo's two content cases (the speed essay
// and the math/code sheet) and the seed's §7 falsifiable corpus are read
// through the REAL notes ledger, the REAL oracle, and
// organs/reasoning-lint.js, and the exact finding-kind SIGNATURE at each
// strictness level is asserted.
//
// This is the "these are all correct, save it for regression" pin: the
// findings themselves (REASONING-LINT-RESULTS.md) were verified correct by
// hand; this test is what makes a later regression — a check that stops
// firing, a severity that drops, a verdict that flips — fail loudly instead
// of silently changing what the instrument reports.
//
// The signature is KIND × LEVEL × SEVERITY at each strictness — never the
// prose (the phrase of a finding is allowed to improve without breaking the
// test) and never a bare count (a disappeared kind would then cancel out
// against an extra one, exactly the pin this repo's witness tests refuse).
//
// Run: node --test tests/reasoning-lint-content.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { runAll } from "../eval/the-fold/reasoning-lint-demo.mjs";

const signature = (run) => {
  const counts = {};
  for (const f of run.findings ?? []) {
    const key = `${f.level}:${f.severity}:${f.kind}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

const EXPECTED = {
  // The seed's §7 falsifiable corpus: sunset ordinance + contested claim.
  seed: {
    report: { "report:warn:expired_out_of_scope": 1, "report:warn:contested_open": 1 },
    standard: { "report:warn:expired_out_of_scope": 1, "report:warn:contested_open": 1, "standard:error:expired_premise": 1 },
    strict: { "report:warn:expired_out_of_scope": 1, "report:warn:contested_open": 1, "standard:error:expired_premise": 1 },
  },
  // The speed essay: persuasion posing as reasoning. Coherent at report and
  // standard; four unlicensed compositions at strict (R1).
  essay: {
    report: { "report:info:vacuous_support": 1 },
    standard: { "report:info:vacuous_support": 1 },
    strict: {
      "report:info:vacuous_support": 1,
      "strict:error:unlicensed_inference": 4,
    },
  },
  // The math/code sheet: several wrong, checked by a real oracle.
  math: {
    report: { "report:info:claim_holds": 2 }, // 2¹⁰+2¹⁰=2¹¹ AND √16=4 (principal) — sympy computes both
    standard: {
      "report:info:claim_holds": 2,
      "standard:error:undefined_claim": 2,     // (x²−1)/(x−1) at x=1 (0/0→nan); 1/0 (→zoo)
      "standard:error:claim_fails_oracle": 7,   // ∫, d/dx, log, e^{−2π}, harmonic (→oo), 0.1+0.2 (IEEE), cos(2θ)
      "standard:error:universal_refuted": 1,    // A > B ⇒ A² > B², A=0 B=−1
    },
    strict: {
      "report:info:claim_holds": 2,
      "standard:error:undefined_claim": 2,
      "standard:error:claim_fails_oracle": 7,
      "standard:error:universal_refuted": 1,
      "strict:info:licensed_inference": 1,      // A>B ∧ B>C ⇒ A>C, declared licence
      "strict:error:unlicensed_inference": 1,   // "by the same reasoning" ⇒ A²>B²
    },
  },
};

test("the demo's three corpora produce the exact pinned finding signatures at every strictness level", async () => {
  const cases = await runAll();
  const byId = new Map(cases.map((c) => [c.id, c]));
  for (const id of Object.keys(EXPECTED)) {
    assert.ok(byId.has(id), `corpus "${id}" is present in the demo`);
    const c = byId.get(id);
    for (const strictness of ["report", "standard", "strict"]) {
      const run = c.runs.find((r) => r.strictness === strictness);
      assert.ok(run, `${id}: a run exists at ${strictness}`);
      assert.deepEqual(signature(run), EXPECTED[id][strictness],
        `${id} @ ${strictness}: the finding signature drifted`);
    }
  }
});

test("the seed corpus is incoherent at standard (expired_premise) and coherent only at report — the acceptance facts hold", async () => {
  const cases = await runAll();
  const seed = cases.find((c) => c.id === "seed");
  assert.equal(seed.runs.find((r) => r.strictness === "report").ok, true, "report discloses, never convicts");
  assert.equal(seed.runs.find((r) => r.strictness === "standard").ok, false, "an expired obligation built on is an error at standard");
});

test("the essay corpus is coherent at standard and incoherent at strict — persuasion only becomes a finding under R1", async () => {
  const cases = await runAll();
  const essay = cases.find((c) => c.id === "essay");
  assert.equal(essay.runs.find((r) => r.strictness === "standard").ok, true);
  assert.equal(essay.runs.find((r) => r.strictness === "strict").ok, false, "four unlicensed compositions at strict");
});

test("the math corpus is incoherent at standard — the oracle refutes the wrong statements and confirms the right ones", async () => {
  const cases = await runAll();
  const math = cases.find((c) => c.id === "math");
  assert.equal(math.runs.find((r) => r.strictness === "standard").ok, false);
  const strict = math.runs.find((r) => r.strictness === "strict");
  assert.equal(strict.findings.some((f) => f.kind === "licensed_inference" && f.severity === "info"), true);
  assert.equal(strict.findings.some((f) => f.kind === "unlicensed_inference" && f.severity === "error"), true);
});