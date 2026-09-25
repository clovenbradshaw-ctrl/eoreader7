#!/usr/bin/env node
// cli/claude-code-steer.mjs — THE ENGINE STEERS BEFORE CLAUDE ACTS (2026-09-22).
// The user: "make it steer." A PreToolUse hook. Before a file changes — an
// Edit/Write/NotebookEdit, or a Bash command whose write targets it can read —
// the change must be covered by reasoning eoreader7 has PASSED this turn
// (cli/claude-code-state.mjs coverageOf). Before `git commit`, every file this
// turn changed must be covered. Otherwise the action is denied, with the
// instruction to state claims grounded at those files and run cli/reason.mjs.
//
// WRITE TARGETS in Bash are read by a DECLARED table, not guessed: redirection
// (> >> &>), `tee`, `sed -i`, `cp`/`mv` destination, `rm`. Heredoc bodies are
// stripped first (a `>` inside inline code is not a redirect). A `cd` (pushd,
// popd) it can FOLLOW — a literal directory, at top level, run leading or
// after `&&`/`;` — moves the base the paths resolve against. Any other cd
// ($VAR, a glob, `cd -`, inside `( … )` or an if/loop body, in a pipeline, in
// the background, after `||`) leaves the base UNKNOWN from there on: a
// relative target after it cannot be resolved, while an absolute one still
// can. A later followable cd to an absolute path grounds the base again.
// A target it cannot resolve ($VAR, a glob, a relative path under an unknown
// base, a path written by an interpreter) is ALLOWED here and caught after
// the fact by the ledger hook and at commit/stop — disclosed.
//
// Off switch: ~/.claude/eo-reason/steer.off. Fails open on its own error.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { steeringOff, sidOf, loadState, saveState, coverageOf, exempt, logError } from "./claude-code-state.mjs";
import { deriveClaimSpec } from "../native/organs/claim-deriver.js";

const REASON = path.join(path.dirname(new URL(import.meta.url).pathname), "reason.mjs");

export function stripHeredocs(cmd) {
  const out = []; let end = null;
  for (const line of String(cmd).split("\n")) {
    if (end) { if (line.trim() === end) end = null; continue; }
    out.push(line);
    const m = /<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/.exec(line);
    if (m) end = m[1];
  }
  return out.join("\n");
}

/** Index just past the ")" that closes the "(" at s[i], skipping quoted text. */
function closeParen(s, i) {
  let depth = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") i++;
    else if (c === "'") { const j = s.indexOf("'", i + 1); if (j < 0) return s.length; i = j; }
    else if (c === '"') { i++; while (i < s.length && s[i] !== '"') { if (s[i] === "\\") i++; i++; } }
    else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return i + 1;
  }
  return s.length;
}

// Longest first where one is a prefix of another. ( and ) delimit a subshell;
// >& duplicates a descriptor (2>&1) or, before a file, redirects to it.
const OPS = ["&&", "||", "&>>", "&>", ">>", ">&", ">", "|", ";", "&", "<", "(", ")"];
export function tokens(s) {
  const out = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\n") { out.push({ op: ";" }); i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    // process substitution <( … ) / >( … ) is one word, never a subshell or a redirect
    if ((c === "<" || c === ">") && s[i + 1] === "(") { const j = closeParen(s, i + 1); out.push({ word: s.slice(i, j) }); i = j; continue; }
    const op = OPS.find((o) => s.startsWith(o, i));
    if (op) { out.push({ op }); i += op.length; continue; }
    let w = "";
    while (i < s.length && !/[\s;&|<>()]/.test(s[i])) {
      if (s[i] === "'") { const j = s.indexOf("'", i + 1); w += s.slice(i + 1, j < 0 ? s.length : j); i = j < 0 ? s.length : j + 1; }
      else if (s[i] === '"') { let j = i + 1; while (j < s.length && s[j] !== '"') { if (s[j] === "\\") j++; j++; } w += s.slice(i + 1, j).replace(/\\(.)/g, "$1"); i = j + 1; }
      else if (s[i] === "\\") { w += s[i + 1] ?? ""; i += 2; }
      // command substitution stays inside the word: a cd in $( … ) or ` … ` moves no base
      else if (s[i] === "$" && s[i + 1] === "(") { const j = closeParen(s, i + 1); w += s.slice(i, j); i = j; }
      else if (s[i] === "`") { const j = s.indexOf("`", i + 1); w += s.slice(i, j < 0 ? s.length : j + 1); i = j < 0 ? s.length : j + 1; }
      else { w += s[i]; i++; }
    }
    if (/^\d+$/.test(w) && (s[i] === ">" || s[i] === "<")) continue; // 2>… names a descriptor, not a word
    out.push({ word: w });
  }
  return out;
}

