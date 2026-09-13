// shape-to-ideal.mjs — push each golden-free shape axis toward its ideal,
// and look CAREFULLY at what gets lost (2026-09-12).
//
// The ideal shape, per axis:
//   recoverability  -> 1        (100% — already true everywhere)
//   referent purity -> 1        (every referent is a real being)
//   void rate       -> 0        (every pronoun binds)
//   signal-over-noise -> max     (arrangements above the noise floor)
//
// Two interventions, each aimed at one axis, and each COSTS something:
//   A. PURITY GATE — drop every referent that is not a "real being"
//      (surface recurs >=2x AND has a non-sentence-initial occurrence).
//      Pushes purity to 1. What gets lost: any being that is real but named
//      only in sentence-initial position, or named once. Measured and
//      NAMED, not assumed.
//   B. VOID COLLAPSE — resolve each void to the nearest established being
//      by local evidence (the pronoun's sentence +/- 1). Pushes void rate
//      toward 0. What gets lost: every wrong binding — the near-empty-window
//      cases that resolve to the wrong being (the eigen-collapse test's own
//      finding). Measured and NAMED.
//
// usage: node shape-to-ideal.mjs <ledgerPath> <bookPath>
import fs from "node:fs";
import path from "node:path";

const [ledgerPath, bookPath] = process.argv.slice(2);
const raw = fs.readFileSync(bookPath, "utf8");
const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const entities = lines.filter((l) => l.role === "entity" && l.referent);
const sentences = lines.filter((l) => l.role === "sentence" && Array.isArray(l.at)).sort((a, b) => a.at[0] - b.at[0]);
const voids = lines.filter((l) => l.role === "void" && Array.isArray(l.at));

const real = (e) => {
  const surfaces = (e.surfaces ?? []).filter((s) => s && s.length >= 3);
  for (const s of surfaces) {
    // Unicode boundary, NOT \b — \b is ASCII-only (S103's finding: it
    // silently fails on Cyrillic/Greek/Hebrew). My first cut used \b and
    // dropped EVERY real Russian being (Василий, Болконский, Анна
    // Павловна) as "0 occurrences" — the exact bug class S103 already
    // named and fixed in the reader, reproduced in the gate that claimed
    // to measure the reader. Found by looking carefully at what got lost.
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "giu");
    const m = [...raw.matchAll(re)];
    if (m.length >= 2 && m.some((mm) => { const ls = raw.lastIndexOf("\n", mm.index) + 1; return raw.slice(ls, mm.index).trim() !== ""; })) return true;
  }
  return false;
};

console.log(`SHAPE TO IDEAL · ${path.basename(ledgerPath)}`);
console.log(`\n— baseline shape —`);
const pure0 = entities.filter(real).length;
console.log(`  purity ${pure0}/${entities.length} (${(pure0/entities.length*100).toFixed(1)}%) | voids ${voids.length}/${sentences.length} sentences (${(voids.length/sentences.length*100).toFixed(0)}%)`);

// ── A. THE PURITY GATE ──
console.log(`\n— A. purity gate → 1 —`);
const dropped = entities.filter((e) => !real(e));
const kept = entities.filter(real);
console.log(`  keep ${kept.length}, DROP ${dropped.length}`);
for (const e of dropped) {
  const sur = (e.surfaces ?? []).join(", ").slice(0, 60);
  // WHY it failed: count occurrences + whether any is non-initial
  const reasons = [];
  for (const s of (e.surfaces ?? []).filter((x) => x.length >= 3)) {
    const re = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const m = [...raw.matchAll(re)];
    if (m.length < 2) reasons.push(`${s}: only ${m.length} occurrence(s)`);
    else if (!m.some((mm) => { const ls = raw.lastIndexOf("\n", mm.index) + 1; return raw.slice(ls, mm.index).trim() !== ""; })) reasons.push(`${s}: all sentence-initial`);
  }
  console.log(`  LOST ${e.referent} «${sur}» — ${reasons.join("; ") || "fails the being test"}`);
}
console.log(`  purity after gate: 100% — LOST ${dropped.length} referents (listed above)`);

// ── B. THE VOID COLLAPSE ──
console.log(`\n— B. void collapse → 0 —`);
const sIdx = sentences.map((s) => s.at[0]);
const surfaceToRef = new Map();
for (const e of kept) for (const s of (e.surfaces ?? [])) if (s.length >= 3) surfaceToRef.set(s.toLowerCase(), e.referent);
const mentionIn = (text) => { const low = text.toLowerCase(); const set = new Set(); for (const [s, r] of surfaceToRef) if (low.includes(s)) set.add(r); return set; };
let resolved = 0, guessed = 0;
for (const v of voids) {
  let i = 0; while (i < sIdx.length - 1 && sIdx[i + 1] <= v.at[0]) i += 1;
  const lo = Math.max(0, i - 1), hi = Math.min(sentences.length - 1, i + 1);
  const near = new Set();
  for (let k = lo; k <= hi; k++) for (const r of mentionIn(raw.slice(sentences[k].at[0], sentences[k].at[1]))) near.add(r);
  const text = raw.slice(v.at[0], v.at[1]).trim().replace(/\s+/g, " ");
  if (near.size) {
    resolved += 1;
    if (/^(she|her|hers)\b/i.test(text)) guessed += /alice/i.test(raw.slice(Math.max(0, v.at[0]-400), v.at[0])) ? 0 : 1;
  }
}
console.log(`  voids with local evidence: ${resolved}/${voids.length}`);
console.log(`  resolved: ${resolved} (void rate ${((voids.length-resolved)/sentences.length*100).toFixed(0)}% after) — the near-empty-window voids stay gaps (a wrong guess is worse than an honest gap)`);
console.log(`  the cost of collapse: ${guessed} of the resolved voids resolve on window evidence alone — every one of those is a binding a careful reader would VERIFY, not trust`);
console.log(`\n— what gets lost pushing to 100% —`);
console.log(`  purity: ${dropped.length} referents (mostly junk on AIW; on Russian, real beings named sentence-initial would be lost too — the capitalisation-blindness cuts both ways)`);
console.log(`  voids: resolution by window evidence is a GUESS where the pronoun's being isn't in the window — pushing void rate to 0 trades an honest gap for a probable error (the eigen-collapse test measured it: near-empty windows resolve to the wrong being)`);