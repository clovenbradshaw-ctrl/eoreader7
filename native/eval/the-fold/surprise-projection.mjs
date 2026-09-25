#!/usr/bin/env node
// native/eval/the-fold/surprise-projection.mjs — one persisted constitutional
// reading (results/readings/*.jsonl) projected to the compact JSON that
// native/docs/surprise-organs.html loads (2026-09-25). Reads the log line by
// line and emits exactly what the record states — never a second reading:
//   sentences   Encounter@1: sequence, absolute anchor, the bytes
//   beings      EOReferent@1: id and surfaces (the reader's own, at birth and refresh)
//   mentions    EOMention@1: the referent AS WRITTEN AT THE TIME, per encounter
//   merges      EOReferentMerge@1: kept, folded, witness, basis, at its encounter
//   edges       EOHyperedge@1: relation, subject/object surfaces, at its sentence
// No text is re-read, no surface matched, no identity decided here. The
// assembly is read off the file name (<corpusId>-<assembly>.jsonl) so the page
// can state the reader's configuration (P88).
//
//   node native/eval/the-fold/surprise-projection.mjs <reading.jsonl> <out.json> [--corpus "Title"]
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const [, , input, output, ...rest] = process.argv;
if (!input || !output) { console.error("usage: surprise-projection.mjs <reading.jsonl> <out.json> [--corpus Title]"); process.exit(2); }
const corpus = rest.includes("--corpus") ? rest[rest.indexOf("--corpus") + 1] : path.basename(input);
// --docs <creation-order.json>: carry each document's creation date and giver onto the page (display metadata only)
const docsFile = rest.includes("--docs") ? rest[rest.indexOf("--docs") + 1] : null;
const creation = docsFile ? JSON.parse(fs.readFileSync(docsFile, "utf8")).dates ?? {} : null;
const assembly = /^[0-9a-f]+-(.+)\.jsonl$/.exec(path.basename(input))?.[1] ?? null;

const sentences = new Map();
const beings = new Map();
const mentions = [];
const merges = [];
const edges = [];
const docIndex = new Map();
let source = null;
const seqOf = (ref) => { const m = /:(\d+)$/.exec(String(ref ?? "")); return m ? Number(m[1]) : null; };

const rl = readline.createInterface({ input: fs.createReadStream(input) });
for await (const line of rl) {
  if (!line) continue;
  let e; try { e = JSON.parse(line); } catch { continue; }
  if (e.schema === "Encounter@1") {
    source ??= e.source;
    if (!docIndex.has(e.source)) docIndex.set(e.source, docIndex.size);
    const seq = Number(e.sequencePosition);
    if (Number.isFinite(seq) && !sentences.has(seq)) sentences.set(seq, { seq, doc: docIndex.get(e.source), start: Number(e.anchor?.start), end: Number(e.anchor?.end), text: String(e.material ?? "") });
  } else if (e.schema === "Observation@1") {
    for (const g of e.graphEntries ?? []) {
      if (g.schema === "EOReferent@1") {
        const s = beings.get(g.id) ?? new Set();
        for (const x of g.surfaces ?? []) s.add(String(x));
        beings.set(g.id, s);
      } else if (g.schema === "EOMention@1") {
        const seq = seqOf(g.encounterRef);
        if (seq != null && g.referent) mentions.push({ seq, referent: g.referent });
      } else if (g.schema === "EOReferentMerge@1") {
        const seq = seqOf(g.encounterRef);
        if (seq != null) merges.push({ seq, id: g.id, kept: g.kept, folded: [...(g.folded ?? [])], witness: g.witness ?? null, basis: g.provenance?.basis ?? null });
      }
    }
    for (const h of e.hyperedges ?? []) {
      const seq = Number(h.scope?.sequencePosition ?? seqOf(h.meta?.encounterRef));
      if (!Number.isFinite(seq)) continue;
      const part = (role) => (h.participants ?? []).find((p) => p.role === role)?.surface ?? null;
      edges.push({ seq, id: h.id, relation: h.relation ?? null, subject: part("subject"), object: part("object") });
    }
  }
}

// A being kept at a refresh may have no EOReferent@1 record of its own; the
// merge's witness is the reader's own surface for it — read off, not invented.
for (const m of merges) if (m.kept && !beings.has(m.kept) && m.witness) beings.set(m.kept, new Set([String(m.witness)]));
const dedupe = (rows, keyOf) => { const seen = new Set(); const out = []; for (const r of rows) { const k = keyOf(r); if (seen.has(k)) continue; seen.add(k); out.push(r); } return out; };
const out = {
  corpus, source, docs: [...docIndex.keys()].map((name) => { const c = creation?.[name.replace(/\.[^.]+$/, "")]; return c?.date ? { name, date: c.date, kind: c.kind, giver: c.giver } : creation ? { name } : name; }), assembly, reading: path.basename(input), projectedAt: new Date().toISOString(),
  sentences: [...sentences.values()].sort((a, b) => a.seq - b.seq),
  beings: [...beings].map(([id, s]) => ({ id, surfaces: [...s] })),
  mentions: dedupe(mentions, (m) => `${m.seq}|${m.referent}`).sort((a, b) => a.seq - b.seq),
  merges: dedupe(merges, (m) => m.id).sort((a, b) => a.seq - b.seq),
  edges: dedupe(edges, (e) => e.id).sort((a, b) => a.seq - b.seq),
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(out));
console.log(`${corpus}: ${out.sentences.length} sentences, ${out.beings.length} beings, ${out.mentions.length} mentions, ${out.merges.length} merges, ${out.edges.length} edges → ${output} (${(fs.statSync(output).size / 1048576).toFixed(1)} MB)`);
