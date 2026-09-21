import test from "node:test";
import assert from "node:assert/strict";
import { runMechanical, precisionWinner, CONCLUSION, flip } from "./precision-race.js";
import { BOUND, CONTRADICTED, CONTESTED, UNBOUND, BEYOND_REACH } from "../interpretation/hl.js";

const settles = { name: "settles", run: () => ({ concluded: true, kind: CONCLUSION.BOUND, text: "computed" }) };
const gaps = { name: "gaps", run: () => ({ concluded: false, gap: "engine missing" }) };
const ignores = { name: "ignores", run: () => null };
const throws = { name: "throws", run: () => { throw new Error("boom"); } };

test("a settled observation wins and keeps the model's draft as superseded", async () => {
  const observation = await runMechanical("q", [ignores, settles]);
  const race = precisionWinner({ observation, draft: "the model's guess" });
  assert.equal(race.winner, "mechanical");
  assert.equal(race.text, "computed");
  assert.equal(race.superseded, "the model's guess");
});

test("contradiction and underdetermined are conclusions too — they win", async () => {
  for (const kind of [CONCLUSION.CONTRADICTED, CONCLUSION.CONTESTED]) {
    const observation = await runMechanical("q", [{ name: "m", run: () => ({ concluded: true, kind, text: kind }) }]);
    assert.equal(precisionWinner({ observation, draft: "d" }).winner, "mechanical");
  }
});

test("a named gap is a BEYOND_REACH finding, never a winner — the prediction stands, the gap is disclosed", async () => {
  // The header law: "a gap never does [win]" — precision is structural,
  // settled or not, and a gap is not settled. The gap rides the observation
  // as disclosure; the draft is never suppressed by an uncomputed answer.
  const observation = await runMechanical("q", [gaps]);
  assert.equal(observation.concluded, false);
  assert.equal(observation.kind, BEYOND_REACH);
  assert.equal(observation.gaps[0].gap, "engine missing");
  const race = precisionWinner({ observation, draft: "the model's guess" });
  assert.equal(race.winner, "model");
  assert.equal(race.text, "the model's guess");
  assert.match(race.basis, /disclosed gaps/);
  assert.match(race.basis, /engine missing/);
});

test("no mechanism claims it — the prediction stands", async () => {
  const race = precisionWinner({ observation: await runMechanical("q", [ignores]), draft: "d" });
  assert.equal(race.winner, "model");
  assert.match(race.basis, /no mechanism settled/);
});

test("a throwing mechanism is a named gap and the rest still run", async () => {
  const observation = await runMechanical("q", [throws, settles]);
  assert.equal(observation.concluded, true);
  assert.equal(observation.gaps[0].mechanism, "throws");
});

test("CONCLUSION is hl.js's own lattice, not a second one — flip is the same involution", () => {
  assert.equal(CONCLUSION.BOUND, BOUND);
  assert.equal(CONCLUSION.CONTRADICTED, CONTRADICTED);
  assert.equal(CONCLUSION.CONTESTED, CONTESTED);
  assert.equal(CONCLUSION.UNBOUND, UNBOUND);
  assert.equal(CONCLUSION.BEYOND_REACH, BEYOND_REACH);
  assert.equal(flip(BOUND), CONTRADICTED);
  assert.equal(flip(CONTRADICTED), BOUND);
  assert.equal(flip(CONTESTED), CONTESTED); // Belnap's "both" is its own fixed point
});

test("the organ names no medium and no problem shape", async () => {
  const { readFile } = await import("node:fs/promises");
  const body = (await readFile(new URL("./precision-race.js", import.meta.url), "utf8")).replace(/\/\/.*$/gm, "");
  for (const word of ["knight", "knave", "puzzle", "arithmetic", "sentence", "token"]) assert.ok(!new RegExp(word, "i").test(body), word);
});
