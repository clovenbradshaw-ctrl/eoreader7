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
// Giver: these are the standard definitions (SI and customary unit conversions; the 16-point compass rose; the
// great-circle formula) — received, not measured. The mean Earth radius 6371 km is the conventional figure.

import { foldKey, keyTokens, resolveKey } from "./key-referents.js";

export const CARDS_SCHEMA = "EOCards@1";

function celsiusToFahrenheit(c) { return (Number(c) * 9) / 5 + 32; }
function fahrenheitToCelsius(f) { return ((Number(f) - 32) * 5) / 9; }
function msToKmh(ms) { return Number(ms) * 3.6; }
function msToMph(ms) { return Number(ms) * 2.2369362920544; }
function kmhToMph(kmh) { return Number(kmh) / 1.609344; }
function mphToKmh(mph) { return Number(mph) * 1.609344; }
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

/** name -> { fn, doc }: the library, in the order the prompt shows it */
export const CARDS = Object.freeze({
  celsiusToFahrenheit: { fn: celsiusToFahrenheit, doc: "degrees Celsius -> degrees Fahrenheit (a number, not rounded)" },
  fahrenheitToCelsius: { fn: fahrenheitToCelsius, doc: "degrees Fahrenheit -> degrees Celsius (a number, not rounded)" },
  msToKmh: { fn: msToKmh, doc: "metres per second -> kilometres per hour" },
  msToMph: { fn: msToMph, doc: "metres per second -> miles per hour" },
  kmhToMph: { fn: kmhToMph, doc: "kilometres per hour -> miles per hour" },
  mphToKmh: { fn: mphToKmh, doc: "miles per hour -> kilometres per hour" },
  compass16: { fn: compass16, doc: "a bearing in degrees -> its 16-point compass name (\"N\", \"NNE\", ... \"NNW\")" },
  padTime: { fn: padTime, doc: "a clock time written without padding (0, \"300\", \"1200\") -> \"HH:MM\"; null if it is not a time" },
  joinPresent: { fn: joinPresent, doc: "joinPresent([a, b, c], \", \") joins the parts that are present (not null, undefined or empty); the separator defaults to \", \"" },
  haversineKm: { fn: haversineKm, doc: "haversineKm(lat1, lon1, lat2, lon2): great-circle distance in kilometres (not rounded)" },
  roundTo: { fn: roundTo, doc: "roundTo(x, places): x rounded to that many decimal places (0 for a whole number)" },
  toNumber: { fn: toNumber, doc: "a number or numeric string -> the number; null for anything else (blank, text, missing)" },
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
  for (const m of src.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const n = m[2];
    if (KEYWORDS.has(n) || GLOBALS.has(n) || declared.has(n) || CARDS[n]) continue;
    out.add(n);
  }
  return [...out];
}

/** the asked name's words, each an exact or a leading part of one word of the card's name, in the card's order: `toFahrenheit`, `celsiusToF`, `round`, `toNum` */
function wordsInOrder(asked, real) {
  const a = keyTokens(asked), r = keyTokens(real);
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
  const r = resolveKey(asked, names);
  if (r.resolved || r.ambiguous) return r;
  const hit = names.filter((n) => wordsInOrder(asked, n));
  if (hit.length === 1) return { resolved: true, real: hit[0], tier: 5, basis: "the words of the operation's name, in order" };
  if (hit.length > 1) return { resolved: false, ambiguous: true, candidates: hit, tier: 5 };
  return r;
}
