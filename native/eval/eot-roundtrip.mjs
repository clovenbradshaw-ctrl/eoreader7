#!/usr/bin/env node
// eval/eot-roundtrip.mjs — every treebank we hold, in and back out.
//
// For each Universal Dependencies treebank on disk: every sentence becomes a
// rich EOT record (kernel/eot-rich.js) and is rebuilt from it at three
// levels, each scored on its own so a loss can be located:
//
//   L1 IN       every word class, relation and feature placed in the cube;
//               the surface re-serializes to the exact input bytes
//   L2 MEANING  the full annotation rebuilt from the meaning layer alone
//   L3 ORDER    word order regenerated from the meaning layer and the
//               language's measured ordering parameters, learned on the
//               OTHER half of the treebank (two-fold, never on the sentence
//               being scored)
//
// Also reported: the language's measured basic order (where its subject and
// object fall relative to the verb), read off the same parameters — Greenberg
// typology from the priors, not from a table.
//
//   node native/eval/eot-roundtrip.mjs [--json OUT]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseConllu, toEot, surfaceBytes, annotationFromMeaning, goldRows, measureOrder, linearize, kendallTau } from "../kernel/eot-rich.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const LIVE = path.resolve(ROOT, "..", "live_priors");

export function findTreebanks() {
  const dirs = [];
  const fx = path.join(ROOT, "native", "eval", "fixtures");
  if (fs.existsSync(fx)) for (const d of fs.readdirSync(fx)) if (d.startsWith("ud-")) dirs.push(path.join(fx, d));
  const pcm = path.join(LIVE, "11-multi-language", "dialects-pidgins-creoles", "creoleval", "pos_ud_naija_pcm");
  if (fs.existsSync(pcm)) dirs.push(pcm);
  return dirs.map((d) => ({
    name: path.basename(d).replace(/^pos_ud_/, "ud-"),
    files: fs.readdirSync(d).filter((f) => f.endsWith(".conllu")).map((f) => path.join(d, f)).sort(),
  })).filter((t) => t.files.length);
}

const same = (a, b) => a.lemma === b.lemma && a.upos === b.upos && a.feats === b.feats && a.head === b.head && a.deprel === b.deprel;

