// lavar-fiction-holograph.mjs — the wire-up driver: generated content whose
// JSON carries, per sentence, the pointer into the record — a byte address
// for every sentence grounded in the verified material, `self:model` for the
// mouth's own prose — so the holograph can project what was THE MODEL vs
// what was US.
//
// THE GOAL (user): "any arbitrary content generated with 100% of its
// inspiration explicit through various surfaces (its json contains the
// necessary pointers), and the holograph identifies what was the model vs
// what was us."
//
// THIS IS A DRIVER ONLY. The typing is the organ's (output-holograph.js —
// mechanical, never asked of the model); this file reads LaVar's admitted
// notes, the mouth's written prose, and drives the organ with the REAL
// engine splitter and the REAL morphology sameAct.
//
// PIPELINE:
//   LaVar reads (supplies arrangements) → machine byte-verifies and admits
//   (lavar-read.mjs) → the mouth writes FROM the verified ground
//   (lavar-fiction-write.mjs) → THIS driver types every sentence material
//   (with its byte ref) or self:model through the organ, and writes the
//   three-tier holograph JSON.
//
// Usage: node lavar-fiction-holograph.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { splitSentences } from "../../adapters/text/spans.js";
import { createLemmatizer, morphologyFromPrior } from "../../adapters/text/morphology.js";
import { holographType } from "../../organs/output-holograph.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOLOGRAPH = join(HERE, "results", "pg2600-holograph.json");
const PROSE = join(HERE, "results", "lavar-fiction-written.txt");
const OUT = join(HERE, "results", "lavar-fiction-holograph.json");

const holo = JSON.parse(readFileSync(HOLOGRAPH, "utf8"));
const admitted = holo.results.filter((x) => x.heard?.length).map((x) => ({ note: x.heard[0], span: x.span }));
const prose = readFileSync(PROSE, "utf8").trim();

const priorRaw = JSON.parse(readFileSync(join(HERE, "../../priors/morphology-eng.json"), "utf8"));
const prior = morphologyFromPrior(priorRaw);
const sameAct = createLemmatizer(prior.forms, { language: prior.language }).sameAct;

// the record's ground, in the kernel's own note shape — the organ converts
const ground = admitted.map((a) => ({ end1: a.note.end1, label: a.note.label, end2: a.note.end2, span: a.span }));

const out = holographType({ prose, ground, splitSentences, sameAct, source: "pg2600.txt" });
writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
console.log(`wrote ${OUT}`);
console.log(out.verdict.line);
console.log("\n── per-sentence pointers ──");
out.prose.forEach((t) => console.log(`  [${t.ground}] ${t.text.slice(0, 60)}${t.ref ? ` → ${t.ref}` : ""}`));