// code-loop.js — a physics-gated, bounded coding loop over runProxyTurn.
//
// DEF: the caller declares satisfaction as a real command that either exits
// 0 or does not (`testCommand`) — never a model's own say-so.
//
// Loop, bounded (`maxRounds`, disclosed, never silent/unbounded — the same
// WEB_MAX_PAGES-style ceiling proxy-runner.mjs already uses for its gather
// loop): ask the model for exactly ONE of two mechanical actions, never a
// JSON tool call:
//
//   READ  — "show me a real file before I propose anything" — the model
//           names a path, mechanically validated as a real file inside the
//           workspace, and its real content is folded into the next
//           round's context. Nothing is applied, nothing is tested. This
//           is what lets the loop scale past whatever fits in one prompt:
//           round 1 shows a file listing plus a small initial sample, and
//           the model reads on demand instead of everything being dumped
//           up front.
//   PATCH — raw `find`/`add` bytes against a real, already-existing file
//           (never an invented path). The edit op (SEG/INS/SYN) is derived
//           MECHANICALLY from those bytes (patch.js — the model is never
//           trusted with its own op label), applied to the real file, then
//           the real test command runs for real (node:child_process, the
//           caller's own declared string — never a model-authored
//           command) and the real exit code decides pass/fail.
//
// EVA: exit 0 -> REC, concede: done, the change is kept.
//      exit nonzero -> the file is REVERTED to its pre-round bytes (nothing
//      broken is ever left on disk mid-loop) and the real failure output
//      is folded into the next round's prompt as grounded material.
//
// Every round's record (action, proposal, derived op, applied/reverted,
// real test output) is returned in full — a disclosed audit trail, since
// this server process has no browser ledger to land it on.

import fs from "node:fs";
import path from "node:path";
import { execSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readOps, applyOps } from "./patch.js";
import { arrowGate, arrowCycle, bodyHashOf, namedInOutput, namedInTraceback, inForceVerdicts, consecutiveReverts } from "./arrow-gate.js";
import { huntCandidates, swarmProbe, reconcileParams, computeBody } from "./code-hunt.js";
import { detectCodeLanguage, generationBriefFor, mismatchNoteFor } from "../adapters/code/language.js";
import { loadCodeKeywordPrior, keywordSetOf, buildCodeIndex, codeGist, loadCodeNamePriorSplits, parseDeclarations } from "../adapters/text/code-structure.js";
import { descriptorFromSeries } from "../kernel/shadow-echo.js";
import { dmdCut } from "./resolutions.js";
import { declaresKeyword, suggestWiderFind, suggestWholeFile, arityCoverage } from "../adapters/code/mechanical.js";
import { pyCheckSyntax, jsCheckSyntax, tsCheckSyntax, hasTsc, suggestImportFix, pyDiagnose } from "../adapters/code/py-engine.js";
import { emptyForecast, forecastKey, forecast, observe, forecastError } from "./forecast.js";
import { runProxyTurn } from "../../proxy-runner.mjs";
import { ask } from "../organs/territory.js";
import { readDocument } from "../adapters/sources/folder-index.js";

const SKIP_DIRS = new Set([".git", "node_modules", ".venv", "venv", "dist", "build", ".next", "__pycache__", ".cache", "coverage"]);
const MAX_LISTED_FILES = 200;
const MAX_FILE_CHARS_SHOWN = 12000;
const MAX_TOTAL_CHARS_SHOWN = 60000;
const DEFAULT_MAX_ROUNDS = 3;
const DEFAULT_TEST_TIMEOUT_MS = 60000;
const MAX_READ_CHARS_SHOWN = 8000;
// HUNT-FIRST EXHAUSTED (2026-10-02): a unit that is the only remaining void
// and has failed this many consecutive real draws is a terminal wall — the
// hunt is exhausted, the budget is not burned redrawing the ant-loop wall
// (measured: the mouth burned 7 of 10 rounds re-drawing a median it provably
// cannot write non-mutating).
const HUNT_EXHAUST_LIMIT = 4;

/** The default mouth: runProxyTurn, the one engine the proxy and TUI share.
 * Injectable so drivers (composed-fixer) and tests can stage a scripted mouth
 * (a { turn } that returns { text }) — closing the repo's own "runCodeLoop
 * end-to-end is driver-tested only" gap without threading injection through
 * every caller. */
export async function defaultTurn(args) {
  return runProxyTurn(args);
}

function listFiles(root, max = MAX_LISTED_FILES) {
  const out = [];
  const walk = (dir) => {
    if (out.length >= max) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= max) return;
      if (e.name.startsWith(".") && e.name !== ".") continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(abs);
      } else if (e.isFile()) {
        out.push(path.relative(root, abs));
      }
    }
  };
  walk(root);
  return out;
}

/** Real bytes only — never a guess at what a file contains. Bounded so the
 * prompt stays a prompt, not a dump; a truncated file says so. */
function renderFiles(root, relPaths) {
  let budget = MAX_TOTAL_CHARS_SHOWN;
  const blocks = [];
  for (const rel of relPaths) {
    if (budget <= 0) break;
    let content;
    try {
      content = fs.readFileSync(path.join(root, rel), "utf8");
    } catch {
      continue;
    }
    const truncated = content.length > MAX_FILE_CHARS_SHOWN;
    const shown = content.slice(0, Math.min(MAX_FILE_CHARS_SHOWN, budget));
    budget -= shown.length;
    blocks.push(`--- ${rel} ---\n${shown}${truncated || shown.length < content.length ? "\n[...truncated...]" : ""}`);
  }
  return blocks.join("\n\n");
}

const MAX_FOLD_SNIPPET_TOTAL_CHARS = 4000;

/** The one real declaration codeGist's cut kept for `name` (its exact
 * {start,end} byte range from parseDeclarations, via buildCodeIndex) —
 * or null when the name isn't in this index. Prefers the entry whose
 * file matches `fileHint` (gist's own row.file) since a name can be
 * declared more than once across files. */
function declarationBytes(files, index, name, fileHint) {
  const decls = index.entities.get(name) ?? [];
  const decl = decls.find((d) => d.file === fileHint) ?? decls[0];
  if (!decl) return null;
  const file = files.find((f) => f.fileName === decl.file);
  if (!file) return null;
  return { file: decl.file, text: file.text.slice(decl.start, decl.end) };
}

/** Fold, not dump: a codeGist-based structural summary of the workspace,
 * folded around the task's own words (question=task) — the distinctive,
 * call-graph-ranked declarations the task actually resolves to, never
 * every file's full bytes. codeGist's own DMD cut already carries each
 * surviving declaration's EXACT byte range (parseDeclarations never
 * guesses spans), so this shows those real bytes directly — a model
 * does not need a whole extra ACTION: read round to fetch what the cut
 * already resolved to; it can copy FIND straight from what's below.
 * The existing READ action (renderReadFiles) still covers everything
 * else the cut didn't surface. */
function renderFoldedContext(root, relPaths, task) {
  const files = [];
  for (const rel of relPaths) {
    let text;
    try {
      text = fs.readFileSync(path.join(root, rel), "utf8");
    } catch {
      continue;
    }
    const keywords = keywordSetOf(loadCodeKeywordPrior(detectCodeLanguage(rel)));
    files.push({ fileName: rel, text, keywords });
  }
  const index = buildCodeIndex(files);
  if (!index.entities.size) {
    return "Code structure (folded): no function/class declarations were mechanically recognized in this workspace — see the file listing above and ACTION: read whichever file the task points to.";
  }
  const gist = codeGist({ index, question: task, dmdCut, languagePriors: loadCodeNamePriorSplits(), genericFloor: 2 });
  const declaredLines = gist.declared.rows.length
    ? gist.declared.rows.map((r) => `  ${r.name} — ${index.describe(r.name).kind ?? "?"}, ${r.file}, call-degree ${r.degree}`).join("\n")
    : "  (none survive this cut)";
  const callLines = gist.calls.rows.length
    ? gist.calls.rows.map((r) => `  ${r.caller} → ${r.callee} (${r.count}×)`).join("\n")
    : "  (none survive this cut)";

  let snippetBudget = MAX_FOLD_SNIPPET_TOTAL_CHARS;
  const snippetBlocks = [];
  for (const r of gist.declared.rows) {
    if (snippetBudget <= 0) break;
    const bytes = declarationBytes(files, index, r.name, r.file);
    if (!bytes) continue;
    const truncated = bytes.text.length > snippetBudget;
    const shown = bytes.text.slice(0, snippetBudget);
    snippetBudget -= shown.length;
    snippetBlocks.push(`--- ${bytes.file} :: ${r.name} (real bytes — copy FIND from here) ---\n${shown}${truncated ? "\n[...truncated...]" : ""}`);
  }
  const snippetSection = snippetBlocks.length
    ? snippetBlocks.join("\n\n")
    : "  (the cut kept no rows to show real bytes for)";

  return [
    "Code structure (folded — distinctive declarations the task's own words resolve to, ranked by real call-graph degree; NOT a full file dump):",
    "",
    "Declared:",
    declaredLines,
    "",
    "Calls:",
    callLines,
    "",
    `Basis: ${gist.declared.basis}; ${gist.disclosure.basis}`,
    "",
    "Real bytes of the declarations above (exact, from the real file — copy FIND from here without a READ round; a truncated entry or a name not listed above still needs ACTION: read):",
    "",
    snippetSection,
    "",
    "Every other file in the workspace exists on disk but is not shown above — ACTION: read <path> for any file whose bytes you still need.",
  ].join("\n");
}

/** SCOPED CONTEXT FOR ONE VOID BY SHADOW AND ECHO (the-change, 2026-10-02).
 *
 *  NO REGEX, NO NAME MATCHING. The void loop hands the mouth only the target's
 *  own declaration. This adds, ON REQUEST, the declarations whose SHAPE
 *  resonates with the target's — found by the child's own sense
 *  (kernel/shadow-echo.js): every declaration's body bytes become a SERIES,
 *  giving a SHADOW (the energy envelope — where in the body the structure is
 *  dense) and an ECHO (the spectrum — what the body rings at). The target is a
 *  concept; its kin are the declarations whose descriptor sits inside the
 *  target's own self-bound, measured leave-one-out (selfBoundOf), never a typed
 *  threshold. This is the same instrument organs/mnemonic.js already uses to
 *  remember what things look like — applied to code declarations, not images.
 *
 *  WHY NOT THE CALL GRAPH: buildCodeIndex's edges are per-file and a regex that
 *  matched callee names across files produced spurious reverse pairs (measured).
 *  The shadow/echo needs no name correspondence at all: two declarations of the
 *  same structural kind resonate whether or not one names the other.
 *
 *  Returns "" when the code base has fewer than 3 declarations (a framework
 *  needs a trajectory) or nothing falls inside the target's bound, so the
 *  caller omits the section rather than showing an empty one. */
