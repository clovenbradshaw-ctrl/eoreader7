// native/eval/the-fold/atomize-lessons.mjs — TURN THE CODING LESSONS INTO
// PROPOSITION ATOMS BY INTENT, NOT KEYWORDS.
//
// The lessons are prose. A regex/keyword scan cannot map them to code (measured:
// common words gave 91/93 false "live"). The right instrument is already here:
//   · the parser reads each lesson sentence into a CLAUSE CORE — root lemma and
//     subject lemma (eot-notation.js::clauseCore), the sentence's structural
//     intent, no words matched;
//   · the HOLOGRAPH captures it as a proposition atom (proposition-holograph.js),
//     with its provenance and its falsifier;
//   · the SAME parser reads the code's own comments/docstrings; a lesson is
//     "live" when a code comment shares its clause core — intent overlap, never
//     a keyword.
//
// No regex over lesson text. No keyword lists. The status is decided by the
// parser's structure and the holograph's atoms.
//
//   node native/eval/the-fold/atomize-lessons.mjs [--json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEotParser, clauseCore } from "../../the-fold/eot-notation.js";
import { createPropositionHolograph, captureProposition } from "../../the-fold/proposition-holograph.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, "..", "..", "..");
const LESSONS = path.join(REPO, "CODING-LESSONS.md");

// the runtime surface (files the coding path routes through), read whole.
const RUNTIME_FILES = [
  "native/the-fold/code-loop.js", "native/the-fold/code-hunt.js", "native/the-fold/hunt.js",
  "native/the-fold/arrow-gate.js", "native/the-fold/forecast.js", "native/the-fold/patch.js",
  "native/the-fold/loop-check.js", "native/adapters/code/mechanical.js", "native/adapters/code/py-engine.js",
  "native/adapters/text/code-structure.js", "proxy-runner.mjs",
];

// split the ledger into lessons (title + body). The ONLY regex here is the
// ledger's own markdown heading grammar — not a word-match over meaning.
function parseLessons(md) {
  const out = []; let cur = null;
  for (const ln of md.split("\n")) {
    const m = /^## (\d+)\.\s+(.*)$/.exec(ln);
    if (m) { if (cur) out.push(cur); cur = { n: Number(m[1]), title: m[2].trim(), body: [] }; }
    else if (cur) cur.body.push(ln);
  }
  if (cur) out.push(cur);
  return out.map((l) => ({ ...l, body: l.body.join("\n").trim() }));
}

// sentences of a lesson body: the ledger's own paragraph/sentence structure,
// split on terminal punctuation (mechanical, language-shape not word-match).
const sentencesOf = (t) => String(t ?? "").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3);

// code comments: the code's OWN intent, read as clauses. Comments are the
// code's prose; we harvest their cores through the same parser.
function codeClauses(text) {
  const clauses = [];
  for (const m of String(text).matchAll(/\/\/\s*([A-Z][^\n]{15,200})/g)) clauses.push(m[1].trim());
  return clauses;
}

// content-bearing only: a match on a stopword-like operation/operand is noise,
// not intent. These are closed-class function lemmas, not domain words.
const STOP = new Set(["be", "have", "do", "that", "this", "it", "there", "here", "what", "which", "who", "make", "get", "go", "come", "say", "let", "the"]);
const contentful = (w) => w && w.length > 3 && !STOP.has(w);
const falsifierOf = (body) => {
  const i = body.search(/Falsifying control/i);
  if (i < 0) return null;
  const rest = body.slice(i).replace(/^Falsifying control[^:]*:\s*/i, "");
  return sentencesOf(rest)[0] ?? null;
};

const parser = await loadEotParser();
if (!parser.ok) { console.error(`parser unavailable: ${parser.reason}`); process.exit(2); }

const lessons = parseLessons(fs.readFileSync(LESSONS, "utf8"));

// the code-side intent: for each runtime file, the set of clause cores its
// comments yield. Building the map ONCE.
const codeCores = new Map(); // core -> {file, line, text}
for (const f of RUNTIME_FILES) {
  let text; try { text = fs.readFileSync(path.join(REPO, f), "utf8"); } catch { continue; }
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const m = /\/\/\s*([A-Z][^\n]{15,200})/.exec(lines[i]);
    if (!m) continue;
    const core = clauseCore(parser, m[1].trim());
    if (core && !codeCores.has(core)) codeCores.set(core, { file: f, line: i + 1, text: m[1].trim().slice(0, 70) });
  }
}

