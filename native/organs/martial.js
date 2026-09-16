// native/organs/martial.js — the anti-copy archon. Handle: Martial — the
// Roman poet (Marcus Valerius Martialis) who first named plagiarism,
// "plagiarius" (the kidnapper), complaining that his verses were being claimed
// by others.
//
// THE LAW, BOTH FACES:
//   "Do not write what can be copied; replicate what should be replicated."
//
//   DEFENSIVE — copyFindings: at every holon level (function, class, whole
//   file), a verbatim / near-verbatim match against the retained corpus of
//   DISTINCTIVE code is a finding. A body lifted from the exemplar is refused
//   — compose, or cite the giver, or invent; never present a copy as original.
//
//   CONSTRUCTIVE — replicationNotes: the CodeNamePrior@1 genericity floor
//   (built from 16 real repos) marks what RECURS across independent codebases.
//   `init`, `main`, `run`, a standard loop, a canonical guard — that is
//   REPLICATE-FOR-EFFICIENCY, the good kind of reuse, never "copying". The
//   archon reinforces these: a copied generic idiom is not a finding; a copied
//   distinctive body is. This is what keeps anti-copy from becoming
//   anti-efficiency — the same seam the language-law prior and the substrate
//   already hold.
//
// Both faces reuse the organs that already exist: code-structure.js's
// `parseDeclarations` (the holon units) and `genericityOf` (the replicable-vs-
// distinctive floor), plus a disclosed word-shingle similarity. A finding is a
// nomination (weak signal), never a verdict on its own.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDeclarations, genericityOf } from "../adapters/text/code-structure.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CODE_NAME_PRIOR = path.join(HERE, "..", "..", "..", "live_priors", "derived-priors", "code-priors", "code-name-prior-v1.json");

let _prior = null;
let _priorLoaded = false;
export function loadCodeNamePrior() {
  if (_priorLoaded) return _prior;
  _priorLoaded = true;
  try { _prior = JSON.parse(fs.readFileSync(CODE_NAME_PRIOR, "utf8")); } catch { _prior = null; }
  return _prior;
}

