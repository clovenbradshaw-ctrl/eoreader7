// native/conformance/conversation-fold-echo-loop.test.mjs
//
// THE BUG (live e2e, two-agent-stress.mjs, 2026-09-18): two fold:gemma2:2b
// agents talking to each other through /v1/chat/completions got stuck in a
// content loop from turn ~9 onward — every turn from both sides produced a
// "## Dispute Resolution" heading and near-identical restated phrasing.
//
// ROOT CAUSE: for a chat-only session (no web/file material), runProxyTurn
// unconditionally re-surfaced the session's own recent chat turns via
// conversationFoldSegments() and stuffed them into the system prompt as
// "Here's what came up on this" GROUNDING MATERIAL — even when the caller
// (every real client, and two-agent-stress.mjs) already sent the full
// conversation as `chatHistory`. The model then received the same recent
// turns twice: once as real conversation turns, once again framed as
// external material to write FROM. With nothing checking the "material"
// for novelty against what had already been said, each agent paraphrased
// its own (or the other's) last paraphrase, converging on a fixed heading
// and phrasing within ~10 turns.
//
// FIX: conversationFoldSegments is now gated by shouldUseConversationFold,
// which only permits it when the caller sent NO chatHistory (the stateless
// case it was actually built for — the same rationale transcriptFromSession
// already states for itself, and that function IS gated on `!keptChat.length`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldUseConversationFold } from "../../proxy-runner.mjs";

test("conversation fold is skipped once the caller already sent chat history", () => {
  const task = "Push back on my reasoning where you disagree, and keep building on the plan.";
  // Stateless call (no history sent) — chat-only corpus: the fold is the
  // only way prior turns reach the model, so it must still fire.
  assert.equal(shouldUseConversationFold(task, [], false), true);
  assert.equal(shouldUseConversationFold(task, undefined, false), true);
  // Stateful call (full history sent, as every real client and
  // two-agent-stress.mjs do): the conversation is already in chatHistory —
  // re-surfacing it as "material" is the bug. Must be skipped.
  const chatHistory = [
    { role: "user", content: "Let's design a system of governance." },
    { role: "assistant", content: "## Dispute Resolution\n\nThis part details the process..." },
  ];
  assert.equal(shouldUseConversationFold(task, chatHistory, false), false);
  // Even a broad-recall question ("what did we say about X") must not
  // re-trigger the fold once real history is present — that history already
  // answers it.
  assert.equal(shouldUseConversationFold("what have we discussed so far?", chatHistory, false), false);
});

test("conversation fold still fires for a stateless chat-only session", () => {
  // hasNonChatMaterial=false (chat-only corpus, e.g. two agents talking with
  // no web/file material): the fold is the only path to prior turns, so it
  // must still fire when there is no chatHistory to fall back on.
  assert.equal(shouldUseConversationFold("any ordinary follow-up", [], false), true);
});

test("non-broad-recall, non-chat-only, stateless calls do not force the fold", () => {
  // hasNonChatMaterial=true and not a broad-recall question: the mechanical
  // ladder (surfTask) is the right path, not the conversation fold.
  assert.equal(shouldUseConversationFold("what is the capital of France?", [], true), false);
});
