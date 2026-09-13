// look.js — the native "looking" capacity: when the reader is reading
// something wrong, LOOK at it. Two senses, the same way this project's own
// corroboration/witness machinery requires elsewhere:
//
//   1. A MECHANICAL sense: OpenCV box/connector detection + per-region
//      Tesseract OCR, landing detected structure as addressed observations
//      (the EOT ledger lines visual-rec.mjs already writes, re-exported
//      here so the proxy reads ONE seam, not two).
//   2. A VISION-model sense: a local vision model's holistic read of the
//      whole thing, escalated on disagreement to a larger model, judged by
//      a mechanical read it cannot outvote for precise detail.
//
// The two never run blind: a judge call checks the vision read against the
// mechanical facts and escalates only on a real, named disagreement
// (settleImageRead, below — the fold's own "multiple eyes, triggered by
// disagreement" discipline, ported to node). What gets landed is a FUSION
// — one plain description the talking model can speak from, plus the
// addressed per-region facts as supporting, citable detail.
//
// "Looking at text" is the same capacity one step back: text whose
// formatting the plain-text reader is reading WRONG (a table, multi-column
// layout, unusual whitespace, an embedded diagram) is rendered to an image
// and looked at — the reader stops guessing at the flat bytes and sees the
// thing the way a person would. `weirdFormattingScore` names when that has
// happened (the trigger), `renderTextToImage` makes the image, and
// `lookAtImage` reads it.
//
// REQUIRES (each refused loudly, never silently degraded, per the
// discipline visual-rec.mjs already established for VISUAL_DETECT_PYTHON):
//   - VISUAL_DETECT_PYTHON → a venv python with opencv-python-headless +
//     numpy (the mechanical box detector), plus a real `tesseract` binary.
//   - a vision model pulled on OLLAMA (default: moondream → qwen2.5vl:7b).
//   - on macOS, QuickLook (`qlmanage`) for the text→image render. Off-macOS
//     text rendering is not built yet — `renderTextToImage` says so rather
//     than guessing.

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectVisualStructure, toLedgerLines, foldVisual } from "../eval/lavar/visual-rec.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://localhost:11434";

export const VISION_LADDER = Object.freeze([
  { model: "moondream", label: "moondream" },
  { model: "qwen2.5vl:7b", label: "qwen2.5vl" },
]);

// Same epistemic-humility standing the fold's app.js carries for each sense.
export const MECHANICAL_STANDING =
  "detected by OpenCV contour/color analysis and read by Tesseract OCR at this moment; a label is what OCR made of the cropped pixels, not a verified transcription of the thing";
export const VISION_STANDING =
  "a local vision model's own impression of the whole thing at this moment, not a verified transcription — this exact model has been measured hallucinating specific factual details elsewhere in this project, so treat a precise claim in it with real skepticism; a general description is what it is actually reasonably good at";

