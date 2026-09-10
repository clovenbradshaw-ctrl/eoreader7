#!/usr/bin/env node
// eoreader7 — commandline entry point onto the real reading pipeline.
//
//   eoreader7 <file> [--priors <dir>|live_priors] [--limit N] [--out <dir>]
//
// Runs the same machinery as native/eval/lavar/read-real.mjs (the recursive
// reader, in textEncounters' own order, feeding the holograph and
// Hyperlexicon composition) over an arbitrary file, with the POS prior
// swappable instead of hardcoded. See native/eval/lavar/read-real.mjs for
// why this recipe (refreshEvery:1, the real perceiver order) is the one to
// trust.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripContainer } from "../native/adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../native/adapters/text/recursive.js";
import { anchorAsDefiniteBinding } from "../native/adapters/text/anchoring.js";
import { reviseTextFold } from "../native/adapters/text/revision.js";
import { createRecursiveReader } from "../native/kernel/reading.js";
import { createHyperlexicon, admitHyperlexiconCandidates } from "../native/kernel/hyperlexicon.js";
import { createRelationCompositionLedger, acquireCompositionCandidates } from "../native/kernel/relation-composition.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const GIVER = "reader:eoreader7-cli";
const CANONICALIZATION_FLOOR = 2;
const ANCHORING = { minActivation: 0.05, minMargin: 0.2 };

// Bundled here, not read from the legacy-eoreader6.1 submodule — a plain
// `git clone` (no --recurse-submodules) leaves that submodule empty, which
// broke the CLI's default path entirely. Same file
// (legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json), copied in, so the CLI
// has no submodule dependency at all.
const DEFAULT_POS_PRIOR = path.join(HERE, "priors/pos-prior-en.json");
// live_priors is a sibling checkout (see reference_live_priors_github_repo
// memory) — not vendored here, and not auto-pulled. Resolve it relative to
// this repo's parent directory, same layout as the eoreader6.1 workspace.
const LIVE_PRIORS_POS = path.join(REPO_ROOT, "..", "live_priors/derived-priors/pos-priors/pos-prior-en.json");

function usage(msg) {
  if (msg) console.error(`eoreader7: ${msg}\n`);
  console.error(`usage: eoreader7 <file> [--priors <dir>|live_priors] [--limit N] [--out <dir>]

  <file>              text file to read
  --priors <dir>      directory to resolve priors from; must contain a
                       pos-priors/pos-prior-en.json (or a pos/en-ud-ewt.json,
                       eoreader6.1-layout, file) unless --priors live_priors
  --priors live_priors  use the live_priors checkout at ../live_priors
                         relative to this repo (run 'git pull' there yourself
                         first — this CLI does not fetch)
  --limit N           only read the first N encounters
  --out <dir>         directory to write output JSON into (default: cwd)
`);
  process.exit(msg ? 1 : 0);
}

function resolvePosPrior(priorsArg) {
  if (!priorsArg) return DEFAULT_POS_PRIOR;
  if (priorsArg === "live_priors") {
    if (!fs.existsSync(LIVE_PRIORS_POS)) usage(`live_priors checkout not found or missing derived prior at ${LIVE_PRIORS_POS}`);
    return LIVE_PRIORS_POS;
  }
  const dir = path.resolve(priorsArg);
  const candidates = [
    path.join(dir, "derived-priors/pos-priors/pos-prior-en.json"),
    path.join(dir, "pos-priors/pos-prior-en.json"),
    path.join(dir, "pos/en-ud-ewt.json"),
    dir.endsWith(".json") ? dir : null,
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) usage(`no pos prior found under --priors ${priorsArg} (looked at:\n  ${candidates.join("\n  ")}\n)`);
  return found;
}

// live_priors' own derived-priors/pos-priors/pos-prior-en.json carries the
// same schema tag and the same `forms` counts (built from the same UD
// English-EWT corpus — checked by hand, word-for-word identical sample) but
// wraps its provenance under `giver` instead of `provenance.source`, the
// shape createCausalTextPerceiver's own gate requires (recursive.js:351).
// Bridging the envelope here is safe because the payload (`forms`) is
// untouched; if `forms`/`counts` themselves ever diverge from this repo's
// own POSPrior@1 shape, this normalization must not silently paper over it.
function normalizePosPrior(prior, sourcePath) {
  if (!prior || prior.schema !== "POSPrior@1") usage(`${sourcePath} is not a POSPrior@1 file`);
  if (prior.provenance?.source) return prior;
  if (prior.giver?.resource) {
    return { ...prior, provenance: { source: prior.giver.resource, url: prior.giver.url, license: prior.giver.resourceLicense, note: prior.giver.note } };
  }
  usage(`${sourcePath} is POSPrior@1 but has neither provenance.source nor giver.resource — cannot name it`);
}

const emptyRetrieve = (_fold, evidence) => Object.freeze({
  schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]),
  expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
  unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
});

