// segment-flips.mjs — does the-fold/medium.js's segmentCollection read the
// same text the same way twice? (2026-09-29, READING-SPEC S136.)
//
// segmentCollection cuts a collection at a recurring separator only when the
// cut is more uniform than random same-N-way cuts of the same material, at a
// level. While the draws came from Math.random, a text whose p sat near the
// level could be cut on one run and left whole on the next. This counts how
// often over real documents without rerunning the reader hundreds of times:
// each candidate's p against its own null is estimated once, with many
// seeded draws, and the chance that a rule of D draws accepts it is then the
// binomial P(ge <= k). From those, per document, the distribution of the
// reading — how likely two runs are to disagree, and how likely one run is to
// disagree with the verdict of the exact p.
//
// Rules: the one medium.js had before S136 (ge / 200 <= 0.05), and
// (ge + 1) / (draws + 1) <= 0.05 at 200, 2,000 and 20,000 draws. Two verdicts
// are counted, not shipped: a null over the real units (the unit sizes'
// total into units.length pieces — the separators and front matter left out,
// as the real cv leaves them out), and the level divided over the k
// candidates tried.
//
//   node native/eval/the-fold/segment-flips.mjs [root ...]     (OUT=rows.jsonl)
//
// Roots default to the sibling live_priors clone; with none there it refuses
// (exit 2). Its output is regenerable and stays out of the tree; S136 quotes
// this summary over live_priors.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { elementsOf, collectionCandidates, uniformityP, SEGMENT_LEVEL } from "../../the-fold/medium.js";
import { createSeededRng } from "../../kernel/rng.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOTS = process.argv.length > 2 ? process.argv.slice(2).map((r) => path.resolve(r)) : [path.join(HERE, "..", "..", "..", "..", "live_priors")];
const absent = ROOTS.filter((r) => !fs.existsSync(r));
if (absent.length) { console.error(`segment-flips: refused — no corpus at ${absent.join(", ")} (clone live_priors beside eoreader7, or pass roots)`); process.exit(2); }
const LEVEL = SEGMENT_LEVEL; // the reader's own declared level, never a copy of it
// A practical bound, not a measurement: files past 6 MB are skipped and counted, so one run stays minutes.
const MAX_BYTES = 6e6;

const walk = (p, acc) => {
  if (fs.statSync(p).isFile()) { if (/\.(txt|md)$/i.test(p)) acc.push(p); return acc; }
  for (const e of fs.readdirSync(p, { withFileTypes: true })) if (!e.name.startsWith(".") && e.name !== "node_modules") walk(path.join(p, e.name), acc);
  return acc;
};

/** P(X <= k), X ~ Binomial(n, p), summed in logs. */
function binomCdf(k, n, p) {
  if (k < 0) return 0;
  if (k >= n || p <= 0) return 1;
  if (p >= 1) return 0;
  let lc = 0, s = 0;
  for (let x = 0; x <= k; x++) { if (x > 0) lc += Math.log(n - x + 1) - Math.log(x); s += Math.exp(lc + x * Math.log(p) + (n - x) * Math.log(1 - p)); }
  return Math.min(1, s);
}
// A rule of `draws` draws accepts a candidate when its null count ge <= kMax.
const rule = (draws, plus1) => ({ draws, kMax: Math.floor((plus1 ? LEVEL * (draws + 1) - 1 : LEVEL * draws) + 1e-9) });
const RULES = { before: rule(200, false), plus1_200: rule(200, true), plus1_2000: rule(2000, true), plus1_20000: rule(20000, true) };
const NAMES = Object.keys(RULES);

// A candidate's p, estimated well enough to place against each of `levels`:
// 2,000 seeded draws, and 40,000 when it falls near one of them.
let msPer2000 = 0, timed = 0;
function pOf(cv, total, n, key, levels) {
  const t0 = performance.now();
  let p = uniformityP(cv, total, n, { draws: 2000, rnd: createSeededRng({ ...key, draws: 2000 }) });
  msPer2000 += performance.now() - t0; timed++;
  if (levels.some((l) => p > l / 10 && p < l * 4)) p = uniformityP(cv, total, n, { draws: 40000, rnd: createSeededRng({ ...key, draws: 40000 }) });
  return p;
}

const S = {
  corpus: ROOTS.map((r) => { try { return `${r} @ ${execFileSync("git", ["-C", r, "rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()}`; } catch { return r; } }),
  documents: 0, skipped: 0, withCandidate: 0,
  rules: Object.fromEntries(NAMES.map((r) => [r, { expectedTwoRunDisagreements: 0, couldDiffer: 0, differOver10pct: 0, expectedOffExact: 0 }])),
  stableUnderBefore: { documents: 0, modalReadingMovedUnder: Object.fromEntries(NAMES.map((r) => [r, 0])) },
  offExactAt200: { fromCandidatesWithin04OfLevel: 0, fromCandidatesBeyond: 0, largestDistance: 0 },
  nullOverRealUnits: { readingsMoved: 0, toOneUnit: 0, toACut: 0, toAnotherSeparator: 0 },
  levelDividedOverK: { readingsMoved: 0, toOneUnit: 0 },
  byCategory: {}, mostBorderline: [], dividedExamples: [],
};
const categoryOf = (f) => { const root = ROOTS.find((r) => f === r || f.startsWith(r + path.sep)); const rel = root ? path.relative(root, f) : f; return rel.includes(path.sep) ? rel.split(path.sep)[0] : "(root)"; };
const out = process.env.OUT ? fs.openSync(process.env.OUT, "w") : null;

