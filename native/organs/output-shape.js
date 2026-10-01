// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace. The worked example is the contract's own independent statement of what the answer LOOKS like. A small model often has the idea right
// and returns it in the wrong type — measured 2026-10-01 on two different tasks (a dev task and a held-out one): `words` came back as the ARRAY of words where the example shows a
// count; `km` as "5540.0" (a `toFixed` string) where the example shows 5540; `priciest` as the whole line where the example shows its name. None of these is a different idea: each has
// exactly one reading in which the value is the one the example shows. This is that reading, as a typed transformation:
//
//   length    the example has a number, the draw returned an array              -> .length            ("how many")
//   number    the example has a number, the draw returned a numeric string      -> Number(x)          (what toFixed hands back)
//   project   the example has a primitive, the draw returned an object that holds that very value under exactly ONE property   -> .prop
//
// Nothing here guesses: a rewrite exists only where the example's own value is found in the draw's answer by one of these three readings, and the caller adopts it only if the
// contract's whole oracle does at least as well afterwards. Pure: the caller runs the draw on the example's input and hands the answer in.

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
const isPrimitive = (v) => ["string", "number", "boolean"].includes(typeof v);

/** -> [{ key, kind, prop? }] one per top-level field of the answer whose type is not the example's but has exactly one reading that is */
export function shapeRewrites(got, want) {
  if (typeOf(got) !== "object" || typeOf(want) !== "object") return [];
  const out = [];
  for (const key of Object.keys(want)) {
    if (!(key in got)) continue;
    const w = want[key], g = got[key];
    if (typeOf(w) === "number" && typeOf(g) === "array") out.push({ key, kind: "length" });
    else if (typeOf(w) === "number" && typeOf(g) === "string" && g.trim() !== "" && Number.isFinite(Number(g))) out.push({ key, kind: "number" });
    else if (isPrimitive(w) && typeOf(g) === "object") {
      const props = Object.keys(g).filter((k) => g[k] === w);
      if (props.length === 1) out.push({ key, kind: "project", prop: props[0] });
    }
  }
  return out;
}

/** split `a, b: f(x, y), c` at the commas that are not inside brackets or strings */
function splitTop(body) {
  const parts = []; let depth = 0, cur = "", q = null;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (q) { cur += c; if (c === "\\") { cur += body[++i] ?? ""; } else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === "`") { q = c; cur += c; continue; }
    if ("([{".includes(c)) depth++; else if (")]}".includes(c)) depth--;
    if (c === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += c;
  }
  if (cur.trim() !== "") parts.push(cur);
  return parts;
}
const SIMPLE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]]*\])*$/;
const wrap = (expr) => (SIMPLE.test(expr.trim()) ? expr.trim() : `(${expr.trim()})`);
const access = (prop) => (/^[A-Za-z_$][\w$]*$/.test(prop) ? `.${prop}` : `[${JSON.stringify(prop)}]`);

/** rewrite the entries of `return { ... }` that the rewrites name; code that returns something else is left exactly as written */
export function applyShapeRewrites(code, rewrites) {
  const by = new Map(rewrites.map((r) => [r.key, r]));
  return String(code).replace(/(\breturn\s*\(?\s*)\{([^]*?)\}(\s*\)?\s*;?)/g, (all, head, body, tail) => {
    if (/[{]/.test(body)) return all; // a nested object literal: this is not the flat return we read
    let touched = false;
    const next = splitTop(body).map((entry) => {
      const t = entry.trim(), colon = /^(["']?)([A-Za-z_$][\w$]*)\1\s*:\s*([^]*)$/.exec(t), short = /^[A-Za-z_$][\w$]*$/.test(t);
      const key = colon ? colon[2] : short ? t : null, r = key && by.get(key);
      if (!r) return entry;
      const expr = colon ? colon[3] : t, lead = entry.match(/^\s*/)[0], trail = entry.match(/\s*$/)[0];
      const value = r.kind === "length" ? `${wrap(expr)}.length` : r.kind === "number" ? `Number(${expr.trim()})` : `${wrap(expr)}${access(r.prop)}`;
      touched = true; return `${lead}${key}: ${value}${trail}`;
    });
    return touched ? `${head}{${next.join(",")}}${tail}` : all;
  });
}
