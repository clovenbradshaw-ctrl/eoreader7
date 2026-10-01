// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// Handle: Lovelace — the science of operations. THE CARDS. "A card made out once covers an infinite number of
// particular cases" — the operation is separate from the thing operated on (ledger row 13, TEACH-IT-TO-FISH.md).
//
// Measured 2026-09-30 (four leaves, small local models only): what a 1.5B–2B coder gets wrong is not the IDEA but the
// arithmetic and formatting it was asked to re-implement — a temperature unit chosen wrongly, a compass index computed
// as 8, a time printed `0000:00`, a missing part printed as "undefined". Those are operations, not content. They are
// written and verified ONCE here; the model is asked only to CALL the right one (and the key-referent layer resolves a
// near name to it, never guessing). Nothing in a card knows what a weather app is.
//
// A card is a pure, self-contained function DECLARATION (it is stringified into the empty-context vm a unit runs in, so it
// may not reference anything outside itself). Each carries a one-line doc the prompt shows, and is pinned by
// cards.test.mjs against values written down independently of this file.
//
// Giver: these are the standard definitions (SI and customary unit conversions, speeds and distances; the 16-point compass rose; the
// great-circle formula) — received, not measured. The mean Earth radius 6371 km is the conventional figure.

import { foldKey, keyTokens, resolveKey } from "./key-referents.js";

export const CARDS_SCHEMA = "EOCards@1";

