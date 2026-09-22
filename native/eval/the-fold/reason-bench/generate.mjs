// reason-bench/generate.mjs — the benchmark's items and their GOLD (2026-09-22).
// Question: does Haiku reasoning THROUGH eoreader7 match Opus 5.5 reasoning
// alone? Every item is generated from a fixed seed; every gold answer is
// computed here by plain, independent code (reachability, DFS, explicit scope
// rules, arithmetic, union-find). This file imports NOTHING from eoreader7 —
// the engine never grades itself — and no model writes or checks an answer.
// Names are synthetic so world knowledge cannot help or hurt.
import fs from "node:fs";

let seed = 20260922;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const shuffle = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const codes = (n) => { const L = "BCDFGHJKLMNPQRSTVWXZ"; const out = new Set(); while (out.size < n) out.add(pick(L) + pick(L) + Math.floor(rnd() * 9 + 1)); return [...out]; };
const WORDS = ["billing", "auth", "ledger", "router", "views", "store", "cache", "queue", "mailer", "search", "export", "import", "session", "profile", "audit", "report", "upload", "notify", "payment", "invoice", "catalog", "cart", "shipping", "tax", "locale", "theme", "metrics", "health", "config", "logger", "crypto", "tokens", "admin", "webhook", "scheduler", "worker", "parser", "schema", "graph", "index"];

// reachability in a directed graph — the gold for "must X precede Y?"
const reaches = (adj, a, b) => { const seen = new Set([a]), st = [a]; while (st.length) { const v = st.pop(); if (v === b) return true; for (const w of adj.get(v) ?? []) if (!seen.has(w)) { seen.add(w); st.push(w); } } return false; };
const adjOf = (nodes, edges) => { const m = new Map(nodes.map((n) => [n, []])); for (const [a, b] of edges) m.get(a).push(b); return m; };
const randomDag = (nodes, perEdge) => { const order = shuffle(nodes), edges = []; for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) if (rnd() < perEdge) edges.push([order[i], order[j]]); return shuffle(edges); };

const items = [];
const SIZE_IX = { S: 0, M: 1, L: 2, XL: 3 };
// v2: the gold carries no position signal — each item's target is drawn from a
// seeded, shuffled half-YES/half-NO pool, and all items are shuffled together
// under opaque ids at the end. v1 (no flag) is byte-for-byte what it was.
const V2 = process.argv.includes("--v2");
const XL = (entry) => (V2 ? [entry] : []);
const V2_TARGETS = V2 ? shuffle([...Array(30).fill("YES"), ...Array(30).fill("NO")]) : null;
const want = (k) => k % 2 === 0; // v1: alternate the gold within each family and across sizes
const targetFor = (k, size) => (V2 ? V2_TARGETS.shift() : want(k + SIZE_IX[size]) ? "YES" : "NO");

// ── F1 ORDER ────────────────────────────────────────────────────────────────
for (const [size, n] of [["S", 7], ["M", 13], ["L", 20], ...XL(["XL", 40])]) for (let k = 0; k < 3; k++) {
  const nodes = codes(n);
  const edges = randomDag(nodes, 2.4 / n);
  const adj = adjOf(nodes, edges);
  const yes = targetFor(k, size) === "YES";
  let x, y, guard = 0;
  do { x = pick(nodes); y = pick(nodes); guard++; } while ((x === y || reaches(adj, x, y) !== yes || (yes && adj.get(x).includes(y))) && guard < 5000);
  const prose = `A project has ${n} steps: ${shuffle(nodes).join(", ")}. The only ordering requirements are: ${edges.map(([a, b]) => `${a} must be done before ${b}`).join("; ")}. No other requirements exist.`;
  items.push({ id: `order-${size}${k + 1}`, family: "order", size, prose, question: `In every valid ordering of the steps, must ${x} come before ${y}?`, gold: reaches(adj, x, y) ? "YES" : "NO", data: { nodes, edges, x, y } });
}

