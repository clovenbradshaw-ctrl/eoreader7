// skills.test.mjs — skills as paths: definition (8 parameters, gaps visible), governance (Ostrom), relations
// derived from code, switches as recorded decisions, and the disclosure links. Against real temp artifacts.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PARAMETERS, define, ans } from "../organs/skill-definition.js";
import { setToggle, flagSkill, foldToggles, loadToggles, stateOf, disabledSet, ladderOf } from "../organs/skill-toggles.js";
import { recordUse, loadUsage, foldUsage, linkSkills, skillRef, INSTRUMENTED } from "../organs/skill-usage.js";
import { usedBy, codeIndex, coApplies } from "../organs/skill-relations.js";
import { collectSkills } from "../organs/skills-index.js";
import { judgeStill, saveLearned, loadLearned, emptyRules, HARDREAD_SCHEMA } from "../organs/hard-read.js";
import { answerRecord } from "../the-fold/answer-record.js";
import { pageHtml } from "../the-fold/surface/skills-surface.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "skills-"));
const put = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof s === "string" ? s : JSON.stringify(s)); };

test("eight parameters, each answering to at least one of the three traditions; a gap is never filled", () => {
  assert.equal(PARAMETERS.length, 8);
  for (const p of PARAMETERS) assert.ok(p.holacracy || p.aristotle || p.tinbergen, p.id);
  assert.ok(PARAMETERS.some((p) => p.tinbergen === "ontogeny") && PARAMETERS.some((p) => p.tinbergen === "phylogeny"), "Tinbergen's development and lineage are present");
  const d = define({ purpose: ans("read things", "a.json"), tension: ans("   ", "b.json"), lineage: null });
  assert.equal(d.answered, 1); assert.equal(d.total, 8);
  assert.ok(d.gaps.includes("tension") && d.gaps.includes("evidence"), "a blank answer is a gap");
  assert.equal(d.slots.find((s) => s.id === "tension").from, null, "a gap carries no invented source");
});

test("a switch is a recorded decision by a named person; the ledger is append-only; undecided is reported as such", () => {
  const dir = tmp();
  assert.match(setToggle(dir, { skill: "s", on: false, by: "model:gemma" }).error, /named person/);
  assert.match(setToggle(dir, { skill: "s", on: "no", by: "human:ada" }).error, /true or false/);
  assert.equal(stateOf(foldToggles([]), "s").decided, false, "no entry: the default, not a decision");
  setToggle(dir, { skill: "s", on: false, by: "human:ada", why: "noisy" });
  setToggle(dir, { skill: "s", on: true, by: "human:bo", why: "fixed" });
  const log = loadToggles(dir);
  assert.equal(log.length, 2, "flipping appends; nothing is edited");
  assert.deepEqual(log.map((e) => e.seq), [0, 1]);
  const st = stateOf(foldToggles(log), "s");
  assert.equal(st.on, true); assert.equal(st.by, "human:bo"); assert.equal(st.decided, true);
  assert.equal(loadToggles(tmp()).length, 0, "a missing ledger is empty, not an error");
});

test("graduated sanctions: a flag needs a reason and turns nothing off; the rung is a fold of recorded acts", () => {
  const dir = tmp();
  assert.match(flagSkill(dir, { skill: "s", by: "human:ada", why: "  " }).error, /reason/);
  assert.match(flagSkill(dir, { skill: "s", by: "bot", why: "x" }).error, /named person/);
  flagSkill(dir, { skill: "s", by: "human:ada", why: "misread a table" });
  let st = stateOf(foldToggles(loadToggles(dir)), "s");
  assert.equal(st.effectiveOn, true, "a flag is not a switch");
  assert.equal(ladderOf(st).rung, "flagged");
  assert.equal(ladderOf(st, { conceded: true }).rung, "conceded");
  setToggle(dir, { skill: "s", on: false, by: "human:ada", why: "enough" });
  st = stateOf(foldToggles(loadToggles(dir)), "s");
  assert.equal(ladderOf(st).rung, "off");
  assert.equal(ladderOf({ effectiveOn: true, flags: [] }, { earned: false }).rung, "provisional");
});

