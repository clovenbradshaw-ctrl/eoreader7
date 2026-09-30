// priors-ground.js — THE RECEIVED GROUND: passages of live_priors that carry an ask (2026-09-30).
//
// "There is no view from nowhere; go build the ground to grow from" (user direction). When nothing handed over carries
// an ask, the next place to stand is the received corpus — live_priors, ~2,100 public-domain and open texts with
// provenance — and every claim written from it must be LOCATED: a file, and a byte range in it.
//
// THE UNIT IS THE PASSAGE, NOT THE DOCUMENT. Measured 2026-09-30 against the real corpus (938 MB): "a document carries
// the ask when it holds most of its words" ranks a file of Guardian cryptic clues and Ulysses as 8-of-8 matches for a
// bicycle-freewheel question — a large document holds every common word somewhere. A passage carries the ask when its
// words occur TOGETHER: more than half of the ask's content words in one paragraph (one line, for a file with no
// paragraph breaks — structure, not a number). The same definition of "carries" as ground-carries.js, at the grain
// where it means something.
//
// Retrieval is two-level and cached. Level 1 answers "which documents mention this word at all" with one pass over the
// corpus per NEW word, remembered in a cache file keyed by a fingerprint of the corpus (path, size, mtime of every
// eligible file) — so the ground is found once and kept, and a changed corpus is re-read, never trusted stale. Level 2
// reads only the candidate documents (those mentioning more than half the ask's words) and tests their passages. The
// cache lives OUTSIDE the corpus; this module never writes into live_priors.
//
// "CARRIES" IS MORE THAN HALF OF THE EVIDENCE, NOT MORE THAN HALF OF THE WORDS. A word is evidence of a subject in
// proportion to how rare it is in this corpus: its weight is ln(1 + N/df), N the documents, df the documents that
// mention it — a count Level 1 already makes. Measured 2026-09-30: for "the continuum hypothesis and the sizes of
// infinite sets", a machine-learning paragraph about a test set carried three of the five words ("hypothesis", "size",
// "set") and was a false carrier, because "set" is in 1,132 documents and "continuum" in 47. By weight it carries under
// half of the subject; the encyclopedia passage that holds "continuum", "hypothesis", "infinite" and "set" carries most.
//
// PASSAGES. A blank-line paragraph is a passage — except a block whose lines MOSTLY end in terminal punctuation, which is
// a list of complete units (one clue, one sentence, one entry per line) and is read by the line. Hard-wrapped prose
// (most lines end mid-sentence) stays one passage. The real cryptic-clues file is one 10 MB block of 142,381 lines of
// which 142,383 of 142,407 end in a full stop or a bracket: read as a paragraph it "carried" every ask; by the line it
// carries none. A single unbroken line is one passage, however long (stated limit).
//
// So a passage carries an ask when it carries more than half of its words, more than half of its evidence, and its most
// surprising attested word — three conditions, each from a failure measured on the real corpus (see the code).
//
// FROM A PASSAGE TO A PLACE TO STAND: the passage is what was found; the ground is the section it sits in (sectionOf). Measured
// 2026-09-30: the one passage found for the continuum ask was 346 characters and the pipeline's own ground gate reported "Ground
// not licensed"; its section, between two headings of the same article, is ~1,900 characters of coherent text. The address is
// the section's; the passage's own range is kept as passageStart/passageEnd.
//
// Selection is the best passage of each document that has one, most recurrence-weighted evidence first: a source is the unit of provenance,
// and two sources that agree are worth more than one source repeated. No top-N, no threshold. A passage is returned with
// its address (label/relative-path#start-end), its exact text, and the words it carries; text.slice(start, end) of the
// file IS the passage.
//
// Scope, stated: word forms are draftWords' stems (the engine's English prior — see ground-carries.js); eligibility is by
// directory (numbered category folders) and extension (.txt, .md), which excludes the repo's own manifests, scripts and
// derived sidecars. A corpus that keeps sources elsewhere is not searched.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { draftWords } from "./eot-draft.js";
import { subjectWordsOf } from "./ground-carries.js";

