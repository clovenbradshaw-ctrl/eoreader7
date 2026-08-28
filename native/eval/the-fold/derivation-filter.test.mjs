// The chemistry is a FILTER, not a generator — held honest by a test.
//
// eval/derivation-precision.mjs measured (2026-08-28) that an unlicensed
// 20-line transitive join reaches every product the licensed chemistry
// reaches, plus 14 more. reaction.js's header now SAYS that. This test is what
// keeps the header true: if the licensed set ever stops being a subset of the
// naive set, the chemistry has become a generator, this test fails, and the
// header is what must be rewritten — not the test.
//
// It is deliberately a regression on the CLAIM, not on the numbers: the counts
// are free to move as material is added; the subset property and the precision
// ordering are what the header asserts.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(HERE, "eval", "derivation-precision.mjs");
const OUT = path.join(HERE, "eval", "results", "derivation-precision.json");

// run the real driver rather than trusting a committed artifact — a stale file
// would make this test pass on a measurement nobody took.
execFileSync(process.execPath, [DRIVER], { cwd: HERE, stdio: "ignore" });
const report = JSON.parse(fs.readFileSync(OUT, "utf8"));
const arm = (needle) => report.arms.find((a) => a.arm.includes(needle));

test("the licensed chemistry is a subset of the naive join — a filter, not a generator", () => {
  const licensed = new Set(arm("A shipped").factKeys);
  const naive = new Set(arm("C naive").factKeys);
  const extra = [...licensed].filter((k) => !naive.has(k));
  assert.deepEqual(extra, [],
    "the chemistry derived a fact the naive transitive join cannot reach. That is a real capability change: " +
    "reaction.js's header claims it is a filter, and that claim is now false. Rewrite the header, then this test.");
});

test("the licensed chemistry's precision is at least the naive join's", () => {
  const a = arm("A shipped").precisionOnDecided, c = arm("C naive").precisionOnDecided;
  assert.ok(a !== null && c !== null, "both arms must decide at least one fact for the comparison to mean anything");
  assert.ok(a >= c, `licensing must not lower precision: shipped ${a} vs naive ${c}`);
});

test("the naive control is genuinely unapparatused — it derives strictly more than the gate allows", () => {
  // guards against the control silently becoming a copy of the shipped arm,
  // which would make the subset assertion above vacuously true.
  assert.ok(arm("C naive").derived > arm("A shipped").derived,
    "the naive control no longer out-derives the gated arm; the comparison has gone vacuous");
});

test("the closure reaches past one hop — a partial collapse is loud, not silent", () => {
  // MEASURED HOLE (2026-08-28): with arm A planted down to a single fact, all
  // three tests above still passed — the subset property is one-sided (the
  // empty set is a subset of everything) and the null-check only catches a
  // TOTAL collapse. A locus constraint without matching role propagation caps
  // composition at ONE HOP, which is exactly a partial collapse: the count
  // drops, nothing empties, and the apparatus goes quiet. Depth is the signal
  // that cannot be faked by a one-hop closure.
  const a = arm("A shipped");
  assert.ok(a.derived >= 9, `arm A derived ${a.derived}; the committed baseline is 9 — a lower count is a partial collapse`);
  assert.ok(a.maxDepth >= 2, `arm A maxDepth ${a.maxDepth}; the committed closure reaches depth 2 — a cap at 1 means products lost what chaining needs`);
});
