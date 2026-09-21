#!/usr/bin/env node
// Handle: Chomsky / Greenberg — the head-direction parameter, from raw text alone.
// eval/udhr/ug-branching.mjs — SET A PARAMETER WITHOUT ALIGNMENT OR ANNOTATION.
//
// The alignment route could not set the adposition parameter
// (ug-adposition.mjs, measured 2026-09-21): function words appear in nearly
// every article, so they never co-occur distinctively with anything, and
// fifty projected labels a language are too few to read a neighbour.
//
// This reads the parameter off the raw text's own statistics. Where a
// language puts heads first, its frequent function words PRECEDE varied
// material — "in [anything]", "the [anything]" — so the word AFTER a frequent
// word is harder to predict than the word before it. Where heads come last,
// the asymmetry reverses. The measure is each word's following-word entropy
// minus its preceding-word entropy, averaged with the word's own frequency as
// weight: frequent words dominate by their frequency, and no cut decides
// which words count.
//
// AGAINST A NULL. The same measure on the same units with word order
// shuffled inside each unit — which destroys direction and keeps the words.
//
// VALIDATED BEFORE TRUSTED. On every treebank we hold, the measure on the
// treebank's own raw word forms is compared with the treebank's GOLD head
// direction (the share of dependents that follow their head). Only if the two
// agree in rank is the measure read on the UDHR at all.
//
//   node native/eval/udhr/ug-branching.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadUdhr } from "./udhr-corpus.mjs";
import { tokens } from "./ug-projection.mjs";
import { parseConllu } from "../../kernel/eot-rich.js";
import { findTreebanks } from "../eot-roundtrip.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function seeded(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
}

const H = (m) => { let n = 0; for (const c of m.values()) n += c; let h = 0; for (const c of m.values()) { const p = c / n; h -= p * Math.log2(p); } return h; };

/** Frequency-weighted mean of (following-word entropy − preceding-word entropy). */
export function asymmetry(units) {
  const next = new Map(), prev = new Map(), freq = new Map();
  for (const u of units) for (let i = 0; i < u.length; i++) {
    const w = u[i];
    freq.set(w, (freq.get(w) ?? 0) + 1);
    const nx = i + 1 < u.length ? u[i + 1] : "⟨end⟩";
    const pv = i > 0 ? u[i - 1] : "⟨start⟩";
    if (!next.has(w)) { next.set(w, new Map()); prev.set(w, new Map()); }
    next.get(w).set(nx, (next.get(w).get(nx) ?? 0) + 1);
    prev.get(w).set(pv, (prev.get(w).get(pv) ?? 0) + 1);
  }
  let num = 0, den = 0;
  for (const [w, f] of freq) {
    if (f < 2) continue;
    num += f * (H(next.get(w)) - H(prev.get(w)));
    den += f;
  }
  return den ? num / den : 0;
}

export function withNull(units, { seed = "branch", draws = 30 } = {}) {
  const obs = asymmetry(units);
  const rand = seeded(seed);
  const nulls = [];
  for (let d = 0; d < draws; d++) {
    const shuf = units.map((u) => { const a = [...u]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; });
    nulls.push(asymmetry(shuf));
  }
  nulls.sort((a, b) => a - b);
  const lo = nulls[0], hi = nulls[nulls.length - 1];
  const setting = obs > hi ? "head-initial" : obs < lo ? "head-final" : "undetermined";
  return { obs, lo, hi, setting };
}

/** Gold head direction of a treebank: share of non-punctuation dependents
 *  that FOLLOW their head. */
function goldHeadInitial(sents) {
  let after = 0, n = 0;
  for (const s of sents) for (const t of s.tokens) {
    if (!t.head || String(t.deprel).startsWith("punct")) continue;
    n++; if (t.id > t.head) after++;
  }
  return n ? after / n : null;
}

const spearman = (xs, ys) => {
  const rank = (v) => { const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); idx.forEach(([, i], k) => { r[i] = k; }); return r; };
  const rx = rank(xs), ry = rank(ys), n = xs.length;
  let d2 = 0; for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
};

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("VALIDATION — the measure on each treebank's raw forms against its gold head direction:");
  const val = [];
  for (const tb of findTreebanks()) {
    const sents = tb.files.flatMap((f) => parseConllu(fs.readFileSync(f, "utf8")));
    const units = sents.map((s) => s.tokens.filter((t) => t.upos !== "PUNCT").map((t) => t.form.toLocaleLowerCase()));
    const r = withNull(units, { seed: tb.name });
    const gold = goldHeadInitial(sents);
    val.push({ tb: tb.name, gold, ...r });
    console.log(`   ${tb.name.padEnd(20)} gold head-initial ${gold.toFixed(2)}  asymmetry ${r.obs.toFixed(3).padStart(7)}  null [${r.lo.toFixed(3)}, ${r.hi.toFixed(3)}]  → ${r.setting}`);
  }
  const rho = spearman(val.map((v) => v.gold), val.map((v) => v.obs));
  console.log(`   rank agreement (Spearman) between gold and measure: ${rho.toFixed(2)} over ${val.length} treebanks\n`);

  const docs = loadUdhr().filter((d) => d.blocks === 31);
  const rows = docs.map((d) => {
    const units = [...d.preamble, ...d.articles.flatMap((a) => a.paragraphs)].map(tokens);
    return { code: d.code, language: d.language, ...withNull(units, { seed: d.code }) };
  });
  const tally = {};
  for (const r of rows) tally[r.setting] = (tally[r.setting] ?? 0) + 1;
  console.log(`UDHR, ${rows.length} languages: ${JSON.stringify(tally)}`);
  const show = ["eng", "fra", "spa", "arb", "heb", "swh", "yor", "vie", "ind", "tgl", "jpn", "kor", "tur", "hin", "tam", "eus", "quz", "nav", "fin", "hun", "kal", "ike", "cmn_hans", "rus", "lat", "san"];
  for (const c of show) { const r = rows.find((x) => x.code === c); if (r) console.log(`   ${c.padEnd(9)} ${r.obs.toFixed(3).padStart(7)}  null [${r.lo.toFixed(3)}, ${r.hi.toFixed(3)}]  ${r.setting.padEnd(13)} ${r.language ?? ""}`); }
  const out = path.resolve(HERE, "..", "results", "ug-branching.json");
  fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), validation: val, spearman: rho, udhr: rows }, null, 2));
  console.log(`\n${out}`);
}
