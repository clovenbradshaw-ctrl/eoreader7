#!/usr/bin/env node
// read-real.mjs — LaVar's second attempt at "read it word by word" (first
// attempt, lavar-read.mjs, hand-authored the propositions and only used
// notes.js's admission door — the user's correction: real reading means
// running the REAL pipeline in the REAL order, with the real activation
// rules, and leveraging the holograph AND the Hyperlexicon, not LaVar's own
// paraphrase of what a real reader would find).
//
// This runs the SAME machinery native/eval/experienced-new-book.mjs runs —
// createRecursiveReader + createCausalTextPerceiver, one Encounter@1 at a
// time in textEncounters' own reading order (surfaces -> referents ->
// pronoun activation -> typed relation -> notes.js admission, composed
// inside the perceiver exactly as READING-POLICY P2 describes) — over ONE
// short text, then builds Hyperlexicon composition candidates from what
// that real read actually produced. No hand-authored propositions here;
// every edge in the output is something the real reader concluded.
//
// Uses createCausalTextPerceiver's own default for refreshEvery (1, as of
// 2026-09-09 — see recursive.js's own header) rather than the archived
// sidecars' refreshEvery:25, because that recipe is exactly the batched
// design this session found and fixed: it read this 14-sentence book into
// an empty fold. Comparable to the archived sidecars in every other
// respect (same perceiver, same minRelationSurfaces/posPrior/anchoring),
// not in the one setting that was the bug.
//
//   node read-real.mjs <text-file> [--limit N]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripContainer } from "../../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../../adapters/text/recursive.js";
import { anchorAsDefiniteBinding } from "../../adapters/text/anchoring.js";
import { reviseTextFold } from "../../adapters/text/revision.js";
import { createRecursiveReader } from "../../kernel/reading.js";
import { createHyperlexicon, admitHyperlexiconCandidates } from "../../kernel/hyperlexicon.js";
import { createRelationCompositionLedger, acquireCompositionCandidates } from "../../kernel/relation-composition.js";
import { bridgeEdgeParticipants } from "./lib/span-free-bridge.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../.."); // native/eval/lavar -> native/eval -> native -> repo root
const GIVER = "reader:lavar-read-real";
const CANONICALIZATION_FLOOR = 2;
const ANCHORING = { minActivation: 0.05, minMargin: 0.2 };
// The received POS prior is per-language: a French read with the English
// prior admits "ne/pour/chose" as relations (the French reader measured
// 2026-09-12: top relations were ne x38, pour x23 — negation/connectors,
// not verbs). English's pos-eng.json has no French word forms at all, so
// the §8 received floor and the relationStanding REFUSAL both silently
// no-op. Selected by the file's language, never hardcoded.
const PRIOR_BY_LANG = {
  en: "pos-eng.json", fr: "pos-fra.json", ru: "pos-rus.json",
  eng: "pos-eng.json", fra: "pos-fra.json", rus: "pos-rus.json",
};
const langOfFile = (name) => {
  const base = name.toLowerCase();
  if (/(guerre|fran|^fr[^a-z]|_fra\.)/.test(base)) return "fra";
  if (/(voyna|vojna|^ru[^a-z]|_rus\.|cyrillic)/.test(base)) return "rus";
  return "eng";
};
function loadPrior(filePath) {
  const lang = langOfFile(path.basename(filePath));
  const file = PRIOR_BY_LANG[lang];
  const full = path.join(HERE, "../../priors", file);
  console.error(`[read-real] ${lang} prior: ${full}`);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

const emptyRetrieve = (_fold, evidence) => Object.freeze({
  schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]),
  expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
  unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
});

const adapters = {
  revise: (args) => reviseTextFold({ ...args, canonicalizationFloor: CANONICALIZATION_FLOOR }),
  retrieve: emptyRetrieve,
};
const RECIPE = "causalTextPerceiver_reviseTextFold_refresh1";
const perceivers = (posPrior) => [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior, descriptorAnchoring: ANCHORING, recipe: RECIPE })];

