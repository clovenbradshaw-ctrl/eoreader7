// ═══ LOVELACE · TEACH IT TO FISH ═══ cards.js is pinned against values written down HERE, independent of the cards.
// A card is an operation made out once; if its value were only ever compared with itself the test would prove nothing.
// Each expected number comes from a published table or from arithmetic done by hand in the comment beside it.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { CARDS, CARD_NAMES, CARDS_SCHEMA, cardSource, cardsDoc, freeCalls } from "./cards.js";

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test("the library lists what it holds, once each, with a doc for every card", () => {
  assert.equal(CARDS_SCHEMA, "EOCards@1");
  assert.equal(new Set(CARD_NAMES).size, CARD_NAMES.length);
  for (const n of CARD_NAMES) { assert.equal(typeof CARDS[n].fn, "function", n); assert.ok(CARDS[n].doc.length > 10, n); assert.equal(CARDS[n].fn.name, n, `the function is named for its key: ${n}`); }
  assert.match(cardsDoc(), /celsiusToFahrenheit/);
});

test("temperature: the two fixed points and a body (0C=32F, 100C=212F, 37C=98.6F, -40 is both)", () => {
  near(CARDS.celsiusToFahrenheit.fn(0), 32); near(CARDS.celsiusToFahrenheit.fn(100), 212); near(CARDS.celsiusToFahrenheit.fn(37), 98.6, 1e-9); near(CARDS.celsiusToFahrenheit.fn(-40), -40);
  near(CARDS.fahrenheitToCelsius.fn(32), 0); near(CARDS.fahrenheitToCelsius.fn(212), 100); near(CARDS.fahrenheitToCelsius.fn(-40), -40);
  near(CARDS.celsiusToFahrenheit.fn("17"), 62.6); // a numeric string is a number
});

test("speed: 10 m/s = 36 km/h = 22.369 mph; 100 km/h = 62.137 mph; 60 mph = 96.56 km/h", () => {
  near(CARDS.msToKmh.fn(10), 36); near(CARDS.msToMph.fn(10), 22.369362920544, 1e-9);
  near(CARDS.kmhToMph.fn(100), 62.13711922373339, 1e-9); near(CARDS.mphToKmh.fn(60), 96.56064, 1e-9);
  near(CARDS.mphToKmh.fn(CARDS.kmhToMph.fn(123.4)), 123.4, 1e-9); // the pair inverts
});

test("distance: 1 mile = 1.609344 km exactly; a 42.195 km marathon is 26.2188 miles; the pair inverts — and the direction is the point (a km figure DIVIDES)", () => {
  near(CARDS.milesToKm.fn(1), 1.609344, 1e-12); near(CARDS.kmToMiles.fn(1.609344), 1, 1e-12);
  near(CARDS.kmToMiles.fn(42.195), 26.21875, 1e-4); near(CARDS.milesToKm.fn(26.21875), 42.195, 1e-3);
  near(CARDS.milesToKm.fn(CARDS.kmToMiles.fn(5540)), 5540, 1e-9);
  assert.ok(CARDS.kmToMiles.fn(100) < 100 && CARDS.milesToKm.fn(100) > 100, "fewer miles than km for one distance, never more");
  near(CARDS.kmToMiles.fn("8"), 4.970969537898672, 1e-9);
});

test("compass16: each of the sixteen points at its own bearing, the seam at 360, negatives, and the half-step rounding", () => {
  const rose = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  rose.forEach((name, i) => assert.equal(CARDS.compass16.fn(i * 22.5), name, `${i * 22.5} is ${name}`));
  assert.equal(CARDS.compass16.fn(360), "N"); assert.equal(CARDS.compass16.fn(350), "N"); assert.equal(CARDS.compass16.fn(-90), "W");
  assert.equal(CARDS.compass16.fn(172.8), "S"); // the recorded MET Norway bearing that a small model turned into index 8 instead of "S"
  assert.equal(CARDS.compass16.fn(11.24), "N"); assert.equal(CARDS.compass16.fn(11.26), "NNE"); // the boundary is 11.25
});

