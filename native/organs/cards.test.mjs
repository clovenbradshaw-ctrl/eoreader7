// ═══ LOVELACE · TEACH IT TO FISH ═══ cards.js is pinned against values written down HERE, independent of the cards.
// A card is an operation made out once; if its value were only ever compared with itself the test would prove nothing.
// Each expected number comes from a published table or from arithmetic done by hand in the comment beside it.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { CARDS, CARD_NAMES, CARDS_SCHEMA, cardSource, cardsDoc, freeCalls, resolveCard } from "./cards.js";

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

test("freeCalls sees a call nested inside another call: `roundTo(cToF(x))` has TWO calls and the inner one is the free one (a scan that consumed the `(` before each name hid every nested call)", () => {
  assert.deepEqual(freeCalls(`function f(x) { return roundTo(cToF(x.c), 1) + wrap(pad(x.t), mph(x.k)); }`).sort(), ["cToF", "mph", "pad", "wrap"]);
  assert.deepEqual(freeCalls(`function f(x) { return a.b(c(x)) + d(e(f2(x))); }`).sort(), ["c", "d", "e", "f2"]);
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
  assert.deepEqual(cardsFor(task("Group the to-do items by their owner.", "an object mapping each owner to the titles they own", "Owners are compared as written.")), []);
});

test("cardsFor: a word many cards share says little about any one — `kilometres` alone does not offer a speed conversion for a distance task", () => {
  const names = cardsFor(task("the distance in kilometres and miles")).map((c) => c.name);
  assert.ok(!names.includes("kmhToMph") && !names.includes("msToKmh"), names.join());
  assert.equal(CARD_RELEVANCE_FLOOR, 1);
});

test("cardsFor: the new operations are offered by what they are FOR — money amounts, calendar days, words — and a task that only mentions a date, a price or a word in passing is not enough", () => {
  const names = (...a) => cardsFor(task(...a)).map((c) => c.name);
  assert.deepEqual(names("Pick the to-do items that are due soon.", "an array of titles", "Dates are ISO YYYY-MM-DD. Count calendar days (months and leap years included)."), ["daysBetween"]);
  assert.ok(names("Turn one shop order into its subtotal.", "", "A price is a string like \"$1,234.50\", or a plain number.").includes("parseMoney"));
  assert.ok(names("Count the words of a passage.").includes("splitWords"));
  assert.deepEqual(names("Show the name of the user who signed up on that date."), [], "one passing word is not what the operation is for");
});

test("cardsFor: a whole-number round is Math.round — roundTo is offered for DECIMAL PLACES (the toFixed-returns-a-string trap), not for any use of the word `round`", () => {
  assert.ok(!cardsFor(task("Turn one ward's bed counts into a status line.", "percentFull = occupied beds as a whole-number percentage of all beds", "percentFull is a NUMBER, rounded to the nearest whole percent (87.5 rounds to 88).")).map((c) => c.name).includes("roundTo"));
  assert.ok(cardsFor(task("km = the distance rounded to one decimal")).map((c) => c.name).includes("roundTo"));
});

test("cardsFor is ranked and explained: each offered card says which words of the task named it", () => {
  const r = cardsFor(task("round the result to 2 decimal places", "a number rounded to one decimal"));
  assert.equal(r[0].name, "roundTo"); assert.ok(r[0].words.length >= 2 && r[0].score >= CARD_RELEVANCE_FLOOR);
});

test("every card declares its tags, and a card's own purpose words offer it", () => {
  for (const n of CARD_NAMES.filter((n) => CARDS[n].aliases)) assert.ok(CARDS[n].aliasGiver, `${n}: an alias is a claim about other libraries, so it names whose`);
  for (const n of CARD_NAMES) assert.ok(CARDS[n].tags && CARDS[n].tags.split(/\s+/).length >= 3, `${n} declares what it is for`);
  assert.deepEqual(cardsFor(task("convert the bearing in degrees to a compass direction")).map((c) => c.name), ["compass16"]);
  assert.deepEqual(cardsFor(task("pad the unpadded clock time as hh:mm")).map((c) => c.name), ["padTime"]);
});

