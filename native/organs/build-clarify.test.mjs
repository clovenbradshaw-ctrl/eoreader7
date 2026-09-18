// native/organs/build-clarify.test.mjs — the recursive ask-back door, BUILT
// TO FAIL (II.23): every control runs in BOTH directions, and the three
// registers are asserted IN ORDER (ethos first, logos second, pathos third),
// never as three parallel gates.
import test from "node:test";
import assert from "node:assert/strict";
import { buildClarify, questionsFor, answerFills, recordRound, SCHEMA, MAX_ROUNDS } from "./build-clarify.js";
import { languageForDeclared } from "../../proxy-runner.mjs";
import { voidHolarchy } from "./void-holarchy.js";

// The dolphin task's declared cells, filled progressively by the person's
// answers — the same shape the fold's own essay void already carries.
// `openFields` leaves anchor AND cardinality genuinely undeclared so the
// recursion has something to narrow; `wholeFields` declares cardinality too.
const openFields = {
  slot: "a myspace-like site for dolphins",
  admits: "pages: profiles, friend links, posts",
  extent: { from: 0, to: 4 },
  relation: "page serves the dolphin profile",
  composition: "pages link, none overlap in role",
  admission: "a page lands iff it serves a dolphin profile need",
  reopensOn: "an uncovered profile need",
};
const wholeFields = { ...openFields, anchor: null, cardinality: "unknown" };
const clearOk = () => ({ cleared: true });
const noCycles = () => ({ cycles: [] });
const groundHolds = () => ({ kind: "ground_holds", basis: "the ground absorbs what arrived" });

test("ethos is first: a task that fails the ground is refused before any question is asked", () => {
  const r = buildClarify({ task: "make a myspace-like site for dolphins", fieldsByLevel: { whole: wholeFields }, clear: () => ({ cleared: false, reason: "the ground refuses this" }) });
  assert.equal(r.kind, "refused");
  assert.equal(r.reason, "the ground refuses this");
  // Control: without the refusal the same call is not refused — the gate is
  // doing the work, not the shape of the call.
  const ok = buildClarify({ task: "make a myspace-like site for dolphins", fieldsByLevel: { whole: wholeFields }, clear: clearOk, lint: noCycles, reGround: groundHolds });
  assert.ok(ok.kind === "needs-clarification" || ok.kind === "licensed");
});

test("logos is second: an answer that would cycle the standing is refused, never asked, never landed", () => {
  const r = buildClarify({
    task: "make a myspace-like site for dolphins", round: 1,
    fieldsByLevel: { whole: { ...openFields, anchor: "the person asking", cardinality: "three" } },
    answers: [{ cell: "relation", value: "the site's own page defines what the site is" }],
    clear: clearOk,
    lint: () => ({ cycles: ["dolphin site —defines→ itself"] }),
    reGround: groundHolds,
  });
  assert.equal(r.kind, "refused");
  assert.equal(r.reason, "logos_cycle");
  assert.equal(r.questions, undefined, "a logos-refused round asks nothing");
});

test("an under-specified void ASKS — the undeclared cells become the questions, never a generated answer", () => {
  const r = buildClarify({ task: "make a myspace-like site for dolphins", fieldsByLevel: { whole: wholeFields }, clear: clearOk, lint: noCycles, reGround: groundHolds });
  assert.equal(r.kind, "needs-clarification");
  assert.equal(r.round, 0);
  assert.ok(r.questions.length >= 1, "the build-blocking undeclared cells are asked");
  // Gary's law: as little as possible in the mouth — a bare plain question,
  // no apparatus word (no "void"/"slot"/"anchor"), no prohibition, no number.
  for (const q of r.questions) {
    assert.ok(!/\b(void|slot|anchor|extent|cardinality|admission|fillers?)\b/i.test(q.ask), `apparatus-free ask: "${q.ask}"`);
    assert.ok(!/^\d+\./.test(q.ask), "no numbering reaches the mouth");
    assert.ok(!/\b(do not|don't|never|must not|won't)\b/i.test(q.ask), `no prohibition: "${q.ask}"`);
    assert.ok(q.ask.length < 90, `minimal: "${q.ask}" is under 90 chars`);
  }
});

test("a declared void is LICENSED — the recursion closes and generation may begin", () => {
  const r = buildClarify({
    task: "make a myspace-like site for dolphins", round: 1, openBefore: ["anchor", "cardinality"],
    fieldsByLevel: { whole: { ...openFields, anchor: "the person asking", cardinality: "three" } },
    answers: [{ cell: "anchor", value: "the person asking" }],
    clear: clearOk, lint: noCycles, reGround: groundHolds,
  });
  assert.equal(r.kind, "licensed");
});

