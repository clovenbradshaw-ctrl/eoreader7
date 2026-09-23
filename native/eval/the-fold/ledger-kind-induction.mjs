// eval/ledger-kind-induction.mjs — does eoreader7's OWN reasoning ledger
// carry real Kind-grain structure (SIG·Pattern), read the same way the
// engine reads a novel, with no model call anywhere?
//
// ORIGIN (2026-09-23, user direction): "our internal reasoning isn't fully
// using the higher level terrains and all the stances to recursively create
// higher and higher level content" — verified true of cli/reason.mjs's own
// pipeline (grep found zero calls into kind-induction, network.js,
// mergeTestimony, or void-loop/reshape from cli/). This file is the first
// mechanical answer: point the SAME registered organ that finds entity kinds
// in a corpus (kernel/entity-kind-induction.js) at eoreader7's own reasoning-
// claim ledger (documents/eoreader7-reasoning:1.jsonl) instead of a text.
//
// THE ARC, kept honest rather than reported as a clean first pass:
//
//   ITERATION 1 (full population, 480 grounds, 250 of them singletons):
//   induceEntityKindCandidates found 4 "validated" basins. A discrimination
//   control — the arm the first pass skipped — REFUTED it: a marginals-
//   preserved shuffle of (ground,rel) pairing (real content destroyed, same
//   sparsity shape kept) also produced >=1 "validated" basin in 20/20 runs.
//   The organ's own internal null (random SUBSET of the same field) cannot
//   tell real structure from noise when the field itself is this sparse —
//   almost every entity is a singleton, so almost any subset looks cohesive
//   relative to a field that is mostly noise anyway.
//
//   ITERATION 2 (this file's default): restrict to grounds with >=3 claims
//   (138 of 480 — denser per-entity profiles). Same statistic, decided
//   before rerunning: count of validated basins, real vs a marginals-
//   preserved shuffle control. This time the two distributions separate
//   cleanly and a qualitative read of the members confirms real content
//   (see RESULTS.md) — one basin is EXACTLY the files in
//   native/eval/the-fold/long-project-heldout/, rediscovered from predicate
//   co-occurrence alone, no text read.
//
// WHAT THIS DOES NOT CLAIM: this is the Paradigm-grain's SIBLING terrain
// (Existence x Pattern = Kind), not the Interpretation-domain Paradigm
// terrain itself, and it is nowhere near MHC's "Paradigmatic" ORDER
// (coordinating two metasystems into a third framework) — see
// MHC-TESTS-ORDER-4-UP.md's own honest true-negative for that. See
// ledger-paradigm-testimony.mjs for the sibling test at the Interpretation
// domain's own Pattern-grain cell.
//
//   node native/eval/the-fold/ledger-kind-induction.mjs [--min-claims N]
//        [--shuffle-runs N] [--json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { induceEntityKindCandidates, testKindMembers } from "../../kernel/entity-kind-induction.js";
import { createSeededRng, shuffled } from "../../kernel/rng.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LEDGER = process.env.EO_LEDGER_DIR
  ? path.join(process.env.EO_LEDGER_DIR, "eoreader7-reasoning:1.jsonl")
  : path.join(HERE, "..", "..", "..", "documents", "eoreader7-reasoning:1.jsonl");

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : dflt; };
const MIN_CLAIMS = flag("--min-claims", 3);
const SHUFFLE_RUNS = flag("--shuffle-runs", 200);
const asJson = args.includes("--json");

function loadClaims() {
  if (!fs.existsSync(LEDGER)) return [];
  return fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    .filter((l) => l.kind === "reasoning-claim");
}

function buildFeatures(groundList, relList, idList) {
  const entityFeatures = new Map();
  for (let i = 0; i < groundList.length; i++) {
    const ground = groundList[i], rel = relList[i];
    if (!entityFeatures.has(ground)) entityFeatures.set(ground, new Map());
    const features = entityFeatures.get(ground);
    const signature = `rel:${rel}`;
    if (!features.has(signature)) features.set(signature, { featureKey: "rel", featureValue: rel, evidenceIds: new Set(), witnessRefs: new Set() });
    features.get(signature).evidenceIds.add(idList[i]);
  }
  return entityFeatures;
}

