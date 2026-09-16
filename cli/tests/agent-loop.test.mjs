// Real HTTP round-trips against a stand-in Ollama /api/chat server (no
// mocking library) — drives the actual ReAct loop end to end: tool calls,
// read-only execution, a real confirm gate on write_file, a malformed
// response recovering via the retry message, and the turn cap.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runAgentTurn, AGENT_MAX_TURNS } from "../agent-loop.mjs";

function startFakeOllama(scriptFn) {
  let call = 0;
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const parsed = JSON.parse(body);
      call += 1;
      const content = scriptFn(call, parsed.messages);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: { role: "assistant", content } }));
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

function tmpWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-agent-test-"));
  fs.writeFileSync(path.join(dir, "a.txt"), "hello\n");
  return dir;
}

test("read_file then final_answer — a clean two-turn loop", async () => {
  const { server, url } = await startFakeOllama((call) => {
    if (call === 1) return '```json\n{"tool": "read_file", "args": {"path": "a.txt"}}\n```';
    return '```json\n{"tool": "final_answer", "args": {"text": "the file says hello"}}\n```';
  });
  const events = [];
  const res = await runAgentTurn({
    model: "test-model", ollamaUrl: url, task: "what does a.txt say?",
    cwd: tmpWorkspace(), onEvent: (e) => events.push(e),
  });
  await new Promise((r) => server.close(r));

  assert.equal(res.done, true);
  assert.equal(res.text, "the file says hello");
  assert.ok(events.some((e) => e.type === "tool-call" && e.tool === "read_file"));
  assert.ok(events.some((e) => e.type === "tool-result" && e.result.ok === true));
  assert.ok(events.some((e) => e.type === "final"));
});

test("write_file waits for confirm and is not written when rejected", async () => {
  const dir = tmpWorkspace();
  const { server, url } = await startFakeOllama((call) => {
    if (call === 1) return '```json\n{"tool": "write_file", "args": {"path": "new.txt", "content": "hi\\n"}}\n```';
    return '```json\n{"tool": "final_answer", "args": {"text": "gave up, rejected"}}\n```';
  });
  const confirms = [];
  const res = await runAgentTurn({
    model: "test-model", ollamaUrl: url, task: "write a file",
    cwd: dir, onEvent: () => {}, confirm: async (req) => { confirms.push(req); return false; },
  });
  await new Promise((r) => server.close(r));

  assert.equal(confirms.length, 1);
  assert.equal(confirms[0].tool, "write_file");
  assert.equal(fs.existsSync(path.join(dir, "new.txt")), false, "a rejected write must not touch disk");
  assert.equal(res.done, true);
});

test("write_file is actually written to a real file when confirm approves", async () => {
  const dir = tmpWorkspace();
  const { server, url } = await startFakeOllama((call) => {
    if (call === 1) return '{"tool": "write_file", "args": {"path": "new.txt", "content": "approved content\\n"}}';
    return '{"tool": "final_answer", "args": {"text": "wrote it"}}';
  });
  const res = await runAgentTurn({
    model: "test-model", ollamaUrl: url, task: "write a file",
    cwd: dir, onEvent: () => {}, confirm: async () => true,
  });
  await new Promise((r) => server.close(r));

  assert.equal(fs.readFileSync(path.join(dir, "new.txt"), "utf8"), "approved content\n");
  assert.equal(res.done, true);
});

test("run_command executes for real only after approval and reports real exit code", async () => {
  const dir = tmpWorkspace();
  const { server, url } = await startFakeOllama((call) => {
    if (call === 1) return '{"tool": "run_command", "args": {"command": "echo agent-ran-this"}}';
    return '{"tool": "final_answer", "args": {"text": "ran it"}}';
  });
  const events = [];
  const res = await runAgentTurn({
    model: "test-model", ollamaUrl: url, task: "run something",
    cwd: dir, onEvent: (e) => events.push(e), confirm: async () => true,
  });
  await new Promise((r) => server.close(r));

  const toolResult = events.find((e) => e.type === "tool-result" && e.tool === "run_command");
  assert.equal(toolResult.result.exitCode, 0);
  assert.match(toolResult.result.stdout, /agent-ran-this/);
  assert.equal(res.done, true);
});

test("a malformed response is surfaced as a typed gap and the loop recovers", async () => {
  const { server, url } = await startFakeOllama((call) => {
    if (call === 1) return "I'll just chat instead of calling a tool, oops.";
    return '{"tool": "final_answer", "args": {"text": "recovered"}}';
  });
  const events = [];
  const res = await runAgentTurn({
    model: "test-model", ollamaUrl: url, task: "hi",
    cwd: tmpWorkspace(), onEvent: (e) => events.push(e),
  });
  await new Promise((r) => server.close(r));

  assert.ok(events.some((e) => e.type === "parse-error"));
  assert.equal(res.done, true);
  assert.equal(res.text, "recovered");
});

test("the turn cap stops an infinitely-looping model without hanging", async () => {
  const { server, url } = await startFakeOllama(() => '{"tool": "list_dir", "args": {}}');
  const events = [];
  const res = await runAgentTurn({
    model: "test-model", ollamaUrl: url, task: "loop forever",
    cwd: tmpWorkspace(), maxTurns: 3, onEvent: (e) => events.push(e),
  });
  await new Promise((r) => server.close(r));

  assert.equal(res.done, false);
  assert.equal(res.capped, true);
  assert.ok(events.some((e) => e.type === "turn-cap"));
});

test("AGENT_MAX_TURNS is a small, disclosed constant, not unbounded", () => {
  assert.equal(typeof AGENT_MAX_TURNS, "number");
  assert.ok(AGENT_MAX_TURNS > 0 && AGENT_MAX_TURNS <= 100);
});
