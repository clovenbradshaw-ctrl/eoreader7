// native/organs/mnemonic.js — the child: a memory of what things look like,
// kept as the SHADOW and ECHO of the raw bytes, never the bytes themselves.
//
// THE PARENT TEACHES, THE CHILD REMEMBERS. The CV parent (organs/look.js —
// OpenCV boxes + OCR + a vision model) reads an image and names what it saw,
// WITH SPATIAL COORDINATES: every box is an address, `region:[x,y,w,h]` in
// the real image's pixels. Every name is a lesson: this region, at these
// pixels, is a dog. The child keeps only that region address and the
// byte-derived shadow/echo descriptor (kernel/shadow-echo.js) — 144 bytes,
// quantized, tied to a specific part of the image.
//
// THE MEMORY IS LOSSLESSLY LINKED TO ITS SOURCE. The child never stores the
// bytes — but every item carries its back-pointer: the source path, the
// source's sha256 (so the child can tell when the source has changed under
// the memory), the source's byte size, and the taught region's pixel
// address. The stored shadow/echo is a lossy compression WITH a de-lossy
// handle: when a match lands at the edge of the child's own resolution
// (margin smaller than one quantized byte), the child says so and hands the
// caller the exact source + pixel region to re-read — the CV parent can
// de-lossy the memory by looking again at the real thing.
//
// THE SIZE RULE. A memory larger than its source is not a memory, it is a
// duplicate: the descriptor is 144 bytes, always, and a lesson whose
// declared source is smaller than that refuses loudly.
//
// NEXT TIME, NO CV MODEL. When a new image arrives, the child proposes
// candidate regions itself — figure/ground by deviation from the grid's own
// mean, connected components (kernel figureRegions), the SAME [x,y,w,h]
// address shape the parent certifies — and matches each region's shadow/echo
// against each concept's DMD framework. A photograph with a dog AND a cat is
// two regions, each named where it is; nothing assumes a photograph is one
// thing. The fast path is a MEMORY READ, and says so in its standing.
//
// OMNIMODAL. The store is one memory across every sense: the same
// kernel/shadow-echo.js framework acts on image grids, on audio sample
// series (RMS-envelope shadow + spectral echo), on video frame-material
// series, and on text motif windows. `teach` and `recognize` differ only in
// which descriptor builder the bytes go through.
//
// THE STORE is a learned, earned artifact (native/memory/mnemonic-store.json)
// — not a prior: priors are received, this is grown, and the file carries a
// schema + per-concept revision so a framework cache can key off it.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  descriptorOf,
  descriptorFromSeries,
  recognizeDescriptor,
  figureRegions,
  figureSegments,
  quantizeDescriptor,
  dequantizeDescriptor,
  encodeDescriptor,
  decodeDescriptor,
  resample,
  cropGrid,
  DESCRIPTOR_BYTES,
  DESCRIPTOR_LEN,
  COLORED_LEN,
  SERIES_LEN,
} from "../kernel/shadow-echo.js";
import { load, loadColor } from "../adapters/image/material.js";
import { contextualModes } from "../adapters/text/contextual-dmd.js";
import { referentForm, referentIdentity } from "../adapters/text/surfaces.js";
import { colorNameOf, loadColorNamePrior } from "../kernel/color-name-space.js";
import {
  occurrenceKey,
  signProvisionalKind,
  corroboration,
  confirmKind,
  falsifyOccurrence,
  splitProposals,
  supersedeLesson,
  universeSnapshot,
  provisionalKindName,
  CANONICALIZATION_FLOOR,
} from "../kernel/kind-universe.js";

export { falsifyOccurrence, splitProposals, supersedeLesson, universeSnapshot, confirmKind, corroboration, CANONICALIZATION_FLOOR } from "../kernel/kind-universe.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const STORE_PATH = path.join(HERE, "..", "memory", "mnemonic-store.json");
export const GRID = 96; // decode grid for region-tied teaching — coarse by design, the shadow is a footprint, not a photograph

export const MNEMONIC_STANDING =
  "recognized from the child's shadow/echo memory (a fast-path memory read, not a CV model at this moment) — the descriptor it matched and the taught example's region and source are disclosed; the memory carries its source's sha256 and pixel address, so the CV parent can de-lossy it and re-verify any time";

// the child's own resolution: one quantized byte. A margin smaller than this
// is not a decision the child can make from memory alone.
export const QUANT_STEP = 1 / 255;

export function emptyStore() {
  return { schema: "MnemonicStore@1", concepts: {} };
}

export function loadStore(storePath = STORE_PATH) {
  try {
    const raw = JSON.parse(fs.readFileSync(storePath, "utf8"));
    if (raw?.schema !== "MnemonicStore@1") throw new Error(`unexpected schema ${raw?.schema}`);
    return raw;
  } catch (err) {
    throw new Error(`mnemonic store unreadable at ${storePath}: ${err.message} — refusing to guess at a memory`);
  }
}

