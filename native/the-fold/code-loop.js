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
import { declaresKeyword, suggestWiderFind } from "../adapters/code/mechanical.js";
import { pyCheckSyntax, suggestImportFix } from "../adapters/code/py-engine.js";
import { emptyForecast, forecastKey, forecast, observe, forecastError } from "./forecast.js";
import { runProxyTurn } from "../../proxy-runner.mjs";

const SKIP_DIRS = new Set([".git", "node_modules", ".venv", "venv", "dist", "build", ".next", "__pycache__", ".cache", "coverage"]);
const MAX_LISTED_FILES = 200;
const MAX_FILE_CHARS_SHOWN = 12000;
const MAX_TOTAL_CHARS_SHOWN = 60000;
const DEFAULT_MAX_ROUNDS = 3;
const DEFAULT_TEST_TIMEOUT_MS = 60000;
const MAX_READ_CHARS_SHOWN = 8000;

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

const PROPOSAL_FORMAT = `Respond with exactly one action, in exactly one of these two formats and nothing else.

To see a real file's full content before proposing anything (any file not shown above, or shown truncated):
ACTION: read
PATH: <relative file path>

To propose a change:
ACTION: patch
PATH: <relative file path, exactly as listed above>
<<<FIND>>>
<the exact existing text to change — copy it byte for byte from the file shown above>
<<<ADD>>>
<the replacement text — leave this section empty to delete the FIND text>
<<<END>>>`;

const READ_RE = /ACTION:\s*read\s*\nPATH:\s*(\S+)/i;
const PATCH_RE = /(?:ACTION:\s*patch\s*\n)?PATH:\s*(\S+)\s*\n<<<FIND>>>\n([\s\S]*?)\n<<<ADD>>>\n([\s\S]*?)(?:\n<<<END>>>|$)/i;

