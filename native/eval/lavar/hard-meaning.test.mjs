// hard-meaning.test.mjs — the ant-swarm trigger, falsified.
import test from "node:test";
import assert from "node:assert/strict";
import { detectHardMeaning, classifyTokens, typeOf, signalControl } from "./hard-meaning.mjs";

test("plain prose with material reads fine — no auto-route", () => {
  const r = detectHardMeaning({
    task: "what does this passage mean?",
    texts: [{ name: "passage", text: "The bongo antelope moves through the Congo Basin. Its coat carries the stripes that break up its silhouette in the filtered light." }],
  });
  assert.equal(r.hard, false);
  assert.deepEqual(r.signals, []);
});

test("ordinary chat with no material never fires (over-eager guard)", () => {
  const r = detectHardMeaning({ task: "can you help me write a function?" });
  assert.equal(r.hard, false);
  assert.equal(r.type, null);
});

test("U+FFFD replacement char is an unambiguous hard read", () => {
  const r = detectHardMeaning({
    task: "read this",
    texts: [{ name: "bad", text: "The bongo \uFFFD antelope lives \uFFFD here." }],
  });
  assert.equal(r.hard, true);
  assert.equal(r.type, "replacement_char");
});

test("mojibake runs fire the encoding signal", () => {
  const r = detectHardMeaning({
    task: "what is this",
    texts: [{ name: "m", text: "The caf\u00C3\u00A9 was \u00C3\u00A9 there." }],
  });
  assert.equal(r.hard, true);
  assert.equal(r.type, "mojibake");
});

test("3+ symbol-heavy tokens is garble", () => {
  const r = detectHardMeaning({
    task: "read",
    texts: [{ name: "g", text: "###w@@q x$$y%%z !!!a###b&&&c +++d%%%e" }],
  });
  assert.equal(r.hard, true);
  assert.equal(r.type, "garbled_token");
});

test("a long body ending unpuncted is truncation", () => {
  const body = "The bongo antelope moves through the Congo Basin and its coat carries the stripes that break up its silhouette in the filtered light of the forest floor where the great herds gather at the salt licks in the early morning before the heat of the day";
  const r = detectHardMeaning({ task: "finish this", texts: [{ name: "cut", text: body }] });
  assert.equal(r.hard, true);
  assert.equal(r.type, "truncated_end");
});

test("a short fragment ending unpuncted is NOT truncation", () => {
  const r = detectHardMeaning({ task: "hi", texts: [{ name: "frag", text: "hello there" }] });
  assert.equal(r.hard, false);
});

test("notation-dense material fires the density signal", () => {
  const spec = Array.from({ length: 80 }, (_, i) => `x_${i}=@${i}*0x${i.toString(16)}${i % 2 ? "+" : "-"}`).join(" ");
  const r = detectHardMeaning({ task: "what does this compute", texts: [{ name: "spec", text: spec }] });
  assert.equal(r.hard, true);
  assert.equal(r.type, "notation_dense");
});

test("low lexical variety fires the chant signal", () => {
  const chant = Array.from({ length: 30 }, () => "ha hee ha hum hoom ha hee ha hum hoom ha hee ha hum hoom ha hee ha hum hoom").join(" ");
  const r = detectHardMeaning({ task: "what is this", texts: [{ name: "chant", text: chant }] });
  assert.equal(r.hard, true);
  assert.equal(r.type, "low_lexical_signal");
});

test("pointed at empty material fires the void signal", () => {
  const r = detectHardMeaning({ task: "read my attachment", texts: [{ name: "empty", text: "   " }] });
  assert.equal(r.hard, true);
  assert.equal(r.type, "pointed_at_nothing");
});

test("no task at all fires the void signal", () => {
  const r = detectHardMeaning({ texts: [{ name: "x", text: "something" }] });
  assert.equal(r.hard, true);
  assert.equal(r.type, "pointed_at_nothing");
});

test("a garbled blob pasted as the chat message itself (no attachment) fires", () => {
  const r = detectHardMeaning({ task: "what does this mean ###w@@q x$$y%%z !!!a###b&&&c" });
  assert.equal(r.hard, true);
  assert.equal(r.type, "garbled_token");
});

// The live specimen (2026-09-22): the-fold sends its last turns as history,
// and prior answers carry citation marks, a table rule, parenthetical figures.
const CITED_HISTORY = [
  { role: "user", content: "What causes ocean tides?" },
  { role: "assistant", content: "Ocean tides are caused by the gravitational pull of the Moon and the Sun on Earth. [1][2] The Moon's pull is stronger because it is closer. [1]\n\n1 · witnessed:noaa   2 · bound:material" },
  { role: "user", content: "How strong is the Sun's share?" },
  { role: "assistant", content: "| body | share |\n|---|---|\n| Moon | (~2/3) |\n| Sun | (~1/3) |\n\nThe Sun contributes roughly (~46%) of the Moon's tidal force. [1][3] {1·noaa} {3·wiki}\n\n1 · witnessed:noaa   3 · named:wiki" },
].map((m, i) => ({ name: `history-${i}`, text: m.content }));

test("a clean question in a citation-heavy conversation never fires (history is not material)", () => {
  const task = "What makes the tides rise and fall twice a day?";
  // Precondition: read AS material, this history is garble-shaped — so the
  // pass below is the exclusion working, not a history too clean to matter.
  assert.equal(detectHardMeaning({ task, texts: CITED_HISTORY }).hard, true);
  const r = detectHardMeaning({ task, history: CITED_HISTORY });
  assert.equal(r.hard, false);
  assert.deepEqual(r.signals, []);
  assert.equal(r.read, "task");
});

test("a garbled blob pasted mid-conversation still fires, measured over the task", () => {
  const r = detectHardMeaning({ task: "what does this mean ###w@@q x$$y%%z !!!a###b&&&c", history: CITED_HISTORY });
  assert.equal(r.hard, true);
  assert.equal(r.type, "garbled_token");
  assert.equal(r.read, "task");
  assert.match(r.basis, /3 symbol-heavy tokens/);
});

test("a garbled attachment still fires beside a clean history", () => {
  const r = detectHardMeaning({
    task: "what is this?",
    texts: [{ name: "g", text: "###w@@q x$$y%%z !!!a###b&&&c +++d%%%e" }],
    history: [{ name: "history-0", text: "Hello! How can I help?" }],
  });
  assert.equal(r.hard, true);
  assert.equal(r.type, "garbled_token");
  assert.equal(r.read, "texts");
});

test("classifyTokens counts the mechanics", () => {
  const c = classifyTokens("a\uFFFDb \u00C3\u00A9 ###w@@q x y z");
  assert.equal(c.replacement, 1);
  assert.ok(c.mojibake >= 1);
  assert.equal(c.garbledTokens, 1);
});

test("typeOf and signalControl keep the ledger key + falsifying control", () => {
  assert.equal(typeOf("garbled_token"), "garbled_token");
  assert.match(signalControl("garbled_token"), /concedes/);
  assert.equal(signalControl("no_such_signal"), null);
});