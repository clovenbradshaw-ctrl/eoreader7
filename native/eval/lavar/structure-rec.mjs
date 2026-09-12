// structure-rec.mjs — a REC-triggered structure detector: identify a
// document's own heading/chapter convention, escalating only as far as it
// has to.
//
// User direction, verbatim: "develop the def[erred detection of] structure
// system as needed to detect structure and identify it and have this be a
// repeated program used that gets REC'd as needed, using model call as
// needed." Named after this codebase's own existing "REC" (re-zero) idea
// (`packages/engine/loops/atmosphere.js`, documented in eoreader7's
// CLAUDE.md): a mechanism that keeps running on its CURRENT model of the
// material until a measured trigger says that model no longer explains
// what it is seeing, and only THEN re-grounds. This file is the same shape
// applied to chapter-heading detection, which until now was hand-patched
// one book at a time — S102 found Dorian Gray's missing title line and
// fixed the regex by hand; S105-adjacent work (this same session) found
// Frankenstein's Arabic "Chapter 1" and, again, fixed the regex by hand.
// Both fixes were correct, but the PROCESS — a human reads a new book,
// finds the regex doesn't match, edits it — does not scale and is not a
// program. This is the program: three tiers, each tried only if the one
// before it could not settle the question, ending in a local-model witness
// used exactly as `witness-referent.mjs` already established (a
// constrained forced choice, asked twice under a content-free
// perturbation, trusted only on agreement) — never asked to freely invent
// a convention.
//
// TIER 1 — KNOWN CONVENTIONS (mechanical, no model). `heading-
// conventions.json` is a growing, disclosed library: {word, numeralType,
// requiresPeriod} triples this project has actually confirmed against real
// books, not a hand-typed closed class of "everything English prose might
// do". Each is tried; a convention that clears >=2 matches (you cannot
// observe a REPEATING convention from one instance — this is the
// mathematical floor, not a tuned threshold) is a candidate, and the one
// with the most matches wins, on the reasoning that a genuine book-wide
// convention should recur more than an incidental coincidence.
//
// REC TRIGGER: no known convention reaches 2 matches. This is the ONE
// escalation condition in this file, and it is a count, not a guess.
//
// TIER 2 — SKELETON RECURRENCE (mechanical, no model). Candidate heading
// lines are found the cheap way: short, standing alone (a blank line
// immediately before AND after), for real — no model needed to notice
// that a line is short and isolated. Each candidate is reduced to a
// SKELETON (runs of letters -> W, digits -> #, an all-caps-Roman-looking
// token -> @) and grouped; a skeleton with >=2 members is a real
// candidate CONVENTION, proposed mechanically. If that skeleton also
// carries a numeral that increases monotonically in document order across
// its members, that is independent, strong, still-mechanical evidence
// (an incidental repeated phrase does not count upward) and the
// convention is accepted WITHOUT calling the model at all.
//
// TIER 3 — MODEL WITNESS, ONLY WHEN TIER 2's OWN EVIDENCE IS AMBIGUOUS
// (a recurring skeleton with no monotonic numeral to independently confirm
// it). The model is shown the actual candidate lines and asked ONE
// constrained question — do these mark the start of a new
// section/chapter, or are they something else (a refrain, a stage
// direction, a recurring caption)? — forced to answer from a closed set,
// asked twice with the sample lines in reversed order (the same
// content-free perturbation `witness-referent.mjs` already uses), and
// trusted only if both answers agree. A model that flips under a reorder
// is refused exactly as a referent-pick that flips is refused there.
//
// A convention accepted at tier 2 or tier 3 is APPENDED to `heading-
// conventions.json` (never overwriting an existing entry), so the NEXT
// document with the same shape is a tier-1 hit — the "repeated program"
// the user asked for, not a one-off answer forgotten the moment this
// script exits.
//
// usage: node structure-rec.mjs <path-to-document.txt>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB_PATH = path.join(HERE, "heading-conventions.json");
const OLLAMA = "http://localhost:11434";
const MODEL = "gemma2:2b"; // kept small on purpose — [[feedback_local_model_small]]

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function loadLibrary() {
  return JSON.parse(fs.readFileSync(LIB_PATH, "utf8"));
}
function saveLibrary(lib) {
  fs.writeFileSync(LIB_PATH, JSON.stringify(lib, null, 2) + "\n");
}

