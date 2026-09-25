// tests/claude-code-steer-derive.test.mjs — claude-code-steer.mjs's new
// auto-derive path (native/organs/claim-deriver.js wired into the Edit
// branch), run as a REAL subprocess against isolated session state (a
// temp HOME, mirroring tests/reason-cli.test.mjs's own steer: tests
// exactly) and an isolated reasoning ledger (EO_LEDGER_DIR), so the actual
// reason.mjs run steer.mjs spawns internally never touches the real
// shared documents/eoreader7-reasoning:1.jsonl or any real session.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const STEER = path.join(ROOT, "cli", "claude-code-steer.mjs");
const LEDGER = path.join(ROOT, "cli", "claude-code-ledger.mjs");
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "steer-derive-"));
const EO_LEDGER_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "steer-derive-ledger-"));
const env = { ...process.env, HOME, EO_LEDGER_DIR };
const TARGET = path.join(ROOT, "cli", "__steer_derive_target.mjs"); // never actually written

const run = (file, input) => spawnSync("node", [file], { input: JSON.stringify(input), env, encoding: "utf8" });
const pre = (sid, tool, input) => { const r = run(STEER, { session_id: sid, hook_event_name: "PreToolUse", tool_name: tool, tool_input: input, cwd: ROOT }); return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput : null; };
const turn = (sid) => run(LEDGER, { session_id: sid, hook_event_name: "UserPromptSubmit", prompt: "t" });
const sessionState = (sid) => JSON.parse(fs.readFileSync(path.join(HOME, ".claude", "eo-reason", "sessions", `${sid}.json`), "utf8"));
const cleanup = (sid) => fs.rmSync(path.join(ROOT, "documents", `claude-code-${sid}:1.jsonl`), { force: true });

test("a clean identifier-rename Edit, zero prior coverage, is ALLOWED via a real auto-derived + auto-run reason.mjs check", () => {
  const sid = `derive1${Date.now()}`;
  try {
    turn(sid);
    const before = pre(sid, "Edit", { file_path: TARGET, old_string: "const oldName = 1;", new_string: "const newName = 1;" });
    assert.equal(before, null, "the derived claim must pass and allow the edit with zero hand-authored JSON");
    const st = sessionState(sid);
    assert.equal(st.runs.length, 1, "a real run must be recorded");
    assert.equal(st.runs[0].ok, true);
    assert.ok(st.runs[0].grounds.includes(path.resolve(TARGET)), "the recorded run's grounds must include the actual target file");
    assert.equal(st.runs[0].declaredClaims?.[0]?.derivedBy, "claim-deriver", "the derived claim's own provenance tag must be recorded");
  } finally { cleanup(sid); }
});

test("ADVERSARIAL — an ambiguous Edit (a bundled rename+logic change) is STILL DENIED, exactly as before this feature existed", () => {
  const sid = `derive2${Date.now()}`;
  try {
    turn(sid);
    const d = pre(sid, "Edit", { file_path: TARGET, old_string: "if (x > 0) { return oldName; }", new_string: "if (x >= 0) { return newName; }" });
    assert.equal(d?.permissionDecision, "deny", "an ambiguous diff must never be silently allowed");
    assert.match(d.permissionDecisionReason, /claim-deriver/, "the denial should disclose that auto-derivation was tried and could not cleanly classify this edit");
    const st = sessionState(sid);
    assert.equal((st.runs ?? []).length, 0, "nothing should have been auto-run for an ambiguous edit");
  } finally { cleanup(sid); }
});

test("ADVERSARIAL — a Write (not Edit) with old_string/new_string-shaped input never triggers auto-derive; still denied", () => {
  const sid = `derive3${Date.now()}`;
  try {
    turn(sid);
    const d = pre(sid, "Write", { file_path: TARGET, old_string: "const a = 1;", new_string: "const b = 1;" });
    assert.equal(d?.permissionDecision, "deny", "auto-derive is scoped to Edit only in this first slice");
    assert.doesNotMatch(d.permissionDecisionReason, /claim-deriver/, "a Write must not even attempt auto-derivation");
  } finally { cleanup(sid); }
});

test("steer.off still bypasses everything, including the new auto-derive path", () => {
  const sid = `derive4${Date.now()}`;
  fs.mkdirSync(path.join(HOME, ".claude", "eo-reason"), { recursive: true });
  fs.writeFileSync(path.join(HOME, ".claude", "eo-reason", "steer.off"), "");
  try {
    turn(sid);
    const d = pre(sid, "Edit", { file_path: TARGET, old_string: "if (x > 0) { return oldName; }", new_string: "if (x >= 0) { return newName; }" });
    assert.equal(d, null, "steer.off means nothing is ever denied, ambiguous or not");
  } finally {
    fs.rmSync(path.join(HOME, ".claude", "eo-reason", "steer.off"));
    cleanup(sid);
  }
});

test("a real Edit already covered by a hand-authored run does not attempt auto-derivation at all (no regression to the existing path)", () => {
  const sid = `derive5${Date.now()}`;
  try {
    turn(sid);
    const specPath = path.join(EO_LEDGER_DIR, "hand-spec.json");
    fs.writeFileSync(specPath, JSON.stringify({ claims: [{ ground: TARGET, rel: "holds", roles: { ARG0: "a", ARG1: "b" }, said: "a holds b" }] }));
    const reasonAbs = path.join(ROOT, "cli", "reason.mjs");
    const r = spawnSync("node", [reasonAbs, specPath, "--json"], { env, encoding: "utf8" });
    assert.equal(r.status, 0);
    // engineRunOf (claude-code-state.mjs) only recognizes a command whose
    // TEXT contains "cli/reason.mjs" (or "eo-reason") — matching
    // tests/reason-cli.test.mjs's own engineRun() helper, which uses the
    // full absolute REASON path for exactly this reason.
    run(LEDGER, { session_id: sid, hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: `node ${reasonAbs} ${specPath}` }, tool_response: { stdout: r.stdout } });
    const d = pre(sid, "Edit", { file_path: TARGET, old_string: "if (x > 0) { return oldName; }", new_string: "if (x >= 0) { return newName; }" });
    assert.equal(d, null, "already-covered by a real hand-authored run must allow, unchanged");
  } finally { cleanup(sid); }
});
