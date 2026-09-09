#!/usr/bin/env node
// lavar-read.mjs — LaVar reading a text the way §13 of LAVAR.md requires:
// word by word, finding the propositions, each one HEARD through the real
// kernel door (`native/kernel/notes.js`'s `admit`) rather than written as a
// free-text summary. The output is a real append-only task log and the
// holograph `fold()` genuinely projects from it — not a description of one.
//
// THE DIVISION OF LABOR (same shape as live_priors/scripts/
// lavar-prior-scaffold.mjs). LaVar's judgment — which propositions this
// sentence contains, and which literal substring backs each one — is
// supplied as input, in reading order. This script does only what a script
// can do honestly: find that substring's byte offset in the ACTUAL source
// bytes (refusing if it's not there, or ambiguous with no disambiguator),
// and drive `admit()`/`fold()` for real. It never decides what a sentence
// means; it only checks that what LaVar claims to have read is actually on
// the page, at the address claimed — P5.2's self-verification, enforced by
// construction instead of by a second by-hand check (the mistake this
// session already made once, by hand, on the Alice worked example).
//
//   node lavar-read.mjs <recipe.json>
//
// recipe.json shape:
// {
//   "sourcePath": "path/to/text.txt",       // resolved relative to cwd
//   "witness": "primary:<ref>~lavar-hand-read-v1",
//   "frame": { ...whatever this reader stood on... },
//   "hearings": [
//     {
//       "end1": "my mom", "end1Face": "she",   // optional face override
//       "label": "works",
//       "end2": "hard all the time",
//       "quote": "She works hard all the time",  // literal substring, byte-verified
//       "occurrence": 0,                          // which match, if not unique (default 0)
//       "polarity": "-", "decider": "..."          // optional, for a denial
//     },
//     ...
//   ]
// }

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeNotes } from "../../kernel/notes.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function findQuoteSpan(text, quote, occurrence = 0) {
  if (!quote) return { error: "no_quote", detail: "a hearing needs a literal substring to verify against the source" };
  const positions = [];
  let from = 0;
  while (true) {
    const i = text.indexOf(quote, from);
    if (i < 0) break;
    positions.push(i);
    from = i + 1;
  }
  if (positions.length === 0) return { error: "quote_not_found", detail: `"${quote}" does not appear in the source at all — the claimed reading is not grounded in these bytes` };
  if (occurrence < 0 || occurrence >= positions.length) return { error: "occurrence_out_of_range", detail: `"${quote}" appears ${positions.length} time(s); occurrence ${occurrence} does not exist` };
  const start = positions[occurrence];
  return { start, end: start + quote.length, matchCount: positions.length };
}

function main() {
  const recipePath = process.argv[2];
  if (!recipePath) fail("usage: lavar-read.mjs <recipe.json>");
  const recipe = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), recipePath), "utf8"));
  const { sourcePath, witness, frame, hearings } = recipe;
  if (!sourcePath || !witness || !Array.isArray(hearings)) fail("recipe needs sourcePath, witness, and a hearings array");

  const sourceAbs = path.resolve(process.cwd(), sourcePath);
  const text = fs.readFileSync(sourceAbs, "utf8");

  const notes = makeNotes();
  let log = notes.createNotes({ frame: frame ?? null });

  const results = [];
  for (const [i, h] of hearings.entries()) {
    const span = findQuoteSpan(text, h.quote, h.occurrence ?? 0);
    if (span.error) {
      results.push({ index: i, hearing: h, refused: span });
      continue;
    }
    const arrangement = {
      end1: h.end1, label: h.label, end2: h.end2,
      end1Face: h.end1Face ?? null, end2Face: h.end2Face ?? null,
      polarity: h.polarity ?? undefined, decider: h.decider ?? undefined,
      spans: [{ ref: sourcePath, start: span.start, end: span.end }],
    };
    const { log: next, heard, turnedAway, contests, rezeroed } = notes.admit(log, [arrangement], { witness });
    log = next;
    results.push({ index: i, hearing: h, span, heard, turnedAway, contests, rezeroed });
  }

  const holograph = {
    fold: notes.fold(log),
    cuts: notes.foldCuts(log),
    voids: notes.foldVoids(log),
    frame: notes.frameOf(log),
  };

  const slug = path.basename(sourcePath).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const outDir = path.join(HERE, "results");
  fs.mkdirSync(outDir, { recursive: true });
  const logPath = path.join(outDir, `${slug}-log.json`);
  const holoPath = path.join(outDir, `${slug}-holograph.json`);
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2) + "\n");
  fs.writeFileSync(holoPath, JSON.stringify({ results, holograph }, null, 2) + "\n");

  const admitted = results.filter((r) => r.heard?.length).length;
  const refused = results.filter((r) => r.refused || r.turnedAway?.length).length;
  console.log(`read ${hearings.length} hearings: ${admitted} admitted, ${refused} refused/turned-away`);
  console.log(`task log: ${log.entries.length} entries -> ${logPath}`);
  console.log(`holograph: ${holograph.fold.length} live notes, ${holograph.cuts.length} cuts, ${holograph.voids.length} voids -> ${holoPath}`);
}

main();
