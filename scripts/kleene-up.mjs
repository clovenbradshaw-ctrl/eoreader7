#!/usr/bin/env node
// scripts/kleene-up.mjs — the archon's standing sweep.
// Handle: Kleene. The survey of regex FINDING and SNIPPING across the repo,
// run against the physics primitives (native/kernel/kleene-up.js): every
// regex literal and `new RegExp(...)` is NAMED — literal / semantic /
// structural / typed_gap — and the migratable ones (finding) are reported
// with their needle sets, ready to re-seat on byte addresses. Structural
// (parsing/sanitizing) and typed gaps are disclosed, never claimed.
//
// The scanner is a SURVEY, not a parser: it reads line-wise and can miss a
// regex that spans lines or misread a division sign as a literal — a named
// limitation, never a silent one. The migration itself is per-file work (see
// native/organs/verbatim-snip.js for the worked example); this script writes
// the manifest and the plan, it does not blind-rewrite files — an archon
// that evicted regex with a regex would be hoist by its own petard.
//
//   node scripts/kleene-up.mjs                # survey, print + kleeneup-report.json
//   node scripts/kleene-up.mjs --plan         # also write kleeneup-migration.md
//   node scripts/kleene-up.mjs --roots A B    # scan specific roots

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reduceRegex, wordSet } from "../native/kernel/kleene-up.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const SKIP_DIRS = new Set([
  "node_modules", ".git", "documents", "moral-shadows", "canon",
  "legacy-eoreader6.1", "state", "goldens", ".github", "eval", "plans",
  "priors", "the-fold", "interpretation", "memory", "adapters", "conformance",
]);
const SKIP_FILES = new Set(["package-lock.json"]);

function collectFiles(dir, roots) {
  const files = [];
  for (const root of roots) {
    const abs = path.resolve(dir, root);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isFile()) { if (isCode(abs)) files.push(abs); continue; }
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, entry.name);
        if (entry.isDirectory()) {
          if (SKIP_DIRS.has(entry.name)) continue;
          walk(p);
        } else if (isCode(p)) {
          files.push(p);
        }
      }
    };
    walk(abs);
  }
  return files;
}

const isCode = (p) => /\.(mjs|js|cjs)$/.test(p) && !SKIP_FILES.has(path.basename(p));

