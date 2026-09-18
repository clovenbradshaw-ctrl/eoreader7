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
