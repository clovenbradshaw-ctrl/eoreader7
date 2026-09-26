#!/usr/bin/env node
// cli/houdini-numbers.mjs -- Houdini, turned on numbers instead of sentences.
// The same principle as houdiniExclusivity (native/the-fold/archon-rules.js):
// a number stated with the confidence of a measured fact, with no real
// mechanism behind it, is oracular channeling -- a hand-set threshold
// presented as a derived one, exactly the shape of magic this project's own
// standing rule already forbids ("no hand-set thresholds -- measure a null
// instead"). This is a CANDIDATE FINDER, not a classifier: it flags numeric
// literals sitting beside a comparison operator, minus a disclosed list of
// common structural patterns, and separates candidates that have a nearby
// measured-justification marker in their own comments from ones that don't.
// It convicts nothing on its own -- every candidate is for a human (or a
// future cycle) to read and judge, matching this project's own rule against
// claiming more than was measured.
//
//   node cli/houdini-numbers.mjs FILE [FILE...]
//   node cli/houdini-numbers.mjs --json OUT.json FILE [FILE...]
//
// Real, disclosed limits: this is line-based regex matching over source
// text, not a parser -- it cannot see whether a literal is inside a string
// or a comment already (a rough compensation is applied: lines that are
// pure comment lines are skipped as CANDIDATES, but still scanned for
// justification markers). It will produce false positives (a legitimately
// structural number that happens to match) and false negatives (a threshold
// spread across a named constant it cannot trace). Read every candidate;
// do not trust the count.

import fs from "node:fs";

const args = process.argv.slice(2);
const jsonIdx = args.indexOf("--json");
const OUT = jsonIdx >= 0 ? args[jsonIdx + 1] : null;
const files = args.filter((a, i) => a !== "--json" && !(jsonIdx >= 0 && i === jsonIdx + 1));
if (!files.length) {
  console.error("usage: node cli/houdini-numbers.mjs FILE [FILE...] [--json OUT.json]");
  process.exit(2);
}

// The comparison pattern: a numeric literal (int or decimal, optionally
// negative) immediately beside one of >, <, >=, <=, ===, !== -- on either
// side, since both `score > 0.6` and `0.6 < score` gate the same decision.
const COMPARISON_RE = /(-?\d+(?:\.\d+)?)\s*(===|!==|>=|<=|>|<)|(===|!==|>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)/g;

// STRUCTURAL EXCLUSIONS, disclosed and narrow, checked against a SMALL WINDOW
// AROUND EACH INDIVIDUAL MATCH (never the whole line — a line can carry one
// structural comparison and one real threshold side by side, e.g.
// `mean > 0 && variance / mean < 0.3`, and excluding the whole line would
// bury the second). `.length` is excluded ONLY against 0 or 1 (an empty/non-
// empty check), never against any other number — `s.length <= 20` is exactly
// the kind of unmeasured "substantial enough" judgment this tool exists to
// find, and a blanket `.length` exclusion would hide it, which is a real
// mistake this tool's own first draft made and this comment now names.
function isStructural(before, after, numberStr) {
  const n = Number(numberStr);
  // `before`/`after` are the text immediately outside the MATCH itself (the
  // operator is inside the match, on either side depending which of the two
  // alternatives fired) — so a check for ".length" must look on whichever
  // side actually carries it, never require the operator to also be there.
  // .length compared to 0 or 1 is an empty/non-empty check — structural.
  // .length compared to anything else (5, 8, 12, 20...) is exactly the
  // unmeasured "substantial enough" judgment this tool exists to surface.
  const nearLength = /\.length\s*$/.test(before) || /^\s*\.length\b/.test(after);
  if (nearLength && (n === 0 || n === 1)) return true;
  if (/\[\s*$/.test(before) || /^\s*\]/.test(after)) return true; // array index literal
  if (/\.(slice|substring|charAt)\(\s*$/.test(before)) return true;
  if (/status(Code)?\s*$/i.test(before) && n >= 100 && n <= 599) return true; // HTTP status
  if (/(timeout|_MS|maxTokens|MAX_TOKENS|budget|BUDGET)\s*$/i.test(before)) return true; // durations/budgets
  return false;
}

// MEASURED-JUSTIFICATION MARKERS, disclosed -- the exact words this
// codebase's own comments already use when a number IS derived rather than
// picked. A candidate whose preceding lines contain one of these is reported
// separately, for contrast, never silently dropped (the marker's presence is
// itself unverified by this tool -- it trusts the comment, which is a real,
// disclosed limit: a comment can claim "measured" and be wrong. This tool
// finds candidates for a human to check further, it does not verify claims).
const JUSTIFIED_MARKERS = /measured|calibrat|null test|shuffled|falsif|derived|declared|p\s*=|Fisher|cited|standing rule|Born null|this project's own/i;

function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}

function scanFile(path) {
  let text;
  try { text = fs.readFileSync(path, "utf8"); } catch (e) { return { path, error: e.message, candidates: [], grounded: [] }; }
  const lines = text.split("\n");
  const candidates = [];
  const grounded = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCommentLine(line)) continue;
    const matches = [...line.matchAll(COMPARISON_RE)];
    if (!matches.length) continue;
    const context = lines.slice(Math.max(0, i - 6), i).join("\n");
    const grounded_ = JUSTIFIED_MARKERS.test(context);
    for (const m of matches) {
      const numberStr = m[1] ?? m[4];
      const before = line.slice(0, m.index);
      const after = line.slice(m.index + m[0].length);
      if (isStructural(before, after, numberStr)) continue;
      const entry = { path, line: i + 1, text: line.trim().slice(0, 160), number: numberStr, match: m[0] };
      (grounded_ ? grounded : candidates).push(entry);
    }
  }
  return { path, candidates, grounded };
}

const results = files.map(scanFile);
const totalCandidates = results.reduce((s, r) => s + r.candidates.length, 0);
const totalGrounded = results.reduce((s, r) => s + r.grounded.length, 0);

console.log(`Houdini, on numbers: ${totalCandidates} candidate(s), ${totalGrounded} grounded (nearby measured-justification marker) across ${files.length} file(s).`);
console.log("This is a heuristic candidate finder, not a verdict -- read every line before trusting it.\n");
for (const r of results) {
  if (r.error) { console.log(`${r.path}: could not read (${r.error})`); continue; }
  if (!r.candidates.length) continue;
  console.log(`${r.path} (${r.candidates.length} candidate(s)):`);
  for (const c of r.candidates) console.log(`  ${c.line}: ${c.text}`);
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
