// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// Handle: Lovelace — the science of operations. THIS is a layer that teaches rather than a step that is steered (ledger
// row 8, TEACH-IT-TO-FISH.md §4): the small model needs only the right IDEA, and the system binds the idea to the real
// referent. `tz` and `timezone` are one referent; the model is not asked to be precise, the system resolves what it meant.
// Her teaching: the notation that orders the work is never the work — and a card made out once covers every case.
// unit-wall.mjs — the authority wall a generated unit runs behind: an EMPTY vm
// context (no require, no process, no fetch, no timers, no eval of strings), the
// call arguments and the result crossing as JSON only, every call under a timeout.
// Shared by the generator (which tests a unit against its oracle) and by the
// generated app's own server (which runs the same verified code on live responses)
// — one implementation of the wall, copied into the bundle by the assembler.
//
// KEY REFERENTS. A unit is written by a model that has the IDEA of a key right and
// the spelling wrong (`tz` for `timezone`). With `resolve` on, the arguments are handed
// to the unit through a resolving view (organs/key-referents.js): a read of a key the
// object lacks is answered from the ONE real key that unambiguously refers to it, and
// every such resolution is recorded (`fn.resolutions()`). The same resolver runs in
// the test and in production, so a unit verified with it behaves the same served.
//
// CARDS (ledger row 13). What a small model gets wrong is rarely the idea; it is the arithmetic and the formatting it was
// asked to re-implement (a wrong unit, a compass index of 8, `0000:00`, "undefined" in a joined label). Those operations are
// written and verified once (organs/cards.js) and declared into the unit's own context BEFORE its code, so the unit CALLS
// them. The same resolver then does for a called NAME what it does for a read KEY: `cToF` is `celsiusToFahrenheit` when one
// card unambiguously is what that name abbreviates; an ambiguous name and an unknown one stay errors — and are recorded, because
// "the model reached for an operation we do not have" is exactly the list of cards still to be made out.
import vm from "node:vm";
import { residentSource } from "../organs/key-referents.js";
import { CARD_NAMES, cardSource, declaredIn, freeCalls, mentions, resolveCard } from "../organs/cards.js";

/** A unit is run for at most this long (ms) — a synchronous spin is the one hole a vm timeout closes. */
export const UNIT_RUN_TIMEOUT_MS = 2000;

/**
 * The cards a unit runs beside: every card the unit does not declare itself (a unit's own function of the same name wins), plus one
 * alias per called name that resolves to exactly one of them. -> { prelude, resolutions, used }
 *   resolutions  { asked, real, basis, tier, kind:"card" } | { asked, ambiguous, candidates, kind:"card" } | { asked, unresolved, near, kind:"card" }
 *   used         the cards the code calls by their own name (for the record: which operations the model reached for and found)
 */
export function cardPrelude(code, { aliases: aliasing = true } = {}) {
  const declared = declaredIn(code);
  const present = CARD_NAMES.filter((n) => !declared.has(n));
  const resolutions = [], aliases = [];
  // aliasing === false ("exact"): the cards are there to CALL by their own names, and a near name is left alone — the code is CANONICAL already
  // (code-canonical.js rewrote it), so there is nothing for the wall to resolve at run time
  for (const asked of aliasing ? freeCalls(code) : []) {
    const r = resolveCard(asked, present);
    if (r.resolved) { aliases.push(`function ${asked}(...a) { return ${r.real}(...a); }`); resolutions.push({ asked, real: r.real, basis: r.basis, tier: r.tier, kind: "card" }); }
    else if (r.ambiguous) resolutions.push({ asked, ambiguous: true, candidates: r.candidates, kind: "card" });
    else resolutions.push({ asked, unresolved: true, near: r.near ?? [], kind: "card" });
  }
  const used = present.filter((n) => mentions(code, n));
  return { prelude: `${cardSource(present)}\n${aliases.join("\n")}`, resolutions, used };
}

/** Compile `code` in an empty context and return a function that calls `name` on JSON-cloned arguments. Throws when the code declares no such function. */
export function loadUnit(code, name, { timeout = UNIT_RUN_TIMEOUT_MS, resolve = null, cards = true } = {}) {
  const ctx = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  const beside = cards ? cardPrelude(code, { aliases: cards !== "exact" }) : { prelude: "", resolutions: [], used: [] };
  vm.runInContext(`${beside.prelude}\n${code}\n;globalThis.__unit = typeof ${name} === "function" ? ${name} : null;`, ctx, { timeout, filename: `${name}.js` });
  const fn = ctx.__unit;
  if (typeof fn !== "function") throw new Error(`the code declares no function ${name}`);
  const resolver = resolve ? residentSource({ declared: resolve.declared ?? {} }) : null;
  const seen = [];
  const call = (...args) => {
    const box = vm.createContext(Object.create(null));
    box.__f = fn; box.__args = JSON.parse(JSON.stringify(args));
    const script = resolver ? `${resolver}\nJSON.stringify(__f(...__args.map(__wrap)))` : "JSON.stringify(__f(...__args))";
    let out;
    try { out = vm.runInContext(script, box, { timeout }); }
    finally { if (resolver) { try { for (const r of JSON.parse(JSON.stringify(box.__resolutions()))) if (!seen.some((s) => s.asked === r.asked && s.real === r.real && !!s.ambiguous === !!r.ambiguous)) seen.push(r); } catch { /* the unit died before the view was built */ } } }
    return out === undefined ? undefined : JSON.parse(out);
  };
  call.resolutions = () => [...beside.resolutions, ...seen];
  call.cardsUsed = () => beside.used.slice();
  return call;
}