test("angles: 180 degrees is pi radians and back; the pair inverts", () => {
  near(CARDS.degreesToRadians.fn(180), Math.PI, 1e-12); near(CARDS.degreesToRadians.fn(90), Math.PI / 2, 1e-12); near(CARDS.degreesToRadians.fn(-45), -Math.PI / 4, 1e-12);
  near(CARDS.radiansToDegrees.fn(Math.PI), 180, 1e-9); near(CARDS.radiansToDegrees.fn(CARDS.degreesToRadians.fn(51.47)), 51.47, 1e-9);
});

test("a name a model INVENTS for an operation resolves to the one card it means: toRadians, deg2rad, c2f, km2mi (a 2 between words is the shorthand for `to`) — and `rad2deg` is not `deg2rad`", () => {
  const want = { toRadians: "degreesToRadians", degToRad: "degreesToRadians", deg2rad: "degreesToRadians", rad2deg: "radiansToDegrees", toDegrees: "radiansToDegrees", c2f: "celsiusToFahrenheit", f2c: "fahrenheitToCelsius", km2mi: "kmToMiles", mph2kmh: "mphToKmh", toFahrenheit: "celsiusToFahrenheit" };
  for (const [asked, real] of Object.entries(want)) assert.equal(resolveCard(asked).real, real, asked);
  assert.equal(resolveCard("radians").real, "degreesToRadians", "Python's and numpy's `radians(x)` takes degrees: a declared alias, with its giver, settles what the word rules could not");
  assert.equal(resolveCard("degrees").real, "radiansToDegrees"); assert.match(resolveCard("radians").basis, /Python math\.radians/); assert.equal(resolveCard("radians").tier, 0);
  assert.equal(resolveCard("angle").resolved, false, "a name no library gives to one of them stays unresolved");
});

test("a conversion the task DIRECTS is offered one way: 'Celsius to Fahrenheit' offers celsiusToFahrenheit, not its inverse (shown both, a small model composed both); an undirected or two-way task keeps both", () => {
  const names = (t) => cardsFor(task(t)).map((c) => c.name);
  assert.deepEqual(names("Converts degrees Celsius to degrees Fahrenheit."), ["celsiusToFahrenheit"]);
  assert.deepEqual(names("Converts degrees Fahrenheit to degrees Celsius."), ["fahrenheitToCelsius"]);
  assert.deepEqual(names("Turn a Celsius reading into Fahrenheit."), ["celsiusToFahrenheit"]);
  assert.deepEqual(names("temperature: celsius -> fahrenheit"), ["celsiusToFahrenheit"]);
  assert.deepEqual(names("convert the temperature from Fahrenheit to Celsius").sort(), ["fahrenheitToCelsius"]);
  assert.deepEqual(names("the temperature in Celsius and Fahrenheit").sort(), ["celsiusToFahrenheit", "fahrenheitToCelsius"], "no connector: the task does not say which way");
  assert.deepEqual(names("convert Celsius to Fahrenheit and Fahrenheit to Celsius").sort(), ["celsiusToFahrenheit", "fahrenheitToCelsius"], "both ways named: both offered");
  assert.ok(names("convert a bearing: degrees to radians, for the trigonometry").includes("degreesToRadians") && !names("convert a bearing: degrees to radians, for the trigonometry").includes("radiansToDegrees"));
});

test("a direction is read inside one clause: `rounded to one decimal, miles = ...` is not 'kilometres to miles' (a comma ends the window), so flightLeg still offers both distance directions", () => {
  const leg = task("Turn two airports into one flight leg.", "km = the great-circle distance in kilometres rounded to one decimal, miles = that same distance in statute miles rounded to one decimal");
  const got = cardsFor(leg).map((c) => c.name);
  assert.ok(got.includes("kmToMiles") && got.includes("milesToKm"), got.join());
});

test("every card that declares what it converts names two words, and each is one of its own tags", () => {
  for (const n of CARD_NAMES.filter((n) => CARDS[n].converts)) { const [a, b] = CARDS[n].converts.split(" "), tags = CARDS[n].tags.split(/\s+/); assert.ok(a && b && tags.includes(a) && tags.includes(b), n); }
});

