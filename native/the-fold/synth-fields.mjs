// ═══ LOVELACE · TEACH IT TO FISH ═══ IMAGINE THE LLM DOES NOT EXIST. HOW MUCH OF THE ANSWER IS STILL THERE?
//
// The operator, 2026-10-01: "imagine the LLM doesn't exist — that makes us put the intelligence outside of it — and really only think about the LLM when it's absolutely needed." So: with NO model, from what
// is given — the input's real keys, the person's words, three worked examples, and the library of verified operations (organs/cards.js) — which output fields can the system fill by itself? A field is
// SOLVED when a small expression over the input (leaves, the card operations, + − × ÷, round/ceil, counts and sums over lists) reproduces its value in every shown example; the expression is then CHECKED on the
// runs it was not shown. Whatever is left is the model's real job, and the list of it is the answer to "when are we absolutely needed". Numbers in the person's own words (`divided by 200`) are constants.
//   node native/the-fold/synth-fields.mjs
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { CARDS, cardsFor } from "../organs/cards.js";

const SHOWN = 3, EPS = 1e-9, MAX_TERMS = 60000;
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const money = (v) => (typeof v === "number" ? v : typeof v === "string" && /^\$?\s*-?[\d,]*\.?\d+$/.test(v.trim()) ? Number(v.replace(/[$,\s]/g, "")) : NaN);
const get = (v, path) => path.reduce((a, k) => a?.[k], v);
const same = (a, b) => (isNum(a) && isNum(b) ? Math.abs(a - b) < EPS : Object.is(a, b));
const roundTo = (x, p) => Math.round(x * 10 ** p) / 10 ** p;

/** numbers the person's own words state: "divided by 200", "85 or more" */
/** English numerals, zero to twelve — the closed class a person's `the three longest` is written in (the same class widget.js keeps as SPELLED_NUMBERS) */
export const NUMBER_WORDS = Object.freeze({ zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 });
export const wordConstants = (contract) => { const text = String([contract.doc, contract.returns, contract.notes].join(" ")); return [...new Set([...[...text.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?![\w.])/g)].map((m) => Number(m[0])), ...(text.toLowerCase().match(/[a-z]+/g) ?? []).map((w) => NUMBER_WORDS[w]).filter((n) => n !== undefined)])]; };

