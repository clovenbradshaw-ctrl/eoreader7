// holograph.test.mjs — unit tests for the "full response" loader: byte-address
// resolution to verbatim snips, the fact-index that connects response
// sentences to their source facts, and the notes digest. No PTY, no proxy.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseRef,
  snipAt,
  sourceDirs,
  resolveSnippet,
  loadHolograph,
} from "../holograph.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "e2e", "fixtures");

const material = "The river ran quiet before the storm.\nThe Poles shouted Vivat across the water.\n";

test("parseRef splits filename#byte and ranges", () => {
  assert.deepEqual(parseRef("pg2600.txt#1627174"), { file: "pg2600.txt", start: 1627174, end: null });
  assert.deepEqual(parseRef("dhvanyaloka-locana-shankar.txt#102607-102685"), { file: "dhvanyaloka-locana-shankar.txt", start: 102607, end: 102685 });
  assert.equal(parseRef(null), null);
});

test("snipAt reads the verbatim bytes at an address", () => {
  const text = material;
  // byte 38 is the start of "The Poles shouted Vivat across the water."
  assert.equal(snipAt(text, 38, null), "The Poles shouted Vivat across the water.");
  assert.equal(snipAt(text, 38, 79), "The Poles shouted Vivat across the water.");
  assert.equal(snipAt(text, 9999, null), null);
});

test("resolveSnippet finds the source file and returns its verbatim snip", () => {
  const res = resolveSnippet("material.txt#38", sourceDirs([FIXTURES]));
  assert.equal(res.resolved, true);
  assert.equal(res.address, "material.txt#38");
  assert.match(res.verbatim, /The Poles shouted Vivat across the water\./);
});

test("resolveSnippet keeps the address but marks an unreachable source", () => {
  const res = resolveSnippet("no-such-file.txt#10", sourceDirs([FIXTURES]));
  assert.equal(res.resolved, false);
  assert.equal(res.verbatim, null);
  assert.equal(res.path, null);
});

test("loadHolograph connects prose sentences to their source facts", () => {
  const holo = loadHolograph(path.join(FIXTURES, "holograph.json"), [FIXTURES]);
  assert.equal(holo.question, "continue the scene at the river, carrying shanta-rasa");
  assert.equal(holo.inspiredBy.material.length, 3);
  assert.equal(holo.inspiredBy.material[0].snip.verbatim, "The Poles shouted Vivat across the water.");
  // The connection: sentence -> fact index, by ref and by groundedOn text.
  assert.equal(holo.prose[0].factIndex, 1);
  assert.equal(holo.prose[1].factIndex, 2);
  assert.equal(holo.prose[2].factIndex, 3);
  // The mouth's own prose is not grounded in any fact.
  assert.equal(holo.prose[3].factIndex, null);
  assert.equal(holo.prose[3].ground, "self:model");
});

test("loadHolograph surfaces the notes layer (distilled, not dumped)", () => {
  const holo = loadHolograph(path.join(FIXTURES, "holograph.json"), [FIXTURES]);
  const kinds = holo.notes.map((n) => n.kind);
  assert.ok(kinds.includes("header"));
  assert.ok(holo.notes.some((n) => n.text.includes("Admitted material.txt")));
  assert.ok(holo.verdict.line.includes("3 of 4"));
});

test("loadHolograph rejects non-holograph JSON with a clear error", () => {
  const fake = path.join(FIXTURES, "not-a-holograph.json");
  fs.writeFileSync(fake, JSON.stringify({ schema: "SomeOtherSchema@1", value: 1 }));
  assert.throws(() => loadHolograph(fake), /not an EOHolographOutput@1/);
  fs.unlinkSync(fake);
});