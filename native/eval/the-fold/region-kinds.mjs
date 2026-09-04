// region-kinds.mjs — "what kind of stuff am I looking at": a model ceiling
// and a mechanical arm measured against the same independent oracle.
//
// THE METHOD, user-directed (2026-09-03): "let's build in a model call and
// then work backwards to see if we can minimize or even get rid of it." That
// inverts this project's usual order deliberately, and the inversion is the
// point — nobody knows what the ceiling is on this task, so the model
// establishes one and the mechanical arm is then measured against a real
// number rather than against an intuition.
//
// WHAT THE MODEL IS, said plainly so it is not smuggled in as something else:
// a PRIOR. It navigates a document the way it navigates code — by having seen
// an enormous amount of both, so structure is recognised as pattern. That is
// exactly what a prior is here, with one disqualifying difference: its giver
// cannot be named, its scope cannot be stated, and it cannot be conceded. So
// it may stand as a ceiling and may never stand as the mechanism.
//
// THE TASK. One binary decision per line: is this running prose from the
// document's body, or is it page furniture? That is the decision the
// admission door actually needs — the measured cost of getting it wrong is
// that 73% of a Wikipedia page reaches the ledger as assertions.
//
// THE ORACLE is `region-oracle.mjs`: the document's own HTML structure, a
// channel `extractReadable` throws away and no reader in this project can
// see. Neither arm is given it.
//
// THE MECHANICAL ARM carries no vocabulary, no format names and no site
// rules — this repo has already condemned per-site formatting (succession.js)
// and refused enumerating title conventions. It types a line by the SHAPE of
// its characters and asks one question the material answers about itself:
// does this shape RECUR? A navbox row shares its shape with hundreds of
// siblings; a sentence of prose is shape-unique. That is a recurrence claim
// at Pattern grain, and it is the vocabulary-free route `network.js`'s own
// header recorded as measured and unbuilt.
//
// THE CONTROL (II.23), built to fail: shuffle the lines. Shape recurrence is
// a property of the multiset and survives shuffling by construction, so the
// control is run on the ADJACENCY half — whether like shapes CLUSTER — which
// shuffling destroys. An arm whose separation survives the shuffle has found
// the marginals, not the regions.
//
//   node region-kinds.mjs     env: PAGE - WINDOW (40) - MODEL - ARMS
import { readFileSync, writeFileSync } from "node:fs";
import { oracleFor } from "./region-oracle.mjs";
import { segmentBySurprise } from "../../kernel/surprise-segments.js";

const FIX = new URL("./fixtures/", import.meta.url).pathname;
const PAGE = process.env.PAGE ?? "wikipedia-battle-of-borodino.html";
const WINDOW = Number(process.env.WINDOW ?? 40);
const MODEL = process.env.MODEL ?? "gemma2:2b";
const OLLAMA = "http://127.0.0.1:11434";
const ARMS = (process.env.ARMS ?? "shape,model").split(",");
const SEED = Number(process.env.SEED ?? 0);

const { lines, counts } = oracleFor(readFileSync(`${FIX}${PAGE}`, "utf8"));
const truth = lines.map((l) => l.kind === "prose");
console.log(`${PAGE}: ${lines.length} lines - oracle says ${truth.filter(Boolean).length} prose (${(100 * truth.filter(Boolean).length / lines.length).toFixed(1)}%)`);
console.log(`  ${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" - ")}`);

// ── scoring, one implementation for every arm ───────────────────────────
function score(pred, name) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (let i = 0; i < truth.length; i += 1) {
    if (pred[i] && truth[i]) tp += 1;
    else if (pred[i] && !truth[i]) fp += 1;
    else if (!pred[i] && truth[i]) fn += 1;
    else tn += 1;
  }
  const prec = tp / (tp + fp || 1), rec = tp / (tp + fn || 1);
  const f1 = prec + rec ? 2 * prec * rec / (prec + rec) : 0;
  // What the door actually cares about: of the lines this arm admits, what
  // share is furniture? That is the junk rate the ledger inherits.
  const junk = fp / (tp + fp || 1);
  return { name, tp, fp, fn, tn, prec, rec, f1, junk, admitted: tp + fp };
}
const row = (s) => `  ${s.name.padEnd(16)} admits ${String(s.admitted).padStart(4)}  precision ${s.prec.toFixed(3)}  recall ${s.rec.toFixed(3)}  F1 ${s.f1.toFixed(3)}  junk admitted ${(100 * s.junk).toFixed(1)}%`;