export function saveStore(store, storePath = STORE_PATH) {
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

const bump = (store, concept) => {
  const entry = store.concepts[concept] ?? {
    revision: 0,
    modality: null,
    status: "provisional",
    signedAt: Date.now(),
    occurrences: [],
    items: [],
  };
  entry.revision += 1;
  store.concepts[concept] = entry;
  return entry;
};

// ── the kind IS a referent: one being, named in every language ────────────
// The store's concepts are the fold's referents at the child's grain: a
// being with occurrences (what it was seen as, where) and now a NAME-SET
// across languages. The identity is the house's own bytes-identity
// (adapters/text/surfaces.js: referentIdentity) — the first name the parent
// gives the kind is its identity's seed, and every later name folds through
// the same omnilingual normalization (NFKC + diacritic folding: Greek
// polytonic, Hebrew niqqud, Latin macrons all land on one form), so "dog",
// "κύων", "犬", "كلب", "kutya" are surfaces of ONE referent, and any of
// them binds the reader to the SAME mnemonic kind. Names are addressing,
// not geometry — they never touch the recognition framework.
export function nameKind(store, concept, lang, forms, { giver = null } = {}) {
  const entry = store.concepts?.[concept];
  if (!entry) throw new TypeError(`nameKind: concept "${concept}" is unknown — a referent without a being cannot be named`);
  if (!entry.identity) entry.identity = referentIdentity(String(forms?.[0] ?? concept));
  if (!entry.names) entry.names = [];
  if (!Array.isArray(forms)) forms = [forms];
  const added = [];
  for (const form of forms) {
    const canon = referentForm(form);
    if (!canon) continue;
    if (entry.names.some((n) => n.form === canon && n.lang === lang)) continue;
    entry.names.push({ lang, form: canon, script: /[\u0370-\u03FF\u1F00-\u1FFF]/.test(canon) ? "greek" : /[\u3040-\u30FF\u4E00-\u9FFF]/.test(canon) ? "cjk" : /[\u0590-\u05FF]/.test(canon) ? "hebrew" : /[\u0600-\u06FF]/.test(canon) ? "arabic" : "latin", giver: giver ?? null, at: Date.now() });
    added.push(canon);
  }
  return { concept, identity: entry.identity, added };
}

// kindByName: resolve ANY surface (any language, any diacritic load) to the
// kinds it names — the reader's binding seam between prose and memory.
export function kindByName(store, surface) {
  const canon = referentForm(surface);
  if (!canon) return [];
  const out = [];
  for (const [name, entry] of Object.entries(store.concepts ?? {})) {
    const hit = (entry.names ?? []).find((n) => n.form === canon);
    if (hit) out.push({ concept: name, identity: entry.identity ?? null, lang: hit.lang, form: canon, script: hit.script ?? null });
  }
  // a concept whose own label IS the surface (a parent-named kind never
  // formally named) still binds — the label is its first name
  for (const [name, entry] of Object.entries(store.concepts ?? {})) {
    if (out.some((o) => o.concept === name)) continue;
    if (referentForm(name) === canon) out.push({ concept: name, identity: entry.identity ?? null, lang: null, form: canon, script: null });
  }
  return out;
}

// every lesson is also an OCCURRENCE (a referent seen at an address) — the
// universe's raw material. The kind corroborates across DISTINCT sources.
const recordOccurrence = (entry, { concept, source, region, label = null }) => {
  const id = occurrenceKey(concept, source, region);
  if (!entry.occurrences.some((o) => o.id === id)) {
    entry.occurrences.push({
      id,
      source: source ?? null,
      region: region ?? null,
      label: label ?? null,
      at: Date.now(),
      falsified: false,
      basis: "lesson",
    });
  }
};

// the child's numeric world: every query is quantized and de-quantized
// through the same one-byte-per-bin lattice the taught memories live in, so
// residuals, bounds, and margins are all computed at the child's own
// resolution — never a mix of precisions.
export const childSpace = (d) => dequantizeDescriptor(quantizeDescriptor(d));

// raw-bytes provenance: node:crypto over the file's actual bytes, short
// digest (the project's 32-char convention). NOT sha256hex.js — that one is
// deliberately text-only (TextEncoder) and would mangle binary.
export function sourceDigest(filePath) {
  const buf = fs.readFileSync(filePath);
  return { hash: crypto.createHash("sha256").update(buf).digest("hex").slice(0, 32), bytes: buf.length };
}

// ── teaching ───────────────────────────────────────────────────────────────
// teachGrid: the child learns "this grid's region is a <concept>". `region`
// is in GRID coordinates [x,y,w,h] (or null — then the child proposes the
// figure region from the bytes themselves, the SAME proposal recognition
// uses, so a lesson and a query live in the same world). `source` names
// where the lesson came from, `label` is what the parent's OCR/vision read
// there. The SIZE RULE refuses a lesson whose declared source is smaller
// than the memory of it — a memory larger than its source is not a memory.
export function teachGrid(store, concept, { grid, w, h, region = null, source = null, label = null, modality = "image", sourceBytes = 0, sourceHash = null, colorGrid = null } = {}) {
  if (!grid?.length) throw new TypeError("teachGrid: a grid is required — a lesson with no bytes to shadow");
  if (sourceBytes > 0 && sourceBytes < DESCRIPTOR_BYTES)
    throw new TypeError(`teachGrid: refusing — the memory (${DESCRIPTOR_BYTES} bytes) is larger than its source (${sourceBytes} bytes); a memory larger than its source is not a memory`);
  const entry = bump(store, concept);
  if (entry.modality && entry.modality !== modality)
    throw new TypeError(`teachGrid: concept "${concept}" was already taught in modality ${entry.modality}, not ${modality} — a kind has one sense`);
  entry.modality = modality;
  const shape = colorGrid ? COLORED_LEN : DESCRIPTOR_LEN;
  if (entry.items.length && entry.items[0].shape !== shape)
    throw new TypeError(`teachGrid: concept "${concept}" was taught ${entry.items[0].shape === COLORED_LEN ? "with" : "without"} color — a kind sees one world, not a mix`);
  const proposal = region ? null : figureRegions(grid, w, h);
  let taughtRegion = region ?? (proposal?.regions[0]?.region ?? null);
  let d;
  if (colorGrid && !region) {
    // a COLOR lesson is taught through the SAME masked path recognition
    // reads with: the largest hue-class component's own cells over the
    // frame's ground (measured: lessons from plain luminance boxes and
    // queries from masked hue-class crops never met — two worlds)
    const hueRegions = hueClassRegions(colorGrid, w, h);
    if (hueRegions.length) {
      const hr = hueRegions[0];
      const cls = hr.hueClass;
      const mask = new Uint8Array(w * h);
      for (let r = hr.region[1]; r < hr.region[1] + hr.region[3]; r += 1) {
        for (let c = hr.region[0]; c < hr.region[0] + hr.region[2]; c += 1) {
          const i = r * w + c;
          const R = colorGrid[i * 3];
          const G = colorGrid[i * 3 + 1];
          const B = colorGrid[i * 3 + 2];
          const chMax = Math.max(R, G, B);
          const chMin = Math.min(R, G, B);
          if ((chMax - chMin) / 255 <= 0.02) continue;
          if (Math.floor(hueOf(R, G, B) * 12) !== cls) continue;
          mask[i] = 1;
        }
      }
      const floor = { mean: proposal?.mean ?? 0.25, std: proposal?.std ?? 1 };
      const mc = maskedCrops(grid, colorGrid, w, h, hr.region, mask, floor);
      d = descriptorOf(mc.lum, mc.cw, mc.ch, null, mc.rgb);
      taughtRegion = hr.region;
    } else {
      d = descriptorOf(grid, w, h, taughtRegion, colorGrid);
    }
  } else {
    d = descriptorOf(grid, w, h, taughtRegion, colorGrid);
  }
  recordOccurrence(entry, { concept, source, region: taughtRegion, label });
  entry.items.push({
    d: encodeDescriptor(d),
    shape,
    region: taughtRegion,
    source: source ?? null,
    sourceHash: sourceHash ?? null,
    sourceBytes: sourceBytes ?? 0,
    ratio: sourceBytes > 0 ? DESCRIPTOR_BYTES / sourceBytes : null,
    label: label ?? null,
    colored: !!colorGrid,
    at: Date.now(),
  });
  return entry;
}

// teachFromLook: the PARENT'S LESSON — a lookAtImage result (OpenCV boxes +
// OCR labels, each with a pixel region) teaches every readable box's region
// as an example of `concept`. The organ re-decodes the source image itself
// (ffmpeg grid, the same decoder the perceiver uses) so each lesson is the
// shadow of the actual bytes at the actual place, and digests the raw source
// so the memory keeps its de-lossy handle. Refuses rather than guessing when
// the look result lacks the pixel dimensions or the source path.
export async function teachFromLook(store, concept, lookResult, { grid = GRID } = {}) {
  if (!lookResult?.boxes?.length) return { taught: 0 };
  if (!lookResult.width || !lookResult.height)
    throw new TypeError("teachFromLook: the look result must carry the source image's width/height (pixel regions cannot be scaled onto the decode grid without them)");
  if (!lookResult.imagePath)
    throw new TypeError("teachFromLook: the look result must carry its imagePath — the lesson needs the actual bytes to shadow");
  const { buf, w, h } = await load(lookResult.imagePath, { w: grid, h: grid });
  const { hash, bytes } = sourceDigest(lookResult.imagePath);
  const sx = grid / lookResult.width;
  const sy = grid / lookResult.height;
  let taught = 0;
  for (const b of lookResult.boxes) {
    if (!b.text || !b.text.trim() || !b.region) continue;
    const [x, y, bw, bh] = b.region;
    const region = [Math.round(x * sx), Math.round(y * sy), Math.max(1, Math.round(bw * sx)), Math.max(1, Math.round(bh * sy))];
    teachGrid(store, concept, {
      grid: buf, w, h, region,
      source: lookResult.imagePath,
      sourceBytes: bytes,
      sourceHash: hash,
      label: b.text.trim().slice(0, 120),
      modality: "image",
    });
    // the memory points at the real place in the real image, not only the
    // decode grid — pixelRegion is the original CV parent's own address.
    const item = store.concepts[concept].items[store.concepts[concept].items.length - 1];
    item.pixelRegion = b.region;
    taught += 1;
  }
  return { taught };
}

// teachSeries: the audio/video face — a 1D byte stream teaches the concept.
// `segment` ([start, length] in samples) ties the lesson to a specific part
// of the series — the child remembers WHEN the bird sang, not just that a
// bird sang. A raw series carries no file size here; the caller may declare
// sourceBytes to invoke the size rule.
export function teachSeries(store, concept, series, { source = null, label = null, modality = "audio", sourceBytes = 0, sourceHash = null, segment = null } = {}) {
  if (!series?.length) throw new TypeError("teachSeries: a series is required");
  if (sourceBytes > 0 && sourceBytes < DESCRIPTOR_BYTES)
    throw new TypeError(`teachSeries: refusing — the memory (${DESCRIPTOR_BYTES} bytes) is larger than its source (${sourceBytes} bytes); a memory larger than its source is not a memory`);
  const entry = bump(store, concept);
  if (entry.modality && entry.modality !== modality)
    throw new TypeError(`teachSeries: concept "${concept}" was already taught in modality ${entry.modality}, not ${modality} — a kind has one sense`);
  entry.modality = modality;
  entry.items.push({
    d: encodeDescriptor(descriptorFromSeries(series, { segment })),
    shape: SERIES_LEN,
    region: segment ?? null,
    source: source ?? null,
    sourceHash: sourceHash ?? null,
    sourceBytes: sourceBytes ?? 0,
    ratio: sourceBytes > 0 ? DESCRIPTOR_BYTES / sourceBytes : null,
    label: label ?? null,
    at: Date.now(),
  });
  return entry;
}

// ── the text face: the same shadow/echo over the material's own motifs ────
// SHADOW of text = the motif-density profile across reading-order windows
// (WHERE in the text the motifs cluster); ECHO of text = the magnitudes of
// the modes the windowed motif observations excite (contextual-dmd's own
// decomposition — the DMD this codebase already carries). Windows are the
// text adapters' own per-unit motif-count Maps, exactly the observations
// contextualModes consumes. A passage's regions are figureSegments over the
// density profile — WHERE in the text the thing is said.
export const TEXT_SHAPE = 48; // 24 density bins + 24 mode-magnitude bins
export const TEXT_WINDOWS = 24;

export function descriptorOfTextWindows(windowCounts) {
  if (windowCounts.length < 3)
    return { gap: "too_few_windows", windows: windowCounts.length };
  const totals = windowCounts.map((c) => { let s = 0; for (const v of c.values()) s += v; return s; });
  const density = resample(totals, TEXT_WINDOWS);
  const modes = contextualModes(windowCounts);
  const mags = modes.gap ? new Float64Array(0) : modes.eigenvalues.map((l) => l.magnitude);
  const echo = mags.length ? resample(mags, TEXT_WINDOWS) : new Float64Array(TEXT_WINDOWS);
  const d = new Float64Array(TEXT_SHAPE);
  d.set(density, 0);
  d.set(echo, TEXT_WINDOWS);
  const norm = (() => {
    let n = 0;
    for (let i = 0; i < d.length; i += 1) n += d[i] * d[i];
    return Math.sqrt(n);
  })();
  return Float64Array.from(d, (v) => (norm > 1e-12 ? v / norm : 0));
}

export function teachText(store, concept, windowCounts, { source = null, label = null, sourceBytes = 0, sourceHash = null, region = null } = {}) {
  const d = descriptorOfTextWindows(windowCounts);
  if (d.gap) throw new TypeError(`teachText: ${d.gap} (${d.windows} windows) — a text lesson needs at least 3 reading-order windows`);
  if (sourceBytes > 0 && sourceBytes < DESCRIPTOR_BYTES)
    throw new TypeError(`teachText: refusing — the memory (${DESCRIPTOR_BYTES} bytes) is larger than its source (${sourceBytes} bytes)`);
  const entry = bump(store, concept);
  if (entry.modality && entry.modality !== "text")
    throw new TypeError(`teachText: concept "${concept}" was already taught in modality ${entry.modality}, not text`);
  entry.modality = "text";
  entry.items.push({
    d: encodeDescriptor(d),
    shape: TEXT_SHAPE,
    region: region ?? null, // text-space address: [windowStart, windowCount]
    source: source ?? null,
    sourceHash: sourceHash ?? null,
    sourceBytes: sourceBytes ?? 0,
    ratio: sourceBytes > 0 ? DESCRIPTOR_BYTES / sourceBytes : null,
    label: label ?? null,
    at: Date.now(),
  });
  return entry;
}

// ── the child's own decoder of its memories ────────────────────────────────
// Framework math runs in the child's numeric world: quantized space, exactly
// as stored. A cache keyed on the concept's revision — a taught lesson
// invalidates only its own kind's framework.
const frameworkCache = new Map(); // concept -> { revision, framework, bound }
const childExamplesOf = (entry) => ({
  revision: entry.revision,
  items: entry.items
    .filter((it) => !it.refuted)
    .map((it) => ({
      descriptor: decodeDescriptor(it.d),
      shape: it.shape ?? DESCRIPTOR_LEN,
      region: it.region ?? null,
      pixelRegion: it.pixelRegion ?? null,
      source: it.source ?? null,
      sourceBytes: it.sourceBytes ?? 0,
      ratio: it.ratio ?? null,
      label: it.label ?? null,
    })),
});

function childStoreOf(store, modality) {
  const concepts = {};
  for (const [name, entry] of Object.entries(store.concepts ?? {})) {
    if (entry.modality !== modality) continue;
    concepts[name] = childExamplesOf(entry);
  }
  return { concepts };
}

function recognizeInSpace(store, concept, descriptor, modality) {
  const entry = store.concepts[concept];
  const cached = frameworkCache.get(concept);
  const cache = cached?.revision === entry.revision ? cached : { revision: entry.revision };
  const r = recognizeDescriptor(childStoreOf(store, modality), concept, descriptor, { cache });
  if (cache.framework && cache.bound !== undefined) frameworkCache.set(concept, cache);
  return r;
}

// every query is the child's own world: quantized in, quantized out.
const inChildSpace = (d) => childSpace(d);

// ── recognition (the fast path — no CV model anywhere) ─────────────────────
// The child proposes its OWN candidate regions (figure/ground + connected
// components, kernel figureRegions) and names each one. A photograph with a
// dog AND a cat is two regions, each named where it is — nothing assumes a
// photograph is one thing. Whole-image matching is kept alongside as a
// disclosed fallback (a single figure filling the frame IS the region).
// Pixel coordinates come from ffprobe so the addresses match the CV
// parent's; if ffprobe is missing the regions are disclosed as grid-relative
// rather than guessed.
function ffprobeDims(imagePath) {
  return new Promise((resolve) => {
    const proc = spawn("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", imagePath]);
    let out = "";
    proc.stdout.on("data", (d) => { out += d; });
    proc.on("error", () => resolve(null));
    proc.on("close", (code) => {
      if (code !== 0) return resolve(null);
      const m = /^(\d+),(\d+)/.exec(out.trim());
      resolve(m ? { width: Number(m[1]), height: Number(m[2]) } : null);
    });
  });
}

