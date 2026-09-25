// tests/reason-cli.test.mjs — cli/reason.mjs and the two Claude Code hooks,
// run as real processes (a temporary HOME, so real session state is untouched;
// EO_LEDGER_DIR isolates cli/reason.mjs's own shared claims ledger the same
// way tests/reasoning-claims-ledger.test.mjs does — found live 2026-09-25,
// this file's own GFP fixtures, run with no `session` in their spec and thus
// falling back to whatever real CLAUDE_CODE_SESSION_ID this suite happened
// to run under, had been landing in documents/eoreader7-reasoning:1.jsonl,
// the real shared ledger, under real session ids — claude-code-ledger.mjs's
// OWN ledger (the one this file's own LEDGER tests read, at a hard-coded
// ROOT/documents path) does not read EO_LEDGER_DIR at all, so this isolates
// only cli/reason.mjs's calls, leaving every existing LEDGER/GATE assertion
// in this file untouched).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bashIntent } from "../cli/claude-code-steer.mjs";

const ROOT =path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const REASON = path.join(ROOT, "cli", "reason.mjs");
const LEDGER = path.join(ROOT, "cli", "claude-code-ledger.mjs");
const GATE = path.join(ROOT, "cli", "claude-code-reason-gate.mjs");
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "reason-cli-"));
const EO_LEDGER_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "reason-cli-ledger-"));
const env = { ...process.env, HOME, EO_LEDGER_DIR };
const run = (file, input, args = []) => spawnSync("node", [file, ...args], { input: typeof input === "string" ? input : JSON.stringify(input), env, encoding: "utf8" });
const reason = (spec) => { const r = run(REASON, spec, ["--json"]); return { code: r.status, out: JSON.parse(r.stdout) }; };

test("reason: a false time claim is convicted by the oracle; a true one holds", () => {
  const bad = reason({ equations: [{ ref: "t", statement: "16:13:55 - 16:12:41 >= 600" }] });
  assert.equal(bad.code, 1);
  assert.ok(bad.out.findings.some((f) => f.kind === "claim_fails_oracle"));
  const good = reason({ equations: [{ ref: "t", statement: "16:22:41 - 16:12:41 == 600" }] });
  assert.equal(good.code, 0);
});

test("reason: an order claim the prerequisites do not force is refuted with a counterexample order", () => {
  const r = reason({ order: { items: ["a", "b", "c"], before: [["a", "c"]], claims: [{ ref: "o", first: "b", then: "a" }] } });
  assert.equal(r.code, 1);
  assert.match(r.out.findings.find((f) => f.kind === "order_not_entailed").detail, /a consistent order puts a first/);
});

test("reason: an order claim naming an id outside order.items is a disclosed finding, not a crash — topo's indegree bookkeeping cannot cover an id it was never told about", () => {
  const r = reason({ order: { items: ["a", "b"], before: [["a", "b"]], claims: [{ ref: "o", first: "a", then: "z" }] } });
  assert.equal(r.code, 1);
  assert.equal(r.out.findings.find((f) => f.kind === "order_item_undeclared")?.detail.includes("z"), true);
});

test("reason: a reflexive order claim ('x must precede x') is refused, never reported as entailed — a bare self-loop is not a proof, and would falsely 'entail' for ANY item regardless of the declared prerequisites", () => {
  const r = reason({ order: { items: ["x"], before: [], claims: [{ ref: "o", first: "x", then: "x" }] } });
  assert.equal(r.code, 1);
  assert.equal(r.out.findings.some((f) => f.kind === "order_entailed"), false, "must never be reported as entailed");
  assert.equal(r.out.findings.some((f) => f.kind === "order_reflexive_claim"), true);
});

