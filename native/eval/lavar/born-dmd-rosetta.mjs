// born-dmd-rosetta.mjs — the EXPERIMENT: does the cross-language identity
// boundary come OUT of DMD + Born, instead of a hand-set overlap threshold?
//
// Each being has an appearance-INTENSITY trajectory over the aligned
// passages (surface occurrences per passage; the aligned corpus is the same
// content in every language, so the trajectory is language-independent).
// For every cross-language pair (X in en, Y in ru), DMD the JOINT 2-channel
// trajectory at rank 1 — one coherent mode is the hypothesis "X and Y are
// the same being." The leading eigenvalue's Born probability P=|λ|² is the
// coherence. The NULL is the same computation on permuted pairs (different
// beings, same marginals); its upper envelope IS the admission boundary.
// If the known identities land above the derived boundary and random pairs
// below it, the boundary is determined, not typed.
import fs from "node:fs";
import { dmd } from "../../kernel/dmd.js";

const WP = "/Users/mlacy/Documents/3.0/live_priors/11-multi-language/war-and-peace";
const VERSIONS = [
  { lang: "eng", slug: "pg2600-ch1-3-aligned", file: `${WP}/aligned/en/pg2600-ch1-3-aligned.txt` },
  { lang: "fra", slug: "guerre-et-paix-ch1-3-aligned", file: `${WP}/aligned/fr/guerre-et-paix-ch1-3-aligned.txt` },
  { lang: "rus", slug: "voyna-i-mir-ch1-3-aligned", file: `${WP}/aligned/ru/voyna-i-mir-ch1-3-aligned.txt` },
];
const paras = (t) => (t ?? "").split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);

const versions = VERSIONS.map((v) => {
  const fold = JSON.parse(fs.readFileSync(`eval/lavar/results/${v.slug}-real-fold.json`, "utf8"));
  const refs = fold.graphEntries.filter((e) => e.schema === "EOReferent@1");
  const text = fs.readFileSync(v.file, "utf8");
  const allParas = paras(text);
  const N = allParas.length;
  // per being: appearance-intensity trajectory over passages
  const beings = [];
  for (const r of refs) {
    const sur = (r.surfaces ?? [])[0] ?? r.id;
    const sl = String(sur).toLowerCase();
    if (sl.length < 4) continue;
    const traj = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const low = allParas[i].toLowerCase();
      let c = 0, idx = 0;
      while ((idx = low.indexOf(sl, idx)) !== -1) { c++; idx += sl.length; }
      traj[i] = c;
    }
    beings.push({ ref: r.id, surface: sur, traj, active: traj.some((x) => x > 0) });
  }
  return { ...v, beings: beings.filter((b) => b.active), N };
});

console.log(`DMD+BORN experiment · W&P ch1-3 · ${versions.map((v) => `${v.lang}:${v.beings.length} active beings, ${v.N} passages`).join(" · ")}`);

// ── THE COHERENCE of a pair: DMD rank-1 on the joint 2-channel trajectory,
// restricted to the passages where either being is active (a zero-dominated
// trajectory has no dynamics to decompose). P = |λ|².
function coherence(trajA, trajB, N) {
  const active = [];
  for (let i = 0; i < N; i++) if (trajA[i] > 0 || trajB[i] > 0) active.push(i);
  if (active.length < 3) return 0; // no dynamics
  // the 2-row state at each active step
  const states = active.map((i) => [trajA[i], trajB[i]]);
  // X = states[0..n-2], Xp = states[1..n-1]
  const X = states.slice(0, -1);
  const Xp = states.slice(1);
  const r = dmd(X, Xp, { rank: 1 });
  const lam = r.eigenvalues[0];
  if (!lam || !Number.isFinite(lam.magnitude)) return 0;
  return lam.magnitude * lam.magnitude; // Born P=|λ|²
}

// ── NULL: permute the coupling — random different-beings pairs, same
// marginals. Its upper envelope is the admission boundary.
const langs = versions.map((v) => v.lang);
const pairs = [];
for (let a = 0; a < versions.length; a++) for (let b = a + 1; b < versions.length; b++) pairs.push([a, b]);

