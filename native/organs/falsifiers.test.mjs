import test from "node:test";
import assert from "node:assert/strict";
import { falsifierFor, falsifiersFor, popperInline, stripPopperLine, POPPER_MARK } from "./index.js";
import { extractAtoms } from "./grounding.js";

const isCheckable = (s) => extractAtoms(s).length > 0;

test("an answer that asserts nothing checkable gets no line (no lecture on 'hello')", () => {
  assert.equal(falsifiersFor({ rows: [{ sentence: "Hi! How can I help you today?", tier: "self" }], isCheckable }), null);
});

test("an all-self answer says nothing checked it — loudest where nothing would notice", () => {
  const f = falsifiersFor({ rows: [{ sentence: "Grant was born in 1822 in Point Pleasant, Ohio.", tier: "self" }], isCheckable });
  assert.match(f.headline, /Nothing in this answer was checked/);
  assert.equal(f.counts.open, 1);
  assert.match(f.lines[0].falsifier, /nothing here would notice/);
});

test("a bound sentence names the address a reader can open to refute it", () => {
  const f = falsifiersFor({ rows: [{ sentence: "Grant was born in 1822.", tier: "bound", addresses: ["grant.txt#10-40"] }], isCheckable });
  assert.match(f.lines[0].falsifier, /grant\.txt#10-40/);
  assert.match(f.headline, /Every checkable sentence rests on a source/);
});

test("mixed standing is counted, never averaged into one verdict", () => {
  const f = falsifiersFor({ rows: [
    { sentence: "Grant was born in 1822.", tier: "bound", addresses: ["g#1-2"] },
    { sentence: "He loved horses from 1830 on.", tier: "self" },
    { sentence: "Georgetown is disputed as 1823.", tier: "contested", detail: "disputed by pamphlet.txt" },
  ], isCheckable });
  assert.deepEqual(f.counts, { total: 3, grounded: 1, contested: 1, open: 1 });
  assert.match(f.headline, /1 of 3/);
  assert.match(f.headline, /already in dispute/);
  assert.match(f.headline, /model's own words/);
});

test("a one-source note says a second source would refute it; two sources name the echo risk", () => {
  assert.match(falsifierFor({ tier: "recorded", addresses: ["a.txt#1-2"] }), /one source/);
  assert.match(falsifierFor({ tier: "recorded", addresses: ["a.txt#1-2", "b.txt#3-4"] }), /repeat one origin/);
});

test("checking off overrides every tier — nothing was held to a source", () => {
  const f = falsifiersFor({ rows: [{ sentence: "Grant was born in 1822.", tier: "bound", addresses: ["g#1-2"] }], isCheckable, checkingOff: true });
  assert.match(f.headline, /Checking is off/);
  assert.equal(f.lines[0].tier, "self");
});

test("the engine's unchecked verdict speaks even with no checkable atom", () => {
  const f = falsifiersFor({ rows: [{ sentence: "You are clearly meant for something bigger.", tier: "self" }], isCheckable, unchecked: true });
  assert.match(f.headline, /Nothing settled this/);
});

test("the inline line round-trips: a resent history never carries it to the model", () => {
  const f = falsifiersFor({ rows: [{ sentence: "Grant was born in 1822.", tier: "self" }], isCheckable, whatWouldSettle: "a birth record" });
  const line = popperInline(f);
  assert.ok(line.startsWith(POPPER_MARK));
  assert.match(line, /a birth record/);
  const shipped = `Grant was born in 1822.\n\n${line}`;
  assert.equal(stripPopperLine(shipped), "Grant was born in 1822.");
  assert.equal(stripPopperLine("plain text"), "plain text");
});

test("an unknown tier is never guessed", () => {
  assert.equal(falsifierFor({ tier: "mystery" }), null);
});

test("a computed answer names what would refute a computation, ignoring the superseded draft", () => {
  const f = falsifiersFor({ rows: [{ sentence: "17 times 24 is 372.", tier: "self" }], isCheckable, computed: true });
  assert.match(f.headline, /computed, not generated/);
  assert.equal(f.lines.length, 0);
});
