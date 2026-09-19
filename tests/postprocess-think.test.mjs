// postprocess-think.test.mjs — the mouth's working must never reach the
// answer: <think> blocks (closed and truncated), stray /think tokens stripped
// from prose; fenced code never touched; clean text byte-identical.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stripThinking, postprocessAnswer } from "../postprocess.mjs";

test("closed thinking block removed from prose", () => {
  const { text, stripped } = stripThinking("hit1\n<think>hmm, let me think</think>\nfinal words");
  assert.ok(!text.includes("hmm"), text);
  assert.ok(text.includes("hit1") && text.includes("final words"), text);
  assert.ok(stripped >= 2);
});

test("truncated unclosed block stripped to end", () => {
  const { text } = stripThinking("answer starts<think>unfinished working that never closes");
  assert.equal(text.trim(), "answer starts");
});

test("bare /think token removed, words kept", () => {
  const { text } = stripThinking("hit1 /think");
  assert.equal(text.trim(), "hit1");
});

test("fenced code containing <think> is preserved byte-exact", () => {
  const src = "see:\n```python\nx = '<think>'\nprint(x)\n```\ndone";
  const { text, stripped } = stripThinking(src);
  assert.equal(text, src);
  assert.equal(stripped, 0);
});

test("clean text is byte-identical, zero stripped", () => {
  const src = "Seventeen lanterns, along the harbor of glass.\nSecond line.";
  const { text, stripped } = stripThinking(src);
  assert.equal(text, src);
  assert.equal(stripped, 0);
});

test("postprocessAnswer strips thinking and discloses it", async () => {
  const r = await postprocessAnswer("<think>working</think>\nThe answer.");
  assert.ok(!r.text.includes("working"), r.text);
  assert.ok(r.text.includes("The answer."), r.text);
  assert.ok(r.notes.some((n) => n.includes("thinking marker")), r.notes.join("|"));
});
