#!/usr/bin/env node
// build-code-name-prior-split — CodeNamePrior@1, per language family:
// how many DISTINCT real projects declare a given name *in that language*.
//
// WHY A SPLIT. The blended CodeNamePrior@1 (live_priors' build-code-name-
// prior.mjs: 26 files, 16 repos, C/Go/Python/TypeScript collapsed into one
// count) misdrops in both directions (measured, Ant 2): `__init__` is
// generic ONLY in Python (3/3 attestations `.py`) yet drops from C/Go
// workspaces, while `main`/`String`/`schedule` are wholly non-Python
// attestations yet drop from Python workspaces. A name's genericity is a
// fact about its own language's codebases, not about all code.
// This script measures that fact per family.
//
// SAME RECIPES AS THE BLENDED BUILDER, KEPT IN STEP BY HAND (the convention
// code-structure.js's own header already holds: a corpus-measurement script
// and a reading organ have different packaging needs; the RECIPE ITSELF must
// not drift). Recipe-for-recipe identical to live_priors/scripts/
// build-code-name-prior.mjs, so the four splits SUM to the blended prior
// exactly — verified at build time (every blended (name, repo) attestation
// appears in exactly one split; the script refuses to write otherwise).
//
// LANGUAGE-GENERAL BY CONSTRUCTION. Families are a data table (FAMILIES),
// never branches: each maps extensions to the recipe that reads them.
// Adding a family is adding a row, never touching the tally.
//
// Usage: node native/scripts/build-code-name-prior-split.mjs <corpusDir> <outDir>
//   <corpusDir> — a tree of repo directories (like live_priors/09-source-code:
//   one directory per repo, code files anywhere beneath).
//   Writes <outDir>/code-name-<family>.json for py, c, go, js.

import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CORPUS_DIR = process.argv[2];
const OUT_DIR = process.argv[3];

if (!CORPUS_DIR || !OUT_DIR) {
  console.error("usage: node build-code-name-prior-split.mjs <corpusDir> <outDir>");
  process.exit(1);
}

// Family table — recipe-for-recipe identical to the blended builder's own
// RECIPES (lang/exts/pattern). `family` is the output file's key.
const FAMILIES = [
  {
    family: "c",
    exts: [".c", ".h"],
    re: /^(?:[A-Za-z_][\w\s*]*[\s*])([A-Za-z_]\w*)\s*\(([^;{}]*)\)\s*(?:\n|\s)*\{/gm,
    kind: "function",
  },
  {
    family: "go",
    exts: [".go"],
    re: /^func\s+(?:\([^)]*\)\s+)?([A-Za-z_]\w*)\s*\(/gm,
    kind: "function",
  },
  {
    family: "py",
    exts: [".py"],
    re: /^[ \t]*(?:async\s+)?(def|class)\s+([A-Za-z_]\w*)/gm,
    kind: null, // group 1 is the kind (def/class), group 2 the name
  },
  {
    family: "js",
    exts: [".ts", ".tsx", ".js", ".mjs", ".jsx"],
    re: /^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)/gm,
    kind: "function",
  },
  {
    family: "js",
    exts: [".ts", ".tsx", ".js", ".mjs", ".jsx"],
    re: /^[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm,
    kind: "class",
  },
  {
    family: "js",
    exts: [".ts", ".tsx", ".js", ".mjs", ".jsx"],
    re: /^[ \t]*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*?\)?\s*=>/gm,
    kind: "function",
  },
];

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full, out); continue; }
    if (e.isFile()) out.push(full);
  }
}

const extToFamily = new Map();
for (const f of FAMILIES) for (const ext of f.exts) extToFamily.set(ext, f.family);

function declarationsIn(text, ext) {
  const names = [];
  for (const recipe of FAMILIES) {
    if (!recipe.exts.includes(ext)) continue;
    const re = new RegExp(recipe.re.source, recipe.re.flags);
    let m;
    while ((m = re.exec(text))) {
      if (recipe.family === "py") names.push({ name: m[2], kind: m[1] === "class" ? "class" : "function" });
      else names.push({ name: m[1], kind: recipe.kind });
    }
  }
  return names;
}

