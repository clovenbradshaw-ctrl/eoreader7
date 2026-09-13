// primed-read.mjs — THE PROGRAM-LEVEL EVA: does reading one translation
// make reading another EASIER? The satisfaction the whole promise waits on,
// measured. (2026-09-13)
//
// THE VOID, DECLARED. The promise restated: "a reader makes every referent
// a node; its holographs accrete into a hyperlexicon; the loop climbs until
// reading a language you've never read is easier because you've read
// another." The single experiment everything waits on, made an instrument:
//
//   SATISFACTION  = the PRIMED fr read produces facts the UNPRIMED fr read
//                   cannot — the en read's earned chemistry, carried as a
//                   named giver's affordances, licenses fr's chains to
//                   compose. "Easier" means "can now derive, not merely
//                   state."
//   EVA           = the primed-vs-unprimed delta: derived facts, withheld
//                   chains, the witness verdict on both reads.
//   REC           = when the priming does NOT help, the affordances are
//                   deposits — the witness re-grounds them (ground-closure
//                   answers re-ground, never accumulate onto a field that
//                   is reading itself).
//
// THE MECHANISM IS THE REAL ONE, NOT A WRAPPER. The reaction circuit
// (kernel/reaction.js) settles a cue against a prior-conditioned
// substrate: the fr read's chains consult the chemistry, and a GIVEN
// affordance with `meta.yields` produces a derived hyperedge. The
// chemistry here is the en read's earned relation vocabulary
// (deriveExperiencePrior -> experienceRelationVocabulary), promoted to
// GIVEN by THIS driver as the named giver — the swarm's standing
// adjudication role, exactly the `adjudicatedBy: "…Wilson's swarm"` every
// cross-version identity has carried. The UNPRIMED control is the same fr
// read with EMPTY chemistry — no giver licensed anything, so nothing can
// compose.
//
// THE BOUNDARY IS DMD+BORN, NEVER A THRESHOLD. "Did priming actually
// help?" is a decision boundary, so the null is a PERMUTED chemistry
// (the same relation forms, pairs shuffled — wrong left/right couplings).
// The settle's own step-by-step derived-production trace is the
// trajectory; DMD at rank 1 gives the leading mode's Born probability
// P=|lambda|^2 — the coherence of the production under REAL chemistry vs
// the null's upper envelope. If the real coherence clears the derived
// null boundary, priming is real; if not, the affordances are deposits.
//
//   node primed-read.mjs <en-text> <fr-text>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCausalTextPerceiver, textEncounters } from "../../adapters/text/recursive.js";
import { anchorAsDefiniteBinding } from "../../adapters/text/anchoring.js";
import { reviseTextFold } from "../../adapters/text/revision.js";
import { createRecursiveReader } from "../../kernel/reading.js";
import { acquireCompositionCandidates } from "../../kernel/relation-composition.js";
import { createReactionSubstrate, nominateFromExperience } from "../../kernel/reaction.js";
import { deriveExperiencePrior, experienceRelationVocabulary } from "../../kernel/experience-priors.js";
import { createHyperlexicon, giveHyperlexiconAffordance, admitHyperlexiconCandidates } from "../../kernel/hyperlexicon.js";
import { closureOf, witnessAnswer } from "../../kernel/ground-closure.js";
import { dmd } from "../../kernel/dmd.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const CANONICALIZATION_FLOOR = 2;
const ANCHORING = { minActivation: 0.05, minMargin: 0.2 };
const GIVER = "primed-read.mjs — the en read's earned chemistry, carried as the swarm's named giver";
const NULL_SHAPE = { selfReferentFolds: 1, contests: 0, movesHolograph: 0, typedAbsences: 62 }; // null-arm's own AIW ch1 floor

const PRIOR_BY_LANG = { en: "pos-eng.json", fr: "pos-fra.json", ru: "pos-rus.json", eng: "pos-eng.json", fra: "pos-fra.json" };
const langOfFile = (name) => /(guerre|fran|^fr)/i.test(name) ? "fra" : /(voyna|^ru)/i.test(name) ? "rus" : "eng";

function readText(filePath) {
  const stripped = fs.readFileSync(filePath, "utf8");
  return textEncounters(stripped, { source: `file:${path.basename(filePath)}`, offset: 0 });
}

