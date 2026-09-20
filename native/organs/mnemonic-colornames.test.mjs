// mnemonic-colornames.test.mjs — color and shape: two faces of one thing.
// They cannot exist without each other — a color kind is only ever taught
// AS a colored shape, a shape kind only as a shaped color — and they are
// not the same: the child reads each face separately (shape face, color
// face), joins them per region, and names colors from the STANDARD prior
// (Berlin-Kay basic terms, priors/color-names.json) navigated by the DMD
// rotation of the color wheel — red → orange → yellow is one DMD step of
// the wheel's coherent mode, and a hue between two names is disclosed as
// the mixture, never guessed.

import test from "node:test";
import assert from "node:assert/strict";
import { createSeededRng } from "../kernel/rng.js";
import { emptyStore, teachGrid, recognizeGridColor, dominantColorName } from "./mnemonic.js";
import { colorNameOf, navigateColorName, colorNameFramework, loadColorNamePrior } from "../kernel/color-name-space.js";

const W = 96;
const H = 96;
const noise = (seed) => (createSeededRng(seed)() - 0.5) * 2 * 0.02;

function scene(draw, { seed = 1 } = {}) {
  const lum = new Float64Array(W * H).fill(0.25);
  const rgb = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const bg = [242, 242, 242];
      const i = y * W + x;
      const p = draw(x, y, bg);
      rgb[i * 3] = p[0];
      rgb[i * 3 + 1] = p[1];
      rgb[i * 3 + 2] = p[2];
      lum[i] = (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255;
    }
  }
  for (let i = 0; i < lum.length; i += 1) lum[i] += noise(seed + i);
  return { lum, rgb };
}

const COLORS = {
  red: [220, 40, 40],
  green: [40, 180, 70],
  blue: [40, 80, 220],
  yellow: [240, 210, 40],
  purple: [150, 40, 200],
  orange: [235, 130, 30],
  magenta: [220, 40, 200],
};

function shapeDrawer(shape, color, { cx = W / 2, cy = H / 2, size = 40 } = {}) {
  return (x, y, bg) => {
    const half = size / 2;
    let inside = false;
    if (shape === "triangle") {
      const t = (y - (cy - half)) / size;
      inside = y >= cy - half && y <= cy + half && Math.abs(x - cx) <= half * t;
    } else if (shape === "square") {
      inside = Math.abs(x - cx) <= half && Math.abs(y - cy) <= half;
    } else if (shape === "circle") {
      inside = (x - cx) ** 2 + (y - cy) ** 2 <= half * half;
    }
    if (!inside) return [...bg, 0];
    return [...color, 1];
  };
}

function teachColored(store, concept, draw, n = 5) {
  for (let i = 0; i < n; i += 1) {
    const { lum, rgb } = scene(draw, { seed: i * 10 + 1 });
    teachGrid(store, concept, { grid: lum, colorGrid: rgb, w: W, h: H, source: `${concept}-${i}.png`, sourceBytes: 120000 });
  }
}

test("the STANDARD names: the wheel is navigated by DMD — red is one rotation-step from orange", () => {
  const prior = loadColorNamePrior();
  assert.equal(prior.schema, "ColorNamePrior@1");
  assert.ok(prior.terms.length >= 12, "the twelve standard hue terms are present");
  // the wheel's DMD framework: the coherent rotation mode has |λ| = 1 and
  // its angle is the neighbor step (30° = the adjacent hue gap)
  const fw = colorNameFramework(prior.terms);
  assert.ok(Math.abs(fw.eigenvalues[0].magnitude - 1) < 1e-3, "the wheel's rotation is coherent — |λ| = 1");
  assert.ok(Math.abs(fw.stepAngle - Math.PI / 6) < 0.05, `one DMD step is the neighbor hue gap (~${(fw.stepAngle * 180 / Math.PI).toFixed(0)}°)`);
  // navigation: stepping the DMD rotation
  assert.equal(navigateColorName("red").to, "orange");
  assert.equal(navigateColorName("red", 2).to, "yellow");
  assert.equal(navigateColorName("blue").to, "purple");
  assert.equal(navigateColorName("yellow", -1).to, "orange");
  // naming a hue: exact names, and the between-reading disclosed, never guessed
  assert.equal(colorNameOf(0.0).name, "red");
  assert.equal(colorNameOf(0.667).name, "blue");
  const between = colorNameOf(0.125); // between red and orange
  assert.match(between.name, /orange|red/);
  assert.ok(between.between, "a hue between two names is disclosed as the mixture");
  assert.match(between.standing, /standard color-name prior/);
});

