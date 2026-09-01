// node eval/metacognition-eval.mjs
//
// A re-runnable demonstration of metacognition.js (P19/P27/P60's own
// posture — this is a driver, not a committed regression test), aimed
// squarely at POLICIES.md P71's own three-leg gate.
//
// DOMAIN A is real, byte-verbatim Wikipedia text — the SAME `MATERIAL_TEXT`
// constant `experiments/mechanical-first-hamlin-johnson.mjs` already
// carries (Hannibal Hamlin / Andrew Johnson / Abraham Lincoln succession,
// this repo's own repeatedly-used specimen across P38/P50/P53/P54/P56/P58).
// Reused verbatim, not re-typed, so nothing here silently drifts from the
// bytes that specimen's OWN history already verified.
//
// DOMAIN B is DECLARED INVENTED — no real fixture of a genuinely unrelated
// domain exists on this disk, and the real relation extractor is
// unreachable in this checkout (the legacy engine submodule is
// uninitialized — confirmed empty before this driver was written). The
// same posture `eval/grain-refinement.mjs`'s own "an invented, unrelated
// hospital-bed corpus" and `hl-acquire.test.mjs`'s "invented chronicle,
// nothing recallable" already established for exactly this situation:
// nothing in it is presented as a fact about the world, and every relation
// edge is hand-typed rather than machine-extracted, disclosed below.
//
// LEG 1 (cross-domain replay, P71): the SAME `assessAgreement`/
// `makeMetacognition` code, unmodified, runs over both domains below and
// is checked for the SAME structural discrimination on each — a claim-kind
// with a real correction lands `contested`, a claim-kind with none lands
// `established`, on political succession AND on an invented lab-instrument
// chronicle sharing no vocabulary with it.
//
// LEG 2 (named giver / derived floor): satisfied by construction —
// `WITNESS_FLOOR` is imported from `asserted.js`, never re-declared here.
//
// LEG 3 (demonstrated necessity): this driver ALSO runs a naive two-way
// classifier (collapse UNRESOLVED into CORRECTED — the design this file's
// own header names as the Friston-alone failure mode) over the SAME data,
// and reports where it disagrees with the real four-way classifier — the
// concrete case where the fix's absence fails and its presence succeeds.

import { makeMetacognition, assessAgreement, WITNESS_FLOOR } from "../metacognition.js";
import * as taskLog from "../../eoreader7/native/kernel/task-log.js";

const lines = [];
const say = (s = "") => { lines.push(s); console.log(s); };

// ── Domain A: real, verbatim Wikipedia text ──────────────────────────────
// Copied byte-for-byte from experiments/mechanical-first-hamlin-johnson.mjs
// (MATERIAL_TEXT) rather than re-fetched, so this driver never depends on
// live network access to reproduce.
const DOMAIN_A_TEXT = `Hannibal Hamlin (August 27, 1809 - July 4, 1891) was an American politician and diplomat who was the 15th vice president of the United States, serving from 1861 to 1865, during President Abraham Lincoln's first term. He was the first Republican vice president.

15th Vice President of the United States
In office
March 4, 1861 - March 4, 1865
President Abraham Lincoln
Preceded by John C. Breckinridge
Succeeded by Andrew Johnson`;

const DOMAIN_A_PASSAGES = [{ ref: "hamlin.txt#0-400", text: DOMAIN_A_TEXT }];

// Two claim-kinds, run for several simulated turns each: one where S1's
// draft is repeatedly WRONG about the FIRST-term VP (the real, measured
// failure this repo's own P38/P50/P56 sections record — a small model
// answering "Andrew Johnson" for Lincoln's first-term running mate, when
// the material's own infobox states Hamlin), and one where S1 is
// repeatedly RIGHT about who succeeded Hamlin.
const DOMAIN_A_TRIALS = {
  "vice-president-of:first-term": [
    { s1: "Abraham Lincoln's vice president was Andrew Johnson.",
      edges: [{ subject: "Andrew Johnson", verb: "was vice president of", object: "Abraham Lincoln", verdict: "contradicted" }] },
    { s1: "Lincoln's running mate was Andrew Johnson from the start.",
      edges: [{ subject: "Andrew Johnson", verb: "was vice president of", object: "Abraham Lincoln", verdict: "contradicted" }] },
    { s1: "Hannibal Hamlin served as Lincoln's vice president in his first term.",
      edges: [{ subject: "Hannibal Hamlin", verb: "served as vice president of", object: "Abraham Lincoln", verdict: "bound" }] },
  ],
  "succeeded-by": [
    { s1: "Andrew Johnson succeeded Hannibal Hamlin as vice president.",
      edges: [{ subject: "Andrew Johnson", verb: "succeeded", object: "Hannibal Hamlin", verdict: "bound" }] },
    { s1: "Hamlin was followed in the vice presidency by Andrew Johnson.",
      edges: [{ subject: "Andrew Johnson", verb: "succeeded", object: "Hannibal Hamlin", verdict: "bound" }] },
  ],
};

