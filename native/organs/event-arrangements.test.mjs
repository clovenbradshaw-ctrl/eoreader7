// event-arrangements.test.mjs — floor 2 for non-text media, against the
// REAL hyperlexicon door and the real music/turbulence grammars.
import test from "node:test";
import assert from "node:assert/strict";
import { arrangementsFrom, arrangementNotes } from "../eoreader7/native/organs/index.js";
import * as H from "./hyperlexicon.js";
import * as TL from "../eoreader7/native/kernel/task-log.js";
import { distinctSources, distinctRecipes } from "../eoreader7/native/organs/index.js";

const MUSIC = [ // the omnimodal grammar's own phrase shape
  { text: "c4 a3 d5 e4 a3 f5 g4" },
  { text: "e4 a3 f5 c4 a3 d5 g4" },
  { text: "g4 a3 d5 e4 a3 f5 c4" },
];

test("label and floor are declared or refused; spans are event-ordinal addresses, self-verified", () => {
  assert.equal(arrangementsFrom(MUSIC, { ref: "perf-a" }).refused, "undeclared");
  const { arrangements, coordinateSpace } = arrangementsFrom(MUSIC, { ref: "perf-a", label: "precedes", minRecurrence: 3 });
  assert.equal(coordinateSpace, "event-ordinals", "the space is DECLARED, never mixed silently");
  const drone = arrangements.find((a) => a.end1 === "a3" && a.end2 === "d5");
  assert.ok(drone, JSON.stringify(arrangements.map((a) => `${a.end1}>${a.end2}x${a.count}`)));
  assert.equal(drone.label, "precedes");
  assert.equal(drone.count, 3, "the ornament grammar recurs once per phrase");
  assert.match(drone.spans[0].at, /^perf-a#e\d+-e\d+$/);
});

test("adjacency never crosses a phrase break — a phrase-final and the next phrase-initial are not a pair", () => {
  const { arrangements } = arrangementsFrom([{ text: "x y" }, { text: "y x" }], { ref: "s", label: "precedes", minRecurrence: 1 });
  const across = arrangements.find((a) => a.end1 === "y" && a.end2 === "y");
  assert.equal(across, undefined, "cross-phrase pairs never form");
});

test("the recurrence floor bites: a hapax adjacency is not an arrangement", () => {
  const { arrangements, pairsSeen } = arrangementsFrom(MUSIC, { ref: "perf-a", label: "precedes", minRecurrence: 3 });
  assert.ok(pairsSeen > arrangements.length, "many pairs occur; few recur to the floor");
  assert.ok(arrangements.every((a) => a.count >= 3));
});

test("END TO END: turbulence arrangements land in the REAL hyperlexicon and corroborate across runs AND instruments", () => {
  // the turbulence grammar's own event phrases, two runs, two instruments
  const runA = [{ text: "q2 q4 q2 q1" }, { text: "q2 q4 q2 q1" }, { text: "q1 q2 q4 q2 q1" }];
  const runB = [{ text: "q2 q4 q2 q1" }, { text: "q2 q4 q2 q1" }];
  const hl = H.makeHyperlexicon(TL);
  let log = hl.createHyperlexicon();
  for (const [witness, recipe, stream] of [
    ["flow-run-a", "quadrant-hole-v1", runA], ["flow-run-b", "quadrant-hole-v1", runB],
    ["flow-run-a", "quadrant-localpeak-v1", runA], ["flow-run-b", "quadrant-localpeak-v1", runB],
  ]) {
    const { arrangements } = arrangementsFrom(stream, { ref: witness, label: "precedes", minRecurrence: 2 });
    for (const n of arrangementNotes(arrangements, { witness, recipe })) log = hl.hear(log, n);
  }
  const sweep = hl.foldHyperlexicon(log).find((n) => n.subject === "q2" && n.object === "q4");
  assert.ok(sweep, "the ejection-sweep arrangement is ON THE LEDGER as an ordinary note");
  assert.equal(sweep.verb, "precedes");
  assert.equal(distinctSources(sweep.witnesses).size, 2, "two independent runs vouch");
  assert.equal(distinctRecipes(sweep.witnesses).size, 2, "two independent instruments vouch — the shared-instrument law satisfied, not just disclosed");
  assert.ok(sweep.spans.length >= 4, "and every recurrence carries its event-ordinal address");
});

test("arrangementNotes refuses an unnamed instrument — a non-text arrangement exists only through its decoder", () => {
  const { arrangements } = arrangementsFrom(MUSIC, { ref: "perf-a", label: "precedes", minRecurrence: 3 });
  assert.throws(() => arrangementNotes(arrangements, { witness: "perf-a" }), /shared-instrument law/);
});
