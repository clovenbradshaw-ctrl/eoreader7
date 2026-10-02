// adapters/image/screen-sidecar.js — what a screenshot read KEEPS.
//
// The read (screen-read.js) is the expensive step: decode, three OCR passes,
// pixel segmentation. If only the generated HTML survived it, everything the
// read measured would be thrown away with the pixels. The sidecar is the read
// as a record, keyed by the bytes it was made from:
//
//   model     the measured tree itself (boxes, text, image regions, rules), so the
//             page can be regenerated from the sidecar ALONE — htmlOf() — with the
//             image gone. Byte-identical to generating from the live model
//             (tested).
//   elements  the same tree as a flat list, each with a stable id and its region in
//             the ORIGINAL image's pixels — the address shape the ledger's
//             `visual-box` lines and mnemonic.js already use.
//   tokens    what the page is made of, measured: background, surfaces, ink, accent,
//             corner radii, type scale, spacing, borders. Every token carries how many
//             observations it rests on; a token with nothing behind it is null, never
//             a default.
//   gaps      what the read did NOT see, typed: OCR lines that never landed as text,
//             image regions whose content is unread (a colour, not a picture), OCR
//             passes the budget cut. A reader that cannot see a gap will not assert
//             past it.
//   standing  what kind of knowledge this is (a mechanical measurement at the prepared
//             resolution; no vision model; fonts not identified) and which hand-set
//             settings were in force (named with their givers in SCREEN_SETTINGS).
//
// A SIDECAR IS AN OBSERVATION, NOT A PRIOR. One screenshot measured once is one
// witness. Nothing here promotes a sidecar's tokens to a convention: organs/screen-style.js
// feeds them to reference-fit as one signed reference among others, where agreement
// across references is what earns a value and disagreement is reported as contested.
//
// PRIVACY: the sidecar carries the OCR text of the screenshot. It is stored under
// state/ (git-ignored), keyed by the image's sha256; nothing here sends it anywhere.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CV, SCREEN_SETTINGS } from "./screen-read.js";

export const SIDECAR_SCHEMA = "EOScreenLook@1";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORE_SHA = crypto.createHash("sha256").update(fs.readFileSync(path.join(HERE, "screen-core.cjs"))).digest("hex");
/** The measuring code's identity. A sidecar is valid only for the core that made it: change a threshold and
 *  every stored read is a read by a different instrument. */
export const CORE_ID = CORE_SHA.slice(0, 12);

/** A budget, not a finding: how many lines of structure the reading text lists before it says how many it left out. */
export const READING_LINE_BUDGET = { value: 120, giver: "set by hand 2026-09-30, not measured", basis: "the reading text joins a turn's context beside other sources; the rest of the structure stays in the sidecar, addressable by element id" };

// ── small pure helpers ───────────────────────────────────────────────────────
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const spread = (c) => Math.max(...c) - Math.min(...c);
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
const tally = (pairs) => { const m = new Map(); for (const [k, w] of pairs) m.set(k, (m.get(k) ?? 0) + w); return [...m.entries()].map(([k, w]) => ({ value: k, weight: w })).sort((a, b) => b.weight - a.weight); };
const PILL = 9999; // screen-core's own sentinel for a fully rounded corner

// ── the tree ─────────────────────────────────────────────────────────────────

/** A serialisable copy of the model's tree: plain data, every node carrying a stable id ("e0" is the page,
 *  then depth-first). `seg`/`flat` (pixel labels, a second index of the same nodes) are not kept. */
export function slimModel(model) {
  let n = 0;
  const copy = (node) => {
    const { children, ...own } = node;
    const out = { ...own, id: `e${n++}` };
    if (children) out.children = children.map(copy);
    return out;
  };
  return { width: model.width, height: model.height, unit: model.unit, stats: model.stats, root: copy(model.root) };
}

/** The generating shape back from a stored tree: `generate` reads only unit and root, so this is the same model. */
export const rehydrate = (stored) => ({ width: stored.width, height: stored.height, unit: stored.unit, stats: stored.stats, root: stored.root, flat: flatten(stored.root) });

function flatten(root) { const out = []; (function walk(n) { for (const c of n.children ?? []) { out.push(c); walk(c); } })(root); return out; }

const roleOf = (n) => n.type === "root" ? "page" : n.type === "box" ? (n.button ? "button" : n.tag ?? "box") : n.type === "text" ? n.tag ?? "p" : n.type;
const textOf = (n) => n.type === "text" ? n.lines.map((l) => l.text).join(" ") : n.type === "box" && n.button ? n.children[0].lines[0].text : null;

