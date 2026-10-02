// adapters/image/screen-read.js — the node side of the screenshot reader: a
// screenshot's pixels -> a measured model (boxes, rules, image regions, text),
// with no vision model in the loop.
//
// The measuring is screen-core.cjs — the same code native/tools/screenshot-to-html.html
// runs in a browser tab (moved there verbatim from that page, PR #144). What this
// file adds is the node crossing the page gets from the browser for free:
//
//   decode   ffmpeg -> RGBA, flattened over white, scaled exactly as the page's
//            prepare() does (longest side and pixel budget, below)
//   look     the local `tesseract` binary in TSV mode (the crossing look.js and
//            tschichold-look.js already use) — the page's own passes: the whole
//            image, the inverted image for light-on-dark text, and a re-read of
//            dark or coloured boxes where page-level OCR tends to fail
//   read     CV.analyze over the pixels and the lines
//
// Nothing here is a network call: ffmpeg and tesseract are local binaries, and a
// missing one is a NAMED refusal (ScreenUnavailable), never a silent degrade —
// the discipline visual-rec.mjs and look.js already hold for their own crossings.
//
// THE SETTINGS ARE NOT MEASURED. The core's thresholds were set by hand by the
// tool's author and no run derived them. II.11 says a constant either names its
// measurement or names its giver and says so; SCREEN_SETTINGS does the second for
// every one that decides something about the material, and readScreen carries the
// ones in force on every read (and so on every sidecar), so a number someone set
// by hand never travels downstream looking like a finding.