test("padTime: the unpadded forms wttr.in records; anything that is not a time is null, not garbage", () => {
  assert.equal(CARDS.padTime.fn(0), "00:00"); assert.equal(CARDS.padTime.fn("300"), "03:00"); assert.equal(CARDS.padTime.fn("1200"), "12:00"); assert.equal(CARDS.padTime.fn(2100), "21:00"); assert.equal(CARDS.padTime.fn("45"), "00:45");
  assert.equal(CARDS.padTime.fn("noon"), null); assert.equal(CARDS.padTime.fn(""), null); assert.equal(CARDS.padTime.fn("123456"), null);
});

test("joinPresent: a missing part leaves no 'undefined', no stray separator, and the separator is the caller's", () => {
  assert.equal(CARDS.joinPresent.fn(["London", undefined, "United Kingdom"]), "London, United Kingdom");
  assert.equal(CARDS.joinPresent.fn(["Paris", "", null, "France"], " / "), "Paris / France");
  assert.equal(CARDS.joinPresent.fn([undefined, null, "  "]), "");
  assert.equal(CARDS.joinPresent.fn("not a list"), "");
  assert.equal(CARDS.joinPresent.fn([0, "x"]), "0, x"); // zero is present
});

test("haversineKm: London to Paris is about 344 km (the published great-circle figure), and the same point is 0", () => {
  const d = CARDS.haversineKm.fn(51.5074, -0.1278, 48.8566, 2.3522);
  assert.ok(d > 340 && d < 348, String(d));
  near(CARDS.haversineKm.fn(10, 10, 10, 10), 0);
  near(CARDS.haversineKm.fn(0, 0, 0, 180), Math.PI * 6371, 1e-6); // half the equator: pi * R
  near(CARDS.haversineKm.fn(51.5, -0.12, 48.85, 2.35), CARDS.haversineKm.fn(48.85, 2.35, 51.5, -0.12), 1e-9); // symmetric
});

test("roundTo and toNumber: the two things a small model gets wrong about numbers", () => {
  assert.equal(CARDS.roundTo.fn(3.14159, 2), 3.14); assert.equal(CARDS.roundTo.fn(2.5), 3); assert.equal(CARDS.roundTo.fn("7.26", 1), 7.3);
  assert.equal(CARDS.toNumber.fn("17.5"), 17.5); assert.equal(CARDS.toNumber.fn(0), 0); assert.equal(CARDS.toNumber.fn(""), null); assert.equal(CARDS.toNumber.fn("  "), null); assert.equal(CARDS.toNumber.fn("abc"), null); assert.equal(CARDS.toNumber.fn(undefined), null); assert.equal(CARDS.toNumber.fn(null), null); assert.equal(CARDS.toNumber.fn(true), null); assert.equal(CARDS.toNumber.fn([]), null); assert.equal(CARDS.toNumber.fn(NaN), null);
});

test("CONTROL built to fail: the wrong-index compass and the wrong-unit temperature are caught by these same values", () => {
  const wrongCompass = (deg) => ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"][Math.round(deg / 45) % 16]; // 8 directions' spacing over a 16-point table
  assert.notEqual(wrongCompass(172.8), "S"); // what a small model produced: a number or the wrong point
  const noPad = (t) => String(t) + ":00"; // `0000:00`'s cousin
  assert.notEqual(noPad("300"), "03:00");
  const naiveJoin = (p) => p.join(", "); // prints "undefined"
  assert.notEqual(naiveJoin(["London", undefined, "UK"]), "London, UK");
  const swappedTemp = (c) => (c * 5) / 9 + 32; // the Fahrenheit formula the wrong way round
  assert.notEqual(swappedTemp(100), 212);
});

test("the cards run in an EMPTY vm context: self-contained, no reference to anything outside themselves", () => {
  const ctx = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(cardSource(), ctx, { timeout: 1000 });
  const out = vm.runInContext(`JSON.stringify([celsiusToFahrenheit(100), compass16(172.8), padTime("300"), joinPresent(["a", undefined, "b"]), roundTo(3.14159, 2), toNumber("x"), Math.round(haversineKm(51.5074, -0.1278, 48.8566, 2.3522))])`, ctx);
  assert.deepEqual(JSON.parse(out), [212, "S", "03:00", "a, b", 3.14, null, 344]);
});