/** The flat, addressable list: id, parent, role, region in the ORIGINAL image's pixels, and what was measured. */
export function elementsOf(stored, ratio) {
  const out = [];
  const R = (v) => Math.round(v * ratio);
  (function walk(n, parent) {
    const el = { id: n.id, parent: parent?.id ?? null, type: n.type, role: roleOf(n), region: [R(n.x), R(n.y), R(n.w), R(n.h)] };
    const t = textOf(n);
    if (t != null) el.text = t;
    if (n.color) el.color = hex(n.color);
    if (n.type === "text") { el.em = r1(n.em * stored.unit); el.bold = !!n.bold; el.align = n.align; el.lines = n.lines.length; }
    if (n.type === "box") { if (n.radius) el.radius = n.radius >= PILL ? "pill" : r1(n.radius * stored.unit); if (n.border) el.border = { width: r1(n.border.w * stored.unit), color: hex(n.border.color) }; if (n.transparent) el.transparent = true; }
    out.push(el);
    for (const c of n.children ?? []) walk(c, n);
  })(stored.root, null);
  return out;
}

// ── tokens: what the page is made of, measured ───────────────────────────────

/** Measured design tokens. Lengths are CSS px (prepared px × unit, where unit = original/dpr per prepared px).
 *  Each carries `n`, the observations behind it; nothing observed is null. */
