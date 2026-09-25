// tests/build-pos-prior-license.test.js — S133's own enforcing test (IV.1: an
// amendment that cannot be expressed as a changed failing test is not an
// amendment). licenseOf, read against the real LICENSE.txt files shipped
// beside the fixtures — not a hand-built string, the actual bytes that
// exposed the builder's hand-set "CC BY-SA 4.0" default.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { licenseOf } from "../scripts/build-pos-prior.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, "..", "eval", "fixtures");
const license = (dir) => licenseOf(readFileSync(path.join(FIX, dir, "LICENSE.txt"), "utf8"));

test("FALSIFICATION: the real LICENSE.txt files name FOUR different licences, never the builder's old constant", () => {
  const found = {
    "ud-greek-proiel": license("ud-greek-proiel"),
    "ud-hebrew-htb": license("ud-hebrew-htb"),
    "ud-arabic-padt": license("ud-arabic-padt"),
    "ud-latin-perseus": license("ud-latin-perseus"),
  };
  assert.equal(found["ud-greek-proiel"], "CC BY-NC-SA 3.0 Generic");
  assert.equal(found["ud-hebrew-htb"], "CC BY-NC-SA 4.0 International");
  assert.equal(found["ud-arabic-padt"], "CC BY-NC-SA 3.0 US");
  assert.equal(found["ud-latin-perseus"], "CC BY-NC-SA 2.5 Generic");
  assert.equal(new Set(Object.values(found)).size, 4, "four distinct licences — none of them the old hand-set default");
  assert.ok(!Object.values(found).some((l) => l === "CC BY-SA 4.0"), "none of the four is the constant that used to be stamped on every prior");
});

test("a hyphen-wrapped licence name (split across a line break) is still read correctly", () => {
  assert.equal(licenseOf("This work is licensed under the Creative Commons Attribution-NonCommercial-\nShareAlike 3.0 Generic License."), "CC BY-NC-SA 3.0 Generic");
});

test("the short CC form and prose with no CC name at all", () => {
  assert.equal(licenseOf("Licensed CC BY-SA 4.0."), "CC BY-SA 4.0");
  assert.equal(licenseOf("All rights reserved."), null);
  assert.equal(licenseOf(""), null);
  assert.equal(licenseOf(undefined), null);
});