// ── trigger: are we reading this text wrong? ────────────────────────────────
// A mechanical, model-free reading of the BYTES the reader sees: if the text
// carries structure the plain-text reader structurally cannot see (tables,
// multi-column layout, box-drawing, huge whitespace runs, very short lines
// that are cells not sentences), the reader is reading it wrong and should
// LOOK instead. Pure function, declared inputs, testable — no model, no I/O.
const BOX_DRAWING = /[\u2500-\u257F\u2590-\u259F]/;
const CELLISH_LINE = /^(\s*[\p{L}\p{N}][\p{L}\p{N} .\-\/'"]*\s*[|¦│]\s*){2,}[\p{L}\p{N}].*$/u;

export function weirdFormattingScore(text, { minLines = 3 } = {}) {
  if (!text || typeof text !== "string") return { score: 0, signals: [] };
  const signals = [];
  const lines = text.split("\n");
  const contentLines = lines.filter((l) => l.trim());
  if (contentLines.length < minLines) return { score: 0, signals: [] };

  const tablePipes = contentLines.filter((l) => /[|¦│]/.test(l)).length;
  if (tablePipes / contentLines.length >= 0.5) signals.push("table_rows");

  const boxDraw = contentLines.filter((l) => BOX_DRAWING.test(l)).length;
  if (boxDraw / contentLines.length >= 0.2) signals.push("box_drawing");

  const shortLines = contentLines.filter((l) => l.trim().length > 0 && l.trim().length <= 12).length;
  if (shortLines / contentLines.length >= 0.4) signals.push("very_short_lines");

  const avgWords = contentLines.reduce((a, l) => a + l.trim().split(/\s+/).filter(Boolean).length, 0) / contentLines.length;
  if (avgWords <= 2.5) signals.push("sub_sentence_lines");

  const longRuns = contentLines.filter((l) => / {4,}/.test(l)).length;
  if (longRuns / contentLines.length >= 0.3) signals.push("wide_whitespace_runs");

  // A column-shaped block: many lines of similar, short width (cells stacked
  // vertically, not prose wrapped). Distinct from very_short_lines (a
  // dialogue script is short lines; a column is short + narrow-width alike).
  const widths = contentLines.map((l) => l.trim().length);
  const avgWidth = widths.reduce((a, b) => a + b, 0) / Math.max(1, widths.length);
  if (avgWidth > 0 && avgWidth <= 20 && contentLines.length >= 8) signals.push("narrow_column");

  return { score: signals.length, signals };
}

// ── text → image: render the bytes the way a person would see them ────────
// macOS QuickLook (`qlmanage -t`) renders a text file to a PNG thumbnail —
// the native renderer a person actually gets when they open the file. This
// is what makes "look at text with weird formatting" real: the reader that
// misread the flat bytes now sees the thing itself. Off-macOS this refuses
// loudly rather than guessing at a renderer.
export function renderTextToImage(text, { tmpDir = os.tmpdir(), size = 1400, label = "er7-look" } = {}) {
  if (process.platform !== "darwin") {
    throw new Error("renderTextToImage is macOS-only (QuickLook/qlmanage) — text rendering on this platform is not built; the mechanical read already ran on the raw bytes");
  }
  const srcPath = path.join(tmpDir, `${label}.txt`);
  fs.writeFileSync(srcPath, text, "utf8");
  execFileSync("qlmanage", ["-t", "-s", String(size), "-o", tmpDir, srcPath], { stdio: ["ignore", "ignore", "pipe"] });
  const png = path.join(tmpDir, `${label}.txt.png`);
  if (!fs.existsSync(png)) throw new Error(`qlmanage produced no thumbnail at ${png}`);
  return { imagePath: png, srcPath };
}

// ── mechanical sense: OpenCV boxes + per-region OCR ────────────────────────
// Re-exports visual-rec.mjs's own detector + ledger writers so the proxy
// imports ONE looking seam. detectVisualStructure refuses (throws) when
// VISUAL_DETECT_PYTHON is unset — a missing dependency fails loudly, not an
// empty, falsely-clean read.
export { detectVisualStructure, toLedgerLines, foldVisual };

// Full-image OCR fallback (tesseract, whole page) — used when the box
// detector found nothing (a photo, a plain scan, anything without discrete
// labeled regions) so the mechanical sense still has SOMETHING to check the
// vision read against.
export function ocrFullImage(imagePath, { psm = 3, tesseractBin = process.env.TESSERACT_BIN || "tesseract" } = {}) {
  const out = execFileSync(tesseractBin, [imagePath, "stdout", "--psm", String(psm)], { maxBuffer: 64 * 1024 * 1024, encoding: "utf8" });
  return out.trim();
}

// ── vision sense: a local vision model's holistic read ─────────────────────
async function blobToBase64(imagePath) {
  const buf = fs.readFileSync(imagePath);
  return buf.toString("base64");
}

async function completeVision(messages, { model = VISION_LADDER[0].model, maxTokens = 250, temperature = 0, timeoutMs = 120000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({ model, messages, stream: false, options: { num_predict: maxTokens, temperature } }),
    });
    if (!res.ok) throw new Error(`ollama ${res.status}`);
    const data = await res.json();
    return { text: (data?.message?.content ?? "").trim() };
  } finally {
    clearTimeout(timer);
  }
}

function positionLabel(region, width, height) {
  if (!width || !height) return null;
  const [x, y, w, h] = region;
  const cx = x + w / 2, cy = y + h / 2;
  const col = cx < width / 3 ? "left" : cx < (2 * width) / 3 ? "center" : "right";
  const row = cy < height / 3 ? "top" : cy < (2 * height) / 3 ? "middle" : "bottom";
  if (row === "middle" && col === "center") return "center";
  return row === "middle" ? col : col === "center" ? row : `${row} ${col}`;
}

