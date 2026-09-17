// native/eval/lavar/archon-priors-pilot.mjs — re-runnable driver for the
// archon-priors pilot (2026-09-17). Fetches its own public-domain texts and
// caches them locally under fixtures/archon-priors/ — the SAME pattern
// .github/workflows/frankenstein-native.yml already uses
// (`curl --fail --location --retry 3 <url> --output /tmp/frankenstein.txt`),
// never committing the fetched text itself (.gitignore'd; the URL, edition
// and PD-basis are declared in lib/archon-priors.mjs::ARCHON_ROSTER, so a
// re-fetch reproduces byte-identical public-domain text — nothing is lost
// by not committing it, and the measured finding in
// results/archon-priors-pilot-RESULTS.md is the permanent record).
//
// usage: node archon-priors-pilot.mjs [archonKey]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildArchonPrior, ARCHON_ROSTER } from "./lib/archon-priors.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(HERE, "fixtures", "archon-priors");

const archonKey = process.argv[2] ?? "nietzsche";
const entry = ARCHON_ROSTER[archonKey];
if (!entry) { console.error(`no such archon: ${archonKey}. Roster: ${Object.keys(ARCHON_ROSTER).join(", ")}`); process.exit(1); }

const posPrior = JSON.parse(fs.readFileSync(path.join(HERE, "../../priors/pos-eng.json"), "utf8"));

async function fetchOrCached(gutenbergId, cacheName) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, cacheName);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, "utf8");
  const url = `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`;
  console.error(`fetching ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${url} -> ${res.status}`);
  const text = await res.text();
  if (!text.trim()) throw new Error(`fetch returned empty body: ${url}`);
  fs.writeFileSync(cachePath, text);
  return text;
}

const texts = await Promise.all(
  entry.works.map((w, i) => fetchOrCached(w.gutenbergId, `${archonKey}-work${i}-pg${w.gutenbergId}.txt`)),
);

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
