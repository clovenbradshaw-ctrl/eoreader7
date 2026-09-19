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