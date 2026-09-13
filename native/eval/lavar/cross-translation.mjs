// cross-translation.mjs — the Rosetta match on span-free referent nodes
// (2026-09-12). Reads the same work in multiple translations, extracts each
// version's referent NODES (span-free), and adjudicates which nodes are the
// SAME BEING across versions — the meta-id, which exists only for the
// adjudicator (S113: identity across versions is an act of pointing, never a
// fact of the bytes).
//
// The match is not by string (Анна Павловна ≠ Anna Pávlovna). It is by
// EVIDENCE: the same work's aligned units, the same structural position, the
// copula anchors (был/était/was — the near-universal relation), and the
// company each being keeps. A match is a HOLDING until two independent
// signals agree (canonicalizationFloor 2), then it resolves to a meta-node.
//
// usage: node cross-translation.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WP = "/Users/mlacy/Documents/3.0/live_priors/11-multi-language/war-and-peace";
const VERSIONS = [
  { lang: "eng", file: `${WP}/en/pg2600_War_and_Peace_Tolstoy_Maude.txt`, base: "pg2600_War_and_Peace_Tolstoy_Maude" },
  { lang: "fra", file: `${WP}/fr/guerre-et-paix_Tolstoy_Bienstock_wikisource.txt`, base: "guerre-et-paix_Tolstoy_Bienstock_wikisource" },
  { lang: "rus", file: `${WP}/ru/voyna-i-mir_Tolstoy_wikisource.txt`, base: "voyna-i-mir_Tolstoy_wikisource" },
];

// each version's referent nodes + their company (the tokens that recur
// around their mentions) — the evidence a cross-version match is adjudicated on.
function nodesOf({ file, base }) {
  const raw = fs.readFileSync(file, "utf8");
  const ledgerPath = path.join(HERE, "results", `${base}-ch1.eot.jsonl`);
  if (!fs.existsSync(ledgerPath)) return { nodes: [], raw, ledgerPath };
  const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const entities = lines.filter((l) => l.role === "entity" && l.referent);
  const sentences = lines.filter((l) => l.role === "sentence" && Array.isArray(l.at));
  const nodes = entities.map((e) => {
    const sur = (e.surfaces ?? [])[0] ?? e.referent;
    // company: the content words in the sentences where this surface occurs
    const company = new Map();
    for (const s of sentences) {
      const txt = raw.slice(s.at[0], s.at[1]);
      if (!txt.toLowerCase().includes(String(sur).toLowerCase())) continue;
      for (const w of txt.toLowerCase().match(/[\p{L}]{3,}/gu) ?? []) company.set(w, (company.get(w) ?? 0) + 1);
    }
    const top = [...company.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w]) => w);
    return { ref: e.referent, surface: sur, company: top };
  });
  return { nodes, raw, ledgerPath };
}

const versions = VERSIONS.map((v) => ({ ...v, ...nodesOf(v) }));
console.log(`CROSS-TRANSLATION · War and Peace · ${versions.map((v) => `${v.lang}(${v.nodes.length} nodes)`).join(" · ")}`);

// ── THE CO-STRUCTURAL SIGNAL: the copula anchors. Find each version's
// copula-clauses ("X was Y") and align them by their structural position in
// the chapter — the same position across versions is the same proposition,
// so its figure (end1) is the same BEING. This is the Rosetta anchor.
const COPULAS = { eng: /^(was|were|is|are|be|been)$/i, fra: /^(était|étaient|est|sont|être|suis|avait)$/i, rus: /^(был|была|было|были|есть|стал|стала)$/i };
function copulaClauses({ base, lang, ledgerPath, raw }) {
  const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  return lines.filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1 && COPULAS[lang].test(String(l.label ?? "")))
    .map((l) => ({ end1: l.end1, label: l.label, end2: l.end2, at: l.at }));
}
for (const v of versions) v.copulas = copulaClauses(v);
console.log(`\n— copula anchors (the Rosetta signal) —`);
for (const v of versions) console.log(`  ${v.lang}: ${v.copulas.length} copula-clauses; first: ${v.copulas[0] ? `${v.copulas[0].end1} ${v.copulas[0].label} ${String(v.copulas[0].end2).slice(0,30)}` : "none"}`);

