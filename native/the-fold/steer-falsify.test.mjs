// steer-falsify.test.mjs — the mouth votes; the mechanics license.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { arrangeEssay } from "./arrange.js";
import { steerOutline, askQuestions, echoedQuestion, yesNo } from "./steer.js";

const TASK = "Write an essay on what the audit found about the housing office and how the council responded.";
const GROUND = [
  "The housing office must answer to the public.",
  "",
  "The audit found that the housing office kept no minutes in 2021. The audit found the office lost track of 40 vouchers.",
  "",
  "In 2024 the council voted to fund a follow-up review. The council chair moved to hold hearings.",
  "",
  "The audit also found that the office's software lacked access controls in 2021.",
  "",
  "The council adopted the hearing schedule in 2025.",
].join("\n");
const setup = () => { const d = attachReferents(buildDraft({ task: TASK, ground: GROUND }), buildReferents(GROUND)); return { d, o: arrangeEssay({ draft: d }) }; };

test("the ask's coordinated questions are read from its topic phrase", () => {
  assert.deepEqual(askQuestions(TASK), ["what the audit found about the housing office", "how the council responded"]);
  assert.equal(askQuestions("Write an essay on the role of the river in the city's growth.").length, 1);
});

test("a reply is mapped mechanically: the question it echoes, or none", () => {
  const qs = askQuestions(TASK);
  assert.equal(echoedQuestion("How the council responded.", qs), 1);
  assert.equal(echoedQuestion("2. what the audit found", qs), 0);
  assert.equal(echoedQuestion("Both, really.", qs), -1);
  assert.equal(yesNo("Yes. They share the audit."), true);
  assert.equal(yesNo("No — different years."), false);
  assert.equal(yesNo("Perhaps."), null);
});

test("the mouth regroups sections by question; the material's order holds within each", async () => {
  const { d, o } = setup();
  const draw = async (m) => { const u = m.at(-1).content; if (/Does this text help answer/.test(u)) { const council = /council|voted|moved|adopted/.test(u.split("sources of an essay:")[1].split("Does this text")[0]); return /help answer: how the council/.test(u) === council ? "Yes." : "No."; } return "No."; };
  const { outline, votes } = await steerOutline({ outline: o, draft: d, task: TASK, draw });
  const bodies = outline.slots.filter((s) => s.answers);
  const qOrder = bodies.map((s) => s.answers);
  assert.deepEqual([...new Set(qOrder)], askQuestions(TASK), "all audit sections come before all council sections");
  assert.ok(votes.every((v) => v.force !== "question" || v.kept));
});

test("a merge the mouth wants is refused when the sections share nothing or would invert time", async () => {
  const { d, o } = setup();
  const draw = async (m) => (/Does this text help answer/.test(m.at(-1).content) ? (/what the audit found/.test(m.at(-1).content) ? "Yes." : "No.") : "Yes, same topic.");
  const { votes } = await steerOutline({ outline: o, draft: d, task: TASK, draw });
  const coh = votes.filter((v) => v.force === "cohesion");
  assert.ok(coh.length);
  for (const v of coh) if (!v.kept) assert.match(v.why, /share no claim word|ends before|separate|no yes or no/);
});

test("without a mouth the outline stands and says so", async () => {
  const { d, o } = setup();
  const r = await steerOutline({ outline: o, draft: d, task: TASK });
  assert.equal(r.outline, o);
  assert.ok(r.weakened[0].includes("no mouth"));
});

test("falsifier's cases: a hedge is no answer, 'not really' is no, and yes to every question places nothing", async () => {
  assert.equal(yesNo("Yes and no."), null);
  assert.equal(yesNo("Not really."), false);
  const { d, o } = setup();
  let n = 0;
  const both = async (m) => (/Does this text help answer/.test(m.at(-1).content) ? "Yes." : "No.");
  const { votes } = await steerOutline({ outline: o, draft: d, task: TASK, draw: both });
  assert.ok(votes.filter((v) => v.force === "question").every((v) => !v.kept), "yes to every question places nothing");
});

test("no to every question drops a section only when the mechanics agree it is not about the ask", async () => {
  const { d, o } = setup();
  const no = async (m) => "No.";
  const { votes, outline } = await steerOutline({ outline: o, draft: d, task: TASK, draw: no });
  const sel = votes.filter((v) => v.force === "selection");
  assert.ok(sel.length);
  assert.ok(sel.every((v) => !v.kept), "every section here names the ask's office or council: none is dropped on the mouth's word alone");
  assert.equal(outline.slots.length, o.slots.length);
});
