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
