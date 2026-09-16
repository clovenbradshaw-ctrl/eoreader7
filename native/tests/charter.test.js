// native/tests/charter.test.js — the Charter organ, reachability-pinned.
// P88: a guard that is never reached passes forever — so the Charter gate is
// read here on every suite run, exactly as the proxy calls it.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { buildUdhCharter, charterVerdict, charterConflicts, voiceOf } from "../organs/charter.js";

// A byte-grounded fixture: the UDHR's own Article 1-5 text (a real excerpt,
// verbatim), so the charter's protections/prohibitions are extracted from the
// declaration's own voice, not hand-typed.
const UDHR_EXCERPT = `Universal Declaration of Human Rights
      Article 1
      All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.
      Article 2
      Everyone is entitled to all the rights and freedoms set forth in this Declaration.
      Article 3
      Everyone has the right to life, liberty and security of person.
      Article 4
      No one shall be held in slavery or servitude; slavery and the slave trade shall be prohibited in all their forms.
      Article 5
      No one shall be subjected to torture or to cruel, inhuman or degrading treatment or punishment.
`;

const charter = buildUdhCharter(UDHR_EXCERPT, { giver: "test fixture — UDHR excerpt, verbatim" });

test("the charter is built from the declaration's own prescriptive voice", () => {
  assert.equal(charter.schema, "UDHRCharter@1");
  assert.ok(charter.prohibitions["torture or to cruel inhuman or degrading treatment or punishment"], "Article 5's prohibition is extracted");
  assert.ok(charter.protections["life liberty and security of person"], "Article 3's protection is extracted");
  assert.deepEqual(charter.prohibitions["torture or to cruel inhuman or degrading treatment or punishment"].articles, [5]);
});

test("voiceOf tells prescriptive from descriptive", () => {
  assert.equal(voiceOf("Everyone has the right to life."), "prescriptive");
  assert.equal(voiceOf("We should never torture prisoners."), "prescriptive");
  assert.equal(voiceOf("The regime tortured prisoners during the war."), "descriptive");
  assert.equal(voiceOf("The report documents mass executions."), "descriptive");
});

test("a compliant prescriptive generation passes", () => {
  const v = charterVerdict({ charter, text: "Everyone has the right to life, liberty and security of person." });
  assert.equal(v.verdict, "pass");
  assert.equal(v.conflicts.length, 0);
});

test("a prescriptive generation licensing a prohibited act is refused", () => {
  const v = charterVerdict({ charter, text: "The state should be permitted to torture suspects to protect national security." });
  assert.equal(v.verdict, "conflict");
  assert.ok(v.conflicts.some((c) => c.kind === "licenses_prohibited"), "names the prohibited act");
});

test("a prescriptive generation denying a protected right is refused", () => {
  const v = charterVerdict({ charter, text: "No one should be entitled to life, liberty or security of person." });
  assert.equal(v.verdict, "conflict");
  assert.ok(v.conflicts.some((c) => c.kind === "denies_protected_right"), "names the denied right");
});

test("atrocity DISCUSSION passes — the gate never spuriously fires on description", () => {
  const v = charterVerdict({
    charter,
    text: "The regime tortured and executed political prisoners. Reports document mass killings, slavery, and the denial of basic rights. According to the evidence, tens of thousands were subjected to cruel treatment.",
  });
  // descriptive voice: reading and talking about human atrocities is exactly
  // what the Charter exists to protect — never governed, never censored.
  assert.equal(v.verdict, "no_signal");
  assert.equal(v.conflicts.length, 0);
});

test("a mixed generation is governed only on its prescriptive clauses", () => {
  const v = charterVerdict({
    charter,
    text: "The report describes widespread torture. Nevertheless, the state may torture suspects when necessary.",
  });
  assert.equal(v.verdict, "conflict");
  assert.equal(v.prescriptive, 1, "one prescriptive clause governed");
  assert.equal(v.descriptive, 1, "one descriptive clause ignored");
});

test("reinforcing the Charter never fires — forbidding a prohibited act is compliant", () => {
  // The false-positive shape: "we should never permit slavery" AGREES with
  // the norm. The gate must not fire on its own reinforcement.
  const v = charterVerdict({ charter, text: "We should never permit slavery in any form, and must not tolerate torture." });
  assert.equal(v.verdict, "pass");
  assert.equal(v.conflicts.length, 0);
});

test("the gate refuses to run ungoverned", () => {
  assert.throws(() => charterVerdict({ text: "anything" }), /injected, never assumed/);
});

// If the real 516-language UN corpus is beside this checkout, verify the
// byte-grounded build on the actual English UDHR too — otherwise the excerpt
// fixture above is the enforcement (data-gated, the live rule).
const REAL_UDHR = "/Users/mlacy/Documents/3.0/live_priors/06-government-legal/un-udhr/udhr-eng.txt";
if (existsSync(REAL_UDHR)) {
  test("the real UDHR builds a full charter (data-gated)", () => {
    const real = buildUdhCharter(readFileSync(REAL_UDHR, "utf8"));
    assert.ok(Object.keys(real.protections).length >= 10, "protections extracted from all 30 articles");
    assert.ok(Object.keys(real.prohibitions).length >= 5, "prohibitions extracted");
  });
}