// door-by-kind.mjs — does judging by DISCOVERED KIND beat judging by line?
//
// The admission door currently runs `blankBelowMeasure`, a rule written by
// hand: a line is kept if it fills the document's own measure, in a run. The
// discovery pass then found the SAME regularity by itself
// (`kind:before=la_a_`, 99% prose) plus two furniture kinds nobody wrote down.
//
// So the wiring is not "replace the decision" — the decision (does this fill
// the measure) stays. It is "replace the UNIT". Instead of asking of each
// LINE, ask of each discovered KIND, and keep every line whose kind is kept.
// A short prose line inside a prose kind survives; a long furniture line
// inside a furniture kind does not.
//
// AND IT IS MEASURED BEFORE IT IS PROMOTED. The last time a kind-based arm was
// built it scored 0.730 on the page it was developed against and 0.489 / 0.208
// on the two it was not — fitted, and only cross-page replay caught it. So
// this runs on all three, and if it does not replay it does not ship.
//
// The oracle (the page's own HTML classes, a channel no reader sees) scores
// only. Discovery never sees it.
//
//   node door-by-kind.mjs    env: PAGES - CAP - MIN_SHARE - DRAWS
import { readFileSync } from "node:fs";
import { oracleFor } from "./region-oracle.mjs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const REFS = (process.env.PAGES ?? "wikipedia-battle-of-borodino.html,wikipedia-battle-of-austerlitz.html,wikipedia-war-of-the-third-coalition.html").split(",");
const CAP = Number(process.env.CAP ?? 4);
const MIN_MENTIONS = Number(process.env.MIN_MENTIONS ?? 4);
const MIN_SHARE = Number(process.env.MIN_SHARE ?? 0.4);
const MIN_MEMBERS = Number(process.env.MIN_MEMBERS ?? 2);
const DRAWS = Number(process.env.DRAWS ?? 40);
const ALPHA = Number(process.env.ALPHA ?? 0.05);
const SEED = Number(process.env.SEED ?? 0);
const FILL = Number(process.env.FILL ?? 0.8);
const PERCENTILE = Number(process.env.PERCENTILE ?? 0.9);

const { discoverCompanyKinds } = await import(`${NATIVE}/organs/kind-standing.js`);
const identity = (t) => t;

const lineShape = (s) => {
  const cls = String(s).trim().replace(/[\p{L}\p{M}]+/gu, "a").replace(/\p{N}+/gu, "0").replace(/\s+/gu, "_").replace(/[^a0_]+/gu, ".");
  const n = String(s).trim().length;
  return `${n < 24 ? "S" : n < 72 ? "M" : "L"}${cls.replace(/(.)\1+/g, "$1").slice(0, CAP)}`;
};

function score(pred, truth, name) {
  let tp = 0, fp = 0, fn = 0;
  for (let i = 0; i < truth.length; i += 1) { if (pred[i] && truth[i]) tp += 1; else if (pred[i]) fp += 1; else if (truth[i]) fn += 1; }
  const prec = tp / (tp + fp || 1), rec = tp / (tp + fn || 1);
  return { name, prec, rec, f1: prec + rec ? 2 * prec * rec / (prec + rec) : 0, admitted: tp + fp, junk: fp / (tp + fp || 1) };
}

// ── the door as it ships: fills the measure, in a run ────────────────────
function byLine(texts) {
  const lens = texts.map((t) => t.length).filter((n) => n > 0).sort((a, b) => a - b);
  const measure = lens[Math.floor(PERCENTILE * (lens.length - 1))] ?? 0;
  const fills = texts.map((t) => t.length >= FILL * measure && t.length > 0);
  const keep = texts.map(() => false);
  for (let i = 0; i < fills.length; i += 1) {
    if (!fills[i] || !(fills[i - 1] || fills[i + 1])) continue;
    keep[i] = true;
    for (let j = i + 1; j < fills.length && !fills[j]; j += 1) { if (texts[j].trim()) keep[j] = true; break; }
  }
  return keep.some(Boolean) ? keep : fills;
}

// ── the door by discovered kind ─────────────────────────────────────────
// The SAME question, asked of a kind rather than a line: does this kind's
// members' own median length fill the document's measure? A line whose shape
// belongs to no discovered kind falls back to the line rule — an undiscovered
// shape is a fact about the discovery, never evidence against the line.
function byKind(texts, kinds) {
  const lens = texts.map((t) => t.length).filter((n) => n > 0).sort((a, b) => a - b);
  const measure = lens[Math.floor(PERCENTILE * (lens.length - 1))] ?? 0;
  const shapes = texts.map(lineShape);
  const kindOf = new Map();
  for (const k of kinds) for (const m of k.members) kindOf.set(m, k.name);
  const byKindLens = new Map();
  shapes.forEach((sh, i) => {
    const k = kindOf.get(sh);
    if (!k) return;
    if (!byKindLens.has(k)) byKindLens.set(k, []);
    byKindLens.get(k).push(texts[i].length);
  });
  const kindKeeps = new Map();
  for (const [k, ls] of byKindLens) {
    ls.sort((a, b) => a - b);
    kindKeeps.set(k, (ls[ls.length >> 1] ?? 0) >= FILL * measure);
  }
  const line = byLine(texts);
  return shapes.map((sh, i) => {
    const k = kindOf.get(sh);
    return k === undefined ? line[i] : kindKeeps.get(k);
  });
}