import { createRequire } from "node:module";
import { execFile, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CV = createRequire(import.meta.url)("./screen-core.cjs");
export { CV };

const GIVER = "set by hand in native/tools/screenshot-to-html.html (PR #144); no run derived it";
const setting = (value, basis) => Object.freeze({ value, giver: GIVER, basis });

/** Every hand-set constant that decides something about the material, named with
 *  its giver (II.11). The first group is what a caller may override per read
 *  (and what the sidecar records); the rest live inside screen-core.cjs, where
 *  they are disclosed here rather than edited — changing one is a new reading
 *  of every screenshot ever stored, so it is a deliberate act, not a tweak. */
export const SCREEN_SETTINGS = Object.freeze({
  // — per-read dials (the tool's own sliders and selects) —
  tolerance: setting(10, "a pixel joins a flat region when its summed per-channel colour difference from the region is within this; the tool's slider default, range 2-40"),
  minBoxArea: setting(500, "the smallest flat region, in squared prepared pixels, kept as a box; slider default, range 100-4000"),
  minConfidence: setting(45, "OCR text below this mean word confidence is not landed as text (it is reported as a gap, never dropped silently); slider default, range 0-90"),
  dprAutoWidth: setting(2200, "an image at least this wide is taken to be a 2x screenshot when density is not given"),
  // — the page's prepare(): how big the working image is —
  maxWidth: setting(2000, "the working image is scaled down so its width is at most this"),
  maxPixels: setting(2.5e6, "...and so it holds at most this many pixels"),
  // — inside screen-core.cjs —
  maxBoxes: setting(400, "at most this many boxes are kept, largest first (analyze)"),
  headingH1: setting(1.7, "a one- or two-line block at least this multiple of the page's median single-line text size is the page's first h1 (analyze)"),
  headingH2: setting(1.35, "...at least this multiple is an h2 (analyze)"),
  headingH3: setting(1.15, "...at least this multiple AND bold is an h3 (analyze)"),
  buttonHeight: setting([22, 90], "a box holding one line of text is a button only if its height in prepared pixels is within this range (analyze)"),
  buttonMaxWidth: setting(480, "...and its width is at most this (analyze)"),
  buttonTextShare: setting(0.3, "...and its text fills at least this share of its width (analyze)"),
  buttonColourDistance: setting(40, "...and it has a border or its fill differs from its parent's by at least this summed channel distance (analyze)"),
  bandWidth: setting(0.9, "a box at least this fraction of the page wide is a header (near the top) or a section (analyze)"),
  headerMaxHeight: setting(200, "a header band is at most this tall (analyze)"),
  sectionMinHeight: setting(120, "a section band is at least this tall (analyze)"),
  inkContrast: setting(45, "text whose ink differs from its background by less than this summed contrast is not landed (buildTexts)"),
  boldInkShare: setting(0.26, "text whose ink covers more than this share of its box is called bold (buildTexts)"),
  ruleThickness: setting(4, "a flat region at most this thick, and at least 40 long and 85% filled, is a rule (findBoxes)"),
  // — the OCR passes —
  ocrPsm: setting(11, "Tesseract page segmentation mode: sparse text, what the page runs"),
  ocrMergeFirstFloor: setting(50, "a first-pass OCR line is kept when its mean confidence is at least this (mergeOCR)"),
  ocrMergeSecondFloor: setting(60, "an inverted-pass OCR line is added only at or above this, and only where the first pass found nothing usable (mergeOCR)"),
  regionScale: setting([3, 2], "a dark or coloured box is re-read at this magnification when under 80 px tall, otherwise at the second value; 16 px of padding (the page's prepRegion)"),
  lightnessFloor: setting(140, "a box is a dark-region candidate when its luma is below this, or its channel spread above 90 (weakRegions); also the threshold at which a region is inverted before OCR"),
});

/** The one budget this file adds (not in the page): how long the region
 *  re-reads may spend. A budget decides how much to spend, not what the
 *  material is; what it leaves unread is reported as a gap. */
export const OCR_REGION_BUDGET_MS = { value: 45000, giver: "set by hand 2026-09-30 for this adapter, not measured", basis: "a browser tab can run its region passes in a worker without limit; a turn in the reading pipeline cannot. Regions are read largest first, and whatever the budget leaves unread is named in the read's gaps." };

/** What the image-region re-read tries (this adapter's addition to the page's passes). The bounds only choose what is
 *  TRIED; what is ADMITTED is the OCR's own confidence (ocrMergeSecondFloor) — a photograph that is tried and read as
 *  noise is admitted as nothing. */
export const IMAGE_LINE_SHAPE = { height: [12, 120], minAspect: 1.5, scale: 3, giver: "set by hand 2026-09-30 for this adapter, not measured", basis: "an image region the boxes and text did not explain, short and wide, may be a line of text the page-level read lost (measured once, on the tool's own sample: a 59 px blue headline on a light page was read on a crop at confidence 93 and absent from the page-level read); tall or square regions are pictures, not tried" };

/** A needed local binary is missing. Named, never silent. */
export class ScreenUnavailable extends Error {
  constructor(missing) { super(`screen read unavailable: ${missing.join(", ")} not found on PATH (ffmpeg and ffprobe decode the image, tesseract reads its text)`); this.name = "ScreenUnavailable"; this.missing = missing; }
}

const bin = (name) => process.env[`${name.toUpperCase()}_BIN`] || name;
const which = (name) => { const r = spawnSync(bin(name), [name === "tesseract" ? "--version" : "-version"], { encoding: "utf8" }); return r.error ? null : `${r.stdout}${r.stderr}`.split("\n")[0].trim() || name; };

let _tools = null;
/** The local binaries a read needs: { ffmpeg, ffprobe, tesseract } -> version line | null.
 *  Probed once per process (the answer does not change under a running server). */
export function screenTools({ fresh = false } = {}) { if (fresh || !_tools) _tools = { ffmpeg: which("ffmpeg"), ffprobe: which("ffprobe"), tesseract: which("tesseract") }; return _tools; }

function need(t, names) {
  const missing = names.filter((n) => !t[n]);
  if (missing.length) throw new ScreenUnavailable(missing);
}

// Async on purpose: a read is 10-25 s of subprocess work, and the proxy that calls it is one event loop.
function run(cmd, args, { timeout = 120000, encoding = "buffer" } = {}) {
  return new Promise((resolve, reject) => {
    execFile(bin(cmd), args, { timeout, maxBuffer: 512 * 1024 * 1024, encoding }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`${cmd}: ${err.killed ? `timed out after ${timeout}ms` : (String(stderr ?? "").slice(0, 300) || err.message)}`));
      resolve(stdout);
    });
  });
}

