// ═══ LOVELACE ═══ the canonical stage, pinned: each transformation is a typed, evidenced, semantics-preserving reading of a SUGGESTION;
// what cannot be resolved is a finding, never a guess; and a wrong-looking rewrite is refused by construction (objects literals, assignments).
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { canonicalize, constReassigned, rewriteKey, adoptIf, CANONICAL_SCHEMA } from "./code-canonical.js";
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
