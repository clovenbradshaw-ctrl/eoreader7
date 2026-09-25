// tests/claude-code-doorway.test.mjs — Claude Code through the proxy's doorway
// (claude-code-doorway.mjs), driven by the eo-reason plugin's own forwarder
// and eo-reason command. The doorway is mounted on a bare HTTP server the way
// proxy.mjs mounts it; a temporary HOME keeps real session state untouched.
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "cc-doorway-"));
process.env.HOME = HOME; // the hook scripts the doorway runs inherit it
// EO_LEDGER_DIR (2026-09-25, found live): this file's own PASSING/eo-reason
// fixtures name no `session`, so cli/reason.mjs falls back to whatever real
// CLAUDE_CODE_SESSION_ID this suite happens to run under — 39 fixture lines
// were found landed under six real sessions in the shared claims ledger
// before this. doorway.mjs's own spawn() (line ~73) sets no `env` key, so it
// inherits process.env exactly as Node's child_process default does; setting
// this once here, the same idiom as process.env.HOME above, reaches every
// child hop (this test's run() -> doorway's spawn -> reason.mjs) with no
// per-call plumbing.
process.env.EO_LEDGER_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "cc-doorway-ledger-"));
const { route, handlersFor } = await import("../claude-code-doorway.mjs");
const { engineRunOf } = await import("../cli/claude-code-state.mjs");

const FORWARD = path.join(ROOT, "claude-code", "scripts", "run.sh");
const EO_REASON = path.join(ROOT, "claude-code", "bin", "eo-reason");
const SID = `cc-doorway-test-${process.pid}`;
const FILE = "/srv/cc-doorway-test/app.js"; // outside every exempt root

const serve = (handler) => new Promise((resolve) => {
  const s = http.createServer(handler);
  s.listen(0, "127.0.0.1", () => resolve({ s, url: `http://127.0.0.1:${s.address().port}` }));
});
const { s: server, url: URL_ } = await serve(async (req, res) => { if (!(await route(req, res))) { res.writeHead(404); res.end(); } });
const { s: old, url: OLD_URL } = await serve((req, res) => { res.writeHead(404); res.end(); }); // a proxy without the doorway
const { s: gone, url: DEAD_URL } = await serve(() => {});
gone.close();

test.after(() => {
  server.close(); old.close();
  fs.rmSync(HOME, { recursive: true, force: true });
  fs.rmSync(process.env.EO_LEDGER_DIR, { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, "documents", `claude-code-${SID}:1.jsonl`), { force: true });
});

// Async, never spawnSync: the doorway answers from this same process.
const run = (cmd, args, input, env = {}) => new Promise((resolve) => {
  const child = spawn(cmd, args, { env: { ...process.env, ...env } });
  let out = "", err = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { err += d; });
  child.on("close", (code) => resolve({ code, out, err }));
  child.stdin.end(input ?? "");
});
const forward = (ev, url = URL_, arg = []) => run("sh", [FORWARD, ...arg], JSON.stringify(ev), { ER7_URL: url });
const eoReason = (args, spec) => run("sh", [EO_REASON, ...args], spec == null ? "" : JSON.stringify(spec), { ER7_URL: URL_ });
const event = (hook_event_name, extra = {}) => ({ session_id: SID, hook_event_name, cwd: ROOT, transcript_path: "/dev/null", ...extra });
const PASSING = { claims: [{ ground: FILE, rel: "renders", roles: { ARG0: "app", ARG1: "page" }, polarity: "+", force: "strict" }] };

test("the engine's table decides which handlers an event gets", () => {
  assert.deepEqual(handlersFor(event("PreToolUse", { tool_name: "Read" })), []);
  assert.deepEqual(handlersFor(event("PreToolUse", { tool_name: "Write" })).map((h) => h.script), ["cli/claude-code-steer.mjs"]);
  assert.deepEqual(handlersFor(event("Stop")).map((h) => h.script), ["cli/claude-code-ledger.mjs", "cli/claude-code-reason-gate.mjs"]);
  assert.deepEqual(handlersFor(event("SubagentStop")), []);
});

test("forwarded through the plugin: an unreasoned edit is denied, a read passes, and an unreasoned turn cannot stop", async () => {
  await forward(event("UserPromptSubmit", { prompt: "edit the app" }));
  const write = await forward(event("PreToolUse", { tool_name: "Write", tool_input: { file_path: FILE, content: "x" } }));
  assert.equal(write.code, 0);
  assert.equal(JSON.parse(write.out).hookSpecificOutput.permissionDecision, "deny");
  const read = await forward(event("PreToolUse", { tool_name: "Read", tool_input: { file_path: FILE } }));
  assert.equal(read.out, "");
  const stop = await forward(event("Stop", { stop_hook_active: false }));
  assert.equal(JSON.parse(stop.out).decision, "block");
  assert.ok(fs.existsSync(path.join(ROOT, "documents", `claude-code-${SID}:1.jsonl`)), "the ledger wrote the session's events");
});

test("eo-reason reaches reason.mjs through the doorway, and a passing run it prints then covers the edit", async () => {
  const r = await eoReason(["/dev/stdin", "--ants"], PASSING);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /eoreader7 reason ·.*→ .*OK/);
  assert.ok(engineRunOf("eo-reason /tmp/claims.json --ants", r.out)?.ok, "the ledger's run detector accepts eo-reason's output");
  assert.equal(engineRunOf("echo eo-reason", "nothing ran"), null);
  await forward(event("PostToolUse", { tool_name: "Bash", tool_input: { command: "eo-reason /tmp/claims.json --ants" }, tool_response: { stdout: r.out, stderr: "" }, tool_use_id: "t1" }));
  const write = await forward(event("PreToolUse", { tool_name: "Write", tool_input: { file_path: FILE, content: "x" } }));
  assert.equal(write.out, "", "covered by the passing run, so not denied");
});

test("eo-reason: a contradiction is a verdict with exit 1, --json is JSON, --help is reason.mjs's own header, an unknown flag is refused", async () => {
  const bad = await eoReason(["--json"], { claims: [PASSING.claims[0], { ...PASSING.claims[0], polarity: "-" }] });
  assert.equal(bad.code, 1);
  assert.ok(JSON.parse(bad.out).findings.some((f) => f.kind === "polarity_contradiction"));
  const help = await eoReason(["--help"]);
  assert.match(help.out, /cli\/reason\.mjs/);
  const unknown = await eoReason(["--bogus"], PASSING);
  assert.equal(unknown.code, 2);
  assert.match(unknown.out, /unknown_reason_flag/);
});

test("the forwarder fails open: nothing for Claude to act on, and at session start it says why", async () => {
  const quiet = await forward(event("PreToolUse", { tool_name: "Write", tool_input: { file_path: FILE } }), DEAD_URL);
  assert.equal(quiet.code, 0);
  assert.equal(quiet.out, "");
  const down = await forward(event("SessionStart"), DEAD_URL, ["SessionStart"]);
  assert.match(JSON.parse(down.out).systemMessage, /not answering/);
  const stale = await forward(event("SessionStart"), OLD_URL, ["SessionStart"]);
  assert.match(JSON.parse(stale.out).systemMessage, /no Claude Code doorway/);
});
