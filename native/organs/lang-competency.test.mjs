// native/organs/lang-competency.test.mjs — the validators and the ledger,
// falsified against real toolchains. Nothing here uses a model: the reference
// solutions are the ground truth, a fluent wrong answer is the null, and a
// broken file is the floor's negative control.
import test from "node:test";
import assert from "node:assert/strict";
import { validateLanguage, toolchainAvailable, canonLanguage } from "./lang-validators.js";
import { TASKS, CALL_LANGUAGES, scoreDraw, referenceFor, nullControl, pAtLeast, competency } from "./lang-competency.js";

const BROKEN = { javascript: "const x = ;", typescript: "const x: number = ;", python: "def f(:\n  pass", ruby: "def f(\n", bash: "if then fi (", c: "int main( { return 0 }", sql: "SELEKT 1;" };
const GOOD = { javascript: "const x = 1;", typescript: "const x: number = 1;", python: "x = 1", ruby: "x = 1", bash: "x=1", c: "int main(void){return 0;}", sql: "select 1;" };

for (const lang of Object.keys(GOOD)) {
  test(`floor gate: ${lang} accepts valid and refuses broken source (or discloses unchecked)`, async () => {
    const g = await validateLanguage(lang, GOOD[lang]);
    const b = await validateLanguage(lang, BROKEN[lang]);
    if (!(await toolchainAvailable(lang))) { assert.equal(g.unchecked, true); assert.equal(b.unchecked, true); return; }
    assert.equal(g.ok, true, JSON.stringify(g));
    assert.notEqual(g.unchecked, true);
    assert.equal(b.ok, false, `broken ${lang} must fail: ${JSON.stringify(b)}`);
  });
}

test("a language with no validator is unchecked, never silently validated", async () => {
  const v = await validateLanguage("go", "package main");
  assert.equal(v.unchecked, true);
  assert.equal(v.ok, true);
  assert.match(v.basis, /no hard validator|not installed/);
});

test("aliases resolve", () => { assert.equal(canonLanguage("py"), "python"); assert.equal(canonLanguage("TS"), "typescript"); });

for (const lang of CALL_LANGUAGES) {
  test(`call tier: every reference solution passes its own test in ${lang}`, async (t) => {
    if (!(await toolchainAvailable(lang))) return t.skip(`${lang} toolchain absent`);
    for (const task of TASKS) {
      const r = await scoreDraw(task, lang, referenceFor(task, lang));
      assert.equal(r.callOk, true, `${task.id}/${lang}: ${r.why}`);
    }
  });

  test(`null control: a fluent wrong answer fails the test in ${lang} (the test discriminates)`, async (t) => {
    if (!(await toolchainAvailable(lang))) return t.skip(`${lang} toolchain absent`);
    const n = await nullControl(lang);
    assert.equal(n.passes, 0, `a wrong-task solution passed a test ${n.passes}/${n.n} times — that test cannot discriminate`);
  });

  test(`call tier: a floor-clean draw that ignores the spec is refused in ${lang}`, async (t) => {
    if (!(await toolchainAvailable(lang))) return t.skip(`${lang} toolchain absent`);
    const task = TASKS[0];
    const wrong = { javascript: "const sumEvens = (xs) => xs.length;", typescript: "const sumEvens = (xs: number[]): number => xs.length;", python: "def sum_evens(xs):\n    return len(xs)", ruby: "def sum_evens(xs)\n  xs.length\nend" }[lang];
    const r = await scoreDraw(task, lang, wrong);
    assert.equal(r.floorOk, true, "compiles cleanly");
    assert.equal(r.callOk, false, "but the call test refuses it — floor is structure, not meaning");
  });
}

test("binomial tail: sanity", () => {
  assert.ok(Math.abs(pAtLeast(1, 1, 0.5) - 0.5) < 1e-9);
  assert.ok(Math.abs(pAtLeast(2, 2, 0.5) - 0.25) < 1e-9);
  assert.equal(pAtLeast(0, 5, 0.3), 1);
});

test("competency: a cell without a measured null refuses to be a claim", () => {
  const rows = [{ language: "python", model: "m", callOk: true, floorOk: true }];
  const c = competency(rows, "python", "m", null);
  assert.equal(c.pAboveNull, null);
  assert.match(c.note, /not a competency claim/);
});

test("competency: unchecked rows never count", () => {
  const rows = [{ language: "go", model: "m", unchecked: true }, { language: "go", model: "m", unchecked: true }];
  assert.equal(competency(rows, "go", "m", { n: 12, passes: 0, rate: 0 }).n, 0);
});

test("competency: 4/4 against a 0/12 null is far above it; 0/4 is not", () => {
  const mk = (ok) => ({ language: "python", model: "m", callOk: ok, floorOk: true });
  const nul = { n: 12, passes: 0, rate: 0 };
  assert.ok(competency([mk(1), mk(1), mk(1), mk(1)], "python", "m", nul).pAboveNull < 0.01);
  assert.equal(competency([mk(0), mk(0), mk(0), mk(0)], "python", "m", nul).pAboveNull, 1);
});