test("reason: GFP claims — siblings apart, a same-scope contradiction convicted", () => {
  const C = (g, v, p = "+") => ({ ground: g, rel: "has-type", roles: { ARG0: "x", ARG1: v }, polarity: p });
  assert.equal(reason({ declare: { functional: ["has-type"] }, claims: [C("/a", "int"), C("/b", "string")] }).code, 0);
  assert.equal(reason({ declare: { functional: ["has-type"] }, claims: [C("/a", "int"), C("/a", "string")] }).code, 1);
});

test("ledger: every event is recorded under its holon, and secrets never reach disk", () => {
  const sid = `test${Date.now()}`;
  const file = path.join(ROOT, "documents", `claude-code-${sid}:1.jsonl`);
  try {
    run(LEDGER, { session_id: sid, hook_event_name: "UserPromptSubmit", prompt: "hi" });
    run(LEDGER, { session_id: sid, hook_event_name: "PostToolUse", tool_name: "Bash", tool_use_id: "u1", tool_input: { command: "export K=sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789" }, tool_response: { stdout: "api_key: supersecretvalue123" } });
    const lines = fs.readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(lines.map((l) => l.title), [`/${sid}/t1`, `/${sid}/t1/Bash`]);
    assert.equal(lines.every((l) => l.schema === "EOTObservation@1"), true);
    const raw = fs.readFileSync(file, "utf8");
    assert.equal(/sk-ant-api03|supersecretvalue/.test(raw), false, "no secret on disk");
  } finally { fs.rmSync(file, { force: true }); }
});

test("gate: blocks an unreasoned turn once; merely mentioning reason.mjs does not count; a real run does", () => {
  const sid = `gate${Date.now()}`;
  const file = path.join(ROOT, "documents", `claude-code-${sid}:1.jsonl`);
  try {
    run(LEDGER, { session_id: sid, hook_event_name: "UserPromptSubmit", prompt: "q" });
    const blocked = run(GATE, { session_id: sid, hook_event_name: "Stop", stop_hook_active: false });
    assert.equal(JSON.parse(blocked.stdout).decision, "block");
    assert.equal(run(GATE, { session_id: sid, hook_event_name: "Stop", stop_hook_active: true }).stdout, "", "never blocks twice");
    run(LEDGER, { session_id: sid, hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: "cat cli/reason.mjs" }, tool_response: { stdout: "#!/usr/bin/env node" } });
    assert.equal(JSON.parse(run(GATE, { session_id: sid, hook_event_name: "Stop" }).stdout).decision, "block", "reading the file is not reasoning");
    run(LEDGER, { session_id: sid, hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: `node ${REASON} x.json` }, tool_response: { stdout: "eoreader7 reason · 0 claim(s) → OK" } });
    assert.equal(run(GATE, { session_id: sid, hook_event_name: "Stop" }).stdout, "", "a real run passes the gate");
  } finally { fs.rmSync(file, { force: true }); }
});

// ── steering: the engine decides BEFORE a file changes ──────────────────────
const STEER = path.join(ROOT, "cli", "claude-code-steer.mjs");
const TARGET = path.join(ROOT, "cli", "__steer_test_target.mjs"); // never written; gates only decide
const pre = (sid, tool, input) => { const r = run(STEER, { session_id: sid, hook_event_name: "PreToolUse", tool_name: tool, tool_input: input, cwd: ROOT }); return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput : null; };
const engineRun = (sid, ok, grounds) => run(LEDGER, { session_id: sid, hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: `node ${REASON} /tmp/s.json` }, tool_response: { stdout: `eoreader7 reason · 1 claim(s) → ${ok ? "OK" : "1 ERROR(S)\n  [error] standing_contradiction @ /x"}\n  grounds: ${JSON.stringify(grounds)}` } });
const turn = (sid) => run(LEDGER, { session_id: sid, hook_event_name: "UserPromptSubmit", prompt: "t" });
const cleanup = (sid) => fs.rmSync(path.join(ROOT, "documents", `claude-code-${sid}:1.jsonl`), { force: true });