function imageFactLines(boxes, connectors, width, height) {
  const readable = boxes.filter((b) => b.text && b.text.trim());
  const byId = new Map(readable.map((b) => [b.id, { text: b.text.replace(/\n/g, " "), color: b.color, pos: positionLabel(b.region, width, height) }]));
  const lines = readable.map((b) => {
    const info = byId.get(b.id);
    return `- a${info.color ? ` ${info.color}` : ""} box labeled "${info.text}"${info.pos ? `, positioned in the ${info.pos}` : ""}`;
  });
  for (const c of connectors) {
    if (!byId.has(c.connects[0]) || !byId.has(c.connects[1])) continue;
    lines.push(`- a line connects the "${byId.get(c.connects[0]).text}" box to the "${byId.get(c.connects[1]).text}" box`);
  }
  return lines;
}

// The judge call — does the vision read plausibly agree with what the
// mechanical detector found? The model POINTS (AGREES/DISAGREES) then names
// the problem; it never freely narrates a verdict.
async function judgeSenseAgreement(visionRead, factLines, model) {
  if (!visionRead) return { agrees: true, reason: "no vision read to check" };
  if (!factLines.length) return { agrees: true, reason: "no mechanical facts to check against" };
  try {
    const { text } = await completeVision([
      {
        role: "user",
        content: `A vision model said something shows: "${visionRead}"\n\nA mechanical detector separately found:\n${factLines.join("\n")}\n\nDoes the vision model's description plausibly agree with the mechanical findings, or does it contradict them? Reply with exactly one word first, AGREES or DISAGREES, then a colon and one short sentence naming the specific problem if it disagrees.`,
      },
    ], { model, maxTokens: 60 });
    return { agrees: !/^DISAGREES/i.test(text), reason: text };
  } catch {
    return { agrees: true, reason: "judge call failed, proceeding without escalation" };
  }
}

// Escalation loop: propose a vision read, have a judge check it against the
// mechanical facts, escalate with a targeted correction only on a real,
// named disagreement, stop on measured settlement rather than a fixed ladder.
const MAX_ESCALATIONS = 2;
export async function settleRead(visionRead, factLines, model) {
  let current = visionRead;
  let turns = 1;
  let judged = await judgeSenseAgreement(current, factLines, model);
  while (!judged.agrees && turns < MAX_ESCALATIONS) {
    const correction = judged.reason.replace(/^DISAGREES:?\s*/i, "").trim();
    const { text } = await completeVision([
      { role: "user", content: `Describe this plainly and factually: what does it show? A few sentences. A second look is being taken because: ${correction} Look again and correct that specifically if it's right.` },
    ], { model });
    current = text || current;
    turns += 1;
    judged = await judgeSenseAgreement(current, factLines, model);
  }
  return { visionRead: current, turns, settled: judged.agrees, unresolvedReason: judged.agrees ? null : judged.reason };
}

