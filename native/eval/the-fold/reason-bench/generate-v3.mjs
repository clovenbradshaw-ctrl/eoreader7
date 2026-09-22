// reason-bench/generate-v3.mjs — the HARD round (2026-09-22). v2 was too tidy
// to separate Haiku from Opus 5.5 (both 60/60). v3 pushes what small models
// are known to break on: scale and depth (100-step orders, 120-module import
// graphs with 8–15-long cycles among near-cycles, 150 facts, 4-deep scopes),
// VARIED wording from declared phrasing tables, statements that impose no
// constraint, "used to import" decoys placed exactly where they would close a
// cycle if misread, alias CHAINS, decoy years that are not births, and
// 12-hour times straddling noon and midnight.
// Gold: independent code here. Imports nothing from eoreader7. Targets drawn
// from a seeded balanced pool; items shuffled under opaque ids (r01…).
import fs from "node:fs";

let seed = 20260923;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const shuffle = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const codes = (n) => { const L = "BCDFGHJKLMNPQRSTVWXZ"; const out = new Set(); while (out.size < n) out.add(pick(L) + pick(L) + Math.floor(rnd() * 9 + 1)); return [...out]; };
const fill = (tpl, o) => tpl.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const TARGETS = shuffle([...Array(23).fill("YES"), ...Array(22).fill("NO")]);
const items = [];

// Graph helpers — the gold's own code.
const adjOf = (nodes, edges) => { const m = new Map(nodes.map((n) => [n, []])); for (const [a, b] of edges) m.get(a).push(b); return m; };
const dist = (adj, a) => { const d = new Map([[a, 0]]), q = [a]; while (q.length) { const v = q.shift(); for (const w of adj.get(v) ?? []) if (!d.has(w)) { d.set(w, d.get(v) + 1); q.push(w); } } return d; };
const windowDag = (nodes, perNode, win) => { const order = shuffle(nodes), edges = [], seen = new Set(); order.forEach((a, i) => { for (let k = 0; k < perNode; k++) { const j = i + 1 + Math.floor(rnd() * win); if (j < order.length) { const key = a + ">" + order[j]; if (!seen.has(key)) { seen.add(key); edges.push([a, order[j]]); } } } }); return edges; };

// ── ORDER ───────────────────────────────────────────────────────────────────
const ORDER_T = ["{a} must be done before {b}", "{b} cannot start until {a} is finished", "only after {a} is complete may {b} begin", "{a} has to come earlier than {b}"];
const FREE_T = ["{a} and {b} may happen in either order", "there is no required order between {a} and {b}"];
for (const [size, n] of [["M", 30], ["L", 60], ["XL", 100]]) for (let k = 0; k < 3; k++) {
  const target = TARGETS.pop();
  let nodes, edges, adj, x, y, g = 0;
  for (;;) {
    nodes = codes(n); edges = windowDag(nodes, 2, 5); adj = adjOf(nodes, edges);
    const cands = [];
    for (const a of nodes) { const da = dist(adj, a); for (const b of nodes) { if (a === b) continue; const ab = da.get(b); if (target === "YES" && ab >= 6) cands.push([a, b]); if (target === "NO" && ab === undefined) { const ba = dist(adj, b).get(a); if (ba === undefined || ba >= 4) cands.push([a, b]); } } }
    if (cands.length || ++g > 200) { [x, y] = pick(cands); break; }
  }
  const incomparable = []; for (const a of nodes) { const da = dist(adj, a); for (const b of nodes) if (a < b && !da.has(b) && !dist(adj, b).has(a)) incomparable.push([a, b]); }
  const free = shuffle(incomparable).slice(0, Math.floor(n / 5)).map(([a, b]) => fill(pick(FREE_T), { a, b }));
  const lines = shuffle([...edges.map(([a, b]) => fill(pick(ORDER_T), { a, b })), ...free]);
  const gold = dist(adj, x).has(y) ? "YES" : "NO";
  items.push({ family: "order", size, target, gold, prose: `A project has ${n} steps: ${shuffle(nodes).join(", ")}. These are ALL the ordering requirements (statements that allow either order impose none): ${lines.join("; ")}.`, question: `In every valid ordering of the steps, must ${x} come before ${y}?` });
}