test("steer: an Edit to an uncovered file is denied; a passing run grounded at it allows it; a directory ground does not", () => {
  const sid = `steer1${Date.now()}`;
  try {
    turn(sid);
    assert.equal(pre(sid, "Edit", { file_path: TARGET })?.permissionDecision, "deny");
    engineRun(sid, true, [path.dirname(TARGET)]);
    assert.equal(pre(sid, "Edit", { file_path: TARGET })?.permissionDecision, "deny", "a claim above the file does not cover it");
    engineRun(sid, true, [`${TARGET}/main`]);
    assert.equal(pre(sid, "Edit", { file_path: TARGET }), null, "a claim inside the file covers it");
    engineRun(sid, false, [TARGET]);
    const d = pre(sid, "Write", { file_path: TARGET });
    assert.equal(d?.permissionDecision, "deny", "the latest covering run failed");
    assert.match(d.permissionDecisionReason, /FAILED[\s\S]*standing_contradiction/);
    assert.equal(pre(sid, "Edit", { file_path: path.join(os.tmpdir(), "scratch.js") }), null, "temp paths are exempt");
  } finally { cleanup(sid); }
});

test("steer: Bash write targets are read before the command runs; a > inside a heredoc body is not one", () => {
  const sid = `steer2${Date.now()}`;
  try {
    turn(sid);
    assert.equal(pre(sid, "Bash", { command: `cat > ${TARGET} <<'EOF'\nconst f = (a) => a > 1;\nEOF` })?.permissionDecision, "deny");
    assert.equal(pre(sid, "Bash", { command: `python3 - <<'PY'\nprint(1 > 0)\nPY` }), null, "no readable target: allowed, caught afterwards");
    assert.equal(pre(sid, "Bash", { command: "ls > /dev/null 2>&1" }), null);
    engineRun(sid, true, [TARGET]);
    assert.equal(pre(sid, "Bash", { command: `cat > ${TARGET} <<'EOF'\nx\nEOF` }), null);
  } finally { cleanup(sid); }
});

test("steer: a cd it cannot follow leaves the base unknown — a relative target after it is unresolvable, never read against the session cwd", () => {
  const at = (cmd) => bashIntent(cmd, ROOT);
  assert.deepEqual(at("cd cli && cmd > f").targets, [path.join(ROOT, "cli", "f")], "a leading cd moves the base");
  assert.deepEqual(at("true && cd /abs && cmd > f").targets, ["/abs/f"], "so does a literal absolute cd later in a && chain");
  assert.deepEqual(at("cd $X && cd /abs && cmd > f").targets, ["/abs/f"], "an absolute cd grounds an unknown base again");
  for (const cmd of ["( cd $X && cmd > f )", "(cd /abs && cmd > f)", `cd "$X"; cmd > f`, "true || cd /abs; cmd > f", "if t; then cd /abs; fi; cmd > f"]) {
    const r = at(cmd);
    assert.deepEqual([r.targets, r.unknown], [[], ["f"]], cmd);
  }
  assert.deepEqual(at("cd $X && cmd > /abs/f").targets, ["/abs/f"], "an unknown base never loosens an absolute target");
  assert.deepEqual(at("echo $(cd /abs && pwd) > f").targets, [path.join(ROOT, "f")], "a cd inside command substitution moves nothing");
  assert.deepEqual(at("cp a b 2>/dev/null").targets, [path.join(ROOT, "b")], "2> names a descriptor, not the destination");
});

test("steer: the 2026-09-22 false deny — ( cd $SP && … > out 2>&1 ) writes under $SP, so it is allowed; a followable cd still gates", () => {
  const sid = `steer6${Date.now()}`;
  try {
    turn(sid);
    assert.equal(pre(sid, "Bash", { command: "SP=/private/tmp/x; ( cd $SP && node dist/reason.mjs spec.json --ants > out-bundle.txt 2>&1 )" }), null);
    assert.equal(pre(sid, "Bash", { command: `cd ${path.dirname(TARGET)} && cat > ${path.basename(TARGET)} <<'EOF'\nx\nEOF` })?.permissionDecision, "deny");
  } finally { cleanup(sid); }
});