export function tokensOf(stored) {
  const u = stored.unit, root = stored.root, all = flatten(root);
  const boxes = all.filter((n) => n.type === "box"), texts = all.filter((n) => n.type === "text");
  const pageArea = stored.width * stored.height;
  const tokens = { viewport: { width: r1(stored.width * u), height: r1(stored.height * u) }, background: { hex: hex(root.color), basis: "the page's largest flat region" } };

  // surfaces: fills other than the background, by area
  const fills = tally(boxes.filter((b) => !b.transparent && hex(b.color) !== tokens.background.hex).map((b) => [hex(b.color), b.w * b.h]));
  tokens.surfaces = fills.slice(0, 4).map((f) => ({ hex: f.value, share: Math.round((f.weight / pageArea) * 1000) / 1000, n: boxes.filter((b) => !b.transparent && hex(b.color) === f.value).length }));

  // card surface: the fill of panels that hold text and are not full-width bands (what a card sits on), apart from bands like the header
  const cards = boxes.filter((b) => !b.button && !b.transparent && !b.tag && b.children.some((c) => c.type === "text") && hex(b.color) !== tokens.background.hex);
  const cardFill = tally(cards.map((b) => [hex(b.color), 1]));
  tokens.surface = cardFill.length ? { hex: cardFill[0].value, n: cardFill[0].weight, basis: "the fill most text-holding panels share" } : null;

  // accent: what buttons are filled with; with no button, the most saturated fill (and how saturated it is, so a consumer can judge)
  const buttons = boxes.filter((b) => b.button);
  if (buttons.length) {
    const top = tally(buttons.map((b) => [hex(b.color), 1]))[0];
    const one = buttons.find((b) => hex(b.color) === top.value);
    tokens.accent = { hex: top.value, spread: spread(one.color), n: top.weight, basis: "the fill most buttons share", ink: hex(one.children[0].color) };
  } else if (fills.length) {
    const top = [...fills].sort((a, b) => spread(rgbOf(b.value)) - spread(rgbOf(a.value)))[0];
    tokens.accent = { hex: top.value, spread: spread(rgbOf(top.value)), n: 1, basis: "no button on the page: its most saturated fill" };
  } else tokens.accent = null;

  // ink: text colours by how much text they set, on the page (not inside a filled box)
  const onPage = texts.filter((t) => t.lines.length && t.lines[0].bg && dist(t.lines[0].bg, root.color) < 60);
  const ink = tally((onPage.length ? onPage : texts).map((t) => [hex(t.color), t.lines.reduce((s, l) => s + l.text.length, 0)]));
  tokens.ink = ink.length ? { hex: ink[0].value, n: (onPage.length ? onPage : texts).filter((t) => hex(t.color) === ink[0].value).length, basis: "the colour that sets the most text on the page background" } : null;

  // corner radii
  const rad = (list) => { const v = list.map((b) => b.radius).filter((r) => r > 0 && r < PILL).map((r) => r * u); return v.length ? { px: r1(median(v)), n: v.length, pills: list.filter((b) => b.radius >= PILL).length } : (list.some((b) => b.radius >= PILL) ? { px: null, n: 0, pills: list.filter((b) => b.radius >= PILL).length } : null); };
  tokens.radius = { box: rad(boxes.filter((b) => !b.button)), button: rad(buttons) };

  // type
  if (texts.length) {
    const em = (list) => list.length ? r1(median(list.map((t) => t.em * u))) : null;
    const byTag = (tag) => texts.filter((t) => t.tag === tag);
    const body = texts.filter((t) => t.tag === "p");
    const multi = texts.filter((t) => t.lines.length > 1 && t.lineH && t.em);
    tokens.type = {
      body: body.length ? { px: em(body), n: body.length } : null,
      h1: byTag("h1").length ? { px: em(byTag("h1")), n: byTag("h1").length } : null,
      h2: byTag("h2").length ? { px: em(byTag("h2")), n: byTag("h2").length } : null,
      h3: byTag("h3").length ? { px: em(byTag("h3")), n: byTag("h3").length } : null,
      boldShare: Math.round((texts.filter((t) => t.bold).length / texts.length) * 100) / 100,
      lineHeight: multi.length ? { ratio: Math.round(median(multi.map((t) => t.lineH / t.em)) * 100) / 100, n: multi.length } : null,
      scale: tally(texts.map((t) => [String(Math.round(t.em * u)), 1])).map((s) => ({ px: Number(s.value), n: s.weight })).sort((a, b) => a.px - b.px),
      basis: "text height over the ascender/descender extent of its glyphs; fonts are not identified",
    };
  } else tokens.type = null;

  // spacing: the gaps between consecutive siblings, and what a box pads its text by
  const vgaps = [], hgaps = [], padX = [], padY = [];
  (function walk(n) {
    const kids = (n.children ?? []).filter((c) => c.type !== "rule").sort((a, b) => a.y - b.y || a.x - b.x);
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1], b = kids[i];
      const vg = b.y - (a.y + a.h), hg = b.x - (a.x + a.w);
      const sameRow = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5 * Math.min(a.h, b.h);
      if (sameRow) { if (hg > 0) hgaps.push(hg * u); } else if (vg > 0) vgaps.push(vg * u);
    }
    if (n.type === "box" && !n.button) { const t = (n.children ?? []).filter((c) => c.type !== "rule"); if (t.length && t.some((c) => c.type === "text" || c.type === "box")) { padX.push((Math.min(...t.map((c) => c.x)) - n.x) * u); padY.push((Math.min(...t.map((c) => c.y)) - n.y) * u); } }
    for (const c of n.children ?? []) walk(c);
  })(root);
  const med = (xs) => (xs.length ? { px: r1(median(xs)), n: xs.length } : null);
  tokens.spacing = { vertical: med(vgaps), horizontal: med(hgaps), padX: med(padX), padY: med(padY), basis: "gaps between consecutive siblings in the measured tree; padding is the nearest child's offset inside its box" };
  const btnPad = buttons.length ? buttons.map((b) => ({ x: (b.children[0].x - b.x) * u, y: (b.children[0].y - b.y) * u })) : [];
  tokens.buttonPadding = btnPad.length ? { x: r1(median(btnPad.map((p) => p.x))), y: r1(median(btnPad.map((p) => p.y))), n: btnPad.length } : null;

  // borders
  const bordered = boxes.filter((b) => b.border);
  tokens.border = bordered.length ? { px: r1(median(bordered.map((b) => b.border.w * u))), hex: tally(bordered.map((b) => [hex(b.border.color), 1]))[0].value, n: bordered.length } : null;
  return tokens;
}
const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

// ── gaps: what the read did not see ──────────────────────────────────────────

/** Typed gaps. Each names what is missing and why, at a region when it has one. */
export function gapsOf(read, stored, ratio) {
  const gaps = [];
  const R = (v) => Math.round(v * ratio);
  const landed = flatten(stored.root).filter((n) => n.type === "text").flatMap((n) => n.lines);
  const overlap = (a, b) => { const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)), iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)); return (ix * iy) / Math.max(1, (a.x1 - a.x0) * (a.y1 - a.y0)); };
  const floor = read.settings.minConf;
  for (const l of read.lines ?? []) {
    if (!/[A-Za-z0-9À-￿]/.test(l.text)) continue;
    if (landed.some((s) => overlap({ x0: l.bbox.x0, y0: l.bbox.y0, x1: l.bbox.x1, y1: l.bbox.y1 }, s) > 0.3)) continue;
    gaps.push({ kind: "ocr_line_not_landed", text: l.text, conf: Math.round(l.conf), region: [R(l.bbox.x0), R(l.bbox.y0), R(l.bbox.x1 - l.bbox.x0), R(l.bbox.y1 - l.bbox.y0)], because: l.conf < floor ? `mean word confidence ${Math.round(l.conf)} is under the ${floor} floor` : "its ink did not contrast enough with its background, or it was too small, to land as text" });
  }
  const images = flatten(stored.root).filter((n) => n.type === "image");
  if (images.length) gaps.push({ kind: "image_regions_unread", n: images.length, regions: images.map((n) => [R(n.x), R(n.y), R(n.w), R(n.h)]), because: "a region the boxes and text do not explain: only its mean colour was measured; what it depicts was not read (no vision model ran)" });
  if (read.ocr?.regionsSkipped?.length) gaps.push({ kind: "ocr_regions_skipped", regions: read.ocr.regionsSkipped.map(([x, y, w, h]) => [R(x), R(y), R(w), R(h)]), because: "the dark-region re-read ran out of its time budget; these regions hold text the page-level passes may have missed" });
  if (!read.ocr?.ran) gaps.push({ kind: "ocr_absent", because: read.ocr?.reason ?? "OCR did not run: this sidecar has structure and colour but no text" });
  return gaps;
}

