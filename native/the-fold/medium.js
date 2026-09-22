// medium.js — THE GROUND READER: ANY TEXT AS A SEQUENCE OF ELEMENTS
// (2026-09-22).
//
// The paradigm hunt asks the nine operators of every form at three grains,
// and its Ground grain is the MEDIUM: how the text lays itself out before any
// word is read — its lines, its headings, its list items and labels, its
// indentation, its blocks. A sonnet, a man page, a recipe and a statute are
// laid out in different media (hard-wrapped plain text, troff rendered to a
// terminal, MediaWiki markup, Markdown), and this reader turns each into the
// same thing: an ordered list of elements, each with a class and the handful
// of facts every later cell reads.
//
// What is listed here is CLOSED typographic grammar, the ruler and not the
// shape (CODING-LESSONS 71): the markup of three media (wikitext, Markdown,
// plain), the list markers a writer can use (bullets, enumerators, option
// flags), and one rule for hard-wrapped prose (a line that runs on into a
// lowercase line is one authored line). Which of these a FORM uses is never
// written here — paradigm.js measures it on the form's own instances.
//
// Element classes:
//   heading   a markup heading, or a line with no closing punctuation that is
//             all capitals, or stands alone in its block ahead of more text,
//             no longer than the unit's typical line
//   item      a line opening on a list marker (its label read and kept)
//   label     a marker alone ("1.", "XIV", "(a)") — a separator, not content
//   line      everything else: a verse line, a prose paragraph, a sentence

import { syllables, rhymeKeys } from "./sound.js";

export const MEDIUM_SCHEMA = "EOMedium@1";

const ROMAN = /^(?=[ivxlcdm]+$)m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i;
const romanValue = (s) => { const v = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }; let n = 0; const t = s.toLowerCase(); for (let i = 0; i < t.length; i++) { const a = v[t[i]], b = v[t[i + 1]] ?? 0; n += a < b ? -a : a; } return n; };