test("the child names the colors of what it sees — the recognition speaks standard names", () => {
  const store = emptyStore();
  for (const [name, shape, color] of [["triangle", "triangle", "red"], ["square", "square", "blue"]]) {
    teachColored(store, name, shapeDrawer(shape, COLORS[color]));
  }
  const redTri = scene(shapeDrawer("triangle", COLORS.red, { size: 40 }), { seed: 500 });
  const rec = recognizeGridColor(store, redTri.lum, redTri.rgb, W, H);
  const region = rec.regions.find((r) => r.recognized.includes("triangle"));
  assert.ok(region, "the red triangle is recognized as triangle");
  assert.equal(region.colorName.name, "red", "the child says the STANDARD name of what it sees");
  const blueSquare = scene(shapeDrawer("square", COLORS.blue, { size: 40 }), { seed: 501 });
  const rec2 = recognizeGridColor(store, blueSquare.lum, blueSquare.rgb, W, H);
  const sq = rec2.regions.find((r) => r.recognized.includes("square"));
  assert.equal(sq.colorName.name, "blue");
  // dominantColorName directly: the region's standard name
  const dcn = dominantColorName(redTri.rgb, W, H, region.region);
  assert.equal(dcn.name, "red");
});

test("color and shape are not the same: the faces separate and join", () => {
  const store = emptyStore();
  // shape kinds taught across colors; the wheel itself is the color kind
  for (const c of ["red", "orange", "yellow", "green", "blue", "purple"]) {
    teachColored(store, "triangle", shapeDrawer("triangle", COLORS[c]));
  }
  teachColored(store, "square", shapeDrawer("square", COLORS.red));
  teachColored(store, "square", shapeDrawer("square", COLORS.blue));
  // a red square and a blue square share the SHAPE face (both squares) and
  // differ in the COLOR face — the faces are joined in the lesson and
  // separable in the reading
  const redSq = scene(shapeDrawer("square", COLORS.red, { size: 40 }), { seed: 600 });
  const recRed = recognizeGridColor(store, redSq.lum, redSq.rgb, W, H);
  const r1 = recRed.regions.find((r) => r.recognized.includes("square"));
  assert.ok(r1, "the red square reads as square (shape face)");
  assert.equal(r1.colorName.name, "red", "and as red (color face) — two faces, one region");
  // a magenta triangle: the shape face knows it is a triangle; the color
  // face names it from the wheel (magenta is a standard term)
  const magTri = scene(shapeDrawer("triangle", COLORS.magenta, { size: 40 }), { seed: 601 });
  const recMag = recognizeGridColor(store, magTri.lum, magTri.rgb, W, H);
  const rm = recMag.regions.find((r) => r.recognized.includes("triangle"));
  assert.ok(rm, "the magenta triangle is still a triangle — the shape face does not depend on the color");
  assert.match(rm.colorName.name, /magenta|purple|pink/, `the color face names it from the standard wheel (${rm.colorName.name})`);
});

test("they cannot exist without each other: a color kind is only ever taught as a colored shape", () => {
  // the color half of a descriptor IS the hue layout OF the shape's cells —
  // there is no color lesson without a shape to carry it. The prior's
  // achromatic face is the disclosure: a gray region has no color name.
  const grayScene = scene((x, y, bg) => {
    const half = 20;
    if (Math.abs(x - W / 2) > half || Math.abs(y - H / 2) > half) return [...bg, 0];
    return [128, 128, 128, 1];
  }, { seed: 700 });
  const dcn = dominantColorName(grayScene.rgb, W, H, [W / 2 - 20, H / 2 - 20, 40, 40]);
  assert.equal(dcn.name, "achromatic");
  assert.match(dcn.standing, /no chroma in this region/);
});