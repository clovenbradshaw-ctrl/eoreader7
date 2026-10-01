// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 2 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// Handle: Herodotus — the first historian: went and looked, wrote down where
// each account came from, and kept the ones he did not believe beside the ones
// he did.
//
// comp-research.js — the PURE half of finding a real comp on the open web:
// what images a page offers, what license a page states, whether a site's
// robots.txt lets this instrument read a path, and how well a candidate
// matches what is needed. The crossing (search, fetch, the seen-ledger) is
// native/the-fold/comp-research.mjs; nothing here does I/O.
//
// Why a ledger of everything seen, and what it is and is not for (user
// direction, 2026-09-30: "much harder for us to get away with plagiarism if it
// records everything we come across"): a complete record makes copying
// DETECTABLE and ATTRIBUTABLE — it is the reference set a generated artifact
// is diffed against (likenessOf, below) and the audit trail a reader can walk.
// It does not make a copy acceptable, and recording exposure is not a licence.
// What is carried from a comp into a generated app is its STRUCTURE (how many
// cards, which rows, where the header sits, the palette) — never its pixels,
// its brand text or its images — and likenessOf is the check that says so.
//
// Declared numbers (set by hand 2026-09-30; none tuned against a result):
import { tokenize } from "./source.js";
import { readLicense, PERMISSIVE } from "./license-table.js";

export const COMP_RESEARCH_SCHEMA = "EOCompResearch@1";
/** Smallest side, in pixels, of an image worth reading as a comp (below this it is an icon, a badge or a thumbnail). Set by hand 2026-09-30, not measured against a score: the ten images the first weather research kept (fixtures/weather-fuel/research) all clear it, which shows it refuses nothing real, not that the value is right. */
export const MIN_COMP_SIDE_PX = 320;
/** The widest aspect ratio (long side / short side) of a screen-like image; a banner or a scroll strip is not a screen. Set by hand 2026-09-30: phone screens run 16:9 to 20:9 (under 2.3), so 3.2 leaves room for tall captures and refuses banners; set by hand, not tuned against a score. */
export const MAX_COMP_ASPECT = 3.2;
/** A perceptual-hash Hamming distance (of 64 bits) at or below this reads as the same picture, however recompressed or resized. Set by hand 2026-09-30 and always judged against a null of unrelated images (likenessOf), never alone; the test pins a brightness-shifted copy at <= 2 bits and unrelated pictures beyond it. */
export const NEAR_COPY_BITS = 10;

/** Licenses a SOURCE may state, by the word a page uses. A source stating none of them stands as `unknown`, never as free. */
const COPYLEFT = Object.freeze(["GPL-3.0", "GPL-2.0", "AGPL-3.0", "LGPL-3.0", "LGPL-2.1", "MPL-2.0", "CC-BY-SA-4.0", "CC-BY-SA-3.0", "EUPL-1.2"]);
const RESTRICTIVE_WORDS = Object.freeze(["all rights reserved", "proprietary", "commercial license", "royalty-free license", "license fee", "premium"]);

/** The tag attributes of one tag's text, quote-aware: attribute values legally contain ">" (a srcset, a data URI, JSON). */
function attrsOf(tagText) {
  const out = {};
  let i = tagText.indexOf(" ");
  while (i >= 0 && i < tagText.length) {
    while (tagText[i] === " " || tagText[i] === "\n" || tagText[i] === "\t" || tagText[i] === "/") i++;
    let j = i;
    while (j < tagText.length && tagText[j] !== "=" && tagText[j] !== " " && tagText[j] !== ">" && tagText[j] !== "/") j++;
    const name = tagText.slice(i, j).toLowerCase();
    if (!name) break;
    if (tagText[j] === "=") {
      j++;
      const q = tagText[j] === '"' || tagText[j] === "'" ? tagText[j] : null;
      if (q) { const end = tagText.indexOf(q, j + 1); out[name] = tagText.slice(j + 1, end < 0 ? tagText.length : end); j = (end < 0 ? tagText.length : end) + 1; }
      else { let k = j; while (k < tagText.length && tagText[k] !== " " && tagText[k] !== ">") k++; out[name] = tagText.slice(j, k); j = k; }
    } else out[name] = "";
    i = j;
  }
  return out;
}