// ── decode ───────────────────────────────────────────────────────────────────

/** The working size: exactly the page's prepare(). */
export function preparedSize(ow, oh, { maxWidth = SCREEN_SETTINGS.maxWidth.value, maxPixels = SCREEN_SETTINGS.maxPixels.value } = {}) {
  const s = Math.min(1, maxWidth / ow, Math.sqrt(maxPixels / (ow * oh)));
  return { w: Math.max(1, Math.round(ow * s)), h: Math.max(1, Math.round(oh * s)), scale: s };
}

/** decodeImage(path) -> { img: {width,height,data: RGBA over white}, original: {width,height}, ratio }
 *  `ratio` is original pixels per working pixel (the page's state.ratio). */
export async function decodeImage(imagePath, opts = {}) {
  const probe = (await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", imagePath], { encoding: "utf8" })).trim();
  const [ow, oh] = probe.split("x").map(Number);
  if (!(ow > 0 && oh > 0)) throw new Error(`ffprobe could not read the dimensions of ${imagePath}: "${probe}"`);
  const { w, h, scale } = preparedSize(ow, oh, opts);
  // area averaging is the box filter a downscale should be; at scale 1 no filter is applied at all
  const vf = scale < 1 ? ["-vf", `scale=${w}:${h}:flags=area`] : [];
  const buf = await run("ffmpeg", ["-v", "error", "-i", imagePath, ...vf, "-frames:v", "1", "-pix_fmt", "rgba", "-f", "rawvideo", "pipe:1"]);
  if (buf.length < w * h * 4) throw new Error(`ffmpeg returned ${buf.length} bytes for a ${w}x${h} image (expected ${w * h * 4})`);
  const data = new Uint8ClampedArray(buf.buffer, buf.byteOffset, w * h * 4).slice();
  // flatten over white, the page's own fill before drawImage
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 255) continue;
    for (let k = 0; k < 3; k++) data[i + k] = Math.round((data[i + k] * a + 255 * (255 - a)) / 255);
    data[i + 3] = 255;
  }
  return { img: { width: w, height: h, data }, original: { width: ow, height: oh }, ratio: ow / w };
}

// ── OCR (tesseract TSV -> the line shape the core reads) ─────────────────────

function pnm(dir, name, w, h, channels, bytes) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, Buffer.concat([Buffer.from(`P${channels === 3 ? 6 : 5}\n${w} ${h}\n255\n`), Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length)]));
  return file;
}
const rgbOf = (img, invert = false) => {
  const n = img.width * img.height, out = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) out[i * 3 + k] = invert ? 255 - img.data[i * 4 + k] : img.data[i * 4 + k];
  return out;
};

/** Tesseract TSV text -> lines in the shape tesseract.js gives the page:
 *  [{ text, conf, bbox: {x0,y0,x1,y1}, words: [{ text, confidence, bbox }] }] */
export function linesFromTsv(tsv) {
  const rows = String(tsv).split("\n").slice(1).map((l) => l.split("\t")).filter((c) => c.length >= 12 && c[0] === "5" && c[11].trim() !== "");
  const byLine = new Map();
  for (const c of rows) {
    const k = `${c[2]}.${c[3]}.${c[4]}`;
    if (!byLine.has(k)) byLine.set(k, []);
    const left = +c[6], top = +c[7];
    byLine.get(k).push({ text: c[11].trim(), confidence: +c[10], bbox: { x0: left, y0: top, x1: left + +c[8], y1: top + +c[9] } });
  }
  return [...byLine.values()].map((ws) => ({
    text: ws.map((w) => w.text).join(" "),
    conf: ws.reduce((s, w) => s + w.confidence, 0) / ws.length,
    bbox: { x0: Math.min(...ws.map((w) => w.bbox.x0)), y0: Math.min(...ws.map((w) => w.bbox.y0)), x1: Math.max(...ws.map((w) => w.bbox.x1)), y1: Math.max(...ws.map((w) => w.bbox.y1)) },
    words: ws,
  }));
}

