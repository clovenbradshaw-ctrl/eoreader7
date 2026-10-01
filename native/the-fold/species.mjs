// ═══ LOVELACE · TEACH IT TO FISH ═══ THE REST OF THE CHEAP SPECIES — NO MODEL. Each fills a slot a different way, is checked by the same examples, and counts as SOLVED only if it also reproduces every run it was not shown.
//
//   decide    a categorical answer from a short decision list: `free == 0 -> "full"`, `percentFull >= 85 -> "busy"`, else `"ok"` — predicates over the numeric terms already solved, constants from the person's words
//   template  a string made of input strings and the literal text between them (`"JFK → LAX"`) — the literal is read off the first example and must be the same in all of them
//   map       a list that is an input list passed through one operation (`times.map(padTime)`)
//   argmax    the item of a list with the largest key (the longest word, the priciest line), the first on a tie, `""` for none
//
// Nothing here knows what a ward, a flight or a cart is; the leaves are the input's own paths and the operations are the cards the person's words name plus the language's own.
import { CARDS, cardsFor } from "../organs/cards.js";
import { leaves as numericLeaves, wordConstants, UNIT_FACTORS } from "./synth-fields.mjs";
import { keyTokens } from "../organs/key-referents.js";

const SHOWN = 3;
const get = (v, path) => path.reduce((a, k) => a?.[k], v);
const same = (a, b) => (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-9 : JSON.stringify(a) === JSON.stringify(b));
const money = (v) => (typeof v === "number" ? v : typeof v === "string" && /^\$?\s*-?[\d,]*\.?\d+$/.test(v.trim()) ? Number(v.replace(/[$,\s]/g, "")) : NaN);

/** strings the person's words put in quotes: "full", "busy" — the vocabulary of a categorical answer. Read with a character loop, not a pattern. */
export function quotedIn(contract) {
  const text = [contract.doc, contract.returns, contract.notes].join(" "), out = [];
  for (let i = 0; i < text.length; i++) if (text[i] === '"') { const j = text.indexOf('"', i + 1); if (j < 0) break; const q = text.slice(i + 1, j); if (q && q.length <= 24 && !/\s{2,}/.test(q) && !out.includes(q)) out.push(q); i = j; }
  return out;
}

/** every path of the input that holds a string, a list of scalars or a list of objects, in every shown run: { js, f, kind } */
export function structLeaves(contract) {
  const offered = new Set(cardsFor(contract).map((c) => c.name)), runs = contract.runs.slice(0, SHOWN), a0 = runs.map((r) => r.args()), out = [];
  contract.params.forEach((p, i) => {
    const walk = (vals, path, js, depth) => {
      if (vals.every((v) => typeof v === "string")) {
        out.push({ js, f: (a) => get(a[i], path), kind: "string" });
        if (offered.has("splitWords")) out.push({ js: `splitWords(${js})`, f: (a) => CARDS.splitWords.fn(get(a[i], path)), kind: "list-string" }); // a passage is also its words, when the person's words name that operation
        return;
      }
      if (vals.every(Array.isArray)) {
        const items = vals.flat();
        if (items.length && items.every((x) => typeof x === "string")) out.push({ js, f: (a) => get(a[i], path), kind: "list-string" });
        else if (items.length && items.every((x) => typeof x === "number")) out.push({ js, f: (a) => get(a[i], path), kind: "list-number" });
        else if (items.length && items.every((x) => x === null || ["string", "number", "boolean"].includes(typeof x))) out.push({ js, f: (a) => get(a[i], path), kind: "list-scalar" });
        else if (items.length && items.every((x) => x && typeof x === "object")) out.push({ js, f: (a) => get(a[i], path), kind: "list-object", keys: [...new Set(items.flatMap(Object.keys))] });
        else if (!items.length) out.push({ js, f: (a) => get(a[i], path), kind: "list-empty" });
        return;
      }
      if (vals.every((v) => v && typeof v === "object")) { for (const k of [...new Set(vals.flatMap(Object.keys))]) walk(vals.map((v) => v?.[k]), [...path, k], `${js}.${k}`, depth + 1); }
    };
    walk(a0.map((a) => a[i]), [], p, 0);
  });
  return out;
}

const finish = (contract, key, js, f) => ({ js, f });

/** a term is NAMED when every word of its name is a word the person used (`percentFull`, `free`, `occupied beds`); `patients_waiting` is not in the words of a ward's status, so it is the last resort, not the first guess */
const named = (contract, name) => { const said = new Set(keyTokens([contract.doc, contract.returns, contract.notes].join(" "))); const t = keyTokens(name); return t.length > 0 && t.every((w) => said.has(w)); };