test("steer: git commit is denied while a file this turn changed is uncovered", () => {
  const sid = `steer3${Date.now()}`;
  try {
    turn(sid);
    run(LEDGER, { session_id: sid, hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: TARGET }, tool_response: {} });
    assert.equal(pre(sid, "Bash", { command: `git -C ${ROOT} commit -m "a > b"` })?.permissionDecision, "deny");
    engineRun(sid, true, [TARGET]);
    assert.equal(pre(sid, "Bash", { command: `GIT_INDEX_FILE=/tmp/i git commit -m m` }), null);
  } finally { cleanup(sid); }
});

test("after a Bash change: a file the command names is fed back if uncovered; one it does not name is unattributed", () => {
  const sid = `steer4${Date.now()}`;
  try {
    turn(sid);
    const other = path.join(ROOT, "native", "someone-elses-file.html");
    const r = run(LEDGER, { session_id: sid, hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: `sed -i '' 's/a/b/' ${TARGET}` }, tool_response: { stdout: "", bashEditDiff: { files: [{ filePath: TARGET }, { filePath: other }] } } });
    const fb = JSON.parse(r.stdout);
    assert.equal(fb.decision, "block");
    assert.match(fb.reason, /__steer_test_target/);
    assert.doesNotMatch(fb.reason, /someone-elses-file/, "a file the command did not name is never held against this session");
    const st = JSON.parse(fs.readFileSync(path.join(HOME, ".claude", "eo-reason", "sessions", `${sid}.json`), "utf8"));
    assert.deepEqual(st.unattributed, [other]);
  } finally { cleanup(sid); }
});

test("stop: blocks once while a changed file is uncovered; passes once covered; the off switch and bad input both pass", () => {
  const sid = `steer5${Date.now()}`;
  try {
    turn(sid);
    run(LEDGER, { session_id: sid, hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: TARGET }, tool_response: {} });
    engineRun(sid, true, ["/elsewhere/other.js"]);
    assert.match(JSON.parse(run(GATE, { session_id: sid, hook_event_name: "Stop" }).stdout).reason, /does not cover/);
    engineRun(sid, true, [TARGET]);
    assert.equal(run(GATE, { session_id: sid, hook_event_name: "Stop" }).stdout, "");
    turn(sid);
    fs.writeFileSync(path.join(HOME, ".claude", "eo-reason", "steer.off"), "");
    assert.equal(pre(sid, "Edit", { file_path: TARGET }), null, "steering off");
    assert.equal(run(GATE, { session_id: sid, hook_event_name: "Stop" }).stdout, "");
    fs.rmSync(path.join(HOME, ".claude", "eo-reason", "steer.off"));
    const bad = run(STEER, "not json");
    assert.equal(bad.status, 0); assert.equal(bad.stdout, "", "a gate that cannot read its input fails open");
  } finally { cleanup(sid); }
});

test("a system notice (task notification, message from another session) keeps the turn and its coverage", () => {
  const sid = `notice${Date.now()}`;
  try {
    turn(sid);
    engineRun(sid, true, [TARGET]);
    run(LEDGER, { session_id: sid, hook_event_name: "UserPromptSubmit", prompt: "<task-notification>\n<task-id>x</task-id>" });
    run(LEDGER, { session_id: sid, hook_event_name: "UserPromptSubmit", prompt: "<cross-session-message from=\"uds:x\">hi</cross-session-message>" });
    assert.equal(pre(sid, "Edit", { file_path: TARGET }), null, "coverage survives the notices");
    turn(sid);
    assert.equal(pre(sid, "Edit", { file_path: TARGET })?.permissionDecision, "deny", "a real user prompt starts a fresh turn");
  } finally { cleanup(sid); }
});
