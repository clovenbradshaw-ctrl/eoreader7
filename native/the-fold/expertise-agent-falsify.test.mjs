// expertise-agent-falsify.test.mjs — the "go learn expertise on X" API
// entry point (2026-09-22): a mechanical topic/URL extraction, a bounded
// number of follow-up turns, and a model that only ever phrases what it is
// handed — never decides whether to ask or what counts as an answer.
import test from "node:test";
import assert from "node:assert/strict";
import { extractTopic, extractStance, stepExpertiseAgent, AGENT_MAX_TURNS } from "./expertise-agent.js";

const echoDraw = async (messages) => `[draw] ${messages[0].content}`;

test("extractTopic: mechanical verb-phrase and URL stripping, never a whole sentence", () => {
  assert.equal(extractTopic("go learn expertise on limericks"), "limericks");
  assert.equal(extractTopic("learn about obituaries"), "obituaries");
  assert.equal(extractTopic("become an expert in Irish jigs"), "Irish jigs");
  assert.equal(extractTopic("study sonnets https://example.com/x"), "sonnets");
  assert.equal(extractTopic("limerick"), "limerick");
  assert.equal(extractTopic("I really don't know what I want, sorry about that."), null, "a whole sentence is not a topic name");
  assert.equal(extractTopic(""), null);
});

test("extractTopic: 'learn how to write a X like this <link>' — the real phrasing a live run found broken (how/to/write/article + trailing example-ref all stripped)", () => {
  assert.equal(extractTopic("learn how to write a white paper like this https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf"), "white paper");
  assert.equal(extractTopic("how do I write a haiku"), "haiku", "the leftover after stripping is still 'do i write a' — the guard must not choke on the remainder");
});

test("no topic in the prompt: the model is asked to phrase a question, but WHETHER to ask is mechanical, not the model's call", async () => {
  const r = await stepExpertiseAgent(null, { message: "hey there", draw: echoDraw });
  assert.equal(r.status, "needs-topic");
  assert.match(r.question, /^\[draw\]/, "the returned question is what the model produced, from the fact it was handed");
  assert.equal(r.state.topic, null);
  assert.equal(r.state.turns, 1);
});

test("a topic with too few instances: needs-more, citing the REAL mechanical counts, never invented ones", async () => {
  const huntOverride = async () => ({ refused: true, reason: "under_powered", instances: 2, population: 0 });
  const r = await stepExpertiseAgent(null, { message: "go learn expertise on haiku", draw: echoDraw, huntOverride });
  assert.equal(r.status, "needs-more");
  assert.equal(r.state.topic, "haiku");
  assert.deepEqual(r.found, { instances: 2, population: 0 });
});

test("enough instances but no relative ground: needs-more with the no_null reason, distinct from under_powered", async () => {
  const huntOverride = async () => ({ refused: true, reason: "no_null", instances: 12, population: 1 });
  const r = await stepExpertiseAgent({ topic: "haiku", sourceUrls: [], populationUrls: [], turns: 1 }, { message: "https://a.example/1 https://a.example/2", draw: echoDraw, huntOverride });
  assert.equal(r.status, "needs-more");
  assert.deepEqual(r.found, { instances: 12, population: 1 });
});

test("a successful pass: learned, the model summarizes the REAL recorded result, and state need not persist further", async () => {
  const huntOverride = async () => ({ ok: true, refused: false, status: "confirmed", corroboration: 2, confirmed: "haiku", instances: 20, population: 20, lines: ["x"] });
  const r = await stepExpertiseAgent({ topic: "haiku", sourceUrls: [], populationUrls: [], turns: 1 }, { message: "more links", draw: echoDraw, huntOverride });
  assert.equal(r.status, "learned");
  assert.match(r.summary, /^\[draw\]/);
  assert.equal(r.result.confirmed, "haiku");
});

test("links accumulate mechanically: first reply's links become examples, a later reply's links become the ground", async () => {
  let seenArgs = null;
  const huntOverride = async (st) => { seenArgs = st; return { refused: true, reason: "no_null", instances: 6, population: 0 }; };
  let r = await stepExpertiseAgent(null, { message: "learn about villanelles https://a.example/1 https://a.example/2", draw: echoDraw, huntOverride });
  assert.equal(r.state.topic, "villanelles");
  assert.deepEqual(r.state.sourceUrls, ["https://a.example/1", "https://a.example/2"]);
  r = await stepExpertiseAgent(r.state, { message: "here: https://b.example/ground1 https://b.example/ground2", draw: echoDraw, huntOverride });
  assert.deepEqual(seenArgs.sourceUrls, ["https://a.example/1", "https://a.example/2"], "the earlier examples are kept, not overwritten");
  assert.deepEqual(seenArgs.populationUrls, ["https://b.example/ground1", "https://b.example/ground2"]);
});

test("bounded turns: after AGENT_MAX_TURNS without success, it gives up rather than asking forever", async () => {
  const huntOverride = async () => ({ refused: true, reason: "under_powered", instances: 1, population: 0 });
  let state = null;
  let r;
  for (let i = 0; i <= AGENT_MAX_TURNS; i++) r = await stepExpertiseAgent(state, { message: i === 0 ? "learn about zeugma" : "still nothing", draw: echoDraw, huntOverride }), (state = r.state);
  assert.equal(r.status, "gave-up");
  assert.match(r.basis, new RegExp(`${AGENT_MAX_TURNS} turns`));
});

test("draw is declared — no silent fallback to a fabricated question", async () => {
  await assert.rejects(stepExpertiseAgent(null, { message: "x", draw: null }), /draw .* is declared/);
});

test("extractStance: a trailing 'for the X sector/industry/…' names the stance; a bare topic has none", () => {
  assert.equal(extractStance("learn how to write a white paper for the tech sector"), "tech");
  assert.equal(extractStance("write a white paper for food science"), "food science");
  assert.equal(extractStance("learn about limericks"), null);
  assert.equal(extractStance("write a report for the board"), "board");
});

test("extractTopic strips the SAME trailing stance clause so the bare topic never carries it", () => {
  assert.equal(extractTopic("learn how to write a white paper for the tech sector"), "white paper");
});

test("stance flows through stepExpertiseAgent's state and into the hunt call, never overwritten by a later stance-free reply", async () => {
  let seenArgs = null;
  const huntOverride = async (st) => { seenArgs = st; return { refused: true, reason: "under_powered", instances: 1, population: 0 }; };
  const r = await stepExpertiseAgent(null, { message: "learn how to write a white paper for the tech sector", draw: echoDraw, huntOverride });
  assert.equal(r.state.topic, "white paper");
  assert.equal(r.state.stance, "tech");
  assert.equal(seenArgs.stance, "tech");
});
