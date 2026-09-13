// for-whom-demo.mjs — spin up arbitrary for-whoms, each with a particular
// ground, particular priors, and a particular universe of meaning, gated
// by their ability to find DMD. (2026-09-13)
//
// THE DEMONSTRATION. The SAME material (AIW ch2) is read by different
// configured instruments:
//   - english-pos:   the received English POS prior (the standard reader)
//   - english-wp:    the same, primed with the W&P-earned field (the
//                    broader ground — the hyperlexicon)
//   - russian-pos:   the Russian POS prior (a universe whose vocabulary
//                    matches almost nothing in English text)
// Each produces its own discovery trajectory. The gate asks: does this
// for-whom FIND DMD — does its reading carry coherent order-dependent
// dynamics above its own null? A for-whom whose priors match the material
// is admitted; one whose universe is wrong is refused.
//
// The hyperlexicon is the SHARED field every for-whom stands on; the demo
// shows a for-whom primed with it (english-wp) against one that is not.
//
//   node for-whom-demo.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createForWhom, gateForWhom } from "../../kernel/for-whom.js";
import { createCausalTextPerceiver, textEncounters } from "../../adapters/text/recursive.js";
import { reviseTextFold } from "../../adapters/text/revision.js";
import { createRecursiveReader } from "../../kernel/reading.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");

const FORS = {
  english: { id: "english-pos", priors: ["pos-eng.json"] },
  english_wp: { id: "english-wp", priors: ["pos-eng.json", "wp-work-prior-v4.json"], ground: "wp-work-prior-v4" },
  russian: { id: "russian-pos", priors: ["pos-rus.json"] },
};

async function readWith(forWhom, textPath) {
  const posName = forWhom.priors.find((p) => p.includes("pos-")) ?? "pos-eng.json";
  const posPrior = JSON.parse(fs.readFileSync(path.join(HERE, "../../priors", posName), "utf8"));
  const perceivers = () => [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 }, recipe: `for-whom:${forWhom.id}` })];
  const adapters = {
    revise: (args) => reviseTextFold({ ...args, canonicalizationFloor: 2 }),
    retrieve: () => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }),
  };
  const reader = createRecursiveReader({ perceivers: perceivers(), adapters });
  const encounters = textEncounters(fs.readFileSync(textPath, "utf8"), { source: textPath });
  for (const enc of encounters) await reader.step(enc);
  const fold = reader.getFold();
  const entries = fold.graphEntries ?? [];
  return { fold, entries, recipe: forWhom.recipe };
}

async function main() {
  const textPath = process.argv[2] ?? "/tmp/aiw-ch2-prose.txt";
  if (!fs.existsSync(textPath)) throw new TypeError(`no text at ${textPath} — pass a readable text file`);
  console.log(`FOR-WHOM DEMO · material: ${path.basename(textPath)}`);
  console.log(`the hyperlexicon is the shared field; each for-whom stands on a particular slice of it, gated by finding DMD.\n`);

  const results = [];
  for (const key of Object.keys(FORS)) {
    const spec = FORS[key];
    const fw = createForWhom({ id: spec.id, priors: spec.priors, ground: spec.ground ?? null, universe: [] });
    const { entries, recipe } = await readWith(fw, textPath);
    const gate = gateForWhom(fw, entries, { nullDraws: 60, minDiscovered: 100 });
    results.push({ key, fw, gate, recipe });
    console.log(`  ${fw.id.padEnd(14)} | priors: ${spec.priors.join(", ").padEnd(30)} | discovered ${String(gate.totalDiscovered).padEnd(4)} | DMD real ${gate.real.toFixed(4)} vs null ${gate.floor.toFixed(4)} → ${gate.decision.split(" — ")[0]}`);
  }
  console.log(`\n  recipe addresses (THE-ADDRESS A5 — two instruments, two hashes):`);
  for (const r of results) console.log(`    ${r.fw.id.padEnd(14)} → ${r.recipe}`);
  console.log(`\n  english-wp stands on the W&P-earned field (the broader ground); english-pos does not.`);
  console.log(`  russian-pos's universe matches almost nothing in English text — its gate is the honest refusal.`);
}

main().catch((err) => { console.error(err.stack || err); process.exit(1); });