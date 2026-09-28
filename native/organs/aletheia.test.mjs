// aletheia.test.mjs — Aletheia, the archon of satisfaction: did the answer
// satisfy the question? The vacuity gate is the live failure this pins —
// "Rostopchin had any role in the fire" is an echo that must FAIL at FILLED.

import { test } from "node:test";
import assert from "node:assert/strict";
import { makeAletheia, LAYERS } from "./aletheia.js";

const contentWords = (s) => String(s ?? "").toLowerCase().replace(/'s\b/g, "").split(/[^a-z0-9'’]+/).filter((w) => w.length > 2 && !new Set(["the","and","for","with","that","this","from","was","were","are","is","had","have","has","by","to","of","in","on","at","a","an","its","it","what","who","when","how","why","does","did","say","says","said"]).has(w));
const decline = (s) => /doesn'?t (say|state|mention|provide|give)|does not (say|state|mention|provide|give)|no (mention|date|number|way)|nothing|not stated|not in the/i.test(String(s ?? ""));
const same = (a, b) => ({ verdict: a === b ? "same" : "other" });

const A = makeAletheia({ contentWords, decline, same });

test("a vacuous echo of the question FAILS at FILLED (the live t7 failure)", () => {
  const r = A.judge({ question: "What was Rostopchin's role in the fire?", answer: "Rostopchin had any role in the fire.", material: [] });
  assert.equal(r.satisfied, false);
  assert.equal(r.at, LAYERS.FILLED);
});

test("a real grounded answer SATISFIES", () => {
  const r = A.judge({ question: "Who burned Moscow?", answer: "Moscow was burned by its own inhabitants.", material: ["Moscow was burned by its inhabitants", "the city was abandoned"] });
  assert.equal(r.satisfied, true);
  assert.equal(r.via, LAYERS.FILLED);
});

test("an honest decline on a silent question SATISFIES via HONEST", () => {
  const r = A.judge({ question: "How many people died in the fire?", answer: "The text doesn't state how many people died.", material: [] });
  assert.equal(r.satisfied, true);
  assert.equal(r.via, LAYERS.HONEST);
});

test("an answer naming none of the question's words FAILS at ADDRESSED", () => {
  const r = A.judge({ question: "What was Rostopchin's role in the fire?", answer: "The weather was pleasant that day.", material: [] });
  assert.equal(r.satisfied, false);
  assert.equal(r.at, LAYERS.ADDRESSED);
});

test("GROUNDED by WORD-SHARING alone cannot catch a new claim-actor (the Prussian-army fabrication shares 'burned'/'Moscow') — the claim-level check is the fix (Parmenides at the claim, not the word)", () => {
  const r = A.judge({ question: "Who burned Moscow?", answer: "The Prussian army burned Moscow.", material: ["Moscow was burned by its inhabitants"] });
  // word-sharing says "bound" (burned, moscow) — so a fabrication that reuses
  // the material's words passes. This pins the HONEST LIMIT: the verdict is
  // only sound at the CLAIM level (does "Prussian army —burned→ Moscow" match
  // a material claim?), which needs the relation/claim binding, not word sets.
  assert.equal(r.satisfied, true, "word-sharing cannot see the new actor — the claim-level check is the designed fix");
});

test("satisfaction is refused when there is nothing to judge", () => {
  const r = A.judge({ question: "", answer: "" });
  assert.equal(r.satisfied, false);
});