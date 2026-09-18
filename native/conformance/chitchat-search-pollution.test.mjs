// native/conformance/chitchat-search-pollution.test.mjs
//
// THE BUG (live e2e, 2026-09-17): "Hello — can you tell me what you are and
// what you can help with?" fired ~2511 live web searches whose queries were
// non-sequiturs unrelated to the greeting (e.g. "Archivist of the United
// States"). Root cause: the small-talk/greeting/command regexes in
// detectAnswerShape are ANCHORED to the whole turn ("^who are you$"), so a
// self-referential question wrapped in an ordinary sentence fell through to
// the "open" shape — and the web-search gate (in doTask) fires on BOTH
// "research" and "open" shapes when ER7_WEB_SEARCH is on. A question about
// the assistant itself never names an external fact to look up, so it must
// never reach "open".
import { test } from "node:test";
import assert from "node:assert";

const { detectAnswerShape } = await import("../../proxy-runner.mjs");

test("self-referential turns (wrapped in a sentence) never fall through to open/research", () => {
  for (const task of [
    "Hello — can you tell me what you are and what you can help with?",
    "Hi there, who are you exactly?",
    "So what can you help with today?",
    "Can you tell me what you are?",
    "Please introduce yourself.",
    "What are you capable of?",
  ]) {
    const shape = detectAnswerShape(task, false, false, false, [], null);
    assert.notEqual(shape.shape, "open", `"${task}" must not classify as open (triggers web search), got ${shape.shape}`);
    assert.notEqual(shape.shape, "research", `"${task}" must not classify as research, got ${shape.shape}`);
    assert.equal(shape.shape, "command", `"${task}" should be a command-shaped (brief, no-search) answer, got ${shape.shape}`);
  }
});

test("substantive factual questions are unaffected — still open/research-eligible", () => {
  for (const task of [
    "why is the sky blue?",
    "what is 12345 mod 97?",
    "who is the current Archivist of the United States?",
    "what can you tell me about the Silk Road?",
  ]) {
    const shape = detectAnswerShape(task, false, false, false, [], null);
    assert.ok(["open", "research"].includes(shape.shape), `"${task}" should stay open/research, got ${shape.shape}`);
  }
});
