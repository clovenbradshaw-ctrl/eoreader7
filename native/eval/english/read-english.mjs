#!/usr/bin/env node
// Handle: Chomsky — the grammar learned from one English, reading another.
// eval/english/read-english.mjs — parse whole English books into rich EOT, with provenance.
//
// Each book is read end to end by the English parser (adapters/text/
// english-parser.js), every sentence becomes a rich EOT record
// (kernel/eot-rich.js), and the reading carries TWO provenances side by side:
// the parser's (what taught it — treebank, genre, period, region) and the
// book's (what the file says about itself — title, author, translators, and a
// period and region only when the caller declares them). Where the two
// differ, the reading says so. A parser taught on 2000s American web English
// reading an 1880s Missouri dialect novel is not a failure to hide; it is the
// condition every number on the page is measured under.
//
// WHAT CAN AND CANNOT BE MEASURED. There is no gold analysis of these novels,
// so no accuracy is claimed. What is measured: how much of the book the
// parser has never seen (the share of word forms absent from its training —
// the period and register gap, as a number), how lemmas were reached (by
// form, by ending, or by word class alone), and whether every sentence enters
// the rich record with nothing unplaced and leaves with its exact bytes.
//
//   node native/eval/english/read-english.mjs FILE... [--model=FILE]
//        [--period=FILE:PERIOD] [--region=FILE:REGION]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadModel, parseText } from "../../adapters/text/english-parser.js";
import { parseConllu, toEot, surfaceBytes } from "../../kernel/eot-rich.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const OUTDIR = path.join(ROOT, "native", "eval", "results", "english");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const perFile = (k) => Object.fromEntries(process.argv.filter((a) => a.startsWith(`--${k}=`)).map((a) => { const v = a.slice(k.length + 3); const i = v.lastIndexOf(":"); return [path.resolve(v.slice(0, i)), v.slice(i + 1)]; }));

/** What a Project Gutenberg file says about itself, read from its header. */
export function gutenbergHeader(raw) {
  const head = raw.slice(0, 4000);
  const field = (name) => new RegExp(`^${name}:\\s*(.+)$`, "mi").exec(head)?.[1]?.trim() ?? null;
  const start = /\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\n/i.exec(raw);
  const end = /\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i.exec(raw);
  return {
    title: field("Title"), author: field("Author"), translators: field("Translators?"),
    release: field("Release Date"),
    body: [start ? start.index + start[0].length : 0, end ? end.index : raw.length],
  };
}

/** A cleaned corpus file carries no Gutenberg header; the corpus manifest
 *  that admitted it names it. Read-only: what the corpus already says. */
function manifestEntry(file) {
  const dir = path.resolve(ROOT, "..", "live_priors", "manifests");
  if (!fs.existsSync(dir)) return null;
  const rel = path.relative(path.resolve(ROOT, "..", "live_priors"), file);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { continue; }
    const items = Array.isArray(d) ? d : Object.values(d).find(Array.isArray) ?? [];
    const hit = items.find((it) => it && it.file === rel);
    if (hit) return { ...hit, manifest: f };
  }
  return null;
}

