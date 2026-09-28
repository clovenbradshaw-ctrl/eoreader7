// tests/read-back.test.js — the book read back (organs/read-back.js): who each
// part names, strangers and their clearance, the stuck book, seams, and the
// prose's own facts.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sentences } from "../adapters/text/english-parser.js";
import { lcg } from "../kernel/continuation.js";
import { readBack, clearance, stuck, seams, laws, factsIn } from "../organs/read-back.js";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cast = [{ id: "c#1", name: "Ana" }, { id: "c#2", name: "Tom" }];
const part = (id, ...texts) => ({ id, lines: texts.map((text, i) => ({ text, addr: `line ${i + 1}` })) });

test("each part is read for who it names, who its pronouns bind to, and the strangers in it", () => {
  const r = readBack({ parts: [part("p1", "Ana brushed her hair by the window.", "The sea was grey."), part("p2", "She walked down to meet Rex at the pier."), part("p3", "Tom and Rex mended the nets.")], cast, sentences, known: ["sailor"] });
  assert.deepEqual(r.parts[0].named, ["c#1"]);
  assert.deepEqual(r.parts[1].named, []);
  assert.deepEqual(r.parts[1].bound, ["c#1"], "a nameless 'she' binds to the one woman present");
  assert.deepEqual(r.parts[1].strangers, { Rex: 1 });
  const cl = clearance(r);
  assert.deepEqual(cl.established.map((e) => e.name), ["Rex"], "a stranger in two parts has recurred");
  assert.deepEqual(cl.refused, []);
  assert.deepEqual(seams(r, cl), [], "each part shares a being with the last (p3 shares Rex, established)");
  assert.deepEqual(seams(r, { established: [] }), [2], "without Rex established, p3 shares no one with p2");
});

test("the prose's own facts: a possessive stated, an age said outright; two values for one subject is a contradiction", () => {
  assert.deepEqual(factsIn("Ana's old dog was Rex, a grey collie.", cast).map((f) => [f.label, f.end2]), [["old dog", "Rex"]]);
  assert.deepEqual(factsIn("Ana is 30 and Tom is 41.", cast).map((f) => [f.end1, f.label, f.end2]), [["c#1", "age", "30"], ["c#2", "age", "41"]]);
  const r = readBack({ parts: [part("p1", "Ana's dog was Rex."), part("p2", "Ana's dog was Max, who barked.")], cast, sentences });
  const lw = laws(r);
  assert.equal(lw.contradictions.length, 1);
  assert.deepEqual(lw.contradictions[0].values.map((v) => v.value), ["Rex", "Max"]);
});

test("a book holding one state in any order reads stuck; one whose states form and break reads moving", () => {
  const same = Array.from({ length: 8 }, (_, k) => part(`p${k}`, "Ana stood at the window again."));
  const stuckRead = stuck(readBack({ parts: same, cast, sentences }), { pValue: 0.05, rng: lcg(7) });
  assert.equal(stuckRead.verdict, "settled_any_order");
  const moving = [...Array(6).keys()].map((k) => part(`a${k}`, "Ana mended the sail.")).concat([...Array(6).keys()].map((k) => part(`b${k}`, "Tom rowed out alone.")));
  const movingRead = stuck(readBack({ parts: moving, cast, sentences }), { pValue: 0.05, rng: lcg(7) });
  assert.equal(movingRead.verdict, "settles_in_sequence");
});

test("no regular expressions in the reader", () => {
  assert.deepEqual(scanRegexes(fs.readFileSync(path.join(HERE, "..", "organs", "read-back.js"), "utf8")), []);
  assert.deepEqual(scanRegexes(fs.readFileSync(path.join(HERE, "..", "eval", "long-form", "elements.mjs"), "utf8")), []);
});
