// period-parse.mjs — how the English parser holds up on period English,
// measured without a period treebank. Handle: Sullivan.
//
// THE GAP (2026-09-23): the parser's competence is known only on 21st-
// century web English (english-parser.test.mjs, UD_English-EWT held-out:
// word class 95.2, head 81.2, recorded 2026-09-21). Sullivan teaches on the
// Renaissance stage, and no Early Modern English treebank is on disk.
//
// THE MEASUREMENT IS A CONTROLLED PAIR, NOT A GOLD. The same play exists in
// two spellings — Henry IV Part 1 as printed in the 1623 First Folio and in a
// modern-spelling edition — with the same words in the same order and
// largely the same line breaks. Parse both; align them (lines by content,
// then words within aligned lines, by a generic character-bigram likeness —
// no period spelling rules are typed in); compare the two readings of every
// aligned word. Where they differ, spelling and punctuation alone moved the
// parser. The modern parse is the REFERENCE (it is the register the parser
// was measured on), never a gold: agreement estimates how much of the
// parser's modern-text competence survives a change of spelling. It says
// nothing about period GRAMMAR (thou art, inversions) — both editions share
// that, so it cancels out of the pair. That part still needs a gold.
//
// A NULL for word class: the Folio tags shuffled among the aligned pairs —
// the agreement two unrelated readings with the same tag mix would reach.
//
//   node native/eval/lavar/period-parse.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, parseText } from "../../adapters/text/english-parser.js";
import { lcg, shuffled } from "../../kernel/rng.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
export const MODEL = path.join(ROOT, "native", "priors", "parser-eng-ewt.json");
const LIVE = path.resolve(ROOT, "..", "live_priors", "15-western-canon", "first-folio");
export const MODERN = path.join(LIVE, "henry-iv-part-1-modern.txt");
export const FOLIO = path.join(LIVE, "henry-iv-part-1.txt");

const bodyOf = (p) => { const raw = fs.readFileSync(p, "utf8"); return raw.slice(raw.indexOf("\n\n") + 2); };
const norm = (w) => w.toLowerCase().replace(/[’']/g, "'");
const bigrams = (w) => { const s = new Set(); for (let i = 0; i < w.length - 1; i += 1) s.add(w.slice(i, i + 2)); return s; };
/** A generic spelling-likeness: identical, or character-bigram Dice >= 0.5.
 *  (A memoised version gave identical results and ran slower — measured.) */
export function alike(a, b) {
  if (a === b) return true;
  if (!/\p{L}/u.test(a) || !/\p{L}/u.test(b)) return false;
  const A = bigrams(a), B = bigrams(b);
  if (!A.size || !B.size) return false;
  let shared = 0; for (const g of A) if (B.has(g)) shared += 1;
  return (2 * shared) / (A.size + B.size) >= 0.5;
}

/** Parse a text into word rows, each with its sentence, line and parse. */
function parsedWords(model, text) {
  const lineStarts = [0]; for (let i = 0; i < text.length; i += 1) if (text[i] === "\n") lineStarts.push(i + 1);
  const lineOf = (off) => { let lo = 0, hi = lineStarts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1; } return lo; };
  const words = [];
  let sent = 0;
  for (const block of parseText(model, text).split("\n\n")) {
    const rows = block.split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t"));
    if (!rows.length) continue;
    sent += 1;
    const base = words.length;
    for (const r of rows) {
      const off = Number((r[9].match(/Offset=(\d+)/) ?? [])[1]);
      words.push({ sent, id: Number(r[0]), form: r[1], w: norm(r[1]), upos: r[3], head: Number(r[6]), deprel: r[7], line: lineOf(off), base });
    }
  }
  for (const w of words) w.headIdx = w.head === 0 ? -1 : w.base + w.head - 1;
  return words;
}

function lcsPairs(a, b, eq) {
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) { if (eq(a[i], b[j])) { out.push([i, j]); i += 1; j += 1; } else if (dp[i + 1][j] >= dp[i][j + 1]) i += 1; else j += 1; }
  return out;
}

/** Align two word streams: lines by banded DP on line likeness, then words
 *  inside each aligned line pair by LCS under `alike`. */
