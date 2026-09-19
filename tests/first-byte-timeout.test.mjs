// first-byte-timeout.test.mjs — the 2026-09-20 silence: Ollama answers
// headers at once and may then load for minutes before the first body
// chunk, and the old code awaited that read with only the 290s whole-call
// backstop. The race fails fast and typed instead. No Ollama here — the
// clock is tested against injected reads.
import { test } from "node:test";
import assert from "node:assert/strict";
import { raceFirstRead, FIRST_BYTE_TIMEOUT_MS } from "../proxy-runner.mjs";

test("a read that answers passes through with its own value", async () => {
  const v = await raceFirstRead(async () => ({ done: false, value: "chunk" }), 50, "gemma2:2b");
  assert.deepEqual(v, { done: false, value: "chunk" });
});

test("a read that never answers rejects typed, naming model + budget", async () => {
  const err = await raceFirstRead(() => new Promise(() => {}), 30, "gemma2:2b").then(
    () => null,
    (e) => e,
  );
  assert.ok(err, "must reject");
  assert.equal(err.code, "ollama_first_byte_timeout");
  assert.ok(String(err.message).includes("gemma2:2b"));
  assert.ok(String(err.message).includes("30ms"));
});

test("a read that throws keeps its own error (never re-typed)", async () => {
  const boom = new Error("socket hang up");
  const err = await raceFirstRead(async () => { throw boom; }, 50, "gemma2:2b").then(
    () => null,
    (e) => e,
  );
  assert.equal(err, boom);
});

test("the default budget is generous (cold loads are real) and overridable", async () => {
  assert.ok(FIRST_BYTE_TIMEOUT_MS >= 60000, `default ${FIRST_BYTE_TIMEOUT_MS}ms must cover genuine cold loads`);
  const v = await raceFirstRead(async () => "fast", 5, "m");
  assert.equal(v, "fast");
});
