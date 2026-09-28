import test from "node:test";
import assert from "node:assert/strict";
import { readJudgment, commitments, anchoredDecider, pointedDecider } from "../organs/judgment-reader.js";
import { ingestionStanding, judgmentRequest, landJudgment } from "../kernel/ingestion.js";
import { createForWhom } from "../kernel/for-whom.js";

const SECTION = "Pierre, on unexpectedly becoming Count Bezúkhov, received the whole estate. The old count had died the week before, and the will named Pierre alone.";
const fw = createForWhom({ id: "reader:succession", giver: "the succession question", question: "who held the title Count Bezúkhov, and when" });
const standing = ingestionStanding({ holon: "/p3/s6425", reached: [{ holon: "/p3", recipe: "occupancy" }], gaps: [{ holon: "/p3/s6425", reason: "occupant_not_a_referent" }], slots: [] });
const request = judgmentRequest({ standing, forWhom: fw, sectionOf: () => SECTION, claim: { id: "c1" } });
const judge = { recipe: "gemma2:2b@judge-v1" };

test("prose that commits to one candidate and quotes the section lands CHOSEN, deciding on the quoted bytes", () => {
  const prose = 'Reading the section for the succession question: the text says "the will named Pierre alone", so the claim that Pierre held the title holds. It is not refused.';
  const r = readJudgment(prose, request);
  assert.equal(r.verdict, "holds"); assert.equal(r.anchored, true); assert.equal(r.decider, "the will named Pierre alone");
  const { collapse } = landJudgment(request, { answer: prose, read: readJudgment, judge });
  assert.equal(collapse.verdict, "chosen"); assert.equal(collapse.chosen.value, "holds"); assert.match(collapse.reason, /deciding on «the will named Pierre alone»/);
});

test("a negated candidate is not a commitment; a candidate inside a quotation is not a commitment", () => {
  assert.deepEqual([...commitments("This is not refused; it holds.", ["holds", "refused", "undetermined"]).keys()], ["holds"]);
  assert.deepEqual([...commitments('The options were "holds / refused / undetermined". The claim holds.', ["holds", "refused", "undetermined"]).keys()], ["holds"]);
  assert.equal(commitments("Neither holds nor refused applies here.", ["holds", "refused", "undetermined"]).size, 0);
});

test("a commitment that points at nothing in the section is CONTESTED against undetermined — the judge asserted, the bytes did not back it", () => {
  const prose = "The claim is refused: the section clearly says the estate went to Anatole after a duel in Moscow.";
  const r = readJudgment(prose, request);
  assert.equal(r.verdict, "refused"); assert.equal(r.anchored, false); assert.equal(r.decider, null);
  const { collapse } = landJudgment(request, { answer: prose, read: readJudgment, judge });
  assert.equal(collapse.verdict, "contested"); assert.deepEqual(collapse.contested.map((c) => c.value).sort(), ["refused", "undetermined"]);
});

test("several candidates named: the last sentence decides if it commits to exactly one; otherwise no verdict; undetermined needs no decider", () => {
  const deliberating = "One could say it holds; one could say it is refused. On balance, and because the will named Pierre alone, it holds.";
  assert.equal(readJudgment(deliberating, request).verdict, "holds");
  const torn = "It holds. It is refused. I cannot say which.";
  const t = readJudgment(torn, request); assert.equal(t.verdict, null); assert.match(t.because, /no conclusion/);
  assert.equal(landJudgment(request, { answer: torn, read: readJudgment, judge }).collapse.verdict, "none");
  const und = readJudgment("The section does not settle it; undetermined.", request);
  assert.equal(und.verdict, "undetermined"); assert.equal(und.anchored, true);
  assert.equal(landJudgment(request, { answer: "Undetermined — nothing here decides it.", read: readJudgment, judge }).collapse.chosen.value, "undetermined");
});

test("a decider is found without quotes when a whole prose sentence is in the section; a point (no prose) still lands as itself", () => {
  assert.equal(anchoredDecider("The old count had died the week before. So it holds.", SECTION), "The old count had died the week before.");
  assert.equal(anchoredDecider("Because Anatole took the estate after a duel. So it holds.", SECTION), null, "a sentence the section does not contain anchors nothing");
  assert.equal(landJudgment(request, { verdict: "holds", judge }).collapse.chosen.value, "holds");
  assert.throws(() => landJudgment(request, { answer: "it holds", judge }), /injected reader/);
});

test("a pointed decider: a number in the prose names a numbered sentence; anchored only when that sentence carries the claim's own words", () => {
  const sentences = ["Pierre, on unexpectedly becoming Count Bezúkhov, received the whole estate.", "The old count had died the week before, and the will named Pierre alone.", "Anatole left for Moscow the same night."];
  const claim = "Pierre received the whole estate";
  assert.deepEqual(pointedDecider("[1] holds", sentences, claim).index, 1);
  assert.equal(pointedDecider("[1] holds", sentences, claim).anchored, true);
  assert.equal(pointedDecider("Sentence 3 decides it: holds", sentences, claim).anchored, false, "a lazy point at a sentence without the claim's words is not anchored");
  assert.equal(pointedDecider("holds", sentences, claim), null);
  assert.equal(pointedDecider("[9] holds", sentences, claim), null, "a number past the count points at nothing");
  const r = readJudgment("[1] holds", request, { sentences, claim });
  assert.equal(r.verdict, "holds"); assert.equal(r.anchored, true); assert.equal(r.decider, sentences[0]); assert.deepEqual(r.pointed, { index: 1, anchored: true });
  const lazy = readJudgment("[3] holds", request, { sentences, claim });
  assert.equal(lazy.anchored, false); assert.match(lazy.because, /does not carry the claim's first content word/);
  assert.equal(landJudgment(request, { answer: "[3] holds", read: (p, q) => readJudgment(p, q, { sentences, claim }), judge }).collapse.verdict, "contested");
  assert.equal(landJudgment(request, { answer: "[1] holds", read: (p, q) => readJudgment(p, q, { sentences, claim }), judge }).collapse.verdict, "chosen");
  assert.equal(readJudgment("holds", request).pointed, null, "without numbered sentences nothing changes");
});