// ── the mechanical arm: shape, and whether it recurs ────────────────────
// A line's shape: characters collapsed to classes, runs collapsed, capped.
// No letter, digit or mark keeps its identity, so this is blind to language
// and to format alike.
// The cap is chosen on a CONVERGENCE criterion, declared before any score was
// seen, never fitted: a prequential order-2 reader needs its alphabet small
// enough that N observations cover |A|^2 contexts. At N=990 lines, |A| <= 9
// gives ~10 observations per context. Measured alphabet sizes on this page:
// cap 1 -> 8 (15.5 obs/context), cap 2 -> 18 (3.1), cap 3 -> 31 (1.0),
// cap 12 -> 164 (0.04). Only cap 1 meets it. The first run used cap 12 and
// the segmenter put ALL of its boundaries in the last 40 lines, leaving 950
// lines as one region — a reader that never converges cannot find a peak.
const CAP = Number(process.env.CAP ?? 1);
export function lineShape(s) {
  const cls = String(s).trim().replace(/[\p{L}\p{M}]+/gu, "a").replace(/\p{N}+/gu, "0").replace(/\s+/gu, "_").replace(/[^a0_]+/gu, ".");
  const collapsed = cls.replace(/(.)\1+/g, "$1");
  const len = String(s).trim().length;
  const bucket = len < 24 ? "S" : len < 72 ? "M" : "L";
  return `${bucket}:${collapsed.slice(0, CAP)}`;
}
function shapeArm(texts, { floor }) {
  const shapes = texts.map(lineShape);
  const freq = new Map();
  for (const s of shapes) freq.set(s, (freq.get(s) ?? 0) + 1);
  // Admit a line whose shape does NOT recur past the floor. Nothing is named;
  // the material's own repetition does the deciding.
  return { pred: shapes.map((s) => (freq.get(s) ?? 0) < floor), shapes, freq };
}

// ── the model arm: it POINTS, never writes ─────────────────────────────
async function ask(prompt, schema) {
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, stream: false, format: schema, options: { temperature: 0 },
      messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) throw new Error(`ollama ${r.status}`);
  return JSON.parse((await r.json()).message.content);
}
const SCHEMA = { type: "object", properties: { prose_lines: { type: "array", items: { type: "integer" } } }, required: ["prose_lines"] };
async function modelArm(texts) {
  const pred = new Array(texts.length).fill(false);
  let calls = 0, failed = 0;
  for (let start = 0; start < texts.length; start += WINDOW) {
    const chunk = texts.slice(start, start + WINDOW);
    const listing = chunk.map((t, j) => `${start + j}: ${t.slice(0, 160)}`).join("\n");
    const prompt = `Below are numbered lines extracted from a web page.\n\nSome are running prose from the article body — full sentences a person reads.\nThe rest are page furniture: navigation lists, menu items, table cells, metadata fields, citation entries, category lists, image captions, headings.\n\nReturn the numbers of ONLY the lines that are running prose from the article body.\n\n${listing}`;
    try {
      const out = await ask(prompt, SCHEMA);
      for (const n of out.prose_lines ?? []) if (Number.isInteger(n) && n >= 0 && n < texts.length) pred[n] = true;
    } catch { failed += 1; }
    calls += 1;
    if (calls % 5 === 0) process.stdout.write(`\r  model: ${calls} calls...`);
  }
  process.stdout.write(`\r  model: ${calls} calls, ${failed} failed        \n`);
  return { pred, calls, failed };
}

// ── run ─────────────────────────────────────────────────────────────────
const texts = lines.map((l) => l.text);
const results = [];

if (ARMS.includes("shape")) {
  // The floor is DECLARED, not fitted: 2 is `network.js`'s own structural
  // minimum (one instance is not a recurrence), reused whole.
  for (const floor of [2, 3, 5]) {
    const { pred } = shapeArm(texts, { floor });
    results.push(score(pred, `shape floor ${floor}`));
  }
}

// -- the measure arm, carried over from cross-format.mjs ------------------
// Built and pre-registered THERE, on renderings whose oracle is exact by
// construction, and only then brought here. It asks whether a line FILLS THE
// MEASURE in a run, with the measure read off the document's own line lengths
// -- so it knows nothing about page widths, formats or sites. It cost a
// little against `length >= 72` on unwrapped renderings (0.727 vs 0.769) and
// beat it 0.936 to 0.148 on the same content hard-wrapped, which is the
// defining property of a PDF's text layer.
function measureArm(texts) {
  const lens = texts.map((t) => t.length).filter((n) => n > 0).sort((a, b) => a - b);
  if (!lens.length) return texts.map(() => false);
  const measure = lens[Math.floor(0.9 * (lens.length - 1))];
  const fills = texts.map((t) => t.length >= 0.8 * measure);
  const pred = texts.map(() => false);
  for (let i = 0; i < fills.length; i += 1) {
    if (!fills[i]) continue;
    if (!(fills[i - 1] || fills[i + 1])) continue;
    pred[i] = true;
    for (let j = i + 1; j < fills.length && !fills[j]; j += 1) { pred[j] = true; break; }
  }
  return pred.some(Boolean) ? pred : fills;
}
function fillsAlone(texts) {
  const lens = texts.map((t) => t.length).filter((n) => n > 0).sort((a, b) => a - b);
  if (!lens.length) return texts.map(() => false);
  const measure = lens[Math.floor(0.9 * (lens.length - 1))];
  return texts.map((t) => t.length >= 0.8 * measure);
}
results.push(score(measureArm(texts), "fills the measure"));
results.push(score(fillsAlone(texts), "fills alone"));

