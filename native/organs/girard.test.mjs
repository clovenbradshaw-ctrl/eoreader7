import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { hexToHsl, hslToHex, stepLightness, ELEVATION_STEP, hueDistance, extractAccentTokens, mimeticFinding, checkMimicry, resolveToHex, extractNumericPxTokens, dominantConvention } from "./girard.js";

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
  try { css = fs.readFileSync(new URL("../../../the-fold/explore/explore.css", import.meta.url), "utf8"); }
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

test("extractNumericPxTokens: pulls plain px values, drops pill/circle outliers by default", () => {
  const css = ".a{border-radius:8px}.b{border-radius:6px}.c{border-radius:999px}.d{border-radius:50%}`";
  assert.deepEqual(extractNumericPxTokens(css, "border-radius"), [8, 6]);
});

test("dominantConvention: a reference with no matching declarations reports n:0 for it, never a fabricated zero baked into the median", () => {
  const r = dominantConvention([{ giver: "empty", cssText: ".a{color:red}" }], "border-radius");
  assert.equal(r.n, 0);
  assert.equal(r.median, null);
});

test("hslToHex: round-trips a real hex color exactly", () => {
  assert.equal(hslToHex(hexToHsl("#0f0f12").h, hexToHsl("#0f0f12").s, hexToHsl("#0f0f12").l), "#0f0f12");
});

test("stepLightness: reproduces the REAL measured the-fold elevation exactly (#0f0f12 + 2.7 -> #15151a)", () => {
  assert.equal(stepLightness("#0f0f12", ELEVATION_STEP.value), "#15151a");
});

test("REAL DATA: this repo's own local design systems converge on a real, measured border-radius (median 8px, excluding pill shapes)", () => {
  let foldCss, heimdallCss;
  try {
    foldCss = fs.readFileSync(new URL("../../../the-fold/index.html", import.meta.url), "utf8");
    heimdallCss = fs.readFileSync(new URL("../../../heimdall/src/style.css", import.meta.url), "utf8");
  } catch { return; }
  const r = dominantConvention([{ giver: "the-fold/index.html", cssText: foldCss }, { giver: "heimdall/src/style.css", cssText: heimdallCss }], "border-radius");
  assert.ok(r.n >= 50, `expected a large real sample, got ${r.n}`);
  assert.equal(r.median, 8);
});