function buildRegex(conv) {
  const numPattern = conv.numeralType === "roman" ? "[IVXLC]+" : "\\d+";
  const periodPattern = conv.requiresPeriod ? "\\." : "\\.?";
  // `word: null` is a real, distinct shape — a bare numeral heading with no
  // marker word at all (found on Sherlock Holmes: "I." alone, not "CHAPTER
  // I." or "Chapter 1") — not a degenerate case of the word-first form.
  const prefix = conv.word ? `${escapeRe(conv.word)} ` : "";
  // `titleOnSameLine` is a THIRD, independent shape — Sherlock Holmes's own
  // real convention turned out to be neither of the other two: "I. A
  // SCANDAL IN BOHEMIA", numeral and title together on one line, not a
  // title on a following line and not a bare numeral alone.
  if (conv.titleOnSameLine) {
    return new RegExp(`^${prefix}(?<numeral>${numPattern})${periodPattern}[ \\t]+(?<titleLine>\\S[^\\r\\n]*)\\r?\\n`, "gmd");
  }
  return new RegExp(`^${prefix}(?<numeral>${numPattern})${periodPattern}[ \\t]*\\r?\\n(?<titleLine>[^\\r\\n]*)\\r?\\n`, "gmd");
}

// ── THE PROGRAMMATIC DOOR (2026-09-12) ─────────────────────────────────────
// eot-jsonl.mjs and recoverability.mjs both carry their own hand-maintained
// heading regexes that have drifted from this library (S110/S111's fixes
// never crossed to them — LAVAR.md's claim that eot-jsonl "consults
// structure-rec's shared detector directly" was FALSE on this branch,
// found 2026-09-12). This is the one implementation both call: run the
// known-conventions tier, then the mechanical skeleton-recurrence tier
// (NO model tier here — a reader producing a ledger must not depend on a
// local-model witness being reachable), and return the best convention with
// its concrete heading matches. A caller builds its chapter boundaries from
// the hits (real-title check, ordinals, ends) exactly as before.
export function detectAndMatch(raw) {
  const lib = loadLibrary();
  const t1 = tier1(raw, lib);
  if (t1) return { convention: t1.conv, hits: t1.hits.map((h) => ({ start: h.start, numeral: h.numeral, titleLine: h.titleLine, titleLineStart: h.titleLineStart, titleLineEnd: h.titleLineEnd })) };
  const t2 = tier2(raw);
  if (!t2) return { convention: null, hits: [] };
  if (!t2.monotonic) return { convention: null, hits: [] };
  const parsed = deriveConvention(t2.group.members[0].text);
  if (!parsed) return { convention: null, hits: [] };
  const consistent = t2.group.members.every((m) => {
    const p = deriveConvention(m.text);
    return p && p.word === parsed.word && p.numeralType === parsed.numeralType && p.requiresPeriod === parsed.requiresPeriod && p.titleOnSameLine === parsed.titleOnSameLine;
  });
  if (!consistent) return { convention: null, hits: [] };
  const conv = { name: `${parsed.word ? parsed.word + " " : ""}<${parsed.numeralType}>${parsed.requiresPeriod ? "." : ""}`, ...parsed, foundIn: path.basename(process.argv[2] ?? ""), foundVia: "mechanical (skeleton recurrence + monotonic numeral)" };
  if (!lib.conventions.some((c) => c.word === conv.word && c.numeralType === conv.numeralType && c.requiresPeriod === conv.requiresPeriod && Boolean(c.titleOnSameLine) === Boolean(conv.titleOnSameLine))) {
    lib.conventions.push(conv);
    saveLibrary(lib);
  }
  const hits = [];
  const re = buildRegex(conv);
  let m;
  while ((m = re.exec(raw))) hits.push({
    start: m.index,
    numeral: m.groups.numeral,
    titleLine: m.groups.titleLine,
    titleLineStart: m.indices.groups.titleLine[0],
    titleLineEnd: m.indices.groups.titleLine[1],
  });
  return { convention: conv, hits };
}