// The trivial baselines every arm must beat, or it has measured nothing.
results.push(score(texts.map(() => true), "admit everything"));
results.push(score(texts.map((t) => t.length >= 72), "length >= 72"));

// -- the region arm: the SAME question, asked one grain up ---------------
// The line arm failed because it asked "is this shape unique" of a line, and
// prose is shape-UNIFORM rather than shape-unique -- 266 prose lines over 72
// shapes, against navbox's 500 lines over 35 with one shape covering 271. The
// shapes discriminate; the grain was wrong.
//
// The control already established that shape REGIONS are real (adjacent lines
// share a shape far more than shuffling produces). So cut the shape stream
// into regions with the segmenter that already exists -- the caller's
// instruments decide what an event is, and here an event is a line's shape --
// and judge each REGION by its own profile. Nothing is named: the region's
// own median line length decides, at the same declared threshold the line arm
// uses, so this measures GRAIN and nothing else.
if (ARMS.includes("region")) {
  const shapes = texts.map(lineShape);
  const seg = segmentBySurprise(shapes, { order: 2, alpha: 0.05, draws: 20, seed: SEED, minLength: 3 });
  const pred = new Array(texts.length).fill(false);
  let at = 0, admittedRegions = 0;
  for (const region of seg.segments) {
    const idx = [];
    for (let k = 0; k < region.length; k += 1) idx.push(at + k);
    at += region.length;
    const lens = idx.map((i) => texts[i].length).sort((a, b) => a - b);
    const median = lens[lens.length >> 1] ?? 0;
    if (median >= 72) { admittedRegions += 1; for (const i of idx) pred[i] = true; }
  }
  console.log(`  region arm: ${seg.segments.length} regions cut (cut ${seg.cut.toFixed(2)} bits), ${admittedRegions} admitted`);
  results.push(score(pred, `region median>=72`));
}

if (ARMS.includes("model")) {
  const { pred, calls } = await modelArm(texts);
  results.push(score(pred, `model (${calls} calls)`));
}

console.log(`\nARMS`);
for (const s of results) console.log(row(s));

// ── the control (II.23): does the shape arm's separation need ADJACENCY? ──
// Shape recurrence is a property of the multiset, so shuffling cannot change
// which lines it admits — the arm is invariant by construction and that is
// reported as invariance, never as survival. What shuffling DOES destroy is
// clustering, so the control asks whether like shapes actually cluster: the
// share of adjacent line pairs sharing a shape, real against shuffled.
{
  const shapes = texts.map(lineShape);
  const adj = (a) => { let n = 0; for (let i = 1; i < a.length; i += 1) if (a[i] === a[i - 1]) n += 1; return n / (a.length - 1 || 1); };
  let s = SEED;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const rates = [];
  for (let d = 0; d < 50; d += 1) {
    const c = shapes.slice();
    for (let i = c.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
    rates.push(adj(c));
  }
  rates.sort((a, b) => a - b);
  const real = adj(shapes);
  const above = rates.filter((r) => r >= real).length;
  console.log(`\nCONTROL - do like shapes CLUSTER?`);
  console.log(`  adjacent pairs sharing a shape: real ${(100 * real).toFixed(1)}%, shuffled median ${(100 * rates[25]).toFixed(1)}% (${(100 * rates[0]).toFixed(1)}-${(100 * rates.at(-1)).toFixed(1)}%)`);
  console.log(above === 0
    ? "  -> real sits outside every shuffle: shape regions are real, not a marginal."
    : `  -> ${above} of 50 shuffles reach it: THE CONTROL SURVIVES and clustering is not established.`);
}

writeFileSync(new URL(`./results/region-kinds-${PAGE.replace(/\W+/g, "-")}.json`, import.meta.url),
  JSON.stringify({ page: PAGE, model: MODEL, window: WINDOW, oracle: counts, arms: results.map(({ name, tp, fp, fn, tn, prec, rec, f1, junk, admitted }) => ({ name, tp, fp, fn, tn, prec, rec, f1, junk, admitted })) }, null, 1));
