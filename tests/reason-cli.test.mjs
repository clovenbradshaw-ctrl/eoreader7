// tests/reason-cli.test.mjs — cli/reason.mjs and the two Claude Code hooks,
// run as real processes (a temporary HOME, so real session state is untouched).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const REASON = path.join(ROOT, "cli", "reason.mjs");
const LEDGER = path.join(ROOT, "cli", "claude-code-ledger.mjs");
const GATE = path.join(ROOT, "cli", "claude-code-reason-gate.mjs");
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "reason-cli-"));
const env = { ...process.env, HOME };
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