/** Every `<name …>` tag in html as { attrs, at } — scanned by hand so a quoted ">" does not end a tag early. */
export function tagsOf(html, name) {
  const h = String(html ?? ""), lower = h.toLowerCase(), needle = `<${name}`;
  const out = [];
  let from = 0;
  for (;;) {
    const at = lower.indexOf(needle, from);
    if (at < 0) break;
    const after = lower[at + needle.length];
    if (after !== " " && after !== "\n" && after !== "\t" && after !== "/" && after !== ">") { from = at + needle.length; continue; }
    let q = null, j = at + needle.length;
    for (; j < h.length; j++) {
      const c = h[j];
      if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === ">") break;
    }
    out.push({ attrs: attrsOf(h.slice(at, j)), at });
    from = j + 1;
  }
  return out;
}

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"];
const isImageUrl = (u) => { const p = String(u).split("?")[0].split("#")[0].toLowerCase(); return IMAGE_EXT.some((e) => p.endsWith(e)); };
const absolute = (src, base) => { try { return new URL(String(src).trim(), base).href; } catch { return null; } };
/** The largest candidate of a srcset ("a.png 1x, b.png 2x" / "a.png 400w, b.png 800w"). */
function largestOfSrcset(srcset) {
  let best = null, bestN = -1;
  for (const part of String(srcset).split(",")) {
    const [u, d] = part.trim().split(/\s+/);
    const n = d ? parseFloat(d) : 1;
    if (u && n > bestN) { best = u; bestN = n; }
  }
  return best;
}

/** The images a page offers: <img> (src, data-src, srcset), og:image / twitter:image, and links straight to an image file.
 *  Each keeps its alt, its own size hints, the page it came from, and WHERE in the page it sat — the record of what was seen. */
export function imageCandidates(html, baseUrl) {
  const seen = new Set(), out = [];
  const push = (raw, how, extra = {}) => {
    const url = absolute(raw, baseUrl);
    if (!url || url.startsWith("data:") || seen.has(url) || !(isImageUrl(url) || how === "meta")) return;
    seen.add(url);
    out.push({ url, how, from: baseUrl, ...extra });
  };
  for (const t of tagsOf(html, "img")) {
    const a = t.attrs;
    const src = a["data-src"] || a["data-original"] || (a.srcset ? largestOfSrcset(a.srcset) : null) || a.src;
    if (src) push(src, "img", { alt: a.alt ?? "", title: a.title ?? "", width: Number(a.width) || null, height: Number(a.height) || null, at: t.at });
  }
  for (const t of tagsOf(html, "meta")) {
    const key = (t.attrs.property || t.attrs.name || "").toLowerCase();
    if ((key === "og:image" || key === "twitter:image") && t.attrs.content) push(t.attrs.content, "meta", { alt: key, at: t.at });
  }
  for (const t of tagsOf(html, "a")) if (t.attrs.href && isImageUrl(t.attrs.href)) push(t.attrs.href, "link", { alt: t.attrs.title ?? "", at: t.at });
  return out;
}

/** The anchors of a page as { url, text } — a seed page (a category, a directory, a search-results page) is explored by following
 *  the links whose own words match the need. Same-page fragments and non-http links are dropped; the order of the page is kept. */
export function linksOf(html, baseUrl) {
  const h = String(html ?? ""), lower = h.toLowerCase();
  const out = [], seen = new Set();
  for (const t of tagsOf(h, "a")) {
    const href = t.attrs.href;
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) continue;
    const url = absolute(href, baseUrl);
    if (!url || !url.startsWith("http") || seen.has(url)) continue;
    const close = lower.indexOf("</a>", t.at);
    const inner = h.slice(h.indexOf(">", t.at) + 1, close < 0 ? t.at + 400 : close);
    let text = "", depth = 0;
    for (const c of inner) { if (c === "<") depth++; else if (c === ">") depth = Math.max(0, depth - 1); else if (!depth) text += c; }
    seen.add(url);
    out.push({ url, text: text.replace(/\s+/g, " ").trim().slice(0, 200) });
  }
  return out;
}

/** How well a candidate matches what is needed: the share of the need's content words found in the candidate's OWN words
 *  (its url path, alt, title and the text around it). Words, not meaning — the same generosity retrieve() gives a question. */
export function relevance(candidate, needText) {
  const need = [...new Set(tokenize(needText))];
  if (!need.length) return { score: 0, hits: [] };
  const hay = new Set(tokenize([candidate.url ? decodeURIComponent(String(candidate.url).split("?")[0]) : "", candidate.alt, candidate.title, candidate.context].join(" ")));
  // a need word also matches inside a longer word of the candidate ("screenshot" in "phonescreenshots"): file and path names run words together
  const hayWords = [...hay];
  const hits = need.filter((w) => hay.has(w) || (w.length >= 6 && hayWords.some((h) => h.length > w.length && h.includes(w))));
  return { score: hits.length / need.length, hits };
}