// Turn one sample candidate line into a convention's own {word,
// numeralType, requiresPeriod, titleOnSameLine} shape — done by PARSING
// the line into its parts, never by taking the first letter-run as "the
// word" regardless of what it actually is. That naive version was wrong
// on its very first real test: Sherlock Holmes's own "I. A SCANDAL IN
// BOHEMIA" heading has no marker word at all, and `/^[\p{L}]+/` matched
// "I" itself (a Roman numeral is made of letters) and proposed a
// convention with word:"I" — nonsense. Three real shapes are recognized,
// tried in this order so a bare numeral or a real word-first heading is
// never miscategorized as carrying a same-line title; anything else is
// disclosed as unhandled rather than guessed at.
function deriveConvention(sampleText) {
  const wordFirst = sampleText.match(/^([A-Za-z]+)\s+([IVXLC]+|\d+)\.?\s*$/);
  if (wordFirst) {
    const isRoman = /^[IVXLC]+$/.test(wordFirst[2]);
    return { word: wordFirst[1], numeralType: isRoman ? "roman" : "arabic", requiresPeriod: /\.\s*$/.test(sampleText), titleOnSameLine: false };
  }
  const bareNumeral = sampleText.match(/^([IVXLC]+|\d+)\.?\s*$/);
  if (bareNumeral) {
    const isRoman = /^[IVXLC]+$/.test(bareNumeral[1]);
    return { word: null, numeralType: isRoman ? "roman" : "arabic", requiresPeriod: /\.\s*$/.test(sampleText), titleOnSameLine: false };
  }
  // "numeral. TITLE" — the numeral and its title share one line. Tried
  // last, and only matches when the first two (nothing after the numeral,
  // or a word before it) both fail, so a real bare numeral or word-first
  // heading is never miscategorized as carrying a same-line title.
  const numeralWithTitle = sampleText.match(/^([IVXLC]+|\d+)(\.?)\s+\S/);
  if (numeralWithTitle) {
    const isRoman = /^[IVXLC]+$/.test(numeralWithTitle[1]);
    return { word: null, numeralType: isRoman ? "roman" : "arabic", requiresPeriod: numeralWithTitle[2] === ".", titleOnSameLine: true };
  }
  return null;
}

function tryConvention(raw, conv) {
  const re = buildRegex(conv);
  const hits = [];
  let m;
  while ((m = re.exec(raw))) hits.push({ start: m.index, numeral: m.groups.numeral, titleLine: m.groups.titleLine, titleLineStart: m.indices.groups.titleLine[0], titleLineEnd: m.indices.groups.titleLine[1] });
  return hits;
}

// TIER 1
function tier1(raw, lib) {
  let best = null;
  for (const conv of lib.conventions) {
    const hits = tryConvention(raw, conv);
    if (hits.length >= 2 && (!best || hits.length > best.hits.length)) best = { conv, hits };
  }
  return best;
}

