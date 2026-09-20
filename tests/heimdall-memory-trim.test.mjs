// heimdall-memory-trim.test.mjs — the 2026-09-19 lesson: the ledger is not
// infinite. Memory SNAPSHOTs its history and TRIMs, with higher resolution
// for the more recent past: recent lines stay raw (verbatim), older lines
// fold into hourly snapshots, past that into daily snapshots, and past the
// cold horizon the memory is RELEASED. The learner (the rule-author holon)
// reads through the fold, so trimming never blinds it — the finding-counts
// survive even when the verbatim lines are gone.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as h from "../heimdall.mjs";

const { foldMemoryLines, mergeMemoryBuckets, makeMemoryConsolidator, makeRuleAuthorHolon } = h;

const HOUR = 3600000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-09-19T20:00:00.000Z");
const at = (t) => new Date(t).toISOString();
const mk = (t, e) => JSON.stringify({ at: at(t), ...e });
const eva = (t, finding, probe = null, extra = {}) => mk(t, { act: "eva", ...(finding ? { finding } : {}), ...(probe ? { probe } : {}), ...extra });

const _tmpDirs = [];
function tmpdir(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `er7-memory-${name}-`));
  _tmpDirs.push(dir);
  return dir;
}
after(() => { for (const dir of _tmpDirs) fs.rmSync(dir, { recursive: true, force: true }); });

const opts = { now: NOW, rawHorizonMs: 6 * HOUR, warmHorizonMs: 7 * DAY, coldHorizonMs: 90 * DAY };

test("fold: recent past stays raw (full resolution), older folds, past-cold is released", () => {
  const lines = [
    mk(NOW - 5 * 1000, { act: "eva", finding: "surface_down", probe: "er7" }),   // 5s ago — raw
    mk(NOW - 8 * HOUR, { act: "eva", finding: "surface_down", probe: "er7" }),   // 8h — hourly
    mk(NOW - 3 * DAY, { act: "eva", finding: "surface_down", probe: "er7" }),    // 3d — still hourly (warm is 7d)
    mk(NOW - 10 * DAY, { act: "eva", finding: "surface_down", probe: "er7" }),   // 10d — daily (past warm)
    mk(NOW - 200 * DAY, { act: "eva", finding: "surface_down", probe: "er7" }),  // 200d — released (past cold)
  ];
  const { keep, hourly, daily } = foldMemoryLines(lines, opts);
  assert.equal(keep.length, 1, "only the recent line stays verbatim");
  assert.ok(keep[0].includes("19:59:55.000Z"), "the kept line is the young one");
  assert.equal(hourly.length, 2, "8h- and 3d-old fold to two hour buckets");
  assert.equal(daily.length, 1, "10d-old folds to one day bucket");
  assert.equal(hourly[0][0], "2026-09-19T12:00:00.000Z", "the hour bucket is keyed by hour start");
  assert.equal(daily[0][0], "2026-09-09T00:00:00.000Z", "the day bucket is keyed by day start");
});

test("fold: a finding survives the fold as a counted class with first/last bounds", () => {
  const { hourly } = foldMemoryLines([
    eva(NOW - 8 * HOUR, "surface_down", "er7"),
    eva(NOW - 8 * HOUR + 60000, "surface_down", "er7"), // same hour — same bucket
    eva(NOW - 8 * HOUR, "memory_pressured", "qwen2.5:14b"),
  ], opts);
  const bucket = hourly[0][1];
  assert.equal(bucket.findings["surface_down:er7"].count, 2);
  assert.equal(bucket.findings["memory_pressured:qwen2.5:14b"].count, 1);
  assert.ok(bucket.findings["surface_down:er7"].first < bucket.findings["surface_down:er7"].last);
  assert.deepEqual(bucket.acts, { eva: 3 }, "the act breakdown survives");
});

test("fold: vitals fold to min/max/last, never every row", () => {
  const { hourly } = foldMemoryLines([
    mk(NOW - 8 * HOUR, { act: "eva", kind: "vitals", load1: 1, cpuIdle: 60, saturated: false }),
    mk(NOW - 8 * HOUR + 30000, { act: "eva", kind: "vitals", load1: 5, cpuIdle: 4, saturated: true }),
    mk(NOW - 8 * HOUR + 60000, { act: "eva", kind: "vitals", load1: 3, cpuIdle: 30, saturated: false }),
  ], opts);
  const v = hourly[0][1].vitals;
  assert.equal(v.rows, 3);
  assert.equal(v.saturated, 1);
  assert.deepEqual(v.by.load1, { min: 1, max: 5, last: 3 });
  assert.deepEqual(v.by.cpuIdle, { min: 4, max: 60, last: 30 });
});

