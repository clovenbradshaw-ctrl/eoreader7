// eval/predigest-priors.mjs — read the prior corpora on this disk ONCE,
// sediment each work the moment it finishes, and write the compiled result
// so later sessions load compact memory instead of re-reading the shelf.
//
// The corpus is what is actually beside this repo: the eoreaderhandbook
// chapters and the eo-wiki articles — the project's own canon, which is
// what "the priors" most literally names here. `../live_priors` (the
// curated corpus P19's organ walks) is looked for and, when absent, is a
// TYPED GAP in the manifest — explore-server.mjs's own posture for the
// same directory, never a silent skip.
//
// Declared budgets, stated not hidden (the engine driver's own words):
//   --per-doc N   encounters read per document (default 400 — a runtime
//                 budget; a handbook chapter is ~50-200 encounters, so most
//                 documents are read WHOLE and the cap mostly guards the
//                 long tail)
//   --docs N      documents per corpus root (default: all)
//
// The reader is the REAL native recursive reader with the same assembly
// experienced-new-book.mjs uses, minus one prior this checkout does not
// carry: POSPrior@1 lives in the legacy-eoreader6.1 submodule, which is
// uninitialized here — recorded in the artifact's `received` inventory as
// a named gap, never quietly dropped.
//
// Re-runnable eval driver, not a committed regression test (P19/P27's own
// posture). Writes eval/results/compiled-priors.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripContainer } from "../../eoreader7/native/adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../../eoreader7/native/adapters/text/recursive.js";
import { reviseTextFold } from "../../eoreader7/native/adapters/text/revision.js";
import { createRecursiveReader } from "../../eoreader7/native/kernel/reading.js";
import { deriveExperiencePrior, mergeExperiencePriors } from "../../eoreader7/native/kernel/experience-priors.js";
import { deriveRhythmPrior, mergeRhythmPriors, composeExperience } from "../../eoreader7/native/kernel/rhythm-priors.js";

import { sedimentReading, compilePriors } from "../predigest.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUT = path.join(HERE, "results", "compiled-priors.json");

const GIVER = "the-fold:predigest-priors";
const ORGANS = { deriveExperiencePrior, deriveRhythmPrior, mergeExperiencePriors, mergeRhythmPriors, composeExperience };
const ANCHORING = { minActivation: 0.05, minMargin: 0.2 }; // host/corpus.js's declared, disclosed-as-unvalidated operating point, reused not invented

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
};
const PER_DOC = arg("--per-doc", 400);
const MAX_DOCS = arg("--docs", Infinity);

// The corpora this instrument may treat as its shelf, with live_priors
// looked for by the same convention the priors organ already uses.
const CORPORA = [
  { name: "eoreaderhandbook", dir: path.resolve(ROOT, "..", "eoreaderhandbook") },
  { name: "eo-wiki", dir: path.resolve(ROOT, "..", "eo-wiki", "articles", "wiki") },
  { name: "live_priors", dir: path.resolve(ROOT, "..", "live_priors") },
];

// Received priors: manifested with schema + giver + path, never copied.
function receivedInventory() {
  const rows = [];
  const point = (p, note) => {
    const full = path.resolve(ROOT, p);
    if (!fs.existsSync(full)) { rows.push({ gap: "not-present", detail: `${p} — ${note}` }); return; }
    try {
      const head = JSON.parse(fs.readFileSync(full, "utf8"));
      rows.push({ schema: head.schema ?? null, giver: head.provenance?.giver ?? head.provenance?.source ?? null, path: p, note });
    } catch {
      rows.push({ path: p, note, gap: "unreadable", detail: "file exists but did not parse as JSON" });
    }
  };
  point("../eoreader7/native/priors/construction-eng.json", "UPOS distributions, UD_English-EWT");
  point("../eoreader7/native/priors/morphology-eng.json", "UniMorph irregular tail");
  point("eval/fixtures/unimorph-morphology-prior.json", "UniMorph morphology prior, the-fold fixture");
  rows.push({ gap: "not-present", detail: "POSPrior@1 (bin/priors/pos/en-ud-ewt.json) lives in the legacy-eoreader6.1 submodule, uninitialized in this checkout — the reader below runs without it, disclosed" });
  return rows;
}

const emptyRetrieve = (_fold, evidence) => Object.freeze({
  schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]),
  expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
  unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
});
const adapters = {
  revise: (args) => reviseTextFold({ ...args, canonicalizationFloor: 2 }),
  retrieve: emptyRetrieve,
};
const perceivers = () => [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25, descriptorAnchoring: ANCHORING })];

async function readDoc(fullPath, source) {
  const stripped = stripContainer(fs.readFileSync(fullPath, "utf8"));
  if (!stripped.looks_like_material) return { skipped: "does not look like readable material" };
  const all = textEncounters(stripped.text, { source, offset: stripped.offset });
  const capped = all.length > PER_DOC;
  const encounters = capped ? all.slice(0, PER_DOC) : all;
  const reader = createRecursiveReader({ perceivers: perceivers(), adapters });
  for (const enc of encounters) await reader.step(enc);
  return { reading: { fold: reader.getFold() }, encounters: encounters.length, of: all.length, capped };
}

async function main() {
  const t0 = Date.now();
  const sedimented = [];
  const corpus = [];
  const corporaSeen = [];

  for (const { name, dir } of CORPORA) {
    if (!fs.existsSync(dir)) {
      corporaSeen.push({ name, gap: "not-present", detail: `${dir} is not beside this repo` });
      continue;
    }
    const docs = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().slice(0, MAX_DOCS);
    let read = 0;
    for (const doc of docs) {
      const source = `${name}:${doc}`;
      const full = path.join(dir, doc);
      const result = await readDoc(full, source);
      if (result.skipped) { corpus.push({ source, path: full, skipped: result.skipped }); continue; }
      sedimented.push(sedimentReading({ source, reading: result.reading }, { giver: GIVER, organs: ORGANS }));
      corpus.push({ source, path: path.relative(ROOT, full), encounters: result.encounters, of: result.of, capped: result.capped });
      read += 1;
      // the raw reading falls out of scope here — only bounded memory accumulates
    }
    corporaSeen.push({ name, docs: read });
    console.error(`${name}: ${read} document(s) read and sedimented`);
  }

  if (!sedimented.length) throw new Error("no prior corpus found beside this repo — nothing to predigest");

  const compiled = compilePriors(sedimented, { giver: GIVER, corpus, received: receivedInventory(), organs: ORGANS });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(compiled, null, 1));

  const exp = compiled.composed.experience;
  const rhy = compiled.composed.rhythm;
  const recurrent = exp.relationVocabulary.filter((r) => r.recurrent);
  const summary = {
    declared: { perDoc: PER_DOC, maxDocs: MAX_DOCS === Infinity ? "all" : MAX_DOCS, giver: GIVER, anchoring: ANCHORING },
    corpora: corporaSeen,
    works: compiled.sourceCount,
    relationForms: exp.relationVocabulary.length,
    recurrentAcrossWorks: recurrent.length,
    topRecurrent: recurrent.slice(0, 12).map((r) => ({ relation: r.relation, works: r.workSupport })),
    networkPatterns: exp.networkPatterns.length,
    terrainExpectations: exp.terrainExpectations.filter((t) => t.workSupport > 0).map((t) => ({ terrain: t.terrain, works: t.workSupport })),
    rhythm: { medianGap: rhy.medianGap, gapCount: rhy.gapCount },
    received: compiled.received,
    wrote: path.relative(ROOT, OUT),
    ms: Date.now() - t0,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