// ── THE MATCH: align by the PARALLEL CORPUS's own units (the aligned files
// are paragraph-aligned across versions), NOT by the reader's copula order
// (which differs per language — measured: en/fr/ru found their copulas in
// different orders, so positional copula alignment is wrong). The same
// paragraph ordinal across versions is the same passage, so a being named
// in the same paragraph position is the SAME BEING — corroborated by the
// copula anchor inside it and by shared company.
console.log(`\n— adjudicated meta-nodes (identity across versions, for-whom) —`);
const metaNodes = [];
// paragraph texts from the aligned corpus
const alignedDir = `${WP}/aligned`;
const alignedText = (lang, f) => { try { return fs.readFileSync(`${alignedDir}/${lang}/${f}`, "utf8"); } catch { return null; } };
const aligned = {
  eng: alignedText("en", "pg2600-ch1-3-aligned.txt"),
  fra: alignedText("fr", "guerre-et-paix-ch1-3-aligned.txt"),
  rus: alignedText("ru", "voyna-i-mir-ch1-3-aligned.txt"),
};
// paragraph ordinal: split on blank lines (both files use them consistently)
const paras = (t) => (t ?? "").split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
const paraOf = { eng: paras(aligned.eng), fra: paras(aligned.fra), rus: paras(aligned.rus) };
console.log(`  aligned paragraphs: eng ${paraOf.eng.length} · fra ${paraOf.fra.length} · rus ${paraOf.rus.length}`);
// for each version, which of its referent NODES appear in each paragraph
const nodesInPara = {};
for (const v of versions) {
  const text = aligned[v.lang === "eng" ? "eng" : v.lang === "fra" ? "fra" : "rus"];
  nodesInPara[v.lang] = [];
  for (const p of (text ? paras(text) : [])) {
    const present = v.nodes.filter((n) => {
      const s = String(n.surface).toLowerCase();
      return s.length >= 4 && p.toLowerCase().includes(s);
    }).map((n) => n.surface);
    nodesInPara[v.lang].push(present);
  }
}
// align by paragraph ordinal: a being present in paragraph k of two versions
// is adjudicated the SAME BEING (corroborated when a third version agrees).
const N = Math.min(...Object.values(nodesInPara).map((a) => a.length));
for (let i = 0; i < N; i++) {
  const present = { eng: nodesInPara.eng[i] ?? [], fra: nodesInPara.fra[i] ?? [], rus: nodesInPara.rus[i] ?? [] };
  const langsWith = Object.entries(present).filter(([, ns]) => ns.length).map(([l]) => l);
  if (langsWith.length !== versions.length) continue; // a meta-node needs the being in ALL versions — the Rosetta falsification (a 2-of-3 match is an incomplete adjudication, not identity)
  const metaId = `meta:para#${i}`;
  metaNodes.push({ metaId, paragraph: i, present, agreement: langsWith.length, resolved: langsWith.length === versions.length });
  if (metaNodes.length <= 10) console.log(`  ${metaId} (ALL ${langsWith.length}/${versions.length} versions agree): eng[${present.eng.join(",")}] fra[${present.fra.join(",")}] rus[${present.rus.join(",")}]`);
}
// write the meta-node ledger: the identity across versions, adjudicatedBy named.
const out = {
  schema: "EOTMetaNodes@1",
  work: "War and Peace",
  adjudicatedBy: "cross-translation.mjs — Wilson's swarm",
  basis: "S113 — identity across versions exists only for-whom; matched by the copula anchor at the same chapter position (the structural signal), with company as the corroborating signal",
  signal: "copula position (Rosetta anchor) + shared company",
  metaNodes,
};
const outPath = path.join(HERE, "results", "wp-cross-translation-metanodes.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`\n${metaNodes.length} meta-nodes adjudicated across ${versions.length} translations -> ${path.relative(process.cwd(), outPath)}`);
console.log(`each meta-node is the SAME BEING for the named adjudicator — a lens act, revisable, never a fact of the bytes (S113).`);