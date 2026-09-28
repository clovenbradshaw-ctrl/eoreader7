// tests/code-form.test.js — code through the one pipeline (organs/code-form.js):
// the design on the record, calls heard as bonds, bodies from bounded notes,
// the suite as EVA, a failing function written again and kept only if the
// tests naming it fail less.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeCodeForm, makeTextStore, extractFunction, namesIn, readTap } from "../organs/code-form.js";
import { actOf, helixCheck } from "../organs/claim-acts.js";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.join(HERE, "..", "eval", "code-task");
const spec = JSON.parse(fs.readFileSync(path.join(TASK, "spec.json"), "utf8"));
const reference = fs.readFileSync(path.join(TASK, "reference", "index.js"), "utf8");
const refBody = (name) => extractFunction(reference, name);
// workspaces under the repo's own state dir (a run's scratch), cleaned after
const SCRATCH = path.join(HERE, "..", "..", "state", "code-task", "test-tmp");
const tmp = () => { fs.mkdirSync(SCRATCH, { recursive: true }); return fs.mkdtempSync(path.join(SCRATCH, "w-")); };
test.after(() => fs.rmSync(SCRATCH, { recursive: true, force: true }));

test("extractFunction takes the balanced declaration and nothing after it; namesIn reads a calls reply; readTap attributes failures", () => {
  const two = "function a(x) { if (x) { return \"}\"; } return 1; }\n\nfunction b() { return 2; }";
  assert.equal(extractFunction(two, "a"), "function a(x) { if (x) { return \"}\"; } return 1; }");
  assert.equal(extractFunction(two, "b"), "function b() { return 2; }");
  assert.equal(extractFunction("nothing here", "a"), null);
  assert.deepEqual(namesIn("tokenize, parse and expandRange.", ["tokenize", "parse", "expandRange", "evaluate"]), ["tokenize", "parse", "expandRange"]);
  assert.deepEqual(namesIn("none", ["tokenize"]), []);
  const tap = readTap("TAP version 13\nok 1 - [tokenize] numbers\nnot ok 2 - [parse, evaluate] precedence\n  ---\n  error: |-\n    Expected values to be strictly equal\n  expected: 7\n  actual: 9\n  ...\n# tests 2");
  assert.equal(tap.passed.length, 1); assert.equal(tap.failed.length, 1);
  assert.deepEqual(tap.failed[0].parts, ["parse", "evaluate"]);
  assert.ok(tap.failed[0].detail.some((d) => d.startsWith("expected")));
});

test("the design is on the record in dependency order, calls are CON bonds, bodies carry their premises, the helix holds", async () => {
  const prompts = [];
  const ask = async (prompt, { stage }) => {
    prompts.push({ stage, prompt });
    if (stage.startsWith("calls:")) { const f = stage.slice(6); return { computeGrid: "evaluationOrder, evaluate, parse, tokenize", dependencies: "tokenize, parse, expandRange", evaluationOrder: "dependencies", evaluate: "expandRange", expandRange: "parseRef" }[f] ?? "none"; }
    if (stage.startsWith("body:")) { const name = stage.slice(5); return refBody(name).slice(`function ${name}(`.length); }
    return "";
  };
  const cf = makeCodeForm({ ask, mouth: "m", spec, testFile: path.join(TASK, "engine.test.js") });
  let notes = cf.stipulate();
  ({ notes } = await cf.askCalls({ notes }));
  const fold = cf.N.fold(notes);
  const calls = fold.filter((n) => n.label === "calls");
  assert.equal(calls.length, 10, JSON.stringify(calls.map((c) => `${c.end1}->${c.end2}`)));
  assert.ok(calls.every((n) => actOf(n).op === "CON"), "a call between two functions on the record is a bond");
  const w = await cf.writeBodies({ notes, store: makeTextStore() });
  assert.deepEqual(w.voids, []);
  // the note for computeGrid carries its callees' signatures and nothing of the other functions
  const note = prompts.find((p) => p.stage === "body:computeGrid").prompt;
  assert.ok(note.includes("It may call evaluationOrder(cells)") && note.includes("It may call tokenize(src)"), note);
  assert.ok(!note.includes("formatGrid(values)"), "a function it does not call was carried");
  assert.ok(note.length < 2200, `the note is not bounded: ${note.length} chars`);
  for (const p of prompts) for (const word of ["ledger", "claim", "JSON", "premise", "note"]) assert.ok(!p.prompt.includes(word), `${word} in a prompt`);
  const dir = tmp();
  const { map } = cf.assemble({ notes: w.notes, store: w.store, dir });
  assert.ok(fs.readFileSync(path.join(dir, "grid.js"), "utf8").startsWith("import { "), "imports are derived from the bonds");
  const r = cf.test({ dir, map });
  assert.equal(r.passed, 16, JSON.stringify(r.titles));
  assert.equal(helixCheck({ fold: cf.N.fold(w.notes), entries: w.notes.entries }).ok, true);
});