/** how many levels of nested objects the input is walked for numbers — a budget, named (P9): 3 reached `a.b.c.d`, 5 reaches a provider's `entry.data.instant.details.x` */
export const MAX_LEAF_DEPTH = 5;
/** how many base numeric leaves the four-nested haversine search may run over (n^4 terms): a budget, named (P9) — 10 before the same field in alternative places (node lat / way center.lat) added leaves */
export const HAVERSINE_LEAF_BUDGET = 14;
/** the search may keep going past an expression the held-out runs reject ONLY when at least this many remain to judge the next one: choosing among candidates BY the held-out runs spends them, and two runs cannot tell a rule from a lucky hit (measured: readingTime, 2 held-out runs, redealt targets, was solved by a junk expression) */
export const MIN_HELD_FOR_SEARCH = 6;
export function leaves(contract) {
  const out = [], runs = contract.runs.slice(0, SHOWN), a0 = runs.map((r) => r.args());
  contract.params.forEach((p, i) => {
    const walk = (vals, path, expr, depth) => {
      if (vals.every((v) => isNum(v))) { out.push({ expr, js: expr, f: (args) => get(args[i], path) }); return; }
      if (vals.every((v) => typeof v === "string" && Number.isFinite(money(v)) && /\d/.test(v)) && depth > 0) out.push({ expr: `parseMoney(${expr})`, js: `parseMoney(${expr})`, f: (args) => money(get(args[i], path)) });
      if (vals.every((v) => typeof v === "string") && depth === 0) { out.push({ expr: `splitWords(${expr})`, js: `splitWords(${expr})`, arr: "str", f: (args) => CARDS.splitWords.fn(get(args[i], path)) }); return; }
      if (vals.every((v) => v && typeof v === "object" && !Array.isArray(v)) && depth < MAX_LEAF_DEPTH) { for (const k of [...new Set(vals.flatMap(Object.keys))]) walk(vals.map((v) => v?.[k]), [...path, k], `${expr}.${k}`, depth + 1); return; }
      if (vals.every(Array.isArray)) { // a list of objects: counts, sums and sum-products over their numeric keys
        out.push({ expr: `${expr}.length`, js: `${expr}.length`, f: (args) => get(args[i], path)?.length });
        const items = vals.flat().filter((x) => x && typeof x === "object"), keys = [...new Set(items.flatMap(Object.keys))].filter((k) => items.every((x) => Number.isFinite(money(x[k]))));
        for (const k of keys) out.push({ expr: `sum(${expr}, ${k})`, js: `${expr}.reduce((s, x) => s + parseMoney(x.${k}), 0)`, f: (args) => (get(args[i], path) ?? []).reduce((s, x) => s + money(x[k]), 0) });
        for (const k1 of keys) for (const k2 of keys) if (k1 < k2) out.push({ expr: `sumProd(${expr}, ${k1}, ${k2})`, js: `${expr}.reduce((s, x) => s + parseMoney(x.${k1}) * parseMoney(x.${k2}), 0)`, f: (args) => (get(args[i], path) ?? []).reduce((s, x) => s + money(x[k1]) * money(x[k2]), 0) });
      }
    };
    walk(a0.map((a) => a[i]), [], p, 0);
  });
  // the same field in ALTERNATIVE places (a node's `lat` and a way's `center.lat`): numeric paths that only some runs carry, paired by their last key, as `a ?? b`
  const all = contract.runs.map((r) => r.args()), part = [];
  contract.params.forEach((p, i) => {
    const walk = (vals, path, expr, depth) => {
      const present = vals.filter((v) => v !== undefined && v !== null);
      if (!present.length || depth > MAX_LEAF_DEPTH) return;
      if (present.every((v) => isNum(v))) { if (present.length < vals.length) part.push({ expr, path, i, key: path[path.length - 1] }); return; }
      if (present.every((v) => v && typeof v === "object" && !Array.isArray(v))) for (const k of [...new Set(present.flatMap(Object.keys))]) walk(vals.map((v) => v?.[k]), [...path, k], /^[A-Za-z_$][\w$]*$/.test(k) ? `${expr}.${k}` : `${expr}[${JSON.stringify(k)}]`, depth + 1);
    };
    walk(all.map((a) => a[i]), [], p, 0);
  });
  const have = new Set(out.map((t) => t.expr));
  for (const a of part.concat(out.filter((t) => !t.arr && !t.expr.includes("(")).map((t) => ({ expr: t.expr, key: t.expr.split(".").pop(), f: t.f, plain: true })))) for (const b of part) {
    if (a === b || a.key !== b.key || a.expr === b.expr) continue;
    const fa = a.plain ? a.f : (args) => get(args[a.i], a.path), fb = (args) => get(args[b.i], b.path), expr = `(${a.expr} ?? ${b.expr})`;
    if (!have.has(expr)) { have.add(expr); out.push({ expr, js: expr, f: (args) => fa(args) ?? fb(args) }); }
  }
  return out;
}
/** expressions over word lists: count, sum of lengths, distinct count */
const listOps = (t) => (t.arr === "str" ? [
  { expr: `${t.expr}.length`, js: `${t.js}.length`, f: (a) => t.f(a).length },
  { expr: `sumLen(${t.expr})`, js: `${t.js}.reduce((s, w) => s + w.length, 0)`, f: (a) => t.f(a).reduce((s, w) => s + w.length, 0) },
  { expr: `distinct(lower(${t.expr}))`, js: `new Set(${t.js}.map((w) => w.toLowerCase())).size`, f: (a) => new Set(t.f(a).map((w) => w.toLowerCase())).size },
] : []);

/** units the person's words name, and the factor each stands for — received usage, not derived (a percentage is a share times a hundred; an hour is sixty minutes). Giver: everyday measurement usage. */
export const UNIT_FACTORS = Object.freeze({ percent: 100, percentage: 100, minute: 60, minutes: 60, hour: 3600, kilo: 1000 });
const unitConstants = (contract) => [...new Set(String([contract.doc, contract.returns, contract.notes].join(" ")).toLowerCase().match(/[a-z]+/g)?.map((w) => UNIT_FACTORS[w]).filter(Boolean) ?? [])];

