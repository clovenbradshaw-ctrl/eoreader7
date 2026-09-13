// native/eval/read-pathos.mjs — the engine that undergoes: a real read, felt
// at a declared cadence, with the re-ground fired and LANDED on the record
// when the felt shape fails, and the re-scope re-read at a new ground.
//
// THE LOOP (the helix's own claim, executable — THE-RING-AT-FULL-WIDTH IV.1):
//   read → pathosOf (rhythm + curve + strain, for a declared experiencer)
//        → reGroundCondition → reGround (REC·Ground: a recorded concession)
//        → landReGround (the act lands, addressable, reads back — P88)
//        → the re-scope is re-read by a FRESH reader (the new ground)
//
// LAWS HELD:
//   1. PATHOS WITHOUT A DECLARED EXPERIENCER IS REFUSED (the anti-kitsch
//      wall) — the experiencer is declared, never defaulted.
//   2. A concession is a recorded act, never an idle one — ground_holds never
//      concedes, and one concession per failing register per pass (a second
//      act for the same kind on the same ground would be the same act twice).
//   3. A gap is never a verdict — the first window's release is unmeasured
//      (no before-fold), so it never concedes; it founds the ground instead.
//   4. The curve is the reading's OWN machinery: the real fold, the real
//      delta, at the turn that landed on each window boundary.
//
// DECLARED BOUNDS (stated, not hidden):
//   - the window is the cadence of feeling; surprise/release are measured
//     at the window's final turn (the turn that landed on the boundary).
//   - the re-read is one pass per re-scope; if the re-read's own final
//     condition fires, it is REPORTED as the ring's next altitude, not
//     re-read again (depth bound one, by declaration).
//
// Usage:
//   node native/eval/read-pathos.mjs [material.txt] [--window N] [--limit N]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripContainer } from "../adapters/text/spans.js";
import { textEncounters, createCausalTextPerceiver } from "../adapters/text/recursive.js";
import { reviseTextFold } from "../adapters/text/revision.js";
import { createRecursiveReader } from "../kernel/reading.js";
import { checkCubeProgression } from "../kernel/task-log.js";
// THE SEAM — the organ is reached through organs/index.js, never by path.
import { pathosOf, reGroundCondition, reGround, landReGround } from "../organs/index.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GIVER = "reader:read-pathos";
const CANONICALIZATION_FLOOR = 2;
const ANCHORING = { minActivation: 0.05, minMargin: 0.2 };
const POS_PRIOR = JSON.parse(fs.readFileSync(path.join(HERE, "../priors/pos-eng.json"), "utf8"));

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
};

const emptyRetrieve = () => Object.freeze({
  schema: "EORelevantFold@1", witnessed: Object.freeze([]), provisional: Object.freeze([]),
  expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
  unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
});

function makeReader() {
  const perceivers = () => [createCausalTextPerceiver({
    minRelationSurfaces: 2, posPrior: POS_PRIOR, descriptorAnchoring: ANCHORING,
  })];
  const adapters = {
    revise: (args) => reviseTextFold({ ...args, canonicalizationFloor: CANONICALIZATION_FLOOR }),
    retrieve: emptyRetrieve,
  };
  return createRecursiveReader({ perceivers: perceivers(), adapters });
}

// Strain from the RECORD, never from opinion: the ledger's own standing.
function stateFrom(entries, fold) {
  const flags = checkCubeProgression({ entries });
  const contested = entries.filter((e) => e.operator_basis === "contested").map((e) => e.task_id);
  return {
    contested,
    contradictions: [], // no contradiction ledger in this pipeline — declared, not assumed
    cycles: 0,          // no cycle measurement in this pipeline — declared, not assumed
    expired: (fold?.obligations ?? []).filter((o) => o.status === "expired").map((o) => o.id),
    unlicensed: flags.some((f) => f.kind === "production-order-reversed"),
  };
}

function condense(read) {
  return {
    forWhom: read.forWhom,
    rhythm: { flatline: read.rhythm.flatline, blinks: read.rhythm.blinks, dense: read.rhythm.dense, ratio: read.rhythm.ratio, n: read.rhythm.n },
    curve: {
      measured: read.curve.measured,
      surpriseOperations: read.curve.surprise?.operations ?? null,
      release: read.curve.release ?? null,
      tensionObligations: read.curve.tension?.obligations ?? null,
      persistenceMax: read.curve.tension?.persistenceMax ?? null,
      unmeasured: read.curve.unmeasured ?? null,
    },
    strain: read.strain,
  };
}

function reScopeFor(kind, acc, windowStart, windowEnd) {
  if (kind === "collapse") {
    return Object.freeze([{
      from: windowStart,
      to: windowEnd,
      text: (acc[windowStart] ?? "").slice(0, 80),
      basis: "the boundary where the ground was most wrong — the burst span",
    }]);
  }
  return Object.freeze([{
    from: 0,
    to: acc.length - 1,
    text: (acc[0] ?? "").slice(0, 80),
    basis: "the ground failed as a whole — re-read the piece at a new ground",
  }]);
}

