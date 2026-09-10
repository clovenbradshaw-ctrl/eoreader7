// visual-rec.mjs — the image-side sibling of structure-rec.mjs and
// table-rec.mjs: mechanical "where is it, what does it say" detection for
// a raster image (a diagram, a flowchart, a photographed page), landed on
// the SAME EOT ledger those two already write to, via a SECOND address
// shape — `{ image, region:[x,y,w,h] }` — sitting beside the existing
// byte-offset `[start,end]` text address. Nothing about eot-jsonl.mjs's
// own "nest by address, not by order" discipline changes: a region is
// just a different coordinate system to nest inside, and the same P5.2
// verification discipline applies, just restated for pixels — "does
// re-cropping this exact region from the source image and re-running OCR
// reproduce the same text" is this file's own slice-back check.
//
// User direction, verbatim, across the session that built this: "we need
// to use / integrate with the type of models that tell you where things
// are" (after Tesseract's OWN plain-text output was shown flattening a
// flowchart into unreadable linear junk) — "try models that can do this"
// — "prove it" — "what about colors?" — "y[es], and test it e2e chatting
// with a complicated image like that." Two real things were tried before
// this file existed: asking moondream (this project's local vision model,
// already used and already measured to hallucinate in S109) directly for
// bounding-box coordinates, which it cannot produce at all (Ollama's
// build only exposes `['completion','vision']`, no detect/point); and
// classical OpenCV contour/color detection, which — measured directly,
// not assumed — works well on a clean, high-contrast diagram (7/8 real
// boxes, each one's cropped OCR coming back perfectly clean) and, in its
// first pass, badly on a busy colored one (edge-only detection missed
// every filled box entirely; a first color-based pass fixed most of that
// but over-merged adjacent same-colored panels into one giant box). Both
// failure modes, and their fixes, are documented in visual-detect.py's
// own header — this file does not re-derive them, it calls the fixed
// version and writes what comes back onto the ledger.
//
// WHY PYTHON, NOT A REWRITE IN JS: the very first image tested against
// this whole project (an OCR pipeline diagram) labels its own layout step
// "Open CV" — that IS the tool this file reaches for, not a JS
// reimplementation of contour detection. `tier3` in structure-rec.mjs
// already shells out to an external process (Ollama, over HTTP) for a
// capability this codebase does not reimplement itself; this file does
// the same thing over a child process instead of HTTP, same discipline.
//
// REQUIRES: opencv-python-headless + numpy, real dependencies this
// codebase does not otherwise carry — installed in an isolated venv
// (never system/global Python — see PEP 668), whose interpreter path is
// read from VISUAL_DETECT_PYTHON. If that's unset, this refuses rather
// than silently falling back to a system Python that likely lacks
// OpenCV — a missing dependency should fail loudly, not produce an
// empty, misleadingly-clean ledger.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = process.env.VISUAL_DETECT_PYTHON;