export function alignEditions(A, B, { band = 400 } = {}) {
  const byLine = (ws) => { const m = new Map(); ws.forEach((w, i) => { if (!m.has(w.line)) m.set(w.line, []); m.get(w.line).push(i); }); return [...m.values()].filter((ix) => ix.some((i) => /\p{L}/u.test(ws[i].w))); };
  const LA = byLine(A), LB = byLine(B);
  const sim = (x, y) => { const p = lcsPairs(LA[x].map((i) => A[i].w), LB[y].map((i) => B[i].w), alike); return p.length / Math.max(LA[x].length, LB[y].length); };
  const n = LA.length, m = LB.length, ratio = m / n;
  const score = new Map(), back = new Map(), key = (i, j) => i * (m + 1) + j;
  const inBand = (i, j) => Math.abs(j - i * ratio) <= band;
  score.set(key(0, 0), 0);
  for (let i = 0; i <= n; i += 1) {
    for (let j = Math.max(0, Math.floor(i * ratio - band)); j <= Math.min(m, Math.ceil(i * ratio + band)); j += 1) {
      if (i === 0 && j === 0) continue;
      let best = -Infinity, from = null;
      const consider = (pi, pj, add, move) => { const s = score.get(key(pi, pj)); if (s !== undefined && s + add > best) { best = s + add; from = move; } };
      if (i > 0 && j > 0 && inBand(i - 1, j - 1)) { const s = sim(i - 1, j - 1); consider(i - 1, j - 1, s >= 0.3 ? s : -0.5, "diag"); }
      if (i > 0 && inBand(i - 1, j)) consider(i - 1, j, 0, "up");
      if (j > 0 && inBand(i, j - 1)) consider(i, j - 1, 0, "left");
      if (from) { score.set(key(i, j), best); back.set(key(i, j), from); }
    }
  }
  const pairs = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const mv = back.get(key(i, j));
    if (!mv) break;
    if (mv === "diag") { const p = lcsPairs(LA[i - 1].map((k) => A[k].w), LB[j - 1].map((k) => B[k].w), alike); if (p.length / Math.max(LA[i - 1].length, LB[j - 1].length) >= 0.3) for (const [x, y] of p) pairs.push([LA[i - 1][x], LB[j - 1][y]]); i -= 1; j -= 1; }
    else if (mv === "up") i -= 1; else j -= 1;
  }
  return pairs.reverse();
}

export function measure(model, { modern = bodyOf(MODERN), folio = bodyOf(FOLIO) } = {}) {
  const A = parsedWords(model, modern), B = parsedWords(model, folio);
  const pairs = alignEditions(A, B);
  const partner = new Map(pairs.map(([a, b]) => [a, b]));
  const tally = () => ({ n: 0, upos: 0, headN: 0, head: 0, labelled: 0 });
  const all = tally(), same = tally(), variant = tally();
  const flips = new Map();
  for (const [a, b] of pairs) {
    const wa = A[a], wb = B[b];
    if (!/\p{L}/u.test(wa.w)) continue;
    for (const t of [all, wa.w === wb.w ? same : variant]) {
      t.n += 1;
      if (wa.upos === wb.upos) t.upos += 1;
      const ha = wa.headIdx, hb = wb.headIdx;
      if (ha === -1 || partner.has(ha)) {
        t.headN += 1;
        const agree = ha === -1 ? hb === -1 : partner.get(ha) === hb;
        if (agree) { t.head += 1; if (wa.deprel === wb.deprel) t.labelled += 1; }
      }
    }
    if (wa.upos !== wb.upos) { const k = `${wa.upos}->${wb.upos}`; flips.set(k, (flips.get(k) ?? 0) + 1); }
  }
  const letterPairs = pairs.filter(([a]) => /\p{L}/u.test(A[a].w));
  const shuffledTags = shuffled(letterPairs.map(([, b]) => B[b].upos), lcg(7));
  const nullUpos = letterPairs.filter(([a], k) => A[a].upos === shuffledTags[k]).length / letterPairs.length;
  const rate = (t) => ({ words: t.n, wordClass: +(t.upos / t.n).toFixed(4), head: +(t.head / t.headN).toFixed(4), headAndLabel: +(t.labelled / t.headN).toFixed(4) });
  const modernWords = A.filter((w) => /\p{L}/u.test(w.w)).length;
  return {
    schema: "PeriodParse@1",
    pair: { modern: path.basename(MODERN), folio: path.basename(FOLIO) },
    aligned: { pairs: letterPairs.length, ofModernWords: modernWords, coverage: +(letterPairs.length / modernWords).toFixed(4) },
    agreement: { all: rate(all), identicalSpelling: rate(same), variantSpelling: rate(variant) },
    nullWordClass: +nullUpos.toFixed(4),
    topWordClassFlips: [...flips].sort((x, y) => y[1] - x[1]).slice(0, 12),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const model = loadModel(JSON.parse(fs.readFileSync(MODEL, "utf8")));
  const r = measure(model);
  console.log(JSON.stringify(r, null, 2));
  fs.writeFileSync(path.join(HERE, "results", "period-parse.json"), JSON.stringify({ at: new Date().toISOString().slice(0, 10), ...r }, null, 2));
}