export const PRIORS_GROUND_SCHEMA = "EOPriorsGround@1";

const CATEGORY = /^\d\d-/;
const EXT = /\.(txt|md)$/i;
const DERIVED = /(\.cv\.md|\.structure\.json)$/i;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every eligible file under the roots: [{ abs, rel, label, size, mtimeMs }], sorted by label then rel. */
export function listEligible(roots) {
  const out = [];
  for (const { dir, label } of roots) {
    let tops = []; try { tops = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    const walk = (abs, rel) => {
      let ents = []; try { ents = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const a = path.join(abs, e.name), r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) { if (!e.name.startsWith(".") && e.name !== "node_modules") walk(a, r); }
        else if (e.isFile() && EXT.test(e.name) && !DERIVED.test(e.name)) { try { const st = fs.statSync(a); out.push({ abs: a, rel: r, label, size: st.size, mtimeMs: Math.round(st.mtimeMs) }); } catch {} }
      }
    };
    for (const t of tops) if (t.isDirectory() && CATEGORY.test(t.name)) walk(path.join(dir, t.name), t.name);
  }
  return out.sort((a, b) => (a.label + "/" + a.rel).localeCompare(b.label + "/" + b.rel));
}

export const fingerprintOf = (files) => crypto.createHash("sha1").update(files.map((f) => `${f.label}/${f.rel}|${f.size}|${f.mtimeMs}`).join("\n")).digest("hex");

const TERMINAL = /[.!?…)\]"'\u201d\u2019\u00bb]\s*$/;

// blank-line separated blocks, with offsets: [[start, end], ...]
const blocksOf = (text) => { const out = []; const r = /\n[ \t\r]*\n/g; let last = 0, m; while ((m = r.exec(text))) { if (m.index > last) out.push([last, m.index]); last = m.index + m[0].length; } if (last < text.length) out.push([last, text.length]); return out; };
// a heading: a one-line block that does not end in terminal punctuation (structure, not a number)
// Page furniture — a block that is only a bracketed token ("[ edit ]") — is neither a heading nor content: it does not open
// or close a section, and a section's ends are trimmed of it.
const isFurniture = (text, [s0, e0]) => /^\[[^\]]*\]$/.test(text.slice(s0, e0).trim());
const isHeading = (text, [s0, e0]) => { const b = text.slice(s0, e0); return !b.includes("\n") && b.trim() !== "" && !TERMINAL.test(b) && !isFurniture(text, [s0, e0]); };

/**
 * sectionOf(text, start, end) → { start, end }: the passage's SECTION — the blocks between the nearest heading above it and
 * the next heading below it, headings excluded. Only a passage that is a whole paragraph under a heading expands; a line
 * of a list, or a document with no heading above the passage, is returned as it is (a book is not one section).
 */
export function sectionOf(text, start, end) {
  const blocks = blocksOf(text);
  const i = blocks.findIndex(([s0, e0]) => s0 === start && e0 === end);
  if (i < 0) return { start, end };
  let a = i; while (a > 0 && !isHeading(text, blocks[a - 1])) a--;
  if (a === 0 || !isHeading(text, blocks[a - 1])) return { start, end };
  let b = i; while (b < blocks.length - 1 && !isHeading(text, blocks[b + 1])) b++;
  while (a < i && isFurniture(text, blocks[a])) a++;
  while (b > i && isFurniture(text, blocks[b])) b--;
  return { start: blocks[a][0], end: blocks[b][1] };
}

/**
 * passagesOf(text) → [{ start, end, text }]. A blank-line paragraph is a passage; a block of two or more lines most of
 * which end in terminal punctuation is read by the line. Offsets index the string as given: text.slice(start, end) is
 * the passage.
 */