export function readBook(model, file, { period = null, region = null } = {}) {
  const raw = fs.readFileSync(file, "utf8");
  const hdr = gutenbergHeader(raw);
  if (!hdr.title) { const m = manifestEntry(file); if (m) { hdr.title = m.title ?? null; hdr.fromManifest = m.manifest; hdr.genre = m.genre ?? null; } }
  const [b0, b1] = hdr.body;
  const t0 = Date.now();
  const conllu = parseText(model, raw.slice(b0, b1), { idPrefix: `${path.basename(file, ".txt")}#` });
  const secs = (Date.now() - t0) / 1000;
  // Offsets were computed on the body slice; shift them back into the raw
  // file's coordinates so raw.slice(start, end) reproduces each sentence.
  const shifted = conllu.replace(/^# offset = (\d+)-(\d+)$/gm, (_, a, b) => `# offset = ${Number(a) + b0}-${Number(b) + b0}`)
    .replace(/Offset=(\d+)/g, (_, a) => `Offset=${Number(a) + b0}`);
  const sents = parseConllu(shifted);

  const seen = new Set(Object.keys(model.lexicon.form).map((k) => k.split("|")[0]));
  let words = 0, oov = 0, gaps = 0, exact = 0, offsetExact = 0;
  const upos = {}, cells = {}, lemmaBasis = { form: 0, ending: 0, "word class": 0 };
  for (const s of sents) {
    const rec = toEot(s, { language: "eng", source: path.basename(file) });
    gaps += rec.gaps.length;
    if (surfaceBytes(rec) === s.lines.join("\n")) exact++;
    const off = /^# offset = (\d+)-(\d+)$/m.exec(s.lines.join("\n"));
    if (off && raw.slice(Number(off[1]), Number(off[2])).replace(/\s+/g, " ") === (s.text ?? "")) offsetExact++;
    for (const n of rec.meaning.nodes) for (const f of n.feats) if (f.cell) cells[f.cell] = (cells[f.cell] ?? 0) + 1;
    for (const a of rec.meaning.arcs) if (a.cell) cells[a.cell] = (cells[a.cell] ?? 0) + 1;
    for (const t of s.tokens) {
      words++;
      upos[t.upos] = (upos[t.upos] ?? 0) + 1;
      if (!seen.has(t.form.toLowerCase())) oov++;
      const k = `${t.form.toLowerCase()}|${t.upos}`;
      if (model.lexicon.form[k]) lemmaBasis.form++; else if (/\p{L}/u.test(t.form)) lemmaBasis.ending++; else lemmaBasis["word class"]++;
    }
  }
  const pct = (a, b) => Number((100 * a / Math.max(1, b)).toFixed(2));
  const parserP = model.provenance?.trainedOn ?? {};
  const material = {
    schema: "MaterialProvenance@1",
    file: path.relative(ROOT, file), sha256: crypto.createHash("sha256").update(raw).digest("hex"), chars: raw.length,
    title: hdr.title, author: hdr.author, translators: hdr.translators, release: hdr.release,
    headerSource: hdr.fromManifest ? `no Gutenberg header in the file; title from ${hdr.fromManifest}` : "the file's own Gutenberg header",
    genre: hdr.genre ?? null, period, region,
    periodDeclared: period != null, regionDeclared: region != null,
    note: period == null ? "the file states no period for its English; declare one with --period=FILE:PERIOD" : null,
  };
  const mismatch = [];
  if (period == null) mismatch.push(`material period undeclared; parser taught on ${parserP.period}`);
  else if (!String(parserP.period ?? "").includes(String(period).slice(0, 3))) mismatch.push(`period: material ${period} vs parser ${parserP.period}`);
  if (region != null && !String(parserP.region ?? "").toLowerCase().includes(String(region).toLowerCase())) mismatch.push(`region: material ${region} vs parser ${parserP.region}`);
  // The material's genre is RECEIVED (a manifest names it) or undeclared —
  // never asserted by this script.
  mismatch.push(hdr.genre ? `genre: material ${hdr.genre} (${hdr.fromManifest}) vs parser ${parserP.genre}` : `material genre undeclared; parser taught on ${parserP.genre}`);
  return {
    schema: "EnglishReading@1",
    material, parser: model.provenance ?? null, mismatch,
    sentences: sents.length, words, seconds: Number(secs.toFixed(1)), wordsPerSecond: Math.round(words / Math.max(secs, 1e-3)),
    unseenWords: pct(oov, words),
    lemmaBasis: Object.fromEntries(Object.entries(lemmaBasis).map(([k, v]) => [k, pct(v, words)])),
    eot: { gaps, surfaceExact: pct(exact, sents.length), offsetsReproduceSentence: pct(offsetExact, sents.length) },
    upos: Object.fromEntries(Object.entries(upos).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, pct(v, words)])),
    cells: Object.fromEntries(Object.entries(cells).sort((a, b) => b[1] - a[1]).slice(0, 12)),
    conllu: shifted,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const modelPath = arg("model") ?? path.join(ROOT, "native", "priors", "parser-eng-ewt.json");
  const model = loadModel(JSON.parse(fs.readFileSync(modelPath, "utf8")));
  model.provenance = JSON.parse(fs.readFileSync(modelPath, "utf8")).provenance;
  const periods = perFile("period"), regions = perFile("region");
  fs.mkdirSync(OUTDIR, { recursive: true });
  if (!fs.existsSync(path.join(OUTDIR, ".gitignore"))) fs.writeFileSync(path.join(OUTDIR, ".gitignore"), "# parsed books are large run outputs; regenerate with read-english.mjs\n*.conllu\n");
  const files = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((f) => path.resolve(f));
  const p = model.provenance?.trainedOn ?? {};
  console.log(`parser: ${p.treebank} — ${p.genre}; ${p.period}; ${p.region}`);
  console.log(`held-out: ${JSON.stringify(model.provenance?.scores ?? {})}\n`);
  for (const f of files) {
    const r = readBook(model, f, { period: periods[f] ?? null, region: regions[f] ?? null });
    const base = path.basename(f, ".txt");
    fs.writeFileSync(path.join(OUTDIR, `${base}.conllu`), r.conllu);
    const { conllu, ...summary } = r;
    fs.writeFileSync(path.join(OUTDIR, `${base}.reading.json`), JSON.stringify(summary, null, 2));
    console.log(`${r.material.title ?? base} — ${r.material.author ?? "?"}${r.material.translators ? `, tr. ${r.material.translators}` : ""}`);
    console.log(`   ${r.sentences} sentences, ${r.words} words in ${r.seconds}s (${r.wordsPerSecond}/s)`);
    console.log(`   unseen word forms: ${r.unseenWords}% | lemma by form ${r.lemmaBasis.form}%, by ending ${r.lemmaBasis.ending}%`);
    console.log(`   rich EOT: gaps ${r.eot.gaps}, surface exact ${r.eot.surfaceExact}%, offsets reproduce the sentence ${r.eot.offsetsReproduceSentence}%`);
    console.log(`   provenance mismatch: ${r.mismatch.join("; ")}\n`);
  }
}
