// heimdall-reaper.test.mjs — the 2026-09-19 lesson: the box carried 40+
// `node serve.mjs 0` orphans, a second proxy.mjs, and stale `node --test`
// runners days old. Heimdall's remit expands to the whole background: census
// the process table, name the strays on KNOWN signatures, reap them bounded
// and recorded — never the self, never an ancestor, never on an unverified
// probe.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as h from "../heimdall.mjs";

const { parseEtime, censusBackground, reapBackground } = h;

const SELF = 4242;
const C = { now: Date.parse("2026-09-19T20:00:00.000Z"), selfPid: SELF, serveGraceMs: 10 * 60000, testAgeMs: 2 * 3600000 };
const row = (pid, ppid, ageS, args) => ({ pid, ppid, ageS, rssKb: 3000, args });

test("parseEtime reads ps etimes", () => {
  assert.equal(parseEtime("25:30"), 25 * 60 + 30);
  assert.equal(parseEtime("22:52:46"), 22 * 3600 + 52 * 60 + 46);
  assert.equal(parseEtime("04-13:43:13"), 4 * 86400 + 13 * 3600 + 43 * 60 + 13);
  assert.equal(parseEtime("garbage"), null);
  assert.equal(parseEtime(""), null);
});

test("census: a lone instance of anything is never a stray", () => {
  const rows = [
    row(SELF, 1, 3600, "node proxy.mjs"),
    row(9001, 7777, 7200, "node /x/the-fold/serve.mjs 0"), // parented harness child — the spawner lives
    row(9002, 1, 4000, "/Applications/Ollama.app/llama-server --model /blobs/abc123 --port 50333"),
    row(9003, 9000, 60, "node --test tests/foo.test.mjs"),
  ];
  const c = censusBackground(rows, C);
  assert.equal(c.strays.length, 0, "singletons are never convicted");
  assert.equal(c.contested.length, 0);
});

test("census: an ephemeral serve.mjs orphan past its grace is a stray; a young or parented one is not", () => {
  const rows = [
    row(SELF, 1, 3600, "node proxy.mjs"),
    row(9001, 1, 3600, "node /x/the-fold/serve.mjs 0"),   // orphan, 1h — stray
    row(9002, 1, 60, "node /x/the-fold/serve.mjs 0"),     // orphan, 1min — grace
    row(9003, 7777, 7200, "node /x/the-fold/serve.mjs 0"), // parented — someone's live harness
  ];
  const c = censusBackground(rows, C);
  assert.equal(c.strays.length, 1);
  assert.equal(c.strays[0].pid, 9001);
  assert.equal(c.strays[0].signature, "serve-ephemeral");
  assert.equal(c.herds["serve-ephemeral"], 3, "the herd is still counted");
});

test("census: same-model llama duplicates keep the oldest holder", () => {
  const rows = [
    row(SELF, 1, 3600, "node proxy.mjs"),
    row(9101, 500, 86400, "llama-server --model /blobs/abc123 --port 50333"), // oldest — kept
    row(9102, 500, 3600, "llama-server --model /blobs/abc123 --port 50334"),  // newer — surplus
    row(9103, 500, 7200, "llama-server --model /blobs/def456 --port 50335"),  // different model — fine
  ];
  const c = censusBackground(rows, C);
  assert.equal(c.strays.length, 1);
  assert.equal(c.strays[0].pid, 9102);
  assert.ok(c.strays[0].reason.includes("9101"), "the keeper is named so the act is auditable");
});

test("census: a stale test runner is a stray; a live one is hands-off", () => {
  const rows = [
    row(SELF, 1, 3600, "node proxy.mjs"),
    row(9201, 1, 4 * 86400, "node --test tests/foo.test.mjs"), // 4 days — stray
    row(9202, 9199, 300, "node --test tests/bar.test.mjs"),     // 5 min — live
  ];
  const c = censusBackground(rows, C);
  assert.equal(c.strays.length, 1);
  assert.equal(c.strays[0].pid, 9201);
  assert.equal(c.strays[0].signature, "test-runner");
});

