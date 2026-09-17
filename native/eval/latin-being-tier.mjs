// native/eval/latin-being-tier.mjs — the being-identity tier
// (adapters/text/relations-case-marked.js::latinBeings/latinEntries),
// measured against real fetched classical Latin prose. Re-runnable,
// matching this codebase's own eval-driver posture (P19/P27/S31): not a
// committed regression test, a reproducible measurement a RESULTS.md
// doc cites. The material itself is fetched, never committed
// (fixtures/archon-priors/ is gitignored, the same fetched-third-party-
// text pattern frankenstein-native.yml already uses); the POS/case
// priors are BUILT fresh from the UD_Latin-Perseus training file this
// repo already commits (native/eval/fixtures/ud-latin-perseus/), by
// invoking the real builder scripts as subprocesses rather than
// re-deriving their parsing logic a second time.
//
// usage: node native/eval/latin-being-tier.mjs

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { latinBeings, latinEntries } from "../adapters/text/relations-case-marked.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");
const CACHE_DIR = path.join(HERE, "..", "eval", "lavar", "fixtures", "archon-priors");
const TRAIN_CONLLU = path.join(HERE, "fixtures", "ud-latin-perseus", "la_perseus-ud-train.conllu");

const CICERO_URL = "https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/data/phi0474/phi013/phi0474.phi013.perseus-lat2.xml";
const CICERO_TXT = path.join(CACHE_DIR, "cicero-in-catilinam-lat.txt");
const CASE_PRIOR_JSON = path.join(CACHE_DIR, "case-marking-lat.local.json");
const POS_PRIOR_JSON = path.join(CACHE_DIR, "pos-lat.local.json");

function extractPlainText(xml) {
  xml = xml.replace(/<teiHeader.*?<\/teiHeader>/s, "");
  xml = xml.replace(/<note[^>]*>.*?<\/note>/gs, "");
  xml = xml.replace(/<milestone[^>]*\/>/g, "\n\n").replace(/<div[^>]*>/g, "\n\n").replace(/<\/div>/g, "");
  xml = xml.replace(/<p>/g, "\n\n").replace(/<\/p>/g, "");
  let text = xml.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const lines = text.split("\n").map((l) => l.trim());
  const out = [];
  let blank = 0;
  for (const l of lines) {
    if (!l) { blank++; if (blank <= 1) out.push(""); continue; }
    blank = 0;
    out.push(l);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();
}

async function fetchOrCached() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (fs.existsSync(CICERO_TXT)) return fs.readFileSync(CICERO_TXT, "utf8");
  console.error(`fetching ${CICERO_URL} ...`);
  const res = await fetch(CICERO_URL);
  if (!res.ok) throw new Error(`fetch failed: ${CICERO_URL} -> ${res.status}`);
  const xml = await res.text();
  const text = extractPlainText(xml) + "\n";
  fs.writeFileSync(CICERO_TXT, text);
  return text;
}

function buildPriors() {
  if (!fs.existsSync(TRAIN_CONLLU)) {
    throw new Error(`missing ${TRAIN_CONLLU} — this repo's own committed UD_Latin-Perseus training fixture is required`);
  }
  if (!fs.existsSync(CASE_PRIOR_JSON)) {
    execFileSync("node", [path.join(ROOT, "native/scripts/build-latin-case-prior.mjs"), TRAIN_CONLLU, CASE_PRIOR_JSON], { stdio: "inherit" });
  }
  if (!fs.existsSync(POS_PRIOR_JSON)) {
    execFileSync("node", [path.join(ROOT, "native/scripts/build-pos-prior.mjs"), TRAIN_CONLLU, POS_PRIOR_JSON, "lat", "https://github.com/UniversalDependencies/UD_Latin-Perseus"], { stdio: "inherit" });
  }
  return {
    casePrior: JSON.parse(fs.readFileSync(CASE_PRIOR_JSON, "utf8")),
    posPrior: JSON.parse(fs.readFileSync(POS_PRIOR_JSON, "utf8")),
  };
}

const text = await fetchOrCached();
const { casePrior, posPrior } = buildPriors();

console.error(`── Cicero, In Catilinam (real fetched Perseus/A.C. Clark text), ${text.length} chars ──`);

const withoutPos = latinBeings(text, { casePrior, minOccurrences: 2 });
const withPos = latinBeings(text, { casePrior, posPrior, minOccurrences: 2 });
console.error(`beings without the POS-prior veto: ${withoutPos.length}`);
console.error(`beings with the POS-prior veto:    ${withPos.length}`);
console.error("top 15 (with veto):");
for (const b of withPos.slice(0, 15)) console.error(`  ${b.stem} (occ=${b.occurrences}) ${JSON.stringify(b.surfaces.slice(0, 3))}`);

const edges = latinEntries(text, { casePrior, posPrior, beings: withPos });
console.error(`\nlatinEntries edges (whole speech, real sentences): ${edges.length}`);

console.error(`\nreport:`);
console.log(JSON.stringify({
  schema: "LatinBeingTierReport@1",
  material: { chars: text.length, source: CICERO_URL },
  beingsWithoutPosVeto: withoutPos.length,
  beingsWithPosVeto: withPos.length,
  bridgingEdges: edges.length,
}, null, 2));