async function tesseract(file, { psm, lang, timeout }) {
  return linesFromTsv(await run("tesseract", [file, "stdout", "-l", lang, "--psm", String(psm), "tsv"], { encoding: "utf8", timeout }));
}

/** The page's prepRegion, on a pixel buffer: crop, magnify (bilinear), pad with white,
 *  grey, invert a dark region, stretch between its 1st and 99th percentile. */
export function prepRegion(img, r, scale) {
  const pad = 16;
  const dw = Math.round(r.w * scale), dh = Math.round(r.h * scale), cw = dw + pad * 2, ch = dh + pad * 2;
  const gray = new Uint8Array(cw * ch).fill(255), hist = new Uint32Array(256);
  const px = (x, y, k) => img.data[(Math.min(r.y + r.h - 1, Math.max(r.y, y)) * img.width + Math.min(r.x + r.w - 1, Math.max(r.x, x))) * 4 + k];
  for (let dy = 0; dy < ch; dy++) for (let dx = 0; dx < cw; dx++) {
    let v = 255;
    if (dx >= pad && dx < pad + dw && dy >= pad && dy < pad + dh) {
      const sx = r.x + (dx - pad + 0.5) / scale - 0.5, sy = r.y + (dy - pad + 0.5) / scale - 0.5;
      const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
      const c3 = [0, 1, 2].map((k) => (px(x0, y0, k) * (1 - fx) + px(x0 + 1, y0, k) * fx) * (1 - fy) + (px(x0, y0 + 1, k) * (1 - fx) + px(x0 + 1, y0 + 1, k) * fx) * fy);
      v = Math.round(0.2126 * c3[0] + 0.7152 * c3[1] + 0.0722 * c3[2]);
    }
    gray[dy * cw + dx] = v; hist[v]++;
  }
  const n = cw * ch;
  let sum = 0; for (let v = 0; v < 256; v++) sum += v * hist[v];
  const inv = sum / n < SCREEN_SETTINGS.lightnessFloor.value;
  const edge = (from, to, step) => { let a = 0; for (let v = from; v !== to; v += step) { a += hist[v]; if (a >= n * 0.01) return v; } return to - step; };
  const lo = edge(0, 256, 1), hi = edge(255, -1, -1);
  const l2 = inv ? 255 - hi : lo, h2 = inv ? 255 - lo : hi;
  for (let i = 0; i < n; i++) {
    let v = gray[i]; if (inv) v = 255 - v;
    gray[i] = Math.max(0, Math.min(255, ((v - l2) / Math.max(1, h2 - l2)) * 255));
  }
  return { gray, w: cw, h: ch, scale, pad };
}

/** Otsu's threshold (1979) over a 256-bin histogram of n pixels. */
function otsu(hist, n) {
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0, wB = 0, best = 0, th = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue;
    const wF = n - wB; if (!wF) break;
    sB += t * hist[t];
    const v = wB * wF * (sB / wB - (sum - sB) / wF) ** 2;
    if (v > best) { best = v; th = t; }
  }
  return th;
}

/** A region prepared for one line of text: grey, magnified, binarized at Otsu's threshold with the MINORITY class as
 *  ink (black on white). Polarity comes from which class is smaller, not from the region's mean brightness, so light
 *  text on a mid-tone fill and dark text on a light one are the same problem. */
