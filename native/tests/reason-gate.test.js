// native/tests/reason-gate.test.js — the II.9 boundary, pinned: a model may
// phrase a register, narrate a surfaced ground, and write notes the kernel
// derives from; it may NEVER reason to a conclusion. The gate classifies each
// turn into a lane BEFORE any model draw; this test pins the classification.
//
// Falsifying control: a turn the gate routes to `refuse` that any caller
// answers by asking the model to reason; a `grounded` answer that asserts a
// value no surfaced span carries; or a `reasoning` lane whose answer is the
// model's own conclusion rather than a kernel derivation — any concedes the
// gate.

import { test } from "node:test";
import assert from "node:assert/strict";
import { create, all } from "mathjs";
import { classifyTurn } from "../organs/reason-gate.js";
import { checkQuantity } from "../the-fold/arithmetic.js";
import { checkLogicPuzzle } from "../the-fold/logic-puzzle.js";

const math = create(all);

// The same mechanism shapes the doors wire (proxy.mjs MECHANISMS), so the
// test exercises the gate against the real organs, not stubs.
const mechanisms = [
  {
    name: "quantity",
    run(task) {
      const f = checkQuantity(task, { math, now: new Date() });
      if (!f) return null;
      if (f.gap) return { concluded: false, gap: `${f.expression} — ${f.gap}` };
      return { concluded: true, kind: "BOUND", text: f.display, mechanism: "quantity" };
    },
  },
  {
    name: "logic-puzzle",
    run(task) {
      const f = checkLogicPuzzle(task);
      if (!f) return null;
      return { concluded: true, kind: f.valid.length === 1 ? "BOUND" : "CONTESTED", text: f.display, mechanism: "logic-puzzle" };
    },
  },
];

test("register: a greeting is phrased, never reasoned about", async () => {
  for (const t of ["hello there!", "hi", "hey everyone", "thanks", "good morning", "what can you do?", "hello there, how are you doing today?", "hi, how are you?", "how are you doing?", "hey hows it going?", "how are things?"]) {
    const r = await classifyTurn({ task: t, mechanisms, history: [] });
    assert.equal(r.lane, "register", `${t} should be register`);
  }
});

test("register: a how-question the machine cannot compute is phrased, never reasoned (the thin-gate law)", async () => {
  for (const t of ["how does a car engine work?", "how do i fix a leaky faucet?", "how is the housing market doing?"]) {
    const r = await classifyTurn({ task: t, mechanisms, history: [] });
    assert.equal(r.lane, "register", `${t} — nothing computable, nothing in the record, nothing surfaced → the mouth phrases it (II.9), it never reasons`);
  }
});

test("register: a bare follow-up to the prior exchange is register", async () => {
  const r = await classifyTurn({ task: "and you?", mechanisms, history: [{ role: "user", content: "my name is Sam" }] });
  assert.equal(r.lane, "register");
});

test("mechanical: an arithmetic question is settled by the organ, zero model", async () => {
  const r = await classifyTurn({ task: "what is 17 times 24?", mechanisms, history: [] });
  assert.equal(r.lane, "mechanical");
  assert.equal(r.observation.mechanism, "quantity");
  assert.match(r.observation.text, /408/);
});

test("mechanical: conversational fillers are stripped mechanically, never reasoned about", async () => {
  for (const t of ["so what is 12 times 8?", "ok so 7 times 7 minus 3?", "then what is 96 divided by 3?"]) {
    const r = await classifyTurn({ task: t, mechanisms, history: [] });
    assert.equal(r.lane, "mechanical", `${t} should settle mechanically`);
  }
});

test("mechanical: a follow-up quoting an earlier answer reduces to the trailing question", async () => {
  const r = await classifyTurn({ task: "so earlier we said 12 times 8 is 96 right? what is 96 divided by 3?", mechanisms, history: [{ role: "user", content: "what is 12 times 8?" }] });
  assert.equal(r.lane, "mechanical");
  assert.equal(r.normalized, "what is 96 divided by 3?");
});

test("context: the holograph's activation, not a word list, routes to context", async () => {
  const activation = async () => ({ available: true, active: ["sam"], basis: "activation", door: "context", activation: { active: ["sam"], basis: "activation" } });
  const r = await classifyTurn({ task: "do you remember my name?", mechanisms, history: [{ role: "user", content: "my name is Sam" }], activation });
  assert.equal(r.lane, "context");
});

test("refuse: a turn surfaced nothing and the kernel cannot derive is a typed gap, never a model reasoning turn", async () => {
  // the thin gate refuses only when the machinery has genuinely nothing: no
  // organ settles, no activation, no surfaced span, no derivation.
  const activation = async () => ({ available: true, active: [], basis: "surface", door: "world" });
  const r = await classifyTurn({ task: "prove P != NP", mechanisms, history: [], activation, derive: async () => ({ settled: false }) });
  assert.equal(r.lane, "register"); // nothing computable → the mouth phrases it (II.9), never reasons
});

test("swarm: hard meaning routes to the swarm when one is injected", async () => {
  const swarm = async () => ({ routed: true, answer: "swarm: garble", meaning: { hard: true, type: "garble" } });
  const r = await classifyTurn({ task: "fnir fflurbb 17 qx", mechanisms: [], swarm, history: [] });
  assert.equal(r.lane, "swarm");
});

test("grounded: surfaced spans allow narration", async () => {
  const r = await classifyTurn({ task: "what does titanic.txt say about Titanic?", mechanisms, history: [], surfaced: [{ at: "titanic.txt#100-200", text: "The RMS Titanic sank on April 15, 1912." }] });
  assert.equal(r.lane, "grounded");
});

test("reasoning: a derivation that settles routes to reasoning", async () => {
  const derive = async () => ({ settled: true, reason: "derived: total = 412", answer: "412" });
  const r = await classifyTurn({ task: "what is the total upvotes?", mechanisms, history: [], derive });
  assert.equal(r.lane, "reasoning");
  assert.equal(r.derivation.answer, "412");
});

test("empty task refuses, never reasons", async () => {
  const r = await classifyTurn({ task: "", mechanisms, history: [] });
  assert.equal(r.lane, "refuse");
});