const home = (p) => (p === "~" ? os.homedir() : p.startsWith("~/") ? path.join(os.homedir(), p.slice(2)) : p);
// $VAR, `cmd`, a glob, brace expansion, ~user / ~- , a process substitution
const unresolvable = (w) => /[$`*?[{}]/.test(w) || /^~[^/]/.test(w) || /^[<>]\(/.test(w);

const SEPS = ["&&", "||", ";", "|", "&"];
const REDIRECTS = [">", ">>", "&>", "&>>", ">&"];
const OPENS = ["if", "while", "until", "for", "case", "select"], CLOSES = ["fi", "done", "esac"];
const KEYWORDS = new Set(["{", "}", "!", "then", "do", "else", "elif", "time", ...OPENS, ...CLOSES]);

/** Bash write targets and whether it commits, per the declared table. */
export function bashIntent(command, cwd) {
  // Simple commands, each with the operator before and after it and whether
  // it runs inside ( … ). An unmatched ) closes a case pattern.
  const segs = [];
  let depth = 0, cur = { toks: [], prev: null, next: null, sub: false };
  const cut = (op) => { cur.next = op; segs.push(cur); cur = { toks: [], prev: op, next: null, sub: false }; };
  for (const t of tokens(stripHeredocs(command))) {
    if (t.op === "(") depth++;
    else if (t.op === ")") { if (depth > 0) depth--; else cut(")"); }
    else if (SEPS.includes(t.op)) cut(t.op);
    else { cur.toks.push(t); if (depth > 0) cur.sub = true; }
  }
  segs.push(cur);
  let base = cwd || process.cwd(); // null once a cd it cannot follow has run
  let ctl = 0; // open if/while/until/for/case bodies
  const targets = [], unknown = [];
  let commits = false;
  const add = (w) => {
    if (!w || w === "/dev/null" || /^&?\d$/.test(w)) return;
    const p = home(w);
    if (unresolvable(w) || (base === null && !path.isAbsolute(p))) { unknown.push(w); return; }
    targets.push(path.resolve(base ?? "/", p));
  };
  for (const seg of segs) {
    const words = [];
    for (let i = 0; i < seg.toks.length; i++) {
      const t = seg.toks[i];
      if (REDIRECTS.includes(t.op)) { const nx = seg.toks[i + 1]; if (nx?.word != null) { add(nx.word); i++; } continue; }
      if (t.op === "<") { i++; continue; }
      if (t.word != null) words.push(t.word);
    }
    // strip leading reserved words and env assignments (A=b cmd …); a for/case
    // header names no command
    const w = [...words];
    let header = false;
    while (w.length && (KEYWORDS.has(w[0]) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]))) {
      const k = w.shift();
      if (OPENS.includes(k)) { ctl++; header ||= ["for", "case", "select"].includes(k); }
      else if (CLOSES.includes(k)) ctl = Math.max(0, ctl - 1);
    }
    if (header || !w.length) continue;
    const [cmd, ...args] = w;
    const plain = args.filter((a) => !a.startsWith("-"));
    if (cmd === "cd" || cmd === "pushd" || cmd === "popd") {
      const dir = args.find((a) => !/^-[A-Za-z@]+$/.test(a)); // past -P/-L; "-" is OLDPWD
      const to = cmd === "popd" || dir === "-" || (cmd === "pushd" && dir == null) ? null : home(dir ?? "~");
      const followable = !seg.sub && ctl === 0 && [null, "&&", ";", "&"].includes(seg.prev) && !["|", "&"].includes(seg.next);
      base = !followable || to === null || unresolvable(to) ? null
        : path.isAbsolute(to) ? path.resolve(to)
        : base === null ? null : path.resolve(base, to);
      continue;
    }
    if (cmd === "sed" && args.some((a) => /^-[A-Za-z]*i/.test(a) || a === "--in-place")) add(args[args.length - 1]);
    else if (cmd === "tee") plain.forEach(add);
    else if ((cmd === "cp" || cmd === "mv") && plain.length >= 2) {
      const dest = plain[plain.length - 1];
      add(dest.endsWith("/") ? path.join(dest, path.basename(plain[plain.length - 2])) : dest);
    }
    else if (cmd === "rm") plain.forEach(add);
    if (cmd === "git") {
      let j = 0;
      while (j < args.length && args[j].startsWith("-")) j += ["-C", "-c"].includes(args[j]) ? 2 : 1;
      if (args[j] === "commit") commits = true;
    }
  }
  return { targets: [...new Set(targets)], unknown, commits };
}

function denial(files, st, why, extra = null) {
  const lines = files.map((f) => {
    const cov = coverageOf(st, f);
    return cov.run && !cov.run.ok
      ? `  ${f} — the latest run covering it FAILED:\n${(cov.run.errors ?? []).map((e) => `      ${e}`).join("\n") || "      (see its output)"}`
      : `  ${f} — no passing run this turn states a claim grounded at it`;
  });
  return [
    `eoreader7 steering: ${why}`,
    ...lines,
    "State what the change does and must preserve as claims grounded AT each file — ground = its absolute path, or a scope inside it (<path>/<function>) — and run:",
    `  node ${REASON} <spec.json>   (keep the spec in /tmp or pipe it on stdin)`,
    "A claim grounded at a directory or at \"/\" does not cover a file. Then retry.",
    ...(extra ? [extra] : []),
  ].join("\n");
}

/**
 * AUTO-DERIVE (2026-09-25, mechanical-shortcuts first slice — see
 * native/organs/claim-deriver.js's own header for the full design). For an
 * Edit whose target isn't covered yet, try to mechanically derive AND
 * CHECK a claim from the edit's own old_string/new_string before falling
 * back to today's hand-authoring flow. Only Edit calls this — not Write/
 * NotebookEdit/MultiEdit — a deliberately narrow first slice.
 *
 * FAIL-SAFE IS THE ONLY PROPERTY THIS MUST NEVER BREAK: every branch below
 * that cannot cleanly prove coverage returns {covered:false, ...} and
 * changes nothing, falling straight through to the SAME denial() the Edit
 * branch already called before this existed. Nothing here can turn a
 * denial into an allow except a real, freshly-run, PASSING cli/reason.mjs
 * check on a claim actually grounded at this file — the exact same bar
 * coverageOf has always enforced.
 *
 * DISCLOSED, SHARED RISK (not solved here, out of scope for this slice):
 * this is a new write to the per-turn session state file (st.runs.push +
 * saveState) from INSIDE a PreToolUse hook — previously steer.mjs only
 * ever read state. A background Agent-tool subagent sharing this session's
 * id can already race claude-code-ledger.mjs's own writes to the same file
 * (documented elsewhere in this repo's own memory); this adds one more
 * write point to that same pre-existing, unresolved class of race, not a
 * new kind of risk. Worst case on a lost update is the SAME as today's:
 * a real passing run's coverage silently not being recorded, which denies
 * an edit that should have been allowed — never the reverse.
 */
function tryAutoDerive(ev, f, st, sid) {
  const oldStr = ev.tool_input?.old_string, newStr = ev.tool_input?.new_string;
  if (typeof oldStr !== "string" || typeof newStr !== "string") return { covered: false, evidence: null };
  let derived;
  try { derived = deriveClaimSpec(path.resolve(f), oldStr, newStr); }
  catch (e) { return { covered: false, evidence: `eoreader7 claim-deriver threw building a spec: ${e.message} — hand-author a claim instead.` }; }
  if (derived.status !== "derived") {
    return { covered: false, evidence: `eoreader7 claim-deriver: could not auto-derive a claim for this edit (${derived.reason}) — hand-author one grounded at this file.` };
  }
  const run = runDerivedSpec(derived.spec);
  if (!run) {
    return { covered: false, evidence: "eoreader7 claim-deriver: a claim was derived, but checking it through reason.mjs did not come back cleanly — hand-author one instead." };
  }
  st.runs.push(run);
  saveState(sid, st);
  return { covered: coverageOf(st, f).covered, evidence: null };
}

/** Spawns `node reason.mjs <tmp spec> --json` SYNCHRONOUSLY (this hook
 *  must decide allow/deny before returning) with an 8s timeout, safely
 *  under this hook's own 10s budget (settings.local.json). Returns a run
 *  object in the exact shape claude-code-state.mjs's coverageOf already
 *  expects ({ok, grounds, declaredClaims}), or null on ANY failure — a
 *  timeout, a spawn error, output that doesn't parse — which the caller
 *  above treats identically to "not covered". Whether reason.mjs itself
 *  exits 0 (ok) or 1 (a real, reported failure) it still prints valid
 *  --json on stdout, so both are parsed the same way; only a genuine
 *  crash/timeout returns null. */
function runDerivedSpec(spec) {
  let tmp = null;
  try {
    tmp = path.join(os.tmpdir(), `eo-claim-deriver-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(tmp, JSON.stringify(spec));
    const r = spawnSync(process.execPath, [REASON, tmp, "--json"], { encoding: "utf8", timeout: 8000 });
    if (r.error) return null;
    const out = JSON.parse(r.stdout);
    return { at: new Date().toISOString(), ok: !!out.ok, grounds: out.grounds ?? [], declaredClaims: out.declaredClaims ?? [] };
  } catch { return null; }
  finally { if (tmp) { try { fs.unlinkSync(tmp); } catch {} } }
}

