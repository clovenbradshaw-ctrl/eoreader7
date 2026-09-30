// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// Handle: Lovelace — the science of operations. THIS is a layer that teaches rather than a step that is steered (ledger
// row 8, TEACH-IT-TO-FISH.md §4): the small model needs only the right IDEA, and the system binds the idea to the real
// referent. `tz` and `timezone` are one referent; the model is not asked to be precise, the system resolves what it meant.
// Her teaching: the notation that orders the work is never the work — and a card made out once covers every case.
// key-referents.js — THE SAME KEY, UNDER ANOTHER NAME.
//
// A model writing code against a received object reaches for the key it has in mind:
// `tz` for `timezone`, `lat` for `latitude`, `windSpeed` for `wind_speed`. The idea is
// right; the spelling is not, and a test that reads `undefined` punishes the spelling
// as if it were the idea — the model then repeats itself (measured 2026-09-30: a 1.5B
// coder handed back byte-identical code after being told where `timezone` lives).
//
// This layer resolves the idea to the key. It sits between received data and the
// function reading it: a read of a key the object does not have is asked of the REAL
// keys the object does have, and answered only when the answer is not a guess.
//
// THE WALL (aliases.js's law, for names in data). "The same referent" is never decided
// from the shape of a string alone, so:
//   - resolution is over the CLOSED set of keys the object actually carries — it can
//     bind to a real key, never mint one;
//   - it resolves only when exactly ONE real key qualifies at the strongest evidence
//     tier; two that qualify equally (`wind` against `windspeedKmph` and `windspeedMiles`)
//     is a typed AMBIGUITY, returned with its candidates and never broken by a coin;
//   - a name nothing qualifies for is UNRESOLVED, returned as such — the read stays
//     undefined, so a real absence is still a real failure;
//   - every resolution carries its basis and is recorded where a person can read it.
// Stronger evidence than a string's shape is welcome and ranks first: a DECLARED map
// (the contract's own worked example says `region` is the value that sits at `admin1`).
//
// Evidence tiers, strongest first:
//   0 exact          asked === real
//   1 declared       the contract's example binds the asked name to this real key
//   2 fold           same letters ignoring case and separators (windSpeed / wind_speed)
//   3 prefix/token   the asked name starts the real key (lat / latitude, temp / temperature),
//                    or the asked name equals a whole token of the real key
//   4 abbreviation   three or more asked letters occur in order in the real key, same first
//                    letter, at most half its length (lng / longitude) — weakest, so only when alone.
//                    Two letters name nothing from their shape (`at` would bind `admitted_at`): a
//                    short form like `tz` resolves only on the stronger evidence, the declared map.
//
// Pure. The resolver is also emitted as SOURCE (residentSource) so it can run INSIDE the
// empty-context vm a unit executes in: the same code decides in the test and in production.

export const KEY_REFERENTS_SCHEMA = "EOKeyReferents@1";
/** shortest asked name a prefix or abbreviation may resolve — one or two letters name nothing from their shape alone. */
export const MIN_ASKED = 3;
/** an abbreviation is at most this share of the key it abbreviates (county is not an abbreviation of country). */
export const MAX_ABBREV_SHARE = 0.5;

export function foldKey(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function keyTokens(s) {
  return String(s).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean).map((t) => t.toLowerCase());
}

export function inOrder(a, r) {
  let i = 0;
  for (let j = 0; j < r.length && i < a.length; j++) if (r[j] === a[i]) i++;
  return i === a.length;
}

/** the evidence tier at which `asked` refers to `real`, or null (see the header) */
export function keyTier(asked, real) {
  if (asked === real) return 0;
  const a = foldKey(asked), r = foldKey(real);
  if (!a || !r) return null;
  if (a === r) return 2;
  // the asked name is the START of the real key (lat / latitude). Never the other way: `elevation2` is not `elevation`, it is a key that is not there.
  if (a.length >= MIN_ASKED && a.length < r.length && r.startsWith(a)) return 3;
  if (a.length >= MIN_ASKED && keyTokens(real).includes(a)) return 3;
  if (a.length >= MIN_ASKED && a.length <= r.length * MAX_ABBREV_SHARE && a[0] === r[0] && inOrder(a, r)) return 4;
  return null;
}