/** search for a numeric expression reproducing `want` (one value per shown run) -> { expr, f } | null. Bottom-up in stages, observational equivalence, bounded: leaves, then the card operations, then rounding, then one and two arithmetic steps (each followed by rounding). */
export function synthesize(contract, want, extraLeaves = [], accept = () => true) {
  const runs = contract.runs.slice(0, SHOWN), args = runs.map((r) => r.args()), key = (vals) => vals.map((v) => (isNum(v) ? roundTo(v, 9) : String(v))).join("|");
  const everyArgs = contract.runs.map((r) => r.args()), everyRun = (t) => everyArgs.slice(SHOWN).map((a) => { try { const v = t.f(a); return isNum(v) ? roundTo(v, 9) : "x"; } catch { return "x"; } }).join(","); // two terms that agree on the shown runs but differ on a run it was not shown are NOT the same term
  const seen = new Set(), pool = []; let found = null;
  const add = (t) => { if (found || pool.length >= MAX_TERMS) return false; let vals; try { vals = args.map((a) => t.f(a)); } catch { return false; }
    if (!vals.every(isNum)) { // the guard: where the expression has no value (a mean of nothing) and the example wants 0, the answer is 0 — only a term that DIVIDES can have this, and the held-out runs still decide
      if (!/\//.test(t.expr) || !vals.every((v, i) => isNum(v) || (!Number.isFinite(v) && Number.isNaN(v) && want[i] === 0))) return false;
      const g = t.f; t = { ...t, js: `((v) => (Number.isFinite(v) ? v : 0))(${t.js})`, f: (a) => { const v = g(a); return Number.isFinite(v) ? v : 0; }, guarded: true }; vals = args.map((a) => t.f(a)); } const k = key(vals) + "#" + everyRun(t); if (seen.has(k)) return false; seen.add(k); t.vals = vals; pool.push(t); if (vals.every((v, i) => same(v, want[i])) && accept(t)) found = t; return true; };
  const base = [...leaves(contract), ...extraLeaves]; for (const t of base) for (const o of listOps(t)) base.push(o);
  for (const c of [...wordConstants(contract), ...unitConstants(contract)]) base.push({ expr: String(c), js: String(c), f: () => c, constant: true });
  for (const t of base) add(t); if (found) return found;
  const wrap = (terms) => { for (const t of terms) { if (t.arr || t.constant) continue; for (const p of [0, 1, 2]) add({ expr: `roundTo(${t.expr}, ${p})`, js: `roundTo(${t.js}, ${p})`, f: (a) => roundTo(t.f(a), p) }); add({ expr: `ceil(${t.expr})`, js: `Math.ceil(${t.js})`, f: (a) => Math.ceil(t.f(a)) }); add({ expr: `abs(${t.expr})`, js: `Math.abs(${t.js})`, f: (a) => Math.abs(t.f(a)) }); if (found) return; } };
  const numeric = () => pool.filter((t) => !t.arr);
  const offered = new Set(cardsFor(contract).map((c) => c.name)); // only the operations the person's own words name enter the search
  const raw = numeric().filter((t) => !t.constant && base.includes(t));
  if (raw.length <= HAVERSINE_LEAF_BUDGET && offered.has("haversineKm")) for (const a of raw) for (const b of raw) for (const c of raw) for (const d of raw) add({ expr: `haversineKm(${a.expr}, ${b.expr}, ${c.expr}, ${d.expr})`, js: `haversineKm(${a.js}, ${b.js}, ${c.js}, ${d.js})`, f: (x) => CARDS.haversineKm.fn(a.f(x), b.f(x), c.f(x), d.f(x)) });
  // every offered one-argument operation (kmToMiles, celsiusToFahrenheit, ...) is tried on every number found so far; one that does not return a number is dropped by `add`
  for (const name of [...offered]) if (CARDS[name]?.fn.length === 1) for (const t of [...numeric()]) { if (t.constant) continue; add({ expr: `${name}(${t.expr})`, js: `${name}(${t.js})`, f: (a) => CARDS[name].fn(t.f(a)) }); }
  if (found) return found; wrap([...pool]); if (found) return found;
  const binary = (as, bs) => { for (const a of as) for (const b of bs) for (const [sym, fn] of [["+", (x, y) => x + y], ["-", (x, y) => x - y], ["*", (x, y) => x * y], ["/", (x, y) => (y === 0 ? NaN : x / y)]]) { if (a.constant && b.constant) continue; if ((sym === "+" || sym === "*") && a.expr > b.expr) continue; add({ expr: `(${a.expr} ${sym} ${b.expr})`, js: `(${a.js} ${sym} ${b.js})`, f: (x) => fn(a.f(x), b.f(x)) }); if (found) return; } };
  const L = numeric().filter((t) => base.includes(t)); let before = pool.length; binary(L, L); if (found) return found; let fresh = pool.slice(before); wrap(fresh); if (found) return found;
  const consts = pool.filter((t) => t.constant), mid = fresh.filter((t) => !t.arr).slice(0, 3000);
  before = pool.length; binary(mid, [...L.slice(0, 60), ...consts]); binary([...L.slice(0, 60), ...consts], mid); if (found) return found; wrap(pool.slice(before)); return found;
}

/** one numeric field: SOLVED only when the expression found on the shown examples also reproduces every run it was not shown; matching the shown examples alone is a COINCIDENCE (three numbers can be hit by a strange expression) */
export function solveField(contract, key, vals, extra = []) {
  const runs = contract.runs, heldOk = (t) => runs.slice(SHOWN).every((r) => { try { return same(t.f(r.args()), r.want()[key]); } catch { return false; } });
  // the search keeps going past an expression that fits the shown runs but not the held-out ones (a node's `lat` fits until a way's `center.lat` turns up)
  const mayContinue = runs.length - SHOWN >= MIN_HELD_FOR_SEARCH;
  let t = mayContinue ? synthesize(contract, vals, extra, heldOk) : null, coincidence = false;
  if (!t) { t = synthesize(contract, vals, extra); coincidence = mayContinue ? !!t : false; }
  if (!t) return { key, kind: "unsolved" };
  let held = 0, total = 0; for (const r of runs.slice(SHOWN)) { total++; try { if (same(t.f(r.args()), r.want()[key])) held++; } catch { /* a throw is a miss */ } }
  return { key, kind: !coincidence && total > 0 && held === total ? "solved" : "coincidence", expr: t.expr, heldOut: `${held}/${total}`, term: t };
}

/** every numeric output field of a contract: solved (and does it hold on the runs it was not shown?) or left to the model */
export function solveContract(contract) {
  const wants = contract.runs.slice(0, SHOWN).map((r) => r.want());
  if (!wants.every((w) => w && typeof w === "object" && !Array.isArray(w))) return { shape: "not-flat-object", fields: [] };
  const fields = [], extra = [];
  for (const k of [...new Set(wants.flatMap(Object.keys))]) {
    const vals = wants.map((w) => w[k]);
    if (!vals.every(isNum)) { fields.push({ key: k, kind: "non-numeric" }); continue; }
    const f = solveField(contract, k, vals, extra);
    if (f.kind === "solved") extra.push({ expr: k, js: `(${f.term.js})`, f: f.term.f });
    const { term, ...out } = f; fields.push({ ...out, js: term?.js, term });
  }
  return { shape: "object", fields };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  let solved = 0, ok = 0, numeric = 0, all = 0, nonNum = 0;
  for (const d of [...DIVERSE, ...HELDOUT]) {
    const r = solveContract(d.contract);
    if (r.shape !== "object") { console.log(d.contract.name.padEnd(14), "(result is not a flat object)"); continue; }
    console.log(d.contract.name.padEnd(14), r.fields.map((f) => f.kind === "solved" ? `${f.key} = ${f.expr}  [held-out ${f.heldOut}]` : f.kind === "coincidence" ? `${f.key}: matched the examples but not the held-out runs (${f.expr})` : `${f.key}: ${f.kind}`).join("\n".padEnd(16)));
    for (const f of r.fields) { all++; if (f.kind === "non-numeric") nonNum++; else numeric++; if (f.kind === "solved") { solved++; ok++; } }
  }
  console.log(`\n${all} output fields in the flat-object results: ${nonNum} are text (not searched), ${numeric} numeric — ${solved} solved with no model (each also right on every run it was not shown)`);
}
