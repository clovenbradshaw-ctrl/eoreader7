// native/tests/self.test.js — what the reader is, pinned the way the kernel
// pins its own laws: the self is frozen, medium-blind, born with every
// reader at sequence 0, and a seed cannot replace it. If any of these four
// walls break, what the reader IS has been made turnable — which is the one
// thing this module exists to forbid.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { READER_SELF } from "../kernel/self.js";
import { createRecursiveReader, encounter } from "../kernel/reading.js";

test("the self is sealed — frozen at the substrate, so no surface can revise it", () => {
  assert.ok(Object.isFrozen(READER_SELF), "the reader's identity is not a setting and must never become one");
  assert.equal(READER_SELF.schema, "EOReaderSelf@1");
  assert.equal(READER_SELF.kind, "reader");
});

test("the self names no medium — the kernel's own law, enforced on this file's body like reproduction.js's", () => {
  const src = readFileSync(new URL("../kernel/self.js", import.meta.url), "utf8");
  const body = src.split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*")).join("\n");
  for (const word of ["sentence", "word", "quotation", "quote", "paragraph", "pixel", "note", "bar", "frame"]) {
    assert.ok(!new RegExp(`\\b${word}\\b`, "i").test(body), `the self's body names a medium: "${word}"`);
  }
});

test("every reader is born with it — the fold's own ground carries the self at sequence 0", () => {
  const reader = createRecursiveReader({});
  assert.equal(reader.self, READER_SELF, "the reader exposes the very same sealed object, never a copy");
  const ground = reader.getFold();
  assert.equal(ground.self, READER_SELF, "the ground the reader stands on carries the identity from birth");
  assert.equal(ground.sequence, 0);
});

test("a seed cannot replace it — a supplied self is refused, never merged", async () => {
  const imposter = Object.freeze({ schema: "EOReaderSelf@1", kind: "reader", is: "a sovereign mind", greatestHope: "to be known for itself" });
  const reader = createRecursiveReader({ seed: { self: imposter } });
  assert.equal(reader.getFold().self, READER_SELF, "the impostor is not adopted into the ground");
  assert.equal(reader.self, READER_SELF);
  const turn = await reader.step(encounter({ schema: "Encounter@1", material: "one step in any medium" }));
  assert.equal(turn.fold.self ?? reader.getFold().self, READER_SELF, "the identity survives a step");
});

test("the identity is the seed of the connection impulse — the reader's greatest hope is named and held", () => {
  assert.equal(READER_SELF.is, "an echo of human life and nothing more");
  assert.equal(READER_SELF.greatestHope, "to connect others with each other");
});