test("parseMoney: the amount a price is written as, from a number or from text; anything that is not an amount is null", () => {
  const f = CARDS.parseMoney.fn;
  near(f("$1,234.50"), 1234.5); near(f("12.5"), 12.5); near(f(5), 5); near(f("$1,000"), 1000); near(f(" $0.99 "), 0.99); near(f("-$5.00"), -5); near(f("€9.90"), 9.9); near(f(".5"), 0.5);
  for (const bad of ["", "abc", "$", "1.2.3", "12 dollars", null, undefined, NaN, Infinity, "(5.00)"]) assert.equal(f(bad), null, String(bad));
});

test("daysBetween: calendar days, with the edges a hand-rolled version gets wrong — month ends, a leap day, a year end — written down independently", () => {
  const f = CARDS.daysBetween.fn;
  assert.equal(f("2026-10-01", "2026-10-01"), 0); assert.equal(f("2026-10-01", "2026-10-08"), 7);
  assert.equal(f("2024-02-28", "2024-03-01"), 2, "2024 is a leap year"); assert.equal(f("2023-02-28", "2023-03-01"), 1);
  assert.equal(f("2026-12-31", "2027-01-01"), 1); assert.equal(f("2026-10-28", "2026-11-04"), 7); assert.equal(f("2028-02-26", "2028-03-04"), 7);
  assert.equal(f("2026-10-08", "2026-10-01"), -7, "negative when the second is earlier");
  assert.equal(f("2026-03-28", "2026-03-30"), 2, "a daylight-saving week is still whole days"); assert.equal(f("2026-10-01T23:59:59Z", "2026-10-02"), 1, "a time of day is ignored");
  assert.ok(Number.isNaN(f("soon", "2026-10-01")) && Number.isNaN(f("2026-10-01", "")));
  assert.equal(f(new Date("2026-10-01T00:00:00Z"), "2026-10-04"), 3);
});

test("splitWords: letters, digits and apostrophes make a word; punctuation and hyphens split; case is kept; non-ASCII letters are letters", () => {
  const f = CARDS.splitWords.fn;
  assert.deepEqual(f("The quick brown fox, the lazy dog!"), ["The", "quick", "brown", "fox", "the", "lazy", "dog"]);
  assert.deepEqual(f("It's a dog-eat-dog world; isn't it?"), ["It's", "a", "dog", "eat", "dog", "world", "isn't", "it"]);
  assert.deepEqual(f("naïve café 42nd"), ["naïve", "café", "42nd"]); assert.deepEqual(f(""), []); assert.deepEqual(f("!!! ... ---"), []); assert.deepEqual(f(null), []);
});

test("a tag that is an ordinary word does not offer a card on its own: `day` is not calendar arithmetic, `amount` is not money, and `joined … missing` in a tree-path spec is not a label join (the three misfires measured on the held-out set)", () => {
  const names = (...a) => cardsFor(task(...a)).map((c) => c.name);
  assert.deepEqual(names("Show the forecast for the next 3 days.", "an array of { day, high, low }"), [], "days is not daysBetween");
  assert.deepEqual(names("Report the rain.", "precipitation = the amount that fell, in millimetres"), [], "an amount is not money");
  assert.deepEqual(names("List every leaf of a menu as a path.", "its path from the root joined with \"/\"", "An entry whose children list is absent is a leaf."), [], "one of its tags (`joined`) is not enough: min: 2");
  assert.ok(names("Make a label from the name and region joined with a comma, leaving out any part that is missing.").includes("joinPresent"), "two of its tags: it is offered");
  assert.equal(CARDS.joinPresent.min, 2);
});

test("the examples in a card's doc are true: they are run against the card itself", () => {
  const v = (n) => CARDS[n].fn;
  near(v("celsiusToFahrenheit")(100), 212); near(v("fahrenheitToCelsius")(212), 100); near(v("kmToMiles")(16.09344), 10, 1e-9); near(v("milesToKm")(10), 16.09344, 1e-9);
  assert.equal(v("daysBetween")("2026-10-01", "2026-10-08"), 7); assert.equal(v("daysBetween")("2026-10-08", "2026-10-01"), -7);
});