/** The license a page STATES — SPDX-shaped words, found by reading, never assumed. -> { id, standing, basis }
 *  standing: "permissive" (may be taken), "copyleft" (its notice and terms travel; nothing is taken here), "restrictive" or "unknown"
 *  (seen and recorded; only structure may be carried, and it is said so). */
export function licenseSignals(text) {
  const t = String(text ?? "");
  const low = t.toLowerCase();
  const hit = (id, words) => { for (const w of words) { const i = low.indexOf(w.toLowerCase()); if (i >= 0) return { id, basis: t.slice(Math.max(0, i - 40), i + w.length + 40).replace(/\s+/g, " ").trim() }; } return null; };
  const words = [
    ["MIT", ["mit license", "licensed under the mit", "license: mit", "spdx-license-identifier: mit"]],
    ["Apache-2.0", ["apache license", "apache-2.0", "apache 2.0"]],
    ["BSD-3-Clause", ["bsd-3-clause", "bsd 3-clause"]],
    ["CC0-1.0", ["cc0", "public domain dedication"]],
    ["GPL-3.0", ["gpl-3.0", "gplv3", "gnu general public license v3", "gnu general public license version 3", "gpl-3.0-or-later", "gpl-3.0-only"]],
    ["GPL-2.0", ["gpl-2.0", "gplv2"]],
    ["AGPL-3.0", ["agpl-3.0", "agplv3"]],
    ["LGPL-3.0", ["lgpl-3.0"]],
    ["MPL-2.0", ["mpl-2.0", "mozilla public license"]],
    ["CC-BY-SA-4.0", ["cc by-sa 4.0", "cc-by-sa-4.0"]],
    ["CC-BY-4.0", ["cc by 4.0", "cc-by-4.0"]],
  ];
  const found = [];
  for (const [id, ws] of words) { const h = hit(id, ws); if (h) found.push(h); }
  const restrictive = RESTRICTIVE_WORDS.map((w) => hit("restrictive", [w])).find(Boolean) ?? null;
  const first = found[0] ?? null;
  if (!first) return restrictive ? { id: null, standing: "restrictive", basis: restrictive.basis } : { id: null, standing: "unknown", basis: "the page states no license in the text read" };
  const read = readLicense(first.id);
  const standing = read.ok ? "permissive" : COPYLEFT.includes(first.id) ? "copyleft" : "unknown";
  return { id: first.id, standing, basis: first.basis, also: found.slice(1).map((f) => f.id), permissive: PERMISSIVE.has(first.id) };
}

/** robots.txt: may `ua` read `path`? The longest matching Allow/Disallow rule in the group that names the agent (else "*") decides;
 *  no rule means allowed. Structural parse — a line is `field: value`. */
export function robotsAllows(robotsTxt, path, ua = "eoreader7") {
  const groups = [];
  let cur = null, lastWasAgent = false;
  for (const raw of String(robotsTxt ?? "").split("\n")) {
    const line = raw.split("#")[0].trim();
    const i = line.indexOf(":");
    if (i < 0) continue;
    const field = line.slice(0, i).trim().toLowerCase(), value = line.slice(i + 1).trim();
    if (field === "user-agent") { if (!lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(value.toLowerCase()); lastWasAgent = true; continue; }
    lastWasAgent = false;
    if (cur && (field === "allow" || field === "disallow")) cur.rules.push({ allow: field === "allow", path: value });
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== "*" && ua.toLowerCase().includes(a)));
  const group = mine[0] ?? groups.find((g) => g.agents.includes("*"));
  if (!group) return { allowed: true, rule: null };
  let best = null;
  for (const r of group.rules) {
    if (!r.path) { if (!r.allow) continue; }
    const pat = r.path;
    const star = pat.indexOf("*");
    const matches = star < 0 ? (pat === "" ? false : path.startsWith(pat.endsWith("$") ? pat.slice(0, -1) : pat) && (!pat.endsWith("$") || path === pat.slice(0, -1)))
      : path.startsWith(pat.slice(0, star)) && path.includes(pat.slice(star + 1).replace("$", ""));
    if (matches && (!best || pat.length > best.path.length || (pat.length === best.path.length && r.allow))) best = r;
  }
  return best ? { allowed: best.allow, rule: `${best.allow ? "Allow" : "Disallow"}: ${best.path}` } : { allowed: true, rule: null };
}