function load(filePath, source, limit) {
  const stripped = stripContainer(fs.readFileSync(filePath, "utf8"));
  if (!stripped.looks_like_material) throw new Error(`${filePath} does not look like readable material`);
  const all = textEncounters(stripped.text, { source, offset: stripped.offset });
  return limit ? all.slice(0, limit) : all;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) usage();

  const filePath = args[0];
  if (filePath.startsWith("--")) usage(`expected a file as the first argument, got ${filePath}`);
  if (!fs.existsSync(filePath)) usage(`no such file: ${filePath}`);

  const priorsIdx = args.indexOf("--priors");
  const priorsArg = priorsIdx > -1 ? args[priorsIdx + 1] : undefined;
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx > -1 ? Number(args[limitIdx + 1]) : undefined;
  const outIdx = args.indexOf("--out");
  const outDir = outIdx > -1 ? path.resolve(args[outIdx + 1]) : process.cwd();

  const posPriorPath = resolvePosPrior(priorsArg);
  const POS_PRIOR = normalizePosPrior(JSON.parse(fs.readFileSync(posPriorPath, "utf8")), posPriorPath);

  const adapters = {
    revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: CANONICALIZATION_FLOOR }),
    retrieve: emptyRetrieve,
  };
  const perceivers = () => [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior: POS_PRIOR, descriptorAnchoring: ANCHORING })];

  const source = `file:${path.basename(filePath)}`;
  const encounters = load(filePath, source, limit);
  console.error(`eoreader7: reading ${source} (${encounters.length} encounters, priors: ${path.relative(REPO_ROOT, posPriorPath)})...`);

  const reader = createRecursiveReader({ perceivers: perceivers(), adapters });
  for (const enc of encounters) await reader.step(enc);
  const fold = reader.getFold();
  const log = reader.getLog?.() ?? [];

  const rawEntries = fold.graphEntries ?? [];
  const projectedBindings = rawEntries.map(anchorAsDefiniteBinding).filter(Boolean);
  const entries = [...rawEntries, ...projectedBindings];
  const ledger = createRelationCompositionLedger(entries);
  const stats = ledger.diagnostics();

  const observed = acquireCompositionCandidates(entries, { minWitnesses: 2 });
  const hyperlexicon = admitHyperlexiconCandidates(createHyperlexicon(), observed.map((c) => ({
    left: c.left, right: c.right, giver: GIVER,
    witnesses: (c.witnesses ?? []).slice(0, 3).map((w) => w?.[0]).filter(Boolean),
    meta: { independentSupport: c.meta?.support ?? 0, rememberedLeft: false, rememberedRight: false },
  })));
  const composition = Object.values(hyperlexicon.composition);

  const out = {
    schema: "EOReader7CLIRead@1",
    declared: {
      source, encounters: encounters.length, limit: limit ?? null,
      canonicalizationFloor: CANONICALIZATION_FLOOR, anchoring: ANCHORING, giver: GIVER,
      priors: path.relative(REPO_ROOT, posPriorPath),
      recipe: "causalTextPerceiver_reviseTextFold_refresh1",
    },
    holograph: {
      relationEdges: stats.relationEdges,
      referentBindings: stats.referentBindings,
      chainSites: stats.chainSites,
      pairTypes: stats.pairTypes,
      repeatedPairTypes: stats.repeatedPairTypes,
      projectedBindings: projectedBindings.length,
      graphEntries: rawEntries,
    },
    hyperlexicon: {
      schema: hyperlexicon.schema,
      entries: composition.length,
      given: composition.filter((e) => e.standing === "given"),
      candidates: composition.filter((e) => e.standing === "candidate").map((e) => ({ left: e.left, right: e.right, standing: e.standing, independentSupport: e.meta.independentSupport, witnesses: e.provenance?.witnesses ?? null })),
    },
    taskLog: { entries: log.entries?.length ?? log.length ?? 0 },
  };

  const slug = path.basename(filePath).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  fs.mkdirSync(outDir, { recursive: true });
  const readPath = path.join(outDir, `${slug}.eoreader7.json`);
  const foldPath = path.join(outDir, `${slug}.eoreader7.fold.json`);
  const logPath = path.join(outDir, `${slug}.eoreader7.log.json`);
  fs.writeFileSync(readPath, JSON.stringify(out, null, 2) + "\n");
  fs.writeFileSync(foldPath, JSON.stringify(fold, null, 2) + "\n");
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2) + "\n");

  console.log(JSON.stringify({
    relationEdges: stats.relationEdges, referentBindings: stats.referentBindings,
    hyperlexiconCandidates: composition.length, taskLogEntries: out.taskLog.entries,
    outFiles: [readPath, foldPath, logPath],
  }, null, 2));
}

main().catch((err) => { console.error(err.stack || err); process.exit(1); });
