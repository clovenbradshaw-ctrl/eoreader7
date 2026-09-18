import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyForecast, forecastKey, forecast, observe, forecastError } from "./forecast.js";

// Predictive processing, numerically: Laplace tallies per (op, language,
// syntax) key. Unknown keys predict maximal uncertainty (0.5, disclosed);
// every observation returns a NEW frozen prior; the error is signed
// outcome-minus-p.

test("empty forecast: unknown key is 0.5 with trials 0, said out loud", () => {
  const f = forecast(emptyForecast(), "SYN|python|checked");
  assert.equal(f.p, 0.5);
  assert.equal(f.trials, 0);
  assert.match(f.basis, /no history/);
});

test("observe: frozen update, Laplace smoothing, never mutated", () => {
  const p0 = emptyForecast();
  const p1 = observe(p0, "SYN|python|checked", true);
  assert.deepEqual(Object.keys(p0.keys), []);
  assert.equal(forecast(p1, "SYN|python|checked").p, 2 / 3);
  const p2 = observe(observe(p1, "SYN|python|checked", false), "SYN|python|checked", false);
  assert.equal(forecast(p2, "SYN|python|checked").p, 2 / 5); // 1 green of 3 trials, Laplace-smoothed
  assert.equal(forecast(p2, "INS|js|checked").p, 0.5); // untouched key stays uncertain
  assert.ok(Object.isFrozen(p2) && Object.isFrozen(p2.keys));
});

test("forecastKey: stable vocabulary for (op, language, syntax)", () => {
  assert.equal(forecastKey({ op: "SYN", language: "python", syntax: "checked" }), "SYN|python|checked");
  assert.equal(forecastKey({}), "?|?|?");
});

test("forecastError: signed outcome-minus-p", () => {
  assert.equal(forecastError(0.8, false), -0.8); // confident failure: negative
  assert.equal(forecastError(0.2, true), 0.8); // doubtful pass: positive
  assert.equal(forecastError(0.5, true), 0.5);
});
