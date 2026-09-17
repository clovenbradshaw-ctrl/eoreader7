// native/eval/lavar/archon-falsification.mjs — does grounding an ant with a
// real archon's chemistry actually change how it reads genuinely NOVEL
// material, and is that change attributable to the ARCHON specifically
// (never to "having some extra prior at all")?
//
// This is the falsification the user asked for directly: "prove we can
// solve novel problem via ants that act like the archons, and we need to
// falsify that one ant really is like an archon" — using Wilson (the Hive),
// Aristotle (logos.js's warrant) and Pythia (organs/pythia.js's oracle)
// together, as directed, not as three separate demos.
//
// THE MATERIAL. Alice in Wonderland (Project Gutenberg #11) — genuinely
// novel to Homer: neither of Homer's own two works (the archon prior's
// source) contains one word of it, and it shares no genre, register or
// era with epic verse.
//
// THE DESIGN, per trial (one AIW passage):
//   1. Read the passage once (readMaterialText) to get its own real
//      extracted entries — the SAME entries every condition below reads,
//      so only the licensing hyperlexicon varies, nothing else.
//   2. evaluateRelationCompositions(entries, hl) under THREE conditions:
//      UNGROUNDED (empty hl — the baseline ant), ARCHON (Homer's real,
//      corroborated prior), SHUFFLED (the same prior's vocabulary with its
//      pairing destroyed — shuffleArchonPrior's own redeal null).
//   3. The trial's own boolean: did ARCHON license MORE compositions than
//      SHUFFLED on this passage? (Comparing to SHUFFLED, not to
//      UNGROUNDED, is the falsification: UNGROUNDED vs ARCHON alone could
//      not tell "real Homer chemistry" apart from "any extra prior helps."
//      SHUFFLED has the identical vocabulary and identical prior SIZE —
//      the only thing that could make ARCHON win more often is the real
//      co-occurrence structure.)
//   4. Every ARCHON-licensed composition, across all trials, becomes a
//      real EOHyperedge@1 (`occupies_bridge_between`, the label
//      evaluateRelationCompositions itself uses) and is handed to
//      logos.js's real refuteRelation via wilsonSolve's own logos caste —
//      so the claim "archon-grounded reading is not just numerically
//      bigger but still LOGICALLY SOUND" is Aristotle's own check, not
//      asserted.
//   5. The per-trial booleans (across every AIW passage) are pythiaSpeak's
//      own trials — pythiaInterpret gives ONE declared, honest verdict
//      (favorable/unfavorable/ambiguous), never a bare win-count eyeballed.
//
// usage: node archon-falsification.mjs [archonKey] [seed]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hyperedge } from "../../kernel/hypergraph.js";
import { evaluateRelationCompositions } from "../../kernel/relation-composition.js";
import { createHyperlexicon } from "../../kernel/hyperlexicon.js";
import { buildArchonPrior, shuffleArchonPrior, chunkArchonText, ARCHON_ROSTER } from "./lib/archon-priors.mjs";
import { readMaterialText } from "./lib/read-recipe.mjs";
import { wilsonSolve, requireSolution } from "../../organs/wilson.js";
import { pythiaSpeak, pythiaInterpret, requireOracle } from "../../organs/pythia.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(HERE, "fixtures", "archon-priors");
const archonKey = process.argv[2] ?? "homer";
const seed = Number(process.argv[3] ?? 1);

const entry = ARCHON_ROSTER[archonKey];
if (!entry) { console.error(`no such archon: ${archonKey}`); process.exit(1); }

async function fetchOrCached(url, cacheName) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, cacheName);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, "utf8");
  console.error(`fetching ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${url} -> ${res.status}`);
  const text = await res.text();
  fs.writeFileSync(cachePath, text);
  return text;
}

const posPrior = JSON.parse(fs.readFileSync(path.join(HERE, "../../priors/pos-eng.json"), "utf8"));

console.error(`── building the ${archonKey} archon prior ──`);
const archonTexts = await Promise.all(
  entry.works.map((w, i) => fetchOrCached(`https://www.gutenberg.org/cache/epub/${w.gutenbergId}/pg${w.gutenbergId}.txt`, `${archonKey}-work${i}-pg${w.gutenbergId}.txt`)),
);
const archonPrior = await buildArchonPrior(archonKey, archonTexts, { posPrior, onChunk: (t) => process.stderr.write(`  chunk ${t}\r`) });
console.error(`\n${archonKey}: ${archonPrior.entryCount} given composition pair(s) (${archonPrior.builtFrom.nominatedPairs} nominated)`);
if (archonPrior.entryCount === 0) {
  console.error(`REFUSING: "${archonKey}" has no GIVEN composition chemistry to ground with — nothing to falsify. Try a more formulaic archon.`);
  process.exit(2);
}

