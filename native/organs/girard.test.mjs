import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { hexToHsl, hueDistance, extractAccentTokens, mimeticFinding, checkMimicry, resolveToHex } from "./girard.js";

test("resolveToHex: hex, shorthand hex, rgb(), and a received named keyword all resolve; an unknown value is a typed null, never a guess", () => {
  assert.equal(resolveToHex("#ff0000"), "#ff0000");
  assert.equal(resolveToHex("#f00"), "#ff0000");
  assert.equal(resolveToHex("rgb(255, 0, 0)"), "#ff0000");
  assert.equal(resolveToHex("red"), "#ff0000");
  assert.equal(resolveToHex("var(--accent)"), null);
  assert.equal(resolveToHex("some-gradient"), null);
});

test("hexToHsl: a known pure hue lands at the right degree", () => {
  assert.equal(Math.round(hexToHsl("#ff0000").h), 0);
  assert.equal(Math.round(hexToHsl("#00ff00").h), 120);
});

test("hueDistance: the same color is 0°; opposite hues are 180°", () => {
  assert.equal(hueDistance("#ff0000", "#ff0000"), 0);
  assert.equal(Math.round(hueDistance("#ff0000", "#00ffff")), 180);
});

test("extractAccentTokens: pulls every --accent-family custom property from real CSS text", () => {
  const css = `:root { --accent: #6d28d9; --accent-soft: #f3eeff; --bg: #ffffff; }`;
  const tokens = extractAccentTokens(css);
  assert.deepEqual(tokens, [{ name: "accent", hex: "#6d28d9" }, { name: "accent-soft", hex: "#f3eeff" }]);
});

test("CONTROL: CSS with no accent tokens extracts nothing", () => {
  assert.deepEqual(extractAccentTokens(":root { --bg: #ffffff; }"), []);
});

test("mimeticFinding: a reference with fewer than 2 accent tokens is disclosed as unmeasured, not silently skipped", () => {
  const r = mimeticFinding([{ giver: "test", cssText: "--accent: #6d28d9;" }]);
  assert.equal(r.n, 0);
  assert.equal(r.perReference[0].measured, false);
});

test("REAL DATA: this repo's own local, already-built the-fold accent tokens measure as tightly hue-convergent", () => {
  let css;
  try { css = fs.readFileSync(new URL("../../the-fold/explore/explore.css", import.meta.url), "utf8"); }
  catch { css = null; }
  if (!css) { console.log("(the-fold sibling checkout not present here — skipping the real-file assertion)"); return; }
  const r = mimeticFinding([{ giver: "the-fold/explore/explore.css", cssText: css }]);
  assert.equal(r.n, 1);
  assert.ok(r.perReference[0].maxHueDistance < 15, `expected a tight hue family, got ${r.perReference[0].maxHueDistance}°`);
});

test("checkMimicry: refuses a threshold with no giver/basis — the same practitioner-heuristic wall every archon in this team holds", () => {
  assert.throws(() => checkMimicry("#ff0000", "#1DB954", { value: 15 }), /giver/);
});

const DIAL = { value: 15, giver: "test fixture", basis: "measured from two real local design systems, see girard.js's own header" };

test("checkMimicry: the ACTUAL tasteless specimen from this session (red against the podcast's green accent) is correctly refused as arbitrary", () => {
  const r = checkMimicry("#ff0000", "#1DB954", DIAL);
  assert.equal(r.mimetic, false);
  assert.ok(r.hueDistance > 100);
});

test("CONTROL: a genuinely mimetic proposal (a lighter tint of the SAME green accent) is accepted", () => {
  // A lighter/darker shade of #1DB954 stays within a few degrees of hue —
  // e.g. #17a34a, a plausible darker shade a real designer might pick.
  const r = checkMimicry("#17a34a", "#1DB954", DIAL);
  assert.equal(r.mimetic, true);
});

test("checkMimicry: the accent itself always imitates itself (0° distance)", () => {
  const r = checkMimicry("#1DB954", "#1DB954", DIAL);
  assert.equal(r.hueDistance, 0);
  assert.equal(r.mimetic, true);
});
