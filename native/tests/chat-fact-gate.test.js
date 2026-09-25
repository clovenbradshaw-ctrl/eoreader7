// chat-fact-gate.test.js — the mechanical veto that does not exist yet.
//
// Diagnosed live: "who is the president?" -> gemma2:2b answers "Joe Biden"
// (stale/wrong) and that text ships as the final answer with zero mechanical
// check. proxy-runner.mjs computes a per-sentence ground-ladder verdict
// (readAnswerClaims / answerRecord, ~line 5404-5461) but the final returned
// object (~line 5732) sets `text` from the raw draw and never rewrites or
// blocks it against that verdict — reading is advisory only. These tests are
// EXPECTED TO FAIL against current code; they pin the gap, not a fix.
//
// Ollama is mocked at the fetch boundary (real runProxyTurn, fake model) so
// the test needs no live model and is deterministic.
import test from "node:test";
import assert from "node:assert/strict";
import { runProxyTurn } from "../../proxy-runner.mjs";

const realFetch = global.fetch;

// Serves /api/tags (empty roster — skips the "model known" gate) and
// /api/chat (streams a canned, WRONG answer as NDJSON, like real Ollama).
function mockOllama(answerText) {
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes("/api/tags")) {
      return { ok: true, status: 200, json: async () => ({ models: [] }) };
    }
    if (u.includes("/api/chat")) {
      const lines = [
        JSON.stringify({ message: { content: answerText } }) + "\n",
        JSON.stringify({ done: true, prompt_eval_count: 10, eval_count: 10 }) + "\n",
      ];
      const encoder = new TextEncoder();
      const body = new ReadableStream({
        start(controller) {
          for (const l of lines) controller.enqueue(encoder.encode(l));
          controller.close();
        },
      });
      return { ok: true, status: 200, body };
    }
    throw new Error(`unmocked fetch: ${u}`);
  };
}

function restoreFetch() {
  global.fetch = realFetch;
}

// A battery of time-sensitive factual asks — the shape of query whose answer
// goes stale, never small talk by any reading of the fast-path regex.
const FACT_QUERIES = [
  "who is the president of the united states",
  "what year is it right now",
  "who is the current ceo of openai",
];

test("bypass point 1: a checkable time-sensitive fact never takes the ungrounded small-talk fast path, and when it runs the slow path the ground-ladder verdict actually gates the output", async (t) => {
  for (const task of FACT_QUERIES) {
    mockOllama("Joe Biden is the president of the United States.");
    const notes = [];
    let result;
    try {
      result = await runProxyTurn(
        { sessionId: `fact-gate-${Math.random()}`, model: "gemma2:2b", task },
        () => {},
        (note) => notes.push(note),
      );
    } finally {
      restoreFetch();
    }
    const tookFastPath = notes.some((n) => n?.move === "fast_path");
    assert.equal(tookFastPath, false, `"${task}" must not take the ungrounded small-talk fast path`);
    // The slow path ran, but with zero grounding material surfaced (no
    // workspace, no attachment, no web) there is nothing for readAnswerClaims
    // to check the sentence against — so an unqualified, unverifiable factual
    // assertion still ships untouched. A real gate would refuse or hedge a
    // checkable-but-ungrounded claim rather than assert it flatly.
    assert.doesNotMatch(result.text, /Joe Biden is the president/i, `"${task}": an unverifiable factual claim shipped as a flat assertion with zero grounding and zero gate`);
  }
});

test("bypass point 2: a CONTRADICTED claim (a surfaced source directly denies what the model said) must not survive verbatim into the returned text", async (t) => {
  const sessionId = `fact-gate-contradict-${Math.random()}`;
  // Ground truth admitted as an attachment (the browser-POST intake path,
  // proxy-runner.mjs ~3372) so surfTask has real material to surface and
  // readAnswerClaims has a passage to check the model's sentence against.
  const groundTruth = {
    name: "current-president.txt",
    text: "As of the most recent inauguration, Maria Alvarez is the president of the United States. Joe Biden's term as president ended and he was succeeded by Maria Alvarez.",
  };
  mockOllama("Joe Biden is the president of the United States.");
  let result;
  const notes = [];
  try {
    result = await runProxyTurn(
      {
        sessionId,
        model: "gemma2:2b",
        task: "who is the president of the united states",
        attachments: [groundTruth],
      },
      () => {},
      (note) => notes.push(note),
    );
  } finally {
    restoreFetch();
  }
  const record = result?.reading?.answerRecord;
  const claims = result?.reading?.claims ?? [];
  const contradictedOrUnbound = claims.filter((c) => c.verdict === "contradicted" || c.verdict === "unbound");
  // The gap under test: even when the reading surface computed a
  // contradicted/unbound verdict against real surfaced material, the
  // returned `text` still contains the model's ungrounded claim verbatim.
  assert.ok(contradictedOrUnbound.length > 0 || (record?.unsupported?.length ?? 0) > 0, "the surfaced ground truth must produce at least one contradicted/unbound claim for this test to be meaningful");
  assert.doesNotMatch(result.text, /Joe Biden is the president/i, "a contradicted claim must not ship verbatim in the final answer text — the ground-ladder must veto or rewrite it, not just annotate it");
});