/**
 * resolveKey(asked, keys, { declared }) ->
 *   { resolved, real, tier, basis }                    exactly one real key at the strongest tier
 *   { resolved:false, ambiguous:true, candidates }     two or more tie: the caller points, nothing is chosen here
 *   { resolved:false, ambiguous:false, candidates:[] } nothing qualifies: a real absence
 */
export function resolveKey(asked, keys, { declared = {} } = {}) {
  if (keys.includes(asked)) return { resolved: true, real: asked, tier: 0, basis: "exact" };
  const d = declared[asked];
  if (d !== undefined && keys.includes(d)) return { resolved: true, real: d, tier: 1, basis: "declared by the contract's worked example" };
  let best = null, at = [];
  for (const k of keys) {
    const t = keyTier(asked, k);
    if (t === null) continue;
    if (best === null || t < best) { best = t; at = [k]; } else if (t === best) at.push(k);
  }
  if (best === null) return { resolved: false, ambiguous: false, candidates: [] };
  if (at.length > 1) return { resolved: false, ambiguous: true, candidates: at, tier: best };
  return { resolved: true, real: at[0], tier: best, basis: ["exact", "declared", "same letters, other case or separators", "prefix or whole-token of the real key", "abbreviation of the real key (unique)"][best] };
}

/** a declared map, read off a worked example: each output key whose value sits under exactly one input key name. The example is shown to the mouth anyway; this only lets the mouth's use of the contract's own vocabulary resolve. */
export function declaredFromExample(input, output) {
  const where = new Map(); // scalar string -> Set of key names holding it
  const walk = (v, key, depth) => {
    if (depth > 8 || v === null) return;
    if (typeof v === "object") { for (const [k, x] of Array.isArray(v) ? v.map((x) => [key, x]) : Object.entries(v)) walk(x, k, depth + 1); return; }
    if (typeof v === "string" || typeof v === "number") { const s = String(v); if (!where.has(s)) where.set(s, new Set()); where.get(s).add(String(key)); }
  };
  (Array.isArray(input) ? input : [input]).forEach((a) => walk(a, "", 0));
  const declared = {};
  if (output && typeof output === "object" && !Array.isArray(output)) {
    for (const [k, v] of Object.entries(output)) {
      if (typeof v !== "string" && typeof v !== "number") continue;
      const hit = where.get(String(v));
      if (hit && hit.size === 1) { const real = [...hit][0]; if (real !== k && real !== "") declared[k] = real; }
    }
  }
  return declared;
}

const SKIP = new Set(["toJSON", "then", "constructor", "valueOf", "toString", "length", "inspect", "asymmetricMatch", "hasOwnProperty", "prototype"]);

/** The resolving view, as SOURCE to run inside the vm: `__wrap(value)` and `__resolutions()`. Self-contained: every function it needs is emitted beside it. */
export function residentSource({ declared = {} } = {}) {
  return [
    `const __declared = ${JSON.stringify(declared)}; const __skip = new Set(${JSON.stringify([...SKIP])}); const MIN_ASKED = ${MIN_ASKED}; const MAX_ABBREV_SHARE = ${MAX_ABBREV_SHARE}; const __log = []; const __seen = new WeakMap();`,
    foldKey.toString(), keyTokens.toString(), inOrder.toString(), keyTier.toString(), resolveKey.toString(),
    `function __wrap(v) {
      if (v === null || typeof v !== "object") return v;
      if (__seen.has(v)) return __seen.get(v);
      const p = new Proxy(v, { get(t, k, r) {
        if (typeof k === "symbol" || k in t || __skip.has(k)) { const x = Reflect.get(t, k, r); return x !== null && typeof x === "object" ? __wrap(x) : x; }
        if (Array.isArray(t)) return undefined;
        const res = resolveKey(k, Object.keys(t), { declared: __declared });
        if (res.resolved) { if (!__log.some((l) => l.asked === k && l.real === res.real)) __log.push({ asked: k, real: res.real, basis: res.basis }); const x = t[res.real]; return x !== null && typeof x === "object" ? __wrap(x) : x; }
        if (res.ambiguous && !__log.some((l) => l.asked === k && l.ambiguous)) __log.push({ asked: k, ambiguous: true, candidates: res.candidates });
        return undefined;
      } });
      __seen.set(v, p);
      return p;
    }
    function __resolutions() { return __log.slice(); }`,
  ].join("\n");
}
