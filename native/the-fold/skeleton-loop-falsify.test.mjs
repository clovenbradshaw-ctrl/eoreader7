// skeleton-loop-falsify.test.mjs — STAGES 6 AND 7 PROVEN (2026-09-22):
// the skeleton's lints fire on constructed violations (Kelsen's conflicting
// figures had never been shown to — measured this day: notes exist on
// 8 of 33 OHS statements and 30 of 60 narrative ones, only where the parser
// finds subject, root and object, so the falsifier uses a pair it parses);
// a finding licenses a recomposition only under the stated rule (across
// tiers, the operator's figure stands; an off-thesis section that answers
// the ask stays); the loop applies one licensed finding at a time, rebuilt
// not patched, judged against the last, bounded by the work; and the
// learned shape, not a received default, sets the selection budget.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, drawnParts } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { loadEotParser, attachEot } from "./eot-notation.js";
import { arrangeEssay, selectToBudget } from "./arrange.js";
import { huntGround } from "./hunt.js";
import { skeletonLoop, measureSkeleton, judgeSkeletonLoop, skeletonLoopLine } from "./skeleton-loop.js";

const P = await loadEotParser();
const TASK = "Write an essay on what the audit found and how the office responded.";
const parsed = (ground, { task = TASK, sources = null } = {}) => {
  const d = attachReferents(buildDraft({ task, ground, sources }), buildReferents(ground));
  if (P.ok) attachEot(drawnParts(d).flatMap((p) => p.children), P.parse(ground, "g"));
  return d;
};
const byText = (d, re) => drawnParts(d).flatMap((p) => p.children).find((c) => re.test(c.text))?.id;

test("Kelsen fires: two of the operator's statements giving different figures for the same claim are a conflicting_figures finding — reported, not resolved, licensing nothing", { skip: !P.ok && "parser not loaded" }, () => {
  const d = parsed(["The audit reviewed the office.", "", "The audit found 12 recommendations. The office responded to each.", "", "The audit found 14 recommendations, the summary said. The office agreed."].join("\n"));
  const o = arrangeEssay({ draft: d });
  const k = o.findings.find((f) => f.kind === "conflicting_figures");
  assert.ok(k, "the lint must fire on 12 vs 14");
  assert.match(k.detail, /12.*14|14.*12/);
  assert.equal(k.licenses, null, "both are the operator's: nobody outranks anybody");
  assert.match(k.detail, /reported, not resolved/);
  const sk = skeletonLoop({ draft: d, task: TASK });
  assert.equal(sk.loops.length, 1, "nothing licensed, no loop after the composition");
  assert.equal(sk.settled, true);
});

test("across tiers the operator's figure stands: the fetched statement is licensed to leave, the loop recomposes without it, judged better, and settles", { skip: !P.ok && "parser not loaded" }, () => {
  const operator = ["The audit reviewed the office.", "", "The audit found 12 recommendations. The office responded to each."].join("\n");
  const surfed = { sources: [{ host: "news.example", url: "https://news.example/a", hunt: "material", status: "fetched", text: "The audit found 14 recommendations, the paper reported. The office agreed." }] };
  const R0 = buildReferents(operator);
  const d0 = attachReferents(buildDraft({ task: TASK, ground: operator }), R0);
  const h = huntGround({ operator: { id: "op.md", text: operator }, surfed, topic: "what the audit found", R: R0, subject: d0.subjectRefs });
  assert.equal(h.admitted, 1, "the fetched paragraph carries the subject");
  const d = parsed(h.ground, { sources: h.map });
  const fetchedId = byText(d, /14 recommendations/);
  assert.equal(drawnParts(d).find((p) => p.children.some((c) => c.id === fetchedId)).tier, 1);
  const o = arrangeEssay({ draft: d });
  const k = o.findings.find((f) => f.kind === "conflicting_figures");
  assert.ok(k);
  assert.equal(k.licenses, "prefer-operator");
  assert.deepEqual(k.statements, [fetchedId]);
  const lines = [];
  const sk = skeletonLoop({ draft: d, task: TASK, onLoop: (l) => lines.push(skeletonLoopLine(l)) });
  assert.equal(sk.loops.length, 2);
  assert.equal(sk.loops[1].judge.verdict, "better");
  assert.deepEqual(sk.excluded, [fetchedId]);
  assert.equal(sk.settled, true);
  assert.ok(!sk.outline.slots.some((s) => s.statements.includes(fetchedId)), "the fetched figure left the skeleton");
  assert.ok(sk.outline.slots.some((s) => s.statements.includes(byText(d, /12 recommendations/))), "the operator's stands");
  assert.match(lines[1], /prefer-operator/);
  assert.match(sk.basis, /settled/);
});