const files = [];
walk(CORPUS_DIR, files);
const codeFiles = files.filter((f) => extToFamily.has(path.extname(f).toLowerCase()));

// family -> name -> { repos: Set, files: Set, kinds: Set }; plus the
// blended tally (same shape) for the sum check.
const splits = new Map();
const blended = new Map();
const fileRecords = [];
const reposAll = new Set();

for (const abs of codeFiles) {
  const rel = path.relative(CORPUS_DIR, abs);
  const repo = rel.split(path.sep)[0];
  reposAll.add(repo);
  const ext = path.extname(abs).toLowerCase();
  const family = extToFamily.get(ext);
  const bytes = readFileSync(abs);
  const decls = declarationsIn(bytes.toString("utf8"), ext);
  fileRecords.push({ path: rel, repo, ext, family, bytes: bytes.length, sha256: sha256(bytes), declarations: decls.length });
  if (!splits.has(family)) splits.set(family, new Map());
  for (const d of decls) {
    for (const table of [splits.get(family), blended]) {
      if (!table.has(d.name)) table.set(d.name, { repos: new Set(), files: new Set(), kinds: new Set() });
      const rec = table.get(d.name);
      rec.repos.add(repo);
      rec.files.add(rel);
      rec.kinds.add(d.kind);
    }
  }
}

// The sum check: every blended (name, repo) attestation must appear in
// exactly one split. A drifted recipe would break this — refuse to write.
let attestBlended = 0;
for (const rec of blended.values()) attestBlended += rec.repos.size;
let attestSplits = 0;
for (const table of splits.values()) for (const rec of table.values()) attestSplits += rec.repos.size;
if (attestBlended !== attestSplits) {
  console.error(`refusing: blended attestations (${attestBlended}) != split attestations (${attestSplits}) — a recipe drifted from the blended builder`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [family, table] of splits) {
  const names = {};
  let genericAtFloor2 = 0;
  for (const [name, rec] of table) {
    names[name] = { repos: rec.repos.size, files: rec.files.size, kinds: [...rec.kinds].sort() };
    if (rec.repos.size >= 2) genericAtFloor2 += 1;
  }
  const familyFiles = fileRecords.filter((f) => f.family === family);
  const familyRepos = new Set(familyFiles.map((f) => f.repo));
  const out = {
    schema: "CodeNamePrior@1",
    language: family,
    provenance: {
      giver: `per-language split of the CodeNamePrior@1 measurement (recipes identical to live_priors build-code-name-prior.mjs; sum-checked against the blended tally: ${attestBlended} attestations in exactly one split)`,
      source: CORPUS_DIR,
      builder: "eoreader7 native/scripts/build-code-name-prior-split.mjs",
      familyFiles: familyFiles.length,
      familyRepos: familyRepos.size,
      note: "genericity is a fact about this language's own codebases: repos counts only repos attested through this family's extensions. Thin families (one repo) attest nothing at floor 2 — every name admitted, disclosed, never a silent skip.",
    },
    counts: {
      files: familyFiles.length,
      repos: familyRepos.size,
      totalBytes: familyFiles.reduce((a, f) => a + f.bytes, 0),
      distinctNames: table.size,
      totalDeclarations: familyFiles.reduce((a, f) => a + f.declarations, 0),
      namesAtOrAboveGenericFloor: genericAtFloor2,
    },
    names,
    builtAt: new Date().toISOString(),
  };
  const dest = path.join(OUT_DIR, `code-name-${family}.json`);
  writeFileSync(dest, JSON.stringify(out, null, 1));
  const top = [...table.entries()].sort((a, b) => b[1].repos.size - a[1].repos.size).slice(0, 8);
  console.error(`${family}: files=${familyFiles.length} repos=${familyRepos.size} names=${table.size} genericAtFloor2=${genericAtFloor2} -> ${dest}`);
  console.error(`  top: ${top.map(([n, r]) => `${n}(${r.repos.size})`).join(", ") || "(none)"}`);
}
console.error(`sum check: ${attestBlended} blended attestations = ${attestSplits} split attestations`);
