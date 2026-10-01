import test from "node:test";
import assert from "node:assert/strict";
import { sampleCheck, trimmed } from "./find-samples.mjs";
const DOC = JSON.stringify({ latitude: 52.5, longitude: 13.4, hourly: { time: ["a", "b", "c"], pm2_5: [1.1, 2.2, 3.3], pm10: [4, 5, 6] } });
test("a response is kept only if JSON, real numbers, and the need's words in its keys or address", async () => {
  const c = sampleCheck(["pm2", "hourly"]);
  assert.equal((await c(DOC, { url: "https://x/y" })).ok, true);
  assert.match((await c("<html>", { url: "https://x" })).why, /not JSON/);
  assert.match((await c(JSON.stringify({ a: 1 }), { url: "" })).why, /only 1 leaves/);
  assert.match((await c(DOC, { url: "https://x" }).then(() => sampleCheck(["wind"])(DOC, { url: "https://x" }))).why, /no word of the need/);
});
test("the shown sample is a trimmed VIEW of real bytes: arrays cut, nothing added", () => {
  const t = trimmed(JSON.parse(DOC), 2);
  assert.deepEqual(t.hourly.pm2_5, [1.1, 2.2]); assert.equal(t.latitude, 52.5);
});
