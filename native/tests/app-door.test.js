import test from "node:test";
import assert from "node:assert/strict";
import { detectAppTask, planNeeds, phrasesOf, describePlan } from "../organs/app-door.js";
import { PACKS } from "../the-fold/app-packs.mjs";

const FAILED_PROMPT = "Generate an app that shows the weather and gas prices anywhere. Use your vision ability to look at comps and generate from what you see, quickly and efficiently, using only local models.";

test("the prompt that produced a page about Booking.com is an app request with two needs, each quoted from the task and matched to the pack", () => {
  assert.equal(detectAppTask(FAILED_PROMPT), true);
  const p = planNeeds(FAILED_PROMPT, PACKS);
  assert.deepEqual(p.needs.map((n) => [n.need, n.pack]), [["weather", "weather-fuel"], ["fuel", "weather-fuel"]]);
  for (const n of p.needs) assert.ok(FAILED_PROMPT.toLowerCase().includes(n.quote.toLowerCase()), "a need is only what the person said");
  assert.deepEqual(p.gaps, []);
  assert.deepEqual(p.covered, ["weather-fuel"]);
});

test("a need no pack grounds is a typed gap quoted from the task — never built, never invented", () => {
  const t = "Build an app that shows the weather and flight prices and train delays";
  const p = planNeeds(t, PACKS);
  assert.deepEqual(p.needs.map((n) => n.need), ["weather"]);
  assert.deepEqual(p.gaps.map((g) => g.quote), ["flight prices", "train delays"]);
  assert.match(describePlan(p), /Not covered, so left out and not invented: "flight prices", "train delays"/);
});

test("an app with nothing a pack can ground refuses in words and promises no invented page", () => {
  const p = planNeeds("Make a website that shows stock tickers and crypto prices", PACKS);
  assert.deepEqual(p.covered, []);
  assert.match(describePlan(p), /won't write a page of made-up content/);
});

test("CONTROL built to fail: ordinary requests that are not apps that show data are not taken", () => {
  for (const t of ["write a JavaScript file with functions: area(w, h)", "what is the weather like on Mars", "tell me about apps", "who was Lincoln's vice president?", "summarise this tool's README"]) assert.equal(detectAppTask(t), false, t);
});

test("scope words are trimmed, not read as data", () => {
  assert.deepEqual(phrasesOf("an app that shows the weather and gas prices anywhere"), ["weather", "gas prices"]);
  assert.deepEqual(phrasesOf("a page that displays the current temperature near me, and diesel prices today"), ["temperature", "diesel prices"]);
});

test("a model-proposed need that does not quote the task is dropped by the same rule", () => {
  const p = planNeeds("an app that shows the weather", [{ id: "x", needs: { weather: ["weather"], fuel: ["fuel"] } }]);
  assert.equal(p.needs.length, 1);
  assert.ok(!p.needs.some((n) => n.need === "fuel"), "fuel was never said");
});
