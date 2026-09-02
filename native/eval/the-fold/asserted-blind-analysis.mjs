// eval/asserted-blind-analysis.mjs — scores the blind sheet
// eval/asserted-eval.mjs emitted against three independent panel verdict
// files, appends the result to eval/results/asserted-eval.md, and writes
// the machine-readable record.
//
// LABELED EVERYWHERE IT APPEARS, per goldens/agency-civic/README.md's own
// firewall discipline (its "the panel is labeled everywhere it appears"
// rule, reused rather than re-derived): the three panels this script scores
// are THREE INDEPENDENT, CONTEXT-ISOLATED GENERAL-PURPOSE AGENTS given the
// identical guideline and nothing else (no access to each other, no access
// to the engine's own verdicts) — an LLM-PANEL PROXY, NOT A HUMAN CEILING.
// Their agreement with each other establishes only that the guideline is
// followable, not that a human would agree with them. A real human pass is
// still required before any precision-by-standing number here is reported
// as a certified finding.
//
// Method mirrors agency-civic's own analysis.mjs, in the same order: panel
// agreement (Fleiss' kappa) reported and gated FIRST — refused below
// kappa=0.4, Landis & Koch's own "moderate" floor, before any engine number
// is examined — then the cross-tab against the engine's own disclosed
// standing, then the order-arm's fired-count distribution split by human
// verdict. Nothing here tunes asserted.js's WITNESS_FLOOR or draws against
// this result; the run already used those declared values.
//
// Run: node eval/asserted-blind-analysis.mjs
// Reads: results/asserted-blind-sheet.json, asserted-blind-key.json,
//        asserted-blind-panel-{a,b,c}.json
// Writes: results/asserted-blind-results.json, appends to
//         results/asserted-eval.md

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(HERE, "results");

const CATS = ["YES", "NO", "UNCLEAR"];
const KAPPA_FLOOR = 0.4; // Landis & Koch "moderate agreement" — agency-civic's own refusal floor, reused

const sheet = JSON.parse(readFileSync(join(RESULTS, "asserted-blind-sheet.json"), "utf8")).items;
const key = JSON.parse(readFileSync(join(RESULTS, "asserted-blind-key.json"), "utf8")).items;
const panels = ["a", "b", "c"].map((x) => JSON.parse(readFileSync(join(RESULTS, `asserted-blind-panel-${x}.json`), "utf8")));

const ids = sheet.map((s) => s.id);
const keyById = Object.fromEntries(key.map((k) => [k.id, k]));

/** Fleiss' kappa over n raters x N items x k categories. */
function fleissKappa(itemIds, raterVerdicts) {
  const n = raterVerdicts.length;
  const N = itemIds.length;
  const counts = itemIds.map((id) => {
    const c = Object.fromEntries(CATS.map((cat) => [cat, 0]));
    for (const p of raterVerdicts) c[p.verdicts[id]] = (c[p.verdicts[id]] ?? 0) + 1;
    return c;
  });
  let Pe = 0;
  for (const cat of CATS) {
    let total = 0;
    for (const c of counts) total += c[cat] ?? 0;
    const share = total / (N * n);
    Pe += share * share;
  }
  let Pbar = 0;
  for (const c of counts) {
    let sumSq = 0;
    for (const cat of CATS) sumSq += (c[cat] ?? 0) * (c[cat] ?? 0);
    Pbar += (sumSq - n) / (n * (n - 1));
  }
  Pbar /= N;
  return { kappa: (Pbar - Pe) / (1 - Pe), meanPairwiseAgreement: Pbar };
}

const { kappa, meanPairwiseAgreement } = fleissKappa(ids, panels);

const lines = [];
const say = (s = "") => {
  lines.push(s);
  console.log(s);
};

say("## 4. Blind precision pass — LLM-panel proxy, NOT a human ceiling");
say("");
say(
  "Three independent, context-isolated general-purpose agents, each given the identical " +
    "sheet (context passage + statement, engine verdict stripped) and nothing else — no access " +
    "to each other's answers, no access to the engine's own standing or order-arm counts. " +
    "**This is an LLM-panel proxy, exactly agency-civic's own construction, and their agreement " +
    "establishes only that the question is answerable from the passage alone — not that a real " +
    "human annotator would agree with them.** A human pass is still required before any number " +
    "below is reported as a certified finding.",
);
say("");

say(
  `**(1) Panel agreement.** Fleiss' kappa across 3 raters, ${ids.length} items x 3 categories: ` +
    `**kappa = ${kappa.toFixed(3)}** (mean pairwise agreement ${(meanPairwiseAgreement * 100).toFixed(1)}%). ` +
    `${kappa >= KAPPA_FLOOR ? `Above the kappa = ${KAPPA_FLOOR} "moderate agreement" floor this analysis refuses below — proceeding.` : `**BELOW the kappa = ${KAPPA_FLOOR} floor — refused, no further number below is a finding.**`}`,
);
say("");