const conceptResults = (store, descriptor, modality) => {
  const out = {};
  for (const concept of Object.keys(store.concepts ?? {})) {
    if (store.concepts[concept].modality !== modality) continue;
    const r = recognizeInSpace(store, concept, descriptor, modality);
    // the de-lossy handle: the nearest taught example's source + pixel
    // address, always present — the exact place to re-read the raw bytes.
    const near = r.nearest;
    const verifyAt = near?.source
      ? { source: near.source, pixelRegion: near.pixelRegion ?? null, label: near.label ?? null }
      : null;
    out[concept] = {
      ...r,
      verifyAt,
      // the kind's standing and history — never a score: the verdict is
      // bounded geometry (margin against the within-kind bound), the void
      // names what this reading is NOT, corroboration is how often the kind
      // has been seen and tested.
      kindStatus: store.concepts[concept].status ?? "provisional",
      corroboration: corroboration(store, concept),
    };
  }
  return out;
};

// recognizeRegionTree: the holonic core — a region is recognized, and if it
// IS recognized, the child looks INSIDE it: separate figures within the
// recognized thing's box become PARTS, each with its own recognition. A
// part whose box equals its parent's is no part (derived, exact — no
// threshold): the recursion stops when there is nothing new inside. The
// figure/ground floor is the FRAME's own (inherited, never re-derived on a
// crop — a crop's own std would flip its background into figure).
function recognizeRegionTree(store, grid, w, h, region, area, depth = 0, floor = null) {
  const descriptor = inChildSpace(descriptorOf(grid, w, h, region));
  const concepts = conceptResults(store, descriptor, "image");
  const recognized = Object.keys(concepts).filter((c) => concepts[c].verdict === "recognized");
  const node = { region, area, depth, recognized, concepts, parts: [] };
  if (recognized.length) {
    const { grid: cg, w: cw, h: ch } = cropGrid(grid, w, h, region);
    const sub = figureRegions(cg, cw, ch, { floor });
    for (const { region: subR, area: subA } of sub.regions) {
      const abs = [region[0] + subR[0], region[1] + subR[1], subR[2], subR[3]];
      // a part identical to its parent is no part (derived, exact — no
      // threshold): the recursion stops when there is nothing new inside
      if (abs[0] === region[0] && abs[1] === region[1] && abs[2] === region[2] && abs[3] === region[3]) continue;
      node.parts.push(recognizeRegionTree(store, grid, w, h, abs, subA, depth + 1, floor));
    }
  }
  return node;
}