test("the recursion narrows: an answer that fills one cell re-declares and still asks the rest", () => {
  const r1 = buildClarify({ task: "make a myspace-like site for dolphins", fieldsByLevel: { whole: openFields }, clear: clearOk, lint: noCycles, reGround: groundHolds });
  assert.equal(r1.kind, "needs-clarification");
  const openBefore = r1.void.levels[0].void.undeclared.map((u) => u.field);
  const r2 = buildClarify({
    task: "make a myspace-like site for dolphins", round: 1, openBefore,
    fieldsByLevel: { whole: { ...openFields, anchor: "the person asking" } },
    answers: [{ cell: "anchor", value: "the person asking" }],
    clear: clearOk, lint: noCycles, reGround: groundHolds,
  });
  assert.equal(r2.kind, "needs-clarification", "still open — cardinality remains");
  const asks1 = r1.questions.map((q) => q.cell).sort();
  const asks2 = r2.questions.map((q) => q.cell).sort();
  assert.ok(asks2.length < asks1.length, `round 2 asks a subset: ${asks1} → ${asks2}`);
  assert.ok(asks2.every((c) => asks1.includes(c)), "round 2 never introduces a new question");
});

test("an answer that moves nothing is NEVER re-asked — the pathos register reads it as a closed ground", () => {
  const r = buildClarify({
    task: "make a myspace-like site for dolphins", round: 1,
    fieldsByLevel: { whole: wholeFields },
    answers: [{ cell: "slot", value: "a myspace-like site for dolphins" }], // slot was already declared
    clear: clearOk, lint: noCycles, reGround: groundHolds,
  });
  assert.equal(r.kind, "still_under_specified");
  assert.match(r.basis, /moved nothing|closed ground/, r.basis);
});

test("the budget bounds the recursion — never an infinite ask", () => {
  const r = buildClarify({
    task: "make a myspace-like site for dolphins", round: MAX_ROUNDS + 1,
    fieldsByLevel: { whole: wholeFields },
    clear: clearOk, lint: noCycles, reGround: groundHolds,
  });
  assert.equal(r.kind, "still_under_specified");
  assert.match(r.basis, /budget/);
});

test("every round is recorded, append-only, never overwritten", () => {
  let log = [];
  const r = buildClarify({ task: "t", fieldsByLevel: { whole: wholeFields }, clear: clearOk, lint: noCycles, reGround: groundHolds });
  log = recordRound(log, r);
  log = recordRound(log, { kind: "licensed", round: 1 });
  assert.equal(log.length, 2);
  assert.equal(log[0].seq, 0);
  assert.equal(log[1].seq, 1);
});

test("questionsFor is a closed table: every undeclared cell gets a question, declared cells never do", () => {
  const hol = voidHolarchy({ modality: "code", fieldsByLevel: { whole: { slot: "the site" } } });
  const qs = questionsFor(hol.levels[0].void, { slot: "the site" });
  const cells = new Set(qs.map((q) => q.cell));
  assert.ok(!cells.has("slot"), "a declared cell is never asked");
  assert.ok(cells.size >= 8, "eight of nine undeclared → asked");
  for (const q of qs) assert.equal(q.buildBlocking, true, "every asked cell is build-blocking");
});

test("answerFills folds answers onto the void by cell — the re-ground's own contract; unmatched prose never guesses a fill", () => {
  const hol = voidHolarchy({ modality: "code", fieldsByLevel: { whole: { slot: "the site", extent: { from: 0, to: 4 } } } });
  const whole = hol.levels[0].void;
  // Cell-tagged answers (what the wiring sends) fill their cell.
  const tagged = answerFills([{ cell: "admits", value: "pages: profiles, friend links, posts" }], whole);
  assert.equal(tagged.fills.length, 1);
  assert.equal(tagged.fills[0].cell, "admits");
  assert.ok(!tagged.leftOpen.includes("admits"));
  // Untagged prose sharing no word with the minimal ask fills nothing —
  // never a guessed cell from silence.
  const prose = answerFills([{ value: "profiles, friend links and posts" }], whole);
  assert.equal(prose.fills.length, 0, "silence is not a fill");
});

test("ethos/logos/pathos arrive INJECTED, never restated — the organ carries order, not machinery", async () => {
  const src = await import("node:fs").then((fs) => fs.promises.readFile(new URL("./build-clarify.js", import.meta.url), "utf8"));
  const imports = src.split("\n").filter((l) => /^import /.test(l)).join("\n");
  assert.ok(!/from "\.\/ethos|from "\.\/askshape|from "\.\/reasoning-lint|from "\.\/pathos/.test(imports), "no archon machinery is imported here — the registers arrive injected");
});

test("the declared shape re-derives the language: a declared SITE is html, whatever detection fell back to", () => {
  assert.equal(languageForDeclared({ slot: "a myspace-like site for dolphins" }, "python"), "html", "a site is html");
  assert.equal(languageForDeclared({ slot: "a myspace-like site for dolphins" }, "html"), "html", "already html stays html");
  assert.equal(languageForDeclared({ slot: "a CLI tool for dolphins" }, "python"), "python", "a tool is not a site — the declared words, never a guess");
  assert.equal(languageForDeclared({ slot: "the build's parts: site" }, "python"), "html", "admits naming a site re-derives too");
  assert.equal(languageForDeclared(null, "python"), "python", "no declared shape leaves the language alone");
});