test("freeCalls: the names a unit calls that nothing declares — the ones the resolver is asked about", () => {
  const code = `function f(x) { const t = cToF(x.temp); return { t: roundTo(t, 1), d: compass(x.dir), ok: Number(x.v) > 0, s: [1,2].map((n) => n * 2), k: Math.max(1, 2) }; }`;
  assert.deepEqual(freeCalls(code).sort(), ["cToF", "compass"]); // roundTo is a card, Number/Math are globals, the arrow and f are declared
  assert.deepEqual(freeCalls(`function g(a) { function helper(b) { return b; } return helper(a) + JSON.stringify(a).length; }`), []);
  assert.deepEqual(freeCalls(`function g(a) { return a.method(1).other(2); }`), [], "a property call is not a free call");
  assert.deepEqual(freeCalls(`function h(a) { if (a) { return unknownThing(a); } while (a) { a--; } }`), ["unknownThing"], "keywords are not calls");
});

// ---- which operations a task's own words name ----
import { cardsFor, CARD_RELEVANCE_FLOOR } from "./cards.js";
const task = (doc, returns = "", notes = "") => ({ doc, returns, notes });

test("cardsFor: the operation a task's own words name is offered; one it does not name is not", () => {
  const leg = task("Turn two airports into one flight leg: its route label and its length in kilometres and miles.", "an object { route, km, miles }\n  km = the great-circle distance in kilometres rounded to one decimal, miles = that same distance in statute miles rounded to one decimal", "Earth radius 6371 km. Round only at the end, from the unrounded distance.");
  const names = cardsFor(leg).map((c) => c.name);
  assert.ok(names.includes("haversineKm") && names.includes("roundTo"), names.join());
  assert.ok(!names.includes("kmhToMph") && !names.includes("compass16") && !names.includes("padTime"), "no speed conversion, no compass, no padding for a distance");
  assert.ok(names.includes("kmToMiles"), "a task that asks for the same distance in miles is offered the distance conversion — the direction a small model reversed (km * 1.609344) when it had to write it");
  const bus = task("Turn one bus stop's timetable into the stop, its route, and its departure times as HH:MM.", "times = every departure time as \"HH:MM\"", "The source writes each time WITHOUT padding: 0 means 00:00, 330 means 03:30.");
  assert.deepEqual(cardsFor(bus).map((c) => c.name), ["padTime"]);
});

test("cardsFor: a task that names no operation is offered NONE (the prompt carries nothing it does not need) — a generic word like `name` offers nothing, because the match is against what a card is FOR", () => {
  assert.deepEqual(cardsFor(task("Turn a commit log into its most active authors.", "an array of at most three objects { name, commits }", "An author is identified by author.name.")), []);
  assert.deepEqual(cardsFor(task("Pick the to-do items that are due soon.", "an array of titles", "Dates are ISO YYYY-MM-DD. Count calendar days (months and leap years included).")), []);
});

test("cardsFor: a word many cards share says little about any one — `kilometres` alone does not offer a speed conversion for a distance task", () => {
  const names = cardsFor(task("the distance in kilometres and miles")).map((c) => c.name);
  assert.ok(!names.includes("kmhToMph") && !names.includes("msToKmh"), names.join());
  assert.equal(CARD_RELEVANCE_FLOOR, 1);
});

test("cardsFor is ranked and explained: each offered card says which words of the task named it", () => {
  const r = cardsFor(task("round the result to 2 decimals", "a number rounded to one decimal"));
  assert.equal(r[0].name, "roundTo"); assert.ok(r[0].words.length >= 2 && r[0].score >= CARD_RELEVANCE_FLOOR);
});

test("every card declares its tags, and a card's own purpose words offer it", () => {
  for (const n of CARD_NAMES) assert.ok(CARDS[n].tags && CARDS[n].tags.split(/\s+/).length >= 3, `${n} declares what it is for`);
  assert.deepEqual(cardsFor(task("convert the bearing in degrees to a compass direction")).map((c) => c.name), ["compass16"]);
  assert.deepEqual(cardsFor(task("pad the unpadded clock time as hh:mm")).map((c) => c.name), ["padTime"]);
});