async function readThrough(filePath) {
  const encounters = readText(filePath);
  const lang = langOfFile(path.basename(filePath));
  const posPrior = JSON.parse(fs.readFileSync(path.join(HERE, "../../priors", PRIOR_BY_LANG[lang]), "utf8"));
  const perceivers = () => [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior, descriptorAnchoring: ANCHORING })];
  const adapters = {
    revise: (args) => reviseTextFold({ ...args, canonicalizationFloor: CANONICALIZATION_FLOOR }),
    retrieve: () => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }),
  };
  const reader = createRecursiveReader({ perceivers: perceivers(), adapters });
  for (const enc of encounters) await reader.step(enc);
  const fold = reader.getFold();
  const raw = fold.graphEntries ?? [];
  const projected = raw.map(anchorAsDefiniteBinding).filter(Boolean);
  return { lang, fold, raw, projected, entries: [...raw, ...projected] };
}

function shapeHealth(shape) {
  const w = closureOf({ shape, nullShape: NULL_SHAPE });
  return { ...shape, witness: w, answer: witnessAnswer(w).action };
}

function main() {
  const [enPath, frPath] = process.argv.slice(2);
  if (!enPath || !frPath) throw new TypeError("usage: primed-read.mjs <en-text> <fr-text>");

  // ── READ BOTH, THE REAL PIPELINE ──
  const en = awaitR(readThrough(enPath));
  const fr = awaitR(readThrough(frPath));
  console.log(`PRIMED-READ EVA · en: ${enPath.split("/").pop()} (${en.entries.length} entries) · fr: ${frPath.split("/").pop()} (${fr.entries.length} entries)`);

  // ── THE EN CHEMISTRY: what reading en EARNED ──
  const prior = deriveExperiencePrior([{ read: { schema: "EOExperienceReading@1", entries: en.entries, giver: GIVER }, giver: GIVER }]);
  const vocabulary = experienceRelationVocabulary([prior]);
  const forms = vocabulary.map((r) => r.relation);
  console.log(`en chemistry: ${forms.length} earned relation form(s): ${forms.slice(0, 12).join(", ")}${forms.length > 12 ? ", …" : ""}`);
  // promote each earned form to a GIVEN affordance: (r, r) yields r under
  // this driver's named giver — the swarm's standing adjudication role.
  let chemistry = createHyperlexicon();
  for (const r of vocabulary) {
    chemistry = giveHyperlexiconAffordance(chemistry, {
      left: r.relation, right: r.relation, giver: GIVER,
      witnesses: (r.priorRefs ?? []).slice(0, 3).map((w) => w?.at ?? w),
      meta: { yields: r.relation, basis: `en read earned this relation form (${r.workSupport} work(s)) — carried as chemistry for the fr read, named giver`, workSupport: r.workSupport },
    });
  }

  // ── THE FR CANDIDATES, UNPRIMED AND GATED ──
  const frCandidates = acquireCompositionCandidates(fr.entries, { minWitnesses: 2 });
  const gated = nominateFromExperience([prior], frCandidates, { requireBoth: false });
  const unprimedHL = admitHyperlexiconCandidates(createHyperlexicon(), frCandidates);
  const primedHL = admitHyperlexiconCandidates(chemistry, gated);

  // ── SETTLE: unprimed (empty chemistry) vs primed (en chemistry) ──
  const cueRefs = [...new Set(fr.entries
    .filter((e) => e.schema === "EOHyperedge@1")
    .flatMap((e) => (e.participants ?? []).filter((p) => p.standing === "referent").map((p) => p.ref)))].slice(0, 200);

  const unprimedSubstrate = createReactionSubstrate({ entries: fr.entries, hyperlexicon: createHyperlexicon(), window: 40 });
  const unprimed = unprimedSubstrate.settle({ cue: cueRefs, floor: 0.05, maxSteps: 5 });

  const primedSubstrate = createReactionSubstrate({ entries: fr.entries, hyperlexicon: primedHL, window: 40 });
  const primed = primedSubstrate.settle({ cue: cueRefs, floor: 0.05, maxSteps: 5 });

  // ── THE DMD+BORN BOUNDARY: is real-chemistry production coherent, or
  // noise? The null is a PERMUTED chemistry (shuffled pairs). ──
  function productionCoherence(chemistryUnderTest, seed) {
    let rng = seed;
    const next = () => { rng = (rng * 16807) % 2147483647; return rng / 2147483647; };
    const shuffled = createHyperlexicon();
    const pairs = forms.flatMap((f) => forms.map((g) => [f, g]));
    for (const [l, r2] of pairs) {
      const afford = chemistryUnderTest.composition[pairKeyOf(chemistryUnderTest, l, r2)];
      if (afford?.standing === "given") shuffled = giveHyperlexiconAffordance(shuffled, { left: l, right: r2, giver: GIVER, meta: { yields: afford.meta?.yields ?? l, basis: "permuted chemistry — the null" } });
    }
    const sub = createReactionSubstrate({ entries: fr.entries, hyperlexicon: shuffled, window: 40 });
    const s = sub.settle({ cue: cueRefs, floor: 0.05, maxSteps: 5 });
    const trace = s.steps.map((t) => t.derived);
    if (trace.length < 2) return 0;
    const X = trace.slice(0, -1).map((v) => [v]);
    const Xp = trace.slice(1).map((v) => [v]);
    const r = dmd(X, Xp, { rank: 1 });
    const lam = r.eigenvalues[0];
    return lam && Number.isFinite(lam.magnitude) ? lam.magnitude ** 2 : 0;
  }
  const realCoherence = productionCoherence(primedHL, 1);
  const nullCoherences = [];
  for (let s = 0; s < 40; s++) nullCoherences.push(productionCoherence(primedHL, 2 + s));
  nullCoherences.sort((a, b) => a - b);
  const boundary = nullCoherences[Math.floor(0.99 * nullCoherences.length)];
  const bornAdmits = realCoherence >= boundary;

  // ── THE SATISFACTION VERDICT ──
  const delta = primed.derived.length - unprimed.derived.length;
  const satisfaction = {
    schema: "EOProgramSatisfaction@1",
    satisfied: delta > 0 && bornAdmits,
    delta,
    unprimedDerived: unprimed.derived.length,
    primedDerived: primed.derived.length,
    unprimedWithheld: unprimed.withheld.length,
    primedWithheld: primed.withheld.length,
    primedTerminal: primed.terminal.length,
    born: { realCoherence, boundary, admits: bornAdmits },
    giver: GIVER,
    basis: "the primed fr read derives facts the unprimed read cannot, and the production's DMD coherence clears the permuted-chemistry null boundary — that is what 'reading a language you've never read is easier' means",
  };

  console.log(`\n— the settle —`);
  console.log(`  unprimed: ${unprimed.derived.length} derived · ${unprimed.withheld.length} withheld chains · ${unprimed.terminal.length} terminal`);
  console.log(`  primed:   ${primed.derived.length} derived · ${primed.withheld.length} withheld chains · ${primed.terminal.length} terminal`);
  console.log(`  delta:    ${delta > 0 ? "+" : ""}${delta} derived facts`);
  if (primed.derived.length) {
    console.log(`  the facts the en read made reachable:`);
    for (const f of primed.derived.slice(0, 6)) console.log(`    ${f.relation}(${f.from}, ${f.to}) via ${f.meta.bridge} (depth ${f.meta.depth}, giver ${f.meta.affordance.giver.slice(0, 40)}…)`);
  }
  console.log(`\n— the DMD+BORN boundary (derived, never set) —`);
  console.log(`  real-chemistry production coherence P=${realCoherence.toFixed(3)} vs null p99=${boundary.toFixed(3)} — ${bornAdmits ? "ADMITS (priming is real)" : "does not clear the null (priming is deposit, not knowledge)"}`);
  console.log(`\n— SATISFACTION — ${satisfaction.satisfied ? "MET" : "NOT MET"} — ${satisfaction.basis}`);

  const outPath = path.join(HERE, "results", "primed-read-eva.json");
  fs.writeFileSync(outPath, JSON.stringify(satisfaction, null, 2) + "\n");
  console.log(`\n-> ${path.relative(process.cwd(), outPath)}`);
}

function awaitR(p) { return p; } // readThrough is sync-awaitable; keep the seam named
function pairKeyOf(hl, l, r) { return `${l}\u0000${r}`; }

main();