/**
 * readPass — one windowed read of `encounters` by a fresh reader. Returns the
 * windows' felt shapes, the landed re-ground ledger, and the final read.
 * When `evaluate` is false the pass reports but never concedes (the re-read).
 */
async function readPass(encounters, experiencer, window, { evaluate = true } = {}) {
  const reader = makeReader();
  const acc = [];
  const windows = [];
  let ledger = [];
  const landedKinds = new Set();
  let lastFold = null;
  let lastDelta = null;
  let prevFold = null;
  let windowStart = 0;

  for (let i = 0; i < encounters.length; i++) {
    const step = await reader.step(encounters[i]);
    acc.push(encounters[i].material ?? "");
    lastFold = step.fold;
    lastDelta = step.deltaFold;
    if (i % window === window - 1 || i === encounters.length - 1) {
      const fold = lastFold;
      const delta = lastDelta;
      const text = acc.join(" ");
      const state = stateFrom(reader.getLog(), fold);
      const read = pathosOf({ text, experiencer, state, fold, delta, beforeFold: prevFold });
      const cond = reGroundCondition(read);
      const evaluated = evaluate && prevFold != null;
      windows.push({
        at: i,
        span: { from: windowStart, to: i },
        sentences: acc.length,
        evaluated,
        condition: evaluated ? cond.kind : "ground_holds",
        basis: evaluated
          ? cond.basis
          : "the first window founds the ground — its release is unmeasured (no before-fold), and a gap is never a verdict",
        read: condense(read),
      });
      if (evaluated && cond.kind !== "ground_holds" && !landedKinds.has(cond.kind)) {
        landedKinds.add(cond.kind);
        const reScope = reScopeFor(cond.kind, acc, windowStart, i);
        const act = reGround({ read, giver: `${GIVER}@${cond.kind}`, reScope });
        ledger = landReGround(ledger, act);
      }
      prevFold = fold;
      windowStart = i + 1;
    }
  }

  const finalRead = pathosOf({
    text: acc.join(" "),
    experiencer,
    state: stateFrom(reader.getLog(), lastFold),
    fold: lastFold,
    delta: lastDelta,
    beforeFold: prevFold,
  });
  return { windows, ledger, finalRead };
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const materialPath = args[0] ?? path.join(HERE, "lavar/goldens/aiw-ch1.clauses.txt");
  const window = arg("--window", 30);
  const limit = arg("--limit", 0);
  if (!fs.existsSync(materialPath)) throw new TypeError(`no material at ${materialPath}`);

  const source = `file:${path.basename(materialPath)}`;
  const experiencer = { who: GIVER, read: source };
  const stripped = stripContainer(fs.readFileSync(materialPath, "utf8"));
  if (!stripped.looks_like_material) throw new Error(`${materialPath} does not look like readable material`);
  const all = textEncounters(stripped.text, { source, offset: stripped.offset });
  const encounters = limit ? all.slice(0, limit) : all;

  console.error(`read-pathos · material ${source} (${encounters.length} encounters, window ${window})`);
  const pass = await readPass(encounters, experiencer, window);

  const acts = await Promise.all(pass.ledger.map(async (act) => {
    const reScope = act.opened.reScope ?? [];
    const slice = reScope.length && reScope[0].from != null
      ? encounters.slice(reScope[0].from, (reScope[0].to ?? reScope[0].from) + 1)
      : [];
    let reRead = null;
    if (slice.length) {
      console.error(`  re-ground ${act.cause.kind} at record ${act.record.at} — re-reading re-scope ${reScope[0].from}..${reScope[0].to} (${slice.length} encounters) at a new ground`);
      const rePass = await readPass(slice, { ...experiencer, read: `${source}#re-scope:${act.record.at}` }, window, { evaluate: false });
      reRead = {
        slice: { from: reScope[0].from, to: reScope[0].to, encounters: slice.length },
        finalCondition: reGroundCondition(rePass.finalRead).kind,
        finalBasis: reGroundCondition(rePass.finalRead).basis,
        finalRead: condense(rePass.finalRead),
      };
    }
    return { ...act, reRead };
  }));

  const out = {
    schema: "EOPathosRun@1",
    declared: {
      source,
      experiencer,
      window,
      encounters: encounters.length,
      giver: GIVER,
      canonicalizationFloor: CANONICALIZATION_FLOOR,
      posPrior: "pos-eng.json",
      bound: "one concession per failing register per pass; the re-read is one pass per re-scope, its own firing reported as the ring's next altitude, never re-read again",
    },
    windows: pass.windows,
    reGroundLedger: { schema: "EOPathosReGroundLedger@1", acts, readsBack: true },
    finalRead: condense(pass.finalRead),
    finalCondition: reGroundCondition(pass.finalRead).kind,
    disclosure: "the felt shape is the reading's own: rhythm from the material, curve from the fold and delta of the turn that landed on each window boundary, strain from the ledger. The first window founds the ground — its release is a gap, never a verdict. Release is witnessed only when the window's final turn closes an obligation open at the previous boundary, so a collapse condition on real material is expected to be eager; that is reported, not hidden.",
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => { console.error(err.stack || err); process.exit(1); });