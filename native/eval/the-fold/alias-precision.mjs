// eval/the-fold/alias-precision.mjs — of what the alias organ ADMITS from real prose, how much is an alias, and what do the distinctness walls
// (organs/aliases.js::licenseAliases) keep and lose? Measured out of sample, labelled before the walls' decisions were opened.
//
// The question (user, 2026-09-30: "figure out the possessives and alias stuff, signal Chomsky and Sullivan"): the E6 harness folded every form the
// material declared an alias of — "the Regional Transit Authority (RTA)" — into one referent class, on the strength of a received declaration
// shape and the floors its caller declared. Nothing had asked how often a parenthetical IS an alias. Sullivan's discipline: the connection
// between a written sign and the thing is earned per language and re-measured per corpus, never assumed — so the number comes from a
// corpus, and this driver is how anyone re-takes it.
//
// Design, fixed before the walls' decisions were read:
//   · FRESH files. A different seed than the exploration's (7, 40 files per corpus), excluding every file that exploration read.
//   · A stratified draw of what the UNWALLED organ admits (distinct per file/full/alias), written WITHOUT any wall decision. The sample and the
//     decisions are separate arrays of the record; the labels are made from the sample alone, and only then are the decisions compared.
//   · The unit of judgement is the PAIR (full, alias). T = both forms are names or terms for the same thing, so folding them into one referent
//     class would be right wherever either appears in that document; F = anything else (a disambiguator, qualifier, attribute, label,
//     affiliation, an equation or code artifact, a list annotation, a pronoun pair); U = cannot tell from the excerpt, excluded from precision.
//   · One judge, the author of the walls, not independent — labelled as the proxy it is.
//
// Usage:
//   node eval/the-fold/alias-precision.mjs --raw out.json [--root <dir>] [--cap 400000]
//   node eval/the-fold/alias-precision.mjs --show out.json [--from 1] [--to 40]           (the sample ONLY — no decisions)
//   node eval/the-fold/alias-precision.mjs --summarize out.json --labels labels.json
import fs from "node:fs";
import path from "node:path";
import { summarizeAliasPrecision } from "./lib/alias-precision-summary.mjs";

const NATIVE = new URL("../../", import.meta.url).pathname;
const here = (p) => `${NATIVE}${p}`;
const argv = process.argv.slice(2);
const arg = (name, dflt = null) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] ?? true) : dflt; };

if (arg("summarize")) {
  const raw = JSON.parse(fs.readFileSync(arg("summarize"), "utf8"));
  const labels = arg("labels") && fs.existsSync(arg("labels")) ? JSON.parse(fs.readFileSync(arg("labels"), "utf8")) : null;
  console.log(summarizeAliasPrecision(raw, labels));
  process.exit(0);
}
if (arg("show")) {
  const raw = JSON.parse(fs.readFileSync(arg("show"), "utf8"));
  const from = Number(arg("from", 1)), to = Number(arg("to", raw.sample.length));
  for (const x of raw.sample.slice(from - 1, to)) console.log(`${x.id}. [${x.cat.slice(0, 5)}] "${x.full}" / "${x.alias}" (uses ${x.uses}) :: ${x.sentence.slice(0, 230)}\n`);
  process.exit(0);
}

const root = arg("root", new URL("../../../../live_priors/", import.meta.url).pathname).replace(/\/?$/, "/");
const CAP = Number(arg("cap", 400000));
const rawOut = arg("raw", null);
const CATS = ["01-literature-books", "02-encyclopedic", "05-academic-papers", "06-government-legal", "14-holy-texts", "15-western-canon", "18-childrens-books"];
const FLOORS = { minConfirmRate: 0.3, minFires: 100, minUses: 2 }; // the floors the E6 harness declared (holograph.mjs::ALIAS_FLOORS)
const DEV_SEED = 7, DEV_N = 40, FILE_SEED = 99, FILE_N = 70, DRAW_SEED = 2026;
const QUOTA = { "02-encyclopedic": 50, "05-academic-papers": 30, "06-government-legal": 30, "01-literature-books": 20, "14-holy-texts": 8, "15-western-canon": 8, "18-childrens-books": 4 };