// ── IMPORTS ─────────────────────────────────────────────────────────────────
const W = ["billing", "auth", "ledger", "router", "views", "store", "cache", "queue", "mailer", "search", "export", "session", "profile", "audit", "report", "upload", "notify", "payment", "invoice", "catalog", "cart", "shipping", "tax", "locale", "theme", "metrics", "health", "config", "logger", "crypto", "tokens", "admin", "webhook", "scheduler", "worker", "parser", "schema", "graph", "index", "vault"];
const modNames = (n) => { const out = new Set(); while (out.size < n) out.add(`${pick(W)}_${pick(W)}`.replace(/^(\w+)_\1$/, "$1_core")); return [...out]; };
const IMP_T = ["{a} imports {b}", "{a} depends on {b}", "{b} is pulled in by {a}", "{a} requires {b} at load time"];
const OLD_T = ["{a} used to import {b}, but that import was removed", "{a} no longer depends on {b}"];
for (const [size, n] of [["M", 40], ["L", 80], ["XL", 120]]) for (let k = 0; k < 3; k++) {
  const target = TARGETS.pop();
  let mods, edges, adj, g = 0, backs = [];
  for (;;) {
    mods = modNames(n); edges = windowDag(mods, 2, 6); adj = adjOf(mods, edges);
    backs = []; for (const a of mods) { const d = dist(adj, a); for (const [b, L] of d) if (L >= 7 && L <= 14) backs.push([b, a]); }
    if (backs.length >= 4 || ++g > 200) break;
  }
  const decoys = shuffle(backs).slice(0, 4);           // each WOULD close a long cycle if read as a current import
  if (target === "NO") edges = [...edges, decoys.shift()]; // a real long cycle
  adj = adjOf(mods, edges);
  const color = new Map(); let cyclic = false;
  const dfs = (v) => { color.set(v, 1); for (const w of adj.get(v)) { if (color.get(w) === 1) cyclic = true; else if (!color.get(w)) dfs(w); } color.set(v, 2); };
  for (const m of mods) if (!color.get(m)) dfs(m);
  const lines = shuffle([...edges.map(([a, b]) => fill(pick(IMP_T), { a, b })), ...decoys.map(([a, b]) => fill(pick(OLD_T), { a, b }))]);
  items.push({ family: "imports", size, target, gold: cyclic ? "NO" : "YES", prose: `A codebase has ${n} modules. ${lines.join(". ")}.`, question: "Counting only the imports that exist now, is the import graph free of cycles?" });
}

