#!/usr/bin/env node
// cli/resolve-speakers.mjs -- the text-activation pass over a meeting
// transcript, the same shape as cli/reason.mjs: a file argument, an organ
// called, JSON written out. Wraps organs/speaker.js's meetingSections
// (self-introduction, chair-recognition, and turn-marker boundaries).
//
//   node cli/resolve-speakers.mjs <transcript.txt> [--out <out.json>]
//
// Writes the meetingSections() result -- every declared boundary as
// {start, end, speaker, org, how} -- to stdout, or to --out if given.
import fs from "node:fs";
import { meetingSections } from "../native/organs/speaker.js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const outIdx = args.indexOf("--out");
const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

if (!file) {
  console.error("usage: node cli/resolve-speakers.mjs <transcript.txt> [--out <out.json>]");
  process.exit(1);
}

const text = fs.readFileSync(file, "utf8");
const sections = meetingSections(text);
const named = sections.filter((s) => s.speaker);

const out = {
  schema: "EOMeetingSpeakerBindings@1",
  transcript_path: file,
  boundary_count: sections.length,
  named_boundary_count: named.length,
  sections,
};

const json = JSON.stringify(out, null, 2);
if (outPath) {
  fs.writeFileSync(outPath, json, "utf8");
  console.log(`wrote ${outPath}: ${sections.length} boundaries, ${named.length} named`);
} else {
  console.log(json);
}