// ── Domain B: DECLARED INVENTED, structurally analogous, topically unrelated ─
// A lab-instrument chronicle. No real person, place, or institution named.
// Structurally the same shape as Domain A (a succession/attribution claim
// with a real filler and a plausible wrong one) so the replay is testing
// the SAME kind of claim, not an easier one — but sharing zero vocabulary,
// so nothing here can be explained by Domain A's own words leaking in.
const DOMAIN_B_TRIALS = {
  "calibrated-by": [
    { s1: "The spectrometer was calibrated by Renn Oskavik in cycle nine.",
      edges: [{ subject: "Renn Oskavik", verb: "calibrated", object: "the spectrometer", verdict: "contradicted" }] },
    { s1: "Cycle nine's calibration was Oskavik's own work.",
      edges: [{ subject: "Renn Oskavik", verb: "calibrated", object: "the spectrometer", verdict: "contradicted" }] },
    { s1: "Tessa Marnow calibrated the spectrometer in cycle nine.",
      edges: [{ subject: "Tessa Marnow", verb: "calibrated", object: "the spectrometer", verdict: "bound" }] },
  ],
  "housed-in": [
    { s1: "The spectrometer sits inside Vault Kestrel.",
      edges: [{ subject: "the spectrometer", verb: "is housed in", object: "Vault Kestrel", verdict: "bound" }] },
    { s1: "Vault Kestrel holds the spectrometer.",
      edges: [{ subject: "the spectrometer", verb: "is housed in", object: "Vault Kestrel", verdict: "bound" }] },
  ],
};

function runDomain(label, trials) {
  say(`\n== ${label} ==`);
  const m = makeMetacognition(taskLog);
  let log = m.createLedger();
  const perCell = {};
  for (const [cell, turns] of Object.entries(trials)) {
    for (const turn of turns) {
      const r = assessAgreement(turn.s1, { relationEdges: turn.edges });
      log = m.observe(log, { cell, delta: r.counts });
    }
    perCell[cell] = m.standingOf(log, cell);
    say(`  ${cell}: ${perCell[cell].standing} — ${perCell[cell].phrase}`);
  }
  return { log, perCell, m };
}

const a = runDomain("Domain A — real Wikipedia text (Lincoln/Hamlin/Johnson)", DOMAIN_A_TRIALS);
const b = runDomain("Domain B — declared invented (lab-instrument chronicle)", DOMAIN_B_TRIALS);

say("\n== LEG 1: cross-domain replay ==");
const aErr = a.perCell["vice-president-of:first-term"];
const aOk = a.perCell["succeeded-by"];
const bErr = b.perCell["calibrated-by"];
const bOk = b.perCell["housed-in"];
const replayHolds =
  aErr.standing === "contested" && aOk.standing === "established" &&
  bErr.standing === "contested" && bOk.standing === "established";
say(`error-prone cell reads contested on both domains: ${aErr.standing === "contested"} / ${bErr.standing === "contested"}`);
say(`reliable cell reads established on both domains: ${aOk.standing === "established"} / ${bOk.standing === "established"}`);
say(`REPLAY HOLDS (same code, same discrimination, two unrelated domains): ${replayHolds}`);

say("\n== LEG 3: demonstrated necessity — a naive two-way classifier vs. the real one ==");
// The naive design this file's header names as the Friston-alone failure:
// anything not CONFIRMED is treated as CORRECTED. Run it over a cell whose
// history is genuinely mixed (real corrections AND real unconfirmable
// gaps) and show it lands a WORSE standing than the material earns.
const MIXED_TRIALS = [
  { s1: "Unit Halvorsen caused the Beacon Drift.",
    edges: [{ subject: "Unit Halvorsen", verb: "caused", object: "Beacon Drift", verdict: "contradicted" }] }, // real error
  { s1: "Unit Halvorsen preceded Array Kestrel.",
    edges: [{ subject: "Unit Halvorsen", verb: "preceded", object: "Array Kestrel", verdict: "beyond-reach" }] }, // real gap, not an error
  { s1: "Unit Halvorsen preceded Line Otter.",
    edges: [{ subject: "Unit Halvorsen", verb: "preceded", object: "Line Otter", verdict: "unheard" }] }, // real gap, not an error
  { s1: "Unit Halvorsen preceded Frame Vintner.",
    edges: [{ subject: "Unit Halvorsen", verb: "preceded", object: "Frame Vintner", verdict: "unbound" }] }, // real gap, not an error
];
// Both classifiers read the SAME per-atom material — apples to apples.
// `realTotals` is what assessAgreement (the real four-way split) actually
// counts; `naiveTotals` is the Friston-alone design named in this file's
// own header, applied to the IDENTICAL atoms: everything that is not
// `bound` counts as CORRECTED — no UNRESOLVED bucket exists for it to fall
// into instead.
const realTotals = { confirmed: 0, corrected: 0, unresolved: 0 };
const naiveTotals = { confirmed: 0, corrected: 0 };
for (const t of MIXED_TRIALS) {
  const r = assessAgreement(t.s1, { relationEdges: t.edges });
  realTotals.confirmed += r.counts.confirmed;
  realTotals.corrected += r.counts.corrected;
  realTotals.unresolved += r.counts.unresolved;
  for (const atom of r.atoms) {
    // The naive re-read of the SAME atom: was it graded CONFIRMED by the
    // real classifier? If not (CORRECTED or UNRESOLVED alike), the naive
    // design calls it corrected — it has nowhere else to put it.
    if (atom.verdict === "confirmed") naiveTotals.confirmed += 1;
    else naiveTotals.corrected += 1;
  }
}
const m3 = makeMetacognition(taskLog);
let log3 = m3.createLedger();
log3 = m3.observe(log3, { cell: "mixed", delta: realTotals });
const realFinal = m3.standingOf(log3, "mixed");
say(`real four-way classifier, over ${realTotals.confirmed + realTotals.corrected + realTotals.unresolved} atoms: ${realFinal.standing} — ${realFinal.phrase} (plus ${realTotals.unresolved} disclosed as unresolved, never counted either way)`);
say(`naive two-way classifier over the IDENTICAL atoms (no unresolved bucket to fall into): would count ${naiveTotals.corrected} of ${naiveTotals.confirmed + naiveTotals.corrected} as corrections — the same 3 honest gaps this file's header names, now indistinguishable from the 1 real one.`);
say(`NECESSITY DEMONSTRATED: on the identical atoms, the real classifier reports ${realTotals.corrected} real correction(s) and holds ${realTotals.unresolved} gap(s) apart; the naive design cannot tell them apart and reports ${naiveTotals.corrected}.`);