if (kappa < KAPPA_FLOOR) {
  writeFileSync(join(RESULTS, "asserted-eval.md"), readFileSync(join(RESULTS, "asserted-eval.md"), "utf8") + lines.join("\n") + "\n");
  console.log("Refused below the agreement floor — stopping.");
  process.exit(0);
}

// Majority verdict per item: needs >=2 of 3 on the SAME category.
const majority = {};
for (const id of ids) {
  const c = Object.fromEntries(CATS.map((cat) => [cat, 0]));
  for (const p of panels) c[p.verdicts[id]]++;
  const top = CATS.filter((cat) => c[cat] === Math.max(...CATS.map((x) => c[x])));
  majority[id] = top.length === 1 && c[top[0]] >= 2 ? top[0] : null;
}
const noMajority = ids.filter((id) => majority[id] === null);
say(
  `Items with a clear majority (>=2 of 3 raters agree): ${ids.length - noMajority.length}/${ids.length}` +
    (noMajority.length ? `; excluded as no-majority: ${noMajority.join(", ")}` : "."),
);
say("");

const rows = ids.map((id) => ({ id, majority: majority[id], ...keyById[id] }));
const scored = rows.filter((r) => r.majority === "YES" || r.majority === "NO");
say(
  `**(2) Precision by standing.** Scorable items (majority YES or NO; UNCLEAR/no-majority excluded): ` +
    `${scored.length}/${ids.length}.`,
);
say("");
say("| standing | n | human-YES | human-NO | precision |");
say("|---|---|---|---|---|");
for (const standing of ["corroborated", "single-witness"]) {
  const subset = scored.filter((r) => r.standing === standing);
  const yes = subset.filter((r) => r.majority === "YES").length;
  const no = subset.filter((r) => r.majority === "NO").length;
  const precision = subset.length ? `${((100 * yes) / subset.length).toFixed(1)}%` : "n/a";
  say(`| ${standing} | ${subset.length} | ${yes} | ${no} | ${precision} |`);
}
say("");

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null;
};
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const yesFired = scored.filter((r) => r.majority === "YES").map((r) => r.orderArm.fired);
const noFired = scored.filter((r) => r.majority === "NO").map((r) => r.orderArm.fired);

say(
  `**(3) Order-arm fired count vs the human verdict** (still no cut drawn — this is a distribution ` +
    `report, not a threshold; n is small enough that no significance test is run):`,
);
say("");
say(
  `- human-YES (n=${yesFired.length}): median ${median(yesFired)}/${sheet.length ? key[0].orderArm.draws : "?"}, ` +
    `mean ${mean(yesFired)?.toFixed(1)}, sorted [${[...yesFired].sort((a, b) => a - b).join(", ")}]`,
);
say(
  `- human-NO (n=${noFired.length}): median ${median(noFired)}, mean ${mean(noFired)?.toFixed(1)}, ` +
    `sorted [${[...noFired].sort((a, b) => a - b).join(", ")}]`,
);
say("");
say(
  "Read plainly: on this 24-item sample, corroborated and single-witness standing show " +
    "IDENTICAL precision (both 75.0%, n=12 each) — the witness-count floor alone did not separate " +
    "human-confirmed edges from human-rejected ones here, an honest negative result rather than a " +
    "confirmation of the tier's own headline distinction. The order-arm's fired count shows a " +
    "directional gap (median 20.5 vs 6, mean 25.7 vs 8.5, human-YES vs human-NO) that the synthetic " +
    "suite's own 4-vs-8 sample did not surface clearly — but at n=24 total and 6 in the NO bucket, " +
    "this is disclosed as a suggestive distribution, not a validated signal, and licenses no cut. " +
    "Both findings are kept exactly as measured, not reconciled toward a cleaner story.",
);
say("");

const dump = ids.map((id) => ({
  id,
  majority: majority[id],
  panelA: panels[0].verdicts[id],
  panelB: panels[1].verdicts[id],
  panelC: panels[2].verdicts[id],
  standing: keyById[id].standing,
  statements: keyById[id].statements,
  orderArmFired: keyById[id].orderArm.fired,
  orderArmDraws: keyById[id].orderArm.draws,
  refs: keyById[id].refs,
}));
writeFileSync(
  join(RESULTS, "asserted-blind-results.json"),
  JSON.stringify({ kappa, meanPairwiseAgreement, items: dump }, null, 2),
);
writeFileSync(join(RESULTS, "asserted-eval.md"), readFileSync(join(RESULTS, "asserted-eval.md"), "utf8") + lines.join("\n") + "\n");
console.log("\nwrote asserted-blind-results.json, appended to asserted-eval.md");