export function renderVoidNeighbourhood(root, fileList, targetName) {
  const decls = [];
  let idx = 0;
  for (const rel of fileList) {
    let text;
    try { text = fs.readFileSync(path.join(root, rel), "utf8"); } catch { continue; }
    let ds = [];
    try { ds = parseDeclarations(text, rel, { keywords: keywordSetOf(loadCodeKeywordPrior(detectCodeLanguage(rel))) }); } catch { continue; }
    for (const d of ds) decls.push({ name: d.name, file: rel, start: d.start, end: d.end, text: text.slice(d.start, d.end), _i: idx++ });
  }
  if (decls.length < 3) return "";
  const target = decls.find((d) => d.name === targetName);
  if (!target) return "";
  // each declaration's body → a SERIES of its own byte values → shadow + echo.
  const seriesOf = (s) => { const a = new Float64Array(s.length); for (let i = 0; i < s.length; i += 1) a[i] = s.charCodeAt(i) / 255; return a; };
  const desc = new Map();
  for (const d of decls) { try { desc.set(d._i, descriptorFromSeries(seriesOf(d.text))); } catch { /* too short: no descriptor */ } }
  if (!desc.has(target._i)) return "";
  // the KIN of the target: every OTHER declaration with a descriptor, scored by
  // residual against the target's own family (a framework built from the
  // target + its nearest-by-residual siblings is circular at n=1, so we use the
  // direct descriptor distance — the shadow/echo metric — bounded by the
  // target's OWN self-bound over the population, derived, never typed).
  const dist = (a, b) => { let s = 0; const n = Math.min(a.length, b.length); for (let i = 0; i < n; i += 1) { const d = a[i] - b[i]; s += d * d; } return Math.sqrt(s); };
  const t = desc.get(target._i);
  const scored = decls.filter((d) => d._i !== target._i && desc.has(d._i)).map((d) => ({ d, r: dist(t, desc.get(d._i)) })).sort((a, b) => a.r - b.r);
  // the bound: the target's own nearest-sibling distance across the population
  // (leave-one-out twin level — organism's own derived floor), so nothing is
  // added unless it is at least as close as the closest thing of its kind.
  if (!scored.length) return "";
  const allCore = [target, ...scored.map((s) => s.d)];
  const coreDist = (d) => Math.min(...allCore.filter((x) => x._i !== d._i).map((x) => dist(desc.get(d._i), desc.get(x._i))));
  const bound = Math.max(...scored.map((s) => coreDist(s.d))); // worst within-family nearest — the honest floor
  const kin = scored.filter((s) => s.r <= bound);
  if (!kin.length) return "";
  let budget = 2000;
  const blocks = [];
  for (const { d } of kin) {
    if (budget <= 0) break;
    const shown = d.text.slice(0, budget);
    budget -= shown.length;
    blocks.push(`--- ${d.file} :: ${d.name} (resonates with ${targetName}; real bytes) ---\n${shown}${shown.length < d.text.length ? "\n[...truncated...]" : ""}`);
  }
  if (!blocks.length) return "";
  return [
    "",
    `Neighbourhood of ${targetName} (declarations whose own shape resonates with it, found by shadow and echo over their real bytes — do NOT change them; they are shown so the body you complete fits the same structure):`,
    blocks.join("\n\n"),
  ].join("\n");
}

// Exported for the worked-example pin (the format is half the anchoring
// mechanism since lesson #4 — a test guards the example surviving edits).
export const PROPOSAL_FORMAT = `Respond with exactly one action, in exactly one of these two formats and nothing else.

To see a real file's full content before proposing anything (any file not shown above, or shown truncated):
ACTION: read
PATH: <relative file path>

To propose a change:
ACTION: patch
PATH: <one file path from the listing above, e.g. solution.py>
<<<FIND>>>
<the exact existing text to change — copy it byte for byte from the file shown above, with no extra blank lines around it>
<<<ADD>>>
<the replacement text — leave this section empty to delete the FIND text>
<<<END>>>

Worked example (SHAPES only — every name below is fake; copy YOUR
file's real names and bytes instead):
PATH: solution.py
<<<FIND>>>
def example_function():
    raise NotImplementedError
<<<ADD>>>
def example_function():
    return 1
<<<END>>>
FIND and ADD are raw file bytes, copied exactly as shown above — backticks
around them mean the text was authored, not copied, and such a proposal is
refused without touching disk. The worked example above is the shape to follow.`;

// LOCATED_PROPOSAL_FORMAT — used when the machine has located the target
// file (territory SEG). The model proposes the edit with NO PATH line at
// all: it cannot echo a fake path it never saw (the 2026-10-01 live
// lesson: a 2b mouth imitates `PATH: solution.py` from the worked example
// instead of reading the real listing). Gary-minimal: the file decision
// is the machine's, the model only supplies FIND/ADD bytes.
export const LOCATED_PROPOSAL_FORMAT = `The file you are editing is already located for you (named above) and its real bytes are shown — there is nothing to read. Propose exactly one edit in this shape, with no PATH line and no read:

<<<FIND>>>
<the exact existing text to change — copy it byte for byte from the real bytes shown above>
<<<ADD>>>
<the replacement text — leave this section empty to delete the FIND text>
<<<END>>>

Worked example (SHAPES only — every name below is fake; copy YOUR file's real bytes instead):
<<<FIND>>>
    raise NotImplementedError
<<<ADD>>>
    return 1
<<<END>>>

FIND and ADD are raw file bytes, copied exactly as shown above — backticks around them mean the text was authored, not copied, and such a proposal is refused without touching disk.`;

const READ_RE = /ACTION:\s*read\s*\nPATH:\s*(\S+)/i;
// FENCED READ (2026-10-03, measured live with a frontier mouth): the natural
// shape a modern model emits for "show me the file" is a fenced read block —
// ```read\nsrc/route.js\n``` — not the canonical ACTION/PATH pair. The machine
// ABSORBS the shape instead of refusing it (the same doctrine as extractBody's
// fence stripping): both spellings name a real path, and the path is still
// validated against the real workspace before anything is read. Multiple
// fenced reads in one answer are all honored in the round (fewer round trips,
// fewer tokens). A fenced block whose first line is not a real-looking path
// is not a read and falls through to the other grammars.
const FENCED_READ_RE = /```read[ \t]*:?[ \t]*\n([\s\S]*?)\n?```/gi;
const FENCED_READ_INLINE_RE = /```read[ \t]*:?[ \t]+([^\s`]+)[ \t]*```/gi;
const PATCH_RE = /(?:ACTION:\s*patch\s*\n)?PATH:\s*(\S+)\s*\n<<<FIND>>>\n([\s\S]*?)\n<<<ADD>>>\n([\s\S]*?)(?:\n<<<END>>>|$)/i;
// PATH-less patch: no PATH line at all — resolves to the machine-located
// file (`impliedPath`). The model never names a path it cannot see.
const PATHLESS_PATCH_RE = /<<<FIND>>>\n([\s\S]*?)\n<<<ADD>>>\n([\s\S]*?)(?:\n<<<END>>>|$)/i;

/**
 * checkFenced(path, find, add) -> { ok:true } | { ok:false, gap }.
 * Propose-time fence gate (measured 32/42 unlocated FINDs): a ``` line
 * inside FIND/ADD of a detected code file proves the bytes were authored,
 * not copied — refused pre-disk with kind `fenced_proposal` and the fix
 * named. Markdown/prose/unknown files skip (their real bytes may hold
 * fences — safe direction is admit). Pure; the seam the tests pin.
 */
export function checkFenced(path, find, add) {
  if (!detectCodeLanguage(path)) return { ok: true };
  if (/^\s*```/m.test(String(find ?? "")) || /^\s*```/m.test(String(add ?? ""))) {
    return { ok: false, gap: { kind: "fenced_proposal", reason: "FIND/ADD are raw file bytes — drop the ``` fences and copy the text exactly as shown in the file above" } };
  }
  return { ok: true };
}

/**
 * figureOpFor(before, after, fileName) -> "INS" | "SEG" | "DEF" | "SYN" | null
 *
 * THE SLOT-LEVEL OPERATOR — what the edit is DOING to the code's own
 * structure, at the Figure grain, in the bare-metal fold's own semantics
 * (src/operators.js + src/fold.js: INS instantiates a new entity, DEF sets
 * a value within the current frame, SEG moves across a partition boundary,
 * SYN merges parts into a synthesized whole). Derived mechanically from
 * the real declaration sets before and after — never labeled by the model,
 * and never a fixed DEF: a patch that redefines an existing slot is DEF
 * (def(anchor, path, value)), a patch that births a new declaration is INS,
 * one that removes a declaration is SEG, one that does several of these is
 * SYN. null when the edit touches no declaration at all (prose, whitespace,
 * a non-code file) — the byte-level op (patch.js) is all there is then.
 */
export function figureOpFor(before, after, fileName) {
  if (typeof before !== "string" || typeof after !== "string") return null;
  const beforeDecls = parseDeclarations(before, fileName);
  const afterDecls = parseDeclarations(after, fileName);
  const beforeByName = new Map(beforeDecls.map((d) => [d.name, d]));
  const afterByName = new Map(afterDecls.map((d) => [d.name, d]));
  const born = afterDecls.filter((d) => !beforeByName.has(d.name));
  const cut = beforeDecls.filter((d) => !afterByName.has(d.name));
  const redefined = afterDecls.filter((d) => {
    const b = beforeByName.get(d.name);
    if (!b) return false;
    return before.slice(b.start, b.end) !== after.slice(d.start, d.end);
  });
  const changed = born.length + cut.length + redefined.length;
  if (!changed) return null;
  if (born.length && (cut.length || redefined.length)) return "SYN";
  if (cut.length && redefined.length) return "SYN";
  if (born.length) return "INS";
  if (cut.length) return "SEG";
  if (redefined.length > 1) return "SYN";
  return "DEF";
}

/** Mechanical extraction only — a narrow, declared grammar, never JSON the * model authored. A proposal that doesn't match either shape is a typed
 * gap, not a guess at what was meant. `ACTION:` may be omitted for a patch
 * (backward compatible with the original single-action grammar).
 *
 * THE OPERATORS STAY IN THE MACHINE, NOT THE MOUTH (Gary/P55): the model
 * faces only the plain `read` / `patch` verbs below; it never names this
 * instrument's operators. This function maps the plain verb onto the
 * operator the round discloses — read → SIG · scout (direct attention,
 * bring the addressed unit to the reader), patch → INS · admit at the
 * RECORD grain (bytes enter the audit trail), while the edit's act on the
 * code's own slots — DEF · set a value within the current frame for the
 * common fix-the-slot edit, INS for a born declaration, SEG for a removed
 * one, SYN for a recomposition — is derived separately by figureOpFor from
 * the declaration diff, never labeled by the model (bare-metal fold
 * semantics: EVA without prior DEF is criterionless_judgment).
 *
 * PATH-LESS MODE (2026-10-01, the solution.py lesson): when `impliedPath`
 * is given, the machine has already located the file (the territory SEG);
 * the model must NOT name a path — a 2b mouth imitates the taught shape
 * and echoes the worked example's fake `solution.py` instead of reading
 * the real listing. A PATH-less FIND/ADD block then resolves to the
 * located file; an explicit PATH (a real file the model read) still wins. */
export function parseProposal(text, { impliedPath = null } = {}) {
  const raw = String(text ?? "");
  const read = READ_RE.exec(raw);
  if (read) {
    if (impliedPath) {
      // Located mode has nothing to read: the located file's real bytes are
      // already shown. A read only invites path-guessing (measured live:
      // the mouth read real names with wrong prefixes instead of editing).
      return { ok: false, gap: { kind: "unexpected_read", reason: `you are editing ${impliedPath} and its real bytes are already shown above — there is nothing to read; emit only <<<FIND>>> and <<<ADD>>> against them` } };
    }
    return { ok: true, action: "SIG", path: read[1].trim() };
  }
  // FENCED READ ABSORPTION (2026-10-03): the model's natural ```read block.
  // One or many (one path per line); every path still resolves against the
  // real workspace below.
  const fencedPaths = [];
  for (const m of raw.matchAll(FENCED_READ_RE)) {
    for (const line of String(m[1] ?? "").split("\n")) {
      const p = line.trim();
      if (p && !fencedPaths.includes(p)) fencedPaths.push(p);
    }
  }
  for (const m of raw.matchAll(FENCED_READ_INLINE_RE)) { const p = m[1].trim(); if (p && !fencedPaths.includes(p)) fencedPaths.push(p); }
  if (fencedPaths.length) {
    if (impliedPath) {
      return { ok: false, gap: { kind: "unexpected_read", reason: `you are editing ${impliedPath} and its real bytes are already shown above — there is nothing to read; emit only <<<FIND>>> and <<<ADD>>> against them` } };
    }
    return fencedPaths.length === 1
      ? { ok: true, action: "SIG", path: fencedPaths[0], absorbed: "fenced-read" }
      : { ok: true, action: "SIG", paths: fencedPaths, absorbed: "fenced-read" };
  }
  const patch = PATCH_RE.exec(raw);
  if (patch) {
    const [, relPath, find, add] = patch;
    const file = relPath.trim();
    if (impliedPath && file !== impliedPath) {
      // Located mode: the machine chose the file. Any OTHER explicit path is
      // a typed gap, never a hunt for a real one — a 2b mouth imitates the
      // `PATH: solution.py` shape instead of the located file (measured live
      // 2026-10-01 twice), and inviting "a real path from the listing"
      // reinforces the attractor instead of closing it.
      return { ok: false, gap: { kind: "unexpected_path", reason: `you are editing ${impliedPath} — this round has no PATH field for any other file; emit only <<<FIND>>> and <<<ADD>>> against it` } };
    }
    return { ok: true, action: "INS", path: file, find, add: add.replace(/\n$/, "") };
  }
  if (impliedPath) {
    const pathless = PATHLESS_PATCH_RE.exec(raw);
    if (pathless) {
      const [, find, add] = pathless;
      return { ok: true, action: "INS", path: impliedPath, find, add: add.replace(/\n$/, ""), pathless: true };
    }
  }
  return { ok: false, gap: { kind: "unparsed_proposal", reason: "the answer did not contain an ACTION: read/patch block" } };
}