export function prepLine(img, r, scale = IMAGE_LINE_SHAPE.scale, pad = 16) {
  const dw = Math.round(r.w * scale), dh = Math.round(r.h * scale), cw = dw + 2 * pad, ch = dh + 2 * pad;
  const g = new Uint8Array(cw * ch).fill(255), hist = new Uint32Array(256);
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const i = (Math.min(img.height - 1, r.y + Math.floor(y / scale)) * img.width + Math.min(img.width - 1, r.x + Math.floor(x / scale))) * 4;
    const v = Math.round(0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2]);
    g[(y + pad) * cw + x + pad] = v; hist[v]++;
  }
  const n = dw * dh, th = otsu(hist, n);
  let dark = 0; for (let v = 0; v <= th; v++) dark += hist[v];
  const inkIsDark = dark <= n - dark;
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) { const k = (y + pad) * cw + x + pad; g[k] = (g[k] <= th) === inkIsDark ? 0 : 255; }
  return { gray: g, w: cw, h: ch, scale, pad };
}

/** The page's OCR passes, in order: the whole image; (thorough) the inverted image merged in;
 *  (thorough) each dark or coloured box re-read on its own. Returns the merged lines and what it did. */
export async function ocrPasses(img, ratio, { thorough = true, lang = "eng", psm = SCREEN_SETTINGS.ocrPsm.value, budgetMs = OCR_REGION_BUDGET_MS.value, timeout = 60000 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-screen-"));
  const report = { passes: [], regionsRead: 0, regionsSkipped: [] };
  try {
    const t0 = Date.now();
    let lines = await tesseract(pnm(dir, "page.ppm", img.width, img.height, 3, rgbOf(img)), { psm, lang, timeout });
    report.passes.push({ name: "page", lines: lines.length });
    if (thorough) {
      const inverted = await tesseract(pnm(dir, "inv.ppm", img.width, img.height, 3, rgbOf(img, true)), { psm, lang, timeout });
      lines = CV.mergeOCR(lines, inverted);
      report.passes.push({ name: "inverted", lines: inverted.length, merged: lines.length });
      const pre = CV.analyze(img, [], { tol: SCREEN_SETTINGS.tolerance.value, minArea: SCREEN_SETTINGS.minBoxArea.value, dpr: 1, ratio });
      const rects = CV.weakRegions(img, pre);
      const spent0 = Date.now();
      for (let i = 0; i < rects.length; i++) {
        if (Date.now() - spent0 > budgetMs) { report.regionsSkipped = rects.slice(i).map((r) => [r.x, r.y, r.w, r.h]); break; }
        const r = rects[i], p = prepRegion(img, r, r.h < 80 ? SCREEN_SETTINGS.regionScale.value[0] : SCREEN_SETTINGS.regionScale.value[1]);
        const rl = (await tesseract(pnm(dir, `r${i}.pgm`, p.w, p.h, 1, p.gray), { psm, lang, timeout })).map((l) => {
          const f = (b) => ({ x0: (b.x0 - p.pad) / p.scale + r.x, y0: (b.y0 - p.pad) / p.scale + r.y, x1: (b.x1 - p.pad) / p.scale + r.x, y1: (b.y1 - p.pad) / p.scale + r.y });
          return { text: l.text, conf: l.conf, bbox: f(l.bbox), words: l.words.map((w) => ({ text: w.text, confidence: w.confidence, bbox: f(w.bbox) })) };
        });
        lines = CV.applyRegionLines(lines, r, rl);
        report.regionsRead++;
      }
      report.passes.push({ name: "regions", candidates: rects.length, read: report.regionsRead, skipped: report.regionsSkipped.length });
      // the adapter's own pass: image regions the model still cannot explain, read as single lines
      const unexplained = CV.analyze(img, lines, { tol: SCREEN_SETTINGS.tolerance.value, minArea: SCREEN_SETTINGS.minBoxArea.value, dpr: 1, ratio }).flat
        .filter((n) => n.type === "image" && n.h >= IMAGE_LINE_SHAPE.height[0] && n.h <= IMAGE_LINE_SHAPE.height[1] && n.w >= IMAGE_LINE_SHAPE.minAspect * n.h);
      let admitted = 0, tried = 0;
      for (let i = 0; i < unexplained.length; i++) {
        if (Date.now() - spent0 > budgetMs) break;
        const r = { x: unexplained[i].x, y: unexplained[i].y, w: unexplained[i].w, h: unexplained[i].h };
        const p = prepLine(img, r);
        tried++;
        const got = await tesseract(pnm(dir, `l${i}.pgm`, p.w, p.h, 1, p.gray), { psm: 7, lang, timeout });
        const f = (b) => ({ x0: (b.x0 - p.pad) / p.scale + r.x, y0: (b.y0 - p.pad) / p.scale + r.y, x1: (b.x1 - p.pad) / p.scale + r.x, y1: (b.y1 - p.pad) / p.scale + r.y });
        for (const l of got) {
          if ((l.text.match(/[A-Za-z0-9]/g) ?? []).length < 3 || l.conf < SCREEN_SETTINGS.ocrMergeSecondFloor.value) continue;
          lines.push({ text: l.text, conf: l.conf, bbox: f(l.bbox), words: l.words.map((w) => ({ text: w.text, confidence: w.confidence, bbox: f(w.bbox) })) });
          admitted++;
        }
      }
      report.passes.push({ name: "image-lines", candidates: unexplained.length, tried, admitted });
    }
    report.ms = Date.now() - t0;
    return { lines, report };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── the read ─────────────────────────────────────────────────────────────────

/** The per-read settings actually in force, resolved from defaults and overrides. */
export function settingsFor(o = {}) {
  return { tol: o.tol ?? SCREEN_SETTINGS.tolerance.value, minArea: o.minArea ?? SCREEN_SETTINGS.minBoxArea.value, minConf: o.minConf ?? SCREEN_SETTINGS.minConfidence.value };
}

/** readScreenPixels({ img, ratio, dpr, lines, settings }) — nothing to decode and nothing to look at:
 *  pixels and lines in, model out. Pure; what the tests and any caller holding its own pixels use.
 *  `ratio` is original pixels per working pixel; `dpr` is the screenshot's density. */
export function readScreenPixels({ img, ratio = 1, dpr = 1, lines = [], settings = {}, seg = null }) {
  const s = settingsFor(settings);
  const model = CV.analyze(img, lines, { tol: s.tol, minArea: s.minArea, minConf: s.minConf, dpr, ratio, ...(seg ? { seg } : {}) });
  return { schema: "EOScreenRead@1", model, lines, settings: s, dpr, ratio, prepared: { width: img.width, height: img.height } };
}

/** readScreen(imagePath, opts) -> the read, with the source's identity and what each crossing did.
 *  opts: { thorough=true, ocr=true, lang="eng", dpr="auto"|1|2|3, tol, minArea, minConf,
 *          lines (skip OCR, use these), decoded (a decodeImage result already in hand), seg (its segmentation) }
 *  Rejects with ScreenUnavailable when a needed binary is missing. */
export async function readScreen(imagePath, opts = {}) {
  const tools = screenTools();
  need(tools, opts.ocr === false || opts.lines ? ["ffmpeg", "ffprobe"] : ["ffmpeg", "ffprobe", "tesseract"]);
  const bytes = fs.readFileSync(imagePath);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const { img, original, ratio } = opts.decoded ?? await decodeImage(imagePath);
  const dpr = opts.dpr == null || opts.dpr === "auto" ? (original.width >= SCREEN_SETTINGS.dprAutoWidth.value ? 2 : 1) : Number(opts.dpr);
  let lines = [], ocr = { ran: false, reason: opts.lines ? "lines supplied by the caller" : "ocr disabled by the caller" };
  if (opts.lines) lines = opts.lines;
  else if (opts.ocr !== false) { const o = await ocrPasses(img, ratio, { thorough: opts.thorough !== false, lang: opts.lang ?? "eng" }); lines = o.lines; ocr = { ran: true, engine: tools.tesseract, lang: opts.lang ?? "eng", ...o.report }; }
  const read = readScreenPixels({ img, ratio, dpr, lines, settings: opts, seg: opts.seg });
  return { ...read, source: { path: imagePath, sha256, bytes: bytes.length, width: original.width, height: original.height }, tools, ocr };
}