function main() {
  const ev = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  if (steeringOff()) return;
  const st = loadState(sidOf(ev));
  const tool = ev.tool_name;
  let blocked = null;
  if (tool === "Edit" || tool === "Write" || tool === "NotebookEdit" || tool === "MultiEdit") {
    const f = ev.tool_input?.file_path ?? ev.tool_input?.notebook_path;
    if (f && !exempt(f) && !coverageOf(st, f).covered) {
      const auto = tool === "Edit" ? tryAutoDerive(ev, f, st, sidOf(ev)) : { covered: false, evidence: null };
      if (!auto.covered) blocked = denial([path.resolve(f)], st, `${tool} would change a file the engine has not passed reasoning about.`, auto.evidence);
    }
  } else if (tool === "Bash") {
    const { targets, commits } = bashIntent(ev.tool_input?.command ?? "", ev.cwd);
    const open = targets.filter((f) => !exempt(f) && !coverageOf(st, f).covered);
    if (open.length) blocked = denial(open, st, "this command would change file(s) the engine has not passed reasoning about.");
    else if (commits) {
      const changed = Object.keys(st.changed ?? {}).filter((f) => !exempt(f) && !coverageOf(st, f).covered);
      if (changed.length) blocked = denial(changed, st, "`git commit` — files this turn changed are not covered by passing reasoning.");
    }
  }
  if (blocked) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: blocked } }));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  try { main(); } catch (e) { logError("claude-code-steer", e); }
  process.exit(0);
}