/** Mechanical extraction only — a narrow, declared grammar, never JSON the
 * model authored. A proposal that doesn't match either shape is a typed
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

function runTestCommand(testCommand, workspace, timeoutMs) {
  try {
    const output = execSync(testCommand, { cwd: workspace, encoding: "utf8", timeout: timeoutMs, stdio: ["ignore", "pipe", "pipe"] });
    return { exitCode: 0, output };
  } catch (err) {
    const output = `${err.stdout ?? ""}${err.stderr ?? ""}` || String(err.message ?? err);
    return { exitCode: typeof err.status === "number" ? err.status : 1, output };
  }
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
export async function runCodeLoop({ sessionId, userId = null, model, task, workspace, testCommand, maxRounds = DEFAULT_MAX_ROUNDS, testTimeoutMs = DEFAULT_TEST_TIMEOUT_MS, caller = null, signal = null }) {
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
    ? `\n\nLanguage scaffolding (received CodeKeywordPrior@1; shapes illustrative — exact file bytes still rule):\n\n${briefs}`
    : "";

  for (let round = 1; round <= maxRounds; round += 1) {
    const roundContent =
      round === 1
        ? renderFiles(root, files)
        : `${renderFiles(root, files)}${renderReadFiles(reads)}`;
    const roundTask =
      round === 1
        ? `${task}\n\nFiles in the workspace (${root}):\n${listedFiles.join("\n")}${languageBlock}\n\n${PROPOSAL_FORMAT}`
        : `${task}\n\n${lastNote}\n\n${PROPOSAL_FORMAT}`;

    const turn = await runProxyTurn({ sessionId, userId, model, task: roundTask, chatHistory: [{ role: "user", content: roundContent }], workspace: root, mode: "chat", caller, signal });
    const proposal = parseProposal(turn.text);
    if (!proposal.ok) {
      rounds.push({ round, gap: proposal.gap, raw: turn.text });
      lastNote = `Your last reply did not follow the required format (${proposal.gap.reason}). Use exactly one of the two formats below.`;
      continue;
    }

    const located = resolveRealFile(root, proposal.path);
    if (!located.ok) {
      rounds.push({ round, action: proposal.action, path: proposal.path, gap: located.gap });
      lastNote = `You named "${proposal.path}", which is not a real file in this workspace (${located.gap.reason}). Pick a real path from the listing below.`;
      continue;
    }

    if (proposal.action === "read") {
      if (reads.has(proposal.path)) {
        rounds.push({ round, action: "read", path: proposal.path, gap: { kind: "already_read", reason: "this file's content was already shown" } });
        lastNote = `You already have "${proposal.path}"'s content below — re-reading it won't tell you anything new. Propose a PATCH now, or read a DIFFERENT file.`;
        continue;
      }
      // Nothing is applied, nothing is tested — this round only requests
      // real content for the NEXT round's context.
      const content = fs.readFileSync(located.resolved, "utf8");
      const truncated = content.length > MAX_READ_CHARS_SHOWN;
      reads.set(proposal.path, content.slice(0, MAX_READ_CHARS_SHOWN) + (truncated ? "\n[...truncated...]" : ""));
      rounds.push({ round, action: "read", path: proposal.path, truncated });
      lastNote = `Here is the real content of "${proposal.path}" you asked to read (below). Now propose a PATCH, or read another file if you still need to.`;
      continue;
    }

    const before = fs.readFileSync(located.resolved, "utf8");
    // Propose-time keyword gate (S83 polarity, received CodeKeywordPrior@1):
    // an ADD that binds a hard keyword can never pass tests — refuse before
    // touching disk, with the refused names as evidence. Null prior (unknown
    // language, absent file) admits everything, exactly as before.
    const kwPrior = loadCodeKeywordPrior(detectCodeLanguage(proposal.path));
    const refusedNames = declaresKeyword(proposal.add, proposal.path, keywordSetOf(kwPrior));
    if (refusedNames.length) {
      const gap = { kind: "keyword_declaration", names: refusedNames, reason: `"${refusedNames.join('", "')}" cannot be declared in ${detectCodeLanguage(proposal.path) || "this file"} (received closed class) — nothing was changed on disk` };
      rounds.push({ round, action: "patch", path: proposal.path, gap });
      lastNote = `Your proposed patch on "${proposal.path}" did not apply (${gap.reason}). Propose different names, with find text copied exactly from the file.`;
      continue;
    }
    const ops = readOps([{ find: proposal.find, add: proposal.add }]);
    const applied = ops ? applyOps(before, ops) : { ok: false, gap: { kind: "malformed", reason: "find/add did not resolve to a real op" } };
    if (!applied.ok) {
      rounds.push({ round, action: "patch", path: proposal.path, gap: applied.gap });
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
      const extra = mismatch ?? (wider ? `Mechanical note: every occurrence of your FIND sits inside \`${wider.find}\` (${wider.basis.split(";")[0]}). Anchor on that declaration line — copied byte-for-byte — to make it unique.` : null);
      lastNote = `Your proposed patch on "${proposal.path}" did not apply (${applied.gap.reason}). Nothing was changed on disk. Try again with find text copied exactly from the file.${extra ? `\n\n${extra}` : ""}`;
      continue;
    }

    fs.writeFileSync(located.resolved, applied.code);
    const op = ops[0].op;
    // Syntax pre-check (Python only: the running grammar via ast, never a
    // regex): patched bytes that don't parse never reach the test command
    // — "doesn't parse" and "parses but fails" finally separate, and no
    // test round is burned on the former. Null (no python3 on the box) →
    // proceed untested, recorded on the round, never a silent skip.
    let syntax = "unchecked-not-python";
    if (detectCodeLanguage(proposal.path) === "python") {
      const verdict = pyCheckSyntax(applied.code, proposal.path);
      if (verdict === null) {
        syntax = "skipped-no-engine";
      } else if (!verdict.ok) {
        fs.writeFileSync(located.resolved, before); // nothing unparseable is ever left on disk
        const gap = { kind: "syntax_error", reason: `the patched file does not parse (${verdict.error.msg}, line ${verdict.error.lineno}: ${verdict.error.line}) — nothing was written, no test was run` };
        rounds.push({ round, action: "patch", path: proposal.path, op, find: proposal.find, add: proposal.add, applied: false, reverted: false, gap });
        lastNote = `Your proposed patch on "${proposal.path}" ${gap.reason}. Fix the syntax with find text copied exactly from the file.`;
        continue;
      } else {
        syntax = "checked";
      }
    }
    const test = runTestCommand(testCommand, root, testTimeoutMs);
    finalTestOutput = test.output;

    // The prediction, made BEFORE the verdict above was known, and its
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
      rounds.push({ round, action: "patch", path: proposal.path, op, find: proposal.find, add: proposal.add, applied: true, reverted: false, syntax, forecast: fcRecord, testExitCode: 0, testOutput: test.output });
      return { done: true, rounds, finalTestOutput: test.output };
    }

    fs.writeFileSync(located.resolved, before); // physics: never leave a failing change on disk
    rounds.push({ round, action: "patch", path: proposal.path, op, find: proposal.find, add: proposal.add, applied: true, reverted: true, syntax, forecast: fcRecord, testExitCode: test.exitCode, testOutput: test.output });
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
    lastNote = `Your previous patch on "${proposal.path}" was applied and tested for real. It failed, and has been reverted (the file below no longer has your change). The real test output was:\n\n${test.output}${remedy}${surprise}`;
  }

  return { done: false, rounds, finalTestOutput };
}
