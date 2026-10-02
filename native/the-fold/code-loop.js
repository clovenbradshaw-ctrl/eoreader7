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
import { detectCodeLanguage, generationBriefFor, mismatchNoteFor } from "../adapters/code/language.js";
import { loadCodeKeywordPrior, keywordSetOf, buildCodeIndex, codeGist, loadCodeNamePriorSplits, parseDeclarations } from "../adapters/text/code-structure.js";
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
    text: "Mechanically-generated claim for requireReasoning — describes the patch's own byte-level change; not authored by the coding model.",
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
export async function runCodeLoop({ sessionId, userId = null, model, task, workspace, testCommand, maxRounds = DEFAULT_MAX_ROUNDS, testTimeoutMs = DEFAULT_TEST_TIMEOUT_MS, caller = null, signal = null, candidates = 1, turn = defaultTurn, contextMode = "raw", requireReasoning = false, territory = null }) {
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
  const locatedFile = locatedFileFor(territory, task);
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
    // when handed the full 63-file fold (measured live 2026-10-01).
    const foldFiles = locatedFile ? [locatedFile] : files;
    const baseContent = effectiveContext === "fold" ? renderFoldedContext(root, foldFiles, task) : renderFiles(root, files);
    const ground = firstSight ? renderTerritoryGround(territory, task) : "";
    const roundContent =
      firstSight
        ? (ground ? `${ground}\n\n${baseContent}` : baseContent)
        : `${baseContent}${renderReadFiles(reads)}`;
    const roundTask =
      firstSight
        ? `${task}\n\nFiles in the workspace (${root}):\n${listedFiles.join("\n")}${languageBlock}\n\n${locatedFile ? LOCATED_PROPOSAL_FORMAT : PROPOSAL_FORMAT}`
        : `${task}\n\n${lastNote}\n\n${locatedFile ? LOCATED_PROPOSAL_FORMAT : PROPOSAL_FORMAT}`;

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

    const located = resolveRealFile(root, proposal.path);
    if (!located.ok) {
      const stuck = repeatsLastGap(rounds, "invalid_path", proposal.path);
      rounds.push({ round, draw, kelsen, action: proposal.action, path: proposal.path, gap: located.gap });
      if (stuck) return { done: false, rounds, finalTestOutput, stuck: { kind: "invalid_path", reason: `named the same non-existent path ("${proposal.path}") twice in a row — continuing would not help without new information` } };
      lastNote = `You named "${proposal.path}", which is not a real file in this workspace (${located.gap.reason}). Pick a real path from the listing below.`;
      continue;
    }

    if (proposal.action === "SIG") {
      if (reads.has(proposal.path)) {
        const stuck = repeatsLastGap(rounds, "already_read", proposal.path);
        rounds.push({ round, draw, kelsen, action: "SIG", path: proposal.path, gap: { kind: "already_read", reason: "this file's content was already shown" } });
        if (stuck) return { done: false, rounds, finalTestOutput, stuck: { kind: "already_read", reason: `re-requested the already-shown "${proposal.path}" twice in a row — continuing would not help without new information` } };
        lastNote = `You already have "${proposal.path}"'s content below — re-reading it won't tell you anything new. Propose a PATCH now, or read a DIFFERENT file.`;
        continue;
      }
      // Nothing is applied, nothing is tested — this round only requests
      // real content for the NEXT round's context.
      const content = fs.readFileSync(located.resolved, "utf8");
      const truncated = content.length > MAX_READ_CHARS_SHOWN;
      reads.set(proposal.path, content.slice(0, MAX_READ_CHARS_SHOWN) + (truncated ? "\n[...truncated...]" : ""));
      rounds.push({ round, draw, kelsen, action: "SIG", path: proposal.path, truncated });
      lastNote = `Here is the real content of "${proposal.path}" you asked to read (below). Now propose a PATCH, or read another file if you still need to.`;
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