// The survey scanner. Line-wise; disclosed limitation. A `/` begins a regex
// literal only when the preceding non-space char can begin an expression
// (`(,=:[!&|?{};` or line start) — otherwise it is division or a path. A
// shebang line (`#!`) is never a regex.
const REGEX_PRECEDERS = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "~", "^", "<", ">", "\n"]);
const REGEX_START = /^\/((?:[^/\\\n]|\\.)*)\/([a-z]*)/;
function scanRegexes(code) {
  const out = [];
  const lines = code.split("\n");
  const ctorRe = /new\s+RegExp\(\s*["']((?:\\.|[^"'])*)["']\s*(?:,\s*["']([a-z]*)["'])?\s*\)/g;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (/^\s*#!/.test(line)) continue;
    let i = 0;
    while (i < line.length) {
      const c = line[i];
      if (c === "/") {
        const nxt = line[i + 1];
        if (nxt === "/") break;
        if (nxt === "*") {
          const end = line.indexOf("*/", i + 2);
          if (end < 0) break;
          i = end + 2; continue;
        }
        let p = i - 1;
        while (p >= 0 && line[p] === " ") p -= 1;
        const prev = p < 0 ? "\n" : line[p];
        if (!REGEX_PRECEDERS.has(prev)) { i += 1; continue; }
        const m = REGEX_START.exec(line.slice(i));
        if (m) {
          out.push({ line: li + 1, col: i + 1, source: m[1], flags: m[2], ctor: false });
          i += m[0].length; continue;
        }
        i += 1; continue;
      }
      if (c === "'" || c === '"' || c === "`") {
        let j = i + 1;
        while (j < line.length) {
          if (line[j] === "\\") { j += 2; continue; }
          if (line[j] === c) break;
          j += 1;
        }
        i = j + 1; continue;
      }
      i += 1;
    }
    let ctor;
    while ((ctor = ctorRe.exec(line)) !== null) {
      out.push({ line: li + 1, col: ctor.index + 1, source: ctor[1].replace(/\\(["'\\])/g, "$1"), flags: ctor[2] ?? "", ctor: true });
    }
  }
  return out;
}

function rel(p) {
  const r = path.relative(ROOT, p);
  return r.startsWith("..") ? p : r;
}

function survey(files) {
  const rows = [];
  for (const file of files) {
    let code = "";
    try { code = fs.readFileSync(file, "utf8"); } catch { continue; }
    for (const hit of scanRegexes(code)) {
      const cls = reduceRegex(hit.source, { flags: hit.flags });
      rows.push({ file: rel(file), ...hit, kind: cls.kind, gap: cls.gap ?? null, detail: cls.detail, ws: wordSet(hit.source, { flags: hit.flags }) });
    }
  }
  return rows;
}

const kindOrder = ["literal", "semantic", "structural", "typed_gap"];

function report(rows) {
  const byKind = (k) => rows.filter((r) => r.kind === k);
  const count = (k) => byKind(k).length;
  const lines = [];
  lines.push("# kleeneUp — the regex sweep");
  lines.push("");
  lines.push(`Surveyed ${rows.length} regex occurrences. A thing is found by its address, never by a pattern; a snip is cut at a permanent address, never by a match. Full detail: kleeneup-report.json; the migration plan: kleeneup-migration.md (--plan).`);
  lines.push("");
  lines.push("| kind | count | meaning |");
  lines.push("|---|---|---|");
  lines.push(`| literal | ${count("literal")} | one verbatim needle — migrate to findNeedles |`);
  lines.push(`| semantic | ${count("semantic")} | a word class — migrate to needle set over the tokenized field |`);
  lines.push(`| structural | ${count("structural")} | parses or sanitizes — grammar, not finding; disclosed, kept |`);
  lines.push(`| typed_gap | ${count("typed_gap")} | backrefs/lookaround/dynamic — cannot be a needle; named gap |`);
  lines.push("");
  lines.push(`**migratable: ${count("literal") + count("semantic")} of ${rows.length}**`);
  lines.push("");
  const TASTE = 12;
  for (const k of kindOrder) {
    const list = byKind(k);
    lines.push(`## ${k} (${list.length})${list.length > TASTE ? ` — showing ${TASTE}` : ""}`);
    lines.push("");
    const shown = list.slice(0, TASTE);
    if (k === "literal" || k === "semantic") {
      for (const r of shown) {
        const needles = r.ws ? r.ws.needles.join(" · ") : "";
        lines.push(`- \`${r.file}:${r.line}\` \`${r.source}\`${r.flags ? `/${r.flags}` : ""} → needles: \`${needles}\`${r.ws?.ci ? " (ci)" : ""}`);
      }
    } else {
      for (const r of shown) lines.push(`- \`${r.file}:${r.line}\` \`${r.source}\`${r.flags ? `/${r.flags}` : ""} — ${r.detail}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function migrationPlan(rows) {
  const mig = rows.filter((r) => r.kind === "literal" || r.kind === "semantic");
  const lines = [];
  lines.push("# kleeneUp migration plan");
  lines.push("");
  lines.push(`The ${mig.length} migratable regexes below FIND. Each becomes a needle set measured at byte addresses (native/kernel/kleene-up.js). Worked example: native/organs/verbatim-snip.js (2026-09-21).`);
  lines.push("");
  for (const r of mig) {
    const needles = r.ws ? r.ws.needles.map((n) => JSON.stringify(n)).join(", ") : "";
    const f = r.ws?.ci ? ", ci: true" : "";
    lines.push(`- \`${r.file}:${r.line}\` — \`${r.source}\`${r.flags ? `/${r.flags}` : ""}`);
    lines.push(`  \`findNeedles(field, [${needles}]${f})\` — measured, never matched; absence is a result.`);
  }
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const wantPlan = args.includes("--plan");
  const roots = [];
  const rIdx = args.indexOf("--roots");
  if (rIdx >= 0) roots.push(...args.slice(rIdx + 1).filter((a) => !a.startsWith("--")));
  const scanRoots = roots.length ? roots : ["native", "cli"];
  const rootCode = fs.readdirSync(ROOT).filter((f) => isCode(path.join(ROOT, f)));

  const files = collectFiles(ROOT, scanRoots);
  for (const f of rootCode) files.push(path.join(ROOT, f));
  const unique = [...new Set(files)];
  const rows = survey(unique).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  const out = {
    schema: "KleeneUpReport@1",
    runAt: new Date().toISOString(),
    scannedFiles: unique.length,
    scanned: scanRoots,
    rows: rows.map(({ ws, ...rest }) => rest),
    counted: {
      total: rows.length,
      literal: rows.filter((r) => r.kind === "literal").length,
      semantic: rows.filter((r) => r.kind === "semantic").length,
      structural: rows.filter((r) => r.kind === "structural").length,
      typedGaps: rows.filter((r) => r.kind === "typed_gap").length,
      migratable: rows.filter((r) => r.kind === "literal" || r.kind === "semantic").length,
    },
  };

  const reportPath = path.join(ROOT, "kleeneup-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(out, null, 2) + "\n");

  console.log(report(rows));
  console.log(`\nwrote ${rel(reportPath)}`);

  if (wantPlan) {
    const planPath = path.join(ROOT, "kleeneup-migration.md");
    fs.writeFileSync(planPath, migrationPlan(rows) + "\n");
    console.log(`wrote ${rel(planPath)}`);
  }
}

main();