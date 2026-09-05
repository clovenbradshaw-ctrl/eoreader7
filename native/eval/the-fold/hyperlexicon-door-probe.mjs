// node eval/hyperlexicon-door-probe.mjs
//
// Is the reading good enough for a MEANINGFUL hypergraph? — the measurement
// behind P73, re-runnable (P19/P27's own posture: a driver, not a committed
// regression test). It mirrors the LIVE turn exactly — app.js's own
// relation-reader configuration, holon.js's admission (retrieve → read →
// admit per passage, witness = the passage ref), holon.js's own
// >=2-witness ledger block — against two real committed Wikipedia fixtures,
// and reports what the model would actually be shown.
//
// Three arms, because shipping the POS prior changes TWO things at once and
// they must be told apart:
//   A — the pre-P73 live config: no POS prior on disk, no door gate.
//   B — prior loaded (hypergraph.js's own posPriorFor vocabulary gate goes
//       live — the ride-along), door gate still off.
//   C — prior + the door's classifyConnector gate threaded (the P73 live
//       config): what the gate turns away, and what the ledger holds after.
//
// The identity seam (noteIdentity, P73's other half) is deliberately NOT
// exercised here: it ships unwired (no production canonicalization organ
// yet), and its mechanism is pinned in hyperlexicon-identity.test.mjs.
// This driver measures shipped arms only.
//
// The computation lives in lib/door-probe.mjs (P95/S65) so that
// native/tests/hyperlexicon-door-probe.test.js reads it on every suite run;
// this file only prints. results/hyperlexicon-door-probe-RESULTS.md is the
// dated transcription; the test is the enforcement.
import { readFileSync, existsSync } from "node:fs";
import { assembleDoorProbe, runDoorProbe, ARM_LABELS } from "./lib/door-probe.mjs";

const FOLD = new URL("../../../../the-fold/", import.meta.url).pathname;
const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures", import.meta.url).pathname;

const m = await assembleDoorProbe({ fold: FOLD, native: NATIVE, fixtures: FIX, readFileSync, existsSync });
if (!m.posPrior) console.log("NOTE: priors-data/pos-prior-eng.json absent — arms B/C degrade to arm A (data-gated, the live rule).");
const arms = runDoorProbe(m);
for (const k of ["A", "B", "C"]) {
  const a = arms[k];
  console.log(`\n═══ arm ${ARM_LABELS[k]} ═══`);
  console.log(`verdicts: ${JSON.stringify(a.verdicts)}`);
  console.log(`edges offered: ${a.offered} · turnedAway: ${JSON.stringify(a.away)} · notes on the ledger: ${a.notes.length}`);
  console.log(`closed-class labels among notes: ${a.closedLabels} of ${a.notes.length}`);
  console.log(`labels the POS prior has no entry for (it cannot tell a verb from a closed class there — "discusses" and Cyrillic "и" alike): ${a.unattestedLabels.length}${a.unattestedLabels.length ? ` (${a.unattestedLabels.join(", ")})` : ""}`);
  console.log(`notes with >=2 witnesses (the ledger block's own bar): ${a.corroborated}`);
  console.log(`notes:`);
  for (const n of a.notes) console.log(`  ${n.subject} —${n.verb}→ ${n.object}`);
}