/** A path is only ever real: it must resolve to an existing file strictly
 * inside the declared workspace root. The model may point at real material
 * already on disk; it may never name material into existence. */
function resolveRealFile(workspace, relPath) {
  const root = fs.realpathSync(path.resolve(workspace));
  let resolved;
  try {
    resolved = fs.realpathSync(path.resolve(root, relPath));
  } catch {
    return { ok: false, gap: { kind: "invalid_path", reason: `no such file: ${relPath}` } };
  }
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return { ok: false, gap: { kind: "invalid_path", reason: `${relPath} resolves outside the workspace` } };
  }
  if (!fs.statSync(resolved).isFile()) {
    return { ok: false, gap: { kind: "invalid_path", reason: `${relPath} is not a file` } };
  }
  return { ok: true, resolved };
}

export function runTestCommand(testCommand, workspace, timeoutMs = DEFAULT_TEST_TIMEOUT_MS) {
  try {
    const output = execSync(testCommand, { cwd: workspace, encoding: "utf8", timeout: timeoutMs, stdio: ["ignore", "pipe", "pipe"] });
    return { exitCode: 0, output };
  } catch (err) {
    const output = `${err.stdout ?? ""}${err.stderr ?? ""}` || String(err.message ?? err);
    return { exitCode: typeof err.status === "number" ? err.status : 1, output };
  }
}

/** declaresUnit(text, unit) -> true when the file's own bytes declare or
 *  export the named unit. Mechanical (name + declaration keyword), used as
 *  the locator's control: a "missing export" failure whose target already
 *  declares the unit is NOT this shape and must not be mislocated. */
