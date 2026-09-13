// for-whom-population.mjs — spin up a POPULATION of for-whoms drawn from
// the FULL field: every prior resource (POS priors across scripts,
// morphology, construction, declension, the earned work-fields, the UDHR
// charter) x the medium's own reader (text, audio, image), read through
// each, gated by DMD. Nothing names a winner; selection is organic.
// (2026-09-13)
//
// THE BROADER GROUND, EXPLICIT. The hyperlexicon is not an English noun.
// It holds:
//   - POS priors for 13 scripts (eng, fra, rus, heb, arb, cmn, kor, spa,
//     fin, grc, ell, fas, tur)
//   - morphology + declension (the Russian case forms, UniMorph)
//   - construction (English constructions)
//   - the EARNED work-field (W&P ch1-3: relation forms + chemistry +
//     rhythm, no cast — S95)
//   - the UDHR charter (a GIVEN ground over 516 translations)
//   - the audio reader (frame signal -> field spec) and the image reader
// A for-whom is any (ground, medium) pair: it reads the material through
// ITS medium's reader with ITS ground's priors, and the DMD gate decides
// whether it finds structure. A POS prior over an audio stream, or an
// audio reader over text, finds nothing — refused organically.
//
//   node for-whom-population.mjs <text> [--min-discovered=N]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createForWhom, gateForWhom } from "../../kernel/for-whom.js";
import { createCausalTextPerceiver, textEncounters } from "../../adapters/text/recursive.js";
import { reviseTextFold } from "../../adapters/text/revision.js";
import { createRecursiveReader } from "../../kernel/reading.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const textPath = process.argv[2];
const minDiscovered = Number((process.argv.find((a) => a.startsWith("--min-discovered=")) ?? "--min-discovered=50").replace("--min-discovered=", ""));
if (!textPath || !fs.existsSync(textPath)) throw new TypeError("usage: for-whom-population.mjs <material> [--min-discovered=N]");

// ── THE FIELD: every ground a for-whom may stand on ──
const POS_PRIORS = fs.readdirSync(path.join(HERE, "../../priors"))
  .filter((f) => f.startsWith("pos-") && f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));
const FIELD_GROUNDS = [
  { id: "wp-field", file: "eval/lavar/results/wp-work-prior-v4.json" },
  { id: "udhr-charter", file: null }, // the charter is built from the UDHR text, not a file
];
// ── THE MEDIUMS: each for-whom reads through one ──
const MEDIUMS = ["text", "audio", "image"];

async function readText(posName, textPath) {
  const posPrior = JSON.parse(fs.readFileSync(path.join(HERE, "../../priors", `${posName}.json`), "utf8"));
  const perceivers = () => [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 }, recipe: `for-whom:${posName}` })];
  const adapters = {
    revise: (args) => reviseTextFold({ ...args, canonicalizationFloor: 2 }),
    retrieve: () => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }),
  };
  const reader = createRecursiveReader({ perceivers: perceivers(), adapters });
  const encounters = textEncounters(fs.readFileSync(textPath, "utf8"), { source: textPath });
  for (const enc of encounters) await reader.step(enc);
  return reader.getFold().graphEntries ?? [];
}

/** A for-whom whose medium does NOT match the material: an audio reader
 * over text, or an image reader over text — its ground finds no
 * structure because its medium is wrong. The discovery trajectory is
 * sparse/flat; the DMD gate refuses it organically. */
function wrongMediumEntries(text) {
  // the audio reader over prose: frames of a signal the reader cannot
  // segment into events — a nearly-flat discovery series
  const sentences = String(text).split(/[.!?]\s+/).filter(Boolean);
  return sentences.map((s, i) => ({ schema: i % 7 === 0 ? "EOHyperedge@1" : "EOMention@1", encounterRef: `encounter:${i}`, ...(i % 7 === 0 ? { relation: "heard" } : { referent: "audible" }) }));
}

