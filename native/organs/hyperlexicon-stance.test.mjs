// The admitting act's cell, and its sedimentation into cross-work memory.
//
// SEPARATE FILE, ON PURPOSE. `hyperlexicon.test.mjs` reaches the engine through
// `legacy-eoreader6.1`, an uninitialised submodule in some checkouts (this one
// included) — so that whole file cannot load here and a test appended to it
// would never run. `void-loop.test.mjs`/`void-shape.test.mjs` already set the
// precedent: import eoreader7's NATIVE kernel, which is a real sibling, so the
// wall is actually exercised wherever this repo is checked out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeHyperlexicon } from "./hyperlexicon.js";
import { adaptTaskLog } from "./consequence.js";
import * as cube from "../eoreader7/native/kernel/cube.js";
import * as nativeTaskLog from "../eoreader7/native/kernel/task-log.js";
import * as experiencePriors from "../eoreader7/native/kernel/experience-priors.js";

// `consequence.js`'s own adapter reconciles native's ordinal GRAINS with the
// GRAIN_RANK shape this module reads — reused rather than a second mapping.
const taskLog = {
  ...adaptTaskLog({
    createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append,
    ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS,
    GRAINS: cube.GRAINS,
  }),
  projectTasks: nativeTaskLog.projectTasks,
};
const span = (ref, start, end, text) => ({ ref, start, end, text });

// ── the admitting act's cell, and its sedimentation ────────────────────────
// Stance is not a property of the note; it is the posture the READER admitted
// under, read off (operator, grain) — the space is 27, and the cube derives
// mode/domain/terrain/stance from that pair. These pin that it is READ, not
// chosen, and that it never touches the world-facing plane.

const hlCube = makeHyperlexicon({ ...taskLog, cellOf: cube.cellOf });
const sp = (n) => [span(`w${n}`, 0, 3, "abc")];

test("the admitting act carries the cell the cube derives, not a restated literal", () => {
  let log = hlCube.createHyperlexicon();
  log = hlCube.admit(log, [{ subject: "A", verb: "replaces", object: "B", spans: sp(1) }], { witness: "p1" }).log;
  log = hlCube.admit(log, [{ subject: "A", verb: "replaces", object: "B", spans: sp(2) }], { witness: "p2" }).log;
  const [birth, again] = log.entries;
  // compared against the ENGINE's own answer — a local expectation here would
  // pass forever against a cube that had changed underneath it
  for (const [entry, op] of [[birth, "INS"], [again, "SYN"]]) {
    const c = cube.cellOf(op, "Figure");
    assert.equal(entry.operator, op);
    assert.equal(entry.stance, c.stance, `${op}·Figure must carry the cube's own stance`);
    assert.equal(entry.terrain, c.terrain, `${op}·Figure must carry the cube's own terrain`);
  }
  // the operators differ in DOMAIN, so a re-sighting genuinely relocates:
  // a birth is an Entity, a corroboration is a Link.
  assert.equal(birth.terrain, "Entity");
  assert.equal(again.terrain, "Link");
});

test("with no cellOf injected an entry is byte-identical — an absent cube is stated, never supplied", () => {
  const plain = makeHyperlexicon(taskLog);
  let a = plain.createHyperlexicon();
  a = plain.admit(a, [{ subject: "A", verb: "replaces", object: "B", spans: sp(1) }], { witness: "p1" }).log;
  const e = a.entries[0];
  for (const k of ["cell", "stance", "terrain", "mode", "domain"]) {
    assert.ok(!(k in e), `a reader that declared no cube was silently given ${k}`);
  }
});

test("a cube that gaps is carried as a gap, never smoothed into a plausible cell", () => {
  const gapping = makeHyperlexicon({ ...taskLog, cellOf: () => ({ gap: "unknown_spec", reason: "no such operator" }) });
  let log = gapping.createHyperlexicon();
  log = gapping.admit(log, [{ subject: "A", verb: "replaces", object: "B", spans: sp(1) }], { witness: "p1" }).log;
  assert.equal(log.entries[0].cell_gap, "unknown_spec");
  assert.ok(!("stance" in log.entries[0]), "a gapped cell must not also carry a stance");
});

test("the posture projection carries the ACT only — no world-facing field crosses the plane", () => {
  let log = hlCube.createHyperlexicon();
  log = hlCube.admit(log, [{ subject: "Hamlin", verb: "replaces", object: "Breckinridge", spans: sp(1) }], { witness: "en.wikipedia.org/Hamlin" }).log;
  const reading = hlCube.readingFromHyperlexicon(log, { source: "work1" });
  const serialized = JSON.stringify(reading);
  // stance is reader-structure and defeasible; witnesses and spans are
  // world-facing and corroborable. A prior that learned the second from the
  // first would be learning the world from its own habits.
  for (const leaked of ["Hamlin", "Breckinridge", "replaces", "wikipedia", "abc"]) {
    assert.ok(!serialized.includes(leaked), `"${leaked}" crossed into the posture prior`);
  }
  assert.deepEqual(reading.reading.fold.graphEntries, [], "relation vocabulary is world-facing and must stay out");
  assert.equal(reading.postures, 1);
});

test("a log with no declared cube sediments nothing rather than a default posture", () => {
  const plain = makeHyperlexicon(taskLog);
  let a = plain.createHyperlexicon();
  a = plain.admit(a, [{ subject: "A", verb: "replaces", object: "B", spans: sp(1) }], { witness: "p1" }).log;
  assert.equal(plain.readingFromHyperlexicon(a, { source: "w" }).postures, 0);
});

test("an unattributed reading is refused — cross-work memory needs a source", () => {
  let log = hlCube.createHyperlexicon();
  log = hlCube.admit(log, [{ subject: "A", verb: "replaces", object: "B", spans: sp(1) }], { witness: "p1" }).log;
  assert.throws(() => hlCube.readingFromHyperlexicon(log), /source is named/);
});

test("postures sediment across works through the real experience-priors organ", () => {
  const build = (pairs, w) => {
    let log = hlCube.createHyperlexicon();
    for (const [a, b] of pairs) log = hlCube.admit(log, [{ subject: a, verb: "replaces", object: b, spans: sp(w) }], { witness: w }).log;
    return hlCube.readingFromHyperlexicon(log, { source: w });
  };
  const prior = experiencePriors.deriveExperiencePrior(
    [build([["A", "B"], ["B", "C"], ["A", "B"]], "work1"), build([["X", "Y"], ["X", "Y"]], "work2")],
    { giver: "hyperlexicon.test.mjs admission postures" },
  );
  const making = prior.stanceExpectations.find((s) => s.stance === "Making");
  assert.equal(making.occurrences, 5, "three births and two re-sightings are five Generate·Figure acts");
  assert.equal(making.workSupport, 2, "held in both works — the standing cross-work memory needs >= 2");
  // and nothing the reader never did is invented
  for (const s of prior.stanceExpectations.filter((s) => s.stance !== "Making")) {
    assert.equal(s.occurrences, 0, `${s.stance} was never held and must not accumulate`);
  }
});
