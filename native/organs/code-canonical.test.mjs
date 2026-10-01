// ═══ LOVELACE ═══ the canonical stage, pinned: each transformation is a typed, evidenced, semantics-preserving reading of a SUGGESTION;
// what cannot be resolved is a finding, never a guess; and a wrong-looking rewrite is refused by construction (objects literals, assignments).
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { canonicalize, constReassigned, rewriteKey, adoptIf, redeclaredToAssignment, dropShadowedCards, resolveShorthand, jsUnitEnd, CANONICAL_SCHEMA } from "./code-canonical.js";
import { cardSource } from "./cards.js";

const run = (code, fn, ...args) => { const ctx = vm.createContext(Object.create(null)); vm.runInContext(`${cardSource()}\n${code}\nglobalThis.__f = ${fn};`, ctx); return JSON.parse(JSON.stringify(ctx.__f(...args))); };

test("const_to_let: the program that threw now runs, and the transformation names the variable and why", () => {
  const raw = `function f(x) { const total = 0; total = total + x.a; const n = 1; n += 1; return { total, n }; }`;
  assert.throws(() => run(raw, "f", { a: 2 }), /constant/);
  const c = canonicalize(raw);
  assert.deepEqual(c.transformations.map((t) => [t.kind, t.name]).sort(), [["const_to_let", "n"], ["const_to_let", "total"]]);
  assert.deepEqual(run(c.code, "f", { a: 2 }), { total: 2, n: 2 });
  assert.equal(c.schema, CANONICAL_SCHEMA); assert.equal(c.changed, true);
});

test("const_to_let leaves alone: a const never reassigned, a comparison, a property write, the same name in another scope", () => {
  assert.equal(canonicalize(`function f(x) { const a = 1; const o = {}; o.a = 2; if (a === 1 && a == 1) return a >= 1 ? a : 0; }`).changed, false);
  assert.deepEqual(constReassigned(`const a = 1;\nfunction g() { return a; }\nconst b = (() => { const a = 2; return a; })();`), []);
});

test("call_resolved: a near name becomes the one card it names, with its tier and basis; ambiguous and unknown names are findings", () => {
  const raw = `function f(x) { return { a: cToF(x.c), b: toFahrenheit(x.c), c: round(x.v, 1), d: mph(x.k), e: degToCompass(x.d) }; }`;
  const c = canonicalize(raw);
  assert.deepEqual(c.transformations.filter((t) => t.kind === "call_resolved").map((t) => [t.from, t.to]).sort(), [["cToF", "celsiusToFahrenheit"], ["round", "roundTo"], ["toFahrenheit", "celsiusToFahrenheit"]]);
  assert.ok(c.transformations.every((t) => t.basis));
  assert.deepEqual(c.findings.map((f) => [f.kind, f.name]).sort(), [["ambiguous_call", "mph"], ["unresolved_call", "degToCompass"]]);
  assert.match(c.code, /celsiusToFahrenheit\(x\.c\)/); assert.match(c.code, /mph\(x\.k\)/, "an ambiguous name is left exactly as written");
});

test("call_resolved reaches a nested call and every occurrence of it: roundTo(cToF(x), 1) + cToF(y)", () => {
  const c = canonicalize(`function f(x, y) { return roundTo(cToF(x), 1) + cToF(y) + fmt(cToF(cToF(x))); }`);
  assert.equal(c.code, `function f(x, y) { return roundTo(celsiusToFahrenheit(x), 1) + celsiusToFahrenheit(y) + fmt(celsiusToFahrenheit(celsiusToFahrenheit(x))); }`);
  assert.deepEqual(c.findings.map((f) => f.name), ["fmt"]);
});

test("a name another unit of the same file declares is not a free call: it is never resolved to a card that resembles it, and never a finding", () => {
  const raw = `function fmtRow(x) { return toFahrenheit(x.c) + round(x.v, 1) + mystery(x); }`;
  const alone = canonicalize(raw);
  assert.ok(alone.transformations.some((t) => t.from === "toFahrenheit"), "alone, toFahrenheit would be read as the card celsiusToFahrenheit");
  const inFile = canonicalize(raw, { declared: ["toFahrenheit"] });
  assert.ok(!inFile.transformations.some((t) => t.from === "toFahrenheit") && /toFahrenheit\(x\.c\)/.test(inFile.code), "a sibling's own name stays as written");
  assert.ok(inFile.transformations.some((t) => t.from === "round"), "a name nothing declares is still resolved");
  assert.deepEqual(inFile.findings.map((f) => f.name), ["mystery"]);
});