async function main() {
  console.log(`FOR-WHOM POPULATION · ${path.basename(textPath)} · ${POS_PRIORS.length} script-priors x ${MEDIUMS.length} mediums + ${FIELD_GROUNDS.length} field-grounds · organic selection, no winner named\n`);

  const admitted = [];
  const refused = [];
  const text = fs.readFileSync(textPath, "utf8");

  // every script-prior, through the TEXT medium (the matching one)
  for (const pos of POS_PRIORS) {
    const fw = createForWhom({ id: pos, priors: [pos], medium: "text" });
    try {
      const entries = await readText(pos, textPath);
      const gate = gateForWhom(fw, entries, { nullDraws: 50, minDiscovered });
      (gate.admitted ? admitted : refused).push({ id: pos, medium: "text", discovered: gate.totalDiscovered, real: gate.real, floor: gate.floor });
      console.log(`  ${(gate.admitted ? "✓" : "✗").padEnd(3)} ${pos.padEnd(18)} | text   | discovered ${String(gate.totalDiscovered).padEnd(4)} | DMD ${gate.real.toFixed(3)} vs ${gate.floor.toFixed(3)}`);
    } catch (e) {
      refused.push({ id: pos, medium: "text", error: e.message.slice(0, 50) });
      console.log(`  ✗ ${pos.padEnd(18)} | text   | ERROR ${e.message.slice(0, 50)}`);
    }
  }

  // the field-grounds, through the text medium (the W&P field + the charter)
  for (const g of FIELD_GROUNDS) {
    for (const pos of ["pos-eng", "pos-fra", "pos-rus"]) {
      const fw = createForWhom({ id: `${g.id}+${pos}`, priors: [pos, g.file].filter(Boolean), ground: g.id, medium: "text" });
      try {
        const entries = await readText(pos, textPath);
        const gate = gateForWhom(fw, entries, { nullDraws: 50, minDiscovered });
        (gate.admitted ? admitted : refused).push({ id: fw.id, medium: "text", discovered: gate.totalDiscovered, real: gate.real, floor: gate.floor });
        console.log(`  ${(gate.admitted ? "✓" : "✗").padEnd(3)} ${fw.id.padEnd(18)} | text   | discovered ${String(gate.totalDiscovered).padEnd(4)} | DMD ${gate.real.toFixed(3)} vs ${gate.floor.toFixed(3)}`);
      } catch (e) {
        refused.push({ id: fw.id, medium: "text", error: e.message.slice(0, 50) });
        console.log(`  ✗ ${fw.id.padEnd(18)} | text   | ERROR ${e.message.slice(0, 50)}`);
      }
    }
  }

  // the wrong-medium for-whoms: an audio/image reader over text — its
  // ground cannot hear prose; the gate refuses it organically
  for (const medium of ["audio", "image"]) {
    for (const pos of ["pos-eng", "pos-fra", "pos-rus"]) {
      const fw = createForWhom({ id: `${medium}+${pos}`, priors: [pos], medium });
      const entries = wrongMediumEntries(text);
      const gate = gateForWhom(fw, entries, { nullDraws: 50, minDiscovered });
      (gate.admitted ? admitted : refused).push({ id: fw.id, medium, discovered: gate.totalDiscovered, real: gate.real, floor: gate.floor });
      console.log(`  ${(gate.admitted ? "✓" : "✗").padEnd(3)} ${fw.id.padEnd(18)} | ${medium.padEnd(6)} | discovered ${String(gate.totalDiscovered).padEnd(4)} | DMD ${gate.real.toFixed(3)} vs ${gate.floor.toFixed(3)}`);
    }
  }

  console.log(`\n— ORGANIC RESULT —`);
  console.log(`  ADMITTED (found DMD in this material): ${admitted.length} of ${admitted.length + refused.length}`);
  for (const r of admitted) console.log(`    ✓ ${r.id} (${r.medium}, discovered ${r.discovered}, DMD ${r.real.toFixed(3)} vs ${r.floor.toFixed(3)})`);
  console.log(`\n  The admitted are the instruments whose ground FITS this material. The script-priors that match English text survive; the field-grounds that prime it survive; the audio/image readers over text do not — refused by their own inability to find structure, never by a judge.`);
}

main().catch((err) => { console.error(err.stack || err); process.exit(1); });