/** An image worth reading as a comp, by its own dimensions: big enough, and screen-shaped. */
export function screenShaped(width, height) {
  if (!width || !height) return { ok: false, reason: "no dimensions" };
  const short = Math.min(width, height), long = Math.max(width, height);
  if (short < MIN_COMP_SIDE_PX) return { ok: false, reason: `short side ${short}px < ${MIN_COMP_SIDE_PX}px — an icon or thumbnail` };
  if (long / short > MAX_COMP_ASPECT) return { ok: false, reason: `aspect ${(long / short).toFixed(1)} > ${MAX_COMP_ASPECT} — a banner or a strip, not a screen` };
  return { ok: true, reason: null };
}

/** How UI-like a MEASURED image is (comp-detect.py --light): components (rectangles), words, and lines that carry a digit —
 *  a screen of an app has many of all three, a photograph or a logo has few. Counts only; no meaning. */
export function uiLikeness(measure) {
  const words = measure?.words ?? [], rects = measure?.rects ?? [];
  const valueWords = words.filter((w) => [...String(w.text)].some((c) => c >= "0" && c <= "9")).length;
  const area = (measure?.width ?? 1) * (measure?.height ?? 1);
  const textShare = words.reduce((a, w) => a + w.w * w.h, 0) / area;
  return { rects: rects.length, words: words.length, valueWords, textShare: +textShare.toFixed(4), score: Math.min(1, rects.length / 8) * 0.4 + Math.min(1, words.length / 30) * 0.4 + Math.min(1, valueWords / 6) * 0.2 };
}

/** A 64-bit difference hash of a grayscale 9×8 thumbnail (row-major luminance, 72 values) — a recompressed or resized copy of a
 *  picture keeps it within a few bits, so it is how a near-copy is told from a resemblance. */
export function dHash(lum9x8) {
  if (!lum9x8 || lum9x8.length !== 72) throw new TypeError("dHash wants 72 luminance values (9 columns × 8 rows)");
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += lum9x8[y * 9 + x] > lum9x8[y * 9 + x + 1] ? "1" : "0";
  return bits;
}
export function hamming(a, b) { let d = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) d++; return d + Math.abs(a.length - b.length); }

/** Words of length ≥ n as n-grams — the unit a verbatim copy shares. */
export function ngrams(text, n = 4) {
  const ws = tokenize(text);
  const out = new Set();
  for (let i = 0; i + n <= ws.length; i++) out.add(ws.slice(i, i + n).join(" "));
  return out;
}

/** likenessOf — the generated artifact diffed against EVERYTHING the research saw.
 *    output   { texts:[string], hash:"0101…"|null }       what was made
 *    seen     [{ id, url, texts:[string], hash }]          what was come across (every comp and page, from the seen-ledger)
 *    nulls    [hash]                                        hashes of images that are NOT the source of the output (the unrelated ones seen)
 *  Reports, per seen source: shared 4-gram strings (verbatim runs of words), and the hash distance; and the null — how close the
 *  output comes to the unrelated images. A near-copy is a distance ≤ NEAR_COPY_BITS AND below every null distance; a verbatim run is
 *  any shared 4-gram that is not a bare label. The verdict names which, or says nothing was found and how much was compared. */
export function likenessOf({ output, seen = [], nulls = [] }) {
  const mine = ngrams((output.texts ?? []).join(" \n "), 4);
  const rows = seen.map((s) => {
    const theirs = ngrams((s.texts ?? []).join(" \n "), 4);
    const shared = [...mine].filter((g) => theirs.has(g));
    const distance = output.hash && s.hash ? hamming(output.hash, s.hash) : null;
    return { id: s.id, url: s.url, sharedRuns: shared.slice(0, 8), sharedCount: shared.length, distance };
  });
  const nullDistances = nulls.filter(Boolean).map((h) => (output.hash ? hamming(output.hash, h) : null)).filter((d) => d != null);
  const nullMin = nullDistances.length ? Math.min(...nullDistances) : null;
  const flagged = rows.filter((r) => r.sharedCount > 0 || (r.distance != null && r.distance <= NEAR_COPY_BITS && (nullMin == null || r.distance < nullMin)));
  return { schema: "EOLikeness@1", compared: rows.length, nullCompared: nullDistances.length, nullMinDistance: nullMin, nearCopyBits: NEAR_COPY_BITS, rows, flagged, verdict: flagged.length ? "flagged" : "no verbatim run and no near-copy found", basis: `${rows.length} seen source(s) compared for shared ${4}-word runs and ${output.hash ? "image hash distance" : "(no image hash supplied)"}; null = ${nullDistances.length} unrelated image(s)` };
}