test("key_resolved: the wall's resolution is written INTO the code — property reads, bracket reads and destructuring — and a canonical function needs no run-time resolver", () => {
  const raw = `function f(loc) { const { tz, lat: la } = loc; return { zone: loc.tz, z2: loc["tz"], t: tz, la }; }`;
  const c = canonicalize(raw, { resolutions: [{ asked: "tz", real: "timezone", tier: 1, basis: "declared by the contract's worked example" }] });
  assert.match(c.code, /const \{ timezone: tz, lat: la \} = loc/); assert.match(c.code, /loc\.timezone/); assert.match(c.code, /loc\["timezone"\]/);
  assert.deepEqual(run(c.code, "f", { timezone: "Europe/London", lat: 1 }), { zone: "Europe/London", z2: "Europe/London", t: "Europe/London", la: 1 });
  assert.deepEqual(c.transformations.map((t) => [t.kind, t.from, t.to, t.tier]), [["key_resolved", "tz", "timezone", 1]]);
});

test("rewriteKey is NOT an object literal or an assignment: output keys and writes keep their names", () => {
  const out = rewriteKey(`function f(x) { const r = {}; r.tz = x.tz; return { tz: x.tz, tz2: 1 }; }`, "tz", "timezone");
  assert.match(out, /r\.tz = x\.timezone/, "the write target is the output's");
  assert.match(out, /return \{ tz: x\.timezone, tz2: 1 \}/, "the object literal's key is the output's");
});

test("a suggestion with nothing to resolve comes back unchanged, and nothing the transformations do not name is touched", () => {
  const raw = `function f(x) { return x.a + x.b; }`;
  const c = canonicalize(raw); assert.equal(c.changed, false); assert.equal(c.code, raw); assert.deepEqual(c.transformations, []);
});

test("adoptIf: a canonical form is adopted only where it does at least as well as the suggestion did", () => {
  assert.equal(adoptIf(3, 5), true); assert.equal(adoptIf(3, 3), true); assert.equal(adoptIf(3, 2), false);
});

test("redeclared_to_assignment: a block pasted twice declares the same names twice — the engine names the identifier, the later declaration becomes the assignment, and the first const (now assigned) becomes a let", () => {
  const raw = `function f(d) {\n  const pressure = Math.round(d.p);\n  const humidity = Math.round(d.h);\n  const pressure = Math.round(d.p);\n  const humidity = Math.round(d.h);\n  return { pressure, humidity };\n}`;
  assert.throws(() => new Function(raw), /already been declared/);
  const c = canonicalize(raw);
  assert.deepEqual(c.transformations.map((t) => [t.kind, t.name]).sort(), [["const_to_let", "humidity"], ["const_to_let", "pressure"], ["redeclared_to_assignment", "humidity"], ["redeclared_to_assignment", "pressure"]]);
  assert.deepEqual(run(c.code, "f", { p: 1013.4, h: 61.6 }), { pressure: 1013, humidity: 62 });
});

test("redeclared_to_assignment is verified by re-compiling: a name declared in a NESTED scope is left alone, an error it cannot fix is left as it was, and a parameter re-declared as a let becomes an assignment", () => {
  const nested = `function f(a) { const x = 1; if (a) { const x = 2; return x; } return x; }`;
  assert.equal(redeclaredToAssignment(nested).code, nested, "the engine does not complain about shadowing, so nothing is rewritten");
  const unfixable = `function f(a) { const x = 1; const x; return x; }`;
  assert.equal(redeclaredToAssignment(unfixable).code, unfixable);
  const param = `function f(x) { let x = x + 1; return x; }`;
  assert.equal(new Function(`return (${redeclaredToAssignment(param).code.replace(/^function f/, "function f")})`)()(1), 2);
  assert.deepEqual(redeclaredToAssignment(param).names, ["x"]);
  assert.deepEqual(redeclaredToAssignment(`function g() { return 1; }`), { code: `function g() { return 1; }`, names: [] });
});

