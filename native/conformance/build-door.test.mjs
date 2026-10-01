// native/conformance/build-door.test.mjs — the build is a DOOR of the one turn (proxy-runner.mjs runProxyTurn), not a second API.
// Driven through the REAL runProxyTurn against a stand-in model server (a plain HTTP server that answers /api/generate with the mistakes small
// coders were measured to make), so the whole path — session, door choice, draws over the wire, reading, assembly, the turn's own return — is the shipped one.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import vm from "node:vm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DRAWS = {
  describeTemp: "function describeTemp(celsius) { return roundTo(cToF(celsius), 1) + \"F\"; }",
  tally: "function tally(numbers) { const total = 0; for (const n of numbers) total += n; return total; }",
};
const asked = [];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const prompt = JSON.parse(body || "{}").prompt ?? "";
    const name = /named `(\w+)`/.exec(prompt)?.[1];
    asked.push({ url: req.url, name });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ response: DRAWS[name] ?? "", done: true, done_reason: "stop", prompt_eval_count: 7, eval_count: 9 }));
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
process.env.ER7_OLLAMA_URL = `http://127.0.0.1:${server.address().port}`;
process.env.ER7_LEARNED_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "er7-learned-"));
after(() => { server.close(); fs.rmSync(process.env.ER7_LEARNED_DIR, { recursive: true, force: true }); });
const { runProxyTurn } = await import("../../proxy-runner.mjs");

const TASK = "Write a JavaScript module with these functions: describeTemp(celsius) returns the temperature in Fahrenheit rounded to one decimal, like 72.5F; tally(numbers) returns the sum of an array of numbers.";
const run = (code, expr) => vm.runInContext(`${code}\n${expr}`, vm.createContext(Object.create(null)));

test("door:auto — the task's own words open the build door: units drawn over the wire, each draw read, the file assembled, all inside the turn's own return", async () => {
  const r = await runProxyTurn({ sessionId: "build-door-auto", model: "stand-in", task: TASK, door: "auto" }, null);
  assert.equal(r.answerShape, "build");
  assert.equal(r.mechanical.rung, "code-build");
  assert.deepEqual(r.mechanical.units, ["describeTemp", "tally"]);
  assert.match(r.text, /^Built 2 unit\(s\) — describeTemp, tally — drawn independently/);
  assert.deepEqual(asked.map((a) => a.name).sort(), ["describeTemp", "tally"], "one draw per unit and no other call to the model");
  assert.equal(run(r.mechanical.code, "describeTemp(22.5)"), "72.5F", "the draw's invented name was read as the card it means");
  assert.equal(run(r.mechanical.code, "tally([1, 2, 3.5])"), 6.5, "and the const that would have thrown is a let");
  assert.deepEqual(r.mechanical.canonical.transformations.map((t) => `${t.unit}:${t.kind}`).sort(), ["describeTemp:call_resolved", "tally:const_to_let"]);
  assert.equal(r.turn, 1, "it is a turn of the session like any other");
  assert.ok(r.usage.completionTokens > 0);
});

test("the record outlives the run: each draw is on the anchor log as a suggestion and a canonical entry, under the learned directory", () => {
  const dir = path.join(process.env.ER7_LEARNED_DIR, "builds");
  assert.ok(fs.existsSync(path.join(dir, "describeTemp.jsonl")) && fs.existsSync(path.join(dir, "tally.jsonl")), fs.existsSync(dir) ? fs.readdirSync(dir).join() : "no builds directory");
  const rows = fs.readFileSync(path.join(dir, "describeTemp.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(rows.some((e) => e.operator === "SIG" && /cToF/.test(e.suggestion)), "the suggestion is kept exactly as said");
});

test("door:build with a request that names no units says what a build needs, and spends no draw", async () => {
  asked.length = 0;
  const r = await runProxyTurn({ sessionId: "build-door-gap", model: "stand-in", task: "make me something nice", door: "build" }, null);
  assert.equal(r.answerShape, "build");
  assert.equal(r.mechanical.gap, "no_units");
  assert.match(r.text, /name the functions in the request as name\(args\)/i);
  assert.deepEqual(asked, []);
});

test("a build is a turn of the session: the same session continues across build turns", async () => {
  const again = await runProxyTurn({ sessionId: "build-door-auto", model: "stand-in", task: TASK, door: "build" }, null);
  assert.equal(again.turn, 2, "the same session continues");
});

test("on the chat wire shapes only an explicit door:\"build\" opens the build door — a chat client's ordinary message is never taken for a build on the strength of its words", async () => {
  const { parseProxyRequest, prefixModel } = await import("../../proxy-api.mjs");
  const base = { model: prefixModel("gemma2:2b"), messages: [{ role: "user", content: TASK }] };
  assert.equal(parseProxyRequest({ ...base }).door, null);
  assert.equal(parseProxyRequest({ ...base, door: "chat" }).door, null);
  assert.equal(parseProxyRequest({ ...base, door: "anything else" }).door, null);
  assert.equal(parseProxyRequest({ ...base, door: "build" }).door, "build");
});