export function passagesOf(text) {
  const out = [];
  const blocks = []; { const r = /\n[ \t\r]*\n/g; let last = 0, m; while ((m = r.exec(text))) { if (m.index > last) blocks.push([last, m.index]); last = m.index + m[0].length; } if (last < text.length) blocks.push([last, text.length]); }
  for (const [bs, be] of blocks) {
    const block = text.slice(bs, be);
    const lines = []; { let at = 0; for (const ln of block.split("\n")) { lines.push([bs + at, bs + at + ln.length, ln]); at += ln.length + 1; } }
    const ended = lines.filter(([, , ln]) => TERMINAL.test(ln)).length;
    if (lines.length >= 2 && ended * 2 > lines.length) { for (const [s0, e0, ln] of lines) if (ln.trim()) out.push({ start: s0, end: e0, text: ln }); }
    else if (block.trim()) out.push({ start: bs, end: be, text: block });
  }
  return out;
}

const readCache = (file, fingerprint) => {
  try { const c = JSON.parse(fs.readFileSync(file, "utf8")); if (c.fingerprint === fingerprint) return c; } catch {}
  return { fingerprint, words: {} };
};
const writeCache = (file, cache) => {
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(cache)); fs.renameSync(tmp, file); } catch {}
};

/**
 * findPriorsGround({ topic, roots, cacheFile, yieldFn }) → EOPriorsGround@1
 *   roots      [{ dir, label }]        e.g. [{ dir: ".../live_priors", label: "live_priors" }]
 *   cacheFile  where word → documents is remembered (outside the corpus)
 *   yieldFn    awaited between files so a long scan never starves the server
 */
