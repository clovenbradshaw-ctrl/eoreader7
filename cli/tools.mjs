// tools.mjs — the coding agent's real filesystem/process tools.
//
// read_file/list_dir/grep are read-only and execute immediately. write_file
// and run_command are split into propose*() (pure — computes what WOULD
// happen, no side effect) and commit*() (the actual side effect), so the
// TUI can show a real approve/reject modal between the two, matching this
// repo's standing rule that anything with a side effect needs a visible,
// explicit person-made action (never a default "always allow"). This also
// makes propose*() directly unit-testable without touching disk.
//
// Paths are resolved against `cwd` (the workspace the tab was opened in)
// but NOT confined to it — this CLI is a standalone program the person runs
// directly against their own machine (the task's own framing: "real
// file/process access is the whole point"), so there is no sandbox wall to
// name here, only the person's own per-call confirmation for the two tools
// that can change anything.

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";

const MAX_READ_CHARS = 60_000;
const MAX_GREP_MATCHES = 200;
const RUN_COMMAND_TIMEOUT_MS = 30_000;

function resolveIn(cwd, p) {
  return path.resolve(cwd, String(p ?? ""));
}

export function readFile(cwd, { path: p } = {}) {
  if (!p) return { ok: false, error: "read_file requires args.path" };
  const abs = resolveIn(cwd, p);
  try {
    const stat = fs.statSync(abs);
    if (!stat.isFile()) return { ok: false, error: `${p} is not a file` };
    let content = fs.readFileSync(abs, "utf8");
    let truncated = false;
    if (content.length > MAX_READ_CHARS) {
      content = content.slice(0, MAX_READ_CHARS);
      truncated = true;
    }
    return { ok: true, path: p, content, truncated };
  } catch (err) {
    return { ok: false, error: `${p}: ${err.code === "ENOENT" ? "no such file" : err.message}` };
  }
}

export function listDir(cwd, { path: p = "." } = {}) {
  const abs = resolveIn(cwd, p);
  try {
    const entries = fs.readdirSync(abs, { withFileTypes: true })
      .map((e) => ({ name: e.name, type: e.isDirectory() ? "dir" : e.isFile() ? "file" : "other" }))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    return { ok: true, path: p, entries };
  } catch (err) {
    return { ok: false, error: `${p}: ${err.code === "ENOENT" ? "no such directory" : err.message}` };
  }
}

/** Node-native recursive text search — no shelling out, so it behaves the
 * same on any platform this CLI runs on. Bounded (MAX_GREP_MATCHES) so a
 * broad pattern over a big tree can't flood the transcript or the prompt. */
export function grep(cwd, { pattern, path: p = "." } = {}) {
  if (!pattern) return { ok: false, error: "grep requires args.pattern" };
  const abs = resolveIn(cwd, p);
  let re;
  try {
    re = new RegExp(pattern);
  } catch (err) {
    return { ok: false, error: `invalid pattern: ${err.message}` };
  }
  const SKIP_DIRS = new Set([".git", "node_modules", ".venv", "venv", "dist", "build", ".next", "__pycache__"]);
  const matches = [];
  const walk = (dir) => {
    if (matches.length >= MAX_GREP_MATCHES) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (matches.length >= MAX_GREP_MATCHES) return;
      if (e.name.startsWith(".") && e.name !== ".") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(full);
      } else if (e.isFile()) {
        let text;
        try {
          text = fs.readFileSync(full, "utf8");
        } catch {
          continue; // binary or unreadable — skipped, not fatal
        }
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (matches.length >= MAX_GREP_MATCHES) break;
          if (re.test(lines[i])) matches.push({ file: path.relative(cwd, full), line: i + 1, text: lines[i].slice(0, 300) });
        }
      }
    }
  };
  try {
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
      const text = fs.readFileSync(abs, "utf8");
      text.split("\n").forEach((line, i) => {
        if (matches.length < MAX_GREP_MATCHES && re.test(line)) matches.push({ file: p, line: i + 1, text: line.slice(0, 300) });
      });
    } else {
      walk(abs);
    }
  } catch (err) {
    return { ok: false, error: `${p}: ${err.code === "ENOENT" ? "no such path" : err.message}` };
  }
  return { ok: true, pattern, path: p, matches, truncated: matches.length >= MAX_GREP_MATCHES };
}

/** A minimal line-level diff — no external dependency. Common prefix/suffix
 * lines are collapsed to context; the differing middle is shown as
 * removed/added. Honest about being coarse (a whole changed block reads as
 * one remove+add), which is enough for a person to approve or reject. */
export function diffLines(oldText, newText) {
  const a = oldText == null ? [] : oldText.split("\n");
  const b = newText.split("\n");
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length, endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const out = [];
  const CONTEXT = 2;
  for (let i = Math.max(0, start - CONTEXT); i < start; i++) out.push({ kind: "context", text: a[i] });
  for (let i = start; i < endA; i++) out.push({ kind: "remove", text: a[i] });
  for (let i = start; i < endB; i++) out.push({ kind: "add", text: b[i] });
  for (let i = endA; i < Math.min(a.length, endA + CONTEXT); i++) out.push({ kind: "context", text: a[i] });
  return out;
}

/** Pure: computes the diff a write WOULD make. No fs write. */
export function proposeWrite(cwd, { path: p, content } = {}) {
  if (!p) return { ok: false, error: "write_file requires args.path" };
  if (typeof content !== "string") return { ok: false, error: "write_file requires args.content (string)" };
  const abs = resolveIn(cwd, p);
  let isNew = true;
  let oldContent = null;
  try {
    oldContent = fs.readFileSync(abs, "utf8");
    isNew = false;
  } catch (err) {
    if (err.code !== "ENOENT") return { ok: false, error: `${p}: ${err.message}` };
  }
  return { ok: true, path: p, abs, isNew, diff: diffLines(oldContent, content), content };
}

/** The actual side effect — only ever called after the person approves. */
export function commitWrite(abs, content) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return { ok: true };
}

/** Pure: what run_command WOULD run. No process spawned. */
export function proposeRun(cwd, { command } = {}) {
  if (!command || typeof command !== "string") return { ok: false, error: "run_command requires args.command (string)" };
  return { ok: true, command, cwd };
}

/** The actual side effect — only ever called after the person approves.
 * Uses the shell (execFile("/bin/sh", ["-c", command])) because a coding
 * agent's commands are naturally shell-shaped (pipes, globs, npm scripts);
 * the confirmation modal is what stands in for a sandbox here. */
export function commitRun(cwd, command) {
  return new Promise((resolve) => {
    execFile("/bin/sh", ["-c", command], { cwd, timeout: RUN_COMMAND_TIMEOUT_MS, maxBuffer: 4_000_000 }, (err, stdout, stderr) => {
      resolve({
        ok: true,
        exitCode: err ? (err.code ?? 1) : 0,
        stdout: String(stdout ?? ""),
        stderr: String(stderr ?? "") + (err?.signal ? `\n(killed: ${err.signal}${err.killed ? ", timed out" : ""})` : ""),
      });
    });
  });
}
