#!/usr/bin/env node
// puzzle-template-end-to-end.mjs — RAW TEXT in, solved plan out, no
// hand-transcription in between. Proves the honest answer to "can the
// system read the riddle": not by understanding arbitrary English, but by
// matching a registered template's mechanical signature and handing its
// EXTRACTED, DECLARED parameters to the same verified solving pipeline
// boolos-puzzle.mjs already proved correct — generalized here to whatever
// agent names/role words/budget the text actually used, never hardcoded.
//
//   node puzzle-template-end-to-end.mjs

import { matchTemplate } from "../../organs/puzzle-templates.js";
import { saysDa } from "../../organs/embedded-query.js";
import { planDistinguishingQueries, executePlan, EITHER } from "../../organs/distinguishing-plan.js";

function solveFromText(text, label) {
  console.log(`\n=== ${label} ===`);
  const matched = matchTemplate(text);
  if (matched.refused) {
    console.log(`  REFUSED: ${matched.refused}`);
    return null;
  }
  const { template, params } = matched;
  console.log(`  Matched template: ${template.id}`);
  console.log(`  Extracted: agents=${JSON.stringify(params.agents)}, roleWords=${JSON.stringify(params.roleWordFor)}, yesOrNoWords=${JSON.stringify(params.yesOrNoWords)}, budget=${params.budget}`);

  const { agents, hypotheses, byKey, budget } = template.formalize(params);

  const candidateQueries = [];
  for (const askedGod of agents) {
    for (const subject of agents) {
      for (const checkIdentity of ["true", "random"]) {
        const id = `ask ${askedGod}: (embedded) is ${subject} ${checkIdentity}?`;
        candidateQueries.push({
          id,
          ask(hKey) {
            const h = byKey.get(hKey);
            const signal = saysDa(h[askedGod], h[subject] === checkIdentity);
            return signal === null ? EITHER : signal;
          },
        });
      }
    }
  }

  const plan = planDistinguishingQueries(hypotheses, candidateQueries, { budget });
  if (!plan.done) {
    console.log(`  FAILED to synthesize a plan within budget ${budget}: undetermined=${JSON.stringify(plan.undetermined)}`);
    return null;
  }
  console.log(`  Plan synthesized within budget ${budget}.`);

  let allCorrect = true;
  for (const hKey of hypotheses) {
    for (let t = 0; t < 50; t++) {
      const answerFn = (queryId) => {
        const q = candidateQueries.find((c) => c.id === queryId);
        const raw = q.ask(hKey);
        return raw === EITHER ? Math.random() < 0.5 : raw;
      };
      const result = executePlan(plan, answerFn);
      if (result !== hKey) { allCorrect = false; console.log(`  FAIL: ${hKey} trial ${t} -> ${result}`); break; }
    }
  }
  console.log(`  Verified against all ${hypotheses.length} hypotheses, 50 trials each: ${allCorrect ? "PASS" : "FAIL"}`);
  return allCorrect;
}

const ORIGINAL = `Three gods A, B, and C are called, in no particular order, True, False, and Random. True always speaks truly, False always speaks falsely, but whether Random speaks truly or falsely is a completely random matter. Your task is to determine the identities of A, B, and C by asking three yes–no questions; each question must be put to exactly one god. The gods understand English, but will answer all questions in their own language, in which the words for yes and no are da and ja,[3] in some order. You do not know which word means which.`;

const PARAPHRASE = `Three sages X, Y, and Z are named, in no particular order, Honest, Liar, and Unpredictable. Honest always answers truthfully, Liar always answers falsely, and whether Unpredictable answers truthfully or falsely is a completely random matter. Your task is to work out the identities of X, Y, and Z by asking three yes-no questions; each question must go to exactly one sage. The sages understand English, but reply in their own tongue, in which the words for yes and no are flim and flam, in some order. You do not know which word means which.`;

const UNDER_BUDGET = PARAPHRASE.replace("three yes-no questions", "two yes-no questions");

const NON_PUZZLE = `The quick brown fox jumps over the lazy dog.`;

const r1 = solveFromText(ORIGINAL, "Original wording (verbatim, en-dash + footnote)");
const r2 = solveFromText(PARAPHRASE, "Renamed paraphrase (different agents/roles/words, budget 3)");
const r4 = solveFromText(UNDER_BUDGET, "Same paraphrase, budget dropped to 2 (provably insufficient — must refuse, not fake it)");
const r3 = solveFromText(NON_PUZZLE, "Non-puzzle control");

console.log(`\n=== SUMMARY ===`);
console.log(`  Original:              ${r1 === true ? "SOLVED, verified" : "did not solve"}`);
console.log(`  Paraphrase (budget 3): ${r2 === true ? "SOLVED, verified" : "did not solve"}`);
console.log(`  Paraphrase (budget 2): ${r4 === null ? "correctly REFUSED (provably impossible)" : "unexpected — should have refused"}`);
console.log(`  Non-puzzle:            ${r3 === null ? "correctly refused" : "unexpected"}`);
if (r1 !== true || r2 !== true || r4 !== null || r3 !== null) process.exit(1);
