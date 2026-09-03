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
const CAP = 12;
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

// The trivial baselines every arm must beat, or it has measured nothing.
results.push(score(texts.map(() => true), "admit everything"));
results.push(score(texts.map((t) => t.length >= 72), "length >= 72"));

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
