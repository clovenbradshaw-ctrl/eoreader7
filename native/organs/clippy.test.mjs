// clippy.test.mjs — Clippy, the archon of the clip: is this figure IN the
// present? Four gates: born (established referents), DMD (a born act),
// activation (the present's reach), discourse (the question's own beings).

import { test } from "node:test";
import assert from "node:assert/strict";
import { makeClippy, VERDICTS } from "./clippy.js";

const bornOf = (t) => {
  const m = { "bastille": "b:bastille", "king": "b:king", "louis xvi": "b:king", "the king": "b:king", "french revolution": "b:rev" };
  const s = String(t ?? "").toLowerCase();
  const out = new Set();
  for (const [k, v] of Object.entries(m)) if (s.includes(k)) out.add(v);
  return out;
};
const presentOf = (t) => { const m = { "bastille": "b:bastille", "king": "b:king" }; const s = String(t ?? "").toLowerCase(); const out = new Set(); for (const [k, v] of Object.entries(m)) if (s.includes(k)) out.add(v); return out; };
const actCounts = { burned: 3, storm: 4, executed: 2 };
const sameAct = (a, b) => ({ "stormed": "storm", "storming": "storm" })[a] === b || ({ "stormed": "storm", "storming": "storm" })[b] === a;

const clippy = makeClippy({ bornOf, actCounts, presentOf, sameAct });

test("a BORN, ACTIVE figure engaging the question's being is BOUND (in the clip)", () => {
  const r = clippy.bind("The Bastille was stormed on July 14, 1789.", "When was the Bastille stormed?");
  assert.equal(r.verdict, VERDICTS.BOUND);
  assert.ok(r.active, "the Bastille is in the present's activation");
});

test("DISCOURSE gate: a claim engaging none of the question's beings is REFUSED", () => {
  const r = clippy.bind("The revolution was proclaimed in 1789.", "Who stormed the Bastille?");
  assert.equal(r.verdict, VERDICTS.REFUSED);
  assert.equal(r.gate, "discourse");
});

test("Clippy answers CONTEXT, not truth — the Prussian-army claim is in the present (bound); the figure-binding refuses its false figure", () => {
  const r = clippy.bind("The Prussian army burned the Bastille.", "Who stormed the Bastille?");
  assert.equal(r.verdict, VERDICTS.BOUND, "born + active + discourse-engaged = in the clip");
  assert.ok(r.active);
});

test("DMD gate: an act the reading never established is UNBOUND (underpowered)", () => {
  const r = clippy.bind("The Bastille was painted red.", "When was the Bastille stormed?");
  assert.equal(r.verdict, VERDICTS.UNBOUND);
  assert.equal(r.gate, "dmd");
});

test("BORN gate: a claim with a born act but no established referent is UNBOUND (reachable on a fresh ask, no question-born gate)", () => {
  const r = clippy.bind("It was stormed in July.", "When was it stormed?");
  assert.equal(r.verdict, VERDICTS.UNBOUND);
  assert.equal(r.gate, "born");
});
