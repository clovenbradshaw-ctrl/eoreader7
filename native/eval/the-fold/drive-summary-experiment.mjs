// drive-summary-experiment.mjs — pilot: what quality of mechanical summary
// does the full generation pipeline (pipeline-run.mjs, the nine stages)
// produce on genuinely arbitrary content, next to a bare small-model
// baseline asked to "summarize this" with no scaffolding at all?
//
// Informal pilot, not a preregistration (contrast native/eval/the-fold/
// long-project/PREREGISTRATION.md, which freezes a corpus and scorer before
// either arm runs) — this is a first look, reported honestly either way.
//
// Ground material is two documents this repo has not read before, spanning
// genres: an information-dense Wikipedia article (dates, percentages, named
// studies — a hard fabrication test) and a short public-domain narrative
// (O. Henry's "The Gift of the Magi" — synthesis over fact-extraction).
//
// Scoring is mechanical, reusing organs already in this codebase rather than
// inventing new thresholds:
//   - extractFigures/extractNames (restatement.js) — every figure/name the
//     output states, checked against the source by substring containment.
//     Not in the source = a fabrication candidate.
//   - spliceCeiling/detectSplice (restatement.js) — the measured self-repeat
//     null over the SOURCE's own sentences; an output sentence that exceeds
//     it glues a source run onto its own rewrite.
//   - findDuplicateStatements (restatement.js) — same fact stated twice.
//   - a plain compression ratio (chars out / chars in).
//
//   node native/eval/the-fold/drive-summary-experiment.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline } from "../../the-fold/pipeline-run.mjs";
import { spliceCeiling, detectSplice, extractFigures, extractNames, findDuplicateStatements } from "../../the-fold/restatement.js";
import { segmentSentences } from "../../the-fold/admission.js";
import { streamOllamaChat } from "../../../proxy-runner.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "results", "summary-experiment");
fs.mkdirSync(OUT, { recursive: true });

const MODEL = "gemma2:2b";
const TASK = "Summarize this document in a few paragraphs.";

const CORPUS = [
  { key: "gpgp", label: "Wikipedia: Great Pacific Garbage Patch (informational)", file: process.argv[2] ?? "/private/tmp/claude-501/-Users-mlacy-Documents-3-0/7e7469f2-bd6c-418b-b078-3809220b5e8b/scratchpad/summary-experiment/gpgp.md" },
  { key: "magi", label: "O. Henry: The Gift of the Magi (narrative)", file: process.argv[3] ?? "/private/tmp/claude-501/-Users-mlacy-Documents-3-0/7e7469f2-bd6c-418b-b078-3809220b5e8b/scratchpad/summary-experiment/gift-of-the-magi.md" },
];

async function naiveBaseline(sourceText) {
  let out = "";
  for await (const chunk of streamOllamaChat(MODEL, [{ role: "user", content: `${TASK}\n\n${sourceText}` }], { maxTokens: 600 })) {
    if (typeof chunk === "string") out += chunk;
  }
  return out.trim();
}

function score(label, outputText, sourceText) {
  const sourceFoldedNames = extractNames(sourceText);
  const sourceFolded = sourceText.toLowerCase();
  const outNames = extractNames(outputText);
  const outFigures = extractFigures(outputText);
  const sourceFigures = extractFigures(sourceText);
  const fabricatedNames = [...outNames].filter((n) => !sourceFoldedNames.has(n) && !sourceFolded.includes(n));
  const fabricatedFigures = [...outFigures].filter((f) => !sourceFigures.has(f));

  const ceiling = spliceCeiling([sourceText]).ceiling;
  const sentences = segmentSentences(outputText);
  const splices = sentences.map((s) => detectSplice(s, ceiling, sourceText)).filter(Boolean);

  const dupes = findDuplicateStatements(sentences.map((s, i) => ({ text: s, id: i })));

  return {
    label,
    chars: { source: sourceText.length, output: outputText.length, ratio: +(outputText.length / sourceText.length).toFixed(3) },
    sentenceCount: sentences.length,
    names: { stated: outNames.size, fabricated: fabricatedNames },
    figures: { stated: outFigures.size, fabricated: fabricatedFigures },
    spliceCeiling: ceiling,
    splices: splices.map((s) => ({ sentence: s.sentence, runLength: s.runLength, repair: s.repair })),
    duplicateStatementPairs: dupes.length,
    duplicates: dupes.map((d) => ({ keep: d.keepText, drop: d.dropText })),
  };
}

async function readPieceText(docId) {
  const DOCS = path.join(HERE, "..", "..", "..", "documents");
  const file = path.join(DOCS, `${docId}.jsonl`);
  const lines = fs.readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const pieces = lines.filter((l) => l.role === "piece");
  return pieces.length ? pieces[pieces.length - 1].text : null;
}

async function main() {
  const results = [];
  for (const doc of CORPUS) {
    const sourceText = fs.readFileSync(doc.file, "utf8");
    console.error(`\n=== ${doc.label} (${sourceText.length} chars) ===`);

    console.error("  running eoreader7 pipeline...");
    const id = `sumexp-${doc.key}`;
    const t0 = Date.now();
    const run = await runPipeline({ task: TASK, groundFiles: [doc.file], model: MODEL, id, onStage: (s) => console.error(`    · ${s.role}: ${s.title}`) });
    const pipelineSecs = Math.round((Date.now() - t0) / 1000);
    const pieceText = await readPieceText(run.docId);
    console.error(`  pipeline done in ${pipelineSecs}s -> ${run.report}`);

    console.error("  running naive baseline (no pipeline)...");
    const t1 = Date.now();
    const baselineText = await naiveBaseline(sourceText);
    const baselineSecs = Math.round((Date.now() - t1) / 1000);
    console.error(`  baseline done in ${baselineSecs}s`);

    const entry = {
      doc: doc.label,
      key: doc.key,
      pipelineSecs,
      baselineSecs,
      pipeline: { text: pieceText, ...(pieceText ? score("pipeline", pieceText, sourceText) : { error: "no piece text found on ledger" }) },
      baseline: { text: baselineText, ...score("baseline", baselineText, sourceText) },
    };
    results.push(entry);
    fs.writeFileSync(path.join(OUT, `${doc.key}.json`), JSON.stringify(entry, null, 2));
  }
  fs.writeFileSync(path.join(OUT, "all.json"), JSON.stringify(results, null, 2));
  console.error(`\nAll results written to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
