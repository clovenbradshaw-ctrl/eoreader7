// eval/the-fold/surprise-segments.mjs — does a stream's own surprise find
// its boundaries, in music AND in text, with nothing named?
//
// Music: the Prelude and the Aria (MIDI notes, exact tokens). The oracle
// the segmenter never sees: the file's own bar length (4 × ticksPerBeat)
// and, for the Prelude, its figure (the piece is a broken chord repeated
// every 8 notes for 32 bars — a period the file states in its own ticks).
// Text: Dracula, lowercase words only — no punctuation, no capitals reach
// the segmenter. The oracle: the script's own sentence ends (. ! ?) and
// paragraph breaks, held aside and compared after.
//
// The question at each level is the same: are the surprise boundaries
// closer to the oracle's boundaries than the same NUMBER of boundaries
// placed at random would be? (A count-matched random placement is the
// null for alignment; the segmenter's own null — shuffled surprise — is
// inside the kernel.) Then recursion: segments become tokens (their
// move-shape signature), and the next level asks again.
import fs from "node:fs";
import { parseMidi } from "../../adapters/midi/midi.js";
import { segmentBySurprise, recursiveSegments } from "../../kernel/surprise-segments.js";
import { lcg } from "../../kernel/continuation.js";

const HERE = new URL(".", import.meta.url).pathname;
const FOLD = `${HERE}../../../../the-fold`;
const say = (s) => console.log(s);
const P = { order: 3, alpha: 0.05, draws: 20, seed: 1, minLength: 3, depth: 3 };
say(`surprise segmentation — order ${P.order}, alpha ${P.alpha}, ${P.draws} shuffles for the cut, minLength ${P.minLength}, depth ${P.depth}\n`);

// alignment: share of boundaries within `tol` events of an oracle boundary,
// vs the same number of boundaries placed uniformly at random (200 draws)
function alignment(boundaries, oracle, n, { tol, draws = 200, seed = 7 }) {
  const near = (b) => oracle.some((o) => Math.abs(o - b) <= tol);
  const hit = boundaries.filter(near).length / Math.max(1, boundaries.length);
  const rng = lcg(seed);
  const nulls = [];
  for (let d = 0; d < draws; d += 1) {
    const rb = new Set(); while (rb.size < boundaries.length && rb.size < n - 1) rb.add(1 + Math.floor(rng() * (n - 1)));
    nulls.push([...rb].filter(near).length / Math.max(1, rb.size));
  }
  nulls.sort((a, b) => a - b);
  return { hit, nullMedian: nulls[Math.floor(nulls.length / 2)], null95: nulls[Math.floor(0.95 * (nulls.length - 1))], above: nulls.filter((x) => x >= hit).length, draws };
}

// ── MUSIC ─────────────────────────────────────────────────────────────────
for (const name of ["wtk1-prelude1", "bwv-988-aria"]) {
  const r = parseMidi(fs.readFileSync(`${HERE}fixtures/midi/${name}.mid`));
  const tokens = r.notes.map((n, i) => `${n.pitch}/${n.dur}/${i + 1 < r.notes.length ? r.notes[i + 1].tick - n.tick : 0}`);
  const bar = r.ticksPerBeat * 4;
  const barStarts = r.notes.map((n, i) => (i > 0 && Math.floor(n.tick / bar) !== Math.floor(r.notes[i - 1].tick / bar) ? i : -1)).filter((i) => i > 0);
  const seg = segmentBySurprise(tokens, { ...P, alphabetSize: new Set(tokens).size });
  const al = alignment(seg.boundaries, barStarts, tokens.length, { tol: 1 });
  say(`── ${name}: ${tokens.length} notes; the file's own bar = ${bar} ticks → ${barStarts.length} bar starts (the oracle, never shown to the segmenter) ──`);
  say(`   surprise cut ${seg.cut.toFixed(2)} bits (the shuffled stream's 95th) → ${seg.figures} boundaries, segments of median length ${[...seg.segments.map((s) => s.length)].sort((a, b) => a - b)[Math.floor(seg.segments.length / 2)]}`);
  say(`   boundaries within 1 note of a bar start: ${(100 * al.hit).toFixed(0)}%  vs count-matched random placement: median ${(100 * al.nullMedian).toFixed(0)}%, 95th ${(100 * al.null95).toFixed(0)}% — random at/above the real value: ${al.above} of ${al.draws}`);
  say(`   → ${al.above <= 0.05 * al.draws ? "the surprise boundaries find the bar: a figure of this music is where the ground is most wrong" : "not above chance: surprise boundaries do not land on bars here"}`);
  if (name === "wtk1-prelude1") {
    // the Prelude's own period: 8-note figures — the boundary spacing should be 8 or a multiple
    const gaps = seg.boundaries.map((b, i) => b - (seg.boundaries[i - 1] ?? 0));
    const hist = gaps.reduce((m, g) => (m[g] = (m[g] ?? 0) + 1, m), {});
    say(`   boundary spacing histogram: ${Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([g, c]) => `${g}×${c}`).join(" ")} (the figure is 8 notes; a period of 8 or 16 is the piece's own)`);
  }
  const levels = recursiveSegments(tokens, P);
  say(`   recursion: ${levels.map((L) => `L${L.level}: ${L.events} events → ${L.figures} cuts, ${L.distinctTokens} distinct segment-kinds${L.stopped ? ` (stopped: ${L.stopped})` : ""}`).join(" | ")}\n`);
}