// ── lookAtImage: the full two-sense read of one image ──────────────────────
// Mechanical (OpenCV boxes + per-region OCR) first, then a vision read of
// the whole, judged against the mechanical facts, escalated only on a real
// disagreement, fused into ONE plain description + the addressed facts.
// Returns null on a truly empty read (nothing mechanical, no vision answer)
// — a caller renders its own wording around that.
export async function lookAtImage(imagePath, { visionModel = VISION_LADDER[0].model, arrowColorBGR, name = path.basename(imagePath) } = {}) {
  let detected = null;
  let detectorError = null;
  try {
    detected = detectVisualStructure(imagePath, { arrowColorBGR });
  } catch (err) {
    detectorError = err.message;
  }
  const boxes = detected?.boxes ?? [];
  const connectors = detected?.connectors ?? [];
  const width = detected?.width;
  const height = detected?.height;

  let visionRead = null;
  let visionError = null;
  let visionModelUsed = visionModel;
  // Walk the vision ladder IN ORDER (cheapest/fastest first), escalating a
  // rung that returns NOTHING to the next rung — an empty read is a missing
  // sense, not an answer (moondream returns "" on some real inputs; qwen2.5vl
  // is a genuinely separate model family, so a real answer from it is a
  // second instrument, not a retry of the same weights). Disagreement is
  // handled by settleRead, below; this handles silence.
  const rungs = [...VISION_LADDER];
  if (!rungs.some((r) => r.model === visionModel)) rungs.unshift({ model: visionModel, label: "requested" });
  for (const rung of rungs) {
    try {
      const b64 = await blobToBase64(imagePath);
      const { text } = await completeVision([
        { role: "user", content: "Describe this image plainly and factually: what is it a picture of, what does it show. A few sentences.", images: [b64] },
      ], { model: rung.model });
      if (text) { visionRead = text; visionModelUsed = rung.model; break; }
    } catch (err) {
      visionError = visionError ? `${visionError}; ${err.message}` : err.message;
    }
  }

  const factLines = imageFactLines(boxes, connectors, width, height);
  const settled = await settleRead(visionRead, factLines, visionModelUsed);

  if (!boxes.length && !visionRead) {
    return { imagePath, name, text: "", boxCount: 0, edgeCount: 0, visionRead: null, visionModelUsed: null, visionSettled: true, unresolvedReason: null, detectorError, visionError, mechanicalStanding: null, visionStanding: null };
  }

  const readable = boxes.filter((b) => b.text && b.text.trim());
  const lines = [];
  if (visionRead) lines.push(`Looking at "${name}": ${visionRead}`);
  if (readable.length || connectors.length) {
    if (visionRead) lines.push("");
    lines.push("Detected regions (OpenCV + OCR):");
    for (const b of readable) {
      const pos = positionLabel(b.region, width, height);
      lines.push(`Region ${b.id}${b.color ? ` (${b.color})` : ""}${pos ? ` [${pos}]` : ""} (pixel area ${JSON.stringify(b.region)}): "${b.text.replace(/\n/g, " ")}"`);
    }
    for (const c of connectors) {
      lines.push(`Connector between region ${c.connects[0]} and region ${c.connects[1]}${c.direction !== "undetermined" ? ` (direction: ${c.direction})` : " (direction not determined)"}.`);
    }
  }
  if (!settled.settled) lines.push("", `(the vision read and the mechanical findings still disagree after ${settled.turns} tries: ${settled.unresolvedReason})`);
  if (detectorError) lines.push("", `(the mechanical detector did not run: ${detectorError})`);
  if (visionError) lines.push("", `(no vision model answered: ${visionError})`);

  const standing = readable.length ? `${VISION_STANDING} A mechanical detector also ran: ${MECHANICAL_STANDING}` : VISION_STANDING;
  return {
    imagePath, name,
    text: lines.join("\n"),
    boxCount: boxes.length, edgeCount: connectors.length,
    boxes, connectors,
    visionRead: settled.visionRead,
    visionModelUsed,
    visionSettled: settled.settled,
    visionTurns: settled.turns,
    unresolvedReason: settled.unresolvedReason,
    detectorError, visionError,
    standing,
    ledgerLines: toLedgerLines(detected ?? { image: imagePath, boxes, connectors }),
    fold: foldVisual(toLedgerLines(detected ?? { image: imagePath, boxes, connectors })),
  };
}

// ── lookAtText: the same capacity, one step back ───────────────────────────
// Text the plain-text reader is reading WRONG (weirdFormattingScore) is
// rendered to an image and looked at. Returns the same shape as lookAtImage,
// plus `triggered` (which signals fired) and `score`.
export async function lookAtText(text, { source = "text", model = null, label } = {}) {
  const scoreInfo = weirdFormattingScore(text);
  if (scoreInfo.score === 0) return { source, text: "", score: 0, signals: [], triggered: false };
  const rendered = renderTextToImage(text, { label: label ?? `er7-look-${Date.now()}` });
  const looked = await lookAtImage(rendered.imagePath, { visionModel: model ?? VISION_LADDER[0].model, name: source });
  return { source, ...looked, score: scoreInfo.score, signals: scoreInfo.signals, triggered: true };
}

// ── shouldLook: the proxy's trigger — should this file be LOOKED at? ───────
// An image file, or text whose formatting the reader is reading wrong.
export function shouldLook({ fileName = "", text = "", isImage = false } = {}) {
  if (isImage) return { look: true, reason: "image_file" };
  const scoreInfo = weirdFormattingScore(text);
  if (scoreInfo.score > 0) return { look: true, reason: `weird_formatting:${scoreInfo.signals.join(",")}`, ...scoreInfo };
  return { look: false, reason: null, ...scoreInfo };
}

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff", ".tif"]);
export function isImageFileName(fileName) {
  return IMAGE_EXT.has(path.extname(fileName ?? "").toLowerCase());
}