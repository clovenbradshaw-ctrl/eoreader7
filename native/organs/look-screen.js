// organs/look-screen.js — the screen sense of the looking seam (organs/look.js).
//
// look.js has two senses: a mechanical one (OpenCV boxes + OCR, needs a Python venv) and a vision model's
// holistic read (needs ollama), judged against each other. A UI screenshot is the case where neither is the
// right instrument: its structure is flat colour regions and text, which can be MEASURED, not described. This
// is that measurement, as a third sense that needs only ffmpeg and tesseract:
//
//   gate     is this image a screen at all? A photograph has no flat regions to measure; reading it as a page
//            would invent structure. The gate is the share of the image's pixels that sit in flat regions.
//   read     adapters/image/screen-read.js (the PR #144 tool's own core) -> a sidecar
//   keep     the sidecar is stored by the image's sha256 and the instrument's identity, so the look is done
//            ONCE per (bytes, instrument): the next turn that meets the same screenshot reads it from disk
//   speak    plain text for the reader, `visual-box` ledger lines for the fold, and fact lines the vision
//            read is judged against (look.js's settleRead: a vision model cannot outvote a measurement)
//
// Nothing here is a model call. A missing binary is a NAMED refusal carried to the reading, never a silent
// skip; an image that is not a screen is reported as such with the number that decided it.

import fs from "node:fs";
import crypto from "node:crypto";
import { decodeImage, readScreen, screenTools, CV, SCREEN_SETTINGS, ScreenUnavailable } from "../adapters/image/screen-read.js";
import { sidecarOf, loadSidecar, saveSidecar, readingTextOf, ledgerLinesOf, screenDir } from "../adapters/image/screen-sidecar.js";

/** The share of an image's pixels in flat regions (components of at least the minimum box area at the tolerance in
 *  force) at or above which the image is read as a screen. */
export const FLAT_SHARE_FLOOR = {
  value: 0.77,
  giver: "measured 2026-09-30 by running organs/look-screen.js's flatShareOf over real images on this machine",
  basis: "12 UI screenshots (the repo's two reference screenshots and its generated sample, a 1692x1014 desktop capture, and the-fold's 8 mobile and desktop shots) scored 0.861-0.976; 17 photographic images (aerial satellite tiles, MNPD-DFR/satellite) scored 0.404-0.676. The floor is the midpoint of that gap, 0.7685, rounded. One photographic family, so a sky or a close-up may score differently; a caller that knows better passes `force`.",
};

/** flatShareOf(img, tol) -> { share, segments, seg } — the gate's number, and the segmentation it came from (reusable by the read). */
export function flatShareOf(img, tol = SCREEN_SETTINGS.tolerance.value, minArea = SCREEN_SETTINGS.minBoxArea.value) {
  const seg = CV.segment(img, tol);
  const N = img.width * img.height;
  let flat = 0;
  for (const c of seg.comps) if (c.n >= minArea) flat += c.n;
  return { share: flat / N, segments: seg.comps.length, seg };
}

const enabled = () => process.env.ER7_SCREEN !== "0";
const sha256Of = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
// an image that is not a screen stays not a screen: remembered for the process so a photo is not decoded again every turn
const notScreens = new Map();

const posLabel = (region, W, H) => {
  const [x, y, w, h] = region, cx = x + w / 2, cy = y + h / 2;
  const col = cx < W / 3 ? "left" : cx < (2 * W) / 3 ? "center" : "right", row = cy < H / 3 ? "top" : cy < (2 * H) / 3 ? "middle" : "bottom";
  return row === "middle" && col === "center" ? "center" : row === "middle" ? col : col === "center" ? row : `${row} ${col}`;
};

/** The measured facts, as the plain lines look.js's judge checks a vision read against (its imageFactLines' shape). */
export function factLinesOf(sidecar, { max = 30 } = {}) {
  const { width: W, height: H } = sidecar.source;
  return sidecar.elements
    .filter((e) => e.text && (e.type === "text" || e.role === "button"))
    .sort((a, b) => b.region[2] * b.region[3] - a.region[2] * a.region[3])
    .slice(0, max)
    .map((e) => `- ${e.role === "button" ? "a button" : `${e.role === "p" ? "text" : `a ${e.role} heading`}`} reading "${e.text.replace(/\n/g, " ")}", positioned in the ${posLabel(e.region, W, H)}`);
}

/**
 * lookAtScreen(imagePath, { name, dir, force, thorough, persist }) ->
 *   { screen: false, reason, ... }                         not applicable or unavailable (named)
 *   { screen: true, sidecar, sidecarPath, cached, gate, text, factLines, ledgerLines, standing }
 * Never throws for a missing tool or a non-screen: those are results.
 */
export async function lookAtScreen(imagePath, { name = imagePath.split("/").pop(), dir = screenDir(), force = false, thorough = true, persist = true } = {}) {
  if (!enabled()) return { screen: false, reason: "disabled", detail: "ER7_SCREEN=0" };
  let tools;
  try {
    tools = screenTools();
    const missing = ["ffmpeg", "ffprobe", "tesseract"].filter((t) => !tools[t]);
    if (missing.length) throw new ScreenUnavailable(missing);
  } catch (err) { return { screen: false, reason: "unavailable", detail: err.message }; }

  let sha;
  try { sha = sha256Of(imagePath); } catch (err) { return { screen: false, reason: "unreadable", detail: err.message }; }
  const cached = persist ? loadSidecar(sha, { dir }) : null;
  let sidecar = cached, gate = null, sidecarPath = null;
  if (!cached) {
    if (!force && notScreens.has(sha)) return { screen: false, reason: "not_a_screen", gate: notScreens.get(sha) };
    try {
      const decoded = await decodeImage(imagePath);
      const { share, segments, seg } = flatShareOf(decoded.img);
      gate = { flatShare: Math.round(share * 1000) / 1000, floor: FLAT_SHARE_FLOOR.value, segments, passes: share >= FLAT_SHARE_FLOOR.value, basis: FLAT_SHARE_FLOOR.basis };
      if (!gate.passes && !force) { notScreens.set(sha, gate); return { screen: false, reason: "not_a_screen", gate }; }
      const read = await readScreen(imagePath, { decoded, seg, thorough });
      sidecar = sidecarOf(read, { name });
      if (persist) sidecarPath = saveSidecar(sidecar, { dir }); // an attached image's bytes are never kept, so neither is the text read off them (persist: false)
    } catch (err) {
      return { screen: false, reason: err instanceof ScreenUnavailable ? "unavailable" : "error", detail: err.message, ...(gate ? { gate } : {}) };
    }
  }
  return {
    screen: true, sidecar, sidecarPath, cached: Boolean(cached), ...(gate ? { gate } : {}),
    text: readingTextOf(sidecar),
    factLines: factLinesOf(sidecar),
    ledgerLines: ledgerLinesOf(sidecar, { image: name }),
    standing: `SCREEN READ (mechanical, no vision model): ${sidecar.standing}`,
  };
}
