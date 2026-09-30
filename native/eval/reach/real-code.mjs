#!/usr/bin/env node
// native/eval/reach/real-code.mjs — the derivation on REAL code, judged by an analyzer that is not it.
//
// The reach battery's artifacts are 8–20 lines this repo wrote, so a name-overlap
// derivation may look better there than it would on a file nobody tuned. This driver
// takes unconstructed material — the repo's own JavaScript modules — and asks, for a
// declaration in a module: which OTHER lines of that module depend on it?
//
// GROUND TRUTH is the TypeScript language service's reference finder (scopes, imports,
// exports, destructuring — a semantic analysis, not a name match). The derivation
// under test (battery.mjs::rankReach) sees only the file text and the declaration's
// first line, exactly as it does in the battery.
//
// BASELINES built to fail (a statistic earns its use by a control that can beat it):
//   proximity  the R lines nearest to the declaration. Dependents often sit close by;
//              if the derivation does not beat locality, name overlap adds nothing here.
//   random     R lines drawn at random (seeded), averaged over 20 draws.
//
// UNIT. The independent unit is the FILE, not the declaration: declarations in one
// file share vocabulary, so the paired test averages within a file first.
//
// This is a model-free measurement of ONE thing — whether the derived lines contain
// the lines that depend on the region. It says nothing about whether a writer uses them.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rankReach, signTest } from "./battery.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "..", "..");

// The pipeline's own file selection is declared here, not tuned: three directories of
// production modules, files of 60–800 lines, at most MAX_FILES of them (every n-th of
// the sorted list), at most PER_FILE declarations each (by a fixed hash of the name).
export const CONFIG = Object.freeze({
  dirs: Object.freeze(["organs", "kernel", "adapters/text"]),
  minLines: 60,
  maxLines: 800,
  maxFiles: 40,
  perFile: 5,
  minRefs: 2,
  maxRefs: 25,
  minRegion: 12,
  randomDraws: 20,
  k: 6, // the battery's REACH_K, for hit@k
});

export function loadTypescript() {
  const require = createRequire(import.meta.url);
  for (const spec of [process.env.ER7_TS, "typescript", "/opt/node22/lib/node_modules/typescript"].filter(Boolean)) {
    try { return require(spec); } catch { /* try the next */ }
  }
  return null;
}

const fnv = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export function selectFiles(root = NATIVE, config = CONFIG) {
  const all = [];
  for (const d of config.dirs) {
    const dir = path.join(root, d);
    if (!fs.existsSync(dir)) continue;
    for (const n of fs.readdirSync(dir).sort()) {
      if (!n.endsWith(".js") || n.endsWith(".test.js")) continue;
      const f = path.join(dir, n);
      const lines = fs.readFileSync(f, "utf8").split("\n").length;
      if (lines >= config.minLines && lines <= config.maxLines) all.push({ file: f, rel: path.relative(root, f), lines });
    }
  }
  const step = Math.max(1, Math.ceil(all.length / config.maxFiles));
  return all.filter((_, i) => i % step === 0).slice(0, config.maxFiles);
}

/** Top-level declarations of a file whose references the analyzer can list, with the reference lines outside the declaration's own first line. */
export function declarationsOf(ts, file, text, config = CONFIG) {
  const host = {
    getScriptFileNames: () => [file],
    getScriptVersion: () => "1",
    getScriptSnapshot: (f) => (f === file ? ts.ScriptSnapshot.fromString(text) : undefined),
    getCurrentDirectory: () => "/",
    getCompilationSettings: () => ({ allowJs: true, checkJs: false, noResolve: true, noLib: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }),
    getDefaultLibFileName: () => "lib.d.ts",
    fileExists: (f) => f === file,
    readFile: (f) => (f === file ? text : undefined),
  };
  const ls = ts.createLanguageService(host, ts.createDocumentRegistry());
  const sf = ls.getProgram().getSourceFile(file);
  if (!sf) return [];
  const lines = text.split("\n");
  const found = [];
  const consider = (nameNode, declNode) => {
    const name = nameNode.text;
    if (name.length < 4) return;
    const first = sf.getLineAndCharacterOfPosition(declNode.getStart(sf)).line; // 0-based
    const region = lines[first];
    if (!region || region.trim().length < config.minRegion) return;
    if (text.split(region).length - 1 !== 1) return; // the region must be findable exactly once
    const refs = ls.findReferences(file, nameNode.getStart(sf)) ?? [];
    const truth = new Set();
    for (const r of refs) for (const x of r.references) {
      const line = sf.getLineAndCharacterOfPosition(x.textSpan.start).line;
      if (line !== first) truth.add(line + 1);
    }
    if (truth.size < config.minRefs || truth.size > config.maxRefs) return;
    found.push({ name, region, regionLine: first + 1, truth: [...truth].sort((a, b) => a - b) });
  };
  sf.forEachChild((n) => {
    if ((ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n)) && n.name) consider(n.name, n);
    else if (ts.isVariableStatement(n) && n.declarationList.declarations.length === 1) {
      const d = n.declarationList.declarations[0];
      if (ts.isIdentifier(d.name)) consider(d.name, n);
    }
  });
  return found.sort((a, b) => fnv(a.name) - fnv(b.name)).slice(0, config.perFile);
}

