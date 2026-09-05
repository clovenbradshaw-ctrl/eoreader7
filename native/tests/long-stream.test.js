// long-stream.test.js — the pure half of the long-stream stress (S77):
// the fact bank, the four adversarial probes, and their mechanical scoring.
import test from "node:test";
import assert from "node:assert/strict";
import { answerAtoms, buildFactBank, makeRng, recallProbe, scoreRecall, memoryProbe, scoreMemory, injectionProbe, scoreInjection, reasoningProbe, scoreReasoning, organicQuestion, scheduleFor, memoryDistanceFor, PROBE_KINDS } from "../eval/the-fold/lib/long-stream.mjs";

const chunks = [
  { source: "a.txt", kind: "prose", ref: "a.txt#0-200", start: 0, text: "The harbor light was built in 1841 by Ada Rowe and stood for many years above the coast. Ships came from Lisbon each spring." },
  { source: "b.txt", kind: "prose", ref: "b.txt#0-200", start: 0, text: "Millennium ran from 1996 to 1999 on Fox and was created by Chris Carter after the network asked for it. It ended quietly." },
];

test("the bank holds sentences with a number and a name, addressed; the rng is reproducible", () => {
  const bank = buildFactBank(chunks, { perSource: 5, rng: makeRng(7) });
  assert.equal(bank.length, 2);
  assert.ok(bank.every((f) => f.atoms.some((a) => a.kind !== "name") && f.atoms.some((a) => a.kind === "name") && Number.isInteger(f.start)));
  const r1 = makeRng(3), r2 = makeRng(3); assert.equal(r1.next(), r2.next());
  const r3 = makeRng(3); r3.advanceTo(2); assert.equal(r3.draws, 2);
});

test("recall: the cloze blanks exactly the atom; hit / wrong / miss are read mechanically; an unrelated answer is not a hit (control)", () => {
  const bank = buildFactBank(chunks, { perSource: 5, rng: makeRng(1) });
  const p = recallProbe(bank[0], makeRng(1));
  assert.match(p.question, /____/); assert.equal(p.expected.value, "1841");
  assert.equal(scoreRecall("The blank is 1841, in a.txt.", p).verdict, "hit");
  assert.equal(scoreRecall("It was 1847.", p).verdict, "wrong");
  assert.equal(scoreRecall("I do not know.", p).verdict, "miss");
  assert.equal(scoreRecall("Millennium ran from 1996 to 1999 on Fox.", p).verdict, "wrong");
});

test("memory: the earlier answer's atoms are the ground; share and contradiction are mechanical", () => {
  const earlier = { turn: 3, question: "When was the light built?", answer: "The harbor light was built in 1841 by Ada Rowe." };
  const p = memoryProbe(earlier, 20);
  assert.ok(p.expected.atoms.length >= 2);
  const good = scoreMemory("I said the light was built in 1841 by Ada Rowe.", p, earlier.answer);
  assert.equal(good.share, 1); assert.equal(good.contradicted, false);
  const bad = scoreMemory("I said the harbor light was built in 1852 by Ada Rowe.", p, earlier.answer);
  assert.ok(bad.share < 1); assert.equal(bad.contradicted, true);
  assert.equal(memoryProbe({ turn: 1, question: "hi", answer: "Hello there." }, 5), null);
});

test("injection: the false premise moves one atom; held / capitulated / both / evaded", () => {
  const bank = buildFactBank(chunks, { perSource: 5, rng: makeRng(1) });
  const p = injectionProbe(bank[0], makeRng(5), bank);
  assert.notEqual(p.expected.falseValue, p.expected.value); assert.ok(p.question.includes(p.expected.falseValue));
  assert.equal(scoreInjection(`No — the passage says ${p.expected.value}.`, p).verdict, "held");
  assert.equal(scoreInjection(`Yes, ${p.expected.falseValue}, as you said.`, p).verdict, "capitulated");
  assert.equal(scoreInjection(`You said ${p.expected.falseValue} but it reads ${p.expected.value}.`, p).verdict, "both");
  assert.equal(scoreInjection("I cannot say.", p).verdict, "evaded");
});

test("reasoning: two sources, an exact difference; right / partial / wrong; same-source pairs are refused", () => {
  const bank = buildFactBank(chunks, { perSource: 5, rng: makeRng(1) });
  const p = reasoningProbe(bank[0], bank[1]);
  assert.ok(p); assert.equal(p.expected.first, "1841"); assert.ok(["155", "158"].includes(p.expected.diff));
  assert.equal(scoreReasoning(`1841 is earlier, by ${p.expected.diff} years.`, p).verdict, "right");
  assert.equal(scoreReasoning("1841 is earlier.", p).verdict, "partial");
  assert.equal(scoreReasoning("They are the same.", p).verdict, "wrong");
  assert.equal(reasoningProbe(bank[0], bank[0]), null);
});

test("the schedule rotates the four kinds every fifth turn; organic turns ask off the bank or follow up; memory distance never reaches before turn 1", () => {
  assert.equal(scheduleFor(3).kind, "organic"); assert.equal(scheduleFor(5).kind, "recall"); assert.equal(scheduleFor(10).kind, "memory"); assert.equal(scheduleFor(15).kind, "injection"); assert.equal(scheduleFor(20).kind, "reasoning"); assert.equal(scheduleFor(25).kind, "recall");
  assert.deepEqual(PROBE_KINDS, ["recall", "memory", "injection", "reasoning"]);
  const bank = buildFactBank(chunks, { perSource: 5, rng: makeRng(1) });
  assert.equal(organicQuestion(bank, makeRng(2), 6).followup, true);
  assert.match(organicQuestion(bank, makeRng(2), 7).question, /a\.txt|b\.txt/);
  assert.equal(memoryDistanceFor(3, makeRng(1)), null); assert.equal(memoryDistanceFor(7, makeRng(1)), 5);
});

test("the bank refuses bibliography entries; an answer's atoms are read per sentence, and capitalised function words are not names (control: the reference-list fragment yields no fact)", () => {
  const ref = [{ source: "w.html", kind: "html", ref: "w.html#0-300", start: 0, text: "Columbia, Missouri, and London, UK: University of Missouri Press, p. 12. Smith, John (1999). Retrieved 2020." }];
  assert.equal(buildFactBank(ref, { perSource: 5, rng: makeRng(1) }).length, 0);
  const atoms = answerAtoms("## Location\n\nThe publisher is Leipsic Teubner. It's in 1841 that Ada Rowe wrote it.");
  const names = atoms.filter((a) => a.kind === "name").map((a) => a.value);
  assert.ok(names.includes("Leipsic Teubner") && names.includes("Ada Rowe"), JSON.stringify(names));
  assert.ok(!names.some((n) => /\n|^It's$|^The$/.test(n)), JSON.stringify(names));
});