// ── capture each lesson by intent ─────────────────────────────────────────
const holograph = createPropositionHolograph();
const atoms = [];
for (const l of lessons) {
  // the lesson's clause cores — its structural intent, one per sentence
  const cores = [];
  for (const s of sentencesOf(l.body)) { const c = clauseCore(parser, s); if (c) cores.push({ core: c, text: s.slice(0, 120) }); }
  // a lesson is LIVE when a code clause shares the lesson's INTENT — the same
  // operation (root verb) or the same operand (subject) as one of its clauses,
  // never a keyword. Exact core equality is too strict (measured: 1/93);
  // sharing root OR subject is the Lovelace distinction (operation vs
  // operand) applied to matching. The direction is disclosed on the atom.
  let hit = null;
  for (const { core } of cores) {
    const [root, subj] = core.split("|");
    for (const [cc, at] of codeCores) {
      const [cr, cs] = cc.split("|");
      if (cr === root && cs === subj) { hit = { core: cc, share: "operation+operand", ...at }; break; }
      if (cr === root && contentful(root)) { hit = { core: cc, share: `operation (${root})`, ...at }; break; }
      if (cs === subj && contentful(subj)) { hit = { core: cc, share: `operand (${subj})`, ...at }; break; }
    }
    if (hit) break;
  }
  const status = hit ? "live" : (cores.length ? "prose" : "indexed");
  const atom = captureProposition(holograph, l.title, {
    activation: l.body.slice(0, 300),
    groundFacts: cores.map((c) => ({ fact: c.core, ref: hit ? `code:${hit.file}:${hit.line}` : null, end1: c.core.split("|")[1] ?? "", end2: c.core.split("|")[0] ?? "" })),
    placement: "whole.turn.rule",
  });
  atoms.push({
    n: l.n, title: l.title,
    intent: cores.map((c) => c.core),
    status, where: hit ? `${hit.file}:${hit.line} (${hit.share}: "${hit.core}")` : (cores.length ? `no code clause shares an operation/operand (tested ${cores.length})` : "no parseable clause"),
    falsifier: falsifierOf(l.body),
    atomId: atom?.id ?? null,
  });
}

const live = atoms.filter((a) => a.status === "live");
const prose = atoms.filter((a) => a.status === "prose");
const indexed = atoms.filter((a) => a.status === "indexed");
const withFalsifier = atoms.filter((a) => a.falsifier);

console.log(`\n── ATOMIZE THE CODING LESSONS (by intent, no keywords) ──`);
console.log(`parser: ${parser.provenance?.name ?? "eng-ewt"} · lessons: ${atoms.length}`);
console.log(`LIVE (a code clause shares the lesson's intent): ${live.length}  ·  PROSE-only: ${prose.length}  ·  INDEXED: ${indexed.length}`);
console.log(`atoms with a FALSIFYING CONTROL: ${withFalsifier.length}/${atoms.length}`);
console.log(`holograph atoms captured: ${holograph.atoms.length}\n`);

console.log(`LIVE — intent matched to code:`);
for (const a of live) console.log(`  #${a.n} ${a.title.slice(0, 52).padEnd(52)} → ${a.where}`);
console.log(`\nPROSE-ONLY — the lesson's intent appears in no code clause (the gap):`);
for (const a of prose) console.log(`  #${a.n} ${a.title.slice(0, 60)}  [intent: ${a.intent.slice(0, 3).join(", ")}]`);
console.log(`\nINDEXED — no parseable clause (title-only lessons):`);
for (const a of indexed) console.log(`  #${a.n} ${a.title.slice(0, 60)}`);

const out = { schema: "CodingLessonAtoms@2", method: "intent (clause core) + holograph, no keyword match",
  parser: parser.provenance ?? null, count: atoms.length,
  summary: { live: live.length, prose: prose.length, indexed: indexed.length, withFalsifier: withFalsifier.length },
  atoms };
fs.writeFileSync(path.join(HERE, "results", "coding-lesson-atoms.json"), JSON.stringify(out, null, 2));
console.log(`\natoms written → native/eval/the-fold/results/coding-lesson-atoms.json`);
if (process.argv.includes("--json")) console.log(JSON.stringify(out.summary, null, 2));