export function runTreebank(tb) {
  const sents = [];
  for (const f of tb.files) for (const s of parseConllu(fs.readFileSync(f, "utf8"))) sents.push({ ...s, file: path.basename(f) });
  const language = (tb.files[0] ? path.basename(tb.files[0]).split("_")[0] : null);
  const fold = [sents.filter((_, i) => i % 2 === 0), sents.filter((_, i) => i % 2 === 1)];
  const params = [measureOrder(fold[1]), measureOrder(fold[0])]; // each half scored with the OTHER half's parameters

  const r = { treebank: tb.name, language, sentences: sents.length, tokens: 0,
    l1: { gaps: 0, gapItems: {}, surfaceExact: 0 },
    l2: { tokens: 0, exact: 0, sentencesExact: 0, byField: { lemma: 0, upos: 0, feats: 0, head: 0, deprel: 0 }, absorbed: 0 },
    l3: { sentences: 0, tauSum: 0, exact: 0 },
    cells: {} };

  fold.forEach((half, h) => {
    for (const s of half) {
      r.tokens += s.tokens.length;
      const rec = toEot(s, { language, source: `${tb.name}/${s.file}` });
      // L1
      r.l1.gaps += rec.gaps.length;
      for (const g of rec.gaps) r.l1.gapItems[`${g.kind}:${g.item}`] = (r.l1.gapItems[`${g.kind}:${g.item}`] ?? 0) + 1;
      if (surfaceBytes(rec) === s.lines.join("\n")) r.l1.surfaceExact++;
      for (const n of rec.meaning.nodes) for (const f of n.feats) if (f.cell) r.cells[f.cell] = (r.cells[f.cell] ?? 0) + 1;
      for (const a of rec.meaning.arcs) if (a.cell) r.cells[a.cell] = (r.cells[a.cell] ?? 0) + 1;
      r.l2.absorbed += rec.meaning.markers.length;
      // L2
      const built = new Map(annotationFromMeaning(rec).map((x) => [x.key, x]));
      const gold = goldRows(s, rec);
      let allOk = true;
      for (const g of gold) {
        const b = built.get(g.key);
        r.l2.tokens++;
        if (b && same(b, g)) r.l2.exact++; else allOk = false;
        if (b) for (const fld of Object.keys(r.l2.byField)) if (b[fld] === g[fld]) r.l2.byField[fld]++;
      }
      if (allOk) r.l2.sentencesExact++;
      // L3 — only from the meaning-layer rebuild and the other half's parameters
      const rows = [...built.values()];
      const produced = linearize(rows, params[h]);
      const goldOrder = s.tokens.filter((t) => !String(t.deprel).startsWith("punct")).map((t) => rec.surface.keyOfId[t.id]);
      const tau = kendallTau(produced, goldOrder);
      r.l3.sentences++; r.l3.tauSum += tau;
      if (produced.filter((k) => goldOrder.includes(k)).join() === goldOrder.join()) r.l3.exact++;
    }
  });

  // Basic order, measured: each argument's typical signed position relative
  // to its verb (its dominant side, at that side's mean distance), then S, V
  // and O sorted by position. Nothing about any language is assumed.
  const all = measureOrder(sents);
  const at = (rel) => {
    const p = all[`${rel}|NOUN`] ?? all[rel];
    if (!p) return null;
    return { pos: p.before >= 0.5 ? p.meanLeft : p.meanRight, before: p.before, n: p.n };
  };
  const subj = at("nsubj"), obj = at("obj");
  let basic = "undetermined";
  if (subj && obj) basic = [["S", subj.pos], ["V", 0], ["O", obj.pos]].sort((a, b) => a[1] - b[1]).map((x) => x[0]).join("");
  r.order = { basic, nsubjBefore: subj?.before ?? null, objBefore: obj?.before ?? null };
  return r;
}

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : "n/a");

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = findTreebanks().map(runTreebank);
  console.log(`${"treebank".padEnd(20)} ${"lang".padEnd(4)} ${"sents".padStart(6)} ${"tokens".padStart(7)} | ${"L1 gaps".padStart(7)} ${"surface".padStart(8)} | ${"L2 tok".padStart(7)} ${"L2 sent".padStart(8)} | ${"L3 tau".padStart(6)} ${"L3 exact".padStart(8)} | order`);
  for (const r of results) {
    console.log(`${r.treebank.padEnd(20)} ${String(r.language).padEnd(4)} ${String(r.sentences).padStart(6)} ${String(r.tokens).padStart(7)} | ${String(r.l1.gaps).padStart(7)} ${pct(r.l1.surfaceExact, r.sentences).padStart(8)} | ${pct(r.l2.exact, r.l2.tokens).padStart(7)} ${pct(r.l2.sentencesExact, r.sentences).padStart(8)} | ${(r.l3.tauSum / Math.max(1, r.l3.sentences)).toFixed(3).padStart(6)} ${pct(r.l3.exact, r.l3.sentences).padStart(8)} | ${r.order.basic} (S ${r.order.nsubjBefore?.toFixed(2)}, O ${r.order.objBefore?.toFixed(2)})`);
    const gaps = Object.entries(r.l1.gapItems).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (gaps.length) console.log(`    L1 gaps: ${gaps.map(([k, n]) => `${k}×${n}`).join(", ")}`);
    const lost = Object.entries(r.l2.byField).filter(([, n]) => n < r.l2.tokens).map(([k, n]) => `${k} ${pct(n, r.l2.tokens)}`);
    if (lost.length) console.log(`    L2 by field: ${lost.join(", ")}`);
  }
  const outIdx = process.argv.indexOf("--json");
  const out = outIdx > 0 ? process.argv[outIdx + 1] : path.join(ROOT, "native", "eval", "results", "eot-roundtrip.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
  console.log(`\n${out}`);
}
