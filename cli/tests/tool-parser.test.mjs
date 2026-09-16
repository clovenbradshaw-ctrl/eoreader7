import { test } from "node:test";
import assert from "node:assert/strict";
import { parseToolCall, KNOWN_TOOLS } from "../tool-parser.mjs";

test("parses a fenced json tool call", () => {
  const raw = 'Sure, let me check.\n```json\n{"tool": "read_file", "args": {"path": "foo.js"}}\n```\n';
  const r = parseToolCall(raw);
  assert.equal(r.ok, true);
  assert.equal(r.tool, "read_file");
  assert.deepEqual(r.args, { path: "foo.js" });
});

test("parses a fenced tool_call block", () => {
  const raw = '```tool_call\n{"tool": "list_dir", "args": {}}\n```';
  const r = parseToolCall(raw);
  assert.equal(r.ok, true);
  assert.equal(r.tool, "list_dir");
});

test("parses bare unfenced JSON", () => {
  const raw = '{"tool": "final_answer", "args": {"text": "done"}}';
  const r = parseToolCall(raw);
  assert.equal(r.ok, true);
  assert.equal(r.tool, "final_answer");
});

test("recovers a balanced object even with stray prose around it", () => {
  const raw = 'Okay here it is: {"tool": "grep", "args": {"pattern": "foo"}} — hope that helps!';
  const r = parseToolCall(raw);
  assert.equal(r.ok, true);
  assert.equal(r.tool, "grep");
});

test("defaults args to {} when omitted", () => {
  const r = parseToolCall('{"tool": "list_dir"}');
  assert.equal(r.ok, true);
  assert.deepEqual(r.args, {});
});

test("rejects missing tool field — typed gap, not a crash", () => {
  const r = parseToolCall('{"args": {"path": "x"}}');
  assert.equal(r.ok, false);
  assert.match(r.error, /missing required string field "tool"/);
});

test("rejects unknown tool names", () => {
  const r = parseToolCall('{"tool": "delete_everything", "args": {}}');
  assert.equal(r.ok, false);
  assert.match(r.error, /unknown tool/);
});

test("rejects non-object args", () => {
  const r = parseToolCall('{"tool": "grep", "args": "nope"}');
  assert.equal(r.ok, false);
  assert.match(r.error, /"args" must be an object/);
});

test("rejects total garbage without crashing", () => {
  const r = parseToolCall("the model just chatted instead of calling a tool");
  assert.equal(r.ok, false);
  assert.equal(typeof r.error, "string");
});

test("rejects empty input", () => {
  const r = parseToolCall("");
  assert.equal(r.ok, false);
});

test("KNOWN_TOOLS includes final_answer and the four filesystem/process tools", () => {
  for (const t of ["read_file", "list_dir", "grep", "write_file", "run_command", "final_answer"]) {
    assert.ok(KNOWN_TOOLS.includes(t));
  }
});
