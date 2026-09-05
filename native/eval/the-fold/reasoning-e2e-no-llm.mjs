// eval/reasoning-e2e-no-llm.mjs — how far can a question get answered,
// including a genuinely NOVEL answer never stated as one sentence, using
// only the mechanical organs already in this repo: hypergraph.js's real
// extraction/judgment (makeRelationReader), its direct graph query door
// (queryEdges/queryFillers), verification.js's nine-cell taxonomy, and —
// added in the second pass — capacity-runner.js's real evaluate door, the
// top of this repo's own mechanical checking ladder (squarePolarity +
// checkObjectSpecificity). Zero model calls anywhere in this file.
//
// Not a committed regression test (no golden score to chase) — a driver,
// matching the posture eval/mine-1-*.mjs and eval/witness-batch-eval.mjs
// already hold in this repo: re-runnable, and its output is the evidence.
// What it MEASURES that turned out to be worth pinning has been lifted
// into hypergraph.test.mjs and verification.test.mjs as real regressions.
//
// Run: node eval/reasoning-e2e-no-llm.mjs

//
// The computation lives in lib/reasoning-e2e.mjs (P95/S65) so that
// native/tests/reasoning-e2e.test.js reads every tier's verdict on each
// suite run; this file prints. The 2026-09-05 audit found this driver
// printing `undefined —undefined→ undefined` for every edge: it read the
// SVO fields the wipe removed. Migrated at the lib's seam. The grid is
// wired the way app.js wires it (native cube.js + task-log.js — the ONE
// task-log implementation the page carries), no second operators import.
import { existsSync } from "node:fs";
import { runReasoningE2E, resolveOrgans, resolveModules } from "./lib/reasoning-e2e.mjs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const LEGACY = new URL("../../../legacy-eoreader6.1", import.meta.url).pathname;
const FOLD = new URL("../../../../the-fold", import.meta.url).pathname;

const { provider, organs, classes } = await resolveOrgans({ native: NATIVE, legacy: LEGACY, existsSync });
const modules = await resolveModules({ native: NATIVE, fold: FOLD });
console.log(`organs: ${provider}`);
const out = runReasoningE2E({ organs, classes, modules });
for (const l of out.lines) console.log(l);