test("nesting: a parent that is off switches off everything under it, and the reason names the parent", () => {
  const dir = tmp();
  const parentOf = (id) => (id.startsWith("rule:") ? "route:x" : null);
  setToggle(dir, { skill: "route:x", on: false, by: "human:ada" });
  const f = foldToggles(loadToggles(dir));
  const child = stateOf(f, "rule:1", { parentOf });
  assert.equal(child.on, true, "the child's own switch is untouched");
  assert.equal(child.effectiveOn, false);
  assert.match(child.offBecause, /parent route:x/);
  assert.ok(disabledSet(dir, { parentOf, ids: ["rule:1", "rule:2", "other"] }).has("rule:2"));
  assert.ok(!disabledSet(dir, { parentOf, ids: ["other"] }).has("other"));
});

test("monitoring: uses are counts on an append-only record; the hit rate is over decided outcomes only", () => {
  const dir = tmp();
  recordUse(dir, { skill: "s", accepted: 3, refused: 1, source: "a.txt" });
  recordUse(dir, { skill: "s", accepted: 1, refused: 0, judged: 1, source: "b.txt" });
  const u = foldUsage(loadUsage(dir)).get("s");
  assert.equal(u.fired, 2); assert.equal(u.accepted, 4); assert.equal(u.refused, 1); assert.equal(u.hitRate, 0.8);
  assert.deepEqual(u.sources.sort(), ["a.txt", "b.txt"]);
  assert.equal(foldUsage([{ skill: "z", fired: 1 }]).get("z").hitRate, null, "no decided outcome, no rate");
});

test("disclosure links: every use is a link to the skills surface by skill id, and the reporting set is disclosed", () => {
  const l = linkSkills([{ skill: "route:hard-read", source: "a.txt", accepted: 2 }, { skill: "route:hard-read", source: "b.txt", accepted: 1, refused: 1 }, { skill: "learned:hard-read/hard-1", source: "b.txt", accepted: 1 }]);
  assert.equal(l.length, 2);
  const r = l.find((x) => x.id === "route:hard-read");
  assert.equal(r.fired, 2); assert.equal(r.accepted, 3); assert.deepEqual(r.sources, ["a.txt", "b.txt"]);
  assert.equal(r.href, `skills-surface.html#${encodeURIComponent("route:hard-read")}`);
  assert.equal(skillRef("x").ref, "skill:x");
  assert.ok(INSTRUMENTED.includes("route:hard-read"), "the skills that can report are named");
  // the generation record carries them only when something reported
  assert.equal("skills" in answerRecord({ question: "q", answer: "a" }), false);
  assert.deepEqual(answerRecord({ question: "q", answer: "a", skills: l }).skills.map((s) => s.id), ["route:hard-read", "learned:hard-read/hard-1"]);
});

test("relations are derived from the code: a prior is 'named by' the modules that name its schema; the skills modules and tests do not count", () => {
  const root = tmp();
  put(path.join(root, "organs", "reader.js"), 'import x from "./y.js";\nconst P = "CasePrior@1";\n');
  put(path.join(root, "organs", "reader.test.js"), 'const P = "CasePrior@1";');
  put(path.join(root, "organs", "skill-fake.js"), 'const P = "CasePrior@1";');
  put(path.join(root, "organs", "other.js"), "nothing here");
  const idx = codeIndex([path.join(root, "organs")], root);
  const hits = usedBy(["CasePrior@1"], idx);
  assert.deepEqual(hits.map((h) => h.file), ["organs/reader.js"]);
  assert.equal(hits[0].line, 2, "the citation is the line that names it");
  assert.equal(usedBy(["NoSuchPrior@1"], idx).length, 0, "nothing names it: a finding, not an omission");
  const co = coApplies([{ id: "a", language: "ru" }, { id: "b", language: "ru" }, { id: "c", language: "en" }]);
  assert.deepEqual(co.get("a"), ["b"]); assert.deepEqual(co.get("c"), []);
});

