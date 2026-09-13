// gfp-base.mjs — the GFP-BASE reader (2026-09-12). The reader must not be
// English-shaped. SVO (subject/verb/object) is a HYPERLEXICON LENS — the
// English reading of an arrangement, declared once, never required (P76:
// "two ordered ends and a label is already typologically neutral"; LAVAR §13:
// "never write subject, verb or object onto a record"). GROUND/FIELD/PATTERN
// is the base, and everything builds up from there.
//
// So this reader uses ZERO English-shaped assumptions:
//   - NO capitalisation-based figure discovery (S86's gate) — figures are
//     found by RECURRENCE + company (S87/S88's heard-surfaces direction),
//     which works on Russian, Hebrew, Korean, a musical motif, a code
//     identifier.
//   - NO positional subject/verb/object extraction — an arrangement is
//     {end1, label, end2} emitted from figure-connector-figure adjacency.
//   - NO English verb vocabulary — a label is typed by its CELL in the cube:
//     a connector between two figures is CON·Figure (Link) if it settles as
//     an action, CON·Ground (Field) if it is a co-presence/state marker,
//     SEG·Figure (Distinction) if it separates. The POS prior only TYPES the
//     cell when it can; a connector that does not settle is a typed grain
//     gap, kept in full.
//
// The sworm's LOWEST holon level is these GFP atoms; the English SVO lens is
// a higher organ the sworm selects only when the shape says it helps.
//
// usage: node gfp-base.mjs <bookPath> <chapter> [--lang=rus] [--min-rec=N]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BOOK = process.argv[2];
const CH = Number(process.argv[3] ?? 1);
const LANG = (process.argv.find((a) => a.startsWith("--lang=")) ?? "--lang=eng").replace("--lang=", "");
const MIN_REC = Number((process.argv.find((a) => a.startsWith("--min-rec=")) ?? "--min-rec=2").replace("--min-rec=", ""));
const raw = fs.readFileSync(BOOK, "utf8");
const POS = JSON.parse(fs.readFileSync(path.join(HERE, "../../priors", LANG === "eng" ? "pos-eng.json" : `pos-${LANG}.json`), "utf8"));
const forms = POS.forms ?? POS;
// function/closed words to never call a figure (from the received POS prior:
// a token whose dominant class is a function class is not a being).
const FUNCTION_CLASSES = new Set(["ADP","CCONJ","SCONJ","DET","PRON","AUX","PART","INTJ","NUM","PUNCT","SYM","X"]);
const dominant = (tags) => { const entries = Object.entries(tags ?? {}); entries.sort((a, b) => b[1] - a[1]); return entries[0]?.[0]; };
const isFunction = (tok) => {
  const e = forms[tok.toLowerCase()];
  if (!e) return false;
  return FUNCTION_CLASSES.has(dominant(e));
};
// Unicode word tokens (language-neutral).
const WORD = /[\p{L}\p{N}]+/gu;
const tokens = [...raw.matchAll(WORD)].map((m) => ({ tok: m[0], start: m.index, end: m.index + m[0].length }));

