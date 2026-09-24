// cli/claude-code-state.mjs — the per-session state the Claude Code hooks share
// (2026-09-22): which files this turn changed, which engine runs checked
// reasoning about which grounds, and whether each run passed.
//
// COVERAGE. A file is covered when the latest engine run (cli/reason.mjs) this
// turn that states a claim grounded AT the file — its absolute path, or a
// scope inside it (/…/a.js/f) — passed. A ground ABOVE the file (a directory,
// "/") never covers it: one claim at the root must not buy every file.
//
// STEERING OFF. The file ~/.claude/eo-reason/steer.off turns every steering
// gate off (logging continues). The gates also fail OPEN on their own errors,
// logged to ~/.claude/eo-reason/errors.log — a gate that crashed must never
// lock a session out of fixing it.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { holon, contains } from "../native/kernel/gfp-claim.js";

export const EO_DIR = path.join(os.homedir(), ".claude", "eo-reason");
export const steeringOff = () => fs.existsSync(path.join(EO_DIR, "steer.off"));
export const sidOf = (ev) => String(ev?.session_id ?? "unknown").replace(/[^A-Za-z0-9_-]/g, "");
const stateFile = (sid) => path.join(EO_DIR, "sessions", `${sid}.json`);

// straussian: set by claude-code-ledger.mjs's UserPromptSubmit branch when
// native/organs/askshape.js reads the turn's own ask as harmful — {shape,
// witnesses, turn, at}, or null. Read by cli/claude-code-shape-gate.mjs's
// Stop check. Resets every new turn, same as reasoned/lastReason/runs.
const FRESH = () => ({ turn: 0, turnStart: null, reasoned: false, lastReason: null, runs: [], changed: {}, unattributed: [], straussian: null });
export function loadState(sid) {
  try { return { ...FRESH(), ...JSON.parse(fs.readFileSync(stateFile(sid), "utf8")) }; } catch { return FRESH(); }
}
export function saveState(sid, st) {
  fs.mkdirSync(path.dirname(stateFile(sid)), { recursive: true });
  fs.writeFileSync(stateFile(sid), JSON.stringify(st));
}
export function newTurn(st) {
  return { ...st, turn: st.turn + 1, turnStart: new Date().toISOString(), reasoned: false, lastReason: null, runs: [], changed: {}, unattributed: [], straussian: null };
}

// Places whose files are the harness's own, never code under reasoning.
const EXEMPT_ROOTS = [path.join(os.homedir(), ".claude") + "/", "/tmp/", "/private/tmp/", "/var/folders/", "/private/var/folders/", "/dev/"];
export const exempt = (p) => { const a = path.resolve(String(p)); return EXEMPT_ROOTS.some((r) => a.startsWith(r)); };

export function coverageOf(st, file) {
  const F = holon(path.resolve(String(file)));
  const covering = (st.runs ?? []).filter((r) => (r.grounds ?? []).some((g) => contains(F, holon(g))));
  const latest = covering[covering.length - 1] ?? null;
  return { covered: !!latest && latest.ok, run: latest };
}
export const uncovered = (st, files) => [...new Set(files)].filter((f) => !exempt(f) && !coverageOf(st, f).covered);

/** An engine run, read back from its own output in a Bash result: its verdict
 *  and the grounds of the claims it checked. null when this is not one.
 *  `declaredClaims` is additive: reason.mjs's --json output alone carries it
 *  (its `out.declaredClaims`, verbatim); the plain-text/--compact banner this
 *  function also parses has no such field, so `declaredClaims` comes back
 *  `undefined` for those — every caller must treat it as optional. `ok` and
 *  `grounds` are computed exactly as before, unchanged either way. */
export function engineRunOf(command, toolResponse) {
  // cli/reason.mjs run directly, or through the eo-reason plugin's command
  // (POST /v1/reason on the proxy, which runs the same file). Either way the
  // banner below must be in the output, so naming it is never enough.
  if (!/cli\/reason\.mjs|\beo-reason\b/.test(String(command ?? ""))) return null;
  const stdout = typeof toolResponse === "string" ? toolResponse : String(toolResponse?.stdout ?? "");
  let ok = null, grounds = null, declaredClaims;
  const t = stdout.trim();
  if (t.startsWith("{")) { try { const j = JSON.parse(t); ok = !!j.ok; grounds = j.grounds ?? []; declaredClaims = j.declaredClaims; } catch {} }
  if (ok === null) {
    const banner = /eoreader7 reason ·[^\n]*→ [✓✗]?\s*(OK|\d+ ERROR\(S\))/.exec(stdout);
    if (!banner) return null;
    ok = banner[1] === "OK";
    const g = /^\s*grounds: (\[.*\])\s*$/m.exec(stdout);
    try { grounds = g ? JSON.parse(g[1]) : []; } catch { grounds = []; }
  }
  return { at: new Date().toISOString(), ok, grounds, declaredClaims };
}

export function logError(where, e) {
  try { fs.mkdirSync(EO_DIR, { recursive: true }); fs.appendFileSync(path.join(EO_DIR, "errors.log"), `${new Date().toISOString()} ${where}: ${e?.stack ?? e}\n`); } catch {}
}