test("census: two live servers on one claimed port are contested, never auto-strays", () => {
  const rows = [
    row(SELF, 1, 3600, "node proxy.mjs"),
    row(9301, 1, 7200, "node /x/the-fold/explore-server.mjs 8812"),
    row(9302, 1, 300, "node /x/the-fold/explore-server.mjs 8812"),
  ];
  const c = censusBackground(rows, C);
  assert.equal(c.strays.length, 0, "contested needs lsof proof — never guessed");
  assert.equal(c.contested.length, 1);
  assert.equal(c.contested[0].key, "explore-server.mjs:8812");
  assert.deepEqual(c.contested[0].pids.map((p) => p.pid).sort(), [9301, 9302]);
});

test("census: an empty table is a failed probe, never a clean bill", () => {
  const c = censusBackground([], C);
  assert.equal(c.strays.length, 0);
  assert.equal(c.rowsRead, 0, "zero rows read — a caller must not mistake this for clean");
  const full = censusBackground([row(SELF, 1, 60, "node proxy.mjs")], C);
  assert.equal(full.rowsRead, 1);
});

test("census: never the self, never an ancestor, never pid 1 — even on a stray signature", () => {
  const rows = [
    { pid: 1, ppid: 0, ageS: 999999, rssKb: 1, args: "node /x/the-fold/serve.mjs 0" },
    row(100, 1, 999999, "node /x/the-fold/serve.mjs 0"),      // ancestor of self
    row(SELF, 100, 3600, "node /x/the-fold/serve.mjs 0"),     // the self itself
    row(9401, 1, 999999, "node /x/the-fold/serve.mjs 0"),     // the actual stray
  ];
  const c = censusBackground(rows, C);
  assert.equal(c.strays.length, 1);
  assert.equal(c.strays[0].pid, 9401);
});

test("reap: TERMs within budget, defers the rest, never exceeds the cap", () => {
  const strays = [1, 2, 3, 4].map((i) => ({ pid: 9500 + i, signature: "serve-ephemeral", reason: "test" }));
  const calls = [];
  const r = reapBackground({ strays, kill: (pid, sig) => { calls.push([pid, sig]); return true; }, maxKills: 2, now: 1000, termed: new Map() });
  assert.deepEqual(r.termed.map((t) => t.pid), [9501, 9502]);
  assert.ok(r.termed.every((t) => t.signal === "SIGTERM"), "first touch is always TERM");
  assert.deepEqual(r.skipped.map((s) => [s.pid, s.why]), [[9503, "kill_cap"], [9504, "kill_cap"]]);
});

test("reap: a pid that survived TERM is escalated to KILL on re-sense", () => {
  const termed = new Map([[9601, 1000]]);
  const calls = [];
  const r = reapBackground({
    strays: [{ pid: 9601, signature: "serve-ephemeral", reason: "test" }],
    kill: (pid, sig) => { calls.push([pid, sig]); return true; },
    now: 2000, termed,
  });
  assert.deepEqual(calls, [[9601, "SIGKILL"]], "survivors escalate");
  assert.deepEqual(r.killed.map((k) => k.pid), [9601]);
  assert.ok(!termed.has(9601), "a KILLed pid leaves the escalation state");
});

test("reap: an already-dead pid is a mercy, not a kill; a refused kill is skipped honestly", () => {
  const r = reapBackground({
    strays: [
      { pid: 9701, signature: "serve-ephemeral", reason: "test" },
      { pid: 9702, signature: "serve-ephemeral", reason: "test" },
    ],
    kill: (pid) => (pid === 9701 ? "gone" : false),
    now: 1000, termed: new Map(),
  });
  assert.deepEqual(r.gone.map((g) => g.pid), [9701]);
  assert.deepEqual(r.skipped.map((s) => [s.pid, s.why]), [[9702, "kill_failed"]]);
  assert.equal(r.termed.length, 0);
});