/** how close the person's words put a term's name to a quoted answer: `"gold" when accuracy is 90 or more` ties `accuracy` to "gold"; characters between the two, Infinity when never mentioned */
const nearness = (contract, name) => {
  const text = [contract.doc, contract.returns, contract.notes].join(" ").replace(/([a-z0-9])([A-Z])/g, "$1 $2"), lower = text.toLowerCase(), quotes = [];
  for (let i = 0; i < text.length; i++) if (text[i] === '"') { const j = text.indexOf('"', i + 1); if (j < 0) break; quotes.push(i); i = j; }
  const at = []; for (const w of keyTokens(name)) { for (let i = lower.indexOf(w); i >= 0; i = lower.indexOf(w, i + 1)) { const b = lower[i - 1], a = lower[i + w.length]; if (!(b && /[a-z0-9]/.test(b)) && !(a && /[a-z0-9]/.test(a))) at.push(i); } }
  return at.length && quotes.length ? Math.min(...at.flatMap((i) => quotes.map((q) => Math.abs(i - q)))) : Infinity;
};
const NEAR = 70;

/** READ THE RULE OFF THE WORDS: `"gold" when accuracy is 90 or more, else "silver" when accuracy is 75 or more, else "bronze"` is already a decision list. Each quoted answer is followed by its own clause; a term the clause
 *  names and a number it states are the rule's test (the comparison — at least, at most, exactly — is tried all three ways and the examples choose). The last quoted answer is the else. Returns null when the
 *  words are not shaped that way, and the example search below takes over. */
export function decideFromWords(contract, wants, terms) {
  const text = [contract.doc, contract.returns, contract.notes].join(" "), lower = text.toLowerCase(), vocab = new Set([...wants, ...quotedIn(contract)]), qs = [];
  for (let i = 0; i < text.length; i++) if (text[i] === '"') { const j = text.indexOf('"', i + 1); if (j < 0) break; const q = text.slice(i + 1, j); if (vocab.has(q) && wants.includes(q) || (vocab.has(q) && qs.length)) qs.push({ q, start: i, end: j + 1 }); i = j; }
  const seen = new Set(), ordered = qs.filter((x) => !seen.has(x.q) && seen.add(x.q));
  if (ordered.length < 2 || !wants.every((w) => typeof w === "string")) return null;
  const runs = contract.runs.slice(0, SHOWN), args = runs.map((r) => r.args()), numbers = (str) => [...str.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?![\w.])/g)].map((m) => Number(m[0]));
  const OPS = { "===": (x, c) => x === c, ">=": (x, c) => x >= c, "<=": (x, c) => x <= c };
  const rules = ordered.slice(0, -1).map((x, i) => {
    const win = text.slice(x.end, ordered[i + 1].start), said = new Set(keyTokens(win)), near = terms.filter((t) => { const k = keyTokens(t.name ?? ""); return k.length && k.every((w) => said.has(w)); }), cs = numbers(win);
    const cands = []; for (const t of near) for (const c of cs.length ? cs : [0]) for (const op of Object.keys(OPS)) { let vec; try { vec = args.map((a) => OPS[op](t.f(a), c)); } catch { continue; } if (vec.every((b) => typeof b === "boolean")) cands.push({ js: `${t.js} ${op} ${c}`, vec, test: (a) => OPS[op](t.f(a), c) }); }
    return { v: x.q, cands };
  });
  if (rules.some((r) => !r.cands.length)) return null;
  const otherwise = ordered.at(-1).q;
  const pick = (i, chosen) => {
    if (i === rules.length) return args.every((_, k) => { const hit = chosen.find((r) => r.p.vec[k]); return (hit ? hit.v : otherwise) === wants[k]; }) ? chosen : null;
    for (const p of rules[i].cands) { const r = pick(i + 1, [...chosen, { p, v: rules[i].v }]); if (r) return r; }
    return null;
  };
  const got = pick(0, []); if (!got) return null;
  return { js: got.reduceRight((acc, r) => `(${r.p.js} ? ${JSON.stringify(r.v)} : ${acc})`, JSON.stringify(otherwise)), f: (a) => { const hit = got.find((r) => r.p.test(a)); return hit ? hit.v : otherwise; } };
}

