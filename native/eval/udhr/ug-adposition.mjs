#!/usr/bin/env node
// Handle: Chomsky / Greenberg — a parameter, set from very little input.
// eval/udhr/ug-adposition.mjs — THE FIRST PARAMETER: PREPOSITIONS OR POSTPOSITIONS.
//
// Principles and parameters: the principles are the cube (every word takes a
// cell, every relation is addressed); a parameter is a setting each language
// fixes and a learner can fix from little input. The first one tested is the
// side an adposition takes relative to its nominal — the parameter Greenberg
// found tied to verb–object order across the world's languages.
//
// SET FROM THE UDHR ALONE. A language's adpositions are found by projecting
// part of speech from every pivot language that has its own treebank prior
// (majority vote, the target never its own pivot). Then each occurrence of an
// adposition is read in the raw text: is the next word nominal material, or
// the previous one? The share that looks forward is the setting.
//
// AGAINST A NULL, NOT A CUT. The same forward share is computed for random
// word sets of the same size drawn from the same text; the adpositions'
// share must fall outside that distribution to count as a setting at all.
// Inside it, the parameter is reported as undetermined.
//
// CHECKED AGAINST TREEBANKS where we hold both. The truth is the share of
// FREE-STANDING adpositions that precede their head — free-standing only,
// because raw text shows a tokenizer only those: Hebrew and Arabic write many
// prepositions fused onto the next word, and the treebank's multiword-token
// ranges say exactly which.
//
//   node native/eval/udhr/ug-adposition.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadUdhr } from "./udhr-corpus.mjs";
import { projectLanguage, tokens, VALIDATION } from "./ug-projection.mjs";
import { vote } from "./ug-multipivot.mjs";
import { parseConllu } from "../../kernel/eot-rich.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.resolve(HERE, "..", "..", "priors");
const FIXTURES = path.resolve(HERE, "..", "fixtures");

const NOMINAL = new Set(["NOUN", "PROPN", "PRON", "DET", "ADJ", "NUM"]);

function uposPrior(code) {
  const f = path.join(PRIORS, `pos-${code}.json`);
  if (!fs.existsSync(f)) return null;
  const forms = JSON.parse(fs.readFileSync(f, "utf8")).forms ?? {};
  return (w) => { const e = forms[w]; return e ? Object.entries(e).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null : null; };
}

function seeded(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
}

const unitsOf = (doc) => [...doc.preamble, ...doc.articles.flatMap((a) => a.paragraphs)].map(tokens);

/** Forward share: of a word set's occurrences with a nominal on exactly one
 *  side, the share where that nominal FOLLOWS. */
function forwardShare(units, words, labelOf) {
  let fwd = 0, back = 0;
  for (const u of units) for (let i = 0; i < u.length; i++) {
    if (!words.has(u[i])) continue;
    const next = NOMINAL.has(labelOf(u[i + 1])), prev = NOMINAL.has(labelOf(u[i - 1]));
    if (next && !prev) fwd++; else if (prev && !next) back++;
  }
  return { share: fwd + back ? fwd / (fwd + back) : null, n: fwd + back };
}

/** The truth from a treebank: share of free-standing adpositions (not part of
 *  a multiword token) that precede their head. */
export function treebankTruth(dir) {
  if (!fs.existsSync(dir)) return null;
  let before = 0, n = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".conllu"))) {
    for (const s of parseConllu(fs.readFileSync(path.join(dir, f), "utf8"))) {
      const fused = new Set();
      for (const m of s.multi) { const [a, b] = m.range.split("-").map(Number); for (let i = a; i <= b; i++) fused.add(i); }
      for (const t of s.tokens) {
        if (t.upos !== "ADP" || !t.head || fused.has(t.id)) continue;
        n++; if (t.id < t.head) before++;
      }
    }
  }
  return n ? { share: before / n, n } : null;
}

const TARGETS = Object.freeze({
  arb: { udhr: "arb", treebank: "ud-arabic-padt" },
  heb: { udhr: "heb", treebank: "ud-hebrew-htb" },
  lat: { udhr: "lat", treebank: "ud-latin-perseus" },
  san: { udhr: "san", treebank: "ud-sanskrit-vedic" },
  pcm: { udhr: "pcm", treebank: "../../../../live_priors/11-multi-language/dialects-pidgins-creoles/creoleval/pos_ud_naija_pcm" },
});

