// claude-code-doorway.mjs — CLAUDE CODE, AS A CLIENT OF THE ONE PIPELINE
// (2026-09-22).
//
// Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
//
// Every other surface reaches eoreader7 through this proxy: the TUI and the
// browser are thin clients over the same API, and /v1/messages speaks
// Anthropic's protocol so Claude Code's own model calls can come here too.
// Claude Code's HOOKS were the one surface still running beside the pipeline,
// as scripts the eo-reason plugin launched by name. This module is their
// doorway. The plugin (claude-code/) forwards every hook event here and
// carries no eoreader7 logic, so it never changes when the engine does:
//
//   POST /v1/hooks/claude-code   Claude Code's hook event in, verbatim; the
//                                hook answer out, verbatim. What each event
//                                does is the HOOKS table below.
//   POST /v1/reason              cli/reason.mjs as a door on the API: a spec
//                                in (claims, inferences, universals,
//                                equations, order), its verdict out, for any
//                                caller. Flags in x-er7-reason-flags (--ants
//                                --json --compact), the caller's working
//                                directory in x-er7-cwd, reason.mjs's exit
//                                code back in x-er7-exit.
//   GET  /v1/reason              reason.mjs's own header: the input format,
//                                stated once, where the engine keeps it.
//   GET  /v1/surface              the citation/grounding report cli/reason-
//                                surface.mjs already generated for the
//                                caller's own project (x-er7-cwd) — never
//                                regenerated here, only served, so the
//                                claude-code/skills/citations skill works
//                                the same way eo-reason does: through the
//                                proxy, from any project, not by reading
//                                this checkout's filesystem directly.
//
// HANDLERS are the engine's hook scripts (cli/claude-code-*.mjs), run with the
// event on stdin: the contract Claude Code itself uses, so each script stays
// the one implementation. A script missing from this checkout is skipped; one
// that fails, or is still running when the event's time is up, contributes
// nothing, and the hook lets Claude carry on (fail open). Both are logged.
//
// ONE ANSWER per event. An event's handlers run in table order (the Stop gate
// reads the session state the ledger has just written). A blocking answer (a
// Stop "block", a PreToolUse "deny") wins; otherwise the last answer given.
//
// TIME. The plugin gives each hook 10 s and its curl gives up at 9 s, so an
// event's handlers share 8 s. eo-reason waits 120 s, so a reasoning run gets
// 110 s (a spec with long "text" is read by the reader, which takes time).
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { surfaceFileFor } from "./native/organs/reasoning-record.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REASON = path.join(HERE, "cli", "reason.mjs");
const EVENT_BUDGET_MS = 8000;
const REASON_BUDGET_MS = 110000;

export const HOOKS = [
  { event: "UserPromptSubmit", script: "cli/claude-code-ledger.mjs" },
  { event: "PreToolUse", tools: new Set(["Edit", "Write", "NotebookEdit", "MultiEdit", "Bash"]), script: "cli/claude-code-steer.mjs" },
  { event: "PostToolUse", script: "cli/claude-code-ledger.mjs" },
  { event: "Stop", script: "cli/claude-code-ledger.mjs" },
  { event: "Stop", script: "cli/claude-code-reason-gate.mjs" },
];

export const handlersFor = (ev) =>
  HOOKS.filter((h) => h.event === ev?.hook_event_name && (!h.tools || h.tools.has(ev?.tool_name)));

function runNode(script, args, input, { cwd = HERE, timeoutMs }) {
  return new Promise((resolve) => {
    let out = "", err = "", timedOut = false;
    const child = spawn(process.execPath, [script, ...args], { cwd, stdio: ["pipe", "pipe", "pipe"] });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.stdin.on("error", () => {});
    child.on("error", (e) => { clearTimeout(timer); resolve({ code: null, out, err: String(e?.message ?? e), timedOut }); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, out, err, timedOut }); });
    child.stdin.end(input);
  });
}

const blocks = (answer) => {
  try { const j = JSON.parse(answer); return j?.decision === "block" || j?.hookSpecificOutput?.permissionDecision === "deny"; } catch { return false; }
};