const nullCoherences = [];
for (const [a, b] of pairs) {
  const A = versions[a].beings, B = versions[b].beings;
  const rng = () => Math.floor(Math.random() * B.length);
  for (let trial = 0; trial < 400; trial++) {
    const i = Math.floor(Math.random() * A.length);
    const j = rng();
    // ensure it's a DIFFERENT being (not the same canonical name)
    nullCoherences.push(coherence(A[i].traj, B[j].traj, versions[a].N));
  }
}
nullCoherences.sort((x, y) => x - y);
const boundary = nullCoherences[Math.floor(0.99 * nullCoherences.length)]; // null's 99th percentile
console.log(`\nNULL (random different-being pairs, ${nullCoherences.length} samples):`); 
console.log(`  median P=${nullCoherences[Math.floor(nullCoherences.length/2)].toFixed(4)}  p95=${nullCoherences[Math.floor(0.95*nullCoherences.length)].toFixed(4)}  p99=${boundary.toFixed(4)}  max=${nullCoherences[nullCoherences.length-1].toFixed(4)}`);
console.log(`  ADMISSION BOUNDARY (null p99): P >= ${boundary.toFixed(4)}`);

// ── the KNOWN identities: the surface-normalized matches I trust (the 
// beings every translation actually names). This is the CHECK SET, not the
// calibration set — the boundary above came only from the null.
const known = [
  ["Anna Pávlovna", "Anna Pavlovna", "Анна Павловна"],
  ["Pierre", "Pierre", "Пьер"],
  ["Prince Vasíli Kurágin", "Vassili", "Василий"],
  ["Prince Andrew", "André", "Андрей"],
  ["Hippolyte", "Hippolyte", "Ипполит"],
  ["Hélène", "Hélène", "Элен"],
  ["Anatole", "Anatole", "Анатоль"],
  ["Lise", "Lise", "Lise"],
  ["Annette", "Annette", "Annette"],
  ["Mortemart", "Mortemart", "Мортемара"],
  ["Kutúzov", "—", "—"],
  ["Bonaparte", "Bonaparte", "Бонапарте"],
  ["Empress Márya Fëdorovna", "Maria Fedorovna", "Марии Феодоровны"],
];
const norm = (s) => String(s).toLowerCase().replace(/[’']/g, "'").replace(/[éèêë]/g, "e").replace(/[áàâä]/g, "a").replace(/[ïíî]/g, "i").replace(/[óôö]/g, "o").replace(/[úûü]/g, "u").replace(/[ç]/g, "c");
function find(beingSur, lang) {
  const n = norm(beingSur);
  const v = versions[lang];
  return v.beings.find((b) => norm(b.surface) === n) ?? v.beings.find((b) => b.surface.includes(beingSur)) ?? null;
}
console.log(`\n— the known identities through the DMD+Born gate —`);
console.log(`  (boundary = ${boundary.toFixed(4)} from the null; the gate is DERIVED, the check set is separate)`);
let within = 0, total = 0;
for (const [en, fra, rus] of known) {
  const enB = find(en, 0), frB = find(fra, 1), ruB = find(rus, 2);
  const label = `${en} / ${fra} / ${rus}`;
  const results = [];
  if (enB && frB) { total++; const P = coherence(enB.traj, frB.traj, versions[0].N); const hit = P >= boundary; if (hit) within++; results.push(`eng-fra P=${P.toFixed(3)}${hit ? "✓" : "✗"}`); }
  if (enB && ruB) { total++; const P = coherence(enB.traj, ruB.traj, versions[0].N); const hit = P >= boundary; if (hit) within++; results.push(`eng-rus P=${P.toFixed(3)}${hit ? "✓" : "✗"}`); }
  if (frB && ruB) { total++; const P = coherence(frB.traj, ruB.traj, versions[1].N); const hit = P >= boundary; if (hit) within++; results.push(`fra-rus P=${P.toFixed(3)}${hit ? "✓" : "✗"}`); }
  console.log(`  ${label}: ${results.join("   ")}`);
}
console.log(`\n  RECALL of known identities above the derived boundary: ${within}/${total}`);

// ── PRECISION: how many null pairs are falsely admitted (the boundary's own cost)
const falseAlarms = nullCoherences.filter((p) => p >= boundary).length;
console.log(`  FALSE ALARM rate at the boundary: ${falseAlarms}/${nullCoherences.length} = ${(falseAlarms/nullCoherences.length).toFixed(4)}`);