/** DECIDE: a decision list of up to two rules and an else, over numeric terms (`terms`: { name, js, f }), the ones the person's words put next to a quoted answer tried first, then the ones they name at all */
export function decide(contract, wants, terms) {
  const runs = contract.runs.slice(0, SHOWN), args = runs.map((r) => r.args()), vocab = [...new Set([...wants, ...quotedIn(contract)])].filter((v) => typeof v === "string");
  if (!wants.every((w) => typeof w === "string") || vocab.length < 2) return null;
  const consts = [...new Set([...wordConstants(contract), 0, ...Object.values(UNIT_FACTORS)])].filter((c) => Number.isFinite(c));
  const search = (ts) => {
    const preds = [];
    // a test against zero is an equality (`free === 0`); against any other number it is a threshold (`percentFull >= 85`) — a single point is the weaker guess. The held-out runs still decide.
    const OPS = { "===": (x, c) => x === c, ">=": (x, c) => x >= c, "<=": (x, c) => x <= c };
    for (const t of ts) for (const c of consts) for (const op of c === 0 ? ["===", ">=", "<="] : [">=", "<=", "==="]) {
      const fn = OPS[op]; let vec; try { vec = args.map((a) => fn(t.f(a), c)); } catch { continue; } if (vec.some((x) => typeof x !== "boolean")) continue;
      preds.push({ js: `${t.js} ${op} ${c}`, test: (a) => fn(t.f(a), c), vec });
    }
    const consistent = (rules, otherwise) => args.every((_, i) => { const hit = rules.find((r) => r.p.vec[i]); return (hit ? hit.v : otherwise) === wants[i]; });
    const build = (rules, otherwise) => ({ js: rules.reduceRight((acc, r) => `(${r.p.js} ? ${JSON.stringify(r.v)} : ${acc})`, JSON.stringify(otherwise)), f: (a) => { const hit = rules.find((r) => r.p.test(a)); return hit ? hit.v : otherwise; } });
    for (const o of vocab) if (consistent([], o)) return build([], o);
    for (const p1 of preds) for (const v1 of vocab) for (const o of vocab) if (v1 !== o && consistent([{ p: p1, v: v1 }], o)) return build([{ p: p1, v: v1 }], o);
    for (const p1 of preds) for (const v1 of vocab) for (const p2 of preds) { if (p2 === p1) continue; for (const v2 of vocab) { if (v2 === v1) continue; for (const o of vocab) if (o !== v2 && consistent([{ p: p1, v: v1 }, { p: p2, v: v2 }], o)) return build([{ p: p1, v: v1 }, { p: p2, v: v2 }], o); } }
    return null;
  };
  // nearest term first: the search widens one term at a time, so `accuracy` (right beside "gold") is tried alone before `shots` (a few words further off) is allowed into a rule
  const fromWords = decideFromWords(contract, wants, terms); if (fromWords) return fromWords;
  const ranked = terms.map((t) => ({ t, d: nearness(contract, t.name ?? "") })).sort((x, y) => x.d - y.d).filter((x) => x.d <= NEAR);
  for (let k = 1; k <= ranked.length; k++) { const r = search(ranked.slice(0, k).map((x) => x.t)); if (r) return r; }
  return search(terms.filter((t) => named(contract, t.name ?? ""))) ?? search(terms);
}

/** TEMPLATE: pieces of the input strings joined by a literal read off the examples */
export function template(contract, wants) {
  if (!wants.every((w) => typeof w === "string" && w.length)) return null;
  const runs = contract.runs.slice(0, SHOWN), args = runs.map((r) => r.args()), ls = structLeaves(contract).filter((l) => l.kind === "string");
  const vals = (l) => args.map((a) => l.f(a)), order = (seq) => {
    // the literal between and around the leaves is read from example 1 and must hold in every example
    const w0 = wants[0], pos = []; let from = 0;
    for (const l of seq) { const v = vals(l)[0]; const at = w0.indexOf(v, from); if (!v || at < 0) return null; pos.push([at, at + v.length]); from = at + v.length; }
    const lits = [w0.slice(0, pos[0][0]), ...pos.slice(1).map((p, i) => w0.slice(pos[i][1], p[0])), w0.slice(pos.at(-1)[1])];
    if (lits.every((x) => x === "")) return null;
    for (let i = 0; i < args.length; i++) { let s = lits[0]; seq.forEach((l, j) => { s += vals(l)[i] + lits[j + 1]; }); if (s !== wants[i]) return null; }
    return { js: "`" + lits[0].replace(/[`\\$]/g, "\\$&") + seq.map((l, j) => "${" + l.js + "}" + lits[j + 1].replace(/[`\\$]/g, "\\$&")).join("") + "`", f: (a) => { let s = lits[0]; seq.forEach((l, j) => { s += l.f(a) + lits[j + 1]; }); return s; } };
  };
  for (const a of ls) { const r = order([a]); if (r) return r; }
  for (const a of ls) for (const b of ls) if (a !== b) { const r = order([a, b]); if (r) return r; }
  for (const a of ls) for (const b of ls) for (const c of ls) if (a !== b && b !== c && a !== c) { const r = order([a, b, c]); if (r) return r; }
  return null;
}