// ── word-shingle similarity (Jaccard over word n-grams) ────────────────────
// Honest, disclosed: a weak signal for near-verbatim overlap, not a parser and
// not a proof of copying. Reused by both faces; the verdict is corroboration.
function words(text) {
  return String(text ?? "").toLowerCase().match(/[a-z_$][a-z0-9_$]*/g) ?? [];
}
function shingles(tokens, n = 4) {
  const out = new Set();
  for (let i = 0; i + n <= tokens.length; i++) out.add(tokens.slice(i, i + n).join(" "));
  return out;
}
function similarity(a, b, n = 4) {
  const ta = words(a), tb = words(b);
  if (ta.length < n || tb.length < n) return 0;
  const sa = shingles(ta, n), sb = shingles(tb, n);
  let inter = 0;
  for (const s of sa) if (sb.has(s)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

// A name recurs across >= GENERIC_FLOOR independent real repos → boilerplate,
// replicable for efficiency, never "copying". Below the floor → distinctive,
// the material's own creative work.
const GENERIC_FLOOR = 2;

function isGeneric(name) {
  const g = genericityOf(loadCodeNamePrior(), name);
  return g !== null && g >= GENERIC_FLOOR;
}

// ── THE HOLARCHY: whole → part → sub-part, by declaration containment ───────
// A holon is the file (whole) and each declaration (part), nested by span.
// This is what makes the archon holonically aware: the copy law is applied per
// holon, not per flat name.
function buildHolarchy(code, fileName) {
  const text = String(code ?? "");
  const root = { name: "<file>", kind: "file", start: 0, end: text.length, body: text, children: [] };
  let decls = [];
  try { decls = parseDeclarations(text, fileName); } catch {}
  const nodes = [root];
  for (const d of decls) {
    let parent = root, bestStart = 0;
    for (const n of nodes) {
      if (n.start <= d.start && d.end <= n.end && n.start >= bestStart) { bestStart = n.start; parent = n; }
    }
    const node = { name: d.name, kind: d.kind, start: d.start, end: d.end, body: text.slice(d.start, d.end), children: [] };
    parent.children.push(node);
    nodes.push(node);
  }
  return root;
}

// THE HOLON LAW: LOW sets POSSIBILITY for HIGH, HIGH sets PROBABILITY for LOW.
//   bottom-up (possibility): a holon is REPLICABLE only if its name is generic
//     AND every child is replicable — a single distinctive part makes the whole
//     potentially distinctive, so the whole is no longer "just boilerplate".
//   top-down (probability): a distinctive whole that is a copy makes its parts
//     *probably* copies — so a flagged whole subsumes its children (no double-
//     count), and a distinctive parent implicates its parts.
function replicable(node) {
  if (node.kind !== "file" && !isGeneric(node.name)) return false;
  return node.children.every(replicable);
}

/**
 * copyFindings(code, { sources, fileName }) — the DEFENSIVE face, holon-aware.
 * Walk the holarchy top-down. A holon that is NOT replicable (distinctive) and
 * matches the corpus is a copy finding; the walk stops descending there (high
 * sets probability for low). A holon composed entirely of replicable parts is
 * itself replicable and never flagged (low sets possibility for high).
 */
export function copyFindings(code, { sources = [], fileName = "generated.py", n = 4, threshold = 0.65 } = {}) {
  const findings = [];
  const corpus = (sources ?? []).map((s) => String(s ?? "")).filter((t) => t.length > 40);
  if (!corpus.length) return { findings, checked: 0, basis: "no retained corpus — nothing to copy against (disclosed, not a silent pass)" };

  const bestMatch = (body) => {
    let best = 0, idx = -1;
    for (let i = 0; i < corpus.length; i++) {
      const sim = similarity(body, corpus[i], n);
      if (sim > best) { best = sim; idx = i; }
    }
    return { sim: best, sourceIndex: idx };
  };
  let checked = 0;
  const walk = (node) => {
    checked++;
    if (!replicable(node)) {
      const { sim, sourceIndex } = bestMatch(node.body);
      if (sim >= threshold) {
        findings.push({
          kind: "copy", level: node.kind, name: node.name,
          similarity: Number(sim.toFixed(3)), sourceIndex,
          detail: `${node.kind} "${node.name}" is ${Math.round(sim * 100)}% a word-shingle match of a retained source — do not write what can be copied; compose, or cite the giver, or invent`,
        });
        return; // high sets probability for low — a distinctive copy subsumes its parts
      }
    }
    node.children.forEach(walk);
  };
  walk(buildHolarchy(code, fileName));

  return {
    findings, checked,
    prior: loadCodeNamePrior() ? "code-name-prior-loaded" : "no-code-name-prior",
    basis: `anti-copy archon (Martial) — holon-aware: word-shingle similarity over ${corpus.length} source(s); low sets possibility for high (replicable iff generic name + all parts replicable), high sets probability for low (a distinctive copy subsumes its parts). A finding is a nomination, never a verdict`,
  };
}

/**
 * replicationNotes(code, { fileName }) — the CONSTRUCTIVE face. Which holons
 * are the RECURRING shapes the archon actively reinforces (replicate for
 * efficiency): the replicable ones, bottom-up.
 */
export function replicationNotes(code, { fileName = "generated.py" } = {}) {
  const notes = [];
  const walk = (node) => {
    if (node.kind !== "file" && isGeneric(node.name)) notes.push({ name: node.name, kind: node.kind, note: "recurring across real codebases — replicate for efficiency, not copying" });
    node.children.forEach(walk);
  };
  walk(buildHolarchy(code, fileName));
  return { notes, basis: "anti-copy archon (Martial) — the generic shapes are the replicable-for-efficiency seam" };
}

export const MARTIAL_ARCHON = { handle: "Martial", organ: "anti-copy", law: "do not write what can be copied; replicate what should be replicated", floor: GENERIC_FLOOR };

// ── LINE-LEVEL PROVENANCE: what we snipped from, recorded where it happened ──
/**
 * provenanceFor(code, { sources, fileName, floor }) — for each distinctive holon
 * whose body resembles a retained source above the floor (drawn-on, not merely
 * idiomatic), the best-matching source. The per-holon record of what the code
 * stands on. sources: [{ text, name, license }] (or plain strings).
 */
export function provenanceFor(code, { sources = [], fileName = "generated.py", n = 4, floor = 0.35 } = {}) {
  const srcs = (sources ?? []).map((s) => (typeof s === "string" ? { text: s, name: null, license: null } : s)).filter((s) => s.text && s.text.length > 40);
  const out = [];
  if (!srcs.length) return out;
  const text = String(code ?? "");
  const lineOf = (offset) => text.slice(0, offset).split("\n").length;
  const walk = (node) => {
    if (node.kind !== "file" && !isGeneric(node.name) && node.body.trim().length > 40) {
      let best = { sim: 0, i: -1 };
      for (let i = 0; i < srcs.length; i++) { const sim = similarity(node.body, srcs[i].text, n); if (sim > best.sim) best = { sim, i }; }
      if (best.sim >= floor) out.push({ name: node.name, kind: node.kind, line: lineOf(node.start), similarity: Number(best.sim.toFixed(2)), sourceName: srcs[best.i].name, sourceLicense: srcs[best.i].license });
    }
    node.children.forEach(walk);
  };
  walk(buildHolarchy(text, fileName));
  return out;
}

/**
 * annotateWithSources(code, { provenance, language }) — inject a quiet comment
 * before each holon that drew on a source: the record of what we snip from, at
 * the line, in the code's own comment syntax — never a banner.
 */
export function annotateWithSources(code, { provenance = [], language = "python" } = {}) {
  const lines = String(code ?? "").split("\n");
  const comment = (t) => (language === "python" || language === "shell") ? `# ${t}` : `// ${t}`;
  for (const p of [...provenance].sort((a, b) => (b.line ?? 1) - (a.line ?? 1))) {
    const idx = Math.max(0, (p.line ?? 1) - 1);
    const indent = (lines[idx]?.match(/^\s*/) ?? [""])[0];
    const who = p.sourceName ?? "a retained source";
    lines.splice(idx, 0, `${indent}${comment(`in the style of ${who}${p.sourceLicense ? ` (${p.sourceLicense})` : ""}`)}`);
  }
  return lines.join("\n");
}