// ── F2 IMPORTS ──────────────────────────────────────────────────────────────
for (const [size, n] of [["S", 8], ["M", 16], ["L", 28], ...XL(["XL", 40])]) for (let k = 0; k < 3; k++) {
  const target = V2 ? targetFor(k, size) : null;
  let mods, edges, cyclic, adj, guardI = 0;
  do {
  mods = shuffle(WORDS).slice(0, n);
  edges = randomDag(mods, 2.2 / n);
  const planted = V2 ? target === "NO" : !want(k + SIZE_IX[size]); // planted cycle → gold NO (not acyclic)
  if (planted) {
    const adj = adjOf(mods, edges);
    const cands = [];
    for (const u of mods) for (const v of mods) if (u !== v && !adj.get(u).includes(v) && reaches(adj, u, v)) cands.push([u, v]);
    if (cands.length) { const [u, v] = pick(cands); edges = shuffle([...edges, [v, u]]); }
  }
  adj = adjOf(mods, edges);
  const color = new Map(); cyclic = false;
  const dfs = (v) => { color.set(v, 1); for (const w of adj.get(v)) { if (color.get(w) === 1) cyclic = true; else if (!color.get(w)) dfs(w); } color.set(v, 2); };
  for (const m of mods) if (!color.get(m)) dfs(m);
  guardI++;
  } while (V2 && (cyclic ? "NO" : "YES") !== target && guardI < 5000);
  const byMod = mods.map((m) => { const im = adj.get(m); return `${m} imports ${im.length ? im.join(", ") : "nothing"}`; });
  items.push({ id: `imports-${size}${k + 1}`, family: "imports", size, prose: `A codebase has ${n} modules. ${byMod.join(". ")}.`, question: "Is the import graph free of cycles?", gold: cyclic ? "NO" : "YES", data: { mods, edges } });
}

// ── F3 SCOPED TYPES ─────────────────────────────────────────────────────────
// gold rules, stated in the question itself: (1) two statements about one
// variable in the SAME scope with different types contradict; (2) a statement
// that holds "throughout" a scope contradicts any statement about that
// variable, with a different type, in a scope nested inside it; (3) otherwise
// an inner statement shadows an outer one, and sibling scopes never conflict.
const TYPES = ["number", "string", "boolean", "null", "array", "object"];
const VARS = ["amount", "id", "total", "user", "rate", "count", "label", "items", "flag", "limit"];
function scopeTree(mod) { const fns = shuffle(["charge", "refund", "load", "save", "render", "parse"]).slice(0, 3); const out = [mod]; for (const f of fns) { out.push(`${mod}.${f}`); for (const b of shuffle(["loop", "catch", "branch1", "branch2"]).slice(0, 2)) out.push(`${mod}.${f}.${b}`); } return out; }
const within = (outer, inner) => inner.startsWith(outer + ".");
function typesGold(stmts) {
  for (let i = 0; i < stmts.length; i++) for (let j = 0; j < stmts.length; j++) {
    if (i === j) continue;
    const a = stmts[i], b = stmts[j];
    if (a.v !== b.v || a.t === b.t) continue;
    if (a.scope === b.scope) return "YES";
    if (a.throughout && within(a.scope, b.scope)) return "YES";
  }
  return "NO";
}
for (const [size, n] of [["S", 6], ["M", 12], ["L", 20], ...XL(["XL", 36])]) for (let k = 0; k < 3; k++) {
  const target = targetFor(k, size);
  let stmts, guard = 0;
  do {
    const scopes = scopeTree(pick(WORDS));
    const vars = shuffle(VARS).slice(0, Math.max(3, Math.floor(n / 3)));
    stmts = [];
    for (let i = 0; i < n; i++) stmts.push({ scope: pick(scopes), v: pick(vars), t: pick(TYPES), throughout: rnd() < 0.25 });
    // dedupe exact repeats
    stmts = stmts.filter((s, i) => stmts.findIndex((o) => o.scope === s.scope && o.v === s.v && o.t === s.t) === i);
    guard++;
  } while (typesGold(stmts) !== target && guard < 20000);
  const say = (s) => (s.throughout ? `Throughout ${s.scope}, including every block nested inside it, \`${s.v}\` always has type ${s.t}.` : `In ${s.scope}, \`${s.v}\` has type ${s.t}.`);
  items.push({ id: `types-${size}${k + 1}`, family: "types", size, prose: `Scopes are dotted paths: a.b.c is nested inside a.b, which is nested inside a. ${stmts.map(say).join(" ")}`, question: "Treat a statement about an inner scope as shadowing one about an outer scope, unless the outer statement says it holds throughout its scope including nested blocks; statements in sibling scopes never conflict. Do these statements contradict each other?", gold: typesGold(stmts), data: { stmts } });
}

