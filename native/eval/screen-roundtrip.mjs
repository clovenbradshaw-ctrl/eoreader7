#!/usr/bin/env node
// eval/screen-roundtrip.mjs — does a screenshot survive being read, stored, and regenerated?
//
//   node native/eval/screen-roundtrip.mjs [--write] image.png [image2.webp ...]
//
// For each image: read it (organs/look-screen.js, forced, nothing stored) -> regenerate the page FROM THE SIDECAR ALONE
// (adapters/image/screen-sidecar.js htmlOf) -> render that HTML in real headless Chrome at the screenshot's own size ->
//   pixels  mean absolute channel difference from the original, and the share of pixels within 16/255, each against a
//           blank white page of the same size (the floor a regeneration has to beat: a mostly-light page already scores well)
//   text    of the words the read found in the original, the share that a SECOND read of the Chrome render finds again
//           (a round trip the reading pipeline itself can check: if a word is lost, the regenerated page lost it or the
//           second read did, and the number does not say which — it is a recall bound, not proof of fidelity)
//
// Chrome is the only non-repo dependency: CHROME_BIN, else the macOS default. Without it the eval says so and exits 2 — an
// unrun eval is not a pass. The 16/255 tolerance is a reporting choice, not a threshold anything decides on.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { decodeImage, readScreen } from "../adapters/image/screen-read.js";
import { sidecarOf, htmlOf } from "../adapters/image/screen-sidecar.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!fs.existsSync(CHROME)) { console.error(`no Chrome at ${CHROME} (set CHROME_BIN): the round trip is unmeasured`); process.exit(2); }

const args = process.argv.slice(2), write = args.includes("--write");
const images = args.filter((a) => !a.startsWith("--"));
if (!images.length) { console.error("usage: node native/eval/screen-roundtrip.mjs [--write] image [image ...]"); process.exit(1); }

const words = (lines) => new Set(lines.flatMap((t) => t.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []));
const compare = (a, b) => { // a, b decoded at the same working size; score b against a
  const W = Math.min(a.width, b.width), H = Math.min(a.height, b.height), n = W * H;
  let sum = 0, near = 0, bsum = 0, bnear = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * a.width + x) * 4, j = (y * b.width + x) * 4;
    let d = 0, w = 0;
    for (let k = 0; k < 3; k++) { d += Math.abs(a.data[i + k] - b.data[j + k]); w += Math.abs(a.data[i + k] - 255); }
    d /= 3; w /= 3; sum += d; bsum += w; if (d <= 16) near++; if (w <= 16) bnear++;
  }
  return { diff: sum / n, near: near / n, blankDiff: bsum / n, blankNear: bnear / n };
};

const rows = [];
for (const image of images) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "er7-roundtrip-"));
  try {
    const first = await readScreen(image);
    const sc = sidecarOf(first, { name: path.basename(image) });
    const orig = await decodeImage(image);
    const row = { image: path.basename(image), size: `${sc.source.width}x${sc.source.height}`, dpr: sc.dpr, elements: sc.elements.length, gaps: Object.entries(sc.gaps.reduce((m, g) => ({ ...m, [g.kind]: (m[g.kind] ?? 0) + 1 }), {})).map(([k, n]) => (n > 1 ? `${k} x${n}` : k)).join(", ") || "none" };
    const was = words(sc.elements.filter((e) => e.text).map((e) => e.text));
    row.words = was.size;
    row.modes = {};
    for (const mode of ["flex", "abs"]) {
      const html = path.join(tmp, `${mode}.html`), shot = path.join(tmp, `${mode}.png`);
      fs.writeFileSync(html, htmlOf(sc, { mode }));
      const vw = Math.round(sc.tokens.viewport.width), vh = Math.round(sc.tokens.viewport.height);
      execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${vw},${vh}`, `--force-device-scale-factor=${sc.dpr}`, `--screenshot=${shot}`, `file://${html}`], { stdio: "ignore", timeout: 90000 });
      const rendered = await decodeImage(shot);
      const px = compare(orig.img, rendered.img);
      const again = sidecarOf(await readScreen(shot), { name: `${mode}.png` });
      const now = words(again.elements.filter((e) => e.text).map((e) => e.text));
      const kept = [...was].filter((w) => now.has(w)).length;
      row.modes[mode] = { diff: px.diff, blankDiff: px.blankDiff, near: px.near, blankNear: px.blankNear, recall: was.size ? kept / was.size : null, rendered: `${rendered.original.width}x${rendered.original.height}` };
    }
    rows.push(row);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

const f = (v, d = 1) => (v == null ? "n/a" : v.toFixed(d));
const out = [
  "# Screenshot round trip",
  "",
  `Measured ${new Date().toISOString().slice(0, 10)} on ${os.platform()}; Chrome: ${execFileSync(CHROME, ["--version"], { encoding: "utf8" }).trim()}.`,
  "",
  "Each image is read, regenerated from its sidecar alone, rendered in headless Chrome at its own size, and re-read. *diff* is mean absolute channel difference (0-255, lower is closer) from the original, beside the same number for a blank white page; *within16* is the share of pixels within 16/255; *recall* is the share of the words found in the original that the second read finds in the render.",
  "",
  "| image | size | dpr | words | layout | diff (blank) | within16 (blank) | recall |",
  "|---|---|---|---|---|---|---|---|",
  ...rows.flatMap((r) => Object.entries(r.modes).map(([m, v]) => `| ${r.image} | ${r.size} | ${r.dpr} | ${r.words} | ${m} | ${f(v.diff)} (${f(v.blankDiff)}) | ${f(v.near * 100)}% (${f(v.blankNear * 100)}%) | ${f(v.recall == null ? null : v.recall * 100, 0)}% |`)),
  "",
  ...rows.map((r) => `- ${r.image}: ${r.elements} elements; gaps: ${r.gaps}.`),
  "",
];
console.log(out.join("\n"));
if (write) { const p = path.join(HERE, "results", "screen-roundtrip.md"); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, out.join("\n")); console.error(`wrote ${p}`); }
