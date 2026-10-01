import test from "node:test";
import assert from "node:assert/strict";
import { needsSample, needOf, jsonBlocksIn, traceShown, hardcodedFrom, sampleBlock } from "./sample-ground.js";
const REAL = JSON.stringify({ latitude: 51.5, current: { pm10: 20.1, pm2_5: 9.3, time: "2026-10-01T04:00" }, hourly: { pm10: [1.5, 2.5, 3.5] } });
const G = [{ id: "a", bytes: REAL }];
test("a task that reads an outside service and quotes no sample needs one; a quoted sample or a plain function does not", () => {
  assert.equal(needsSample("write functions: parseAir(json), label(x) that parse the JSON response from the Open-Meteo air quality API"), true);
  assert.equal(needsSample('write parseAir(json) that reads {"current": {"pm10": 3}} from the API'), false);
  assert.equal(needsSample("write functions: add(a, b), mul(a, b)"), false);
});
test("the need drops signatures and scaffolding words", () => { assert.match(needOf("write functions: parseAir(json) that parse the JSON response from the Open-Meteo air quality API"), /Open-Meteo air quality API/); assert.doesNotMatch(needOf("write parseAir(json) for the API"), /parseAir/); });
test("JSON an answer shows is found fenced and in prose; text that is not JSON is not", () => {
  assert.equal(jsonBlocksIn('Here:\n```json\n{"a": {"b": 1}, "c": [1,2,3]}\n```').length, 1);
  assert.equal(jsonBlocksIn('it returns {"x": 1, "y": [2, 3]} always').length, 1);
  assert.equal(jsonBlocksIn("a {not json} here").length, 0);
});
test("a shown sample is traced: the real one grounded, the invented one named, the redealt one unpaired", () => {
  assert.equal(traceShown('```json\n{"current": {"pm10": 20.1, "pm2_5": 9.3}}\n```', G)[0].verdict, "grounded");
  assert.equal(traceShown('```json\n{"current": {"pm10": 10, "pm2_5": 11}}\n```', G)[0].verdict, "invented");
  assert.equal(traceShown('```json\n{"current": {"pm10": 9.3, "pm2_5": 20.1}}\n```', G)[0].verdict, "unpaired");
});
test("a unit that hard-codes a value found only in the sample is named; one that reads it by key is not", () => {
  assert.deepEqual(hardcodedFrom("function pm10Of(d) { return 20.1; }", G).map((h) => h.path), ["current.pm10"]);
  assert.equal(hardcodedFrom("function pm10Of(d) { return d.current.pm10; }", G).length, 0);
});
test("the shown block is a trimmed real view", () => { const b = sampleBlock(G); assert.match(b.text, /"pm10"/); assert.doesNotMatch(b.text, /3\.5/); });