function fixture() {
  const lp = tmp(); const learned = tmp();
  put(path.join(lp, "derived-priors", "README.md"), "# top");
  put(path.join(lp, "derived-priors", "case-priors", "README.md"), "# case\n\nCase priors let the reader take who-did-what from word endings instead of word order, for languages that mark it.");
  put(path.join(lp, "derived-priors", "case-priors", "case-marking-lat.json"), { schema: "CasePrior@1", language: "lat", provenance: { giver: "UD Latin-Perseus", license: "CC BY-NC-SA" }, declared: { scope: "ambiguous endings only" } });
  put(path.join(lp, "derived-priors", "lavar-priors", "273-i-love-my-mom.json"), { schema: "LaVarPrior@1", giver: "LaVar, this session", read: { title: "273_I-Love-My-Mom.txt" }, known_limitation: "The source file was edited in place." });
  put(path.join(learned, "hard-read.json"), { schema: HARDREAD_SCHEMA, trails: {}, rules: { schema: HARDREAD_SCHEMA, rules: [
    { name: "hard-1", head: "a=9^{+9}_{-9}", textRoute: "sign-scan", imageRoute: "cv-stack:12", evidence: { regions: 2 }, foundVia: "cv-ocr-agreed", at: 1790000000000 },
    { name: "hard-2", head: "b=9", textRoute: "sign-scan", imageRoute: "cv-stack:12", evidence: { regions: 2 }, foundVia: "cv-ocr-agreed", at: 1790000000001, conceded: { because: "misread once", at: 1790000000002 } }] } });
  return { lp, learned };
}

test("received priors: the giver is found under `provenance`, a language comes from a field never a filename, a route is the README's words never a limitation note", () => {
  const { lp, learned } = fixture();
  const c = collectSkills({ livePriors: lp, learnedDir: learned, codeRoots: [], codeBase: lp });
  const lat = c.received.find((s) => s.id === "received:case-priors/case-marking-lat");
  assert.match(lat.giver, /UD Latin-Perseus/, "regression: 14 of 31 real priors were reported giverless when only `giver` was read");
  assert.equal(lat.language, "lat");
  assert.match(lat.route, /who-did-what from word endings/, "the route is copied from the kind's README");
  assert.equal(lat.appliesWhen, "text in lat");
  const mom = c.received.find((s) => s.id === "received:lavar-priors/273-i-love-my-mom");
  assert.equal(mom.language, null, "regression: '-mom.json' was read as a language code");
  assert.equal(mom.route, null, "no README for this kind: no route claimed");
  assert.match(mom.caveat, /edited in place/, "the limitation note stays a caveat, not a purpose");
  assert.equal(mom.definition.slots.find((s) => s.id === "purpose").gap, true);
  assert.equal(mom.definition.slots.find((s) => s.id === "path").gap, true, "nothing consumes it, so no path is asserted");
  assert.match(mom.appliesWhen, /273_I-Love-My-Mom/);
});

test("learned rules nest under their route, carry their evidence, and a concession is visible on the rung", () => {
  const { lp, learned } = fixture();
  const c = collectSkills({ livePriors: lp, learnedDir: learned, codeRoots: [], codeBase: lp });
  const r1 = c.learned.find((s) => s.id === "learned:hard-read/hard-1"), r2 = c.learned.find((s) => s.id === "learned:hard-read/hard-2");
  assert.equal(r1.parent, "route:hard-read");
  assert.equal(r1.definition.answered, 8, "a learned rule is fully defined from its own record");
  assert.equal(r2.governance.sanctions.rung, "conceded");
  assert.match(r2.standing, /CONCEDED — misread once/);
  const route = c.routes.find((s) => s.id === "route:hard-read");
  assert.deepEqual(route.relations.children.sort(), ["learned:hard-read/hard-1", "learned:hard-read/hard-2"]);
  setToggle(learned, { skill: "route:hard-read", on: false, by: "human:ada", why: "test" });
  const off = collectSkills({ livePriors: lp, learnedDir: learned, codeRoots: [], codeBase: lp });
  const child = off.learned.find((s) => s.id === "learned:hard-read/hard-1");
  assert.equal(child.effectiveOn, false); assert.equal(child.on, true);
  assert.match(child.governance.sanctions.answer, /parent route:hard-read is switched off/);
});

