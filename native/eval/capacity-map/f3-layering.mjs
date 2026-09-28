// eval/capacity-map/f3-layering.mjs — F3 of native/docs/THE-CAPACITY-MAP.md: is the strict
// class order a fact about how the system is BUILT?
//
// Population (declared in the document, section 5): every module under native/ (excluding
// tests/, eval/, node_modules) that self-declares `export const CELL` or `export const CELLS`,
// unioned with every module named by an entry of organs/capacities.js::CAPACITIES (terrain given
// there), the entry resolved to a file BY BASENAME. Two resolution rules the document leaves to
// the driver are declared here, before the run, and are conservative: a basename matching more
// than one file is AMBIGUOUS and excluded; a module whose self-declared class disagrees with its
// CAPACITIES class is a CONFLICT and excluded. Both are listed, never silently dropped. A module
// whose cells span more than one domain (resp. grain) is excluded from that analysis and listed.
//
// Statistic: over direct static imports between two population modules of DIFFERENT class, the
// number of UPWARD edges (importer's class rank strictly below the imported module's:
// arithmetic 0 < geometric 1 < transcendental 2); the same for grain (0 < 1 < 2).
// Null: 1000 permutations (declared; seed 7) of the class (resp. grain) labels among the
// population, the import graph held fixed. SUPPORTED-AS-LAYERING iff p_low = (1 + #{null <= obs})
// / (1 + 1000) < 0.05. Fewer than 10 cross-class edges = UNDERPOWERED (typed, not read).
import fs from "node:fs";
import path from "node:path";
import { cellOf, GRAINS } from "../../kernel/cube.js";
import { CLASS_DOMAIN, placeOf } from "../../kernel/capacity-map.js";
import { CAPACITIES } from "../../organs/capacities.js";
import { lcg, shuffle } from "./lib/stats.mjs";

const ROOT = path.resolve(new URL("../../", import.meta.url).pathname);
const PERMS = 1000, SEED = 7, ALPHA = 0.05, MIN_CROSS = 10;
const SKIP = new Set(["node_modules", "tests", "eval", ".git"]);

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|mjs)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p);
  }
})(ROOT);
const src = new Map(files.map((f) => [f, fs.readFileSync(f, "utf8")]));
const rel = (f) => path.relative(ROOT, f);

// 1. self-declared cells
const declared = new Map();
for (const [f, s] of src) {
  const cells = [];
  let m;
  const one = /export const CELL\s*=\s*Object\.freeze\(\{\s*op:\s*"([A-Z]{3})",\s*grain:\s*"(\w+)"/g;
  while ((m = one.exec(s))) cells.push([m[1], m[2]]);
  const many = /export const CELLS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/.exec(s);
  if (many) { const re = /op:\s*"([A-Z]{3})",\s*grain:\s*"(\w+)"/g; let k; while ((k = re.exec(many[1]))) cells.push([k[1], k[2]]); }
  if (cells.length) declared.set(f, cells);
}
const domainsOf = (cells) => new Set(cells.map(([op, g]) => cellOf(op, g).domain));
const grainsOf = (cells) => new Set(cells.map(([, g]) => g));
const classOfDomain = (d) => CLASS_DOMAIN.find((c) => c.domain === d).id;

// 2. capacities, resolved by basename
const byBase = new Map();
for (const f of files) byBase.set(path.basename(f), [...(byBase.get(path.basename(f)) ?? []), f]);
const listed = { ambiguous: [], unresolved: [], conflicts: [], multiDomain: [], multiGrain: [] };
const pop = new Map(); // file -> { klass, grain, from }
const noteMulti = (f, cells) => {
  if (domainsOf(cells).size > 1) listed.multiDomain.push(rel(f));
  if (grainsOf(cells).size > 1) listed.multiGrain.push(rel(f));
};
for (const [f, cells] of declared) {
  noteMulti(f, cells);
  pop.set(f, {
    klass: domainsOf(cells).size === 1 ? classOfDomain([...domainsOf(cells)][0]) : null,
    grain: grainsOf(cells).size === 1 ? [...grainsOf(cells)][0] : null,
    from: "self-declared CELL(S)",
  });
}
for (const cap of CAPACITIES) {
  const hits = byBase.get(path.basename(cap.module)) ?? []; // "resolved BY BASENAME" (the document) — run 1 looked up the entry's full path string, which only matches a bare filename
  if (hits.length === 0) { listed.unresolved.push(`${cap.id} -> ${cap.module}`); continue; }
  if (hits.length > 1) { listed.ambiguous.push(`${cap.id} -> ${cap.module} (${hits.map(rel).join(" | ")})`); continue; }
  const f = hits[0];
  const place = placeOf(cap.terrain);
  if (!place) { listed.unresolved.push(`${cap.id}: unknown terrain ${cap.terrain}`); continue; }
  const have = pop.get(f);
  if (have) {
    if ((have.klass && have.klass !== place.klass) || (have.grain && have.grain !== place.position)) {
      listed.conflicts.push(`${rel(f)}: self-declared ${have.klass}/${have.grain} vs CAPACITIES ${cap.id} ${place.klass}/${place.position}`);
      pop.set(f, { klass: null, grain: null, from: "conflict" });
    }
    continue;
  }
  pop.set(f, { klass: place.klass, grain: place.position, from: `CAPACITIES:${cap.id}` });
}

// 3. edges
const resolveImp = (from, spec) => {
  if (!spec.startsWith(".")) return null;
  const p = path.resolve(path.dirname(from), spec);
  return src.has(p) ? p : src.has(`${p}.js`) ? `${p}.js` : null;
};
const edges = [];
for (const f of pop.keys()) {
  const re = /(?:import|export)\s[^;]*?from\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src.get(f)))) {
    const t = resolveImp(f, m[1]);
    if (t && pop.has(t) && t !== f) edges.push([f, t]);
  }
}
const uniq = [...new Map(edges.map(([a, b]) => [`${a}\u0000${b}`, [a, b]])).values()];

