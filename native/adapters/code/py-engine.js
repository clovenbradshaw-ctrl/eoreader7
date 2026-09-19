// adapters/code/py-engine.js — the language's own engine as a giver.
//
// `ast` (via native/scripts/py-facts.py, stdlib only, never executes the
// target) reports what the running grammar says: exact arity (posonly,
// defaults, kwonly, *args), decorators, aliases, qualified names, and a
// syntax verdict with line + offset. The regex recipes approximate the
// same facts from shapes; this module prefers engine facts when python3
// exists and returns NULL when it doesn't — every consumer falls back to
// recipes, disclosed, never a silent downgrade.
//
// BOUNDS: execFileSync (no shell, argv only), 15 s timeout, 4 MB stdout
// cap, stdin mode for unsaved bytes (no temp files). A timeout, a bad
// exit, unparseable JSON, or a wrong schema all yield null — absence is
// a result the caller discloses, never an exception that escapes
// (except a malformed call: no file list at all).

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { importSpans } from "./scan.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PY_FACTS = path.join(HERE, "..", "..", "scripts", "py-facts.py");
const TIMEOUT_MS = 15000;
const MAX_BUFFER = 4 * 1024 * 1024;

function run(args, { input = null } = {}) {
  let out;
  try {
    out = execFileSync("python3", args, {
      input: input ?? undefined,
      encoding: "utf8",
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      stdio: ["pipe", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
  let doc;
  try {
    doc = JSON.parse(out);
  } catch {
    return null;
  }
  if (!doc || doc.engine?.producer !== "ast" || !Array.isArray(doc.files)) return null;
  return doc;
}

/**
 * pyFactsOf(paths) -> [{ path, ok, error?, declarations[], imports[] }] |
 * null. Ground-truth facts for saved files. Null when python3 is absent,
 * slow, or surprising — the caller uses recipes and says so.
 */
export function pyFactsOf(paths) {
  if (!Array.isArray(paths) || !paths.length) throw new Error("pyFactsOf needs a non-empty path list");
  const doc = run([PY_FACTS, ...paths.map(String)]);
  return doc ? doc.files : null;
}

/**
 * pyCheckSyntax(text, fileName) -> { ok:true } |
 * { ok:false, error:{ msg, lineno, offset, line } } | null.
 * The verdict on UNSAVED bytes (a would-be patched file) via stdin —
 * the pre-test gate that separates "doesn't parse" from "parses but
 * fails". Null when the engine is unavailable (proceed untested,
 * disclosed).
 */
export function pyCheckSyntax(text, fileName = "check.py") {
  const doc = run([PY_FACTS, "--stdin", "--name", String(fileName)], { input: String(text ?? "") });
  if (!doc) return null;
  const f = doc.files[0];
  if (!f) return null;
  return f.ok ? { ok: true } : { ok: false, error: f.error };
}

// ---------------------------------------------------------------------------
// JavaScript gate: node --check on stdin. Same contract as pyCheckSyntax
// ({ ok:true } | { ok:false, error:{ msg, lineno, offset, line } } | null)
// and the same bounds discipline (execFileSync, argv only, 15 s timeout,
// 4 MB cap, stdin mode, no temp files). A nonzero exit WITH stderr is the
// engine's own syntax verdict (parsed below); anything else surprising —
// ENOENT (no node), timeout, signal kill, ENOBUFS — is null (proceed
// untested, disclosed), never a throw.
//
// GOALS (witnessed, node v24): --check on stdin defaults to the CommonJS
// goal, so ESM bytes (`import`/`export`) fail there and pass only under
// --input-type=module. .mjs runs module, .cjs runs script, .js/.jsx try
// script first and fall back to module for a PASS (a file clean under
// either goal parses); a file broken under BOTH goals reports the
// script-mode error (the default goal — documented, not guessed).
// LIMIT: node --check is a JS grammar check, not JSX — a .jsx file
// carrying `<Tag>` syntax fails here even when valid for its toolchain.
// That refusal is a disclosed gap on the round (never silent), and the
// real test command still decides everything that parses.
// LIMIT (falsified 2026-09-19): --check passes top-level `return 1;`
// (exit 0) — V8's check goal tolerates what strict early-error rules
// forbid. A syntax gate is not a semantics gate: runtime-invalid bytes
// still reach the tests, which is exactly their job. Pinned, not fixed.
// ---------------------------------------------------------------------------

const JS_HEADER_RE = /^\[stdin\]:(\d+)\s*$/m;
const JS_MSG_RE = /^(SyntaxError:[^\n]*)/m;

/**
 * parseNodeCheckStderr(stderr) -> { msg, lineno, offset, line }. Reads
 * ONLY the engine's own lines — the `[stdin]:LINENO` header, the source
 * line beneath it, the caret column, the `SyntaxError:` line — and
 * yields null for every field not present, never an invented number.
 */
export function parseNodeCheckStderr(stderr) {
  const text = String(stderr ?? "");
  const hm = JS_HEADER_RE.exec(text);
  const lineno = hm ? Number(hm[1]) : null;
  let line = null;
  let offset = null;
  if (hm) {
    // Slice revenue: [rest-of-header-line, source line, caret line, ...].
    const after = text.slice(hm.index + hm[0].length).split("\n");
    const src = after[1];
    if (src !== undefined) line = src;
    const caret = after[2] ?? "";
    const ci = caret.indexOf("^");
    if (ci !== -1) offset = ci + 1; // 1-based column, python-offset discipline
  }
  const mm = JS_MSG_RE.exec(text);
  const msg = mm ? mm[1].trim() : (text.split("\n").map((s) => s.trim()).find(Boolean) ?? "syntax error");
  return { msg, lineno, offset, line };
}

function nodeCheckOnce(text, module) {
  const args = module ? ["--input-type=module", "--check", "-"] : ["--check", "-"];
  try {
    execFileSync("node", args, {
      input: String(text ?? ""),
      encoding: "utf8",
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true };
  } catch (err) {
    if (err?.code === "ENOENT" || err?.code === "ETIMEDOUT" || /timed out/i.test(String(err?.message ?? ""))) return null;
    if (typeof err?.status !== "number" || err.status === 0) return null;
    if (err.stderr == null) return null;
    return { ok: false, error: parseNodeCheckStderr(err.stderr) };
  }
}

/**
 * jsCheckSyntax(text, fileName) -> { ok:true } |
 * { ok:false, error:{ msg, lineno, offset, line } } | null.
 * The verdict on UNSAVED bytes via stdin — the pre-test gate that
 * separates "doesn't parse" from "parses but fails". Null when node is
 * unavailable (proceed untested, disclosed). fileName is accepted for
 * contract parity with pyCheckSyntax and selects the module goal only —
 * node always reports `[stdin]` here, so the name is never passed as an
 * argv path (stdin mode, no temp files).
 */
export function jsCheckSyntax(text, fileName = "check.js") {
  const ext = String(fileName ?? "").slice(String(fileName ?? "").lastIndexOf(".")).toLowerCase();
  if (ext === ".mjs") return nodeCheckOnce(text, true);
  if (ext === ".cjs") return nodeCheckOnce(text, false);
  const script = nodeCheckOnce(text, false);
  if (script === null || script.ok) return script;
  const mod = nodeCheckOnce(text, true);
  if (mod === null) return null;
  return mod.ok ? mod : script;
}

// ---------------------------------------------------------------------------
// TypeScript gate: tsc ONLY when proven present — argv-only `tsc
// --version` off PATH (never npx, never network: an npx shim would fetch).
// tsc has no stdin mode, so a proven tsc checks via a temp .ts file
// (removed in `finally`); unproven tsc is null (skipped, disclosed —
// node --check must never see .ts bytes, it cannot parse type syntax).
// tsc conflates grammar and type diagnostics, so the gate surfaces the
// first `error TS…` line verbatim (msg, line, column) rather than
// re-sorting syntax from semantics.
// ---------------------------------------------------------------------------

/**
 * hasTsc() -> boolean. Proves a real `tsc` binary answers --version.
 */
export function hasTsc() {
  try {
    execFileSync("tsc", ["--version"], {
      encoding: "utf8",
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

const TSC_DIAG_RE = /^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+:\s*[^\n]*)/m;

/**
 * tsCheckSyntax(text, fileName) -> { ok:true } |
 * { ok:false, error:{ msg, lineno, offset, line } } | null.
 * Null when tsc is unproven/absent (proceed untested, disclosed).
 */
export function tsCheckSyntax(text, fileName = "check.ts") {
  if (!hasTsc()) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tscheck-"));
  const raw = path.basename(String(fileName ?? "check.ts")) || "check.ts";
  const base = raw.endsWith(".ts") || raw.endsWith(".tsx") ? raw : `${raw}.ts`;
  const file = path.join(dir, base);
  try {
    fs.writeFileSync(file, String(text ?? ""));
    execFileSync("tsc", ["--noEmit", "--pretty", "false", file], {
      encoding: "utf8",
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true };
  } catch (err) {
    if (err?.code === "ENOENT" || err?.code === "ETIMEDOUT" || /timed out/i.test(String(err?.message ?? ""))) return null;
    if (typeof err?.status !== "number" || err.status === 0) return null;
    const out = `${err.stdout ?? ""}\n${err.stderr ?? ""}`;
    const m = TSC_DIAG_RE.exec(out);
    if (!m) {
      const fallback = out.split("\n").map((s) => s.trim()).find(Boolean) ?? "syntax error";
      return { ok: false, error: { msg: fallback, lineno: null, offset: null, line: null } };
    }
    return { ok: false, error: { msg: m[4].trim(), lineno: Number(m[2]), offset: Number(m[3]), line: null } };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// `NameError: name 'X' is not defined` / `ModuleNotFoundError: No module
// named 'M'` — the failure names its own remedy when X/M is a stdlib
// module (received: the law prior's `lexicon.stdlibModules`, never typed).
const NAME_ERROR_RE = /NameError:\s*name\s+'([A-Za-z_]\w*)'\s+is not defined/;
const MODULE_ERROR_RE = /ModuleNotFoundError:\s*No module named\s+'([A-Za-z_][\w.]*)'/;

/**
 * suggestImportFix({ failureOutput, fileText, stdlibModules }) ->
 * { ok:true, find, add, basis } | { ok:false, gap }.
 * First remedy-table row, end to end: the failure names X, the received
 * stdlib list confirms X is importable, importAnchor measures where —
 * and the returned find/add is loop-ready (INS when an import block
 * exists: add contains find; SYN on the first line when the file opens
 * with code). Third-party and relative names are NOT guessed
 * (kind `not_stdlib`, disclosed). `import *` binders and names already
 * imported are refused as no-ops, not re-added.
 */
export function suggestImportFix({ failureOutput, fileText, stdlibModules } = {}) {
  const text = String(fileText ?? "");
  const output = String(failureOutput ?? "");
  const stdlib = new Set(Array.isArray(stdlibModules) ? stdlibModules : []);
  const m = NAME_ERROR_RE.exec(output) ?? MODULE_ERROR_RE.exec(output);
  if (!m) return { ok: false, gap: { kind: "no_match", reason: "the failure names no unresolved module" } };
  const mod = m[1].split(".")[0];
  if (!stdlib.has(mod)) {
    return { ok: false, gap: { kind: "not_stdlib", name: mod, reason: `"${mod}" is not in the received stdlib list — third-party and local modules are never guessed` } };
  }
  if (new RegExp(`^\\s*(?:from\\s+${mod}\\b|import\\s+.*\\b${mod}\\b)`, "m").test(text)) {
    return { ok: false, gap: { kind: "already_imported", name: mod, reason: `"${mod}" is already imported — the failure lies elsewhere` } };
  }
  const spans = importSpans(text).filter((sp) => sp.statement.trim());
  const line = `import ${mod}`;
  if (!spans.length) {
    // A leading module docstring owns position 0 — an import above it
    // would demote it to a stray string and kill `__doc__`. Anchor after
    // it instead (leading comments/blank lines ride along; the block is a
    // file prefix, hence unique by construction).
    const doc = /^(?:[ \t]*(?:#[^\n]*|\n))*[ \t]*(\"\"\"[\s\S]*?\"\"\"|'''[\s\S]*?''')/.exec(text);
    if (doc) {
      const block = doc[0];
      return { ok: true, find: block, add: `${block}\n${line}`, basis: `NameError names "${mod}", received stdlib confirms it, no import block — INS after the leading docstring (position 0 preserved)` };
    }
    const firstEnd = text.indexOf("\n");
    const first = firstEnd === -1 ? text : text.slice(0, firstEnd);
    if (!first.trim()) return { ok: false, gap: { kind: "empty_file", reason: "no anchor line exists yet" } };
    return { ok: true, find: first, add: `${line}\n${first}`, basis: `NameError names "${mod}", received stdlib confirms it, no import block — SYN on the first line` };
  }
  const lastStmt = spans[spans.length - 1].statement;
  return { ok: true, find: lastStmt, add: `${lastStmt}\n${line}`, basis: `NameError names "${mod}", received stdlib confirms it, anchored after the import block (${spans.length} import statement(s))` };
}
