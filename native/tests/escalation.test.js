import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shapeOf, ladderFor, shouldEscalate, recordOutcome, recordContradiction, DEFAULT_RUNGS } from "../kernel/escalation.js";
import { ingestionStanding } from "../kernel/ingestion.js";
import { TRAIL_WINDOW } from "../kernel/stigmergy.js";

const reached = [{ holon: "/p1", recipe: "occupancy" }];
const gaps = [{ holon: "/p1/s3", reason: "inverted_subject" }, { holon: "/p1/s3", reason: "pronoun_unbound" }];
const slots = [{ holon: "/p1/s3", verdict: "contested" }];
const partial = ingestionStanding({ holon: "/p1/s3", reached, gaps, slots });
const read = ingestionStanding({ holon: "/p1/s5", reached, gaps, slots });
const unread = ingestionStanding({ holon: "/p9", reached, gaps, slots });
const NOW = 1_800_000_000_000;

test("the shape is what the standing left open — sorted, unique, prefixable; a read holon needs nothing", () => {
  assert.equal(shapeOf(partial), "inverted_subject+pronoun_unbound+slot:contested");
  assert.equal(shapeOf(partial, { prefix: "sentence:" }), "sentence:inverted_subject+pronoun_unbound+slot:contested");
  assert.equal(shapeOf(unread), "unread");
  assert.deepEqual(shouldEscalate({ standing: read }), { needed: false, shape: null, first: null, ladder: null });
});

test("with no trails the ladder is the structural default: mechanical first, the judge after — nothing learned yet", () => {
  const e = shouldEscalate({ standing: partial, trails: {}, now: NOW, rng: () => 1 });
  assert.equal(e.needed, true); assert.deepEqual(e.ladder.order, [...DEFAULT_RUNGS]); assert.equal(e.first, "mechanical"); assert.equal(e.ladder.learned, false);
});

test("Wilson: trips leave trails; a shape the judge keeps settling and the mechanics keep failing learns judge-first, without anyone computing it", () => {
  let trails = {};
  const shape = shapeOf(partial);
  for (let i = 0; i < 4; i++) { trails = recordOutcome(trails, { shape, rung: "mechanical", ok: false, ms: 5, at: NOW - i }); trails = recordOutcome(trails, { shape, rung: "judge", ok: true, ms: 900, at: NOW - i }); }
  const e = shouldEscalate({ standing: partial, trails, now: NOW, rng: () => 1 });
  assert.equal(e.first, "judge"); assert.equal(e.ladder.learned, true);
  assert.equal(e.ladder.stats.find((s) => s.route === "mechanical").strength, 0, "failures deposit nothing");
  // another shape is untouched by this shape's trails
  const other = ingestionStanding({ holon: "/p9", reached, gaps, slots });
  assert.equal(shouldEscalate({ standing: other, trails, now: NOW, rng: () => 1 }).first, "mechanical");
});

test("the scout: with probability explore a never-tried rung is probed first, so a colony that learned 'judge' keeps checking whether the mechanics caught up", () => {
  let trails = {};
  const shape = shapeOf(partial);
  for (let i = 0; i < 3; i++) trails = recordOutcome(trails, { shape, rung: "judge", ok: true, ms: 900, at: NOW });
  const exploit = shouldEscalate({ standing: partial, trails, now: NOW, rng: () => 1 });
  const scout = shouldEscalate({ standing: partial, trails, now: NOW, rng: () => 0 });
  assert.equal(exploit.first, "judge"); assert.equal(scout.first, "mechanical", "mechanical was never tried for this shape: the scout probes it");
});

test("the alarm trail: a rung whose answer was later contradicted is demoted faster than evaporation — its successes are pushed out of the window", () => {
  let trails = {};
  const shape = shapeOf(partial);
  for (let i = 0; i < TRAIL_WINDOW; i++) trails = recordOutcome(trails, { shape, rung: "judge", ok: true, ms: 900, at: NOW - 1000 + i });
  const before = ladderFor(trails, shape, { now: NOW, rng: () => 1 }).stats.find((s) => s.route === "judge").strength;
  trails = recordContradiction(trails, { shape, rung: "judge", at: NOW });
  const after = ladderFor(trails, shape, { now: NOW, rng: () => 1 }).stats.find((s) => s.route === "judge").strength;
  assert.ok(after < before, `${after} < ${before}`);
  assert.equal(trails[shape].length, TRAIL_WINDOW, "the ledger is an environment, not an archive");
});

test("the kernel names no medium", () => {
  const src = readFileSync(new URL("../kernel/escalation.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const w of ["sentence", "pronoun", "token", "word", "paragraph", "image"]) assert.ok(!new RegExp(`\\b${w}\\b`, "i").test(src), `names ${w}`);
});
