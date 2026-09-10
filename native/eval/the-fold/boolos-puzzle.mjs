#!/usr/bin/env node
// boolos-puzzle.mjs — "The Hardest Logic Puzzle Ever" (Boolos, 1996),
// solved end to end by two new organs: embedded-query.js (the closed-form
// embedding lemma) and distinguishing-plan.js (SYN·Pattern — synthesize
// an adaptive query plan over a small hypothesis space). No LLM anywhere;
// this is pure, mechanical, exhaustively verified reasoning.
//
//   node boolos-puzzle.mjs

import { saysDa } from "../../organs/embedded-query.js";
import { planDistinguishingQueries, executePlan, EITHER } from "../../organs/distinguishing-plan.js";

const GODS = ["A", "B", "C"];
const IDENTITIES = ["true", "false", "random"];

// ── Step 1: the hypothesis space — every assignment of {true,false,random}
//    to {A,B,C}, one each (3! = 6 worlds). ──────────────────────────────
function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([arr[i], ...p]);
  }
  return out;
}
const HYPOTHESES = permutations(IDENTITIES).map((perm) => Object.freeze(Object.fromEntries(GODS.map((g, i) => [g, perm[i]]))));
const keyOf = (h) => `${h.A}/${h.B}/${h.C}`;
const byKey = new Map(HYPOTHESES.map((h) => [keyOf(h), h]));
console.log(`Hypothesis space: ${HYPOTHESES.length} worlds`);
console.log([...byKey.keys()].join("  "));

// ── Step 2: candidate queries — "ask GOD: if I asked you 'SUBJECT is
//    IDENTITY?', would you say da?" — for every (askedGod, subject,
//    identityCheck) triple. `saysDa` returns `null` when the
//    asked god is random in that hypothesis (the CONTENT determines
//    nothing); the planner's own EITHER sentinel is what that maps to —
//    a random god's answer is still an ordinary observed true/false on
//    the wire, just not determined by anything in the question. ─────────
const candidateQueries = [];
for (const askedGod of GODS) {
  for (const subject of GODS) {
    for (const checkIdentity of ["true", "random"]) { // "false" is redundant given the other two
      const id = `ask ${askedGod}: (embedded) is ${subject} ${checkIdentity}?`;
      candidateQueries.push({
        id,
        ask(hKey) {
          const h = byKey.get(hKey);
          const askedHonesty = h[askedGod];
          const propositionTruth = h[subject] === checkIdentity;
          const signal = saysDa(askedHonesty, propositionTruth);
          return signal === null ? EITHER : signal;
        },
      });
    }
  }
}
console.log(`\nCandidate queries: ${candidateQueries.length}`);

// ── Step 3: synthesize the plan — SYN·Pattern, distinguishing-plan.js ────
const BUDGET = 3;
const plan = planDistinguishingQueries([...byKey.keys()], candidateQueries, { budget: BUDGET });

console.log(`\n=== Plan synthesized within budget ${BUDGET}? ${plan.done ? "YES" : "NO"} ===`);
if (!plan.done) {
  console.error("FAILED: no plan found — undetermined:", plan.undetermined);
  process.exit(1);
}

function printPlan(node, indent = "  ") {
  if (!node.query) { console.log(`${indent}=> ${node.hypothesis}`); return; }
  console.log(`${indent}${node.query}`);
  for (const key of ["true", "false"]) {
    console.log(`${indent}  [${key}]`);
    printPlan(node.branches[key], indent + "    ");
  }
}
printPlan(plan);

// ── Step 4: PROVE the plan actually works — execute it against ALL 6 real
//    hypotheses. For Random-typed gods, run many trials since the coin is
//    real: a random god's answer is an ordinary true/false, genuinely
//    re-flipped per call — the plan must resolve correctly regardless of
//    which way it lands, every time. ─────────────────────────────────────
console.log("\n=== Executing the plan against every real hypothesis ===");
let allCorrect = true;
for (const hKey of byKey.keys()) {
  const TRIALS = 200;
  for (let t = 0; t < TRIALS; t++) {
    const answerFn = (queryId) => {
      const q = candidateQueries.find((c) => c.id === queryId);
      const raw = q.ask(hKey);
      return raw === EITHER ? Math.random() < 0.5 : raw; // a real coin flip, genuinely re-flipped per call, never memoized
    };
    const result = executePlan(plan, answerFn);
    if (result !== hKey) {
      console.error(`  FAIL: hypothesis ${hKey}, trial ${t}: plan concluded ${result} instead`);
      allCorrect = false;
      break;
    }
  }
  console.log(`  ${hKey}: ${TRIALS} trials, all correct`);
}

console.log(`\n=== RESULT: ${allCorrect ? "PASS — the synthesized plan correctly identifies every hypothesis, every time, regardless of Random's coin" : "FAIL"} ===`);
if (!allCorrect) process.exit(1);