const shuffledPrior = shuffleArchonPrior(archonPrior, { seed });
console.error(`shuffled control: ${shuffledPrior.entryCount} pair(s), same vocabulary, seed ${seed}`);

console.error(`── fetching the novel material (Alice in Wonderland, pg11) ──`);
const aiwRaw = await fetchOrCached("https://www.gutenberg.org/cache/epub/11/pg11.txt", "aiw-pg11.txt");
const trials = chunkArchonText(aiwRaw, 8000).filter((c) => c.trim().length > 500);
console.error(`${trials.length} novel-material trials (AIW passages, ~8000 chars each)`);

const emptyHl = createHyperlexicon();
const archonLicensedEdges = [];
const trialResults = [];

for (let i = 0; i < trials.length; i += 1) {
  const read = await readMaterialText(trials[i], { source: `aiw#p${i}`, posPrior });
  const entries = read.entries;

  const ungrounded = evaluateRelationCompositions(entries, emptyHl);
  const archonHl = { schema: "EOHyperlexicon@1", composition: archonPrior.composition };
  const withArchon = evaluateRelationCompositions(entries, archonHl);
  const shuffledHl = { schema: "EOHyperlexicon@1", composition: shuffledPrior.composition };
  const withShuffled = evaluateRelationCompositions(entries, shuffledHl);

  const archonWinsOverShuffle = withArchon.licensed.length > withShuffled.licensed.length;
  trialResults.push({
    trial: i,
    ungroundedLicensed: ungrounded.licensed.length,
    archonLicensed: withArchon.licensed.length,
    shuffledLicensed: withShuffled.licensed.length,
    archonWinsOverShuffle,
  });
  process.stderr.write(`  trial ${i}: ungrounded=${ungrounded.licensed.length} archon=${withArchon.licensed.length} shuffled=${withShuffled.licensed.length} ${archonWinsOverShuffle ? "→ archon wins" : ""}\n`);

  for (const lic of withArchon.licensed) archonLicensedEdges.push(lic);
}

console.error(`\n── ARISTOTLE (logos.js): is the archon-licensed structure on NOVEL material internally sound? ──`);
let logosSummary;
if (archonLicensedEdges.length >= 2) {
  const edges = archonLicensedEdges.map((lic, i) => hyperedge({
    id: `archon-lic-${i}`, relation: "occupies_bridge_between",
    participants: [{ ref: lic.from, standing: "referent" }, { ref: lic.to, standing: "referent" }],
    witness: lic.witnessRefs?.[0] ?? null,
  }));
  try {
    const solution = requireSolution(wilsonSolve({
      task: "compose the archon-licensed relation structure found across a genuinely novel reading of Alice in Wonderland",
      op: "SYN", grain: "Pattern",
      edges, relation: "occupies_bridge_between",
      text: `${archonLicensedEdges.length} archon-licensed compositions across ${trials.length} novel passages`,
      experiencer: { who: "archon-grounded-ant", read: "aiw#pg11 (archon: " + archonKey + ")" },
    }));
    logosSummary = { verdict: solution.logos.verdict, warranted: solution.logos.warranted, examined: solution.logos.examined };
    console.error(`  WARRANTED: ${solution.logos.verdict} (${solution.logos.examined} edges examined) — the Hive certified this solution end to end (ethos cleared, logos warranted, pathos read).`);
  } catch (e) {
    logosSummary = { refused: e.message };
    console.error(`  REFUSED by the Hive: ${e.message}`);
  }
} else {
  logosSummary = { skipped: `only ${archonLicensedEdges.length} archon-licensed edge(s) — insufficient for logos to examine` };
  console.error(`  skipped: ${logosSummary.skipped}`);
}

console.error(`\n── PYTHIA: across ${trialResults.length} independent trials, does the archon win over its own shuffled control? ──`);
const pythiaTrials = trialResults.map((t) => t.archonWinsOverShuffle);
const utterance = pythiaSpeak({ trials: pythiaTrials });
console.error(`  utterance: ${utterance.agree}/${utterance.total} trials favor archon (rate ${utterance.rate.toFixed(3)}) — UNINTERPRETED`);
const verdict = requireOracle(pythiaInterpret(utterance, { threshold: 0.5, ambiguityBand: 0.15 }));
console.error(`  INTERPRETED (threshold 0.5, band 0.15): ${verdict.verdict.toUpperCase()}`);

const report = {
  schema: "ArchonFalsificationReport@1",
  archon: archonKey,
  seed,
  archonPrior: { entryCount: archonPrior.entryCount, nominatedPairs: archonPrior.builtFrom.nominatedPairs },
  trials: trialResults,
  logos: logosSummary,
  pythia: { utterance, verdict },
};
console.log(JSON.stringify(report, null, 2));