function load(filePath, source, limit) {
  const stripped = stripContainer(fs.readFileSync(filePath, "utf8"));
  if (!stripped.looks_like_material) throw new Error(`${filePath} does not look like readable material`);
  const all = textEncounters(stripped.text, { source, offset: stripped.offset });
  return limit ? all.slice(0, limit) : all;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new TypeError("usage: read-real.mjs <text-file> [--limit N]");
  const limitIdx = process.argv.indexOf("--limit");
  const limit = limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : undefined;

  const source = `file:${path.basename(filePath)}`;
  const encounters = load(filePath, source, limit);
  console.error(`reading ${source}: ${encounters.length} encounters, in order, one at a time...`);

  const posPrior = loadPrior(filePath);
  const reader = createRecursiveReader({ perceivers: perceivers(posPrior), adapters });
  for (const enc of encounters) await reader.step(enc);
  const fold = reader.getFold();
  const log = reader.getLog?.() ?? [];

  const rawEntries = fold.graphEntries ?? [];
  const projectedBindings = rawEntries.map(anchorAsDefiniteBinding).filter(Boolean);
  // The span-free node bridge (identity, not containment) + the possessive
  // holdings now live in lib/span-free-bridge.mjs, shared with
  // cli/eoreader7.mjs — one implementation, neither driver re-derives it.
  const { participantBindings } = bridgeEdgeParticipants(rawEntries);
  const entries = [...rawEntries, ...projectedBindings, ...participantBindings];

  const ledger = createRelationCompositionLedger(entries);
  const stats = ledger.diagnostics();

  // No prior works read yet at this rung (LAVAR.md §7: priors flow bottom-up
  // from cleared rungs; none are cleared yet), so nothing can be REMEMBERED
  // across works — every candidate here is nominated from recurrence WITHIN
  // this one reading alone, and none can reach "given" (experienced-new-
  // book.mjs's own rule: giving requires both sides to be cross-work
  // memories). Disclosed as a fact of this run, not a defect of this book.
  // NOMINATION AT ONE WITNESS (2026-09-13). The old `minWitnesses: 2`
// required a pair to recur at 2 independent chain sites WITHIN one read —
// measured: W&P ch1-3 has 18 pair types, every one at support 1, so zero
// candidates ever left a single read and the cross-work accumulator
// (which unions witnesses by id across readings) never received a
// single-witness candidate to corroborate. The second witness is supposed
// to come from the NEXT reading. With ids now honest (content-hashed,
// recipe-scoped — THE-ADDRESS.md A4/A5), a single independent chain site
// NOMINATES; the accumulator's cross-reading union corroborates to >=2.
// Nomination is never licensing (the grain law: a candidate is refutable,
// never earned).
  const observed = acquireCompositionCandidates(entries, { minWitnesses: 1 });
  const hyperlexicon = admitHyperlexiconCandidates(createHyperlexicon(), observed.map((c) => ({
    left: c.left, right: c.right, giver: GIVER,
    witnesses: (c.witnesses ?? []).slice(0, 3).map((w) => w?.[0]).filter(Boolean),
    meta: { independentSupport: c.meta?.support ?? 0, rememberedLeft: false, rememberedRight: false },
  })));
  const composition = Object.values(hyperlexicon.composition);

  const out = {
    schema: "LaVarRealRead@1",
    declared: { source, encounters: encounters.length, limit: limit ?? null, canonicalizationFloor: CANONICALIZATION_FLOOR, anchoring: ANCHORING, giver: GIVER, recipe: RECIPE },
    holograph: {
      relationEdges: stats.relationEdges,
      referentBindings: stats.referentBindings,
      chainSites: stats.chainSites,
      pairTypes: stats.pairTypes,
      repeatedPairTypes: stats.repeatedPairTypes,
      projectedBindings: projectedBindings.length,
      // Persist the FULL record, not rawEntries: the EODefiniteBinding
      // entries (span-free node bridge + possessive holdings) are what make
      // the composition ledger reach 31 pairTypes / 34 chainSites. A
      // downstream re-read of this artifact must reproduce the chemistry,
      // not a graph that re-reads at 0.
      graphEntries: entries,
    },
    hyperlexicon: {
      schema: hyperlexicon.schema,
      entries: composition.length,
      given: composition.filter((e) => e.standing === "given"),
      candidates: composition.filter((e) => e.standing === "candidate").map((e) => ({ left: e.left, right: e.right, standing: e.standing, independentSupport: e.meta.independentSupport, witnesses: e.provenance?.witnesses ?? null })),
      disclosure: "no prior work has been read at this rung yet, so nothing can be a cross-work memory — every candidate here is nominated from recurrence inside this one text alone, and none is GIVEN",
    },
    taskLog: { entries: log.entries?.length ?? log.length ?? 0 },
  };

  const slug = path.basename(filePath).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const outDir = path.join(HERE, "results");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${slug}-real-read.json`), JSON.stringify(out, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, `${slug}-real-fold.json`), JSON.stringify(fold, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, `${slug}-real-log.json`), JSON.stringify(log, null, 2) + "\n");

  console.log(JSON.stringify({
    relationEdges: stats.relationEdges, referentBindings: stats.referentBindings,
    hyperlexiconCandidates: composition.length, taskLogEntries: out.taskLog.entries,
    outFiles: [`${slug}-real-read.json`, `${slug}-real-fold.json`, `${slug}-real-log.json`],
  }, null, 2));
}

main().catch((err) => { console.error(err.stack || err); process.exit(1); });