test("card_shadow_dropped: an operation the unit was GIVEN and then declared again (an arrow const, or a function after its use) is dropped, so the verified one is the one that runs", () => {
  const raw = `function orderTotal(order) {\n  const parseMoney = x => parseFloat(x.replace(/,/g, ''));\n  return order.items.reduce((s, i) => s + parseMoney(i.price) * Number(i.qty), 0);\n}\n\nfunction roundTo(x, places) {\n  const factor = Math.pow(10, places);\n  return Math.round(x * factor) / factor;\n}`;
  const c = canonicalize(raw, { offered: ["parseMoney", "roundTo"] });
  assert.deepEqual(c.transformations.filter((t) => t.kind === "card_shadow_dropped").map((t) => t.name).sort(), ["parseMoney", "roundTo"]);
  assert.doesNotMatch(c.code, /x\.replace|Math\.pow/); assert.match(c.code, /parseMoney\(i\.price\)/);
  assert.equal(run(c.code, "orderTotal", { items: [{ price: "$1,234.50", qty: "2" }, { price: 5, qty: 1 }] }), 2474, "the card reads '$1,234.50' and a plain number; the hand-written one read neither");
});

test("card_shadow_dropped is for the names the prompt GAVE: a card the unit was not offered, and a helper of its own, are left exactly as written", () => {
  const raw = `function f(x) {\n  const roundTo = (v) => Math.round(v);\n  const helper = (v) => v + 1;\n  return roundTo(helper(x));\n}`;
  assert.equal(dropShadowedCards(raw, []).code, raw, "not offered, not dropped");
  const c = dropShadowedCards(raw, ["roundTo", "parseMoney"]);
  assert.deepEqual(c.names, ["roundTo"]); assert.match(c.code, /const helper/); assert.doesNotMatch(c.code, /const roundTo/);
});

test("a statement end is found past braces, strings, template literals, comments and an arrow's own expression", () => {
  const src = "const a = (x) => x + 1; const b = 2;";
  assert.equal(src.slice(0, jsUnitEnd(src, 0)), "const a = (x) => x + 1;");
  const blk = "function f() { const s = \"}\"; /* } */ return `{${1}}`; }\nconst c = 3;";
  assert.equal(blk.slice(0, jsUnitEnd(blk, 0)), "function f() { const s = \"}\"; /* } */ return `{${1}}`; }");
});

test("shorthand_resolved: the contract fixes the output keys, so `return { unique, longest }` over `uniqueWords` and `longestWord` means unique: uniqueWords, longest: longestWord", () => {
  const raw = `function wordStats(text) {\n  const words = text.split(" ");\n  const uniqueWords = new Set(words).size;\n  const longestWord = words.reduce((a, w) => (w.length > a.length ? w : a), "");\n  return { words: words.length, unique, longest };\n}`;
  assert.throws(() => run(raw, "wordStats", "a bb a"), /unique is not defined/);
  const c = canonicalize(raw);
  assert.deepEqual(c.transformations.filter((t) => t.kind === "shorthand_resolved").map((t) => [t.from, t.to]), [["unique", "uniqueWords"], ["longest", "longestWord"]]);
  assert.deepEqual(run(c.code, "wordStats", "a bb a"), { words: 3, unique: 2, longest: "bb" });
});

test("shorthand_resolved leaves alone: a name that IS declared, a destructured one, a global, a card; and names two locals both abbreviate it cannot choose between — a finding, not a guess", () => {
  const ok = `function f(o) { const { a, b } = o; const total = a + b; const n = 1; return { a, b, total, n, undefined }; }`;
  assert.equal(resolveShorthand(ok).code, ok); assert.deepEqual(resolveShorthand(ok).resolved, []);
  const amb = `function f(x) { const userCount = x.length; const userNames = x; return { user }; }`;
  const r = resolveShorthand(amb);
  assert.deepEqual(r.resolved, []); assert.equal(r.code, amb); assert.deepEqual(r.unresolved.map((u) => u.name), ["user"]);
  assert.deepEqual(canonicalize(amb).findings.map((f) => f.kind), ["unresolved_name"]);
  const none = `function f(x) { const total = 1; return { ultraviolet }; }`;
  assert.deepEqual(resolveShorthand(none).unresolved.map((u) => u.name), ["ultraviolet"]);
});