function declaresUnit(text, unit) {
  const u = String(unit).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:export\\s+)?(?:async\\s+)?(?:function|const|let|var|class)\\s+${u}\\b|export\\s*\\{[^}]*\\b${u}\\b|(?:^|\\n)\\s*(?:async\\s+)?def\\s+${u}\\b|(?:^|\\n)\\s*class\\s+${u}\\b`).test(String(text ?? ""));
}

/** locateMissingUnit(output, { root, files }) -> { file, unit, kind, basis } | null.
 *  MECHANICAL, NO MODEL: the test's own failure names a unit the code base
 *  must provide, and the module it must come from. Two measured shapes:
 *    Node ESM  SyntaxError: The requested module './route.js' does not
 *              provide an export named 'routeDecision'
 *    Python    ImportError: cannot import name 'routeDecision' from 'route'
 *  The importing file is named in the SAME output (Node: the first
 *  file:/// frame; Python: the first File "..." frame); the module specifier
 *  resolves relative to it, inside the workspace. The target must be a real
 *  file that does NOT already declare the unit (the falsifying control: a
 *  declared unit means this is some other failure — locate nothing).
 *  Returns the workspace-relative file and the missing unit, or null. */
export function locateMissingUnit(output, { root, files = [] } = {}) {
  const text = String(output ?? "");
  if (!root) return null;
  let rootReal;
  try { rootReal = fs.realpathSync(root); } catch { return null; }
  const relIfReal = (abs) => {
    try {
      const a = fs.realpathSync(abs);
      if (a !== rootReal && !a.startsWith(rootReal + path.sep)) return null;
      const r = path.relative(rootReal, a);
      return files.length === 0 || files.includes(r) ? r : null;
    } catch { return null; }
  };
  const importer = /file:\/\/([^\s:]+)/.exec(text)?.[1] ?? /File "([^"]+)", line \d+/.exec(text)?.[1] ?? null;
  const baseDir = importer ? path.dirname(importer) : rootReal;
  const name = importer ? path.basename(importer) : "the test";
  // Node ESM missing export
  const esm = /The requested module '([^']+)' does not provide an export named '([^']+)'/.exec(text);
  if (esm) {
    const target = relIfReal(path.resolve(baseDir, esm[1]));
    if (target) {
      let body = "";
      try { body = fs.readFileSync(path.join(rootReal, target), "utf8"); } catch { body = ""; }
      if (!declaresUnit(body, esm[2])) {
        return { file: target, unit: esm[2], kind: "missing_export", basis: `${name} imports '${esm[2]}' from '${esm[1]}', which does not export it` };
      }
    }
  }
  // Python missing import name
  const py = /cannot import name '([^']+)' from '([^']+)'/.exec(text);
  if (py) {
    const spec = py[2].replace(/^\.+/, "").replace(/\./g, "/");
    const candidates = [path.resolve(baseDir, spec + ".py"), path.resolve(baseDir, py[2].replace(/^\.+/, "") + ".py"), path.resolve(baseDir, spec, "__init__.py")];
    for (const c of candidates) {
      const target = relIfReal(c);
      if (!target) continue;
      let body = "";
      try { body = fs.readFileSync(path.join(rootReal, target), "utf8"); } catch { body = ""; }
      if (!declaresUnit(body, py[1])) {
        return { file: target, unit: py[1], kind: "missing_import", basis: `${name} cannot import '${py[1]}' from '${py[2]}'` };
      }
    }
  }
  return null;
}

/** syntaxGateFor(fileName) -> { language, check } — which engine gates
 *  this file's patched bytes, by extension only (detectCodeLanguage),
 *  never content-guessed. `check` is null when no engine gates the
 *  language. TypeScript always routes to tsCheckSyntax, which proves tsc
 *  itself (hasTsc, argv-only `tsc --version`, never npx/network) and
 *  returns null — recorded as skipped-no-engine — when tsc is absent:
 *  node --check never sees .ts bytes, it cannot parse type syntax.
 *  Exported for unit pins; runCodeLoop itself stays driver-tested. */
export function syntaxGateFor(fileName) {
  const language = detectCodeLanguage(fileName);
  if (language === "python") return { language, check: pyCheckSyntax };
  if (language === "javascript") return { language, check: jsCheckSyntax };
  if (language === "typescript") return { language, check: tsCheckSyntax };
  return { language, check: null };
}

/** precheckSyntax(fileName, code) -> { syntax, gap } — the pre-test gate
 *  as a pure, unit-pinned step: the file's own engine on the patched
 *  bytes (never a regex). `syntax` is the exact word the round records
 *  (checked | skipped-no-engine | unchecked-not-python); a parse failure
 *  carries no syntax word — it carries a gap instead, and the caller
 *  writes nothing and runs no test. A null verdict (engine absent on the
 *  box) proceeds untested, recorded, never a silent skip. */
export function precheckSyntax(fileName, code) {
  const gate = syntaxGateFor(fileName);
  if (!gate.check) return { syntax: "unchecked-not-python", gap: null };
  const verdict = gate.check(code, fileName);
  if (verdict === null) return { syntax: "skipped-no-engine", gap: null };
  if (!verdict.ok) {
    const at = verdict.error.lineno != null
      ? `, line ${verdict.error.lineno}${verdict.error.line != null ? `: ${verdict.error.line}` : ""}`
      : "";
    return { syntax: null, gap: { kind: "syntax_error", reason: `the patched file does not parse (${verdict.error.msg}${at}) — nothing was written, no test was run` } };
  }
  return { syntax: "checked", gap: null };
}

// ── THE VOID-CHASING LOOP (2026-10-02, penelope's own law) ───────────────────
//
// Measured live: neither resident small mouth can emit the FIND/ADD byte
// protocol (qwen2.5-coder:1.5b and gemma2:2b both produced markdown-fenced
// code every round, so the format gate refused everything and no test ever
// ran). Penelope's arrangement engine's law is the fix: MOUTH-LAST — the
// field defines the void, the hunt goes second, the mouth draws ONLY the
// irreducible residue, one unit at a time; and HUNT-FIRST error correction —
// a draw that fails is a real-test problem the loop chases, never a redraw
// of the same prompt.
//
// So here the MACHINE computes the operation and the mouth supplies only the
// value: detectVoidUnits reads the located file's own declarations (the
// field) and finds the stubs (the voids); buildVoidPatch extracts the exact
// stub bytes as the FIND; the mouth is asked only for ONE function's new
// body; the real declared test decides; on failure the file is reverted and
// the test's own words (which name the failing unit) go back to the mouth
// next round. No FIND/ADD grammar, no PATH, no fences to author.

const escapeRe = (s) => String(s ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** detectVoidUnits(text, fileName) -> the located file's own function
 *  declarations, each with its exact byte spans, its current body bytes,
 *  and whether that body is a STUB (raise NotImplementedError / pass / no
 *  statement at all). Pure — the field's own reading, never a model's. */
export function detectVoidUnits(text, fileName) {
  const src = String(text ?? "");
  const out = [];
  for (const d of parseDeclarations(src, fileName) ?? []) {
    if (d.kind !== "function") continue;
    const declText = src.slice(d.start, d.end).replace(/[\r\n]+$/, "");
    const bodyText = src.slice(d.bodyStart, d.end).replace(/[\r\n]+$/, "");
    // the first REAL statement: a leading docstring (single OR multi-line) is
    // the file's own spec, never a statement — strip the whole block first,
    // or a multi-line docstring's continuation lines would read as the first
    // statement and a stub behind it would be missed (measured live 2026-10-02:
    // median/mode/std_dev never detected, the chase died "no-void").
    const bodyNoDoc = bodyText.replace(/^\s*(?:"""|''')(?:[\s\S]*?)(?:"""|''')/, "");
    const bodyLines = bodyNoDoc.split("\n").filter((l) => l.trim() !== "");
    const firstStmt = bodyLines.find((l) => !/^\s*#/.test(l));
    const stubMatch = firstStmt ? /^(\s*)(raise NotImplementedError|pass)\b/.exec(firstStmt) : null;
    const docstring = (/^(\s*)(?:"""|''')([\s\S]*?)(?:"""|''')(?:\s*)$/m.exec(bodyText) ?? [])[2] ?? "";
    const signature = (/^(async\s+)?def\s+[A-Za-z_]\w*\s*\([^)]*\)\s*:/m.exec(declText) ?? [])[0] ?? null;
    out.push({
      name: d.name,
      start: d.start,
      end: d.end,
      bodyStart: d.bodyStart,
      declText,
      bodyText,
      signature,
      indent: (bodyLines[0]?.match(/^\s*/) ?? [""])[0] ?? "",
      stubLine: stubMatch ? stubMatch[0] : null,
      isStub: !!stubMatch,
      spec: docstring.replace(/\s+/g, " ").trim(),
    });
  }
  return out;
}

/** extractBody(draw, name) -> the mouth's draw reduced to the function's
 *  body statements, or null. The SNIP absorbs the small mouth's sloppiness
 *  instead of refusing it (penelope's snip): fences are stripped, a
 *  re-emitted `def name(` header is cut, the body is cut at its structural
 *  end (the first later line at column 0 — a trailing example or prose
 *  never rides in), dedented to its common base (the first line's indent is
 *  never eaten by a whole-string trim), a re-emitted docstring is dropped
 *  (the file keeps its own), and prose lines are a typed gap from the body,
 *  never re-indented into the file (measured 2026-10-02: the mouth parroted
 *  a fact-gate disclaimer line into every draw — the machine drops it). A
 *  draw with no code-shaped line at all is a typed gap, never a guess. The
 *  caller re-indents by the stub's own indent when building the patch. */
export function extractBody(draw, name) {
  let t = String(draw ?? "")
    .replace(/^\s*```[A-Za-z0-9_-]*\s*$/gm, "")
    .replace(/^\s*```\s*$/gm, "")
    .trimEnd();
  if (!t.trim()) return null;
  const header = new RegExp(`^\\s*def\\s+${escapeRe(name)}\\s*\\(`);
  const lines = t.split("\n");
  if (!header.test(lines[0] ?? "")) {
    const di = lines.findIndex((l) => header.test(l));
    if (di >= 0) {
      // keep any leading IMPORTS the declaration depends on (a snipped
      // `def tokenize` that needs `import re` is useless without it — the
      // hunt carries them, this cut preserves them)
      const preamble = lines.slice(0, di).filter((l) => /^\s*(?:import|from)\s/.test(l));
      lines.splice(0, di + 1);
      if (preamble.length) lines.unshift(...preamble);
    }
  } else {
    lines.shift();
  }
  // The body's structural end: when the body is INDENTED (the completion
  // anchor's own indent primes the mouth to continue it), it ends at the
  // first later non-blank line at column 0 — a trailing example, prose or
  // explanation never rides into the function.
  const firstCode = lines.findIndex((l) => l.trim() !== "");
  let bodyLines = lines;
  if (firstCode >= 0 && (lines[firstCode].match(/^\s*/) ?? [""])[0].length > 0) {
    const end = lines.findIndex((l, i) => i > firstCode && l.trim() !== "" && (l.match(/^\s*/) ?? [""])[0].length === 0);
    if (end > firstCode) bodyLines = lines.slice(0, end);
  }
  const kept = bodyLines.map((l) => l.trimEnd()).filter((l) => l.trim() !== "");
  if (!kept.length) return null;
  // IMPORTS sit at column 0 (they precede the declaration); the STATEMENT
  // lines are dedented to their OWN common base — never the imports' 0 —
  // so a preserved `import re` + a body dedent cleanly for the re-indent.
  const importLines = kept.filter((l) => /^\s*(?:import|from)\s/.test(l));
  const stmtLines = kept.filter((l) => !/^\s*(?:import|from)\s/.test(l));
  const indents = stmtLines.map((l) => (l.match(/^\s*/) ?? [""])[0].length);
  const base = stmtLines.length ? Math.min(...indents) : 0;
  let body = [...importLines, ...stmtLines.map((l) => l.slice(base))].join("\n").trim();
  if (!body) return null;
  // a re-emitted docstring is the file's own business — drop it
  body = body.replace(/^\s*(?:"""|''')(?:[\s\S]*?)(?:"""|''')[\s\n]*/, "").trim();
  if (!body) return null;
  // PROSE IS A TYPED GAP FROM THE BODY, NEVER RE-INDENTED INTO THE FILE: keep
  // only lines that read like Python statements (a statement keyword, an
  // assignment — including subscripts and augmented operators — or a call at
  // statement position, or a comment).
  const lines2 = body.split("\n").filter((l) => l.trim() !== "");
  const CODE_LINE =
    /^\s*(?:return|if|elif|else|for|while|def|class|import|from|raise|yield|with|try|except|finally|pass|break|continue|assert|del|global|nonlocal|print)\b|^\s*\w[\w.]*(\[[^\]]*\])*\s*(?:=|\+=|-=|\*=|\/=|%=)|^\s*\.?\w[\w.]*(\[[^\]]*\])*\s*\(|^\s*#/;
  const clean = lines2.filter((l) => CODE_LINE.test(l));
  if (!clean.length) return null;
  body = clean.join("\n").trim();
  if (!body) return null;
  return body.replace(/\s+$/, "");
}

/** buildVoidPatch(unit, body) -> { ok, find, add } — the MACHINE'S edit op,
 *  derived from the real bytes (never the mouth's own op label). A stub is
 *  filled by replacing the stub line inside the whole declaration (unique);
 *  a body-correction (error-correction on a unit the test named) replaces
 *  the whole current body. FIND is exact file bytes; ADD is the mouth's body
 *  re-indented by the stub's own indent. */
export function buildVoidPatch(unit, body) {
  const base = unit.indent ?? "";
  const indented = String(body ?? "")
    .split("\n")
    .map((l) => (l.trim() ? base + l.trimEnd() : ""))
    .join("\n")
    .replace(/\s+$/, "");
  if (!unit.isStub) {
    if (!unit.bodyText) return { ok: false, gap: { kind: "no_body", reason: `${unit.name} has no body to correct` } };
    return { ok: true, find: unit.bodyText, add: indented, op: "DEF", mode: "body-correction" };
  }
  if (!unit.stubLine) return { ok: false, gap: { kind: "no_stub", reason: `${unit.name} reads as a stub but has no stub line` } };
  if (!unit.declText.includes(unit.stubLine)) return { ok: false, gap: { kind: "stub_gone", reason: `the stub line of ${unit.name} is no longer in the file` } };
  return { ok: true, find: unit.declText, add: unit.declText.replace(unit.stubLine, indented), op: "DEF", mode: "stub-fill" };
}

/** runVoidLoop — the DEF→EVA→REC chase across a WHOLE CODE BASE, bounded by
 *  maxRounds, judged by the caller's own real testCommand against the whole
 *  workspace. The VOID is defined by the field (every stub-bearing file) and
 *  the test's own voice (a failure that names a unit reopens it); the machine
 *  advances across files — the task-located file first, then the field's own
 *  order — so a code base's stubs are filled file by file, the arrow gate
 *  operating on each file's own record (a verdict is valid only within the
 *  file whose bytes it judged). EFFICIENT (2026-10-02): a failed draw
 *  sharpens and re-draws WITHIN the same round (the spiral); a unit that is a
 *  file's only remaining void but has failed HUNT_EXHAUST_LIMIT consecutive
 *  real draws MOVES the chase to the next stub-bearing file, and only when no
 *  other file has a void is the wall TERMINAL — disclosed, never a budget
 *  burn. Returns done, rounds (the disclosed audit trail), finalTestOutput. */
export async function runVoidLoop({ sessionId, userId = null, model, task, workspace, locatedFile = null, files = null, testCommand, maxRounds = DEFAULT_MAX_ROUNDS, testTimeoutMs = DEFAULT_TEST_TIMEOUT_MS, caller = null, signal = null, turn = defaultTurn, kelsenFor = null, candidates = 3, logFile = null, huntRoots = [], huntWeb = false, contextFold = false }) {
  const root = path.resolve(workspace);
  const fileList = (files && files.length ? files : [locatedFile ? [locatedFile] : listFiles(root)]).flat().filter(Boolean);
  const draws = Math.max(1, Math.floor(candidates ?? 1));
  const rounds = [];
  let finalTestOutput = null;
  let lastTestFailure = null; // REAL test output only — only it may name a unit (targeting)
  let lastNote = null; // anything (a gap, a refusal) — goes to the mouth, never targets

  // THE APPEND-ONLY LOG (2026-10-02): every action the chase takes appends
  // one line to `logFile` (the codebase's own LOG.jsonl). The codebase IS
  // the fold of that log — the log is the truth, the files are its current
  // materialization, and the model is disclosed on every line (never a
  // frontier model silently). A failed append is a finding, never a kill.
  // `seq` is GLOBAL across runs (continues from the log's own length), so
  // the fold's order is monotonic even when the chase resumes.
  let seq = 0;
  if (logFile) {
    try { seq = fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean).length; } catch { seq = 0; }
  }
  const push = (r) => {
    rounds.push(r);
    seq += 1;
    if (logFile) {
      try {
        fs.appendFileSync(logFile, JSON.stringify({
          at: new Date().toISOString(), seq, schema: "VoidLog@1",
          round: r.round, draw: r.draw ?? null, file: r.file ?? null, action: r.action ?? "record",
          move: r.move ?? null, target: r.target ?? null, by: r.by ?? null,
          verdict: r.verdict ?? r.gap?.kind ?? (r.applied ? (r.reverted ? "reverted" : r.carried ? "carried" : "applied") : null),
          testExitCode: r.testExitCode ?? null, reverted: r.reverted ?? null, carried: r.carried ?? null,
          cycle: r.cycle ?? null, mode: r.mode ?? null, source: r.source ?? null, address: r.address ?? null,
          dissent: r.dissent ?? null,
          basis: r.basis ?? null, model: r.model ?? model,
        }) + "\n");
      } catch (e) { console.error(`[void-loop] log append failed: ${e.message}`); }
    }
  };
  const logDone = (entry) => {
    if (!logFile) return;
    try { fs.appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), seq: ++seq, schema: "VoidLog@1", model, ...entry }) + "\n"); }
    catch (e) { console.error(`[void-loop] log append failed: ${e.message}`); }
  };

  // THE MACHINE'S READING OF THE WHOLE CODE BASE: every file, the
  // task-located file first, then the field's own order. Stub-free files are
  // skipped by the advance loop, but they stay in `order` — a carried body
  // the whole suite later implicates lives in one of them, and the reopen
  // path must be able to point at it.
  const readUnits = (rel) => { try { return detectVoidUnits(fs.readFileSync(path.join(root, rel), "utf8"), rel); } catch { return []; } };
  const hasOpenStub = (rel) => readUnits(rel).some((u) => u.isStub);
  const order = [...fileList];
  if (locatedFile && order[0] !== locatedFile) {
    const idx = order.indexOf(locatedFile);
    if (idx > 0) { order.splice(idx, 1); order.unshift(locatedFile); }
  }
  let cursor = 0;
  let reopenedTarget = null; // a carried body the whole suite implicates — consumed directly next round
  const walledTargets = new Map(); // file → names; homonyms in another file are different units
  const currentFile = () => (order.length ? order[cursor] : null);
  const historyHere = () => rounds.filter((r) => r.file === currentFile());
  // REOPEN: a carried body the whole suite now implicates — no stub remains,
  // the test is red and NAMES a unit. Scan every file for that unit and
  // return it for body-correction (a direct traceback frame beats a mention).
  const reopenImplicated = (output) => {
    for (const frame of [true, false]) {
      for (let i = 0; i < order.length; i += 1) {
        for (const u of readUnits(order[i])) {
          const hit = frame ? namedInTraceback(output, u.name) : namedInOutput(output, u.name);
          if (hit) return { fileIdx: i, target: u };
        }
      }
    }
    return null;
  };
  const nextStubFile = () => {
    for (let k = 1; k <= order.length; k += 1) {
      const idx = (cursor + k) % order.length;
      if (idx !== cursor && hasOpenStub(order[idx])) return idx;
    }
    return null;
  };
  const runWholeSuite = () => {
    const test = runTestCommand(testCommand, root, testTimeoutMs);
    finalTestOutput = test.output;
    return test;
  };

  for (let round = 1; round <= maxRounds; round += 1) {
    // ADVANCE: a file with no open stub yields to the next stub-bearing file
    // — UNLESS a reopen is pending (its file may hold no open stub; the
    // reopen IS the void, and it is consumed below before any advance).
    while (currentFile() && !hasOpenStub(currentFile()) && !reopenedTarget) {
      const next = nextStubFile();
      if (next === null) {
        const test = runWholeSuite();
        if (test.exitCode === 0) {
          push({ round, file: currentFile(), action: "EVA", target: null, by: "no-void", verdict: "green", testExitCode: 0 });
          logDone({ action: "done", done: true, verdict: "green" });
    return { done: true, rounds, finalTestOutput: test.output };
        }
        // NO STUB REMAINS, TEST RED: the failure names a unit — a CARRIED
        // body the whole suite now implicates (masked while another stub was
        // open). Reopen it for body-correction instead of declaring the void
        // unlocatable (the falsifying control of the void-chasing rule).
        const reopened = reopenImplicated(test.output);
        if (reopened) {
          push({ round, file: currentFile(), move: `reopen: ${order[reopened.fileIdx]}:${reopened.target.name} — a carried body the whole suite now implicates`, target: reopened.target.name, by: "failure-named-reopen" });
          cursor = reopened.fileIdx;
          reopenedTarget = reopened.target;
          lastTestFailure = test.output;
          lastNote = null;
          continue;
        }
        push({ round, file: currentFile(), action: "EVA", target: null, by: "no-void", verdict: "red", testExitCode: test.exitCode });
        logDone({ action: "done", done: false, verdict: "void_unlocatable" });
    return { done: false, rounds, finalTestOutput: test.output, gap: { kind: "void_unlocatable", reason: "no stub remains in the code base and the failing test names no unit — the void cannot be located, not filled" } };
      }
      push({ round, move: `advance: ${currentFile()} holds no open stub — moving to ${order[next]}`, file: currentFile() });
      cursor = next;
    }
    if (!currentFile()) {
      const test = runWholeSuite();
      if (test.exitCode === 0) {
        logDone({ action: "done", done: true, verdict: "green" });
        return { done: true, rounds, finalTestOutput: test.output };
      }
      logDone({ action: "done", done: false, verdict: "no_stubs" });
    return { done: false, rounds, finalTestOutput: test.output, gap: { kind: "no_stubs", reason: "no stub-bearing files in the code base" } };
    }
    const units = readUnits(currentFile());
    // A REOPEN lands its unit directly (the gate cannot name a non-stub
    // unit with no valid verdict — the reopen IS the test's own voice).
    let target = null;
    let by = null;
    let decision = null;
    if (reopenedTarget) {
      target = reopenedTarget;
      by = "failure-named-reopen";
      decision = { basis: `reopen: ${target.name} — a carried body the whole suite now implicates`, ok: true, tied: false };
      reopenedTarget = null;
    } else {
      // THE ARROW-OF-TIME GATE, riding Kelsen's validity-window precedence
      // (arrow-gate.js), over THIS FILE's own record: the next void is chosen
      // from the PAST only, and only from verdicts still VALID for the present.
      decision = arrowGate({ units, history: historyHere(), skip: walledTargets.get(currentFile()) ?? new Set() });
      target = decision.target;
      by = decision.by;
    }
    const openStubs = units.filter((u) => u.isStub);
    // HUNT-FIRST EXHAUSTED — a unit (a stub OR a reopened carried body) that
    // has failed HUNT_EXHAUST_LIMIT consecutive real draws is a wall: the
    // chase MOVES to the next stub-bearing file, and only with no other
    // file's void open does the wall go TERMINAL (disclosed, never a budget
    // burn). The walled unit is SKIPPED by the gate thereafter, so one hard
    // stub can never block its file's siblings (2026-10-02, the add_episodes
    // grind).
    if (target && consecutiveReverts(historyHere(), target.name) >= HUNT_EXHAUST_LIMIT) {
      if (!walledTargets.has(currentFile())) walledTargets.set(currentFile(), new Set());
      walledTargets.get(currentFile()).add(target.name);
      const next = nextStubFile();
      if (next !== null) {
        push({ round, file: currentFile(), move: `hunt-wall: ${target.name} (${consecutiveReverts(historyHere(), target.name)} consecutive reverts) — walled, moving to ${order[next]}`, target: target.name, basis: decision.basis });
        cursor = next;
        continue;
      }
      const consec = consecutiveReverts(historyHere(), target.name);
      push({ round, file: currentFile(), target: target.name, by, action: "EVA", verdict: "hunt_exhausted", gap: { kind: "hunt_exhausted", reason: `${target.name} failed ${consec} consecutive real draws — the redraw is the ant-loop wall; the hunt is exhausted, the void stays open and disclosed` }, basis: decision.basis });
      return { done: false, rounds, finalTestOutput, gap: { kind: "hunt_exhausted", reason: `${currentFile()}:${target.name} — ${consec} consecutive reverted draws; HUNT-FIRST exhausted across the code base, the void is left open and disclosed` } };
    }
    if (!target) {
      const next = order.findIndex((rel, idx) => idx !== cursor && readUnits(rel).some((u) => u.isStub && !walledTargets.get(rel)?.has(u.name)));
      if (next >= 0) { cursor = next; continue; }
      return { done: false, rounds, finalTestOutput, gap: { kind: "hunt_exhausted", reason: "every remaining void is walled; no draw is justified" } };
    }

    // THE HUNT MICRO-LOOP (model-last, 2026-10-02): resolve this void from
    // the FIELD (workspace + hunt roots, scanned in parallel) and the WEB
    // (liveWeb) BEFORE the mouth draws — a same-named implementation is
    // snipped by address, the swarm gates it (literal + structural ants),
    // and the REAL test judges. The model draws ONLY the irreducible residue
    // no candidate held — "the local model is never the hangup."
    {
      const abs = path.join(root, currentFile());
      const fileText = fs.readFileSync(abs, "utf8");
      // THE BOX (penelope's law: an a priori unit is COMPUTED, never drawn —
      // operator direction 2026-10-02: we don't get extra points for writing
      // it all ourselves). A mechanical shape is computed by the machine, no
      // model; the real test judges; a failed computation falls to the hunt
      // and then the mouth.
      const boxBody = computeBody(target);
      if (boxBody) {
        const patch = buildVoidPatch(target, boxBody);
        if (patch.ok) {
          const ops = readOps([{ find: patch.find, add: patch.add }]);
          const applied = ops ? applyOps(fileText, ops) : null;
          if (applied?.ok && !precheckSyntax(currentFile(), applied.code).gap) {
            fs.writeFileSync(abs, applied.code);
            const test = runTestCommand(testCommand, root, testTimeoutMs);
            finalTestOutput = test.output;
            if (test.exitCode === 0) {
              push({ round, file: currentFile(), action: "BOX", target: target.name, by: "box", mode: patch.mode, applied: true, reverted: false, testExitCode: 0, testOutput: test.output, model: "box", basis: `the box computed this mechanical shape — no model drew` });
              logDone({ action: "done", done: true, verdict: "green", source: "box", model: "box" });
              return { done: true, rounds, finalTestOutput: test.output };
            }
            // THE WHOLE SUITE IS NOT A PER-UNIT VERDICT: a red suite that does
            // NOT name this unit carries the box's computation (it is
            // another stub's failure, not this one's); only a suite that
            // names it reverts and falls to the model.
            if (!new RegExp(`\\b${escapeRe(target.name)}\\b`).test(test.output)) {
              push({ round, file: currentFile(), action: "BOX", target: target.name, by: "box", mode: patch.mode, applied: true, reverted: false, carried: true, testExitCode: test.exitCode, model: "box", basis: `the box computed this mechanical shape — carried (the suite's failure is another unit's)` });
              continue; // the box resolved this unit — the round ends, the model never draws it
            } else {
              fs.writeFileSync(abs, fileText);
              push({ round, file: currentFile(), action: "BOX", target: target.name, by: "box", applied: true, reverted: true, testExitCode: test.exitCode, model: "box", basis: `the box's computation failed the real test — the mouth draws the residue` });
            }
          }
        }
      }
      const candidates = await huntCandidates({ unit: target, workspace: root, locatedFile: currentFile(), huntRoots, web: huntWeb });
      for (const cand of candidates) {
        let body = extractBody(cand.code, target.name);
        if (!body) {
          // PROVENANCE: every hunt candidate is on the record, rejected or
          // not — nobody can say the machine doesn't know where it looked.
          push({ round, file: currentFile(), action: "HUNT_ATTEMPT", target: target.name, by: "hunt", source: cand.source, address: cand.address, model: "hunt", verdict: "rejected", basis: `no body extractable from ${cand.address}` });
          continue;
        }
        // a hunted implementation's params may be named differently than the
        // void's real signature — reconcile by position, word-boundary (the
        // real test judges a mismatch)
        body = reconcileParams(body, cand.code, target.declText);
        const patch = buildVoidPatch(target, body);
        if (!patch.ok) {
          push({ round, file: currentFile(), action: "HUNT_ATTEMPT", target: target.name, by: "hunt", source: cand.source, address: cand.address, model: "hunt", verdict: "rejected", basis: `patch failed: ${patch.gap?.reason ?? "unknown"}` });
          continue;
        }
        const ops = readOps([{ find: patch.find, add: patch.add }]);
        const applied = ops ? applyOps(fileText, ops) : null;
        if (!applied?.ok) {
          push({ round, file: currentFile(), action: "HUNT_ATTEMPT", target: target.name, by: "hunt", source: cand.source, address: cand.address, model: "hunt", verdict: "rejected", basis: `apply failed: ${applied?.gap?.reason ?? "unknown"}` });
          continue;
        }
        const swarm = await swarmProbe({ patchedCode: applied.code, fileName: currentFile(), unit: target, syntaxGate: syntaxGateFor(currentFile()) });
        // ONLY the LITERAL ant (the file's own syntax engine) hard-gates — a
        // non-parsing candidate is clearly bad. The STRUCTURAL and ADVERSARIAL
        // ants are disclosed dissent (a real implementation can false-positive
        // the undefined-name scan on annotation syntax, measured 2026-10-02);
        // the REAL test is the final judge, never the swarm.
        if (swarm.dissent.some((a) => a.ant === "literal")) {
          push({ round, file: currentFile(), action: "HUNT_ATTEMPT", target: target.name, by: "hunt", source: cand.source, address: cand.address, model: "hunt", verdict: "swarm_rejected", basis: `does not parse: ${swarm.dissent.find((a) => a.ant === "literal")?.note ?? ""}`, dissent: swarm.dissent.map((a) => `${a.ant}:${a.note ?? ""}`) });
          continue;
        }
        // the swarm's non-fatal dissent rides the record — full provenance
        const huntDissent = swarm.dissent.length ? swarm.dissent.map((a) => `${a.ant}:${a.note ?? ""}`) : null;
        fs.writeFileSync(abs, applied.code);
        const test = runTestCommand(testCommand, root, testTimeoutMs);
        finalTestOutput = test.output;
        if (test.exitCode === 0) {
          push({ round, file: currentFile(), action: "HUNT", target: target.name, by: "hunt", mode: patch.mode, applied: true, reverted: false, syntax: "hunt", testExitCode: 0, testOutput: test.output, source: cand.source, address: cand.address, model: "hunt", dissent: huntDissent, basis: `hunt snipped from ${cand.address} — the model never drew` });
          logDone({ action: "done", done: true, verdict: "green", source: "hunt", address: cand.address, model: "hunt" });
          return { done: true, rounds, finalTestOutput: test.output };
        }
        fs.writeFileSync(abs, fileText); // this candidate failed — revert, try the next
        push({ round, file: currentFile(), action: "HUNT", target: target.name, by: "hunt", mode: patch.mode, applied: true, reverted: true, syntax: "hunt", testExitCode: test.exitCode, source: cand.source, address: cand.address, model: "hunt", dissent: huntDissent, basis: `hunt snipped from ${cand.address} failed the real test` });
      }
    }

    // THE SPIRAL: up to `draws` attempts at this ONE void in a single round.
    // A draw that returns no body, fails the syntax gate, or is implicated by
    // the real test sharpens the note and re-draws within the same round —
    // within-round learning with no extra targeting rounds; the first green
    // wins; a carried draw (the failure names another unit) ends the round.
    for (let draw = 1; draw <= draws; draw += 1) {
      const kelsen = draws === 1 && round === 1 ? null
        : Math.min(0.95, Math.max(0.1, 0.9 - (draw - 1) * (draws > 1 ? 0.7 / (draws - 1) : 0) - 0.05 * (round - 1)));
      const fragment = [
        task,
        "",
        `You are filling one function in ${currentFile()}. Its real signature and docstring are already in the file:`,
        ...target.declText.split("\n").map((l) => (l === target.stubLine ? "" : l)),
        ...(contextFold ? [renderVoidNeighbourhood(root, fileList, target.name)] : []).filter(Boolean),
        lastTestFailure ? `The real test failed last round with:\n${lastTestFailure.slice(0, 400)}` : null,
        lastNote && lastNote !== lastTestFailure ? `Last round note: ${lastNote.slice(0, 300)}` : null,
        "Complete the function's body, continuing the indentation:",
        target.indent,
      ].filter((l) => l !== null).join("\n");

      const turned = await turn({
        sessionId, userId, model, task: fragment, chatHistory: [], workspace: root, mode: "chat", drawOnly: true, caller, signal,
        ...(kelsen === null ? null : { kelsen: kelsenFor ?? kelsen }),
      });
      const body = extractBody(turned.text, target.name);
      if (!body) {
        push({ round, file: currentFile(), draw, kelsen, target: target.name, by, action: "DEF", gap: { kind: "empty_draw", reason: "the mouth returned no body bytes" }, raw: String(turned.text ?? "").slice(0, 300), basis: decision.basis });
        lastNote = `no body was drawn for ${target.name}; it remains open`;
        continue;
      }
      // THE ARROW RUNNING IN PLACE: a body that already ran the real test and
      // failed this run is a repeat — named on the round and folded into the
      // next note, never a prohibition (retry stays possible, the silence ends).
      const bodyHash = bodyHashOf(body);
      const cyclePrior = arrowCycle({ history: historyHere(), target: target.name, bodyHash });
      const cycleNote = cyclePrior
        ? `Mechanical note (repeat): this exact body already ran the real test and failed this session (round ${cyclePrior}) — the arrow is running in place; the bytes you keep reusing are not the problem, the returned VALUE is. Change the bytes.`
        : null;
      const patch = buildVoidPatch(target, body);
      if (!patch.ok) { push({ round, file: currentFile(), draw, kelsen, target: target.name, by, action: "DEF", gap: patch.gap, basis: decision.basis }); continue; }

      const abs = path.join(root, currentFile());
      const before = fs.readFileSync(abs, "utf8");
      const ops = readOps([{ find: patch.find, add: patch.add }]);
      const applied = ops ? applyOps(before, ops) : { ok: false, gap: { kind: "malformed", reason: "find/add did not resolve to a real op" } };
      if (!applied.ok) {
        push({ round, file: currentFile(), draw, kelsen, target: target.name, by, action: "DEF", gap: applied.gap, basis: decision.basis });
        lastNote = applied.gap.reason;
        continue;
      }
      const gate = precheckSyntax(currentFile(), applied.code);
      if (gate.gap) {
        fs.writeFileSync(abs, before);
        push({ round, file: currentFile(), draw, kelsen, target: target.name, by, action: "DEF", applied: false, reverted: false, gap: gate.gap, raw: String(turned.text ?? "").slice(0, 400), patched: applied.code.slice(0, 700), basis: decision.basis });
        lastNote = gate.gap.reason;
        continue;
      }
      fs.writeFileSync(abs, applied.code);
      const test = runTestCommand(testCommand, root, testTimeoutMs);
      finalTestOutput = test.output;
      const won = test.exitCode === 0;
      // THE WHOLE SUITE IS NOT A PER-UNIT VERDICT: with several stubs the
      // test fails until every one is filled. So the test's VOICE decides
      // what the failure is evidence about — the unit it NAMES. A failure
      // that implicates the just-edited unit reverts it (never left broken
      // on disk) and re-chases it IN THIS ROUND (the spiral); a failure that
      // implicates another unit CARRIES this change (it was not the named
      // problem) and ends the round — the named one is chased next. Only the
      // final green proves every carried change.
      const implicated = won ? null : new RegExp(`\\b${escapeRe(target.name)}\\b`).test(test.output);
      if (won) {
        push({ round, file: currentFile(), draw, kelsen, target: target.name, by, action: "DEF", mode: patch.mode, applied: true, reverted: false, syntax: gate.syntax, testExitCode: 0, testOutput: test.output, bodyHash, basis: decision.basis, ...(cyclePrior ? { cycle: cyclePrior } : null) });
        logDone({ action: "done", done: true, verdict: "green" });
    return { done: true, rounds, finalTestOutput: test.output };
      }
      if (implicated) {
        fs.writeFileSync(abs, before); // this unit IS the failure — its change never stays
        push({ round, file: currentFile(), draw, kelsen, target: target.name, by, action: "DEF", mode: patch.mode, applied: true, reverted: true, syntax: gate.syntax, testExitCode: test.exitCode, testOutput: test.output, bodyHash, basis: decision.basis, ...(cyclePrior ? { cycle: cyclePrior } : null) });
        lastTestFailure = test.output;
        lastNote = cycleNote;
        continue; // sharpen and re-draw the same void, within this round
      }
      // the failure is another unit's — carry this change, chase what the
      // test named (disclosed on the round: carried, not proven alone)
      push({ round, file: currentFile(), draw, kelsen, target: target.name, by, action: "DEF", mode: patch.mode, applied: true, reverted: false, carried: true, syntax: gate.syntax, testExitCode: test.exitCode, testOutput: test.output, bodyHash, basis: decision.basis, ...(cyclePrior ? { cycle: cyclePrior } : null) });
      lastTestFailure = test.output;
      lastNote = cycleNote;
      break; // this void is done for now — the named unit is chased next round
    }
  }
  logDone({ action: "done", done: false, verdict: "exhausted" });
    return { done: false, rounds, finalTestOutput };
}

