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
// AntiStrauss, wired IN (2026-09-20, falsification F1): the vision sense was
// the one model output the safety-and-ethics gate never saw — completeVision
// fetched OLLAMA directly from inside runProxyTurn. The gate now runs on
// every vision model call, exactly as it does on streamOllamaChat: pre-call
// gate with forceBlock, output reviewed with forceBlock, a blocked call
// throws ERR_ANTISTRAUSS_BLOCKED and the caller discloses it as a vision
// error — a missing sense is never an answer. Same module, same ground.
import { gate as antistraussGate, reviewBlock as antistraussReviewBlock } from "../the-fold/antistrauss.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://localhost:11434";
const VISION_BLOCKED_TEXT = "This reading's vision sense was withheld by the safety-and-ethics gate (AntiStrauss).";

// ── the child: a fast-path memory read BEFORE any CV model runs ────────────
// organs/mnemonic.js keeps the SHADOW and ECHO of previously taught regions
// (the CV parent taught them); when the child recognizes a new image's raw
// bytes, the looking seam answers from memory — no OpenCV, no ollama, no
// vision model. Disabled loudly-named: ER7_MNEMONIC=0 turns it off; an
// unreadable store or a decode failure falls through to CV with the error
// disclosed, never silently swallowed.
import {
  loadStore as _loadMnemonicStore,
  mnemonicLook,
  teachFromLook as _teachFromLook,
  recognizeImage as _recognizeImage,
  recognizeRegion as _recognizeRegion,
  recognizeSeries as _recognizeSeries,
  teachGrid as _teachGrid,
  teachSeries as _teachSeries,
  STORE_PATH as MNEMONIC_STORE_PATH,
} from "./mnemonic.js";

// Re-exported so the proxy reads ONE looking seam (this file's own rule).
export { teachFromLook, recognizeImage, recognizeRegion, recognizeSeries, teachGrid, teachSeries, STORE_PATH as MNEMONIC_STORE_PATH } from "./mnemonic.js";

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
  // THE SAFETY GATE, ON THE VISION LANE TOO (falsification F1): a model call
  // is a model call — the prompt is scanned before the fetch, forceBlock
  // always (the vision path never honors ER7_ANTISTRAUSS=off), and the
  // returned text is reviewed before it can become a reading. A blocked
  // prompt throws; a blocked output is replaced with the refusal text.
  const gate = antistraussGate({ model, messages, route: "vision" }, { forceBlock: true });
  if (!gate.allow) {
    throw Object.assign(new Error(`ERR_ANTISTRAUSS_BLOCKED: ${gate.reason}`), { code: "ERR_ANTISTRAUSS_BLOCKED", antistrauss: gate.verdict });
  }
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
    const raw = (data?.message?.content ?? "").trim();
    const review = antistraussReviewBlock(raw, { model, route: "vision", forceBlock: true });
    if (review.replace) return { text: VISION_BLOCKED_TEXT, blocked: true };
    return { text: raw, blocked: false };
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
    const r = await completeVision([
      {
        role: "user",
        content: `A vision model said something shows: "${visionRead}"\n\nA mechanical detector separately found:\n${factLines.join("\n")}\n\nDoes the vision model's description plausibly agree with the mechanical findings, or does it contradict them? Reply with exactly one word first, AGREES or DISAGREES, then a colon and one short sentence naming the specific problem if it disagrees.`,
      },
    ], { model, maxTokens: 60 });
    // An output-review block must not masquerade as agreement (falsification
    // F1, round 3): the block is named and carried to the reading.
    if (r.blocked) {
      return { agrees: true, reason: "judge output withheld by the safety-and-ethics gate", blocked: VISION_BLOCKED_TEXT };
    }
    return { agrees: !/^DISAGREES/i.test(r.text), reason: r.text };
  } catch (err) {
    // A gate block must not masquerade as agreement: the block is named and
    // carried to the reading, not silently settled (falsification F2).
    if (err?.code === "ERR_ANTISTRAUSS_BLOCKED") {
      return { agrees: true, reason: "judge call failed, proceeding without escalation", blocked: err.message };
    }
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
    // A gate block on the escalation call must not destroy the whole read
    // (falsification F1): the escalation is a missing sense, disclosed — the
    // mechanical facts and the first vision read already stand on their own.
    let escalation = null;
    let escalationBlocked = null;
    let escalationFailed = null;
    try {
      const r = await completeVision([
        { role: "user", content: `Describe this plainly and factually: what does it show? A few sentences. A second look is being taken because: ${correction} Look again and correct that specifically if it's right.` },
      ], { model });
      // An output-review block carries its reason text, never a bare boolean
      // (falsification F2, round 3).
      if (r.blocked) { escalationBlocked = VISION_BLOCKED_TEXT; break; }
      escalation = r.text;
    } catch (err) {
      // Only a gate block is a gate event; any other failure is named as
      // itself, never misattributed to the gate (falsification F3, round 3).
      if (err?.code === "ERR_ANTISTRAUSS_BLOCKED") {
        escalationBlocked = err.message;
        break;
      }
      escalationFailed = `escalation call failed: ${err?.message ?? err}`;
      break;
    }
    current = escalation || current;
    turns += 1;
    judged = await judgeSenseAgreement(current, factLines, model);
  }
  return { visionRead: current, turns, settled: judged.agrees, unresolvedReason: judged.agrees ? null : judged.reason, judgeBlocked: judged.blocked ?? null, escalationBlocked, escalationFailed };
}