// TIER 1 (the only tier so far — there is no REC-escalation ladder here
// yet the way structure-rec.mjs has one for text conventions, because
// this file has only ever been run against a handful of real images, not
// enough to know what a genuine "known image-layout convention" would
// even look like; that is honestly a gap, not a design decision).
export function detectVisualStructure(imagePath, { arrowColorBGR } = {}) {
  if (!PYTHON) {
    throw new Error(
      "VISUAL_DETECT_PYTHON is not set — visual-detect.py needs opencv-python-headless " +
      "in an isolated venv (system Python does not have it, and should not: PEP 668). " +
      "Refusing rather than silently returning an empty, falsely-clean ledger."
    );
  }
  const args = [path.join(HERE, "visual-detect.py"), imagePath];
  if (arrowColorBGR) args.push("--arrow-color", arrowColorBGR.join(","));
  const out = execFileSync(PYTHON, args, { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
  return JSON.parse(out);
}

// Convert visual-detect.py's raw {boxes, connectors} into real
// EOTObservation@1 lines — the same schema eot-jsonl.mjs's text
// observations use, just carrying the image-region address shape instead
// of a byte-offset one. Every line names its own witness mechanism,
// exactly the disclosure discipline table-shape-witnesses.mjs already
// established for competing witnesses on the SAME question.
export function toLedgerLines(detected) {
  const lines = [];
  for (const b of detected.boxes) {
    lines.push({
      schema: "EOTObservation@1", role: "visual-box", id: b.id,
      at: { image: detected.image, region: b.region },
      label: b.text,
      witnesses: ["opencv(color-or-edge contour)+tesseract"],
      verify: "crop `region` from `image`, re-run tesseract, confirm identical text",
    });
  }
  for (const [i, c] of detected.connectors.entries()) {
    lines.push({
      schema: "EOTObservation@1", role: "visual-connector", id: `c${i}`,
      at: { image: detected.image, region: c.region },
      connects: c.connects, direction: c.direction,
      witnesses: ["opencv(known-color connected-component, nearest-two-boxes-to-centroid)"],
      note: c.direction === "undetermined"
        ? "adjacency only — arrowhead apex/base shape analysis not built, so flow direction is disclosed as unknown rather than guessed"
        : undefined,
    });
  }
  return lines;
}

// ── THE FOLD — a transient projection of the ledger's own lines into one
// queryable graph, same standing rule kernel/fold.js already carries
// (S78): the fold is an accessor over the log, never itself the record.
// Two (or more) `visual-connector` lines naming the SAME unordered box
// pair are treated as CORROBORATING WITNESSES of one real connector
// (line-detection noise splitting one line into two components), not two
// different connectors — `witnessCount` discloses how many raw lines
// agreed, so this is a merge with its own provenance kept, not a silent
// dedup.
export function foldVisual(ledgerLines) {
  const boxes = new Map(ledgerLines.filter((l) => l.role === "visual-box").map((l) => [l.id, l]));
  const edgeMap = new Map();
  for (const c of ledgerLines.filter((l) => l.role === "visual-connector")) {
    const key = [...c.connects].sort().join("|");
    if (!edgeMap.has(key)) edgeMap.set(key, { connects: c.connects, direction: c.direction, witnessCount: 0, sourceIds: [] });
    const e = edgeMap.get(key);
    e.witnessCount += 1;
    e.sourceIds.push(c.id);
  }
  const edges = [...edgeMap.values()];
  const adjacency = new Map();
  for (const id of boxes.keys()) adjacency.set(id, []);
  for (const e of edges) {
    const [a, b] = e.connects;
    adjacency.get(a)?.push({ to: b, edge: e });
    adjacency.get(b)?.push({ to: a, edge: e });
  }
  return { boxes, edges, adjacency };
}

// ── "chat with it" — every answer is a lookup against the fold, grounded
// back to a real ledger line and a real pixel region. This is what keeps
// it structurally incapable of the moondream failure mode (S109: fluent,
// confident, wrong) — it can only assert what a witness actually placed
// on the ledger at a real address; a question about something never
// observed gets an honest "not found," never a guess.
export function askVisual(fold, question) {
  const { boxes, adjacency } = fold;
  const q = question.toLowerCase();
  const label = (id) => boxes.get(id)?.label.replace(/\n/g, " ") ?? id;
  const mentioned = [...boxes.values()].find((b) => b.label && q.includes(b.label.toLowerCase().replace(/\n/g, " ").split(" ")[0]) && b.label.split("\n").some((w) => q.includes(w.toLowerCase())));
  if (!mentioned) return { answer: "no box in this diagram matches that name", grounded: [] };

  if (q.includes("connect") || q.includes("feed") || q.includes("link")) {
    const neighbors = adjacency.get(mentioned.id) ?? [];
    if (!neighbors.length) return { answer: `"${label(mentioned.id)}" has no detected connector on the ledger`, grounded: [{ claim: label(mentioned.id), at: mentioned.at }] };
    return {
      answer: `"${label(mentioned.id)}" is connected to: ${neighbors.map((n) => label(n.to)).join(", ")}`,
      disclosure: "direction not determined mechanically — adjacency only",
      grounded: [{ claim: label(mentioned.id), at: mentioned.at }, ...neighbors.map((n) => ({ claim: `connector to "${label(n.to)}"`, sourceIds: n.edge.sourceIds }))],
    };
  }
  if (q.includes("where") || q.includes("region") || q.includes("pixel")) {
    return { answer: `"${label(mentioned.id)}" is at pixel region ${JSON.stringify(mentioned.at.region)} in ${mentioned.at.image}`, grounded: [{ claim: label(mentioned.id), at: mentioned.at }] };
  }
  return { answer: `found "${label(mentioned.id)}" but this reads no other question shape yet`, grounded: [{ claim: label(mentioned.id), at: mentioned.at }] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const imagePath = process.argv[2];
  if (!imagePath) { console.error("usage: VISUAL_DETECT_PYTHON=<python with opencv> node visual-rec.mjs <image> [arrowColorB,G,R]"); process.exit(1); }
  const arrowColorBGR = process.argv[3] ? process.argv[3].split(",").map(Number) : undefined;
  const detected = detectVisualStructure(imagePath, { arrowColorBGR });
  const lines = toLedgerLines(detected);
  for (const l of lines) console.log(JSON.stringify(l));
  console.error(`\n${lines.filter((l) => l.role === "visual-box").length} boxes, ${lines.filter((l) => l.role === "visual-connector").length} raw connector proposals`);
}