// cli/reason.mjs lives two directories up from this file (native/the-fold/
// -> the repo root -> cli/reason.mjs), resolved once, never re-derived.
const REASON_MJS_PATH = fileURLToPath(new URL("../../cli/reason.mjs", import.meta.url));

/** A MECHANICAL claim describing a patch's own byte-level change — never
 * the coding model's own words, never JSON asked of it (S1/S2: the model
 * proposes find/add bytes; this function, not the model, states the claim
 * reason.mjs checks). force:"default" testimony only: this gate exists to
 * make requireReasoning callable at all, not to declare functional/acyclic
 * properties about arbitrary proposed code. */
function reasoningClaimFor(absPath, find, add) {
  const truncate = (s) => (String(s ?? "").length > 200 ? `${String(s).slice(0, 200)}…` : String(s ?? ""));
  return {
    claims: [{
      id: "patch1",
      ground: absPath,
      rel: "replaces",
      roles: { ARG0: truncate(find), ARG1: truncate(add) },
      polarity: "+",
      force: "default",
      said: `Mechanical patch proposed by the coding loop: replaces the FIND bytes with the ADD bytes at ${absPath}.`,
    }],
    declare: {},
    inferences: [], universals: [], equations: [], order: {},
    // `text` asks reason.mjs to READ natural-language reasoning. This is a
    // structured, mechanical patch proposal, not an essay for that reader.
    // Coherence is checked here; applyOps, syntax and the real test prove bytes.
    description: "Mechanically-generated proposal for requireReasoning; byte applicability and behavior are checked separately.",
  };
}