export function settleAdposition(target, pivots, { shuffles = 10, draws = 400 } = {}) {
  const perPivot = pivots.filter((p) => p.code !== target.code).map((p) => [p.code, projectLanguage(p.doc, target, { pivot: p.uposOf, shuffles }).projected]);
  const { projected } = vote(perPivot);
  const labelOf = (w) => (w ? projected.get(w)?.cell ?? null : null); // vote() stores the voted label in `cell`
  const adps = new Set([...projected].filter(([, v]) => v.cell === "ADP").map(([w]) => w));
  const units = unitsOf(target);
  const obs = forwardShare(units, adps, labelOf);
  // THE NULL: random word sets of the same size, from the same text.
  const vocab = [...new Set(units.flat())];
  const rand = seeded(`${target.code}#adp`);
  const nulls = [];
  for (let d = 0; d < draws && adps.size; d++) {
    const pick = new Set();
    while (pick.size < Math.min(adps.size, vocab.length)) pick.add(vocab[Math.floor(rand() * vocab.length)]);
    const r = forwardShare(units, pick, labelOf);
    if (r.share != null) nulls.push(r.share);
  }
  nulls.sort((a, b) => a - b);
  const lo = nulls[Math.floor(0.01 * (nulls.length - 1))], hi = nulls[Math.floor(0.99 * (nulls.length - 1))];
  let setting = "undetermined";
  if (obs.share != null && nulls.length) setting = obs.share > hi ? "prepositional" : obs.share < lo ? "postpositional" : "undetermined";
  return { code: target.code, adpositions: [...adps].slice(0, 12), nAdp: adps.size, share: obs.share, occurrences: obs.n, nullLo: lo, nullHi: hi, setting, labelled: projected.size };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const docs = new Map(loadUdhr().filter((d) => d.blocks === 31).map((d) => [d.code, d]));
  const pivotLangs = { eng: "eng", ...VALIDATION };
  const pivots = [];
  for (const [pcode, ucode] of Object.entries(pivotLangs)) {
    const doc = docs.get(ucode); const up = uposPrior(pcode);
    if (!doc || !up) continue;
    const toks = unitsOf(doc).flat();
    if (toks.filter((t) => up(t)).length / toks.length < 0.25) continue; // prior cannot type this translation
    pivots.push({ code: pcode, doc, uposOf: up });
  }
  console.log(`pivots: ${pivots.map((p) => p.code).join(" ")}\n`);
  console.log(`${"lang".padEnd(5)} ${"adps".padStart(4)} ${"occ".padStart(5)} ${"fwd".padStart(6)} ${"null 1–99%".padStart(13)} ${"setting".padEnd(15)} | ${"treebank fwd".padStart(12)} ${"n".padStart(6)}  adpositions found`);
  const rows = [];
  for (const [code, t] of Object.entries(TARGETS)) {
    const doc = docs.get(t.udhr);
    if (!doc) { console.log(`${code.padEnd(5)} no segmented translation`); continue; }
    const r = settleAdposition({ ...doc, code }, pivots);
    const truth = treebankTruth(path.resolve(FIXTURES, t.treebank));
    rows.push({ ...r, truth });
    const f = (x) => (x == null ? "  n/a" : x.toFixed(2));
    console.log(`${code.padEnd(5)} ${String(r.nAdp).padStart(4)} ${String(r.occurrences).padStart(5)} ${f(r.share).padStart(6)} ${`${f(r.nullLo)}–${f(r.nullHi)}`.padStart(13)} ${r.setting.padEnd(15)} | ${f(truth?.share).padStart(12)} ${String(truth?.n ?? 0).padStart(6)}  ${r.adpositions.join(" ")}`);
  }
  const out = path.resolve(HERE, "..", "results", "ug-adposition.json");
  fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), pivots: pivots.map((p) => p.code), rows }, null, 2));
  console.log(`\n${out}`);
}
