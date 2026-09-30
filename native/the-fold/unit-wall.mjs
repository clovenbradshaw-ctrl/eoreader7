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
import vm from "node:vm";
import { residentSource } from "../organs/key-referents.js";

/** A unit is run for at most this long (ms) — a synchronous spin is the one hole a vm timeout closes. */
export const UNIT_RUN_TIMEOUT_MS = 2000;

/** Compile `code` in an empty context and return a function that calls `name` on JSON-cloned arguments. Throws when the code declares no such function. */
export function loadUnit(code, name, { timeout = UNIT_RUN_TIMEOUT_MS, resolve = null } = {}) {
  const ctx = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(`${code}\n;globalThis.__unit = typeof ${name} === "function" ? ${name} : null;`, ctx, { timeout, filename: `${name}.js` });
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
  call.resolutions = () => seen.slice();
  return call;
}