test("Clark: an off-thesis section that answers none of the ask's questions may leave; one that answers the ask stays and is only reported", () => {
  const ground = ["The river shaped the town.", "", "The river flooded the town in 1927. The river was dammed in 1952.", "", "Cats sleep sixteen hours a day. Kittens open their eyes at ten days."].join("\n");
  const leave = arrangeEssay({ draft: parsed(ground, { task: "Write an essay on the river." }) });
  const off = leave.findings.find((f) => f.kind === "off_thesis");
  assert.ok(off, "the cats paragraph shares nothing with the thesis");
  assert.equal(off.licenses, "leave-out");
  const d = parsed(ground, { task: "Write an essay on the river." });
  const sk = skeletonLoop({ draft: d, task: "Write an essay on the river." });
  assert.equal(sk.loops[1].judge.keep, true);
  assert.ok(sk.excluded.includes(byText(d, /Cats sleep/)));
  assert.equal(sk.settled, true);
  // The same paragraph, with the ask pointing at it, stays.
  const stay = arrangeEssay({ draft: parsed(ground, { task: "Write an essay on the river and on cats." }) });
  const off2 = stay.findings.find((f) => f.kind === "off_thesis");
  assert.ok(off2);
  assert.equal(off2.licenses, null);
  assert.match(off2.detail, /answers the ask, so it stays/);
});

test("judgeSkeletonLoop: a loop that loses a question the ask asked is undone, whatever it resolved; more licensed findings is worse; fewer is better", () => {
  const m = (o) => ({ placed: 10, of: 12, covered: 2, questions: 2, licensed: 1, findings: 3, sections: 4, want: null, ...o });
  assert.equal(judgeSkeletonLoop(m(), m({ covered: 1, licensed: 0 })).keep, false);
  assert.equal(judgeSkeletonLoop(m(), m({ licensed: 2 })).keep, false);
  assert.equal(judgeSkeletonLoop(m(), m({ licensed: 0 })).verdict, "better");
  assert.equal(judgeSkeletonLoop(m(), m()).verdict, "same");
  assert.equal(judgeSkeletonLoop(null, m()).verdict, "first");
});

test("measureSkeleton reads the shape in mind: the wanted section count comes from the learned shape, and questions covered are the ask's own", () => {
  const d = parsed(["The river shaped the town.", "", "The river flooded the town in 1927.", "", "The office responded in 2010."].join("\n"), { task: "Write an essay on how the river flooded and how the office responded." });
  const o = arrangeEssay({ draft: d });
  const m = measureSkeleton(o, d, { task: d.task, shape: { agreedUnits: [{ unit: "paragraph", n: 5, support: 4 }], hosts: 4 } });
  assert.equal(m.want, 5);
  assert.equal(m.questions, 2);
  assert.equal(m.covered, 2);
  assert.equal(measureSkeleton(o, d, { task: d.task }).want, null);
});

test("selectToBudget: the ask's length first, else the LEARNED shape, only then the received default — each disclosed", () => {
  const ground = Array.from({ length: 8 }, (_, i) => `Part ${i + 1} of the river's story happened in ${1800 + i * 10}. The river carried grain that decade.`).join("\n\n");
  const d = parsed(ground, { task: "Write an essay on the river." });
  const o = arrangeEssay({ draft: d });
  const bodies = o.slots.filter((s) => s.slot !== "thesis" && s.slot !== "return" && s.statements.length).length;
  // (measured: arrange merges the eight look-alike decades into two body
  // sections — enough to show a three-paragraph shape cutting one)
  assert.ok(bodies >= 2, `the fixture needs more body sections than a small shape allows (has ${bodies})`);
  const learned = selectToBudget({ outline: o, draft: d, task: "Write an essay on the river.", shape: { agreedUnits: [{ unit: "paragraph", n: 3, support: 3 }], hosts: 3 } });
  assert.match(learned.budget.basis, /^measured: the shape learned from 3\/3 host\(s\)/);
  assert.equal(learned.outline.slots.filter((s) => s.slot !== "thesis" && s.slot !== "return").length, 1, "3 paragraphs: thesis, one body, close");
  const asked = selectToBudget({ outline: o, draft: d, task: "Write a four-paragraph essay on the river.", shape: { agreedUnits: [{ unit: "paragraph", n: 3, support: 3 }], hosts: 3 } });
  assert.equal(asked.budget.basis, "asked", "the ask outranks the learned shape");
  const dflt = selectToBudget({ outline: o, draft: d, task: "Write an essay on the river." });
  assert.match(dflt.budget.basis, /^declared: the essay's received form/);
});