// ── the COLOR face: recognition with the hue layout and chroma proposals ──
// The chroma mask: a cell is colored when its chroma exceeds the FRAME's
// own mean chroma (derived from this material, never typed) — the
// segmentation key for overlap: a red circle over a blue square separates
// into its own components before the shadow is asked. Recognition with
// color proposes on BOTH the luminance figure AND the chroma mask, and
// every descriptor carries its hue layout (COLORED_LEN = 232 bytes).
export function chromaMask(rgb, w, h) {
  const n = w * h;
  const chroma = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const R = rgb[i * 3];
    const G = rgb[i * 3 + 1];
    const B = rgb[i * 3 + 2];
    chroma[i] = (Math.max(R, G, B) - Math.min(R, G, B)) / 255;
    sum += chroma[i];
  }
  const mean = sum / n;
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) mask[i] = chroma[i] > mean && chroma[i] > 0.02 ? 1 : 0;
  return mask;
}

// ── hue-class components: overlap's segmentation ──────────────────────────
// A red circle ON a blue square is ONE connected chroma blob (they touch at
// the circle's rim) — connectivity cannot separate them (measured). The
// chroma cells' HUE clusters can: fold hue into 12 classes (the house's own
// chroma count, adapters/audio/chroma.js) and take the connected components
// of each class — the red disc is one class's component, the blue surround
// another's. Each class mask's components become candidate regions, the
// same [x,y,w,h] shape the CV parent certifies.
import { hueOf } from "../kernel/shadow-echo.js";