/** A list marker at the start of a line, read into its kind and value. */
export function readMarker(line) {
  const t = String(line ?? "");
  let m;
  if ((m = t.match(/^([-*•·–])\s+(.*)$/))) { const inner = readMarker(m[2]); return inner && inner.kind !== "bullet" && inner.kind !== "option" ? inner : { marker: m[1], kind: "bullet", value: null, rest: m[2] }; }
  if ((m = t.match(/^\((\d+)([A-Z]{0,2})\)\s*(.*)$/))) return { marker: `(${m[1]}${m[2]})`, kind: "paren-arabic", value: Number(m[1]), rest: m[3] };
  if ((m = t.match(/^\(([ivx]+)\)\s*(.*)$/i)) && ROMAN.test(m[1]) && (m[1].length > 1 || /^i$/i.test(m[1]))) return { marker: `(${m[1]})`, kind: "paren-roman", value: romanValue(m[1]), rest: m[2] };
  if ((m = t.match(/^\(([a-z]{1,2})\)\s*(.*)$/i))) return { marker: `(${m[1]})`, kind: "paren-alpha", value: m[1].toLowerCase().charCodeAt(0) - 96, rest: m[2] };
  if ((m = t.match(/^(\d+)[.)](?:\s+(.*)|$)/))) return { marker: `${m[1]}.`, kind: "arabic", value: Number(m[1]), rest: m[2] ?? "" };
  if ((m = t.match(/^([ivxlcdm]+)\.?(?:\s+(.*)|$)/i)) && ROMAN.test(m[1]) && (m[2] == null || /\.$/.test(t.split(/\s/)[0]))) return { marker: m[1], kind: "roman", value: romanValue(m[1]), rest: m[2] ?? "" };
  if ((m = t.match(/^(-{1,2}[A-Za-z0-9@%#?][\w-]*)(?:\s+(.*)|$)/))) return { marker: m[1], kind: "option", value: null, rest: m[2] ?? "" };
  return null;
}

const expandTabs = (s) => { let out = ""; for (const ch of s) out += ch === "\t" ? " ".repeat(8 - (out.length % 8)) : ch; return out; };

/** Which markup the text is written in — read off its own lines. */
export function markupOf(text) {
  const lines = String(text ?? "").split("\n");
  const wiki = lines.filter((l) => /^=+[^=].*[^=]=+\s*$/.test(l) || /^(\*|#)+\s/.test(l) || /'''|\[\[|\{\{/.test(l)).length;
  const md = lines.filter((l) => /^#{1,6}\s/.test(l) || /\]\(https?:/.test(l)).length;
  return wiki > md && wiki >= 2 ? "wikitext" : md >= 2 ? "markdown" : "plain";
}

// Strip inline markup to the words a reader sees; never invents text.
const inlineWiki = (s) => s
  .replace(/<ref[^>]*\/>/gi, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "").replace(/<[^>]+>/g, "")
  .replace(/\{\{[^{}]*\}\}/g, "").replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1").replace(/\[https?:\S+\s([^\]]*)\]/g, "$1")
  .replace(/'{2,}/g, "").replace(/&nbsp;/g, " ");
const inlineMd = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1").replace(/`([^`]*)`/g, "$1");

/** Raw lines → [{ text, indent, block, heading? level? }] after markup is read. */
function rawLines(text) {
  let t = String(text ?? "").replace(/\r/g, "");
  const markup = markupOf(t);
  if (markup === "wikitext") {
    // Whole-line templates and tables carry no prose of their own.
    let depth = 0; const kept = [];
    for (const l of t.split("\n")) { const open = (l.match(/\{\{/g) ?? []).length, close = (l.match(/\}\}/g) ?? []).length; if (depth > 0 || (open > close && /^\s*\{\{/.test(l))) { depth += open - close; if (depth < 0) depth = 0; continue; } if (/^\s*(\{\||\|\}|\|-|\||!)/.test(l) || /^\[\[(Category|File|Image):/i.test(l)) continue; kept.push(l); }
    t = kept.join("\n");
  }
  if (markup === "markdown") t = t.replace(/^---\n[\s\S]*?\n---\n/, "");
  const out = []; let block = 0, blank = true;
  for (const raw of t.split("\n")) {
    const e = expandTabs(raw).replace(/\s+$/, "");
    if (!e.trim()) { if (!blank) block++; blank = true; continue; }
    blank = false;
    const indent = e.length - e.trimStart().length;
    let s = e.trim(), heading = false, level = null, marked = null;
    if (markup === "wikitext") {
      let m;
      if ((m = s.match(/^(=+)\s*(.*?)\s*=+$/))) { heading = true; level = m[1].length; s = m[2]; }
      else if ((m = s.match(/^([*#:;]+)\s*(.*)$/))) { marked = { marker: m[1], kind: m[1].endsWith("#") ? "arabic" : "bullet", depth: m[1].length }; s = m[2]; }
      s = inlineWiki(s).trim();
    } else if (markup === "markdown") {
      let m;
      if ((m = s.match(/^(#{1,6})\s+(.*)$/))) { heading = true; level = m[1].length; s = m[2]; }
      s = inlineMd(s).trim();
    }
    // A quoted line ("> …", Markdown or a plain-text reply) is read as its own line.
    if (markup !== "wikitext") s = s.replace(/^(>\s*)+/, "").trim();
    if (!s || !/[\p{L}\p{N}]/u.test(s)) continue;
    out.push({ text: s, indent: marked ? marked.depth * 2 : indent, block, heading, level, marked, markup });
  }
  // Auto-numbered wikitext lists count within their run.
  let run = 0, prevDepth = null;
  for (const r of out) { if (r.marked?.kind === "arabic") { run = r.marked.depth === prevDepth ? run + 1 : 1; prevDepth = r.marked.depth; r.marked.value = run; } else { run = 0; prevDepth = null; } }
  return { lines: out, markup };
}

const CLOSE = /[.!?:;,)\]"”’'—–-]$/;
const STRONG = /[.!?]["”’')\]]*$/;

/**
 * elementsOf(text) → EOMedium@1 { markup, elements }
 * Each element: { i, text, cls, marker, markerKind, label, indent, block,
 *   level, words, syllables, first, last, rhyme, end, strong, caps }
 */
export function elementsOf(text) {
  const { lines, markup } = rawLines(text);
  // Hard wrap: a line that does not close and runs into a lowercase line in
  // the same block, at the same or deeper indent, is one authored line.
  const joined = [];
  const allCaps = (x) => { const L = x.replace(/[^A-Za-z]/g, ""); return L.length >= 2 && L === L.toUpperCase(); };
  for (const l of lines) {
    const prev = joined.at(-1);
    const cont = prev && !prev.heading && !allCaps(prev.text) && !l.heading && !l.marked && prev.block === l.block && !CLOSE.test(prev.text) && /^[a-z(]/.test(l.text) && l.indent >= prev.indent && !readMarker(l.text);
    if (cont) prev.text = prev.text.replace(/-$/, "") + (/-$/.test(prev.text) ? "" : " ") + l.text;
    else if (prev && !prev.heading && !allCaps(prev.text) && !l.heading && !l.marked && prev.block === l.block && CLOSE.test(prev.text) && !STRONG.test(prev.text) && /^[a-z]/.test(l.text) && l.indent > prev.indent && !readMarker(l.text)) prev.text += " " + l.text; // a hanging-indent continuation
    else joined.push({ ...l });
  }
  const wordsOf = (s) => s.split(/\s+/).filter(Boolean);
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const typical = median(joined.filter((l) => !l.heading).map((l) => wordsOf(l.text).length)) || 1;
  const blockSize = new Map(); for (const l of joined) blockSize.set(l.block, (blockSize.get(l.block) ?? 0) + 1);
  const elements = joined.map((l, i) => {
    const m = l.marked ? { marker: l.marked.marker, kind: l.marked.kind, value: l.marked.value ?? null, rest: l.text } : readMarker(l.text);
    const body = m ? m.rest : l.text;
    const w = wordsOf(body);
    const next = joined[i + 1];
    const letters = body.replace(/[^A-Za-z]/g, "");
    const caps = letters.length >= 2 && letters === letters.toUpperCase();
    let cls;
    if (l.heading) cls = "heading";
    else if (m && !w.length) cls = "label";
    else if (m) cls = "item";
    else if (!CLOSE.test(body) && (caps || (blockSize.get(l.block) === 1 && next && next.block !== l.block && w.length <= typical))) cls = "heading";
    else cls = "line";
    const lastWord = (body.toLowerCase().replace(/[’']/g, "").match(/[a-z]+/g) ?? []).at(-1) ?? "";
    return {
      i, text: body, cls, marker: m?.marker ?? null, markerKind: m?.kind ?? null, label: m?.value ?? null,
      indent: l.indent, block: l.block, level: l.level ?? null,
      words: w.length, syllables: w.reduce((a, x) => a + syllables(x), 0),
      first: (body.toLowerCase().replace(/[’']/g, "").match(/[a-z]+/) ?? [""])[0], last: lastWord, rhyme: rhymeKeys(lastWord),
      end: (body.match(/[.!?:;,—–]["”’')\]]*$/)?.[0] ?? "").replace(/["”’')\]]/g, ""), strong: STRONG.test(body), caps,
    };
  });
  return { schema: MEDIUM_SCHEMA, markup, elements };
}

/** An element's skeleton: its class, markup level and the shape of its
 *  characters — so "XIV" and "CXXVI" share one, "1." and "112." another. */
export function skeletonOf(e) {
  const shape = e.cls === "label" ? e.markerKind : e.text.replace(/[A-Z]+/g, "A").replace(/[a-z]+/g, "a").replace(/\d+/g, "9").replace(/\s+/g, " ");
  return `${e.cls}${e.level ? `:h${e.level}` : ""}:${shape}`;
}

/**
 * segmentCollection(text) → { units: [{ id, elements }], separator, basis }
 * A collection (a book of sonnets, an act of sections) cut at the separator
 * that recurs: of the label and heading skeletons that occur three times or
 * more, the one that occurs most (ties: the one whose units vary least in
 * size). What precedes the first separator is front matter, left out and
 * counted. A text with no recurring separator is one unit.
 */
export function segmentCollection(text) {
  const { elements, markup } = elementsOf(text);
  const counts = new Map();
  for (const e of elements) if (e.cls === "label" || e.cls === "heading") counts.set(skeletonOf(e), (counts.get(skeletonOf(e)) ?? 0) + 1);
  const cv = (xs) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return m ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) / m : 0; };
  const cut = (sk) => { const units = []; let cur = null; for (const e of elements) { if (skeletonOf(e) === sk) { if (cur?.elements.length) units.push(cur); cur = { id: e.marker ?? e.text, elements: [] }; continue; } if (cur) cur.elements.push(e); } if (cur?.elements.length) units.push(cur); return units; };
  const cands = [...counts].filter(([, n]) => n >= 3).map(([sk, n]) => { const u = cut(sk); return { sk, n, units: u, cv: u.length ? cv(u.map((x) => x.elements.length)) : Infinity }; }).sort((a, b) => b.n - a.n || a.cv - b.cv);
  if (!cands.length) return { units: [{ id: "whole", elements }], separator: null, markup, basis: "no label or heading recurs three times: the text is one unit" };
  const best = cands[0];
  const front = elements.findIndex((e) => skeletonOf(e) === best.sk);
  // Re-index each unit's elements from zero: positions are the unit's own.
  const units = best.units.map((u) => ({ id: u.id, elements: u.elements.map((e, i) => ({ ...e, i })) }));
  return { units, separator: best.sk, markup, basis: `cut at "${best.sk}" (${best.n} occurrences; unit sizes vary ${best.cv.toFixed(2)}); ${front} element(s) of front matter left out` };
}