/** Score one declaration: the derivation against the analyzer's truth, with the two baselines. */
export function evaluate(text, decl, config = CONFIG) {
  const lines = text.split("\n");
  const nonblank = lines.map((l, i) => ({ line: i + 1, blank: !l.trim() })).filter((x) => !x.blank && x.line !== decl.regionLine).map((x) => x.line);
  const truth = new Set(decl.truth);
  const R = truth.size;
  const ranked = rankReach(text, decl.region).map((x) => x.line);
  const top = (arr, n) => arr.slice(0, n).filter((l) => truth.has(l)).length;
  const pos = new Map(ranked.map((l, i) => [l, i + 1]));
  const ranks = decl.truth.map((l) => pos.get(l) ?? Infinity);
  // The upper baseline: a writer that KNOWS which token the edit is about (here, the declared name) and matches it as a
  // whole word. It is not a derivation from the material alone — it is what focusing the derivation would buy.
  const wholeWord = new RegExp(`(?<![\\w$])${decl.name.replace(/[$]/g, "\\$")}(?![\\w$])`);
  const identLines = nonblank.filter((l) => wholeWord.test(lines[l - 1]));
  const prox = [...nonblank].sort((a, b) => Math.abs(a - decl.regionLine) - Math.abs(b - decl.regionLine) || a - b);
  let rnd = 0;
  for (let d = 0; d < config.randomDraws; d += 1) {
    const r = mulberry(fnv(`${decl.name}|${d}`));
    const pool = [...nonblank];
    for (let i = pool.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    rnd += top(pool, R) / R;
  }
  return {
    name: decl.name, refs: R, ranked: ranked.length, nonblank: nonblank.length,
    rPrecision: top(ranked, R) / R,
    recallAll: ranks.filter(Number.isFinite).length / R,
    hitAtK: top(ranked, Math.min(config.k, R)) / Math.min(config.k, R),
    worstRank: Math.max(...ranks),
    proximity: top(prox, R) / R,
    random: rnd / config.randomDraws,
    identifier: top(identLines, R) / R,
    noise: nonblank.length ? ranked.length / nonblank.length : 0,
  };
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const f2 = (v) => (v === null || v === undefined ? "—" : Number.isFinite(v) ? v.toFixed(2) : "∞");

// The material is FROZEN into eval/fixtures/real-code/ (copies, with a manifest naming the commit and each file's
// sha256): the production modules keep changing under other hands, and a measurement whose input moves is not a
// measurement. `--freeze` re-selects from the live tree and rewrites the fixtures deliberately.
export const FIXTURES = path.join(NATIVE, "eval", "fixtures", "real-code");
const flat = (rel) => rel.split(path.sep).join("/").replace(/\//g, "__");
export function freeze(root = NATIVE, config = CONFIG, dir = FIXTURES, ts = null) {
  fs.mkdirSync(dir, { recursive: true });
  for (const n of fs.readdirSync(dir)) fs.rmSync(path.join(dir, n));
  // Only files that yield at least one qualifying declaration are kept, when an analyzer is at hand.
  const files = selectFiles(root, config).filter((f) => !ts || declarationsOf(ts, f.file, fs.readFileSync(f.file, "utf8"), config).length > 0);
  let commit = "unknown";
  try { commit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { /* not a git checkout */ }
  const manifest = { schema: "RealCodeFixtures@1", source: "the production modules of this repository (native/organs, native/kernel, native/adapters/text), copied unmodified", commit, config, files: [] };
  for (const f of files) {
    const text = fs.readFileSync(f.file, "utf8");
    const name = flat(f.rel);
    fs.writeFileSync(path.join(dir, name), text);
    manifest.files.push({ rel: f.rel.split(path.sep).join("/"), fixture: name, lines: f.lines, sha256: crypto.createHash("sha256").update(text).digest("hex") });
  }
  fs.writeFileSync(path.join(dir, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
export function fixtureFiles(dir = FIXTURES) {
  const mf = path.join(dir, "MANIFEST.json");
  if (!fs.existsSync(mf)) return null;
  const manifest = JSON.parse(fs.readFileSync(mf, "utf8"));
  return { manifest, files: manifest.files.map((f) => ({ file: path.join(dir, f.fixture), rel: f.rel, lines: f.lines, sha256: f.sha256 })) };
}

export function run(ts, { root = NATIVE, config = CONFIG, dir = FIXTURES, live = false } = {}) {
  const fx = live ? null : fixtureFiles(dir);
  const files = fx ? fx.files : selectFiles(root, config);
  const perFile = [];
  for (const f of files) {
    const text = fs.readFileSync(f.file, "utf8");
    const rows = declarationsOf(ts, f.file, text, config).map((d) => evaluate(text, d, config));
    if (rows.length) perFile.push({ ...f, rows });
  }
  return { files: perFile, config, ts: ts.version, commit: fx?.manifest.commit ?? "live tree" };
}

export function markdown(result) {
  const { files, config, ts, commit } = result;
  const all = files.flatMap((f) => f.rows);
  const fileMeans = files.map((f) => ({ f, d: mean(f.rows.map((r) => r.rPrecision)), p: mean(f.rows.map((r) => r.proximity)), r: mean(f.rows.map((r) => r.random)) }));
  const dVsP = fileMeans.filter((x) => x.d > x.p + 1e-12).length;
  const pVsD = fileMeans.filter((x) => x.p > x.d + 1e-12).length;
  const dVsR = fileMeans.filter((x) => x.d > x.r + 1e-12).length;
  const rVsD = fileMeans.filter((x) => x.r > x.d + 1e-12).length;
  const bins = [["< 150 lines", (f) => f.lines < 150], ["150–300 lines", (f) => f.lines >= 150 && f.lines <= 300], ["> 300 lines", (f) => f.lines > 300]];
  const L = ["# The derivation on real code — judged by the TypeScript reference finder (deterministic, no model)", "",
    `Analyzer: TypeScript ${ts} language service (semantic references). Material: the repo's own production modules at commit \`${String(commit).slice(0, 10)}\`, frozen in \`eval/fixtures/real-code/\` (${config.dirs.join(", ")}), ${files.length} files of ${config.minLines}–${config.maxLines} lines, ${all.length} top-level declarations with ${config.minRefs}–${config.maxRefs} references elsewhere in the same file. The region is the declaration's first line; the derivation sees only the file text and that line.`, "",
    "`R` = the number of lines that reference the declaration. **R-precision** = the share of the derivation's top-R lines that are true dependents. **Recall (all)** = the share of true dependents that appear ANYWHERE in the ranking. **Worst rank** = how far down the ranking you must read to have every dependent. **Noise** = the share of the file's non-blank lines that the ranking lists at all. `proximity` = the R nearest lines; `random` = R random lines (20 seeded draws); `identifier` = the R best whole-word matches of the declared name — an upper baseline for a derivation that knew which token the edit is about, which the region-only derivation does not.", "",
    "| | declarations | R-precision: derivation | proximity | random | identifier (knows the token) | recall (all) | hit@" + config.k + " | median worst rank | median R | noise |", "|---|---|---|---|---|---|---|---|---|---|---|"];
  const row = (label, rs) => `| ${label} | ${rs.length} | ${f2(mean(rs.map((r) => r.rPrecision)))} | ${f2(mean(rs.map((r) => r.proximity)))} | ${f2(mean(rs.map((r) => r.random)))} | ${f2(mean(rs.map((r) => r.identifier)))} | ${f2(mean(rs.map((r) => r.recallAll)))} | ${f2(mean(rs.map((r) => r.hitAtK)))} | ${f2(median(rs.map((r) => r.worstRank)))} | ${f2(median(rs.map((r) => r.refs)))} | ${f2(mean(rs.map((r) => r.noise)))} |`;
  L.push(row("all", all));
  for (const [label, test] of bins) { const rs = files.filter(test).flatMap((f) => f.rows); if (rs.length) L.push(row(label, rs)); }
  L.push("", "Paired over FILES (the independent unit; per-file mean R-precision; exact sign test on the files that moved):", "",
    "| comparison | files | derivation higher | other higher | tied | p |", "|---|---|---|---|---|---|",
    `| derivation vs proximity | ${fileMeans.length} | ${dVsP} | ${pVsD} | ${fileMeans.length - dVsP - pVsD} | ${signTest(dVsP, pVsD).toFixed(4)} |`,
    `| derivation vs random | ${fileMeans.length} | ${dVsR} | ${rVsD} | ${fileMeans.length - dVsR - rVsD} | ${signTest(dVsR, rVsD).toFixed(4)} |`, "",
    "Files used:", "", ...files.map((f) => `- \`${f.rel.split(path.sep).join("/")}\` (${f.lines} lines, ${f.rows.length} declarations)`), "");
  return `${L.join("\n")}\n`;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  if (process.argv.includes("--freeze")) {
    const m = freeze(NATIVE, CONFIG, FIXTURES, loadTypescript());
    console.error(`froze ${m.files.length} files at ${m.commit.slice(0, 10)} into ${path.relative(process.cwd(), FIXTURES)}`);
  } else {
    const ts = loadTypescript();
    if (!ts) { console.error("typescript_unavailable: set ER7_TS to a TypeScript module path; nothing measured"); process.exit(2); }
    process.stdout.write(markdown(run(ts, { live: process.argv.includes("--live") })));
  }
}