export function hueClassRegions(rgb, w, h, { bins = 12, minArea = 32 } = {}) {
  const n = w * h;
  const chroma = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const R = rgb[i * 3];
    const G = rgb[i * 3 + 1];
    const B = rgb[i * 3 + 2];
    chroma[i] = (Math.max(R, G, B) - Math.min(R, G, B)) / 255;
    sum += chroma[i];
  }
  const mean = sum / n;
  const out = [];
  const seen = new Uint8Array(n);
  for (let cls = 0; cls < bins; cls += 1) {
    for (let start = 0; start < n; start += 1) {
      const R = rgb[start * 3];
      const G = rgb[start * 3 + 1];
      const B = rgb[start * 3 + 2];
      const ch = chroma[start];
      if (ch <= Math.max(mean, 0.02) || seen[start]) continue;
      if (Math.floor(hueOf(R, G, B) * bins) !== cls) continue;
      let minR = start % w, maxR = start % w, minC = (start / w) | 0, maxC = (start / w) | 0;
      let area = 0;
      const queue = [start];
      seen[start] = 1;
      while (queue.length) {
        const idx = queue.pop();
        area += 1;
        const r = idx % w;
        const c = (idx / w) | 0;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= w || nc < 0 || nc >= h) continue;
          const ni = nc * w + nr;
          if (seen[ni]) continue;
          const ch2 = chroma[ni];
          if (ch2 <= Math.max(mean, 0.02)) continue;
          const [R2, G2, B2] = [rgb[ni * 3], rgb[ni * 3 + 1], rgb[ni * 3 + 2]];
          if (Math.floor(hueOf(R2, G2, B2) * bins) !== cls) continue;
          seen[ni] = 1;
          queue.push(ni);
        }
      }
      if (area < minArea) continue;
      out.push({ region: [minR, minC, maxR - minR + 1, maxC - minC + 1], area, hueClass: cls });
    }
  }
  out.sort((a, b) => b.area - a.area);
  return out;
}

