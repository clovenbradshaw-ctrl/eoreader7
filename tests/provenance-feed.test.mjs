// provenance-feed.test.mjs — falsification of the provenance wiring
// (2026-09-29, a3fd2ed's "byte-addressed claims"). The prompt and the
// holograph claimed byte-addressed provenance while the live reader's edges
// carried neither span nor source name where notesFromEdges looked —
// wired but unreached. These tests pin the feed: the edge's own absolute
// byte offset (scope.byteOffset) and source name (meta.source) ride the
// note into the ground fact's ref; a sentence-relative offset is never
// rendered as a byte address; absent address is a typed gap, never a guess.
import { test } from "node:test";
import assert from "node:assert/strict";
import { notesFromEdges } from "../proxy-runner.mjs";
import { groundFacts } from "../native/organs/output-holograph.js";

const edge = (over = {}) => ({
  schema: "EOHyperedge@1",
  id: "edge:test:1",
  relation: "uses",
  participants: [{ surface: "the server" }, { surface: "the router" }],
  witness: "9f".repeat(32),
  scope: { sequencePosition: 4, offset: 7, byteOffset: 120 },
  meta: { polarity: "+", source: "workspace:server.mjs", encounterRef: "encounter:4" },
  ...over,
});

test("feed: the edge's byte offset and source name ride the note", () => {
  const [n] = notesFromEdges([edge()]);
  assert.deepEqual(n.span, { start: 120 }, "the absolute byte offset, not the sentence-relative one");
  assert.equal(n.source, "workspace:server.mjs", "the source name, never the witness hash");
});

test("feed: byte offset zero is an address, never an absence", () => {
  const [n] = notesFromEdges([edge({ scope: { sequencePosition: 0, offset: 0, byteOffset: 0 } })]);
  assert.deepEqual(n.span, { start: 0 });
});

test("feed: a sentence-relative offset is never rendered as a byte address", () => {
  const [n] = notesFromEdges([edge({ scope: { sequencePosition: 4, offset: 7, byteOffset: null } })]);
  assert.equal(n.span, undefined, "no byteOffset → no span, never the relative offset");
  assert.equal(n.source, "workspace:server.mjs", "the source name still rides without an address");
});

test("feed: the reduced shape keeps its legacy behavior", () => {
  const [n] = notesFromEdges([{ relation: "uses", participants: [{ surface: "the server" }, { surface: "the router" }], witness: "abc123" }]);
  assert.equal(n.span, undefined);
  assert.equal(n.source, "abc123", "legacy fallback: the witness, as before");
});

test("feed: edge → note → ground fact renders the byte-addressed ref", () => {
  const [n] = notesFromEdges([edge()]);
  const [g] = groundFacts([n]);
  assert.equal(g.ref, "workspace:server.mjs#120", "the commit's own example, now reachable");
  assert.equal(g.source, "workspace:server.mjs");
});

test("feed: a note with no span is a typed gap, never a guessed address", () => {
  const [n] = notesFromEdges([edge({ scope: { sequencePosition: 4, offset: 7, byteOffset: null } })]);
  const [g] = groundFacts([n]);
  assert.equal(g.ref, undefined);
  assert.equal(g.gap?.type, "no_byte_address");
});
