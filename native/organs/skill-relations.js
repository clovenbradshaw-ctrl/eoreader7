// organs/skill-relations.js — NO SKILL EXISTS IN A VACUUM: what each one uses, what uses it, what it nests in,
// and what else becomes applicable at the same moment.
//
// Fold invariant: A RELATION IS DERIVED FROM THE CODE, NOT AUTHORED. Nothing here is a hand-drawn diagram:
//   uses      a route's imports (the modules its file actually loads) plus the priors it names in its `needs`
//   usedBy    every non-test module that names a prior's schema (e.g. "POSPrior@1") or its kind directory —
//             found by reading the source files, with the line that names it kept as the citation
//   nests     a skill's declared parent (a learned rule lives under its route) and the children that name it
//   coApplies skills whose trigger fires on the SAME content: same language → the same moment
// A relation carries the file (and line) it came from. An empty usedBy is a finding, not an omission: a prior
// nothing in the code names is a prior nothing consumes yet.
import fs from "node:fs";
import path from "node:path";

const SKIP = /(\.test\.|\/node_modules\/|\/eval\/|\/results\/|\/fixtures\/|\.md$|\/skill-[a-z]+\.js$|\/skills-index\.js$|\/skills-surface\.mjs$)/; // the skills modules name every prior by construction — they are the index, not a consumer
function walk(dir, out = [], depth = 0) {
  if (depth > 5 || !fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.test(p + (e.isDirectory() ? "/" : ""))) continue;
    if (e.isDirectory()) walk(p, out, depth + 1);
    else if (/\.(m?js)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** codeIndex(roots) -> [{ file, lines }] — the non-test source files, read once. `base` makes paths relative. */
export function codeIndex(roots, base) {
  const files = roots.flatMap((r) => (fs.existsSync(r) && fs.statSync(r).isFile() ? [r] : walk(r)));
  return files.map((f) => { let t = ""; try { t = fs.readFileSync(f, "utf8"); } catch { /* unreadable: skipped */ } return { file: path.relative(base, f), lines: t.split("\n") }; });
}

/** usedBy(needles, index) -> [{ file, line, text }] — modules that name any needle (schema string / kind dir). */
export function usedBy(needles, index, { max = 6 } = {}) {
  const hits = [];
  for (const { file, lines } of index) {
    for (let i = 0; i < lines.length; i++) {
      const n = needles.find((x) => x && lines[i].includes(x));
      if (n) { hits.push({ file, line: i + 1, needle: n, text: lines[i].trim().slice(0, 110) }); break; }
    }
    if (hits.length >= max) break;
  }
  return hits;
}

/** importsOf(file) -> the local modules a file loads (its `uses`). */
export function importsOf(file) {
  try {
    const t = fs.readFileSync(file, "utf8");
    return [...t.matchAll(/^\s*import\s[^;]*?from\s+["'](\.[^"']+)["']/gm)].map((m) => m[1]);
  } catch { return []; }
}

/** coApplies(skills) -> Map(id -> [ids]) — same language means the same content moment. */
export function coApplies(skills) {
  const byLang = new Map();
  for (const s of skills) if (s.language) byLang.set(s.language, [...(byLang.get(s.language) ?? []), s.id]);
  const out = new Map();
  for (const ids of byLang.values()) for (const id of ids) out.set(id, ids.filter((x) => x !== id));
  return out;
}
