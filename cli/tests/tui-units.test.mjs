// tui-units.test.mjs — unit tests for the pure rendering helpers (word wrap
// + the facing-page row model). No Ink, no PTY — just the pure functions,
// so they run fast and deterministically even under heavy machine load.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { wrapText, facingRows, snipLine, territoryLines } from "../format.mjs";
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
  assert.ok(!withUrl.includes("[fold:"), "never a model tag");
  const bare = snipLine(null);
  assert.ok(bare.includes("non-model"), "standing named even with no address");
});

// ── territoryLines: the territory door's answers as plain lines ──────────────
test("territoryLines draws the map with the price of each split, and is honest when every territory is coherent", () => {
  const leaf = (id, docs, terms, coherent = false) => ({ id, docs, tokens: docs * 100, leaf: { id, docs, terms, coherent } });
  const a = { root: "/drive", files: { found: 120 }, map: { K: 2, exhausted: true, stats: { docs: 100, words: 9000, redundant: 4 }, tree: { id: 0, docs: 100, split: { gain: 5000.4, jsd: 0.91 }, children: [leaf(1, 60, ["grantee", "grantor"]), leaf(2, 40, ["simmer"], true)] } } };
  const lines = territoryLines(a);
  assert.ok(lines[0] === "/drive" && lines[1].includes("100 documents of 120 files"));
  assert.ok(lines.some((l) => l.includes("a split saves 5,000 bits") && l.includes("0.91 apart")));
  assert.ok(lines.some((l) => l.includes("[2] 40 docs, coherent: simmer")));
  assert.ok(lines.at(-1).includes("every one is coherent"));
});

test("territoryLines shows an answer with its passages, what the folder never says, and a refusal as a refusal", () => {
  const ask = territoryLines({ q: "grantee zzz", matched: 3, ms: 1.2, absent: ["zzz"], hits: [{ name: "a/b.txt", territory: 4, snippet: "the grantee shall" }], territories: [{ id: 4, hits: 3 }] });
  assert.ok(ask[0].includes('3 documents match "grantee zzz"') && ask[0].includes("never says: zzz"));
  assert.ok(ask.some((l) => l.includes("a/b.txt") && l.includes("territory 4")));
  assert.deepEqual(territoryLines({ error: "x is not a folder" }), ["territory: x is not a folder"]);
});