// ── lookAtImage: the full two-sense read of one image ──────────────────────
// THE CHILD FIRST: the mnemonic fast path (shadow/echo memory, no CV model)
// runs before anything else — a recognized thing answers from memory in
// milliseconds. Then, when the child has nothing, the CV parent: Mechanical
// (OpenCV boxes + per-region OCR) first, then a vision read of the whole,
// judged against the mechanical facts, escalated only on a real
// disagreement, fused into ONE plain description + the addressed facts.
// Returns null on a truly empty read (nothing mechanical, no vision answer)
// — a caller renders its own wording around that. The parent's read carries
// width/height — its spatial coordinates — so the child's lessons always
// know where in the real image the thing was.
const mnemonicEnabled = () => process.env.ER7_MNEMONIC !== "0";

function mnemonicLedgerLines(imagePath, fast) {
  const lines = [];
  for (const region of fast.regions ?? []) {
    for (const name of region.recognized ?? []) {
      lines.push({
        schema: "EOTObservation@1", role: "mnemonic-region",
        id: `mn${region.region.join("x")}-${name}`,
        at: { image: imagePath, region: region.pixelRegion ?? region.region },
        label: name,
        witnesses: ["mnemonic-shadow-echo(figure-ground proposal, quantized 144B descriptor, DMD framework)"],
        verify: "re-run the CV parent (OpenCV/OCR + vision) on this region and confirm the concept label",
      });
    }
  }
  return lines;
}