// ── FACTS ───────────────────────────────────────────────────────────────────
const FIRST = ["Ilsa", "Tomas", "Mara", "Oren", "Petra", "Caius", "Wren", "Idris", "Selma", "Bram", "Nell", "Otto", "Ines", "Lior", "Runa", "Emil", "Tova", "Anselm", "Dagny", "Fenna"];
const LAST = ["Marrow", "Voss", "Keel", "Harrow", "Stade", "Lind", "Cairn", "Fenn", "Brask", "Holt", "Vey", "Orme"];
const EPI = ["the Heron", "the Lantern", "Old Salt", "the Quiet One", "the Cartographer", "Red Fenn", "the Bellwright", "the Ferryman", "the Owl", "Longstride", "the Tinker", "Grey Wick", "the Archivist", "Half-Moon", "the Glazier", "Stormcrow", "the Weaver", "Copperhand", "the Pilgrim", "Nightjar", "the Smith", "Marsh Hare", "the Almoner", "Tallow"];
const BORN_T = ["{x} was born in {y}.", "{x}'s birth year was {y}.", "The records give {y} as the year {x} was born."];
const ALIAS_T = ["\"{e}\" is another name for {x}.", "{x} also went by \"{e}\".", "\"{e}\" was what people called {x}."];
const DECOY_T = ["{x}'s sister was born in {y}.", "In {y}, {x} moved to the coast.", "{x} died in {y}.", "{x}'s first ship was launched in {y}."];
for (const [size, n] of [["M", 40], ["L", 80], ["XL", 150]]) for (let k = 0; k < 3; k++) {
  const target = TARGETS.pop();
  const nP = Math.max(8, Math.floor(n / 5));
  const people = []; const used = new Set();
  while (people.length < nP) { const nm = `${pick(FIRST)} ${pick(LAST)}`; if (!used.has(nm)) { used.add(nm); people.push({ name: nm, year: 1780 + Math.floor(rnd() * 140) }); } }
  // alias CHAINS: an alias may name a person or another alias
  const parent = new Map(); const eps = shuffle(EPI).slice(0, Math.min(EPI.length, Math.floor(nP * 0.9)));
  const names = people.map((p) => p.name);
  for (const e of eps) { const to = rnd() < 0.4 && parent.size ? pick([...parent.keys()]) : pick(names); parent.set(e, to); }
  const root = (x) => { let r = x, g = 0; while (parent.has(r) && g++ < 50) r = parent.get(r); return r; };
  const yearOf = new Map(people.map((p) => [p.name, p.year]));
  const births = [], decoys = [];
  const allNames = [...names, ...eps];
  const nBirth = Math.floor(n * 0.45), nDecoy = n - nBirth - eps.length;
  for (let i = 0; i < nBirth; i++) { const x = pick(allNames); births.push({ x, y: yearOf.get(root(x)) }); }
  for (let i = 0; i < Math.max(0, nDecoy); i++) { const x = pick(names); decoys.push(fill(pick(DECOY_T), { x, y: 1780 + Math.floor(rnd() * 160) })); }
  if (target === "YES") { // one birth, stated through an alias chain where possible, with a wrong year
    const chained = eps.filter((e) => parent.has(parent.get(e)));
    const x = chained.length ? pick(chained) : pick(eps);
    births.push({ x, y: yearOf.get(root(x)) + 1 + Math.floor(rnd() * 3) });
    births.push({ x: root(x), y: yearOf.get(root(x)) }); // and the true year, said directly
  }
  const ys = new Map(); for (const b of births) { const r = root(b.x); if (!ys.has(r)) ys.set(r, new Set()); ys.get(r).add(b.y); }
  const gold = [...ys.values()].some((s) => s.size > 1) ? "YES" : "NO";
  const aliasLines = [...parent.entries()].map(([e, to]) => (parent.has(to) || !names.includes(to) ? `"${e}" was yet another name for "${to}".` : fill(pick(ALIAS_T), { e, x: to })));
  const lines = shuffle([...births.map((b) => fill(pick(BORN_T), b)), ...aliasLines, ...decoys]);
  items.push({ family: "facts", size, target, gold, prose: lines.join(" ") + " (People who share a first name or a surname are different people unless a statement says otherwise. Only statements about a person's OWN birth give their birth year.)", question: "A person is born in exactly one year. Do these statements contradict each other about anyone's birth year?" });
}

// ── TYPES ───────────────────────────────────────────────────────────────────
const TY = ["number", "string", "boolean", "null", "array", "object", "date", "bigint"];
const VARS = ["amount", "id", "total", "user", "rate", "count", "label", "items", "flag", "limit", "cursor", "token", "offset", "payload", "status", "retries"];
const PLAIN_T = ["In {s}, `{v}` has type {t}.", "Inside {s}, `{v}` is a {t}.", "`{v}` holds a {t} within {s}."];
const STRICT_T = ["Everywhere within {s}, nested blocks included, `{v}` is always a {t}.", "Throughout {s} and every block nested in it, `{v}` has type {t}."];
const within = (outer, inner) => inner.startsWith(outer + ".");
const conflicts = (a, b) => a.v === b.v && a.t !== b.t && (a.scope === b.scope || (a.strict && within(a.scope, b.scope)) || (b.strict && within(b.scope, a.scope)));
for (const [size, n] of [["M", 40], ["L", 80], ["XL", 120]]) for (let k = 0; k < 3; k++) {
  const target = TARGETS.pop();
  const mod = pick(W); const scopes = [mod];
  for (const f of shuffle(["charge", "refund", "load", "save", "render", "parse", "sync", "flush"]).slice(0, 4)) { scopes.push(`${mod}.${f}`); for (const b of shuffle(["loop", "catch", "branch1", "branch2", "retry"]).slice(0, 3)) { scopes.push(`${mod}.${f}.${b}`); for (const c of shuffle(["inner", "guard", "fallback"]).slice(0, 2)) scopes.push(`${mod}.${f}.${b}.${c}`); } }
  const vars = shuffle(VARS).slice(0, 8);
  const stmts = []; let guard = 0;
  while (stmts.length < n && guard++ < 100000) {
    const s = { scope: pick(scopes), v: pick(vars), t: pick(TY), strict: rnd() < 0.2 };
    if (stmts.some((o) => o.scope === s.scope && o.v === s.v && o.t === s.t)) continue;
    if (stmts.some((o) => conflicts(o, s))) continue; // build conflict-free first
    stmts.push(s);
  }
  if (target === "YES") { // exactly one planted conflict: a strict outer claim vs a deep inner one, far apart in the text
    const outers = stmts.filter((s) => s.strict && s.scope.split(".").length <= 2);
    let o = outers.length ? pick(outers) : null;
    if (!o) { o = { scope: pick(scopes.filter((x) => x.split(".").length === 2)), v: pick(vars), t: pick(TY), strict: true }; if (!stmts.some((x) => conflicts(x, o))) stmts.unshift(o); }
    const deep = scopes.filter((x) => within(o.scope, x) && x.split(".").length >= 4);
    const inner = { scope: pick(deep.length ? deep : scopes.filter((x) => within(o.scope, x))), v: o.v, t: pick(TY.filter((t) => t !== o.t)), strict: false };
    stmts.push(inner);
  }
  let gold = "NO"; for (let i = 0; i < stmts.length; i++) for (let j = i + 1; j < stmts.length; j++) if (conflicts(stmts[i], stmts[j])) gold = "YES";
  const text = (s) => fill(pick(s.strict ? STRICT_T : PLAIN_T), { s: s.scope, v: s.v, t: s.t });
  const ordered = target === "YES" ? [stmts[stmts.length - 1], ...shuffle(stmts.slice(0, -1))].reverse() : shuffle(stmts);
  items.push({ family: "types", size, target, gold, prose: `Scopes are dotted paths: a.b.c is nested inside a.b, which is nested inside a. ${ordered.map(text).join(" ")}`, question: "An inner-scope statement shadows an outer one, unless the outer statement says it holds throughout its scope including nested blocks; sibling scopes never conflict. Do these statements contradict each other?" });
}

