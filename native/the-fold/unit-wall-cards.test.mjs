// ═══ LOVELACE · TEACH IT TO FISH ═══ the cards beside a unit, behind the same wall (ledger row 13).
// A unit CALLS a verified operation instead of re-implementing it; a near name resolves to the one card it means; a name that
// matches nothing stays a ReferenceError (and is recorded as a card still to be made out); a unit's own declaration wins.
import test from "node:test";
import assert from "node:assert/strict";
import { loadUnit, cardPrelude } from "./unit-wall.mjs";
import { resolveCard, CARD_NAMES } from "../organs/cards.js";
import { unitPrompt, contractHash } from "./app-units.mjs";

test("a unit calls a card by its own name — nothing declared, nothing imported", () => {
  const f = loadUnit(`function f(x) { return { f: celsiusToFahrenheit(x.c), dir: compass16(x.deg), t: padTime(x.t), label: joinPresent([x.a, x.b]) }; }`, "f");
  assert.deepEqual(f({ c: 100, deg: 172.8, t: "300", a: "London", b: undefined }), { f: 212, dir: "S", t: "03:00", label: "London" });
  assert.deepEqual(f.cardsUsed().sort(), ["celsiusToFahrenheit", "compass16", "joinPresent", "padTime"]);
});

test("a near name resolves to the ONE card it means, and the binding is recorded with its basis", () => {
  const f = loadUnit(`function f(x) { return { a: cToF(x.c), b: toFahrenheit(x.c), c: round(x.v, 1), d: haversine(0, 0, 0, 180) > 20000 }; }`, "f");
  assert.deepEqual(f({ c: 100, v: 2.26 }), { a: 212, b: 212, c: 2.3, d: true });
  const res = f.resolutions().filter((r) => r.kind === "card");
  assert.deepEqual(res.map((r) => [r.asked, r.real]).sort(), [["cToF", "celsiusToFahrenheit"], ["haversine", "haversineKm"], ["round", "roundTo"], ["toFahrenheit", "celsiusToFahrenheit"]]);
  assert.ok(res.every((r) => r.basis && r.tier >= 3));
});

test("an AMBIGUOUS name binds nothing: `mph` starts three conversions and names none — the read is an error, recorded with its candidates", () => {
  const f = loadUnit(`function f(x) { return mph(x.v); }`, "f");
  assert.throws(() => f({ v: 1 }), /mph is not defined/);
  const r = f.resolutions().find((x) => x.asked === "mph");
  assert.equal(r.ambiguous, true); assert.deepEqual(r.candidates.sort(), ["kmhToMph", "mphToKmh", "msToMph"]);
});

test("an UNKNOWN name binds nothing and is recorded: the operation the model reached for that we do not have yet", () => {
  const f = loadUnit(`function f(x) { return degToCompass(x.d); }`, "f");
  assert.throws(() => f({ d: 10 }), /degToCompass is not defined/);
  const r = f.resolutions().find((x) => x.asked === "degToCompass");
  assert.equal(r.unresolved, true); assert.equal(r.kind, "card");
});

test("a unit's OWN declaration of a card's name wins — as a function, and as a const (no redeclaration error)", () => {
  const own = loadUnit(`function compass16(d) { return "mine:" + d; }\nfunction f(x) { return compass16(x.d); }`, "f");
  assert.equal(own({ d: 90 }), "mine:90");
  const k = loadUnit(`const padTime = (t) => "p" + t;\nfunction f(x) { return padTime(x.t); }`, "f");
  assert.equal(k({ t: 5 }), "p5");
  assert.ok(!cardPrelude(`const padTime = 1; function f() {}`).prelude.includes("function padTime"), "a declared name is left out of the prelude");
});

test("the cards are not a hole in the wall: still an empty context (no process, no require, no fetch)", () => {
  const f = loadUnit(`function f() { return [typeof process, typeof require, typeof fetch, typeof celsiusToFahrenheit]; }`, "f");
  assert.deepEqual(f(), ["undefined", "undefined", "undefined", "function"]);
});

test("with cards OFF the unit sees none — the control arm for measuring what the cards bought", () => {
  const f = loadUnit(`function f(x) { return compass16(x.d); }`, "f", { cards: false });
  assert.throws(() => f({ d: 90 }), /compass16 is not defined/);
});

test("the cards and the key resolver work together in one unit: a slipped KEY and a near-named CALL", () => {
  const f = loadUnit(`function f(loc) { return { where: joinPresent([loc.name, loc.region, loc.country]), tz: loc.tz, f: cToF(loc.temperature) }; }`, "f", { resolve: { declared: { tz: "timezone" } } });
  assert.deepEqual(f({ name: "London", region: undefined, country: "UK", timezone: "Europe/London", temperature: 10 }), { where: "London, UK", tz: "Europe/London", f: 50 });
  const kinds = new Set(f.resolutions().map((r) => r.kind ?? "key"));
  assert.ok(kinds.has("card") && kinds.has("key"));
});

test("CONTROL built to fail: a resolver that bound ANY free name to its nearest card would pass a wrong unit; this one does not", () => {
  // the nearest-by-spelling rule would send `distanceKm` to haversineKm and `mph` to mphToKmh; both must stay unbound
  for (const n of ["distanceKm", "mph", "kmh", "celsius", "to", "degToCompass"]) assert.ok(!resolveCard(n, CARD_NAMES).resolved, `${n} must not resolve`);
  // and an unrelated schema: the same names resolve to nothing in a list that does not hold those cards
  assert.ok(!resolveCard("cToF", ["parseInvoice", "totalPrice"]).resolved);
});