// ── TEXT ──────────────────────────────────────────────────────────────────
const raw = fs.readFileSync(`${FOLD}/../live_priors/01-literature-books/gutenberg/pg345_Dracula.txt`, "utf8");
const body = raw.slice(raw.indexOf("CHAPTER I"), raw.indexOf("CHAPTER I") + 60000);
// tokens: lowercase words ONLY; the oracle: which word ends a sentence, from the script's own marks
const words = [], sentenceEnds = [], paraEnds = [];
for (const m of body.matchAll(/([\p{L}']+)([^\p{L}']*)/gu)) {
  words.push(m[1].toLowerCase());
  if (/[.!?]/.test(m[2])) sentenceEnds.push(words.length); // the boundary sits BEFORE the next word
  if (/\n\s*\n/.test(m[2])) paraEnds.push(words.length);
}
const segT = segmentBySurprise(words, { ...P, alphabetSize: new Set(words).size });
const alS = alignment(segT.boundaries, sentenceEnds, words.length, { tol: 1 });
const alP = alignment(segT.boundaries, paraEnds, words.length, { tol: 2 });
say(`── Dracula, first ${words.length} words (lowercase words only — no punctuation, no capitals reach the segmenter); oracle: ${sentenceEnds.length} sentence ends, ${paraEnds.length} paragraph ends ──`);
say(`   surprise cut ${segT.cut.toFixed(2)} bits → ${segT.figures} boundaries, median segment ${[...segT.segments.map((s) => s.length)].sort((a, b) => a - b)[Math.floor(segT.segments.length / 2)]} words (the script's median sentence: ${(() => { const g = sentenceEnds.map((e, i) => e - (sentenceEnds[i - 1] ?? 0)).sort((a, b) => a - b); return g[Math.floor(g.length / 2)]; })()} words)`);
say(`   boundaries within 1 word of a sentence end: ${(100 * alS.hit).toFixed(0)}%  vs count-matched random: median ${(100 * alS.nullMedian).toFixed(0)}%, 95th ${(100 * alS.null95).toFixed(0)}% — random at/above: ${alS.above} of ${alS.draws}`);
say(`   boundaries within 2 words of a paragraph end: ${(100 * alP.hit).toFixed(0)}%  vs random median ${(100 * alP.nullMedian).toFixed(0)}% — random at/above: ${alP.above} of ${alP.draws}`);
say(`   → ${alS.above <= 0.05 * alS.draws ? "the surprise boundaries find the sentence: a statement is where the ground is most wrong, with no punctuation read" : "not above chance: surprise boundaries do not land on sentence ends here"}`);
// THE SHAPE STREAM: the same words as moves — repeat (r1..r3) / return (old) /
// new — so the ground can be right about something other than vocabulary.
// A statement's figure, if it is anywhere in a word stream, is in how the
// stream MOVES, not in which word it never met before.
import("../../kernel/continuation.js").then(() => {});
const { shapeOf } = await import("../../kernel/continuation.js");
const seenW = new Set(); const shapes = [];
for (let i = 0; i < words.length; i += 1) { shapes.push(shapeOf(words.slice(Math.max(0, i - P.order), i), words[i], seenW, P.order)); seenW.add(words[i]); }
const segSh = segmentBySurprise(shapes, { ...P, alphabetSize: new Set(shapes).size });
const alSh = alignment(segSh.boundaries, sentenceEnds, shapes.length, { tol: 1 });
say(`   SHAPE stream (repeat/return/new, symbol-free): cut ${segSh.cut.toFixed(2)} bits → ${segSh.figures} boundaries, median segment ${[...segSh.segments.map((x) => x.length)].sort((a, b) => a - b)[Math.floor(segSh.segments.length / 2)]}`);
say(`   within 1 word of a sentence end: ${(100 * alSh.hit).toFixed(0)}% vs random median ${(100 * alSh.nullMedian).toFixed(0)}%, 95th ${(100 * alSh.null95).toFixed(0)}% — random at/above: ${alSh.above} of ${alSh.draws} → ${alSh.above <= 0.05 * alSh.draws ? "the moves find the sentence" : "not above chance"}`);
// THE PRIOR ARM: the received POS prior (UD_English-EWT, giver named in
// priors-data) gives every word its dominant class — 17 symbols, dense
// recurrence — a stream where the ground CAN be right. "The system never
// is without Bayesian priors": here the prior is what makes a figure
// visible at all. An OOV word is "X" (a declared gap class), never a guess.
const posPrior = JSON.parse(fs.readFileSync(`${FOLD}/priors-data/pos-prior-eng.json`, "utf8"));
const classOf = (w) => { const c = posPrior.forms?.[w]; if (!c) return "X"; let best = "X", n = -1; for (const [k, v] of Object.entries(c)) if (v > n) { n = v; best = k; } return best; };
const classes = words.map(classOf);
const oov = classes.filter((c) => c === "X").length;
const segC = segmentBySurprise(classes, { ...P, alphabetSize: new Set(classes).size });
const alC = alignment(segC.boundaries, sentenceEnds, classes.length, { tol: 1 });
const alCp = alignment(segC.boundaries, paraEnds, classes.length, { tol: 2 });
say(`   POS-CLASS stream (the received prior's dominant class per word; ${new Set(classes).size} classes, ${oov} words out of vocabulary → "X"): cut ${segC.cut.toFixed(2)} bits → ${segC.figures} boundaries, median segment ${[...segC.segments.map((x) => x.length)].sort((a, b) => a - b)[Math.floor(segC.segments.length / 2)]} words`);
say(`   within 1 word of a sentence end: ${(100 * alC.hit).toFixed(0)}% vs random median ${(100 * alC.nullMedian).toFixed(0)}%, 95th ${(100 * alC.null95).toFixed(0)}% — random at/above: ${alC.above} of ${alC.draws}; paragraph ends: ${(100 * alCp.hit).toFixed(0)}% vs ${(100 * alCp.nullMedian).toFixed(0)}% (${alCp.above}/${alCp.draws})`);
say(`   → ${alC.above <= 0.05 * alC.draws ? "with the received prior as its ground, the surprise boundaries find the sentence — no punctuation read" : "not above chance even on the class stream"}`);
const levelsC = recursiveSegments(classes, { ...P, minLength: 4 });
say(`   recursion on classes: ${levelsC.map((L) => `L${L.level}: ${L.events} → ${L.figures} cuts, ${L.distinctTokens} kinds${L.stopped ? ` (${L.stopped})` : ""}`).join(" | ")}`);
const levelsT = recursiveSegments(words, { ...P, minLength: 4 });
say(`   recursion: ${levelsT.map((L) => `L${L.level}: ${L.events} events → ${L.figures} cuts, ${L.distinctTokens} distinct segment-kinds${L.stopped ? ` (stopped: ${L.stopped})` : ""}`).join(" | ")}`);
say(`\nThe same kernel cut both; it read no bar, no sentence, no mark. Each oracle was the material's own script, held aside.`);
