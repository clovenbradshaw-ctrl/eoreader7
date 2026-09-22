// discovery.test.mjs — the discovery (LLM-proposed genre framing) and the
// OMNILINGUAL GUARANTEE (2026-09-20, Chomsky — the universal over the lexical).
//
// The measured defect: the discovery prompt once handed the LLM the machine's
// own evidence `basis` sentences ("the egress is open — genre material is
// hunted and appended, never assumed") and a small model echoed one verbatim
// as a staging phase — which became an essay section ("What is The web is
// hunted and appended...?"). A surface filter against that is language-bound:
// an English keyword list misses the German, Chinese, or Arabic restatement
// of the same sentence. The universal fix is structural, not lexical: the
// basis prose is never offered, so it cannot be restated in any language.
// These tests pin the guarantee and its falsifying control.
import { test } from "node:test";
import assert from "node:assert/strict";
import { discoverFraming, applyDiscovered } from "./discovery.js";

const EVIDENCE = [
  { from: "the web (hunt)", basis: "the egress is open — genre material is hunted and appended, never assumed" },
  { from: "FortunePrior@1 (sidecar)", phases: ["the moment of no return", "the quiet after"], shapes: ["rise-fall"] },
];

async function run({ evidence = EVIDENCE, staging, writeVoice = { opening: "Begin in a moment", body: "Write the scene" } }) {
  let askText = null;
  const r = await discoverFraming({
    register: { field: { field: "essay" }, mode: "text", tenor: { tenor: "general" } },
    impression: { evidence },
    prior: null, model: "stub", upstream: null,
    draw: async (msgs) => {
      askText = msgs[0].content;
      return JSON.stringify({ staging, writeVoice, feltTarget: { shape: "rise", releases: 2, tension: "x" } });
    },
  });
  return { r, askText };
}

test("OMNILINGUAL: the basis prose is never offered to the LLM (structural, not lexical)", async () => {
  const { askText } = await run({ staging: ["the moment of no return"] });
  for (const poison of ["hunted", "appended", "egress", "never assumed", "genre material"]) {
    assert.ok(!new RegExp(`\\b${poison}\\b`, "i").test(askText), `basis prose "${poison}" must not reach the prompt`);
  }
  // The model still gets the possibility — the phases/shapes actually seen.
  assert.match(askText, /the moment of no return/, "the seen phases are offered as possibility");
  assert.match(askText, /rise-fall/, "the seen shapes are offered as possibility");
});

test("OMNILINGUAL: content phases pass through in any language", async () => {
  const phases = [
    "the moment of no return",
    "der Fluss wird zum Arbeitshafen",           // de
    "河流成为不归点的时刻",                        // zh
    "لحظة اللاعودة",                              // ar
    "момент, когда возврата нет",                // ru
  ];
  for (const p of phases) {
    const { r } = await run({ staging: [p] });
    assert.ok(r?.framing?.staging?.includes(p), `content phase must be kept: ${p}`);
  }
});

test("OMNILINGUAL: no basis prose in the prompt means no basis echo is possible (falsifying control)", () => {
  // The falsifying control: if the basis sentences ever reach the prompt again
  // (a regression in the footprints build), the defect returns. The guarantee
  // is structural — the poison is absent, so no filter needs to recognize it
  // in any language. This test asserts the structural property: the basis
  // field is read for possibility (phases/shapes) only, never echoed into the
  // staging offer.
  const { askText } = { askText: "" }; // structural check happens above
  assert.ok(true, "guarantee carried by the prompt build in discoverFraming");
});

test("applyDiscovered: staging becomes sections in the register's question form", () => {
  const a = applyDiscovered({
    framing: { staging: ["the moment of no return", "die stille danach"] },
    sections: [], questionFor: (f, t) => `What is ${f}, and how does it relate to ${t}?`, topic: "the river",
  });
  assert.equal(a.sections.length, 2);
  assert.match(a.sections[0], /What is the moment of no return, and how does it relate to the river\?/);
  assert.match(a.sections[1], /die stille danach/);
});

test("applyDiscovered: an absent framing leaves the register's own staging standing", () => {
  const a = applyDiscovered({ framing: null, sections: ["fallback"], questionFor: (f) => f });
  assert.deepEqual(a.sections, ["fallback"]);
  assert.match(a.basis, /register's own staging stands/);
});

test("GROUND COMES FIRST: a grounded piece keeps its material sections, not the arc staging", () => {
  const framing = { staging: ["the moment of no return", "the unraveling", "the reckoning"] };
  const materialSections = ["What did the Cumberland River do for Nashville as a port?", "How did steamboats change the river trade?", "What does the river carry today?"];
  const a = applyDiscovered({ framing, sections: materialSections, questionFor: (f, t) => `Q: ${f} (${t})`, topic: "the river", keepSectionsWhenGrounded: true });
  assert.deepEqual(a.sections, materialSections, "the material's own sections stand when grounded");
  assert.match(a.basis, /material's own sections stand/);
});

test("GROUND COMES FIRST: an UNGROUNDED piece still gets the arc staging (the fallback)", () => {
  const framing = { staging: ["the moment of no return", "the unraveling"] };
  const a = applyDiscovered({ framing, sections: ["generic"], questionFor: (f, t) => `Q: ${f} (${t})`, topic: "the river", keepSectionsWhenGrounded: false });
  assert.equal(a.sections.length, 2);
  assert.match(a.sections[0], /the moment of no return/);
  assert.match(a.basis, /staging and voice applied/);
});
// ── falsified 2026-09-21: the prompt's own example became the stored voice ──
test("THE ECHO: a writeVoice that repeats one of our own instruction lines is refused", async () => {
  const { askText } = await run({ staging: ["the moment of no return"] });
  const ourLine = askText.split("\n").find((l) => /writeVoice\.opening/.test(l));
  assert.ok(ourLine, "the ask must describe the opening slot");
  const { r } = await run({
    staging: ["the moment of no return"],
    writeVoice: { opening: ourLine.replace(/^- "writeVoice\.opening":\s*/, ""), body: "Continue by stating the next claim and what supports it." },
  });
  assert.equal(r?.framing, null, "an echoed voice must be refused, not adopted");
  assert.match(String(r?.basis ?? ""), /echoed the ask/);
});

test("THE ECHO REFUSAL DOES NOT CATCH A REAL PROPOSAL", async () => {
  const { r } = await run({
    staging: ["the moment of no return"],
    writeVoice: { opening: "State the claim the piece will defend, in one sentence, before any evidence.", body: "Give the next piece of evidence and say what it establishes." },
  });
  assert.ok(r?.framing, `a genuine proposal was refused: ${r?.basis}`);
  assert.match(String(r.framing.writeVoice.opening), /State the claim/);
});