export async function answerHook(ev, { log = () => {} } = {}) {
  const deadline = Date.now() + EVENT_BUDGET_MS;
  const answers = [];
  for (const h of handlersFor(ev)) {
    const script = path.join(HERE, h.script);
    if (!fs.existsSync(script)) { log(`claude-code: ${h.script} is not in this checkout; skipped`); continue; }
    const left = deadline - Date.now();
    if (left <= 0) { log(`claude-code: ${ev.hook_event_name} ran out of time before ${h.script}`); break; }
    const r = await runNode(script, [], JSON.stringify(ev), { timeoutMs: left });
    if (r.timedOut || r.code !== 0) { log(`claude-code: ${h.script} ${r.timedOut ? "timed out" : `exited ${r.code}`}${r.err ? `: ${r.err.split("\n")[0]}` : ""}`); continue; }
    if (r.out.trim()) answers.push(r.out.trim());
  }
  return answers.find(blocks) ?? answers[answers.length - 1] ?? "";
}

const REASON_FLAGS = new Set(["--ants", "--json", "--compact"]);

export async function runReason(spec, flags = [], cwd = null) {
  const unknown = flags.filter((f) => !REASON_FLAGS.has(f));
  if (unknown.length) return { status: 400, type: "application/json", body: JSON.stringify({ error: { type: "unknown_reason_flag", message: `unknown flag(s): ${unknown.join(" ")}; known: ${[...REASON_FLAGS].join(" ")}` } }) };
  try { JSON.parse(spec); } catch (e) {
    return { status: 400, type: "application/json", body: JSON.stringify({ error: { type: "spec_not_json", message: `the spec is not JSON: ${e.message}` } }) };
  }
  const dir = cwd && path.isAbsolute(cwd) && fs.existsSync(cwd) ? cwd : HERE;
  const r = await runNode(REASON, flags, spec, { cwd: dir, timeoutMs: REASON_BUDGET_MS });
  // Exit 0 is a pass and 1 a verdict with errors; anything else is a crash,
  // and then its stderr is the answer.
  const crashed = r.timedOut || (r.code !== 0 && r.code !== 1);
  const body = crashed ? `${r.out}${r.err || (r.timedOut ? `eoreader7 reason: no verdict within ${REASON_BUDGET_MS / 1000} s\n` : "")}` : r.out;
  return { status: 200, type: flags.includes("--json") && !crashed ? "application/json" : "text/plain; charset=utf-8", body, exit: r.timedOut ? 124 : r.code ?? 1 };
}

// reason.mjs's leading comment block, as written there.
export function reasonFormat() {
  const lines = fs.readFileSync(REASON, "utf8").split("\n");
  const head = [];
  for (const l of lines) {
    if (l.startsWith("#!")) continue;
    if (!l.startsWith("//")) break;
    head.push(l.slice(l.startsWith("// ") ? 3 : 2));
  }
  return head.join("\n") + "\n";
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw;
}

// Handles the doorway's requests; returns false for anything else, so the
// proxy mounts it with one line ahead of its other routes.
export async function route(req, res, { log = () => {} } = {}) {
  const url = String(req.url ?? "").split("?")[0];
  if (req.method === "POST" && url === "/v1/hooks/claude-code") {
    const raw = await readBody(req);
    let ev;
    try { ev = JSON.parse(raw || "{}"); } catch (e) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { type: "event_not_json", message: e.message } }));
      return true;
    }
    const answer = await answerHook(ev, { log });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(answer);
    return true;
  }
  if (url === "/v1/reason" && req.method === "GET") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end(reasonFormat());
    return true;
  }
  if (url === "/v1/reason" && req.method === "POST") {
    const spec = await readBody(req);
    const flags = String(req.headers["x-er7-reason-flags"] ?? "").split(/\s+/).filter(Boolean);
    const r = await runReason(spec, flags, String(req.headers["x-er7-cwd"] ?? "") || null);
    res.writeHead(r.status, { "content-type": r.type, ...(r.exit != null ? { "x-er7-exit": String(r.exit) } : {}) });
    res.end(r.body);
    return true;
  }
  if (url === "/v1/surface" && req.method === "GET") {
    // The caller's own project, same header eo-reason already sends — a
    // request with none is refused rather than guessed at (HERE, this
    // checkout's own root, is a real directory and would silently answer
    // for the wrong project if used as a fallback here).
    const cwd = String(req.headers["x-er7-cwd"] ?? "");
    if (!cwd) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { type: "missing_cwd", message: "x-er7-cwd is required — the surface is scoped per calling project, never guessed" } }));
      return true;
    }
    const file = surfaceFileFor(cwd);
    let html;
    try { html = fs.readFileSync(file, "utf8"); } catch {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { type: "no_surface_yet", message: `no reasoning has run yet for this project (looked for ${file}) — run eo-reason first` } }));
      return true;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return true;
  }
  return false;
}
