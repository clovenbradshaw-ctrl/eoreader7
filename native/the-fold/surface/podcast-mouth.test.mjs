// podcast-mouth.test.mjs — offline coverage of the ACTUAL prompt strings
// ollamaPodcastMouth sends. Every existing podcast test exercises
// podcast.js against a SCRIPTED mouth double (it has to, to construct
// deterministic disputes/divergence), which means the real prompt
// construction in this file had ZERO test coverage before this — and a
// real, severe bug lived there invisibly as a result: `revise()` used to
// call a {end1,label,end2} formatter directly on the whole `correction`
// bundle podcast.js passes, producing "undefined undefined undefined"
// for every real revision ask, factual or not. Fixed in the same commit
// this test file lands in; this pins it so it cannot silently return.
//
// Stubs global.fetch — no real network, no real Ollama needed to run
// this file — and inspects the exact request body a real call would
// send, the way podcast-app-codegen.mjs's own evidence file already
// makes visible for its own prompts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ollamaPodcastMouth } from "./podcast-mouth.mjs";

function stubFetch(reply) {
  const calls = [];
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    calls.push({ url, body });
    return { ok: true, json: async () => ({ message: { content: JSON.stringify(reply) } }) };
  };
  return calls;
}

test("revise() sends the mouth a real description of what's wrong — not the un-fixed 'undefined undefined undefined' bug", async () => {
  const calls = stubFetch({ title: "t", speaker: "s", script: "fixed script", claims: [] });
  const mouth = ollamaPodcastMouth({ url: "http://fake", model: "fake-model" });
  const correctionSummary = "charter conflict: real basis text goes here";
  await mouth.revise({ n: 0, beat: { beat: "opening" }, topic: "a topic", priorScript: "the prior draft", correctionSummary });
  assert.equal(calls.length, 1);
  const prompt = calls[0].body.messages[0].content;
  assert.match(prompt, /charter conflict: real basis text goes here/, "the real correction text must reach the model");
  assert.doesNotMatch(prompt, /undefined undefined undefined/, "the old bug: describe() called on the wrong object shape");
});

test("propose() names the real segment number, beat and topic", async () => {
  const calls = stubFetch({ title: "t", speaker: "s", script: "x", claims: [] });
  const mouth = ollamaPodcastMouth({ url: "http://fake", model: "fake-model" });
  await mouth.propose({ n: 2, beat: { beat: "the reveal" }, topic: "a mystery", voices: ["Ada"] });
  const prompt = calls[0].body.messages[0].content;
  assert.match(prompt, /segment 3/);
  assert.match(prompt, /the reveal/);
  assert.match(prompt, /a mystery/);
  assert.match(prompt, /Ada/);
});

test("arbitrate() describes both the rival and the new claim by their real end1/label/end2, never 'undefined'", async () => {
  const calls = stubFetch({ pick: "rival" });
  const mouth = ollamaPodcastMouth({ url: "http://fake", model: "fake-model" });
  await mouth.arbitrate({ rival: { end1: "the bridge", label: "opened_in", end2: "1937" }, claim: { end1: "the bridge", label: "opened_in", end2: "1940" }, topic: "a bridge" });
  const prompt = calls[0].body.messages[0].content;
  assert.match(prompt, /the bridge opened_in 1937/);
  assert.match(prompt, /the bridge opened_in 1940/);
  assert.doesNotMatch(prompt, /undefined/);
});

test("extractClaims() hands the model the real episode title and description, never invents claims itself (it only prompts)", async () => {
  const calls = stubFetch({ claims: [] });
  const mouth = ollamaPodcastMouth({ url: "http://fake", model: "fake-model" });
  await mouth.extractClaims({ showTitle: "Show", episodeTitle: "Ep 1", description: "A real published description." });
  const prompt = calls[0].body.messages[0].content;
  assert.match(prompt, /Show/);
  assert.match(prompt, /Ep 1/);
  assert.match(prompt, /A real published description\./);
});

test("ollamaPodcastMouth returns null with no url/model configured — never a silently-broken mouth", () => {
  const savedUrl = process.env.ER7_OLLAMA_URL, savedModel = process.env.ER7_PODCAST_MODEL, savedNbModel = process.env.ER7_NB_MODEL;
  delete process.env.ER7_OLLAMA_URL; delete process.env.ER7_PODCAST_MODEL; delete process.env.ER7_NB_MODEL;
  assert.equal(ollamaPodcastMouth(), null);
  if (savedUrl !== undefined) process.env.ER7_OLLAMA_URL = savedUrl;
  if (savedModel !== undefined) process.env.ER7_PODCAST_MODEL = savedModel;
  if (savedNbModel !== undefined) process.env.ER7_NB_MODEL = savedNbModel;
});