test("the prompt shows the cards and the contract hash moves with them; a contract can opt out", () => {
  const contract = { name: "f", params: ["x"], doc: "d", returns: "{}", runs: [], sampleJson: { a: 1 } };
  assert.match(unitPrompt(contract), /These functions already exist/);
  assert.match(unitPrompt(contract), /- celsiusToFahrenheit:/);
  assert.doesNotMatch(unitPrompt({ ...contract, cards: false }), /already exist/);
  assert.notEqual(contractHash(contract), contractHash({ ...contract, cards: false }));
});

test("a failing unit that never reads a parameter is told so; a passing one is never failed for it", async () => {
  const { unusedParams, testUnit } = await import("./app-units.mjs");
  assert.deepEqual(unusedParams(`function f(a, units) { return { t: a.c }; }`, "f", ["a", "units"]), ["units"]);
  assert.deepEqual(unusedParams(`function f(a, units) { return units === "imperial" ? celsiusToFahrenheit(a.c) : a.c; }`, "f", ["a", "units"]), []);
  assert.deepEqual(unusedParams(`const f = (a, units) => a.c * 2;`, "f", ["a", "units"]), ["units"]);
  assert.deepEqual(unusedParams(`const f = (a, units) => units ? a.c : 0;`, "f", ["a", "units"]), [], "an arrow expression body counts");
  assert.deepEqual(unusedParams(`function f(a, units) { return a.units; }`, "f", ["a", "units"]), ["units"], "a property named units is not the parameter");
  const contract = { name: "f", params: ["a", "units"], doc: "d", returns: "{}", sampleJson: { c: 10 }, runs: [
    { label: "metric", args: () => [{ c: 10 }, "metric"], check: (o) => (o.t === 10 ? [] : [`t is ${o.t}`]) },
    { label: "imperial", args: () => [{ c: 10 }, "imperial"], check: (o) => (o.t === 50 ? [] : [`t is ${o.t}, the recorded data says 50`]) },
  ] };
  const ignoring = testUnit(`function f(a, units) { return { t: a.c }; }`, contract);
  assert.equal(ignoring.ok, false); assert.match(ignoring.failures[0], /never reads its parameter `units`/);
  const reading = testUnit(`function f(a, units) { return { t: units === "imperial" ? cToF(a.c) : a.c }; }`, contract);
  assert.equal(reading.ok, true); assert.deepEqual(reading.failures, []);
  const legit = testUnit(`function f(a, units) { return { t: 10 }; }`, { ...contract, runs: [contract.runs[0]] });
  assert.equal(legit.ok, true, "passes with a parameter unread: never failed for it");
});

test("constReassigned names the const the engine's message does not; a fresh binding or a comparison is not a reassignment", async () => {
  const { constReassigned } = await import("./app-units.mjs");
  assert.deepEqual(constReassigned(`function f(x) { const at = x.d; at = at + "T"; return at; }`), ["at"]);
  assert.deepEqual(constReassigned(`function f(x) { const n = 0; n += 1; const m = 1; m++; return n + m; }`).sort(), ["m", "n"]);
  assert.deepEqual(constReassigned(`function f(x) { const a = 1; if (a === 1 && a == 1) return a >= 1 ? a : 0; return x.a; }`), []);
  assert.deepEqual(constReassigned(`function f(x) { const total = 1; const o = { total: 2 }; o.total = 3; const g = (total2) => total2; return total + o.total; }`), [], "a property and an arrow are not a reassignment");
  assert.deepEqual(constReassigned(`function f(x) { let at = 1; at = 2; return at; }`), [], "let is fine");
  const { testUnit } = await import("./app-units.mjs");
  const contract = { name: "f", params: ["x"], doc: "d", returns: "{}", sampleJson: {}, runs: [{ label: "r", args: () => [{ d: "a" }], check: () => [] }] };
  assert.equal(testUnit(`function f(x) { const at = x.d; at = at + "T"; return { at }; }`, contract).ok, false, "the engine throws; the hint names the variable");
  const res = testUnit(`function f(x) { const at = x.d; at = at + "T"; return { at }; }`, contract);
  assert.match(res.failures[0], /`at` is declared with const/);
});

test("repair styles: `edit` shows the previous code beside the failures; `fresh` shows the failures as requirements and NOT the code", async () => {
  const { unitPrompt } = await import("./app-units.mjs");
  const contract = { name: "f", params: ["x"], doc: "d", returns: "{}", runs: [], sampleJson: { a: 1 } };
  const args = { failures: ["address is null, the recorded data says \"Grosvenor Road\""], previous: "function f(x) { return MARKER_PREVIOUS_CODE; }" };
  const edit = unitPrompt(contract, args);
  assert.match(edit, /MARKER_PREVIOUS_CODE/); assert.match(edit, /Grosvenor Road/);
  const fresh = unitPrompt(contract, { ...args, repair: "fresh" });
  assert.doesNotMatch(fresh, /MARKER_PREVIOUS_CODE/); assert.match(fresh, /Grosvenor Road/); assert.match(fresh, /from the start/);
  assert.equal(unitPrompt(contract, { repair: "fresh" }), unitPrompt(contract), "with no failures the two styles are the same first draw");
});