export async function findPriorsGround({ topic, roots = [], cacheFile = null, yieldFn = null } = {}) {
  const t0 = Date.now();
  const words = subjectWordsOf(topic);
  const base = { schema: PRIORS_GROUND_SCHEMA, words, passages: [], candidateDocs: 0 };
  if (!words.length) return { ...base, mode: "no-subject", scanned: { files: 0, newWords: [], cached: true, ms: 0 }, basis: "the ask names no subject: nothing to look for" };
  const files = listEligible(roots);
  if (!files.length) return { ...base, mode: "no-corpus", scanned: { files: 0, newWords: [], cached: false, ms: Date.now() - t0 }, basis: "no received corpus was found to search" };

  // Level 1 — which documents mention each word. One pass over the corpus for the words the cache does not yet hold.
  const fingerprint = fingerprintOf(files);
  const cache = cacheFile ? readCache(cacheFile, fingerprint) : { fingerprint, words: {} };
  const missing = words.filter((w) => !(w in cache.words));
  if (missing.length) {
    const found = Object.fromEntries(missing.map((w) => [w, []]));
    const res = Object.fromEntries(missing.map((w) => [w, new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}`, "u")]));
    for (let i = 0; i < files.length; i++) {
      let lower; try { lower = fs.readFileSync(files[i].abs, "utf8").toLowerCase(); } catch { continue; }
      for (const w of missing) if (lower.includes(w) && res[w].test(lower)) found[w].push(i);
      if (yieldFn && i % 8 === 0) await yieldFn();
    }
    Object.assign(cache.words, found);
    if (cacheFile) writeCache(cacheFile, cache);
  }
  // Each word's weight: how surprising its presence is in THIS corpus. A subject is carried when more than half of its
  // total weight is carried — a generic word cannot make a passage relevant, a rare one can.
  const N = files.length;
  const weight = Object.fromEntries(words.map((w) => [w, Math.log(1 + N / Math.max(1, (cache.words[w] ?? []).length))]));
  const total = words.reduce((n, w) => n + weight[w], 0);
  const weigh = (ws) => ws.reduce((n, w) => n + weight[w], 0);
  // THE ANCHOR: the ask's most surprising word that the corpus actually attests. A passage that carries more than half of
  // the evidence without it is about something else — measured 2026-09-30: a paragraph on black boxes in cybernetics holds
  // "bicycle", "pedal", "wheel" and "let" (most of the evidence of the bicycle-freewheel ask) and never says "freewheel".
  const present = words.filter((w) => (cache.words[w] ?? []).length > 0);
  const anchor = present.length ? present.reduce((a, b) => (weight[b] > weight[a] ? b : a)) : null;
  // THREE CONDITIONS, each from a measured failure: more than half of the WORDS (two rare words that meet by coincidence
  // are not a subject: "continuum" + "hypothesis" in a relativity paper and a creole survey; "spinning" + "top" in a novel
  // and a cryptic clue), more than half of the EVIDENCE (a generic word cannot make a passage relevant), and the ANCHOR.
  const carriesEnough = (ws) => !!anchor && ws.includes(anchor) && ws.length * 2 > words.length && weigh(ws) * 2 > total;

  const perDoc = new Map();
  for (const w of words) for (const i of cache.words[w] ?? []) { if (!perDoc.has(i)) perDoc.set(i, []); perDoc.get(i).push(w); }
  const candidates = [...perDoc.entries()].filter(([, ws]) => carriesEnough(ws)).sort((a, b) => weigh(b[1]) - weigh(a[1]) || a[0] - b[0]).map(([i]) => files[i]);

  // Level 2 — in each candidate document, its best passage, if more than half of the evidence is carried together.
  const best = [];
  for (const f of candidates) {
    let text; try { text = fs.readFileSync(f.abs, "utf8"); } catch { continue; }
    let top = null;
    for (const p of passagesOf(text)) {
      const low = p.text.toLowerCase();
      const maybe = words.filter((w) => low.includes(w));
      if (!carriesEnough(maybe)) continue;
      const pw = draftWords(p.text), has = new Set(pw);
      const carries = words.filter((w) => has.has(w));
      if (!carriesEnough(carries)) continue;
      // WHICH carrying passage: by RECURRENCE, not presence. Presence made a 42-word paragraph on rotorcraft — "Just as a
      // bicycle's wheels must be able to rotate faster than the pedals…" — outrank the paragraph that is about bicycle freewheels,
      // because it held six of the eight words once. A subject a passage is about recurs in it: the rank is the evidence summed
      // with each word counted ln(1 + occurrences) times (sublinear, so repetition cannot run away). Measured on the real
      // Wikipedia "Freewheel" page: bicycle-mechanism 22.9, history 21.1, rotorcraft 20.2 (by presence the rotorcraft paragraph won).
      const tf = new Map(); for (const w of pw) tf.set(w, (tf.get(w) ?? 0) + 1);
      const score = words.reduce((n, w) => n + (tf.get(w) ? weight[w] * Math.log(1 + tf.get(w)) : 0), 0);
      if (!top || score > top.score) { const sec = sectionOf(text, p.start, p.end); top = { id: `priors:${f.label}/${f.rel}#${sec.start}-${sec.end}`, label: f.label, rel: f.rel, start: sec.start, end: sec.end, passageStart: p.start, passageEnd: p.end, text: text.slice(sec.start, sec.end), carries, score }; }
    }
    if (top) best.push(top);
    if (yieldFn) await yieldFn();
  }
  const passages = best.sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));
  const covered = new Set(passages.flatMap((p) => p.carries));

  const docs = new Set(passages.map((p) => `${p.label}/${p.rel}`)).size;
  return {
    schema: PRIORS_GROUND_SCHEMA, mode: passages.length ? "carried" : "not-carried", words, anchor, weights: weight, passages, candidateDocs: candidates.length,
    scanned: { files: files.length, newWords: missing, cached: missing.length === 0, ms: Date.now() - t0 },
    basis: passages.length
      ? `${passages.length} passage(s), the best of each of ${docs} document(s) of the received corpus, carry more than half of the ask's evidence together (${[...covered].join(", ")})`
      : `no passage of the received corpus (${files.length} documents searched, ${candidates.length} mention the ask's anchor word${anchor ? ` \u201c${anchor}\u201d` : ""} with more than half of its evidence) carries more than half of it together with that word`,
  };
}

