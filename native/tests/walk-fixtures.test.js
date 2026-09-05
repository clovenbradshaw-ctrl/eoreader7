// walk-fixtures.test.js — the fixture rule, pinned: a walk-based driver
// REFUSES when the walk names faces the checkout lacks (the-fold P95 / S65).
//
// The 2026-09-05 audit (P94) found `cited-source-null` and
// `ordered-read-reach` narrowing their pool from the walk's 106 faces to the
// 20 on disk without saying so. The rule chosen over committing the faces:
// refuse, typed, non-zero. This test pins the mechanism on synthetic walks
// (built to fail one way and pass the other, II.23) and DISCLOSES — never
// asserts — the real walk's state on this checkout: asserting all 106
// present would fail on every checkout that honours the 09-04 untracking
// rule, and asserting them absent would freeze the gap as a target.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { walkFaces, describeWalkGap } from "../eval/the-fold/lib/walk-fixtures.mjs";

const walkOf = (paths) => ({ real: { rows: paths.map((facePath) => ({ facePath, host: "h" })) } });

test("a walk whose faces are all present yields no gap", () => {
  const dir = mkdtempSync(join(tmpdir(), "walk-")) + "/";
  writeFileSync(dir + "a.txt", "x");
  writeFileSync(dir + "b.txt", "y");
  const w = walkFaces(walkOf(["a.txt", "b.txt", "a.txt"]), dir);
  assert.equal(w.gap, null);
  assert.deepEqual(w.named, ["a.txt", "b.txt"], "named faces are de-duplicated, order kept");
  assert.equal(w.present.length, 2);
  rmSync(dir, { recursive: true });
});

test("a walk naming a face the checkout lacks yields a typed gap that names the checkout, not the material", () => {
  const dir = mkdtempSync(join(tmpdir(), "walk-")) + "/";
  writeFileSync(dir + "a.txt", "x");
  const w = walkFaces(walkOf(["a.txt", "missing-1.txt", "missing-2.txt"]), dir);
  assert.ok(w.gap, "absent faces must produce a gap");
  assert.equal(w.gap.type, "fixture_absent");
  assert.equal(w.gap.named, 3);
  assert.equal(w.gap.present, 1);
  assert.equal(w.gap.absent, 2);
  assert.deepEqual(w.gap.sample, ["missing-1.txt", "missing-2.txt"]);
  const line = describeWalkGap(w.gap, { driver: "x.mjs" });
  assert.match(line, /^REFUSED \(fixture_absent\)/);
  assert.match(line, /does not narrow its pool/);
  assert.match(line, /fact about the checkout/);
  rmSync(dir, { recursive: true });
});

test("a record without the walk's rows is refused as a shape error, not read as an empty walk", () => {
  assert.throws(() => walkFaces({ real: {} }, "/"), TypeError);
  assert.throws(() => walkFaces(null, "/"), TypeError);
});

test("the committed walk on this checkout: state disclosed, and the two drivers' rule follows from it", () => {
  const HERE = new URL("../eval/the-fold/", import.meta.url).pathname;
  const walk = JSON.parse(readFileSync(`${HERE}results/ranke-backwards.json`, "utf8"));
  const w = walkFaces(walk, `${HERE}fixtures/`);
  // The rule, structurally: a gap iff something is absent — the drivers
  // exit 2 exactly when this is non-null.
  assert.equal(Boolean(w.gap), w.absent.length > 0);
  console.log(
    `  ranke-backwards walk: ${w.named.length} faces named, ${w.present.length} present, ${w.absent.length} absent — ` +
      (w.gap ? "cited-source-null and ordered-read-reach REFUSE on this checkout" : "both walk-based drivers can run in full here"),
  );
});
