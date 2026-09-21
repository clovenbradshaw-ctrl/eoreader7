#!/usr/bin/env node
// eval/udhr/udhr-derive-whole.mjs — the declaration as ONE read unit, declared.
//
// The reader scopes a reading to one chapter, and on the UDHR it learns the
// article heading as a chapter convention ("Article <arabic>"), so chapter 1
// is Article 1: two sentences, three propositions. The swarm bred seven
// variants over those three propositions and every one scored 0.550 — a flat
// landscape, nothing to select (measured 2026-09-21). The swarm needs a unit
// with enough text to disagree about.
//
// This writes a DERIVED material per language: the preamble and every
// article's paragraphs, in order, with the article HEADING lines removed so no
// chapter convention can fire and the whole declaration is the read unit. The
// original file is never touched; the derived file's first lines state what
// it was derived from and exactly what was removed, so the transformation is
// on the record, never silent.
//
//   node native/eval/udhr/udhr-derive-whole.mjs eng fra tur ...
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadUdhr } from "./udhr-corpus.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DERIVED = path.join(HERE, "derived");

// PROVENANCE LIVES BESIDE THE MATERIAL, NEVER IN IT (measured 2026-09-21: the
// first version wrote "Removed: the title line and the 30 article heading
// lines" as a header, and the reader read it as material — it became the
// first English proposition). The derived text is the declaration's own
// paragraphs and nothing else; what was derived from what, and what was
// removed, is a sidecar the reader never opens.
export function deriveWhole(doc) {
  const paras = [...doc.preamble, ...doc.articles.flatMap((a) => a.paragraphs)];
  return paras.join("\n\n") + "\n";
}
export function provenanceOf(doc) {
  return {
    schema: "DerivedMaterial@1",
    derivedFrom: `live_priors/06-government-legal/un-udhr/udhr-${doc.code}.txt`,
    language: doc.language ?? null,
    kept: "the preamble paragraphs and every article's paragraphs, in order",
    removed: ["the file header lines", "the title line", `the 30 article heading lines (e.g. "${doc.articles[0]?.heading ?? ""}")`],
    why: "the reader scopes a reading to one chapter and learns the article heading as a chapter convention, so the whole declaration must be one unit for the swarm to have enough text to disagree about",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const want = new Set(process.argv.slice(2));
  fs.mkdirSync(DERIVED, { recursive: true });
  for (const d of loadUdhr().filter((x) => x.blocks === 31 && (!want.size || want.has(x.code)))) {
    const out = path.join(DERIVED, `udhr-${d.code}.clean.txt`);
    fs.writeFileSync(out, deriveWhole(d));
    fs.writeFileSync(out.replace(/\.txt$/, ".provenance.json"), JSON.stringify(provenanceOf(d), null, 2));
    console.log(`${d.code.padEnd(14)} ${fs.statSync(out).size} bytes  ${out}`);
  }
}
