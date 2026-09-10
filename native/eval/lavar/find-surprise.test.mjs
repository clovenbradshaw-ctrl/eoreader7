// find-surprise.test.mjs — regression pin for the continuous-null redesign
// of `findSurprise` in helix-read.mjs. Same posture as this directory's
// other `*-test.mjs` files (console narrative + a results JSON, not wired
// into `npm test`'s conformance globs). `node find-surprise.test.mjs` —
// exits 1 on any failed assertion.
//
// WHY THIS FILE EXISTS: `findSurprise`'s redeal null was, for a real
// stretch of this project's history, structurally incapable of ever
// returning `regular:true` for ANY input — proven, not just observed (see
// the block comment on `occupancy()` in helix-read.mjs for the full
// derivation). That defect shipped silently: nothing pinned the ONE
// behavior that actually matters — that a genuinely regular identity set,
// with a real hole in it, gets found. This file pins exactly that, against
// the real specimen the fix was verified on (P&P's own chapter numerals),
// so a future edit to `findSurprise` that reintroduces the tautology (or
// any other total loss of power) fails loudly here instead of shipping
// silently again.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findSurprise } from "./helix-read.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail) {
  const ok = !!cond;
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
  results.push({ name, ok, detail });
}

// ── 1. THE REAL SPECIMEN — a real book's own chapter numerals, one real
//    hole in them, the exact shape the fix was verified against. ─────────
console.log("=== 1. real specimen — P&P chapter numerals 2..61, one hole at 46 ===");
const pp = Array.from({ length: 60 }, (_, i) => i + 2).filter((n) => n !== 46); // 2..61, missing 46
const pnp = findSurprise(pp, (n) => n, { draws: 1000, seed: 1, alpha: 0.05 });
console.log(`regular=${pnp.regular} p=${pnp.p} cv=${pnp.cv}`);
check("59-of-60 real chapter numerals clears its own null", pnp.regular === true, `p=${pnp.p}`);
check("p is well below alpha, not just barely under it", pnp.p !== null && pnp.p < 0.01, `p=${pnp.p}`);
const foundGap = pnp.regular ? pnp.surprises.find((s) => s.position === 46) : null;
check("the actual missing chapter (46) is named as a surprise", !!foundGap, JSON.stringify(foundGap));
check("the surprise correctly names its real neighbours", foundGap?.between?.[0] === 45 && foundGap?.between?.[1] === 47, JSON.stringify(foundGap?.between));

// ── 2. DEGENERACY GUARD — a perfectly regular, zero-gap set must clear
//    trivially. This was ALSO broken by the original tautology (a
//    perfectly regular set is the best possible case for any null, and it
//    still returned regular:false, p=1). ─────────────────────────────────
console.log("\n=== 2. degeneracy guard — perfectly regular set must clear ===");
const dense = Array.from({ length: 300 }, (_, i) => i + 1);
const rd = findSurprise(dense, (n) => n, { draws: 500, seed: 1, alpha: 0.05 });
check("a perfectly regular 300-member run clears its own null", rd.regular === true, `p=${rd.p}`);
check("a perfectly regular run reports zero surprises", rd.regular && rd.surprises.length === 0, `${rd.surprises?.length} surprise(s)`);

// ── 3. DISCRIMINATION GUARD — the fix must not have traded a
//    never-true tautology for an always-true one; genuinely irregular
//    input must still correctly fail. ─────────────────────────────────────
console.log("\n=== 3. discrimination guard — genuinely irregular input must still fail ===");
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry(7);
const scatterSet = new Set();
while (scatterSet.size < 59) scatterSet.add(2 + Math.floor(rnd() * 6000)); // wide, genuinely scattered domain
const scatter = [...scatterSet].sort((a, b) => a - b);
const rs = findSurprise(scatter, (n) => n, { draws: 500, seed: 1, alpha: 0.05 });
check("a wide random scatter (same count as the real specimen) does NOT clear its own null", rs.regular === false, `p=${rs.p}`);

const clustered = findSurprise([1, 2, 3, 20, 21, 22, 40, 41, 42], (m) => m, { draws: 500, seed: 1, alpha: 0.05 });
check("three tight clusters separated by wide gaps does NOT read as one regular run", clustered.regular === false, `p=${clustered.p}`);

// ── 4. POWER — the specific failure mode this fix targets: the module's
//    actual primary use case (a handful of real holes in an otherwise
//    long, complete numbered run) must reliably clear the null. A share-
//    based statistic swap (occupancy's replacement, tried and rejected
//    during this fix) restores non-degeneracy but NOT this — verified
//    separately, not repeated here as a pinned assertion since it's a
//    design-space note, not a regression risk on its own. ─────────────────
console.log("\n=== 4. power — randomly-placed holes in a long run must reliably clear ===");
let allCleared = true;
for (const missing of [1, 3, 8, 20]) {
  const seedRnd = mulberry(1000 + missing * 31);
  const base = Array.from({ length: 200 }, (_, i) => i + 1);
  const removable = base.slice(1, -1);
  const toRemove = new Set();
  while (toRemove.size < missing) toRemove.add(removable[Math.floor(seedRnd() * removable.length)]);
  const withHoles = base.filter((n) => !toRemove.has(n));
  const r = findSurprise(withHoles, (n) => n, { draws: 500, seed: missing });
  console.log(`  missing=${missing}: regular=${r.regular} p=${r.p}`);
  if (!r.regular) allCleared = false;
}
check("1, 3, 8, and 20 randomly-placed holes in a 200-slot run all clear the null", allCleared);

// ── summary ────────────────────────────────────────────────────────────
console.log(`\n${pass} passed, ${fail} failed`);
fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
fs.writeFileSync(path.join(HERE, "results", "find-surprise-test.json"), JSON.stringify({ pass, fail, results }, null, 1));
if (fail > 0) process.exit(1);