/** MAP: an input list through one operation — a card the words name, or the language's own */
export function mapList(contract, wants) {
  if (!wants.every(Array.isArray)) return null;
  const runs = contract.runs.slice(0, SHOWN), args = runs.map((r) => r.args()), ops = [];
  for (const c of cardsFor(contract)) if (CARDS[c.name]?.fn.length === 1) ops.push({ js: c.name, fn: CARDS[c.name].fn });
  ops.push({ js: "(x) => String(x).toLowerCase()", fn: (x) => String(x).toLowerCase() }, { js: "(x) => String(x)", fn: (x) => String(x) }, { js: "(x) => x", fn: (x) => x });
  for (const l of structLeaves(contract).filter((x) => x.kind === "list-string" || x.kind === "list-number" || x.kind === "list-empty" || x.kind === "list-scalar")) for (const o of ops) {
    try { if (args.every((a, i) => same(l.f(a).map(o.fn), wants[i]))) return { js: `${l.js}.map(${o.js})`, f: (a) => l.f(a).map(o.fn) }; } catch { /* the operation does not apply */ }
  }
  return null;
}

/** ARGMAX: the item of a list with the largest key; ties go to the first; no item is "" */
export function argmax(contract, wants) {
  if (!wants.every((w) => typeof w === "string")) return null;
  const runs = contract.runs.slice(0, SHOWN), args = runs.map((r) => r.args());
  const pick = (list, key, out) => { let best = null, bk = -Infinity; for (const x of list) { const k = key(x); if (k > bk) { bk = k; best = x; } } return best == null ? "" : out(best); };
  const cands = [];
  for (const l of structLeaves(contract)) {
    if (l.kind === "list-string") cands.push({ js: `${l.js}.reduce((b, w) => (w.length > b.length ? w : b), "")`, f: (a) => pick(l.f(a), (w) => w.length, (w) => w), note: "longest" });
    if (l.kind === "list-object") {
      const nums = l.keys, strs = l.keys;
      for (const out of strs) for (const k1 of nums) { cands.push({ js: `${l.js}.reduce((b, x) => (parseMoney(x.${k1}) > (b ? parseMoney(b.${k1}) : -Infinity) ? x : b), null)?.${out} ?? ""`, f: (a) => pick(l.f(a), (x) => money(x[k1]), (x) => x[out]) });
        for (const k2 of nums) if (k1 < k2) cands.push({ js: `${l.js}.reduce((b, x) => (parseMoney(x.${k1}) * parseMoney(x.${k2}) > (b ? parseMoney(b.${k1}) * parseMoney(b.${k2}) : -Infinity) ? x : b), null)?.${out} ?? ""`, f: (a) => pick(l.f(a), (x) => money(x[k1]) * money(x[k2]), (x) => x[out]) }); }
    }
  }
  for (const c of cands) { try { if (args.every((a, i) => c.f(a) === wants[i])) return c; } catch { /* a throw is a miss */ } }
  return null;
}
/** TOPK: the k best items of a list of words — optionally lower-cased and distinct — ordered longest first, ties alphabetically or in list order; k is a number the person's words state */
export function topk(contract, wants) {
  if (!wants.every((w) => Array.isArray(w) && w.every((x) => typeof x === "string"))) return null;
  const runs = contract.runs.slice(0, SHOWN), args = runs.map((r) => r.args()), ks = [...wordConstants(contract).filter((n) => Number.isInteger(n) && n > 0 && n <= 20), Infinity];
  for (const l of structLeaves(contract).filter((x) => x.kind === "list-string")) for (const lower of [true, false]) for (const distinct of [true, false]) for (const alpha of [true, false]) for (const k of ks) {
    const f = (a) => { let w = l.f(a); if (lower) w = w.map((x) => x.toLowerCase()); if (distinct) w = [...new Set(w)]; return [...w].sort((x, y) => y.length - x.length || (alpha ? (x < y ? -1 : x > y ? 1 : 0) : 0)).slice(0, k); };
    try { if (args.every((a, i) => same(f(a), wants[i]))) return { f, js: `${distinct ? "[...new Set(" : "["}${distinct ? "" : "..."}${l.js}${lower ? ".map((x) => x.toLowerCase())" : ""}${distinct ? ")]" : "]"}.sort((x, y) => y.length - x.length${alpha ? " || (x < y ? -1 : x > y ? 1 : 0)" : ""}).slice(0, ${Number.isFinite(k) ? k : "Infinity"})` }; } catch { /* does not apply */ }
  }
  return null;
}
void finish; void numericLeaves;