// ── TIME ────────────────────────────────────────────────────────────────────
const h12 = (s) => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; const ap = h < 12 ? "AM" : "PM"; const hh = h % 12 === 0 ? 12 : h % 12; return `${hh}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")} ${ap}`; };
for (const [size, n] of [["M", 10], ["L", 20], ["XL", 40]]) for (let k = 0; k < 3; k++) {
  const target = TARGETS.pop();
  const names = codes(n).map((c) => `event ${c}`);
  const times = names.map(() => Math.floor(rnd() * 86400));
  // make the asked pair straddle noon or midnight's hour-12 trap
  const a = 0, b = 1;
  const trap = pick(["noon", "midnight"]);
  times[a] = trap === "noon" ? 11 * 3600 + Math.floor(rnd() * 3600) : Math.floor(rnd() * 3600);            // 11:xx AM, or 12:xx AM (just after midnight)
  times[b] = trap === "noon" ? 12 * 3600 + Math.floor(rnd() * 3600) : 12 * 3600 + Math.floor(rnd() * 3600); // 12:xx PM
  if (times[b] <= times[a]) times[b] = times[a] + 61;
  const d = times[b] - times[a], base = Math.floor(d / 60);
  const N = target === "YES" ? Math.max(1, base - (d % 60 === 0 ? 1 : 0)) : base + 1;
  const order = shuffle(names.map((_, i) => i));
  items.push({ family: "time", size, target, gold: d > N * 60 ? "YES" : "NO", prose: `A log from a single day records (12-hour clock): ${order.map((i) => `${names[i]} at ${h12(times[i])}`).join("; ")}.`, question: `Did ${names[b]} happen more than ${N} minutes after ${names[a]}?` });
}

const mixed = shuffle(items).map((it, i) => ({ id: `r${String(i + 1).padStart(2, "0")}`, ...it }));
const here = new URL(".", import.meta.url).pathname;
fs.mkdirSync(here + "v3", { recursive: true });
fs.writeFileSync(here + "v3/items.json", JSON.stringify(mixed, null, 1));
fs.writeFileSync(here + "v3/questions.txt", mixed.map((it) => `${it.id}: ${it.prose}\nQuestion: ${it.question}`).join("\n\n"));
const t = {}; for (const it of mixed) { t[it.family] ??= { YES: 0, NO: 0 }; t[it.family][it.gold]++; }
const drift = mixed.filter((it) => it.gold !== it.target).map((it) => `${it.family}-${it.size}`);
console.log(`${mixed.length} items`, JSON.stringify(t), `gold≠target: ${drift.length ? drift.join(",") : "none"}`);
