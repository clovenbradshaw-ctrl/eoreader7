// native/eval/lavar/archon-priors-pilot.mjs — re-runnable driver for the
// archon-priors pilot (2026-09-17). Reproduces the measured finding in
// results/archon-priors-pilot-RESULTS.md from the committed fixtures alone
// — no network fetch, no live text depended on staying up at Gutenberg.
//
// usage: node archon-priors-pilot.mjs [archonKey]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildArchonPrior, persistArchonPrior, ARCHON_ROSTER } from "./lib/archon-priors.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const archonKey = process.argv[2] ?? "nietzsche";
const entry = ARCHON_ROSTER[archonKey];
if (!entry) { console.error(`no such archon: ${archonKey}. Roster: ${Object.keys(ARCHON_ROSTER).join(", ")}`); process.exit(1); }

const posPrior = JSON.parse(fs.readFileSync(path.join(HERE, "../../priors/pos-eng.json"), "utf8"));

const FIXTURE_FOR = {
  nietzsche: [
    "fixtures/archon-priors/nietzsche-beyond-good-and-evil-pg4363.txt",
    "fixtures/archon-priors/nietzsche-twilight-antichrist-pg52263.txt",
  ],
};
const texts = FIXTURE_FOR[archonKey].map((p) => fs.readFileSync(path.join(HERE, p), "utf8"));

const t0 = Date.now();
const prior = await buildArchonPrior(archonKey, texts, {
  posPrior,
  onChunk: (total, title, w, ofW) => process.stderr.write(`  chunk ${total} (work ${w}/${ofW}: ${title}) — ${((Date.now() - t0) / 1000).toFixed(1)}s\n`),
});

console.log(`\n${archonKey}: ${prior.builtFrom.chars} chars across ${prior.builtFrom.works} work(s), ${prior.builtFrom.chunks} chunks, ${Date.now() - t0}ms total wall time`);
console.log(`${prior.builtFrom.nominatedPairs} distinct composition pairs nominated; ${prior.entryCount} promoted to GIVEN at minChunks:${prior.builtFrom.minChunks}`);
if (prior.entryCount === 0) {
  console.log("→ ZERO within-corpus corroboration at exact label-pair granularity — a real, disclosed finding, not a bug (see RESULTS.md).");
}

const outFile = path.join(HERE, "results", `archon-prior-${archonKey}.json`);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(prior, null, 2) + "\n");
console.log(`persisted (for inspection): ${outFile}`);