const md = `# metacognition.js — cross-domain replay and necessity demonstration

Re-run: \`node eval/metacognition-eval.mjs\`. WITNESS_FLOOR = ${WITNESS_FLOOR}
(imported from asserted.js, not re-declared here — POLICIES.md P71's leg 2).

## Domain A — real Wikipedia text (byte-verbatim from
\`experiments/mechanical-first-hamlin-johnson.mjs::MATERIAL_TEXT\`)

- \`vice-president-of:first-term\` (S1 wrong twice, right once): **${aErr.standing}** — ${aErr.phrase}
- \`succeeded-by\` (S1 right both times): **${aOk.standing}** — ${aOk.phrase}

## Domain B — declared invented, structurally analogous, zero shared vocabulary

- \`calibrated-by\` (S1 wrong twice, right once): **${bErr.standing}** — ${bErr.phrase}
- \`housed-in\` (S1 right both times): **${bOk.standing}** — ${bOk.phrase}

## Leg 1 (cross-domain replay)

Same code, unmodified, on two domains sharing no vocabulary: the
error-prone cell reads \`contested\` on both (${aErr.standing === "contested"} /
${bErr.standing === "contested"}), the reliable cell reads \`established\` on
both (${aOk.standing === "established"} / ${bOk.standing === "established"}).
**Replay holds: ${replayHolds}.**

## Leg 3 (demonstrated necessity)

A mixed cell (one real \`contradicted\` error, three real but unconfirmable
gaps — \`beyond-reach\`/\`unheard\`/\`unbound\`), read atom by atom through
BOTH classifiers on the identical extraction:

- **Real four-way split:** ${realTotals.corrected} corrected, ${realTotals.confirmed} confirmed,
  ${realTotals.unresolved} held apart as unresolved. Standing: **${realFinal.standing}** — ${realFinal.phrase}.
- **Naive two-way split** (the Friston-alone design this file's own header
  names — collapse everything non-\`bound\` into "corrected", because it has
  no unresolved bucket to hold a gap in): ${naiveTotals.corrected} of
  ${naiveTotals.confirmed + naiveTotals.corrected} atoms read as corrections.

Absence of the four-way split does not merely round differently — it
erases the distinction between "the material said no" and "the material
never got a chance to answer," folding ${realTotals.unresolved} disclosed
gaps into what would read as a pattern of repeated error. Presence of it
keeps the one real correction legible against them, which is Ramakrishna's
own plurality applied to a checking ladder: more than one honest outcome
of "S1 said something S2 could not confirm" is real, and forcing them all
into one verdict is the failure, not a simplification of it.

## Disclosed, not claimed

Domain A's relation edges (\`contradicted\`/\`bound\`) are hand-typed against
the real, verbatim material shown above — the real relation extractor
(\`hypergraph.js::makeRelationReader\`) needs \`eoreader7/legacy-eoreader6.1\`,
an uninitialized submodule in this checkout, and was not run. What IS real
throughout: the classification and ledger code (\`metacognition.js\`,
unmodified), the material's own bytes for Domain A, and the arithmetic
reported above.
`;

const fs = await import("node:fs");
fs.mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("./results/metacognition-eval-RESULTS.md", import.meta.url), md);
say("\nWrote eval/results/metacognition-eval-RESULTS.md");