function run() {
  const claims = loadClaims();
  const countByGround = new Map();
  for (const c of claims) { const g = String(c.ground ?? "/"); countByGround.set(g, (countByGround.get(g) ?? 0) + 1); }
  const denseClaims = claims.filter((c) => (countByGround.get(String(c.ground ?? "/")) ?? 0) >= MIN_CLAIMS);
  const grounds = denseClaims.map((c) => String(c.ground ?? "/"));
  const rels = denseClaims.map((c) => String(c.rel ?? "?"));
  const ids = denseClaims.map((c, i) => c.id ?? `claim#${i}`);

  const realFeatures = buildFeatures(grounds, rels, ids);
  const realResult = induceEntityKindCandidates(realFeatures, { population: "eoreader7-reasoning-ledger:grounds-by-rel" });

  const candidates = realResult.candidates.map((cand) => {
    const recheck = testKindMembers(realFeatures, cand.memberRefs, { population: "eoreader7-reasoning-ledger:recheck" });
    return {
      id: cand.id, validated: cand.field.stable === true,
      memberCount: cand.memberCount, memberRefs: cand.memberRefs,
      distinguishingRels: cand.distinguishingParameters.map((p) => p.featureValue),
      cohesion: cand.cohesion, bindingEnergy: cand.field.bindingEnergy,
      cohesionNullPValue: cand.cohesionNull.pValue,
      secondDrawRecheck: recheck.refused ? { refused: recheck.refused.type } : { cleared: recheck.cleared, pValue: recheck.bindingNull.pValue },
    };
  });

  const rng = createSeededRng({ population: "eoreader7-reasoning-ledger:shuffle-control", purpose: "redeal-rel-labels" });
  const nullCounts = [];
  for (let run = 0; run < SHUFFLE_RUNS; run++) {
    const shuffledRels = shuffled(rels, rng);
    const shuffledIds = grounds.map((_, i) => `shuffled#${run}#${i}`);
    const f = buildFeatures(grounds, shuffledRels, shuffledIds);
    nullCounts.push(induceEntityKindCandidates(f, { population: `eoreader7-reasoning-ledger:SHUFFLED-run${run}` }).diagnostics.validated);
  }
  const real = realResult.diagnostics.validated;
  const exceed = nullCounts.filter((v) => v >= real).length;
  const pValue = (exceed + 1) / (nullCounts.length + 1);
  const hist = {};
  for (const v of nullCounts) hist[v] = (hist[v] ?? 0) + 1;

  const out = {
    schema: "EOLedgerKindInduction@1",
    minClaimsPerGround: MIN_CLAIMS,
    population: { grounds: realFeatures.size, claims: denseClaims.length },
    diagnostics: realResult.diagnostics,
    candidates,
    discriminationControl: {
      shuffleRuns: SHUFFLE_RUNS, realValidatedCount: real,
      nullHistogram: hist,
      nullMean: nullCounts.reduce((a, b) => a + b, 0) / SHUFFLE_RUNS,
      nullMax: Math.max(...nullCounts, 0),
      pValue, discriminates: pValue < 0.05,
    },
  };

  if (asJson) { console.log(JSON.stringify(out, null, 1)); return out; }
  console.log(`eoreader7 ledger kind-induction · ${out.population.grounds} grounds (>=${MIN_CLAIMS} claims each), ${out.population.claims} claims`);
  console.log(`basins: ${out.diagnostics.basins}, validated: ${out.diagnostics.validated}`);
  for (const c of candidates) {
    console.log(`  [${c.validated ? "VALIDATED" : "fallback"}] ${c.id} — ${c.memberCount} members, cohesion=${c.cohesion.toFixed(3)}, distinguishing=${JSON.stringify(c.distinguishingRels)}`);
  }
  console.log(`discrimination control: real=${real} vs shuffle(N=${SHUFFLE_RUNS}) mean=${out.discriminationControl.nullMean.toFixed(3)} max=${out.discriminationControl.nullMax} → p=${pValue.toFixed(4)} (${out.discriminationControl.discriminates ? "DISCRIMINATES" : "does not discriminate"})`);
  return out;
}

const result = run();
if (process.env.EO_WRITE_RESULTS) {
  const outPath = path.join(HERE, "results", "ledger-kind-induction-latest.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 1));
}
