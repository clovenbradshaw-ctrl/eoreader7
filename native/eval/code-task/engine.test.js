// The EVA ground for the spreadsheet task: never shown to the mouth. Each
// test's title names, in brackets, the functions it holds to account, so a
// failure is attributed to a part of the program mechanically.
import test from "node:test";
import assert from "node:assert/strict";
import { tokenize, parse, expandRange, evaluate, parseRef, dependencies, evaluationOrder, computeGrid, formatGrid } from "./index.js";

const types = (src) => tokenize(src).map((t) => t.type).join(" ");

test("[tokenize] numbers, refs, names, operators, whitespace", () => {
  assert.equal(types("SUM(A1:B2) * 2.5"), "name op ref op ref op op number");
  const t = tokenize("b12+3");
  assert.deepEqual(t.map((x) => x.value), ["B12", "+", 3]);
});
test("[tokenize] an unknown character throws", () => {
  assert.throws(() => tokenize("A1 $ 2"), Error);
});
test("[parse] precedence and right-associative power", () => {
  const n = parse(tokenize("1 + 2 * 3 ^ 2 ^ 2"));
  assert.equal(n.type, "bin"); assert.equal(n.op, "+");
  assert.equal(n.right.type, "bin"); assert.equal(n.right.op, "*");
  const pow = n.right.right; assert.equal(pow.op, "^"); assert.equal(pow.right.op, "^");
});
test("[parse] calls, ranges, unary minus and parentheses", () => {
  const n = parse(tokenize("-SUM(A1:B2, (3))"));
  assert.equal(n.type, "neg");
  assert.equal(n.expr.type, "call"); assert.equal(n.expr.name, "SUM");
  assert.deepEqual(n.expr.args[0], { type: "range", from: "A1", to: "B2" });
  assert.deepEqual(n.expr.args[1], { type: "num", value: 3 });
});
test("[parse] a stray token throws", () => {
  assert.throws(() => parse(tokenize("1 + * 2")), Error);
});
test("[expandRange] a rectangle, row by row, either corner first", () => {
  assert.deepEqual(expandRange("A1", "B2"), ["A1", "B1", "A2", "B2"]);
  assert.deepEqual(expandRange("B2", "A1"), ["A1", "B1", "A2", "B2"]);
  assert.deepEqual(expandRange("Z1", "AA1"), ["Z1", "AA1"]);
});
test("[evaluate] arithmetic, refs and functions", () => {
  const fns = { SUM: (...xs) => xs.reduce((a, b) => a + b, 0) };
  const lookup = (r) => ({ A1: 2, B1: 3, A2: 4, B2: 5 })[r] ?? 0;
  assert.equal(evaluate(parse(tokenize("1 + 2 * 3")), lookup, fns), 7);
  assert.equal(evaluate(parse(tokenize("2 ^ 3 ^ 2")), lookup, fns), 512);
  assert.equal(evaluate(parse(tokenize("-A1 + SUM(A1:B2)")), lookup, fns), 12);
});
test("[evaluate] division by zero and an unknown function throw", () => {
  assert.throws(() => evaluate(parse(tokenize("1 / 0")), () => 0, {}), Error);
  assert.throws(() => evaluate(parse(tokenize("NOPE(1)")), () => 0, {}), Error);
});
test("[parseRef] columns in base 26, rows from 1", () => {
  assert.deepEqual(parseRef("A1"), { col: 0, row: 0 });
  assert.deepEqual(parseRef("AA10"), { col: 26, row: 9 });
  assert.throws(() => parseRef("1A"), Error);
});
test("[dependencies] refs and ranges, deduped, in order; a value has none", () => {
  assert.deepEqual(dependencies("=B1 + SUM(A1:A2) + B1"), ["B1", "A1", "A2"]);
  assert.deepEqual(dependencies("42"), []);
});
test("[evaluationOrder] every cell after what it depends on", () => {
  const order = evaluationOrder({ A1: "=B1+1", B1: "=C1*2", C1: "3", D1: "=A1+B1" });
  assert.ok(order.indexOf("C1") < order.indexOf("B1") && order.indexOf("B1") < order.indexOf("A1") && order.indexOf("A1") < order.indexOf("D1"), order.join(","));
  assert.equal(order.length, 4);
});
test("[evaluationOrder] a cycle is named", () => {
  assert.throws(() => evaluationOrder({ A1: "=B1", B1: "=A1" }), (e) => e instanceof Error && e.message.startsWith("cycle:") && e.message.includes("A1") && e.message.includes("B1"));
});
test("[computeGrid] values, formulas, built-ins and missing cells", () => {
  const v = computeGrid({ A1: "2", A2: "3", A3: "=SUM(A1:A2)", B1: "=A3*2", B2: "=IF(B1-10, 1, 2)", B3: "=AVG(A1:A2, 7)", C1: "hello", C2: "=D9 + 1" });
  assert.equal(v.A3, 5); assert.equal(v.B1, 10); assert.equal(v.B2, 2); assert.equal(v.B3, 4); assert.equal(v.C1, "hello"); assert.equal(v.C2, 1);
});
test("[computeGrid] custom functions and MIN/MAX", () => {
  const v = computeGrid({ A1: "5", A2: "1", A3: "=MAX(A1:A2) - MIN(A1:A2)", A4: "=DOUBLE(A3)" }, { MIN: Math.min, MAX: Math.max, DOUBLE: (x) => 2 * x });
  assert.equal(v.A3, 4); assert.equal(v.A4, 8);
});
test("[formatGrid] a padded table with letters and row numbers", () => {
  const out = formatGrid({ A1: 2, B1: 2.5, A2: 0.3333333, B2: "hello" });
  assert.equal(out, ["     A     B", "1    2   2.5", "2 0.33 hello"].join("\n"));
});
test("[formatGrid] empty cells stay blank", () => {
  const out = formatGrid({ A1: 1, B2: 22 });
  assert.equal(out, ["  A  B", "1 1   ", "2   22"].join("\n").split("\n").map((l) => l.trimEnd()).join("\n"));
});
