// eigen-collapse-test.mjs — v2 (2026-09-12), the four outstanding
// improvements applied:
//
//   1. CLEAN SUBSTRATE. The beings are hand-declared (Alice, White Rabbit —
//      the chapter's two real beings; the junk referents i'll/latitude/
//      longitude/oh are excluded). Hand-identified the way S106 hand-
//      identified its dark-referent specimens, and DISCLOSED as such: this
//      test isolates the eigenvalue MECHANICS from the referent-discovery
//      gate (a separate, known gap). "GIVEN the correct beings, does the
//      reading's own dynamics collapse the unbound voids to the right one?"
//   2. REAL DYNAMICS. The transition matrix is FREQUENCY-WEIGHTED (raw
//      co-mention counts between consecutive sentences — no row
//      normalisation, which is what flattened the first version's
//      eigenvector to uniform). Power iteration gives the dominant
//      eigenvector = the being whose prominence the reading's dynamics
//      actually carry.
//   3. COLLAPSE MODULATES, NEVER OVERRIDES. A void with NO local mention
//      evidence stays UNRESOLVED (a kept gap), never guessed to the
//      dominant being — the S109 rule: the prior decides only when no
//      direct witness casts a vote. Collapse only on dynamics ∧ evidence.
//   4. A REFERENCE TO GRADE AGAINST. Hand-built coreference reference for
//      the chapter's voids (which pronoun = which being, read by hand,
//      embedded below) — so the test is a head-to-head number, not a look.
//
// usage: node eigen-collapse-test.mjs <chapter>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CH = Number(process.argv[2] ?? 1);
const BOOK = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt";
const ledgerPath = path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${CH}.eot.jsonl`);

const raw = fs.readFileSync(BOOK, "utf8");
const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

// 1. THE DECLARED BEINGS (hand-identified, disclosed).
const BEINGS = [
  { ref: "Alice", surfaces: ["alice"] },
  { ref: "White Rabbit", surfaces: ["white rabbit", "rabbit"] },
];
const idx = new Map(BEINGS.map((b, i) => [b.ref, i]));
const surfaceToRef = new Map();
for (const b of BEINGS) for (const s of b.surfaces) surfaceToRef.set(s, b.ref);

const sentences = lines.filter((l) => l.role === "sentence" && Array.isArray(l.at)).sort((a, b) => a.at[0] - b.at[0]);
const mentionIn = (text) => { const set = new Set(); const low = text.toLowerCase(); for (const s of surfaceToRef.keys()) if (low.includes(s)) set.add(surfaceToRef.get(s)); return set; };

// 2. FREQUENCY-WEIGHTED co-mention transition (no row normalisation).
const n = BEINGS.length;
const T = Array.from({ length: n }, () => Array(n).fill(0));
const prev = new Set();
for (const s of sentences) {
  const cur = mentionIn(raw.slice(s.at[0], s.at[1]));
  for (const a of prev) for (const b of cur) if (a !== b) T[idx.get(a)][idx.get(b)] += 1;
  prev.clear(); for (const b of cur) prev.add(b);
}
function dominantEigenvector(M, size, iters = 500) {
  let v = Array(size).fill(1);
  for (let it = 0; it < iters; it++) {
    const nv = Array(size).fill(0);
    for (let j = 0; j < size; j++) for (let k = 0; k < size; k++) nv[j] += M[j][k] * v[k];
    const norm = Math.sqrt(nv.reduce((a, b) => a + b * b, 0)) || 1;
    for (let j = 0; j < size; j++) nv[j] /= norm;
    v = nv;
  }
  const pos = v.map((x) => Math.max(0, x)); const sum = pos.reduce((a, b) => a + b, 0) || 1;
  return pos.map((x) => x / sum);
}
const eig = dominantEigenvector(T, n);
const eigWeight = new Map(BEINGS.map((b, i) => [b.ref, eig[i]]));

// 4. HAND-BUILT COREFERENCE REFERENCE (read by hand, ch1): the void's
//    correct being, or "unresolved" when the pronoun names no being
//    (a thing, a family, an abstraction — staying a gap is correct).
const REFERENCE = {
  "sitting by her sister": "Alice",
  "considering in her own mind": "Alice",
  "nor did Alic": "Alice",
  "thought it over afterwards": "Alice",
  "down went Alice after it": "White Rabbit",
  "rabbit-hole went straight on": "unresolved",
  "well was very deep, or she fell": "Alice",
  "she tried to look down": "Alice",
  "took down a jar from one": "Alice",
  "brave they’ll all think me": "unresolved",
  "wouldn’t say anything about it": "unresolved",
  "she said aloud": "Alice",
  "four thousand miles down": "unresolved",
  "idea what Latitude was": "Alice",
  "Presently she began again": "Alice",
  "funny it’ll seem to come out": "Alice",
  "Antipathies, I think": "Alice",
  "tried to curtsey as she spoke": "Alice",
  "you think you could manage it": "unresolved",
  "it’ll never do to ask": "unresolved",
  "hope they’ll remember her saucer": "unresolved",
  "she couldn’t answer": "Alice",
  "felt that she was dozing off": "Alice",
  "down she came upon a heap": "Alice",
  "not a bit hurt, and she jumped": "Alice",
  "away went Alice like the": "Alice",
  "doors all round the hall, but they": "unresolved",
  "came upon a little three-legged": "Alice",
  "locks were too large": "unresolved",
  "found that it led into a small pas": "unresolved",
  "longed to get out of that dark hall": "Alice",
  "no use in waiting by the little door": "Alice",
  "all very well to say": "unresolved",
  "look first,” she said": "Alice",
  "bottle was _not_ marked": "Alice",
};

const voids = lines.filter((l) => l.role === "void" && Array.isArray(l.at)).sort((a, b) => a.at[0] - b.at[0]);
const sIdx = sentences.map((s) => s.at[0]);
const windowMentions = (voidAt) => {
  let i = 0; while (i < sIdx.length - 1 && sIdx[i + 1] <= voidAt[0]) i += 1;
  const lo = Math.max(0, i - 1), hi = Math.min(sentences.length - 1, i + 1);
  const set = new Set();
  for (let k = lo; k <= hi; k++) for (const r of mentionIn(raw.slice(sentences[k].at[0], sentences[k].at[1]))) set.add(r);
  return set;
};

// 3. COLLAPSE: only on dynamics ∧ evidence. No local mention → UNRESOLVED.
const results = [];
for (const v of voids) {
  const text = raw.slice(v.at[0], v.at[1]).trim().replace(/\s+/g, " ");
  const key = Object.keys(REFERENCE).find((k) => text.includes(k));
  const truth = key ? REFERENCE[key] : "unresolved";
  const near = windowMentions(v.at);
  const pick = near.size === 0
    ? "UNRESOLVED"
    : [...near].reduce((a, r) => (eigWeight.get(r) > eigWeight.get(a) ? r : a), [...near][0]);
  const pureLocal = near.size === 0 ? "UNRESOLVED" : [...near][0];
  results.push({ text, truth, pick, pureLocal, near: [...near] });
}

let correct = 0, localCorrect = 0;
const detail = [];
for (const r of results) {
  const pickOK = r.pick === "UNRESOLVED" ? r.truth === "unresolved" : r.pick === r.truth;
  const localOK = r.pureLocal === "UNRESOLVED" ? r.truth === "unresolved" : r.pureLocal === r.truth;
  if (pickOK) correct += 1; if (localOK) localCorrect += 1;
  detail.push(`${pickOK ? "✓" : "✗"} ${r.pick.padEnd(10)} ${r.truth.padEnd(12)} «${r.text.slice(0, 52)}»`);
}
console.log(`eigen-collapse v2 · ch${CH} · beings: ${BEINGS.map((b) => b.ref).join(", ")}`);
console.log(`transition (frequency-weighted): ${T.map((r) => `[${r.join(",")}]`).join("  ")}`);
console.log(`dominant eigenvector: ${BEINGS.map((b, i) => `${b.ref}=${eig[i].toFixed(3)}`).join("  ")}`);
console.log(`\neigen∧evidence: ${correct}/${results.length} voids collapsed correctly`);
console.log(`pure-local    : ${localCorrect}/${results.length} (no dynamics — the control)`);
console.log(`\n${detail.join("\n")}`);