test("a broken function is named by the tests, written again with the failure in hand, and the fix is kept; a non-fix is undone", async () => {
  let evaluateDraws = 0, formatDraws = 0;
  const ask = async (prompt, { stage }) => {
    if (stage.startsWith("calls:")) return { computeGrid: "evaluationOrder, evaluate, parse, tokenize", dependencies: "tokenize, parse, expandRange", evaluationOrder: "dependencies", evaluate: "expandRange", expandRange: "parseRef" }[stage.slice(6)] ?? "none";
    if (stage === "body:evaluate") { evaluateDraws++; return evaluateDraws === 1 ? "node, lookup, fns) { return 42; }" : refBody("evaluate").slice("function evaluate(".length); }
    if (stage === "body:formatGrid") { formatDraws++; return "values) { return \"nope\"; }"; }
    if (stage.startsWith("body:")) { const name = stage.slice(5); return refBody(name).slice(`function ${name}(`.length); }
    return "";
  };
  const cf = makeCodeForm({ ask, mouth: "m", spec, testFile: path.join(TASK, "engine.test.js") });
  let notes = cf.stipulate();
  ({ notes } = await cf.askCalls({ notes }));
  const w = await cf.writeBodies({ notes, store: makeTextStore() });
  const dir = tmp();
  const r = await cf.revise({ notes: w.notes, store: w.store, dir, rounds: 2 });
  // evaluate broken fails its two tests and computeGrid's two (computeGrid calls it); formatGrid broken fails its two
  assert.equal(r.history[0].passed, 16 - 6, JSON.stringify(r.history[0]));
  assert.ok(r.history[0].failing.includes("evaluate") && r.history[0].failing.includes("formatGrid"), JSON.stringify(r.history[0].failing));
  const round1 = r.history[1];
  assert.ok(round1.kept.includes("evaluate"), JSON.stringify(round1));
  assert.ok(round1.undone.includes("formatGrid"), "a revision that fixes nothing was kept");
  assert.equal(round1.passed, 14, JSON.stringify(round1));
  // the failing evaluate was told what failed, and the record holds the revision: old body conceded, new one heard
  const fold = cf.N.fold(r.notes);
  const evaluateId = fold.find((n) => n.label === "named" && n.end2 === "evaluate").end1;
  assert.equal(fold.filter((n) => n.end1 === evaluateId && n.label === "body").length, 1);
  assert.ok(r.notes.entries.some((e) => String(e.because ?? "").includes("after 2 failure(s)") || String(e.because ?? "").includes("after 1 failure(s)")), "the revision does not say what it answers");
  assert.equal(helixCheck({ fold, entries: r.notes.entries }).ok, true);
});

test("no regular expressions in the code organ", () => {
  assert.deepEqual(scanRegexes(fs.readFileSync(path.join(HERE, "..", "organs", "code-form.js"), "utf8")), []);
});