test("fold: lesson notes keep their text (bounded per bucket)", () => {
  const notes = Array.from({ length: 70 }, (_, i) => mk(NOW - 8 * HOUR, { act: "note", note: `lesson ${i}` }));
  const { hourly } = foldMemoryLines(notes, opts);
  const bucket = hourly[0][1];
  assert.equal(bucket.notes.length, 50, "notes are capped per bucket");
  assert.ok(bucket.notes.some((n) => n.note === "lesson 69"), "the most recent notes survive");
  assert.ok(!bucket.notes.some((n) => n.note === "lesson 0"), "the oldest notes are the ones returned");
});

test("fold: a line that cannot be aged is never folded — it stays raw", () => {
  const { keep, hourly } = foldMemoryLines([
    `{"act":"eva","finding":"x","probe":"y"}`, // no `at`
    `not json at all`,
  ], opts);
  assert.equal(keep.length, 2, "undated and unparseable lines stay verbatim");
  assert.equal(hourly.length, 0);
});

test("merge: the same hour heard twice is one act — counts sum, bounds widen", () => {
  const a = { findings: { "surface_down:er7": { class: "surface_down", probe: "er7", count: 2, first: 1000, last: 2000 } }, acts: { eva: 2 }, vitals: { rows: 1, saturated: 0, slowPaused: 0, by: { load1: { min: 1, max: 1, last: 1 } } }, notes: [{ at: at(1500), note: "n1" }] };
  const b = { findings: { "surface_down:er7": { class: "surface_down", probe: "er7", count: 3, first: 500, last: 4000 } }, acts: { eva: 3 }, vitals: { rows: 2, saturated: 1, slowPaused: 0, by: { load1: { min: 4, max: 9, last: 9 } } }, notes: [{ at: at(3500), note: "n2" }] };
  const m = mergeMemoryBuckets(a, b);
  assert.equal(m.findings["surface_down:er7"].count, 5);
  assert.deepEqual({ first: m.findings["surface_down:er7"].first, last: m.findings["surface_down:er7"].last }, { first: 500, last: 4000 });
  assert.deepEqual(m.acts, { eva: 5 });
  assert.equal(m.vitals.rows, 3);
  assert.equal(m.vitals.saturated, 1);
  assert.deepEqual(m.vitals.by.load1, { min: 1, max: 9, last: 9 });
  assert.deepEqual(m.notes.map((n) => n.note), ["n1", "n2"]);
});

test("consolidate: trims the log to the hot window and folds the rest into snapshots", () => {
  const dir = tmpdir("consolidate");
  const logFile = path.join(dir, "log.jsonl");
  const memoryFile = path.join(dir, "memory.json");
  fs.writeFileSync(logFile, [
    mk(NOW - 60 * 1000, { act: "eva", finding: "surface_down", probe: "er7" }),
    mk(NOW - 8 * HOUR, { act: "eva", finding: "surface_down", probe: "er7" }),
    mk(NOW - 8 * HOUR, { act: "eva", finding: "surface_down", probe: "er7" }),
    mk(NOW - 10 * DAY, { act: "eva", finding: "memory_pressured", probe: "qwen" }),
    mk(NOW - 10 * DAY, { act: "eva", kind: "vitals", load1: 2 }),
  ].join("\n") + "\n");
  const mem = makeMemoryConsolidator({ logFile, memoryFile, now: () => NOW, ...opts });
  const r = mem.consolidate();
  assert.equal(r.folded, 4);
  assert.equal(r.kept, 1);
  assert.equal(r.trimmed, true);
  const trimmed = fs.readFileSync(logFile, "utf8").split("\n").filter((l) => l.trim());
  assert.equal(trimmed.length, 1, "the log is trimmed to the recent past");
  assert.ok(trimmed[0].includes("19:59:00.000Z"), "the surviving line is the young one");
  const store = mem.readStore();
  assert.equal(Object.keys(store.hourly).length, 1, "one hour bucket");
  assert.equal(Object.keys(store.daily).length, 1, "one day bucket");
  assert.equal(store.hourly[Object.keys(store.hourly)[0]].findings["surface_down:er7"].count, 2);
  assert.equal(store.daily[Object.keys(store.daily)[0]].findings["memory_pressured:qwen"].count, 1);
  assert.equal(r.at, at(NOW), "the fold is stamped");
});