// ── FIGURES: recurring content tokens (recurrence + company, no case) ──
const counts = new Map();
for (const { tok } of tokens) counts.set(tok.toLowerCase(), (counts.get(tok.toLowerCase()) ?? 0) + 1);
const figures = new Map(); // figure -> positions
for (const { tok, start } of tokens) {
  const t = tok.toLowerCase();
  if (counts.get(t) < MIN_REC) continue;
  if (isFunction(tok)) continue;
  if (t.length < 3) continue;
  if (!figures.has(t)) figures.set(t, []);
  figures.get(t).push(start);
}
// The FIGURE/GROUND of an arrangement: two figures whose mentions ADJOIN in
// reading order (the token between them is the label). Language-neutral.
const figList = [...figures.keys()].sort((a, b) => figures.get(a)[0] - figures.get(b)[0]);
// All figure mentions, in reading order: [figure, position]
const mentions = [];
for (const [f, ps] of figures) for (const p of ps) mentions.push([f, p]);
mentions.sort((a, b) => a[1] - b[1]);
// For each mention, the label is the text between it and the NEXT figure
// mention (bounded — the arrangement is figure-connector-figure adjacency).
const arrangements = [];
for (let i = 0; i < mentions.length - 1; i++) {
  const [f1, p1] = mentions[i];
  const [f2, p2] = mentions[i + 1];
  if (p2 - p1 > 200) continue; // too far apart — not an adjacency
  const label = raw.slice(p1 + f1.length, p2).replace(/\s+/g, " ").trim();
  if (!label || label.length > 40) continue;
  if (label === f2) continue; // no connector at all
  // TYPE THE CELL from the label's head (the received prior when it can).
  const head = label.split(/[^-\p{L}]+/u).filter(Boolean)[0]?.toLowerCase();
  let cell = "CON·Ground (Field)"; // default: a co-presence (GFP Ground)
  if (head) {
    const e = forms[head];
    const d = dominant(e);
    if (d === "VERB") cell = "CON·Figure (Link)";
    else if (d === "CCONJ" || d === "SCONJ") cell = "SEG·Figure (Distinction)";
    else if (!e) cell = "grain_gap — kept, never guessed";
  }
  arrangements.push({ end1: f1, label, end2: f2, cell, at: [p1, p2] });
}
// de-duplicate adjacent arrangements (same figure pair, same label)
const seen = new Set();
const unique = [];
for (const a of arrangements) { const k = `${a.end1}|${a.label.slice(0, 12)}|${a.end2}`; if (!seen.has(k)) { seen.add(k); unique.push(a); } }
// emit a MINIMAL LEDGER so the golden-free shape can measure it (entities =
// the figures, propositions = the arrangements, sentence = the whole window).
const L = path.join(HERE, "results", `${path.basename(BOOK, ".txt").replace(/\W+/g, "-")}-gfp-base-ch${CH}.eot.jsonl`);
const lines = [];
lines.push(JSON.stringify({ seq: 0, schema: "EOTSource@1", path: BOOK, addressing: "GFP-base — figure-connector-figure, no capitalisation, no SVO" }));
lines.push(JSON.stringify({ seq: 1, schema: "EOTObservation@1", id: "s1", at: [0, raw.length], role: "sentence" }));
let seq = 2;
for (const [i, f] of figList.entries()) lines.push(JSON.stringify({ seq: seq++, schema: "EOTObservation@1", id: `e${i}`, at: [figures.get(f)[0], figures.get(f)[0] + f.length], role: "entity", referent: `gfp:${f}`, surfaces: [f] }));
for (const [i, a] of unique.entries()) lines.push(JSON.stringify({ seq: seq++, schema: "EOTObservation@1", id: `o${i}`, at: a.at, role: "proposition", end1: a.end1, label: a.label.slice(0, 24), end2: a.end2, grain_gap: a.cell.startsWith("grain_gap") ? a.cell : undefined, grain: a.cell.startsWith("grain_gap") ? undefined : a.cell }));
fs.writeFileSync(L, lines.join("\n") + "\n");
console.log(`GFP-BASE reader · ${path.basename(BOOK)} ch${CH} · ${LANG} · min-rec ${MIN_REC}`);
console.log(`figures (recurrence+company, NO capitalisation): ${figures.size} — ${figList.slice(0, 10).join(", ")}${figList.length > 10 ? "..." : ""}`);
console.log(`arrangements (figure-connector-figure, GFP-typed): ${unique.length}`);
for (const a of unique.slice(0, 12)) console.log(`  ${a.cell.padEnd(24)} ${a.end1} ${JSON.stringify(a.label.slice(0, 16))} ${a.end2}`);
console.log(`ledger: ${path.relative(process.cwd(), L)}`);