// ── the sidecar ──────────────────────────────────────────────────────────────

/** sidecarOf(read, { name }) -> EOScreenLook@1. `read` is readScreen's result. */
export function sidecarOf(read, { name = path.basename(read.source.path) } = {}) {
  const stored = slimModel(read.model);
  const ratio = read.ratio;
  return {
    schema: SIDECAR_SCHEMA,
    source: { name, sha256: read.source.sha256, bytes: read.source.bytes, width: read.source.width, height: read.source.height },
    core: CORE_ID,
    dpr: read.dpr, ratio, prepared: read.prepared,
    settings: { inForce: read.settings, givers: "adapters/image/screen-read.js SCREEN_SETTINGS — every one set by hand in PR #144's tool, none measured" },
    ocr: read.ocr,
    model: stored,
    elements: elementsOf(stored, ratio),
    tokens: tokensOf(stored),
    gaps: gapsOf(read, stored, ratio),
    standing: "A mechanical measurement: flat-region segmentation of the pixels (at the prepared resolution) and Tesseract's read of the text. No vision model ran; what an image region depicts, and which typeface set the text, were not read. The settings in force were set by hand and are named in SCREEN_SETTINGS — a measurement under those settings, not a finding about the page.",
    at: new Date().toISOString(),
  };
}

/** The page, regenerated from the sidecar alone — the image is not needed. `measure` is an optional text-width
 *  function (a browser has one; node does not, so text widths are fitted only when the caller supplies it). */
export function htmlOf(sidecar, { mode = "flex", title, measure = null } = {}) {
  return CV.generate(rehydrate(sidecar.model), { mode, title: title ?? sidecar.source.name, ...(measure ? { measure } : {}) });
}

// ── what the sidecar says, to a reader ───────────────────────────────────────

/** Reading order: top to bottom, then left to right. */
const reading = (kids) => [...kids].filter((c) => c.type !== "rule").sort((a, b) => a.y - b.y || a.x - b.x);

/** Plain text for a reader: the structure, top to bottom, every line with its pixel region in the original image,
 *  the measured tokens, and the gaps. Everything in it was measured; nothing is described that was not. */