// ── THE GROUND GROWS (2026-09-30) ──────────────────────────────────────────────────────────────────────────────────────
// What a consented web hunt earned — pages that passed admission for this ask — is kept, so the next ask of the same
// subject finds it in the received ground and goes nowhere. It lives in its OWN root (the proxy's state/, never inside
// live_priors), in a numbered category directory so listEligible sees it, one file per source URL. The manifest
// (earned.jsonl, beside the category directory, so it is never itself searched) records where each page came from, which
// ask earned it, when, and the sha1 of the text kept: provenance stays with the page. A URL is data, never a path — the
// filename is a slug of it plus its own hash, so a hostile URL keeps its page inside the directory. The same page twice
// is one file and one manifest line; a changed page replaces the file and adds a line, so the manifest shows both.
const EARNED_DIR = "90-earned";
const slugOf = (url) => String(url).toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/*/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "page";

/**
 * persistEarnedGround({ dir, docs, task, at }) → { written: [{ rel, url, sha1, changed }] }
 *   dir   the earned root (a directory this module may write; never the corpus repo)
 *   docs  [{ url, text }]  pages already admitted for this ask
 */
export function persistEarnedGround({ dir, docs = [], task = null, at = new Date().toISOString() } = {}) {
  const sub = path.join(dir, EARNED_DIR);
  fs.mkdirSync(sub, { recursive: true });
  const manifestFile = path.join(dir, "earned.jsonl");
  let known = new Map();
  try { for (const l of fs.readFileSync(manifestFile, "utf8").split("\n")) if (l.trim()) { const m = JSON.parse(l); known.set(m.url, m.sha1); } } catch {}
  const written = [];
  for (const d of docs) {
    const text = String(d?.text ?? ""), url = String(d?.url ?? "");
    if (!url || !text.trim()) continue;
    const sha1 = crypto.createHash("sha1").update(text).digest("hex");
    const rel = `${EARNED_DIR}/${slugOf(url)}-${crypto.createHash("sha1").update(url).digest("hex").slice(0, 10)}.txt`;
    const changed = known.get(url) !== sha1;
    if (changed) {
      fs.writeFileSync(path.join(dir, rel), text);
      fs.appendFileSync(manifestFile, JSON.stringify({ schema: "EOEarnedGround@1", url, rel, sha1, chars: text.length, task, at }) + "\n");
      known.set(url, sha1);
    }
    written.push({ rel, url, sha1, changed });
  }
  return { written };
}

// ── THE ASK AS A STEER (2026-09-30, the archon poll: "provenance is not answer-hood") ──────────────────────────────────────
// The window handed to the mouth was chosen by the plan cell's own terms, with the ask's words stripped as material variance: the
// jobs shipped the disc-tooth description of the real Freewheel section and never the pedals or the pawl, because those sentences
// carry the ask and not the cell. makeAskEvidence scores a text by the same recurrence-weighted evidence priors-ground uses to
// choose a passage — Σ weight × ln(1 + occurrences) over the ask's content words — so the window can be ORDERED by how much of the
// ask a ground sentence carries. It steers which span is handed; it adds no word to the text. Weights are the corpus's (from the
// found-for result) when given, else uniform.
export function makeAskEvidence(topic, weights = null) {
  const words = subjectWordsOf(topic);
  return (text) => {
    if (!words.length) return 0;
    const tf = new Map(); for (const w of draftWords(String(text ?? ""))) tf.set(w, (tf.get(w) ?? 0) + 1);
    return words.reduce((n, w) => n + (tf.get(w) ? (weights?.[w] ?? 1) * Math.log(1 + tf.get(w)) : 0), 0);
  };
}