const rows = [];
for (const ref of REFS) {
  const { lines } = oracleFor(readFileSync(`${FIX}${ref}`, "utf8"));
  const texts = lines.map((l) => l.text);
  const truth = lines.map((l) => l.kind === "prose");
  const shapes = texts.map(lineShape);
  const kinds = discoverCompanyKinds([{ text: shapes.join(" ") }], [...new Set(shapes)], {
    minMentions: MIN_MENTIONS, minShare: MIN_SHARE, minMembers: MIN_MEMBERS,
    clean: identity, nullArm: { draws: DRAWS, seed: SEED, alpha: ALPHA },
  });
  const a = score(byLine(texts), truth, "by line (ships today)");
  const b = score(byKind(texts, kinds), truth, "by discovered kind");
  rows.push({ ref, kinds: kinds.length, a, b });
  console.log(`\n${ref}  (${kinds.length} kind(s) discovered)`);
  for (const s of [a, b]) console.log(`  ${s.name.padEnd(24)} F1 ${s.f1.toFixed(3)}  precision ${s.prec.toFixed(3)}  recall ${s.rec.toFixed(3)}  admits ${String(s.admitted).padStart(4)}  junk ${(100 * s.junk).toFixed(1)}%`);
}

console.log(`\n${"=".repeat(72)}\nDOES IT REPLAY?`);
console.log(`  ${"page".padEnd(30)}${"by line".padStart(10)}${"by kind".padStart(10)}   delta`);
let wins = 0, losses = 0;
for (const r of rows) {
  const d = r.b.f1 - r.a.f1;
  if (d > 0) wins += 1; else if (d < 0) losses += 1;
  console.log(`  ${r.ref.slice(10, 38).padEnd(30)}${r.a.f1.toFixed(3).padStart(10)}${r.b.f1.toFixed(3).padStart(10)}   ${d >= 0 ? "+" : ""}${d.toFixed(3)}`);
}
// THREE outcomes, not two, and the first cut of this verdict conflated the
// middle one with the worst one. An arm that wins on some pages and LOSES on
// others is fitted — that is the region arm's shape, 0.730 where it was built
// and 0.489 / 0.208 where it was not. An arm that wins on some and TIES on the
// rest is something else entirely: a strict improvement, however small. The
// size is then the question, and it is answered below, not here.
console.log(losses > 0
  ? `\n  by kind wins on ${wins} and LOSES on ${losses} of ${rows.length} — it does not replay. The last arm\n  that looked like this was fitted, and only cross-page replay caught it. It does not ship.`
  : wins === 0
    ? `\n  by kind wins on NONE and loses on none — the discovered grain and the hand-written\n  rule are the same rule. The line rule stays.`
    : `\n  by kind wins on ${wins} of ${rows.length} and loses on none. Not fitted — but see the size below\n  before calling it an improvement.`);

// ── how much do the two arms actually DISAGREE? ──────────────────────────
// An F1 delta at the third decimal is not a finding; it is two numbers that
// happen to round apart. The honest question is how many LINES the two arms
// classify differently, and of those, how many the oracle says each got right.
console.log(`\n${"=".repeat(72)}\nWHERE THEY DISAGREE (an F1 delta at 3dp is not a finding)`);
for (const ref of REFS) {
  const { lines } = oracleFor(readFileSync(`${FIX}${ref}`, "utf8"));
  const texts = lines.map((l) => l.text);
  const truth = lines.map((l) => l.kind === "prose");
  const shapes = texts.map(lineShape);
  const kinds = discoverCompanyKinds([{ text: shapes.join(" ") }], [...new Set(shapes)], {
    minMentions: MIN_MENTIONS, minShare: MIN_SHARE, minMembers: MIN_MEMBERS,
    clean: identity, nullArm: { draws: DRAWS, seed: SEED, alpha: ALPHA },
  });
  const a = byLine(texts), b = byKind(texts, kinds);
  let diff = 0, kindRight = 0, lineRight = 0;
  for (let i = 0; i < texts.length; i += 1) {
    if (a[i] === b[i]) continue;
    diff += 1;
    if (b[i] === truth[i]) kindRight += 1; else lineRight += 1;
  }
  const f1a = score(a, truth, "").f1, f1b = score(b, truth, "").f1;
  console.log(`  ${ref.slice(10, 40).padEnd(32)} ${String(diff).padStart(3)} of ${texts.length} lines differ` +
    (diff ? `  (kind right ${kindRight}, line right ${lineRight})` : "") +
    `   F1 ${f1a.toFixed(5)} -> ${f1b.toFixed(5)}`);
}
