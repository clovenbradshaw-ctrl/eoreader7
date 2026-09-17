// tui-units.test.mjs — unit tests for the pure rendering helpers (word wrap
// + the facing-page row model). No Ink, no PTY — just the pure functions,
// so they run fast and deterministically even under heavy machine load.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { wrapText, facingRows, snipLine } from "../format.mjs";
import { loadHolograph } from "../holograph.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "e2e", "fixtures");

test("wrapText wraps long lines and preserves short ones", () => {
  assert.deepEqual(wrapText("short line", 40), ["short line"]);
  const wrapped = wrapText("one two three four five", 10);
  assert.ok(wrapped.every((l) => l.length <= 10));
  assert.equal(wrapped.join(" ").replace(/\s+/g, " "), "one two three four five");
});

test("wrapText hard-wraps a single word longer than the width", () => {
  const long = "x".repeat(30);
  assert.deepEqual(wrapText(long, 10), ["x".repeat(10), "x".repeat(10), "x".repeat(10)]);
});

test("wrapText preserves explicit newlines", () => {
  assert.deepEqual(wrapText("a\nb", 40), ["a", "b"]);
});

test("wrapText never truncates a run-on sentence silently", () => {
  const runOn = "The quick brown fox jumps over the lazy dog and keeps going past one hundred characters of text so the renderer has something to actually wrap instead of cutting it off.";
  const wrapped = wrapText(runOn, 40);
  const rejoined = wrapped.join(" ");
  assert.ok(rejoined.startsWith("The quick brown fox"));
  assert.ok(rejoined.endsWith("cutting it off."));
  assert.ok(wrapped.length > 2, "long line must be split into multiple rows");
});

test("facingRows builds the two-page spread with connected tags", () => {
  const holo = loadHolograph(path.join(FIXTURES, "holograph.json"), [FIXTURES]);
  const { merged, leftW, rightW } = facingRows(holo, 110);
  assert.ok(leftW > 20 && rightW > 20, "both pages get a real width");

  const left = merged.map((r) => r.left).join("\n");
  const right = merged.map((r) => r.right).join("\n");

  // Sources page: permanent address + byte offset, and the resolved snip.
  assert.ok(left.includes("THE SOURCES"));
  assert.ok(left.includes("material.txt#38"));
  assert.ok(left.includes("material.txt#80"));
  assert.ok(left.includes("The Poles shouted Vivat across the water."), "verbatim snip resolved");
  // Response page: sentences tagged to their fact, mouth's own marked [M].
  assert.ok(right.includes("THE RESPONSE"));
  assert.ok(right.includes("[S1]"), "sentence links to fact 1");
  assert.ok(right.includes("[S2]"));
  assert.ok(right.includes("[M]"), "the mouth's own prose is tagged [M]");
  assert.ok(right.includes("self:model"));
});

test("snipLine names the non-model standing, with or without a source", () => {
  const withUrl = snipLine("https://en.wikisource.org/wiki/Sonnet_18");
  assert.ok(withUrl.includes("non-model"), "standing named");
  assert.ok(withUrl.includes("https://en.wikisource.org/wiki/Sonnet_18"), "address rides along");
  assert.ok(!withUrl.includes("[er7:"), "never a model tag");
  const bare = snipLine(null);
  assert.ok(bare.includes("non-model"), "standing named even with no address");
});