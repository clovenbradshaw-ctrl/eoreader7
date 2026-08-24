// native/conformance/reading-spec.test.mjs — the mechanical half of
// native/READING-SPEC.md. Every rule that CAN be a test is one; the rest
// stay in the spec as review law.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createActivation, dmdWindow, gammaFor } from "../kernel/activation.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.resolve(here, p), "utf8");

// ── S1: the constitutional reader is runnable and names itself ──────────
test("S1: the constitutional driver exists, names its assembly, its priors, and the stages it did NOT run", () => {
  const src = read("../eval/constitutional-read.mjs");
  assert.match(src, /packages\/host/, "the assembly is the HOST, named");
  assert.match(src, /stagesNotRun/, "unused stages are never implied (P2)");
  assert.match(src, /priorsInjected/, "which priors were injected is stated (P3)");
  assert.match(src, /byte/i, "P5.2 byte self-verification is present");
});

// ── S5: decay is kernel-level; the window is measured, never length ─────
test("S5: gammaFor derives from a declared window and refuses a degenerate one", () => {
  assert.equal(gammaFor(4), 0.75);
  assert.throws(() => gammaFor(1), /declared/);
  assert.throws(() => gammaFor(Infinity), /declared/);
});

test("S5: createActivation demands the window be spoken — null is the disclosed undecayed control, never a silent default", () => {
  assert.throws(() => createActivation(), /declared/);
  const undecayed = createActivation({ window: null });
  undecayed.observe(["storm"]);
  for (let i = 0; i < 50; i += 1) undecayed.observe(["ordinary"]);
  assert.equal(undecayed.activationOf("storm"), 1, "the control arm keeps everything");
  const decaying = createActivation({ window: 20 });
  decaying.observe(["storm"]);
  for (let i = 0; i < 50; i += 1) decaying.observe(["ordinary"]);
  assert.ok(decaying.activationOf("storm") < 0.1, "activation decays (P1's first clause)");
  assert.ok(decaying.activationOf("ordinary") > 1, "the present stays hot");
});

test("S5: dmdWindow measures reach from material BEHAVIOR — shallowest depth whose forgetting changes no conclusion", () => {
  const observations = [["storm"], ...Array.from({ length: 40 }, () => ["ordinary"])];
  const top = (o) => {
    const m = new Map();
    for (const k of o.flat()) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const measured = dmdWindow(observations, top, { candidates: [2, 5, 10, 20, 40] });
  assert.equal(measured.window, 2, "the SHALLOWEST agreeing depth, not the widest");
  assert.equal(measured.gamma, gammaFor(2));
  assert.match(measured.basis, /difference/);
});

test("S5: a conclusion the whole history carries returns the typed gap, never a silent widest-candidate fallback", () => {
  const observations = [["storm"], ...Array.from({ length: 40 }, () => ["ordinary"])];
  const everyKey = (o) => [...new Set(o.flat())].sort();
  const gapped = dmdWindow(observations, everyKey, { candidates: [5, 10, 20] });
  assert.equal(gapped.window, null);
  assert.equal(gapped.gap, "reach_exceeds_candidates");
});

test("S5: dmdWindow refuses to guess what it may not — derive and candidates are the caller's to declare", () => {
  assert.throws(() => dmdWindow([], undefined, { candidates: [2] }), /required/);
  assert.throws(() => dmdWindow([], (o) => o.length, {}), /declared/);
});

// ── S6: the kernel never speaks a medium's grammar ──────────────────────
test("S6: no kernel file interprets adapter role names — an arrangement has ends, not parts of speech", () => {
  const kernelDir = path.resolve(here, "../kernel");
  // Code-level readings of the English-SVO role vocabulary. `typeof x ===
  // "object"` is JavaScript, not grammar, and comments are stripped.
  const forbidden = [/role\s*===\s*["'](subject|object|verb)["']/, /\.has\(\s*["'](subject|object)["']\s*\)/, /role:\s*["'](subject|object)["']/];
  for (const name of fs.readdirSync(kernelDir).filter((f) => f.endsWith(".js"))) {
    const source = fs.readFileSync(path.join(kernelDir, name), "utf8")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(source), `${name} reads an adapter's grammar vocabulary (${pattern}) — V7-CUT dependency law: the kernel takes ends by ordinal position`);
    }
  }
});

// ── S2/S3: the standing disclosures exist where the numbers live ────────
test("S2/S3: the retraction records stand — prefix and lookahead rules are written where they were earned", () => {
  const finding = read("../eval/results/vocabulary-scale-FINDING.md");
  assert.match(finding, /prefix is a different material/i);
  const overview = read("../eval/results/extraction-overview-RESULTS.md");
  assert.match(overview, /LOOKAHEAD BOUND/, "batch-with-lookahead numbers stay labeled as bounds, not readings");
});

// ── S8: the spec itself is present and appended-to, never emptied ───────
test("S8: READING-SPEC.md exists and carries every section the suite enforces", () => {
  const spec = read("../READING-SPEC.md");
  for (const section of ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]) {
    assert.match(spec, new RegExp(`## ${section} `), `${section} is present`);
  }
});
