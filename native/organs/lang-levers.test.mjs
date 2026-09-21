// native/organs/lang-levers.test.mjs — the levers, falsified against real
// toolchains. The extraction cases are the ones the research agent named: prose
// around several fences, a usage snippet, a wrong-named implementation.
import test from "node:test";
import assert from "node:assert/strict";
import { toolchainAvailable } from "./lang-validators.js";
import { extractCode, extractOrFallback, definesName, nameDiagnostic, pickBest, RepairLedger } from "./lang-levers.js";

const PY_IMPL = "def sum_evens(xs):\n    return sum(x for x in xs if x % 2 == 0)";
const reply = (...blocks) => `Sure! Here you go.\n\n${blocks.map((b) => "```\n" + b + "\n```").join("\n\nAnd also:\n\n")}\n\nHope it helps.`;

test("definesName: true for the spec name, false for a drifted name (python)", async (t) => {
  if (!(await toolchainAvailable("python"))) return t.skip("python absent");
  assert.deepEqual(await definesName("python", PY_IMPL, "sum_evens"), { known: true, defined: true });
  const drift = await definesName("python", PY_IMPL.replace("sum_evens", "sumEvens"), "sum_evens");
  assert.deepEqual(drift, { known: true, defined: false });
});

for (const [lang, impl, drifted] of [
  ["javascript", "const sum_evens = (xs) => xs.filter((x) => x % 2 === 0).reduce((a, b) => a + b, 0);", "const sumEvens = (xs) => 0;"],
  ["typescript", "const sum_evens = (xs: number[]): number => xs.length;", "const sumEvens = (xs: number[]): number => 0;"],
  ["ruby", "def sum_evens(xs)\n  xs.sum\nend", "def sumEvens(xs)\n  0\nend"],
]) {
  test(`definesName distinguishes the stated name from drift in ${lang}`, async (t) => {
    if (!(await toolchainAvailable(lang))) return t.skip(`${lang} absent`);
    assert.equal((await definesName(lang, impl, "sum_evens")).defined, true);
    assert.equal((await definesName(lang, drifted, "sum_evens")).defined, false);
  });
}

test("extractCode: takes the implementation, skips a usage snippet that does not define the name", async (t) => {
  if (!(await toolchainAvailable("python"))) return t.skip("python absent");
  const got = await extractCode(reply(PY_IMPL, "print(sum_evens([1, 2, 3, 4]))"), "python", "sum_evens");
  // the usage snippet parses but does not DEFINE the function, so the implementation wins
  assert.equal(got, PY_IMPL);
});

test("extractCode: last qualifying block wins", async (t) => {
  if (!(await toolchainAvailable("python"))) return t.skip("python absent");
  const v2 = "def sum_evens(xs):\n    return sum(x for x in xs if not x % 2)";
  assert.equal(await extractCode(reply(PY_IMPL, v2), "python", "sum_evens"), v2);
});

test("extractCode: a block that fails the floor is dropped", async (t) => {
  if (!(await toolchainAvailable("python"))) return t.skip("python absent");
  assert.equal(await extractCode(reply("def sum_evens(xs:\n  pass", PY_IMPL), "python", "sum_evens"), PY_IMPL);
});

test("extractCode: null when no block defines the stated name (honest refusal, no alias)", async (t) => {
  if (!(await toolchainAvailable("python"))) return t.skip("python absent");
  assert.equal(await extractCode(reply(PY_IMPL.replace("sum_evens", "sumEvens")), "python", "sum_evens"), null);
  // the fallback still hands the scorer the real text so its real failure shows
  assert.match(await extractOrFallback(reply(PY_IMPL.replace("sum_evens", "sumEvens")), "python", "sum_evens"), /sumEvens/);
});

test("extractCode: an unfenced reply is one candidate", async (t) => {
  if (!(await toolchainAvailable("python"))) return t.skip("python absent");
  assert.equal(await extractCode(PY_IMPL, "python", "sum_evens"), PY_IMPL);
});

test("nameDiagnostic carries only the spec name, never a test argument", () => {
  const d = nameDiagnostic("sum_evens");
  assert.match(d, /sum_evens/);
  assert.doesNotMatch(d, /\[|\(|\d/);
});

test("pickBest: highest visible score wins; earliest on a tie; a floor failure loses to anything that compiles", () => {
  const mk = (floorOk, cases) => ({ sc: { floorOk, cases } });
  const a = mk(true, [false, true]), b = mk(true, [true, true]), c = mk(false, [false, false]), d = mk(true, [true, true]);
  assert.equal(pickBest([a, b, c, d], [0, 1]).best, b);
  assert.equal(pickBest([c, a], [0, 1]).best, a);
});

test("RepairLedger: a repair that breaks working code is discarded and counted", () => {
  const L = new RepairLedger([0, 1]);
  const good = { sc: { floorOk: true, cases: [true, false] }, tag: "good" };
  const worse = { sc: { floorOk: false, cases: [false, false] }, tag: "worse" };
  const better = { sc: { floorOk: true, cases: [true, true] }, tag: "better" };
  assert.equal(L.offer(good), true);
  assert.equal(L.done, false);
  assert.equal(L.offer(worse), false);
  assert.equal(L.best.tag, "good");
  assert.equal(L.regressions, 1);
  assert.equal(L.offer(better), true);
  assert.equal(L.done, true);
});