/** verifyPatchReasoning(absPath, find, add) -> { ok, output }. Runs the
 * REAL cli/reason.mjs (never re-implemented, never mocked) against a
 * mechanical claim, via stdin, exactly as a human operator would from the
 * command line. FAILS CLOSED: any nonzero exit OR a crash of reason.mjs
 * itself is "not verified" — an autonomous caller (requireReasoning:true)
 * gets no benefit of the doubt a human wouldn't get either. */
function verifyPatchReasoning(absPath, find, add) {
  try {
    execFileSync(process.execPath, [REASON_MJS_PATH, "--compact"], {
      input: JSON.stringify(reasoningClaimFor(absPath, find, add)),
      encoding: "utf8",
      timeout: 20000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true, output: "" };
  } catch (err) {
    const output = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim() || String(err.message ?? err);
    return { ok: false, output: output.slice(0, 500) };
  }
}

/** True when the immediately preceding round/draw entry already recorded
 * this exact gap kind (and, when path is given, the same path) — the
 * mechanical signal that a repeat is happening, never a guess at intent.
 * Deliberately narrow: wired only at gap sites where repeating the SAME
 * kind (with the same identifying path) is unambiguously non-informative
 * regardless of model quality (already_read, invalid_path) — never at
 * open-ended kinds like syntax_error, where the same kind can still cover
 * genuinely different underlying attempts (measured 2026-09-29: 5
 * consecutive syntax_error gaps on one workspace were 5 different real
 * bugs across 5 different proposed bytes; short-circuiting on kind alone
 * there would have wrongly killed a converging small model). */
function repeatsLastGap(rounds, kind, path = undefined) {
  const last = rounds[rounds.length - 1];
  if (!last?.gap || last.gap.kind !== kind) return false;
  return path === undefined || last.path === path;
}

/** The real content of every file read so far this run, rendered for the
 * prompt — real bytes, requested on demand, never re-summarized or
 * paraphrased between rounds. */
function renderReadFiles(reads) {
  if (!reads.size) return "";
  const blocks = [...reads.entries()].map(([rel, content]) => `--- ${rel} (read on request) ---\n${content}`);
  return `\n\nFiles you asked to read:\n\n${blocks.join("\n\n")}`;
}

/**
 * renderTerritoryGround(territory, task) — the whole-workspace SEG, done
 * BEFORE the model (folder-index + organs/territory.js, no model): the task's
 * words are resolved against the real index of the whole code base, the
 * files they actually live in are named, the top one's real bytes are shown,
 * and words the workspace never says are named as facts. Gary-safe: this is
 * model-facing text, so it names no instrument parts (no operator, no
 * territory id, no apparatus) — only located files, real bytes, absences.
 * Empty string when there is no territory or the ask fails (fail-open).
 */
function renderTerritoryGround(territory, task) {
  if (!territory?.index) return "";
  try {
    const d = territory.index;
    const a = ask(d, task, 8, 10);
    const hits = a.hits.slice(0, 3);
    if (!hits.length) {
      const absent = a.absent.slice(0, 6).join(", ") || "none of your task's words";
      return `The whole workspace was read and indexed for your task, but no file's content carries your task's words (${absent}). The real files are still listed below — read whichever you need.`;
    }
    const lines = [
      `The whole workspace was read and indexed for your task — these are the files whose real content your task's words resolve to (${a.matched} of ${d.n} files match):`,
      ...hits.map((h) => `  ${h.name}`),
    ];
    if (a.absent.length) lines.push(`The workspace never says: ${a.absent.slice(0, 6).join(", ")}.`);
    const top = hits[0];
    if (top) {
      lines.push(`You are editing: ${top.name} — propose your edit with no PATH line (the file is already located for you; an explicit PATH is only for another file you read).`);
      const doc = readDocument(territory, top.n, 12000);
      if (doc) {
        lines.push(`--- ${doc.name} (real bytes, the top located file) ---`);
        lines.push(doc.text + (doc.truncated ? "\n[...truncated...]" : ""));
      }
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

/** locatedFileFor(territory, task) -> the file the task's own words
 * resolve to, or null. The machine's SEG answer: the model is aimed here and
 * never names a path (parseProposal's `impliedPath`). SOURCE-FIRST: the
 * task's expectations often quote the test file verbatim, so among the hits
 * the top SOURCE file is preferred over a test or doc — the edit must land in
 * the implementation, never in the test that asserts it (measured live
 * 2026-10-01: the WORKDAY task ranked test/formula.test.cjs above
 * public/formula.js because the expected dates appear in the assertions). */
function locatedFileFor(territory, task) {
  if (!territory?.index) return null;
  try {
    const a = ask(territory.index, task, 8, 10);
    const isSource = (name) => {
      const n = String(name ?? "");
      if (/\.(md|markdown|txt|json|jsonl|log|html|css)$/i.test(n)) return false;
      if (/(^|\/)(test|tests|spec|docs?|__tests__)\//i.test(n)) return false;
      if (/\.(test|spec)\./i.test(n)) return false;
      if (/(^|\/)(check|test|tests)(?:[_.-]|\.)/i.test(n)) return false;
      return true;
    };
    const source = a.hits.find((h) => isSource(h.name));
    return (source ?? a.hits[0])?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Run the loop. Returns { done, rounds, finalTestOutput }. Never throws for
 * an ordinary failed attempt — only for a malformed call (no workspace, no
 * testCommand).
 */
export async function runCodeLoop({ sessionId, userId = null, model, task, workspace, testCommand, maxRounds = DEFAULT_MAX_ROUNDS, testTimeoutMs = DEFAULT_TEST_TIMEOUT_MS, caller = null, signal = null, candidates = 1, turn = defaultTurn, contextMode = "raw", contextFold = false, requireReasoning = false, territory = null, logFile = null, huntRoots = [], huntWeb = false, fileList = null }) {
  if (!workspace || !fs.existsSync(workspace)) throw new Error("workspace must be an existing directory");
  if (!testCommand || typeof testCommand !== "string") throw new Error("testCommand must be a declared, real command string");

  const root = path.resolve(workspace);
  const files = listFiles(root);
  const rounds = [];
  const reads = new Map(); // real content of every file read on request so far
  let lastNote = null; // what actually happened last round, stated plainly — never a fabricated "it failed" when nothing was even tried
  let finalTestOutput = null;
  // The machine's located file (territory SEG, once): the model edits it
  // path-less — no PATH line to hallucinate (2026-10-01: a 2b mouth echoed
  // the worked example's fake `solution.py` instead of the real listing).
  let locatedFile = locatedFileFor(territory, task);
  // VOID-CHASING MODE (2026-10-02): engages whenever the CODE BASE holds a
  // stub-bearing file — the territory-located file only names the START.
  // FIX (measured live): the chase once depended on territory locating a
  // file; when it failed to, the loop fell back to the FIND/ADD path and
  // burned its whole budget on unlocated/unparsed gaps. The void loop finds
  // its own voids from the real files — territory never gates it.
  const scanFiles = fileList && fileList.length ? fileList : files;
  const stubFiles = [];
  for (const rel of scanFiles) {
    try {
      if (detectVoidUnits(fs.readFileSync(path.join(root, rel), "utf8"), rel).some((u) => u.isStub)) stubFiles.push(rel);
    } catch { /* an unreadable file is not a void */ }
  }
  // THE MECHANICAL PREFLIGHT (2026-10-03, measured: a frontier mouth burned
  // rounds on a JS task whose test imported a missing export — no stub exists
  // anywhere, so the void loop chased the wrong file). The declared test runs
  // ONCE, before any draw. Green → done, zero model calls (the test is the
  // caller's own definition of satisfaction). Red → the failure's own words
  // are parsed mechanically for a unit the code base must provide (Node ESM:
  // "does not provide an export named 'X'"; Python: "cannot import name 'X'
  // from 'Y'"); when located, the machine names that file and hands the model
  // only the function to author — the wrong-file and fenced-read failures of
  // a frontier mouth cannot consume a round, because the file is already
  // located and named. The locate is pure text; no model, no guess.
  const preflight = runTestCommand(testCommand, root, testTimeoutMs);
  finalTestOutput = preflight.output;
  if (preflight.exitCode === 0) {
    rounds.push({ round: 0, action: "EVA", verdict: "green", by: "preflight", testExitCode: 0, basis: "the declared test already passes — nothing to fill, zero draws" });
    return { done: true, rounds, finalTestOutput: preflight.output };
  }
  let missingUnit = locateMissingUnit(preflight.output, { root, files: scanFiles });
  if (missingUnit) locatedFile = missingUnit.file;
  if ((stubFiles.length || logFile) && !missingUnit) {
    // A LOGGED build (logFile set) ALWAYS rides the void loop: it is the
    // fold-of-the-log contract — the loop reopens a carried body the whole
    // suite later implicates (no stub remains, the test names it), which the
    // stub-gated path could never reach.
    const startFile = locatedFile && stubFiles.includes(locatedFile) ? locatedFile : (stubFiles[0] ?? files[0]);
    // the WHOLE code base rides in: the loop starts at the located file (or
    // the first stub file) and advances across every stub-bearing file
    return runVoidLoop({ sessionId, userId, model, task, workspace: root, locatedFile: startFile, files: scanFiles, testCommand, maxRounds, testTimeoutMs, caller, signal, turn, logFile, huntRoots, huntWeb, contextFold, ...(candidates > 1 ? { candidates } : {}) });
  }
  // Predictive processing, session-scoped: the loop predicts P(green)
  // from (op, language, syntax) BEFORE spending each test round, then the
  // real exit code disposes and the error updates the tally for the next
  // round. Starts empty (maximal uncertainty); pre-test refusals (gaps,
  // keyword, syntax) produce no outcome and teach nothing — only a real
  // verdict updates the prior. Cross-run persistence: named unattempted.
  let forecastPrior = emptyForecast();

  // Generative language knowledge, served once in round 1 (bounded,
  // disclosed — later rounds carry only failure-shaped nudges). Each
  // listed file is tagged with its detected language (extension map only;
  // a stranger is untagged, never misdiagnosed), and every language
  // present with a received prior gets its scaffolding block: the
  // declaration shapes to anchor on and the closed class that can never
  // be a name. Scaffolding only — the physics below (exact bytes, real
  // tests) still validates every byte the mouth emits.
  const fileLangs = new Map(files.map((f) => [f, detectCodeLanguage(f)]));
  const listedFiles = files.map((f) => (fileLangs.get(f) ? `${f} (${fileLangs.get(f)})` : f));
  const briefs = [...new Set([...fileLangs.values()].filter(Boolean))]
    .map((lang) => generationBriefFor(lang))
    .filter(Boolean)
    .join("\n\n");
  const languageBlock = briefs
    ? `\n\nLanguage scaffolding (received keyword lists; shapes illustrative — exact file bytes still rule):\n\n${briefs}`
    : "";

  // Tournament: draws per round (default 1 = exactly as before). A small
  // mouth repeats itself across rounds (measured: the same wrong body 3×
  // on Basic/11 and 14), so each round draws up to K proposals, testing
  // each with revert between, keeping the first green. Failed draws
  // update lastNote immediately, so later draws in the SAME round already
  // see earlier failures — within-round learning with no extra rounds.
  // (Body kept at round-level indent; it now runs inside the draw loop.)
  const draws = Math.max(1, Math.floor(candidates ?? 1));
  // Attractor-repeat witness (measured: Basic/15 cycled identical bodies
  // 78 times across 34 runs — a body that ran the real test and failed
  // is re-sent unchanged, and no note ever names the cycle). Tracks
  // normalized ADD bytes that were APPLIED and FAILED; re-proposing the
  // same bytes later gets a mechanical note ("this exact code already
  // failed"), not a prohibition — the mouth may still retry, but the
  // cycle is no longer silent.
  const testedBodies = new Map(); // norm(add) -> { round, draw }
  for (let round = 1; round <= maxRounds; round += 1) {
   for (let draw = 1; draw <= draws; draw += 1) {
    // Annealing: draw 1 exploits (kelsen 0.9 → temp ≈ 0.18, the standing
    // default), later draws explore (kelsen → 0.2, temp ≈ 0.74). Measured
    // need: with candidates=3 at flat temperature the mouth cycled 2
    // attractors for 9 straight draws (Basic/09: upper/capitalize only;
    // Basic/14: range(arg0+1) only) — the right answer was never IN the
    // cold distribution. Temperature is a sampler parameter, so the
    // schedule is mechanical, and each draw's kelsen rides on its round
    // record beside the forecast. Slight per-round decay on top.
    const kelsen = draws === 1 && round === 1 ? null
      : Math.min(0.95, Math.max(0.1, 0.9 - (draw - 1) * (draws > 1 ? 0.7 / (draws - 1) : 0) - 0.05 * (round - 1)));
    const firstSight = round === 1 && draw === 1;
    const effectiveContext = locatedFile ? "fold" : contextMode;
    // Gary: as little as possible. When the machine has located the file,
    // the fold covers ONLY that file's declarations (the slot view), never
    // the whole workspace — a 2b mouth degraded to echoing its own name
    // when handed the full 63-file fold (measured live 2026-10-01). A
    // MISSING-UNIT locate shows the target file's real bytes instead (the
    // task is to ADD a declaration — the anchor must be exact).
    const foldFiles = locatedFile ? [locatedFile] : files;
    const baseContent = missingUnit && locatedFile
      ? renderFiles(root, [locatedFile])
      : (effectiveContext === "fold" ? renderFoldedContext(root, foldFiles, task) : renderFiles(root, files));
    const ground = firstSight ? renderTerritoryGround(territory, task) : "";
    const roundContent =
      firstSight
        ? (ground ? `${ground}\n\n${baseContent}` : baseContent)
        : `${baseContent}${renderReadFiles(reads)}`;
    const missingNote = missingUnit
      ? `\n\nThe declared test fails because this file does not provide the unit the test imports: ${missingUnit.basis}. Add that export to this file; the test's own import names it exactly.`
      : "";
    const roundTask =
      firstSight
        ? `${task}${missingNote}\n\nFiles in the workspace (${root}):\n${listedFiles.join("\n")}${languageBlock}\n\n${locatedFile ? LOCATED_PROPOSAL_FORMAT : PROPOSAL_FORMAT}`
        : `${task}${missingNote}\n\n${lastNote}\n\n${locatedFile ? LOCATED_PROPOSAL_FORMAT : PROPOSAL_FORMAT}`;

    // a draw-only turn: the core's clearance and gate, not its prose
    // machinery (no encyclopedia enrichment per round, no holograph typing
    // of patch text as prose)
    const turned = await turn({ sessionId, userId, model, task: roundTask, chatHistory: [{ role: "user", content: roundContent }], workspace: root, mode: "chat", drawOnly: true, caller, signal, ...(kelsen === null ? null : { kelsen }) });
    const proposal = parseProposal(turned.text, { impliedPath: locatedFile });
    if (!proposal.ok) {
      // A cut stream is not a model stop: kind stays unparsed_proposal and
      // the round gains a sibling witness (pure parseProposal untouched).
      const cut = turned.stream?.doneSeen === false ? { doneReason: turned.stream.doneReason ?? null, streamErr: turned.stream.streamErr ?? null, leftoverChars: turned.stream.leftoverChars ?? 0, tailParsedAs: turned.stream.tailParsedAs ?? null } : null;
      rounds.push({ round, draw, kelsen, gap: proposal.gap, raw: turned.text, ...(cut ? { streamCut: cut } : {}) });
      lastNote = cut
        ? `Your last reply was cut off mid-stream (no done frame${cut.doneReason ? `: ${cut.doneReason}` : ""}${cut.streamErr ? `; server error: ${cut.streamErr}` : ""}${cut.leftoverChars ? `; ${cut.leftoverChars} chars stranded` : ""}) — not a complete answer. Resend the full action in exactly one of the two formats below.`
        : proposal.gap.kind === "unexpected_path" || proposal.gap.kind === "unexpected_read"
          ? `No PATH line and no read. The file you are editing is ${locatedFile}; its real bytes are above. Emit only <<<FIND>>> (copied byte-for-byte from those bytes) and <<<ADD>>> — nothing else.`
          : `Your last reply did not follow the required format (${proposal.gap.reason}). Use exactly one of the two formats below.`;
      continue;
    }

    // MULTI-READ (2026-10-03): a fenced-read answer may name several files in
    // one round; every one is real-validated and folded into the next round's
    // context — one round trip instead of N. Single-path proposals keep the
    // existing record shape byte-for-byte.
    const readPaths = proposal.action === "SIG" && Array.isArray(proposal.paths) ? proposal.paths : [proposal.path];
    const located = resolveRealFile(root, readPaths[0]);
    if (!located.ok) {
      const stuck = repeatsLastGap(rounds, "invalid_path", readPaths[0]);
      rounds.push({ round, draw, kelsen, action: proposal.action, path: readPaths[0], gap: located.gap });
      if (stuck) return { done: false, rounds, finalTestOutput, stuck: { kind: "invalid_path", reason: `named the same non-existent path ("${readPaths[0]}") twice in a row — continuing would not help without new information` } };
      lastNote = `You named "${readPaths[0]}", which is not a real file in this workspace (${located.gap.reason}). Pick a real path from the listing below.`;
      continue;
    }

    if (proposal.action === "SIG") {
      const fresh = readPaths.filter((p) => !reads.has(p));
      if (!fresh.length) {
        const stuck = repeatsLastGap(rounds, "already_read", readPaths[0]);
        rounds.push({ round, draw, kelsen, action: "SIG", path: readPaths[0], gap: { kind: "already_read", reason: "this file's content was already shown" } });
        if (stuck) return { done: false, rounds, finalTestOutput, stuck: { kind: "already_read", reason: `re-requested the already-shown "${readPaths[0]}" twice in a row — continuing would not help without new information` } };
        lastNote = `You already have "${readPaths[0]}"'s content below — re-reading it won't tell you anything new. Propose a PATCH now, or read a DIFFERENT file.`;
        continue;
      }
      // Nothing is applied, nothing is tested — this round only requests
      // real content for the NEXT round's context.
      const shown = [];
      for (const rel of fresh) {
        const one = rel === readPaths[0] ? located : resolveRealFile(root, rel);
        if (!one.ok) { lastNote = `"${rel}" is not a real file in this workspace (${one.gap.reason}) — it was not read.`; continue; }
        const content = fs.readFileSync(one.resolved, "utf8");
        const truncated = content.length > MAX_READ_CHARS_SHOWN;
        reads.set(rel, content.slice(0, MAX_READ_CHARS_SHOWN) + (truncated ? "\n[...truncated...]" : ""));
        rounds.push({ round, draw, kelsen, action: "SIG", path: rel, truncated });
        shown.push(rel);
      }
      if (!shown.length) continue;
      lastNote = `Here is the real content of ${shown.map((p) => `"${p}"`).join(", ")} you asked to read (below). Now propose a PATCH, or read another file if you still need to.`;
      continue;
    }

    const before = fs.readFileSync(located.resolved, "utf8");
    // Fenced-proposal gate (measured: 32/42 unlocated FINDs carry ```
    // markdown fences — the mouth authors new code where it must copy
    // old bytes). Scoped to detected code languages (markdown's real
    // bytes hold fences; strangers admitted as before). See checkFenced.
    const fenced = checkFenced(proposal.path, proposal.find, proposal.add);
    if (!fenced.ok) {
      rounds.push({ round, draw, kelsen, action: "INS", path: proposal.path, gap: fenced.gap });
      lastNote = `Your proposed patch on "${proposal.path}" did not apply (${fenced.gap.reason}). Nothing was changed on disk.`;
      continue;
    }
    // Propose-time keyword gate (S83 polarity, received CodeKeywordPrior@1):
    // an ADD that binds a hard keyword can never pass tests — refuse before
    // touching disk, with the refused names as evidence. Null prior (unknown
    // language, absent file) admits everything, exactly as before.
    const kwPrior = loadCodeKeywordPrior(detectCodeLanguage(proposal.path));
    const refusedNames = declaresKeyword(proposal.add, proposal.path, keywordSetOf(kwPrior));
    if (refusedNames.length) {
      const gap = { kind: "keyword_declaration", names: refusedNames, reason: `"${refusedNames.join('", "')}" cannot be declared in ${detectCodeLanguage(proposal.path) || "this file"} (received closed class) — nothing was changed on disk` };
      rounds.push({ round, draw, kelsen, action: "INS", path: proposal.path, gap });
      lastNote = `Your proposed patch on "${proposal.path}" did not apply (${gap.reason}). Propose different names, with find text copied exactly from the file.`;
      continue;
    }
    const ops = readOps([{ find: proposal.find, add: proposal.add }]);
    const applied = ops ? applyOps(before, ops) : { ok: false, gap: { kind: "malformed", reason: "find/add did not resolve to a real op" } };
    if (!applied.ok) {
      rounds.push({ round, draw, kelsen, action: "INS", path: proposal.path, gap: applied.gap });
      // Language-shaped remedy note (Thea-usable shape: a witnessed,
      // mechanical fact + the received prior that names it). Only when the
      // proposal's own bytes carry another language's declaration shape;
      // an ordinary unlocated find keeps the existing nudge untouched.
      const mismatch =
        applied.gap?.kind === "unlocated" || applied.gap?.kind === "ambiguous"
          ? mismatchNoteFor({ fileName: proposal.path, find: proposal.find })
          : null;
      // Extent-aware widening: when every occurrence of the find sits
      // inside one declaration, offer its header line (sliced from the
      // file, never composed) as the unique anchor.
      const wider =
        applied.gap?.kind === "ambiguous" && !mismatch
          ? suggestWiderFind(before, proposal.path, proposal.find)
          : null;
      // Whole-file anchor: for an `unlocated` find on a SMALL file, the
      // whole content is an exact unique anchor (a SYN over it always
      // locates) — the escalation small mouths need on stub-sized files
      // (measured: 3× unlocated on a 2-line stub). Fires only when the
      // mismatch and widen notes have nothing to say. Gary-shaped: the
      // note does NOT quote the file (nothing-twice — the listing above
      // already carries it, and quoted bytes are what a starved mouth
      // echoes). It names the move; the bytes stay where they are.
      const whole =
        applied.gap?.kind === "unlocated" && !mismatch
          ? suggestWholeFile(before)
          : null;
      const extra = mismatch ?? (wider ? `Mechanical note: every occurrence of your FIND sits inside \`${wider.find}\` (${wider.basis.split(";")[0]}). Anchor on that declaration line — copied byte-for-byte — to make it unique.` : null) ?? (whole ? `Mechanical note: "${proposal.path}" is a ${whole.find.length}-char file — small enough to anchor whole. Use the entire file content shown above as your FIND (copied byte-for-byte, starting from its first line) and the full new content as ADD.` : null);
      lastNote = `Your proposed patch on "${proposal.path}" did not apply (${applied.gap.reason}). Nothing was changed on disk. Try again with find text copied exactly from the file.${extra ? `\n\n${extra}` : ""}`;
      continue;
    }

    if (requireReasoning) {
      const verify = verifyPatchReasoning(located.resolved, proposal.find, proposal.add);
      if (!verify.ok) {
        rounds.push({ round, draw, kelsen, action: "INS", path: proposal.path, find: proposal.find, add: proposal.add, applied: false, reverted: false, gap: { kind: "reasoning_refused", reason: `the eoreader7 reasoning gate did not pass this patch: ${verify.output}` } });
        lastNote = `Your proposed patch on "${proposal.path}" did not pass the reasoning gate (requireReasoning is on for this run): ${verify.output}\n\nNothing was changed on disk. Reconsider the change.`;
        continue;
      }
    }
    fs.writeFileSync(located.resolved, applied.code);
    const op = ops[0].op;
    // The slot-level operator (Figure grain, bare-metal fold semantics): what
    // the edit is DOING to the code's own declarations — DEF for the common
    // fix-the-slot edit (set a value within the current frame), INS for a born
    // declaration, SEG for a removed one, SYN for a recomposition. Derived
    // from the real declaration diff; null when no declaration is touched.
    // Recorded beside the byte-level op so the round discloses both holonic
    // levels. Purely additive — `op` keeps feeding the forecast prior.
    const figureOp = figureOpFor(before, applied.code, proposal.path);
    // Syntax pre-check (the file's own engine on the patched bytes,
    // never a regex — Python via ast, JavaScript via node --check,
    // TypeScript via tsc only when tsc proves present, never node
    // --check on .ts and never npx/network): patched bytes that don't
    // parse never reach the test command — "doesn't parse" and "parses
    // but fails" finally separate, and no test round is burned on the
    // former. Null (no engine on the box) → proceed untested, recorded
    // on the round, never a silent skip.
    const gate = precheckSyntax(proposal.path, applied.code);
    if (gate.gap) {
      fs.writeFileSync(located.resolved, before); // nothing unparseable is ever left on disk
      rounds.push({ round, draw, kelsen, action: "INS", path: proposal.path, op, figureOp, find: proposal.find, add: proposal.add, applied: false, reverted: false, gap: gate.gap });
      lastNote = `Your proposed patch on "${proposal.path}" ${gate.gap.reason}. Fix the syntax with find text copied exactly from the file.`;
      continue;
    }
    const syntax = gate.syntax;
    // Arity-coverage NOTE (Python only, never a refusal — varlen/overloads
    // make refusal unsafe): the patched file's declared positional capacity
    // beside the max called arity in workspace test-like files (test_*.py,
    // *_test.py, test*.py from the listing above) — the 0-arg stub kept
    // against a 1-arg call, checkable without running tests. Guarded end to
    // end: any failure skips silently-with-record (coverageSkipped on the
    // round), never a crash.
    let arityNote = "";
    let coverageSkipped = false;
    try {
      if (detectCodeLanguage(proposal.path) === "python") {
        const testTexts = [];
        for (const rel of files) {
          if (!rel.endsWith(".py")) continue;
          const base = rel.split("/").pop();
          if (!base.startsWith("test") && !base.endsWith("_test.py")) continue;
          try {
            testTexts.push(fs.readFileSync(path.join(root, rel), "utf8"));
          } catch {
            continue;
          }
        }
        const uncovered = arityCoverage({ codeText: applied.code, fileName: proposal.path, testTexts }).filter((r) => !r.covered);
        if (uncovered.length) {
          arityNote = `Mechanical note (arity coverage, no test run): ${uncovered.map((r) => `\`${r.name}\` declares ${r.declared} positional but tests call it with up to ${r.calledMax}`).join("; ")}.`;
        }
      }
    } catch {
      arityNote = "";
      coverageSkipped = true;
    }
    const test = runTestCommand(testCommand, root, testTimeoutMs);
    // Executed diagnosis (Python only, before the revert below — the
    // file still holds the failed bytes): call the ADD's own declared
    // entry with the test file's literal assert args and report got-vs-
    // want. A bare AssertionError teaches nothing ("it failed"); the
    // contrast (`got 'Ada.Lovelace', want 'A.L.'`) names the repair.
    // Null (no engine, no test file, no direct asserts) keeps the note
    // untouched — absence recorded on the round, never a crash.
    let diagnosisNote = "";
    let diagnosisSkipped = false;
    try {
      if (detectCodeLanguage(proposal.path) === "python") {
        const defName = /def\s+([A-Za-z_]\w*)\s*\(/.exec(proposal.add ?? "")?.[1] ?? null;
        const testRel = files.find((rel) => {
          if (!rel.endsWith(".py")) return false;
          const base = rel.split("/").pop();
          return base.startsWith("test") || base.endsWith("_test.py");
        }) ?? null;
        if (defName && testRel) {
          const diag = pyDiagnose({ solutionPath: located.resolved, testPath: path.join(root, testRel), entry: defName, timeoutMs: testTimeoutMs });
          if (diag?.lines?.length) {
            diagnosisNote = `Mechanical diagnosis (ran your patch with the test's own inputs — not a guess):\n${diag.lines.map((l) => `  ${l}`).join("\n")}`;
          } else diagnosisSkipped = true;
        } else diagnosisSkipped = true;
      }
    } catch {
      diagnosisNote = "";
      diagnosisSkipped = true;
    }
    finalTestOutput = test.output;    // The prediction, made BEFORE the verdict above was known, and its
    // error now that it is: recorded on the round, learned into the
    // session prior. |error| ≥ 0.5 with history is surprise (a confident
    // prior revised by witness) and the next note says so.
    const fcKey = forecastKey({ op, language: detectCodeLanguage(proposal.path) ?? "?", syntax });
    const fc = forecast(forecastPrior, fcKey);
    const won = test.exitCode === 0;
    const err = forecastError(fc.p, won);
    forecastPrior = observe(forecastPrior, fcKey, won);
    const fcRecord = Object.freeze({ key: fcKey, p: fc.p, trials: fc.trials, error: err });
    const surprise = Math.abs(err) >= 0.5 && fc.trials >= 2
      ? ` Surprise: predicted ${fc.p.toFixed(2)} green (${fc.trials} trials) but the test ${won ? "passed" : "failed"} — prior updated.`
      : "";

    if (won) {
      rounds.push({ round, draw, kelsen, action: "INS", path: proposal.path, op, figureOp, find: proposal.find, add: proposal.add, applied: true, reverted: false, syntax, forecast: fcRecord, ...(coverageSkipped ? { coverageSkipped: true } : null), testExitCode: 0, testOutput: test.output });
      return { done: true, rounds, finalTestOutput: test.output };
    }

    fs.writeFileSync(located.resolved, before); // physics: never leave a failing change on disk
    // RE-LOCATE (2026-10-03): a patch that passed the syntax gate but failed
    // the real test may have satisfied its unit and revealed the NEXT one
    // (a second missing export, another module). The machine re-reads the
    // failure's own words and re-aims — mechanical, no model, no wasted
    // round guessing where the next void lives. A failure that names no
    // unit keeps the current aim.
    {
      const next = locateMissingUnit(test.output, { root, files });
      missingUnit = next; // null clears a stale note; the located file stays the target
      if (next) locatedFile = next.file;
    }
    const normBody = (proposal.add ?? "").replace(/\s+/g, " ").trim();
    // Read the prior witness BEFORE recording this draw's body (otherwise
    // the current entry shadows its own history and the cycle stays silent).
    const priorBody = normBody ? testedBodies.get(normBody) : null;
    if (normBody) testedBodies.set(normBody, { round, draw });
    rounds.push({ round, draw, kelsen, action: "INS", path: proposal.path, op, figureOp, find: proposal.find, add: proposal.add, applied: true, reverted: true, syntax, forecast: fcRecord, ...(coverageSkipped ? { coverageSkipped: true } : null), ...(diagnosisSkipped ? { diagnosisSkipped: true } : null), testExitCode: test.exitCode, testOutput: test.output });
    // NameError remedy (first remedy-table row, end to end): the failure
    // names its own fix when the name is a stdlib module — suggest the
    // exact find/add for the next round, derived not invented. Anything
    // else keeps the existing note untouched.
    let remedy = "";
    if (detectCodeLanguage(proposal.path) === "python") {
      const fix = suggestImportFix({ failureOutput: test.output, fileText: before, stdlibModules: kwPrior?.stdlibModules });
      if (fix.ok) {
        remedy = `\n\nMechanical suggestion (received stdlib, exact bytes — verify against the file before proposing): ${fix.basis}.\nFIND:\n${fix.find}\nADD:\n${fix.add}`;
      }
    }
    const prior = priorBody;
    // If this same body was tested-and-failed EARLIER (not this draw),
    // the mouth is cycling: name the cycle with the round it happened in.
    // (A repeat is a fact, not a prohibition — retry stays possible.)
    const repeatNote = prior && !(prior.round === round && prior.draw === draw)
      ? `\n\nMechanical note (repeat): this exact code was already tested for real and failed this session (round ${prior.round}, draw ${prior.draw}). Re-sending identical bytes cannot pass the same test — the structure you keep reusing is not the problem; the returned VALUE is. Change the bytes.`
      : "";
    lastNote = `Your previous patch on "${proposal.path}" was applied and tested for real. It failed, and has been reverted (the file below no longer has your change).${diagnosisNote ? `\n\n${diagnosisNote}` : ""} The real test output was:\n\n${test.output}${remedy}${surprise}${arityNote ? `\n\n${arityNote}` : ""}${repeatNote}`;
   } // draw
  } // round

  return { done: false, rounds, finalTestOutput };
}