// 4. the statistic and its null
const CLASS_RANK = new Map(CLASS_DOMAIN.map((c, i) => [c.id, i]));
const GRAIN_RANK = new Map(GRAINS.map((g, i) => [g, i]));
function analyse(field, rankOf) {
  const nodes = [...pop].filter(([, v]) => v[field]).map(([f]) => f);
  const label = new Map(nodes.map((f) => [f, pop.get(f)[field]]));
  const es = uniq.filter(([a, b]) => label.has(a) && label.has(b));
  const stat = (lab) => {
    let cross = 0, up = 0;
    for (const [a, b] of es) {
      const ra = rankOf.get(lab.get(a)), rb = rankOf.get(lab.get(b));
      if (ra === rb) continue;
      cross++;
      if (ra < rb) up++;
    }
    return { cross, up };
  };
  const obs = stat(label);
  const upward = es.filter(([a, b]) => rankOf.get(label.get(a)) < rankOf.get(label.get(b))).map(([a, b]) => `${rel(a)} [${label.get(a)}] -> ${rel(b)} [${label.get(b)}]`);
  const rnd = lcg(SEED);
  const labels = nodes.map((f) => label.get(f));
  const nullUp = [];
  for (let i = 0; i < PERMS; i++) {
    const perm = [...labels];
    shuffle(perm, rnd);
    nullUp.push(stat(new Map(nodes.map((f, j) => [f, perm[j]]))).up);
  }
  nullUp.sort((x, y) => x - y);
  const pLow = (1 + nullUp.filter((u) => u <= obs.up).length) / (1 + PERMS);
  const mean = nullUp.reduce((s, x) => s + x, 0) / nullUp.length;
  const verdict = obs.cross < MIN_CROSS ? "UNDERPOWERED" : pLow < ALPHA ? "SUPPORTED-AS-LAYERING" : "NOT-A-LAYERING-FACT";
  return { field, modules: nodes.length, edgesAmong: es.length, crossEdges: obs.cross, upward: obs.up, upwardEdges: upward, nullMean: mean, null5th: nullUp[Math.floor(ALPHA * PERMS)], pLow, verdict };
}
const result = {
  population: { total: pop.size, byClass: Object.fromEntries(CLASS_DOMAIN.map((c) => [c.id, [...pop.values()].filter((v) => v.klass === c.id).length])) },
  listed,
  class: analyse("klass", CLASS_RANK),
  grain: analyse("grain", GRAIN_RANK),
  config: { PERMS, SEED, ALPHA, MIN_CROSS },
};
console.log(JSON.stringify(result, null, 1));
fs.mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("./results/f3-layering.json", import.meta.url), JSON.stringify(result, null, 1));
