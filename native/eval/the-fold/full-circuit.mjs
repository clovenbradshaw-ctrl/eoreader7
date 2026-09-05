// eval/full-circuit.mjs — the three ways of knowing in RELAY, on one
// material, every handoff's refusal exercised.
//
// The question this answers (asked directly, 2026-09-02): "does our core
// mechanism do all three?" The honest answer was no — no single mechanism
// does, on purpose, and the separation is enforced in code (signal.js has
// zero composition vocabulary; reaction.js has zero perturbation
// vocabulary; hl-acquire stops at CANDIDATE, never GIVEN). What did not
// exist was one driver running the whole relay end to end, so "the pieces
// compose" could be upgraded to "the circuit is measured". This is that
// driver.
//
// THE RELAY, and the wall at each handoff:
//   1. DISCOVERY    (perturbation)  signal.js finds structure under the
//                                    search-aware null — or a measured
//                                    absence on the noise arm.
//   2. ARRANGEMENTS (ostension)     event-arrangements: edges with
//                                    self-verified event-ordinal addresses.
//   3. CORROBORATION (triangulation) the hyperlexicon folds witnesses; only
//                                    notes at >=2 SOURCES and >=2
//                                    INSTRUMENTS proceed. A planted
//                                    one-source edge is STOPPED HERE.
//   4. ACQUISITION  (refutation)    hl-acquire nominates `precedes` as a
//                                    functional CANDIDATE — never GIVEN.
//   5. DECLARATION  (testimony)     a NAMED giver promotes the candidate;
//                                    without this step the chemistry
//                                    yields nothing (the control proves it).
//   6. COMPOSITION  (construction)  reaction.js derives never-stated facts
//                                    with provenance to real addresses.
//   7. VETO         (refutation)    auditChemistry over raw+derived; the
//                                    control arm that SKIPS wall 3 lets a
//                                    cycle in, and the veto catches it.
//
// MATERIAL: a relay of handovers a->b->c->d->e, recorded twice (two
// sources) and read by two instruments, with noise tokens between
// handovers and ONE planted cycle-closer (e->a) in source-1 only. Ground
// truth by construction: `a precedes c` is TRUE and never stated; `e
// precedes a` is planted, uncorroborated, and would make the relation
// cyclic if it ever reached composition.
//
// The computation lives in lib/full-circuit.mjs (P95/S65) so that
// native/tests/full-circuit.test.js reads every wall and number on each
// suite run; this file only prints. results/full-circuit-RESULTS.md is the
// dated transcription; the test is the enforcement.
import { runFullCircuit } from "./lib/full-circuit.mjs";

const { lines, walls } = await runFullCircuit();
for (const l of lines) console.log(l);
const breached = walls.filter((w) => !w.ok);
if (breached.length) {
  console.log(`\nBREACHED: ${breached.map((w) => `wall ${w.n} ${w.name}`).join(", ")}`);
  process.exitCode = 1;
}
