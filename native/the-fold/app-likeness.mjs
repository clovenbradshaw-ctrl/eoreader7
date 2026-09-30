// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 2 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// app-likeness.mjs — the copy check, run against EVERYTHING the research recorded.
//
// comp-research.mjs writes every page and image it came across to an append-only
// seen-ledger (robots, visits, each image with its sha256, size, dHash and the license
// the page stated). This reads those ledgers back and puts the generated app beside all
// of it: the words the app shows against every word found in every screenshot seen (a
// shared run of four content words is a shared PASSAGE, flagged), and the app's own
// rendering against every seen screenshot by image hash — counted a near-copy only when it
// is closer than every other image of the same kind (the null), so a generic
// phone-screenshot look is not mistaken for copying.
//
//   seenFromLedgers(dirs, { python }) -> [{ id, url, texts, hash, license }]   (OCR on the kept images)
//   likenessOfApp({ pageTexts, screenshot, seen, python }) -> the EOLikeness@1 report + what it compared
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { likenessOf } from "../organs/comp-research.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const DETECT = path.join(here, "..", "adapters", "image", "comp-detect.py");
const FINGERPRINT = path.join(here, "..", "adapters", "image", "image-fingerprint.py");

const readLedger = (file) => fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));

/** The image rows the ledger kept (with their license standing), paired with the bytes on disk. */
export function seenImages(ledgerFile, imagesDir) {
  const rows = readLedger(ledgerFile);
  const kept = rows.filter((r) => r.event === "image" && r.kept !== false);
  return kept.map((r) => ({ id: r.sha256.slice(0, 16), url: r.url, page: r.page, hash: r.dhash, license: r.license, file: imagesDir ? path.join(imagesDir, `${r.sha256.slice(0, 16)}.png`) : null }));
}

/** OCR every kept image that is on disk (whole-page only — the cheap pass), for the word-run comparison. */
export function readSeen(images, { python = process.env.VISUAL_DETECT_PYTHON ?? "python3" } = {}) {
  const out = [], unreadable = [];
  for (const im of images) {
    if (!im.file || !fs.existsSync(im.file)) { unreadable.push({ id: im.id, why: "image file not on disk" }); out.push({ id: im.id, url: im.url, texts: [], hash: im.hash, license: im.license }); continue; }
    try {
      const d = JSON.parse(execFileSync(python, [DETECT, im.file, "--light"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 120000 }));
      out.push({ id: im.id, url: im.url, texts: [d.words.map((w) => w.text).join(" ")], hash: im.hash, license: im.license });
    } catch (e) { unreadable.push({ id: im.id, why: String(e.message).slice(0, 120) }); out.push({ id: im.id, url: im.url, texts: [], hash: im.hash, license: im.license }); }
  }
  return { seen: out, unreadable };
}

export function fingerprintOf(png, { python = process.env.VISUAL_DETECT_PYTHON ?? "python3" } = {}) {
  return JSON.parse(execFileSync(python, [FINGERPRINT, png], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })).dhash;
}

/**
 * likenessOfApp — pageTexts: every string the page shows (labels, placeholders, headings, sample rows);
 * screenshot: a PNG of the running app; seen: readSeen(...).seen; nullImages: hashes of seen images the app was NOT built from.
 */
export function likenessOfApp({ pageTexts, screenshot, seen, nullHashes = [], python }) {
  const hash = screenshot ? fingerprintOf(screenshot, { python }) : null;
  const report = likenessOf({ output: { texts: pageTexts, hash }, seen, nulls: nullHashes });
  return { ...report, appHash: hash, licenses: Object.fromEntries(seen.map((s) => [s.id, s.license?.standing ?? "unknown"])) };
}
