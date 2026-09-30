// unit-wall.mjs — the authority wall a generated unit runs behind: an EMPTY vm
// context (no require, no process, no fetch, no timers, no eval of strings), the
// call arguments and the result crossing as JSON only, every call under a timeout.
// Shared by the generator (which tests a unit against its oracle) and by the
// generated app's own server (which runs the same verified code on live responses)
// — one implementation of the wall, copied into the bundle by the assembler.
import vm from "node:vm";

/** A unit is run for at most this long (ms) — a synchronous spin is the one hole a vm timeout closes. */
export const UNIT_RUN_TIMEOUT_MS = 2000;

/** Compile `code` in an empty context and return a function that calls `name` on JSON-cloned arguments. Throws when the code declares no such function. */
export function loadUnit(code, name, { timeout = UNIT_RUN_TIMEOUT_MS } = {}) {
  const ctx = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(`${code}\n;globalThis.__unit = typeof ${name} === "function" ? ${name} : null;`, ctx, { timeout, filename: `${name}.js` });
  const fn = ctx.__unit;
  if (typeof fn !== "function") throw new Error(`the code declares no function ${name}`);
  return (...args) => {
    const box = vm.createContext(Object.create(null));
    box.__f = fn; box.__args = JSON.parse(JSON.stringify(args));
    const out = vm.runInContext("JSON.stringify(__f(...__args))", box, { timeout });
    return out === undefined ? undefined : JSON.parse(out);
  };
}
