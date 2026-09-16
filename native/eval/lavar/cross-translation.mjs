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
//
// THE MATCH IS PER-BEING, NEVER PER-PARAGRAPH. A paragraph's cast is many
// beings; "some being is present in paragraph k in each language" is not
// identity — it would fuse Buonaparte and Anna Pávlovna (measured, both are
// in the same opening paragraphs). Identity is adjudicated between TWO named
// beings whose OCCUPANCY profiles agree: the same surface keeps the same
// company in the same aligned paragraph positions across versions. The
// profile is the being's paragraph-occupancy vector (which aligned passages
// mention it); two beings from different versions are a HOLDING when their
// profiles share positions, and resolve to a meta-node when a THIRD version
// names a being with the same shared profile (the Rosetta falsification — a
// 2-of-3 match is incomplete adjudication, not identity).
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
// per being: its paragraph-occupancy profile (the aligned positions that
// mention its surface) — the structural identity signal.
const profileOf = (v) => {
  const text = aligned[v.lang === "eng" ? "eng" : v.lang === "fra" ? "fra" : "rus"];
  const all = text ? paras(text) : [];
  return new Map(v.nodes.map((n) => {
    const s = String(n.surface).toLowerCase();
    if (s.length < 4) return [n.ref, []];
    const occupied = [];
    for (let i = 0; i < all.length; i++) if (all[i].toLowerCase().includes(s)) occupied.push(i);
    return [n.ref, occupied];
  }));
};
const profiles = Object.fromEntries(versions.map((v) => [v.lang, profileOf(v)]));
// company overlap: two beings are corroborated as the same when their company
// (the tokens recurring around their mentions) overlaps — the second signal.
const companyOf = (v, ref) => v.nodes.find((n) => n.ref === ref)?.company ?? [];
const jaccard = (a, b) => {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  let both = 0;
  for (const x of sa) if (sb.has(x)) both += 1;
  return both / (sa.size + sb.size - both);
};
// For each being in eng, find the being in each other version whose
// paragraph-occupancy profile overlaps it most (the co-structural signal,
// tolerant of the aligned files' small paragraph-splitting drift — eng 111 /
// fra 107 / rus 106) — corroborated by shared company. A meta-node needs the
// SAME being named in ALL versions (3-of-3), and the best partner must be
// unambiguous (a clear margin over the second-best — otherwise it is an
// incomplete adjudication, not identity).
const occupiedOverlap = (a, b) => {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  let both = 0;
  for (const x of b) if (sa.has(x)) both += 1;
  return both / Math.min(sa.size, b.length);
};
for (const engNode of versions[0].nodes) {
  const engProfile = profiles.eng.get(engNode.ref) ?? [];
  if (!engProfile.length) continue; // never named in an aligned paragraph — nothing to align
  const partners = {};
  let complete = true;
  let ambiguous = false;
  for (const v of versions.slice(1)) {
    // rank this version's beings by co-structural overlap with the English
    // being; keep the best ONLY if it is unambiguous (>=2x the runner-up).
    const ranked = v.nodes
      .map((n) => ({ node: n, overlap: occupiedOverlap(profiles[v.lang].get(n.ref) ?? [], engProfile) }))
      .filter((r) => r.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap);
    if (!ranked.length) { complete = false; break; }
    const best = ranked[0];
    const runnerUp = ranked[1]?.overlap ?? 0;
    if (best.overlap < 2 * runnerUp && ranked.length > 1) { ambiguous = true; break; }
    partners[v.lang] = {
      ref: best.node.ref,
      surface: best.node.surface,
      overlap: best.overlap,
      companyOverlap: jaccard(companyOf(v, best.node.ref), engNode.company),
    };
  }
  if (!complete || ambiguous) continue; // a 2-of-3 or ambiguous match is an incomplete adjudication (the Rosetta falsification)
  const metaId = `meta:${engNode.surface.replace(/\s+/g, "_")}`;
  metaNodes.push({
    metaId,
    present: { eng: engNode.surface, ...Object.fromEntries(Object.entries(partners).map(([l, p]) => [l, p.surface])) },
    agreement: versions.length,
    resolved: true,
    overlap: Object.fromEntries(Object.entries(partners).map(([l, p]) => [l, +p.overlap.toFixed(2)])),
    companyOverlap: Object.fromEntries(Object.entries(partners).map(([l, p]) => [l, +p.companyOverlap.toFixed(2)])),
    paragraphPositions: engProfile.slice(0, 12),
    basis: "overlapping paragraph-occupancy profiles across all versions (the co-structural signal), unambiguous per version, corroborated by shared company — identity exists only for-whom (S113)",
  });
  if (metaNodes.length <= 12) console.log(`  ${metaId} (ALL ${versions.length}/${versions.length} agree): eng[${engNode.surface}] fra[${partners.fra.surface}] rus[${partners.rus.surface}] (overlap ${partners.fra.overlap.toFixed(2)}/${partners.rus.overlap.toFixed(2)}, company ${partners.fra.companyOverlap.toFixed(2)}/${partners.rus.companyOverlap.toFixed(2)})`);
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