// TIER 2 — candidate lines: short, blank-bounded on both sides, and NOT
// quoted dialogue. "Short and standing alone" is not enough on its own —
// found running this against real dialogue-heavy prose (Sherlock Holmes):
// a one-line paragraph of quoted speech ("“Frequently.”", "“How often?”")
// is exactly as short and exactly as blank-bounded as a real heading, and
// there are FAR more of them — the ten largest skeleton groups in that
// text were all quoted dialogue, none a heading, and one of them (44
// members) beat every real heading group in size. A heading is not quoted;
// this is a real, near-universal typographic distinction in this
// tradition, not a hand-tuned threshold, and it is cheap to check.
const QUOTE_CHARS = /^[“"'‘]|[”"'’]$/;
// This length cutoff is a heuristic, disclosed as one rather than dressed
// up as measured: it exists only to keep candidate-scanning away from
// obvious full paragraphs (typically several hundred characters), not to
// distinguish real headings from anything else — that work is the quote
// filter and the skeleton/monotonic-numeral checks below. Found too tight
// on the first real test: "IX. THE ADVENTURE OF THE ENGINEER'S THUMB" (43
// chars) was silently dropped, breaking what should have been an 11-of-12
// group into 10. Set generously loose instead of re-tuned to fit one book.
const MAX_CANDIDATE_LINE_LENGTH = 80;
function candidateLines(raw) {
  const lines = raw.split(/\r?\n/);
  const out = [];
  let offset = 0;
  const starts = lines.map((l) => { const s = offset; offset += l.length + 1; return s; });
  for (let i = 1; i < lines.length - 1; i += 1) {
    const line = lines[i].trim();
    if (!line || line.length > MAX_CANDIDATE_LINE_LENGTH) continue;
    if (lines[i - 1].trim() !== "" || lines[i + 1].trim() !== "") continue;
    if (QUOTE_CHARS.test(line)) continue;
    out.push({ index: i, start: starts[i], text: line });
  }
  return out;
}

// Skeleton: a letter-run becomes W, a digit-run becomes #, a bare
// Roman-numeral-shaped token (I, IV, XII, ...) becomes @ — checked before
// the general letter-run rule so a Roman numeral does not just become W.
// Found wrong on the real test: an early version kept one "W" per WORD, so
// "VI. THE MAN WITH THE TWISTED LIP" (6 title words) and "I. A SCANDAL IN
// BOHEMIA" (4 title words) skeletonized DIFFERENTLY and landed in separate
// groups — fragmenting Sherlock Holmes's own single real convention
// ("numeral. TITLE", any length) into a dozen small buckets, several of
// which lost to unrelated quoted-dialogue groups by member count. A
// title's actual word count is never part of the convention — the same
// reason eot-jsonl.mjs's own heading regex captures a title line as
// `[^\n]*`, arbitrary content, rather than counting words in it. A run of
// consecutive word-tokens (with the punctuation/spacing between them) is
// collapsed to ONE placeholder, so "numeral. <any title>" is one skeleton
// regardless of length.
function skeletonOf(line) {
  return line
    .replace(/\b[IVXLC]+\b/g, "@")
    .replace(/\d+/g, "#")
    .replace(/\p{L}+/gu, "W")
    .replace(/(?:W[^\p{L}@#]*)+/gu, "W")
    .trim();
}

function romanToInt(s) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let total = 0;
  for (let i = 0; i < s.length; i += 1) {
    const v = map[s[i]];
    const next = map[s[i + 1]];
    total += next && v < next ? -v : v;
  }
  return total;
}

function numeralValue(text) {
  const arabic = text.match(/\d+/);
  if (arabic) return Number(arabic[0]);
  const roman = text.match(/\b[IVXLC]+\b/);
  if (roman) return romanToInt(roman[0]);
  return null;
}

function isMonotonic(values) {
  if (values.some((v) => v === null)) return false;
  for (let i = 1; i < values.length; i += 1) if (values[i] <= values[i - 1]) return false;
  return true;
}

function tier2(raw) {
  const cands = candidateLines(raw);
  const bySkeleton = new Map();
  for (const c of cands) {
    const sk = skeletonOf(c.text);
    (bySkeleton.get(sk) ?? bySkeleton.set(sk, []).get(sk)).push(c);
  }
  const groups = [...bySkeleton.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([skeleton, members]) => ({ skeleton, members: members.sort((a, b) => a.start - b.start) }));
  // Prefer the group with the most members — the genuine book-wide
  // convention should recur more than an incidental one.
  groups.sort((a, b) => b.members.length - a.members.length);
  for (const g of groups) {
    const values = g.members.map((m) => numeralValue(m.text));
    if (isMonotonic(values)) return { group: g, monotonic: true, values };
  }
  return groups.length ? { group: groups[0], monotonic: false, values: null } : null;
}

// TIER 3 — model witness, same discipline as witness-referent.mjs: a
// closed-set forced choice, asked twice under a content-free reorder,
// trusted only on agreement.
const OPTIONS = [
  "A: these lines each mark the start of a new chapter or numbered section",
  "B: these lines are something else — a repeated refrain, a caption, a speaker label, or other non-structural recurring text",
];
function buildMessages(sample, options) {
  const list = options.map((o, i) => `${i + 1}. ${o}`).join("\n");
  return [
    {
      role: "system",
      content:
        `You are given several short lines pulled from a document, each one standing alone between blank lines. ` +
        `Decide which of the two descriptions below best fits ALL of them as a group. ` +
        `Answer with the NUMBER only. Do not explain.`,
    },
    { role: "user", content: `Lines:\n${sample.map((s) => `- "${s}"`).join("\n")}\n\nDescriptions:\n${list}` },
  ];
}
async function ask(messages) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL, messages, stream: false,
      format: { type: "object", properties: { pick: { type: "integer" } }, required: ["pick"] },
      options: { num_predict: 20 },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = await res.json();
  try { const p = JSON.parse(data.message.content); return Number.isInteger(p.pick) ? p.pick : null; }
  catch { return null; }
}
async function tier3(group) {
  const sample = group.members.slice(0, 6).map((m) => m.text);
  const forward = OPTIONS;
  const reversed = [...OPTIONS].reverse();
  const [p1, p2] = await Promise.all([ask(buildMessages(sample, forward)), ask(buildMessages([...sample].reverse(), reversed))]);
  const a1 = p1 === 1 ? forward[0] : p1 === 2 ? forward[1] : null;
  const a2 = p2 === 1 ? reversed[0] : p2 === 2 ? reversed[1] : null;
  if (!a1 || !a2) return { verdict: "unreadable", a1, a2 };
  if (a1 !== a2) return { verdict: "order-sensitive — refused", a1, a2 };
  return { verdict: a1.startsWith("A") ? "structural — confirmed" : "not structural — confirmed", a1, a2 };
}

// ── main ────────────────────────────────────────────────────────────────
// The CLI is a STANDALONE door, guarded by the import check — the exact
// guard S111's record says this file already had and its own missing-import-
// guard bug (the reason a "usage:" exit fired against a CALLER's argv) warns
// was once fixed here and has regressed. Found live 2026-09-12: importing
// this module from eot-jsonl.mjs ran the CLI main UNCONDITIONALLY — process
//.exit(0) on a tier-1 hit killed the reader mid-read (its first book under
// the shared detector read nothing and wrote no ledger). The programmatic
// door is detectAndMatch (above); this block runs only when the file is the
// entry point.
if (import.meta.url === `file://${process.argv[1]}`) {
const bookPath = process.argv[2];
if (!bookPath) { console.error("usage: node structure-rec.mjs <path-to-document.txt>"); process.exit(1); }
const raw = fs.readFileSync(bookPath, "utf8");
const lib = loadLibrary();

const t1 = tier1(raw, lib);
if (t1) {
  console.log(`TIER 1 (mechanical, known convention): "${t1.conv.name}" — ${t1.hits.length} matches. No model call.`);
  process.exit(0);
}

console.log(`REC FIRED: no known convention (${lib.conventions.map((c) => c.name).join(", ")}) reached 2 matches. Escalating.`);
const t2 = tier2(raw);
if (!t2) {
  console.log("TIER 2: no recurring skeleton found at all (no >=2 short, blank-bounded lines share a shape). Refusing — no structure asserted.");
  process.exit(2);
}

console.log(`TIER 2 (mechanical, skeleton recurrence): skeleton "${t2.group.skeleton}", ${t2.group.members.length} members, sample: ${t2.group.members.slice(0, 3).map((m) => JSON.stringify(m.text)).join(", ")}`);
if (t2.monotonic) {
  console.log(`Numeral sequence is monotonic (${t2.values.join(" < ")}) — accepted mechanically, WITHOUT a model call.`);
  const parsed = deriveConvention(t2.group.members[0].text);
  if (!parsed) {
    console.log(`Could not parse the sample line ("${t2.group.members[0].text}") into a known shape (word-first or bare-numeral) — refusing to guess a regex for it. Disclosed, not fixed.`);
    process.exit(3);
  }
  const newConv = {
    name: `${parsed.word ? parsed.word + " " : ""}<${parsed.numeralType}>${parsed.requiresPeriod ? "." : ""}`,
    ...parsed,
    foundIn: path.basename(bookPath), foundVia: "mechanical (skeleton recurrence + monotonic numeral)",
    dateFound: new Date().toISOString().slice(0, 10),
  };
  // Every member of the group must actually re-parse to this SAME shape —
  // the numeral being monotonic doesn't by itself guarantee every sibling
  // line has the identical word/period shape the first one happened to.
  const consistent = t2.group.members.every((m) => {
    const p = deriveConvention(m.text);
    return p && p.word === newConv.word && p.numeralType === newConv.numeralType && p.requiresPeriod === newConv.requiresPeriod && p.titleOnSameLine === newConv.titleOnSameLine;
  });
  if (!consistent) {
    console.log("The group's own members do not all parse to the same shape — refusing rather than deriving from one member alone.");
    process.exit(3);
  }
  if (!lib.conventions.some((c) => c.word === newConv.word && c.numeralType === newConv.numeralType && c.requiresPeriod === newConv.requiresPeriod && Boolean(c.titleOnSameLine) === Boolean(newConv.titleOnSameLine))) {
    lib.conventions.push(newConv);
    saveLibrary(lib);
    console.log(`Appended new convention to heading-conventions.json: ${JSON.stringify(newConv)}`);
  } else {
    console.log("This exact convention is already in the library (tier 1 should have caught it — worth checking why it didn't).");
  }
  process.exit(0);
}

console.log("No monotonic numeral in this group — ambiguous. Escalating to tier 3 (model witness).");
const verdict = await tier3(t2.group);
console.log(`TIER 3: forward=${verdict.a1 ?? "unreadable"} reversed=${verdict.a2 ?? "unreadable"} -> ${verdict.verdict}`);
if (verdict.verdict === "structural — confirmed") {
  console.log("Model confirms this is a structural convention, but it carries no numeral this script can build a chapter-ordinal regex from — naming it on the record, not silently promoting it into a numbered-chapter convention it isn't.");
} else {
  console.log("Refusing to assert a structural convention for this document.");
}
}