test("consolidate: an aged hourly bucket is promoted into its day (coarser with age)", () => {
  const dir = tmpdir("promote");
  const logFile = path.join(dir, "log.jsonl");
  const memoryFile = path.join(dir, "memory.json");
  const warm = 2 * DAY; // hourly buckets kept only 2 days
  fs.writeFileSync(logFile, [
    mk(NOW - 3 * DAY, { act: "eva", finding: "surface_down", probe: "er7" }), // beyond warm — daily directly
    mk(NOW - 1 * DAY, { act: "eva", finding: "surface_down", probe: "er7" }), // past raw, within warm — hourly
  ].join("\n") + "\n");
  const mem = makeMemoryConsolidator({ logFile, memoryFile, now: () => NOW, rawHorizonMs: 6 * HOUR, warmHorizonMs: warm, coldHorizonMs: 90 * DAY });
  mem.consolidate();
  assert.equal(Object.keys(mem.readStore().hourly).length, 1);
  // Now time passes past the warm horizon: the same consolidator (idempotent
  // merge) promotes the hour bucket into the day it belongs to.
  const later = NOW + 3 * DAY;
  fs.writeFileSync(logFile, "");
  const mem2 = makeMemoryConsolidator({ logFile, memoryFile, now: () => later, rawHorizonMs: 6 * HOUR, warmHorizonMs: warm, coldHorizonMs: 90 * DAY });
  mem2.consolidate();
  const store = mem2.readStore();
  assert.equal(Object.keys(store.hourly).length, 0, "the aged hour bucket left the finer tier");
  const day18 = store.daily["2026-09-18T00:00:00.000Z"];
  assert.ok(day18, "the promoted bucket lives on in the day it belongs to");
  assert.equal(day18.findings["surface_down:er7"].count, 1, "the hour's folded count rides up into the day");
  assert.equal(store.daily["2026-09-16T00:00:00.000Z"].findings["surface_down:er7"].count, 1, "the day-direct fold is untouched");
});

test("consolidate: past the cold horizon the memory is released — not infinite", () => {
  const dir = tmpdir("cold");
  const logFile = path.join(dir, "log.jsonl");
  const memoryFile = path.join(dir, "memory.json");
  const cold = 30 * DAY;
  const mem = makeMemoryConsolidator({ logFile, memoryFile, now: () => NOW, rawHorizonMs: 6 * HOUR, warmHorizonMs: 5 * DAY, coldHorizonMs: cold });
  fs.writeFileSync(logFile, mk(NOW - 60 * DAY, { act: "eva", finding: "surface_down", probe: "er7" }) + "\n");
  mem.consolidate();
  assert.equal(Object.keys(mem.readStore().daily).length, 0, "a 60-day-old line past a 30-day cold horizon is released");
});

test("the learner reads through the fold: a snapshot line counts multiplicatively", async () => {
  const T = Date.now();
  const probe = "memory-trim-test-probe"; // unique: never collides with a live derived rule
  const line = JSON.stringify({
    act: "snapshot", tier: "hourly", bucket: at(T - 10 * 60000),
    finding: "surface_down", probe, count: 5,
    first: at(T - 10 * 60000), last: at(T - 60000), at: at(T - 60000),
  });
  const holon = makeRuleAuthorHolon({ logLines: () => [line], now: () => T });
  const finding = await holon.sense();
  assert.ok(finding, "a folded pattern past the floor is a candidate");
  assert.equal(finding.class, "pattern_earned");
  assert.equal(finding.candidates[0].count, 5, "the folded count, not 1, reaches the learner");
  assert.equal(finding.candidates[0].probe, probe);
});

test("disclosure names the horizons and the bucket counts", () => {
  const mem = makeMemoryConsolidator({ logFile: "/nonexistent/log.jsonl", memoryFile: "/nonexistent/memory.json", now: () => NOW, rawHorizonMs: 6 * HOUR, warmHorizonMs: 7 * DAY, coldHorizonMs: 90 * DAY });
  const d = mem.disclosure();
  assert.equal(d.rawHorizonMs, 6 * HOUR);
  assert.equal(d.hourlyBuckets, 0);
  assert.equal(d.rawLines, 0, "an unreadable log is reported as 0, never guessed");
});