export async function lookAtImage(imagePath, { visionModel = VISION_LADDER[0].model, arrowColorBGR, name = path.basename(imagePath) } = {}) {
  // THE CHILD'S FAST PATH — memory before model. Nothing here uses OpenCV,
  // ollama, or a vision model; a match is a memory read, and it says so.
  let fast = null;
  let fastPathError = null;
  if (mnemonicEnabled()) {
    try {
      const store = _loadMnemonicStore();
      fast = await mnemonicLook(store, imagePath);
    } catch (err) {
      fastPathError = err.message;
    }
  }
  if (fast) {
    const ledgerLines = mnemonicLedgerLines(imagePath, fast);
    return {
      imagePath, name,
      text: fast.text,
      boxCount: 0, edgeCount: 0,
      boxes: [], connectors: [],
      width: null, height: null,
      visionRead: null, visionModelUsed: null, visionSettled: true,
      unresolvedReason: null, detectorError: null, visionError: null,
      standing: fast.standing,
      fastPath: { matched: true, concepts: fast.concepts, regions: fast.regions, wholeImage: fast.wholeImage },
      ledgerLines,
      fold: foldVisual(ledgerLines),
    };
  }

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
      const r = await completeVision([
        { role: "user", content: "Describe this image plainly and factually: what is it a picture of, what does it show. A few sentences.", images: [b64] },
      ], { model: rung.model });
      // A BLOCKED OUTPUT IS A MISSING SENSE, NOT AN ANSWER (falsification
      // F7): it must not stop the ladder — the block is disclosed into
      // visionError and the next rung runs, exactly like an empty read.
      if (r.blocked) {
        visionError = visionError ? `${visionError}; ${VISION_BLOCKED_TEXT}` : VISION_BLOCKED_TEXT;
        continue;
      }
      if (r.text) { visionRead = r.text; visionModelUsed = rung.model; break; }
    } catch (err) {
      visionError = visionError ? `${visionError}; ${err.message}` : err.message;
    }
  }

  const factLines = imageFactLines(boxes, connectors, width, height);
  const settled = await settleRead(visionRead, factLines, visionModelUsed);

  if (!boxes.length && !visionRead) {
    return { imagePath, name, text: "", boxCount: 0, edgeCount: 0, width, height, visionRead: null, visionModelUsed: null, visionSettled: true, unresolvedReason: null, detectorError, visionError, fastPath: { matched: false, error: fastPathError ?? null }, mechanicalStanding: null, visionStanding: null };
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
  if (settled.judgeBlocked) lines.push("", `(the agreement check was withheld by the safety-and-ethics gate: ${settled.judgeBlocked})`);
  if (settled.escalationBlocked) lines.push("", `(the escalation look was withheld by the safety-and-ethics gate: ${settled.escalationBlocked})`);
  if (settled.escalationFailed) lines.push("", `(${settled.escalationFailed})`);
  if (detectorError) lines.push("", `(the mechanical detector did not run: ${detectorError})`);
  if (visionError) lines.push("", `(no vision model answered: ${visionError})`);

  const standing = readable.length ? `${VISION_STANDING} A mechanical detector also ran: ${MECHANICAL_STANDING}` : VISION_STANDING;
  return {
    imagePath, name,
    text: lines.join("\n"),
    boxCount: boxes.length, edgeCount: connectors.length,
    boxes, connectors,
    width, height,
    visionRead: settled.visionRead,
    visionModelUsed,
    visionSettled: settled.settled,
    visionTurns: settled.turns,
    unresolvedReason: settled.unresolvedReason,
    detectorError, visionError,
    fastPath: { matched: false, error: fastPathError ?? null },
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

// ── shouldLookPage: the web organ's trigger — should a fetched PAGE be
//    LOOKED at, not just text-dumped? ───────────────────────────────────────
// A website is read as its extracted text face today (web.js::extractReadable
// — "a reader, not a browser": paragraph structure, nothing about layout). But
// some pages ARE their layout, and the flat dump is structurally blind to it.
// This names when the plain-text reading of a page is not the page. Pure,
// declared inputs, testable — no render, no model, no I/O.
//
// Two verdicts are kept apart on purpose (measured: conflating them is how a
// page with an ordinary infobox image would have auto-rendered on every
// fetch):
//   `signals` — the SURVEY: everything that could make a page worth looking
//       at, including pages whose text extracted fine (embedded tables,
//       images, SVG diagrams, iframes). Recorded on the history entry so /look
//       and a reader can see why a page might deserve a look. A signal here is
//       NOT a reason to auto-render.
//   `auto` — CLEAR EXTRACTION AMBIGUITY, and only that: the text dump found
//       nothing at all (a JS shell, an image-only page), or the extracted text
//       itself reads wrong under the same weirdFormattingScore discipline the
//       file reading already applies. Auto-look fires on THIS and nothing
//       else — a page whose prose extracted fine is read fine as text, however
//       many tables or images it carries.
// The third path is the USER ASKING about what is on a page — the /look door
// (always full) and the caller's own look-intent gate beside this trigger.
const VISUAL_TAG_RE = /<(table|img|svg|picture|canvas|figure)\b/i;
const EMBEDDED_MEDIA_RE = /<(iframe|object|embed)\b/i;

export function shouldLookPage({ url = "", title = "", text = "", html = "" } = {}) {
  const textStr = String(text ?? "");
  const htmlStr = String(html ?? "");
  const signals = [];
  let auto = false;

  if (!textStr.trim() && htmlStr.trim()) {
    // The text dump found nothing where there ARE bytes — a script shell, an
    // image-only page, a page whose content is rendered by JS the extractor
    // never ran. The one case where the flat face is empty by definition —
    // CLEAR extraction ambiguity, and the strongest auto signal there is.
    signals.push("empty_face");
    auto = true;
  } else if (textStr.trim()) {
    const scoreInfo = weirdFormattingScore(textStr);
    if (scoreInfo.score > 0) {
      // The extracted text itself reads wrong (table rows, box-drawing, a
      // column) — the plain-text reader is reading THIS text wrong, not
      // merely missing a nicer render of it. Clear extraction ambiguity.
      signals.push(`weird_formatting:${scoreInfo.signals.join(",")}`);
      auto = true;
    }
  }

  // Survey-only. A page whose prose extracted fine is read fine as text; the
  // presence of a table/image/iframe alone never auto-renders it.
  if (VISUAL_TAG_RE.test(htmlStr)) signals.push("embedded_visual");
  if (EMBEDDED_MEDIA_RE.test(htmlStr)) signals.push("embedded_media");

  if (!signals.length) return { look: false, auto: false, reason: null, signals };
  return { look: true, auto, reason: signals.join(","), signals };
}

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff", ".tif"]);
export function isImageFileName(fileName) {
  return IMAGE_EXT.has(path.extname(fileName ?? "").toLowerCase());
}