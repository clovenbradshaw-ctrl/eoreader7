#!/usr/bin/env node
// extract-image-palette.mjs — the raster-image half of Girard's mimetic
// evidence. girard.js's mimeticFinding/dominantConvention read CSS TEXT
// (a page's own declared --accent tokens, border-radius rules); a
// downloaded reference IMAGE has no CSS at all — the evidence has to be
// read off actual pixels. This is the missing crossing: given a real
// image file on disk, load it into a real browser canvas (the ONLY
// reliable decoder already available here — no new image-parsing
// dependency), sample its pixels, and report a quantized color histogram
// as a plain, measured fact: {hex, count, shareOfSampled}.
//
// Deliberately does NOT decide "this is the accent" / "this is the
// background" here — that classification (frequency + saturation) is
// girard.js's job (dominantPaletteFinding), kept separate so the
// EXTRACTION (a live crossing, needs a real page) and the
// CLASSIFICATION (pure, testable without a browser) stay apart, the
// same split source.js/mimeticFinding already hold between css text and
// what it means.
import { cdpSession } from "./podcast-cdp-lib.mjs";

const BUCKET = 16; // quantization step per channel — coarse enough that
// "the same visual color, off by a JPEG artifact or two" still collapses
// into one bucket, fine enough that a real accent (blue) and a real
// background (near-black) never collide.

export async function extractImagePalette({ filePath, cdpUrl, maxSamples = 20000, yFrom = 0, yTo = 1 }) {
  const { send, close } = await cdpSession(cdpUrl);
  try {
    await send("Page.navigate", { url: `file://${filePath}` });
    // A raw image file navigated to directly renders as a bare <img> —
    // wait for it to actually decode, not just for navigation to settle.
    await new Promise((r) => setTimeout(r, 600));
    const expr = `(() => {
      const img = document.querySelector("img");
      if (!img) return JSON.stringify({ error: "no <img> found — did the file load as a raw image?" });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const { width, height } = canvas;
      const y0 = Math.max(0, Math.floor(height * ${yFrom}));
      const y1 = Math.min(height, Math.ceil(height * ${yTo}));
      const bandHeight = Math.max(1, y1 - y0);
      const total = width * bandHeight;
      const stride = Math.max(1, Math.floor(total / ${maxSamples}));
      const data = ctx.getImageData(0, y0, width, bandHeight).data;
      const buckets = new Map();
      let sampled = 0;
      for (let p = 0; p < total; p += stride) {
        const i = p * 4;
        const a = data[i + 3];
        if (a < 200) continue; // skip near-transparent pixels
        const r = Math.round(data[i] / ${BUCKET}) * ${BUCKET};
        const g = Math.round(data[i + 1] / ${BUCKET}) * ${BUCKET};
        const b = Math.round(data[i + 2] / ${BUCKET}) * ${BUCKET};
        const key = r + "," + g + "," + b;
        buckets.set(key, (buckets.get(key) || 0) + 1);
        sampled += 1;
      }
      const entries = [...buckets.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 24)
        .map(([rgb, count]) => {
          const [r, g, b] = rgb.split(",").map(Number);
          const hex = "#" + [r, g, b].map((n) => Math.min(255, n).toString(16).padStart(2, "0")).join("");
          return { hex, count, share: count / sampled };
        });
      return JSON.stringify({ width, height, bandHeight, sampled, entries });
    })()`;
    const result = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
    return JSON.parse(result.result.result.value);
  } finally {
    close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";
  if (!filePath) { console.error("usage: node extract-image-palette.mjs <absolute-path-to-image> [CDP_URL=...]"); process.exit(1); }
  const r = await extractImagePalette({ filePath, cdpUrl });
  console.log(JSON.stringify(r, null, 2));
}