for (const f of ROOTS.flatMap((r) => walk(r, []))) {
  const size = fs.statSync(f).size;
  if (size > MAX_BYTES || size < 200) { S.skipped++; continue; }
  S.documents++;
  const { elements } = elementsOf(fs.readFileSync(f, "utf8"));
  const cands = collectionCandidates(elements), k = cands.length;
  if (!k) continue;
  S.withCandidate++;
  // Walk the candidates in the reader's order until every verdict is settled
  // and no rule can still reach a later candidate.
  const accepts = Object.fromEntries(NAMES.map((r) => [r, []])), reach = Object.fromEntries(NAMES.map((r) => [r, 1])), rows = [];
  let truth = null, matched = null, divided = null;
  for (let i = 0; i < k; i++) {
    const c = cands[i];
    const p = pOf(c.cv, elements.length, c.n, { f, sk: c.sk }, [LEVEL, LEVEL / k]);
    rows.push({ sk: c.sk, n: c.n, p });
    for (const r of NAMES) { const a = binomCdf(RULES[r].kMax, RULES[r].draws, p); accepts[r].push(a); reach[r] *= 1 - a; }
    if (truth == null && p <= LEVEL) truth = i;
    if (divided == null && p <= LEVEL / k) divided = i;
    if (matched == null && c.units.length >= 2 && pOf(c.cv, c.units.reduce((a, u) => a + u.elements.length, 0), c.units.length, { f, sk: c.sk, matched: true }, [LEVEL]) <= LEVEL) matched = i;
    if (truth != null && divided != null && matched != null && NAMES.every((r) => reach[r] < 1e-9)) break;
  }
  truth ??= k; matched ??= k; divided ??= k; // k: the text is one unit
  const at = (i) => Math.min(i, rows.length); // "one unit" is the last reading
  const dist = {};
  for (const r of NAMES) {
    const P = []; let left = 1;
    for (const a of accepts[r]) { P.push(left * a); left *= 1 - a; }
    P.push(left);
    const differ = 1 - P.reduce((a, x) => a + x * x, 0);
    dist[r] = { differ, pTruth: P[at(truth)], modal: P.indexOf(Math.max(...P)) };
    const R = S.rules[r];
    R.expectedTwoRunDisagreements += differ; R.expectedOffExact += 1 - P[at(truth)];
    if (differ >= 1e-3) R.couldDiffer++;
    if (differ > 0.1) R.differOver10pct++;
  }
  const cat = (S.byCategory[categoryOf(f)] ??= { withCandidate: 0, couldDiffer: 0, differOver10pct: 0 });
  cat.withCandidate++;
  if (dist.before.differ >= 1e-3) cat.couldDiffer++;
  if (dist.before.differ > 0.1) cat.differOver10pct++;
  if (dist.before.differ < 1e-3) { S.stableUnderBefore.documents++; for (const r of NAMES) if (dist[r].modal !== dist.before.modal) S.stableUnderBefore.modalReadingMovedUnder[r]++; }
  const wrong = 1 - dist.plus1_200.pTruth;
  if (wrong > 1e-6) {
    const d = Math.max(0, ...rows.filter((_, i) => accepts.plus1_200[i] > 1e-4 && accepts.plus1_200[i] < 1 - 1e-4).map((x) => Math.abs(x.p - LEVEL)));
    S.offExactAt200.largestDistance = Math.max(S.offExactAt200.largestDistance, d);
    if (d <= 0.04) S.offExactAt200.fromCandidatesWithin04OfLevel += wrong; else S.offExactAt200.fromCandidatesBeyond += wrong;
  }
  if (matched !== truth) { const M = S.nullOverRealUnits; M.readingsMoved++; if (matched === k) M.toOneUnit++; else if (truth === k) M.toACut++; else M.toAnotherSeparator++; }
  if (divided !== truth) { S.levelDividedOverK.readingsMoved++; if (divided === k) S.levelDividedOverK.toOneUnit++; if (k >= 20) S.dividedExamples.push({ f: path.relative(path.dirname(ROOTS[0]), f), k, from: rows[truth]?.sk ?? "(one unit)", p: rows[truth]?.p, to: divided === k ? "(one unit)" : rows[divided].sk }); }
  if (dist.before.differ > 0.4) S.mostBorderline.push({ f: path.relative(path.dirname(ROOTS[0]), f), twoRunDisagreement: +dist.before.differ.toFixed(3) });
  if (out != null) fs.writeSync(out, JSON.stringify({ f, L: elements.length, k, truth, matched, divided, rows, dist }) + "\n");
}
if (out != null) fs.closeSync(out);

const r3 = (x) => +x.toFixed(3);
for (const R of Object.values(S.rules)) for (const key of Object.keys(R)) R[key] = r3(R[key]);
for (const key of Object.keys(S.offExactAt200)) S.offExactAt200[key] = r3(S.offExactAt200[key]);
S.mostBorderline.sort((a, b) => b.twoRunDisagreement - a.twoRunDisagreement).splice(12);
S.dividedExamples.sort((a, b) => b.k - a.k).splice(8);
S.meanMsPer2000Draws = r3(msPer2000 / Math.max(1, timed));
console.log(JSON.stringify(S, null, 2));
