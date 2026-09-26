// cli/houdini-numbers.test.mjs -- spawns the real process against real,
// already-verified specimens: two lines this session confirmed by hand are
// genuine hand-set thresholds (native/the-fold/referent-verify.js:289,
// native/the-fold/finish.js:228/350), and a confirmed-structural
// .length===0 check that must NOT be flagged.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "houdini-numbers.mjs");
const ROOT = path.join(HERE, "..");

function run(...files) {
  return spawnSync(process.execPath, [CLI, ...files], { encoding: "utf8", cwd: ROOT });
}

test("with no arguments, the CLI prints usage and exits 2", () => {
  const r = run();
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage: node cli\/houdini-numbers\.mjs/);
});

test("catches the real, verified specimen: referent-verify.js's bare 20-character cutoff", () => {
  const r = run("native/the-fold/referent-verify.js");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /289: if \(s\.length <= 20\)/);
});

test("catches the real, verified specimen: finish.js's two 12-character candidate-length cutoffs", () => {
  const r = run("native/the-fold/finish.js");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /228:.*\.length > 12/);
  assert.match(r.stdout, /350:.*\.length > 12/);
});

test("does NOT flag a .length === 0 check as a candidate -- that is a structural empty/non-empty test, not a threshold", () => {
  const r = run("native/the-fold/finish.js");
  assert.equal(r.status, 0);
  assert.ok(!/315:.*missing\.length === 0/.test(r.stdout), "a structural empty-check must never be reported as a candidate hand-set number");
});

test("reports a real, non-zero count when given a file with genuine candidates", () => {
  const r = run("native/organs/pacing.js");
  assert.equal(r.status, 0);
  const n = Number(r.stdout.match(/Houdini, on numbers: (\d+) candidate/)?.[1]);
  assert.ok(n > 0, "pacing.js is known to carry real unmeasured ratios (0.65, 0.3, 8-word floor) -- zero candidates would mean the tool regressed");
});

test("--json writes a real, parseable report to the given path", () => {
  const out = path.join(HERE, `.houdini-numbers-test-${process.pid}.json`);
  try {
    const r = run("--json", out, "native/the-fold/referent-verify.js");
    assert.equal(r.status, 0);
    const parsed = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.ok(Array.isArray(parsed) && parsed.length === 1);
    assert.ok(parsed[0].candidates.some((c) => c.line === 289));
  } finally {
    try { fs.unlinkSync(out); } catch {}
  }
});