test("the surface: a card's element id IS the skill id (so a disclosure link lands on it), gaps are drawn, a static page's switches are read-only", () => {
  const { lp, learned } = fixture();
  const c = collectSkills({ livePriors: lp, learnedDir: learned, codeRoots: [], codeBase: lp });
  const html = pageHtml(c, { live: false });
  assert.ok(html.includes('id="route:hard-read"') && html.includes('id="learned:hard-read/hard-1"'));
  assert.match(html, /not declared — a gap, not a guess/);
  assert.match(html, /nothing in the code names this prior/);
  assert.doesNotMatch(html.match(/<input type="checkbox"[^>]*>/)[0], /^(?!.*disabled)/, "static: disabled");
  const live = pageHtml(c, { live: true });
  assert.match(live, /id="who"/); assert.doesNotMatch(live.match(/<input type="checkbox"[^>]*>/)[0], /disabled/);
});

test("the small model may only POINT: candidates must be readings a sense produced whose numbers occur in the region; a judged reading is marked", async () => {
  const still = [{ doc: "a.txt", span: [0, 20], expr: "H=73.3^{+1.7}_{-1.8}", ants: 6, why: "no agreement", readings: [
    { sense: "text", route: "sign-scan", reading: { value: 73.3, up: 1.7, down: 1.8, sym: false } },
    { sense: "image", route: "cv-stack:12", reading: { value: 73.3, up: 1.7, down: 9.9, sym: false } }] }];
  const asked = [];
  const j = await judgeStill({ text: "H=73.3^{+1.7}_{-1.8}", still, ask: async (p) => { asked.push(p); return "1"; } });
  assert.equal(asked.length, 0, "the 9.9 candidate's number is not in the region, so it is never offered — and one candidate left means nothing to choose between: the model is not asked");
  assert.equal(j.readings.length, 0); assert.equal(j.still.length, 1);
  const two = [{ ...still[0], expr: "H=73.3^{+1.7}_{-1.8} or 73.3^{+1.7}_{-9.9}" }];
  const seen = [];
  const k = await judgeStill({ text: two[0].expr, still: two, ask: async (p) => { seen.push(p); return "2"; } });
  assert.match(seen[0], /Passage: «H=73\.3/, "the model is shown the region's own characters");
  assert.equal((seen[0].match(/^\d\) /gm) ?? []).length, 2, "and exactly the candidate readings");
  assert.equal(k.readings[0].judged, true); assert.equal(k.readings[0].down, 9.9);
  assert.match(k.lines[0], /judged by the small model/);
  const none = await judgeStill({ text: two[0].expr, still: two, ask: async () => "0" });
  assert.equal(none.readings.length, 0); assert.match(none.still[0].why, /chose none/);
  const wild = await judgeStill({ text: two[0].expr, still: two, ask: async () => "7" });
  assert.equal(wild.readings.length, 0, "a pick outside the candidate list is refused");
  const thrown = await judgeStill({ text: two[0].expr, still: two, ask: async () => { throw new Error("down"); } });
  assert.equal(thrown.readings.length, 0, "an unreachable model is a refusal, not a crash");
});

test("learning persists and is append-only across writers: a saved rule is never dropped, a concession is kept", () => {
  const dir = tmp();
  const rule = (n) => ({ name: n, head: `h${n}`, textRoute: "sign-scan", imageRoute: "cv-stack:12", evidence: { regions: 2 }, foundVia: "cv-ocr-agreed", at: 1 });
  saveLearned(dir, { trails: { t: [] }, rules: { schema: HARDREAD_SCHEMA, rules: [rule("hard-1")] } });
  saveLearned(dir, { trails: {}, rules: { schema: HARDREAD_SCHEMA, rules: [rule("hard-2")] } }); // a second writer that never saw hard-1
  const back = loadLearned(dir);
  assert.deepEqual(back.rules.rules.map((r) => r.name).sort(), ["hard-1", "hard-2"], "the earlier rule survives the later writer");
  saveLearned(dir, { trails: {}, rules: { schema: HARDREAD_SCHEMA, rules: [{ ...rule("hard-1"), conceded: { because: "wrong once", at: 2 } }] } });
  assert.equal(loadLearned(dir).rules.rules.find((r) => r.name === "hard-1").conceded.because, "wrong once");
  assert.match(loadLearned(tmp()).note, /nothing learned yet/, "a missing file is an empty colony, said");
  fs.writeFileSync(path.join(dir, "hard-read.json"), "{not json");
  assert.match(loadLearned(dir).note, /unreadable/);
});
