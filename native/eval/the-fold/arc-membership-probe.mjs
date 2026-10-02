// native/eval/the-fold/arc-membership-probe.mjs — B-FALSIFICATION, STEP 0.
//
// The B-falsification experiment (arc + role-family averaging + kindBoundaries
// over a form-scoped accumulation, tested on the known-failing prose set) is
// only as honest as its corpus, and the failing set does not exist on disk.
// This probe prices the read path BEFORE the experiment is built: read one
// short document holographically, print the beings/claims/arc it yields and
// the wall-clock, so the full experiment's budget is measured, not guessed.
//
// The machinery it exercises is the real one: the causal text perceiver, the
// recursive reader, the EOT parser (the arc's "attaches nothing" dependency),
// and the hyperlexicon accumulator. Nothing here is invented.
//
// Run: node native/eval/the-fold/arc-membership-probe.mjs <file.txt>
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");

const target = process.argv[2];
if (!target || !fs.existsSync(target)) { console.error("usage: node arc-membership-probe.mjs <file.txt>"); process.exit(1); }
const text = fs.readFileSync(target, "utf8").slice(0, 12000);

console.log(`reading ${target} (${text.length} chars) holographically...`);
const t0 = Date.now();

// The real assembly: the same organs experienced-new-book.mjs uses.
const { createCausalTextPerceiver, textEncounters } = await import(path.join(ROOT, "adapters/text/recursive.js"));
const { reviseTextFold } = await import(path.join(ROOT, "adapters/text/revision.js"));
const { createRecursiveReader } = await import(path.join(ROOT, "kernel/reading.js"));
const { makeEngineRelationReader } = await import(path.join(ROOT, "the-fold/reader-bundle.js"));
const { elementsOf } = await import(path.join(ROOT, "the-fold/medium.js"));
const { loadEotParser } = await import(path.join(ROOT, "the-fold/eot-notation.js"));
const { addressesOf, leanProfiles } = await import(path.join(ROOT, "the-fold/profile.js"));

const perceive = createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior: JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", "..", "cli/priors/pos-prior-en.json"), "utf8")), descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 } });
const adapters = {
  revise: (args) => reviseTextFold({ ...args, canonicalizationFloor: 2 }),
  retrieve: () => Object.freeze({ schema: "EORelevantFold@1", witnessed: [], provisional: [], expectations: [], obligations: [], exclusions: [], unresolvedAlternatives: [], activeFrames: [], receivedPriors: [] }),
};
const reader = createRecursiveReader({ perceivers: [perceive], adapters });
const t1 = Date.now();
console.log(`reader built in ${((t1 - t0) / 1000).toFixed(1)}s`);

// Read: feed the text as encounters, one step each (the real driver's pattern).
for (const enc of textEncounters(text, { source: target })) {
  await reader.step(enc);
}
const t2 = Date.now();
console.log(`read in ${((t2 - t1) / 1000).toFixed(1)}s`);

// The fold: what the reading established.
const fold = reader.getFold();
const entries = fold?.graphEntries ?? [];
const bySchema = {};
for (const e of entries) { const s = e.schema ?? "?"; bySchema[s] = (bySchema[s] ?? 0) + 1; }
const referents = entries.filter((e) => e.schema === "EOReferent@1");
const edges = entries.filter((e) => e.schema === "EOHyperedge@1");
const gaps = entries.filter((e) => e.schema === "EOReferentGap@1");
console.log(`graphEntries: ${entries.length} ${JSON.stringify(bySchema)}`);
console.log(`referents: ${referents.length} ${referents.slice(0, 10).map((r) => r.surface ?? r.id).join(", ")}`);
console.log(`hyperedges: ${edges.length} (relations) | gaps: ${gaps.length} (declared voids)`);

// The arc: does the parser model load? Does it attach anything?
const parser = await loadEotParser();
console.log(`eot parser: ${parser.ok ? "OK " + parser.provenance : parser.reason}`);
let arcNote = "no arc attempted";
if (parser.ok) {
  try {
    const elements = elementsOf(parser, text, { source: target });
    const arcs = addressesOf(elements, { relation: (x) => x?.relation ?? null });
    const lean = leanProfiles([elements], {});
    arcNote = `elements ${elements.length}, arc addresses ${arcs.length}`;
  } catch (e) { arcNote = `arc error: ${e.message}`; }
}
console.log(`arc: ${arcNote}`);
console.log(`TOTAL ${((Date.now() - t0) / 1000).toFixed(1)}s`);