export function readingTextOf(sidecar, { budget = READING_LINE_BUDGET.value } = {}) {
  const { name, width, height } = sidecar.source, t = sidecar.tokens, ratio = sidecar.ratio;
  const R = (v) => Math.round(v * ratio);
  const reg = (n) => `[${R(n.x)},${R(n.y)},${R(n.w)},${R(n.h)}]`;
  const out = [`Looking at "${name}" (${width}x${height}px${sidecar.dpr > 1 ? `, read as a ${sidecar.dpr}x screenshot` : ""}): a screenshot, read mechanically from its pixels and the text Tesseract found — no vision model. Regions are pixel rectangles [x,y,w,h] in the original image.`];
  const pal = [`background ${t.background.hex}`];
  if (t.surfaces[0]) pal.push(`surfaces ${t.surfaces.map((s) => s.hex).join(", ")}`);
  if (t.ink) pal.push(`text ${t.ink.hex}`);
  if (t.accent) pal.push(`accent ${t.accent.hex} (${t.accent.basis}${t.accent.n > 1 ? `, ${t.accent.n} of them` : ""})`);
  out.push(`Colours: ${pal.join("; ")}.`);
  if (t.type?.body) out.push(`Type: body about ${t.type.body.px}px${t.type.h1 ? `, h1 ${t.type.h1.px}px` : ""}${t.type.h2 ? `, h2 ${t.type.h2.px}px` : ""}; sizes seen: ${t.type.scale.map((s) => s.px).join(", ")}px.`);
  out.push("Structure, top to bottom:");
  const lines = [];
  (function walk(n, depth) {
    for (const c of reading(n.children ?? [])) {
      const pad = "  ".repeat(Math.min(depth, 6));
      if (c.type === "text") lines.push(`${pad}- ${c.tag ?? "p"} "${c.lines.map((l) => l.text).join(" ")}" ${reg(c)}`);
      else if (c.type === "image") lines.push(`${pad}- image region ${reg(c)}, mean colour ${hex(c.color)} (content not read)`);
      else if (c.type === "box") {
        if (c.button) { lines.push(`${pad}- button "${c.children[0].lines[0].text}" ${reg(c)}, fill ${hex(c.color)}`); continue; }
        const label = c.tag === "header" ? "header" : c.tag === "section" ? "section" : "panel";
        lines.push(`${pad}- ${label} ${reg(c)}${c.transparent ? ", outlined" : `, fill ${hex(c.color)}`}`);
        walk(c, depth + 1);
      }
    }
  })(sidecar.model.root, 0);
  out.push(...lines.slice(0, budget));
  if (lines.length > budget) out.push(`(${lines.length - budget} more elements not listed; they are in the sidecar, by element id)`);
  const rules = flatten(sidecar.model.root).filter((n) => n.type === "rule").length;
  if (rules) out.push(`${rules} thin rules or dividers are not listed.`);
  for (const g of sidecar.gaps) {
    if (g.kind === "ocr_line_not_landed") out.push(`(text not landed: "${g.text}" at [${g.region}] — ${g.because})`);
    else if (g.kind === "image_regions_unread") out.push(`(${g.n} image region(s) were not read: ${g.because})`);
    else out.push(`(${g.kind}: ${g.because})`);
  }
  return out.join("\n");
}

/** The ledger's `visual-box` lines (EOTObservation@1, look.js's shape), one per box and text block, at real-pixel
 *  regions. Image regions are `visual-region`: addressed, unlabelled — a place where something is, not a claim about what. */
export function ledgerLinesOf(sidecar, { image = sidecar.source.name } = {}) {
  const lines = [];
  for (const el of sidecar.elements) {
    if (el.type === "rule" || el.type === "root") continue;
    const box = el.type === "box", text = el.type === "text", img = el.type === "image";
    if (!(box || text || img)) continue;
    const label = el.text ?? (box ? sidecar.elements.filter((e) => e.parent === el.id && e.text).map((e) => e.text).join(" ") : "");
    lines.push({
      schema: "EOTObservation@1", role: img ? "visual-region" : "visual-box", id: `sc${sidecar.source.sha256.slice(0, 8)}:${el.id}`,
      at: { image, region: el.region },
      label: label ?? "",
      kind: el.role,
      witnesses: ["screen-read(flat-region segmentation of the pixels + tesseract)"],
      verify: img ? "crop `region` from `image` and look: only its mean colour was measured" : "crop `region` from `image`, re-run tesseract, confirm the text; re-measure the fill",
    });
  }
  return lines;
}

// ── the store: one sidecar per (bytes, instrument) ───────────────────────────

/** Where sidecars live. state/ is git-ignored; ER7_SCREEN_DIR moves it. */
export const screenDir = () => process.env.ER7_SCREEN_DIR || path.resolve(HERE, "../../../state/screen-looks");
const fileFor = (dir, sha256, settings) => path.join(dir, `${sha256.slice(0, 16)}.${CORE_ID}.${crypto.createHash("sha256").update(JSON.stringify(settings)).digest("hex").slice(0, 6)}.json`);

/** The stored sidecar for these bytes under this instrument and these settings, or null. */
export function loadSidecar(sha256, { dir = screenDir(), settings = { tol: SCREEN_SETTINGS.tolerance.value, minArea: SCREEN_SETTINGS.minBoxArea.value, minConf: SCREEN_SETTINGS.minConfidence.value } } = {}) {
  try {
    const f = fileFor(dir, sha256, settings);
    if (!fs.existsSync(f)) return null;
    const sc = JSON.parse(fs.readFileSync(f, "utf8"));
    return sc.schema === SIDECAR_SCHEMA && sc.source?.sha256 === sha256 && sc.core === CORE_ID ? sc : null;
  } catch { return null; }
}

/** Write atomically (a torn write must never be read back as a sidecar). Returns the path. */
export function saveSidecar(sidecar, { dir = screenDir() } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const f = fileFor(dir, sidecar.source.sha256, sidecar.settings.inForce);
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(sidecar));
  fs.renameSync(tmp, f);
  return f;
}
