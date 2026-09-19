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
import { execSync } from "node:child_process";
import { readOps, applyOps } from "./patch.js";
import { detectCodeLanguage, generationBriefFor, mismatchNoteFor } from "../adapters/code/language.js";
import { loadCodeKeywordPrior, keywordSetOf } from "../adapters/text/code-structure.js";
import { declaresKeyword, suggestWiderFind, suggestWholeFile, arityCoverage } from "../adapters/code/mechanical.js";
import { pyCheckSyntax, jsCheckSyntax, tsCheckSyntax, hasTsc, suggestImportFix, pyDiagnose } from "../adapters/code/py-engine.js";
import { emptyForecast, forecastKey, forecast, observe, forecastError } from "./forecast.js";
import { runProxyTurn } from "../../proxy-runner.mjs";

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

const READ_RE = /ACTION:\s*read\s*\nPATH:\s*(\S+)/i;
const PATCH_RE = /(?:ACTION:\s*patch\s*\n)?PATH:\s*(\S+)\s*\n<<<FIND>>>\n([\s\S]*?)\n<<<ADD>>>\n([\s\S]*?)(?:\n<<<END>>>|$)/i;

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

/** Mechanical extraction only — a narrow, declared grammar, never JSON the * model authored. A proposal that doesn't match either shape is a typed
 * gap, not a guess at what was meant. `ACTION:` may be omitted for a patch
 * (backward compatible with the original single-action grammar). */