// dominantColorName: the STANDARD name of a region's dominant hue, from the
// child's color face. The dominant hue is the chroma-weighted CIRCULAR MEAN
// of the region's hues (measured: a bin-center estimate put red — which
// sits at the wheel's wrap boundary — closer to orange; the circular mean
// is boundary-honest), and the wheel's DMD navigation names it.
export function dominantColorName(rgb, w, h, region) {
  const [x, y, cw, ch] = region;
  let cosSum = 0;
  let sinSum = 0;
  let total = 0;
  for (let r = 0; r < ch; r += 1) {
    for (let c = 0; c < cw; c += 1) {
      const si = ((y + r) * w + (x + c)) * 3;
      const R = rgb[si];
      const G = rgb[si + 1];
      const B = rgb[si + 2];
      const chMax = Math.max(R, G, B);
      const chMin = Math.min(R, G, B);
      const chroma = (chMax - chMin) / 255;
      if (chroma <= 0.02) continue;
      const h2 = hueOf(R, G, B) * 2 * Math.PI;
      cosSum += chroma * Math.cos(h2);
      sinSum += chroma * Math.sin(h2);
      total += chroma;
    }
  }
  if (total <= 0) return { name: "achromatic", standing: "no chroma in this region — a gray thing has no color name" };
  const hue = (Math.atan2(sinSum, cosSum) / (2 * Math.PI) + 1) % 1;
  return colorNameOf(hue);
}

// maskedCrops: the descriptor material of a hue-class region, computed over
// the region's OWN cells with the surround's mean as background. Measured:
// a circle's tight bbox in a multi-shape scene contained the neighboring
// triangle's pixels, and the circle's reading carried the triangle's red —
// the region's descriptor must be the region's thing, not its bbox's
// accidents. Derived from the material: the non-mask cells' own mean is the
// background (never typed).
// maskedCrops: the descriptor material of a hue-class region, computed over
// the region's OWN cells with the FRAME's GROUND as background. Measured
// twice: first the bbox's interior accidents (a neighbor's pixels) pinked
// the reading; then the raw surround mixed the neighbor shapes in too. The
// background is the frame's ground — the cells below the frame's own
// figure/ground floor (the floor recognizeGridColor already measured) — so
// a circle in a multi-shape scene reads against the same white ground its
// lessons were taught on.
function maskedCrops(grid, rgb, w, h, region, mask, floor) {
  const [x, y, cw, ch] = region;
  const margin = Math.max(4, Math.round(Math.min(cw, ch) * 0.2));
  const x0 = Math.max(0, x - margin);
  const y0 = Math.max(0, y - margin);
  const x1 = Math.min(w, x + cw + margin);
  const y1 = Math.min(h, y + ch + margin);
  let lumSum = 0;
  let lumN = 0;
  let rSum = 0, gSum = 0, bSum = 0, colN = 0;
  const fMean = floor?.mean ?? 0.25;
  const fStd = floor?.std ?? 1;
  for (let gy = y0; gy < y1; gy += 1) {
    for (let gx = x0; gx < x1; gx += 1) {
      const inside = gx >= x && gx < x + cw && gy >= y && gy < y + ch;
      if (inside) continue;
      const li = gy * w + gx;
      // the GROUND: below the frame's own figure/ground floor — the other
      // things near the region are figures, and they are not the context
      if (Math.abs(grid[li] - fMean) > fStd) continue;
      lumSum += grid[li];
      lumN += 1;
      const si = li * 3;
      rSum += rgb[si];
      gSum += rgb[si + 1];
      bSum += rgb[si + 2];
      colN += 1;
    }
  }
  const bgLum = lumN > 0 ? lumSum / lumN : 0.25;
  const bgRgb = colN > 0 ? [rSum / colN, gSum / colN, bSum / colN] : [242, 242, 242];
  const mLum = new Float64Array(cw * ch);
  const mRgb = new Uint8Array(cw * ch * 3);
  for (let r = 0; r < ch; r += 1) {
    for (let c = 0; c < cw; c += 1) {
      const gx = x + c;
      const gy = y + r;
      const inMask = mask[gy * w + gx] === 1;
      const di = r * cw + c;
      if (inMask) {
        mLum[di] = grid[gy * w + gx];
        const si = (gy * w + gx) * 3;
        mRgb[di * 3] = rgb[si];
        mRgb[di * 3 + 1] = rgb[si + 1];
        mRgb[di * 3 + 2] = rgb[si + 2];
      } else {
        mLum[di] = bgLum;
        mRgb[di * 3] = bgRgb[0];
        mRgb[di * 3 + 1] = bgRgb[1];
        mRgb[di * 3 + 2] = bgRgb[2];
      }
    }
  }
  return { lum: mLum, rgb: mRgb, cw, ch };
}

