import test from "node:test";
import assert from "node:assert/strict";
import { voiceOf, registers, REGISTERS, DEFAULT_REGISTER, OUTPUT_VOICE_SCHEMA } from "./output-voice.js";

const claim = { end1: "the French army", label: "crossed", end2: "the Niemen" };

test("the plain register states the claim directly", () => {
  const v = voiceOf({ claim });
  assert.equal(v.text, "the French army — crossed — the Niemen.");
  assert.equal(v.register, "plain");
  assert.equal(v.archon, "strunk-white");
});

test("a lean prompt picks the lean register (Eastwood)", () => {
  const v = voiceOf({ prompt: "Give me the short version", claim });
  assert.equal(v.register, "lean");
  assert.equal(v.archon, "eastwood");
  assert.equal(v.text, "the French army crossed the Niemen.");
});

test("a precise prompt picks the precise register (Kubrick)", () => {
  const v = voiceOf({ prompt: "Give the full precise report", claim });
  assert.equal(v.register, "precise");
  assert.equal(v.archon, "kubrick");
});

test("an oral prompt picks the oral register (Terry Gross)", () => {
  const v = voiceOf({ prompt: "Tell me a story about it", claim });
  assert.equal(v.register, "oral");
  assert.equal(v.archon, "terry-gross");
});

test("an explicit register wins over prompt cues", () => {
  const v = voiceOf({ prompt: "Tell me a story", claim, register: "lean" });
  assert.equal(v.register, "lean", "the declared register is honoured");
});

test("the frame never writes a word beyond the claim's own plus the declared frame", () => {
  for (const r of registers()) {
    const v = voiceOf({ prompt: "", claim, register: r });
    // every substantive token in the output must be the claim's end/label/end2
    const words = v.text.replace(/[^a-z\s]/gi, "").toLowerCase().split(/\s+/).filter(Boolean);
    const allowed = [claim.end1, claim.label, claim.end2].join(" ").toLowerCase().split(/\s+/);
    for (const w of words) {
      assert.ok(allowed.includes(w) || ["it", "of", "and", "here", "is", "what", "happened"].includes(w), `"${w}" is not an owned word in register ${r}`);
    }
  }
});

test("the schema is declared", () => {
  assert.equal(OUTPUT_VOICE_SCHEMA, "OutputVoice@1");
  assert.equal(DEFAULT_REGISTER, "plain");
  assert.ok(REGISTERS.precise.archon === "kubrick");
});