export function parseProposal(text) {
  const raw = String(text ?? "");
  const read = READ_RE.exec(raw);
  if (read) return { ok: true, action: "read", path: read[1].trim() };
  const patch = PATCH_RE.exec(raw);
  if (patch) {
    const [, relPath, find, add] = patch;
    return { ok: true, action: "patch", path: relPath.trim(), find, add: add.replace(/\n$/, "") };
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

/** The real content of every file read so far this run, rendered for the
 * prompt — real bytes, requested on demand, never re-summarized or
 * paraphrased between rounds. */
function renderReadFiles(reads) {
  if (!reads.size) return "";
  const blocks = [...reads.entries()].map(([rel, content]) => `--- ${rel} (read on request) ---\n${content}`);
  return `\n\nFiles you asked to read:\n\n${blocks.join("\n\n")}`;
}

/**
 * Run the loop. Returns { done, rounds, finalTestOutput }. Never throws for
 * an ordinary failed attempt — only for a malformed call (no workspace, no
 * testCommand).
 */
export async function runCodeLoop({ sessionId, userId = null, model, task, workspace, testCommand, maxRounds = DEFAULT_MAX_ROUNDS, testTimeoutMs = DEFAULT_TEST_TIMEOUT_MS, caller = null, signal = null, candidates = 1, turn = defaultTurn }) {
  if (!workspace || !fs.existsSync(workspace)) throw new Error("workspace must be an existing directory");
  if (!testCommand || typeof testCommand !== "string") throw new Error("testCommand must be a declared, real command string");

  const root = path.resolve(workspace);
  const files = listFiles(root);
  const rounds = [];
  const reads = new Map(); // real content of every file read on request so far
  let lastNote = null; // what actually happened last round, stated plainly — never a fabricated "it failed" when nothing was even tried
  let finalTestOutput = null;
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
    const roundContent =
      firstSight
        ? renderFiles(root, files)
        : `${renderFiles(root, files)}${renderReadFiles(reads)}`;
    const roundTask =
      firstSight
        ? `${task}\n\nFiles in the workspace (${root}):\n${listedFiles.join("\n")}${languageBlock}\n\n${PROPOSAL_FORMAT}`
        : `${task}\n\n${lastNote}\n\n${PROPOSAL_FORMAT}`;

    const turned = await turn({ sessionId, userId, model, task: roundTask, chatHistory: [{ role: "user", content: roundContent }], workspace: root, mode: "chat", caller, signal, ...(kelsen === null ? null : { kelsen }) });
    const proposal = parseProposal(turned.text);
    if (!proposal.ok) {
      // A cut stream is not a model stop: kind stays unparsed_proposal and
      // the round gains a sibling witness (pure parseProposal untouched).
      const cut = turned.stream?.doneSeen === false ? { doneReason: turned.stream.doneReason ?? null, streamErr: turned.stream.streamErr ?? null, leftoverChars: turned.stream.leftoverChars ?? 0, tailParsedAs: turned.stream.tailParsedAs ?? null } : null;
      rounds.push({ round, draw, kelsen, gap: proposal.gap, raw: turned.text, ...(cut ? { streamCut: cut } : {}) });
      lastNote = cut
        ? `Your last reply was cut off mid-stream (no done frame${cut.doneReason ? `: ${cut.doneReason}` : ""}${cut.streamErr ? `; server error: ${cut.streamErr}` : ""}${cut.leftoverChars ? `; ${cut.leftoverChars} chars stranded` : ""}) — not a complete answer. Resend the full action in exactly one of the two formats below.`
        : `Your last reply did not follow the required format (${proposal.gap.reason}). Use exactly one of the two formats below.`;
      continue;
    }

    const located = resolveRealFile(root, proposal.path);
    if (!located.ok) {
      rounds.push({ round, draw, kelsen, action: proposal.action, path: proposal.path, gap: located.gap });
      lastNote = `You named "${proposal.path}", which is not a real file in this workspace (${located.gap.reason}). Pick a real path from the listing below.`;
      continue;
    }

    if (proposal.action === "read") {
      if (reads.has(proposal.path)) {
        rounds.push({ round, draw, kelsen, action: "read", path: proposal.path, gap: { kind: "already_read", reason: "this file's content was already shown" } });
        lastNote = `You already have "${proposal.path}"'s content below — re-reading it won't tell you anything new. Propose a PATCH now, or read a DIFFERENT file.`;
        continue;
      }
      // Nothing is applied, nothing is tested — this round only requests
      // real content for the NEXT round's context.
      const content = fs.readFileSync(located.resolved, "utf8");
      const truncated = content.length > MAX_READ_CHARS_SHOWN;
      reads.set(proposal.path, content.slice(0, MAX_READ_CHARS_SHOWN) + (truncated ? "\n[...truncated...]" : ""));
      rounds.push({ round, draw, kelsen, action: "read", path: proposal.path, truncated });
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
      rounds.push({ round, draw, kelsen, action: "patch", path: proposal.path, gap: fenced.gap });
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
      rounds.push({ round, draw, kelsen, action: "patch", path: proposal.path, gap });
      lastNote = `Your proposed patch on "${proposal.path}" did not apply (${gap.reason}). Propose different names, with find text copied exactly from the file.`;
      continue;
    }
    const ops = readOps([{ find: proposal.find, add: proposal.add }]);
    const applied = ops ? applyOps(before, ops) : { ok: false, gap: { kind: "malformed", reason: "find/add did not resolve to a real op" } };
    if (!applied.ok) {
      rounds.push({ round, draw, kelsen, action: "patch", path: proposal.path, gap: applied.gap });
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

    fs.writeFileSync(located.resolved, applied.code);
    const op = ops[0].op;
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
      rounds.push({ round, draw, kelsen, action: "patch", path: proposal.path, op, find: proposal.find, add: proposal.add, applied: false, reverted: false, gap: gate.gap });
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
      rounds.push({ round, draw, kelsen, action: "patch", path: proposal.path, op, find: proposal.find, add: proposal.add, applied: true, reverted: false, syntax, forecast: fcRecord, ...(coverageSkipped ? { coverageSkipped: true } : null), testExitCode: 0, testOutput: test.output });
      return { done: true, rounds, finalTestOutput: test.output };
    }

    fs.writeFileSync(located.resolved, before); // physics: never leave a failing change on disk
    const normBody = (proposal.add ?? "").replace(/\s+/g, " ").trim();
    // Read the prior witness BEFORE recording this draw's body (otherwise
    // the current entry shadows its own history and the cycle stays silent).
    const priorBody = normBody ? testedBodies.get(normBody) : null;
    if (normBody) testedBodies.set(normBody, { round, draw });
    rounds.push({ round, draw, kelsen, action: "patch", path: proposal.path, op, find: proposal.find, add: proposal.add, applied: true, reverted: true, syntax, forecast: fcRecord, ...(coverageSkipped ? { coverageSkipped: true } : null), ...(diagnosisSkipped ? { diagnosisSkipped: true } : null), testExitCode: test.exitCode, testOutput: test.output });
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