export function recognizeGridColor(store, grid, rgb, w, h) {
  const proposal = figureRegions(grid, w, h);
  const floor = { mean: proposal.mean, std: proposal.std };
  // the region set: luminance components PLUS hue-class components (the
  // overlap segmentation — a red disc on a blue square is one luminance
  // blob but two hue classes), deduped by bbox, disclosed in `proposal.via`
  const lumRegions = proposal.regions.map((r) => ({ ...r, via: "luminance" }));
  const hueRegions = hueClassRegions(rgb, w, h).map((r) => ({ ...r, via: `hue:${r.hueClass}` }));
  const seen = new Set();
  const merged = [];
  for (const r of [...lumRegions, ...hueRegions]) {
    // an inscribed figure shares its bbox with the merged blob (a disc
    // inscribed in a square) — dedup by bbox AND via, so the hue-class
    // component survives next to the luminance blob
    const key = `${r.via}:${JSON.stringify(r.region)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(r);
  }
  const regions = [];
  for (const { region, area, via } of merged) {
    let descriptor;
    let mc = null;
    if (via.startsWith("hue:")) {
      // the hue-class region reads ITS OWN cells over its surround's mean —
      // the bbox's accidents (a neighbor's pixels) are not the thing
      const cls = Number(via.slice(4));
      const mask = new Uint8Array(w * h);
      for (let r = region[1]; r < region[1] + region[3]; r += 1) {
        for (let c = region[0]; c < region[0] + region[2]; c += 1) {
          const i = r * w + c;
          const R = rgb[i * 3];
          const G = rgb[i * 3 + 1];
          const B = rgb[i * 3 + 2];
          const chMax = Math.max(R, G, B);
          const chMin = Math.min(R, G, B);
          if ((chMax - chMin) / 255 <= 0.02) continue;
          if (Math.floor(hueOf(R, G, B) * 12) !== cls) continue;
          mask[i] = 1;
        }
      }
      mc = maskedCrops(grid, rgb, w, h, region, mask, { mean: proposal.mean, std: proposal.std });
      descriptor = inChildSpace(descriptorOf(mc.lum, mc.cw, mc.ch, null, mc.rgb));
    } else {
      descriptor = inChildSpace(descriptorOf(grid, w, h, region, rgb));
    }
    const concepts = conceptResults(store, descriptor, "image");
    const recognized = Object.keys(concepts).filter((c) => concepts[c].verdict === "recognized");
    const node = { region, area, via: via ?? "luminance", recognized, concepts, parts: [] };
    // the STANDARD name of the region's color — the child says "red", not
    // just a hue vector; the wheel's DMD navigation discloses the name and
    // the between-reading. A hue-class region's color is read from ITS OWN
    // masked crop (measured: the bbox's corners held the overlapping
    // square's blue, and the disc was named pink — the ground has no
    // chroma, so the masked crop's mean hue is the thing's own)
    node.colorName = via.startsWith("hue:")
      ? dominantColorName(mc.rgb, mc.cw, mc.ch, [0, 0, mc.cw, mc.ch]) ?? null
      : dominantColorName(rgb, w, h, region) ?? null;
    if (!recognized.length) {
      node.novel = { name: provisionalKindName(descriptor), possibility: "high", standing: "unrecognized — a possible new kind, awaiting corroboration (SIG)" };
    }
    regions.push(node);
  }
  const whole = inChildSpace(descriptorOf(grid, w, h, null, rgb));
  const wholeConcepts = conceptResults(store, whole, "image");
  return {
    proposal: {
      mask: proposal.mask,
      regionCount: regions.length,
      via: hueRegions.length > lumRegions.length ? "luminance+hue-class" : hueRegions.length ? "luminance+hue-class" : "luminance",
    },
    regions,
    wholeImage: {
      recognized: Object.keys(wholeConcepts).filter((c) => wholeConcepts[c].verdict === "recognized"),
      concepts: wholeConcepts,
    },
    full: whole,
  };
}
export function recognizeGrid(store, grid, w, h) {
  const proposal = figureRegions(grid, w, h);
  const floor = { mean: proposal.mean, std: proposal.std };
  const regions = [];
  for (const { region, area } of proposal.regions) {
    const tree = recognizeRegionTree(store, grid, w, h, region, area, 0, floor);
    if (!tree.recognized.length) {
      const d = inChildSpace(descriptorOf(grid, w, h, region));
      tree.novel = { name: provisionalKindName(d), possibility: "high", standing: "unrecognized — a possible new kind, awaiting corroboration (SIG)" };
    }
    regions.push(tree);
  }
  const whole = inChildSpace(descriptorOf(grid, w, h));
  const wholeConcepts = conceptResults(store, whole, "image");
  return {
    proposal: { mask: proposal.mask, regionCount: proposal.regions.length },
    regions,
    wholeImage: {
      recognized: Object.keys(wholeConcepts).filter((c) => wholeConcepts[c].verdict === "recognized"),
      concepts: wholeConcepts,
    },
    full: whole,
  };
}

// absorbRecognition: the universe-building step — recognition results roll
// up into the store. Recognized things corroborate their kinds (CON);
// unrecognized regions are signed as provisional kinds (SIG) AND taught
// their own first lesson, so the child can recognize them next time. The
// universe is built constantly, from every read.
export function absorbRecognition(store, recognition, { source, grid, w, h }) {
  const regionOf = (node) => node.pixelRegion ?? node.region;
  const absorbNode = (node) => {
    if (node.recognized.length) {
      for (const concept of node.recognized) {
        const entry = store.concepts[concept];
        const id = occurrenceKey(concept, source, regionOf(node));
        if (!entry.occurrences.some((o) => o.id === id)) {
          entry.occurrences.push({ id, source, region: regionOf(node), at: Date.now(), falsified: false, basis: "recognition" });
        }
        confirmKind(store, concept);
      }
      for (const part of node.parts ?? []) absorbNode(part);
    } else if (node.novel && node.region) {
      signProvisionalKind(store, { name: node.novel.name, source, region: regionOf(node) });
      teachGrid(store, node.novel.name, { grid, w, h, region: node.region, source, label: null });
    }
  };
  const absorbed = [];
  for (const node of recognition.regions) {
    absorbNode(node);
    absorbed.push({ region: regionOf(node), recognized: node.recognized, novel: node.novel?.name ?? null });
  }
  return { absorbed, universe: universeSnapshot(store) };
}

export async function recognizeImage(store, imagePath, { grid = GRID, color = false } = {}) {
  const { buf, w, h } = await load(imagePath, { w: grid, h: grid });
  const pixelDims = await ffprobeDims(imagePath);
  const rgb = color ? (await loadColor(imagePath, { w: grid, h: grid })).buf : null;
  const rec = color ? recognizeGridColor(store, buf, rgb, w, h) : recognizeGrid(store, buf, w, h);
  const sx = pixelDims ? pixelDims.width / w : null;
  const sy = pixelDims ? pixelDims.height / h : null;
  return {
    imagePath,
    grid: { w, h },
    pixelDims: pixelDims ?? null,
    colored: !!rgb,
    ...rec,
    regions: rec.regions.map((r) => ({
      ...r,
      pixelRegion: sx && sy ? r.region.map((v, i) => (i % 2 === 0 ? Math.round(v * sx) : Math.round(v * sy))) : null,
      pixelDims: pixelDims ?? null,
    })),
  };
}

export async function recognizeRegion(store, imagePath, region, { grid = GRID } = {}) {
  const { buf, w, h } = await load(imagePath, { w: grid, h: grid });
  const descriptor = inChildSpace(descriptorOf(buf, w, h, region));
  return {
    imagePath,
    region,
    grid: { w, h },
    recognized: Object.keys(conceptResults(store, descriptor, "image")).filter((c) => conceptResults(store, descriptor, "image")[c].verdict === "recognized"),
    concepts: conceptResults(store, descriptor, "image"),
    full: descriptor,
  };
}

export function recognizeSeries(store, series, { modality = "audio" } = {}) {
  const proposal = figureSegments(series);
  const segments = [];
  for (const { segment, length } of proposal.segments) {
    const descriptor = inChildSpace(descriptorFromSeries(series, { segment }));
    const concepts = conceptResults(store, descriptor, modality);
    const recognized = Object.keys(concepts).filter((c) => concepts[c].verdict === "recognized");
    segments.push({ segment, length, recognized, concepts });
  }
  const whole = inChildSpace(descriptorFromSeries(series));
  const wholeConcepts = conceptResults(store, whole, modality);
  return {
    proposal: { mask: proposal.mask, segmentCount: proposal.segments.length },
    segments,
    whole: {
      recognized: Object.keys(wholeConcepts).filter((c) => wholeConcepts[c].verdict === "recognized"),
      concepts: wholeConcepts,
    },
    full: whole,
  };
}

// ── the video face: the series face over frame-material ────────────────────
// Video's byte source is the frame-material series video/material.js already
// computes (mean absolute pixel difference between consecutive frames) — the
// child does not reimplement it; it accepts any 1D series under modality
// "video" and its figureSegments ARE the cuts and motion events, in frames.
export function teachVideo(store, concept, frameMaterialSeries, opts = {}) {
  return teachSeries(store, concept, frameMaterialSeries, { ...opts, modality: "video" });
}

export function recognizeVideo(store, frameMaterialSeries) {
  return recognizeSeries(store, frameMaterialSeries, { modality: "video" });
}

// ── the text face recognition: passages where the thing is said ────────────
export function recognizeText(store, windowCounts) {
  const totals = windowCounts.map((c) => { let s = 0; for (const v of c.values()) s += v; return s; });
  const proposal = figureSegments(totals);
  const passages = [];
  for (const { segment, length } of proposal.segments) {
    const [start, len] = segment;
    const slice = windowCounts.slice(start, start + len);
    const d = descriptorOfTextWindows(slice);
    if (d.gap) continue;
    const descriptor = inChildSpace(d);
    const concepts = conceptResults(store, descriptor, "text");
    const recognized = Object.keys(concepts).filter((c) => concepts[c].verdict === "recognized");
    passages.push({ segment, length, recognized, concepts });
  }
  const wholeRaw = descriptorOfTextWindows(windowCounts);
  let whole = wholeRaw;
  let wholeConcepts = {};
  if (!wholeRaw.gap) {
    whole = inChildSpace(wholeRaw);
    wholeConcepts = conceptResults(store, whole, "text");
  }
  return {
    proposal: { mask: proposal.mask, passageCount: passages.length },
    passages,
    whole: {
      recognized: Object.keys(wholeConcepts).filter((c) => wholeConcepts[c].verdict === "recognized"),
      concepts: wholeConcepts,
    },
    full: whole,
  };
}

// ── the look fast path: one call the proxy's looking seam can use ─────────
// A recognition summary when a concept fires; null otherwise. The standing
// discloses that NO CV model ran — this is a memory read — and every match
// carries the de-lossy handle: where the memory came from, and the ratio of
// the memory's size to its source's.
export async function mnemonicLook(store, imagePath) {
  if (!store?.concepts || !Object.keys(store.concepts).length) return null;
  const rec = await recognizeImage(store, imagePath);
  const parts = [];
  for (const region of rec.regions) {
    for (const name of region.recognized) {
      const m = region.concepts[name];
      const where = region.pixelRegion ? `at ${JSON.stringify(region.pixelRegion)}` : `at grid ${JSON.stringify(region.region)}`;
      const handle = m.verifyAt
        ? ` — learned from ${path.basename(String(m.verifyAt.source))}${m.verifyAt.pixelRegion ? ` at ${JSON.stringify(m.verifyAt.pixelRegion)}` : ""}${m.verifyAt.label ? `, labeled "${m.verifyAt.label}"` : ""}`
        : "";
      const ratio = m.nearest?.sourceBytes ? ` (memory ${DESCRIPTOR_BYTES}B vs source ${m.nearest.sourceBytes}B, ${(m.nearest.ratio * 100).toFixed(4)}%)` : "";
      parts.push(`a ${name} ${where}${handle}${ratio}`);
    }
  }
  if (!parts.length) return null;
  return {
    matched: true,
    concepts: [...new Set(rec.regions.flatMap((r) => r.recognized))],
    summary: parts.join("; "),
    text: `Recognized from memory: ${parts.join("; ")}. ${MNEMONIC_STANDING}`,
    standing: MNEMONIC_STANDING,
    regions: rec.regions,
    wholeImage: rec.wholeImage,
  };
}