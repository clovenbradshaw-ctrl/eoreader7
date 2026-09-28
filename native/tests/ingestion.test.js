import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ingestionStanding, unreadCited, judgmentRequest, landJudgment, parentOf, JUDGMENT_CANDIDATES } from "../kernel/ingestion.js";
import { createForWhom } from "../kernel/for-whom.js";
import { standingOf } from "../kernel/undecided.js";

const reached = [{ holon: "/p1", recipe: "occupancy@v12" }, { holon: "/p2/s7", recipe: "occupancy@v12" }];
const gaps = [{ holon: "/p1/s3", reason: "inverted_subject", recipe: "occupancy@v12" }, { holon: "/p2/s7", reason: "pronoun_unbound" }];
const slots = [{ holon: "/p1/s4", verdict: "contested", id: "undecided:abc" }, { holon: "/p1/s5", verdict: "chosen" }];

test("standing is read off the record: unread where no reader reached, partial where a reader left gaps or open slots, read otherwise", () => {
  assert.equal(ingestionStanding({ holon: "/p3", reached, gaps, slots }).standing, "unread");
  const p1 = ingestionStanding({ holon: "/p1", reached, gaps, slots });
  assert.equal(p1.standing, "partial"); assert.deepEqual(p1.gaps.map((g) => g.reason), ["inverted_subject"]); assert.deepEqual(p1.openSlots.map((s) => s.verdict), ["contested"]);
  assert.equal(ingestionStanding({ holon: "/p1/s5", reached, gaps, slots }).standing, "read", "a chosen slot is not open; a reader that reached /p1 reached /p1/s5");
  assert.equal(ingestionStanding({ holon: "/p2/s7", reached, gaps, slots }).standing, "partial");
  assert.equal(ingestionStanding({ holon: "/p2", reached, gaps, slots }).standing, "unread", "reaching /p2/s7 is not reaching /p2");
});

test("a claim resting on a holon not fully read is named; one resting on a read holon is not", () => {
  const claims = [{ id: "c1", ground: "/p1/s3" }, { id: "c2", ground: "/p1/s5" }, { id: "c3", ground: "/p9" }];
  assert.deepEqual(unreadCited({ claims, reached, gaps, slots }).map((x) => [x.claim.id, x.standing.standing]), [["c1", "partial"], ["c3", "unread"]]);
});

test("the request carries the ENCLOSING section's full text, the for-whom's frame, and the mechanical findings; a read holon asks nothing; nothing is asked from nowhere", () => {
  const fw = createForWhom({ id: "reader:court", giver: "the court", question: "who held the title in 1805" });
  const texts = { "/p1": "PARAGRAPH ONE, WHOLE.", "/p1/s3": "sentence three" };
  const st = ingestionStanding({ holon: "/p1/s3", reached, gaps, slots });
  const req = judgmentRequest({ standing: st, forWhom: fw, sectionOf: (h) => texts[h] ?? null, claim: { id: "c1" } });
  assert.equal(req.section, "/p1"); assert.equal(req.text, "PARAGRAPH ONE, WHOLE."); assert.equal(parentOf("/p1/s3"), "/p1");
  assert.deepEqual(req.forWhom, { id: "reader:court", giver: "the court", question: "who held the title in 1805", priors: [] });
  assert.deepEqual(req.findings.left, ["inverted_subject@/p1/s3"]); assert.match(req.ask, /who held the title in 1805/); assert.match(req.ask, /inverted_subject/);
  assert.equal(judgmentRequest({ standing: ingestionStanding({ holon: "/p1/s5", reached, gaps, slots }), forWhom: fw, sectionOf: () => "x" }), null);
  assert.throws(() => judgmentRequest({ standing: st, forWhom: { id: "x" }, sectionOf: () => "x" }), /question/);
});

test("the judge's answer is a point over declared candidates, landed as a collapse FOR that for-whom under a rule named for the judge; a second for-whom keeps its own; the standing itself never moves", () => {
  const fwA = createForWhom({ id: "reader:court", question: "who held the title" }), fwB = createForWhom({ id: "reader:novelist", question: "who is Pierre" });
  const st = ingestionStanding({ holon: "/p1/s3", reached, gaps, slots });
  const reqA = judgmentRequest({ standing: st, forWhom: fwA, sectionOf: () => "text" }), reqB = judgmentRequest({ standing: st, forWhom: fwB, sectionOf: () => "text" });
  const a = landJudgment(reqA, { verdict: "holds", judge: { recipe: "gemma2:2b@select-v1" }, cursor: 12 });
  const b = landJudgment(reqB, { verdict: "undetermined", judge: { recipe: "gemma2:2b@select-v1" }, cursor: 12 });
  assert.equal(a.collapse.verdict, "chosen"); assert.equal(a.collapse.chosen.value, "holds"); assert.equal(a.collapse.rule.giver, "gemma2:2b@select-v1"); assert.equal(a.collapse.forWhom, "reader:court");
  assert.equal(standingOf(b.record, [b.collapse], fwB).collapse.chosen.value, "undetermined");
  assert.equal(standingOf(a.record, [a.collapse, b.collapse], fwA).collapse.chosen.value, "holds", "each for-whom reads its own collapse");
  const off = landJudgment(reqA, { verdict: "maybe", judge: { recipe: "x" } });
  assert.equal(off.collapse.verdict, "none", "an answer outside the candidates lands no verdict");
  assert.deepEqual(JUDGMENT_CANDIDATES, ["holds", "refused", "undetermined"]);
  assert.equal(ingestionStanding({ holon: "/p1/s3", reached, gaps, slots }).standing, "partial", "the standing is read off the record; a judgment is a collapse, not an ingestion");
  assert.throws(() => landJudgment(reqA, { verdict: "holds", judge: {} }), /recipe/);
});

test("the kernel names no medium", () => {
  const src = readFileSync(new URL("../kernel/ingestion.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const w of ["sentence", "pronoun", "token", "word", "paragraph"]) assert.ok(!new RegExp(`\\b${w}\\b`, "i").test(src), `names ${w}`);
});