function celsiusToFahrenheit(c) { return (Number(c) * 9) / 5 + 32; }
function fahrenheitToCelsius(f) { return ((Number(f) - 32) * 5) / 9; }
function msToKmh(ms) { return Number(ms) * 3.6; }
function msToMph(ms) { return Number(ms) * 2.2369362920544; }
function kmhToMph(kmh) { return Number(kmh) / 1.609344; }
function mphToKmh(mph) { return Number(mph) * 1.609344; }
function kmToMiles(km) { return Number(km) / 1.609344; }
function milesToKm(miles) { return Number(miles) * 1.609344; }
function degreesToRadians(degrees) { return (Number(degrees) * Math.PI) / 180; }
function radiansToDegrees(radians) { return (Number(radians) * 180) / Math.PI; }
function compass16(degrees) {
  const names = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const d = ((Number(degrees) % 360) + 360) % 360;
  return names[Math.round(d / 22.5) % 16];
}
function padTime(t) {
  const digits = String(t).replace(/\D/g, "");
  if (!digits || digits.length > 4) return null;
  const s = digits.padStart(4, "0");
  return s.slice(0, 2) + ":" + s.slice(2);
}
function joinPresent(parts, separator) {
  const sep = separator === undefined ? ", " : separator;
  return (Array.isArray(parts) ? parts : []).filter((p) => p !== null && p !== undefined && String(p).trim() !== "").join(sep);
}
function haversineKm(lat1, lon1, lat2, lon2) {
  const rad = (d) => (Number(d) * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
function roundTo(x, places) { const k = 10 ** (places || 0); return Math.round(Number(x) * k) / k; }
function toNumber(x) { const n = typeof x === "number" || (typeof x === "string" && x.trim() !== "") ? Number(x) : NaN; return Number.isFinite(n) ? n : null; }

/** name -> { fn, doc, tags }: the library, in the order the prompt shows it. `tags` are the few words that name what a card is FOR, declared by whoever makes the card: they (not the doc prose) are what a task's own words are matched against */
export const CARDS = Object.freeze({
  celsiusToFahrenheit: { fn: celsiusToFahrenheit, doc: "degrees Celsius -> degrees Fahrenheit (a number, not rounded)", tags: "celsius fahrenheit temperature degrees", converts: "celsius fahrenheit" },
  fahrenheitToCelsius: { fn: fahrenheitToCelsius, doc: "degrees Fahrenheit -> degrees Celsius (a number, not rounded)", tags: "fahrenheit celsius temperature degrees", converts: "fahrenheit celsius" },
  msToKmh: { fn: msToKmh, doc: "metres per second -> kilometres per hour", tags: "metres second kilometres hour speed wind kmh", converts: "metres kilometres" },
  msToMph: { fn: msToMph, doc: "metres per second -> miles per hour", tags: "metres second miles hour speed wind mph", converts: "metres miles" },
  kmhToMph: { fn: kmhToMph, doc: "kilometres per hour -> miles per hour", tags: "kilometres hour miles speed kmh mph", converts: "kilometres miles" },
  mphToKmh: { fn: mphToKmh, doc: "miles per hour -> kilometres per hour", tags: "miles hour kilometres speed mph kmh", converts: "miles kilometres" },
  kmToMiles: { fn: kmToMiles, doc: "a distance in kilometres -> the same distance in statute miles (divides by 1.609344; a number, not rounded)", tags: "kilometres miles distance statute length", converts: "kilometres miles" },
  milesToKm: { fn: milesToKm, doc: "a distance in statute miles -> the same distance in kilometres (multiplies by 1.609344; a number, not rounded)", tags: "miles kilometres distance statute length", converts: "miles kilometres" },
  degreesToRadians: { fn: degreesToRadians, doc: "an angle in degrees -> the same angle in radians (what Math.sin, Math.cos and Math.atan2 take)", tags: "degrees radians angle trigonometry latitude", aliases: "radians toRadians toRad degToRad deg2rad degtorad", aliasGiver: "Python math.radians, numpy.radians/deg2rad, Java Math.toRadians", converts: "degrees radians" },
  radiansToDegrees: { fn: radiansToDegrees, doc: "an angle in radians -> the same angle in degrees (what Math.atan2 and Math.acos hand back)", tags: "radians degrees angle trigonometry bearing", aliases: "degrees toDegrees toDeg radToDeg rad2deg radtodeg", aliasGiver: "Python math.degrees, numpy.degrees/rad2deg, Java Math.toDegrees", converts: "radians degrees" },
  compass16: { fn: compass16, doc: "a bearing in degrees -> its 16-point compass name (\"N\", \"NNE\", ... \"NNW\")", tags: "compass bearing direction degrees cardinal" },
  padTime: { fn: padTime, doc: "a clock time written without padding (0, \"300\", \"1200\") -> \"HH:MM\"; null if it is not a time", tags: "pad padding padded unpadded clock hhmm" },
  joinPresent: { fn: joinPresent, doc: "joinPresent([a, b, c], \", \") joins the parts that are present (not null, undefined or empty); the separator defaults to \", \"", tags: "join joined separator present missing label" },
  haversineKm: { fn: haversineKm, doc: "haversineKm(lat1, lon1, lat2, lon2): great-circle distance in kilometres (not rounded)", tags: "haversine great-circle distance latitude longitude kilometres" },
  roundTo: { fn: roundTo, doc: "roundTo(x, places): x rounded to that many decimal places (0 for a whole number)", tags: "decimal decimals place places" },
  toNumber: { fn: toNumber, doc: "a number or numeric string -> the number; null for anything else (blank, text, missing)", tags: "numeric nan blank coerce" },
});

export const CARD_NAMES = Object.freeze(Object.keys(CARDS));

/** The cards as SOURCE for the empty-context vm: every function declaration, nothing else. */
export function cardSource(names = CARD_NAMES) {
  return names.map((n) => CARDS[n].fn.toString()).join("\n");
}

/** What the prompt says about the cards: one line each, in plain words. */
export function cardsDoc(names = CARD_NAMES) {
  return names.map((n) => `- ${n}: ${CARDS[n].doc}`).join("\n");
}

const KEYWORDS = new Set("if for while switch catch function return typeof new await async do else try finally throw delete void in of instanceof class extends super import export default var let const yield with case break continue".split(" "));
const GLOBALS = new Set(["Math", "JSON", "Number", "String", "Boolean", "Array", "Object", "Date", "RegExp", "Map", "Set", "Symbol", "Promise", "Error", "TypeError", "RangeError", "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent", "decodeURIComponent", "BigInt", "Intl", "WeakMap", "WeakSet", "Proxy", "Reflect"]);

/** Every name a unit declares (function, const/let/var, class, parameter, arrow parameter) — loosely, by regex: a name wrongly counted as declared only means a card is not offered for it. */
export function declaredIn(code) {
  const src = String(code ?? "");
  const declared = new Set();
  for (const m of src.matchAll(/\b(?:function\s*\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
  for (const m of src.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*(?=[,)=])/g)) declared.add(m[1]); // parameters, loosely
  for (const m of src.matchAll(/\b([A-Za-z_$][\w$]*)\s*=>/g)) declared.add(m[1]);
  return declared;
}

/**
 * The names a unit CALLS that nothing in it declares and no global provides — the ones that would be a ReferenceError. The
 * wall offers each to the card library's resolver; only a unique, stated match binds (key-referents.js), the rest stay errors.
 * Approximate on purpose (a regex over source, not a parser): it may MISS a name (then it is an error, the honest outcome)
 * but binding one that was declared would be a redeclaration error, so every declared name is excluded first.
 */
export function freeCalls(code) {
  const src = String(code ?? "");
  const declared = declaredIn(src);
  const out = new Set();
  for (const m of src.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) { // a lookbehind, not a consumed character: in `f(g(x))` the `(` before `g` belongs to BOTH calls
    const n = m[1];
    if (KEYWORDS.has(n) || GLOBALS.has(n) || declared.has(n) || CARDS[n]) continue;
    out.add(n);
  }
  return [...out];
}

/** the asked name's words, each an exact or a leading part of one word of the card's name, in the card's order: `toFahrenheit`, `celsiusToF`, `round`, `toNum` */
function wordsInOrder(asked, real) {
  // `deg2rad`, `c2f`, `km2mi`: a 2 between two words is the standing shorthand for "to" — the words it stands for are what is compared
  const a = keyTokens(asked).flatMap((w) => { const m = /^([a-z]+)2([a-z]+)$/i.exec(w); return m ? [m[1].toLowerCase(), "to", m[2].toLowerCase()] : [w]; }), r = keyTokens(real);
  if (!a.length) return false;
  let j = 0;
  for (const w of a) {
    while (j < r.length && !(r[j] === w || (r[j].startsWith(w) && (w.length >= 2 || a.length >= 3)))) j++;
    if (j >= r.length) return false;
    j++;
  }
  return true;
}

/**
 * Which card does a CALLED name mean? The key-referent layer's rules first (exact, same letters, truncation, abbreviation), then the
 * words of the name in order (`toFahrenheit` is `celsiusToFahrenheit`; `round` is `roundTo`). Same wall as a key: the closed set of
 * cards only, exactly one or nothing, a tie is a typed ambiguity (`mph` is the start of three conversions and names none), and the
 * caller records what it bound. Unlike a key read, a wrong binding cannot hide: the unit still has to pass the oracle that
 * decides it, and an unbound name stays a ReferenceError the model is shown.
 */
export function resolveCard(asked, names = CARD_NAMES) {
  // the names OTHER libraries give an operation, declared by the card with their giver: `radians(x)` is Python's and numpy's degrees-to-radians. A bare `radians` is
  // ambiguous to the rules below (it is half of both angle cards' names); to a reader who knows the libraries it is one operation.
  const asFolded = String(asked).toLowerCase(), declared = names.filter((n) => (CARDS[n]?.aliases ?? "").toLowerCase().split(/\s+/).includes(asFolded));
  if (declared.length === 1) return { resolved: true, real: declared[0], tier: 0, basis: `a name other libraries give this operation (${CARDS[declared[0]].aliasGiver})` };
  const r = resolveKey(asked, names);
  if (r.resolved || r.ambiguous) return r;
  const hit = names.filter((n) => wordsInOrder(asked, n));
  if (hit.length === 1) return { resolved: true, real: hit[0], tier: 5, basis: "the words of the operation's name, in order" };
  if (hit.length > 1) return { resolved: false, ambiguous: true, candidates: hit, tier: 5 };
  return r;
}

// ---- which operations are IN PLAY for a task (what the task MEANS) ----
// Measured 2026-09-30 (diverse-falsify, four arms): showing all twelve cards doubled the `bedReport` prompt (277 -> 574 tokens) and flipped gemma2:2b from a
// correct draw to a wrong one; the cards ARE what makes `flightLeg` pass. Which operations a task involves is a referent question about the TASK, not a fixed
// block: a card is offered when the task's own words name what it is FOR. Matching against the doc PROSE was tried first and offered `compass16` for a commit
// log because the doc says "name"; so a card declares `tags`, the few words that name its purpose, and a tag shared by several cards counts for less
// (1 / the number of cards that carry it) — the same reason a rare term outranks a common one in retrieval.
// Measured 2026-10-01 (bedReport, gemma2:2b, same draw, same task): `keys` alone passed and `cards` failed — the only difference was `roundTo` offered, because the task said
// "rounded to the nearest whole percent". A whole-number round is `Math.round`, which the model already writes correctly; the card is for DECIMAL PLACES (`toFixed` hands back
// a string, the shown wrong answer in flightLeg). An offer costs tokens and a draw that flips; it is made only where the card does something the model does not already do.
/** a card is offered when the summed weight of its tags that the task names reaches this (one tag only that card has, or two shared by two). Set by hand 2026-09-30; measured by falsification on 16 contracts: flightLeg keeps haversineKm and roundTo, topAuthors and dueSoon offer none. */
export const CARD_RELEVANCE_FLOOR = 1;

const stem = (w) => w.replace(/(ing|ed|es|s)$/, "");
const wordsOf = (s) => new Set((String(s).toLowerCase().replace(/hh:mm/g, "hhmm").match(/[a-z][a-z-]+/g) ?? []).map((w) => stem(w.replace(/-/g, "-"))));

// A conversion card declares the two things it converts (`converts: "from to"`) and the pair of cards that invert each other share every tag, so the words alone offer both:
// measured 2026-10-01 (gemma2:2b, a unit whose clause says "Celsius to Fahrenheit"): shown both directions it wrote fahrenheitToCelsius(celsiusToFahrenheit(x)). The task usually
// says which way it goes — "A to B", "from A to B", "A into B", "A -> B" — within a few words of its connector and without crossing a clause break. When it does, the card
// that converts the other way is not offered. When it does not say (or says both), both stay.
const CONNECTORS = new Set(["to", "into"]);
const DIRECTION_WINDOW = 3; // words either side of the connector: "metres per second to kilometres per hour", "degrees Celsius to degrees Fahrenheit"
function directionsIn(text) {
  const tokens = (String(text).toLowerCase().replace(/->|=>|→/g, " to ").match(/[a-z][a-z-]*|[,;.:=\n()]/g) ?? []).map((w) => (/^[a-z]/.test(w) ? stem(w) : w));
  const near = (i, step, word) => { for (let k = 1; k <= DIRECTION_WINDOW; k++) { const t = tokens[i + step * k]; if (t === undefined || !/^[a-z]/.test(t)) return false; if (t === word) return true; } return false; };
  return (from, to) => {
    let forward = false, backward = false;
    tokens.forEach((t, i) => { if (!CONNECTORS.has(t)) return; if (near(i, -1, from) && near(i, 1, to)) forward = true; if (near(i, -1, to) && near(i, 1, from)) backward = true; });
    return { forward, backward };
  };
}

/** the cards a task's own words name: -> [{ name, score, words }] best first; [] when the task names no operation */
export function cardsFor(contract, names = CARD_NAMES) {
  const text = [contract.doc, contract.returns, contract.notes].filter(Boolean).join(" ");
  const task = wordsOf(text), directed = directionsIn(text);
  const tagged = names.map((n) => ({ n, t: [...new Set((CARDS[n].tags ?? "").split(/\s+/).filter(Boolean).map(stem))] }));
  const df = new Map();
  for (const d of tagged) for (const w of d.t) df.set(w, (df.get(w) ?? 0) + 1);
  return tagged.map((d) => { const shared = d.t.filter((w) => task.has(w)); return { name: d.n, score: shared.reduce((a, w) => a + 1 / df.get(w), 0), words: shared }; })
    .filter((c) => c.score >= CARD_RELEVANCE_FLOOR)
    .filter((c) => { const [from, to] = (CARDS[c.name].converts ?? "").split(" ").map(stem); if (!to) return true; const d = directed(from, to); return !(d.backward && !d.forward); })
    .sort((a, b) => b.score - a.score);
}