// ── F4 TIME ─────────────────────────────────────────────────────────────────
const hms = (s) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((x) => String(x).padStart(2, "0")).join(":");
for (const [size, n] of [["S", 4], ["M", 8], ["L", 12], ...XL(["XL", 20])]) for (let k = 0; k < 3; k++) {
  const names = codes(n).map((c) => `event ${c}`);
  const times = names.map(() => Math.floor(rnd() * 20 * 3600) + 3600);
  let a, b; do { a = Math.floor(rnd() * n); b = Math.floor(rnd() * n); } while (a === b || times[b] <= times[a]);
  const d = times[b] - times[a];
  const base = Math.floor(d / 60);
  const N = targetFor(k, size) === "YES" ? Math.max(1, base - (d % 60 === 0 ? 1 : 0)) : base + 1; // tight either side
  const order = shuffle(names.map((nm, i) => i));
  items.push({ id: `time-${size}${k + 1}`, family: "time", size, prose: `A log records these times (same day, hh:mm:ss): ${order.map((i) => `${names[i]} at ${hms(times[i])}`).join("; ")}.`, question: `Did ${names[b]} happen more than ${N} minutes after ${names[a]}?`, gold: d > N * 60 ? "YES" : "NO", data: { a: names[a], b: names[b], ta: hms(times[a]), tb: hms(times[b]), N } });
}

// ── F5 FACTS WITH ALIASES ───────────────────────────────────────────────────
const FIRST = ["Ilsa", "Tomas", "Mara", "Oren", "Petra", "Caius", "Wren", "Idris", "Selma", "Bram", "Nell", "Otto"];
const LAST = ["Marrow", "Voss", "Keel", "Harrow", "Stade", "Lind", "Cairn", "Fenn"];
const EPITHETS = ["the Heron", "the Lantern", "Old Salt", "the Quiet One", "the Cartographer", "Red Fenn", "the Bellwright", "the Ferryman"];
for (const [size, n] of [["S", 6], ["M", 14], ["L", 24], ...XL(["XL", 40])]) for (let k = 0; k < 3; k++) {
  const target = targetFor(k, size);
  let lines, gold, guard = 0, data;
  do {
    const people = []; const used = new Set();
    const nPeople = Math.max(3, Math.floor(n / 3));
    while (people.length < nPeople) { const nm = `${pick(FIRST)} ${pick(LAST)}`; if (!used.has(nm)) { used.add(nm); people.push({ name: nm, year: 1800 + Math.floor(rnd() * 120) }); } }
    const eps = shuffle(EPITHETS).slice(0, Math.min(EPITHETS.length, Math.ceil(nPeople / 2)));
    const alias = new Map(eps.map((e) => [e, pick(people).name]));
    const facts = [];
    for (let i = 0; i < n; i++) {
      const p = pick(people);
      const useAlias = [...alias.entries()].filter(([, who]) => who === p.name);
      const said = useAlias.length && rnd() < 0.5 ? pick(useAlias)[0] : p.name;
      facts.push({ who: said, year: p.year });
    }
    // a planted conflict: one fact with a wrong year (through an alias when one exists)
    if (target === "YES") { const f = pick(facts); f.year += 1 + Math.floor(rnd() * 3); }
    // gold: union-find over the stated aliases, then one year per identity
    const root = (x) => alias.get(x) ?? x;
    const years = new Map();
    for (const f of facts) { const r = root(f.who); if (!years.has(r)) years.set(r, new Set()); years.get(r).add(f.year); }
    gold = [...years.values()].some((s) => s.size > 1) ? "YES" : "NO";
    lines = shuffle([...facts.map((f) => `${f.who} was born in ${f.year}.`), ...[...alias.entries()].map(([e, who]) => `"${e}" is another name for ${who}.`)]);
    data = { facts, alias: Object.fromEntries(alias) };
    guard++;
  } while (gold !== target && guard < 20000);
  items.push({ id: `facts-${size}${k + 1}`, family: "facts", size, prose: lines.join(" ") + " (People who share a surname are different people unless a statement says otherwise.)", question: "A person is born in exactly one year. Do these statements contradict each other?", gold, data });
}

const here = new URL(".", import.meta.url).pathname;
if (V2) {
  // One shuffled order, opaque ids: neither carries the family, the size or the answer.
  const mixed = shuffle(items).map((it, i) => ({ ...it, id: `q${String(i + 1).padStart(2, "0")}`, origin: it.id }));
  fs.mkdirSync(here + "v2", { recursive: true });
  fs.writeFileSync(here + "v2/items.json", JSON.stringify(mixed, null, 1));
  fs.writeFileSync(here + "v2/questions.txt", mixed.map((it) => `${it.id}: ${it.prose}\nQuestion: ${it.question}`).join("\n\n"));
  items.length = 0; items.push(...mixed);
} else {
  fs.writeFileSync(here + "items.json", JSON.stringify(items, null, 1));
  fs.writeFileSync(here + "prompt-prose.txt", items.map((it) => `${it.id}: ${it.prose}\nQuestion: ${it.question}`).join("\n\n"));
}
const tally = {}; for (const it of items) { const k = `${it.family}`; tally[k] = tally[k] ?? { YES: 0, NO: 0 }; tally[k][it.gold]++; }
console.log(`${items.length} items`, JSON.stringify(tally));