const { declaredAliases, licenseAliases, shapesFrom } = await import(here("organs/aliases.js"));
const { splitSentences } = await import(here("organs/grounding.js"));
const priorPath = `${root}derived-priors/alias-priors/alias-declaration-en.json`;
if (!fs.existsSync(priorPath)) { console.log(`no AliasDeclarationPrior@1 at ${priorPath}`); process.exit(2); }
const shapes = shapesFrom(JSON.parse(fs.readFileSync(priorPath, "utf8")), { minConfirmRate: FLOORS.minConfirmRate, minFires: FLOORS.minFires });

const rnd = (seed) => { let s = seed >>> 0; return () => { s += 0x6d2b79f5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function walk(dir, out = []) {
  let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!["node_modules", ".git", "digested"].includes(e.name)) walk(p, out); }
    else if (/\.(txt|md)$/i.test(e.name) && !/\.eot\./.test(e.name)) out.push(p);
  }
  return out;
}
const pickFiles = (files, seed, n) => { const R = rnd(seed); return files.map((f) => [R(), f]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]); };

const all = [];
const filesUsed = {};
for (const cat of CATS) {
  const files = walk(root + cat).sort();
  const dev = new Set(pickFiles(files, DEV_SEED, DEV_N));
  const fresh = pickFiles(files.filter((f) => !dev.has(f)), FILE_SEED, FILE_N);
  filesUsed[cat] = fresh.length;
  for (const f of fresh) {
    let text = ""; try { text = fs.readFileSync(f, "utf8").slice(0, CAP); } catch { continue; }
    let res; try { res = declaredAliases(text, { splitSentences, minUses: FLOORS.minUses, shapes }); } catch { continue; }
    if (!res.aliases.length) continue;
    const lic = licenseAliases(res.aliases, text, { splitSentences });
    const key = (a) => `${a.start}|${a.full}|${a.alias}`;
    const licensed = new Set(lic.licensed.map(key));
    const whyOf = new Map(lic.refused.map((a) => [key(a), a.why]));
    for (const a of res.aliases) all.push({ cat, file: path.relative(root, f), full: a.full, alias: a.alias, uses: a.uses, sentence: a.sentence.replace(/\s+/g, " ").slice(0, 260), _licensed: licensed.has(key(a)), _why: whyOf.get(key(a)) ?? null });
  }
}
const seen = new Set(), distinct = [];
for (const x of all) { const k = `${x.file}|${x.full.toLowerCase()}|${x.alias.toLowerCase()}`; if (seen.has(k)) continue; seen.add(k); distinct.push(x); }
const byCat = {}; for (const x of distinct) (byCat[x.cat] ??= []).push(x);
const R = rnd(DRAW_SEED);
const sample = [];
for (const [cat, n] of Object.entries(QUOTA)) sample.push(...(byCat[cat] ?? []).map((x) => [R(), x]).sort((a, b) => a[0] - b[0]).slice(0, n).map((p) => p[1]));
sample.forEach((x, i) => { x.id = i + 1; });
const record = {
  config: { root, cats: CATS, cap: CAP, floors: FLOORS, devSeed: DEV_SEED, devN: DEV_N, fileSeed: FILE_SEED, fileN: FILE_N, drawSeed: DRAW_SEED, quota: QUOTA, freshFilesPerCorpus: filesUsed },
  population: { admitted: Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, v.length])), licensed: Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, v.filter((x) => x._licensed).length])) },
  sample: sample.map(({ id, cat, file, full, alias, uses, sentence }) => ({ id, cat, file, full, alias, uses, sentence })),
  decisions: sample.map(({ id, _licensed, _why }) => ({ id, licensed: _licensed, why: _why })),
};
if (!rawOut) { console.log(JSON.stringify(record.population), "sample", sample.length); process.exit(0); }
fs.writeFileSync(rawOut, JSON.stringify(record));
console.log(`sample ${sample.length} written to ${rawOut} (label from --show before reading the decisions)`);
