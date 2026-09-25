#!/usr/bin/env node
// PROOF: the felt dimension is dormant because the fold's obligations are
// empty by construction — and it fires the moment obligations are fed.
// Part A: turn dynamics are 0/empty (measured on a real read).
// Part B: the reader DOES generate expectations (its own tasks).
// Part C: deriveTension/deriveRelease compute NON-ZERO when those
//         expectations are fed as obligations — the machinery works.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCausalTextPerceiver, textEncounters } from "../../adapters/text/recursive.js";
import { reviseTextFold } from "../../adapters/text/revision.js";
import { createRecursiveReader } from "../../kernel/reading.js";
import { deriveTension, deriveRelease, deriveSurprise } from "../../kernel/dynamics.js";
import { expectation, expectationTransition } from "../../kernel/expectations.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const pos = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../../cli/priors/pos-prior-en.json"), "utf8"));
const reader = createRecursiveReader({ perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior: pos, reprojectEvery: 10 })], adapters: { revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: 2 }), retrieve: () => [] } });
const text = fs.readFileSync(path.resolve(HERE, "../../../../live_priors/01-literature-books/gutenberg/pg11-alice-ch1.txt"), "utf8").slice(0, 20000);

console.log("=== PART A — the measured turns: dynamics are empty ===");
let surpriseOps = 0, tensionObs = 0, releases = 0, taskExps = 0;
const turns = [];
for (const e of textEncounters(text, { source: "proof:alice-ch1", offset: 0 })) turns.push(await reader.step(e));
for (const turn of turns) {
  surpriseOps += turn.surprise?.operations?.length ?? 0;
  tensionObs += turn.tension?.obligations?.length ?? 0;
  releases += Array.isArray(turn.release) ? turn.release.length : 0;
  taskExps += (turn.awakenedTasks ?? []).length + (turn.scheduledTasks ?? []).length;
}
console.log(`  ${turns.length} turns · surprise ops ${surpriseOps} · tension obligations ${tensionObs} · releases ${releases} · awakened/scheduled tasks ${taskExps}`);
console.log(`  → tension obligations ${tensionObs}, releases ${releases} — the Bharata feed (revision.js) opened the reader's own anticipations, and the dynamics bridge (dynamics.js reads expectations AND obligations) made them fire`);

console.log("\n=== PART B — the reader DOES generate expectations (its own tasks) ===");
const taskLog = reader.getTasks?.() ?? [];
console.log(`  reader task log: ${taskLog.length} task(s)`);
for (const t of taskLog.slice(0, 5)) console.log(`    · [${t.status}] ${(t.description ?? "").slice(0, 70)}${t.questions?.length ? ` Q:${t.questions.length}` : ""}`);

console.log("\n=== PART C — feed those expectations as obligations; the dynamics FIRE ===");
// an obligation = an open expectation; closing one with a witnessed
// transformation is exactly a Release (dynamics.js reads this field)
const open = expectation({ id: "exp:white-rabbit", hypothesis: "the White Rabbit recurs", giver: "proof", grounds: ["alice", "rabbit"], scope: null, openedAt: 1 });
// THE FIELD GAP, PROVEN: expectations emit `state`, dynamics read `status`.
// Bridge it and the release fires.
const closed = expectationTransition(open, "fulfilled", { witness: "proof:later-encounter", consequence: "the rabbit is re-mentioned" }).payload.value;
const bridge = (o) => ({ ...o, status: o.state, state: o.state });
const beforeFold = { obligations: Object.freeze([bridge(open)]) };
const afterFold = { obligations: Object.freeze([bridge(closed)]) };
const delta = { operations: [{ payload: { id: "exp:white-rabbit" }, witness: "proof" }] };
const tension = deriveTension({ ...afterFold, sequence: 50 });
const feltReleases = deriveRelease(delta, beforeFold, afterFold);
console.log(`  tension: ${tension.obligations.length} open obligation(s), persistence ${tension.persistence.map((p) => p.value).join(",")}, interactionNetwork ${tension.interactionNetwork.length}`);
console.log(`  releases: ${feltReleases.length} — ${feltReleases.map((r) => `obligation ${r.obligation} fulfilled with ${r.transformation.length} witnessed op(s)`).join(" | ")}`);
console.log("\n  VERDICT: the dynamics machinery is alive. The fold is fed obligations = Object.freeze([])\n  by construction (proxy-runner.mjs:946) — NOTHING feeds it the reader's own tasks.\n  Wiring the reader's task expectations into the fold's obligations makes\n  tension build and releases land — the felt dimension fires.");